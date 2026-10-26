<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Oct-07 amendment: new Air and Sea vehicle type lists (see config/vehicle_types.php).
 * The enums gain the new values and keep every earlier one so existing rows stay valid.
 */
return new class extends Migration
{
    private function enum(array $values): string
    {
        return implode(',', array_map(fn ($v) => "'" . $v . "'", $values));
    }

    public function up(): void
    {
        $air = array_merge(['fixed_wing'], array_keys(config('vehicle_types.air')), array_diff(config('vehicle_types.air_legacy'), ['fixed_wing']));
        $sea = array_merge(array_keys(config('vehicle_types.sea')), config('vehicle_types.sea_legacy'));

        DB::statement('ALTER TABLE air_vehicle_specs MODIFY COLUMN aircraft_type ENUM(' . $this->enum(array_values(array_unique($air))) . ') NULL');
        DB::statement('ALTER TABLE sea_vehicle_specs MODIFY COLUMN vessel_type ENUM(' . $this->enum(array_values(array_unique($sea))) . ') NULL');
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE air_vehicle_specs MODIFY COLUMN aircraft_type ENUM(
            'fixed_wing','private_jet','commercial_airliner','helicopter','charter_aircraft',
            'light_aircraft','business_jet','turboprop_aircraft','glider','seaplane',
            'cargo_aircraft','hot_air_balloon','other'
        ) NULL");
        DB::statement("ALTER TABLE sea_vehicle_specs MODIFY COLUMN vessel_type ENUM(
            'boat','speedboat','yacht','catamaran','sailboat','fishing_boat',
            'cruise_ship','ferry','houseboat','jet_ski','tugboat','cargo_vessel','other'
        ) NULL");
    }
};
