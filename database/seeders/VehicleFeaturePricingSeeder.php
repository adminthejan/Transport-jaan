<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleFeaturePricing;

class VehicleFeaturePricingSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();

        foreach ($vehicles as $vehicle) {
            if (VehicleFeaturePricing::where('vehicle_id', $vehicle->id)->exists()) {
                continue;
            }

            $features = match ($vehicle->type) {
                'land' => [
                    ['additional_feature_name' => 'GPS Navigation', 'additional_feature_price' => 10.00],
                    ['additional_feature_name' => 'Child Safety Seat', 'additional_feature_price' => 15.00],
                ],
                'air' => [
                    ['additional_feature_name' => 'In-flight Catering', 'additional_feature_price' => 500.00],
                    ['additional_feature_name' => 'Ground Transportation', 'additional_feature_price' => 200.00],
                ],
                'sea' => [
                    ['additional_feature_name' => 'Onboard Catering', 'additional_feature_price' => 250.00],
                    ['additional_feature_name' => 'Snorkeling Gear', 'additional_feature_price' => 50.00],
                ],
                default => [],
            };

            foreach ($features as $feature) {
                VehicleFeaturePricing::create(array_merge(
                    ['vehicle_id' => $vehicle->id],
                    $feature
                ));
            }
        }
    }
}
