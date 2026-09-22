<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\TrainSchedule;
use App\Models\TrainStation;
use App\Models\Train;
use App\Models\TrainBooking;
use App\Models\TrainBookingPayment;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Auth;
use App\Services\CancellationPolicyService;
use App\Services\PayHereGatewayService;
use App\Services\WalletService;
use App\Services\InsufficientWalletBalanceException;

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
                'fromCity' => $fromStationRecord->city ?? null,
                'toCity' => $toStationRecord->city ?? null,
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

    public function preview(Request $request, WalletService $wallets)
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

        $wallet = null;
        if (Auth::check()) {
            $walletModel = $wallets->walletFor(Auth::user());
            $wallet = ['balance' => (float) $walletModel->balance, 'currency' => $walletModel->currency];
        }

        return Inertia::render('Web/home/ticketBooking/TrainTicketBookingPreview', [
            'wallet' => $wallet,
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

    public function store(Request $request, WalletService $wallets)
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
            'payment_method' => 'required|in:PayHere,Wallet',
        ]);

        $isRoundTrip = (bool) $request->return_schedule_id;
        $passengerData = $request->only(['passenger_name', 'passenger_email', 'passenger_phone']);
        $adults = $request->adults;
        $children = $request->children ?? 0;
        $infants = $request->infants ?? 0;
        $paymentMethod = $request->input('payment_method');

        try {
            // Both legs of a round trip are created in ONE transaction: either
            // both bookings succeed, or neither does — never a stranded outbound
            // leg with a failed return leg. The payment step (wallet debit or a
            // pending PayHere payment row) happens inside the same transaction,
            // so a wallet InsufficientWalletBalanceException (or any other
            // failure) rolls back the seat reservations too instead of leaving
            // an orphaned pending booking with no way to pay.
            $result = DB::transaction(function () use ($request, $passengerData, $adults, $children, $infants, $isRoundTrip, $paymentMethod, $wallets) {
                $groupId = $isRoundTrip ? (string) Str::uuid() : null;
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

                // A round trip is ONE payment for the combined total of both
                // legs, not two separate PayHere/wallet charges.
                $combinedTotal = (float) $outbound->total_amount + ($return ? (float) $return->total_amount : 0.0);

                if ($paymentMethod === 'Wallet') {
                    // Throws InsufficientWalletBalanceException on failure, which
                    // bubbles out of this closure and rolls the whole transaction
                    // back (seat decrements + booking rows included).
                    $walletTx = $wallets->debit(
                        Auth::user(),
                        $combinedTotal,
                        'payment',
                        'Train booking #' . $outbound->booking_reference,
                        'TrainBooking',
                        $outbound->id
                    );

                    TrainBookingPayment::create([
                        'train_booking_id' => $outbound->id,
                        'method' => 'Wallet',
                        'option' => 'full',
                        'amount_paid' => $combinedTotal,
                        'status' => TrainBookingPayment::STATUS_PAID,
                        'tx_reference' => (string) $walletTx->id,
                        'provider' => 'wallet',
                        'paid_at' => now(),
                    ]);

                    $outbound->forceFill(['status' => 'confirmed', 'payment_status' => 'paid'])->save();
                    if ($return) {
                        $return->forceFill(['status' => 'confirmed', 'payment_status' => 'paid'])->save();
                    }
                } else {
                    // PayHere is asynchronous — the payment starts pending and is
                    // only marked paid once handlePayHereReturn()/handlePayHereNotify()
                    // confirm the charge. The booking(s) stay 'pending' until then,
                    // protected by their existing 15-minute expires_at hold.
                    TrainBookingPayment::create([
                        'train_booking_id' => $outbound->id,
                        'method' => 'PayHere',
                        'option' => 'full',
                        'amount_paid' => $combinedTotal,
                        'status' => TrainBookingPayment::STATUS_PENDING,
                        'provider' => 'payhere',
                        'gateway_order_id' => $this->generateTrainPaymentOrderId(),
                        'initiated_at' => now(),
                    ]);
                }

                return [$outbound, $return];
            });

            [$booking, $returnBooking] = $result;

            Log::info('Train booking created successfully', [
                'booking_id' => $booking->id,
                'reference' => $booking->booking_reference,
                'round_trip' => $isRoundTrip,
                'return_booking_id' => $returnBooking?->id,
                'payment_method' => $paymentMethod,
            ]);

            if ($paymentMethod === 'PayHere') {
                $redirectUrl = route('train-bookings.payhere.checkout', ['booking' => $booking->id]);
                $message = 'Booking created. Continue with PayHere to complete your payment.';

                return redirect($redirectUrl)->with('success', $message);
            }

            $message = $isRoundTrip ? 'Round-trip train booking confirmed successfully!' : 'Train booking confirmed successfully!';

            return redirect()->route('train.booking.success', $booking->booking_reference)
                ->with('success', $message);

        } catch (InsufficientWalletBalanceException $e) {
            Log::warning('Train booking wallet debit failed: insufficient balance', ['user_id' => Auth::id()]);

            return back()->withErrors(['payment_method' => 'Insufficient wallet balance for this payment.'])->withInput();
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

    /**
     * Render the PayHere checkout step for a train booking (or round-trip
     * pair) created with payment_method = 'PayHere'. Mirrors
     * WarehouseBookingController::paymentCheckout(). The payment row lives on
     * the outbound leg and covers the combined total of both legs.
     */
    public function paymentCheckout(Request $request, TrainBooking $booking, PayHereGatewayService $gateway)
    {
        abort_unless(Auth::check() && (int) $booking->user_id === (int) Auth::id(), 403);

        $payment = $booking->payments()->where('method', 'PayHere')->latest('id')->first();
        if (!$payment) {
            abort(404);
        }

        if ($payment->isPending() && $booking->isExpired()) {
            // The 15-minute seat hold lapsed before the customer paid — the
            // seats may already be released, so surface a clear message
            // instead of sending them into a confusing PayHere failure.
            $payment->markFailed('Booking hold expired before payment was completed.');
        }

        $checkout = $payment->isPending()
            ? $this->buildTrainCheckout($gateway, $booking, $payment)
            : ['isReady' => false, 'reason' => null, 'checkoutUrl' => null, 'fields' => []];

        $payload = [
            'booking' => $this->serializeTrainBookingForCheckout($booking, $payment),
            'checkout' => $checkout,
            'pollingUrl' => route('train-bookings.payhere.status', ['booking' => $booking->id]),
            'retryUrl' => route('train-bookings.payhere.retry', ['booking' => $booking->id]),
            'bookingListUrl' => route('train.booking.success', $booking->booking_reference),
        ];

        if ($request->expectsJson()) {
            return response()->json($payload);
        }

        return Inertia::render('Web/home/ticketBooking/TrainPaymentCheckout', $payload);
    }

    /**
     * JSON polling endpoint used by the checkout page while waiting for the
     * PayHere webhook/return to resolve. Mirrors WalletController::status().
     */
    public function paymentStatus(TrainBooking $booking)
    {
        abort_unless(Auth::check() && (int) $booking->user_id === (int) Auth::id(), 403);

        $payment = $booking->payments()->where('method', 'PayHere')->latest('id')->first();
        if (!$payment) {
            abort(404);
        }

        return response()->json(['booking' => $this->serializeTrainBookingForCheckout($booking, $payment)]);
    }

    /**
     * Retry a failed/cancelled PayHere payment: mints a fresh gateway_order_id
     * (PayHere order ids can't be reused) and resets the payment state back to
     * pending — but only if the 15-minute seat hold hasn't lapsed, since a
     * lapsed hold means the seats may already be released/rebooked.
     */
    public function paymentRetry(Request $request, TrainBooking $booking)
    {
        abort_unless(Auth::check() && (int) $booking->user_id === (int) Auth::id(), 403);

        $payment = $booking->payments()->where('method', 'PayHere')->latest('id')->first();
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'No PayHere payment found for this booking.'], 422);
        }

        if ($payment->isPaid()) {
            return response()->json([
                'success' => true,
                'message' => 'This booking is already paid.',
                'redirect' => route('train-bookings.payhere.checkout', ['booking' => $booking->id]),
            ]);
        }

        $booking->refresh();
        if ($booking->isExpired()) {
            $payment->markFailed('Booking hold expired before payment was retried.');

            return response()->json([
                'success' => false,
                'message' => 'Your seat reservation has expired. Please search and book again.',
            ], 422);
        }

        $payment->forceFill([
            'status' => TrainBookingPayment::STATUS_PENDING,
            'gateway_order_id' => $this->generateTrainPaymentOrderId(),
            'gateway_payment_id' => null,
            'gateway_status' => null,
            'failed_at' => null,
            'failure_reason' => null,
            'initiated_at' => now(),
        ])->save();

        $redirectUrl = route('train-bookings.payhere.checkout', ['booking' => $booking->id]);

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'redirect' => $redirectUrl]);
        }

        return redirect($redirectUrl);
    }

    /**
     * PayHere's browser return URL. If the notify webhook already landed
     * first this just reflects the now-completed state; otherwise it verifies
     * the signature itself (with a sandbox fallback, same as
     * WalletController::handleReturn()) so the customer isn't stuck looking
     * "pending" until the async webhook shows up.
     */
    public function handlePayHereReturn(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $payment = TrainBookingPayment::where('gateway_order_id', $orderId)->first();

        if (!$payment) {
            return redirect()->route('TrainTicketBookingDetails.TrainTicketBookingDetails')->with('error', 'We could not find that booking payment.');
        }

        $booking = TrainBooking::find($payment->train_booking_id);
        if (!$booking) {
            return redirect()->route('TrainTicketBookingDetails.TrainTicketBookingDetails')->with('error', 'We could not find that booking.');
        }

        if ($payment->isPending()) {
            $gateway = app(PayHereGatewayService::class);
            $payload = $request->query();

            if ($gateway->verifyNotifySignature($payload)) {
                $this->applyResolvedTrainPaymentStatus($gateway, $payment, $booking, $payload);
            } elseif ($this->isTrainPayHereSandbox() && $request->query('status_code') === null) {
                // Sandbox convenience: PayHere's sandbox return sometimes omits
                // status_code/signature entirely on a successful test payment.
                DB::transaction(function () use ($payment, $booking) {
                    $locked = TrainBookingPayment::where('id', $payment->id)->lockForUpdate()->first();
                    if ($locked && $locked->isPending()) {
                        $locked->markPaid(null, null, 'sandbox-return');
                        $this->confirmTrainBookingAfterPayment($booking);
                    }
                });
            }
        }

        return redirect()->route('train-bookings.payhere.checkout', ['booking' => $booking->id]);
    }

    public function handlePayHereCancel(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $payment = TrainBookingPayment::where('gateway_order_id', $orderId)->first();

        if ($payment && $payment->isPending()) {
            $payment->markFailed('Cancelled by customer at PayHere.');
        }

        return redirect()->route('TrainTicketBookingDetails.TrainTicketBookingDetails')->with('error', 'Payment cancelled.');
    }

    /**
     * The actual webhook. PayHere expects a plain-text 200 response, not JSON.
     */
    public function handlePayHereNotify(Request $request)
    {
        $payload = $request->all();
        $orderId = trim((string) ($payload['order_id'] ?? ''));

        $payment = TrainBookingPayment::where('gateway_order_id', $orderId)->first();
        if (!$payment) {
            Log::warning('PayHere train notify: unknown order_id', ['order_id' => $orderId]);
            return response('order not found', 404);
        }

        $booking = TrainBooking::find($payment->train_booking_id);
        if (!$booking) {
            Log::warning('PayHere train notify: booking missing for payment', ['payment_id' => $payment->id]);
            return response('booking not found', 404);
        }

        $gateway = app(PayHereGatewayService::class);
        if (!$gateway->verifyNotifySignature($payload)) {
            Log::warning('PayHere train notify: signature mismatch', ['order_id' => $orderId]);
            return response('invalid signature', 400);
        }

        $this->applyResolvedTrainPaymentStatus($gateway, $payment, $booking, $payload);

        return response('OK', 200);
    }

    private function applyResolvedTrainPaymentStatus(PayHereGatewayService $gateway, TrainBookingPayment $payment, TrainBooking $booking, array $payload): void
    {
        DB::transaction(function () use ($gateway, $payment, $booking, $payload) {
            $locked = TrainBookingPayment::where('id', $payment->id)->lockForUpdate()->first();
            if (!$locked || $locked->isPaid()) {
                return; // idempotent — already applied
            }

            $callbackLog = is_array($locked->callback_payload) ? $locked->callback_payload : [];
            $callbackLog[] = ['at' => now()->toIso8601String(), 'payload' => $payload];
            $locked->forceFill(['callback_payload' => $callbackLog, 'last_notified_at' => now()])->save();

            $validation = $gateway->validateNotifyAgainstExpected($payload, [
                'orderId' => (string) $locked->gateway_order_id,
                'amount' => (float) $locked->amount_paid,
                'currency' => 'LKR',
            ]);

            if (!$validation['isValid']) {
                $locked->markFailed('Notify payload mismatch: ' . $validation['reason']);
                return;
            }

            $status = $gateway->normalizeStatusFromNotify($payload);
            $gatewayPaymentId = (string) ($payload['payment_id'] ?? '');

            if ($status === 'paid') {
                $locked->markPaid($gatewayPaymentId ?: null, $gatewayPaymentId ?: null, $status);
                $this->confirmTrainBookingAfterPayment($booking);
            } elseif (in_array($status, ['failed', 'cancelled'], true)) {
                $locked->markFailed("PayHere status: {$status}", $status);
            }
            // 'pending' from PayHere just leaves it pending — nothing to do.
        });
    }

    /**
     * Confirms both legs of a round trip together, since one PayHere payment
     * covers the combined total for both.
     */
    private function confirmTrainBookingAfterPayment(TrainBooking $booking): void
    {
        $ids = [$booking->id];
        if ($booking->round_trip_group_id) {
            $ids = TrainBooking::where('round_trip_group_id', $booking->round_trip_group_id)->pluck('id')->all();
        }

        TrainBooking::whereIn('id', $ids)->update(['status' => 'confirmed', 'payment_status' => 'paid']);
    }

    private function buildTrainCheckout(PayHereGatewayService $gateway, TrainBooking $booking, TrainBookingPayment $payment): array
    {
        $user = Auth::user();
        [$firstName, $lastName] = $gateway->splitName((string) ($booking->passenger_name ?: ($user->name ?? 'Customer')));

        return $gateway->buildCheckoutPayload([
            'orderId' => (string) $payment->gateway_order_id,
            'amount' => (float) $payment->amount_paid,
            'currency' => 'LKR',
            'items' => 'Train booking #' . $booking->booking_reference,
            'returnUrl' => route('train-bookings.payhere.return', ['order_id' => $payment->gateway_order_id]),
            'cancelUrl' => route('train-bookings.payhere.cancel', ['order_id' => $payment->gateway_order_id]),
            'notifyUrl' => route('train-bookings.payhere.notify'),
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => (string) ($booking->passenger_email ?: ($user->email ?? '')),
            'phone' => (string) ($booking->passenger_phone ?: ''),
        ]);
    }

    private function serializeTrainBookingForCheckout(TrainBooking $booking, TrainBookingPayment $payment): array
    {
        $booking->loadMissing('trainSchedule.departureStation', 'trainSchedule.arrivalStation', 'trainSchedule.train');
        $schedule = $booking->trainSchedule;
        $partner = $booking->round_trip_group_id ? $booking->roundTripPartner() : null;

        return [
            'id' => $booking->id,
            'bookingReference' => (string) $booking->booking_reference,
            'amount' => (float) $payment->amount_paid,
            'status' => (string) $payment->status,
            'bookingStatus' => (string) $booking->status,
            'orderId' => (string) ($payment->gateway_order_id ?? ''),
            'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
            'failureReason' => (string) ($payment->failure_reason ?? ''),
            'isExpired' => $booking->isExpired(),
            'expiresAt' => optional($booking->expires_at)?->toIso8601String(),
            'passengerName' => $booking->passenger_name,
            'adults' => $booking->adults,
            'children' => $booking->children,
            'infants' => $booking->infants,
            'tripType' => $booking->trip_type,
            'trainName' => $schedule && $schedule->train ? $schedule->train->name : null,
            'departureStation' => ($schedule && $schedule->departureStation) ? $schedule->departureStation->name : null,
            'arrivalStation' => ($schedule && $schedule->arrivalStation) ? $schedule->arrivalStation->name : null,
            'travelDate' => $schedule ? $schedule->date : null,
            'returnLeg' => $partner ? [
                'bookingReference' => $partner->booking_reference,
            ] : null,
        ];
    }

    private function generateTrainPaymentOrderId(): string
    {
        // Deliberately NOT the "TRN-" prefix used by booking_reference
        // (BookingReferenceGenerator::forTrain()) — this is the PayHere
        // *payment* order id, a separate identifier space.
        return 'TRP-' . now()->format('ymd') . '-' . strtoupper(Str::random(8));
    }

    private function isTrainPayHereSandbox(): bool
    {
        return (bool) config('services.payhere.sandbox', true);
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
            'tracking_pin' => $booking->tracking_pin,
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
