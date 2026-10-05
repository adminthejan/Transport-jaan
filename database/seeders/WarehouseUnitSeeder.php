<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WarehouseUnitSeeder extends Seeder
{
    /**
     * Seed demo warehouse units in real Sri Lankan cities (from the location
     * tables), owned by the demo vendor. Re-runnable: units are keyed by name.
     */
    public function run(): void
    {
        mt_srand(20260101);

        $vendorId = User::where('email', 'vendor@example.com')->value('id')
            ?? User::where('role', 'vendor')->value('id');

        if (! $vendorId) {
            $this->command?->warn('No vendor user found. Run DemoUsersSeeder first.');
            return;
        }

        $cities = DB::table('location_cities as c')
            ->join('location_districts as d', 'd.id', '=', 'c.district_id')
            ->join('location_provinces as p', 'p.id', '=', 'd.province_id')
            ->whereNotNull('c.latitude')
            ->whereNotNull('c.longitude')
            ->orderBy('c.name_en')
            ->limit(400)
            ->get(['c.name_en', 'c.postcode', 'c.latitude', 'c.longitude', 'd.name_en as district', 'p.name_en as province'])
            ->unique('name_en')
            ->values();

        if ($cities->isEmpty()) {
            $this->command?->warn('No Sri Lankan location data found. Run LocationDataSeeder first.');
            return;
        }

        $types = ['general_warehouse', 'bonded_warehouse', 'cold_storage', 'distribution_center', 'fulfillment_center', 'smart_warehouse'];
        $pricingModels = ['hourly', 'daily', 'monthly', 'yearly'];
        $capacityUnits = ['sq_ft', 'sq_m', 'cubic_ft', 'cubic_m'];

        $operatingHours = [
            'Monday: 08:00 - 18:00',
            'Tuesday: 08:00 - 18:00',
            'Wednesday: 08:00 - 18:00',
            'Thursday: 08:00 - 18:00',
            'Friday: 08:00 - 18:00',
            'Saturday: 09:00 - 15:00',
            'Sunday: Closed',
        ];

        $streets = ['Galle Road', 'Kandy Road', 'Negombo Road', 'Baseline Road', 'Industrial Estate Road', 'Main Street', 'Station Road', 'Puttalam Road'];

        $selectedCities = $cities->values()->filter(fn ($city, $index) => $index % max(1, intdiv($cities->count(), 10)) === 0)->take(10)->values();

        foreach ($selectedCities as $index => $city) {
            $type = $types[$index % count($types)];
            $pricingModel = $pricingModels[$index % count($pricingModels)];
            $basePrice = self::randomFloat(2, 1200, 9500);
            $monthlyRate = $pricingModel === 'monthly'
                ? self::randomFloat(2, $basePrice * 0.9, $basePrice * 1.2)
                : round($basePrice, 2);
            $securityDeposit = self::randomFloat(2, 500, 15000);
            $setupFee = self::randomFloat(2, 100, 1500);
            $taxRate = self::randomFloat(3, 0, 9.5);

            $subtotal = $basePrice + $securityDeposit + $setupFee;
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $finalAmount = $subtotal + $taxAmount;

            $unit = WarehouseUnit::updateOrCreate(
                ['name' => "{$city->name_en} Logistics Hub"],
                [
                    'user_id' => $vendorId,
                    'description' => "Demo warehouse in {$city->name_en}, {$city->district} District.",
                    'address' => random_int(1, 250) . ' ' . $streets[$index % count($streets)] . ", {$city->name_en}, {$city->district}, {$city->province}, Sri Lanka",
                    'latitude' => round((float) $city->latitude + self::randomFloat(4, -0.01, 0.01), 8),
                    'longitude' => round((float) $city->longitude + self::randomFloat(4, -0.01, 0.01), 8),
                    'total_area' => self::randomFloat(2, 8000, 45000),
                    'capacity' => self::randomFloat(2, 5000, 40000),
                    'capacity_unit' => $capacityUnits[$index % count($capacityUnits)],
                    'type' => $type,
                    'pricing_model' => $pricingModel,
                    'base_price' => $basePrice,
                    'monthly_rate' => $monthlyRate,
                    'security_deposit' => $securityDeposit,
                    'setup_fee' => $setupFee,
                    'tax_rate' => round($taxRate, 4),
                    'total_amount' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'final_amount' => $finalAmount,
                    'currency' => 'LKR',
                    'contact_person' => 'Vendor User',
                    'contact_phone' => '+94771234567',
                    'contact_email' => 'vendor@example.com',
                    'terms_conditions' => 'Demo terms. Storage is subject to inspection on arrival.',
                    'terms_pdf_path' => null,
                    'is_active' => true,
                    'is_available' => true,
                    'available_from' => now()->subDays(30),
                    'available_until' => now()->addMonths(6),
                    'operating_hours' => $operatingHours,
                    'special_requirements' => null,
                    'restrictions' => null,
                ]
            );

            if (! $unit->approvals()->exists()) {
                $unit->approvals()->create([
                    'status' => 'approved',
                    'notes' => 'Seeded approval record',
                    'reviewed_by' => null,
                    'reviewed_at' => now()->subDays(5),
                    'approved_by' => null,
                    'approved_at' => now()->subDays(3),
                    'expires_at' => null,
                    'metadata' => [
                        'seeded' => true,
                        'reference' => "SEED-{$unit->id}",
                    ],
                ]);
            }
        }
    }

    private static function randomFloat(int $decimals, float $min, float $max): float
    {
        return round($min + mt_rand() / mt_getrandmax() * ($max - $min), $decimals);
    }
}
