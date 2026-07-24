<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleLike;
use App\Models\User;

class VehicleLikeSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();
        $users = User::whereIn('role', ['client', 'vendor'])->limit(3)->get();

        if ($vehicles->isEmpty() || $users->isEmpty()) {
            return;
        }

        foreach ($vehicles as $vehicle) {
            foreach ($users->take(2) as $user) {
                VehicleLike::firstOrCreate([
                    'user_id' => $user->id,
                    'vehicle_id' => $vehicle->id,
                ]);
            }
        }
    }
}
