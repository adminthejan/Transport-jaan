<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('train_bookings', function (Blueprint $table) {
            // booking_reference already exists — only the PIN is new.
            $table->string('tracking_pin', 6)->nullable()->after('booking_reference');
        });
    }

    public function down(): void
    {
        Schema::table('train_bookings', function (Blueprint $table) {
            $table->dropColumn('tracking_pin');
        });
    }
};
