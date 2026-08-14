<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('air_vehicle_bookings', function (Blueprint $table) {
            $table->boolean('needs_driver')->default(false)->after('price_per_day');
            $table->decimal('driver_fee_per_day', 10, 2)->nullable()->after('needs_driver');
        });

        Schema::table('sea_vehicle_bookings', function (Blueprint $table) {
            $table->boolean('needs_driver')->default(false)->after('price_per_day');
            $table->decimal('driver_fee_per_day', 10, 2)->nullable()->after('needs_driver');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('air_vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn(['needs_driver', 'driver_fee_per_day']);
        });

        Schema::table('sea_vehicle_bookings', function (Blueprint $table) {
            $table->dropColumn(['needs_driver', 'driver_fee_per_day']);
        });
    }
};
