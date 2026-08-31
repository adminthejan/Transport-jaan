<?php

namespace App\Http\Controllers;

use App\Models\BusBooking;
use App\Models\TrainBooking;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TicketBookingTrackingController extends Controller
{
    /**
     * Public "Track My Ticket" page for Bus/Train bookings — no login
     * required, but a reference alone isn't enough (it's guessable/
     * shareable): the requester must also confirm the passenger email on
     * the booking and the 6-digit tracking PIN before any details are
     * shown. Tries both tables since references are uniquely prefixed
     * (BUS-/TRN-) so at most one will ever match.
     */
    public function trackPublic(Request $request)
    {
        $reference = trim((string) $request->query('reference', ''));
        $email = trim((string) $request->query('email', ''));
        $pin = trim((string) $request->query('pin', ''));
        $result = null;
        $notFound = false;
        $needsVerification = false;

        if ($reference !== '') {
            $booking = $this->findBooking($reference);

            if (!$booking) {
                $notFound = true;
            } else {
                [$model, $type] = $booking;
                $bookingEmail = mb_strtolower((string) ($model->passenger_email ?? ''));
                $emailMatches = $email !== '' && $bookingEmail !== '' && mb_strtolower($email) === $bookingEmail;
                $pinMatches = $pin !== '' && hash_equals((string) $model->tracking_pin, $pin);

                if ($emailMatches && $pinMatches) {
                    $result = $this->transform($model, $type);
                } else {
                    $needsVerification = true;
                }
            }
        }

        return Inertia::render('Web/ticketBooking/TrackBooking', [
            'reference' => $reference !== '' ? $reference : null,
            'email' => $email !== '' ? $email : null,
            'result' => $result,
            'notFound' => $notFound,
            'needsVerification' => $needsVerification,
        ]);
    }

    /** @return array{0: BusBooking|TrainBooking, 1: string}|null */
    private function findBooking(string $reference): ?array
    {
        $bus = BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation'])
            ->where('booking_reference', $reference)->first();
        if ($bus) {
            return [$bus, 'bus'];
        }

        $train = TrainBooking::with(['trainSchedule.train', 'trainSchedule.departureStation', 'trainSchedule.arrivalStation'])
            ->where('booking_reference', $reference)->first();
        if ($train) {
            return [$train, 'train'];
        }

        return null;
    }

    private function transform($booking, string $type): array
    {
        $schedule = $type === 'bus' ? $booking->busSchedule : $booking->trainSchedule;

        return [
            'code' => $booking->booking_reference,
            'type' => $type,
            'status' => $booking->status,
            'passengerName' => $booking->passenger_name,
            'departureStation' => $schedule?->departureStation?->name,
            'arrivalStation' => $schedule?->arrivalStation?->name,
            'date' => $schedule?->date,
            'departureTime' => $schedule?->departure_time,
            'arrivalTime' => $schedule?->arrival_time,
            'seatNumbers' => $booking->seat_numbers ?? null,
            'totalAmount' => $type === 'bus' ? $booking->total_price : $booking->total_amount,
            'paymentStatus' => $booking->payment_status ?? null,
        ];
    }
}
