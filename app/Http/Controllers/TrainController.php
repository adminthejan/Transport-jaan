<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\TrainSchedule;
use App\Models\TrainStation;
use App\Models\Train;
use App\Models\TrainBooking;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use App\Services\CancellationPolicyService;

class TrainController extends Controller
{
    public function search(Request $request)
    {
        $fromStation = $request->input('from');
        $toStation = $request->input('to');
        $departureDate = $request->input('departureDate');
        $returnDate = $request->input('returnDate');
        $tripType = $request->input('tripType', 'oneway');
        // Same guard as preview() below — query params are user-controllable
        // and a bad frontend link has sent the literal string "undefined" here.
        $toCount = function ($value, int $default): int {
            return is_numeric($value) ? max(0, (int) $value) : $default;
        };
        $adults = max(1, $toCount($request->input('adults'), 1));
        $children = $toCount($request->input('children'), 0);
        $infants = $toCount($request->input('infants'), 0);
        $seniors = $toCount($request->input('seniors'), 0);
        $student = $request->boolean('student');
        $wheelchair = $request->boolean('wheelchair');

        // Parse station names and get station IDs
        $fromStationRecord = null;
        $toStationRecord = null;

        if ($fromStation) {
            $fromStationName = $this->extractStationName($fromStation);
            $fromStationRecord = TrainStation::where('name', 'like', '%' . $fromStationName . '%')->first();
        }

        if ($toStation) {
            $toStationName = $this->extractStationName($toStation);
            $toStationRecord = TrainStation::where('name', 'like', '%' . $toStationName . '%')->first();
        }

        $outboundSchedules = collect();
        $returnSchedules = collect();
        $route = null;
        $nearbyDates = [];

        // Check if any search criteria is provided
        $hasSearchCriteria = $fromStation || $toStation || $departureDate;

        if ($hasSearchCriteria && $fromStationRecord && $toStationRecord && $departureDate) {
            $route = $this->routeCoordinates($fromStationRecord, $toStationRecord);
            $nearbyDates = $this->nearbyDatePrices($fromStationRecord->id, $toStationRecord->id, $departureDate);

            // Get filtered outbound schedules based on search criteria
            $outboundSchedules = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                ->where('departure_station_id', $fromStationRecord->id)
                ->where('arrival_station_id', $toStationRecord->id)
                ->where('date', Carbon::parse($departureDate)->format('Y-m-d'))
                ->where('status', 'active')
                ->get()
                ->map(function ($schedule) {
                    return [
                        'id' => $schedule->id,
                        'name' => $schedule->train->name,
                        'class' => $schedule->train->class_type,
                        'route' => 'Route number: ' . $schedule->train->route_number,
                        'depart' => Carbon::parse($schedule->departure_time)->format('g:i A'),
                        'arrive' => Carbon::parse($schedule->arrival_time)->format('g:i A'),
                        'date' => Carbon::parse($schedule->date)->format('j M'),
                        'duration' => $this->formatDuration($schedule->duration_minutes),
                        'price' => $schedule->price,
                        'available_seats' => $schedule->available_seats,
                        'total_capacity' => $schedule->train->capacity,
                        'status' => $schedule->available_seats > 0 ? 'Book Now' : 'Sold Out',
                        'soldOut' => $schedule->available_seats == 0,
                        'facilities' => $schedule->train->facilities ?? [],
                        'train_number' => $schedule->train->train_number,
                        'operator' => $schedule->train->operator,
                    ];
                });

            // Get return schedules for round trip
            if ($tripType === 'roundtrip' && $returnDate) {
                $returnSchedules = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                    ->where('departure_station_id', $toStationRecord->id)
                    ->where('arrival_station_id', $fromStationRecord->id)
                    ->where('date', Carbon::parse($returnDate)->format('Y-m-d'))
                    ->where('status', 'active')
                    ->get()
                    ->map(function ($schedule) {
                        return [
                            'id' => $schedule->id,
                            'name' => $schedule->train->name,
                            'class' => $schedule->train->class_type,
                            'route' => 'Route number: ' . $schedule->train->route_number,
                            'depart' => Carbon::parse($schedule->departure_time)->format('g:i A'),
                            'arrive' => Carbon::parse($schedule->arrival_time)->format('g:i A'),
                            'date' => Carbon::parse($schedule->date)->format('j M'),
                            'duration' => $this->formatDuration($schedule->duration_minutes),
                            'price' => $schedule->price,
                            'available_seats' => $schedule->available_seats,
                            'total_capacity' => $schedule->train->capacity,
                            'status' => $schedule->available_seats > 0 ? 'Book Now' : 'Sold Out',
                            'soldOut' => $schedule->available_seats == 0,
                            'facilities' => $schedule->train->facilities ?? [],
                            'train_number' => $schedule->train->train_number,
                            'operator' => $schedule->train->operator,
                        ];
                    });
            }
        } elseif (!$hasSearchCriteria) {
            // If no search criteria provided, show all available trains
            $outboundSchedules = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                ->where('status', 'active')
                ->where('date', '>=', Carbon::today()->format('Y-m-d'))
                ->orderBy('date')
                ->orderBy('departure_time')
                ->limit(20) // Limit to prevent overwhelming the UI
                ->get()
                ->map(function ($schedule) {
                    return [
                        'id' => $schedule->id,
                        'name' => $schedule->train->name,
                        'class' => $schedule->train->class_type,
                        'route' => 'Route number: ' . $schedule->train->route_number,
                        'depart' => Carbon::parse($schedule->departure_time)->format('g:i A'),
                        'arrive' => Carbon::parse($schedule->arrival_time)->format('g:i A'),
                        'date' => Carbon::parse($schedule->date)->format('j M'),
                        'duration' => $this->formatDuration($schedule->duration_minutes),
                        'price' => $schedule->price,
                        'available_seats' => $schedule->available_seats,
                        'total_capacity' => $schedule->train->capacity,
                        'status' => $schedule->available_seats > 0 ? 'Book Now' : 'Sold Out',
                        'soldOut' => $schedule->available_seats == 0,
                        'facilities' => $schedule->train->facilities ?? [],
                        'train_number' => $schedule->train->train_number,
                        'operator' => $schedule->train->operator,
                    ];
                });
        }

        return Inertia::render('Web/home/ticketBooking/TrainTicketBookingDetails', [
            'searchParams' => [
                'from' => $fromStation,
                'to' => $toStation,
                'departureDate' => $departureDate,
                'returnDate' => $returnDate,
                'tripType' => $tripType,
                'adults' => (int)$adults,
                'children' => (int)$children,
                'infants' => (int)$infants,
                'seniors' => (int)$seniors,
                'student' => $student,
                'wheelchair' => $wheelchair,
            ],
            'outboundSchedules' => $outboundSchedules,
            'returnSchedules' => $returnSchedules,
            'route' => $route,
            'nearbyDates' => $nearbyDates,
            'fromStationName' => $fromStationRecord ? $fromStationRecord->name : $fromStation,
            'toStationName' => $toStationRecord ? $toStationRecord->name : $toStation,
            'hasActiveFilters' => $hasSearchCriteria && ($fromStationRecord && $toStationRecord && $departureDate),
            'isShowingAllTrains' => !$hasSearchCriteria,
        ]);
    }

    /**
     * Return train ticket booking data as JSON for inline rendering
     */
    public function searchJson(Request $request)
    {
        $outboundSchedules = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
            ->where('status', 'active')
            ->where('date', '>=', \Carbon\Carbon::today()->format('Y-m-d'))
            ->orderBy('date')
            ->orderBy('departure_time')
            ->limit(20)
            ->get()
            ->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'name' => $schedule->train->name,
                    'class' => $schedule->train->class_type,
                    'route' => 'Route number: ' . $schedule->train->route_number,
                    'depart' => \Carbon\Carbon::parse($schedule->departure_time)->format('g:i A'),
                    'arrive' => \Carbon\Carbon::parse($schedule->arrival_time)->format('g:i A'),
                    'date' => \Carbon\Carbon::parse($schedule->date)->format('j M'),
                    'duration' => $this->formatDuration($schedule->duration_minutes),
                    'price' => $schedule->price,
                    'available_seats' => $schedule->available_seats,
                    'total_capacity' => $schedule->train->capacity,
                    'status' => $schedule->available_seats > 0 ? 'Book Now' : 'Sold Out',
                    'soldOut' => $schedule->available_seats == 0,
                    'facilities' => $schedule->train->facilities ?? [],
                    'train_number' => $schedule->train->train_number,
                    'operator' => $schedule->train->operator,
                ];
            });

        return response()->json([
            'searchParams' => [],
            'outboundSchedules' => $outboundSchedules,
            'returnSchedules' => [],
            'fromStationName' => '',
            'toStationName' => '',
            'hasActiveFilters' => false,
            'isShowingAllTrains' => true,
        ]);
    }

    public function preview(Request $request)
    {
        $scheduleId = $request->input('schedule_id');
        $returnScheduleId = $request->input('return_schedule_id');
        // Query params are user-controllable and have shown up here as the
        // literal string "undefined" (a frontend link built from an unset JS
        // value) — is_numeric guards against that and anything else garbage
        // instead of trusting whatever arrives.
        $toCount = function ($value, int $default): int {
            return is_numeric($value) ? max(0, (int) $value) : $default;
        };
        $adults = max(1, $toCount($request->input('adults'), 1));
        $children = $toCount($request->input('children'), 0);
        $infants = $toCount($request->input('infants'), 0);

        $outboundSchedule = null;
        $returnSchedule = null;

        if ($scheduleId) {
            $outboundSchedule = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                ->find($scheduleId);
        }

        if ($returnScheduleId) {
            $returnSchedule = TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                ->find($returnScheduleId);
        }

        $totalPrice = 0;
        if ($outboundSchedule) {
            $totalPrice += ($outboundSchedule->price * $adults) +
                          ($outboundSchedule->price * 0.5 * $children); // 50% for children
        }
        if ($returnSchedule) {
            $totalPrice += ($returnSchedule->price * $adults) +
                          ($returnSchedule->price * 0.5 * $children);
        }

        return Inertia::render('Web/home/ticketBooking/TrainTicketBookingPreview', [
            'outboundSchedule' => $outboundSchedule ? [
                'id' => $outboundSchedule->id,
                'train_name' => $outboundSchedule->train->name,
                'train_number' => $outboundSchedule->train->train_number,
                'class' => $outboundSchedule->train->class_type,
                'departure_station' => $outboundSchedule->departureStation->name,
                'arrival_station' => $outboundSchedule->arrivalStation->name,
                'departure_time' => Carbon::parse($outboundSchedule->departure_time)->format('H:i'),
                'arrival_time' => Carbon::parse($outboundSchedule->arrival_time)->format('H:i'),
                'date' => Carbon::parse($outboundSchedule->date)->format('M j, Y'),
                'duration' => $this->formatDuration($outboundSchedule->duration_minutes),
                'price' => $outboundSchedule->price,
                'route' => $this->routeCoordinates($outboundSchedule->departureStation, $outboundSchedule->arrivalStation),
            ] : null,
            'returnSchedule' => $returnSchedule ? [
                'id' => $returnSchedule->id,
                'train_name' => $returnSchedule->train->name,
                'train_number' => $returnSchedule->train->train_number,
                'class' => $returnSchedule->train->class_type,
                'departure_station' => $returnSchedule->departureStation->name,
                'arrival_station' => $returnSchedule->arrivalStation->name,
                'departure_time' => Carbon::parse($returnSchedule->departure_time)->format('H:i'),
                'arrival_time' => Carbon::parse($returnSchedule->arrival_time)->format('H:i'),
                'date' => Carbon::parse($returnSchedule->date)->format('M j, Y'),
                'duration' => $this->formatDuration($returnSchedule->duration_minutes),
                'price' => $returnSchedule->price,
                'route' => $this->routeCoordinates($returnSchedule->departureStation, $returnSchedule->arrivalStation),
            ] : null,
            'passengers' => [
                'adults' => (int)$adults,
                'children' => (int)$children,
                'infants' => (int)$infants,
                'total' => (int)$adults + (int)$children + (int)$infants,
            ],
            'totalPrice' => $totalPrice,
            'tripType' => $returnSchedule ? 'roundtrip' : 'oneway',
        ]);
    }

    /**
     * Cheapest fare per day around the searched date, so the results page can
     * offer a "browse nearby dates" strip instead of locking the client into
     * only the exact date they searched. Mirrors BusBookingController's
     * nearbyDatePrices().
     */
    private function nearbyDatePrices(int $departureStationId, int $arrivalStationId, string $date): array
    {
        $centre = Carbon::parse($date);
        $today = Carbon::today();

        $start = $centre->copy()->subDay()->max($today);
        $dates = collect(range(0, 6))
            ->map(fn ($i) => $start->copy()->addDays($i)->toDateString())
            ->unique()
            ->values();

        $priceByDate = TrainSchedule::where('departure_station_id', $departureStationId)
            ->where('arrival_station_id', $arrivalStationId)
            ->whereIn('date', $dates)
            ->where('status', 'active')
            ->select('date', DB::raw('MIN(price) as min_price'))
            ->groupBy('date')
            ->pluck('min_price', 'date');

        return $dates->map(fn ($d) => [
            'date' => $d,
            'price' => isset($priceByDate[$d]) ? (float) $priceByDate[$d] : null,
        ])->all();
    }

    /**
     * Origin/destination lat-lng pair for rendering a route on the trip map.
     */
    private function routeCoordinates($departureStation, $arrivalStation): ?array
    {
        if (!$departureStation->latitude || !$arrivalStation->latitude) {
            return null;
        }

        return [
            'origin' => [
                'lat' => (float) $departureStation->latitude,
                'lng' => (float) $departureStation->longitude,
                'label' => $departureStation->name,
            ],
            'destination' => [
                'lat' => (float) $arrivalStation->latitude,
                'lng' => (float) $arrivalStation->longitude,
                'label' => $arrivalStation->name,
            ],
        ];
    }

    public function store(Request $request)
    {
        // Check if the user is logged in
        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to make a booking.');
        }

        $request->validate([
            'train_schedule_id' => 'required|exists:train_schedules,id',
            'return_schedule_id' => 'nullable|exists:train_schedules,id|different:train_schedule_id',
            'passenger_name' => 'required|string|max:255',
            'passenger_email' => 'required|email|max:255',
            'passenger_phone' => 'required|string|max:20',
            'adults' => 'required|integer|min:1',
            'children' => 'nullable|integer|min:0',
            'infants' => 'nullable|integer|min:0',
        ]);

        $isRoundTrip = (bool) $request->return_schedule_id;
        $passengerData = $request->only(['passenger_name', 'passenger_email', 'passenger_phone']);
        $adults = $request->adults;
        $children = $request->children ?? 0;
        $infants = $request->infants ?? 0;

        try {
            // Both legs of a round trip are created in ONE transaction: either
            // both bookings succeed, or neither does — never a stranded outbound
            // leg with a failed return leg.
            $result = DB::transaction(function () use ($request, $passengerData, $adults, $children, $infants, $isRoundTrip) {
                $groupId = $isRoundTrip ? (string) \Illuminate\Support\Str::uuid() : null;
                $tripType = $isRoundTrip ? 'round_trip' : 'one_way';

                $outbound = $this->createTrainLegBooking(
                    $request->train_schedule_id,
                    $passengerData,
                    $adults,
                    $children,
                    $infants,
                    $tripType,
                    $groupId,
                    $isRoundTrip ? 'outbound' : null
                );

                $return = null;
                if ($isRoundTrip) {
                    $return = $this->createTrainLegBooking(
                        $request->return_schedule_id,
                        $passengerData,
                        $adults,
                        $children,
                        $infants,
                        $tripType,
                        $groupId,
                        'return'
                    );
                }

                return [$outbound, $return];
            });

            [$booking, $returnBooking] = $result;

            Log::info('Train booking created successfully', [
                'booking_id' => $booking->id,
                'reference' => $booking->booking_reference,
                'round_trip' => $isRoundTrip,
                'return_booking_id' => $returnBooking?->id,
            ]);

            $message = $isRoundTrip ? 'Round-trip train booking confirmed successfully!' : 'Train booking confirmed successfully!';

            return redirect()->route('train.booking.success', $booking->booking_reference)
                ->with('success', $message);

        } catch (ValidationException $e) {
            Log::warning('Train booking validation failed', ['errors' => $e->errors()]);
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Train booking failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors(['error' => 'An error occurred while processing your booking. Please try again.'])->withInput();
        }
    }

    /**
     * Validate + create a single train booking leg. Must be called inside a
     * DB transaction — the caller is responsible for wrapping this (and, for
     * round trips, the sibling leg) in one atomic transaction.
     */
    private function createTrainLegBooking(
        int $scheduleId,
        array $passengerData,
        int $adults,
        int $children,
        int $infants,
        string $tripType,
        ?string $groupId,
        ?string $leg
    ): TrainBooking {
        // Lock the schedule row for update to prevent concurrent modifications
        $schedule = TrainSchedule::where('id', $scheduleId)->lockForUpdate()->first();

        if (!$schedule) {
            throw ValidationException::withMessages([
                'schedule' => ['Schedule not found.']
            ]);
        }

        if ($schedule->status !== 'active') {
            throw ValidationException::withMessages([
                'schedule' => ['This schedule is not currently available for booking.']
            ]);
        }

        if (Carbon::parse($schedule->date)->isPast()) {
            throw ValidationException::withMessages([
                'schedule' => ['Cannot book a schedule in the past.']
            ]);
        }

        $totalPassengers = $adults + $children + $infants;

        if ($schedule->available_seats < $totalPassengers) {
            throw ValidationException::withMessages([
                'seats' => ["Only {$schedule->available_seats} seat(s) available. You requested {$totalPassengers} passengers."]
            ]);
        }

        // Calculate total amount from database (never trust client-side calculations)
        $totalAmount = ($schedule->price * $adults) + ($schedule->price * 0.5 * $children);

        $booking = TrainBooking::create(array_merge($passengerData, [
            'user_id' => Auth::id(),
            'train_schedule_id' => $scheduleId,
            'adults' => $adults,
            'children' => $children,
            'infants' => $infants,
            'total_passengers' => $totalPassengers,
            'total_amount' => $totalAmount,
            'trip_type' => $tripType,
            'round_trip_group_id' => $groupId,
            'leg' => $leg,
            'status' => 'pending', // Start as pending until payment
            'payment_status' => 'pending',
            'expires_at' => now()->addMinutes(15), // Booking expires in 15 minutes
        ]));

        $schedule->decrement('available_seats', $totalPassengers);

        return $booking;
    }

    public function bookingSuccess($reference)
    {
        $booking = TrainBooking::with(['trainSchedule.train', 'trainSchedule.departureStation', 'trainSchedule.arrivalStation'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        $returnBooking = $booking->round_trip_group_id
            ? TrainBooking::with(['trainSchedule.train', 'trainSchedule.departureStation', 'trainSchedule.arrivalStation'])
                ->where('round_trip_group_id', $booking->round_trip_group_id)
                ->where('id', '!=', $booking->id)
                ->first()
            : null;

        return Inertia::render('Web/home/ticketBooking/TrainBookingSuccess', [
            'booking' => $this->formatTrainBookingForDisplay($booking),
            'returnBooking' => $returnBooking ? $this->formatTrainBookingForDisplay($returnBooking) : null,
        ]);
    }

    private function formatTrainBookingForDisplay(TrainBooking $booking): array
    {
        return [
            'reference' => $booking->booking_reference,
            'passenger_name' => $booking->passenger_name,
            'passenger_email' => $booking->passenger_email,
            'passenger_phone' => $booking->passenger_phone,
            'total_amount' => $booking->total_amount,
            'adults' => $booking->adults,
            'children' => $booking->children,
            'infants' => $booking->infants,
            'status' => $booking->status,
            'trip_type' => $booking->trip_type,
            'leg' => $booking->leg,
            'train' => [
                'name' => $booking->trainSchedule->train->name,
                'number' => $booking->trainSchedule->train->train_number,
                'class' => $booking->trainSchedule->train->class_type,
            ],
            'schedule' => [
                'departure_station' => $booking->trainSchedule->departureStation->name,
                'arrival_station' => $booking->trainSchedule->arrivalStation->name,
                'departure_time' => Carbon::parse($booking->trainSchedule->departure_time)->format('H:i'),
                'arrival_time' => Carbon::parse($booking->trainSchedule->arrival_time)->format('H:i'),
                'date' => Carbon::parse($booking->trainSchedule->date)->format('M j, Y'),
                'duration' => $this->formatDuration($booking->trainSchedule->duration_minutes),
            ]
        ];
    }

    private function extractStationName($stationString)
    {
        // Extract station name from "Station Name (CODE)" format
        if (preg_match('/^(.+?)\s*\([A-Z]+\)$/', $stationString, $matches)) {
            return trim($matches[1]);
        }
        return $stationString;
    }

    private function formatDuration($minutes)
    {
        $hours = floor($minutes / 60);
        $mins = $minutes % 60;

        if ($hours > 0) {
            return sprintf('%dh %dm', $hours, $mins);
        }
        return sprintf('%dm', $mins);
    }

    /**
     * Get cancellation policy for a train booking
     */
    public function getCancellationPolicy($reference)
    {
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to view cancellation policy.');
        }

        $booking = TrainBooking::with(['trainSchedule'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        if ($booking->user_id !== Auth::id()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            if (!$cancellationService->canCancel('train', $booking)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This booking cannot be cancelled.',
                    'can_cancel' => false
                ]);
            }

            $refundDetails = $cancellationService->calculateRefund('train', $booking);

            return response()->json([
                'success' => true,
                'can_cancel' => true,
                'refund_details' => $refundDetails
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get cancellation policy', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve cancellation policy.'
            ], 500);
        }
    }

    /**
     * Cancel a train booking
     */
    public function cancelBooking(Request $request, $reference)
    {
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to cancel your booking.');
        }

        $booking = TrainBooking::where('booking_reference', $reference)->firstOrFail();

        if ($booking->user_id !== Auth::id()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            $result = $cancellationService->cancelBooking(
                'train',
                $reference,
                Auth::id(),
                $validated['reason'] ?? null
            );

            if ($result['success']) {
                Log::info('Train booking cancelled successfully', [
                    'reference' => $reference,
                    'user_id' => Auth::id()
                ]);

                if (request()->expectsJson()) {
                    return response()->json($result);
                }

                return redirect()->route('dashboard')
                    ->with('success', $result['message']);
            } else {
                if (request()->expectsJson()) {
                    return response()->json($result, 400);
                }

                return back()->withErrors(['error' => $result['message']]);
            }

        } catch (\Exception $e) {
            Log::error('Train booking cancellation failed', [
                'reference' => $reference,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to cancel booking. Please try again.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to cancel booking. Please try again.']);
        }
    }
}
