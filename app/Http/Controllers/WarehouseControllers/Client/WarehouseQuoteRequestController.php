<?php

namespace App\Http\Controllers\WarehouseControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Warehouse\WarehouseQuoteRequest;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class WarehouseQuoteRequestController extends Controller
{
    /**
     * Customer asks the warehouse owner for a quote. The owner discusses the
     * requirement with the customer and then posts their final charges (see
     * Vendor\WarehouseQuoteController::respond()).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'integer', 'exists:warehouse_units,id'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:40'],
            'customer_notes' => ['nullable', 'string', 'max:2000'],
            'required_space' => ['nullable', 'numeric', 'min:0'],
            'rate_type' => ['nullable', 'string', 'in:per_sqft,per_cbm,flat_rate'],
            'move_in_date' => ['nullable', 'date'],
            'duration_months' => ['nullable', 'integer', 'min:1', 'max:120'],
            'services' => ['nullable', 'array'],
            'services.*' => ['string', 'max:60'],
            'storage_temperature_c' => ['nullable', 'numeric', 'between:-60,60'],
            'estimated_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        $warehouse = WarehouseUnit::query()
            ->where('id', $validated['warehouse_id'])
            ->active()
            ->approved()
            ->first();

        if (!$warehouse) {
            return response()->json([
                'success' => false,
                'message' => 'This warehouse is no longer available.',
            ], 422);
        }

        $quote = WarehouseQuoteRequest::create([
            'user_id' => Auth::id(),
            'warehouse_unit_id' => $warehouse->id,
            'status' => WarehouseQuoteRequest::STATUS_PENDING,
            'customer_name' => $validated['customer_name'],
            'customer_email' => $validated['customer_email'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'customer_notes' => $validated['customer_notes'] ?? null,
            'estimated_total' => $validated['estimated_total'] ?? null,
            'request_details' => [
                'required_space' => $validated['required_space'] ?? null,
                'rate_type' => $validated['rate_type'] ?? ($warehouse->rate_type ?? 'per_sqft'),
                'move_in_date' => $validated['move_in_date'] ?? null,
                'duration_months' => $validated['duration_months'] ?? null,
                'services' => $validated['services'] ?? [],
                'storage_temperature_c' => $validated['storage_temperature_c'] ?? null,
            ],
        ]);

        try {
            Notification::create([
                'user_id' => $warehouse->user_id,
                'type' => 'warehouse_quote_request',
                'data' => [
                    'title' => 'New Warehouse Quote Request',
                    'message' => "{$validated['customer_name']} requested a quote for {$warehouse->name} (Ref: {$quote->reference}). Post your charges once you have agreed the details.",
                    'unit_name' => $warehouse->name,
                    'quote_reference' => $quote->reference,
                    'quote_request_id' => $quote->id,
                ],
                'booking_id' => null,
            ]);
        } catch (\Throwable $exception) {
            // The request itself is saved; a failed notification must not lose it.
            Log::warning('Warehouse quote request notification failed', [
                'quote_id' => $quote->id,
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Quote requested. The warehouse owner will contact you and post their charges.',
            'reference' => $quote->reference,
        ]);
    }
}
