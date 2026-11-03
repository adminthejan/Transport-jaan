<?php

namespace App\Http\Controllers\CourierControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Services\Courier\CourierCustomerEmailDispatchService;
use App\Services\Courier\CourierPaymentsLkService;
use App\Services\PaymentsLkGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CourierPaymentController extends Controller
{
    public function checkout(Request $request, int $shipment)
    {
        $shipmentModel = CourierShipment::query()
            ->with(['sender', 'senderAddress', 'latestPayment'])
            ->findOrFail($shipment);

        $this->assertCanAccessShipment($request, $shipmentModel);
        if ($blockResponse = $this->vendorApprovalBlockResponse($request, $shipmentModel)) {
            return $blockResponse;
        }

        $payment = $shipmentModel->latestPayment;
        if (!$payment instanceof CourierShipmentPayment) {
            return redirect()->route('couriers.flow.create', ['flow' => $this->resolveFlow($shipmentModel)])
                ->with('error', 'No card payment is pending for this shipment.');
        }

        $checkout = app(CourierPaymentsLkService::class)->buildCheckoutPayload($payment, $shipmentModel, Auth::user());

        if ($request->expectsJson()) {
            return response()->json([
                'shipment' => [
                    'id' => (int) $shipmentModel->id,
                    'reference' => (string) $shipmentModel->reference,
                    'status' => (string) $shipmentModel->status,
                ],
                'payment' => [
                    'id' => (int) $payment->id,
                    'status' => (string) $payment->status,
                    'method' => (string) $payment->payment_method,
                    'provider' => (string) $payment->provider,
                    'amount' => (float) $payment->amount,
                    'currency' => (string) $payment->currency_code,
                    'orderId' => (string) ($payment->gateway_order_id ?? ''),
                    'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
                    'gatewayPaymentId' => (string) ($payment->gateway_payment_id ?? ''),
                    'txReference' => (string) ($payment->tx_reference ?? ''),
                    'failureReason' => (string) ($payment->failure_reason ?? ''),
                    'paidAt' => optional($payment->paid_at)->toIso8601String(),
                    'failedAt' => optional($payment->failed_at)->toIso8601String(),
                    'lastNotifiedAt' => optional($payment->last_notified_at)->toIso8601String(),
                ],
                'checkout' => $checkout,
                'pollingUrl' => route('couriers.payments.status', ['shipment' => (int) $shipmentModel->id]),
                'retryUrl' => route('couriers.payments.retry', ['shipment' => (int) $shipmentModel->id]),
                'returnToCreateUrl' => route('couriers.flow.create', ['flow' => $this->resolveFlow($shipmentModel)]),
                'shipmentDetailUrl' => route('courier.shipment.show', ['id' => (int) $shipmentModel->id]),
                'dashboardUrl' => route('courierBookingDashboard'),
            ]);
        }

        return Inertia::render('Web/courier/PaymentCheckout', [
            'shipment' => [
                'id' => (int) $shipmentModel->id,
                'reference' => (string) $shipmentModel->reference,
                'status' => (string) $shipmentModel->status,
            ],
            'payment' => [
                'id' => (int) $payment->id,
                'status' => (string) $payment->status,
                'method' => (string) $payment->payment_method,
                'provider' => (string) $payment->provider,
                'amount' => (float) $payment->amount,
                'currency' => (string) $payment->currency_code,
                'orderId' => (string) ($payment->gateway_order_id ?? ''),
                'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
                'gatewayPaymentId' => (string) ($payment->gateway_payment_id ?? ''),
                'txReference' => (string) ($payment->tx_reference ?? ''),
                'failureReason' => (string) ($payment->failure_reason ?? ''),
                'paidAt' => optional($payment->paid_at)->toIso8601String(),
                'failedAt' => optional($payment->failed_at)->toIso8601String(),
                'lastNotifiedAt' => optional($payment->last_notified_at)->toIso8601String(),
            ],
            'checkout' => $checkout,
            'pollingUrl' => route('couriers.payments.status', ['shipment' => (int) $shipmentModel->id]),
            'retryUrl' => route('couriers.payments.retry', ['shipment' => (int) $shipmentModel->id]),
            'returnToCreateUrl' => route('couriers.flow.create', ['flow' => $this->resolveFlow($shipmentModel)]),
            'shipmentDetailUrl' => route('courier.shipment.show', ['id' => (int) $shipmentModel->id]),
            'dashboardUrl' => route('courierBookingDashboard'),
        ]);
    }

    public function status(Request $request, int $shipment)
    {
        $shipmentModel = CourierShipment::query()
            ->with('latestPayment')
            ->findOrFail($shipment);

        $this->assertCanAccessShipment($request, $shipmentModel);

        $payment = $shipmentModel->latestPayment;

        return response()->json([
            'shipmentId' => (int) $shipmentModel->id,
            'shipmentStatus' => (string) $shipmentModel->status,
            'paymentId' => $payment?->id ? (int) $payment->id : null,
            'paymentStatus' => $payment?->status ?? $shipmentModel->resolvedPaymentStatus(),
            'orderId' => (string) ($payment?->gateway_order_id ?? ''),
            'gatewayStatus' => (string) ($payment?->gateway_status ?? ''),
            'gatewayPaymentId' => (string) ($payment?->gateway_payment_id ?? ''),
            'txReference' => (string) ($payment?->tx_reference ?? ''),
            'amount' => $payment?->amount !== null ? (float) $payment->amount : null,
            'currency' => (string) ($payment?->currency_code ?? ''),
            'paidAt' => optional($payment?->paid_at)->toIso8601String(),
            'failedAt' => optional($payment?->failed_at)->toIso8601String(),
            'failureReason' => (string) ($payment?->failure_reason ?? ''),
            'lastNotifiedAt' => optional($payment?->last_notified_at)->toIso8601String(),
        ]);
    }

    public function retry(Request $request, int $shipment)
    {
        $shipmentModel = CourierShipment::query()
            ->with('latestPayment')
            ->findOrFail($shipment);

        $this->assertCanAccessShipment($request, $shipmentModel);
        if ($blockResponse = $this->vendorApprovalBlockResponse($request, $shipmentModel)) {
            return $blockResponse;
        }

        $payment = $shipmentModel->latestPayment;
        if (!$payment instanceof CourierShipmentPayment) {
            return redirect()->back()->with('error', 'No pending courier card payment exists for retry.');
        }

        if ($payment->status === CourierShipmentPayment::STATUS_PAID) {
            return redirect()->back()->with('success', 'This courier payment is already completed.');
        }

        if ($payment->status === CourierShipmentPayment::STATUS_PENDING) {
            return redirect()->back()->with('warning', 'A payment attempt is already pending. Continue with the current checkout session.');
        }

        if (!in_array($payment->status, [
            CourierShipmentPayment::STATUS_FAILED,
            CourierShipmentPayment::STATUS_CANCELLED,
            CourierShipmentPayment::STATUS_EXPIRED,
        ], true)) {
            return redirect()->back()->with('error', 'Payment cannot be retried from its current state.');
        }

        $payment->forceFill([
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => $this->generateGatewayOrderId($shipmentModel),
            'gateway_payment_id' => null,
            'tx_reference' => null,
            'gateway_status' => null,
            'failed_at' => null,
            'failure_reason' => null,
            'paid_at' => null,
            'last_notified_at' => null,
            'initiated_at' => now(),
        ])->save();

        return redirect()->route('couriers.payments.checkout', ['shipment' => (int) $shipmentModel->id])
            ->with('success', 'Payment retry initialized. Continue with the card checkout.');
    }

    /**
     * Browser return from Payments.lk. The redirect itself proves nothing, so
     * if the webhook hasn't landed yet the checkout is re-read from the API
     * and resolved here.
     */
    public function handleReturn(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        if ($orderId === '') {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Missing payment order reference.',
                ], 422);
            }

            return redirect()->route('couriers.create')->with('error', 'Missing payment order reference.');
        }

        $payment = CourierShipmentPayment::query()
            ->where('gateway_order_id', $orderId)
            ->latest('id')
            ->first();

        if (!$payment instanceof CourierShipmentPayment) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Payment record not found.',
                ], 404);
            }

            return redirect()->route('couriers.create')->with('error', 'Payment record not found.');
        }

        if ($payment->status === CourierShipmentPayment::STATUS_PENDING) {
            $result = app(PaymentsLkGatewayService::class)->fetchResult($payment);
            if ($result !== null) {
                $this->applyGatewayResult($payment, $result);
                $payment->refresh();
            }
        }

        $shipmentId = (int) $payment->courier_shipment_id;
        $message = $payment->status === CourierShipmentPayment::STATUS_PAID
            ? 'Payment completed successfully.'
            : 'Payment is still processing. Refresh status in a few seconds.';

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'message' => $message,
                'shipmentId' => $shipmentId,
                'paymentStatus' => (string) $payment->status,
                'orderId' => (string) ($payment->gateway_order_id ?? ''),
                'gatewayPaymentId' => (string) ($payment->gateway_payment_id ?? ''),
                'txReference' => (string) ($payment->tx_reference ?? ''),
                'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
            ]);
        }

        return redirect()->route('courier.shipment.show', ['id' => $shipmentId])->with('success', $message);
    }

    public function handleCancel(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        if ($orderId === '') {
            return redirect()->route('couriers.create')->with('warning', 'Payment cancelled.');
        }

        $payment = CourierShipmentPayment::query()
            ->where('gateway_order_id', $orderId)
            ->latest('id')
            ->first();

        $shouldDispatchCancellationEmail = false;
        if ($payment instanceof CourierShipmentPayment && $payment->status === CourierShipmentPayment::STATUS_PENDING) {
            $payment->forceFill([
                'status' => CourierShipmentPayment::STATUS_CANCELLED,
                'failed_at' => now(),
                'failure_reason' => 'Cancelled by customer at gateway.',
            ])->save();

            $shouldDispatchCancellationEmail = true;
        }

        if ($shouldDispatchCancellationEmail && $payment instanceof CourierShipmentPayment) {
            app(CourierCustomerEmailDispatchService::class)->queuePaymentCancelled($payment);
        }

        if ($payment instanceof CourierShipmentPayment) {
            return redirect()->route('courier.shipment.show', ['id' => (int) $payment->courier_shipment_id])
                ->with('warning', 'Payment cancelled. You can retry checkout anytime.');
        }

        return redirect()->route('couriers.create')->with('warning', 'Payment cancelled.');
    }

    /** Called by PaymentsLkWebhookController for CPH-* references. */
    public function applyPaymentsLkResult(array $result): void
    {
        $payment = CourierShipmentPayment::query()
            ->where('gateway_order_id', $result['orderId'])
            ->latest('id')
            ->first();

        if (!$payment instanceof CourierShipmentPayment) {
            Log::warning('Payments.lk courier webhook: unknown order', ['order_id' => $result['orderId']]);

            return;
        }

        $this->applyGatewayResult($payment, $result);
    }

    /** Cross-checks a gateway result against the payment row, then applies it. */
    private function applyGatewayResult(CourierShipmentPayment $payment, array $result): void
    {
        $crossCheck = app(PaymentsLkGatewayService::class)->validateAgainstExpected($result, [
            'orderId' => (string) $payment->gateway_order_id,
            'amount' => (float) $payment->amount,
            'currency' => (string) ($payment->currency_code ?: 'LKR'),
        ]);

        if (!$crossCheck['isValid']) {
            Log::error('Payments.lk: courier result rejected', ['order_id' => $payment->gateway_order_id, 'reason' => $crossCheck['reason']]);
            $this->appendCallbackAudit($payment, $result, 'rejected', (string) $crossCheck['reason']);

            return;
        }

        $resolvedStatus = match ($result['status']) {
            PaymentsLkGatewayService::STATUS_PAID => CourierShipmentPayment::STATUS_PAID,
            PaymentsLkGatewayService::STATUS_FAILED => CourierShipmentPayment::STATUS_FAILED,
            PaymentsLkGatewayService::STATUS_EXPIRED => CourierShipmentPayment::STATUS_EXPIRED,
            default => CourierShipmentPayment::STATUS_PENDING,
        };

        $this->applyResolvedPaymentStatus($payment, $result, $resolvedStatus);
    }

    private function applyResolvedPaymentStatus(
        CourierShipmentPayment $payment,
        array $result,
        string $resolvedStatus
    ): void {
        $emailEventToDispatch = null;

        DB::transaction(function () use ($payment, $result, $resolvedStatus, &$emailEventToDispatch) {
            $lockedPayment = CourierShipmentPayment::query()
                ->whereKey((int) $payment->id)
                ->lockForUpdate()
                ->first();

            if (!$lockedPayment instanceof CourierShipmentPayment) {
                return;
            }

            $currentStatus = (string) $lockedPayment->status;
            $terminalStatuses = [
                CourierShipmentPayment::STATUS_PAID,
                CourierShipmentPayment::STATUS_FAILED,
                CourierShipmentPayment::STATUS_CANCELLED,
                CourierShipmentPayment::STATUS_EXPIRED,
            ];

            $currentCallbackPayload = is_array($lockedPayment->callback_payload) ? $lockedPayment->callback_payload : [];
            $currentCallbackPayload[] = [
                'received_at' => now()->toIso8601String(),
                'result' => $result,
                'previous_status' => $currentStatus,
                'resolved_status' => $resolvedStatus,
                'outcome' => 'accepted',
            ];

            // Idempotent guard: once PAID, never regress to non-paid statuses.
            // Allow late successful callbacks to upgrade a previously cancelled/failed/expired payment.
            if (
                $resolvedStatus !== CourierShipmentPayment::STATUS_PAID
                && in_array($currentStatus, $terminalStatuses, true)
                && $currentStatus !== $resolvedStatus
            ) {
                $lockedPayment->forceFill([
                    'last_notified_at' => now(),
                    'gateway_status' => (string) ($result['status'] ?: $lockedPayment->gateway_status),
                    'callback_payload' => $currentCallbackPayload,
                ])->save();

                return;
            }

            if ($resolvedStatus === CourierShipmentPayment::STATUS_PAID) {
                $wasAlreadyPaid = $currentStatus === CourierShipmentPayment::STATUS_PAID;

                $lockedPayment->forceFill([
                    'status' => CourierShipmentPayment::STATUS_PAID,
                    'gateway_payment_id' => (string) ($result['paymentId'] ?: $lockedPayment->gateway_payment_id),
                    'tx_reference' => (string) ($result['paymentId'] ?: $lockedPayment->tx_reference),
                    'gateway_status' => (string) ($result['status'] ?: $lockedPayment->gateway_status),
                    'paid_at' => $lockedPayment->paid_at ?: now(),
                    'failed_at' => null,
                    'failure_reason' => null,
                    'last_notified_at' => now(),
                    'callback_payload' => $currentCallbackPayload,
                ])->save();

                if (!$wasAlreadyPaid) {
                    $emailEventToDispatch = CourierCustomerEmailDispatchService::EVENT_PAYMENT_PAID;
                }

                return;
            }

            if (in_array($resolvedStatus, [
                CourierShipmentPayment::STATUS_FAILED,
                CourierShipmentPayment::STATUS_CANCELLED,
                CourierShipmentPayment::STATUS_EXPIRED,
            ], true)) {
                $wasAlreadyResolved = $currentStatus === $resolvedStatus;

                $lockedPayment->forceFill([
                    'status' => $resolvedStatus,
                    'gateway_status' => (string) ($result['status'] ?: $lockedPayment->gateway_status),
                    'failed_at' => $lockedPayment->failed_at ?: now(),
                    'failure_reason' => (string) ($result['message'] ?: ($lockedPayment->failure_reason ?? 'Gateway rejected payment.')),
                    'last_notified_at' => now(),
                    'callback_payload' => $currentCallbackPayload,
                ])->save();

                if (!$wasAlreadyResolved) {
                    $emailEventToDispatch = $resolvedStatus === CourierShipmentPayment::STATUS_CANCELLED
                        ? CourierCustomerEmailDispatchService::EVENT_PAYMENT_CANCELLED
                        : CourierCustomerEmailDispatchService::EVENT_PAYMENT_FAILED;
                }

                return;
            }

            $lockedPayment->forceFill([
                'status' => CourierShipmentPayment::STATUS_PENDING,
                'gateway_status' => (string) ($result['status'] ?: $lockedPayment->gateway_status),
                'last_notified_at' => now(),
                'callback_payload' => $currentCallbackPayload,
            ])->save();
        });

        if ($emailEventToDispatch !== null) {
            $payment->refresh();
            $emailDispatch = app(CourierCustomerEmailDispatchService::class);

            if ($emailEventToDispatch === CourierCustomerEmailDispatchService::EVENT_PAYMENT_PAID) {
                $emailDispatch->queuePaymentPaid($payment);
            } elseif ($emailEventToDispatch === CourierCustomerEmailDispatchService::EVENT_PAYMENT_CANCELLED) {
                $emailDispatch->queuePaymentCancelled($payment);
            } else {
                $emailDispatch->queuePaymentFailed($payment);
            }
        }
    }

    private function assertCanAccessShipment(Request $request, CourierShipment $shipment): void
    {
        $userId = Auth::id();
        if ($userId && (int) $shipment->requested_by_user_id === (int) $userId) {
            return;
        }

        $allowedIds = collect((array) $request->session()->get('courier_guest_bill_access_ids', []))
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0)
            ->values();

        if ($allowedIds->contains((int) $shipment->id)) {
            return;
        }

        abort(403, 'You are not allowed to access this payment session.');
    }

    /**
     * Shipments whose type requires vendor review (e.g. "Other") can't be
     * paid for until the assigned vendor approves them. Returns a response
     * to short-circuit the caller when blocked, or null when payment may
     * proceed.
     */
    private function vendorApprovalBlockResponse(Request $request, CourierShipment $shipment)
    {
        if (!$shipment->isVendorApprovalBlocking()) {
            return null;
        }

        $message = $shipment->vendor_approval_status === CourierShipment::VENDOR_APPROVAL_REJECTED
            ? 'This shipment was not approved by the vendor and cannot be paid for. Please contact support or start a new booking.'
            : 'This shipment is awaiting vendor approval before payment can proceed.';

        if ($request->expectsJson()) {
            return response()->json(['ok' => false, 'message' => $message], 409);
        }

        return redirect()->route('courier.shipment.show', ['id' => (int) $shipment->id])
            ->with('error', $message);
    }

    private function resolveFlow(CourierShipment $shipment): string
    {
        $senderCountry = strtoupper((string) ($shipment->senderAddress?->country ?? ''));
        $recipientCountry = strtoupper((string) ($shipment->recipientAddress?->country ?? ''));

        return $senderCountry === 'LK' && $recipientCountry === 'LK'
            ? 'domestic'
            : 'international';
    }

    private function generateGatewayOrderId(CourierShipment $shipment): string
    {
        return 'CPH-' . (int) $shipment->id . '-' . strtoupper(Str::random(8));
    }

    private function appendCallbackAudit(
        CourierShipmentPayment $payment,
        array $payload,
        string $outcome,
        string $reason,
        array $context = []
    ): void {
        $history = is_array($payment->callback_payload) ? $payment->callback_payload : [];
        $history[] = [
            'received_at' => now()->toIso8601String(),
            'payload' => $payload,
            'outcome' => $outcome,
            'reason' => $reason,
            'context' => $context,
            'previous_status' => (string) $payment->status,
        ];

        $payment->forceFill([
            'last_notified_at' => now(),
            'callback_payload' => $history,
        ])->save();
    }
}
