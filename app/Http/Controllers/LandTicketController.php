<?php

namespace App\Http\Controllers;

use App\Models\BusSchedule;
use App\Models\BusStation;
use App\Models\TrainSchedule;
use App\Models\TrainStation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * "Land" ticket search: bus and train results for the same city pair and date in
 * one list (modes filter, price/duration summary per mode, price-per-day strip),
 * instead of separate Bus and Train pages.
 */
class LandTicketController extends Controller
{
    public function index(Request $request)
    {
        $from = trim((string) $request->input('from', ''));
        $to = trim((string) $request->input('to', ''));
        $dateInput = (string) $request->input('date', '');

        $toCount = fn ($v, int $d) => is_numeric($v) ? max(0, (int) $v) : $d;
        $passengers = [
            'adults' => max(1, $toCount($request->input('adults'), 1)),
            'youth' => $toCount($request->input('youth'), 0),
            'seniors' => $toCount($request->input('seniors'), 0),
            'student' => $request->boolean('student'),
            'wheelchair' => $request->boolean('wheelchair'),
            'wheelchairPassengers' => (string) $request->input('wheelchairPassengers', ''),
        ];

        $tripType = in_array($request->input('tripType'), ['oneway', 'roundtrip', 'multicity'], true)
            ? $request->input('tripType')
            : 'oneway';
        $returnDateInput = (string) $request->input('returnDate', '');

        $parseDate = function (string $v): ?Carbon {
            try {
                return $v !== '' ? Carbon::parse($v)->startOfDay() : null;
            } catch (\Throwable $e) {
                return null;
            }
        };

        // Normalise every trip type into a list of legs: [from, to, date].
        $legInputs = [];
        if ($tripType === 'multicity') {
            foreach ((array) $request->input('legs', []) as $leg) {
                $legInputs[] = [
                    'from' => trim((string) ($leg['from'] ?? '')),
                    'to' => trim((string) ($leg['to'] ?? '')),
                    'date' => (string) ($leg['date'] ?? ''),
                ];
            }
            $legInputs = array_slice($legInputs, 0, 6);
        } else {
            $legInputs[] = ['from' => $from, 'to' => $to, 'date' => $dateInput];
            if ($tripType === 'roundtrip') {
                $legInputs[] = ['from' => $to, 'to' => $from, 'date' => $returnDateInput];
            }
        }

        $legs = [];
        $searched = false;
        foreach ($legInputs as $leg) {
            $legDate = $parseDate($leg['date']);
            $row = [
                'from' => $leg['from'],
                'to' => $leg['to'],
                'date' => $legDate ? $legDate->format('Y-m-d') : '',
                'results' => [],
                'nearbyDates' => [],
                'searched' => false,
            ];
            if ($leg['from'] !== '' && $leg['to'] !== '' && $legDate) {
                $searched = true;
                $row['searched'] = true;
                $busFrom = $this->stationIds(BusStation::class, $leg['from']);
                $busTo = $this->stationIds(BusStation::class, $leg['to']);
                $trainFrom = $this->stationIds(TrainStation::class, $leg['from']);
                $trainTo = $this->stationIds(TrainStation::class, $leg['to']);

                $row['results'] = $this->collect($busFrom, $busTo, $trainFrom, $trainTo, $legDate, $passengers, $leg['from'], $leg['to']);

                // Cheapest fare per day (either mode) for the day strip above the results.
                for ($i = -1; $i <= 5; $i++) {
                    $day = $legDate->copy()->addDays($i);
                    if ($day->lt(Carbon::today())) {
                        continue;
                    }
                    $row['nearbyDates'][] = [
                        'date' => $day->format('Y-m-d'),
                        'dayName' => $day->format('D'),
                        'dayNumber' => (int) $day->format('j'),
                        'month' => $day->format('M'),
                        'price' => $this->cheapestOn($busFrom, $busTo, $trainFrom, $trainTo, $day),
                        'selected' => $i === 0,
                    ];
                }
            }
            $legs[] = $row;
        }

        $first = $legs[0] ?? ['date' => ''];

        return Inertia::render('Web/home/ticketBooking/LandTicketBooking', [
            'cities' => $this->cityOptions(),
            'legs' => $legs,
            'searched' => $searched,
            'searchParams' => [
                'from' => $from,
                'to' => $to,
                'date' => $tripType === 'multicity' ? $first['date'] : ($parseDate($dateInput)?->format('Y-m-d') ?? ''),
                'mode' => in_array($request->input('mode'), ['bus', 'train'], true) ? $request->input('mode') : 'all',
                'tripType' => $tripType,
                'returnDate' => $returnDateInput,
                'legs' => $tripType === 'multicity' ? $legInputs : [],
            ] + $passengers,
        ]);
    }

    /** Station ids whose city or name matches what the traveller typed. */
    private function stationIds(string $model, string $term): array
    {
        $clean = trim(preg_replace('/\s+(bus|railway)?\s*(station|stand|terminal|junction)$/i', '', $term));

        return $model::query()
            ->where(function ($q) use ($term, $clean) {
                $q->where('city', $term)
                    ->orWhere('city', $clean)
                    ->orWhere('name', $term)
                    ->orWhere('name', 'like', '%' . $clean . '%');
            })
            ->pluck('id')
            ->all();
    }

    private function cityOptions(): array
    {
        return BusStation::query()->whereNotNull('city')->pluck('city')
            ->merge(TrainStation::query()->whereNotNull('city')->pluck('city'))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function collect(array $busFrom, array $busTo, array $trainFrom, array $trainTo, Carbon $date, array $pax, string $from, string $to): array
    {
        $total = $pax['adults'] + $pax['youth'] + $pax['seniors'];
        $extra = http_build_query(array_filter([
            'student' => $pax['student'] ? 1 : null,
            'wheelchair' => $pax['wheelchair'] ? 1 : null,
            'wheelchairPassengers' => $pax['wheelchair'] && $pax['wheelchairPassengers'] !== '' ? $pax['wheelchairPassengers'] : null,
        ]));
        $extra = $extra !== '' ? '&' . $extra : '';
        $day = $date->format('Y-m-d');
        $out = [];

        if ($busFrom && $busTo) {
            BusSchedule::with(['bus', 'departureStation', 'arrivalStation'])
                ->whereIn('departure_station_id', $busFrom)
                ->whereIn('arrival_station_id', $busTo)
                ->where('date', $day)
                ->where('status', 'active')
                ->get()
                ->each(function ($s) use (&$out, $total, $extra, $day) {
                    $minutes = $this->busMinutes($s->departure_time, $s->arrival_time);
                    $out[] = [
                        'key' => 'bus-' . $s->id,
                        'mode' => 'bus',
                        'id' => $s->id,
                        'operator' => $s->bus->operator,
                        'vehicle' => $s->bus->bus_type,
                        'depart' => date('g:i A', strtotime($s->departure_time)),
                        'arrive' => date('g:i A', strtotime($s->arrival_time)),
                        'departMinutes' => $this->minutesOfDay($s->departure_time),
                        'durationMinutes' => $minutes,
                        'duration' => $this->formatDuration($minutes),
                        'price' => (float) $s->price,
                        'seatsAvailable' => (int) $s->available_seats,
                        'soldOut' => $s->available_seats <= 0,
                        'facilities' => $s->bus->facilities ?? [],
                        'departureStation' => $s->departureStation->name,
                        'arrivalStation' => $s->arrivalStation->name,
                        'direct' => true,
                        'expressway' => (bool) $s->is_expressway,
                        'bookUrl' => '/busTicketBookingPreview?' . http_build_query([
                            'id' => $s->id,
                            'from' => $s->departureStation->name,
                            'to' => $s->arrivalStation->name,
                            'date' => $day,
                            'passengers' => $total,
                        ]) . $extra,
                    ];
                });
        }

        if ($trainFrom && $trainTo) {
            TrainSchedule::with(['train', 'departureStation', 'arrivalStation'])
                ->whereIn('departure_station_id', $trainFrom)
                ->whereIn('arrival_station_id', $trainTo)
                ->where('date', $day)
                ->where('status', 'active')
                ->get()
                ->each(function ($s) use (&$out, $pax, $extra) {
                    $minutes = (int) $s->duration_minutes;
                    $out[] = [
                        'key' => 'train-' . $s->id,
                        'mode' => 'train',
                        'id' => $s->id,
                        'operator' => $s->train->operator ?: $s->train->name,
                        'vehicle' => trim($s->train->name . ($s->train->class_type ? ' · ' . $s->train->class_type : '')),
                        'depart' => Carbon::parse($s->departure_time)->format('g:i A'),
                        'arrive' => Carbon::parse($s->arrival_time)->format('g:i A'),
                        'departMinutes' => $this->minutesOfDay($s->departure_time),
                        'durationMinutes' => $minutes,
                        'duration' => $this->formatDuration($minutes),
                        'price' => (float) $s->price,
                        'seatsAvailable' => (int) $s->available_seats,
                        'soldOut' => $s->available_seats <= 0,
                        'facilities' => $s->train->facilities ?? [],
                        'departureStation' => $s->departureStation->name,
                        'arrivalStation' => $s->arrivalStation->name,
                        'direct' => true,
                        'expressway' => false,
                        'bookUrl' => '/trainTicketBookingPreview?' . http_build_query([
                            'schedule_id' => $s->id,
                            'adults' => $pax['adults'],
                            'children' => $pax['youth'],
                            'infants' => 0,
                        ]) . $extra,
                    ];
                });
        }

        usort($out, fn ($a, $b) => $a['departMinutes'] <=> $b['departMinutes']);

        return $out;
    }

    private function cheapestOn(array $busFrom, array $busTo, array $trainFrom, array $trainTo, Carbon $day): ?float
    {
        $prices = [];
        if ($busFrom && $busTo) {
            $prices[] = BusSchedule::whereIn('departure_station_id', $busFrom)
                ->whereIn('arrival_station_id', $busTo)
                ->where('date', $day->format('Y-m-d'))->where('status', 'active')->min('price');
        }
        if ($trainFrom && $trainTo) {
            $prices[] = TrainSchedule::whereIn('departure_station_id', $trainFrom)
                ->whereIn('arrival_station_id', $trainTo)
                ->where('date', $day->format('Y-m-d'))->where('status', 'active')->min('price');
        }
        $prices = array_filter($prices, fn ($p) => $p !== null);

        return $prices ? (float) min($prices) : null;
    }

    private function minutesOfDay($time): int
    {
        $t = Carbon::parse($time);

        return ((int) $t->format('G')) * 60 + (int) $t->format('i');
    }

    private function busMinutes($departure, $arrival): int
    {
        $d = Carbon::parse($departure);
        $a = Carbon::parse($arrival);
        if ($a->lt($d)) {
            $a->addDay();
        }

        return $d->diffInMinutes($a);
    }

    private function formatDuration(int $minutes): string
    {
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;

        return $h > 0 ? sprintf('%dh %02dm', $h, $m) : sprintf('%dm', $m);
    }
}
