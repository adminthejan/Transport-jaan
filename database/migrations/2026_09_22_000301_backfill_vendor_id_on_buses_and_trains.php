<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Every bus/train seeded before per-vendor ownership existed is assigned to
     * the demo vendor account (vendor@example.com, seeded by DemoUsersSeeder) so
     * nothing disappears from the customer-facing site and the vendor dashboard
     * has real data to show immediately. If that account doesn't exist yet
     * (e.g. a fresh install that hasn't run seeders), existing rows are simply
     * left unowned rather than failing the migration.
     */
    public function up(): void
    {
        $vendorId = DB::table('users')->where('email', 'vendor@example.com')->value('id');

        if (!$vendorId) {
            return;
        }

        DB::table('buses')->whereNull('vendor_id')->update(['vendor_id' => $vendorId]);
        DB::table('trains')->whereNull('vendor_id')->update(['vendor_id' => $vendorId]);
    }

    public function down(): void
    {
        // Intentionally not reversible — we don't know which rows were
        // genuinely unowned before this ran vs. backfilled by it.
    }
};
