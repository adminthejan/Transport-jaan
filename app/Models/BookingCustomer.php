<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingCustomer extends Model
{
    protected $fillable = [
        'booking_id',
        'first_name','last_name','email','phone','country_code',
        'city','zip_code','age','nic_number','date_of_birth','license_number','license_expiry_date',
    ];

    public function getFullNameAttribute(): string
    {
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? '')) ?: 'Customer';
    }

    public function booking() {
        return $this->belongsTo(Booking::class);
    }

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'license_expiry_date' => 'date:Y-m-d',
    ];
}
