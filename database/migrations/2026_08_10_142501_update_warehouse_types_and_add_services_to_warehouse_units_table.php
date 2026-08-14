<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: widen the enum to old + new values so existing rows stay valid
        // while we remap them.
        DB::statement("ALTER TABLE warehouse_units MODIFY type ENUM(
            'cold_storage','dry','bonded','open_yard','climate_controlled','hazmat',
            'general_warehouse','bonded_warehouse','distribution_center','fulfillment_center','smart_warehouse'
        ) DEFAULT 'general_warehouse'");

        // Step 2: remap legacy values onto the new client-facing taxonomy.
        DB::table('warehouse_units')->whereIn('type', ['dry', 'open_yard', 'hazmat'])
            ->update(['type' => 'general_warehouse']);
        DB::table('warehouse_units')->where('type', 'bonded')
            ->update(['type' => 'bonded_warehouse']);
        DB::table('warehouse_units')->where('type', 'climate_controlled')
            ->update(['type' => 'cold_storage']);
        // 'cold_storage' already matches the new taxonomy as-is.

        // Step 3: narrow the enum down to just the new taxonomy.
        DB::statement("ALTER TABLE warehouse_units MODIFY type ENUM(
            'general_warehouse','bonded_warehouse','cold_storage','distribution_center','fulfillment_center','smart_warehouse'
        ) DEFAULT 'general_warehouse'");

        Schema::table('warehouse_units', function (Blueprint $table) {
            // Multi-select service tags shown to clients as a separate filter
            // from warehouse type (Storage, Fulfillment, Distribution, etc.).
            $table->json('services')->nullable()->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->dropColumn('services');
        });

        DB::statement("ALTER TABLE warehouse_units MODIFY type ENUM(
            'cold_storage', 'dry', 'bonded', 'open_yard', 'climate_controlled', 'hazmat'
        ) DEFAULT 'dry'");
    }
};
