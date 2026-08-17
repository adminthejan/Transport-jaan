<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleCategory;
use App\Models\LandVehicleSpec;
use App\Models\AirVehicleSpec;
use App\Models\SeaVehicleSpec;
use App\Models\VehicleMedia;
use App\Models\User;

/**
 * Adds a larger batch of demo Land/Air/Sea vehicles on top of the handful
 * VehicleSeeder ships with, so the vehicle rental list pages (4-column grid,
 * pagination, sort, filters) have enough real data to actually exercise —
 * 3 vehicles per type isn't enough to see any of that working.
 */
class DummyVehicleSeeder extends Seeder
{
    public function run(): void
    {
        $vendors = User::where('role', 'vendor')->where('status', 'verified')->get();
        $vendor = fn (int $i) => $vendors->isNotEmpty() ? $vendors[$i % $vendors->count()]->id : null;

        // Land body_type values don't map 1:1 to the 4 seeded VehicleCategory
        // rows (Car/SUV/Van/Truck), so bucket the wider spec enum down to
        // whichever existing category is the closest fit.
        $landCategoryFor = function (string $bodyType) {
            return match (true) {
                in_array($bodyType, ['suv', 'jeep', 'crossover'], true) => 'SUV',
                in_array($bodyType, ['van', 'bus'], true) => 'Van',
                in_array($bodyType, ['truck', 'pickup'], true) => 'Truck',
                default => 'Car',
            };
        };

        $categoryId = fn (string $type, string $name) => VehicleCategory::where('type', $type)->where('name', $name)->value('id');

        // ---------------------------------------------------------------
        // Land
        // ---------------------------------------------------------------
        $land = [
            ['reg' => 'LND-2001', 'manufacturer' => 'Honda', 'model' => 'Civic', 'body_type' => 'sedan', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 4, 'price' => 65, 'mileage' => 22000, 'colour' => 'Blue', 'condition' => 'used'],
            ['reg' => 'LND-2002', 'manufacturer' => 'Toyota', 'model' => 'Corolla', 'body_type' => 'sedan', 'fuel_type' => 'hybrid', 'transmission_type' => 'cvt', 'seats' => 5, 'doors' => 4, 'price' => 70, 'mileage' => 12000, 'colour' => 'White', 'condition' => 'new'],
            ['reg' => 'LND-2003', 'manufacturer' => 'Nissan', 'model' => 'X-Trail', 'body_type' => 'suv', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 7, 'doors' => 5, 'price' => 110, 'mileage' => 18000, 'colour' => 'Grey', 'condition' => 'used'],
            ['reg' => 'LND-2004', 'manufacturer' => 'Kia', 'model' => 'Sportage', 'body_type' => 'suv', 'fuel_type' => 'diesel', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 105, 'mileage' => 9000, 'colour' => 'Red', 'condition' => 'new'],
            ['reg' => 'LND-2005', 'manufacturer' => 'Hyundai', 'model' => 'Tucson', 'body_type' => 'suv', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 100, 'mileage' => 15000, 'colour' => 'Black', 'condition' => 'used'],
            ['reg' => 'LND-2006', 'manufacturer' => 'Mazda', 'model' => 'CX-5', 'body_type' => 'suv', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 115, 'mileage' => 11000, 'colour' => 'Soul Red', 'condition' => 'new'],
            ['reg' => 'LND-2007', 'manufacturer' => 'BMW', 'model' => '3 Series', 'body_type' => 'sedan', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 4, 'price' => 160, 'mileage' => 7000, 'colour' => 'Alpine White', 'condition' => 'new'],
            ['reg' => 'LND-2008', 'manufacturer' => 'Mercedes-Benz', 'model' => 'C-Class', 'body_type' => 'sedan', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 4, 'price' => 170, 'mileage' => 6000, 'colour' => 'Obsidian Black', 'condition' => 'new'],
            ['reg' => 'LND-2009', 'manufacturer' => 'Audi', 'model' => 'Q5', 'body_type' => 'suv', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 175, 'mileage' => 8000, 'colour' => 'Glacier White', 'condition' => 'new'],
            ['reg' => 'LND-2010', 'manufacturer' => 'Suzuki', 'model' => 'Alto', 'body_type' => 'hatchback', 'fuel_type' => 'petrol', 'transmission_type' => 'manual', 'seats' => 4, 'doors' => 4, 'price' => 35, 'mileage' => 30000, 'colour' => 'Silver', 'condition' => 'used'],
            ['reg' => 'LND-2011', 'manufacturer' => 'Suzuki', 'model' => 'Wagon R', 'body_type' => 'hatchback', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 45, 'mileage' => 21000, 'colour' => 'Blue', 'condition' => 'used'],
            ['reg' => 'LND-2012', 'manufacturer' => 'Perodua', 'model' => 'Axia', 'body_type' => 'hatchback', 'fuel_type' => 'petrol', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 5, 'price' => 40, 'mileage' => 17000, 'colour' => 'White', 'condition' => 'used'],
            ['reg' => 'LND-2013', 'manufacturer' => 'Toyota', 'model' => 'Prius', 'body_type' => 'hatchback', 'fuel_type' => 'hybrid', 'transmission_type' => 'cvt', 'seats' => 5, 'doors' => 5, 'price' => 80, 'mileage' => 14000, 'colour' => 'Silver', 'condition' => 'used'],
            ['reg' => 'LND-2014', 'manufacturer' => 'Ford', 'model' => 'Ranger', 'body_type' => 'pickup', 'fuel_type' => 'diesel', 'transmission_type' => 'automatic', 'seats' => 5, 'doors' => 4, 'price' => 130, 'mileage' => 26000, 'colour' => 'Grey', 'condition' => 'used'],
            ['reg' => 'LND-2015', 'manufacturer' => 'Isuzu', 'model' => 'D-Max', 'body_type' => 'pickup', 'fuel_type' => 'diesel', 'transmission_type' => 'manual', 'seats' => 5, 'doors' => 4, 'price' => 120, 'mileage' => 31000, 'colour' => 'White', 'condition' => 'used'],
            ['reg' => 'LND-2016', 'manufacturer' => 'Mitsubishi', 'model' => 'Montero Sport', 'body_type' => 'suv', 'fuel_type' => 'diesel', 'transmission_type' => 'automatic', 'seats' => 7, 'doors' => 5, 'price' => 135, 'mileage' => 19000, 'colour' => 'Black', 'condition' => 'used'],
        ];

        foreach ($land as $i => $v) {
            $vehicle = Vehicle::firstOrCreate(
                ['registration_number' => $v['reg']],
                [
                    'provider_id' => $vendor($i),
                    'type' => 'land',
                    'category_id' => $categoryId('land', $landCategoryFor($v['body_type'])),
                    'model' => $v['model'],
                    'manufacturer' => $v['manufacturer'],
                    'manufacture_year' => 2024 - ($i % 6),
                    'registration_year' => 2024 - ($i % 6),
                    'colour' => $v['colour'],
                    'condition' => $v['condition'],
                    'ownership_type' => $i % 3 === 0 ? 'partner_owned' : 'company_owned',
                    'passenger_capacity' => $v['seats'],
                    'mileage_km' => $v['mileage'],
                    'rental_price_per_day' => $v['price'],
                    'total_rental_price' => $v['price'] * 30,
                    'deposit_amount' => $v['price'] * 2,
                    'advance_payment_amount' => $v['price'],
                    'currency' => 'USD',
                    'insurance_provider' => 'ABC Insurance',
                    'gps' => $i % 2 === 0,
                    'child_seat' => $i % 4 === 0,
                    'wifi' => $i % 3 === 0,
                    'insurance_coverage' => true,
                    'status' => 'active',
                    'approval_status' => 'approved',
                    'description' => "{$v['manufacturer']} {$v['model']} available for daily rental.",
                ]
            );

            LandVehicleSpec::firstOrCreate(
                ['vehicle_id' => $vehicle->id],
                [
                    'body_type' => $v['body_type'],
                    'fuel_type' => $v['fuel_type'],
                    'transmission_type' => $v['transmission_type'],
                    'gears' => $v['transmission_type'] === 'manual' ? 5 : 6,
                    'seats' => $v['seats'],
                    'doors' => $v['doors'],
                    'fuel_tank_capacity_l' => 45 + ($i % 5) * 5,
                ]
            );

            $this->seedMedia($vehicle);
        }

        // ---------------------------------------------------------------
        // Air
        // ---------------------------------------------------------------
        $air = [
            ['reg' => 'AIR-3001', 'manufacturer' => 'Cessna', 'model' => '172 Skyhawk', 'aircraft_type' => 'fixed_wing', 'seats' => 4, 'price' => 1200, 'category' => 'Private Jet'],
            ['reg' => 'AIR-3002', 'manufacturer' => 'Gulfstream', 'model' => 'G650', 'aircraft_type' => 'fixed_wing', 'seats' => 14, 'price' => 9500, 'category' => 'Private Jet'],
            ['reg' => 'AIR-3003', 'manufacturer' => 'Beechcraft', 'model' => 'King Air 350', 'aircraft_type' => 'fixed_wing', 'seats' => 9, 'price' => 4200, 'category' => 'Private Jet'],
            ['reg' => 'AIR-3004', 'manufacturer' => 'Embraer', 'model' => 'Phenom 300', 'aircraft_type' => 'fixed_wing', 'seats' => 8, 'price' => 5300, 'category' => 'Private Jet'],
            ['reg' => 'AIR-3005', 'manufacturer' => 'Pilatus', 'model' => 'PC-12', 'aircraft_type' => 'fixed_wing', 'seats' => 9, 'price' => 3600, 'category' => 'Private Jet'],
            ['reg' => 'AIR-3006', 'manufacturer' => 'Robinson', 'model' => 'R44', 'aircraft_type' => 'helicopter', 'seats' => 4, 'price' => 1800, 'category' => 'Helicopter'],
            ['reg' => 'AIR-3007', 'manufacturer' => 'Bell', 'model' => '407', 'aircraft_type' => 'helicopter', 'seats' => 6, 'price' => 2600, 'category' => 'Helicopter'],
            ['reg' => 'AIR-3008', 'manufacturer' => 'Airbus', 'model' => 'H130', 'aircraft_type' => 'helicopter', 'seats' => 6, 'price' => 2900, 'category' => 'Helicopter'],
        ];

        foreach ($air as $i => $v) {
            $vehicle = Vehicle::firstOrCreate(
                ['registration_number' => $v['reg']],
                [
                    'provider_id' => $vendor($i),
                    'type' => 'air',
                    'category_id' => $categoryId('air', $v['category']),
                    'model' => $v['model'],
                    'manufacturer' => $v['manufacturer'],
                    'manufacture_year' => 2023 - ($i % 5),
                    'registration_year' => 2023 - ($i % 5),
                    'colour' => 'White',
                    'condition' => $i % 3 === 0 ? 'used' : 'new',
                    'ownership_type' => $i % 2 === 0 ? 'company_owned' : 'leased',
                    'passenger_capacity' => $v['seats'],
                    'mileage_km' => null,
                    'rental_price_per_day' => $v['price'],
                    'total_rental_price' => $v['price'] * 3,
                    'deposit_amount' => $v['price'] * 2,
                    'advance_payment_amount' => $v['price'],
                    'currency' => 'USD',
                    'insurance_provider' => 'Global Aviation Insurance',
                    'gps' => true,
                    'child_seat' => false,
                    'wifi' => $i % 2 === 0,
                    'insurance_coverage' => true,
                    'status' => 'active',
                    'approval_status' => 'approved',
                    'description' => "{$v['manufacturer']} {$v['model']} available for charter.",
                ]
            );

            AirVehicleSpec::firstOrCreate(
                ['vehicle_id' => $vehicle->id],
                [
                    'aircraft_type' => $v['aircraft_type'],
                    'base_airport_iata' => 'CMB',
                    'base_airport_icao' => 'VCBI',
                    'seats' => $v['seats'],
                    'crew_required' => $v['aircraft_type'] === 'helicopter' ? 1 : 2,
                    'range_km' => $v['aircraft_type'] === 'helicopter' ? 600 + $i * 20 : 3000 + $i * 200,
                    'mtow_kg' => $v['aircraft_type'] === 'helicopter' ? 2200 + $i * 50 : 6000 + $i * 300,
                    'cruising_speed_kts' => $v['aircraft_type'] === 'helicopter' ? 130 + $i * 5 : 350 + $i * 10,
                    'fuel_type' => 'jet_a1',
                    'flight_hours_total' => 800 + $i * 150,
                ]
            );

            $this->seedMedia($vehicle);
        }

        // ---------------------------------------------------------------
        // Sea
        // ---------------------------------------------------------------
        $sea = [
            ['reg' => 'BOA-4001', 'manufacturer' => 'Sunseeker', 'model' => 'Predator 50', 'vessel_type' => 'yacht', 'seats' => 10, 'price' => 1400, 'category' => 'Yacht'],
            ['reg' => 'BOA-4002', 'manufacturer' => 'Azimut', 'model' => '55 Flybridge', 'vessel_type' => 'yacht', 'seats' => 12, 'price' => 1650, 'category' => 'Yacht'],
            ['reg' => 'BOA-4003', 'manufacturer' => 'Princess', 'model' => 'V50', 'vessel_type' => 'yacht', 'seats' => 8, 'price' => 1350, 'category' => 'Yacht'],
            ['reg' => 'BOA-4004', 'manufacturer' => 'Lagoon', 'model' => '42', 'vessel_type' => 'catamaran', 'seats' => 12, 'price' => 1100, 'category' => 'Yacht'],
            ['reg' => 'BOA-4005', 'manufacturer' => 'Fountaine Pajot', 'model' => 'Lucia 40', 'vessel_type' => 'catamaran', 'seats' => 10, 'price' => 1050, 'category' => 'Yacht'],
            ['reg' => 'BOA-4006', 'manufacturer' => 'Sea Ray', 'model' => 'Sundancer 320', 'vessel_type' => 'boat', 'seats' => 8, 'price' => 700, 'category' => 'Boat'],
            ['reg' => 'BOA-4007', 'manufacturer' => 'Boston Whaler', 'model' => 'Montauk 210', 'vessel_type' => 'boat', 'seats' => 6, 'price' => 480, 'category' => 'Boat'],
            ['reg' => 'BOA-4008', 'manufacturer' => 'Bayliner', 'model' => 'VR6', 'vessel_type' => 'boat', 'seats' => 7, 'price' => 550, 'category' => 'Boat'],
        ];

        foreach ($sea as $i => $v) {
            $vehicle = Vehicle::firstOrCreate(
                ['registration_number' => $v['reg']],
                [
                    'provider_id' => $vendor($i),
                    'type' => 'sea',
                    'category_id' => $categoryId('sea', $v['category']),
                    'model' => $v['model'],
                    'manufacturer' => $v['manufacturer'],
                    'manufacture_year' => 2023 - ($i % 4),
                    'registration_year' => 2023 - ($i % 4),
                    'colour' => 'White',
                    'condition' => $i % 3 === 0 ? 'used' : 'new',
                    'ownership_type' => 'company_owned',
                    'passenger_capacity' => $v['seats'],
                    'mileage_km' => null,
                    'rental_price_per_day' => $v['price'],
                    'total_rental_price' => $v['price'] * 3,
                    'deposit_amount' => $v['price'] * 1.5,
                    'advance_payment_amount' => $v['price'],
                    'currency' => 'USD',
                    'insurance_provider' => 'Marine Cover Ltd',
                    'gps' => true,
                    'child_seat' => false,
                    'wifi' => $i % 2 === 0,
                    'insurance_coverage' => true,
                    'status' => 'active',
                    'approval_status' => 'approved',
                    'description' => "{$v['manufacturer']} {$v['model']} available for charter.",
                ]
            );

            SeaVehicleSpec::firstOrCreate(
                ['vehicle_id' => $vehicle->id],
                [
                    'vessel_type' => $v['vessel_type'],
                    'hull_material' => 'Fiberglass',
                    'length_m' => 7 + $i * 1.2,
                    'beam_m' => 2.4 + $i * 0.2,
                    'draft_m' => 0.6 + $i * 0.1,
                    'engine_type' => $v['vessel_type'] === 'boat' ? 'outboard' : 'inboard',
                    'engine_power_hp' => 250 + $i * 30,
                    'fuel_type' => 'diesel',
                    'cabins' => $v['vessel_type'] === 'boat' ? 0 : 2 + ($i % 3),
                    'berths' => $v['vessel_type'] === 'boat' ? 0 : 4 + ($i % 4),
                    'toilets' => $v['vessel_type'] === 'boat' ? 1 : 2,
                    'fuel_tank_l' => 300 + $i * 50,
                    'water_tank_l' => $v['vessel_type'] === 'boat' ? 0 : 300 + $i * 40,
                ]
            );

            $this->seedMedia($vehicle);
        }
    }

    private function seedMedia(Vehicle $vehicle): void
    {
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
