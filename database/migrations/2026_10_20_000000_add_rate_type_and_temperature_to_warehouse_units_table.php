<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            // How the listing is priced for customers: per sq ft, per CBM or a flat rate.
            if (!Schema::hasColumn('warehouse_units', 'rate_type')) {
                $table->string('rate_type', 20)->default('per_sqft')->after('pricing_model');
            }

            // Storage temperature range the facility can hold, in degrees Celsius.
            // Null on both = ambient storage (no temperature control).
            if (!Schema::hasColumn('warehouse_units', 'temperature_min_c')) {
                $table->decimal('temperature_min_c', 5, 1)->nullable()->after('rate_type');
            }
            if (!Schema::hasColumn('warehouse_units', 'temperature_max_c')) {
                $table->decimal('temperature_max_c', 5, 1)->nullable()->after('temperature_min_c');
            }
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            foreach (['rate_type', 'temperature_min_c', 'temperature_max_c'] as $column) {
                if (Schema::hasColumn('warehouse_units', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
