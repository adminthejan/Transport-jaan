<?php

namespace App\Http\Controllers\WarehouseControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\WarehouseBooking;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarehouseTrackingController extends Controller
{
    /**
     * Public "Track My Booking" page for warehouse storage bookings — no
     * login required, but a reference alone isn't enough (it's guessable/
     * shareable): the requester must also confirm the email on the booking
     * and the 6-digit tracking PIN before any details are shown. Mirrors
     * VehicleTrackingController::trackPublic() for the vehicle-rental
     * equivalent of this page.
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
            $booking = WarehouseBooking::with('warehouseUnit')
                ->where('booking_reference', $reference)
                ->first();

            if (!$booking) {
                $notFound = true;
            } else {
                $bookingEmail = mb_strtolower((string) ($booking->email ?? ''));
                $emailMatches = $email !== '' && $bookingEmail !== '' && mb_strtolower($email) === $bookingEmail;
                $pinMatches = $pin !== '' && hash_equals((string) $booking->tracking_pin, $pin);

                if ($emailMatches && $pinMatches) {
                    $result = $this->transform($booking);
                } else {
                    $needsVerification = true;
                }
            }
        }

        return Inertia::render('Web/warehouse/TrackBooking', [
            'reference' => $reference !== '' ? $reference : null,
            'email' => $email !== '' ? $email : null,
            'result' => $result,
            'notFound' => $notFound,
            'needsVerification' => $needsVerification,
        ]);
    }

    private function transform(WarehouseBooking $booking): array
    {
        return [
            'code' => $booking->booking_reference,
            'status' => $booking->status,
            'warehouseName' => $booking->warehouseUnit?->name,
            'startDate' => optional($booking->start_date)->toIso8601String(),
            'endDate' => optional($booking->end_date)->toIso8601String(),
            'finalAmount' => $booking->final_amount,
            'currency' => $booking->warehouseUnit?->currency,
        ];
    }
}
