<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\BusSchedule;
use App\Models\BusStation;
use App\Models\BusBooking;
use App\Services\BookingReferenceGenerator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Services\CancellationPolicyService;

class BusBookingController extends Controller
{
    /**
     * Search for bus schedules based on criteria
     */
    public function search(Request $request)
    {
        $from = $request->input('from');
        $to = $request->input('to');
        $date = $request->input('date');
        $tripType = $request->input('tripType', 'oneway');
        $returnDate = $request->input('returnDate');

        // Get stations for dropdown
        $stations = BusStation::where('status', 'active')->get();

        $schedules = collect();
        $returnSchedules = collect();
        $route = null;
        $nearbyDates = [];

        if ($from && $to && $date) {
            // Find departure and arrival stations
            $departureStation = BusStation::where('name', $from)->first();
            $arrivalStation = BusStation::where('name', $to)->first();

            if ($departureStation && $arrivalStation) {
                $schedules = $this->findBusSchedules($departureStation->id, $arrivalStation->id, $date);
                $route = $this->routeCoordinates($departureStation, $arrivalStation);
                $nearbyDates = $this->nearbyDatePrices($departureStation->id, $arrivalStation->id, $date);

                if ($tripType === 'roundtrip' && $returnDate) {
                    $returnSchedules = $this->findBusSchedules($arrivalStation->id, $departureStation->id, $returnDate);
                }
            }
        }

        return Inertia::render('Web/home/ticketBooking/BusTicketBookingDetails', [
            'stations' => $stations,
            'schedules' => $schedules,
            'returnSchedules' => $returnSchedules,
            'route' => $route,
            'nearbyDates' => $nearbyDates,
            'searchParams' => [
                'from' => $from,
                'to' => $to,
                'date' => $date,
                'returnDate' => $returnDate,
                'tripType' => $tripType,
            ]
        ]);
    }

    /**
     * Cheapest fare per day around the searched date, so the results page can
     * offer a "browse nearby dates" strip instead of locking the client into
     * only the exact date they searched.
     */
    private function nearbyDatePrices(int $departureStationId, int $arrivalStationId, string $date): array
    {
        $centre = Carbon::parse($date);
        $today = Carbon::today();

        // One day back (if not in the past) through five days ahead — mirrors
        // the reference layout of the searched date near the left of the strip.
        $start = $centre->copy()->subDay()->max($today);
        $dates = collect(range(0, 6))
            ->map(fn ($i) => $start->copy()->addDays($i)->toDateString())
            ->unique()
            ->values();

        $priceByDate = BusSchedule::where('departure_station_id', $departureStationId)
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

    private function findBusSchedules(int $departureStationId, int $arrivalStationId, string $date)
    {
        return BusSchedule::with(['bus', 'departureStation', 'arrivalStation'])
            ->where('departure_station_id', $departureStationId)
            ->where('arrival_station_id', $arrivalStationId)
            ->where('date', $date)
            ->where('status', 'active')
            ->orderBy('departure_time')
            ->get()
            ->map(function ($schedule) {
                return [
                    'id' => $schedule->id,
                    'operator' => $schedule->bus->operator,
                    'busType' => $schedule->bus->bus_type,
                    'routeNo' => $schedule->bus->route_number,
                    'busNo' => $schedule->bus->bus_number,
                    'depart' => date('g:i A', strtotime($schedule->departure_time)),
                    'arrive' => date('g:i A', strtotime($schedule->arrival_time)),
                    'day' => date('j M', strtotime($schedule->date)),
                    'duration' => $this->calculateDuration($schedule->departure_time, $schedule->arrival_time),
                    'price' => $schedule->price,
                    'seatsAvailable' => $schedule->available_seats,
                    'totalSeats' => $schedule->bus->capacity,
                    'expressway' => $schedule->is_expressway,
                    'soldOut' => $schedule->available_seats <= 0,
                    'facilities' => $schedule->bus->facilities ?? [],
                    'departureStation' => $schedule->departureStation->name,
                    'arrivalStation' => $schedule->arrivalStation->name,
                ];
            });
    }

    /**
     * Return ticket booking data as JSON for inline rendering
     */
    public function searchJson(Request $request)
    {
        $stations = BusStation::where('status', 'active')->get();

        return response()->json([
            'stations' => $stations,
            'schedules' => [],
            'searchParams' => [
                'from' => $request->input('from'),
                'to' => $request->input('to'),
                'date' => $request->input('date'),
            ]
        ]);
    }

    /**
     * Display the booking preview page with seat selection
     */
    public function preview(Request $request)
    {
        $scheduleId = $request->get('id');
        $returnScheduleId = $request->get('return_id');
        $searchParams = [
            'from' => $request->get('from'),
            'to' => $request->get('to'),
            'date' => $request->get('date'),
            'passengers' => $request->get('passengers', 1),
            'tripType' => $returnScheduleId ? 'roundtrip' : 'oneway',
        ];

        $outbound = $this->buildTripPreview($scheduleId);
        $return = $this->buildTripPreview($returnScheduleId);

        return Inertia::render('Web/home/ticketBooking/BusTicketBookingPreview', [
            'trip' => $outbound['tripData'],
            'bookedSeats' => $outbound['bookedSeats'],
            'bookedSeatGenders' => $outbound['bookedSeatGenders'],
            'seatLayout' => $outbound['seatLayout'],
            'returnTrip' => $return['tripData'],
            'returnBookedSeats' => $return['bookedSeats'],
            'returnBookedSeatGenders' => $return['bookedSeatGenders'],
            'returnSeatLayout' => $return['seatLayout'],
            'searchParams' => $searchParams,
        ]);
    }

    /**
     * Build the trip card + seat map data for a single schedule (used for
     * both the outbound and, when present, return leg of a round trip).
     */
    private function buildTripPreview(?string $scheduleId): array
    {
        if (!$scheduleId) {
            return ['tripData' => null, 'bookedSeats' => [], 'bookedSeatGenders' => [], 'seatLayout' => null];
        }

        $schedule = BusSchedule::with(['bus', 'departureStation', 'arrivalStation'])->find($scheduleId);

        if (!$schedule) {
            return ['tripData' => null, 'bookedSeats' => [], 'bookedSeatGenders' => [], 'seatLayout' => null];
        }

        // Get all booked seats for this schedule, plus which gender booked each
        // one (so the seat map can be colour-coded, not just greyed out).
        $existingBookings = BusBooking::where('bus_schedule_id', $schedule->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->get(['seat_numbers', 'seat_genders']);

        $bookedSeats = $existingBookings->pluck('seat_numbers')->flatten()->toArray();

        $bookedSeatGenders = [];
        foreach ($existingBookings as $booking) {
            foreach (($booking->seat_genders ?? []) as $seatNum => $gender) {
                $bookedSeatGenders[$seatNum] = $gender;
            }
        }

        // Get seat layout configuration from bus
        $busCapacity = $schedule->bus->capacity ?? 52;
        $seatLayout = [
            'rows' => ceil($busCapacity / 4), // 4 seats per row (2+2)
            'columns' => 4,
            'totalSeats' => $busCapacity,
            'aisle' => 2, // Aisle after 2nd column
        ];

        $tripData = [
            'id' => $schedule->id,
            'operator' => $schedule->bus->operator,
            'busType' => $schedule->bus->bus_type,
            'routeNo' => $schedule->bus->route_number,
            'busNo' => $schedule->bus->bus_number,
            'depart' => date('g:i A', strtotime($schedule->departure_time)),
            'arrive' => date('g:i A', strtotime($schedule->arrival_time)),
            'day' => date('j M', strtotime($schedule->date)),
            'duration' => $this->calculateDuration($schedule->departure_time, $schedule->arrival_time),
            'price' => $schedule->price,
            'seatsAvailable' => $schedule->available_seats,
            'totalSeats' => $schedule->bus->capacity,
            'expressway' => $schedule->is_expressway,
            'soldOut' => $schedule->available_seats <= 0,
            'facilities' => $schedule->bus->facilities ?? [],
            'departureStation' => $schedule->departureStation->name,
            'arrivalStation' => $schedule->arrivalStation->name,
            'route' => $this->routeCoordinates($schedule->departureStation, $schedule->arrivalStation),
            'boardingPoints' => $this->nearbyStopNames($schedule->departureStation),
            'dropoffPoints' => $this->nearbyStopNames($schedule->arrivalStation),
        ];

        return [
            'tripData' => $tripData,
            'bookedSeats' => $bookedSeats,
            'bookedSeatGenders' => $bookedSeatGenders,
            'seatLayout' => $seatLayout,
        ];
    }

    /**
     * Boarding/drop-off point choices for a leg of the trip: other bus stations
     * in the same city as the schedule's station, standing in for sub-stops
     * along that end of the route. Always includes the station itself first.
     */
    private function nearbyStopNames($station): array
    {
        $others = BusStation::where('city', $station->city)
            ->where('id', '!=', $station->id)
            ->orderBy('name')
            ->pluck('name')
            ->all();

        return array_values(array_unique(array_merge([$station->name], $others)));
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

    /**
     * Store a new booking with race condition protection
     */
    public function store(Request $request)
    {
        // Check if the user is logged in
        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to make a booking.');
        }

        // Handle JSON requests
        if ($request->isJson()) {
            $data = $request->json()->all();
            // Manually set the request values
            foreach ($data as $key => $value) {
                $request->merge([$key => $value]);
            }
        }

        // Log received data for debugging
        Log::info('Bus booking request data:', $request->all());

        $isRoundTrip = (bool) $request->return_schedule_id;

        try {
            $rules = [
                'schedule_id' => 'required|exists:bus_schedules,id',
                'passenger_name' => 'required|string|max:255',
                'passenger_email' => 'nullable|email|max:255',
                'passenger_phone' => 'required|string|max:20',
                'seat_numbers' => 'required',
                'seat_genders' => 'nullable',
                'passenger_count' => 'required|integer|min:1',
                'boarding_point' => 'required|string|max:255',
                'destination_point' => 'required|string|max:255',
            ];

            if ($isRoundTrip) {
                $rules['return_schedule_id'] = 'required|exists:bus_schedules,id|different:schedule_id';
                $rules['return_seat_numbers'] = 'required';
                $rules['return_seat_genders'] = 'nullable';
            }

            $request->validate($rules);
        } catch (ValidationException $e) {
            Log::error('Bus booking validation failed:', $e->errors());

            if ($request->expectsJson() || $request->isJson() || $request->ajax()) {
                return response()->json(['errors' => $e->errors()], 422);
            }

            throw $e; // Re-throw for normal form processing
        }

        $seatNumbers = $this->parseSeatNumbers($request->seat_numbers);
        $returnSeatNumbers = $isRoundTrip ? $this->parseSeatNumbers($request->return_seat_numbers) : [];
        $seatGenders = $this->parseSeatGenders($request->seat_genders, $seatNumbers);
        $returnSeatGenders = $isRoundTrip ? $this->parseSeatGenders($request->return_seat_genders, $returnSeatNumbers) : [];

        $passengerData = $request->only(['passenger_name', 'passenger_email', 'passenger_phone', 'boarding_point', 'destination_point']);

        try {
            // Both legs of a round trip are created in ONE transaction: either
            // both bookings succeed, or neither does — never a stranded
            // outbound leg with a failed return leg.
            $result = DB::transaction(function () use ($request, $passengerData, $seatNumbers, $returnSeatNumbers, $seatGenders, $returnSeatGenders, $isRoundTrip) {
                $groupId = $isRoundTrip ? (string) \Illuminate\Support\Str::uuid() : null;
                $tripType = $isRoundTrip ? 'round_trip' : 'one_way';

                $outbound = $this->createBusLegBooking(
                    $request->schedule_id,
                    $passengerData,
                    $seatNumbers,
                    $seatGenders,
                    $request->passenger_count,
                    $tripType,
                    $groupId,
                    $isRoundTrip ? 'outbound' : null
                );

                $return = null;
                if ($isRoundTrip) {
                    $return = $this->createBusLegBooking(
                        $request->return_schedule_id,
                        $passengerData,
                        $returnSeatNumbers,
                        $returnSeatGenders,
                        $request->passenger_count,
                        $tripType,
                        $groupId,
                        'return'
                    );
                }

                return [$outbound, $return];
            });

            [$booking, $returnBooking] = $result;

            Log::info('Bus booking created successfully', [
                'booking_id' => $booking->id,
                'reference' => $booking->booking_reference,
                'round_trip' => $isRoundTrip,
                'return_booking_id' => $returnBooking?->id,
            ]);

            $message = $isRoundTrip ? 'Round-trip bus booking confirmed successfully!' : 'Bus booking confirmed successfully!';

            $successData = [
                'success' => true,
                'message' => $message,
                'reference' => $booking->booking_reference,
                'redirect' => route('bus.booking.success', $booking->booking_reference)
            ];

            if ($request->ajax() || $request->expectsJson() || $request->wantsJson() || $request->isJson()) {
                return response()->json($successData);
            }

            return redirect()->route('bus.booking.success', $booking->booking_reference)
                ->with('success', $message);

        } catch (ValidationException $e) {
            Log::warning('Bus booking validation failed within transaction', ['errors' => $e->errors()]);

            if ($request->ajax() || $request->expectsJson() || $request->wantsJson() || $request->isJson()) {
                return response()->json(['errors' => $e->errors()], 422);
            }

            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Bus booking failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $errorMessage = 'An error occurred while processing your booking. Please try again.';

            if ($request->ajax() || $request->expectsJson() || $request->wantsJson() || $request->isJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $errorMessage
                ], 500);
            }

            return back()->withErrors(['error' => $errorMessage])->withInput();
        }
    }

    private function parseSeatNumbers($raw): array
    {
        $seatNumbers = $raw;
        if (is_string($seatNumbers)) {
            $seatNumbers = json_decode($seatNumbers, true);
            // If JSON decode fails, treat it as a comma-separated list
            if ($seatNumbers === null) {
                $seatNumbers = explode(',', $raw);
            }
        }
        $seatNumbers = array_map('trim', $seatNumbers);
        return array_values(array_filter($seatNumbers));
    }

    /**
     * Normalizes the seat -> gender map submitted with a booking. Any seat
     * missing a valid male/female value is dropped rather than trusted as-is.
     */
    private function parseSeatGenders($raw, array $seatNumbers): array
    {
        $genders = $raw;
        if (is_string($genders)) {
            $genders = json_decode($genders, true) ?? [];
        }
        if (!is_array($genders)) {
            $genders = [];
        }

        $normalized = [];
        foreach ($seatNumbers as $seatNum) {
            $value = strtolower((string) ($genders[$seatNum] ?? ''));
            if (in_array($value, ['male', 'female'], true)) {
                $normalized[$seatNum] = $value;
            }
        }

        return $normalized;
    }

    /**
     * Validate + create a single bus booking leg (with full seat-collision
     * protection). Must be called inside a DB transaction — the caller is
     * responsible for wrapping this (and, for round trips, the sibling leg)
     * in one atomic transaction.
     */
    private function createBusLegBooking(
        int $scheduleId,
        array $passengerData,
        array $seatNumbers,
        array $seatGenders,
        int $passengerCount,
        string $tripType,
        ?string $groupId,
        ?string $leg
    ): BusBooking {
        // Lock the schedule row for update to prevent concurrent modifications
        $schedule = BusSchedule::where('id', $scheduleId)->lockForUpdate()->first();

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

        if ($schedule->available_seats < $passengerCount) {
            throw ValidationException::withMessages([
                'seats' => ["Only {$schedule->available_seats} seat(s) available. You requested {$passengerCount}"]
            ]);
        }

        // Check for seat collision - verify requested seats aren't already booked
        $bookedSeats = BusBooking::where('bus_schedule_id', $schedule->id)
            ->whereIn('status', ['confirmed', 'pending'])
            ->get()
            ->pluck('seat_numbers')
            ->flatten()
            ->toArray();

        $conflicts = array_intersect($seatNumbers, $bookedSeats);
        if (!empty($conflicts)) {
            throw ValidationException::withMessages([
                'seats' => ['The following seats are already booked: ' . implode(', ', $conflicts) . '. Please select different seats.']
            ]);
        }

        if (count($seatNumbers) !== $passengerCount) {
            throw ValidationException::withMessages([
                'seats' => ['Number of selected seats must match passenger count.']
            ]);
        }

        $busCapacity = $schedule->bus->capacity ?? 50;
        foreach ($seatNumbers as $seatNum) {
            if (is_numeric($seatNum) && $seatNum > $busCapacity) {
                throw ValidationException::withMessages([
                    'seats' => ['Invalid seat number: ' . $seatNum . '. Bus capacity is ' . $busCapacity]
                ]);
            }
        }

        // Calculate total price from database (never trust client-side calculations)
        $totalPrice = $schedule->price * $passengerCount;

        $booking = BusBooking::create(array_merge($passengerData, [
            'user_id' => Auth::id(),
            'bus_schedule_id' => $schedule->id,
            'seat_numbers' => $seatNumbers,
            'seat_genders' => $seatGenders,
            'passenger_count' => $passengerCount,
            'total_price' => $totalPrice,
            'booking_reference' => BusBooking::generateBookingReference(),
            'booking_date' => now(),
            'trip_type' => $tripType,
            'round_trip_group_id' => $groupId,
            'leg' => $leg,
            'status' => 'pending', // Start as pending until payment
            'payment_status' => 'pending',
            'expires_at' => now()->addMinutes(15), // Booking expires in 15 minutes
        ]));

        $schedule->decrement('available_seats', $passengerCount);

        return $booking;
    }

    /**
     * Display booking success page
     */
    public function bookingSuccess($reference)
    {
        $booking = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        $returnBooking = $booking->round_trip_group_id
            ? BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation'])
                ->where('round_trip_group_id', $booking->round_trip_group_id)
                ->where('id', '!=', $booking->id)
                ->first()
            : null;

        return Inertia::render('Web/home/ticketBooking/BusBookingSuccess', [
            'booking' => $this->formatBusBookingForDisplay($booking),
            'returnBooking' => $returnBooking ? $this->formatBusBookingForDisplay($returnBooking) : null,
        ]);
    }

    private function formatBusBookingForDisplay(BusBooking $booking): array
    {
        return [
            'reference' => $booking->booking_reference,
            'passengerName' => $booking->passenger_name,
            'passengerEmail' => $booking->passenger_email,
            'passengerPhone' => $booking->passenger_phone,
            'seats' => $booking->seat_numbers,
            'totalPrice' => $booking->total_price,
            'status' => $booking->status,
            'tripType' => $booking->trip_type,
            'leg' => $booking->leg,
            'busOperator' => $booking->busSchedule->bus->operator,
            'busNumber' => $booking->busSchedule->bus->bus_number,
            'busType' => $booking->busSchedule->bus->bus_type,
            'departureStation' => $booking->busSchedule->departureStation->name,
            'arrivalStation' => $booking->busSchedule->arrivalStation->name,
            'departureDate' => Carbon::parse($booking->busSchedule->date)->format('j M Y'),
            'departureTime' => Carbon::parse($booking->busSchedule->departure_time)->format('g:i A'),
            'arrivalTime' => Carbon::parse($booking->busSchedule->arrival_time)->format('g:i A'),
        ];
    }

    /**
     * Download ticket as PDF
     */
    public function downloadTicket($reference)
    {
        // Check if user is logged in
        if (!Auth::check()) {
            return redirect()->route('signin')->with('message', 'Please log in to download your ticket.');
        }

        $booking = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation', 'user'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        // Verify ownership
        if ($booking->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to ticket.');
        }

        try {
            $ticketService = app(\App\Services\TicketGenerationService::class);
            $result = $ticketService->generateBusTicket($booking);

            return response()->download($result['path'], "{$reference}.pdf", [
                'Content-Type' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            Log::error('Ticket download failed', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return back()->withErrors(['error' => 'Failed to generate ticket. Please try again.']);
        }
    }

    /**
     * View ticket in browser
     */
    public function viewTicket($reference)
    {
        // Check if user is logged in
        if (!Auth::check()) {
            return redirect()->route('signin')->with('message', 'Please log in to view your ticket.');
        }

        $booking = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation', 'user'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        // Verify ownership
        if ($booking->user_id !== Auth::id()) {
            abort(403, 'Unauthorized access to ticket.');
        }

        try {
            $ticketService = app(\App\Services\TicketGenerationService::class);
            $result = $ticketService->generateBusTicket($booking);

            return response()->file($result['path'], [
                'Content-Type' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            Log::error('Ticket view failed', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return back()->withErrors(['error' => 'Failed to generate ticket. Please try again.']);
        }
    }

    /**
     * Email ticket to customer
     */
    public function emailTicket($reference)
    {
        // Check if user is logged in
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to email your ticket.');
        }

        $booking = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation', 'user'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        // Verify ownership
        if ($booking->user_id !== Auth::id()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access to ticket.');
        }

        try {
            $ticketService = app(\App\Services\TicketGenerationService::class);
            $result = $ticketService->generateBusTicket($booking);

            // Send email with ticket attachment
            $email = $booking->passenger_email ?? $booking->user->email;
            
            if (!$email) {
                throw new \Exception('No email address available for this booking.');
            }

            Mail::send('emails.ticket', [
                'booking' => $booking,
                'reference' => $reference
            ], function ($message) use ($email, $result, $reference) {
                $message->to($email)
                    ->subject('Your Bus Ticket - ' . $reference)
                    ->attach($result['path'], [
                        'as' => $reference . '.pdf',
                        'mime' => 'application/pdf',
                    ]);
            });

            Log::info('Ticket emailed successfully', [
                'reference' => $reference,
                'email' => $email
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Ticket has been sent to ' . $email
                ]);
            }

            return back()->with('success', 'Ticket has been sent to ' . $email);

        } catch (\Exception $e) {
            Log::error('Ticket email failed', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to email ticket. Please try again.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to email ticket. Please try again.']);
        }
    }

    /**
     * Get cancellation policy details for a booking
     */
    public function getCancellationPolicy($reference)
    {
        // Check if user is logged in
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to view cancellation policy.');
        }

        $booking = BusBooking::with(['busSchedule'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        // Verify ownership
        if ($booking->user_id !== Auth::id()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            // Check if booking can be cancelled
            if (!$cancellationService->canCancel('bus', $booking)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This booking cannot be cancelled.',
                    'can_cancel' => false
                ]);
            }

            // Calculate refund details
            $refundDetails = $cancellationService->calculateRefund('bus', $booking);

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
     * Cancel a bus booking
     */
    public function cancelBooking(Request $request, $reference)
    {
        // Check if user is logged in
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to cancel your booking.');
        }

        $booking = BusBooking::where('booking_reference', $reference)->firstOrFail();

        // Verify ownership
        if ($booking->user_id !== Auth::id()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        // Validate request
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            $result = $cancellationService->cancelBooking(
                'bus',
                $reference,
                Auth::id(),
                $validated['reason'] ?? null
            );

            if ($result['success']) {
                Log::info('Bus booking cancelled successfully', [
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
            Log::error('Bus booking cancellation failed', [
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

    /**
     * Helper function to calculate duration between two times
     */
    private function calculateDuration($departureTime, $arrivalTime)
    {
        $departure = Carbon::parse($departureTime);
        $arrival = Carbon::parse($arrivalTime);

        if ($arrival < $departure) {
            $arrival->addDay();
        }

        $durationMinutes = $departure->diffInMinutes($arrival);
        $hours = floor($durationMinutes / 60);
        $minutes = $durationMinutes % 60;

        return "{$hours}h {$minutes}m";
    }
}
