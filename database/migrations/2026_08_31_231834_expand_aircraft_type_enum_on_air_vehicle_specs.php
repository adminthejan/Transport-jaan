<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Widened per the client's requested Air vehicle type list.
        // 'fixed_wing' is kept (not surfaced in the new filter UI) so
        // existing seeded rows using the old, narrower enum don't break.
        DB::statement("ALTER TABLE air_vehicle_specs MODIFY COLUMN aircraft_type ENUM(
            'fixed_wing','private_jet','commercial_airliner','helicopter','charter_aircraft',
            'light_aircraft','business_jet','turboprop_aircraft','glider','seaplane',
            'cargo_aircraft','hot_air_balloon','other'
        ) NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE air_vehicle_specs MODIFY COLUMN aircraft_type ENUM(
            'fixed_wing','helicopter','glider','other'
        ) NULL");
    }
};
