<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            // Extended unit details (identity, dimensions, extra pricing, features,
            // access, security, availability, policies) grouped by section.
            $table->json('specs')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_units', function (Blueprint $table) {
            $table->dropColumn('specs');
        });
    }
};
