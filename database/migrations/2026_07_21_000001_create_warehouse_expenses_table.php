<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('warehouse_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_unit_id')->nullable()
                ->constrained('warehouse_units')->nullOnDelete();
            $table->string('name');
            $table->string('category')->default('Other');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->string('status')->default('completed'); // completed|pending
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'expense_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouse_expenses');
    }
};
