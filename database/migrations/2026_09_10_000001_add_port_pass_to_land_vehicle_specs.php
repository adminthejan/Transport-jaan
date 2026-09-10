<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            $table->boolean('has_port_pass')->nullable()->default(false)->after('industry_category');
        });
    }

    public function down(): void
    {
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            $table->dropColumn('has_port_pass');
        });
    }
};
