<?php

namespace App\Http\Controllers\VehicleControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingAddon;
use App\Models\BookingPayment;
use App\Models\AirVehicleBookingPayment;
use App\Models\BookingSchedule;
use App\Models\Vehicle;
use App\Models\VehicleFeaturePricing;
use App\Models\BookingCustomer;
use App\Models\AirVehicleBookingCustomer;
use App\Services\VehicleBookingCancellationService;
use App\Services\WalletService;
use App\Services\InsufficientWalletBalanceException;
use App\Services\PayHereGatewayService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use App\Models\AirVehicleBookings;
use App\Models\AirVehicleBookingSchedule;
use App\Models\AirVehicleBookingAddon;
use App\Models\SeaVehicleBookings;
use App\Models\SeaVehicleBookingSchedule;   
use App\Models\SeaVehicleBookingAddon;
use App\Models\SeaVehicleBookingCustomer;
use App\Models\SeaVehicleBookingPayment;

class ClientBookingController extends Controller
{
    /** QUOTE: GET /bookings/quote (JSON) */
    public function quote(Request $request)
    {
        [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForQuote($request);

        // NEW: allow the caller to exclude a booking (e.g., the one they just created)
        $excludeId = $request->integer('exclude_booking_id');
        $userId    = Auth::id();

        // ✅ Availability check (read-only quote)
        $overlap = Booking::where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))               // NEW
            // Ignore my *own* pending draft when just quoting again
            ->when($userId, function ($q) use ($userId) {                                  // NEW
                $q->where(function ($qq) use ($userId) {
                    $qq->where('client_id', '!=', $userId)
                       ->orWhere('status', 'confirmed'); // still block confirmed (even if mine)
                });
            })
            ->whereHas('schedule', function ($q) use ($pickup , $dropoff) {
                $q->where('pickup_at', '<', $dropoff)
                  ->where('dropoff_at', '>', $pickup );
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'Vehicle is not available for the selected dates.'
            ], 422);
        }

        $calc = $this->calculateTotals($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver);
        return response()->json($calc);
    }

    /** ✅ NEW: extras for a vehicle (JSON) */
    public function extras(Vehicle $vehicle)
    {
        $extras = VehicleFeaturePricing::forVehicle($vehicle->id)
            ->orderBy('additional_feature_name')
            ->get(['additional_feature_name', 'additional_feature_price'])
            ->map(fn($row) => [
                'name' => $row->additional_feature_name,
                'price' => (float) $row->additional_feature_price,
            ])
            ->values();

        return response()->json(['extras' => $extras]);
    }

    public function updateAddons(Request $request, Booking $booking)
    {
        $this->authorizeBooking($booking);

        $data = $request->validate([
            'addons' => ['array'],
            'addons.*.name' => ['required_with:addons', 'string'],
            'addons.*.qty' => ['nullable', 'integer', 'min:1'],
        ]);

        $booking->load('vehicle', 'schedule');

        if (!$booking->vehicle || !$booking->schedule) {
            return response()->json(['message' => 'Booking missing vehicle or schedule.'], 422);
        }

        $calc = $this->calculateTotals(
            $booking->vehicle,
            Carbon::parse($booking->schedule->pickup_at),
            Carbon::parse($booking->schedule->dropoff_at),
            $data['addons'] ?? [],
            (bool) $booking->needs_driver
        );

        DB::transaction(function () use ($booking, $calc) {
            $booking->update([
                'price_per_day'   => $calc['price_per_day'],
                'rental_days'     => $calc['rental_days'],
                'addons_total'    => $calc['addons_total'],
                'subtotal'        => $calc['subtotal'],
                'deposit_amount'  => $calc['deposit_amount'],
                'advance_amount'  => $calc['advance_amount'],
                'total_amount'    => $calc['total'],
                'currency'        => $calc['currency'],
                'addons_snapshot' => $calc['addons_lines'],
            ]);

            BookingAddon::where('booking_id', $booking->id)->delete();
            foreach ($calc['addons_lines'] as $line) {
                BookingAddon::create([
                    'booking_id' => $booking->id,
                    'name'       => $line['name'],
                    'price'      => $line['price'],
                    'qty'        => $line['qty'],
                    'line_total' => $line['line_total'],
                ]);
            }
        });

        return response()->json([
            'booking' => $booking->fresh(['vehicle', 'schedule', 'addons']),
        ]);
    }

    /** RENDER: Checkout page */
    public function showCheckout(Request $request)
    {
        $tripFromSession     = (array) $request->session()->get('booking_trip', []);
        $personalFromSession = (array) $request->session()->get('booking_personal', []);

        $vehicleIdFromReq  = $request->integer('vehicle_id');
        $vehicleIdFromSess = isset($tripFromSession['vehicle_id']) ? (int) $tripFromSession['vehicle_id'] : null;

        $vehicle = $vehicleIdFromReq
            ? Vehicle::find($vehicleIdFromReq)
            : ($vehicleIdFromSess ? Vehicle::find($vehicleIdFromSess) : null);

        $extras = [];
        if ($vehicle) {
            $extras = VehicleFeaturePricing::forVehicle($vehicle->id)
                ->orderBy('additional_feature_name')
                ->get(['additional_feature_name', 'additional_feature_price'])
                ->map(fn($row) => [
                    'name'  => $row->additional_feature_name,
                    'price' => (float) $row->additional_feature_price,
                ])
                ->values();
        }

        $booking = null;
        if($vehicle){
            $booking =\App\Models\Booking::with('vehicle')
            ->where('vehicle_id',$vehicle->id)
            ->latest()
            -> first();
            if($booking){
                $booking->load('customer');
            }
        }

        $query = array_merge(
            $tripFromSession,
            $personalFromSession,
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
                'addons',
                'needs_driver',
                'first_name',
                'last_name',
                'email',
                'phone',
                'country_code',
                'age',
                'city',
                'zip_code',
                'notes',
                'address',
                'exclude_booking_id', // NEW: forward this into the page props
            ]),
        );

         $user = $request->user();

        return Inertia::render('Web/components/LandVehicleDetails/VehicleCheckoutContent', [
            'vehicle' => $vehicle,
            'extras'  => $extras,
            'query'   => $query,
            'booking' => $booking,
            'user' =>$user,
        ]);
    }

    /** CREATE BOOKING (draft customer): POST /bookings */
    public function store(Request $request)
    {
        $userId = Auth::id();
        abort_unless($userId, 403, 'Please login to continue.');

        [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForStoreDraft($request);

        $request->session()->put('booking_trip', array_merge(
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
            ]),
            ['addons' => $addonsReq, 'needs_driver' => $needsDriver]
        ));
        $request->session()->put('booking_personal', $request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'country_code',
            'age',
            'city',
            'zip_code',
            'notes',
            'address'
        ]));

        $booking = DB::transaction(function () use ($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver, $userId, $request) {
            $existing = Booking::where('client_id', $userId)
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'pending')
                ->with('schedule')
                ->lockForUpdate()
                ->first();

            $overlap = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->when($existing, fn($q) => $q->where('id', '!=', $existing->id))
                ->whereHas('schedule', function ($q) use ($pickup , $dropoff) {
                    $q->where('pickup_at', '<', $dropoff)
                      ->where('dropoff_at', '>', $pickup );
                })
                ->lockForUpdate()
                ->exists();

            if ($overlap) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'Vehicle is not available for the selected dates.');
            }

            $calc = $this->calculateTotals($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver);

            if ($existing) {
                $existing->update([
                    'price_per_day'   => $calc['price_per_day'],
                    'needs_driver'    => $calc['needs_driver'],
                    'driver_fee_per_day' => $calc['driver_fee_per_day'],
                    'rental_days'     => $calc['rental_days'],
                    'addons_total'    => $calc['addons_total'],
                    'subtotal'        => $calc['subtotal'],
                    'deposit_amount'  => $calc['deposit_amount'],
                    'advance_amount'  => $calc['advance_amount'],
                    'total_amount'    => $calc['total'],
                    'currency'        => $vehicle->currency,
                    'addons_snapshot' => $calc['addons_lines'],
                    'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                    'notes'           => $request->string('notes')->toString() ?: null,
                ]);

                if ($existing->schedule) {
                    $existing->schedule->update([
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                } else {
                    BookingSchedule::create([
                        'booking_id'       => $existing->id,
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                }

                BookingAddon::where('booking_id', $existing->id)->delete();
                foreach ($calc['addons_lines'] as $line) {
                    BookingAddon::create([
                        'booking_id' => $existing->id,
                        'name'       => $line['name'],
                        'price'      => $line['price'],
                        'qty'        => $line['qty'],
                        'line_total' => $line['line_total'],
                    ]);
                }

                return $existing->fresh(['schedule', 'addons']);
            }

            $booking = Booking::create([
                'client_id'       => $userId,
                'vehicle_id'      => $vehicle->id,
                'status'          => 'pending',
                'price_per_day'   => $calc['price_per_day'],
                'needs_driver'    => $calc['needs_driver'],
                'driver_fee_per_day' => $calc['driver_fee_per_day'],
                'rental_days'     => $calc['rental_days'],
                'addons_total'    => $calc['addons_total'],
                'subtotal'        => $calc['subtotal'],
                'deposit_amount'  => $calc['deposit_amount'],
                'advance_amount'  => $calc['advance_amount'],
                'total_amount'    => $calc['total'],
                'currency'        => $vehicle->currency,
                'addons_snapshot' => $calc['addons_lines'],
                'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                'notes'           => $request->string('notes')->toString() ?: null,
            ]);

            BookingSchedule::create([
                'booking_id'       => $booking->id,
                'pickup_at'        => $pickup ,
                'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                'dropoff_at'       => $dropoff,
                'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
            ]);

            foreach ($calc['addons_lines'] as $line) {
                BookingAddon::create([
                    'booking_id' => $booking->id,
                    'name'       => $line['name'],
                    'price'      => $line['price'],
                    'qty'        => $line['qty'],
                    'line_total' => $line['line_total'],
                ]);
            }

            return $booking->fresh(['schedule', 'addons']);
        });

        return redirect()->route('client.bookings.payments', $booking->id)
            ->with('success', 'Booking created. Continue with payment.');
    }

    /** RENDER: Payments page */
    public function payments(Booking $booking, WalletService $wallets)
    {
        $this->authorizeBooking($booking);
        $booking->load('vehicle', 'schedule', 'addons', 'customer');

        $wallet = $wallets->walletFor(Auth::user());

        return Inertia::render('Web/components/LandVehicleDetails/Payments', [
            'booking' => $booking,
            'wallet' => [
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
            ],
        ]);
    }

    /** CONFIRM: POST /bookings/{booking}/confirm */
    public function confirm(Request $request, Booking $booking, WalletService $wallets)
    {
        $this->authorizeBooking($booking);

        $validated = $request->validate([
            'payment_method' => ['required', 'in:PayHere,Wallet'],
            'payment_option' => ['required', 'in:full,advance'],
        ]);

        // The wallet only ever holds LKR; a non-LKR booking debited 1:1 with
        // no conversion would silently charge the wrong amount.
        if ($validated['payment_method'] === 'Wallet' && strtoupper((string) ($booking->currency ?? 'LKR')) !== 'LKR') {
            return back()->withErrors(['payment_method' => 'Wallet payments are only available for LKR bookings.']);
        }

        $payNow = $validated['payment_option'] === 'full'
            ? $booking->total_amount
            : min($booking->advance_amount ?: 0, $booking->total_amount);

        $isPayHere = $validated['payment_method'] === 'PayHere';

        try {
            DB::transaction(function () use ($booking, $validated, $payNow, $request, $wallets, $isPayHere) {
                // Wallet payments are debited inside the same transaction as the booking
                // confirmation below, so an overlap conflict (or any other failure further
                // down) rolls the debit back too instead of leaving the customer charged
                // for a booking that never got confirmed.
                if ($validated['payment_method'] === 'Wallet') {
                    $wallets->debit(
                        Auth::user(),
                        (float) $payNow,
                        'payment',
                        'Vehicle booking #' . $booking->id,
                        'VehicleBooking',
                        $booking->id
                    );
                }

                if ($isPayHere) {
                    // PayHere is asynchronous — the payment starts pending and is only
                    // marked paid once handlePayHereReturn()/handlePayHereNotify() confirm
                    // the charge went through. The booking itself stays 'pending' until then.
                    BookingPayment::create([
                        'booking_id'        => $booking->id,
                        'method'            => 'PayHere',
                        'option'            => $validated['payment_option'],
                        'amount_paid'       => $payNow,
                        'status'            => BookingPayment::STATUS_PENDING,
                        'tx_reference'      => null,
                        'provider'          => 'payhere',
                        'gateway_order_id'  => $this->generateGatewayOrderId('VEH'),
                        'initiated_at'      => now(),
                    ]);
                } else {
                    BookingPayment::create([
                        'booking_id'   => $booking->id,
                        'method'       => $validated['payment_method'],
                        'option'       => $validated['payment_option'],
                        'amount_paid'  => $payNow,
                        'status'       => 'paid',
                        'tx_reference' => null,
                    ]);
                }

                $rawPersonal = (array) $request->session()->pull('booking_personal', []);
                if ($rawPersonal && !$booking->customer) {
                    $personal = Validator::make($rawPersonal, [
                        'first_name'   => ['nullable', 'string', 'max:255'],
                        'last_name'    => ['nullable', 'string', 'max:255'],
                        'email'        => ['nullable', 'email', 'max:255'],
                        'phone'        => ['nullable', 'regex:/^\+?\d{7,15}$/', 'max:20'],
                        'country_code' => ['nullable', 'string', 'max:5'],
                        'city'         => ['nullable', 'string', 'max:255'],
                        'zip_code'     => ['nullable', 'string', 'max:20'],
                        'age'          => ['nullable', 'integer', 'min:18', 'max:120'],
                        'address'      => ['nullable', 'string', 'max:255'],
                        'notes'        => ['nullable', 'string'],
                    ])->validate();

                    if (collect($personal)->filter(fn($v) => filled($v))->isNotEmpty()) {
                        BookingCustomer::create(array_merge($personal, ['booking_id' => $booking->id]));
                    }
                }

                $booking->load('schedule');
                $overlap = Booking::where('vehicle_id', $booking->vehicle_id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->where('id', '!=', $booking->id)
                    ->whereHas('schedule', function ($q) use ($booking) {
                        $q->where('pickup_at', '<', $booking->schedule->dropoff_at)
                          ->where('dropoff_at', '>', $booking->schedule->pickup_at);
                    })
                    ->lockForUpdate()
                    ->exists();
                if ($overlap) {
                    abort(422, 'Vehicle is no longer available for those dates.');
                }

                if (!$isPayHere) {
                    $booking->update(['status' => 'confirmed']);
                }
                $request->session()->forget(['booking_trip']);
            });
        } catch (InsufficientWalletBalanceException $e) {
            return back()->withErrors(['wallet' => 'Insufficient wallet balance for this payment.'])->withInput();
        }

        if ($isPayHere) {
            return redirect()->route('client.bookings.payhere.checkout', $booking->id)
                ->with('success', 'Continue with PayHere to complete your payment.');
        }

        return redirect()->route('client.bookings.summary', $booking->id)
            ->with('success', 'Booking confirmed!');
    }

    /** RENDER: Summary page */
    public function summary(Booking $booking)
    {
        $this->authorizeBooking($booking);
        $booking->load('vehicle', 'vehicle.provider', 'schedule', 'addons', 'payments', 'customer');

        return Inertia::render('Web/home/land/Summary', [
            'booking' => $booking,
        ]);
    }

    /** Cancel (optional) */
    public function cancel(Booking $booking)
    {
        $this->authorizeBooking($booking);
        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return back()->with('error', 'Only pending/confirmed bookings can be cancelled.');
        }
        $booking->update(['status' => 'cancelled']);
        return back()->with('success', 'Booking cancelled.');
    }

    /* ------------ Helpers ------------ */

    private function authorizeBooking(Booking $booking): void
    {
        $user = Auth::user();
        if (!$user) abort(403);
        if ($user->role !== 'admin' && $user->id !== $booking->client_id) abort(403);
    }

    private function validateInputsForQuote(Request $request): array
    {
        $data = $request->validate([
            'vehicle_id'    => ['required', 'integer', 'exists:vehicles,id'],
            'pickup_date'   => ['required', 'date'],
            'pickup_time'   => ['required', 'date_format:H:i'],
            'dropoff_date'  => ['required', 'date', 'after_or_equal:pickup_date'],
            'dropoff_time'  => ['required', 'date_format:H:i'],
            'addons'        => ['array'],
            'addons.*.name' => ['required_with:addons', 'string'],
            'addons.*.qty'  => ['nullable', 'integer', 'min:1'],
            'needs_driver'  => ['nullable', 'boolean'],
        ]);

        $vehicle = Vehicle::findOrFail($data['vehicle_id']);

        $tz        = 'Asia/Colombo';
        $pickup  = Carbon::parse(($data['pickup_date'] . ' ' . $data['pickup_time']), $tz)->utc();
        $dropoff= Carbon::parse(($data['dropoff_date'] . ' ' . $data['dropoff_time']), $tz)->utc();

        if ($pickup ->gte($dropoff))
            abort(422, 'Drop-off must be after pick-up.');

        $addonsReq = $request->input('addons', []);
        $needsDriver = $request->boolean('needs_driver');
        return [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver];
    }

    private function validateInputsForStoreDraft(Request $request): array
    {
        $data = $request->validate([
            'vehicle_id'       => ['required', 'integer', 'exists:vehicles,id'],
            'pickup_location'  => ['nullable', 'string'],
            'dropoff_location' => ['nullable', 'string'],
            'pickup_date'      => ['required', 'date'],
            'pickup_time'      => ['required', 'date_format:H:i'],
            'dropoff_date'     => ['required', 'date', 'after_or_equal:pickup_date'],
            'dropoff_time'     => ['required', 'date_format:H:i'],
            'addons'           => ['array'],
            'addons.*.name'    => ['required_with:addons', 'string'],
            'addons.*.qty'     => ['nullable', 'integer', 'min:1'],
            'needs_driver'     => ['nullable', 'boolean'],
        ]);

        $vehicle = Vehicle::findOrFail($data['vehicle_id']);

        $tz        = 'Asia/Colombo';
        $pickup  = Carbon::parse(($data['pickup_date'] . ' ' . $data['pickup_time']), $tz)->utc();
        $dropoff= Carbon::parse(($data['dropoff_date'] . ' ' . $data['dropoff_time']), $tz)->utc();

        if ($pickup ->gte($dropoff))
            abort(422, 'Drop-off must be after pick-up.');

        $addonsReq = $request->input('addons', []);
        $needsDriver = $request->boolean('needs_driver');
        return [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver];
    }

    // A chauffeur ("with driver") adds a flat share of the vehicle's own daily
    // rate — self-drive rentals (the default) are unaffected.
    private const DRIVER_FEE_RATE = 0.20;

    private function calculateTotals(Vehicle $vehicle, Carbon $pickup , Carbon $dropoff, array $addonsReq, bool $needsDriver = false): array
    {
            // $seconds     = max(0, $dropoff->diffInSeconds($pickup ));
        $days = max(1, $pickup->diffInDays($dropoff));
        $pricePerDay = (float) ($vehicle->rental_price_per_day ?? 0);
        $driverFeePerDay = $needsDriver ? round($pricePerDay * self::DRIVER_FEE_RATE, 2) : 0.0;
        $driverFeeTotal = $driverFeePerDay * $days;

        $addonsLines = [];
        $addonsTotal = 0.0;

        if (!empty($addonsReq)) {
            $normalize = fn($s) => mb_strtolower(trim((string) $s));

            $names = collect($addonsReq)->pluck('name')->filter()->map($normalize)->unique()->values();

            $catalog = VehicleFeaturePricing::where('vehicle_id', $vehicle->id)
                ->whereIn(DB::raw('LOWER(TRIM(additional_feature_name))'), $names)
                ->get();

            $catalogByName = $catalog->mapWithKeys(fn($row) => [
                $normalize($row->additional_feature_name) => $row
            ]);

            foreach ($addonsReq as $row) {
                $rawName  = (string) ($row['name'] ?? '');
                $nameKey  = $normalize($rawName);
                $qty      = max(1, (int) ($row['qty'] ?? 1));
                $price    = isset($catalogByName[$nameKey])
                    ? (float) $catalogByName[$nameKey]->additional_feature_price
                    : 0.0;
                $lineTotal = $price * $qty;

                $addonsLines[] = [
                    'name'       => $rawName,
                    'price'      => $price,
                    'qty'        => $qty,
                    'line_total' => $lineTotal,
                ];
                $addonsTotal += $lineTotal;
            }
        }

        $subtotal = $pricePerDay * $days + $driverFeeTotal + $addonsTotal;
        $deposit  = (float) ($vehicle->deposit_amount ?? 0);
        $advance  = (float) ($vehicle->advance_payment_amount ?? 0);
        $total    = $subtotal;

        return [
            'rental_days'     => $days,
            'price_per_day'   => $pricePerDay,
            'needs_driver'      => $needsDriver,
            'driver_fee_per_day' => $driverFeePerDay,
            'driver_fee_total'   => $driverFeeTotal,
            'addons_total'    => $addonsTotal,
            'subtotal'        => $subtotal,
            'deposit_amount'  => $deposit,
            'advance_amount'  => $advance,
            'total'           => $total,
            'currency'        => $vehicle->currency,
            'addons_lines'    => $addonsLines,
            'vehicle_snapshot'=> [
                'manufacturer'        => $vehicle->manufacturer,
                'model'               => $vehicle->model,
                'registration_number' => $vehicle->registration_number,
                'price_per_day'       => $pricePerDay,
            ],
        ];
    }

    public function airVehicleQuote(Request $request)
    {
        [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForQuote($request);

        // NEW: allow the caller to exclude a booking (e.g., the one they just created)
        $excludeId = $request->integer('exclude_booking_id');
        $userId    = Auth::id();

        // ✅ Availability check (read-only quote)
        $overlap = AirVehicleBookings::where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))               // NEW
            // Ignore my *own* pending draft when just quoting again
            ->when($userId, function ($q) use ($userId) {                                  // NEW
                $q->where(function ($qq) use ($userId) {
                    $qq->where('client_id', '!=', $userId)
                       ->orWhere('status', 'confirmed'); // still block confirmed (even if mine)
                });
            })
            ->whereHas('schedule', function ($q) use ($pickup , $dropoff) {
                $q->where('pickup_at', '<', $dropoff)
                  ->where('dropoff_at', '>', $pickup );
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'Vehicle is not available for the selected dates.'
            ], 422);
        }

        $calc = $this->calculateTotals($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver);
        return response()->json($calc);
    }

    public function updateAirVehicleAddons(Request $request, AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeBooking($airVehicleBooking);

        $data = $request->validate([
            'addons' => ['array'],
            'addons.*.name' => ['required_with:addons', 'string'],
            'addons.*.qty' => ['nullable', 'integer', 'min:1'],
        ]);

        $airVehicleBooking->load('vehicle', 'schedule');

        if (!$airVehicleBooking->vehicle || !$airVehicleBooking->schedule) {
            return response()->json(['message' => 'Booking missing vehicle or schedule.'], 422);
        }

        $calc = $this->calculateTotals(
            $airVehicleBooking->vehicle,
            Carbon::parse($airVehicleBooking->schedule->pickup_at),
            Carbon::parse($airVehicleBooking->schedule->dropoff_at),
            $data['addons'] ?? [],
            (bool) $airVehicleBooking->needs_driver
        );

        DB::transaction(function () use ($airVehicleBooking, $calc) {
            $airVehicleBooking->update([
                'price_per_day'   => $calc['price_per_day'],
                'rental_days'     => $calc['rental_days'],
                'addons_total'    => $calc['addons_total'],
                'subtotal'        => $calc['subtotal'],
                'deposit_amount'  => $calc['deposit_amount'],
                'advance_amount'  => $calc['advance_amount'],
                'total_amount'    => $calc['total'],
                'currency'        => $calc['currency'],
                'addons_snapshot' => $calc['addons_lines'],
            ]);

            AirVehicleBookingAddon::where('air_vehicle_booking_id', $airVehicleBooking->id)->delete();
            foreach ($calc['addons_lines'] as $line) {
                AirVehicleBookingAddon::create([
                    'air_vehicle_booking_id' => $airVehicleBooking->id,
                    'vehicle_id' => $airVehicleBooking->vehicle_id,
                    'name'       => $line['name'],
                    'price'      => $line['price'],
                    'qty'        => $line['qty'],
                    'line_total' => $line['line_total'],
                ]);
            }
        });

        return response()->json([
            'booking' => $airVehicleBooking->fresh(['vehicle', 'schedule', 'addons']),
        ]);
    }

      /** RENDER: Checkout page */
    public function showAirVehicleCheckout(Request $request)
    {
        $tripFromSession     = (array) $request->session()->get('booking_trip', []);
        $personalFromSession = (array) $request->session()->get('booking_personal', []);

        $vehicleIdFromReq  = $request->integer('vehicle_id');
        $vehicleIdFromSess = isset($tripFromSession['vehicle_id']) ? (int) $tripFromSession['vehicle_id'] : null;

        $vehicle = $vehicleIdFromReq
            ? Vehicle::find($vehicleIdFromReq)
            : ($vehicleIdFromSess ? Vehicle::find($vehicleIdFromSess) : null);

        $extras = [];
        if ($vehicle) {
            $extras = VehicleFeaturePricing::forVehicle($vehicle->id)
                ->orderBy('additional_feature_name')
                ->get(['additional_feature_name', 'additional_feature_price'])
                ->map(fn($row) => [
                    'name'  => $row->additional_feature_name,
                    'price' => (float) $row->additional_feature_price,
                ])
                ->values();
        }

        $booking = null;
        if($vehicle){
            $booking =\App\Models\AirVehicleBookings::with('vehicle')
            ->where('vehicle_id',$vehicle->id)
            ->latest()
            -> first();
            if($booking){
                $booking->load('customer');
            }
        }

        $query = array_merge(
            $tripFromSession,
            $personalFromSession,
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
                'addons',
                'needs_driver',
                'first_name',
                'last_name',
                'email',
                'phone',
                'country_code',
                'age',
                'city',
                'zip_code',
                'notes',
                'address',
                'exclude_booking_id', // NEW: forward this into the page props
            ]),

        );

         $user = $request->user();

        return Inertia::render('Web/components/AirVehicleDetails/AirVehicleCheckoutContent', [
            'vehicle' => $vehicle,
            'extras'  => $extras,
            'query'   => $query,
            'booking' => $booking,
            'user' =>$user,
        ]);
    }

    public function airVehicleStore(Request $request)
    {
        $userId = Auth::id();
        abort_unless($userId, 403, 'Please login to continue.');

        [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForStoreDraft($request);

        $request->session()->put('booking_trip', array_merge(
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
            ]),
            ['addons' => $addonsReq, 'needs_driver' => $needsDriver]
        ));
        $request->session()->put('booking_personal', $request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'country_code',
            'age',
            'city',
            'zip_code',
            'notes',
            'address'
        ]));

        $booking = DB::transaction(function () use ($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver, $userId, $request) {
            $existing = AirVehicleBookings::where('client_id', $userId)
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'pending')
                ->with('schedule')
                ->lockForUpdate()
                ->first();

            $overlap = AirVehicleBookings::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->when($existing, fn($q) => $q->where('id', '!=', $existing->id))
                ->whereHas('schedule', function ($q) use ($pickup , $dropoff) {
                    $q->where('pickup_at', '<', $dropoff)
                      ->where('dropoff_at', '>', $pickup );
                })
                ->lockForUpdate()
                ->exists();

            if ($overlap) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'Vehicle is not available for the selected dates.');
            }

            $calc = $this->calculateTotals($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver);

            if ($existing) {
                $existing->update([
                    'price_per_day'   => $calc['price_per_day'],
                    'needs_driver'    => $calc['needs_driver'],
                    'driver_fee_per_day' => $calc['driver_fee_per_day'],
                    'rental_days'     => $calc['rental_days'],
                    'addons_total'    => $calc['addons_total'],
                    'subtotal'        => $calc['subtotal'],
                    'deposit_amount'  => $calc['deposit_amount'],
                    'advance_amount'  => $calc['advance_amount'],
                    'total_amount'    => $calc['total'],
                    'currency'        => $vehicle->currency,
                    'addons_snapshot' => $calc['addons_lines'],
                    'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                    'notes'           => $request->string('notes')->toString() ?: null,
                ]);

                if ($existing->schedule) {
                    $existing->schedule->update([
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                } else {
                    AirVehicleBookingSchedule::create([
                        'air_vehicle_booking_id' => $existing->id,
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                }

                AirVehicleBookingAddon::where('air_vehicle_booking_id', $existing->id)->delete();
                foreach ($calc['addons_lines'] as $line) {
                    AirVehicleBookingAddon::create([
                        'air_vehicle_booking_id' => $existing->id,
                        'vehicle_id'      => $existing->vehicle_id,
                        'name'       => $line['name'],
                        'price'      => $line['price'],
                        'qty'        => $line['qty'],
                        'line_total' => $line['line_total'],
                    ]);
                }

                return $existing->fresh(['schedule', 'addons']);
            }

            $booking = AirVehicleBookings::create([
                'client_id'       => $userId,
                'vehicle_id'      => $vehicle->id,
                'status'          => 'pending',
                'price_per_day'   => $calc['price_per_day'],
                'needs_driver'    => $calc['needs_driver'],
                'driver_fee_per_day' => $calc['driver_fee_per_day'],
                'rental_days'     => $calc['rental_days'],
                'addons_total'    => $calc['addons_total'],
                'subtotal'        => $calc['subtotal'],
                'deposit_amount'  => $calc['deposit_amount'],
                'advance_amount'  => $calc['advance_amount'],
                'total_amount'    => $calc['total'],
                'currency'        => $vehicle->currency,
                'addons_snapshot' => $calc['addons_lines'],
                'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                'notes'           => $request->string('notes')->toString() ?: null,
            ]);

            AirVehicleBookingSchedule::create([
                'air_vehicle_booking_id' => $booking->id,
                'pickup_at'        => $pickup ,
                'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                'dropoff_at'       => $dropoff,
                'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
            ]);

            foreach ($calc['addons_lines'] as $line) {
                AirVehicleBookingAddon::create([
                    'air_vehicle_booking_id' => $booking->id,
                    'vehicle_id'      => $booking->vehicle_id,
                    'name'       => $line['name'],
                    'price'      => $line['price'],
                    'qty'        => $line['qty'],
                    'line_total' => $line['line_total'],
                ]);
            }

            return $booking->fresh(['schedule', 'addons']);
        });

        return redirect()->route('client.airBookings.payments', $booking->id)
            ->with('success', 'Booking created. Continue with payment.');
    }

    private function authorizeAirVehicleBooking(AirVehicleBookings $airVehicleBooking): void
    {
        $user = Auth::user();
        if (!$user) abort(403);
        if ($user->role !== 'client' && $user->id !== $airVehicleBooking->client_id) abort(403);
    }

        /** RENDER:  Air Vehicle Payments page */
     public function airVehiclePayments(AirVehicleBookings $airVehicleBooking, WalletService $wallets)
{
    $this->authorizeAirVehicleBooking($airVehicleBooking);
    $airVehicleBooking->load('vehicle', 'schedule', 'addons', 'customer');

    $wallet = $wallets->walletFor(Auth::user());

    return Inertia::render('Web/components/AirVehicleDetails/Payments', [
        'booking' => $airVehicleBooking,
        'wallet' => [
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
        ],
    ]);
}

    /** CONFIRM: POST /airBookings/{airVehicleBooking}/confirm */
    public function airVehicleConfirm(Request $request, AirVehicleBookings $airVehicleBooking, WalletService $wallets)
    {

        $this->authorizeAirVehicleBooking($airVehicleBooking);

        $validated = $request->validate([
            'payment_method' => ['required', 'in:PayHere,Wallet'],
            'payment_option' => ['required', 'in:full,advance'],
        ]);

        // The wallet only ever holds LKR; a non-LKR booking debited 1:1 with
        // no conversion would silently charge the wrong amount.
        if ($validated['payment_method'] === 'Wallet' && strtoupper((string) ($airVehicleBooking->currency ?? 'LKR')) !== 'LKR') {
            return back()->withErrors(['payment_method' => 'Wallet payments are only available for LKR bookings.']);
        }

        $payNow = $validated['payment_option'] === 'full'
            ? $airVehicleBooking->total_amount
            : min($airVehicleBooking->advance_amount ?: 0, $airVehicleBooking->total_amount);

        $isPayHere = $validated['payment_method'] === 'PayHere';

        try {
            DB::transaction(function () use ($airVehicleBooking, $validated, $payNow, $request, $wallets, $isPayHere) {
                if ($validated['payment_method'] === 'Wallet') {
                    $wallets->debit(
                        Auth::user(),
                        (float) $payNow,
                        'payment',
                        'Air vehicle booking #' . $airVehicleBooking->id,
                        'AirVehicleBooking',
                        $airVehicleBooking->id
                    );
                }

                if ($isPayHere) {
                    AirVehicleBookingPayment::create([
                        'air_vehicle_booking_id' => $airVehicleBooking->id,
                        'method'           => 'PayHere',
                        'option'           => $validated['payment_option'],
                        'amount_paid'      => $payNow,
                        'status'           => AirVehicleBookingPayment::STATUS_PENDING,
                        'tx_reference'     => null,
                        'provider'         => 'payhere',
                        'gateway_order_id' => $this->generateGatewayOrderId('AIR'),
                        'initiated_at'     => now(),
                    ]);
                } else {
                    // Use the dedicated air booking payments table to avoid FK conflicts
                    AirVehicleBookingPayment::create([
                        'air_vehicle_booking_id' => $airVehicleBooking->id,
                        'method'       => $validated['payment_method'],
                        'option'       => $validated['payment_option'],
                        'amount_paid'  => $payNow,
                        'status'       => 'paid',
                        'tx_reference' => null,
                    ]);
                }

                $rawPersonal = (array) $request->session()->pull('booking_personal', []);
                    if ($rawPersonal && !$airVehicleBooking->customer) {
                    $personal = Validator::make($rawPersonal, [
                        'first_name'   => ['nullable', 'string', 'max:255'],
                        'last_name'    => ['nullable', 'string', 'max:255'],
                        'email'        => ['nullable', 'email', 'max:255'],
                        'phone'        => ['nullable', 'regex:/^\+?\d{7,15}$/', 'max:20'],
                        'country_code' => ['nullable', 'string', 'max:5'],
                        'city'         => ['nullable', 'string', 'max:255'],
                        'zip_code'     => ['nullable', 'string', 'max:20'],
                        'age'          => ['nullable', 'integer', 'min:18', 'max:120'],
                        'address'      => ['nullable', 'string', 'max:255'],
                        'notes'        => ['nullable', 'string'],
                    ])->validate();

                    if (collect($personal)->filter(fn($v) => filled($v))->isNotEmpty()) {
                        // For air vehicle bookings create a dedicated air booking customer row.
                        AirVehicleBookingCustomer::create(array_merge($personal, ['air_vehicle_booking_id' => $airVehicleBooking->id]));
                    }
                }

                $airVehicleBooking->load('schedule');
                $overlap = AirVehicleBookings::where('vehicle_id', $airVehicleBooking->vehicle_id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->where('id', '!=', $airVehicleBooking->id)
                    ->whereHas('schedule', function ($q) use ($airVehicleBooking) {
                        $q->where('pickup_at', '<', $airVehicleBooking->schedule->dropoff_at)
                          ->where('dropoff_at', '>', $airVehicleBooking->schedule->pickup_at);
                    })
                    ->lockForUpdate()
                    ->exists();
                if ($overlap) {
                    abort(422, 'Vehicle is no longer available for those dates.');
                }

                if (!$isPayHere) {
                    $airVehicleBooking->update(['status' => 'confirmed']);
                }
                $request->session()->forget(['booking_trip']);
            });
        } catch (InsufficientWalletBalanceException $e) {
            return back()->withErrors(['wallet' => 'Insufficient wallet balance for this payment.'])->withInput();
        }

        if ($isPayHere) {
            return redirect()->route('client.airBookings.payhere.checkout', $airVehicleBooking->id)
                ->with('success', 'Continue with PayHere to complete your payment.');
        }

        // Use a proper redirect so we can flash session data with ->with()
        return redirect()->route('client.airBookings.summary', $airVehicleBooking->id)
            ->with('success', 'Booking confirmed!');
    }

    /** RENDER: Summary page */
    public function airVehicleSummary(AirVehicleBookings $airVehicleBooking)
    {
        // Use the air-specific authorizer and the correct model type.
        $this->authorizeAirVehicleBooking($airVehicleBooking);
        $airVehicleBooking->load('vehicle', 'vehicle.provider', 'schedule', 'addons', 'payments', 'customer');

        return Inertia::render('Web/home/air/Summary', [
            'booking' => $airVehicleBooking,
        ]);
    }


       /** RENDER: Checkout page */
    public function showSeaVehicleCheckout(Request $request)
    {
        $tripFromSession     = (array) $request->session()->get('booking_trip', []);
        $personalFromSession = (array) $request->session()->get('booking_personal', []);

        $vehicleIdFromReq  = $request->integer('vehicle_id');
        $vehicleIdFromSess = isset($tripFromSession['vehicle_id']) ? (int) $tripFromSession['vehicle_id'] : null;

        $vehicle = $vehicleIdFromReq
            ? Vehicle::find($vehicleIdFromReq)
            : ($vehicleIdFromSess ? Vehicle::find($vehicleIdFromSess) : null);

        $extras = [];
        if ($vehicle) {
            $extras = VehicleFeaturePricing::forVehicle($vehicle->id)
                ->orderBy('additional_feature_name')
                ->get(['additional_feature_name', 'additional_feature_price'])
                ->map(fn($row) => [
                    'name'  => $row->additional_feature_name,
                    'price' => (float) $row->additional_feature_price,
                ])
                ->values();
        }

        $booking = null;
        if($vehicle){
            $booking =\App\Models\SeaVehicleBookings::with('vehicle')
            ->where('vehicle_id',$vehicle->id)
            ->latest()
            -> first();
            if($booking){
                $booking->load('customer');
            }
        }

        $query = array_merge(
            $tripFromSession,
            $personalFromSession,
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
                'addons',
                'needs_driver',
                'first_name',
                'last_name',
                'email',
                'phone',
                'country_code',
                'age',
                'city',
                'zip_code',
                'notes',
                'address',
                'exclude_booking_id', // NEW: forward this into the page props
            ]),

        );

         $user = $request->user();

        return Inertia::render('Web/components/SeaVehicleDetails/SeaVehicleCheckoutContent', [
            'vehicle' => $vehicle,
            'extras'  => $extras,
            'query'   => $query,
            'booking' => $booking,
            'user' =>$user,
        ]);
    }

    public function seaVehicleQuote(Request $request)
    {
        [$vehicle, $pickup, $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForQuote($request);

        $excludeId = $request->integer('exclude_booking_id');
        $userId    = Auth::id();

        $overlap = SeaVehicleBookings::where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->when($userId, function ($q) use ($userId) {
                $q->where(function ($qq) use ($userId) {
                    $qq->where('client_id', '!=', $userId)
                       ->orWhere('status', 'confirmed');
                });
            })
            ->whereHas('schedule', function ($q) use ($pickup, $dropoff) {
                $q->where('pickup_at', '<', $dropoff)
                  ->where('dropoff_at', '>', $pickup);
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'Vehicle is not available for the selected dates.'
            ], 422);
        }

        $calc = $this->calculateTotals($vehicle, $pickup, $dropoff, $addonsReq, $needsDriver);
        return response()->json($calc);
    }

    public function seaVehicleStore(Request $request)
    {
        $userId = Auth::id();
        abort_unless($userId, 403, 'Please login to continue.');

        [$vehicle, $pickup , $dropoff, $addonsReq, $needsDriver] = $this->validateInputsForStoreDraft($request);

        $request->session()->put('booking_trip', array_merge(
            $request->only([
                'vehicle_id',
                'pickup_location',
                'dropoff_location',
                'pickup_date',
                'pickup_time',
                'dropoff_date',
                'dropoff_time',
            ]),
            ['addons' => $addonsReq, 'needs_driver' => $needsDriver]
        ));
        $request->session()->put('booking_personal', $request->only([
            'first_name',
            'last_name',
            'email',
            'phone',
            'country_code',
            'age',
            'city',
            'zip_code',
            'notes',
            'address'
        ]));

        $booking = DB::transaction(function () use ($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver, $userId, $request) {
            $existing = SeaVehicleBookings::where('client_id', $userId)
                ->where('vehicle_id', $vehicle->id)
                ->where('status', 'pending')
                ->with('schedule')
                ->lockForUpdate()
                ->first();

            $overlap = SeaVehicleBookings::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending', 'confirmed'])
                ->when($existing, fn($q) => $q->where('id', '!=', $existing->id))
                ->whereHas('schedule', function ($q) use ($pickup , $dropoff) {
                    $q->where('pickup_at', '<', $dropoff)
                      ->where('dropoff_at', '>', $pickup );
                })
                ->lockForUpdate()
                ->exists();

            if ($overlap) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(422, 'Vehicle is not available for the selected dates.');
            }

            $calc = $this->calculateTotals($vehicle, $pickup , $dropoff, $addonsReq, $needsDriver);

            if ($existing) {
                $existing->update([
                    'price_per_day'   => $calc['price_per_day'],
                    'needs_driver'    => $calc['needs_driver'],
                    'driver_fee_per_day' => $calc['driver_fee_per_day'],
                    'rental_days'     => $calc['rental_days'],
                    'addons_total'    => $calc['addons_total'],
                    'subtotal'        => $calc['subtotal'],
                    'deposit_amount'  => $calc['deposit_amount'],
                    'advance_amount'  => $calc['advance_amount'],
                    'total_amount'    => $calc['total'],
                    'currency'        => $vehicle->currency,
                    'addons_snapshot' => $calc['addons_lines'],
                    'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                    'notes'           => $request->string('notes')->toString() ?: null,
                ]);

                if ($existing->schedule) {
                    $existing->schedule->update([
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                } else {
                    SeaVehicleBookingSchedule::create([
                        'sea_vehicle_booking_id' => $existing->id,
                        'pickup_at'        => $pickup ,
                        'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                        'dropoff_at'       => $dropoff,
                        'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
                    ]);
                }

                SeaVehicleBookingAddon::where('sea_vehicle_booking_id', $existing->id)->delete();
                foreach ($calc['addons_lines'] as $line) {
                    SeaVehicleBookingAddon::create([
                        'sea_vehicle_booking_id' => $existing->id,
                        'vehicle_id'      => $existing->vehicle_id,
                        'name'       => $line['name'],
                        'price'      => $line['price'],
                        'qty'        => $line['qty'],
                        'line_total' => $line['line_total'],
                    ]);
                }

                return $existing->fresh(['schedule', 'addons']);
            }

            $booking = SeaVehicleBookings::create([
                'client_id'       => $userId,
                'vehicle_id'      => $vehicle->id,
                'status'          => 'pending',
                'price_per_day'   => $calc['price_per_day'],
                'needs_driver'    => $calc['needs_driver'],
                'driver_fee_per_day' => $calc['driver_fee_per_day'],
                'rental_days'     => $calc['rental_days'],
                'addons_total'    => $calc['addons_total'],
                'subtotal'        => $calc['subtotal'],
                'deposit_amount'  => $calc['deposit_amount'],
                'advance_amount'  => $calc['advance_amount'],
                'total_amount'    => $calc['total'],
                'currency'        => $vehicle->currency,
                'addons_snapshot' => $calc['addons_lines'],
                'vehicle_snapshot'=> $calc['vehicle_snapshot'],
                'notes'           => $request->string('notes')->toString() ?: null,
            ]);

            SeaVehicleBookingSchedule::create([
                'sea_vehicle_booking_id' => $booking->id,
                'pickup_at'        => $pickup ,
                'pickup_location'  => $request->string('pickup_location')->toString() ?: null,
                'dropoff_at'       => $dropoff,
                'dropoff_location' => $request->string('dropoff_location')->toString() ?: null,
            ]);

            foreach ($calc['addons_lines'] as $line) {
                SeaVehicleBookingAddon::create([
                    'sea_vehicle_booking_id' => $booking->id,
                    'vehicle_id'      => $booking->vehicle_id,
                    'name'       => $line['name'],
                    'price'      => $line['price'],
                    'qty'        => $line['qty'],
                    'line_total' => $line['line_total'],
                ]);
            }

            return $booking->fresh(['schedule', 'addons']);
        });

        return redirect()->route('client.seaBookings.payments', $booking->id)
            ->with('success', 'Booking created. Continue with payment.');
    }

       private function authorizeSeaVehicleBooking(SeaVehicleBookings $seaVehicleBooking): void
    {
        $user = Auth::user();
        if (!$user) abort(403);
        if ($user->role !== 'client' && $user->id !== $seaVehicleBooking->client_id) abort(403);
    }

        /** RENDER:  Sea Vehicle Payments page */
     public function seaVehiclePayments(SeaVehicleBookings $seaVehicleBooking, WalletService $wallets)
{
    $this->authorizeSeaVehicleBooking($seaVehicleBooking);
    $seaVehicleBooking->load('vehicle', 'schedule', 'addons', 'customer');

    $wallet = $wallets->walletFor(Auth::user());

    return Inertia::render('Web/components/SeaVehicleDetails/Payments', [
        'booking' => $seaVehicleBooking,
        'wallet' => [
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
        ],
    ]);
}

   /** CONFIRM: POST /seaBookings/{seaVehicleBooking}/confirm */
    public function seaVehicleConfirm(Request $request, SeaVehicleBookings $seaVehicleBooking, WalletService $wallets)
    {

        $this->authorizeSeaVehicleBooking($seaVehicleBooking);

        $validated = $request->validate([
            'payment_method' => ['required', 'in:PayHere,Wallet'],
            'payment_option' => ['required', 'in:full,advance'],
        ]);

        // The wallet only ever holds LKR; a non-LKR booking debited 1:1 with
        // no conversion would silently charge the wrong amount.
        if ($validated['payment_method'] === 'Wallet' && strtoupper((string) ($seaVehicleBooking->currency ?? 'LKR')) !== 'LKR') {
            return back()->withErrors(['payment_method' => 'Wallet payments are only available for LKR bookings.']);
        }

        $payNow = $validated['payment_option'] === 'full'
            ? $seaVehicleBooking->total_amount
            : min($seaVehicleBooking->advance_amount ?: 0, $seaVehicleBooking->total_amount);

        $isPayHere = $validated['payment_method'] === 'PayHere';

        try {
            DB::transaction(function () use ($seaVehicleBooking, $validated, $payNow, $request, $wallets, $isPayHere) {
                if ($validated['payment_method'] === 'Wallet') {
                    $wallets->debit(
                        Auth::user(),
                        (float) $payNow,
                        'payment',
                        'Sea vehicle booking #' . $seaVehicleBooking->id,
                        'SeaVehicleBooking',
                        $seaVehicleBooking->id
                    );
                }

                if ($isPayHere) {
                    SeaVehicleBookingPayment::create([
                        'sea_vehicle_booking_id' => $seaVehicleBooking->id,
                        'method'           => 'PayHere',
                        'option'           => $validated['payment_option'],
                        'amount_paid'      => $payNow,
                        'status'           => SeaVehicleBookingPayment::STATUS_PENDING,
                        'tx_reference'     => null,
                        'provider'         => 'payhere',
                        'gateway_order_id' => $this->generateGatewayOrderId('SEA'),
                        'initiated_at'     => now(),
                    ]);
                } else {
                    // Use the dedicated sea booking payments table to avoid FK conflicts
                    SeaVehicleBookingPayment::create([
                        'sea_vehicle_booking_id' => $seaVehicleBooking->id,
                        'method'       => $validated['payment_method'],
                        'option'       => $validated['payment_option'],
                        'amount_paid'  => $payNow,
                        'status'       => 'paid',
                        'tx_reference' => null,
                    ]);
                }

                $rawPersonal = (array) $request->session()->pull('booking_personal', []);
                    if ($rawPersonal && !$seaVehicleBooking->customer) {
                    $personal = Validator::make($rawPersonal, [
                        'first_name'   => ['nullable', 'string', 'max:255'],
                        'last_name'    => ['nullable', 'string', 'max:255'],
                        'email'        => ['nullable', 'email', 'max:255'],
                        'phone'        => ['nullable', 'regex:/^\+?\d{7,15}$/', 'max:20'],
                        'country_code' => ['nullable', 'string', 'max:5'],
                        'city'         => ['nullable', 'string', 'max:255'],
                        'zip_code'     => ['nullable', 'string', 'max:20'],
                        'age'          => ['nullable', 'integer', 'min:18', 'max:120'],
                        'address'      => ['nullable', 'string', 'max:255'],
                        'notes'        => ['nullable', 'string'],
                    ])->validate();

                    if (collect($personal)->filter(fn($v) => filled($v))->isNotEmpty()) {
                        // For sea vehicle bookings create a dedicated sea booking customer row.
                        SeaVehicleBookingCustomer::create(array_merge($personal, ['sea_vehicle_booking_id' => $seaVehicleBooking->id]));
                    }
                }

                $seaVehicleBooking->load('schedule');
                $overlap = SeaVehicleBookings::where('vehicle_id', $seaVehicleBooking->vehicle_id)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->where('id', '!=', $seaVehicleBooking->id)
                    ->whereHas('schedule', function ($q) use ($seaVehicleBooking) {
                        $q->where('pickup_at', '<', $seaVehicleBooking->schedule->dropoff_at)
                          ->where('dropoff_at', '>', $seaVehicleBooking->schedule->pickup_at);
                    })
                    ->lockForUpdate()
                    ->exists();
                if ($overlap) {
                    abort(422, 'Vehicle is no longer available for those dates.');
                }

                if (!$isPayHere) {
                    $seaVehicleBooking->update(['status' => 'confirmed']);
                }
                $request->session()->forget(['booking_trip']);
            });
        } catch (InsufficientWalletBalanceException $e) {
            return back()->withErrors(['wallet' => 'Insufficient wallet balance for this payment.'])->withInput();
        }

        if ($isPayHere) {
            return redirect()->route('client.seaBookings.payhere.checkout', $seaVehicleBooking->id)
                ->with('success', 'Continue with PayHere to complete your payment.');
        }

        // Use a proper redirect so we can flash session data with ->with()
        return redirect()->route('client.seaBookings.summary', $seaVehicleBooking->id)
            ->with('success', 'Booking confirmed!');
    }

    /** RENDER: Summary page */
    public function seaVehicleSummary(SeaVehicleBookings $seaVehicleBooking)
    {
        // Use the sea-specific authorizer and the correct model type.
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);
        $seaVehicleBooking->load('vehicle', 'vehicle.provider', 'schedule', 'addons', 'payments', 'customer');

        return Inertia::render('Web/home/seaVehicle/Summary', [
            'booking' => $seaVehicleBooking,
        ]);
    }

    public function getAirVehicleCancellationPolicy(AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeAirVehicleBooking($airVehicleBooking);

        $cancellationService = app(VehicleBookingCancellationService::class);
        return response()->json($cancellationService->getRefundPreview($airVehicleBooking, 'client'));
    }

    public function getSeaVehicleCancellationPolicy(SeaVehicleBookings $seaVehicleBooking)
    {
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);

        $cancellationService = app(VehicleBookingCancellationService::class);
        return response()->json($cancellationService->getRefundPreview($seaVehicleBooking, 'client'));
    }

    public function airVehicleCancel(Request $request, AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeAirVehicleBooking($airVehicleBooking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancellationService = app(VehicleBookingCancellationService::class);

        $result = $cancellationService->cancelBooking(
            $airVehicleBooking,
            'client',
            $validated['reason'] ?? null,
            Auth::id()
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function seaVehicleCancel(Request $request, SeaVehicleBookings $seaVehicleBooking)
    {
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancellationService = app(VehicleBookingCancellationService::class);

        $result = $cancellationService->cancelBooking(
            $seaVehicleBooking,
            'client',
            $validated['reason'] ?? null,
            Auth::id()
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Get cancellation policy and refund preview for a booking
     * GET /bookings/{id}/cancellation-policy
     */
    public function getCancellationPolicy(Booking $booking)
    {
        $this->authorizeBooking($booking);

        $cancellationService = app(VehicleBookingCancellationService::class);
        return response()->json($cancellationService->getRefundPreview($booking, 'client'));
    }

    /**
     * Cancel a vehicle booking (client-initiated)
     * POST /bookings/{id}/cancel
     */
    public function cancelBooking(Request $request, Booking $booking)
    {
        $this->authorizeBooking($booking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancellationService = app(VehicleBookingCancellationService::class);
        
        $result = $cancellationService->cancelBooking(
            $booking,
            'client',
            $validated['reason'] ?? null,
            Auth::id()
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Vendor: Get cancellation policy for a booking
     * GET /bookings/{id}/vendor/cancellation-policy
     */
    public function getVendorCancellationPolicy(Booking $booking)
    {
        $this->authorizeBookingVendor($booking);

        $cancellationService = app(VehicleBookingCancellationService::class);
        return response()->json($cancellationService->getRefundPreview($booking, 'vendor'));
    }

    /**
     * Vendor: Cancel a vehicle booking (vendor-initiated)
     * POST /bookings/{id}/vendor/cancel
     */
    public function cancelBookingAsVendor(Request $request, Booking $booking)
    {
        $this->authorizeBookingVendor($booking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancellationService = app(VehicleBookingCancellationService::class);
        
        $result = $cancellationService->cancelBooking(
            $booking,
            'vendor',
            $validated['reason'] ?? null,
            Auth::id()
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    /**
     * Authorize that the user is the booking's vendor
     */
    private function authorizeBookingVendor(Booking $booking)
    {
        $booking->load('vehicle');

        if ($booking->vehicle->provider_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }
    }

    /* =========================================================================
     | PayHere checkout for vehicle rental (land / air / sea)
     |
     | Land/air/sea each keep their own *_booking_payments table (see
     | BookingPayment / AirVehicleBookingPayment / SeaVehicleBookingPayment),
     | but the gateway plumbing itself — building the checkout payload,
     | verifying signatures, resolving status — is identical across all three,
     | so it's centralized here instead of duplicated per type. Mirrors
     | App\Http\Controllers\Client\WalletController's PayHere pattern, and the
     | reference-prefix dispatch in App\Http\Controllers\QuickTrackController.
     * ========================================================================= */

    /** RENDER: Land PayHere checkout page. GET /client/bookings/{booking}/payhere/checkout */
    public function paymentCheckout(Booking $booking)
    {
        $this->authorizeBooking($booking);
        $booking->load('vehicle', 'schedule');

        $payment = BookingPayment::where('booking_id', $booking->id)->latest('id')->first();
        if (!$payment || $payment->provider !== 'payhere') {
            return redirect()->route('client.bookings.payments', $booking->id)
                ->with('error', 'No PayHere payment is pending for this booking.');
        }

        $gateway = app(PayHereGatewayService::class);
        $checkout = $this->buildVehiclePayHereCheckout(
            $gateway,
            $payment,
            'Vehicle rental booking #' . $booking->id,
            'client.bookings.payhere.return',
            'client.bookings.payhere.cancel',
            'client.bookings.payhere.notify',
            (string) ($booking->currency ?? 'LKR')
        );

        return Inertia::render('Web/home/vehicle/PaymentCheckout', [
            'vehicleType' => 'land',
            'booking' => $booking,
            'payment' => $this->serializeVehiclePayment($payment),
            'checkout' => $checkout,
            'pollingUrl' => route('client.bookings.payhere.status', $booking->id),
            'retryUrl' => route('client.bookings.payhere.retry', $booking->id),
            'summaryUrl' => route('client.bookings.summary', $booking->id),
            'paymentsUrl' => route('client.bookings.payments', $booking->id),
        ]);
    }

    /** JSON polling: GET /client/bookings/{booking}/payhere/status */
    public function paymentStatus(Booking $booking)
    {
        $this->authorizeBooking($booking);
        $payment = BookingPayment::where('booking_id', $booking->id)->latest('id')->first();

        return response()->json([
            'payment' => $payment ? $this->serializeVehiclePayment($payment) : null,
            'bookingStatus' => $booking->fresh()->status,
        ]);
    }

    /** POST /client/bookings/{booking}/payhere/retry */
    public function paymentRetry(Booking $booking)
    {
        $this->authorizeBooking($booking);
        $payment = BookingPayment::where('booking_id', $booking->id)->latest('id')->first();

        return $this->retryVehiclePayment(
            $payment,
            'VEH',
            route('client.bookings.payhere.checkout', $booking->id),
            route('client.bookings.payments', $booking->id)
        );
    }

    /** RENDER: Air PayHere checkout page. GET /client/airBookings/{airVehicleBooking}/payhere/checkout */
    public function airPaymentCheckout(AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeAirVehicleBooking($airVehicleBooking);
        $airVehicleBooking->load('vehicle', 'schedule');

        $payment = AirVehicleBookingPayment::where('air_vehicle_booking_id', $airVehicleBooking->id)->latest('id')->first();
        if (!$payment || $payment->provider !== 'payhere') {
            return redirect()->route('client.airBookings.payments', $airVehicleBooking->id)
                ->with('error', 'No PayHere payment is pending for this booking.');
        }

        $gateway = app(PayHereGatewayService::class);
        $checkout = $this->buildVehiclePayHereCheckout(
            $gateway,
            $payment,
            'Air vehicle booking #' . $airVehicleBooking->id,
            'client.airBookings.payhere.return',
            'client.airBookings.payhere.cancel',
            'client.airBookings.payhere.notify',
            (string) ($airVehicleBooking->currency ?? 'LKR')
        );

        return Inertia::render('Web/home/vehicle/PaymentCheckout', [
            'vehicleType' => 'air',
            'booking' => $airVehicleBooking,
            'payment' => $this->serializeVehiclePayment($payment),
            'checkout' => $checkout,
            'pollingUrl' => route('client.airBookings.payhere.status', $airVehicleBooking->id),
            'retryUrl' => route('client.airBookings.payhere.retry', $airVehicleBooking->id),
            'summaryUrl' => route('client.airBookings.summary', $airVehicleBooking->id),
            'paymentsUrl' => route('client.airBookings.payments', $airVehicleBooking->id),
        ]);
    }

    /** JSON polling: GET /client/airBookings/{airVehicleBooking}/payhere/status */
    public function airPaymentStatus(AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeAirVehicleBooking($airVehicleBooking);
        $payment = AirVehicleBookingPayment::where('air_vehicle_booking_id', $airVehicleBooking->id)->latest('id')->first();

        return response()->json([
            'payment' => $payment ? $this->serializeVehiclePayment($payment) : null,
            'bookingStatus' => $airVehicleBooking->fresh()->status,
        ]);
    }

    /** POST /client/airBookings/{airVehicleBooking}/payhere/retry */
    public function airPaymentRetry(AirVehicleBookings $airVehicleBooking)
    {
        $this->authorizeAirVehicleBooking($airVehicleBooking);
        $payment = AirVehicleBookingPayment::where('air_vehicle_booking_id', $airVehicleBooking->id)->latest('id')->first();

        return $this->retryVehiclePayment(
            $payment,
            'AIR',
            route('client.airBookings.payhere.checkout', $airVehicleBooking->id),
            route('client.airBookings.payments', $airVehicleBooking->id)
        );
    }

    /** RENDER: Sea PayHere checkout page. GET /client/seaBookings/{seaVehicleBooking}/payhere/checkout */
    public function seaPaymentCheckout(SeaVehicleBookings $seaVehicleBooking)
    {
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);
        $seaVehicleBooking->load('vehicle', 'schedule');

        $payment = SeaVehicleBookingPayment::where('sea_vehicle_booking_id', $seaVehicleBooking->id)->latest('id')->first();
        if (!$payment || $payment->provider !== 'payhere') {
            return redirect()->route('client.seaBookings.payments', $seaVehicleBooking->id)
                ->with('error', 'No PayHere payment is pending for this booking.');
        }

        $gateway = app(PayHereGatewayService::class);
        $checkout = $this->buildVehiclePayHereCheckout(
            $gateway,
            $payment,
            'Sea vehicle booking #' . $seaVehicleBooking->id,
            'client.seaBookings.payhere.return',
            'client.seaBookings.payhere.cancel',
            'client.seaBookings.payhere.notify',
            (string) ($seaVehicleBooking->currency ?? 'LKR')
        );

        return Inertia::render('Web/home/vehicle/PaymentCheckout', [
            'vehicleType' => 'sea',
            'booking' => $seaVehicleBooking,
            'payment' => $this->serializeVehiclePayment($payment),
            'checkout' => $checkout,
            'pollingUrl' => route('client.seaBookings.payhere.status', $seaVehicleBooking->id),
            'retryUrl' => route('client.seaBookings.payhere.retry', $seaVehicleBooking->id),
            'summaryUrl' => route('client.seaBookings.summary', $seaVehicleBooking->id),
            'paymentsUrl' => route('client.seaBookings.payments', $seaVehicleBooking->id),
        ]);
    }

    /** JSON polling: GET /client/seaBookings/{seaVehicleBooking}/payhere/status */
    public function seaPaymentStatus(SeaVehicleBookings $seaVehicleBooking)
    {
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);
        $payment = SeaVehicleBookingPayment::where('sea_vehicle_booking_id', $seaVehicleBooking->id)->latest('id')->first();

        return response()->json([
            'payment' => $payment ? $this->serializeVehiclePayment($payment) : null,
            'bookingStatus' => $seaVehicleBooking->fresh()->status,
        ]);
    }

    /** POST /client/seaBookings/{seaVehicleBooking}/payhere/retry */
    public function seaPaymentRetry(SeaVehicleBookings $seaVehicleBooking)
    {
        $this->authorizeSeaVehicleBooking($seaVehicleBooking);
        $payment = SeaVehicleBookingPayment::where('sea_vehicle_booking_id', $seaVehicleBooking->id)->latest('id')->first();

        return $this->retryVehiclePayment(
            $payment,
            'SEA',
            route('client.seaBookings.payhere.checkout', $seaVehicleBooking->id),
            route('client.seaBookings.payments', $seaVehicleBooking->id)
        );
    }

    /**
     * PayHere's browser return URL — shared across land/air/sea, dispatched by
     * the gateway_order_id prefix (VEH-/AIR-/SEA-). If the notify webhook
     * already landed first (common — PayHere often fires it before the
     * browser redirect completes) this just reflects the now-resolved state.
     * Otherwise it verifies the signature itself, with the same sandbox
     * fallback WalletController::handleReturn() uses.
     */
    public function handlePayHereReturn(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $resolved = $this->resolveVehiclePaymentByOrderId($orderId);

        if (!$resolved) {
            return redirect('/')->with('error', 'We could not find that payment.');
        }

        [$payment, $type, $booking] = $resolved;

        if ($payment->isPending()) {
            $gateway = app(PayHereGatewayService::class);
            $payload = $request->query();

            if ($gateway->verifyNotifySignature($payload)) {
                $this->applyResolvedVehiclePaymentStatus($gateway, $payment, $type, $booking, $payload);
            } elseif ($this->isPayHereSandbox() && $request->query('status_code') === null) {
                // Sandbox convenience: PayHere's sandbox return sometimes omits
                // status_code/signature entirely on a successful test payment.
                $this->markVehiclePaymentPaid($payment, $type, $booking, null, 'sandbox-return');
            }
        }

        return redirect()->route($this->payHereCheckoutRouteNameFor($type), [
            $this->vehicleRouteParamNameFor($type) => $booking->id,
        ]);
    }

    /** PayHere's browser cancel URL — shared across land/air/sea. */
    public function handlePayHereCancel(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $resolved = $this->resolveVehiclePaymentByOrderId($orderId);

        if ($resolved) {
            [$payment, $type, $booking] = $resolved;
            if ($payment->isPending()) {
                $payment->markFailed('Cancelled by customer at PayHere.');
            }

            return redirect()->route($this->paymentsRouteNameFor($type), [
                $this->vehicleRouteParamNameFor($type) => $booking->id,
            ])->with('error', 'Payment cancelled.');
        }

        return redirect('/')->with('error', 'Payment cancelled.');
    }

    /**
     * The actual PayHere webhook — shared across land/air/sea. PayHere expects
     * a plain-text 200 response, not JSON.
     */
    public function handlePayHereNotify(Request $request)
    {
        $payload = $request->all();
        $orderId = trim((string) ($payload['order_id'] ?? ''));

        $resolved = $this->resolveVehiclePaymentByOrderId($orderId);
        if (!$resolved) {
            Log::warning('PayHere vehicle notify: unknown order_id', ['order_id' => $orderId]);
            return response('order not found', 404);
        }

        [$payment, $type, $booking] = $resolved;

        $gateway = app(PayHereGatewayService::class);
        if (!$gateway->verifyNotifySignature($payload)) {
            Log::warning('PayHere vehicle notify: signature mismatch', ['order_id' => $orderId]);
            return response('invalid signature', 400);
        }

        $this->applyResolvedVehiclePaymentStatus($gateway, $payment, $type, $booking, $payload);

        return response('OK', 200);
    }

    /**
     * Resolves a PayHere order_id to its payment row + owning booking, purely
     * from the order_id's prefix (VEH-/AIR-/SEA-) — same reference-prefix
     * dispatch pattern QuickTrackController uses for tracking lookups.
     *
     * @return array{0: BookingPayment|AirVehicleBookingPayment|SeaVehicleBookingPayment, 1: string, 2: Booking|AirVehicleBookings|SeaVehicleBookings}|null
     */
    private function resolveVehiclePaymentByOrderId(string $orderId): ?array
    {
        if ($orderId === '') {
            return null;
        }

        $prefix = strtoupper(explode('-', $orderId)[0] ?? '');

        switch ($prefix) {
            case 'VEH':
                $payment = BookingPayment::where('gateway_order_id', $orderId)->latest('id')->first();
                if (!$payment) return null;
                $booking = Booking::find($payment->booking_id);
                return $booking ? [$payment, 'land', $booking] : null;

            case 'AIR':
                $payment = AirVehicleBookingPayment::where('gateway_order_id', $orderId)->latest('id')->first();
                if (!$payment) return null;
                $booking = AirVehicleBookings::find($payment->air_vehicle_booking_id);
                return $booking ? [$payment, 'air', $booking] : null;

            case 'SEA':
                $payment = SeaVehicleBookingPayment::where('gateway_order_id', $orderId)->latest('id')->first();
                if (!$payment) return null;
                $booking = SeaVehicleBookings::find($payment->sea_vehicle_booking_id);
                return $booking ? [$payment, 'sea', $booking] : null;

            default:
                return null;
        }
    }

    /**
     * Verifies + cross-validates a PayHere notify/return payload against the
     * expected order/amount/currency, then applies the resolved status.
     * Locked + idempotent — mirrors WalletController::applyResolvedStatus().
     */
    private function applyResolvedVehiclePaymentStatus(
        PayHereGatewayService $gateway,
        $payment,
        string $type,
        $booking,
        array $payload
    ): void {
        $paymentClass = get_class($payment);

        DB::transaction(function () use ($gateway, $paymentClass, $payment, $type, $booking, $payload) {
            $locked = $paymentClass::where('id', $payment->id)->lockForUpdate()->first();
            if (!$locked || $locked->isPaid()) {
                return; // idempotent — already applied
            }

            $callbackLog = is_array($locked->callback_payload) ? $locked->callback_payload : [];
            $callbackLog[] = ['at' => now()->toIso8601String(), 'payload' => $payload];
            $locked->forceFill(['callback_payload' => $callbackLog, 'last_notified_at' => now()])->save();

            $validation = $gateway->validateNotifyAgainstExpected($payload, [
                'orderId' => (string) $locked->gateway_order_id,
                'amount' => (float) $locked->amount_paid,
                'currency' => (string) ($booking->currency ?? 'LKR'),
            ]);

            if (!$validation['isValid']) {
                $locked->markFailed('Notify payload mismatch: ' . $validation['reason']);
                return;
            }

            $status = $gateway->normalizeStatusFromNotify($payload);
            $gatewayPaymentId = (string) ($payload['payment_id'] ?? '');

            if ($status === 'paid') {
                $locked->markPaid($gatewayPaymentId ?: null, $gatewayPaymentId ?: null, $status);
                $this->confirmVehicleBookingAfterPayment($type, $booking);
            } elseif (in_array($status, ['failed', 'cancelled'], true)) {
                $locked->markFailed("PayHere status: {$status}", $status);
            }
            // 'pending' from PayHere just leaves it pending — nothing to do.
        });
    }

    /** Sandbox-only fallback used when the return redirect carries no verifiable payload at all. */
    private function markVehiclePaymentPaid($payment, string $type, $booking, ?string $gatewayPaymentId, ?string $gatewayStatus): void
    {
        $paymentClass = get_class($payment);

        DB::transaction(function () use ($paymentClass, $payment, $type, $booking, $gatewayPaymentId, $gatewayStatus) {
            $locked = $paymentClass::where('id', $payment->id)->lockForUpdate()->first();
            if (!$locked || $locked->isPaid()) {
                return;
            }

            $locked->markPaid($gatewayPaymentId, $gatewayPaymentId, $gatewayStatus);
            $this->confirmVehicleBookingAfterPayment($type, $booking);
        });
    }

    /** Flips the owning booking to 'confirmed' once its PayHere payment clears. */
    private function confirmVehicleBookingAfterPayment(string $type, $booking): void
    {
        $modelClass = match ($type) {
            'land' => Booking::class,
            'air' => AirVehicleBookings::class,
            'sea' => SeaVehicleBookings::class,
        };

        $modelClass::where('id', $booking->id)->update(['status' => 'confirmed']);
    }

    /**
     * Shared retry: moves a failed/cancelled/expired payment back to pending
     * with a fresh gateway_order_id so the customer can go through PayHere
     * checkout again. Mirrors CourierPaymentController::retry().
     */
    private function retryVehiclePayment($payment, string $prefix, string $checkoutUrl, string $fallbackUrl)
    {
        if (!$payment) {
            return redirect($fallbackUrl)->with('error', 'No payment found to retry.');
        }

        if ($payment->isPaid()) {
            return redirect($fallbackUrl)->with('success', 'This payment is already completed.');
        }

        if ($payment->isPending()) {
            return redirect($checkoutUrl)->with('warning', 'A payment attempt is already pending. Continue with the current checkout session.');
        }

        $terminal = [$payment::STATUS_FAILED, $payment::STATUS_CANCELLED, $payment::STATUS_EXPIRED];
        if (!in_array($payment->status, $terminal, true)) {
            return redirect($fallbackUrl)->with('error', 'Payment cannot be retried from its current state.');
        }

        $payment->forceFill([
            'status' => $payment::STATUS_PENDING,
            'gateway_order_id' => $this->generateGatewayOrderId($prefix),
            'gateway_payment_id' => null,
            'tx_reference' => null,
            'gateway_status' => null,
            'failed_at' => null,
            'failure_reason' => null,
            'paid_at' => null,
            'last_notified_at' => null,
            'initiated_at' => now(),
        ])->save();

        return redirect($checkoutUrl)->with('success', 'Payment retry initialized. Continue with PayHere checkout.');
    }

    private function buildVehiclePayHereCheckout(
        PayHereGatewayService $gateway,
        $payment,
        string $itemsLabel,
        string $returnRouteName,
        string $cancelRouteName,
        string $notifyRouteName,
        string $currency = 'LKR'
    ): array {
        $user = Auth::user();
        [$firstName, $lastName] = $gateway->splitName((string) ($user->name ?? 'Customer'));

        return $gateway->buildCheckoutPayload([
            'orderId' => (string) $payment->gateway_order_id,
            'amount' => (float) $payment->amount_paid,
            'currency' => $currency,
            'items' => $itemsLabel,
            'returnUrl' => route($returnRouteName, ['order_id' => $payment->gateway_order_id]),
            'cancelUrl' => route($cancelRouteName, ['order_id' => $payment->gateway_order_id]),
            'notifyUrl' => route($notifyRouteName),
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => (string) ($user->email ?? ''),
            'phone' => (string) ($user->phone ?? ''),
        ]);
    }

    private function serializeVehiclePayment($payment): array
    {
        return [
            'id' => $payment->id,
            'status' => (string) $payment->status,
            'amount' => (float) $payment->amount_paid,
            'orderId' => (string) ($payment->gateway_order_id ?? ''),
            'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
            'failureReason' => (string) ($payment->failure_reason ?? ''),
        ];
    }

    private function generateGatewayOrderId(string $prefix): string
    {
        return $prefix . '-' . now()->format('ymd') . '-' . strtoupper(Str::random(8));
    }

    private function isPayHereSandbox(): bool
    {
        return (bool) config('services.payhere.sandbox', true);
    }

    private function paymentsRouteNameFor(string $type): string
    {
        return match ($type) {
            'land' => 'client.bookings.payments',
            'air' => 'client.airBookings.payments',
            'sea' => 'client.seaBookings.payments',
        };
    }

    private function payHereCheckoutRouteNameFor(string $type): string
    {
        return match ($type) {
            'land' => 'client.bookings.payhere.checkout',
            'air' => 'client.airBookings.payhere.checkout',
            'sea' => 'client.seaBookings.payhere.checkout',
        };
    }

    private function vehicleRouteParamNameFor(string $type): string
    {
        return match ($type) {
            'land' => 'booking',
            'air' => 'airVehicleBooking',
            'sea' => 'seaVehicleBooking',
        };
    }

}
