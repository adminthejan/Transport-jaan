<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouse_bookings', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('company_address');
            }
            if (!Schema::hasColumn('warehouse_bookings', 'tax_identification_number')) {
                $table->string('tax_identification_number', 50)->nullable()->after('postal_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            foreach (['postal_code', 'tax_identification_number'] as $column) {
                if (Schema::hasColumn('warehouse_bookings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
