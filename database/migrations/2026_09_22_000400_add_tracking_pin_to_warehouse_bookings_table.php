<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Warehouse bookings already have a booking_reference but, unlike every
     * other booking type on this platform (courier, land/air/sea vehicle,
     * bus, train), no tracking_pin — so they were left out of the public
     * "Track Any Order" feature entirely.
     */
    public function up(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->string('tracking_pin', 6)->nullable()->after('booking_reference');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->dropColumn('tracking_pin');
        });
    }
};
