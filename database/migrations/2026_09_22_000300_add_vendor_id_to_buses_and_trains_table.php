<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Buses/trains were global, admin-seeded inventory with no owner. This adds
     * real per-vendor ownership so a vendor can manage their own fleet and see
     * only their own bookings — see the following migration for backfilling
     * existing rows to a default vendor account.
     */
    public function up(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->foreignId('vendor_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        Schema::table('trains', function (Blueprint $table) {
            $table->foreignId('vendor_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('buses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vendor_id');
        });

        Schema::table('trains', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vendor_id');
        });
    }
};
