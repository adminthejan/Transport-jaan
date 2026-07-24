<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\AirVehicleSpec;

class AirVehicleSpecSeeder extends Seeder
{
    public function run(): void
    {
        $specs = [
            'N123JET' => [
                'aircraft_type' => 'fixed_wing',
                'icao_type_designator' => 'C25C',
                'base_airport_iata' => 'CMB',
                'base_airport_icao' => 'VCBI',
                'seats' => 7,
                'crew_required' => 2,
                'range_km' => 3700,
                'mtow_kg' => 6250,
                'cruising_speed_kts' => 380,
                'fuel_type' => 'jet_a1',
                'flight_hours_total' => 1500,
            ],
            'N456HEL' => [
                'aircraft_type' => 'helicopter',
                'icao_type_designator' => 'EC25',
                'base_airport_iata' => 'CMB',
                'base_airport_icao' => 'VCBI',
                'seats' => 5,
                'crew_required' => 1,
                'range_km' => 660,
                'mtow_kg' => 2250,
                'cruising_speed_kts' => 140,
                'fuel_type' => 'jet_a1',
                'flight_hours_total' => 2100,
            ],
        ];

        foreach ($specs as $reg => $spec) {
            $vehicle = Vehicle::where('type', 'air')->where('registration_number', $reg)->first();
            if ($vehicle) {
                AirVehicleSpec::firstOrCreate(['vehicle_id' => $vehicle->id], $spec);
            }
        }
    }
}
