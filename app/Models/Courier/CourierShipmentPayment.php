<?php

namespace App\Models\Courier;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourierShipmentPayment extends Model
{
    use HasFactory;

    public const PROVIDER_PAYMENTSLK = 'paymentslk';

    /** Card gateways whose rows the reports should include (PayHere was the gateway before Payments.lk). */
    public const CARD_PROVIDERS = ['paymentslk', 'payhere'];

    public const PAYMENT_METHOD_CARD = 'card';
    public const PAYMENT_METHOD_COD = 'cod';

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'courier_shipment_id',
        'requested_by_user_id',
        'provider',
        'payment_method',
        'is_required',
        'amount',
        'currency_code',
        'status',
        'gateway_order_id',
        'gateway_payment_id',
        'tx_reference',
        'gateway_status',
        'initiated_at',
        'paid_at',
        'failed_at',
        'last_notified_at',
        'failure_reason',
        'gateway_payload',
        'callback_payload',
        'metadata',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'amount' => 'decimal:2',
        'initiated_at' => 'datetime',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'last_notified_at' => 'datetime',
        'gateway_payload' => 'array',
        'callback_payload' => 'array',
        'metadata' => 'array',
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(CourierShipment::class, 'courier_shipment_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function markPaid(?string $gatewayPaymentId = null, ?string $txReference = null, ?string $gatewayStatus = null): void
    {
        $this->forceFill([
            'status' => self::STATUS_PAID,
            'gateway_payment_id' => $gatewayPaymentId ?: $this->gateway_payment_id,
            'tx_reference' => $txReference ?: $this->tx_reference,
            'gateway_status' => $gatewayStatus ?: $this->gateway_status,
            'paid_at' => now(),
            'failed_at' => null,
        ])->save();
    }

    public function markFailed(string $reason = '', ?string $gatewayStatus = null): void
    {
        $this->forceFill([
            'status' => self::STATUS_FAILED,
            'failure_reason' => $reason !== '' ? $reason : $this->failure_reason,
            'gateway_status' => $gatewayStatus ?: $this->gateway_status,
            'failed_at' => now(),
        ])->save();
    }
}
