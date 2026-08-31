<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courier_shipments', function (Blueprint $table) {
            // Required alongside the sender/recipient email to unlock the
            // public tracking page — a reference number alone is guessable/
            // shareable and previously exposed full shipment details to
            // anyone who had it.
            $table->string('tracking_pin', 6)->nullable()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('courier_shipments', function (Blueprint $table) {
            $table->dropColumn('tracking_pin');
        });
    }
};
