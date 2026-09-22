<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Bus extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'name',
        'bus_number',
        'bus_type',
        'route_number',
        'facilities',
        'capacity',
        'operator',
        'status'
    ];

    protected $casts = [
        'facilities' => 'array',
    ];

    public function vendor()
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function schedules()
    {
        return $this->hasMany(BusSchedule::class);
    }

    public function bookings()
    {
        return $this->hasManyThrough(BusBooking::class, BusSchedule::class);
    }

    public function scopeForVendor($query, $vendorId)
    {
        return $query->where('vendor_id', $vendorId);
    }
}
