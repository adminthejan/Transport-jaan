<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeaTicketRequest extends Model
{
    protected $fillable = [
        'booking_reference',
        'user_id',
        'category',
        'sub_category',
        'trip_type',
        'departure_port',
        'arrival_port',
        'travel_date',
        'return_date',
        'adults',
        'children',
        'name',
        'email',
        'phone',
        'passenger_nic',
        'special_requests',
        'status',
    ];

    protected $casts = [
        'travel_date' => 'date:Y-m-d',
        'return_date' => 'date:Y-m-d',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
