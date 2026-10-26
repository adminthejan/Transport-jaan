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

        // Oct-07 amendment: every air / sea vehicle type is also a selectable category.
        foreach (config('vehicle_types.air') as $label) {
            $categories[] = ['type' => 'air', 'name' => $label];
        }
        foreach (config('vehicle_types.sea') as $label) {
            $categories[] = ['type' => 'sea', 'name' => $label];
        }

        foreach ($categories as $category) {
            VehicleCategory::firstOrCreate(['type' => $category['type'], 'name' => $category['name']]);
        }
    }
}
