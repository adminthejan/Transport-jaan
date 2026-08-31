<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('air_vehicle_bookings', function (Blueprint $table) {
            $table->string('booking_reference')->nullable()->unique()->after('id');
            $table->string('tracking_pin', 6)->nullable()->after('booking_reference');
        });
    }

    public function down(): void
    {
        Schema::table('air_vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn(['booking_reference', 'tracking_pin']);
        });
    }
};
