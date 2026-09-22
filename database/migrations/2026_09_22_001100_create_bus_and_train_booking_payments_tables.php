<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bus/train bookings never had a payment step at all — they were created
     * straight to status=pending/payment_status=pending and only a vendor
     * could manually flip payment_status later. This adds a real payment
     * table per type (mirroring booking_payments' shape + the same gateway
     * columns used everywhere else) so a customer can actually pay via
     * PayHere or their wallet right after booking.
     */
    public function up(): void
    {
        Schema::create('bus_booking_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bus_booking_id')->constrained('bus_bookings')->cascadeOnDelete();
            $table->string('method'); // 'PayHere' | 'Wallet'
            $table->string('option')->default('full'); // full | advance (kept for parity, always 'full' today)
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('status')->default('pending'); // pending|paid|failed|cancelled|expired
            $table->string('tx_reference')->nullable();
            $table->string('provider')->nullable();
            $table->string('gateway_order_id')->nullable()->unique();
            $table->string('gateway_payment_id')->nullable();
            $table->string('gateway_status')->nullable();
            $table->timestamp('initiated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('last_notified_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('gateway_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamps();
        });

        Schema::create('train_booking_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('train_booking_id')->constrained('train_bookings')->cascadeOnDelete();
            $table->string('method');
            $table->string('option')->default('full');
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->string('status')->default('pending');
            $table->string('tx_reference')->nullable();
            $table->string('provider')->nullable();
            $table->string('gateway_order_id')->nullable()->unique();
            $table->string('gateway_payment_id')->nullable();
            $table->string('gateway_status')->nullable();
            $table->timestamp('initiated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('last_notified_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('gateway_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_booking_payments');
        Schema::dropIfExists('train_booking_payments');
    }
};
