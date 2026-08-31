<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\BookingReferenceGenerator;
use App\Models\Concerns\HasTrackingPin;
use Laravel\Scout\Searchable;

class BusBooking extends Model
{
    use HasFactory;
    use Searchable;
    use HasTrackingPin;

    protected $fillable = [
        'user_id',
        'bus_schedule_id',
        'tracking_pin',
        'passenger_name',
        'passenger_email',
        'passenger_phone',
        'seat_numbers',
        'seat_genders',
        'passenger_count',
        'total_price',
        'booking_reference',
        'trip_type',
        'round_trip_group_id',
        'leg',
        'status',
        'payment_status',
        'booking_date',
        'expires_at',
        'cancelled_at',
        'cancellation_reason',
        'refund_amount',
        'cancellation_fee'
    ];

    protected $casts = [
        'seat_numbers' => 'array',
        'seat_genders' => 'array',
        'booking_date' => 'datetime',
        'expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'refund_amount' => 'decimal:2',
        'cancellation_fee' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function busSchedule()
    {
        return $this->belongsTo(BusSchedule::class);
    }

    /**
     * The other leg of the same round trip (outbound <-> return), if any.
     */
    public function roundTripPartner()
    {
        if (!$this->round_trip_group_id) {
            return null;
        }

        return static::where('round_trip_group_id', $this->round_trip_group_id)
            ->where('id', '!=', $this->id)
            ->first();
    }

    /**
     * Generate secure booking reference
     * @deprecated Use BookingReferenceGenerator::forBus() instead
     */
    public static function generateBookingReference()
    {
        return BookingReferenceGenerator::forBus();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($booking) {
            if (empty($booking->booking_reference)) {
                $booking->booking_reference = BookingReferenceGenerator::forBus();
            }
            if (empty($booking->tracking_pin)) {
                $booking->tracking_pin = self::generateTrackingPin();
            }
        });
    }

    /**
     * Check if the booking has expired
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->isPast() && 
               $this->status === 'pending' && 
               $this->payment_status === 'pending';
    }

    /**
     * Scope to get expired bookings
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<=', now())
                    ->where('status', 'pending')
                    ->where('payment_status', 'pending');
    }

    /**
     * Scope to get active (non-expired) bookings
     */
    public function scopeActive($query)
    {
        return $query->where(function($q) {
            $q->where('expires_at', '>', now())
              ->orWhereNull('expires_at')
              ->orWhere('status', '!=', 'pending')
              ->orWhere('payment_status', 'paid');
        });
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'user_id' => (int) ($this->user_id ?? 0),
            'booking_reference' => (string) ($this->booking_reference ?? ''),
            'passenger_name' => (string) ($this->passenger_name ?? ''),
            'passenger_email' => (string) ($this->passenger_email ?? ''),
            'passenger_phone' => (string) ($this->passenger_phone ?? ''),
            'status' => (string) ($this->status ?? ''),
            'payment_status' => (string) ($this->payment_status ?? ''),
            'total_price' => (string) ($this->total_price ?? ''),
            'seat_numbers' => json_encode($this->seat_numbers ?? []),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
