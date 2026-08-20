<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TrainBooking;
use App\Models\Train;
use App\Models\TrainSchedule;
use App\Models\User;

class TrainBookingSeeder extends Seeder
{
    public function run(): void
    {
        $trains = Train::limit(2)->get();
        $schedules = TrainSchedule::limit(2)->get();
        $users = User::where('role', 'client')->limit(2)->get();

        if ($trains->isEmpty() || $schedules->isEmpty() || $users->isEmpty()) {
            return;
        }

        $bookings = [
            [
                'train_id' => $trains[0]->id ?? null,
                'train_schedule_id' => $schedules[0]->id ?? null,
                'user_id' => $users[0]->id ?? null,
                'passenger_name' => 'Robert Brown',
                'passenger_email' => 'robert.b@example.com',
                'passenger_phone' => '+94773334444',
                'seat_class' => 'First Class',
                'seat_number' => 'A12',
                'number_of_passengers' => 1,
                'total_price' => 2500.00,
                'booking_status' => 'confirmed',
                'payment_status' => 'paid',
            ],
            [
                'train_id' => $trains->count() > 1 ? $trains[1]->id : $trains[0]->id,
                'train_schedule_id' => $schedules->count() > 1 ? $schedules[1]->id : $schedules[0]->id,
                'user_id' => $users->count() > 1 ? $users[1]->id : $users[0]->id,
                'passenger_name' => 'Emily Davis',
                'passenger_email' => 'emily.d@example.com',
                'passenger_phone' => '+94774445555',
                'seat_class' => 'Second Class',
                'seat_number' => 'B25',
                'number_of_passengers' => 2,
                'total_price' => 3000.00,
                'booking_status' => 'pending',
                'payment_status' => 'pending',
            ],
        ];

        foreach ($bookings as $booking) {
            if ($booking['train_id'] && $booking['train_schedule_id'] && $booking['user_id']) {
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
}
