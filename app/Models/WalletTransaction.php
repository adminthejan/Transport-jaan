<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'wallet_id',
        'type',
        'amount',
        'balance_after',
        'reference_type',
        'reference_id',
        'status',
        'description',
        'provider', 'gateway_order_id', 'gateway_payment_id', 'gateway_status',
        'initiated_at', 'failed_at', 'last_notified_at',
        'failure_reason', 'gateway_payload', 'callback_payload',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'initiated_at' => 'datetime',
        'failed_at' => 'datetime',
        'last_notified_at' => 'datetime',
        'gateway_payload' => 'array',
        'callback_payload' => 'array',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
