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
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->boolean('offers_fulfillment')->default(false)->after('tax_rate');
            // Percentage of the monthly rate charged for fulfillment (e.g. 15.00 = 15%).
            // Null while offers_fulfillment is true means "use the platform default".
            $table->decimal('fulfillment_fee_rate', 5, 2)->nullable()->after('offers_fulfillment');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->dropColumn(['offers_fulfillment', 'fulfillment_fee_rate']);
        });
    }
};
