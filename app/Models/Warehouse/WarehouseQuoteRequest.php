<?php

namespace App\Models\Warehouse;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WarehouseQuoteRequest extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_QUOTED = 'quoted';
    public const STATUS_DECLINED = 'declined';

    protected $fillable = [
        'reference',
        'user_id',
        'warehouse_unit_id',
        'status',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_notes',
        'request_details',
        'estimated_total',
        'vendor_charges',
        'quoted_total',
        'vendor_notes',
        'quoted_at',
        'valid_until',
    ];

    protected $casts = [
        'request_details' => 'array',
        'vendor_charges' => 'array',
        'estimated_total' => 'decimal:2',
        'quoted_total' => 'decimal:2',
        'quoted_at' => 'datetime',
        'valid_until' => 'date',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $quote) {
            if (empty($quote->reference)) {
                $quote->reference = 'WQ-' . now()->format('ymd') . '-' . strtoupper(Str::random(5));
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function warehouseUnit()
    {
        return $this->belongsTo(WarehouseUnit::class);
    }
}
