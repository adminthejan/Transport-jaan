<?php

namespace App\Http\Controllers\VehicleControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\AirVehicleBookings;
use App\Models\SeaVehicleBookings;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VehicleTrackingController extends Controller
{
    /**
     * Public "Track My Booking" page for vehicle rentals — no login
     * required, but a reference alone isn't enough (it's guessable/
     * shareable): the requester must also confirm the email on the booking
     * and the 6-digit tracking PIN before any details are shown. Tries all
     * three vehicle-rental tables (Land/Air/Sea) since the customer may not
     * remember which type they booked — references are uniquely prefixed
     * (VEH-/AIR-/SEA-) so at most one will ever match.
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
                $bookingEmail = mb_strtolower((string) ($model->customer?->email ?? $model->client?->email ?? ''));
                $emailMatches = $email !== '' && $bookingEmail !== '' && mb_strtolower($email) === $bookingEmail;
                $pinMatches = $pin !== '' && hash_equals((string) $model->tracking_pin, $pin);

                if ($emailMatches && $pinMatches) {
                    $result = $this->transform($model, $type);
                } else {
                    $needsVerification = true;
                }
            }
        }

        return Inertia::render('Web/vehicles/TrackBooking', [
            'reference' => $reference !== '' ? $reference : null,
            'email' => $email !== '' ? $email : null,
            'result' => $result,
            'notFound' => $notFound,
            'needsVerification' => $needsVerification,
        ]);
    }

    /** @return array{0: Booking|AirVehicleBookings|SeaVehicleBookings, 1: string}|null */
    private function findBooking(string $reference): ?array
    {
        $land = Booking::with(['customer', 'client', 'schedule', 'vehicle'])
            ->where('booking_reference', $reference)->first();
        if ($land) {
            return [$land, 'land'];
        }

        $air = AirVehicleBookings::with(['customer', 'client', 'schedule', 'vehicle'])
            ->where('booking_reference', $reference)->first();
        if ($air) {
            return [$air, 'air'];
        }

        $sea = SeaVehicleBookings::with(['customer', 'client', 'schedule', 'vehicle'])
            ->where('booking_reference', $reference)->first();
        if ($sea) {
            return [$sea, 'sea'];
        }

        return null;
    }

    private function transform($booking, string $type): array
    {
        return [
            'code' => $booking->booking_reference,
            'type' => $type,
            'status' => $booking->status,
            'vehicle' => $booking->vehicle ? [
                'name' => trim((string) (($booking->vehicle->manufacturer ?? '') . ' ' . ($booking->vehicle->model ?? ''))),
            ] : null,
            'pickupAt' => optional($booking->schedule?->pickup_at)->toIso8601String(),
            'dropoffAt' => optional($booking->schedule?->dropoff_at)->toIso8601String(),
            'totalAmount' => $booking->total_amount,
            'currency' => $booking->currency,
        ];
    }
}
