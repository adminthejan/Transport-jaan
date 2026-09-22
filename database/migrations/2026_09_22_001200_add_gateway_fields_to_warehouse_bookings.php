<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Warehouse bookings already have payment_method/payment_status/
     * transaction_reference directly on the row (no separate payment table),
     * but payment_method was free-text and nothing ever moved
     * payment_status off "pending" — there was no real gateway or wallet
     * path. Adding the same gateway columns used everywhere else so a real
     * PayHere checkout + webhook can drive payment_status here too.
     */
    public function up(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->string('provider')->nullable()->after('payment_status');
            $table->string('gateway_order_id')->nullable()->unique()->after('provider');
            $table->string('gateway_payment_id')->nullable()->after('gateway_order_id');
            $table->string('gateway_status')->nullable()->after('gateway_payment_id');
            $table->timestamp('initiated_at')->nullable()->after('gateway_status');
            $table->timestamp('failed_at')->nullable()->after('initiated_at');
            $table->timestamp('last_notified_at')->nullable()->after('failed_at');
            $table->text('failure_reason')->nullable()->after('last_notified_at');
            $table->json('gateway_payload')->nullable()->after('failure_reason');
            $table->json('callback_payload')->nullable()->after('gateway_payload');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_bookings', function (Blueprint $table) {
            $table->dropColumn([
                'provider', 'gateway_order_id', 'gateway_payment_id', 'gateway_status',
                'initiated_at', 'failed_at', 'last_notified_at',
                'failure_reason', 'gateway_payload', 'callback_payload',
            ]);
        });
    }
};
