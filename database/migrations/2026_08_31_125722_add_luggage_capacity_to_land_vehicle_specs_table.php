<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            // Number of standard-size bags/suitcases the boot/trunk can hold.
            $table->unsignedTinyInteger('luggage_capacity')->nullable()->after('doors');
        });
    }

    public function down(): void
    {
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            $table->dropColumn('luggage_capacity');
        });
    }
};
