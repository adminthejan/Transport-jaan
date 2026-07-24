<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A round trip is stored as two linked single-leg bookings (outbound +
        // return) sharing a round_trip_group_id, rather than one row with two
        // schedule columns. This lets every existing single-leg feature —
        // cancellation policy, ticket generation, seat-expiry job — work on
        // each leg unchanged; the group id is purely for displaying/cancelling
        // both legs together in the UI.
        Schema::table('bus_bookings', function (Blueprint $table) {
            $table->enum('trip_type', ['one_way', 'round_trip'])->default('one_way')->after('booking_reference');
            $table->uuid('round_trip_group_id')->nullable()->after('trip_type')->index();
            $table->enum('leg', ['outbound', 'return'])->nullable()->after('round_trip_group_id');
        });

        Schema::table('train_bookings', function (Blueprint $table) {
            $table->enum('trip_type', ['one_way', 'round_trip'])->default('one_way')->after('booking_reference');
            $table->uuid('round_trip_group_id')->nullable()->after('trip_type')->index();
            $table->enum('leg', ['outbound', 'return'])->nullable()->after('round_trip_group_id');
        });
    }

    public function down(): void
    {
        Schema::table('bus_bookings', function (Blueprint $table) {
            $table->dropColumn(['trip_type', 'round_trip_group_id', 'leg']);
        });

        Schema::table('train_bookings', function (Blueprint $table) {
            $table->dropColumn(['trip_type', 'round_trip_group_id', 'leg']);
        });
    }
};
