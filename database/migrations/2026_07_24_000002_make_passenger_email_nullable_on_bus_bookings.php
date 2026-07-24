<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BusBookingController validates passenger_email as 'nullable|email' (unlike
     * TrainController, which requires it), but the column was created NOT NULL —
     * so any bus booking submitted without an email crashes with a raw SQL error
     * instead of the validation ever having a chance to reject it. Align the
     * column with what the app has always intended to allow.
     */
    public function up(): void
    {
        Schema::table('bus_bookings', function (Blueprint $table) {
            $table->string('passenger_email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('bus_bookings', function (Blueprint $table) {
            $table->string('passenger_email')->nullable(false)->change();
        });
    }
};
