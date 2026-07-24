<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehiclePolicy;

class VehiclePolicySeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();

        foreach ($vehicles as $vehicle) {
            if (VehiclePolicy::where('vehicle_id', $vehicle->id)->exists()) {
                continue;
            }

            VehiclePolicy::create([
                'vehicle_id' => $vehicle->id,
                'file_path' => 'vehicles/policies/' . $vehicle->id . '_terms_conditions.pdf',
                'original_name' => 'Vehicle_Terms_and_Conditions.pdf',
                'mime_type' => 'application/pdf',
                'size' => 245760, // ~240KB
                'disk' => 'public',
            ]);

            VehiclePolicy::create([
                'vehicle_id' => $vehicle->id,
                'file_path' => 'vehicles/policies/' . $vehicle->id . '_rental_agreement.pdf',
                'original_name' => 'Rental_Agreement.pdf',
                'mime_type' => 'application/pdf',
                'size' => 180224, // ~176KB
                'disk' => 'public',
            ]);
        }
    }
}
