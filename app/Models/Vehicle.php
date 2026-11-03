<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'provider_id',
        'type',
        'category_id',
        'model',
        'manufacturer',
        'manufacture_year',
        'registration_year',
        'registration_number',
        'chassis_number',
        'engine_number',
        'engine_capacity_cc',
        'colour',
        'condition',
        'ownership_type',
        'passenger_capacity',
        'mileage_km',
        'rental_price_per_day',
        'total_rental_price',
        'deposit_amount',
        'advance_payment_amount',
        'extra_km_charge',
        'late_return_charge',
        'currency',
        'insurance_provider',
        'gps',
        'child_seat',
        'wifi',
        'insurance_coverage',
        'extra',
        'status',
        'approval_status',
        'rejection_reason',
        'description',
        'images_json',
        'insurance_docs_json',
    ];

    protected $casts = [
        'gps' => 'boolean',
        'child_seat' => 'boolean',
        'wifi' => 'boolean',
        'insurance_coverage' => 'boolean',
        'passenger_capacity' => 'integer',
        'mileage_km' => 'integer',
        'rental_price_per_day' => 'decimal:2',
        'total_rental_price' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'advance_payment_amount' => 'decimal:2',
        'extra_km_charge' => 'decimal:2',
        'late_return_charge' => 'decimal:2',
        'manufacture_year' => 'integer',
        'registration_year' => 'integer',
        'images_json' => 'array',
        'insurance_docs_json' => 'array',
    ];

    // Expose primary image URL in JSON
    protected $appends = ['primary_image_url', 'all_images_data', 'front_view_image', 'interior_view_image'];

    /* -------- Relations -------- */

    public function provider()
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    // Keep this alias if other code calls ->vendor(), but map it to provider_id
    public function vendor()
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function category() { return $this->belongsTo(VehicleCategory::class, 'category_id'); }
    public function airSpec()  { return $this->hasOne(AirVehicleSpec::class); }
    public function seaSpec()  { return $this->hasOne(SeaVehicleSpec::class); }
    public function landSpec() { return $this->hasOne(LandVehicleSpec::class); }
    public function media()    { return $this->hasMany(VehicleMedia::class); }

    // Policies
    public function policies(): HasMany { return $this->hasMany(\App\Models\VehiclePolicy::class); }
    public function policy(): HasOne    { return $this->hasOne(\App\Models\VehiclePolicy::class)->latestOfMany(); }

    protected static function hasPolicyTable(): bool
    {
        static $ok = null;
        if ($ok !== null) return $ok;
        try { $ok = \Schema::hasTable('vehicle_policies'); } catch (\Throwable $e) { $ok = false; }
        return $ok;
    }

    public function getPolicyPdfUrlAttribute(): ?string
    {
        if (!self::hasPolicyTable()) return null;
        return $this->policy?->url; // direct public URL
    }

    // ✅ Point to client route (public) for inline preview
    public function getPolicyStreamUrlAttribute(): ?string
    {
        if (!self::hasPolicyTable()) return null;

        return $this->policy
            ? route('client.vehicles.policy.preview', ['vehicle' => $this->id])
            : null;
    }

    public function documents()          { return $this->hasMany(VehicleDocument::class); }
    public function insuranceDocuments() { return $this->documents()->where('doc_type', 'insurance'); }

    public function crew() { return $this->hasMany(VehicleCrew::class); }
    public function crewMembers()
    {
        return $this->belongsToMany(User::class, 'vehicle_crews')
            ->withPivot(['id','role','license_number','license_type','license_expiry','rating','is_primary'])
            ->withTimestamps();
    }

    public function reviews()         { return $this->hasMany(VehicleReview::class, 'vehicle_id'); }
    public function likes()           { return $this->hasMany(VehicleLike::class); }
    public function featurePricings() { return $this->hasMany(VehicleFeaturePricing::class); }
    public function bookings()        { return $this->hasMany(\App\Models\Booking::class); }

    /* ===================== Maintenance ===================== */

    protected static function hasMaintenanceTable(): bool
    {
        static $ok = null;
        if ($ok !== null) return $ok;
        try { $ok = \Schema::hasTable('vehicle_maintenances'); } catch (\Throwable $e) { $ok = false; }
        return $ok;
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(\App\Models\VehicleMaintenance::class);
    }

    public function hasMaintenanceBetween(\Carbon\Carbon $from, \Carbon\Carbon $to): bool
    {
        if (!self::hasMaintenanceTable()) return false;

        return \App\Models\VehicleMaintenance::where('vehicle_id', $this->id)
            ->whereDate('start_date', '<', $to->toDateString())
            ->whereDate('end_date',   '>', $from->toDateString())
            ->exists();
    }

    public function currentMaintenance(): ?\App\Models\VehicleMaintenance
    {
        if (!self::hasMaintenanceTable()) return null;

        $today = now()->toDateString();
        return $this->maintenances()
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->orderByDesc('start_date')
            ->first();
    }

    public function scopeWithoutMaintenanceBetween($q, $from, $to)
    {
        if (!self::hasMaintenanceTable()) return $q;

        $fromC = $from instanceof \Carbon\Carbon ? $from : \Carbon\Carbon::parse($from);
        $toC   = $to   instanceof \Carbon\Carbon ? $to   : \Carbon\Carbon::parse($to);

        return $q->whereDoesntHave('maintenances', function ($qq) use ($fromC, $toC) {
            $qq->whereDate('start_date', '<', $toC->toDateString())
               ->whereDate('end_date',   '>', $fromC->toDateString());
        });
    }

    /* -------- Scopes -------- */
    public function scopeType($q, string $type) { return $q->where('type', $type); }

    public function scopeActive($q)
    {
        return $q->where('status', 'active')->where('approval_status', 'approved');
    }

    /* -------- Accessors -------- */

    public function getPrimaryImageUrlAttribute(): ?string
    {
        $primary = $this->media()
            ->where('media_type', 'image')
            ->where('is_primary', true)
            ->first();

        if ($primary) {
            return $primary->url;
        }

        // Fallback to first image
        $firstImage = $this->media()
            ->where('media_type', 'image')
            ->orderBy('sort_order')
            ->first();

        return $firstImage ? $firstImage->url : asset('images/default-vehicle.jpg');
    }

    /**
     * Get all images as array
     */
    public function getAllImagesDataAttribute(): array
    {
        return $this->media()
            ->where('media_type', 'image')
            ->orderBy('is_primary', 'desc')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($media) {
                return [
                    'id' => $media->id,
                    'url' => $media->url,
                    'full_url' => $media->full_url,
                    'title' => $media->title,
                    'is_primary' => $media->is_primary,
                    'sort_order' => $media->sort_order,
                ];
            })->toArray();
    }

    /**
     * Get front view image URL
     */
    public function getFrontViewImageAttribute(): ?string
    {
        $frontView = $this->media()
            ->where('media_type', 'image')
            ->where('title', 'LIKE', '%Front%')
            ->first();

        return $frontView ? $frontView->url : $this->primary_image_url;
    }

    /**
     * Get interior view image URL
     */
    public function getInteriorViewImageAttribute(): ?string
    {
        $interiorView = $this->media()
            ->where('media_type', 'image')
            ->where('title', 'LIKE', '%Interior%')
            ->first();

        return $interiorView ? $interiorView->url : $this->primary_image_url;
    }

    public function getAverageRatingAttribute(): float
    {
        return (float) ($this->reviews()->avg('rating') ?? 0);
    }

    public function getReviewCountAttribute(): int
    {
        return (int) $this->reviews()->count();
    }

    public function images()
    {
        return $this->hasMany(VehicleMedia::class)->where('media_type', 'image');
    }

    public function primaryImage()
    {
        return $this->hasOne(VehicleMedia::class)
            ->where('media_type', 'image')
            ->where('is_primary', true)
            ->ofMany('id', 'max');
    }

    /** Availability considers BOTH bookings and maintenance */
    public function isAvailable(\Carbon\Carbon $from, \Carbon\Carbon $to, ?int $ignoreBookingId = null): bool
    {
        // Overlap with bookings via schedule
        $bookingOverlap = \App\Models\Booking::where('vehicle_id', $this->id)
            ->when($ignoreBookingId, fn($q) => $q->where('id', '!=', $ignoreBookingId))
            ->whereIn('status', ['pending', 'confirmed', 'Ongoing']) // adjust as needed
            ->whereHas('schedule', function ($q) use ($from, $to) {
                $q->where('pickup_at', '<', $to)
                  ->where('dropoff_at', '>', $from);
            })
            ->exists();

        $maintenanceOverlap = $this->hasMaintenanceBetween($from, $to);

        return !$bookingOverlap && !$maintenanceOverlap;
    }
}
