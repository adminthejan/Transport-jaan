<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleReview;
use App\Models\User;

class VehicleReviewSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();
        $clients = User::where('role', 'client')->get();

        if ($vehicles->isEmpty() || $clients->isEmpty()) {
            return;
        }

        $comments = [
            ['rating' => 5, 'comment' => 'Excellent vehicle! Very comfortable and clean. The driver was professional and punctual.'],
            ['rating' => 4, 'comment' => 'Great experience overall. The vehicle was in good condition and met all our needs.'],
            ['rating' => 5, 'comment' => 'Exceeded expectations — booking was smooth and the vehicle was exactly as described.'],
            ['rating' => 4, 'comment' => 'Solid choice for the price. Would rent again for a future trip.'],
        ];

        foreach ($vehicles as $index => $vehicle) {
            if (VehicleReview::where('vehicle_id', $vehicle->id)->exists()) {
                continue;
            }

            $client = $clients[$index % $clients->count()];
            $c = $comments[$index % count($comments)];

            VehicleReview::create([
                'vehicle_id' => $vehicle->id,
                'client_id' => $client->id,
                'rating' => $c['rating'],
                'comment' => $c['comment'],
            ]);
        }
    }
}
