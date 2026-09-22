<?php

namespace App\Http\Controllers\Vendor\TicketBooking;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusBooking;
use App\Models\Train;
use App\Models\TrainBooking;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Throwable;

/**
 * Vendor-facing bookings/dashboard/clients/payments/calendar for Ticket
 * Booking (bus + train). Mirrors the pattern used by the Vehicle Rental
 * vendor BookingController: two parallel booking stacks (bus/train) merged
 * into one view, scoped to the vendor's own fleet via Bus/Train.vendor_id.
 */
class BookingController extends Controller
{
    private function vendorBusIds(int $vendorId): array
    {
        return Bus::forVendor($vendorId)->pluck('id')->all();
    }

    private function vendorTrainIds(int $vendorId): array
    {
        return Train::forVendor($vendorId)->pluck('id')->all();
    }

    public function dashboard(Request $request)
    {
        try {
            $vendorId = Auth::id();
            $busIds = $this->vendorBusIds($vendorId);
            $trainIds = $this->vendorTrainIds($vendorId);

            $busBookings = BusBooking::whereHas('busSchedule', fn ($q) => $q->whereIn('bus_id', $busIds));
            $trainBookings = TrainBooking::whereHas('trainSchedule', fn ($q) => $q->whereIn('train_id', $trainIds));

            $totalBookings = (clone $busBookings)->count() + (clone $trainBookings)->count();
            $newBookings = (clone $busBookings)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count()
                + (clone $trainBookings)->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count();
            $confirmedBookings = (clone $busBookings)->where('status', 'confirmed')->count()
                + (clone $trainBookings)->where('status', 'confirmed')->count();
            $totalRevenue = (clone $busBookings)->where('payment_status', 'paid')->sum('total_price')
                + (clone $trainBookings)->where('payment_status', 'paid')->sum('total_amount');

            $recentBookings = $this->mergedBookingRows($busIds, $trainIds, 10);

            $months = collect(range(0, 5))->map(fn ($i) => Carbon::now()->subMonths(5 - $i)->startOfMonth());
            $revenueChart = $months->map(function (Carbon $m) use ($busIds, $trainIds) {
                $start = $m->copy()->startOfMonth();
                $end = $m->copy()->endOfMonth();

                $revenue = BusBooking::whereHas('busSchedule', fn ($q) => $q->whereIn('bus_id', $busIds))
                    ->where('payment_status', 'paid')
                    ->whereBetween('created_at', [$start, $end])
                    ->sum('total_price')
                    + TrainBooking::whereHas('trainSchedule', fn ($q) => $q->whereIn('train_id', $trainIds))
                        ->where('payment_status', 'paid')
                        ->whereBetween('created_at', [$start, $end])
                        ->sum('total_amount');

                return ['name' => $m->format('M'), 'revenue' => (float) $revenue];
            })->values();

            $fleetCount = count($busIds) + count($trainIds);

            return Inertia::render('Web/home/vendors/ticketBooking/Dashboard', [
                'ticketStats' => [
                    'totalRevenue' => (float) $totalRevenue,
                    'newBookings' => $newBookings,
                    'confirmedBookings' => $confirmedBookings,
                    'totalBookings' => $totalBookings,
                    'fleetCount' => $fleetCount,
                ],
                'recentBookings' => $recentBookings,
                'revenueChart' => $revenueChart,
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/ticketBooking/Dashboard', [
                'ticketStats' => ['totalRevenue' => 0, 'newBookings' => 0, 'confirmedBookings' => 0, 'totalBookings' => 0, 'fleetCount' => 0],
                'recentBookings' => [],
                'revenueChart' => [],
                'server_error' => 'Failed to load dashboard data. Check logs.',
            ]);
        }
    }

    private function mergedBookingRows(array $busIds, array $trainIds, ?int $limit = null)
    {
        $busRows = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation'])
            ->whereHas('busSchedule', fn ($q) => $q->whereIn('bus_id', $busIds))
            ->latest('created_at')
            ->when($limit, fn ($q) => $q->take($limit))
            ->get()
            ->map(fn (BusBooking $b) => $this->serializeBusBooking($b));

        $trainRows = TrainBooking::with(['trainSchedule.train', 'trainSchedule.departureStation', 'trainSchedule.arrivalStation'])
            ->whereHas('trainSchedule', fn ($q) => $q->whereIn('train_id', $trainIds))
            ->latest('created_at')
            ->when($limit, fn ($q) => $q->take($limit))
            ->get()
            ->map(fn (TrainBooking $b) => $this->serializeTrainBooking($b));

        return $busRows->merge($trainRows)
            ->sortByDesc('bookingDate')
            ->values()
            ->when($limit, fn ($c) => $c->take($limit))
            ->values();
    }

    private function serializeBusBooking(BusBooking $b): array
    {
        $schedule = $b->busSchedule;
        $bus = $schedule?->bus;

        return [
            'id' => $b->booking_reference ?? ('BUS-' . str_pad((string) $b->id, 5, '0', STR_PAD_LEFT)),
            'rawId' => $b->id,
            'bookingType' => 'bus',
            'bookingDate' => $b->created_at?->format('Y-m-d') ?? '',
            'clientName' => $b->passenger_name ?: '—',
            'clientEmail' => $b->passenger_email,
            'clientPhone' => $b->passenger_phone,
            'unitName' => $bus?->name ?: '—',
            'unitNumber' => $bus?->bus_number ?: '—',
            'route' => trim(($schedule?->departureStation?->name ?? '—') . ' → ' . ($schedule?->arrivalStation?->name ?? '—')),
            'travelDate' => optional($schedule?->date)->format('Y-m-d'),
            'seats' => $b->seat_numbers ?? [],
            'passengerCount' => $b->passenger_count,
            'amount' => (float) $b->total_price,
            'status' => ucfirst($b->status),
            'paymentStatus' => ucfirst($b->payment_status ?? 'pending'),
            'cancellationReason' => $b->cancellation_reason,
            'cancelledAt' => $b->cancelled_at?->format('Y-m-d H:i:s'),
        ];
    }

    private function serializeTrainBooking(TrainBooking $b): array
    {
        $schedule = $b->trainSchedule;
        $train = $schedule?->train;

        return [
            'id' => $b->booking_reference ?? ('TRN-' . str_pad((string) $b->id, 5, '0', STR_PAD_LEFT)),
            'rawId' => $b->id,
            'bookingType' => 'train',
            'bookingDate' => $b->created_at?->format('Y-m-d') ?? '',
            'clientName' => $b->passenger_name ?: '—',
            'clientEmail' => $b->passenger_email,
            'clientPhone' => $b->passenger_phone,
            'unitName' => $train?->name ?: '—',
            'unitNumber' => $train?->train_number ?: '—',
            'route' => trim(($schedule?->departureStation?->name ?? '—') . ' → ' . ($schedule?->arrivalStation?->name ?? '—')),
            'travelDate' => optional($schedule?->date)->format('Y-m-d'),
            'seats' => $b->seat_numbers ?? [],
            'passengerCount' => $b->total_passengers,
            'amount' => (float) $b->total_amount,
            'status' => ucfirst($b->status),
            'paymentStatus' => ucfirst($b->payment_status ?? 'pending'),
            'cancellationReason' => $b->cancellation_reason,
            'cancelledAt' => $b->cancelled_at?->format('Y-m-d H:i:s'),
        ];
    }

    public function bookingsPage(Request $request)
    {
        try {
            $vendorId = Auth::id();
            $busIds = $this->vendorBusIds($vendorId);
            $trainIds = $this->vendorTrainIds($vendorId);

            $bookings = $this->mergedBookingRows($busIds, $trainIds);

            return Inertia::render('Web/home/vendors/ticketBooking/Booking', [
                'initialBookings' => $bookings,
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/ticketBooking/Booking', [
                'initialBookings' => [],
                'server_error' => 'Failed to load bookings. Check logs.',
            ]);
        }
    }

    public function updateBooking(Request $request, string $bookingType, int $bookingId)
    {
        $vendorId = Auth::id();

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,cancelled,completed',
            'payment_status' => 'required|in:pending,paid,failed,refunded',
        ]);

        if ($bookingType === 'bus') {
            $busIds = $this->vendorBusIds($vendorId);
            $booking = BusBooking::whereHas('busSchedule', fn ($q) => $q->whereIn('bus_id', $busIds))
                ->findOrFail($bookingId);

            $booking->update([
                'status' => $validated['status'],
                'payment_status' => $validated['payment_status'],
            ]);

            return response()->json(['success' => true, 'message' => 'Booking updated.']);
        }

        if ($bookingType === 'train') {
            $trainIds = $this->vendorTrainIds($vendorId);
            $booking = TrainBooking::whereHas('trainSchedule', fn ($q) => $q->whereIn('train_id', $trainIds))
                ->findOrFail($bookingId);

            $booking->update([
                'status' => $validated['status'],
                'payment_status' => $validated['payment_status'],
            ]);

            return response()->json(['success' => true, 'message' => 'Booking updated.']);
        }

        return response()->json(['success' => false, 'message' => 'Unknown booking type.'], 422);
    }

    public function cancelBooking(Request $request, string $bookingType, int $bookingId)
    {
        $vendorId = Auth::id();

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $model = $bookingType === 'bus'
            ? BusBooking::whereHas('busSchedule', fn ($q) => $q->whereIn('bus_id', $this->vendorBusIds($vendorId)))->find($bookingId)
            : ($bookingType === 'train'
                ? TrainBooking::whereHas('trainSchedule', fn ($q) => $q->whereIn('train_id', $this->vendorTrainIds($vendorId)))->find($bookingId)
                : null);

        if (!$model) {
            return response()->json(['success' => false, 'message' => 'Booking not found.'], 404);
        }

        $model->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $validated['reason'] ?? 'Cancelled by vendor',
        ]);

        return response()->json(['success' => true, 'message' => 'Booking cancelled.']);
    }

    public function clientsPage(Request $request)
    {
        try {
            $vendorId = Auth::id();
            $busIds = $this->vendorBusIds($vendorId);
            $trainIds = $this->vendorTrainIds($vendorId);

            $rows = $this->mergedBookingRows($busIds, $trainIds);

            $clientsMap = [];
            foreach ($rows as $row) {
                $key = $row['clientEmail'] ?: $row['clientName'];
                if (!isset($clientsMap[$key])) {
                    $clientsMap[$key] = [
                        'name' => $row['clientName'],
                        'email' => $row['clientEmail'],
                        'phone' => $row['clientPhone'],
                        'bookings_count' => 0,
                        'total_spent' => 0,
                        'last_booking_date' => null,
                    ];
                }
                $clientsMap[$key]['bookings_count']++;
                $clientsMap[$key]['total_spent'] += $row['amount'];
                if (!$clientsMap[$key]['last_booking_date'] || $row['bookingDate'] > $clientsMap[$key]['last_booking_date']) {
                    $clientsMap[$key]['last_booking_date'] = $row['bookingDate'];
                }
            }

            return Inertia::render('Web/home/vendors/ticketBooking/Client', [
                'clients' => array_values($clientsMap),
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/ticketBooking/Client', [
                'clients' => [],
                'server_error' => 'Failed to load clients. Check logs.',
            ]);
        }
    }

    public function paymentsPage(Request $request)
    {
        try {
            $vendorId = Auth::id();
            $busIds = $this->vendorBusIds($vendorId);
            $trainIds = $this->vendorTrainIds($vendorId);

            $rows = $this->mergedBookingRows($busIds, $trainIds);

            $totalRevenue = $rows->where('paymentStatus', 'Paid')->sum('amount');
            $totalPending = $rows->whereIn('paymentStatus', ['Pending'])->sum('amount');
            $paidCount = $rows->where('paymentStatus', 'Paid')->count();
            $pendingCount = $rows->where('paymentStatus', 'Pending')->count();

            return Inertia::render('Web/home/vendors/ticketBooking/Payment', [
                'transactions' => $rows->values(),
                'stats' => [
                    'total_revenue' => (float) $totalRevenue,
                    'total_pending' => (float) $totalPending,
                    'paid_count' => $paidCount,
                    'pending_count' => $pendingCount,
                ],
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/ticketBooking/Payment', [
                'transactions' => [],
                'stats' => ['total_revenue' => 0, 'total_pending' => 0, 'paid_count' => 0, 'pending_count' => 0],
                'server_error' => 'Failed to load payments. Check logs.',
            ]);
        }
    }

    public function calendarPage(Request $request)
    {
        try {
            $vendorId = Auth::id();
            $busIds = $this->vendorBusIds($vendorId);
            $trainIds = $this->vendorTrainIds($vendorId);

            $month = (int) $request->get('month', now()->month);
            $year = (int) $request->get('year', now()->year);
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = Carbon::create($year, $month, 1)->endOfMonth();

            $busSchedules = \App\Models\BusSchedule::whereIn('bus_id', $busIds)
                ->whereBetween('date', [$start, $end])
                ->with(['bus', 'departureStation', 'arrivalStation'])
                ->get()
                ->map(fn ($s) => [
                    'id' => 'bus-' . $s->id,
                    'title' => $s->bus?->name ?: 'Bus',
                    'type' => 'bus',
                    'date' => optional($s->date)->format('Y-m-d'),
                    'departureTime' => optional($s->departure_time)->format('H:i'),
                    'route' => trim(($s->departureStation?->name ?? '—') . ' → ' . ($s->arrivalStation?->name ?? '—')),
                    'status' => $s->status,
                    'bookingsCount' => $s->bookings()->count(),
                ]);

            $trainSchedules = \App\Models\TrainSchedule::whereIn('train_id', $trainIds)
                ->whereBetween('date', [$start, $end])
                ->with(['train', 'departureStation', 'arrivalStation'])
                ->get()
                ->map(fn ($s) => [
                    'id' => 'train-' . $s->id,
                    'title' => $s->train?->name ?: 'Train',
                    'type' => 'train',
                    'date' => optional($s->date)->format('Y-m-d'),
                    'departureTime' => optional($s->departure_time)->format('H:i'),
                    'route' => trim(($s->departureStation?->name ?? '—') . ' → ' . ($s->arrivalStation?->name ?? '—')),
                    'status' => $s->status,
                    'bookingsCount' => $s->bookings()->count(),
                ]);

            return Inertia::render('Web/home/vendors/ticketBooking/Calendar', [
                'events' => $busSchedules->merge($trainSchedules)->values(),
                'currentMonth' => $month,
                'currentYear' => $year,
            ]);
        } catch (Throwable $e) {
            report($e);

            return Inertia::render('Web/home/vendors/ticketBooking/Calendar', [
                'events' => [],
                'currentMonth' => now()->month,
                'currentYear' => now()->year,
                'server_error' => 'Failed to load calendar. Check logs.',
            ]);
        }
    }
}
