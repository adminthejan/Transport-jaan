<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PaymentsLk\Client;
use PaymentsLk\Webhook;

/**
 * Payments.lk hosted-checkout integration shared by every payable in the app
 * (courier, wallet top-up, vehicle rental, bus, train, warehouse).
 *
 * Flow: the server creates a checkout (POST /v1/checkouts), the browser is
 * redirected to the returned `url`, and the outcome is confirmed by the
 * signed `payment.succeeded` / `payment.failed` webhook (see
 * PaymentsLkWebhookController). The browser return to successUrl is NOT proof
 * of payment — return handlers re-read the checkout from the API instead.
 *
 * Our own order id (gateway_order_id) is sent as the checkout `reference`, so
 * webhooks and API reads can always be mapped back to a payment row. The
 * checkout id (chk_...) is kept in the row's gateway_payload JSON column.
 *
 * Normalized result shape returned by the resultFrom*() methods:
 *   status:      paid|failed|expired|pending
 *   orderId:     our reference
 *   paymentId:   pay_... (may be empty)
 *   checkoutId:  chk_... (may be empty)
 *   amountCents: int|null
 *   currency:    string
 *   message:     human readable gateway failure message, if any
 */
class PaymentsLkGatewayService
{
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_PENDING = 'pending';

    public function isEnabled(): bool
    {
        return trim((string) config('services.paymentslk.secret_key', '')) !== '';
    }

    public function isSandbox(): bool
    {
        return str_starts_with((string) config('services.paymentslk.secret_key', ''), 'sk_test_');
    }

    public function client(): Client
    {
        $options = [];
        $apiBase = trim((string) config('services.paymentslk.api_base', ''));
        if ($apiBase !== '') {
            $options['apiBase'] = $apiBase;
        }

        return new Client((string) config('services.paymentslk.secret_key'), $options);
    }

    /**
     * Create (or reuse) the hosted checkout for a payment row and return the
     * payload the checkout pages consume.
     *
     * @param array{
     *   orderId: string, amount: float|string, currency?: string, description: string,
     *   successUrl: string, cancelUrl: string,
     *   customerName?: string, customerEmail?: string, customerPhone?: string,
     * } $params
     * @return array{isReady: bool, reason: ?string, checkoutUrl: ?string, checkoutId: ?string, method: string, fields: array}
     */
    public function checkoutFor(Model $payment, array $params): array
    {
        $blank = static fn (?string $reason) => [
            'isReady' => false,
            'reason' => $reason,
            'checkoutUrl' => null,
            'checkoutId' => null,
            'method' => 'GET',
            'fields' => [],
        ];

        if (!$this->isEnabled()) {
            return $blank('Payments.lk is not configured. Set PAYMENTSLK_SECRET_KEY.');
        }

        $orderId = trim((string) $params['orderId']);
        if ($orderId === '') {
            return $blank('Missing payment order reference.');
        }

        try {
            $client = $this->client();

            // Reuse the checkout we already created for this order if it is still open.
            $existingId = $this->storedCheckoutId($payment);
            if ($existingId !== null) {
                $existing = $client->checkouts->retrieve($existingId);
                if ($this->isCheckoutOpen($existing)) {
                    return $this->readyPayload($existing);
                }
            }

            $customer = array_filter([
                'name' => trim((string) ($params['customerName'] ?? '')),
                'email' => trim((string) ($params['customerEmail'] ?? '')),
                'phone' => trim((string) ($params['customerPhone'] ?? '')),
            ], static fn ($value) => $value !== '');

            $body = [
                'amountCents' => $this->toCents($params['amount']),
                'currency' => strtoupper(trim((string) ($params['currency'] ?? 'LKR'))),
                'description' => mb_substr(trim((string) $params['description']), 0, 120),
                'reference' => mb_substr($orderId, 0, 64),
                'successUrl' => (string) $params['successUrl'],
                'cancelUrl' => (string) $params['cancelUrl'],
                'expiresInMinutes' => (int) config('services.paymentslk.checkout_expiry_minutes', 60),
            ];
            if ($customer !== [] && isset($customer['name'], $customer['email'])) {
                $body['customer'] = $customer;
            }

            $checkout = $client->checkouts->create($body, ['idempotencyKey' => 'order-' . $orderId]);
        } catch (\Throwable $e) {
            Log::error('Payments.lk: could not create checkout', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return $blank('We could not start the payment session. Please try again in a moment.');
        }

        $checkoutId = (string) ($checkout['id'] ?? '');
        if ($checkoutId !== '') {
            $this->rememberCheckout($payment, $checkoutId);
        }

        return $this->readyPayload($checkout);
    }

    /** Re-read the checkout stored on a payment row from the API. */
    public function fetchResult(Model $payment): ?array
    {
        $checkoutId = $this->storedCheckoutId($payment);
        if ($checkoutId === null || !$this->isEnabled()) {
            return null;
        }

        try {
            $checkout = $this->client()->checkouts->retrieve($checkoutId);
        } catch (\Throwable $e) {
            Log::warning('Payments.lk: could not retrieve checkout', [
                'checkout_id' => $checkoutId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        return $this->resultFromCheckout($checkout, (string) ($payment->gateway_order_id ?? ''));
    }

    /**
     * Verify the signature of a webhook delivery and return the decoded event.
     *
     * @throws \PaymentsLk\Exception\SignatureVerificationException
     */
    public function constructEvent(string $rawBody, ?string $signatureHeader): array
    {
        return Webhook::constructEvent(
            $rawBody,
            $signatureHeader,
            (string) config('services.paymentslk.webhook_secret', '')
        );
    }

    /** Normalize a payment.succeeded / payment.failed / checkout.expired event. */
    public function resultFromEvent(array $event): ?array
    {
        $type = (string) ($event['type'] ?? '');
        $data = is_array($event['data'] ?? null) ? $event['data'] : [];

        $status = match ($type) {
            Webhook::EVENT_PAYMENT_SUCCEEDED => self::STATUS_PAID,
            Webhook::EVENT_PAYMENT_FAILED => self::STATUS_FAILED,
            Webhook::EVENT_CHECKOUT_EXPIRED => self::STATUS_EXPIRED,
            default => null,
        };
        if ($status === null) {
            return null;
        }

        // checkout.expired carries the checkout; the payment events carry the payment.
        $payment = is_array($data['payment'] ?? null) ? $data['payment'] : $data;
        $isCheckoutObject = ($data['object'] ?? '') === 'checkout';

        return [
            'status' => $status,
            'orderId' => trim((string) ($data['reference'] ?? $payment['reference'] ?? '')),
            'paymentId' => $isCheckoutObject ? (string) ($payment['id'] ?? '') : (string) ($data['id'] ?? ''),
            'checkoutId' => $isCheckoutObject ? (string) ($data['id'] ?? '') : (string) ($payment['checkoutId'] ?? ''),
            'amountCents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : null,
            'currency' => strtoupper((string) ($payment['currency'] ?? '')),
            'message' => (string) ($payment['failureMessage'] ?? ''),
        ];
    }

    /** Normalize a Checkout object (with its nested payment) read from the API. */
    public function resultFromCheckout(array $checkout, string $fallbackOrderId = ''): array
    {
        $payment = is_array($checkout['payment'] ?? null) ? $checkout['payment'] : [];
        $paymentStatus = strtolower((string) ($payment['status'] ?? ''));

        if ($paymentStatus === 'succeeded') {
            $status = self::STATUS_PAID;
        } elseif ($paymentStatus === 'failed') {
            $status = self::STATUS_FAILED;
        } elseif ($this->isCheckoutExpired($checkout)) {
            $status = self::STATUS_EXPIRED;
        } else {
            $status = self::STATUS_PENDING;
        }

        return [
            'status' => $status,
            'orderId' => trim((string) ($payment['reference'] ?? $checkout['reference'] ?? $fallbackOrderId)),
            'paymentId' => (string) ($payment['id'] ?? ''),
            'checkoutId' => (string) ($checkout['id'] ?? ''),
            'amountCents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : null,
            'currency' => strtoupper((string) ($payment['currency'] ?? '')),
            'message' => (string) ($payment['failureMessage'] ?? ''),
        ];
    }

    /**
     * Cross-check a gateway result against what we expected to charge.
     * Only meaningful for paid results; amount/currency can be absent on others.
     *
     * @param array{orderId: string, amount: float|string, currency?: string} $expected
     * @return array{isValid: bool, reason: ?string}
     */
    public function validateAgainstExpected(array $result, array $expected): array
    {
        if ($result['orderId'] === '' || !hash_equals(trim((string) $expected['orderId']), $result['orderId'])) {
            return ['isValid' => false, 'reason' => 'order_id mismatch'];
        }

        if ($result['status'] !== self::STATUS_PAID) {
            return ['isValid' => true, 'reason' => null];
        }

        $expectedCurrency = strtoupper(trim((string) ($expected['currency'] ?? 'LKR')));
        if ($result['currency'] === '' || $result['currency'] !== $expectedCurrency) {
            return ['isValid' => false, 'reason' => 'currency mismatch'];
        }

        if ($result['amountCents'] === null || $result['amountCents'] !== $this->toCents($expected['amount'])) {
            return ['isValid' => false, 'reason' => 'amount mismatch'];
        }

        return ['isValid' => true, 'reason' => null];
    }

    /**
     * Apply a normalized gateway result to a payment row that uses
     * HasGatewayPaymentLifecycle (vehicle rental, bus, train). Locked and
     * idempotent: an already-paid row is never touched again. Returns true
     * when this call moved the row to paid, so callers can run side effects
     * that must happen exactly once — those go in $onPaid, which runs inside
     * the same transaction.
     *
     * @param array{orderId: string, amount: float|string, currency?: string} $expected
     * @param (callable(Model): void)|null $onPaid
     */
    public function applyToLifecyclePayment(Model $payment, array $result, array $expected, ?callable $onPaid = null): bool
    {
        $becamePaid = false;

        DB::transaction(function () use ($payment, $result, $expected, $onPaid, &$becamePaid) {
            $locked = $payment::query()->whereKey($payment->getKey())->lockForUpdate()->first();
            if (!$locked || $locked->isPaid()) {
                return;
            }

            $callbackLog = is_array($locked->callback_payload) ? $locked->callback_payload : [];
            $callbackLog[] = ['at' => now()->toIso8601String(), 'result' => $result];
            $locked->forceFill(['callback_payload' => $callbackLog, 'last_notified_at' => now()])->save();

            $validation = $this->validateAgainstExpected($result, $expected);
            if (!$validation['isValid']) {
                Log::error('Payments.lk: result rejected', ['order_id' => $expected['orderId'], 'reason' => $validation['reason']]);
                $locked->markFailed('Payment result mismatch: ' . $validation['reason']);

                return;
            }

            switch ($result['status']) {
                case self::STATUS_PAID:
                    $locked->markPaid($result['paymentId'] ?: null, $result['paymentId'] ?: null, self::STATUS_PAID);
                    $becamePaid = true;
                    if ($onPaid !== null) {
                        $onPaid($locked);
                    }
                    break;

                case self::STATUS_FAILED:
                    $locked->markFailed($result['message'] !== '' ? $result['message'] : 'Payment failed at Payments.lk.', self::STATUS_FAILED);
                    break;

                case self::STATUS_EXPIRED:
                    if ($locked->isPending()) {
                        $locked->forceFill([
                            'status' => $locked::STATUS_EXPIRED,
                            'gateway_status' => self::STATUS_EXPIRED,
                            'failed_at' => now(),
                            'failure_reason' => 'Checkout expired before payment was completed.',
                        ])->save();
                    }
                    break;
            }
        });

        return $becamePaid;
    }

    public function storedCheckoutId(Model $payment): ?string
    {
        $payload = is_array($payment->gateway_payload ?? null) ? $payment->gateway_payload : [];
        $id = (string) ($payload['checkoutId'] ?? '');

        // A retry mints a new order id; a checkout stored for an older order must never be reused.
        $storedOrderId = (string) ($payload['orderId'] ?? '');
        if ($id === '' || $storedOrderId === '' || $storedOrderId !== (string) ($payment->gateway_order_id ?? '')) {
            return null;
        }

        return $id;
    }

    public function toCents(float|int|string $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    /** Splits a full name into first/last parts. */
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

    private function rememberCheckout(Model $payment, string $checkoutId): void
    {
        $payload = is_array($payment->gateway_payload ?? null) ? $payment->gateway_payload : [];
        $payload['checkoutId'] = $checkoutId;
        $payload['orderId'] = (string) ($payment->gateway_order_id ?? '');

        $payment->forceFill(['gateway_payload' => $payload])->save();
    }

    private function readyPayload(array $checkout): array
    {
        $url = (string) ($checkout['url'] ?? '');

        return [
            'isReady' => $url !== '',
            'reason' => $url !== '' ? null : 'Payments.lk did not return a checkout URL.',
            'checkoutUrl' => $url !== '' ? $url : null,
            'checkoutId' => (string) ($checkout['id'] ?? '') ?: null,
            'method' => 'GET',
            'fields' => [],
        ];
    }

    private function isCheckoutExpired(array $checkout): bool
    {
        if (strtolower((string) ($checkout['status'] ?? '')) === 'expired') {
            return true;
        }

        $expiresAt = (string) ($checkout['expiresAt'] ?? '');
        $paid = strtolower((string) ($checkout['payment']['status'] ?? '')) === 'succeeded';

        return !$paid && $expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time();
    }

    private function isCheckoutOpen(array $checkout): bool
    {
        if (($checkout['url'] ?? '') === '' || $this->isCheckoutExpired($checkout)) {
            return false;
        }

        return !in_array(strtolower((string) ($checkout['payment']['status'] ?? '')), ['succeeded', 'failed'], true);
    }
}
