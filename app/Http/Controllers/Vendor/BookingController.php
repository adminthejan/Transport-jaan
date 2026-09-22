<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\AirVehicleBookings;
use App\Models\SeaVehicleBookings;
use App\Models\Notification;
use App\Models\CommissionEarning;
use App\Services\VehicleBookingCancellationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;
use Throwable;

class BookingController extends Controller
{
    public function page(Request $request)
    {
        try {
            $vendor     = Auth::user();
            $vendorId   = $vendor?->id;

            // Pick the first existing owner column from vehicles table
            $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
                ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

            $resolveClientName = static function ($booking): string {
                $fullName = trim((string) data_get($booking, 'customer.full_name'));
                if ($fullName !== '') {
                    return $fullName;
                }

                $combinedName = trim(
                    trim((string) data_get($booking, 'customer.first_name'))
                    . ' ' .
                    trim((string) data_get($booking, 'customer.last_name'))
                );
                if ($combinedName !== '') {
                    return $combinedName;
                }

                $customerName = trim((string) data_get($booking, 'customer.name'));
                if ($customerName !== '') {
                    return $customerName;
                }

                $clientName = trim((string) data_get($booking, 'client.name'));
                if ($clientName !== '') {
                    return $clientName;
                }

                return '—';
            };

            // Land bookings
            $landRows = Booking::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle', 'driver', 'schedule', 'payments'])
                ->latest('created_at')
                ->take(100)
                ->get()
                ->map(function ($b) use ($resolveClientName) {
                $vehicleSnap = $b->vehicle_snapshot ?: [];
                $veh         = $b->vehicle;

                $carModel = trim(($vehicleSnap['make'] ?? '') . ' ' . ($vehicleSnap['model'] ?? ''));
                if (!$carModel && $veh) {
                    $carModel = trim(($veh->make ?? '') . ' ' . ($veh->model ?? ''));
                }
                $plate = $vehicleSnap['plate_number'] ?? ($veh->plate_number ?? '—');

                $clientName = $resolveClientName($b);

                $start = $b->start_date ?: ($b->schedule?->pickup_at ? Carbon::parse($b->schedule->pickup_at) : null);
                $end   = $b->end_date   ?: ($b->schedule?->dropoff_at ? Carbon::parse($b->schedule->dropoff_at) : null);

                $total         = (float) ($b->total_amount ?? $b->subtotal ?? 0);
                $paidAmount    = (float) $b->payments->sum('amount');
                $paidAmountPaid = (float) $b->payments->sum('amount_paid');
                $paid          = max($paidAmount, $paidAmountPaid);
                $paymentStatus = ($total > 0 && $paid >= $total) ? 'Paid' : 'Pending';

                // Normalize status to UI labels - match enum values with proper capitalization
                $map = [
                    'pending'   => 'Pending',
                    'confirmed' => 'Confirmed',
                    'active'    => 'Confirmed',
                    'ongoing'   => 'Confirmed',
                    'completed' => 'Completed',
                    'finished'  => 'Completed',
                    'returned'  => 'Completed',
                    'cancelled' => 'Cancelled',
                    'canceled'  => 'Cancelled',
                ];
                $statusKey = strtolower((string) $b->status);
                $status    = $map[$statusKey] ?? 'Pending';

                return [
                    'id'            => $b->id,
                    'bookingDate'   => $b->created_at?->format('Y-m-d') ?? '',
                    'clientName'    => $clientName,
                    'carModel'      => $carModel ?: '—',
                    'carPlate'      => $plate,
                    'plan'          => $b->rental_days ? ($b->rental_days . ' days') : '—',
                    'startDate'     => $start?->format('Y-m-d') ?? '',
                    'endDate'       => $end?->format('Y-m-d') ?? '',
                    'payment'       => number_format($total, 2),
                    'paymentStatus' => $paymentStatus,
                    'status'        => $status,
                    'bookingType'   => 'land',
                    'editable'      => true,
                    'canCancel'     => true,
                    'policyUrl'     => '/vendors/bookings/' . $b->id . '/vendor/cancellation-policy',
                    'cancelUrl'     => '/vendors/bookings/' . $b->id . '/vendor/cancel-booking',
                    'rawId'              => $b->id,
                    'assignedDriverId'   => $b->driver_id,
                    'assignedDriverName' => $b->driver?->full_name,
                    'cancellationReason' => $b->cancellation_reason,
                    'cancelledAt'   => $b->cancelled_at?->format('Y-m-d H:i:s'),
                    'cancelledBy'   => $b->cancelled_by,
                ];
            })->values();

            // Air bookings
            $airRows = AirVehicleBookings::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle', 'driver', 'schedule', 'payments'])
                ->latest('created_at')
                ->take(100)
                ->get()
                ->map(function ($b) use ($resolveClientName) {
                    $vehicleSnap = $b->vehicle_snapshot ?: [];
                    $veh         = $b->vehicle;

                    $carModel = trim(($vehicleSnap['make'] ?? '') . ' ' . ($vehicleSnap['model'] ?? ''));
                    if (!$carModel && $veh) {
                        $carModel = trim(($veh->make ?? '') . ' ' . ($veh->model ?? ''));
                    }
                    $plate = $vehicleSnap['plate_number']
                        ?? ($veh->registration_number ?? $veh->plate_number ?? '—');

                    $clientName = $resolveClientName($b);

                    $start = $b->start_date ?: ($b->schedule?->pickup_at ? Carbon::parse($b->schedule->pickup_at) : null);
                    $end   = $b->end_date   ?: ($b->schedule?->dropoff_at ? Carbon::parse($b->schedule->dropoff_at) : null);

                    $total         = (float) ($b->total_amount ?? $b->subtotal ?? 0);
                    $paid          = (float) $b->payments->sum('amount_paid');
                    $paymentStatus = ($total > 0 && $paid >= $total) ? 'Paid' : 'Pending';

                    $map = [
                        'pending'   => 'Pending',
                        'confirmed' => 'Confirmed',
                        'active'    => 'Confirmed',
                        'ongoing'   => 'Confirmed',
                        'completed' => 'Completed',
                        'finished'  => 'Completed',
                        'returned'  => 'Completed',
                        'cancelled' => 'Cancelled',
                        'canceled'  => 'Cancelled',
                    ];
                    $statusKey = strtolower((string) $b->status);
                    $status    = $map[$statusKey] ?? 'Pending';

                    return [
                        'id'            => 'ABK-' . str_pad((string) $b->id, 5, '0', STR_PAD_LEFT),
                        'bookingDate'   => $b->created_at?->format('Y-m-d') ?? '',
                        'clientName'    => $clientName,
                        'carModel'      => $carModel ?: '—',
                        'carPlate'      => $plate,
                        'plan'          => $b->rental_days ? ($b->rental_days . ' days') : '—',
                        'startDate'     => $start?->format('Y-m-d') ?? '',
                        'endDate'       => $end?->format('Y-m-d') ?? '',
                        'payment'       => number_format($total, 2),
                        'paymentStatus' => $paymentStatus,
                        'status'        => $status,
                        'bookingType'   => 'air',
                        'editable'      => true,
                        'canCancel'     => true,
                        'policyUrl'     => '/vendors/bookings/air/' . $b->id . '/vendor/cancellation-policy',
                        'cancelUrl'     => '/vendors/bookings/air/' . $b->id . '/vendor/cancel-booking',
                        'rawId'              => $b->id,
                        'assignedDriverId'   => $b->driver_id,
                        'assignedDriverName' => $b->driver?->full_name,
                        'cancellationReason' => $b->cancellation_reason,
                        'cancelledAt'   => $b->cancelled_at?->format('Y-m-d H:i:s'),
                        'cancelledBy'   => $b->cancelled_by,
                    ];
                })->values();

            // Sea bookings
            $seaRows = SeaVehicleBookings::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle', 'driver', 'schedule', 'payments'])
                ->latest('created_at')
                ->take(100)
                ->get()
                ->map(function ($b) use ($resolveClientName) {
                    $vehicleSnap = $b->vehicle_snapshot ?: [];
                    $veh         = $b->vehicle;

                    $carModel = trim(($vehicleSnap['make'] ?? '') . ' ' . ($vehicleSnap['model'] ?? ''));
                    if (!$carModel && $veh) {
                        $carModel = trim(($veh->make ?? '') . ' ' . ($veh->model ?? ''));
                    }
                    $plate = $vehicleSnap['plate_number']
                        ?? ($veh->registration_number ?? $veh->plate_number ?? '—');

                    $clientName = $resolveClientName($b);

                    $start = $b->start_date ?: ($b->schedule?->pickup_at ? Carbon::parse($b->schedule->pickup_at) : null);
                    $end   = $b->end_date   ?: ($b->schedule?->dropoff_at ? Carbon::parse($b->schedule->dropoff_at) : null);

                    $total         = (float) ($b->total_amount ?? $b->subtotal ?? 0);
                    $paid          = (float) $b->payments->sum('amount_paid');
                    $paymentStatus = ($total > 0 && $paid >= $total) ? 'Paid' : 'Pending';

                    $map = [
                        'pending'   => 'Pending',
                        'confirmed' => 'Confirmed',
                        'active'    => 'Confirmed',
                        'ongoing'   => 'Confirmed',
                        'completed' => 'Completed',
                        'finished'  => 'Completed',
                        'returned'  => 'Completed',
                        'cancelled' => 'Cancelled',
                        'canceled'  => 'Cancelled',
                    ];
                    $statusKey = strtolower((string) $b->status);
                    $status    = $map[$statusKey] ?? 'Pending';

                    return [
                        'id'            => 'SBK-' . str_pad((string) $b->id, 5, '0', STR_PAD_LEFT),
                        'bookingDate'   => $b->created_at?->format('Y-m-d') ?? '',
                        'clientName'    => $clientName,
                        'carModel'      => $carModel ?: '—',
                        'carPlate'      => $plate,
                        'plan'          => $b->rental_days ? ($b->rental_days . ' days') : '—',
                        'startDate'     => $start?->format('Y-m-d') ?? '',
                        'endDate'       => $end?->format('Y-m-d') ?? '',
                        'payment'       => number_format($total, 2),
                        'paymentStatus' => $paymentStatus,
                        'status'        => $status,
                        'bookingType'   => 'sea',
                        'editable'      => true,
                        'canCancel'     => true,
                        'policyUrl'     => '/vendors/bookings/sea/' . $b->id . '/vendor/cancellation-policy',
                        'cancelUrl'     => '/vendors/bookings/sea/' . $b->id . '/vendor/cancel-booking',
                        'rawId'              => $b->id,
                        'assignedDriverId'   => $b->driver_id,
                        'assignedDriverName' => $b->driver?->full_name,
                        'cancellationReason' => $b->cancellation_reason,
                        'cancelledAt'   => $b->cancelled_at?->format('Y-m-d H:i:s'),
                        'cancelledBy'   => $b->cancelled_by,
                    ];
                })->values();

            $initialBookings = $landRows
                ->merge($airRows)
                ->merge($seaRows)
                ->sortByDesc(function ($row) {
                    return $row['bookingDate'] ?? '';
                })
                ->values();

            // Build Booking Overview (last 8 months)
            $done   = ['completed', 'finished', 'returned'];
            $cancel = ['cancelled', 'canceled'];

            $months = collect(range(0, 7))->map(fn ($i) => Carbon::now()->subMonths(7 - $i)->startOfMonth());

            $bookingData = $months->map(function (Carbon $m) use ($ownerCol, $vendorId, $done, $cancel) {
                $start = $m->copy()->startOfMonth();
                $end   = $m->copy()->endOfMonth();

                $doneCount = Booking::query()
                    ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                    ->whereBetween('created_at', [$start, $end])
                    ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($done), '?')) . ')', $done)
                    ->count()
                    + AirVehicleBookings::query()
                        ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                        ->whereBetween('created_at', [$start, $end])
                        ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($done), '?')) . ')', $done)
                        ->count()
                    + SeaVehicleBookings::query()
                        ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                        ->whereBetween('created_at', [$start, $end])
                        ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($done), '?')) . ')', $done)
                        ->count();

                $cancelCount = Booking::query()
                    ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                    ->whereBetween('created_at', [$start, $end])
                    ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($cancel), '?')) . ')', $cancel)
                    ->count()
                    + AirVehicleBookings::query()
                        ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                        ->whereBetween('created_at', [$start, $end])
                        ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($cancel), '?')) . ')', $cancel)
                        ->count()
                    + SeaVehicleBookings::query()
                        ->when($ownerCol && $vendorId, fn ($q) => $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId)))
                        ->whereBetween('created_at', [$start, $end])
                        ->whereRaw('LOWER(status) IN (' . implode(',', array_fill(0, count($cancel), '?')) . ')', $cancel)
                        ->count();

                return [
                    'name'      => $m->format('M'),
                    'done'      => $doneCount,
                    'cancelled' => $cancelCount,
                ];
            })->values();

            // Get unread notification count
            $unreadNotifications = Notification::where('user_id', $vendorId)->unread()->count();

            // Vendor's assignable (active) drivers for the assign-driver control
            $drivers = \App\Models\Driver::where('user_id', $vendorId)
                ->where('status', 'Active')
                ->orderBy('full_name')
                ->get(['id', 'full_name'])
                ->map(fn ($d) => ['id' => $d->id, 'name' => $d->full_name])
                ->values();

            return Inertia::render('Web/home/vendors/Booking', [
                'initialBookings' => $initialBookings,
                'drivers'         => $drivers,
                'bookingData'     => $bookingData,
                'vendorUser'      => [
                    'name' => $vendor?->name ?? 'Vendor',
                    'role' => 'Vendor',
                ],
                'unreadNotifications' => $unreadNotifications,
            ]);
        } catch (Throwable $e) {
            // Log the real error and still render the page so the SPA doesn’t white-screen.
            report($e);

            return Inertia::render('Web/home/vendors/Booking', [
                'initialBookings' => [],
                'bookingData'     => [],
                'vendorUser'      => [
                    'name' => Auth::user()?->name ?? 'Vendor',
                    'role' => 'Vendor',
                ],
                'server_error'    => 'Failed to load bookings. Check storage/logs/laravel.log.',
            ]);
        }
    }

    public function clients(Request $request)
    {
        try {
            $vendor = Auth::user();
            $vendorId = $vendor?->id;

            // Pick the first existing owner column from vehicles table
            $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
                ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

            // Get filter parameter (default: all)
            $filter = $request->get('filter', 'all'); // all, land, air, sea

            // Base query to get bookings with clients
            $query = Booking::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle.category', 'schedule', 'payments'])
                ->latest('created_at');

            // Filter by vehicle type if specified
            if ($filter !== 'all') {
                $query->whereHas('vehicle', function ($q) use ($filter) {
                    $q->where('type', $filter);
                });
            }

            $bookings = $query->get();

            // Group clients by vehicle type
            $clientsByType = [
                'land' => [],
                'air' => [],
                'sea' => [],
            ];

            // Process bookings to extract unique clients with their booking info
            $clientsMap = [];

            foreach ($bookings as $booking) {
                $client = $booking->client ?? $booking->customer;
                $vehicle = $booking->vehicle;

                if (!$client || !$vehicle) continue;

                $clientKey = $client->email ?? $client->id;
                $vehicleType = $vehicle->type ?? 'land';

                if (!isset($clientsMap[$vehicleType][$clientKey])) {
                    $clientsMap[$vehicleType][$clientKey] = [
                        'id' => $client->id,
                        'name' => $client->name ?? '—',
                        'email' => $client->email ?? '—',
                        'phone' => $client->phone ?? '—',
                        'address' => $client->address ?? '—',
                        'bookings_count' => 0,
                        'total_spent' => 0,
                        'vehicle_type' => ucfirst($vehicleType),
                        'last_booking_date' => null,
                        'bookings' => [],
                    ];
                }

                // Add booking details
                $clientsMap[$vehicleType][$clientKey]['bookings_count']++;
                $clientsMap[$vehicleType][$clientKey]['total_spent'] += (float)($booking->total_amount ?? 0);

                $bookingDate = $booking->created_at ? $booking->created_at->format('Y-m-d') : null;
                if (!$clientsMap[$vehicleType][$clientKey]['last_booking_date'] ||
                    ($bookingDate && $bookingDate > $clientsMap[$vehicleType][$clientKey]['last_booking_date'])) {
                    $clientsMap[$vehicleType][$clientKey]['last_booking_date'] = $bookingDate;
                }

                $clientsMap[$vehicleType][$clientKey]['bookings'][] = [
                    'id' => $booking->id,
                    'booking_date' => $bookingDate,
                    'vehicle' => $vehicle->model ?? '—',
                    'status' => $booking->status ?? 'pending',
                    'amount' => (float)($booking->total_amount ?? 0),
                ];
            }

            // Convert to arrays and format
            foreach ($clientsMap as $type => $clients) {
                $clientsByType[$type] = array_values($clients);
            }

            // Statistics
            $stats = [
                'total_clients' => count(array_unique(array_merge(
                    array_keys($clientsMap['land'] ?? []),
                    array_keys($clientsMap['air'] ?? []),
                    array_keys($clientsMap['sea'] ?? [])
                ))),
                'land_clients' => count($clientsByType['land']),
                'air_clients' => count($clientsByType['air']),
                'sea_clients' => count($clientsByType['sea']),
            ];

            // Get unread notification count
            $unreadNotifications = Notification::where('user_id', $vendorId)->unread()->count();

            return Inertia::render('Web/home/vendors/Client', [
                'clients' => $clientsByType,
                'currentFilter' => $filter,
                'stats' => $stats,
                'unreadNotifications' => $unreadNotifications,
            ]);

        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/Client', [
                'clients' => [
                    'land' => [],
                    'air' => [],
                    'sea' => [],
                ],
                'currentFilter' => 'all',
                'stats' => [
                    'total_clients' => 0,
                    'land_clients' => 0,
                    'air_clients' => 0,
                    'sea_clients' => 0,
                ],
                'server_error' => 'Failed to load clients. Check logs.',
            ]);
        }
    }

    public function payments(Request $request)
    {
        try {
            $vendor = Auth::user();
            $vendorId = $vendor?->id;

            // Pick the first existing owner column from vehicles table
            $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
                ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

            // Get all bookings with payments for this vendor
            $bookings = Booking::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle', 'payments', 'schedule'])
                ->latest('created_at')
                ->get();

            // Process payments
            $transactions = [];
            $totalRevenue = 0;
            $totalPending = 0;
            $totalCompleted = 0;
            $completedCount = 0;
            $pendingCount = 0;

            foreach ($bookings as $booking) {
                $vehicle = $booking->vehicle;
                $client = $booking->client ?? $booking->customer;

                // Get vehicle model/name
                $vehicleSnap = is_array($booking->vehicle_snapshot) 
                    ? $booking->vehicle_snapshot 
                    : ($booking->vehicle_snapshot ? json_decode($booking->vehicle_snapshot, true) : []);
                $vehicleName = $vehicle
                    ? trim(($vehicle->manufacturer ?? '') . ' ' . ($vehicle->model ?? ''))
                    : ($vehicleSnap['model'] ?? 'N/A');

                foreach ($booking->payments as $payment) {
                    $status = strtolower($payment->status);
                    $isPaid = in_array($status, ['paid', 'completed', 'success']);

                    if ($isPaid) {
                        $totalCompleted += (float)$payment->amount_paid;
                        $completedCount++;
                    } else {
                        $totalPending += (float)$payment->amount_paid;
                        $pendingCount++;
                    }

                    $totalRevenue += (float)$payment->amount_paid;

                    $transactions[] = [
                        'id' => 'BK-' . str_pad($booking->id, 5, '0', STR_PAD_LEFT),
                        'booking_id' => $booking->id,
                        'payment_id' => $payment->id,
                        'client' => $client?->name ?? 'N/A',
                        'car' => $vehicleName ?: 'N/A',
                        'rentPerDay' => '$' . number_format($booking->price_per_day ?? 0, 2),
                        'days' => $booking->rental_days ?? '0',
                        'amount' => '$' . number_format($payment->amount_paid ?? 0, 2),
                        'amount_raw' => (float)($payment->amount_paid ?? 0),
                        'dueDate' => $booking->created_at ? $booking->created_at->format('Y.m.d') : 'N/A',
                        'paymentDate' => $payment->created_at ? $payment->created_at->format('Y.m.d') : 'N/A',
                        'method' => $payment->method ?? 'N/A',
                        'status' => $isPaid ? 'Completed' : 'Pending',
                        'statusColor' => $isPaid ? '#50AE31' : '#F0BB0D',
                        'statusBg' => $isPaid ? '#6DB4464D' : '#FFCD294D',
                        'tx_reference' => $payment->tx_reference ?? 'N/A',
                    ];
                }
            }

            // Calculate monthly revenue for chart (last 6 months)
            $monthlyRevenue = [];
            for ($i = 5; $i >= 0; $i--) {
                $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
                $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();

                $revenue = Booking::query()
                    ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                        $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                    })
                    ->whereBetween('created_at', [$monthStart, $monthEnd])
                    ->with('payments')
                    ->get()
                    ->flatMap(fn($b) => $b->payments)
                    ->where('status', 'paid')
                    ->sum('amount_paid');

                $monthlyRevenue[] = [
                    'month' => $monthStart->format('M'),
                    'revenue' => (float)$revenue,
                ];
            }

            $stats = [
                'total_revenue' => $totalRevenue,
                'total_completed' => $totalCompleted,
                'total_pending' => $totalPending,
                'completed_count' => $completedCount,
                'pending_count' => $pendingCount,
                'total_transactions' => count($transactions),
            ];

            // Get unread notification count
            $unreadNotifications = Notification::where('user_id', $vendorId)->unread()->count();

            return Inertia::render('Web/home/vendors/Payment', [
                'transactions' => $transactions,
                'stats' => $stats,
                'monthlyRevenue' => $monthlyRevenue,
                'unreadNotifications' => $unreadNotifications,
            ]);

        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/Payment', [
                'transactions' => [],
                'stats' => [
                    'total_revenue' => 0,
                    'total_completed' => 0,
                    'total_pending' => 0,
                    'completed_count' => 0,
                    'pending_count' => 0,
                    'total_transactions' => 0,
                ],
                'monthlyRevenue' => [],
                'server_error' => 'Failed to load payment data. Check logs.',
            ]);
        }
    }

    /**
     * Vendor-facing view of their own commission earnings/payout breakdown.
     * Commission rows are created (status=paid) when a booking is confirmed
     * and reversed (status=failed) if it's later cancelled — see
     * VehicleCommissionService / BookingObserver.
     */
    public function earnings(Request $request)
    {
        try {
            $vendor   = Auth::user();
            $vendorId = $vendor?->id;

            $earnings = CommissionEarning::query()
                ->byVendor($vendorId)
                ->byServiceType('vehicle')
                ->latest('created_at')
                ->take(200)
                ->get();

            $labelBookingRef = function (CommissionEarning $e): string {
                $prefix = match ($e->booking_type) {
                    'air' => 'ABK-',
                    'sea' => 'SBK-',
                    default => 'BKG-',
                };
                return $prefix . str_pad((string) $e->booking_id, 5, '0', STR_PAD_LEFT);
            };

            $rows = $earnings->map(fn (CommissionEarning $e) => [
                'id'                    => $e->id,
                'bookingRef'            => $labelBookingRef($e),
                'bookingType'           => ucfirst($e->booking_type),
                'bookingAmount'         => (float) $e->booking_amount,
                'commissionPercentage'  => (float) $e->commission_percentage,
                'totalCommission'       => (float) $e->total_commission,
                'vendorAmount'          => (float) $e->vendor_amount,
                'vendorPercentage'      => (float) $e->vendor_percentage,
                'status'                => ucfirst($e->status),
                'paidAt'                => $e->paid_at?->format('Y-m-d H:i'),
                'createdAt'             => $e->created_at?->format('Y-m-d'),
            ])->values();

            $paid    = $earnings->where('status', 'paid');
            $pending = $earnings->where('status', 'pending');
            $failed  = $earnings->where('status', 'failed');

            $stats = [
                'total_earned'    => (float) $paid->sum('vendor_amount'),
                'total_pending'   => (float) $pending->sum('vendor_amount'),
                'total_reversed'  => (float) $failed->sum('vendor_amount'),
                'paid_count'      => $paid->count(),
                'pending_count'   => $pending->count(),
                'reversed_count'  => $failed->count(),
                'total_bookings'  => $earnings->count(),
            ];

            // Monthly earnings for the last 6 months (paid only)
            $monthlyEarnings = [];
            for ($i = 5; $i >= 0; $i--) {
                $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
                $monthEnd   = Carbon::now()->subMonths($i)->endOfMonth();

                $amount = CommissionEarning::query()
                    ->byVendor($vendorId)
                    ->byServiceType('vehicle')
                    ->where('status', 'paid')
                    ->whereBetween('paid_at', [$monthStart, $monthEnd])
                    ->sum('vendor_amount');

                $monthlyEarnings[] = [
                    'month'   => $monthStart->format('M'),
                    'amount'  => (float) $amount,
                ];
            }

            $unreadNotifications = Notification::where('user_id', $vendorId)->unread()->count();

            return Inertia::render('Web/home/vendors/Earnings', [
                'earnings'            => $rows,
                'stats'               => $stats,
                'monthlyEarnings'     => $monthlyEarnings,
                'unreadNotifications' => $unreadNotifications,
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/Earnings', [
                'earnings' => [],
                'stats' => [
                    'total_earned'   => 0,
                    'total_pending'  => 0,
                    'total_reversed' => 0,
                    'paid_count'     => 0,
                    'pending_count'  => 0,
                    'reversed_count' => 0,
                    'total_bookings' => 0,
                ],
                'monthlyEarnings' => [],
                'server_error' => 'Failed to load earnings data. Check logs.',
            ]);
        }
    }

    public function calendar(Request $request)
    {
        try {
            $vendor = Auth::user();
            $vendorId = $vendor?->id;

            // Pick the first existing owner column from vehicles table
            $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
                ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

            // Get filter parameters
            $month = $request->get('month', now()->month);
            $year = $request->get('year', now()->year);
            $userId = $request->get('user_id'); // Optional: filter by specific user

            // Build date range for the calendar view
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();

            // Base query for bookings
            $query = Booking::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with(['client', 'customer', 'vehicle', 'schedule'])
                ->whereHas('schedule', function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('pickup_at', [$startDate, $endDate])
                      ->orWhereBetween('dropoff_at', [$startDate, $endDate])
                      ->orWhere(function ($ov) use ($startDate, $endDate) {
                          $ov->where('pickup_at', '<=', $startDate)->where('dropoff_at', '>=', $endDate);
                      });
                });

            // Filter by user if specified
            if ($userId) {
                $query->where('client_id', $userId);
            }

            $bookings = $query->get();

            // Process bookings into calendar events
            $events = [];
            foreach ($bookings as $booking) {
                $client = $booking->client ?? $booking->customer;
                $vehicle = $booking->vehicle;
                $schedule = $booking->schedule;

                if (!$schedule) continue;

                $vehicleSnap = $booking->vehicle_snapshot ?: [];
                $vehicleName = $vehicle
                    ? trim(($vehicle->make ?? '') . ' ' . ($vehicle->model ?? ''))
                    : trim(($vehicleSnap['make'] ?? '') . ' ' . ($vehicleSnap['model'] ?? ''));

                $pickupDate = Carbon::parse($schedule->pickup_at);
                $dropoffDate = Carbon::parse($schedule->dropoff_at);

                // Determine status color
                $statusMap = [
                    'completed' => 'done',
                    'finished' => 'done',
                    'returned' => 'done',
                    'cancelled' => 'cancelled',
                    'canceled' => 'cancelled',
                ];
                $status = $statusMap[strtolower($booking->status)] ?? 'done';

                $events[] = [
                    'id' => $booking->id,
                    'title' => $vehicleName ?: 'Vehicle',
                    'person' => $client?->name ?? 'Unknown Client',
                    'personImage' => $client?->profile_photo_url ?? null,
                    'vehicleImage' => $vehicle?->primary_image_url ?? null,
                    'status' => $status,
                    'pickup_at' => $pickupDate->toIso8601String(),
                    'dropoff_at' => $dropoffDate->toIso8601String(),
                    'pickup_location' => $schedule->pickup_location ?? 'N/A',
                    'dropoff_location' => $schedule->dropoff_location ?? 'N/A',
                    'pickup_date' => $pickupDate->format('Y-m-d'),
                    'pickup_time' => $pickupDate->format('g:i A'),
                    'dropoff_date' => $dropoffDate->format('Y-m-d'),
                    'dropoff_time' => $dropoffDate->format('g:i A'),
                    'rental_days' => $booking->rental_days ?? 0,
                    'total_amount' => (float)($booking->total_amount ?? 0),
                    'vehicle' => [
                        'name' => $vehicleName,
                        'type' => $vehicle?->type ?? 'N/A',
                        'plate_number' => $vehicle?->plate_number ?? ($vehicleSnap['plate_number'] ?? 'N/A'),
                        'transmission' => $vehicle?->transmission ?? ($vehicleSnap['transmission'] ?? 'N/A'),
                    ],
                    'client' => [
                        'name' => $client?->name ?? 'Unknown',
                        'email' => $client?->email ?? 'N/A',
                        'phone' => $client?->phone ?? 'N/A',
                    ],
                    'notes' => $booking->notes ?? null,
                ];
            }

            // Get all unique clients who have bookings with this vendor
            $clients = Booking::query()
                ->when($ownerCol && $vendorId, function ($q) use ($ownerCol, $vendorId) {
                    $q->whereHas('vehicle', fn ($v) => $v->where($ownerCol, $vendorId));
                })
                ->with('client')
                ->get()
                ->pluck('client')
                ->filter()
                ->unique('id')
                ->map(fn($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'email' => $c->email,
                ])
                ->values();

            // Get unread notification count
            $unreadNotifications = Notification::where('user_id', $vendorId)->unread()->count();

            return Inertia::render('Web/home/vendors/Calendar', [
                'events' => $events,
                'clients' => $clients,
                'currentMonth' => (int)$month,
                'currentYear' => (int)$year,
                'selectedUserId' => $userId,
                'vendorUser' => [
                    'name' => $vendor?->name ?? 'Vendor',
                    'role' => 'Vendor',
                ],
                'unreadNotifications' => $unreadNotifications,
            ]);

        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/Calendar', [
                'events' => [],
                'clients' => [],
                'currentMonth' => now()->month,
                'currentYear' => now()->year,
                'selectedUserId' => null,
                'vendorUser' => [
                    'name' => Auth::user()?->name ?? 'Vendor',
                    'role' => 'Vendor',
                ],
                'server_error' => 'Failed to load calendar data. Check logs.',
            ]);
        }
    }

    public function getVendorCancellationPolicyByType(Request $request, string $bookingType, int $bookingId)
    {
        $vendor = Auth::user();
        $vendorId = $vendor?->id;

        $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
            ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

        $booking = $this->resolveVendorVehicleBookingByType($bookingType, $bookingId, $vendorId, $ownerCol);

        $cancellationService = app(VehicleBookingCancellationService::class);
        return response()->json($cancellationService->getRefundPreview($booking, 'vendor'));
    }

    public function cancelBookingAsVendorByType(Request $request, string $bookingType, int $bookingId)
    {
        $vendor = Auth::user();
        $vendorId = $vendor?->id;

        $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
            ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

        $booking = $this->resolveVendorVehicleBookingByType($bookingType, $bookingId, $vendorId, $ownerCol);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $cancellationService = app(VehicleBookingCancellationService::class);

        $result = $cancellationService->cancelBooking(
            $booking,
            'vendor',
            $validated['reason'] ?? null,
            $vendorId
        );

        if (!$result['success']) {
            return response()->json($result, 422);
        }

        return response()->json($result);
    }

    public function assignDriver(Request $request, string $bookingType, int $bookingId)
    {
        $vendor   = Auth::user();
        $vendorId = $vendor?->id;

        $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
            ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

        $booking = $this->resolveVendorVehicleBookingByType($bookingType, $bookingId, $vendorId, $ownerCol);

        $validated = $request->validate([
            'driver_id' => ['nullable', 'integer'],
        ]);

        $driverId = $validated['driver_id'] ?? null;
        $driver   = null;

        if ($driverId) {
            // Only the vendor's own active drivers may be assigned.
            $driver = \App\Models\Driver::where('id', $driverId)
                ->where('user_id', $vendorId)
                ->where('status', 'Active')
                ->first();

            if (!$driver) {
                return response()->json([
                    'success' => false,
                    'message' => 'Driver not found, inactive, or not one of your drivers.',
                ], 422);
            }
        }

        $booking->driver_id = $driverId;
        $booking->save();

        return response()->json([
            'success' => true,
            'message' => $driver ? 'Driver assigned successfully.' : 'Driver unassigned.',
            'driver'  => $driver ? ['id' => $driver->id, 'name' => $driver->full_name] : null,
        ]);
    }

    private function resolveVendorVehicleBookingByType(string $bookingType, int $bookingId, ?int $vendorId, ?string $ownerCol)
    {
        $type = strtolower(trim($bookingType));

        $booking = match ($type) {
            'land' => Booking::with(['vehicle', 'schedule'])->findOrFail($bookingId),
            'air'  => AirVehicleBookings::with(['vehicle', 'schedule'])->findOrFail($bookingId),
            'sea'  => SeaVehicleBookings::with(['vehicle', 'schedule'])->findOrFail($bookingId),
            default => abort(404, 'Unknown booking type'),
        };

        $vehicle = $booking->vehicle;
        if (!$vehicle || !$ownerCol || !$vendorId || (int) $vehicle->{$ownerCol} !== (int) $vendorId) {
            abort(403, 'Unauthorized');
        }

        return $booking;
    }

    /**
     * Update booking status and payment information.
     *
     * Routed both as /api/bookings/{bookingId} (land, back-compat, $a = bookingId)
     * and /api/bookings/{bookingType}/{bookingId} (land/air/sea, $a = bookingType, $b = bookingId).
     */
    public function update(Request $request, $a, $b = null)
    {
        try {
            $bookingType = $b !== null ? strtolower((string) $a) : 'land';
            $bookingId   = $b !== null ? $b : $a;

            $modelClass = match ($bookingType) {
                'air' => AirVehicleBookings::class,
                'sea' => SeaVehicleBookings::class,
                default => Booking::class,
            };

            $validated = $request->validate([
                'status' => 'required|in:pending,confirmed,completed,cancelled',
                'payment_status' => 'required|in:paid,pending',
                'total_amount' => 'required|numeric|min:0',
            ]);

            $vendor = Auth::user();
            $vendorId = $vendor?->id;

            // Find the booking
            $booking = $modelClass::with('vehicle')->find($bookingId);

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            // Prevent updating cancelled bookings
            if ($booking->status === 'cancelled' || $booking->cancelled_at) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update a cancelled booking. Cancellation reason: ' . ($booking->cancellation_reason ?? 'Not provided')
                ], 403);
            }

            // Check vendor ownership
            $ownerCol = collect(['provider_id', 'vendor_id', 'owner_id', 'user_id'])
                ->first(fn ($col) => Schema::hasColumn('vehicles', $col));

            if ($ownerCol && $vendorId && $booking->vehicle) {
                if ($booking->vehicle->$ownerCol != $vendorId) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You do not have permission to update this booking'
                    ], 403);
                }
            }

            // Update the booking
            DB::beginTransaction();
            
            $booking->status = $validated['status'];
            $booking->total_amount = $validated['total_amount'];
            $booking->save();

            // Update payment status
            $paymentStatusValue = $validated['payment_status']; // 'paid' or 'pending'
            
            if ($booking->payments()->exists()) {
                // Update all existing payment records' status
                $booking->payments()->update([
                    'status' => $paymentStatusValue,
                ]);
                
            } else {
                // No payment records exist, create one with valid BookingPayment columns.
                $booking->payments()->create([
                    'method'      => 'Bank Transfer',
                    'option'      => 'full',
                    'amount_paid' => $validated['total_amount'],
                    'status'      => $paymentStatusValue,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking updated successfully',
                'booking' => $booking->fresh(['vehicle', 'customer', 'payments'])
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking update failed', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update booking: ' . $e->getMessage()
            ], 500);
        }
    }
}
