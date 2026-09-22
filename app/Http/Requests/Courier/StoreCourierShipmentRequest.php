<?php

namespace App\Http\Requests\Courier;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourierShipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sender.name' => ['required', 'string', 'max:120'],
            'sender.email' => ['nullable', 'email', 'max:150'],
            'sender.phone' => ['nullable', 'string', 'max:40'],
            'sender.company' => ['nullable', 'string', 'max:120'],
            'sender.saveToFavorites' => ['nullable', 'boolean'],
            'sender.address.line1' => ['required', 'string', 'max:180'],
            'sender.address.line2' => ['nullable', 'string', 'max:180'],
            'sender.address.city' => ['required', 'string', 'max:120'],
            'sender.address.state' => ['nullable', 'string', 'max:120'],
            'sender.address.postalCode' => ['nullable', 'string', 'max:30'],
            'sender.address.country' => ['required', 'string', 'size:2'],
            'sender.address.instructions' => ['nullable', 'string', 'max:500'],

            'recipient.name' => ['required', 'string', 'max:120'],
            'recipient.email' => ['nullable', 'email', 'max:150'],
            'recipient.phone' => ['nullable', 'string', 'max:40'],
            'recipient.company' => ['nullable', 'string', 'max:120'],
            'recipient.saveToFavorites' => ['nullable', 'boolean'],
            'recipient.address.line1' => ['required', 'string', 'max:180'],
            'recipient.address.line2' => ['nullable', 'string', 'max:180'],
            'recipient.address.city' => ['required', 'string', 'max:120'],
            'recipient.address.state' => ['nullable', 'string', 'max:120'],
            'recipient.address.postalCode' => ['nullable', 'string', 'max:30'],
            'recipient.address.country' => ['required', 'string', 'size:2'],
            'recipient.address.instructions' => ['nullable', 'string', 'max:500'],

            'shipment.pickupDate' => ['nullable', 'date', 'after_or_equal:today'],
            'shipment.pickupWindowStart' => ['nullable', 'date_format:H:i'],
            'shipment.pickupWindowEnd' => ['nullable', 'date_format:H:i'],
            'shipment.serviceLevel' => ['nullable', 'string', 'max:50'],
            'shipment.currency' => ['nullable', 'string', 'size:3'],
            'shipment.insurance' => ['nullable', 'boolean'],
            'shipment.deliveryNotes' => ['nullable', 'string', 'max:1000'],
            'shipment.estimatedValue' => [
                \Illuminate\Validation\Rule::requiredIf(function () {
                    return request()->input('shipment.insurance') || request()->input('shipment.codEnabled');
                }),
                'nullable',
                'numeric',
                'min:0'
            ],
            'shipment.paymentOptions' => ['nullable', 'array'],
            'shipment.paymentOptions.all' => ['nullable', 'boolean'],
            'shipment.paymentOptions.cod' => ['nullable', 'boolean'],
            'shipment.paymentOptions.card' => ['nullable', 'boolean'],
            'shipment.requiresCardPayment' => ['nullable', 'boolean'],
            'shipment.codEnabled' => ['nullable', 'boolean'],
            'shipment.codPaymentMethod' => ['nullable', 'string', 'in:cash,card,check,bank_transfer'],
            'shipment.distanceKm' => ['nullable', 'numeric', 'min:0.1'],
            'shipment.shipmentType' => ['nullable', 'string', 'max:60'],
            'shipment.shipmentTypeDescription' => ['nullable', 'string', 'max:200'],
            'shipment.internationalDimensions' => ['nullable', 'array'],
            'shipment.internationalDimensions.unitType' => ['nullable', 'string', 'max:40'],
            'shipment.internationalDimensions.unitCount' => ['nullable', 'integer', 'min:1'],
            'shipment.internationalDimensions.routeClass' => ['nullable', 'string', 'max:50'],
            'shipment.internationalDimensions.handlingClass' => ['nullable', 'string', 'max:50'],
            'shipment.internationalDimensions.w2wMode' => ['nullable', 'string', 'max:40'],

            'packages' => ['required', 'array', 'min:1'],
            'packages.*.label' => ['nullable', 'string', 'max:120'],
            'packages.*.packageType' => ['nullable', 'string', 'max:50'],
            'packages.*.courierProvider' => ['nullable', 'string', 'max:80'],
            'packages.*.serviceLevel' => ['nullable', 'string', 'max:80'],
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
            'packages.*.weightKg' => ['required', 'numeric', 'min:0.1'],
            'packages.*.lengthCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.widthCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.heightCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.declaredValue' => ['nullable', 'numeric', 'min:0'],
            'packages.*.description' => ['nullable', 'string', 'max:500'],
            'packages.*.hsCode' => ['nullable', 'string', 'max:20'],

            'reviewContext' => ['nullable', 'array'],
            'reviewContext.displayCurrency' => ['nullable', 'string', 'max:4'],
            'reviewContext.totalPriceUSD' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.discountPercent' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.discountAmountUSD' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.accountUserId' => ['nullable', 'integer', 'min:1'],
            'reviewContext.selectedQuotes' => ['nullable', 'array'],
            'reviewContext.selectedQuotes.*.packageIndex' => ['nullable', 'integer', 'min:0'],
            'reviewContext.selectedQuotes.*.providerId' => ['nullable', 'string', 'max:80'],
            'reviewContext.selectedQuotes.*.providerName' => ['nullable', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.serviceLevel' => ['nullable', 'string', 'max:80'],
            'reviewContext.selectedQuotes.*.serviceLabel' => ['nullable', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.eta' => ['nullable', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.description' => ['nullable', 'string'],
            'reviewContext.selectedQuotes.*.priceUSD' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.selectedQuotes.*.weight' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.selectedQuotes.*.billableWeight' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function attributes(): array
    {
        return [
            'sender.address.line1' => 'sender address line 1',
            'recipient.address.line1' => 'recipient address line 1',
            'shipment.pickupDate' => 'pickup date',
            'shipment.codEnabled' => 'cash on delivery option',
            'shipment.codPaymentMethod' => 'cash on delivery method',
        ];
    }
}
