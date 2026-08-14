<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Warehouse\WarehouseReview;
use App\Models\Warehouse\WarehouseLike;

class WarehouseUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'address',
        'latitude',
        'longitude',
        'total_area',
        'capacity',
        'capacity_unit',
        'type',
        'services',

        // Pricing Information
        'pricing_model',
        'base_price',
        'monthly_rate',
        'security_deposit',
        'setup_fee',
        'tax_rate',
        'offers_fulfillment',
        'fulfillment_fee_rate',
        'total_amount',
        'tax_amount',
        'final_amount',
        'currency',
        
        // Contact and Terms
        'contact_person',
        'contact_phone',
        'contact_email',
        'terms_conditions',
        'terms_pdf_path',
        
        // Status and Availability
        'is_active',
        'is_available',
        'available_from',
        'available_until',
        
        // Additional Features
        'operating_hours',
        'special_requirements',
        'restrictions',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_available' => 'boolean',
        'services' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
        'total_area' => 'decimal:2',
        'capacity' => 'decimal:2',
        'base_price' => 'decimal:2',
        'monthly_rate' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'setup_fee' => 'decimal:2',
        'tax_rate' => 'decimal:4',
        'offers_fulfillment' => 'boolean',
        'fulfillment_fee_rate' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'available_from' => 'date',
        'available_until' => 'date',
        'operating_hours' => 'array',
    ];

    // Relationships
    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function amenities()
    {
        return $this->hasMany(WarehouseAmenity::class);
    }

    public function images()
    {
        return $this->hasMany(WarehouseImage::class);
    }

    public function documents()
    {
        return $this->hasMany(WarehouseDocument::class);
    }

    public function approvals()
    {
        return $this->hasMany(WarehouseApproval::class);
    }

    public function activeImages()
    {
        return $this->hasMany(WarehouseImage::class)->active();
    }

    public function mainImage()
    {
        return $this->hasOne(WarehouseImage::class)->main()->active();
    }

    public function galleryImages()
    {
        return $this->hasMany(WarehouseImage::class)->gallery()->active()->ordered();
    }

    public function availableAmenities()
    {
        return $this->hasMany(WarehouseAmenity::class)->available();
    }

    public function includedAmenities()
    {
        return $this->hasMany(WarehouseAmenity::class)->included()->available();
    }

    public function paidAmenities()
    {
        return $this->hasMany(WarehouseAmenity::class)->withCost()->available();
    }

    public function publicDocuments()
    {
        return $this->hasMany(WarehouseDocument::class)->public()->active();
    }

    public function requiredDocuments()
    {
        return $this->hasMany(WarehouseDocument::class)->required()->active();
    }

    public function currentApproval()
    {
        return $this->hasOne(WarehouseApproval::class)->latest();
    }

    public function activeApproval()
    {
        return $this->hasOne(WarehouseApproval::class)->active();
    }

    // Accessors
    public function getCurrentStatusAttribute()
    {
        $approval = $this->currentApproval;
        return $approval ? $approval->status : 'pending';
    }

    public function getIsApprovedAttribute()
    {
        return $this->currentApproval && $this->currentApproval->is_approved;
    }

    public function getFormattedTypeAttribute()
    {
        return str_replace('_', ' ', ucwords($this->type));
    }

    public function getFormattedCapacityAttribute()
    {
        return number_format((float)$this->capacity, 2) . ' ' . str_replace('_', ' ', $this->capacity_unit);
    }

    public function getFormattedAreaAttribute()
    {
        return number_format((float)$this->total_area, 2) . ' sq ft';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    public function scopeApproved($query)
    {
        return $query->where(function ($q) {
            // Check if there are approval records
            $q->whereHas('currentApproval', function ($subQ) {
                $subQ->where('status', 'approved');
            })
            // Or if no approval records exist and is_active is true (legacy data)
            ->orWhere(function ($subQ) {
                $subQ->whereDoesntHave('approvals')
                     ->where('is_active', true);
            });
        });
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByPricingModel($query, $model)
    {
        return $query->where('pricing_model', $model);
    }

    public function scopeInPriceRange($query, $min = null, $max = null)
    {
        if ($min !== null) {
            $query->where('base_price', '>=', $min);
        }
        if ($max !== null) {
            $query->where('base_price', '<=', $max);
        }
        return $query;
    }

    public function scopeInAreaRange($query, $min = null, $max = null)
    {
        if ($min !== null) {
            $query->where('total_area', '>=', $min);
        }
        if ($max !== null) {
            $query->where('total_area', '<=', $max);
        }
        return $query;
    }

    public function scopeNearLocation($query, $lat, $lng, $radius = 50)
    {
        // Simple distance calculation (for more complex needs, consider using spatial databases)
        return $query->whereRaw(
            "( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) < ?",
            [$lat, $lng, $lat, $radius]
        );
    }

    public function scopeWithAmenity($query, $amenityName)
    {
        return $query->whereHas('amenities', function ($q) use ($amenityName) {
            $q->where('name', $amenityName)->available();
        });
    }

    public function scopeAvailableBetween($query, $startDate, $endDate)
    {
        return $query->where(function ($q) use ($startDate, $endDate) {
            $q->where(function ($subQ) use ($startDate) {
                $subQ->whereNull('available_from')
                     ->orWhere('available_from', '<=', $startDate);
            })->where(function ($subQ) use ($endDate) {
                $subQ->whereNull('available_until')
                     ->orWhere('available_until', '>=', $endDate);
            });
        });
    }

    // Reviews relationship (using existing VehicleReview as template)
    public function reviews()
    {
        return $this->hasMany(WarehouseReview::class);
    }

    public function likes()
    {
        return $this->hasMany(WarehouseLike::class);
    }

    public function averageRating()
    {
        return $this->reviews()->avg('rating') ?: 0;
    }

    public function reviewsCount()
    {
        return $this->reviews()->count();
    }

    public function isLikedBy($userId)
    {
        if (!$userId) return false;
        return $this->likes()->where('user_id', $userId)->exists();
    }

    // Add getRatingAvgAttribute accessor
    public function getRatingAvgAttribute()
    {
        return $this->averageRating();
    }

    public function getReviewsCountAttribute()
    {
        return $this->reviewsCount();
    }
}
