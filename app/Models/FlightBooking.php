<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;




class FlightBooking extends Model
{
    use HasFactory;
    use Searchable;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'passenger_nic',
        'service_category',
        'service_sub_category',
        'subject',
        'special_requests',
        'trip_type',
        'departure_date',
        'return_date',
        'departure_airport',
        'arriving_airport',
        'status',
        'cancelled_at',
        'cancellation_reason',
        'refund_amount',
        'cancellation_fee'
    ];

    protected $casts = [
        'departure_date' => 'date',
        'return_date' => 'date',
        'cancelled_at' => 'datetime',
        'refund_amount' => 'decimal:2',
        'cancellation_fee' => 'decimal:2',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'user_id' => (int) ($this->user_id ?? 0),
            'booking_reference' => (string) ($this->booking_reference ?? ''),
            'name' => (string) ($this->name ?? ''),
            'email' => (string) ($this->email ?? ''),
            'phone' => (string) ($this->phone ?? ''),
            'trip_type' => (string) ($this->trip_type ?? ''),
            'departure_airport' => (string) ($this->departure_airport ?? ''),
            'arriving_airport' => (string) ($this->arriving_airport ?? ''),
            'status' => (string) ($this->status ?? ''),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
