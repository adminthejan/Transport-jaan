<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('users')->cascadeOnDelete();

            $table->string('vehicle_type', 50)->nullable();
            $table->string('brand', 255)->nullable();
            $table->string('model', 255)->nullable();
            $table->string('registration_number', 255)->nullable();
            $table->string('base_location', 255)->nullable();
            $table->string('service_areas', 500)->nullable();

            $table->decimal('capacity_kg', 10, 2)->nullable();
            $table->decimal('volume_cbm', 10, 2)->nullable();
            $table->unsignedInteger('length_cm')->nullable();
            $table->unsignedInteger('width_cm')->nullable();
            $table->unsignedInteger('height_cm')->nullable();
            $table->string('fuel_type', 50)->nullable();
            $table->string('transmission_type', 50)->nullable();

            $table->string('insurance_provider', 255)->nullable();
            $table->decimal('price_per_km', 10, 2)->nullable();
            $table->decimal('base_fee', 10, 2)->nullable();
            $table->decimal('handling_surcharge', 10, 2)->nullable();

            $table->boolean('refrigerated')->default(false);
            $table->boolean('tail_lift')->default(false);
            $table->boolean('gps')->default(false);
            $table->boolean('fragile_support')->default(false);

            $table->string('status', 30)->default('Available');
            $table->unsignedInteger('units_count')->default(1);
            $table->text('description')->nullable();

            $table->timestamps();

            $table->index(['vendor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_vehicles');
    }
};
