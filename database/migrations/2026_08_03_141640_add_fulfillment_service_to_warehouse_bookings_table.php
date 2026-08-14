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
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->boolean('fulfillment_service')->default(false)->after('storage_type');
            $table->decimal('add_ons_cost', 10, 2)->nullable()->after('setup_fee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->dropColumn(['fulfillment_service', 'add_ons_cost']);
        });
    }
};
