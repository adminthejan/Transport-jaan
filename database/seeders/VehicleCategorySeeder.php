<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\VehicleCategory;

class VehicleCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['type' => 'land', 'name' => 'Car'],
            ['type' => 'land', 'name' => 'SUV'],
            ['type' => 'land', 'name' => 'Van'],
            ['type' => 'land', 'name' => 'Truck'],
            ['type' => 'air', 'name' => 'Private Jet'],
            ['type' => 'air', 'name' => 'Helicopter'],
            ['type' => 'sea', 'name' => 'Yacht'],
            ['type' => 'sea', 'name' => 'Boat'],
        ];

        foreach ($categories as $category) {
            VehicleCategory::firstOrCreate(['type' => $category['type'], 'name' => $category['name']]);
        }
    }
}
