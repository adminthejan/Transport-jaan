<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * These three payment tables (land/air/sea) previously only supported a
     * manual, self-reported payment_method (Credit Card/PayPal/Bank Transfer)
     * with no real charge ever happening — "Credit Card"/"PayPal" just wrote
     * status=paid instantly. Adding the same gateway columns
     * CourierShipmentPayment already uses so these can go through a real
     * PayHere checkout + webhook confirmation instead.
     */
    private array $tables = [
        'booking_payments',
        'air_vehicle_booking_payments',
        'sea_vehicle_booking_payments',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('provider')->nullable()->after('status');
                $t->string('gateway_order_id')->nullable()->unique()->after('provider');
                $t->string('gateway_payment_id')->nullable()->after('gateway_order_id');
                $t->string('gateway_status')->nullable()->after('gateway_payment_id');
                $t->timestamp('initiated_at')->nullable()->after('gateway_status');
                $t->timestamp('paid_at')->nullable()->after('initiated_at');
                $t->timestamp('failed_at')->nullable()->after('paid_at');
                $t->timestamp('last_notified_at')->nullable()->after('failed_at');
                $t->text('failure_reason')->nullable()->after('last_notified_at');
                $t->json('gateway_payload')->nullable()->after('failure_reason');
                $t->json('callback_payload')->nullable()->after('gateway_payload');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn([
                    'provider', 'gateway_order_id', 'gateway_payment_id', 'gateway_status',
                    'initiated_at', 'paid_at', 'failed_at', 'last_notified_at',
                    'failure_reason', 'gateway_payload', 'callback_payload',
                ]);
            });
        }
    }
};
