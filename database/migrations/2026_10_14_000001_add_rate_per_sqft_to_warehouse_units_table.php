<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            // Price of one sq ft for one month. When set, bookings are priced as
            // required_space x rate_per_sqft instead of pro-rating monthly_rate.
            $table->decimal('rate_per_sqft', 12, 2)->nullable()->after('monthly_rate');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->dropColumn('rate_per_sqft');
        });
    }
};
