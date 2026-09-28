<?php

namespace App\Models\Courier;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourierVehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'vehicle_type',
        'brand',
        'model',
        'registration_number',
        'base_location',
        'service_areas',
        'capacity_kg',
        'volume_cbm',
        'length_cm',
        'width_cm',
        'height_cm',
        'fuel_type',
        'transmission_type',
        'insurance_provider',
        'price_per_km',
        'base_fee',
        'handling_surcharge',
        'refrigerated',
        'tail_lift',
        'gps',
        'fragile_support',
        'status',
        'units_count',
        'description',
    ];

    protected $casts = [
        'refrigerated' => 'boolean',
        'tail_lift' => 'boolean',
        'gps' => 'boolean',
        'fragile_support' => 'boolean',
        'capacity_kg' => 'float',
        'volume_cbm' => 'float',
        'price_per_km' => 'float',
        'base_fee' => 'float',
        'handling_surcharge' => 'float',
    ];

    public function vendor()
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }
}
