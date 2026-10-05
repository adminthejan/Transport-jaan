<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Bus;
use App\Models\User;

class BusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $buses = [
            [
                'name' => 'Baby Shan Express',
                'bus_number' => 'NB-1234',
                'bus_type' => 'Luxury (A/C) — 45 Seater',
                'route_number' => '064/64R',
                'facilities' => ['A/C', 'WiFi', 'USB', 'TV', 'Recline'],
                'capacity' => 45,
                'operator' => 'Baby Shan Travels',
                'status' => 'active'
            ],
            [
                'name' => 'Mathu Highway Express',
                'bus_number' => 'NC-4567',
                'bus_type' => 'Luxury (A/C) — 49 Seater',
                'route_number' => '087 (E01)',
                'facilities' => ['A/C', 'WiFi', 'USB', 'TV', 'Toilet'],
                'capacity' => 49,
                'operator' => 'Mathu Express — Highway',
                'status' => 'active'
            ],
            [
                'name' => 'North West Express',
                'bus_number' => 'NA-9912',
                'bus_type' => 'Semi Luxury (NL) — 40 Seater',
                'route_number' => '87/750/75/69',
                'facilities' => ['WiFi', 'USB'],
                'capacity' => 40,
                'operator' => 'North West (NON-AC)',
                'status' => 'active'
            ],
            [
                'name' => 'Laksiri Express',
                'bus_number' => 'NC-2211',
                'bus_type' => 'Luxury (A/C) — 45 Seater',
                'route_number' => '87/750/75/69',
                'facilities' => ['A/C', 'WiFi', 'USB', 'TV'],
                'capacity' => 45,
                'operator' => 'Laksiri Express (Non-AC)',
                'status' => 'active'
            ],
            [
                'name' => 'Laksiri Premium',
                'bus_number' => 'NC-7711',
                'bus_type' => 'Luxury (A/C) — 45 Seater',
                'route_number' => '87/750/75/69',
                'facilities' => ['A/C', 'WiFi', 'USB', 'TV', 'Recline', 'Toilet'],
                'capacity' => 45,
                'operator' => 'Laksiri Express',
                'status' => 'active'
            ]
        ];

        $vendorId = User::where('email', 'vendor@example.com')->value('id');

        foreach ($buses as $bus) {
            Bus::updateOrCreate(
                ['bus_number' => $bus['bus_number']],
                $bus + ['vendor_id' => $vendorId]
            );
        }
    }
}
