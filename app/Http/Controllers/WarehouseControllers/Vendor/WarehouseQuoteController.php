<?php

namespace App\Http\Controllers\WarehouseControllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Warehouse\WarehouseQuoteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WarehouseQuoteController extends Controller
{
    /**
     * Quote requests for the authenticated vendor's warehouses.
     */
    public function index(Request $request)
    {
        $quotes = WarehouseQuoteRequest::query()
            ->with('warehouseUnit:id,name,user_id,monthly_rate,rate_type')
            ->whereHas('warehouseUnit', fn ($q) => $q->where('user_id', Auth::id()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'quoted' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WarehouseQuoteRequest $quote) => $this->transform($quote))
            ->values();

        return response()->json([
            'success' => true,
            'data' => $quotes,
            'counts' => [
                'pending' => $quotes->where('status', WarehouseQuoteRequest::STATUS_PENDING)->count(),
                'quoted' => $quotes->where('status', WarehouseQuoteRequest::STATUS_QUOTED)->count(),
            ],
        ]);
    }

    /**
     * Post the vendor's final charges for a request. Totals are always
     * computed here, never trusted from the client.
     */
    public function respond(Request $request, int $quoteId)
    {
        $validated = $request->validate([
            'monthly_rate' => ['required', 'numeric', 'min:0'],
            'duration_months' => ['required', 'integer', 'min:1', 'max:120'],
            'security_deposit' => ['nullable', 'numeric', 'min:0'],
            'setup_fee' => ['nullable', 'numeric', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'other_charges' => ['nullable', 'array', 'max:20'],
            'other_charges.*.label' => ['required_with:other_charges', 'string', 'max:120'],
            'other_charges.*.amount' => ['required_with:other_charges', 'numeric', 'min:0'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:today'],
            'vendor_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $quote = $this->findOwnedQuote($quoteId);

        if (!$quote) {
            return response()->json(['success' => false, 'message' => 'Quote request not found.'], 404);
        }

        if ($quote->status === WarehouseQuoteRequest::STATUS_DECLINED) {
            return response()->json(['success' => false, 'message' => 'This request was declined.'], 422);
        }

        $monthly = round((float) $validated['monthly_rate'], 2);
        $months = (int) $validated['duration_months'];
        $deposit = round((float) ($validated['security_deposit'] ?? 0), 2);
        $setup = round((float) ($validated['setup_fee'] ?? 0), 2);
        $taxRate = (float) ($validated['tax_rate'] ?? 0);
        $others = collect($validated['other_charges'] ?? [])
            ->map(fn ($row) => [
                'label' => trim((string) $row['label']),
                'amount' => round((float) $row['amount'], 2),
            ])
            ->values();

        $rentTotal = round($monthly * $months, 2);
        $otherTotal = round((float) $others->sum('amount'), 2);
        $taxAmount = round(($rentTotal + $otherTotal) * ($taxRate / 100), 2);
        $total = round($rentTotal + $otherTotal + $taxAmount + $deposit + $setup, 2);

        DB::transaction(function () use ($quote, $validated, $monthly, $months, $deposit, $setup, $taxRate, $others, $rentTotal, $taxAmount, $total) {
            $quote->update([
                'status' => WarehouseQuoteRequest::STATUS_QUOTED,
                'vendor_charges' => [
                    'monthly_rate' => $monthly,
                    'duration_months' => $months,
                    'rent_total' => $rentTotal,
                    'security_deposit' => $deposit,
                    'setup_fee' => $setup,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'other_charges' => $others->all(),
                    'initial_payment' => round($monthly + $deposit + $setup, 2),
                ],
                'quoted_total' => $total,
                'vendor_notes' => $validated['vendor_notes'] ?? null,
                'quoted_at' => now(),
                'valid_until' => $validated['valid_until'] ?? now()->addDays(7)->toDateString(),
            ]);

            Notification::create([
                'user_id' => $quote->user_id,
                'type' => 'warehouse_quote_response',
                'data' => [
                    'title' => 'Warehouse Quote Received',
                    'message' => "Your quote for {$quote->warehouseUnit?->name} (Ref: {$quote->reference}) is ready: LKR " . number_format($total, 2) . ' total.',
                    'unit_name' => $quote->warehouseUnit?->name,
                    'quote_reference' => $quote->reference,
                    'quoted_total' => $total,
                ],
                'booking_id' => null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Charges posted. The customer has been notified.',
            'data' => $this->transform($quote->fresh('warehouseUnit')),
        ]);
    }

    public function decline(Request $request, int $quoteId)
    {
        $validated = $request->validate([
            'vendor_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $quote = $this->findOwnedQuote($quoteId);

        if (!$quote) {
            return response()->json(['success' => false, 'message' => 'Quote request not found.'], 404);
        }

        if ($quote->status !== WarehouseQuoteRequest::STATUS_PENDING) {
            return response()->json(['success' => false, 'message' => 'Only pending requests can be declined.'], 422);
        }

        $quote->update([
            'status' => WarehouseQuoteRequest::STATUS_DECLINED,
            'vendor_notes' => $validated['vendor_notes'] ?? null,
        ]);

        Notification::create([
            'user_id' => $quote->user_id,
            'type' => 'warehouse_quote_response',
            'data' => [
                'title' => 'Warehouse Quote Declined',
                'message' => "The owner of {$quote->warehouseUnit?->name} could not provide a quote for request {$quote->reference}.",
                'unit_name' => $quote->warehouseUnit?->name,
                'quote_reference' => $quote->reference,
            ],
            'booking_id' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Request declined.',
            'data' => $this->transform($quote->fresh('warehouseUnit')),
        ]);
    }

    private function findOwnedQuote(int $quoteId): ?WarehouseQuoteRequest
    {
        return WarehouseQuoteRequest::query()
            ->with('warehouseUnit:id,name,user_id,monthly_rate,rate_type')
            ->whereKey($quoteId)
            ->whereHas('warehouseUnit', fn ($q) => $q->where('user_id', Auth::id()))
            ->first();
    }

    private function transform(WarehouseQuoteRequest $quote): array
    {
        return [
            'id' => $quote->id,
            'reference' => $quote->reference,
            'status' => $quote->status,
            'warehouseName' => $quote->warehouseUnit?->name,
            'baseMonthlyRate' => $quote->warehouseUnit?->monthly_rate !== null ? (float) $quote->warehouseUnit->monthly_rate : null,
            'customerName' => $quote->customer_name,
            'customerEmail' => $quote->customer_email,
            'customerPhone' => $quote->customer_phone,
            'customerNotes' => $quote->customer_notes,
            'requestDetails' => $quote->request_details ?? [],
            'estimatedTotal' => $quote->estimated_total !== null ? (float) $quote->estimated_total : null,
            'vendorCharges' => $quote->vendor_charges,
            'quotedTotal' => $quote->quoted_total !== null ? (float) $quote->quoted_total : null,
            'vendorNotes' => $quote->vendor_notes,
            'quotedAt' => optional($quote->quoted_at)->toDateTimeString(),
            'validUntil' => optional($quote->valid_until)->toDateString(),
            'createdAt' => optional($quote->created_at)->toDateTimeString(),
        ];
    }
}
