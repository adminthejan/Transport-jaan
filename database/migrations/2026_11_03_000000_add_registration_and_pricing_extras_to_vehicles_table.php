<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('chassis_number', 64)->nullable()->after('registration_number');
            $table->string('engine_number', 64)->nullable()->after('chassis_number');
            $table->unsignedInteger('engine_capacity_cc')->nullable()->after('engine_number');
            $table->decimal('extra_km_charge', 12, 2)->nullable()->after('advance_payment_amount');
            $table->decimal('late_return_charge', 12, 2)->nullable()->after('extra_km_charge');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['chassis_number', 'engine_number', 'engine_capacity_cc', 'extra_km_charge', 'late_return_charge']);
        });
    }
};
