<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BusBooking;
use App\Models\BusSchedule;
use App\Models\User;

class BusBookingSeeder extends Seeder
{
    public function run(): void
    {
        $schedules = BusSchedule::limit(2)->get();
        $users = User::where('role', 'client')->limit(2)->get();

        if ($schedules->isEmpty() || $users->isEmpty()) {
            $this->command->error('Please run BusScheduleSeeder and DemoUsersSeeder first');
            return;
        }

        $bookings = [
            [
                'bus_schedule_id' => $schedules[0]->id,
                'user_id' => $users[0]->id,
                'passenger_name' => 'David Wilson',
                'passenger_email' => 'david.w@example.com',
                'passenger_phone' => '+94775556666',
                'seat_numbers' => ['15A'],
                'passenger_count' => 1,
                'total_price' => 1500.00,
                'status' => 'confirmed',
                'booking_date' => now(),
            ],
            [
                'bus_schedule_id' => $schedules->count() > 1 ? $schedules[1]->id : $schedules[0]->id,
                'user_id' => $users->count() > 1 ? $users[1]->id : $users[0]->id,
                'passenger_name' => 'Lisa Anderson',
                'passenger_email' => 'lisa.a@example.com',
                'passenger_phone' => '+94776667777',
                'seat_numbers' => ['22B', '22C', '22D'],
                'passenger_count' => 3,
                'total_price' => 4000.00,
                'status' => 'pending',
                'booking_date' => now(),
            ],
        ];

        foreach ($bookings as $booking) {
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
