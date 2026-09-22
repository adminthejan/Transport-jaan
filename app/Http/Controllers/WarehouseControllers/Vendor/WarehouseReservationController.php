<?php

namespace App\Http\Controllers\WarehouseControllers\Vendor;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Warehouse\WarehouseBooking;
use App\Models\Warehouse\WarehouseUnit;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class WarehouseReservationController extends Controller
{
    /**
     * Get all warehouse reservations for the authenticated vendor
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Use raw SQL query to fetch warehouse bookings for the authenticated vendor
            // Filter by warehouse units that belong to the vendor
            $reservations = DB::select("
                SELECT 
                    wb.*,
                    u.name as user_name,
                    u.email as user_email,
                    wu.name as warehouse_name,
                    wu.type as warehouse_type,
                    wu.total_area,
                    wu.capacity,
                    wu.capacity_unit
                FROM warehouse_bookings wb
                LEFT JOIN users u ON wb.user_id = u.id
                LEFT JOIN warehouse_units wu ON wb.warehouse_unit_id = wu.id
                WHERE wu.user_id = ?
                ORDER BY wb.created_at DESC
            ", [$user->id]);
            
            return response()->json([
                'success' => true,
                'data' => $reservations,
                'total' => count($reservations)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching warehouse reservations: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching warehouse reservations',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Apply filters to the reservation query
     */
    private function applyFilters($query, Request $request)
    {
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('booking_reference', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('goods_type', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->where('start_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('end_date', '<=', $request->date_to);
        }
    }

    /**
     * Transform reservation data for frontend
     */
    private function transformReservation($reservation)
    {
        $unit = $reservation->warehouseUnit;
        
        return [
            'id' => $reservation->booking_reference,
            'reservationDate' => $reservation->created_at->format('F j, Y'),
            'clientName' => $reservation->company_name ?? 'N/A',
            'contactPerson' => $reservation->contact_person,
            'email' => $reservation->email,
            'phone' => $reservation->phone,
            'warehouseName' => $unit->name ?? 'N/A',
            'warehouseUnit' => 'WH-' . str_pad($reservation->warehouse_unit_id, 3, '0', STR_PAD_LEFT),
            'unitType' => $unit->type ?? 'Standard',
            'unitSize' => $unit->total_area 
                ? number_format($unit->total_area, 2) . ' ' . ($unit->capacity_unit ?? 'sq_ft')
                : 'N/A',
            'purpose' => $reservation->goods_type ?? 'General Storage',
            'specialRequirements' => $this->formatSpecialRequirements($reservation),
            'durationUnit' => 'months',
            'durationValue' => $reservation->duration_months ?? 0,
            'quantity' => $reservation->required_space ?? 'N/A',
            'startDate' => Carbon::parse($reservation->start_date)->format('M j, Y'),
            'endDate' => Carbon::parse($reservation->end_date)->format('M j, Y'),
            'totalPrice' => 'LKR ' . number_format($reservation->final_amount ?? 0, 2),
            'paymentStatus' => ucfirst($reservation->payment_status ?? 'pending'),
            'status' => $reservation->status ?? 'pending',
            'notes' => $reservation->notes ?? $reservation->special_instructions ?? '',
            'goodsDescription' => $reservation->goods_description,
            'estimatedWeight' => $reservation->estimated_weight,
            'accessHours' => $reservation->access_hours,
            'monthlyRate' => $reservation->monthly_rate,
            'securityDeposit' => $reservation->security_deposit,
            'setupFee' => $reservation->setup_fee,
            'taxAmount' => $reservation->tax_amount,
            'paymentMethod' => $reservation->payment_method,
            'insuranceRequired' => $reservation->insurance_required ?? false,
            'termsAccepted' => $reservation->terms_accepted ?? false,
        ];
    }

    /**
     * Get reservation statistics for the vendor dashboard
     */
    public function getStats(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Define time periods
            $now = Carbon::now();
            $currentWeekStart = $now->copy()->startOfWeek();
            $currentWeekEnd = $now->copy()->endOfWeek();
            $lastWeekStart = $now->copy()->subWeek()->startOfWeek();
            $lastWeekEnd = $now->copy()->subWeek()->endOfWeek();
            
            // Base query for vendor's reservations
            $baseQuery = function() use ($user) {
                return WarehouseBooking::query()
                    ->whereHas('warehouseUnit', fn ($q) => $q->where('user_id', $user->id));
            };
            
            // Calculate current week stats using optimized queries
            $stats = [
                'active_reservations' => $baseQuery()
                    ->whereIn('status', ['confirmed', 'active'])
                    ->where('start_date', '<=', $now)
                    ->where('end_date', '>=', $now)
                    ->count(),
                    
                'pending_reservations' => $baseQuery()
                    ->where('status', 'pending')
                    ->count(),
                    
                'expired_reservations' => $baseQuery()
                    ->where('status', 'completed')
                    ->whereBetween('updated_at', [$currentWeekStart, $currentWeekEnd])
                    ->count(),
                    
                'cancelled_reservations' => $baseQuery()
                    ->where('status', 'cancelled')
                    ->whereBetween('updated_at', [$currentWeekStart, $currentWeekEnd])
                    ->count(),
            ];
            
            // Calculate previous week stats for growth comparison
            $previousStats = [
                'previous_active_reservations' => $baseQuery()
                    ->whereIn('status', ['confirmed', 'active'])
                    ->where('start_date', '<=', $lastWeekEnd)
                    ->where('end_date', '>=', $lastWeekStart)
                    ->count(),
                    
                'previous_pending_reservations' => $baseQuery()
                    ->where('status', 'pending')
                    ->where('created_at', '<=', $lastWeekEnd)
                    ->count(),
                    
                'previous_expired_reservations' => $baseQuery()
                    ->where('status', 'completed')
                    ->whereBetween('updated_at', [$lastWeekStart, $lastWeekEnd])
                    ->count(),
                    
                'previous_cancelled_reservations' => $baseQuery()
                    ->where('status', 'cancelled')
                    ->whereBetween('updated_at', [$lastWeekStart, $lastWeekEnd])
                    ->count(),
            ];
            
            return response()->json([
                'success' => true,
                'data' => array_merge($stats, $previousStats)
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching reservation stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching reservation statistics',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get reservation chart data for the authenticated vendor
     */
    public function getChartData(Request $request)
    {
        try {
            $user = Auth::user();
            $period = $request->get('period', 'Last 8 months');
            
            // Determine the date range
            $startDate = $this->getStartDateForPeriod($period);
            $endDate = Carbon::now();
            
            // Fetch aggregated reservation data using a single optimized query
            $reservations = WarehouseBooking::query()
                ->select([
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('COUNT(CASE WHEN status IN ("confirmed", "completed", "active") THEN 1 END) as confirmed'),
                    DB::raw('COUNT(CASE WHEN status = "cancelled" THEN 1 END) as cancelled')
                ])
                ->whereHas('warehouseUnit', fn ($q) => $q->where('user_id', $user->id))
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('year', 'month')
                ->orderBy('year', 'asc')
                ->orderBy('month', 'asc')
                ->get()
                ->keyBy(function($item) {
                    return $item->year . '-' . $item->month;
                });
            
            // Generate complete month range with data
            $chartData = [];
            $current = $startDate->copy();
            
            while ($current <= $endDate) {
                $key = $current->year . '-' . $current->month;
                $monthData = $reservations->get($key);
                
                $chartData[] = [
                    'name' => $current->format('M'),
                    'month' => $current->month,
                    'year' => $current->year,
                    'done' => $monthData ? (int)$monthData->confirmed : 0,
                    'cancelled' => $monthData ? (int)$monthData->cancelled : 0,
                ];
                
                $current->addMonth();
            }
            
            return response()->json([
                'success' => true,
                'data' => $chartData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error fetching reservation chart data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error fetching reservation chart data',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Confirm a pending reservation
     */
    public function confirm(Request $request, $reservationId)
    {
        try {
            $user = Auth::user();
            
            // Find reservation with authorization check
            $reservation = $this->findReservationForVendor($user, $reservationId);
            
            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reservation not found or access denied'
                ], 404);
            }
            
            // Validate reservation status
            if ($reservation->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending reservations can be confirmed. Current status: ' . $reservation->status
                ], 400);
            }
            
            DB::beginTransaction();
            
            try {
                // Update reservation status
                $reservation->update([
                    'status' => 'confirmed',
                    'confirmed_at' => now()
                ]);
                
                // Create notification for the customer
                $this->createNotification(
                    $reservation->user_id,
                    'warehouse_reservation_confirmed',
                    [
                        'title' => 'Warehouse Reservation Confirmed',
                        'message' => "Your warehouse reservation (Ref: {$reservation->booking_reference}) has been confirmed.",
                        'unit_name' => $reservation->warehouseUnit->name ?? 'N/A',
                        'reservation_id' => $reservation->booking_reference,
                    ],
                    $reservation->id
                );
                
                DB::commit();
                
                Log::info('Reservation confirmed', [
                    'reservation_id' => $reservationId,
                    'vendor_id' => $user->id,
                    'confirmed_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Reservation confirmed successfully',
                    'reservation' => [
                        'id' => $reservation->booking_reference,
                        'status' => $reservation->status
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error confirming reservation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error confirming reservation',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Cancel a reservation
     */
    public function cancel(Request $request, $reservationId)
    {
        $request->validate([
            'cancellation_reason' => 'required|string|min:10|max:500'
        ]);
        
        try {
            $user = Auth::user();
            
            // Find reservation with authorization check
            $reservation = $this->findReservationForVendor($user, $reservationId);
            
            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reservation not found or access denied'
                ], 404);
            }
            
            // Check if already cancelled
            if ($reservation->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'This reservation has already been cancelled'
                ], 400);
            }
            
            // Validate reservation status
            if (!in_array($reservation->status, ['pending', 'confirmed', 'active'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only pending, confirmed, or active reservations can be cancelled. Current status: ' . $reservation->status
                ], 400);
            }
            
            DB::beginTransaction();
            
            try {
                $cancellationReason = $request->cancellation_reason;
                
                // Calculate 100% refund (vendor cancellation always gives full refund)
                $originalAmount = $reservation->final_amount ?? $reservation->total_amount ?? 0;
                $refundPercentage = 100;
                $refundAmount = $originalAmount;
                
                // Update reservation with cancellation and refund details
                $reservation->update([
                    'status' => 'cancelled',
                    'cancelled_by' => 'vendor',
                    'cancelled_at' => now(),
                    'refund_percentage' => $refundPercentage,
                    'refund_amount' => $refundAmount,
                    'notes' => ($reservation->notes ?? '') . "\n\nCancelled by Vendor on " . now()->format('M j, Y g:i A') . "\nReason: " . $cancellationReason . "\nRefund: 100% (LKR " . number_format($refundAmount, 2) . ")",
                ]);
                
                // Create cancellation audit record
                if (class_exists(\App\Models\WarehouseBookingCancellation::class)) {
                    \App\Models\WarehouseBookingCancellation::create([
                        'warehouse_booking_id' => $reservation->id,
                        'user_id' => $user->id,
                        'cancelled_by' => 'vendor',
                        'cancellation_reason' => $cancellationReason,
                        'booking_start_date' => $reservation->start_date,
                        'cancellation_date' => now()->toDateString(),
                        'days_before_booking' => Carbon::parse($reservation->start_date)->diffInDays(now(), false),
                        'allowed_cancellation_days' => 0, // N/A for vendor cancellations
                        'refund_percentage' => $refundPercentage,
                        'original_amount' => $originalAmount,
                        'refund_amount' => $refundAmount,
                        'refund_status' => 'pending',
                    ]);
                }
                
                // Create notification for customer
                $this->createNotification(
                    $reservation->user_id,
                    'warehouse_reservation_cancelled',
                    [
                        'title' => 'Warehouse Reservation Cancelled by Vendor',
                        'message' => "Your warehouse reservation (Ref: {$reservation->booking_reference}) has been cancelled by the vendor. You will receive a 100% refund of LKR " . number_format($refundAmount, 2) . ".",
                        'unit_name' => $reservation->warehouseUnit->name ?? 'N/A',
                        'reservation_id' => $reservation->booking_reference,
                        'cancellation_reason' => $cancellationReason,
                        'refund_percentage' => $refundPercentage,
                        'refund_amount' => $refundAmount,
                    ],
                    $reservation->id
                );
                
                DB::commit();
                
                Log::info('Reservation cancelled by vendor', [
                    'reservation_id' => $reservationId,
                    'vendor_id' => $user->id,
                    'customer_id' => $reservation->user_id,
                    'cancellation_reason' => $cancellationReason,
                    'refund_percentage' => $refundPercentage,
                    'refund_amount' => $refundAmount,
                    'cancelled_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Reservation cancelled successfully. Customer will receive 100% refund.',
                    'data' => [
                        'reservation_id' => $reservation->booking_reference,
                        'status' => $reservation->status,
                        'cancelled_by' => 'vendor',
                        'refund_percentage' => $refundPercentage,
                        'refund_amount' => number_format($refundAmount, 2),
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error cancelling reservation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error cancelling reservation',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Mark reservation as completed/expired
     */
    public function complete(Request $request, $reservationId)
    {
        try {
            $user = Auth::user();
            
            // Find reservation with authorization check
            $reservation = $this->findReservationForVendor($user, $reservationId);
            
            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reservation not found or access denied'
                ], 404);
            }
            
            // Validate reservation status
            if (!in_array($reservation->status, ['confirmed', 'active'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only confirmed or active reservations can be completed. Current status: ' . $reservation->status
                ], 400);
            }
            
            DB::beginTransaction();
            
            try {
                // Update reservation
                $reservation->update([
                    'status' => 'completed',
                    'payment_status' => 'paid',
                    'completed_at' => now()
                ]);
                
                DB::commit();
                
                Log::info('Reservation completed', [
                    'reservation_id' => $reservationId,
                    'vendor_id' => $user->id,
                    'completed_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Reservation marked as completed successfully',
                    'reservation' => [
                        'id' => $reservation->booking_reference,
                        'status' => $reservation->status,
                        'payment_status' => $reservation->payment_status
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error completing reservation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error completing reservation',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Update reservation details
     */
    public function update(Request $request, $reservationId)
    {
        $validated = $request->validate([
            'monthly_rate' => 'sometimes|numeric|min:0',
            'security_deposit' => 'sometimes|numeric|min:0',
            'setup_fee' => 'sometimes|numeric|min:0',
            'special_instructions' => 'sometimes|string|max:1000',
            'access_hours' => 'sometimes|string|max:100',
            'payment_status' => 'sometimes|in:pending,paid,failed'
        ]);
        
        try {
            $user = Auth::user();
            
            // Find reservation with authorization check
            $reservation = $this->findReservationForVendor($user, $reservationId);
            
            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Reservation not found or access denied'
                ], 404);
            }
            
            // Validate reservation can be modified
            if (in_array($reservation->status, ['completed', 'cancelled'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot modify completed or cancelled reservations'
                ], 400);
            }
            
            DB::beginTransaction();
            
            try {
                $needsRecalculation = false;
                
                // Update fields
                foreach ($validated as $key => $value) {
                    if (in_array($key, ['monthly_rate', 'security_deposit', 'setup_fee'])) {
                        $needsRecalculation = true;
                    }
                    $reservation->{$key} = $value;
                }
                
                // Recalculate totals if pricing changed
                if ($needsRecalculation) {
                    $monthlyRate = $reservation->monthly_rate ?? 0;
                    $securityDeposit = $reservation->security_deposit ?? 0;
                    $setupFee = $reservation->setup_fee ?? 0;
                    $durationMonths = $reservation->duration_months ?? 1;
                    
                    $totalAmount = ($monthlyRate * $durationMonths) + $securityDeposit + $setupFee;
                    $taxRate = 0.10; // 10% tax
                    $taxAmount = $totalAmount * $taxRate;
                    $finalAmount = $totalAmount + $taxAmount;
                    
                    $reservation->total_amount = $totalAmount;
                    $reservation->tax_amount = $taxAmount;
                    $reservation->final_amount = $finalAmount;
                }
                
                $reservation->save();
                
                DB::commit();
                
                Log::info('Reservation updated', [
                    'reservation_id' => $reservationId,
                    'vendor_id' => $user->id,
                    'updated_fields' => array_keys($validated),
                    'updated_at' => now()
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Reservation updated successfully',
                    'reservation' => [
                        'id' => $reservation->booking_reference,
                        'monthly_rate' => $reservation->monthly_rate,
                        'security_deposit' => $reservation->security_deposit,
                        'setup_fee' => $reservation->setup_fee,
                        'total_amount' => $reservation->total_amount,
                        'tax_amount' => $reservation->tax_amount,
                        'final_amount' => $reservation->final_amount,
                        'payment_status' => $reservation->payment_status
                    ]
                ]);
                
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
            
        } catch (\Exception $e) {
            Log::error('Error updating reservation: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error updating reservation',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Get start date based on the selected period
     */
    private function getStartDateForPeriod($period)
    {
        switch ($period) {
            case 'Last 3 months':
                return Carbon::now()->subMonths(3)->startOfMonth();
            case 'Last 6 months':
                return Carbon::now()->subMonths(6)->startOfMonth();
            case 'Last 8 months':
                return Carbon::now()->subMonths(8)->startOfMonth();
            case 'Last 12 months':
                return Carbon::now()->subMonths(12)->startOfMonth();
            case 'This year':
                return Carbon::now()->startOfYear();
            case 'Last year':
                return Carbon::now()->subYear()->startOfYear();
            default:
                return Carbon::now()->subMonths(8)->startOfMonth();
        }
    }

    /**
     * Helper method to format special requirements
     */
    private function formatSpecialRequirements($reservation)
    {
        $requirements = [];
        
        if ($reservation->special_requirements && is_array($reservation->special_requirements)) {
            foreach ($reservation->special_requirements as $key => $value) {
                if ($value && $value !== '' && $value !== null) {
                    $requirements[] = ucfirst(str_replace('_', ' ', $key)) . ': ' . $value;
                }
            }
        }
        
        if ($reservation->storage_type) {
            $requirements[] = 'Storage type: ' . $reservation->storage_type;
        }
        
        return implode(', ', $requirements) ?: 'Standard requirements';
    }

    /**
     * Find reservation for authenticated vendor
     */
    private function findReservationForVendor($user, $reservationId)
    {
        return WarehouseBooking::query()
            ->with(['user:id,name,email', 'warehouseUnit:id,name,user_id,type,total_area,capacity,capacity_unit'])
            ->whereHas('warehouseUnit', fn ($q) => $q->where('user_id', $user->id))
            ->where('booking_reference', $reservationId)
            ->first();
    }

    /**
     * Create notification helper
     */
    private function createNotification($userId, $type, $data, $reservationId = null)
    {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'data' => $data,
            // Keep booking_id null (belongs to passenger bookings) and link warehouse booking explicitly
            'booking_id' => null,
            'warehouse_booking_id' => $reservationId,
            'read_at' => null
        ]);
    }
}
