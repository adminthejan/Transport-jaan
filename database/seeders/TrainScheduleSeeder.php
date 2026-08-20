<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TrainSchedule;
use App\Models\Train;
use App\Models\TrainStation;
use Carbon\Carbon;

class TrainScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get stations and trains
        $stations = TrainStation::all()->keyBy('code');
        $trains = Train::all();

        $schedules = [];
        $baseDate = Carbon::now()->addDays(1); // Start from tomorrow

        // Generate schedules for next 30 days
        for ($day = 0; $day < 30; $day++) {
            $currentDate = $baseDate->copy()->addDays($day);

            // Colombo Fort to Kandy routes
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN001')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['KDT']->id,
                'departure_time' => '07:45',
                'arrival_time' => '15:45',
                'duration_minutes' => 480,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 1800.00,
                'available_seats' => 36,
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN002')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['KDT']->id,
                'departure_time' => '17:40',
                'arrival_time' => '22:40',
                'duration_minutes' => 300,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 1635.00,
                'available_seats' => 0, // Sold out
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN003')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['KDT']->id,
                'departure_time' => '18:45',
                'arrival_time' => '21:47',
                'duration_minutes' => 182,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 1900.00,
                'available_seats' => 65,
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN004')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['KDT']->id,
                'departure_time' => '19:15',
                'arrival_time' => '04:15',
                'duration_minutes' => 540,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 2500.00,
                'available_seats' => 42,
                'status' => 'active'
            ];

            // Kandy to Colombo Fort routes
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN005')->first()->id,
                'departure_station_id' => $stations['KDT']->id,
                'arrival_station_id' => $stations['CMB']->id,
                'departure_time' => '15:35',
                'arrival_time' => '18:08',
                'duration_minutes' => 153,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 1200.00,
                'available_seats' => 85,
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN006')->first()->id,
                'departure_station_id' => $stations['KDT']->id,
                'arrival_station_id' => $stations['CMB']->id,
                'departure_time' => '15:00',
                'arrival_time' => '17:36',
                'duration_minutes' => 156,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 2200.00,
                'available_seats' => 28,
                'status' => 'active'
            ];

            // Colombo to Galle routes
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN007')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['GAL']->id,
                'departure_time' => '06:30',
                'arrival_time' => '09:15',
                'duration_minutes' => 165,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 950.00,
                'available_seats' => 78,
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN007')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['GAL']->id,
                'departure_time' => '14:30',
                'arrival_time' => '17:15',
                'duration_minutes' => 165,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 950.00,
                'available_seats' => 92,
                'status' => 'active'
            ];

            // Galle to Colombo routes
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN007')->first()->id,
                'departure_station_id' => $stations['GAL']->id,
                'arrival_station_id' => $stations['CMB']->id,
                'departure_time' => '09:45',
                'arrival_time' => '12:30',
                'duration_minutes' => 165,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 950.00,
                'available_seats' => 68,
                'status' => 'active'
            ];

            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN007')->first()->id,
                'departure_station_id' => $stations['GAL']->id,
                'arrival_station_id' => $stations['CMB']->id,
                'departure_time' => '17:45',
                'arrival_time' => '20:30',
                'duration_minutes' => 165,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 950.00,
                'available_seats' => 84,
                'status' => 'active'
            ];

            // Hill Country routes (Colombo to Badulla via Kandy)
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN008')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['BDL']->id,
                'departure_time' => '05:55',
                'arrival_time' => '17:50',
                'duration_minutes' => 715,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 3500.00,
                'available_seats' => 22,
                'status' => 'active'
            ];

            // Some additional inter-city routes
            $schedules[] = [
                'train_id' => $trains->where('train_number', 'TRN003')->first()->id,
                'departure_station_id' => $stations['CMB']->id,
                'arrival_station_id' => $stations['ANP']->id,
                'departure_time' => '22:30',
                'arrival_time' => '05:45',
                'duration_minutes' => 435,
                'date' => $currentDate->format('Y-m-d'),
                'price' => 2100.00,
                'available_seats' => 45,
                'status' => 'active'
            ];
        }

        // Keyed by route+train+time+date rather than a bulk insert() so this
        // seeder can be re-run to roll the 30-day window forward (dates are
        // relative to "today" at seed time, so they go stale after a month)
        // without piling up duplicate schedule rows.
        foreach ($schedules as $schedule) {
            TrainSchedule::firstOrCreate(
                [
                    'train_id' => $schedule['train_id'],
                    'departure_station_id' => $schedule['departure_station_id'],
                    'arrival_station_id' => $schedule['arrival_station_id'],
                    'departure_time' => $schedule['departure_time'],
                    'date' => $schedule['date'],
                ],
                $schedule
            );
        }
    }
}
