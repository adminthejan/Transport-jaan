<?php

namespace App\Models\Concerns;

/**
 * Shared status constants + state-transition helpers for every *Payment
 * model that goes through PayHereGatewayService (mirrors the pattern
 * Courier\CourierShipmentPayment already established). Requires the model
 * to have: status, provider, gateway_payment_id, tx_reference,
 * gateway_status, paid_at, failed_at, failure_reason columns.
 */
trait HasGatewayPaymentLifecycle
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

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
