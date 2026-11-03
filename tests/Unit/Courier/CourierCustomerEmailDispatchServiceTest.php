<?php

namespace Tests\Unit\Courier;

use App\Models\Courier\CourierAddress;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierCustomerEmailDispatch;
use App\Models\Courier\CourierEmailSuppression;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\CourierTrackingEvent;
use App\Models\Courier\VendorCourierSetting;
use App\Models\Notification;
use App\Models\User;
use App\Services\Courier\CourierCustomerEmailDispatchService;
use App\Services\Courier\CourierNotificationPreferenceService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CourierCustomerEmailDispatchServiceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_queue_shipment_placed_dispatches_to_requester_and_sender_once(): void
    {
        $service = app(CourierCustomerEmailDispatchService::class);
        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com'
        );

        $createdFirst = $service->queueShipmentPlaced($shipment);
        $createdSecond = $service->queueShipmentPlaced($shipment);

        $this->assertSame(2, $createdFirst);
        $this->assertSame(0, $createdSecond);

        $rows = CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_SHIPMENT_PLACED)
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $rows);
        $this->assertSame([
            CourierCustomerEmailDispatch::STATUS_SENT,
            CourierCustomerEmailDispatch::STATUS_SENT,
        ], $rows->pluck('status')->all());
    }

    public function test_queue_shipment_placed_marks_missing_or_invalid_recipients_as_skipped(): void
    {
        $service = app(CourierCustomerEmailDispatchService::class);

        $shipment = $this->createShipment(
            requesterId: null,
            senderEmail: 'invalid-email-address'
        );

        $created = $service->queueShipmentPlaced($shipment);

        $this->assertSame(2, $created);

        $rows = CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_SHIPMENT_PLACED)
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $rows);
        $this->assertSame([
            CourierCustomerEmailDispatch::STATUS_SKIPPED,
            CourierCustomerEmailDispatch::STATUS_SKIPPED,
        ], $rows->pluck('status')->all());
    }

    public function test_vendor_notification_toggle_blocks_out_for_delivery_event_dispatch(): void
    {
        $service = app(CourierCustomerEmailDispatchService::class);

        $vendor = User::factory()->create([
            'email' => 'vendor+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => (int) $vendor->id],
            ['settings' => [
                'notifications' => [
                    'notifyClientOutForDelivery' => false,
                ],
            ]]
        );

        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com',
            vendorId: (int) $vendor->id,
        );

        $trackingEvent = CourierTrackingEvent::query()->create([
            'shipment_id' => (int) $shipment->id,
            'status' => 'out_for_delivery',
            'description' => 'Out for delivery',
            'recorded_at' => now(),
        ]);

        $created = $service->queueTrackingOutForDelivery($shipment, $trackingEvent);

        $this->assertSame(0, $created);
        $this->assertDatabaseMissing('courier_customer_email_dispatches', [
            'shipment_id' => (int) $shipment->id,
            'event_type' => CourierCustomerEmailDispatchService::EVENT_TRACKING_OUT_FOR_DELIVERY,
        ]);
    }

    public function test_legacy_mode_creates_vendor_in_app_notification_for_assigned_vendor(): void
    {
        config()->set('courier.notifications_v2.enabled', false);

        $service = app(CourierCustomerEmailDispatchService::class);

        $vendor = User::factory()->create([
            'email' => 'vendor+' . Str::lower(Str::random(6)) . '@example.com',
        ]);
        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com',
            vendorId: (int) $vendor->id,
        );

        $service->queueShipmentPlaced($shipment);
        $service->queueShipmentPlaced($shipment);

        $notifications = Notification::query()
            ->where('user_id', (int) $vendor->id)
            ->where('type', 'courier_event')
            ->get();

        $this->assertCount(1, $notifications);

        $payload = is_array($notifications->first()?->data) ? $notifications->first()->data : [];
        $this->assertSame('shipment_placed', (string) ($payload['event_type'] ?? ''));
        $this->assertSame('/courierService/bookings', (string) ($payload['action_url'] ?? ''));
        $this->assertTrue((bool) ($payload['legacy_mode'] ?? false));
    }

    public function test_v2_dispatch_creates_email_and_in_app_records_for_client_recipients(): void
    {
        config()->set('courier.notifications_v2.enabled', true);
        config()->set('courier.notifications_v2.rollout.mode', 'all');

        $service = app(CourierCustomerEmailDispatchService::class);
        $preferences = app(CourierNotificationPreferenceService::class);

        $vendor = User::factory()->create([
            'email' => 'vendor+' . Str::lower(Str::random(6)) . '@example.com',
        ]);
        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);
        $recipientUser = User::factory()->create([
            'email' => 'recipient+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => (int) $vendor->id],
            ['settings' => [
                'notifications' => $preferences->defaultSettings(),
            ]]
        );

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com',
            vendorId: (int) $vendor->id,
            recipientUserId: (int) $recipientUser->id,
        );

        $trackingEvent = CourierTrackingEvent::query()->create([
            'shipment_id' => (int) $shipment->id,
            'status' => 'delivered',
            'description' => 'Delivered',
            'recorded_at' => now(),
        ]);

        $created = $service->queueTrackingDelivered($shipment, $trackingEvent);

        $this->assertSame(5, $created);

        $this->assertSame(3, CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_TRACKING_DELIVERED)
            ->where('channel', 'email')
            ->count());

        $this->assertSame(2, CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_TRACKING_DELIVERED)
            ->where('channel', 'in_app')
            ->count());

        $this->assertSame(2, Notification::query()
            ->where('type', 'courier_event')
            ->count());
    }

    public function test_v2_internal_in_app_dispatch_includes_vendor_owner_recipient(): void
    {
        config()->set('courier.notifications_v2.enabled', true);
        config()->set('courier.notifications_v2.rollout.mode', 'all');

        $service = app(CourierCustomerEmailDispatchService::class);
        $preferences = app(CourierNotificationPreferenceService::class);

        $vendor = User::factory()->create([
            'email' => 'vendor+' . Str::lower(Str::random(6)) . '@example.com',
        ]);
        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        $notificationSettings = $preferences->defaultSettings();
        $notificationSettings['channels']['email']['enabled'] = false;
        $notificationSettings['channels']['inApp']['enabled'] = true;
        $notificationSettings['clientRecipients'] = [
            'requester' => false,
            'sender' => false,
            'recipient' => false,
            'extraEmails' => [],
        ];
        $notificationSettings['internalRecipients'] = [
            'roleNames' => [],
            'userIds' => [],
            'extraEmails' => [],
        ];
        $notificationSettings['eventMatrix']['payment_failed']['internal']['email'] = false;
        $notificationSettings['eventMatrix']['payment_failed']['internal']['inApp'] = true;

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => (int) $vendor->id],
            ['settings' => [
                'notifications' => $notificationSettings,
            ]]
        );

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com',
            vendorId: (int) $vendor->id,
            recipientUserId: (int) $requester->id,
        );

        $payment = CourierShipmentPayment::query()->create([
            'courier_shipment_id' => (int) $shipment->id,
            'requested_by_user_id' => (int) $requester->id,
            'provider' => CourierShipmentPayment::PROVIDER_PAYMENTSLK,
            'payment_method' => CourierShipmentPayment::PAYMENT_METHOD_CARD,
            'is_required' => true,
            'amount' => 2500,
            'currency_code' => 'LKR',
            'status' => CourierShipmentPayment::STATUS_FAILED,
            'failure_reason' => 'Simulated failure for test',
        ]);

        $created = $service->queuePaymentFailed($payment);
        $this->assertSame(1, $created);

        $this->assertSame(1, CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_PAYMENT_FAILED)
            ->where('channel', 'in_app')
            ->where('recipient_user_id', (int) $vendor->id)
            ->count());

        $this->assertSame(1, Notification::query()
            ->where('user_id', (int) $vendor->id)
            ->where('type', 'courier_event')
            ->count());
    }

    public function test_v2_suppression_marks_email_dispatch_as_skipped(): void
    {
        config()->set('courier.notifications_v2.enabled', true);
        config()->set('courier.notifications_v2.rollout.mode', 'all');

        $service = app(CourierCustomerEmailDispatchService::class);
        $preferences = app(CourierNotificationPreferenceService::class);

        $vendor = User::factory()->create([
            'email' => 'vendor+' . Str::lower(Str::random(6)) . '@example.com',
        ]);
        $requester = User::factory()->create([
            'email' => 'requester+' . Str::lower(Str::random(6)) . '@example.com',
        ]);

        $notificationSettings = $preferences->defaultSettings();
        $notificationSettings['clientRecipients'] = [
            'requester' => true,
            'sender' => false,
            'recipient' => false,
            'extraEmails' => [],
        ];
        $notificationSettings['channels']['inApp']['enabled'] = false;

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => (int) $vendor->id],
            ['settings' => [
                'notifications' => $notificationSettings,
            ]]
        );

        CourierEmailSuppression::query()->create([
            'vendor_user_id' => (int) $vendor->id,
            'email' => mb_strtolower((string) $requester->email),
            'reason' => 'hard_bounce',
            'source' => 'provider_webhook',
            'suppressed_at' => now(),
        ]);

        $shipment = $this->createShipment(
            requesterId: (int) $requester->id,
            senderEmail: 'sender+' . Str::lower(Str::random(6)) . '@example.com',
            vendorId: (int) $vendor->id,
        );

        $created = $service->queueShipmentPlaced($shipment);
        $this->assertSame(1, $created);

        $dispatch = CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', CourierCustomerEmailDispatchService::EVENT_SHIPMENT_PLACED)
            ->first();

        $this->assertNotNull($dispatch);
        $this->assertSame(CourierCustomerEmailDispatch::STATUS_SKIPPED, (string) $dispatch->status);
        $this->assertSame('suppressed', (string) $dispatch->failed_reason_code);
    }

    private function createShipment(
        ?int $requesterId,
        string $senderEmail,
        ?int $vendorId = null,
        ?int $recipientUserId = null,
    ): CourierShipment {
        $sender = CourierContact::query()->create([
            'user_id' => $requesterId,
            'role' => CourierContact::ROLE_SENDER,
            'name' => 'Sender ' . Str::random(5),
            'email' => $senderEmail,
            'phone' => '+94-77-100-1000',
        ]);

        $recipient = CourierContact::query()->create([
            'user_id' => $recipientUserId ?: $requesterId,
            'role' => CourierContact::ROLE_RECIPIENT,
            'name' => 'Recipient ' . Str::random(5),
            'email' => 'recipient+' . Str::lower(Str::random(6)) . '@example.com',
            'phone' => '+94-11-200-2000',
        ]);

        $senderAddress = CourierAddress::query()->create([
            'contact_id' => (int) $sender->id,
            'label' => 'pickup',
            'line1' => '12 Palm Street',
            'city' => 'Colombo',
            'state' => 'Western',
            'postal_code' => '10000',
            'country' => 'LK',
            'is_primary' => true,
        ]);

        $recipientAddress = CourierAddress::query()->create([
            'contact_id' => (int) $recipient->id,
            'label' => 'dropoff',
            'line1' => '42 Market Avenue',
            'city' => 'Kandy',
            'state' => 'Central',
            'postal_code' => '20000',
            'country' => 'LK',
            'is_primary' => true,
        ]);

        return CourierShipment::query()->create([
            'reference' => 'CR-UT-' . strtoupper(Str::random(6)),
            'requested_by_user_id' => $requesterId,
            'assigned_vendor_user_id' => $vendorId,
            'sender_contact_id' => (int) $sender->id,
            'recipient_contact_id' => (int) $recipient->id,
            'sender_address_id' => (int) $senderAddress->id,
            'recipient_address_id' => (int) $recipientAddress->id,
            'service_level' => 'express',
            'status' => CourierShipment::STATUS_PENDING,
            'pickup_date' => now()->addDay()->toDateString(),
            'pickup_window_start' => '09:00:00',
            'pickup_window_end' => '12:00:00',
            'currency_code' => 'LKR',
        ]);
    }
}
