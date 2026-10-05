<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const USD_TO_LKR = 325;

    public function up(): void
    {
        $rate = self::USD_TO_LKR;
        $usdVehicleIds = DB::table('vehicles')->where('currency', 'USD')->pluck('id');

        DB::table('vehicles')->whereIn('id', $usdVehicleIds)->update([
            'rental_price_per_day' => DB::raw("rental_price_per_day * {$rate}"),
            'total_rental_price' => DB::raw("total_rental_price * {$rate}"),
            'deposit_amount' => DB::raw("deposit_amount * {$rate}"),
            'advance_payment_amount' => DB::raw("advance_payment_amount * {$rate}"),
            'currency' => 'LKR',
        ]);

        DB::table('vehicle_feature_pricings')
            ->whereIn('vehicle_id', $usdVehicleIds)
            ->update(['additional_feature_price' => DB::raw("additional_feature_price * {$rate}")]);
    }

    public function down(): void
    {
        //
    }
};
