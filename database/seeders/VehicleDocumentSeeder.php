<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Vehicle;
use App\Models\VehicleDocument;

class VehicleDocumentSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = Vehicle::all();

        foreach ($vehicles as $vehicle) {
            if (VehicleDocument::where('vehicle_id', $vehicle->id)->exists()) {
                continue;
            }

            VehicleDocument::create([
                'vehicle_id' => $vehicle->id,
                'doc_type' => 'insurance',
                'provider_name' => 'ABC Insurance Company',
                'policy_or_doc_number' => 'INS-' . str_pad($vehicle->id, 6, '0', STR_PAD_LEFT),
                'issue_date' => now()->subYear(),
                'expiry_date' => now()->addYear(),
                'file_path' => 'vehicles/documents/' . $vehicle->id . '_insurance.pdf',
            ]);

            VehicleDocument::create([
                'vehicle_id' => $vehicle->id,
                'doc_type' => 'registration',
                'provider_name' => 'DMV',
                'policy_or_doc_number' => 'REG-' . str_pad($vehicle->id, 6, '0', STR_PAD_LEFT),
                'issue_date' => now()->subYears(2),
                'expiry_date' => now()->addYears(3),
                'file_path' => 'vehicles/documents/' . $vehicle->id . '_registration.pdf',
            ]);
        }
    }
}
