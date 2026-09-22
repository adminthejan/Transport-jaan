<?php

namespace App\Models\Courier;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourierPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'shipment_id',
        'label',
        'package_type',
        'courier_provider_key',
        'courier_provider_name',
        'service_tier_key',
        'service_tier_label',
        'service_eta',
        'quoted_price_usd',
        'quantity',
        'weight_kg',
        'length_cm',
        'width_cm',
        'height_cm',
        'declared_value',
        'description',
        'hs_code',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'weight_kg' => 'decimal:2',
        'length_cm' => 'decimal:2',
        'width_cm' => 'decimal:2',
        'height_cm' => 'decimal:2',
        'declared_value' => 'decimal:2',
        'quoted_price_usd' => 'decimal:2',
    ];

    public function shipment()
    {
        return $this->belongsTo(CourierShipment::class, 'shipment_id');
    }

    public function labels()
    {
        return $this->hasMany(VendorCourierLabel::class, 'package_id');
    }
}
