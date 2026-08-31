<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Courier Update</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f4f7fb;
            color: #1f2937;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 620px;
            margin: 24px auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
        }
        .header {
            background: #0f3f7a;
            color: #ffffff;
            padding: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
        }
        .content {
            padding: 22px;
        }
        .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            margin-top: 14px;
        }
        .row {
            margin: 8px 0;
            font-size: 14px;
        }
        .label {
            display: inline-block;
            min-width: 140px;
            color: #334155;
            font-weight: bold;
        }
        .footer {
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            margin-top: 18px;
            padding-top: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $eventLabel }}</h1>
        </div>

        <div class="content">
            <p>{{ $statusSummary }}</p>

            <div class="card">
                <div class="row"><span class="label">Reference:</span> {{ $shipment->reference }}</div>
                @if($dispatch->event_type === 'shipment_placed' && $shipment->tracking_pin)
                    <div class="row"><span class="label">Tracking PIN:</span> {{ $shipment->tracking_pin }}</div>
                @endif
                <div class="row"><span class="label">Current Status:</span> {{ ucfirst(str_replace('_', ' ', (string) $shipment->status)) }}</div>
                <div class="row"><span class="label">Service Level:</span> {{ ucfirst((string) ($shipment->service_level ?? '-')) }}</div>
                <div class="row"><span class="label">Sender:</span> {{ (string) ($shipment->sender?->name ?? '-') }}</div>
                <div class="row"><span class="label">Recipient:</span> {{ (string) ($shipment->recipient?->name ?? '-') }}</div>
            </div>

            @if($trackingEvent)
                <div class="card">
                    <div class="row"><span class="label">Tracking Event:</span> {{ ucfirst(str_replace('_', ' ', (string) ($trackingEvent->status ?? '-'))) }}</div>
                    <div class="row"><span class="label">Location:</span> {{ (string) ($trackingEvent->location ?? '-') }}</div>
                    <div class="row"><span class="label">Event Time:</span> {{ optional($trackingEvent->recorded_at)->format('Y-m-d H:i') ?? '-' }}</div>
                    <div class="row"><span class="label">Description:</span> {{ (string) ($trackingEvent->description ?? '-') }}</div>
                </div>
            @endif

            @if($payment)
                <div class="card">
                    <div class="row"><span class="label">Payment Status:</span> {{ ucfirst((string) ($payment->status ?? '-')) }}</div>
                    <div class="row"><span class="label">Amount:</span> {{ number_format((float) ($payment->amount ?? 0), 2) }} {{ (string) ($payment->currency_code ?? '') }}</div>
                    <div class="row"><span class="label">Order ID:</span> {{ (string) ($payment->gateway_order_id ?? '-') }}</div>
                    <div class="row"><span class="label">Gateway Reference:</span> {{ (string) ($payment->tx_reference ?? '-') }}</div>
                </div>
            @endif

            <div class="footer">
                This is an automated courier notification from {{ config('app.name') }}.
            </div>
        </div>
    </div>
</body>
</html>
