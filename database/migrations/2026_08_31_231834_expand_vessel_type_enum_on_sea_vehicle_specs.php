<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Widened per the client's requested Sea vehicle type list. 'boat' is
        // kept (not surfaced in the new filter UI) so existing seeded rows
        // using the old, narrower enum don't break.
        DB::statement("ALTER TABLE sea_vehicle_specs MODIFY COLUMN vessel_type ENUM(
            'boat','speedboat','yacht','catamaran','sailboat','fishing_boat',
            'cruise_ship','ferry','houseboat','jet_ski','tugboat','cargo_vessel','other'
        ) NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE sea_vehicle_specs MODIFY COLUMN vessel_type ENUM(
            'boat','yacht','catamaran','ferry','other'
        ) NULL");
    }
};
