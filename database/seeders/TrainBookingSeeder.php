<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrainBooking;
use App\Models\TrainSchedule;
use App\Models\User;

class TrainBookingSeeder extends Seeder
{
    public function run(): void
    {
        $schedules = TrainSchedule::limit(2)->get();
        $users = User::where('role', 'client')->limit(2)->get();

        if ($schedules->isEmpty() || $users->isEmpty()) {
            $this->command->error('Please run TrainScheduleSeeder and DemoUsersSeeder first');
            return;
        }

        $bookings = [
            [
                'train_schedule_id' => $schedules[0]->id,
                'user_id' => $users[0]->id,
                'passenger_name' => 'Robert Brown',
                'passenger_email' => 'robert.b@example.com',
                'passenger_phone' => '+94773334444',
                'adults' => 1,
                'children' => 0,
                'infants' => 0,
                'total_passengers' => 1,
                'seat_numbers' => ['A12'],
                'total_amount' => 2500.00,
                'status' => 'confirmed',
                'payment_status' => 'paid',
            ],
            [
                'train_schedule_id' => $schedules->count() > 1 ? $schedules[1]->id : $schedules[0]->id,
                'user_id' => $users->count() > 1 ? $users[1]->id : $users[0]->id,
                'passenger_name' => 'Emily Davis',
                'passenger_email' => 'emily.d@example.com',
                'passenger_phone' => '+94774445555',
                'adults' => 2,
                'children' => 0,
                'infants' => 0,
                'total_passengers' => 2,
                'seat_numbers' => ['B25', 'B26'],
                'total_amount' => 3000.00,
                'status' => 'pending',
                'payment_status' => 'pending',
            ],
        ];

        foreach ($bookings as $booking) {
            TrainBooking::firstOrCreate(
                [
                    'train_schedule_id' => $booking['train_schedule_id'],
                    'passenger_email' => $booking['passenger_email'],
                ],
                $booking
            );
        }
    }
}
