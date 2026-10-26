<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AirVehicleBookingCustomer extends Model
{
    protected $table = 'air_vehicle_booking_customers';

    protected $fillable = [
        'air_vehicle_booking_id',
        'first_name','last_name','email','phone','country_code',
        'city','zip_code','age','address','notes',
        'nic_number','date_of_birth','license_number','license_expiry_date',
    ];

    public function airVehicleBooking()
    {
        return $this->belongsTo(AirVehicleBookings::class, 'air_vehicle_booking_id');
    }

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'license_expiry_date' => 'date:Y-m-d',
    ];
}
