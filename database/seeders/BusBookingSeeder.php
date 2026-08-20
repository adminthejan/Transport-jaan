<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BusBooking;
use App\Models\Bus;
use App\Models\BusSchedule;
use App\Models\User;

class BusBookingSeeder extends Seeder
{
    public function run(): void
    {
        $buses = Bus::limit(2)->get();
        $schedules = BusSchedule::limit(2)->get();
        $users = User::where('role', 'client')->limit(2)->get();

        if ($buses->isEmpty() || $schedules->isEmpty() || $users->isEmpty()) {
            return;
        }

        $bookings = [
            [
                'bus_id' => $buses[0]->id ?? null,
                'bus_schedule_id' => $schedules[0]->id ?? null,
                'user_id' => $users[0]->id ?? null,
                'passenger_name' => 'David Wilson',
                'passenger_email' => 'david.w@example.com',
                'passenger_phone' => '+94775556666',
                'seat_number' => '15A',
                'number_of_passengers' => 1,
                'total_price' => 1500.00,
                'booking_status' => 'confirmed',
                'payment_status' => 'paid',
            ],
            [
                'bus_id' => $buses->count() > 1 ? $buses[1]->id : $buses[0]->id,
                'bus_schedule_id' => $schedules->count() > 1 ? $schedules[1]->id : $schedules[0]->id,
                'user_id' => $users->count() > 1 ? $users[1]->id : $users[0]->id,
                'passenger_name' => 'Lisa Anderson',
                'passenger_email' => 'lisa.a@example.com',
                'passenger_phone' => '+94776667777',
                'seat_number' => '22B',
                'number_of_passengers' => 3,
                'total_price' => 4000.00,
                'booking_status' => 'pending',
                'payment_status' => 'pending',
            ],
        ];

        foreach ($bookings as $booking) {
            if ($booking['bus_id'] && $booking['bus_schedule_id'] && $booking['user_id']) {
                BusBooking::firstOrCreate(
                    [
                        'bus_schedule_id' => $booking['bus_schedule_id'],
                        'passenger_email' => $booking['passenger_email'],
                    ],
                    $booking
                );
            }
        }
    }
}
