<?php

namespace App\Models\Warehouse;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use Laravel\Scout\Searchable;

class WarehouseBooking extends Model
{
    use HasFactory;
    use Searchable;

    protected $fillable = [
        'user_id',
        'warehouse_unit_id',
        'booking_reference',
        'status',
        
        // Company Information
        'company_name',
        'contact_person',
        'phone',
        'email',
        'company_address',
        
        // Storage Requirements
        'storage_type',
        'fulfillment_service',
        'required_space',
        'goods_type',
        'goods_description',
        'estimated_weight',
        'special_requirements',
        'amenities',
        
        // Duration & Scheduling
        'start_date',
        'end_date',
        'duration_months',
        'access_hours',
        'special_instructions',
        
        // Pricing
        'monthly_rate',
        'security_deposit',
        'setup_fee',
        'add_ons_cost',
        'total_amount',
        'tax_amount',
        'final_amount',
        
        // Payment Information
        'payment_method',
        'payment_status',
        'payment_date',
        'transaction_reference',
        'payment_option',
        'payment_reference',
        
        // Additional Fields
        'terms_accepted',
        'insurance_required',
        'notes',
        'documents',
        
        // Cancellation Fields
        'cancelled_by',
        'cancelled_at',
        'refund_percentage',
        'refund_amount',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'payment_date' => 'datetime',
        'cancelled_at' => 'datetime',
        'terms_accepted' => 'boolean',
        'insurance_required' => 'boolean',
        'fulfillment_service' => 'boolean',
        'required_space' => 'decimal:2',
        'estimated_weight' => 'decimal:2',
        'monthly_rate' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'setup_fee' => 'decimal:2',
        'add_ons_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'refund_percentage' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'special_requirements' => 'json',
        'amenities' => 'json',
        'documents' => 'json',
    ];

    /**
     * Get the user that owns the booking
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the warehouse unit that is booked
     */
    public function warehouseUnit()
    {
        return $this->belongsTo(WarehouseUnit::class);
    }

    /**
     * Get the cancellation record for this booking
     */
    public function cancellation()
    {
        return $this->hasOne(\App\Models\WarehouseBookingCancellation::class);
    }

    /**
     * Get the formatted status
     */
    public function getFormattedStatusAttribute()
    {
        return ucfirst($this->status);
    }

    /**
     * Check if booking is active
     */
    public function isActive()
    {
        return in_array($this->status, ['confirmed', 'active']);
    }

    /**
     * Check if booking is cancelled
     */
    public function isCancelled()
    {
        return $this->status === 'cancelled';
    }

    /**
     * Check if booking can be cancelled
     */
    public function canBeCancelled()
    {
        // Cannot cancel if already cancelled
        if ($this->isCancelled()) {
            return false;
        }
        
        // Can cancel if status is pending, confirmed, or active
        return in_array($this->status, ['pending', 'confirmed', 'active']);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'user_id' => (int) ($this->user_id ?? 0),
            'warehouse_unit_id' => (int) ($this->warehouse_unit_id ?? 0),
            'booking_reference' => (string) ($this->booking_reference ?? ''),
            'company_name' => (string) ($this->company_name ?? ''),
            'contact_person' => (string) ($this->contact_person ?? ''),
            'email' => (string) ($this->email ?? ''),
            'phone' => (string) ($this->phone ?? ''),
            'status' => (string) ($this->status ?? ''),
            'payment_status' => (string) ($this->payment_status ?? ''),
            'goods_type' => (string) ($this->goods_type ?? ''),
            'storage_type' => (string) ($this->storage_type ?? ''),
            'final_amount' => (string) ($this->final_amount ?? ''),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
