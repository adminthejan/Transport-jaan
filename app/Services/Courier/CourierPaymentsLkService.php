<?php

namespace App\Services\Courier;

use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\User;
use App\Services\PaymentsLkGatewayService;

/**
 * Courier-specific adapter over the shared Payments.lk gateway: knows how a
 * shipment + its payment row map onto a hosted checkout.
 */
class CourierPaymentsLkService
{
    public function __construct(private readonly PaymentsLkGatewayService $gateway)
    {
    }

    public function isEnabled(): bool
    {
        return (bool) config('courier.payments.enabled', false)
            && (bool) config('courier.payments.provider.paymentslk.enabled', false)
            && $this->gateway->isEnabled();
    }

    public function buildCheckoutPayload(CourierShipmentPayment $payment, CourierShipment $shipment, ?User $user = null): array
    {
        $orderId = trim((string) $payment->gateway_order_id);

        return $this->gateway->checkoutFor($payment, [
            'orderId' => $orderId,
            'amount' => (float) $payment->amount,
            'currency' => strtoupper(trim((string) ($payment->currency_code ?: 'LKR'))),
            'description' => 'Courier Shipment ' . (string) $shipment->reference,
            'successUrl' => route('couriers.payments.payhere.return', ['order_id' => $orderId]),
            'cancelUrl' => route('couriers.payments.payhere.cancel', ['order_id' => $orderId]),
            'customerName' => (string) ($shipment->sender?->name ?? $user?->name ?? 'Courier Customer'),
            'customerEmail' => (string) ($shipment->sender?->email ?? $user?->email ?? ''),
            'customerPhone' => (string) ($shipment->sender?->phone ?? $user?->phone ?? ''),
        ]);
    }
}
