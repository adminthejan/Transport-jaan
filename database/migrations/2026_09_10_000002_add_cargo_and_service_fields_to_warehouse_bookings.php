<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->string('storage_unit')->nullable()->default('sqft')->after('required_space');
            $table->string('quantity')->nullable()->after('goods_description');
            $table->boolean('special_handling_required')->nullable()->default(false)->after('special_requirements');
            $table->boolean('delivery_pickup_required')->nullable()->default(false)->after('special_instructions');
            $table->string('delivery_pickup_address')->nullable()->after('delivery_pickup_required');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->dropColumn(['storage_unit', 'quantity', 'special_handling_required', 'delivery_pickup_required', 'delivery_pickup_address']);
        });
    }
};
