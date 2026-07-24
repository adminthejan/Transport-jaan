<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\LandVehicleSpec;

class LandVehicleSpecSeeder extends Seeder
{
    public function run(): void
    {
        // Values below must match the land_vehicle_specs enum columns exactly
        // (see database/migrations/2025_08_18_000200_create_land_vehicle_specs_table.php) —
        // title-case strings like 'Sedan'/'SUV' are NOT valid enum values and will
        // throw a "Data truncated for column" SQL error on insert.
        $map = [
            'ABC-1234' => [
                'body_type' => 'sedan',
                'fuel_type' => 'petrol',
                'transmission_type' => 'automatic',
                'gears' => 6,
                'seats' => 5,
                'doors' => 4,
                'fuel_tank_capacity_l' => 47.0,
            ],
            'SUV-7777' => [
                'body_type' => 'suv',
                'fuel_type' => 'diesel',
                'transmission_type' => 'automatic',
                'gears' => 6,
                'seats' => 7,
                'doors' => 5,
                'fuel_tank_capacity_l' => 55.0,
            ],
            'VAN-3456' => [
                'body_type' => 'van',
                'fuel_type' => 'diesel',
                'transmission_type' => 'manual',
                'gears' => 5,
                'seats' => 12,
                'doors' => 4,
                'fuel_tank_capacity_l' => 70.0,
            ],
        ];

        foreach ($map as $reg => $spec) {
            $vehicle = Vehicle::where('registration_number', $reg)->first();
            if ($vehicle) {
                LandVehicleSpec::firstOrCreate(
                    ['vehicle_id' => $vehicle->id],
                    $spec
                );
            }
        }
    }
}
