<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('deposit_status', 20)->default('none')->after('deposit_amount');
            $table->decimal('deposit_held_amount', 12, 2)->default(0)->after('deposit_status');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['deposit_status', 'deposit_held_amount']);
        });
    }
};
