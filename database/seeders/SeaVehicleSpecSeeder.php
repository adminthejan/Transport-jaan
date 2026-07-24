<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\SeaVehicleSpec;

class SeaVehicleSpecSeeder extends Seeder
{
    public function run(): void
    {
        $specs = [
            'SEA-9001' => [
                'vessel_type' => 'yacht',
                'hull_material' => 'Fiberglass',
                'length_m' => 15.50,
                'beam_m' => 4.20,
                'draft_m' => 1.80,
                'engine_type' => 'inboard',
                'engine_power_hp' => 450,
                'fuel_type' => 'diesel',
                'cabins' => 3,
                'berths' => 6,
                'toilets' => 2,
                'fuel_tank_l' => 800.00,
                'water_tank_l' => 500.00,
            ],
            'SEA-9002' => [
                'vessel_type' => 'boat',
                'hull_material' => 'Fiberglass',
                'length_m' => 7.60,
                'beam_m' => 2.60,
                'draft_m' => 0.60,
                'engine_type' => 'outboard',
                'engine_power_hp' => 300,
                'fuel_type' => 'petrol',
                'cabins' => 0,
                'berths' => 0,
                'toilets' => 1,
                'fuel_tank_l' => 220.00,
                'water_tank_l' => 0.00,
            ],
        ];

        foreach ($specs as $reg => $spec) {
            $vehicle = Vehicle::where('type', 'sea')->where('registration_number', $reg)->first();
            if ($vehicle) {
                SeaVehicleSpec::firstOrCreate(['vehicle_id' => $vehicle->id], $spec);
            }
        }
    }
}
