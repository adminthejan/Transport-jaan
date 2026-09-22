<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `booking_payments.method` and `air_vehicle_booking_payments.method`
     * were native MySQL ENUMs restricted to ('Credit Card','PayPal','Bank
     * Transfer') — never actually including 'Wallet', even though the PHP
     * validation already allowed it for land vehicle rental (a pre-existing,
     * never-actually-exercised bug: any real "pay with wallet" attempt would
     * have failed at the DB layer with a truncation error, same as the new
     * 'PayHere' value does now). sea_vehicle_booking_payments.method was
     * already a plain varchar and needs no change. Converting both to
     * varchar so the method values here don't need a migration every time
     * a payment option changes.
     */
    public function up(): void
    {
        Schema::table('booking_payments', function (Blueprint $table) {
            $table->string('method', 50)->change();
        });

        Schema::table('air_vehicle_booking_payments', function (Blueprint $table) {
            $table->string('method', 50)->change();
        });
    }

    public function down(): void
    {
        Schema::table('booking_payments', function (Blueprint $table) {
            $table->enum('method', ['Credit Card', 'PayPal', 'Bank Transfer'])->change();
        });

        Schema::table('air_vehicle_booking_payments', function (Blueprint $table) {
            $table->enum('method', ['Credit Card', 'PayPal', 'Bank Transfer'])->change();
        });
    }
};
