<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Models\User;

class VehicleMaintenanceSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();
        $admin = User::where('role', 'admin')->first();

        foreach ($vehicles as $vehicle) {
            if (VehicleMaintenance::where('vehicle_id', $vehicle->id)->exists()) {
                continue;
            }

            VehicleMaintenance::create([
                'vehicle_id' => $vehicle->id,
                'start_date' => now()->subMonths(2),
                'end_date' => now()->subMonths(2)->addDays(3),
                'reason' => 'Scheduled maintenance - Oil change and tire rotation',
                'created_by' => $admin?->id,
            ]);

            VehicleMaintenance::create([
                'vehicle_id' => $vehicle->id,
                'start_date' => now()->addMonths(3),
                'end_date' => now()->addMonths(3)->addDays(2),
                'reason' => 'Scheduled inspection and service',
                'created_by' => $admin?->id,
            ]);
        }
    }
}
