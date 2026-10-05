<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Train;
use App\Models\User;

class TrainSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $trains = [
            [
                'name' => 'Baby Shan Travels',
                'train_number' => 'TRN001',
                'class_type' => 'Luxury (A/C)',
                'route_number' => '064/64R',
                'facilities' => ['AC', 'W', 'TV', 'USB', 'CCTV', 'WIFI'],
                'capacity' => 45,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Mathu Express - Highway',
                'train_number' => 'TRN002',
                'class_type' => 'Luxury (A/C)',
                'route_number' => '087',
                'facilities' => ['AC', 'W', 'TV', 'USB', 'CCTV', 'WIFI'],
                'capacity' => 60,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'North West Express',
                'train_number' => 'TRN003',
                'class_type' => 'Semi Luxury (NL)',
                'route_number' => '87/750/75/69',
                'facilities' => ['W', 'USB', 'CCTV'],
                'capacity' => 80,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Laksiri Express',
                'train_number' => 'TRN004',
                'class_type' => 'Luxury (A/C)',
                'route_number' => '87/750/75/69',
                'facilities' => ['AC', 'W', 'TV', 'USB', 'CCTV', 'WIFI'],
                'capacity' => 55,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Intercity Express',
                'train_number' => 'TRN005',
                'class_type' => '2nd Class',
                'route_number' => '1029',
                'facilities' => ['W', 'USB'],
                'capacity' => 120,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Colombo-Kandy Express',
                'train_number' => 'TRN006',
                'class_type' => '1st Class',
                'route_number' => '1010',
                'facilities' => ['AC', 'W', 'TV', 'USB', 'WIFI'],
                'capacity' => 40,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Coastal Express',
                'train_number' => 'TRN007',
                'class_type' => '2nd Class',
                'route_number' => 'CE001',
                'facilities' => ['W', 'USB'],
                'capacity' => 100,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ],
            [
                'name' => 'Hill Country Express',
                'train_number' => 'TRN008',
                'class_type' => 'Luxury (A/C)',
                'route_number' => 'HCE001',
                'facilities' => ['AC', 'W', 'TV', 'USB', 'CCTV', 'WIFI'],
                'capacity' => 35,
                'operator' => 'Sri Lanka Railways',
                'status' => 'active'
            ]
        ];

        $vendorId = User::where('email', 'vendor@example.com')->value('id');

        foreach ($trains as $train) {
            Train::updateOrCreate(
                ['train_number' => $train['train_number']],
                $train + ['vendor_id' => $vendorId]
            );
        }
    }
}
