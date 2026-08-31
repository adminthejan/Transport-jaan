<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Laravel\Scout\Searchable;
use App\Models\Concerns\HasTrackingPin;
use App\Services\BookingReferenceGenerator;

class Booking extends Model
{
    use Searchable, HasTrackingPin;

    public const VEHICLE_OWNER_KEY = 'provider_id';

    protected $fillable = [
        'booking_reference',
        'tracking_pin',
        'client_id',
        'vehicle_id',
        'driver_id',
        'needs_driver',
        'driver_fee_per_day',
        'status',
        'price_per_day',
        'rental_days',
        'addons_total',
        'subtotal',
        'deposit_amount',
        'advance_amount',
        'total_amount',
        'currency',
        'addons_snapshot',
        'vehicle_snapshot',
        'notes',
        'cancelled_at',
        'cancellation_reason',
        'refund_amount',
        'cancellation_fee',
        'cancelled_by',
        'vendor_commission_refund',
    ];

    protected $casts = [
        'addons_snapshot'  => 'array',
        'vehicle_snapshot' => 'array',
        'price_per_day'    => 'float',
        'needs_driver'     => 'boolean',
        'driver_fee_per_day' => 'float',
        'addons_total'     => 'float',
        'subtotal'         => 'float',
        'deposit_amount'   => 'float',
        'advance_amount'   => 'float',
        'total_amount'     => 'float',
        'refund_amount'    => 'float',
        'cancellation_fee' => 'float',
        'vendor_commission_refund' => 'float',
        'rental_days'      => 'integer',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
        'cancelled_at'     => 'datetime',
    ];

    protected $with    = ['schedule'];
    protected $appends = ['start_date', 'end_date'];

    protected static function booted(): void
    {
        static::creating(function (self $booking) {
            if (empty($booking->booking_reference)) {
                $booking->booking_reference = BookingReferenceGenerator::forVehicle();
            }
            if (empty($booking->tracking_pin)) {
                $booking->tracking_pin = self::generateTrackingPin();
            }
        });
    }

    public function client()   { return $this->belongsTo(User::class, 'client_id'); }
    public function vehicle()  { return $this->belongsTo(Vehicle::class); }
    public function driver()   { return $this->belongsTo(Driver::class); }
    public function schedule() { return $this->hasOne(BookingSchedule::class); }
    public function addons()   { return $this->hasMany(BookingAddon::class); }
    public function payments() { return $this->hasMany(BookingPayment::class); }
    public function customer() { return $this->hasOne(BookingCustomer::class); }

    public function getStartDateAttribute(): ?Carbon
    {
        $d = $this->schedule?->pickup_at; // ✅ null-safe
        return $d ? Carbon::parse($d) : null;
    }

    public function getEndDateAttribute(): ?Carbon
    {
        $d = $this->schedule?->dropoff_at; // ✅ null-safe
        return $d ? Carbon::parse($d) : null;
    }

    public function scopeForVendor(Builder $q, int $vendorId, string $ownerKey = self::VEHICLE_OWNER_KEY): Builder
    {
        return $q->whereHas('vehicle', fn($v) => $v->where($ownerKey, $vendorId));
    }

    public function scopeBetweenSchedule(Builder $q, $start, $end): Builder
    {
        if (!$start || !$end) return $q;
        $start = Carbon::parse($start);
        $end   = Carbon::parse($end);

        return $q->whereHas('schedule', function ($s) use ($start, $end) {
            $s->whereBetween('pickup_at',  [$start, $end])
              ->orWhereBetween('dropoff_at', [$start, $end])
              ->orWhere(function ($ov) use ($start, $end) {
                  $ov->where('pickup_at', '<=', $start)->where('dropoff_at', '>=', $end);
              });
        });
    }

    public function isCancelled(): bool
    {
        return $this->cancelled_at !== null;
    }

    public function canBeCancelled(): bool
    {
        return $this->status === 'confirmed' || $this->status === 'paid';
    }

    public function getDaysUntilPickup(): ?float
    {
        if (!$this->start_date) {
            return null;
        }
        return Carbon::now()->diffInDays($this->start_date, false);
    }

    public function getHoursUntilPickup(): ?float
    {
        if (!$this->start_date) {
            return null;
        }
        return Carbon::now()->diffInHours($this->start_date, false);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'client_id' => (int) ($this->client_id ?? 0),
            'vehicle_id' => (int) ($this->vehicle_id ?? 0),
            'status' => (string) ($this->status ?? ''),
            'currency' => (string) ($this->currency ?? ''),
            'total_amount' => (string) ($this->total_amount ?? ''),
            'notes' => (string) ($this->notes ?? ''),
            'vehicle_snapshot' => json_encode($this->vehicle_snapshot ?? []),
            'addons_snapshot' => json_encode($this->addons_snapshot ?? []),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
