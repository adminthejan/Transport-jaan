<?php

namespace App\Mail;

use App\Models\Courier\CourierCustomerEmailDispatch;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\CourierTrackingEvent;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CourierCustomerLifecycleMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CourierCustomerEmailDispatch $dispatch,
        public CourierShipment $shipment,
        public ?CourierShipmentPayment $payment = null,
        public ?CourierTrackingEvent $trackingEvent = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $payload = is_array($this->dispatch->payload) ? $this->dispatch->payload : [];
        $deliverability = is_array($payload['deliverability'] ?? null) ? $payload['deliverability'] : [];
        $fromEmail = trim((string) ($deliverability['fromEmail'] ?? ''));
        $fromName = trim((string) ($deliverability['fromName'] ?? ''));
        $replyTo = trim((string) ($deliverability['replyTo'] ?? ''));
        $allowCustomFrom = (bool) config('courier.notifications_v2.allow_custom_from', false);

        return new Envelope(
            subject: $this->subjectForEvent((string) $this->dispatch->event_type),
            from: $allowCustomFrom && filter_var($fromEmail, FILTER_VALIDATE_EMAIL)
                ? new Address($fromEmail, $fromName !== '' ? $fromName : null)
                : null,
            replyTo: filter_var($replyTo, FILTER_VALIDATE_EMAIL)
                ? [new Address($replyTo)]
                : [],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.courier.customer-lifecycle',
            with: [
                'dispatch' => $this->dispatch,
                'shipment' => $this->shipment,
                'payment' => $this->payment,
                'trackingEvent' => $this->trackingEvent,
                'eventLabel' => $this->eventLabel((string) $this->dispatch->event_type),
                'statusSummary' => $this->statusSummary((string) $this->dispatch->event_type),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }

    private function subjectForEvent(string $eventType): string
    {
        return match ($eventType) {
            'shipment_placed' => 'Courier Booking Received - ' . (string) $this->shipment->reference,
            'booking_confirmed' => 'Courier Booking Confirmed - ' . (string) $this->shipment->reference,
            'booking_cancelled' => 'Courier Booking Cancelled - ' . (string) $this->shipment->reference,
            'tracking_picked_up' => 'Courier Update: Picked Up - ' . (string) $this->shipment->reference,
            'tracking_out_for_delivery' => 'Courier Update: Out for Delivery - ' . (string) $this->shipment->reference,
            'tracking_delivered' => 'Courier Update: Delivered - ' . (string) $this->shipment->reference,
            'payment_paid' => 'Payment Received - Courier ' . (string) $this->shipment->reference,
            'payment_failed' => 'Payment Failed - Courier ' . (string) $this->shipment->reference,
            'payment_cancelled' => 'Payment Cancelled - Courier ' . (string) $this->shipment->reference,
            'vendor_approved' => 'Courier Shipment Approved - ' . (string) $this->shipment->reference,
            'vendor_rejected' => 'Courier Shipment Rejected - ' . (string) $this->shipment->reference,
            default => 'Courier Update - ' . (string) $this->shipment->reference,
        };
    }

    private function eventLabel(string $eventType): string
    {
        return match ($eventType) {
            'shipment_placed' => 'Shipment Placed',
            'booking_confirmed' => 'Booking Confirmed',
            'booking_cancelled' => 'Booking Cancelled',
            'tracking_picked_up' => 'Shipment Picked Up',
            'tracking_out_for_delivery' => 'Out for Delivery',
            'tracking_delivered' => 'Shipment Delivered',
            'payment_paid' => 'Payment Successful',
            'payment_failed' => 'Payment Failed',
            'payment_cancelled' => 'Payment Cancelled',
            'vendor_approved' => 'Shipment Approved',
            'vendor_rejected' => 'Shipment Rejected',
            default => 'Shipment Update',
        };
    }

    private function statusSummary(string $eventType): string
    {
        return match ($eventType) {
            'shipment_placed' => 'Your shipment request has been received and is now in our processing queue.',
            'booking_confirmed' => 'Your booking has been confirmed by the courier team.',
            'booking_cancelled' => 'This booking has been cancelled. Please contact support if you need help.',
            'tracking_picked_up' => 'The package has been picked up and is moving through the courier network.',
            'tracking_out_for_delivery' => 'Your shipment is out for delivery and should arrive soon.',
            'tracking_delivered' => 'Delivery has been completed successfully.',
            'payment_paid' => 'Your payment has been confirmed.',
            'payment_failed' => 'We could not complete your payment. You can retry from your shipment page.',
            'payment_cancelled' => 'Your payment was cancelled. You can retry from your shipment page.',
            'vendor_approved' => 'Good news — the courier vendor approved your shipment. You can now proceed to payment.',
            'vendor_rejected' => 'The courier vendor was unable to accept this shipment. Please check your shipment page for details, or contact support.',
            default => 'Your courier shipment has a new update.',
        };
    }
}
