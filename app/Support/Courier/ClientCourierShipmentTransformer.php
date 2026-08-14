<?php

namespace App\Support\Courier;

use App\Models\Courier\CourierAddress;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ClientCourierShipmentTransformer
{
    public function forDashboard(CourierShipment $shipment): array
    {
        $packages = $this->toCollection($shipment->packages ?? []);
        $trackingEvents = $this->toCollection($shipment->trackingEvents ?? []);
        $latestPayment = $this->resolveLatestPayment($shipment);
        $paymentData = $this->mapPaymentData($shipment, $latestPayment);
        $totalCost = (float) $packages->sum(fn ($package) => (float) ($package->quoted_price_usd ?? 0));
        $totalWeight = (float) $packages->sum(fn ($package) => (float) ($package->weight_kg ?? 0));
        $displayAmount = $latestPayment?->amount !== null
            ? (float) $latestPayment->amount
            : ($shipment->estimated_cost !== null ? (float) $shipment->estimated_cost : $totalCost);
        $displayCurrency = strtoupper((string) ($latestPayment?->currency_code ?: 'USD'));
        $latestTracking = $trackingEvents
            ->sortByDesc(fn ($event) => $event->recorded_at ?? null)
            ->first();

        return [
            'id' => $shipment->id,
            'code' => $shipment->reference,
            'status' => $shipment->status,
            'serviceLevel' => $shipment->service_level,
            'pickupDate' => $shipment->pickup_date?->format('Y-m-d'),
            'pickupWindowStart' => $shipment->pickup_window_start?->format('H:i'),
            'pickupWindowEnd' => $shipment->pickup_window_end?->format('H:i'),
            'from' => $shipment->senderAddress ? [
                'name' => $shipment->sender?->name,
                'city' => $shipment->senderAddress->city,
                'country' => $shipment->senderAddress->country,
                'full' => $this->formatLocation($shipment->senderAddress),
            ] : null,
            'to' => $shipment->recipientAddress ? [
                'name' => $shipment->recipient?->name,
                'city' => $shipment->recipientAddress->city,
                'country' => $shipment->recipientAddress->country,
                'full' => $this->formatLocation($shipment->recipientAddress),
            ] : null,
            'packages' => $packages
                ->map(fn ($package) => $this->mapPackageSummary($package))
                ->values()
                ->all(),
            'packageTypes' => $packages
                ->pluck('package_type')
                ->filter()
                ->unique()
                ->implode(', '),
            'totalWeight' => $totalWeight,
            'totalCost' => $totalCost,
            'estimatedCost' => $shipment->estimated_cost !== null ? (float) $shipment->estimated_cost : null,
            'currencyCode' => strtoupper((string) ($shipment->currency_code ?: 'LKR')),
            'displayAmount' => $displayAmount,
            'displayCurrency' => $displayCurrency,
            ...$paymentData,
            'insuranceRequired' => (bool) $shipment->insurance_required,
            'declaredValue' => $shipment->declared_value,
            'codEnabled' => (bool) ($shipment->is_cod_enabled ?? false),
            'codAmount' => $shipment->cod_requested_amount !== null ? (float) $shipment->cod_requested_amount : null,
            'codPaymentMethod' => $shipment->cod_requested_method,
            'deliveryNotes' => $shipment->delivery_notes,
            'latestTracking' => $latestTracking ? $this->mapTrackingEvent($latestTracking) : null,
            'createdAt' => $shipment->created_at?->format('Y-m-d H:i:s'),
            'updatedAt' => $shipment->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    public function forDetail(CourierShipment $shipment): array
    {
        $packages = $this->toCollection($shipment->packages ?? []);
        $trackingEvents = $this->toCollection($shipment->trackingEvents ?? []);
        $latestPayment = $this->resolveLatestPayment($shipment);
        $paymentData = $this->mapPaymentData($shipment, $latestPayment);
        $totalCost = (float) $packages->sum(fn ($package) => (float) ($package->quoted_price_usd ?? 0));
        $displayAmount = $latestPayment?->amount !== null
            ? (float) $latestPayment->amount
            : ($shipment->estimated_cost !== null ? (float) $shipment->estimated_cost : $totalCost);
        $displayCurrency = strtoupper((string) ($latestPayment?->currency_code ?: 'USD'));

        return [
            'id' => $shipment->id,
            'code' => $shipment->reference,
            'status' => $shipment->status,
            'serviceLevel' => $shipment->service_level,
            'pickupDate' => $shipment->pickup_date?->format('Y-m-d'),
            'pickupWindowStart' => $shipment->pickup_window_start?->format('H:i'),
            'pickupWindowEnd' => $shipment->pickup_window_end?->format('H:i'),
            'sender' => $this->mapContactWithAddress($shipment->sender, $shipment->senderAddress),
            'recipient' => $this->mapContactWithAddress($shipment->recipient, $shipment->recipientAddress),
            'packages' => $packages
                ->map(fn ($package) => $this->mapPackageDetail($package))
                ->values()
                ->all(),
            'trackingEvents' => $trackingEvents
                ->map(fn ($event) => $this->mapTrackingEvent($event))
                ->values()
                ->all(),
            'insuranceRequired' => (bool) $shipment->insurance_required,
            'declaredValue' => $shipment->declared_value !== null ? (float) $shipment->declared_value : null,
            'codEnabled' => (bool) ($shipment->is_cod_enabled ?? false),
            'codAmount' => $shipment->cod_requested_amount !== null ? (float) $shipment->cod_requested_amount : null,
            'codPaymentMethod' => $shipment->cod_requested_method,
            'codPolicySnapshot' => is_array($shipment->cod_policy_snapshot) ? $shipment->cod_policy_snapshot : null,
            'currencyCode' => strtoupper((string) ($shipment->currency_code ?: 'LKR')),
            'displayAmount' => $displayAmount,
            'displayCurrency' => $displayCurrency,
            ...$paymentData,
            'estimatedCost' => $shipment->estimated_cost !== null ? (float) $shipment->estimated_cost : null,
            'actualCost' => $shipment->actual_cost !== null ? (float) $shipment->actual_cost : null,
            'deliveryNotes' => $shipment->delivery_notes,
            'internalNotes' => $shipment->internal_notes,
            'createdAt' => $shipment->created_at?->format('Y-m-d H:i:s'),
            'updatedAt' => $shipment->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * For the public "Track Shipment" page — anyone with a reference number
     * can look this up, no login required, so this deliberately excludes
     * contact details, addresses beyond city/country, payment info, and
     * internal notes. Only what a carrier's public tracking page normally
     * shows.
     */
    public function forPublicTracking(CourierShipment $shipment): array
    {
        $trackingEvents = $this->toCollection($shipment->trackingEvents ?? []);

        return [
            'code' => $shipment->reference,
            'status' => $shipment->status,
            'serviceLevel' => $shipment->service_level,
            'pickupDate' => $shipment->pickup_date?->format('Y-m-d'),
            'from' => $shipment->senderAddress ? [
                'city' => $shipment->senderAddress->city,
                'country' => $shipment->senderAddress->country,
            ] : null,
            'to' => $shipment->recipientAddress ? [
                'city' => $shipment->recipientAddress->city,
                'country' => $shipment->recipientAddress->country,
            ] : null,
            'trackingEvents' => $trackingEvents
                ->sortByDesc(fn ($event) => $event->recorded_at ?? null)
                ->map(fn ($event) => $this->mapTrackingEvent($event))
                ->values()
                ->all(),
            'createdAt' => $shipment->created_at?->format('Y-m-d H:i:s'),
        ];
    }

    public function forUnifiedBooking(CourierShipment $shipment): array
    {
        $packages = $this->toCollection($shipment->packages ?? []);
        $latestPayment = $this->resolveLatestPayment($shipment);
        $paymentData = $this->mapPaymentData($shipment, $latestPayment);
        $senderAddress = $shipment->senderAddress;
        $recipientAddress = $shipment->recipientAddress;

        $totalWeight = (float) $packages->sum(fn ($package) => (float) ($package->weight_kg ?? 0));
        $totalAmount = (float) ($shipment->actual_cost ?? $shipment->estimated_cost ?? 0);
        $paymentStatus = (string) ($paymentData['payment_status'] ?? $shipment->resolvedPaymentStatus());
        $paymentMethod = (string) ($paymentData['payment_method'] ?? ((bool) ($shipment->is_cod_enabled ?? false) ? 'cod' : 'pending'));
        $paymentReference = $paymentData['payment_reference'] ?? null;

        $packageType = $packages
            ->pluck('package_type')
            ->filter()
            ->unique()
            ->implode(', ');

        return [
            'id' => $shipment->id,
            'source_id' => $shipment->id,
            'booking_type' => 'courier',
            'type' => 'courier',
            'service_name' => 'Courier Service - ' . ucfirst((string) ($shipment->service_level ?? 'standard')),
            'status' => $shipment->status,
            'total_amount' => $totalAmount,
            'amount' => $totalAmount,
            'booking_date' => $shipment->created_at?->format('Y-m-d'),
            'start_date' => $shipment->pickup_date?->format('Y-m-d'),
            'pickup_date' => $shipment->pickup_date?->format('Y-m-d'),
            'pickup_location' => $this->formatLocation($senderAddress) ?? 'Not specified',
            'dropoff_location' => $this->formatLocation($recipientAddress) ?? 'Not specified',
            'pickup_address' => $this->formatAddress($senderAddress) ?? 'Not specified',
            'delivery_address' => $this->formatAddress($recipientAddress) ?? 'Not specified',
            'reference_number' => $shipment->reference,
            'booking_code' => $shipment->reference,
            'tracking_reference' => $shipment->reference,
            'tracking_number' => $shipment->reference,
            'currency' => $shipment->currency_code ?? 'LKR',
            'created_at' => $shipment->created_at,
            'user' => $shipment->requestedBy ? [
                'name' => $shipment->requestedBy->name,
                'email' => $shipment->requestedBy->email,
                'phone' => $shipment->requestedBy->phone,
                'address' => $shipment->requestedBy->address,
            ] : null,
            'customer_name' => $shipment->sender?->name ?? $shipment->requestedBy?->name,
            'customer_email' => $shipment->sender?->email ?? $shipment->requestedBy?->email,
            'customer_phone' => $shipment->sender?->phone ?? $shipment->requestedBy?->phone,
            'sender_name' => $shipment->sender?->name,
            'sender_email' => $shipment->sender?->email,
            'sender_phone' => $shipment->sender?->phone,
            'recipient_name' => $shipment->recipient?->name,
            'recipient_email' => $shipment->recipient?->email,
            'recipient_phone' => $shipment->recipient?->phone,
            'sender' => $this->mapContactWithAddress($shipment->sender, $senderAddress),
            'recipient' => $this->mapContactWithAddress($shipment->recipient, $recipientAddress),
            'vendor_name' => 'Courier Service Provider',
            'notes' => $shipment->delivery_notes,
            'description' => $shipment->delivery_notes,
            ...$paymentData,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => Str::title(str_replace('_', ' ', $paymentStatus)),
            'paymentReference' => $paymentReference,
            'service_level' => ucfirst((string) ($shipment->service_level ?? 'standard')),
            'insurance_required' => $shipment->insurance_required ? 'Yes' : 'No',
            'declared_value' => $shipment->declared_value !== null ? (float) $shipment->declared_value : null,
            'cod_enabled' => (bool) ($shipment->is_cod_enabled ?? false),
            'cod_amount' => $shipment->cod_requested_amount !== null ? (float) $shipment->cod_requested_amount : null,
            'cod_payment_method' => $shipment->cod_requested_method,
            'package_count' => (int) $packages->count(),
            'package_type' => $packageType !== '' ? $packageType : null,
            'weight' => $totalWeight,
            'packages' => $packages
                ->map(fn ($package) => $this->mapPackageDetail($package))
                ->values()
                ->all(),
        ];
    }

    private function mapContactWithAddress($contact, ?CourierAddress $address): ?array
    {
        if (!$contact && !$address) {
            return null;
        }

        return [
            'name' => $contact?->name,
            'email' => $contact?->email,
            'phone' => $contact?->phone,
            'company' => $contact?->company_name,
            'address' => $this->mapAddress($address),
        ];
    }

    private function mapAddress(?CourierAddress $address): ?array
    {
        if (!$address) {
            return null;
        }

        return [
            'line1' => $address->line1,
            'line2' => $address->line2,
            'city' => $address->city,
            'state' => $address->state,
            'postalCode' => $address->postal_code,
            'country' => $address->country,
            'instructions' => $this->addressInstructions($address),
        ];
    }

    private function mapPackageSummary($package): array
    {
        return [
            'id' => $package->id,
            'label' => $package->label,
            'type' => $package->package_type,
            'provider' => $package->courier_provider_name,
            'service' => $package->service_tier_label,
            'weight' => (float) ($package->weight_kg ?? 0),
            'quantity' => (int) ($package->quantity ?? 0),
            'price' => (float) ($package->quoted_price_usd ?? 0),
            'eta' => $package->service_eta,
        ];
    }

    private function mapPackageDetail($package): array
    {
        return [
            'id' => $package->id,
            'label' => $package->label,
            'type' => $package->package_type,
            'provider' => $package->courier_provider_name,
            'providerKey' => $package->courier_provider_key,
            'service' => $package->service_tier_label,
            'serviceKey' => $package->service_tier_key,
            'eta' => $package->service_eta,
            'weight' => (float) ($package->weight_kg ?? 0),
            'length' => $package->length_cm !== null ? (float) $package->length_cm : null,
            'width' => $package->width_cm !== null ? (float) $package->width_cm : null,
            'height' => $package->height_cm !== null ? (float) $package->height_cm : null,
            'quantity' => (int) ($package->quantity ?? 0),
            'price' => (float) ($package->quoted_price_usd ?? 0),
            'declaredValue' => $package->declared_value !== null ? (float) $package->declared_value : null,
            'description' => $package->description,
        ];
    }

    private function mapTrackingEvent($event): array
    {
        return [
            'id' => $event->id,
            'status' => $event->status,
            'location' => $event->location,
            'description' => $event->description,
            'timestamp' => $event->recorded_at?->format('Y-m-d H:i:s'),
        ];
    }

    private function formatLocation(?CourierAddress $address): ?string
    {
        if (!$address) {
            return null;
        }

        $parts = array_filter([
            $address->city,
            $address->state,
            $address->country,
        ]);

        return $parts ? implode(', ', $parts) : null;
    }

    private function formatAddress(?CourierAddress $address): ?string
    {
        if (!$address) {
            return null;
        }

        $street = array_filter([$address->line1, $address->line2]);
        $locality = array_filter([$address->city, $address->state, $address->postal_code]);
        $parts = array_filter([
            $street ? implode(', ', $street) : null,
            $locality ? implode(', ', $locality) : null,
            $address->country,
        ]);

        return $parts ? implode(' | ', $parts) : null;
    }

    private function addressInstructions(?CourierAddress $address): ?string
    {
        if (!$address) {
            return null;
        }

        return $address->instructions ?? $address->delivery_instructions ?? null;
    }

    private function mapPaymentData(CourierShipment $shipment, ?CourierShipmentPayment $latestPayment): array
    {
        $paymentStatus = (string) ($latestPayment?->status ?? $shipment->resolvedPaymentStatus());
        $paymentMethod = (string) ($latestPayment?->payment_method ?? ((bool) ($shipment->is_cod_enabled ?? false)
            ? CourierShipmentPayment::PAYMENT_METHOD_COD
            : 'pending'));
        $paymentProvider = $latestPayment?->provider ? (string) $latestPayment->provider : null;
        $paymentReference = $latestPayment?->tx_reference ?? $latestPayment?->gateway_payment_id ?? $latestPayment?->gateway_order_id;
        $paymentRequired = (bool) ($latestPayment?->is_required ?? false);
        $paymentNeedsAction = $shipment->requiresCardPayment()
            && $paymentStatus !== CourierShipmentPayment::STATUS_PAID;

        $gatewayOrderId = $latestPayment?->gateway_order_id;
        $gatewayPaymentId = $latestPayment?->gateway_payment_id;
        $txReference = $latestPayment?->tx_reference;

        $initiatedAt = optional($latestPayment?->initiated_at)->format('Y-m-d H:i:s');
        $paidAt = optional($latestPayment?->paid_at)->format('Y-m-d H:i:s');
        $failedAt = optional($latestPayment?->failed_at)->format('Y-m-d H:i:s');
        $lastNotifiedAt = optional($latestPayment?->last_notified_at)->format('Y-m-d H:i:s');

        return [
            'paymentStatus' => $paymentStatus,
            'paymentMethod' => $paymentMethod,
            'paymentProvider' => $paymentProvider,
            'paymentReference' => $paymentReference,
            'paymentRequired' => $paymentRequired,
            'paymentStatusLabel' => Str::title(str_replace('_', ' ', $paymentStatus)),
            'paymentMethodLabel' => Str::title(str_replace('_', ' ', $paymentMethod)),
            'paymentGatewayOrderId' => $gatewayOrderId,
            'paymentGatewayPaymentId' => $gatewayPaymentId,
            'paymentTxReference' => $txReference,
            'paymentInitiatedAt' => $initiatedAt,
            'paymentPaidAt' => $paidAt,
            'paymentFailedAt' => $failedAt,
            'paymentLastNotifiedAt' => $lastNotifiedAt,
            'requiresCardPayment' => $shipment->requiresCardPayment(),
            'paymentCheckoutUrl' => $paymentNeedsAction
                ? route('couriers.payments.checkout', ['shipment' => (int) $shipment->id])
                : null,
            'paymentStatusUrl' => $paymentNeedsAction
                ? route('couriers.payments.status', ['shipment' => (int) $shipment->id])
                : null,
            'paymentRetryUrl' => $paymentNeedsAction
                ? route('couriers.payments.retry', ['shipment' => (int) $shipment->id])
                : null,
            'payment_status' => $paymentStatus,
            'payment_method' => $paymentMethod,
            'payment_provider' => $paymentProvider,
            'payment_reference' => $paymentReference,
            'payment_required' => $paymentRequired,
            'payment_gateway_order_id' => $gatewayOrderId,
            'payment_gateway_payment_id' => $gatewayPaymentId,
            'payment_tx_reference' => $txReference,
            'payment_initiated_at' => $initiatedAt,
            'payment_paid_at' => $paidAt,
            'payment_failed_at' => $failedAt,
            'payment_last_notified_at' => $lastNotifiedAt,
            'requires_card_payment' => $shipment->requiresCardPayment(),
            'payment_checkout_url' => $paymentNeedsAction
                ? route('couriers.payments.checkout', ['shipment' => (int) $shipment->id])
                : null,
            'payment_status_url' => $paymentNeedsAction
                ? route('couriers.payments.status', ['shipment' => (int) $shipment->id])
                : null,
            'payment_retry_url' => $paymentNeedsAction
                ? route('couriers.payments.retry', ['shipment' => (int) $shipment->id])
                : null,
        ];
    }

    private function resolveLatestPayment(CourierShipment $shipment): ?CourierShipmentPayment
    {
        $latestPayment = $shipment->relationLoaded('latestPayment')
            ? $shipment->getRelation('latestPayment')
            : $shipment->latestPayment()->first();

        return $latestPayment instanceof CourierShipmentPayment ? $latestPayment : null;
    }

    private function toCollection($value): Collection
    {
        if ($value instanceof Collection) {
            return $value;
        }

        return collect($value ?? []);
    }
}
