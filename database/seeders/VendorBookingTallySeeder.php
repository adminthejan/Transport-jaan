<?php

namespace Database\Seeders;

use App\Models\Commission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Gives every vendor's listings transaction data: a booking per vehicle / bus /
 * train, a payment for each booking, and a commission earning for each paid
 * booking. Runs after VendorDataTallySeeder so ownership is already settled.
 *
 * Idempotent: bookings are keyed by a *-DEMO-<id> reference, payments and
 * earnings are only created where missing. Writes with the query builder so
 * model observers (emails, notifications) do not fire.
 */
class VendorBookingTallySeeder extends Seeder
{
    private const COMMISSIONS = [
        'vehicle' => [10, 'Vehicle Bookings'],
        'ticket' => [5, 'Bus & train tickets'],
        'warehouse' => [8, 'Warehouse Bookings'],
        'courier' => [7, 'Courier Service'],
        'freight' => [6, 'Freight Service'],
    ];

    private const VEHICLE_KINDS = [
        'land' => ['prefix' => 'VEH', 'bookings' => 'bookings', 'fk' => 'booking_id', 'prefixTables' => 'booking'],
        'air' => ['prefix' => 'AIR', 'bookings' => 'air_vehicle_bookings', 'fk' => 'air_vehicle_booking_id', 'prefixTables' => 'air_vehicle_booking'],
        'sea' => ['prefix' => 'SEA', 'bookings' => 'sea_vehicle_bookings', 'fk' => 'sea_vehicle_booking_id', 'prefixTables' => 'sea_vehicle_booking'],
    ];

    private const NAMES = [['Amal', 'Silva'], ['Nadeesha', 'Perera'], ['Ravi', 'Kumar'], ['Sarah', 'Fernando'], ['Tharindu', 'Jayasuriya'], ['Maya', 'Dissanayake']];
    private const STATUS_CYCLE = ['confirmed', 'completed', 'pending', 'confirmed', 'cancelled', 'completed'];

    public function run(): void
    {
        foreach (self::COMMISSIONS as $type => [$pct, $desc]) {
            Commission::updateOrCreate(
                ['service_type' => $type],
                ['commission_percentage' => $pct, 'description' => $desc, 'is_active' => true]
            );
        }

        $clients = DB::table('users')->whereIn('email', ['client@gmail.com', 'admin@demo.test'])->pluck('id')->values();
        if ($clients->isEmpty()) {
            $this->command?->warn('No demo client users found. Run DemoUsersSeeder first.');
            return;
        }

        foreach (self::VEHICLE_KINDS as $type => $cfg) {
            $this->seedVehicleBookings($type, $cfg, $clients->all());
            $this->seedVehiclePaymentsAndEarnings($type, $cfg);
        }
        $this->seedTickets('bus', $clients->all());
        $this->seedTickets('train', $clients->all());
        $this->seedWarehouseBookings($clients->all());
    }

    /** One booking per approved, active warehouse unit; paid ones earn commission. */
    private function seedWarehouseBookings(array $clients): void
    {
        $now = now();
        $units = DB::table('warehouse_units as w')
            ->whereExists(fn ($q) => $q->select(DB::raw(1))->from('warehouse_approvals as a')
                ->whereColumn('a.warehouse_unit_id', 'w.id')->where('a.status', 'approved'))
            ->where('w.is_active', true)->orderBy('w.id')->select('w.*')->get();

        foreach ($units as $i => $unit) {
            $ref = "WH-DEMO-{$unit->id}";
            $booking = DB::table('warehouse_bookings')->where('booking_reference', $ref)->first();

            if (! $booking) {
                $status = ['confirmed', 'pending', 'completed', 'confirmed'][$i % 4];
                $months = 3 + $i % 4;
                $rate = (float) ($unit->monthly_rate ?: $unit->base_price);
                $total = $rate * $months;
                $tax = round($total * (float) $unit->tax_rate / 100, 2);
                $deposit = (float) $unit->security_deposit;
                $setup = (float) $unit->setup_fee;
                [$first, $last] = self::NAMES[$i % count(self::NAMES)];
                $paid = in_array($status, ['confirmed', 'completed'], true);

                $id = DB::table('warehouse_bookings')->insertGetId([
                    'user_id' => $clients[$i % count($clients)],
                    'warehouse_unit_id' => $unit->id,
                    'booking_reference' => $ref,
                    'tracking_pin' => str_pad((string) (300000 + ($unit->id * 7907) % 700000), 6, '0', STR_PAD_LEFT),
                    'status' => $status,
                    'confirmed_at' => $paid ? $now->copy()->subDays(5) : null,
                    'company_name' => "$last Trading Co.",
                    'contact_person' => "$first $last",
                    'phone' => '+94772' . str_pad((string) (200000 + $unit->id), 6, '0', STR_PAD_LEFT),
                    'email' => strtolower("{$first}.{$last}@example.com"),
                    'storage_type' => 'dry',
                    'required_space' => min(2000, (float) $unit->capacity / 10),
                    'goods_type' => 'General cargo',
                    'start_date' => $status === 'completed' ? $now->copy()->subMonths($months + 1) : $now->copy()->addDays(7),
                    'end_date' => $status === 'completed' ? $now->copy()->subDay() : $now->copy()->addMonths($months),
                    'duration_months' => $months,
                    'monthly_rate' => $rate,
                    'security_deposit' => $deposit,
                    'setup_fee' => $setup,
                    'total_amount' => $total,
                    'tax_amount' => $tax,
                    'final_amount' => $total + $tax + $deposit + $setup,
                    'payment_method' => 'bank_transfer',
                    'payment_status' => $paid ? 'paid' : 'pending',
                    'payment_date' => $paid ? $now->copy()->subDays(5) : null,
                    'transaction_reference' => $paid ? "TXN-DEMO-WH-{$unit->id}" : null,
                    'terms_accepted' => true,
                    'notes' => 'Demo booking',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $booking = DB::table('warehouse_bookings')->find($id);
            }

            if ($booking->payment_status === 'paid') {
                $this->earning('warehouse', 'warehouse', $booking->id, null, 'warehouse_bookings', (float) $booking->final_amount, $unit->user_id);
            }
        }
    }

    private function seedVehicleBookings(string $type, array $cfg, array $clients): void
    {
        $vehicles = DB::table('vehicles')->where('type', $type)->orderBy('id')->get();
        $now = now();

        foreach ($vehicles as $i => $v) {
            $ref = "{$cfg['prefix']}-DEMO-{$v->id}";
            if (DB::table($cfg['bookings'])->where('booking_reference', $ref)->exists()) {
                continue;
            }

            $status = self::STATUS_CYCLE[$i % count(self::STATUS_CYCLE)];
            $days = 2 + $i % 4;
            $price = (float) $v->rental_price_per_day;
            $addonPrice = $type === 'land' ? 1500.0 : ($type === 'air' ? 25000.0 : 12000.0);
            $addonName = $type === 'land' ? 'GPS Navigation' : ($type === 'air' ? 'In-flight Catering' : 'Onboard Catering');
            $subtotal = $price * $days;
            $total = $subtotal + $addonPrice;
            $pickup = $status === 'completed' ? $now->copy()->subDays(10 + $i) : $now->copy()->addDays(3 + $i);
            $client = $clients[$i % count($clients)];
            [$first, $last] = self::NAMES[$i % count(self::NAMES)];

            $row = [
                'booking_reference' => $ref,
                'tracking_pin' => str_pad((string) (100000 + ($v->id * 7919) % 900000), 6, '0', STR_PAD_LEFT),
                'client_id' => $client,
                'vehicle_id' => $v->id,
                'status' => $status,
                'price_per_day' => $price,
                'rental_days' => $days,
                'addons_total' => $addonPrice,
                'subtotal' => $subtotal,
                'deposit_amount' => $v->deposit_amount,
                'advance_amount' => $v->advance_payment_amount,
                'total_amount' => $total,
                'currency' => $v->currency,
                'addons_snapshot' => json_encode([['name' => $addonName, 'price' => $addonPrice, 'qty' => 1]]),
                'vehicle_snapshot' => json_encode(['model' => $v->model, 'manufacturer' => $v->manufacturer, 'registration_number' => $v->registration_number]),
                'notes' => 'Demo booking',
                'created_at' => $pickup->copy()->subDays(5),
                'updated_at' => $now,
            ];
            if ($status === 'cancelled') {
                $row += [
                    'cancelled_at' => $now->copy()->subDays(1),
                    'cancellation_reason' => 'Change of plans',
                    'cancelled_by' => 'client',
                    'cancellation_fee' => round($total * 0.1, 2),
                    'refund_amount' => 0,
                ];
            }

            $bookingId = DB::table($cfg['bookings'])->insertGetId($row);
            $fk = $cfg['fk'];
            $stamp = ['created_at' => $now, 'updated_at' => $now];

            DB::table("{$cfg['prefixTables']}_schedules")->insert([
                $fk => $bookingId,
                'pickup_at' => $pickup,
                'pickup_location' => 'Colombo',
                'dropoff_at' => $pickup->copy()->addDays($days),
                'dropoff_location' => 'Galle',
            ] + $stamp);

            $customer = [$fk => $bookingId, 'first_name' => $first, 'last_name' => $last, 'email' => strtolower("{$first}.{$last}@example.com"), 'phone' => '+9477' . str_pad((string) (1000000 + $v->id), 7, '0', STR_PAD_LEFT), 'country_code' => 'lk', 'city' => 'Colombo', 'zip_code' => '00100', 'age' => 30 + $i % 20] + $stamp;
            DB::table("{$cfg['prefixTables']}_customers")->insert($customer);

            $addon = [$fk => $bookingId, 'name' => $addonName, 'price' => $addonPrice, 'qty' => 1, 'line_total' => $addonPrice] + $stamp;
            if ($type !== 'land') {
                $addon['vehicle_id'] = $v->id;
            }
            DB::table("{$cfg['prefixTables']}_addons")->insert($addon);
        }
    }

    /** Payment for every booking that lacks one, earning for every paid one. */
    private function seedVehiclePaymentsAndEarnings(string $type, array $cfg): void
    {
        $payTable = "{$cfg['prefixTables']}_payments";
        $fk = $cfg['fk'];
        $now = now();

        $bookings = DB::table("{$cfg['bookings']} as b")->join('vehicles as v', 'v.id', '=', 'b.vehicle_id')
            ->select('b.id', 'b.status', 'b.total_amount', 'b.advance_amount', 'v.provider_id')->orderBy('b.id')->get();

        foreach ($bookings as $b) {
            if ($b->status === 'cancelled') {
                continue;
            }
            $paid = in_array($b->status, ['confirmed', 'completed'], true);
            $payment = DB::table($payTable)->where($fk, $b->id)->first();
            $paymentId = $payment->id ?? null;

            if (! $payment) {
                $full = $b->status === 'completed' || $b->id % 2 === 0;
                $paymentId = DB::table($payTable)->insertGetId([
                    $fk => $b->id,
                    'method' => $b->id % 2 === 0 ? 'Credit Card' : 'Bank Transfer',
                    'option' => $full ? 'full' : 'advance',
                    'amount_paid' => $full ? $b->total_amount : $b->advance_amount,
                    'status' => $paid ? 'paid' : 'pending',
                    'initiated_at' => $now->copy()->subDays(4),
                    'paid_at' => $paid ? $now->copy()->subDays(3) : null,
                    'tx_reference' => $paid ? 'TXN-DEMO-' . strtoupper($cfg['prefix']) . '-' . $b->id : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($paid) {
                $this->earning($type, 'vehicle', $b->id, $paymentId, $payTable, (float) $b->total_amount, $b->provider_id);
            }
        }
    }

    private function seedTickets(string $kind, array $clients): void
    {
        $isBus = $kind === 'bus';
        $vehicleTable = $isBus ? 'buses' : 'trains';
        $scheduleTable = $isBus ? 'bus_schedules' : 'train_schedules';
        $bookingTable = $isBus ? 'bus_bookings' : 'train_bookings';
        $scheduleFk = $isBus ? 'bus_schedule_id' : 'train_schedule_id';
        $vehicleFk = $isBus ? 'bus_id' : 'train_id';
        $amountCol = $isBus ? 'total_price' : 'total_amount';
        $payTable = $isBus ? 'bus_booking_payments' : 'train_booking_payments';
        $payFk = $isBus ? 'bus_booking_id' : 'train_booking_id';
        $prefix = $isBus ? 'BUS' : 'TRN';
        $now = now();

        foreach (DB::table($vehicleTable)->orderBy('id')->get() as $i => $vehicle) {
            $ref = "{$prefix}-DEMO-{$vehicle->id}";
            $scheduleIds = DB::table($scheduleTable)->where($vehicleFk, $vehicle->id)->pluck('id');
            if ($scheduleIds->isEmpty() || DB::table($bookingTable)->whereIn($scheduleFk, $scheduleIds)->exists()) {
                continue; // already has bookings (seeded earlier or by a user)
            }
            $schedule = DB::table($scheduleTable)->where('id', $scheduleIds->min())->first();
            $seats = $i % 3 + 1;
            $status = $i % 4 === 3 ? 'pending' : 'confirmed';
            [$first, $last] = self::NAMES[$i % count(self::NAMES)];

            $row = [
                'booking_reference' => $ref,
                'tracking_pin' => str_pad((string) (200000 + ($vehicle->id * 104729 + ($isBus ? 1 : 2)) % 800000), 6, '0', STR_PAD_LEFT),
                $scheduleFk => $schedule->id,
                'user_id' => $clients[$i % count($clients)],
                'passenger_name' => "$first $last",
                'passenger_email' => strtolower("{$first}.{$last}@example.com"),
                'passenger_phone' => '+94771' . str_pad((string) (100000 + $vehicle->id), 6, '0', STR_PAD_LEFT),
                'status' => $status,
                'payment_status' => 'pending',
                $amountCol => (float) $schedule->price * $seats,
                'trip_type' => 'one_way',
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if ($isBus) {
                $row += ['seat_numbers' => json_encode(array_map(fn ($n) => (30 + $n) . 'A', range(1, $seats))), 'passenger_count' => $seats, 'booking_date' => $now];
            } else {
                $row += ['seat_numbers' => json_encode(array_map(fn ($n) => 'C' . (10 + $n), range(1, $seats))), 'adults' => $seats, 'children' => 0, 'infants' => 0, 'total_passengers' => $seats];
            }
            DB::table($bookingTable)->insert($row);
        }

        // Payments + earnings for every confirmed ticket.
        $vendorCol = $isBus ? 'b.vendor_id' : 't.vendor_id';
        $tickets = DB::table("$bookingTable as k")
            ->join("$scheduleTable as s", 's.id', '=', "k.$scheduleFk")
            ->join("$vehicleTable as " . ($isBus ? 'b' : 't'), ($isBus ? 'b' : 't') . '.id', '=', "s.$vehicleFk")
            ->select('k.id', 'k.status', "k.$amountCol as amount", "$vendorCol as vendor_id")
            ->orderBy('k.id')->get();

        foreach ($tickets as $t) {
            if ($t->status !== 'confirmed' && $t->status !== 'completed') {
                continue;
            }
            $payment = DB::table($payTable)->where($payFk, $t->id)->first();
            $paymentId = $payment->id ?? DB::table($payTable)->insertGetId([
                $payFk => $t->id,
                'method' => 'Credit Card',
                'option' => 'full',
                'amount_paid' => $t->amount,
                'status' => 'paid',
                'tx_reference' => "TXN-DEMO-{$prefix}-{$t->id}",
                'initiated_at' => $now->copy()->subDay(),
                'paid_at' => $now->copy()->subDay(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table($bookingTable)->where('id', $t->id)->update(['payment_status' => 'paid']);

            $this->earning($kind, 'ticket', $t->id, $paymentId, $payTable, (float) $t->amount, $t->vendor_id);
        }
    }

    private function earning(string $bookingType, string $serviceType, int $bookingId, ?int $paymentId, string $paymentTable, float $amount, ?int $vendorId): void
    {
        $exists = DB::table('commission_earnings')->where('service_type', $serviceType)
            ->where('booking_type', $bookingType)->where('booking_id', $bookingId)->exists();
        if ($exists || ! $vendorId) {
            return;
        }

        $pct = (float) Commission::where('service_type', $serviceType)->value('commission_percentage');
        $total = round($amount * $pct / 100, 2);
        DB::table('commission_earnings')->insert([
            'booking_type' => $bookingType,
            'booking_id' => $bookingId,
            'payment_id' => $paymentId,
            'payment_table' => $paymentTable,
            'service_type' => $serviceType,
            'booking_amount' => $amount,
            'commission_percentage' => $pct,
            'total_commission' => $total,
            'admin_amount' => round($total / 2, 2),
            'vendor_amount' => round($total / 2, 2),
            'admin_percentage' => 50,
            'vendor_percentage' => 50,
            'vendor_id' => $vendorId,
            'status' => 'paid',
            'paid_at' => now()->subDays(2),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
