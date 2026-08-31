<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Widened body_type per the client's requested Vehicle Type list.
        // All existing enum values are kept so seeded/existing rows don't break.
        DB::statement("ALTER TABLE land_vehicle_specs MODIFY COLUMN body_type ENUM(
            'sedan','hatchback','suv','van','bus','pickup','jeep','other',
            'coupe','truck','convertible','limousine','crossover','wagon',
            'familyMBP','sportcoupe','compact','mpv','motorcycle',
            'three_wheeler','special_purpose'
        ) NULL");

        // New top-level "Use / Industry Category" grouping, separate from
        // and coarser than body_type (e.g. "Trucks" spans several body types).
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            $table->enum('industry_category', [
                'cars_suvs',
                'vans_minibuses',
                'buses',
                'trucks',
                'prime_movers_trailers',
                'construction_equipment',
            ])->nullable()->after('body_type');
        });
    }

    public function down(): void
    {
        Schema::table('land_vehicle_specs', function (Blueprint $table) {
            $table->dropColumn('industry_category');
        });

        DB::statement("ALTER TABLE land_vehicle_specs MODIFY COLUMN body_type ENUM(
            'sedan','hatchback','suv','van','bus','pickup','jeep','other',
            'coupe','truck','convertible','limousine','crossover','wagon',
            'familyMBP','sportcoupe','compact'
        ) NULL");
    }
};
