<?php

namespace App\Http\Controllers;

use App\Models\SeaTicketRequest;
use App\Support\ProfileIdentity;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SeaTicketRequestController extends Controller
{
    /** Sea categories and the sub-categories each one allows. Mirror: resources/js/constants/ticketCategories.js */
    public const CATEGORIES = [
        'Ferry' => ['Passenger', 'High-Speed', 'Vehicle', 'International'],
        'Cruise' => ['Ocean', 'Coastal', 'River', 'Luxury', 'Dinner/Sunset', 'Expedition'],
        'Boat & Water Transfer' => ['Passenger Boat', 'Water Taxi', 'Island Transfer', 'Coastal Transfer'],
        'Yacht & Experiences' => ['Yacht', 'Catamaran', 'Sailing', 'Sightseeing', 'Whale Watching', 'Diving', 'Fishing'],
    ];

    public function page()
    {
        return Inertia::render('Web/home/ticketBooking/SeaTicketBooking');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => ['required', 'string', 'in:' . implode(',', array_keys(self::CATEGORIES))],
            'sub_category' => ['required', 'string', function ($attribute, $value, $fail) use ($request) {
                if (!in_array($value, self::CATEGORIES[$request->input('category')] ?? [], true)) {
                    $fail('Choose a sub-category that belongs to the selected category.');
                }
            }],
            'trip_type' => ['required', 'in:oneway,return'],
            'departure_port' => ['required', 'string', 'max:255'],
            'arrival_port' => ['required', 'string', 'max:255'],
            'travel_date' => ['required', 'date', 'after_or_equal:today'],
            'return_date' => ['nullable', 'required_if:trip_type,return', 'date', 'after:travel_date'],
            'adults' => ['required', 'integer', 'min:1', 'max:200'],
            'children' => ['nullable', 'integer', 'min:0', 'max:200'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'passenger_nic' => ['required', 'regex:/^(\d{9}[VvXx]|\d{12})$/'],
            'special_requests' => ['nullable', 'string', 'max:1000'],
        ], [
            'passenger_nic.regex' => 'Enter a valid NIC (9 digits + V/X, or 12 digits).',
        ]);

        if ($data['trip_type'] !== 'return') {
            $data['return_date'] = null;
        }

        ProfileIdentity::remember($request->user(), $data);

        SeaTicketRequest::create($data + [
            'user_id' => $request->user()->id,
            'booking_reference' => 'SEA-' . strtoupper(Str::random(8)),
            'children' => $data['children'] ?? 0,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Your sea ticket request has been submitted. Our team will confirm pricing and availability shortly.');
    }
}
