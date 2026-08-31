<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // No reference code existed at all for land vehicle bookings —
            // needed for the public "track your booking" page, same pattern
            // as courier_shipments.reference/tracking_pin.
            $table->string('booking_reference')->nullable()->unique()->after('id');
            $table->string('tracking_pin', 6)->nullable()->after('booking_reference');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['booking_reference', 'tracking_pin']);
        });
    }
};
