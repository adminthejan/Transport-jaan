<?php

namespace App\Http\Controllers;

use App\Models\BusSchedule;
use App\Models\BusStation;
use App\Models\TrainSchedule;
use App\Models\TrainStation;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Powers the "Compare with Train/Bus" card shown on the bus and train search
 * results pages — matches the counterpart mode's stations by city (bus and
 * train stations are separate datasets with different names, e.g. "Colombo
 * Central Bus Stand" vs "Colombo Fort Railway Station") and summarizes the
 * cheapest/fastest option found for the same city pair and date.
 */
class TransportCompareController extends Controller
{
    public function compare(Request $request)
    {
        $mode = $request->input('mode');
        $fromCity = $request->input('fromCity');
        $toCity = $request->input('toCity');
        $date = $request->input('date');

        if (!in_array($mode, ['bus', 'train'], true) || !$fromCity || !$toCity || !$date) {
            return response()->json(['available' => false]);
        }

        try {
            $date = Carbon::parse($date)->format('Y-m-d');
        } catch (\Exception $e) {
            return response()->json(['available' => false]);
        }

        return response()->json(
            $mode === 'bus'
                ? $this->compareToTrain($fromCity, $toCity, $date)
                : $this->compareToBus($fromCity, $toCity, $date)
        );
    }

    private function compareToTrain(string $fromCity, string $toCity, string $date): array
    {
        $fromStations = TrainStation::where('city', $fromCity)->get();
        $toStations = TrainStation::where('city', $toCity)->get();

        if ($fromStations->isEmpty() || $toStations->isEmpty()) {
            return ['mode' => 'train', 'available' => false];
        }

        $schedules = TrainSchedule::with('train')
            ->whereIn('departure_station_id', $fromStations->pluck('id'))
            ->whereIn('arrival_station_id', $toStations->pluck('id'))
            ->where('date', $date)
            ->where('status', 'active')
            ->get();

        if ($schedules->isEmpty()) {
            return ['mode' => 'train', 'available' => false];
        }

        $cheapest = $schedules->sortBy('price')->first();
        $fastest = $schedules->sortBy('duration_minutes')->first();

        return [
            'mode' => 'train',
            'available' => true,
            'count' => $schedules->count(),
            'cheapest' => $this->formatTrainOption($cheapest),
            'fastest' => $this->formatTrainOption($fastest),
            'searchUrl' => '/trainTicketBookingDetails?' . http_build_query([
                'from' => $fromStations->first()->name,
                'to' => $toStations->first()->name,
                'departureDate' => $date,
                'tripType' => 'oneway',
            ]),
        ];
    }

    private function compareToBus(string $fromCity, string $toCity, string $date): array
    {
        $fromStations = BusStation::where('city', $fromCity)->get();
        $toStations = BusStation::where('city', $toCity)->get();

        if ($fromStations->isEmpty() || $toStations->isEmpty()) {
            return ['mode' => 'bus', 'available' => false];
        }

        $schedules = BusSchedule::with('bus')
            ->whereIn('departure_station_id', $fromStations->pluck('id'))
            ->whereIn('arrival_station_id', $toStations->pluck('id'))
            ->where('date', $date)
            ->where('status', 'active')
            ->get();

        if ($schedules->isEmpty()) {
            return ['mode' => 'bus', 'available' => false];
        }

        $cheapest = $schedules->sortBy('price')->first();
        $fastest = $schedules->sortBy(function ($schedule) {
            return $this->busDurationMinutes($schedule->departure_time, $schedule->arrival_time);
        })->first();

        return [
            'mode' => 'bus',
            'available' => true,
            'count' => $schedules->count(),
            'cheapest' => $this->formatBusOption($cheapest),
            'fastest' => $this->formatBusOption($fastest),
            'searchUrl' => '/busTicketBookingDetails?' . http_build_query([
                'from' => $fromStations->first()->name,
                'to' => $toStations->first()->name,
                'date' => $date,
                'tripType' => 'oneway',
            ]),
        ];
    }

    private function formatTrainOption(TrainSchedule $schedule): array
    {
        return [
            'name' => $schedule->train->name,
            'price' => (float) $schedule->price,
            'duration' => $this->formatDuration($schedule->duration_minutes),
            'depart' => Carbon::parse($schedule->departure_time)->format('g:i A'),
        ];
    }

    private function formatBusOption(BusSchedule $schedule): array
    {
        return [
            'name' => $schedule->bus->operator,
            'price' => (float) $schedule->price,
            'duration' => $this->formatDuration($this->busDurationMinutes($schedule->departure_time, $schedule->arrival_time)),
            'depart' => date('g:i A', strtotime($schedule->departure_time)),
        ];
    }

    private function busDurationMinutes($departureTime, $arrivalTime): int
    {
        $departure = Carbon::parse($departureTime);
        $arrival = Carbon::parse($arrivalTime);
        if ($arrival->lt($departure)) {
            $arrival->addDay();
        }
        return $departure->diffInMinutes($arrival);
    }

    private function formatDuration(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $mins = $minutes % 60;
        return $hours > 0 ? sprintf('%dh %dm', $hours, $mins) : sprintf('%dm', $mins);
    }
}
