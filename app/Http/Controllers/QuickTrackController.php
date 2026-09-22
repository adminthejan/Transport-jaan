<?php

namespace App\Http\Controllers;

use App\Models\AirVehicleBookings;
use App\Models\Booking;
use App\Models\BusBooking;
use App\Models\Courier\CourierShipment;
use App\Models\SeaVehicleBookings;
use App\Models\TrainBooking;
use App\Models\Warehouse\WarehouseBooking;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Powers the "Track" dropdown in the nav bar — a compact inline search
 * instead of a full page navigation. Mirrors the reference-prefix detection
 * and email+PIN verification already used by TrackOrder.jsx and the three
 * per-service trackPublic() controllers, but returns a small JSON summary so
 * the result can render inside the dropdown itself.
 */
class QuickTrackController extends Controller
{
    private const SERVICE_TYPES = [
        'CR' => 'courier',
        'VEH' => 'land',
        'AIR' => 'air',
        'SEA' => 'sea',
        'BUS' => 'bus',
        'TRN' => 'train',
        // 'WH' covers pre-existing bookings created before warehouse switched
        // to BookingReferenceGenerator::forWarehouse() (which emits "WHS-").
        'WH' => 'warehouse',
        'WHS' => 'warehouse',
    ];

    public function lookup(Request $request)
    {
        $reference = trim((string) $request->query('reference', ''));
        $email = trim((string) $request->query('email', ''));
        $pin = trim((string) $request->query('pin', ''));

        if ($reference === '') {
            return response()->json(['status' => 'invalid', 'message' => 'Enter a reference number.']);
        }

        $prefix = strtoupper(explode('-', $reference)[0] ?? '');
        $type = self::SERVICE_TYPES[$prefix] ?? null;

        if (!$type) {
            return response()->json([
                'status' => 'invalid',
                'message' => "We couldn't recognize that reference format.",
            ]);
        }

        [$model, $detailsPath] = $this->findBooking($reference, $type);

        if (!$model) {
            return response()->json([
                'status' => 'not_found',
                'type' => $type,
                'message' => 'No booking found for that reference.',
            ]);
        }

        $bookingEmails = $this->emailsFor($model, $type);
        $emailMatches = $email !== '' && in_array(mb_strtolower($email), $bookingEmails, true);
        $pinMatches = $pin !== '' && hash_equals((string) ($model->tracking_pin ?? ''), $pin);

        $query = array_filter(['reference' => $reference, 'email' => $email]);

        if (!($emailMatches && $pinMatches)) {
            return response()->json([
                'status' => 'needs_verification',
                'type' => $type,
                'message' => 'Enter the email and 6-digit PIN from your booking confirmation to view details.',
                'detailsUrl' => $detailsPath . '?' . http_build_query($query),
            ]);
        }

        return response()->json([
            'status' => 'result',
            'type' => $type,
            'data' => $this->summarize($model, $type),
            'detailsUrl' => $detailsPath . '?' . http_build_query(array_merge($query, ['pin' => $pin])),
        ]);
    }

    /** @return array{0: object|null, 1: string} */
    private function findBooking(string $reference, string $type): array
    {
        return match ($type) {
            'courier' => [
                CourierShipment::with(['sender', 'recipient', 'senderAddress', 'recipientAddress'])
                    ->where('reference', $reference)->first(),
                '/track-shipment',
            ],
            'land' => [
                Booking::with(['customer', 'client', 'schedule', 'vehicle'])
                    ->where('booking_reference', $reference)->first(),
                '/track-vehicle-booking',
            ],
            'air' => [
                AirVehicleBookings::with(['customer', 'client', 'schedule', 'vehicle'])
                    ->where('booking_reference', $reference)->first(),
                '/track-vehicle-booking',
            ],
            'sea' => [
                SeaVehicleBookings::with(['customer', 'client', 'schedule', 'vehicle'])
                    ->where('booking_reference', $reference)->first(),
                '/track-vehicle-booking',
            ],
            'bus' => [
                BusBooking::with(['busSchedule.bus', 'busSchedule.departureStation', 'busSchedule.arrivalStation'])
                    ->where('booking_reference', $reference)->first(),
                '/track-ticket-booking',
            ],
            'train' => [
                TrainBooking::with(['trainSchedule.train', 'trainSchedule.departureStation', 'trainSchedule.arrivalStation'])
                    ->where('booking_reference', $reference)->first(),
                '/track-ticket-booking',
            ],
            'warehouse' => [
                WarehouseBooking::with('warehouseUnit')
                    ->where('booking_reference', $reference)->first(),
                '/track-warehouse-booking',
            ],
        };
    }

    /** @return string[] lowercased emails allowed to unlock this booking */
    private function emailsFor($model, string $type): array
    {
        $emails = match ($type) {
            'courier' => [$model->sender?->email, $model->recipient?->email],
            'land', 'air', 'sea' => [$model->customer?->email, $model->client?->email],
            'bus', 'train' => [$model->passenger_email],
            'warehouse' => [$model->email],
            default => [],
        };

        return array_values(array_filter(array_map(
            fn ($e) => $e ? mb_strtolower($e) : null,
            $emails
        )));
    }

    private function summarize($model, string $type): array
    {
        switch ($type) {
            case 'courier':
                return [
                    'code' => $model->reference,
                    'status' => $model->status,
                    'title' => 'Courier Shipment',
                    'from' => $model->senderAddress?->city,
                    'to' => $model->recipientAddress?->city,
                    'date' => optional($model->pickup_date)->format('j M Y'),
                ];

            case 'land':
            case 'air':
            case 'sea':
                return [
                    'code' => $model->booking_reference,
                    'status' => $model->status,
                    'title' => trim((string) (($model->vehicle?->manufacturer ?? '') . ' ' . ($model->vehicle?->model ?? ''))) ?: 'Vehicle Rental',
                    'from' => optional($model->schedule?->pickup_at)->format('j M Y, g:i A'),
                    'to' => optional($model->schedule?->dropoff_at)->format('j M Y, g:i A'),
                    'date' => null,
                    'amount' => $model->total_amount !== null
                        ? trim(($model->currency ?? '') . ' ' . number_format((float) $model->total_amount))
                        : null,
                ];

            case 'bus':
                $schedule = $model->busSchedule;
                return [
                    'code' => $model->booking_reference,
                    'status' => $model->status,
                    'title' => $schedule?->bus?->operator ?? 'Bus Ticket',
                    'from' => $schedule?->departureStation?->name,
                    'to' => $schedule?->arrivalStation?->name,
                    'date' => $schedule ? Carbon::parse($schedule->date)->format('j M Y') : null,
                    'amount' => $model->total_price !== null ? 'LKR ' . number_format((float) $model->total_price) : null,
                ];

            case 'train':
                $schedule = $model->trainSchedule;
                return [
                    'code' => $model->booking_reference,
                    'status' => $model->status,
                    'title' => $schedule?->train?->name ?? 'Train Ticket',
                    'from' => $schedule?->departureStation?->name,
                    'to' => $schedule?->arrivalStation?->name,
                    'date' => $schedule ? Carbon::parse($schedule->date)->format('j M Y') : null,
                    'amount' => $model->total_amount !== null ? 'LKR ' . number_format((float) $model->total_amount) : null,
                ];

            case 'warehouse':
                return [
                    'code' => $model->booking_reference,
                    'status' => $model->status,
                    'title' => $model->warehouseUnit?->name ?? 'Warehouse Storage',
                    'from' => optional($model->start_date)->format('j M Y'),
                    'to' => optional($model->end_date)->format('j M Y'),
                    'date' => null,
                    'amount' => $model->final_amount !== null
                        ? 'LKR ' . number_format((float) $model->final_amount)
                        : null,
                ];

            default:
                return [];
        }
    }
}
