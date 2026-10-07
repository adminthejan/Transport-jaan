<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courier_packages', function (Blueprint $table) {
            // Per-package handling flags, payment method, commodity lines and packing list.
            $table->json('extras')->nullable()->after('hs_code');
        });
    }

    public function down(): void
    {
        Schema::table('courier_packages', function (Blueprint $table) {
            $table->dropColumn('extras');
        });
    }
};
