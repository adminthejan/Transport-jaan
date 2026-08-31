<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LandVehicleSpec extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'body_type',
        'industry_category',
        'fuel_type',
        'transmission_type',
        'gears',
        'seats',
        'doors',
        'luggage_capacity',
        'fuel_tank_capacity_l',
    ];

    protected $casts = [
        'body_type'           => 'string',
        'industry_category'   => 'string',
        'fuel_type'           => 'string',
        'transmission_type'   => 'string',
        'gears'               => 'integer',
        'seats'               => 'integer',
        'doors'               => 'integer',
        'luggage_capacity'    => 'integer',
        'fuel_tank_capacity_l'=> 'decimal:2',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
