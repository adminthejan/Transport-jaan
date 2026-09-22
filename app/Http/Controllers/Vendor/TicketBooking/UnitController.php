<?php

namespace App\Http\Controllers\Vendor\TicketBooking;

use App\Http\Controllers\Controller;
use App\Models\Bus;
use App\Models\BusSchedule;
use App\Models\BusStation;
use App\Models\Train;
use App\Models\TrainSchedule;
use App\Models\TrainStation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Vendor fleet management for Ticket Booking (bus + train). A vendor's own
 * buses/trains are their "units"; each unit has its own schedules, which are
 * the actual bookable inventory the client-facing search hits.
 */
class UnitController extends Controller
{
    public function index()
    {
        $vendorId = Auth::id();

        $buses = Bus::forVendor($vendorId)->withCount('schedules')->latest()->get()
            ->map(fn (Bus $b) => $this->serializeUnit('bus', $b));

        $trains = Train::forVendor($vendorId)->withCount('schedules')->latest()->get()
            ->map(fn (Train $t) => $this->serializeUnit('train', $t));

        $units = $buses->merge($trains)->sortByDesc('created_at')->values();

        return Inertia::render('Web/home/vendors/ticketBooking/Unit', [
            'units' => $units,
        ]);
    }

    public function addUnitPage(Request $request)
    {
        $busStations = BusStation::orderBy('name')->get(['id', 'name', 'city']);
        $trainStations = TrainStation::orderBy('name')->get(['id', 'name', 'city']);

        $editing = null;
        if ($request->filled('type') && $request->filled('id')) {
            $editing = $this->findOwnedUnit($request->string('type'), (int) $request->integer('id'));
            $editing = $editing ? $this->serializeUnit($request->string('type'), $editing, withSchedules: true) : null;
        }

        return Inertia::render('Web/home/vendors/ticketBooking/AddUnit', [
            'busStations' => $busStations,
            'trainStations' => $trainStations,
            'editing' => $editing,
        ]);
    }

    public function unitDetailsPage(string $type, int $id)
    {
        $unit = $this->findOwnedUnit($type, $id);
        abort_unless($unit, 404);

        $busStations = BusStation::orderBy('name')->get(['id', 'name', 'city']);
        $trainStations = TrainStation::orderBy('name')->get(['id', 'name', 'city']);

        return Inertia::render('Web/home/vendors/ticketBooking/UnitDetails', [
            'unit' => $this->serializeUnit($type, $unit, withSchedules: true),
            'busStations' => $busStations,
            'trainStations' => $trainStations,
        ]);
    }

    public function store(Request $request)
    {
        $type = $request->string('type')->lower()->value();
        abort_unless(in_array($type, ['bus', 'train'], true), 422, 'Invalid unit type.');

        $vendorId = Auth::id();

        if ($type === 'bus') {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'bus_number' => 'required|string|max:255|unique:buses,bus_number',
                'bus_type' => 'required|string|max:255',
                'route_number' => 'required|string|max:255',
                'facilities' => 'nullable|array',
                'facilities.*' => 'string|max:50',
                'capacity' => 'required|integer|min:1',
                'operator' => 'nullable|string|max:255',
                'status' => 'required|in:active,inactive,maintenance',
            ]);

            $bus = Bus::create([
                ...$validated,
                'vendor_id' => $vendorId,
                'operator' => $validated['operator'] ?: (Auth::user()->name ?? 'Vendor'),
            ]);

            return redirect()->route('ticketBooking.units')->with('success', 'Bus added successfully.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'train_number' => 'required|string|max:255|unique:trains,train_number',
            'class_type' => 'required|in:1st Class,2nd Class,3rd Class,Luxury (A/C),Semi Luxury (NL)',
            'route_number' => 'required|string|max:255',
            'facilities' => 'nullable|array',
            'facilities.*' => 'string|max:50',
            'capacity' => 'required|integer|min:1',
            'operator' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        Train::create([
            ...$validated,
            'vendor_id' => $vendorId,
            'operator' => $validated['operator'] ?: (Auth::user()->name ?? 'Vendor'),
        ]);

        return redirect()->route('ticketBooking.units')->with('success', 'Train added successfully.');
    }

    public function update(Request $request, string $type, int $id)
    {
        $unit = $this->findOwnedUnit($type, $id);
        abort_unless($unit, 404);

        if ($type === 'bus') {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'bus_number' => 'required|string|max:255|unique:buses,bus_number,' . $id,
                'bus_type' => 'required|string|max:255',
                'route_number' => 'required|string|max:255',
                'facilities' => 'nullable|array',
                'facilities.*' => 'string|max:50',
                'capacity' => 'required|integer|min:1',
                'operator' => 'nullable|string|max:255',
                'status' => 'required|in:active,inactive,maintenance',
            ]);

            $unit->update($validated);

            return redirect()->route('ticketBooking.units')->with('success', 'Bus updated successfully.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'train_number' => 'required|string|max:255|unique:trains,train_number,' . $id,
            'class_type' => 'required|in:1st Class,2nd Class,3rd Class,Luxury (A/C),Semi Luxury (NL)',
            'route_number' => 'required|string|max:255',
            'facilities' => 'nullable|array',
            'facilities.*' => 'string|max:50',
            'capacity' => 'required|integer|min:1',
            'operator' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive,maintenance',
        ]);

        $unit->update($validated);

        return redirect()->route('ticketBooking.units')->with('success', 'Train updated successfully.');
    }

    public function destroy(string $type, int $id)
    {
        $unit = $this->findOwnedUnit($type, $id);
        abort_unless($unit, 404);

        DB::transaction(function () use ($unit, $type) {
            if ($type === 'bus') {
                BusSchedule::where('bus_id', $unit->id)->delete();
            } else {
                TrainSchedule::where('train_id', $unit->id)->delete();
            }
            $unit->delete();
        });

        return redirect()->route('ticketBooking.units')->with('success', ucfirst($type) . ' removed.');
    }

    // ---- Schedules (the actual bookable inventory for a unit) ----

    public function storeSchedule(Request $request, string $type, int $unitId)
    {
        $unit = $this->findOwnedUnit($type, $unitId);
        abort_unless($unit, 404);

        if ($type === 'bus') {
            $validated = $request->validate([
                'departure_station_id' => 'required|exists:bus_stations,id',
                'arrival_station_id' => 'required|exists:bus_stations,id|different:departure_station_id',
                'departure_time' => 'required|date_format:H:i',
                'arrival_time' => 'required|date_format:H:i',
                'duration_minutes' => 'required|integer|min:1',
                'date' => 'required|date',
                'price' => 'required|numeric|min:0',
                'available_seats' => 'required|integer|min:0|max:' . $unit->capacity,
                'is_expressway' => 'nullable|boolean',
                'status' => 'required|in:active,cancelled,completed',
            ]);

            BusSchedule::create([...$validated, 'bus_id' => $unit->id]);

            return back()->with('success', 'Schedule added.');
        }

        $validated = $request->validate([
            'departure_station_id' => 'required|exists:train_stations,id',
            'arrival_station_id' => 'required|exists:train_stations,id|different:departure_station_id',
            'departure_time' => 'required|date_format:H:i',
            'arrival_time' => 'required|date_format:H:i',
            'duration_minutes' => 'required|integer|min:1',
            'date' => 'required|date',
            'price' => 'required|numeric|min:0',
            'available_seats' => 'required|integer|min:0|max:' . $unit->capacity,
            'status' => 'required|in:active,cancelled,delayed',
        ]);

        TrainSchedule::create([...$validated, 'train_id' => $unit->id]);

        return back()->with('success', 'Schedule added.');
    }

    public function updateSchedule(Request $request, string $type, int $unitId, int $scheduleId)
    {
        $unit = $this->findOwnedUnit($type, $unitId);
        abort_unless($unit, 404);

        if ($type === 'bus') {
            $schedule = BusSchedule::where('bus_id', $unit->id)->findOrFail($scheduleId);

            $validated = $request->validate([
                'departure_station_id' => 'required|exists:bus_stations,id',
                'arrival_station_id' => 'required|exists:bus_stations,id|different:departure_station_id',
                'departure_time' => 'required|date_format:H:i',
                'arrival_time' => 'required|date_format:H:i',
                'duration_minutes' => 'required|integer|min:1',
                'date' => 'required|date',
                'price' => 'required|numeric|min:0',
                'available_seats' => 'required|integer|min:0|max:' . $unit->capacity,
                'is_expressway' => 'nullable|boolean',
                'status' => 'required|in:active,cancelled,completed',
            ]);

            $schedule->update($validated);

            return back()->with('success', 'Schedule updated.');
        }

        $schedule = TrainSchedule::where('train_id', $unit->id)->findOrFail($scheduleId);

        $validated = $request->validate([
            'departure_station_id' => 'required|exists:train_stations,id',
            'arrival_station_id' => 'required|exists:train_stations,id|different:departure_station_id',
            'departure_time' => 'required|date_format:H:i',
            'arrival_time' => 'required|date_format:H:i',
            'duration_minutes' => 'required|integer|min:1',
            'date' => 'required|date',
            'price' => 'required|numeric|min:0',
            'available_seats' => 'required|integer|min:0|max:' . $unit->capacity,
            'status' => 'required|in:active,cancelled,delayed',
        ]);

        $schedule->update($validated);

        return back()->with('success', 'Schedule updated.');
    }

    public function destroySchedule(string $type, int $unitId, int $scheduleId)
    {
        $unit = $this->findOwnedUnit($type, $unitId);
        abort_unless($unit, 404);

        if ($type === 'bus') {
            BusSchedule::where('bus_id', $unit->id)->findOrFail($scheduleId)->delete();
        } else {
            TrainSchedule::where('train_id', $unit->id)->findOrFail($scheduleId)->delete();
        }

        return back()->with('success', 'Schedule removed.');
    }

    // ---- Helpers ----

    private function findOwnedUnit(string $type, int $id): Bus|Train|null
    {
        $vendorId = Auth::id();

        return match ($type) {
            'bus' => Bus::forVendor($vendorId)->find($id),
            'train' => Train::forVendor($vendorId)->find($id),
            default => null,
        };
    }

    private function serializeUnit(string $type, Bus|Train $unit, bool $withSchedules = false): array
    {
        $data = [
            'type' => $type,
            'id' => $unit->id,
            'name' => $unit->name,
            'number' => $type === 'bus' ? $unit->bus_number : $unit->train_number,
            'subType' => $type === 'bus' ? $unit->bus_type : $unit->class_type,
            'routeNumber' => $unit->route_number,
            'facilities' => $unit->facilities ?? [],
            'capacity' => $unit->capacity,
            'operator' => $unit->operator,
            'status' => $unit->status,
            'schedulesCount' => $unit->schedules_count ?? $unit->schedules()->count(),
            'created_at' => $unit->created_at?->format('Y-m-d'),
        ];

        if ($withSchedules) {
            $schedules = $type === 'bus'
                ? $unit->schedules()->with(['departureStation', 'arrivalStation'])->orderByDesc('date')->get()
                : $unit->schedules()->with(['departureStation', 'arrivalStation'])->orderByDesc('date')->get();

            $data['schedules'] = $schedules->map(fn ($s) => [
                'id' => $s->id,
                'departureStationId' => $s->departure_station_id,
                'arrivalStationId' => $s->arrival_station_id,
                'departureStation' => $s->departureStation?->name,
                'arrivalStation' => $s->arrivalStation?->name,
                'departureTime' => optional($s->departure_time)->format('H:i'),
                'arrivalTime' => optional($s->arrival_time)->format('H:i'),
                'durationMinutes' => $s->duration_minutes,
                'date' => optional($s->date)->format('Y-m-d'),
                'price' => (float) $s->price,
                'availableSeats' => $s->available_seats,
                'isExpressway' => (bool) ($s->is_expressway ?? false),
                'status' => $s->status,
                'bookingsCount' => $s->bookings()->count(),
            ])->values();
        }

        return $data;
    }
}
