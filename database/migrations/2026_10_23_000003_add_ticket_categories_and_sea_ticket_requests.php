<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Oct-07 amendment: Air tickets carry a category + sub-category (Scheduled Flights ->
 * Domestic Flights ...), and Sea tickets (Ferry / Cruise / Boat & Water Transfer /
 * Yacht & Experiences) get their own request table, handled like flight requests:
 * the customer asks, the team confirms price and availability.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->string('service_category', 80)->nullable();
            $table->string('service_sub_category', 80)->nullable();
        });

        Schema::create('sea_ticket_requests', function (Blueprint $table) {
            $table->id();
            $table->string('booking_reference')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category', 80);
            $table->string('sub_category', 80);
            $table->enum('trip_type', ['oneway', 'return'])->default('oneway');
            $table->string('departure_port');
            $table->string('arrival_port');
            $table->date('travel_date');
            $table->date('return_date')->nullable();
            $table->unsignedSmallInteger('adults')->default(1);
            $table->unsignedSmallInteger('children')->default(0);
            $table->string('name');
            $table->string('email');
            $table->string('phone', 20);
            $table->string('passenger_nic', 20)->nullable();
            $table->text('special_requests')->nullable();
            $table->enum('status', ['pending', 'quoted', 'confirmed', 'cancelled'])->default('pending');
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sea_ticket_requests');

        Schema::table('flight_bookings', function (Blueprint $table) {
            $table->dropColumn(['service_category', 'service_sub_category']);
        });
    }
};
