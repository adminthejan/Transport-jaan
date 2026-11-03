<?php

namespace Tests\Feature\Courier;

use App\Models\Courier\CourierAddress;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierCustomerEmailDispatch;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\User;
use App\Services\Courier\CourierCustomerEmailDispatchService;
use App\Services\PaymentsLkGatewayService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CourierPaymentLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Carbon::setTestNow(Carbon::create(2026, 4, 20, 10, 0, 0, 'UTC'));

        config()->set('courier.payments.enabled', true);
        config()->set('courier.payments.provider.paymentslk.enabled', true);
        config()->set('services.paymentslk.secret_key', 'sk_test_unittestkey');
        config()->set('services.paymentslk.webhook_secret', 'whsec_unittestsecret');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_checkout_and_status_endpoints_expose_card_payment_state_for_owner(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-FLOW0001',
            'tx_reference' => 'TX-FLOW-0001',
            'gateway_payment_id' => 'pay_0001',
        ]);

        // Never reach the real Payments.lk API from a test.
        $this->partialMock(PaymentsLkGatewayService::class, function ($mock) {
            $mock->shouldReceive('checkoutFor')->andReturn([
                'isReady' => true,
                'reason' => null,
                'checkoutUrl' => 'https://pay.example.test/chk_flow',
                'checkoutId' => 'chk_flow',
                'method' => 'GET',
                'fields' => [],
            ]);
        });

        $this->actingAs($user)
            ->get(route('couriers.payments.checkout', ['shipment' => $shipment->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Web/courier/PaymentCheckout')
                ->where('shipment.id', (int) $shipment->id)
                ->where('shipment.reference', (string) $shipment->reference)
                ->where('payment.id', (int) $payment->id)
                ->where('payment.method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                ->where('payment.provider', CourierShipmentPayment::PROVIDER_PAYMENTSLK)
                ->where('payment.status', CourierShipmentPayment::STATUS_PENDING)
                ->where('payment.orderId', (string) $payment->gateway_order_id)
                ->where('payment.gatewayPaymentId', (string) $payment->gateway_payment_id)
                ->where('payment.txReference', (string) $payment->tx_reference)
                ->where('checkout.checkoutUrl', 'https://pay.example.test/chk_flow')
            );

        $this->actingAs($user)
            ->getJson(route('couriers.payments.status', ['shipment' => $shipment->id]))
            ->assertOk()
            ->assertJson([
                'shipmentId' => (int) $shipment->id,
                'paymentId' => (int) $payment->id,
                'paymentStatus' => CourierShipmentPayment::STATUS_PENDING,
                'orderId' => (string) $payment->gateway_order_id,
                'gatewayPaymentId' => (string) $payment->gateway_payment_id,
                'txReference' => (string) $payment->tx_reference,
            ]);
    }

    public function test_retry_resets_failed_card_payment_to_pending_with_new_order_reference(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_FAILED,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-FAILED01',
            'failed_at' => now()->subMinute(),
            'failure_reason' => 'Gateway timeout',
            'tx_reference' => 'TX-OLD-FAILED-REF',
            'gateway_payment_id' => 'pay_old_failed',
            'last_notified_at' => now()->subMinute(),
        ]);

        $oldOrderId = (string) $payment->gateway_order_id;

        $csrfToken = 'retry-card-token';
        $this->actingAs($user)
            ->withSession(['_token' => $csrfToken])
            ->post(route('couriers.payments.retry', ['shipment' => $shipment->id]), [
                '_token' => $csrfToken,
            ])
            ->assertRedirect(route('couriers.payments.checkout', ['shipment' => $shipment->id]))
            ->assertSessionHas('success', 'Payment retry initialized. Continue with the card checkout.');

        $payment->refresh();

        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, (string) $payment->status);
        $this->assertNull($payment->failed_at);
        $this->assertNull($payment->paid_at);
        $this->assertNull($payment->gateway_payment_id);
        $this->assertNull($payment->tx_reference);
        $this->assertNull($payment->failure_reason);
        $this->assertNotSame($oldOrderId, (string) $payment->gateway_order_id);
        $this->assertStringStartsWith('CPH-' . $shipment->id . '-', (string) $payment->gateway_order_id);
    }

    public function test_cancel_marks_pending_payment_cancelled_and_dispatches_email_events(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-CANCEL01',
        ]);

        $this->actingAs($user)
            ->get(route('couriers.payments.payhere.cancel', [
                'order_id' => (string) $payment->gateway_order_id,
            ]))
            ->assertRedirect(route('courier.shipment.show', ['id' => (int) $shipment->id]));

        $payment->refresh();
        $this->assertSame(CourierShipmentPayment::STATUS_CANCELLED, (string) $payment->status);
        $this->assertSame(2, CourierCustomerEmailDispatch::query()
            ->where('payment_id', (int) $payment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_PAYMENT_CANCELLED)
            ->count());
    }

    public function test_webhook_paid_can_upgrade_previously_cancelled_payment(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-UPGRADE01',
        ]);

        $this->actingAs($user)
            ->get(route('couriers.payments.payhere.cancel', [
                'order_id' => (string) $payment->gateway_order_id,
            ]))
            ->assertRedirect(route('courier.shipment.show', ['id' => (int) $shipment->id]));

        $payment->refresh();
        $this->assertSame(CourierShipmentPayment::STATUS_CANCELLED, (string) $payment->status);

        $this->postWebhook('payment.succeeded', $payment, ['id' => 'pay_upgrade1'])
            ->assertOk()
            ->assertSeeText('OK');

        $payment->refresh();

        $this->assertSame(CourierShipmentPayment::STATUS_PAID, (string) $payment->status);
        $this->assertSame('pay_upgrade1', (string) $payment->gateway_payment_id);
        $this->assertSame('pay_upgrade1', (string) $payment->tx_reference);
    }

    public function test_webhook_is_idempotent_and_does_not_regress_terminal_paid_status(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-NIDEMP01',
            'tx_reference' => null,
            'gateway_payment_id' => null,
        ]);

        $this->postWebhook('payment.succeeded', $payment, ['id' => 'pay_idemp1'])
            ->assertOk()
            ->assertSeeText('OK');

        $payment->refresh();

        $this->assertSame(CourierShipmentPayment::STATUS_PAID, (string) $payment->status);
        $this->assertSame('pay_idemp1', (string) $payment->gateway_payment_id);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame(2, CourierCustomerEmailDispatch::query()
            ->where('payment_id', (int) $payment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_PAYMENT_PAID)
            ->count());

        $paidAtAfterFirstDelivery = $payment->paid_at?->toIso8601String();

        $this->postWebhook('payment.succeeded', $payment, ['id' => 'pay_idemp1'])
            ->assertOk()
            ->assertSeeText('OK');

        $payment->refresh();

        $this->assertSame(CourierShipmentPayment::STATUS_PAID, (string) $payment->status);
        $this->assertSame($paidAtAfterFirstDelivery, $payment->paid_at?->toIso8601String());
        $this->assertSame(2, CourierCustomerEmailDispatch::query()
            ->where('payment_id', (int) $payment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_PAYMENT_PAID)
            ->count());

        $this->postWebhook('payment.failed', $payment, ['id' => 'pay_idemp2', 'status' => 'failed', 'failureMessage' => 'Card declined'])
            ->assertOk()
            ->assertSeeText('OK');

        $payment->refresh();

        $this->assertSame(CourierShipmentPayment::STATUS_PAID, (string) $payment->status);
        $this->assertNull($payment->failure_reason);
        $this->assertSame(0, CourierCustomerEmailDispatch::query()
            ->where('payment_id', (int) $payment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_PAYMENT_FAILED)
            ->count());

        $callbackPayload = is_array($payment->callback_payload) ? $payment->callback_payload : [];
        $this->assertCount(3, $callbackPayload);
        $this->assertSame('accepted', (string) ($callbackPayload[2]['outcome'] ?? ''));
        $this->assertSame(CourierShipmentPayment::STATUS_FAILED, (string) ($callbackPayload[2]['resolved_status'] ?? ''));
    }

    public function test_webhook_with_invalid_signature_is_rejected_and_changes_nothing(): void
    {
        $user = User::factory()->create(['role' => 'client', 'status' => 'verified']);
        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'gateway_order_id' => 'CPH-' . $shipment->id . '-BADSIG01',
        ]);

        $this->postWebhook('payment.succeeded', $payment, [], 'whsec_wrongsecret')
            ->assertStatus(400);

        $payment->refresh();
        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, (string) $payment->status);
    }

    public function test_webhook_with_amount_mismatch_does_not_mark_payment_paid(): void
    {
        $user = User::factory()->create(['role' => 'client', 'status' => 'verified']);
        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'gateway_order_id' => 'CPH-' . $shipment->id . '-AMTMIS01',
        ]);

        $this->postWebhook('payment.succeeded', $payment, ['id' => 'pay_short', 'amountCents' => 100])
            ->assertOk();

        $payment->refresh();
        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, (string) $payment->status);
        $this->assertNull($payment->paid_at);
    }

    public function test_return_endpoint_resolves_payment_from_gateway_via_json(): void
    {
        $user = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . $shipment->id . '-RETJSON1',
            'tx_reference' => null,
            'gateway_payment_id' => null,
        ]);

        $this->partialMock(PaymentsLkGatewayService::class, function ($mock) use ($payment) {
            $mock->shouldReceive('fetchResult')->once()->andReturn([
                'status' => PaymentsLkGatewayService::STATUS_PAID,
                'orderId' => (string) $payment->gateway_order_id,
                'paymentId' => 'pay_return1',
                'checkoutId' => 'chk_return1',
                'amountCents' => 4575,
                'currency' => 'LKR',
                'message' => '',
            ]);
        });

        $this->actingAs($user)
            ->getJson(route('couriers.payments.payhere.return', [
                'order_id' => (string) $payment->gateway_order_id,
            ]))
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'paymentStatus' => CourierShipmentPayment::STATUS_PAID,
                'orderId' => (string) $payment->gateway_order_id,
            ]);

        $payment->refresh();
        $this->assertSame(CourierShipmentPayment::STATUS_PAID, (string) $payment->status);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_return_endpoint_leaves_payment_pending_when_gateway_has_no_result(): void
    {
        $user = User::factory()->create(['role' => 'client', 'status' => 'verified']);
        $shipment = $this->createShipmentForUser($user);
        $payment = $this->createCardPayment($shipment, [
            'gateway_order_id' => 'CPH-' . $shipment->id . '-RETNONE1',
        ]);

        $this->partialMock(PaymentsLkGatewayService::class, function ($mock) {
            $mock->shouldReceive('fetchResult')->once()->andReturn(null);
        });

        $this->actingAs($user)
            ->getJson(route('couriers.payments.payhere.return', ['order_id' => (string) $payment->gateway_order_id]))
            ->assertOk()
            ->assertJson(['paymentStatus' => CourierShipmentPayment::STATUS_PENDING]);

        // A browser redirect alone must never mark a payment paid.
        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, (string) $payment->fresh()->status);
    }

    private function createShipmentForUser(User $user, string $senderCountry = 'LK', string $recipientCountry = 'LK'): CourierShipment
    {
        $suffix = Str::lower(Str::random(8));

        $sender = CourierContact::query()->create([
            'user_id' => $user->id,
            'role' => CourierContact::ROLE_SENDER,
            'name' => 'Sender ' . $suffix,
            'email' => 'sender.' . $suffix . '@example.com',
            'phone' => '+94-77-100-' . random_int(1000, 9999),
        ]);

        $recipient = CourierContact::query()->create([
            'user_id' => $user->id,
            'role' => CourierContact::ROLE_RECIPIENT,
            'name' => 'Recipient ' . $suffix,
            'email' => 'recipient.' . $suffix . '@example.com',
            'phone' => '+94-11-200-' . random_int(1000, 9999),
        ]);

        $senderAddress = CourierAddress::query()->create([
            'contact_id' => $sender->id,
            'line1' => '12 Palm Street',
            'city' => 'Colombo',
            'state' => 'Western',
            'postal_code' => '10000',
            'country' => strtoupper($senderCountry),
            'is_primary' => true,
        ]);

        $recipientAddress = CourierAddress::query()->create([
            'contact_id' => $recipient->id,
            'line1' => '42 Market Avenue',
            'city' => 'Kandy',
            'state' => 'Central',
            'postal_code' => '20000',
            'country' => strtoupper($recipientCountry),
            'is_primary' => true,
        ]);

        return CourierShipment::query()->create([
            'reference' => 'CR-PAY-' . strtoupper(Str::random(6)),
            'requested_by_user_id' => $user->id,
            'sender_contact_id' => $sender->id,
            'recipient_contact_id' => $recipient->id,
            'sender_address_id' => $senderAddress->id,
            'recipient_address_id' => $recipientAddress->id,
            'service_level' => 'express',
            'status' => CourierShipment::STATUS_CONFIRMED,
            'pickup_date' => now()->addDay()->toDateString(),
            'pickup_window_start' => '09:00:00',
            'pickup_window_end' => '13:00:00',
            'currency_code' => 'LKR',
            'estimated_cost' => 45.75,
        ]);
    }

    private function createCardPayment(CourierShipment $shipment, array $overrides = []): CourierShipmentPayment
    {
        $defaults = [
            'courier_shipment_id' => (int) $shipment->id,
            'requested_by_user_id' => $shipment->requested_by_user_id ? (int) $shipment->requested_by_user_id : null,
            'provider' => CourierShipmentPayment::PROVIDER_PAYMENTSLK,
            'payment_method' => CourierShipmentPayment::PAYMENT_METHOD_CARD,
            'is_required' => true,
            'amount' => 45.75,
            'currency_code' => 'LKR',
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-' . (int) $shipment->id . '-' . strtoupper(Str::random(8)),
            'initiated_at' => now(),
            'metadata' => [
                'source' => 'test',
            ],
        ];

        return CourierShipmentPayment::query()->create(array_merge($defaults, $overrides));
    }

    /** Posts a correctly signed Payments.lk webhook delivery for the given payment. */
    private function postWebhook(string $type, CourierShipmentPayment $payment, array $dataOverrides = [], string $secret = 'whsec_unittestsecret')
    {
        $body = json_encode([
            'id' => 'evt_' . Str::lower(Str::random(10)),
            'object' => 'event',
            'type' => $type,
            'mode' => 'test',
            'created' => now()->toIso8601String(),
            'data' => array_merge([
                'id' => 'pay_' . Str::lower(Str::random(8)),
                'object' => 'payment',
                'status' => 'succeeded',
                'amountCents' => (int) round((float) $payment->amount * 100),
                'currency' => strtoupper((string) $payment->currency_code),
                'reference' => (string) $payment->gateway_order_id,
                'checkoutId' => 'chk_test',
            ], $dataOverrides),
        ]);

        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $body, $secret);

        return $this->call('POST', route('webhooks.payments-lk'), [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_PAYMENTS_SIGNATURE' => "t={$timestamp},v1={$signature}",
        ], $body);
    }
}
