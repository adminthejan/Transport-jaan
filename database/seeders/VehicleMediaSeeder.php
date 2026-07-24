<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleMedia;

class VehicleMediaSeeder extends Seeder
{
    public function run(): void
    {
        // No local vehicle images ship with the repo (no storage symlink, no seed
        // assets), so local paths like "vehicles/media/{id}_front.jpg" would just
        // 404. Use stable, deterministic placeholder photo URLs instead — the
        // VehicleMedia URL accessor already returns `path` as-is when it's a full
        // URL, so this renders correctly with zero extra setup.
        $vehicles = Vehicle::all();

        foreach ($vehicles as $vehicle) {
            $seed = $vehicle->registration_number ?: "vehicle-{$vehicle->id}";

            VehicleMedia::firstOrCreate(
                ['vehicle_id' => $vehicle->id, 'title' => 'Front View'],
                [
                    'media_type' => 'image',
                    'path' => "https://picsum.photos/seed/{$seed}-front/800/600",
                    'is_primary' => true,
                    'sort_order' => 1,
                ]
            );

            VehicleMedia::firstOrCreate(
                ['vehicle_id' => $vehicle->id, 'title' => 'Interior View'],
                [
                    'media_type' => 'image',
                    'path' => "https://picsum.photos/seed/{$seed}-interior/800/600",
                    'is_primary' => false,
                    'sort_order' => 2,
                ]
            );
        }
    }
}
