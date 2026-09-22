<?php

namespace App\Services\Courier;

use App\Jobs\SendCourierCustomerEmailJob;
use App\Models\Courier\CourierCustomerEmailDispatch;
use App\Models\Courier\CourierEmailSuppression;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\CourierTrackingEvent;
use App\Models\Courier\VendorCourierSetting;
use App\Models\Notification;
use App\Models\User;
use App\Models\VendorUserMembership;
use Illuminate\Support\Arr;

class CourierCustomerEmailDispatchService
{
    public const EVENT_SHIPMENT_PLACED = 'shipment_placed';
    public const EVENT_BOOKING_CONFIRMED = 'booking_confirmed';
    public const EVENT_BOOKING_CANCELLED = 'booking_cancelled';
    public const EVENT_TRACKING_PICKED_UP = 'tracking_picked_up';
    public const EVENT_TRACKING_OUT_FOR_DELIVERY = 'tracking_out_for_delivery';
    public const EVENT_TRACKING_DELIVERED = 'tracking_delivered';
    public const EVENT_PAYMENT_PAID = 'payment_paid';
    public const EVENT_PAYMENT_FAILED = 'payment_failed';
    public const EVENT_PAYMENT_CANCELLED = 'payment_cancelled';
    public const EVENT_VENDOR_APPROVED = 'vendor_approved';
    public const EVENT_VENDOR_REJECTED = 'vendor_rejected';

    public function __construct(
        private readonly CourierNotificationPreferenceService $preferences,
    ) {
    }

    /**
     * @return array<string, string>
     */
    private function eventToggleMap(): array
    {
        return $this->preferences->legacyToggleMap();
    }

    /**
     * @return array<string, bool>
     */
    public function defaultNotificationFlags(): array
    {
        return $this->preferences->defaultLegacyFlags();
    }

    public function queueShipmentPlaced(CourierShipment $shipment): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_SHIPMENT_PLACED);
    }

    public function queueBookingConfirmed(CourierShipment $shipment, ?CourierTrackingEvent $trackingEvent = null): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_BOOKING_CONFIRMED, trackingEvent: $trackingEvent);
    }

    public function queueBookingCancelled(CourierShipment $shipment, ?CourierTrackingEvent $trackingEvent = null): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_BOOKING_CANCELLED, trackingEvent: $trackingEvent);
    }

    public function queueTrackingPickedUp(CourierShipment $shipment, CourierTrackingEvent $trackingEvent): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_TRACKING_PICKED_UP, trackingEvent: $trackingEvent);
    }

    public function queueTrackingOutForDelivery(CourierShipment $shipment, CourierTrackingEvent $trackingEvent): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_TRACKING_OUT_FOR_DELIVERY, trackingEvent: $trackingEvent);
    }

    public function queueTrackingDelivered(CourierShipment $shipment, CourierTrackingEvent $trackingEvent): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_TRACKING_DELIVERED, trackingEvent: $trackingEvent);
    }

    public function queuePaymentPaid(CourierShipmentPayment $payment): int
    {
        return $this->queuePaymentEvent($payment, self::EVENT_PAYMENT_PAID);
    }

    public function queuePaymentFailed(CourierShipmentPayment $payment): int
    {
        return $this->queuePaymentEvent($payment, self::EVENT_PAYMENT_FAILED);
    }

    public function queuePaymentCancelled(CourierShipmentPayment $payment): int
    {
        return $this->queuePaymentEvent($payment, self::EVENT_PAYMENT_CANCELLED);
    }

    public function queueVendorApproved(CourierShipment $shipment, ?CourierTrackingEvent $trackingEvent = null): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_VENDOR_APPROVED, trackingEvent: $trackingEvent);
    }

    public function queueVendorRejected(CourierShipment $shipment, ?CourierTrackingEvent $trackingEvent = null): int
    {
        return $this->queueShipmentEvent($shipment, self::EVENT_VENDOR_REJECTED, trackingEvent: $trackingEvent);
    }

    private function queuePaymentEvent(CourierShipmentPayment $payment, string $eventType): int
    {
        $shipment = $payment->relationLoaded('shipment')
            ? $payment->getRelation('shipment')
            : $payment->shipment()->first();

        if (!$shipment instanceof CourierShipment) {
            return 0;
        }

        return $this->queueShipmentEvent($shipment, $eventType, payment: $payment);
    }

    private function queueShipmentEvent(
        CourierShipment $shipment,
        string $eventType,
        ?CourierShipmentPayment $payment = null,
        ?CourierTrackingEvent $trackingEvent = null
    ): int {
        $shipment->loadMissing([
            'requestedBy:id,email,name',
            'sender:id,user_id,email,name',
            'recipient:id,user_id,email,name',
        ]);

        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        $notificationSettings = $this->resolveVendorNotificationSettings($vendorId);
        $sourceKey = $this->resolveSourceKey($shipment, $payment, $trackingEvent);
        $payload = $this->buildPayload($shipment, $eventType, $payment, $trackingEvent, $notificationSettings, $vendorId);
        $isV2Enabled = $this->preferences->isV2EnabledForVendor($vendorId);

        if (!$isV2Enabled) {
            if (!$this->isEventEnabledForVendor($notificationSettings, $eventType)) {
                return 0;
            }

            $created = $this->queueDispatches(
                $shipment,
                $eventType,
                CourierNotificationPreferenceService::CHANNEL_EMAIL,
                CourierNotificationPreferenceService::AUDIENCE_CLIENT,
                $this->resolveLegacyRecipientCandidates($shipment),
                $sourceKey,
                $payload,
                $payment,
                $trackingEvent,
                $vendorId,
                $notificationSettings,
            );

            $this->queueLegacyVendorInAppNotification(
                $shipment,
                $eventType,
                $sourceKey,
                $vendorId,
            );

            return $created;
        }

        $created = 0;
        $channels = [
            CourierNotificationPreferenceService::CHANNEL_EMAIL,
            CourierNotificationPreferenceService::CHANNEL_IN_APP,
        ];
        $audiences = [
            CourierNotificationPreferenceService::AUDIENCE_CLIENT,
            CourierNotificationPreferenceService::AUDIENCE_INTERNAL,
        ];

        foreach ($audiences as $audience) {
            if (!$this->preferences->eventSupportsAudience($eventType, $audience)) {
                continue;
            }

            $candidates = $this->resolveAudienceRecipients($shipment, $notificationSettings, $audience, $vendorId);
            if ($candidates === []) {
                continue;
            }

            foreach ($channels as $channel) {
                if (!$this->preferences->isEventChannelEnabled($notificationSettings, $eventType, $audience, $channel)) {
                    continue;
                }

                $created += $this->queueDispatches(
                    $shipment,
                    $eventType,
                    $channel,
                    $audience,
                    $candidates,
                    $sourceKey,
                    $payload,
                    $payment,
                    $trackingEvent,
                    $vendorId,
                    $notificationSettings,
                );
            }
        }

        return $created;
    }

    /**
     * @param array<int, array{kind: string, email: string, user_id?: int|null}> $candidates
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $notificationSettings
     */
    private function queueDispatches(
        CourierShipment $shipment,
        string $eventType,
        string $channel,
        string $audience,
        array $candidates,
        string $sourceKey,
        array $payload,
        ?CourierShipmentPayment $payment,
        ?CourierTrackingEvent $trackingEvent,
        int $vendorId,
        array $notificationSettings,
    ): int {
        $created = 0;

        foreach ($candidates as $candidate) {
            $kind = (string) ($candidate['kind'] ?? 'unknown');
            $recipientUserId = isset($candidate['user_id']) ? (int) $candidate['user_id'] : null;
            $email = $this->normalizeEmail((string) ($candidate['email'] ?? ''));

            if ($channel === CourierNotificationPreferenceService::CHANNEL_IN_APP && (!$recipientUserId || $recipientUserId <= 0)) {
                continue;
            }

            $recipientKey = $channel === CourierNotificationPreferenceService::CHANNEL_IN_APP
                ? ('user:' . (int) $recipientUserId)
                : ($email !== '' ? $email : ('missing:' . $kind));

            if ($this->shouldRateLimit($shipment, $eventType, $channel, $email, $recipientUserId, $vendorId)) {
                continue;
            }

            $dedupeKey = sha1(implode('|', [
                'courier',
                'notifications',
                $channel,
                $audience,
                $eventType,
                $sourceKey,
                $recipientKey,
            ]));

            if ($channel === CourierNotificationPreferenceService::CHANNEL_IN_APP) {
                $created += $this->createInAppDispatch(
                    $shipment,
                    $eventType,
                    $kind,
                    $recipientUserId,
                    $email,
                    $dedupeKey,
                    $payload,
                    $payment,
                    $trackingEvent,
                    $vendorId,
                );

                continue;
            }

            $respectSuppression = (bool) Arr::get($notificationSettings, 'deliverability.respectSuppression', true);
            $isValidEmail = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL);
            $isSuppressed = $isValidEmail && $respectSuppression && $this->isSuppressed($email, $vendorId);

            $dispatch = CourierCustomerEmailDispatch::query()->firstOrCreate(
                ['dedupe_key' => $dedupeKey],
                [
                    'vendor_user_id' => $vendorId > 0 ? $vendorId : null,
                    'shipment_id' => (int) $shipment->id,
                    'payment_id' => $payment?->id ? (int) $payment->id : null,
                    'tracking_event_id' => $trackingEvent?->id ? (int) $trackingEvent->id : null,
                    'event_type' => $eventType,
                    'channel' => CourierNotificationPreferenceService::CHANNEL_EMAIL,
                    'recipient_email' => $email,
                    'recipient_kind' => $kind,
                    'recipient_user_id' => $recipientUserId ?: null,
                    'status' => !$isValidEmail || $isSuppressed
                        ? CourierCustomerEmailDispatch::STATUS_SKIPPED
                        : CourierCustomerEmailDispatch::STATUS_PENDING,
                    'payload' => $payload,
                    'queued_at' => now(),
                    'failed_reason_code' => !$isValidEmail
                        ? 'invalid_recipient'
                        : ($isSuppressed ? 'suppressed' : null),
                    'last_error' => !$isValidEmail
                        ? 'Recipient email is missing or invalid.'
                        : ($isSuppressed ? 'Recipient is suppressed due to provider feedback.' : null),
                ]
            );

            if (!$dispatch->wasRecentlyCreated) {
                continue;
            }

            $created++;

            if ((string) $dispatch->status === CourierCustomerEmailDispatch::STATUS_PENDING) {
                SendCourierCustomerEmailJob::dispatch((int) $dispatch->id)->afterCommit();
            }
        }

        return $created;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createInAppDispatch(
        CourierShipment $shipment,
        string $eventType,
        string $kind,
        ?int $recipientUserId,
        string $email,
        string $dedupeKey,
        array $payload,
        ?CourierShipmentPayment $payment,
        ?CourierTrackingEvent $trackingEvent,
        int $vendorId,
    ): int {
        $dispatch = CourierCustomerEmailDispatch::query()->firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'vendor_user_id' => $vendorId > 0 ? $vendorId : null,
                'shipment_id' => (int) $shipment->id,
                'payment_id' => $payment?->id ? (int) $payment->id : null,
                'tracking_event_id' => $trackingEvent?->id ? (int) $trackingEvent->id : null,
                'event_type' => $eventType,
                'channel' => CourierNotificationPreferenceService::CHANNEL_IN_APP,
                'recipient_email' => $email !== '' ? $email : ('user-' . (int) $recipientUserId . '@in-app.local'),
                'recipient_kind' => $kind,
                'recipient_user_id' => $recipientUserId,
                'status' => CourierCustomerEmailDispatch::STATUS_SENT,
                'payload' => $payload,
                'queued_at' => now(),
                'sent_at' => now(),
            ]
        );

        if (!$dispatch->wasRecentlyCreated) {
            return 0;
        }

        Notification::query()->create([
            'user_id' => (int) $recipientUserId,
            'type' => 'courier_event',
            'data' => [
                'dispatch_id' => (int) $dispatch->id,
                'dedupe_key' => $dispatch->dedupe_key,
                'vendor_user_id' => $vendorId > 0 ? $vendorId : null,
                'event_type' => $eventType,
                'shipment_id' => (int) $shipment->id,
                'shipment_reference' => (string) ($shipment->reference ?? ''),
                'severity' => $this->resolveEventSeverity($eventType),
                'title' => $this->resolveInAppTitle($eventType),
                'message' => $this->resolveInAppMessage($eventType, $shipment),
                'action_url' => $this->resolveInAppActionUrl($eventType),
            ],
            'booking_id' => null,
            'read_at' => null,
        ]);

        return 1;
    }

    private function queueLegacyVendorInAppNotification(
        CourierShipment $shipment,
        string $eventType,
        string $sourceKey,
        int $vendorId,
    ): void {
        if ($vendorId <= 0) {
            return;
        }

        $dedupeKey = sha1(implode('|', [
            'courier',
            'notifications',
            'legacy_in_app',
            CourierNotificationPreferenceService::AUDIENCE_INTERNAL,
            $eventType,
            $sourceKey,
            'user:' . $vendorId,
        ]));

        $alreadyQueued = Notification::query()
            ->where('user_id', $vendorId)
            ->where('type', 'courier_event')
            ->where('created_at', '>=', now()->subDays(30))
            ->orderByDesc('id')
            ->limit(200)
            ->get(['data'])
            ->contains(static function (Notification $notification) use ($dedupeKey): bool {
                $data = is_array($notification->data) ? $notification->data : [];
                return (string) ($data['dedupe_key'] ?? '') === $dedupeKey;
            });

        if ($alreadyQueued) {
            return;
        }

        Notification::query()->create([
            'user_id' => $vendorId,
            'type' => 'courier_event',
            'data' => [
                'dispatch_id' => null,
                'dedupe_key' => $dedupeKey,
                'vendor_user_id' => $vendorId,
                'event_type' => $eventType,
                'shipment_id' => (int) $shipment->id,
                'shipment_reference' => (string) ($shipment->reference ?? ''),
                'severity' => $this->resolveEventSeverity($eventType),
                'title' => $this->resolveInAppTitle($eventType),
                'message' => $this->resolveInAppMessage($eventType, $shipment),
                'action_url' => $this->resolveInAppActionUrl($eventType),
                'legacy_mode' => true,
            ],
            'booking_id' => null,
            'read_at' => null,
        ]);
    }

    private function resolveInAppTitle(string $eventType): string
    {
        return match ($eventType) {
            self::EVENT_SHIPMENT_PLACED => 'Shipment Placed',
            self::EVENT_BOOKING_CONFIRMED => 'Booking Confirmed',
            self::EVENT_BOOKING_CANCELLED => 'Booking Cancelled',
            self::EVENT_TRACKING_PICKED_UP => 'Shipment Picked Up',
            self::EVENT_TRACKING_OUT_FOR_DELIVERY => 'Out For Delivery',
            self::EVENT_TRACKING_DELIVERED => 'Shipment Delivered',
            self::EVENT_PAYMENT_PAID => 'Payment Received',
            self::EVENT_PAYMENT_FAILED => 'Payment Failed',
            self::EVENT_PAYMENT_CANCELLED => 'Payment Cancelled',
            default => 'Courier Update',
        };
    }

    private function resolveEventSeverity(string $eventType): string
    {
        return match ($eventType) {
            self::EVENT_PAYMENT_FAILED,
            self::EVENT_PAYMENT_CANCELLED,
            'internal_exception',
            'internal_sla_risk' => 'high',
            self::EVENT_BOOKING_CANCELLED => 'medium',
            default => 'info',
        };
    }

    private function resolveInAppMessage(string $eventType, CourierShipment $shipment): string
    {
        $reference = (string) ($shipment->reference ?? ('#' . (int) $shipment->id));

        return match ($eventType) {
            self::EVENT_SHIPMENT_PLACED => 'Shipment placed: ' . $reference,
            self::EVENT_BOOKING_CONFIRMED => 'Booking confirmed: ' . $reference,
            self::EVENT_BOOKING_CANCELLED => 'Booking cancelled: ' . $reference,
            self::EVENT_TRACKING_PICKED_UP => 'Shipment picked up: ' . $reference,
            self::EVENT_TRACKING_OUT_FOR_DELIVERY => 'Out for delivery: ' . $reference,
            self::EVENT_TRACKING_DELIVERED => 'Shipment delivered: ' . $reference,
            self::EVENT_PAYMENT_PAID => 'Payment received: ' . $reference,
            self::EVENT_PAYMENT_FAILED => 'Payment failed: ' . $reference,
            self::EVENT_PAYMENT_CANCELLED => 'Payment cancelled: ' . $reference,
            default => 'Courier update: ' . $reference,
        };
    }

    private function resolveInAppActionUrl(string $eventType): string
    {
        return match ($eventType) {
            self::EVENT_PAYMENT_PAID,
            self::EVENT_PAYMENT_FAILED,
            self::EVENT_PAYMENT_CANCELLED => '/courierService/payment',
            self::EVENT_TRACKING_PICKED_UP,
            self::EVENT_TRACKING_OUT_FOR_DELIVERY,
            self::EVENT_TRACKING_DELIVERED => '/courierService/tracking',
            default => '/courierService/bookings',
        };
    }

    /**
     * @param array<string, mixed> $notificationSettings
     * @return array<int, array{kind: string, email: string, user_id?: int|null}>
     */
    private function resolveAudienceRecipients(CourierShipment $shipment, array $notificationSettings, string $audience, int $vendorId): array
    {
        if ($audience === CourierNotificationPreferenceService::AUDIENCE_CLIENT) {
            return $this->resolveClientRecipientCandidates($shipment, $notificationSettings);
        }

        return $this->resolveInternalRecipientCandidates($notificationSettings, $vendorId);
    }

    /**
     * @param array<string, mixed> $notificationSettings
     * @return array<int, array{kind: string, email: string, user_id?: int|null}>
     */
    private function resolveClientRecipientCandidates(CourierShipment $shipment, array $notificationSettings): array
    {
        $recipientSettings = is_array($notificationSettings['clientRecipients'] ?? null)
            ? $notificationSettings['clientRecipients']
            : [];
        $rows = [];

        if ((bool) ($recipientSettings['requester'] ?? true)) {
            $rows[] = [
                'kind' => 'requester',
                'email' => (string) ($shipment->requestedBy?->email ?? ''),
                'user_id' => $shipment->requestedBy?->id ? (int) $shipment->requestedBy->id : null,
            ];
        }

        if ((bool) ($recipientSettings['sender'] ?? true)) {
            $rows[] = [
                'kind' => 'sender',
                'email' => (string) ($shipment->sender?->email ?? ''),
                'user_id' => $shipment->sender?->user_id ? (int) $shipment->sender->user_id : null,
            ];
        }

        if ((bool) ($recipientSettings['recipient'] ?? true)) {
            $rows[] = [
                'kind' => 'recipient',
                'email' => (string) ($shipment->recipient?->email ?? ''),
                'user_id' => $shipment->recipient?->user_id ? (int) $shipment->recipient->user_id : null,
            ];
        }

        $extraEmails = is_array($recipientSettings['extraEmails'] ?? null) ? $recipientSettings['extraEmails'] : [];
        foreach ($extraEmails as $email) {
            $rows[] = [
                'kind' => 'client_extra',
                'email' => (string) $email,
                'user_id' => null,
            ];
        }

        return $this->uniqueCandidates($rows);
    }

    /**
     * @param array<string, mixed> $notificationSettings
     * @return array<int, array{kind: string, email: string, user_id?: int|null}>
     */
    private function resolveInternalRecipientCandidates(array $notificationSettings, int $vendorId): array
    {
        if ($vendorId <= 0) {
            return [];
        }

        $internal = is_array($notificationSettings['internalRecipients'] ?? null)
            ? $notificationSettings['internalRecipients']
            : [];
        $roleNames = is_array($internal['roleNames'] ?? null) ? $internal['roleNames'] : [];
        $explicitUserIds = is_array($internal['userIds'] ?? null) ? $internal['userIds'] : [];
        $extraEmails = is_array($internal['extraEmails'] ?? null) ? $internal['extraEmails'] : [];

        $roleNames = array_values(array_unique(array_filter(array_map(
            static fn ($role) => trim((string) $role),
            $roleNames
        ), static fn ($role) => $role !== '')));
        $explicitUserIds = array_values(array_unique(array_filter(array_map(
            static fn ($id) => (int) $id,
            $explicitUserIds
        ), static fn ($id) => $id > 0)));

        $membershipQuery = VendorUserMembership::query()
            ->where('vendor_user_id', $vendorId)
            ->where('status', 'active');

        if ($roleNames !== []) {
            $roleUserIds = User::query()->role($roleNames)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
            $membershipQuery->where(function ($query) use ($roleNames, $roleUserIds) {
                $query->whereIn('membership_role', $roleNames);
                if ($roleUserIds !== []) {
                    $query->orWhereIn('user_id', $roleUserIds);
                }
            });
        } else {
            $membershipQuery->whereRaw('1 = 0');
        }

        $roleMembershipUserIds = $membershipQuery->pluck('user_id')->map(fn ($id) => (int) $id)->values()->all();
        $userIds = array_values(array_unique(array_filter(array_merge($roleMembershipUserIds, $explicitUserIds))));
        if (!in_array($vendorId, $userIds, true)) {
            $userIds[] = $vendorId;
        }

        $rows = [];
        if ($userIds !== []) {
            $users = User::query()
                ->whereIn('id', $userIds)
                ->select(['id', 'email'])
                ->get();

            foreach ($users as $user) {
                $rows[] = [
                    'kind' => (int) $user->id === $vendorId ? 'vendor_owner' : 'internal_user',
                    'email' => (string) ($user->email ?? ''),
                    'user_id' => (int) $user->id,
                ];
            }
        }

        foreach ($extraEmails as $email) {
            $rows[] = [
                'kind' => 'internal_extra',
                'email' => (string) $email,
                'user_id' => null,
            ];
        }

        return $this->uniqueCandidates($rows);
    }

    /**
     * @return array<int, array{kind: string, email: string, user_id?: int|null}>
     */
    private function resolveLegacyRecipientCandidates(CourierShipment $shipment): array
    {
        return $this->uniqueCandidates([
            [
                'kind' => 'requester',
                'email' => (string) ($shipment->requestedBy?->email ?? ''),
                'user_id' => $shipment->requestedBy?->id ? (int) $shipment->requestedBy->id : null,
            ],
            [
                'kind' => 'sender',
                'email' => (string) ($shipment->sender?->email ?? ''),
                'user_id' => $shipment->sender?->user_id ? (int) $shipment->sender->user_id : null,
            ],
        ]);
    }

    /**
     * @param array<int, array{kind: string, email: string, user_id?: int|null}> $rows
     * @return array<int, array{kind: string, email: string, user_id?: int|null}>
     */
    private function uniqueCandidates(array $rows): array
    {
        $seen = [];
        $result = [];

        foreach ($rows as $row) {
            $userId = isset($row['user_id']) ? (int) $row['user_id'] : 0;
            $email = $this->normalizeEmail((string) ($row['email'] ?? ''));
            $kind = (string) ($row['kind'] ?? '');
            $fingerprint = $email !== ''
                ? ('email:' . $email . '|kind:' . $kind)
                : ($userId > 0 ? ('user:' . $userId . '|kind:' . $kind) : ('kind:' . $kind));

            if (($email === '' && $userId <= 0) || isset($seen[$fingerprint])) {
                continue;
            }

            $seen[$fingerprint] = true;
            $row['email'] = $email;
            $result[] = $row;
        }

        return $result;
    }

    private function resolveSourceKey(
        CourierShipment $shipment,
        ?CourierShipmentPayment $payment,
        ?CourierTrackingEvent $trackingEvent
    ): string {
        if ($payment?->id) {
            return 'payment:' . (int) $payment->id;
        }

        if ($trackingEvent?->id) {
            return 'tracking:' . (int) $trackingEvent->id;
        }

        return 'shipment:' . (int) $shipment->id;
    }

    /**
     * @param array<string, mixed> $notificationSettings
     * @return array<string, mixed>
     */
    private function buildPayload(
        CourierShipment $shipment,
        string $eventType,
        ?CourierShipmentPayment $payment,
        ?CourierTrackingEvent $trackingEvent,
        array $notificationSettings,
        int $vendorId,
    ): array {
        return [
            'eventType' => $eventType,
            'vendorUserId' => $vendorId > 0 ? $vendorId : null,
            'shipment' => [
                'id' => (int) $shipment->id,
                'reference' => (string) ($shipment->reference ?? ''),
                'status' => (string) ($shipment->status ?? ''),
                'serviceLevel' => (string) ($shipment->service_level ?? ''),
            ],
            'payment' => $payment ? [
                'id' => (int) $payment->id,
                'status' => (string) ($payment->status ?? ''),
                'method' => (string) ($payment->payment_method ?? ''),
                'provider' => (string) ($payment->provider ?? ''),
                'amount' => (float) ($payment->amount ?? 0),
                'currency' => (string) ($payment->currency_code ?? ''),
                'orderId' => (string) ($payment->gateway_order_id ?? ''),
                'txReference' => (string) ($payment->tx_reference ?? ''),
            ] : null,
            'tracking' => $trackingEvent ? [
                'id' => (int) $trackingEvent->id,
                'status' => (string) ($trackingEvent->status ?? ''),
                'location' => (string) ($trackingEvent->location ?? ''),
                'description' => (string) ($trackingEvent->description ?? ''),
                'recordedAt' => optional($trackingEvent->recorded_at)->toIso8601String(),
            ] : null,
            'deliverability' => [
                'fromName' => (string) Arr::get($notificationSettings, 'deliverability.fromName', ''),
                'fromEmail' => (string) Arr::get($notificationSettings, 'deliverability.fromEmail', ''),
                'replyTo' => (string) Arr::get($notificationSettings, 'deliverability.replyTo', ''),
            ],
            'queuedAt' => now()->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveVendorNotificationSettings(int $vendorId): array
    {
        $defaults = $this->preferences->defaultSettings();
        if ($vendorId <= 0) {
            return $defaults;
        }

        $settings = VendorCourierSetting::query()
            ->where('vendor_user_id', $vendorId)
            ->value('settings');

        if (!is_array($settings)) {
            if (is_string($settings)) {
                $decoded = json_decode($settings, true);
                $settings = is_array($decoded) ? $decoded : [];
            } else {
                $settings = [];
            }
        }

        $notifications = is_array($settings['notifications'] ?? null)
            ? $settings['notifications']
            : [];

        return $this->preferences->normalize(array_replace_recursive($defaults, $notifications));
    }

    /**
     * @param array<string, mixed> $notificationSettings
     */
    private function isEventEnabledForVendor(array $notificationSettings, string $eventType): bool
    {
        return $this->preferences->legacyFlagEnabled($notificationSettings, $eventType);
    }

    private function isSuppressed(string $email, int $vendorId): bool
    {
        if ($email === '') {
            return false;
        }

        return CourierEmailSuppression::query()
            ->where('email', $email)
            ->where(function ($query) use ($vendorId) {
                if ($vendorId > 0) {
                    $query->where('vendor_user_id', $vendorId)
                        ->orWhereNull('vendor_user_id');
                } else {
                    $query->whereNull('vendor_user_id');
                }
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->exists();
    }

    private function shouldRateLimit(
        CourierShipment $shipment,
        string $eventType,
        string $channel,
        string $recipientEmail,
        ?int $recipientUserId,
        int $vendorId
    ): bool {
        $window = max(0, (int) config('courier.notifications_v2.throttle_window_seconds', 300));
        if ($window <= 0) {
            return false;
        }

        $query = CourierCustomerEmailDispatch::query()
            ->where('shipment_id', (int) $shipment->id)
            ->where('event_type', $eventType)
            ->where('channel', $channel)
            ->where('created_at', '>=', now()->subSeconds($window));

        if ($vendorId > 0) {
            $query->where('vendor_user_id', $vendorId);
        }

        if ($channel === CourierNotificationPreferenceService::CHANNEL_IN_APP) {
            $query->where('recipient_user_id', (int) $recipientUserId);
        } else {
            $query->where('recipient_email', $recipientEmail);
        }

        return $query->exists();
    }

    private function normalizeEmail(string $email): string
    {
        return mb_strtolower(trim($email));
    }
}
