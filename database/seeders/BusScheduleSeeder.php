<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\BusSchedule;
use App\Models\Bus;
use App\Models\BusStation;
use Carbon\Carbon;

class BusScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $buses = Bus::all();
        $stations = BusStation::all();
        
        if ($buses->isEmpty() || $stations->isEmpty()) {
            $this->command->error('Please run BusSeeder and BusStationSeeder first');
            return;
        }

        // Get specific stations for common routes
        $colombo = $stations->where('code', 'CCBS')->first();
        $kandy = $stations->where('code', 'KBT')->first();
        $galle = $stations->where('code', 'GBS')->first();
        $negombo = $stations->where('code', 'NBS')->first();
        $matara = $stations->where('code', 'MBS')->first();

        $today = Carbon::today();
        $schedules = [];

        // Create schedules for the next 7 days
        for ($day = 0; $day < 14; $day++) {
            $date = $today->copy()->addDays($day);
            
            // Route 1: Colombo to Negombo
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NB-1234')->first()->id,
                'departure_station_id' => $colombo->id,
                'arrival_station_id' => $negombo->id,
                'departure_time' => '07:45:00',
                'arrival_time' => '15:45:00',
                'duration_minutes' => 480,
                'date' => $date,
                'price' => 1800.00,
                'available_seats' => 36,
                'is_expressway' => false,
                'status' => 'active'
            ];

            // Route 2: Colombo to Galle (Highway)
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NC-4567')->first()->id,
                'departure_station_id' => $colombo->id,
                'arrival_station_id' => $galle->id,
                'departure_time' => '17:40:00',
                'arrival_time' => '22:40:00',
                'duration_minutes' => 300,
                'date' => $date,
                'price' => 1635.00,
                'available_seats' => 0,
                'is_expressway' => true,
                'status' => 'active'
            ];

            // Route 3: Colombo to Kandy
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NA-9912')->first()->id,
                'departure_station_id' => $colombo->id,
                'arrival_station_id' => $kandy->id,
                'departure_time' => '18:45:00',
                'arrival_time' => '21:47:00',
                'duration_minutes' => 182,
                'date' => $date,
                'price' => 1900.00,
                'available_seats' => 12,
                'is_expressway' => false,
                'status' => 'active'
            ];

            // Route 4: Colombo to Matara
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NC-2211')->first()->id,
                'departure_station_id' => $colombo->id,
                'arrival_station_id' => $matara->id,
                'departure_time' => '19:15:00',
                'arrival_time' => '04:15:00',
                'duration_minutes' => 540,
                'date' => $date,
                'price' => 1900.00,
                'available_seats' => 22,
                'is_expressway' => false,
                'status' => 'active'
            ];

            // Route 5: Colombo to Galle (Premium)
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NC-7711')->first()->id,
                'departure_station_id' => $colombo->id,
                'arrival_station_id' => $galle->id,
                'departure_time' => '19:15:00',
                'arrival_time' => '04:15:00',
                'duration_minutes' => 540,
                'date' => $date,
                'price' => 2500.00,
                'available_seats' => 0,
                'is_expressway' => true,
                'status' => 'active'
            ];

            // Return journeys — every outbound route above needs a reverse
            // leg too, otherwise a round-trip search always comes back empty
            // for anything except Negombo (the only route that had one).
            // Negombo to Colombo
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NB-1234')->first()->id,
                'departure_station_id' => $negombo->id,
                'arrival_station_id' => $colombo->id,
                'departure_time' => '06:00:00',
                'arrival_time' => '14:00:00',
                'duration_minutes' => 480,
                'date' => $date,
                'price' => 1800.00,
                'available_seats' => 40,
                'is_expressway' => false,
                'status' => 'active'
            ];

            // Galle to Colombo (Highway)
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NC-4567')->first()->id,
                'departure_station_id' => $galle->id,
                'arrival_station_id' => $colombo->id,
                'departure_time' => '06:30:00',
                'arrival_time' => '11:30:00',
                'duration_minutes' => 300,
                'date' => $date,
                'price' => 1635.00,
                'available_seats' => 45,
                'is_expressway' => true,
                'status' => 'active'
            ];

            // Kandy to Colombo
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NA-9912')->first()->id,
                'departure_station_id' => $kandy->id,
                'arrival_station_id' => $colombo->id,
                'departure_time' => '07:00:00',
                'arrival_time' => '10:02:00',
                'duration_minutes' => 182,
                'date' => $date,
                'price' => 1900.00,
                'available_seats' => 30,
                'is_expressway' => false,
                'status' => 'active'
            ];

            // Matara to Colombo
            $schedules[] = [
                'bus_id' => $buses->where('bus_number', 'NC-2211')->first()->id,
                'departure_station_id' => $matara->id,
                'arrival_station_id' => $colombo->id,
                'departure_time' => '05:15:00',
                'arrival_time' => '14:15:00',
                'duration_minutes' => 540,
                'date' => $date,
                'price' => 1900.00,
                'available_seats' => 28,
                'is_expressway' => false,
                'status' => 'active'
            ];
        }

        // Extra demo routes (both directions) so one-way, round-trip and
        // multi-city searches (e.g. Colombo > Kandy > Anuradhapura > Colombo)
        // all return results. [from code, to code, minutes, price, expressway,
        // departure times, bus numbers (cycled per departure)]
        $byCode = $stations->keyBy('code');
        $busByNumber = $buses->keyBy('bus_number');
        $extraRoutes = [
            ['CCBS', 'KBT',  182, 1900, false, ['06:00', '09:30', '14:00'], ['NA-9912', 'NB-1234', 'NC-4567']],
            ['KBT',  'ABS',  150, 1500, false, ['07:30', '12:00', '16:30'], ['NA-9912', 'NC-2211', 'NB-1234']],
            ['CCBS', 'ABS',  270, 2400, false, ['05:30', '10:00', '21:00'], ['NC-2211', 'NA-9912', 'NC-7711']],
            ['CCBS', 'JBS',  480, 3600, false, ['20:00', '21:30'],          ['NC-7711', 'NC-4567']],
            ['CCBS', 'KUBS', 120,  900, false, ['06:30', '11:00', '15:30'], ['NB-1234', 'NA-9912', 'NC-2211']],
            ['CCBS', 'GBS',  150, 1635, true,  ['06:00', '10:30', '15:00'], ['NC-4567', 'NC-7711', 'NC-2211']],
            ['GBS',  'MBS',   60,  450, false, ['08:00', '13:00', '18:00'], ['NC-2211', 'NC-4567', 'NB-1234']],
            ['KBT',  'NEBS', 120,  800, false, ['06:45', '11:15', '15:45'], ['NA-9912', 'NB-1234', 'NC-2211']],
            ['CCBS', 'NEBS', 300, 1750, false, ['05:00', '13:00'],          ['NC-2211', 'NA-9912']],
            ['CCBS', 'BBS',  420, 2200, false, ['19:00', '20:30'],          ['NC-7711', 'NC-4567']],
        ];
        for ($day = 0; $day < 14; $day++) {
            $date = $today->copy()->addDays($day);
            foreach ($extraRoutes as [$a, $b, $mins, $price, $express, $times, $busNos]) {
                if (!isset($byCode[$a], $byCode[$b])) {
                    continue;
                }
                foreach ([[$a, $b], [$b, $a]] as $dirIdx => [$fromCode, $toCode]) {
                    foreach ($times as $i => $time) {
                        $busNo = $busNos[($i + $dirIdx) % count($busNos)];
                        if (!isset($busByNumber[$busNo])) {
                            continue;
                        }
                        // return trips leave a little later in the day
                        $dep = Carbon::createFromFormat('H:i', $time)->addMinutes($dirIdx * 45);
                        $schedules[] = [
                            'bus_id' => $busByNumber[$busNo]->id,
                            'departure_station_id' => $byCode[$fromCode]->id,
                            'arrival_station_id' => $byCode[$toCode]->id,
                            'departure_time' => $dep->format('H:i:s'),
                            'arrival_time' => $dep->copy()->addMinutes($mins)->format('H:i:s'),
                            'duration_minutes' => $mins,
                            'date' => $date,
                            'price' => $price + ($i * 150), // later/premium departures cost a bit more
                            'available_seats' => [36, 22, 9, 40][($i + $day) % 4],
                            'is_expressway' => $express,
                            'status' => 'active',
                        ];
                    }
                }
            }
        }

        foreach ($schedules as $schedule) {
            // Keyed by route+bus+time+date rather than a plain create() so this
            // seeder can be re-run to roll the 7-day window forward (dates are
            // relative to "today" at seed time, so they go stale after a week)
            // without piling up duplicate schedule rows.
            BusSchedule::firstOrCreate(
                [
                    'bus_id' => $schedule['bus_id'],
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
