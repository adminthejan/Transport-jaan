<?php

namespace Tests\Unit;

use App\Services\PaymentsLkGatewayService;
use Tests\TestCase;

class PaymentsLkGatewayServiceTest extends TestCase
{
    private function gateway(): PaymentsLkGatewayService
    {
        return new PaymentsLkGatewayService();
    }

    public function test_to_cents_rounds_without_float_drift(): void
    {
        $this->assertSame(145000, $this->gateway()->toCents(1450));
        $this->assertSame(1999, $this->gateway()->toCents('19.99'));
        $this->assertSame(4575, $this->gateway()->toCents(45.75));
    }

    public function test_payment_succeeded_event_normalizes_to_paid_result(): void
    {
        $result = $this->gateway()->resultFromEvent([
            'type' => 'payment.succeeded',
            'data' => [
                'id' => 'pay_1', 'reference' => 'WTP-260101-ABCD1234', 'amountCents' => 250000,
                'currency' => 'lkr', 'checkoutId' => 'chk_1', 'status' => 'succeeded',
            ],
        ]);

        $this->assertSame('paid', $result['status']);
        $this->assertSame('WTP-260101-ABCD1234', $result['orderId']);
        $this->assertSame('pay_1', $result['paymentId']);
        $this->assertSame('chk_1', $result['checkoutId']);
        $this->assertSame(250000, $result['amountCents']);
        $this->assertSame('LKR', $result['currency']);
    }

    public function test_unrelated_events_are_ignored(): void
    {
        $this->assertNull($this->gateway()->resultFromEvent(['type' => 'test.ping', 'data' => []]));
        $this->assertNull($this->gateway()->resultFromEvent(['type' => 'invoice.paid', 'data' => []]));
    }

    public function test_checkout_result_is_paid_only_when_nested_payment_succeeded(): void
    {
        $paid = $this->gateway()->resultFromCheckout([
            'id' => 'chk_1', 'expiresAt' => now()->addHour()->toIso8601String(),
            'payment' => ['id' => 'pay_1', 'status' => 'succeeded', 'reference' => 'BUP-1', 'amountCents' => 100, 'currency' => 'LKR'],
        ]);
        $this->assertSame('paid', $paid['status']);

        $open = $this->gateway()->resultFromCheckout([
            'id' => 'chk_2', 'expiresAt' => now()->addHour()->toIso8601String(), 'reference' => 'BUP-2',
        ]);
        $this->assertSame('pending', $open['status']);
        $this->assertSame('BUP-2', $open['orderId']);

        $expired = $this->gateway()->resultFromCheckout([
            'id' => 'chk_3', 'expiresAt' => now()->subMinute()->toIso8601String(), 'reference' => 'BUP-3',
        ]);
        $this->assertSame('expired', $expired['status']);
    }

    public function test_paid_result_must_match_order_amount_and_currency(): void
    {
        $result = ['status' => 'paid', 'orderId' => 'VEH-1', 'amountCents' => 10000, 'currency' => 'LKR'];
        $expected = ['orderId' => 'VEH-1', 'amount' => 100.00, 'currency' => 'LKR'];

        $this->assertTrue($this->gateway()->validateAgainstExpected($result, $expected)['isValid']);
        $this->assertSame('amount mismatch', $this->gateway()->validateAgainstExpected([...$result, 'amountCents' => 9999], $expected)['reason']);
        $this->assertSame('currency mismatch', $this->gateway()->validateAgainstExpected([...$result, 'currency' => 'USD'], $expected)['reason']);
        $this->assertSame('order_id mismatch', $this->gateway()->validateAgainstExpected([...$result, 'orderId' => 'VEH-2'], $expected)['reason']);
    }
}
