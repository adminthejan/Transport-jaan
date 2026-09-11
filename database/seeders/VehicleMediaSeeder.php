<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleMedia;

class VehicleMediaSeeder extends Seeder
{
    /**
     * A small set of real, type-matched photos for each vehicle type, stored
     * under storage/app/public/vehicles/seed/{type}/ (served via the public
     * disk symlink). Previously this seeder pointed every vehicle at a
     * randomly-seeded https://picsum.photos URL, which returns an arbitrary
     * stock photo (a bridge, a table of mugs, a building — anything) with no
     * relation to the vehicle's actual type. Cycling through a handful of
     * real land/sea/air photos per type, keyed off the vehicle id, at least
     * guarantees every listing shows a photo of the right kind of vehicle.
     */
    private const IMAGES_BY_TYPE = [
        'land' => [
            'vehicles/seed/land/1.jpg',
            'vehicles/seed/land/2.jpg',
            'vehicles/seed/land/3.png',
        ],
        'sea' => [
            'vehicles/seed/sea/1.jpg',
            'vehicles/seed/sea/2.jpg',
            'vehicles/seed/sea/3.jpg',
        ],
        'air' => [
            'vehicles/seed/air/1.jpg',
            'vehicles/seed/air/2.jpg',
        ],
    ];

    public function run(): void
    {
        $vehicles = Vehicle::all();

        foreach ($vehicles as $vehicle) {
            $pool = self::IMAGES_BY_TYPE[$vehicle->type] ?? self::IMAGES_BY_TYPE['land'];
            $count = count($pool);

            $frontImage = $pool[$vehicle->id % $count];
            // Offset by one (wrapping) so the "interior" shot differs from
            // the front one whenever more than one photo is available.
            $interiorImage = $pool[($vehicle->id + 1) % $count];

            VehicleMedia::updateOrCreate(
                ['vehicle_id' => $vehicle->id, 'title' => 'Front View'],
                [
                    'media_type' => 'image',
                    'path' => $frontImage,
                    'is_primary' => true,
                    'sort_order' => 1,
                ]
            );

            VehicleMedia::updateOrCreate(
                ['vehicle_id' => $vehicle->id, 'title' => 'Interior View'],
                [
                    'media_type' => 'image',
                    'path' => $interiorImage,
                    'is_primary' => false,
                    'sort_order' => 2,
                ]
            );
        }
    }
}
