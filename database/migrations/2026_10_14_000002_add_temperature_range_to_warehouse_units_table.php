<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            // Temperature range (deg C) the facility can hold. Both null = ambient / not controlled.
            $table->decimal('temp_min_c', 5, 1)->nullable()->after('capacity_unit');
            $table->decimal('temp_max_c', 5, 1)->nullable()->after('temp_min_c');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->dropColumn(['temp_min_c', 'temp_max_c']);
        });
    }
};
