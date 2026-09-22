<?php

namespace App\Services;

/**
 * Payable-agnostic PayHere gateway integration, generalized from
 * App\Services\Courier\PayHereGatewayService (which is left untouched and
 * still used by courier). Every other service's checkout — vehicle rental
 * (land/air/sea), bus, train, warehouse, and wallet top-up — uses this one
 * instead of duplicating the hash/signature math six times.
 *
 * Uses the same `payhere` config block in config/services.php as courier
 * (shared merchant credentials — PayHere doesn't need separate ones per
 * "service" on this platform, only order_id needs to be unique across all
 * of them, which callers guarantee via their own prefixed order-id scheme).
 */
class PayHereGatewayService
{
    public function isEnabled(): bool
    {
        $merchantId = trim((string) config('services.payhere.merchant_id', ''));

        return $merchantId !== '';
    }

    /**
     * @param array{
     *   orderId: string, amount: float|string, currency?: string, items: string,
     *   returnUrl: string, cancelUrl: string, notifyUrl: string,
     *   firstName?: string, lastName?: string, email?: string, phone?: string,
     *   address?: string, city?: string, country?: string,
     * } $params
     */
    public function buildCheckoutPayload(array $params): array
    {
        $merchantId = trim((string) config('services.payhere.merchant_id', ''));
        $merchantSecret = (string) config('services.payhere.merchant_secret', '');
        $orderId = trim((string) $params['orderId']);
        $currency = strtoupper(trim((string) ($params['currency'] ?? 'LKR')));
        $amount = number_format((float) $params['amount'], 2, '.', '');

        $fields = [
            'merchant_id' => $merchantId,
            'return_url' => $params['returnUrl'],
            'cancel_url' => $params['cancelUrl'],
            'notify_url' => $params['notifyUrl'],
            'order_id' => $orderId,
            'items' => (string) $params['items'],
            'currency' => $currency,
            'amount' => $amount,
            'first_name' => (string) ($params['firstName'] ?? 'Customer'),
            'last_name' => (string) ($params['lastName'] ?? '-'),
            'email' => (string) ($params['email'] ?? ''),
            'phone' => (string) ($params['phone'] ?? ''),
            'address' => (string) ($params['address'] ?? ''),
            'city' => (string) ($params['city'] ?? ''),
            'country' => strtoupper((string) ($params['country'] ?? 'LK')),
        ];

        $isReady = $merchantId !== '' && $merchantSecret !== '' && $orderId !== '';
        if ($isReady) {
            $fields['hash'] = $this->computeCheckoutHash($merchantId, $orderId, $amount, $currency, $merchantSecret);
        }

        return [
            'isReady' => $isReady,
            'reason' => $isReady ? null : 'PayHere merchant credentials are not configured.',
            'checkoutUrl' => (string) config('services.payhere.checkout_base_url', 'https://sandbox.payhere.lk/pay/checkout'),
            'fields' => $fields,
        ];
    }

    public function verifyNotifySignature(array $payload): bool
    {
        $merchantId = trim((string) config('services.payhere.merchant_id', ''));
        $notifySecret = (string) config('services.payhere.notify_secret', config('services.payhere.merchant_secret', ''));

        $payloadMerchantId = trim((string) ($payload['merchant_id'] ?? ''));
        $normalized = $this->extractNotifyOrderAmountCurrency($payload);
        $orderId = $normalized['orderId'];
        $amount = $normalized['amount'];
        $currency = $normalized['currency'];
        $statusCode = (string) ($payload['status_code'] ?? '');
        $providedSignature = strtoupper(trim((string) ($payload['md5sig'] ?? '')));

        if ($merchantId === '' || $notifySecret === '' || $payloadMerchantId === '' || $orderId === '' || $providedSignature === '') {
            return false;
        }

        if (!hash_equals($merchantId, $payloadMerchantId)) {
            return false;
        }

        $expectedSignature = $this->computeNotifySignature(
            $merchantId,
            $orderId,
            $amount,
            $currency,
            $statusCode,
            $notifySecret
        );

        return hash_equals($expectedSignature, $providedSignature);
    }

    /**
     * @param array{orderId: string, amount: float|string, currency?: string} $expected
     */
    public function validateNotifyAgainstExpected(array $payload, array $expected): array
    {
        $normalized = $this->extractNotifyOrderAmountCurrency($payload);

        $expectedOrderId = trim((string) $expected['orderId']);
        $expectedAmount = number_format((float) $expected['amount'], 2, '.', '');
        $expectedCurrency = strtoupper(trim((string) ($expected['currency'] ?? 'LKR')));

        if ($normalized['orderId'] === '' || $expectedOrderId === '' || !hash_equals($expectedOrderId, $normalized['orderId'])) {
            return ['isValid' => false, 'reason' => 'order_id mismatch'];
        }

        if ($normalized['currency'] === '' || !hash_equals($expectedCurrency, $normalized['currency'])) {
            return ['isValid' => false, 'reason' => 'currency mismatch'];
        }

        if (!hash_equals($expectedAmount, $normalized['amount'])) {
            return ['isValid' => false, 'reason' => 'amount mismatch'];
        }

        return ['isValid' => true, 'reason' => null];
    }

    public function normalizeStatusFromNotify(array $payload): string
    {
        $statusCode = (int) ($payload['status_code'] ?? 0);

        return match ($statusCode) {
            2 => 'paid',
            -1 => 'cancelled',
            -2 => 'failed',
            default => 'pending',
        };
    }

    public function computeCheckoutHash(
        string $merchantId,
        string $orderId,
        string $amount,
        string $currency,
        string $merchantSecret
    ): string {
        $secretHash = strtoupper(md5($merchantSecret));

        return strtoupper(md5($merchantId . $orderId . $amount . $currency . $secretHash));
    }

    public function computeNotifySignature(
        string $merchantId,
        string $orderId,
        string $amount,
        string $currency,
        string $statusCode,
        string $merchantSecret
    ): string {
        $secretHash = strtoupper(md5($merchantSecret));

        return strtoupper(md5($merchantId . $orderId . $amount . $currency . $statusCode . $secretHash));
    }

    public function extractNotifyOrderAmountCurrency(array $payload): array
    {
        return [
            'orderId' => trim((string) ($payload['order_id'] ?? '')),
            'amount' => number_format((float) ($payload['payhere_amount'] ?? $payload['amount'] ?? 0), 2, '.', ''),
            'currency' => strtoupper(trim((string) ($payload['payhere_currency'] ?? $payload['currency'] ?? ''))),
        ];
    }

    /** Splits a full name into PayHere's separate first/last name fields. */
    public function splitName(string $name): array
    {
        $parts = array_values(array_filter(explode(' ', trim($name))));
        if (count($parts) === 0) {
            return ['Customer', '-'];
        }

        if (count($parts) === 1) {
            return [$parts[0], '-'];
        }

        $firstName = array_shift($parts);

        return [$firstName, implode(' ', $parts)];
    }
}
