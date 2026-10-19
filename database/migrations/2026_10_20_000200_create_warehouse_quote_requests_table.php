<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('warehouse_quote_requests')) {
            return;
        }

        Schema::create('warehouse_quote_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 40)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_unit_id')->constrained('warehouse_units')->cascadeOnDelete();

            $table->string('status', 20)->default('pending'); // pending, quoted, declined
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 40)->nullable();
            $table->text('customer_notes')->nullable();

            // What the customer asked for (space, rate type, dates, duration, services...)
            $table->json('request_details')->nullable();
            $table->decimal('estimated_total', 14, 2)->nullable();

            // What the vendor answered with once their discussion with the customer concluded
            $table->json('vendor_charges')->nullable();
            $table->decimal('quoted_total', 14, 2)->nullable();
            $table->text('vendor_notes')->nullable();
            $table->timestamp('quoted_at')->nullable();
            $table->date('valid_until')->nullable();

            $table->timestamps();

            $table->index(['warehouse_unit_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_quote_requests');
    }
};
