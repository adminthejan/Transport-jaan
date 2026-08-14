<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // Reference data used by the courier country pickers — must run
            // before anyone tries to create an international shipment.
            LocationCountrySeeder::class ,

            // User seeders (must run first)
            SuperAdminSeeder::class ,
            DemoUsersSeeder::class ,
            VendorUsersSeeder::class ,
            DriverSeeder::class ,

            // Vehicle Category & Vehicle seeders
            VehicleCategorySeeder::class ,
            VehicleSeeder::class ,
            LandVehicleSpecSeeder::class ,
            AirVehicleSpecSeeder::class ,
            SeaVehicleSpecSeeder::class ,

            // Vehicle related data
            VehicleMediaSeeder::class ,
            VehicleDocumentSeeder::class ,
            VehicleCrewSeeder::class ,
            VehicleFeaturePricingSeeder::class ,
            VehiclePolicySeeder::class ,
            VehicleMaintenanceSeeder::class ,
            VehicleReviewSeeder::class ,
            VehicleLikeSeeder::class ,

            // Units
            UnitSeeder::class ,

            // Bookings
            BookingSeeder::class ,
            BookingScheduleSeeder::class ,
            BookingAddonSeeder::class ,
            //     BookingPaymentSeeder::class,
            BookingCustomerSeeder::class ,

            // Freight & Flight
            FreightQuoteSeeder::class ,
            FlightBookingSeeder::class ,

            // Bus & Train
            BusStationSeeder::class ,
            BusSeeder::class ,
            BusScheduleSeeder::class ,

            TrainStationSeeder::class ,
            TrainSeeder::class ,
            TrainScheduleSeeder::class ,

            // Warehouse
            WarehouseUnitSeeder::class ,

            // Service Categories for vendor registration
            ServiceCategorySeeder::class ,
            VendorUsersSeeder::class ,

            // Service-scoped RBAC
            CourierRbacSeeder::class ,
            SuperAdminCourierRbacSeeder::class ,
            LocationDataSeeder::class ,
        ]);
    }
}