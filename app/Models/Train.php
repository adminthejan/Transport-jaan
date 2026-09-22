<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Train extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'name',
        'train_number',
        'class_type',
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
        return $this->hasMany(TrainSchedule::class);
    }

    public function bookings()
    {
        return $this->hasManyThrough(TrainBooking::class, TrainSchedule::class);
    }

    public function scopeForVendor($query, $vendorId)
    {
        return $query->where('vendor_id', $vendorId);
    }
}
