<?php

namespace App\Http\Controllers\CourierControllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Courier\CourierVehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Vendor's own delivery fleet for Courier Service ("Units" -> "Add Unit").
 * Mirrors the pattern used by App\Http\Controllers\Vendor\VehicleController
 * for the Vehicle Rental service.
 */
class CourierVehicleController extends Controller
{
    public function index(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        abort_if($vendorId <= 0, 403, 'No active courier workspace for this account.');

        $vehicles = CourierVehicle::where('vendor_id', $vendorId)
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Web/home/vendors/courierService/Vehicles', [
            'vehicles' => $vehicles,
        ]);
    }

    public function destroy(Request $request, CourierVehicle $vehicle)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        abort_if($vehicle->vendor_id !== $vendorId, 403);

        Storage::disk('public')->deleteDirectory("courier/vehicles/{$vehicle->id}");
        $vehicle->delete();

        return redirect()->route('courierService.vehicles')->with('success', 'Vehicle removed.');
    }

    public function store(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        abort_if($vendorId <= 0, 403, 'No active courier workspace for this account.');

        // The form submits booleans as the literal strings "true"/"false" (FormData
        // has no boolean type). Laravel's `boolean` validation rule only accepts
        // true, false, 0, 1, '0', '1' - not those strings - so normalize first.
        $request->merge([
            'refrigerated'   => $request->boolean('refrigerated'),
            'tailLift'       => $request->boolean('tailLift'),
            'gps'            => $request->boolean('gps'),
            'fragileSupport' => $request->boolean('fragileSupport'),
        ]);

        $validated = $request->validate([
            'vehicleType'        => ['nullable', 'string', 'max:50'],
            'brand'              => ['nullable', 'string', 'max:255'],
            'model'              => ['nullable', 'string', 'max:255'],
            'registrationNumber' => ['nullable', 'string', 'max:255'],
            'baseLocation'       => ['nullable', 'string', 'max:255'],
            'serviceAreas'       => ['nullable', 'string', 'max:500'],

            'capacityKg'         => ['nullable', 'numeric', 'min:0'],
            'volumeCbm'          => ['nullable', 'numeric', 'min:0'],
            'lengthCm'           => ['nullable', 'integer', 'min:0'],
            'widthCm'            => ['nullable', 'integer', 'min:0'],
            'heightCm'           => ['nullable', 'integer', 'min:0'],
            'fuelType'           => ['nullable', 'string', 'max:50'],
            'transmissionType'   => ['nullable', 'string', 'max:50'],

            'insuranceProvider'  => ['nullable', 'string', 'max:255'],
            'pricePerKm'         => ['nullable', 'numeric', 'min:0'],
            'baseFee'            => ['nullable', 'numeric', 'min:0'],
            'handlingSurcharge'  => ['nullable', 'numeric', 'min:0'],

            'refrigerated'       => ['nullable', 'boolean'],
            'tailLift'           => ['nullable', 'boolean'],
            'gps'                => ['nullable', 'boolean'],
            'fragileSupport'     => ['nullable', 'boolean'],

            'status'             => ['nullable', 'string', 'in:Available,In Service,Maintenance'],
            'unitsCount'         => ['nullable', 'integer', 'min:1'],
            'description'        => ['nullable', 'string'],

            'images.*'           => ['nullable', 'file', 'mimes:jpg,jpeg,png,gif,webp', 'max:10240'],
            'insuranceDocs.*'    => ['nullable', 'file', 'mimes:pdf,doc,docx,png,jpg,jpeg,webp,gif', 'max:10240'],
        ]);

        $vehicle = CourierVehicle::create([
            'vendor_id'            => $vendorId,
            'vehicle_type'         => $validated['vehicleType'] ?? null,
            'brand'                => $validated['brand'] ?? null,
            'model'                => $validated['model'] ?? null,
            'registration_number'  => $validated['registrationNumber'] ?? null,
            'base_location'        => $validated['baseLocation'] ?? null,
            'service_areas'        => $validated['serviceAreas'] ?? null,
            'capacity_kg'          => $validated['capacityKg'] ?? null,
            'volume_cbm'           => $validated['volumeCbm'] ?? null,
            'length_cm'            => $validated['lengthCm'] ?? null,
            'width_cm'             => $validated['widthCm'] ?? null,
            'height_cm'            => $validated['heightCm'] ?? null,
            'fuel_type'            => $validated['fuelType'] ?? null,
            'transmission_type'    => $validated['transmissionType'] ?? null,
            'insurance_provider'   => $validated['insuranceProvider'] ?? null,
            'price_per_km'         => $validated['pricePerKm'] ?? null,
            'base_fee'             => $validated['baseFee'] ?? null,
            'handling_surcharge'   => $validated['handlingSurcharge'] ?? null,
            'refrigerated'         => $request->boolean('refrigerated'),
            'tail_lift'            => $request->boolean('tailLift'),
            'gps'                  => $request->boolean('gps'),
            'fragile_support'      => $request->boolean('fragileSupport'),
            'status'               => $validated['status'] ?? 'Available',
            'units_count'          => $validated['unitsCount'] ?? 1,
            'description'          => $validated['description'] ?? null,
        ]);

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file) {
                    $file->store("courier/vehicles/{$vehicle->id}/images", 'public');
                }
            }
        }

        if ($request->hasFile('insuranceDocs')) {
            foreach ($request->file('insuranceDocs') as $file) {
                if ($file) {
                    $file->store("courier/vehicles/{$vehicle->id}/documents", 'public');
                }
            }
        }

        return redirect()
            ->route('courierService.units')
            ->with('success', 'Courier vehicle saved successfully.');
    }
}
