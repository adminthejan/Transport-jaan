<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeaVehicleBookingCustomer extends Model
{
    protected $table = 'sea_vehicle_booking_customers';

    protected $fillable = [
        'sea_vehicle_booking_id',
        'first_name','last_name','email','phone','country_code',
        'city','zip_code','age','address','notes',
        'nic_number','date_of_birth','license_number','license_expiry_date',
    ];

    public function seaVehicleBooking()
    {
        return $this->belongsTo(SeaVehicleBookings::class, 'sea_vehicle_booking_id');
    }

    protected $casts = [
        'date_of_birth' => 'date:Y-m-d',
        'license_expiry_date' => 'date:Y-m-d',
    ];
}
