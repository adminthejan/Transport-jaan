<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->string('preferred_language', 20)->nullable();
            $table->decimal('daily_rate', 12, 2)->nullable();
            $table->decimal('overtime_rate_per_hour', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['preferred_language', 'daily_rate', 'overtime_rate_per_hour']);
        });
    }
};
