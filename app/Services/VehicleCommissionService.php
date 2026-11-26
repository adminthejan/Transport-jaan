<?php

namespace App\Services;

use App\Models\AirVehicleBookings;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\CommissionEarning;
use App\Models\SeaVehicleBookings;
use Illuminate\Support\Facades\Log;

/**
 * Records / reverses the platform commission for a vehicle rental booking.
 * Driven from BookingObserver on the confirmed / cancelled status transitions,
 * so it covers manual confirmation today and the Payments.lk webhook later (both
 * land the booking in 'confirmed'). Uses the super-admin-configured rate from
 * the `commissions` table (service_type = 'vehicle').
 */
class VehicleCommissionService
{
    private const SERVICE_TYPE = 'vehicle';

    /**
     * Create the commission earning for a freshly-confirmed booking.
     * Idempotent — a booking only ever produces one active earning.
     */
    public function recordForConfirmedBooking(Booking|AirVehicleBookings|SeaVehicleBookings $booking, int $vendorId): void
    {
        try {
            $kind = $this->bookingKind($booking);

            $exists = CommissionEarning::where('service_type', self::SERVICE_TYPE)
                ->where('booking_type', $kind)
                ->where('booking_id', $booking->id)
                ->whereIn('status', ['paid', 'pending'])
                ->exists();
            if ($exists) {
                return;
            }

            $commission = Commission::where('service_type', self::SERVICE_TYPE)
                ->where('is_active', true)
                ->first();
            if (!$commission) {
                return; // No vehicle commission configured by the super-admin yet.
            }

            $percentage = (float) $commission->commission_percentage;
            $amount     = (float) ($booking->total_amount ?? 0);
            $split      = CommissionEarning::calculateCommission($amount, $percentage, 50, 50);

            CommissionEarning::create([
                'booking_type'          => $kind,
                'booking_id'            => $booking->id,
                'service_type'          => self::SERVICE_TYPE,
                'booking_amount'        => $amount,
                'commission_percentage' => $percentage,
                'total_commission'      => $split['total_commission'],
                'admin_amount'          => $split['admin_amount'],
                'vendor_amount'         => $split['vendor_amount'],
                'admin_percentage'      => 50,
                'vendor_percentage'     => 50,
                'vendor_id'             => $vendorId,
                'status'                => 'paid',
                'paid_at'               => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Vehicle commission record failed: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the commission when a booking is cancelled/refunded.
     */
    public function reverseForBooking(Booking|AirVehicleBookings|SeaVehicleBookings $booking): void
    {
        try {
            CommissionEarning::where('service_type', self::SERVICE_TYPE)
                ->where('booking_type', $this->bookingKind($booking))
                ->where('booking_id', $booking->id)
                ->whereIn('status', ['paid', 'pending'])
                ->update(['status' => 'failed']);
        } catch (\Throwable $e) {
            Log::warning('Vehicle commission reversal failed: ' . $e->getMessage());
        }
    }

    private function bookingKind($booking): string
    {
        return match (true) {
            $booking instanceof AirVehicleBookings => 'air',
            $booking instanceof SeaVehicleBookings => 'sea',
            default => 'land',
        };
    }
}
