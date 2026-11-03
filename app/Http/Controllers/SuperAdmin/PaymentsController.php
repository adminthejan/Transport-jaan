<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Courier\CourierCodSettlementBatch;
use App\Models\Courier\CourierCodSettlementLine;
use App\Models\Courier\CourierShipmentPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PaymentsController extends Controller
{
    /**
     * Display the payments page with all payment types.
     */
    public function index()
    {
        // Fetch booking payments
        $bookingPayments = DB::table('booking_payments')
            ->select('id', 'method', 'option', 'amount_paid', 'status', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        // Fetch air vehicle payments
        $airVehiclePayments = DB::table('air_vehicle_booking_payments')
            ->select('id', 'method', 'option', 'amount_paid', 'status', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        // Fetch sea vehicle payments
        $seaVehiclePayments = DB::table('sea_vehicle_booking_payments')
            ->select('id', 'method', 'option', 'amount_paid', 'status', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        // Fetch warehouse booking payments
        $warehousePayments = DB::table('warehouse_bookings')
            ->select('id', 'payment_method as method', 'payment_option as option', 'final_amount as amount_paid', 'payment_status as status', 'payment_date as created_at', 'booking_reference', 'company_name')
            ->whereNotNull('payment_status')
            ->orderBy('payment_date', 'desc')
            ->get();

        $courierCardPayments = CourierShipmentPayment::query()
            ->with(['shipment:id,reference'])
            ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
            ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (CourierShipmentPayment $payment) {
                return [
                    'id' => (int) $payment->id,
                    'shipment_reference' => (string) ($payment->shipment?->reference ?? 'N/A'),
                    'method' => (string) ($payment->payment_method ?? CourierShipmentPayment::PAYMENT_METHOD_CARD),
                    'option' => (string) ($payment->provider ?? CourierShipmentPayment::PROVIDER_PAYMENTSLK),
                    'amount_paid' => (float) $payment->amount,
                    'currency_code' => strtoupper((string) ($payment->currency_code ?: 'LKR')),
                    'status' => (string) ($payment->status ?? CourierShipmentPayment::STATUS_PENDING),
                    'gateway_order_id' => (string) ($payment->gateway_order_id ?? ''),
                    'gateway_payment_id' => (string) ($payment->gateway_payment_id ?? ''),
                    'tx_reference' => (string) ($payment->tx_reference ?? ''),
                    'created_at' => optional($payment->created_at)->format('Y-m-d H:i:s'),
                    'initiated_at' => optional($payment->initiated_at)->format('Y-m-d H:i:s'),
                    'paid_at' => optional($payment->paid_at)->format('Y-m-d H:i:s'),
                    'failed_at' => optional($payment->failed_at)->format('Y-m-d H:i:s'),
                    'last_notified_at' => optional($payment->last_notified_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values();

        $codPayoutReadyAmount = (float) CourierCodSettlementLine::query()
            ->join('courier_cod_settlement_batches', 'courier_cod_settlement_batches.id', '=', 'courier_cod_settlement_lines.courier_cod_settlement_batch_id')
            ->where('courier_cod_settlement_lines.line_status', CourierCodSettlementLine::STATUS_PAYOUT_READY)
            ->whereIn('courier_cod_settlement_batches.status', [
                CourierCodSettlementBatch::STATUS_RECONCILING,
                CourierCodSettlementBatch::STATUS_READY_FOR_PAYOUT,
            ])
            ->sum('courier_cod_settlement_lines.payout_amount');

        $codSettlementSummary = [
            'openBatchCount' => CourierCodSettlementBatch::query()
                ->whereIn('status', [CourierCodSettlementBatch::STATUS_RECONCILING, CourierCodSettlementBatch::STATUS_READY_FOR_PAYOUT])
                ->count(),
            'readyForPayoutBatchCount' => CourierCodSettlementBatch::query()
                ->where('status', CourierCodSettlementBatch::STATUS_READY_FOR_PAYOUT)
                ->count(),
            'openDisputeCount' => CourierCodSettlementLine::query()
                ->where('dispute_status', CourierCodSettlementLine::DISPUTE_STATUS_OPEN)
                ->count(),
            'payoutReadyAmount' => round($codPayoutReadyAmount, 2),
            'route' => route('superadmin.settings.cod-settlement.index'),
        ];

        $recentCodSettlementBatches = CourierCodSettlementBatch::query()
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(function (CourierCodSettlementBatch $batch) {
                return [
                    'id' => (int) $batch->id,
                    'reference' => (string) $batch->batch_reference,
                    'status' => (string) $batch->status,
                    'statusLabel' => $batch->statusLabel(),
                    'reconciliationStatusLabel' => $batch->reconciliationStatusLabel(),
                    'netPayoutAmount' => (float) $batch->net_payout_amount,
                    'currencyCode' => (string) $batch->currency_code,
                    'generatedAt' => optional($batch->generated_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values();

        return Inertia::render('Web/home/SuperAdmin/Payments', [
            'bookingPayments' => $bookingPayments->toArray(),
            'airVehiclePayments' => $airVehiclePayments->toArray(),
            'seaVehiclePayments' => $seaVehiclePayments->toArray(),
            'warehousePayments' => $warehousePayments->toArray(),
            'courierCardPayments' => $courierCardPayments,
            'codSettlementSummary' => $codSettlementSummary,
            'recentCodSettlementBatches' => $recentCodSettlementBatches,
        ]);
    }

    /**
     * Get payment statistics for dashboard or API.
     */
    public function getPaymentStats()
    {
        $stats = [
            'booking_payments' => [
                'total' => DB::table('booking_payments')->sum('amount_paid'),
                'count' => DB::table('booking_payments')->count(),
                'paid' => DB::table('booking_payments')->where('status', 'paid')->count(),
                'pending' => DB::table('booking_payments')->where('status', 'pending')->count(),
            ],
            'air_vehicle_payments' => [
                'total' => DB::table('air_vehicle_booking_payments')->sum('amount_paid'),
                'count' => DB::table('air_vehicle_booking_payments')->count(),
                'paid' => DB::table('air_vehicle_booking_payments')->where('status', 'paid')->count(),
                'pending' => DB::table('air_vehicle_booking_payments')->where('status', 'pending')->count(),
            ],
            'sea_vehicle_payments' => [
                'total' => DB::table('sea_vehicle_booking_payments')->sum('amount_paid'),
                'count' => DB::table('sea_vehicle_booking_payments')->count(),
                'paid' => DB::table('sea_vehicle_booking_payments')->where('status', 'paid')->count(),
                'pending' => DB::table('sea_vehicle_booking_payments')->where('status', 'pending')->count(),
            ],
            'courier_card_payments' => [
                'total' => CourierShipmentPayment::query()
                    ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
                    ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                    ->sum('amount'),
                'count' => CourierShipmentPayment::query()
                    ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
                    ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                    ->count(),
                'paid' => CourierShipmentPayment::query()
                    ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
                    ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                    ->where('status', CourierShipmentPayment::STATUS_PAID)
                    ->count(),
                'pending' => CourierShipmentPayment::query()
                    ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
                    ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                    ->where('status', CourierShipmentPayment::STATUS_PENDING)
                    ->count(),
                'failed' => CourierShipmentPayment::query()
                    ->whereIn('provider', CourierShipmentPayment::CARD_PROVIDERS)
                    ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
                    ->whereIn('status', [
                        CourierShipmentPayment::STATUS_FAILED,
                        CourierShipmentPayment::STATUS_CANCELLED,
                        CourierShipmentPayment::STATUS_EXPIRED,
                    ])
                    ->count(),
            ],
        ];

        return response()->json($stats);
    }
}