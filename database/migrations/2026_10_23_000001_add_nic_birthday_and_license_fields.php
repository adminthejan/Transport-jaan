<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Oct-07 client amendments: passengers/customers give a NIC number on every
 * booking (land, air, sea, bus, train, flight), vehicle-rental customers give a
 * birthday instead of an age, and land/sea renters can supply licence details.
 * The profile (users) also stores NIC + birthday so forms can be pre-filled.
 *
 * Every column is nullable so existing rows stay valid.
 */
return new class extends Migration
{
    private array $customerTables = [
        'booking_customers',
        'air_vehicle_booking_customers',
        'sea_vehicle_booking_customers',
    ];

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nic_number', 20)->nullable();
            $table->date('date_of_birth')->nullable();
        });

        foreach ($this->customerTables as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('nic_number', 20)->nullable();
                $table->date('date_of_birth')->nullable();
                $table->string('license_number', 50)->nullable();
                $table->date('license_expiry_date')->nullable();
            });
        }

        foreach (['bus_bookings', 'train_bookings', 'flight_bookings'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->string('passenger_nic', 20)->nullable();
            });
        }

        // Train tickets: the class the passenger asked for (1st / 2nd / 3rd ...).
        Schema::table('train_bookings', function (Blueprint $table) {
            $table->string('passenger_class', 40)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('train_bookings', function (Blueprint $table) {
            $table->dropColumn('passenger_class');
        });

        foreach (['bus_bookings', 'train_bookings', 'flight_bookings'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropColumn('passenger_nic');
            });
        }

        foreach ($this->customerTables as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropColumn(['nic_number', 'date_of_birth', 'license_number', 'license_expiry_date']);
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['nic_number', 'date_of_birth']);
        });
    }
};
