<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Faker\Factory as Faker;

class WarehouseUnitSeeder extends Seeder
{
    /**
     * Seed 10 demo warehouse units for testing and development.
     */
    public function run(): void
    {
        $faker = Faker::create('en_US');

        $vendorIds = User::query()
            ->where('role', 'vendor')
            ->pluck('id')
            ->all();

        if (empty($vendorIds)) {
            $vendorIds = collect(range(1, 3))->map(function ($index) use ($faker) {
                return User::create([
                    'name' => $faker->name(),
                    'email' => "warehouse.vendor{$index}@example.com",
                    'password' => bcrypt('password123'),
                    'role' => 'vendor',
                ])->id;
            })->all();
        }

        $types = ['general_warehouse', 'bonded_warehouse', 'cold_storage', 'distribution_center', 'fulfillment_center', 'smart_warehouse'];
        $pricingModels = ['hourly', 'daily', 'monthly', 'yearly'];
        $capacityUnits = ['sq_ft', 'sq_m', 'cubic_ft', 'cubic_m'];

        $operatingHoursTemplate = [
            'monday' => ['open' => '08:00', 'close' => '18:00'],
            'tuesday' => ['open' => '08:00', 'close' => '18:00'],
            'wednesday' => ['open' => '08:00', 'close' => '18:00'],
            'thursday' => ['open' => '08:00', 'close' => '18:00'],
            'friday' => ['open' => '08:00', 'close' => '18:00'],
            'saturday' => ['open' => '09:00', 'close' => '15:00'],
            'sunday' => ['open' => null, 'close' => null],
        ];

    foreach (range(1, 10) as $index) {
            $type = Arr::random($types);
            $pricingModel = Arr::random($pricingModels);
            $basePrice = $faker->randomFloat(2, 1200, 9500);
            $monthlyRate = $pricingModel === 'monthly'
                ? $faker->randomFloat(2, $basePrice * 0.9, $basePrice * 1.2)
                : null;
            if ($monthlyRate === null) {
                $monthlyRate = round($basePrice, 2);
            }
            $securityDeposit = $faker->randomFloat(2, 500, 15000);
            $setupFee = $faker->randomFloat(2, 100, 1500);
            // Keep tax rate within DECIMAL(5,4) range (max 9.9999)
            $taxRate = $faker->randomFloat(3, 0, 9.5); // percentage

            $subtotal = $basePrice + $securityDeposit + $setupFee;
            $taxAmount = round($subtotal * ($taxRate / 100), 2);
            $finalAmount = $subtotal + $taxAmount;

            $operatingHours = collect($operatingHoursTemplate)->map(function ($hours, $day) use ($faker) {
                if ($faker->boolean(20)) {
                    return ucfirst($day) . ': Closed';
                }

                if (!$hours['open'] || !$hours['close']) {
                    return ucfirst($day) . ': Closed';
                }

                // Randomly shift opening/closing times by up to ±1 hour for variation
                $openOffset = $faker->numberBetween(-1, 1);
                $closeOffset = $faker->numberBetween(-1, 1);

                $openTime = now()->setTimeFromTimeString($hours['open'])->addHours($openOffset)->format('H:i');
                $closeTime = now()->setTimeFromTimeString($hours['close'])->addHours($closeOffset)->format('H:i');

                if ($openTime >= $closeTime) {
                    $closeTime = now()->setTimeFromTimeString($hours['close'])->addHour()->format('H:i');
                }

                return ucfirst($day) . ": {$openTime} - {$closeTime}";
            })->values()->all();

            $unit = WarehouseUnit::create([
                'user_id' => Arr::random($vendorIds),
                'name' => sprintf('%s Logistics Hub', Str::title($faker->words(2, true))),
                'description' => $faker->paragraphs(3, true),
                'address' => $faker->address(),
                'latitude' => $faker->latitude(5, 55),
                'longitude' => $faker->longitude(-125, -66),
                'total_area' => $faker->randomFloat(2, 8000, 45000),
                'capacity' => $faker->randomFloat(2, 5000, 40000),
                'capacity_unit' => Arr::random($capacityUnits),
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
                'contact_person' => $faker->name(),
                'contact_phone' => $faker->e164PhoneNumber(),
                'contact_email' => $faker->unique()->safeEmail(),
                'terms_conditions' => $faker->sentences(4, true),
                'terms_pdf_path' => null,
                'is_active' => $faker->boolean(80),
                'is_available' => $faker->boolean(75),
                'available_from' => now()->subDays($faker->numberBetween(0, 90)),
                'available_until' => $faker->boolean(60) ? now()->addDays($faker->numberBetween(30, 180)) : null,
                'operating_hours' => $operatingHours,
                'special_requirements' => $faker->boolean(40) ? $faker->sentence() : null,
                'restrictions' => $faker->boolean(40) ? $faker->sentence() : null,
            ]);

            $unit->approvals()->create([
                'status' => 'approved',
                'notes' => 'Seeded approval record',
                'reviewed_by' => null,
                'reviewed_at' => now()->subDays($faker->numberBetween(1, 10)),
                'approved_by' => null,
                'approved_at' => now()->subDays($faker->numberBetween(0, 5)),
                'expires_at' => $faker->boolean(30) ? now()->addMonths($faker->numberBetween(6, 18)) : null,
                'metadata' => [
                    'seeded' => true,
                    'reference' => "SEED-{$unit->id}"
                ],
            ]);
        }
    }
}
