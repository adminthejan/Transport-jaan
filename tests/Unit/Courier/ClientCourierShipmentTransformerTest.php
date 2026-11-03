<?php

namespace Tests\Unit\Courier;

use App\Models\Courier\CourierAddress;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierPackage;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\CourierTrackingEvent;
use App\Models\User;
use App\Support\Courier\ClientCourierShipmentTransformer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ClientCourierShipmentTransformerTest extends TestCase
{
    public function test_for_unified_booking_uses_courier_address_schema(): void
    {
        $shipment = $this->makeShipmentFixture();
        $transformer = new ClientCourierShipmentTransformer();

        $result = $transformer->forUnifiedBooking($shipment);

        $this->assertSame('courier', $result['booking_type']);
        $this->assertSame('courier', $result['type']);
        $this->assertSame('CR-UNIT-001', $result['reference_number']);
        $this->assertSame('Colombo, Western, LK', $result['pickup_location']);
        $this->assertSame('Kandy, Central, LK', $result['dropoff_location']);
        $this->assertStringContainsString('123 Sender Lane', $result['pickup_address']);
        $this->assertStringContainsString('456 Recipient Road', $result['delivery_address']);
        $this->assertSame('Sender Person', $result['sender_name']);
        $this->assertSame('Recipient Person', $result['recipient_name']);
        $this->assertSame(2, $result['package_count']);
        $this->assertEqualsWithDelta(10.75, $result['amount'], 0.01);
        $this->assertEqualsWithDelta(7.0, $result['weight'], 0.01);
        $this->assertSame('parcel, document', strtolower((string) $result['package_type']));
        $this->assertTrue($result['cod_enabled']);
        $this->assertEqualsWithDelta(350.0, (float) $result['cod_amount'], 0.01);
        $this->assertSame('cash', $result['cod_payment_method']);
    }

    public function test_for_detail_returns_nested_addresses_with_instructions(): void
    {
        $shipment = $this->makeShipmentFixture();
        $transformer = new ClientCourierShipmentTransformer();

        $result = $transformer->forDetail($shipment);

        $this->assertSame('CR-UNIT-001', $result['code']);
        $this->assertSame('Sender Person', $result['sender']['name']);
        $this->assertSame('Recipient Person', $result['recipient']['name']);
        $this->assertSame('123 Sender Lane', $result['sender']['address']['line1']);
        $this->assertSame('LK', $result['recipient']['address']['country']);
        $this->assertSame('Ring bell', $result['sender']['address']['instructions']);
        $this->assertCount(2, $result['packages']);
        $this->assertCount(1, $result['trackingEvents']);
        $this->assertSame('in_transit', $result['trackingEvents'][0]['status']);
        $this->assertTrue($result['codEnabled']);
        $this->assertEqualsWithDelta(350.0, (float) $result['codAmount'], 0.01);
        $this->assertSame('cash', $result['codPaymentMethod']);
        $this->assertIsArray($result['codPolicySnapshot']);
        $this->assertTrue($result['codPolicySnapshot']['allowCodForDomestic']);
    }

    public function test_for_dashboard_returns_summary_card_fields(): void
    {
        $shipment = $this->makeShipmentFixture();
        $transformer = new ClientCourierShipmentTransformer();

        $result = $transformer->forDashboard($shipment);

        $this->assertSame('CR-UNIT-001', $result['code']);
        $this->assertSame('Colombo, Western, LK', $result['from']['full']);
        $this->assertSame('Kandy, Central, LK', $result['to']['full']);
        $this->assertCount(2, $result['packages']);
        $this->assertSame('parcel, document', strtolower((string) $result['packageTypes']));
        $this->assertEqualsWithDelta(10.75, $result['totalCost'], 0.01);
        $this->assertEqualsWithDelta(7.0, $result['totalWeight'], 0.01);
        $this->assertSame('in_transit', $result['latestTracking']['status']);
        $this->assertTrue($result['codEnabled']);
        $this->assertEqualsWithDelta(350.0, (float) $result['codAmount'], 0.01);
        $this->assertSame('cash', $result['codPaymentMethod']);
    }

    public function test_payment_contract_fields_are_exposed_in_dashboard_detail_and_unified_payloads(): void
    {
        $shipment = $this->makeShipmentFixture();
        $transformer = new ClientCourierShipmentTransformer();

        $dashboard = $transformer->forDashboard($shipment);
        $detail = $transformer->forDetail($shipment);
        $unified = $transformer->forUnifiedBooking($shipment);

        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, $dashboard['paymentStatus']);
        $this->assertSame(CourierShipmentPayment::PAYMENT_METHOD_CARD, $dashboard['paymentMethod']);
        $this->assertSame(CourierShipmentPayment::PROVIDER_PAYMENTSLK, $dashboard['paymentProvider']);
        $this->assertSame('TX-UNIT-123', $dashboard['paymentReference']);
        $this->assertSame('PH-ORDER-UNIT', $dashboard['payment_gateway_order_id']);
        $this->assertSame('PH-PAY-UNIT', $dashboard['payment_gateway_payment_id']);
        $this->assertSame('TX-UNIT-123', $dashboard['payment_tx_reference']);
        $this->assertTrue($dashboard['requiresCardPayment']);
        $this->assertTrue($dashboard['requires_card_payment']);

        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, $detail['payment_status']);
        $this->assertSame(CourierShipmentPayment::PAYMENT_METHOD_CARD, $detail['payment_method']);
        $this->assertSame('TX-UNIT-123', $detail['payment_reference']);
        $this->assertSame('PH-ORDER-UNIT', $detail['payment_gateway_order_id']);
        $this->assertSame('PH-PAY-UNIT', $detail['payment_gateway_payment_id']);
        $this->assertSame('TX-UNIT-123', $detail['payment_tx_reference']);

        $this->assertSame(CourierShipmentPayment::STATUS_PENDING, $unified['payment_status']);
        $this->assertSame(CourierShipmentPayment::PAYMENT_METHOD_CARD, $unified['payment_method']);
        $this->assertSame('TX-UNIT-123', $unified['payment_reference']);
        $this->assertSame('Pending', $unified['paymentStatus']);
        $this->assertSame(CourierShipmentPayment::PAYMENT_METHOD_CARD, $unified['paymentMethod']);
    }

    private function makeShipmentFixture(): CourierShipment
    {
        $requestedBy = new User();
        $requestedBy->setAttribute('id', 101);
        $requestedBy->name = 'Client User';
        $requestedBy->email = 'client@example.com';
        $requestedBy->phone = '+94-77-100-1000';
        $requestedBy->address = 'Client Address';

        $sender = new CourierContact();
        $sender->name = 'Sender Person';
        $sender->email = 'sender@example.com';
        $sender->phone = '+94-77-200-2000';
        $sender->company_name = 'Sender Co';

        $recipient = new CourierContact();
        $recipient->name = 'Recipient Person';
        $recipient->email = 'recipient@example.com';
        $recipient->phone = '+94-77-300-3000';
        $recipient->company_name = 'Recipient Co';

        $senderAddress = new CourierAddress();
        $senderAddress->line1 = '123 Sender Lane';
        $senderAddress->line2 = 'Level 1';
        $senderAddress->city = 'Colombo';
        $senderAddress->state = 'Western';
        $senderAddress->postal_code = '10000';
        $senderAddress->country = 'LK';
        $senderAddress->instructions = 'Ring bell';

        $recipientAddress = new CourierAddress();
        $recipientAddress->line1 = '456 Recipient Road';
        $recipientAddress->line2 = 'Floor 3';
        $recipientAddress->city = 'Kandy';
        $recipientAddress->state = 'Central';
        $recipientAddress->postal_code = '20000';
        $recipientAddress->country = 'LK';

        $packageOne = new CourierPackage();
        $packageOne->setAttribute('id', 1);
        $packageOne->label = 'Sample Box';
        $packageOne->package_type = 'parcel';
        $packageOne->courier_provider_name = 'DHL Express';
        $packageOne->courier_provider_key = 'dhl';
        $packageOne->service_tier_label = 'Express';
        $packageOne->service_tier_key = 'express';
        $packageOne->service_eta = '1-2 days';
        $packageOne->setAttribute('weight_kg', 5.50);
        $packageOne->quantity = 1;
        $packageOne->setAttribute('quoted_price_usd', 8.25);
        $packageOne->setAttribute('length_cm', 25.0);
        $packageOne->setAttribute('width_cm', 20.0);
        $packageOne->setAttribute('height_cm', 10.0);
        $packageOne->setAttribute('declared_value', 200.00);
        $packageOne->description = 'Fragile items';

        $packageTwo = new CourierPackage();
        $packageTwo->setAttribute('id', 2);
        $packageTwo->label = 'Documents';
        $packageTwo->package_type = 'document';
        $packageTwo->courier_provider_name = 'DHL Express';
        $packageTwo->courier_provider_key = 'dhl';
        $packageTwo->service_tier_label = 'Express';
        $packageTwo->service_tier_key = 'express';
        $packageTwo->service_eta = '1-2 days';
        $packageTwo->setAttribute('weight_kg', 1.50);
        $packageTwo->quantity = 1;
        $packageTwo->setAttribute('quoted_price_usd', 2.50);

        $trackingEvent = new CourierTrackingEvent();
        $trackingEvent->setAttribute('id', 501);
        $trackingEvent->status = 'in_transit';
        $trackingEvent->location = 'Distribution Center';
        $trackingEvent->description = 'Shipment in transit';
        $trackingEvent->recorded_at = Carbon::parse('2026-03-24 10:30:00');

        $latestPayment = new CourierShipmentPayment();
        $latestPayment->setAttribute('id', 701);
        $latestPayment->status = CourierShipmentPayment::STATUS_PENDING;
        $latestPayment->payment_method = CourierShipmentPayment::PAYMENT_METHOD_CARD;
        $latestPayment->provider = CourierShipmentPayment::PROVIDER_PAYMENTSLK;
        $latestPayment->is_required = true;
        $latestPayment->gateway_order_id = 'PH-ORDER-UNIT';
        $latestPayment->gateway_payment_id = 'PH-PAY-UNIT';
        $latestPayment->tx_reference = 'TX-UNIT-123';
        $latestPayment->initiated_at = Carbon::parse('2026-03-24 09:35:00');
        $latestPayment->last_notified_at = Carbon::parse('2026-03-24 09:36:00');

        $shipment = new CourierShipment();
        $shipment->setAttribute('id', 9001);
        $shipment->reference = 'CR-UNIT-001';
        $shipment->status = 'confirmed';
        $shipment->service_level = 'express';
        $shipment->setAttribute('pickup_date', Carbon::parse('2026-03-25'));
        $shipment->pickup_window_start = Carbon::parse('2026-03-25 09:00:00');
        $shipment->pickup_window_end = Carbon::parse('2026-03-25 12:00:00');
        $shipment->insurance_required = true;
        $shipment->setAttribute('declared_value', 500.00);
        $shipment->is_cod_enabled = true;
        $shipment->setAttribute('cod_requested_amount', 350.00);
        $shipment->cod_requested_method = 'cash';
        $shipment->cod_policy_snapshot = [
            'allowCodForDomestic' => true,
            'allowCodForInternational' => false,
        ];
        $shipment->currency_code = 'USD';
        $shipment->setAttribute('estimated_cost', 10.75);
        $shipment->actual_cost = null;
        $shipment->delivery_notes = 'Leave with front desk';
        $shipment->internal_notes = 'Priority lane';
        $shipment->created_at = Carbon::parse('2026-03-24 09:00:00');
        $shipment->updated_at = Carbon::parse('2026-03-24 09:30:00');

        $shipment->setRelation('requestedBy', $requestedBy);
        $shipment->setRelation('sender', $sender);
        $shipment->setRelation('recipient', $recipient);
        $shipment->setRelation('senderAddress', $senderAddress);
        $shipment->setRelation('recipientAddress', $recipientAddress);
        $shipment->setRelation('packages', new Collection([$packageOne, $packageTwo]));
        $shipment->setRelation('trackingEvents', new Collection([$trackingEvent]));
        $shipment->setRelation('latestPayment', $latestPayment);

        return $shipment;
    }
}
