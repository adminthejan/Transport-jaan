<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DriverController extends Controller
{
    public function index(Request $request)
    {
        $query = Driver::query();

        // Filter by authenticated vendor's user_id
        $query->where('user_id', auth()->id());

        // Dedicated status filter
        if ($status = $request->query('status')) {
            if (in_array($status, ['Active', 'Inactive'], true)) {
                $query->where('status', $status);
            }
        }

        // General search across other fields (excluding status from general search)
        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('license_no', 'like', "%{$search}%")
                  ->orWhere('vehicle_no', 'like', "%{$search}%")
                  ->orWhere('vehicle_type', 'like', "%{$search}%");
            });
        }

        $sort = $request->query('sort', 'created_at');
        $dir  = strtolower($request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowed = ['full_name','phone','vehicle_no','vehicle_type','license_no','license_expiry','status','created_at'];
        if (!in_array($sort, $allowed, true)) $sort = 'created_at';

        $query->orderBy($sort, $dir);
        $perPage = (int) $request->query('per_page', 10);

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'full_name'      => 'required|string|max:255',
            'phone'          => ['required', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]{10,20}$/', 'unique:drivers,phone'],
            'email'          => 'nullable|email|max:255|unique:drivers,email',
            'license_no'     => ['required', 'string', 'max:100', 'regex:/^[A-Z0-9\-\/\s]{5,20}$/i', 'unique:drivers,license_no'],
            'license_expiry' => 'nullable|date',
            'vehicle_type'   => 'required|string|max:100',
            'vehicle_no'     => ['nullable', 'string', 'max:100', 'regex:/^[A-Z]{1,3}[\s\-]?[A-Z0-9]{1,4}[\s\-]?[0-9]{1,4}$/i', 'unique:drivers,vehicle_no'],
            'address'        => 'nullable|string',
            'notes'          => 'nullable|string',
            'preferred_language' => ['nullable', Rule::in(['Sinhala', 'English', 'Tamil'])],
            'daily_rate'     => 'nullable|numeric|min:0',
            'overtime_rate_per_hour' => 'nullable|numeric|min:0',
            'license_photo'  => 'required|image|max:4096',
            'nic_photo'      => 'required|image|max:4096',
        ], [
            'phone.regex' => 'Phone number format is invalid. Use format: +94 77 123 4567 or 0771234567',
            'phone.unique' => 'This phone number is already registered.',
            'email.unique' => 'This email address is already registered.',
            'license_no.regex' => 'License number format is invalid. Use letters, numbers, hyphens, or slashes (e.g., B1234567 or DL/2023/12345)',
            'license_no.unique' => 'This license number is already registered.',
            'vehicle_no.regex' => 'Vehicle number format is invalid. Use format: WP ABC-1234 or CAA-1234',
            'vehicle_no.unique' => 'This vehicle number is already registered.',
        ]);

        // Assign the driver to the authenticated vendor and set status to Inactive (pending admin approval)
        $data['user_id'] = auth()->id();
        $data['status'] = 'Inactive'; // Driver must be approved by SuperAdmin before becoming Active

        if ($request->hasFile('license_photo')) {
            $data['license_photo_path'] = $request->file('license_photo')->store('drivers/licenses', 'public');
        }
        if ($request->hasFile('nic_photo')) {
            $data['nic_photo_path'] = $request->file('nic_photo')->store('drivers/nics', 'public');
        }

        $driver = Driver::create($data);
        return response()->json($driver, 201);
    }

    public function show(Driver $driver)
    {
        return response()->json($driver);
    }

    public function update(Request $request, Driver $driver)
    {
        $data = $request->validate([
            'full_name'      => 'sometimes|required|string|max:255',
            'phone'          => ['sometimes', 'required', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]{10,20}$/', Rule::unique('drivers')->ignore($driver->id)],
            'email'          => ['nullable', 'email', 'max:255', Rule::unique('drivers')->ignore($driver->id)],
            'license_no'     => ['sometimes', 'required', 'string', 'max:100', 'regex:/^[A-Z0-9\-\/\s]{5,20}$/i', Rule::unique('drivers')->ignore($driver->id)],
            'license_expiry' => 'nullable|date',
            'vehicle_type'   => 'sometimes|required|string|max:100',
            'vehicle_no'     => ['sometimes', 'required', 'string', 'max:100', 'regex:/^[A-Z]{1,3}[\s\-]?[A-Z0-9]{1,4}[\s\-]?[0-9]{1,4}$/i', Rule::unique('drivers')->ignore($driver->id)],
            'status'         => ['nullable', Rule::in(['Active','Inactive'])],
            'address'        => 'nullable|string',
            'notes'          => 'nullable|string',
            'preferred_language' => ['nullable', Rule::in(['Sinhala', 'English', 'Tamil'])],
            'daily_rate'     => 'nullable|numeric|min:0',
            'overtime_rate_per_hour' => 'nullable|numeric|min:0',
            'license_photo'  => 'nullable|image|max:4096',
            'nic_photo'      => 'nullable|image|max:4096',
        ], [
            'phone.unique' => 'This phone number is already registered.',
            'email.unique' => 'This email address is already registered.',
            'license_no.regex' => 'License number format is invalid. Use letters, numbers, hyphens, or slashes (e.g., B1234567 or DL/2023/12345)',
            'license_no.unique' => 'This license number is already registered.',
            'vehicle_no.regex' => 'Vehicle number format is invalid. Use format: WP ABC-1234 or CAA-1234',
            'vehicle_no.unique' => 'This vehicle number is already registered.',
        ]);

        if ($request->hasFile('license_photo')) {
            if ($driver->license_photo_path) Storage::disk('public')->delete($driver->license_photo_path);
            $data['license_photo_path'] = $request->file('license_photo')->store('drivers/licenses', 'public');
        }

        if ($request->hasFile('nic_photo')) {
            if ($driver->nic_photo_path) Storage::disk('public')->delete($driver->nic_photo_path);
            $data['nic_photo_path'] = $request->file('nic_photo')->store('drivers/nics', 'public');
        }

        $driver->update($data);
        return response()->json($driver);
    }

    public function destroy(Driver $driver)
    {
        if ($driver->license_photo_path) Storage::disk('public')->delete($driver->license_photo_path);
        if ($driver->nic_photo_path) Storage::disk('public')->delete($driver->nic_photo_path);
        $driver->delete();
        return response()->json(null, 204);
    }

    /**
     * Vendor re-uploads a new driving license.
     * Validates that the new expiry is in the future, stores the photo,
     * sets driver status back to Active, and restores the linked user account
     * from 'suspended' to 'verified'.
     */
    public function renewLicense(Request $request, Driver $driver)
    {
        // Ensure the driver belongs to the authenticated vendor
        abort_unless($driver->user_id === auth()->id(), 403);

        $validated = $request->validate([
            'license_no'     => ['required', 'string', 'max:100', 'regex:/^[A-Z0-9\-\/\s]{5,20}$/i'],
            'license_expiry' => 'required|date|after:today',
            'license_photo'  => 'required|image|max:4096',
        ], [
            'license_expiry.after' => 'The new license expiry date must be in the future.',
        ]);

        // Store the new license data as PENDING — the original license fields are
        // intentionally left unchanged until the Super Admin approves the renewal.
        // This prevents a vendor from bypassing expiry checks with a fake future date.
        $pendingData = [
            'pending_license_no'     => $validated['license_no'],
            'pending_license_expiry' => $validated['license_expiry'],
            'license_review_status'  => 'pending_review',
        ];

        // Store the new photo in a pending folder; delete any previous pending photo
        if ($driver->pending_license_photo_path) {
            Storage::disk('public')->delete($driver->pending_license_photo_path);
        }
        $pendingData['pending_license_photo_path'] = $request->file('license_photo')
            ->store('drivers/licenses/pending', 'public');

        $driver->update($pendingData);

        return response()->json([
            'message' => 'License renewal submitted for admin review. The driver will be reactivated once the Super Admin approves.',
            'driver'  => $driver->fresh(),
        ]);
    }

    public function streamLicense(Driver $driver)
    {
        abort_unless($driver->license_photo_path, 404);
        return Storage::disk('public')->response($driver->license_photo_path);
    }

    public function streamNic(Driver $driver)
    {
        abort_unless($driver->nic_photo_path, 404);
        return Storage::disk('public')->response($driver->nic_photo_path);
    }

    public function downloadLicense(Driver $driver)
    {
        abort_unless($driver->license_photo_path, 404);
        return Storage::disk('public')->download($driver->license_photo_path, basename($driver->license_photo_path));
    }

    public function downloadNic(Driver $driver)
    {
        abort_unless($driver->nic_photo_path, 404);
        return Storage::disk('public')->download($driver->nic_photo_path, basename($driver->nic_photo_path));
    }
}
