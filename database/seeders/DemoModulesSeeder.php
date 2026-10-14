<?php

namespace Database\Seeders;

use App\Models\ServiceSubCategory;
use App\Models\User;
use App\Models\VendorServiceRegistration;
use Illuminate\Database\Seeder;

/**
 * Re-runnable demo data for the vehicle rental, bus/train ticket, and warehouse
 * modules, plus the courier vendor. Every child seeder is idempotent, so this can
 * be run on a server that already has some of the data.
 */
class DemoModulesSeeder extends Seeder
{
    private const VENDOR_EMAIL = 'vendor@example.com';

    private const APPROVED_SUB_CATEGORIES = [
        'local-transportation',
        'public-government',
        'customs-bonded-warehouse',
    ];

    public function run(): void
    {
        $this->call([
            LocationDataSeeder::class,
            CourierDemoVendorSeeder::class,
            BusStationSeeder::class,
            BusSeeder::class,
            BusScheduleSeeder::class,
            TrainStationSeeder::class,
            TrainSeeder::class,
            TrainScheduleSeeder::class,
            VehicleCategorySeeder::class,
            DummyVehicleSeeder::class,
            WarehouseUnitSeeder::class,
        ]);

        $this->approveVendorRegistrations();
    }

    private function approveVendorRegistrations(): void
    {
        $vendor = User::where('email', self::VENDOR_EMAIL)->first();

        if (! $vendor) {
            $this->command?->warn('Demo vendor not found. Run DemoUsersSeeder first.');
            return;
        }

        foreach (self::APPROVED_SUB_CATEGORIES as $slug) {
            $subCategory = ServiceSubCategory::where('slug', $slug)->first();

            if (! $subCategory) {
                $this->command?->warn("Sub-category '{$slug}' not found. Run ServiceCategorySeeder first.");
                continue;
            }

            VendorServiceRegistration::updateOrCreate(
                [
                    'user_id' => $vendor->id,
                    'service_sub_category_id' => $subCategory->id,
                ],
                [
                    'service_category_id' => $subCategory->service_category_id,
                    'status' => 'approved',
                    'submitted_at' => now(),
                    'reviewed_at' => now(),
                ]
            );
        }
    }
}
