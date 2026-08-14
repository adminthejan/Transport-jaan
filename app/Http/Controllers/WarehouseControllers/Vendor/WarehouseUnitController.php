<?php

namespace App\Http\Controllers\WarehouseControllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class WarehouseUnitController extends Controller
{
    // Warehouse Type describes the facility itself; Services describes what a
    // client can book on top of storage. Kept as two separate filters/fields.
    private const WAREHOUSE_TYPES = [
        'general_warehouse', 'bonded_warehouse', 'cold_storage',
        'distribution_center', 'fulfillment_center', 'smart_warehouse',
    ];

    private const WAREHOUSE_SERVICES = [
        'storage', 'fulfillment', 'distribution',
        'value_added_services', 'customs_services', 'transportation',
    ];

    public function index(Request $request)
    {
        $query = WarehouseUnit::where('user_id', Auth::id())
            ->with(['amenities', 'images', 'documents', 'currentApproval']);

        // Add search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        // Add status filter
        if ($request->filled('status_filter')) {
            $status = $request->get('status_filter');
            if ($status === 'approved') {
                $query->whereHas('currentApproval', function($q) {
                    $q->where('status', 'approved');
                });
            } elseif ($status === 'pending') {
                $query->whereHas('currentApproval', function($q) {
                    $q->where('status', 'pending');
                });
            } elseif ($status === 'rejected') {
                $query->whereHas('currentApproval', function($q) {
                    $q->where('status', 'rejected');
                });
            } elseif ($status === 'suspended') {
                $query->where('is_active', false);
            }
        }

        // Add type filter
        if ($request->filled('type_filter')) {
            $query->where('type', $request->get('type_filter'));
        }

        // Order by latest first
        $query->orderBy('created_at', 'desc');

        // Paginate results
        $perPage = $request->get('per_page', 10);
        $units = $query->paginate($perPage);

        // Transform the data to match frontend expectations
        $units->getCollection()->transform(function ($unit) {
            return [
                'id' => $unit->id,
                'name' => $unit->name,
                'description' => $unit->description,
                'address' => $unit->address,
                'latitude' => $unit->latitude,
                'longitude' => $unit->longitude,
                'total_area' => $unit->total_area,
                'capacity' => $unit->capacity,
                'capacity_unit' => $unit->capacity_unit,
                'type' => $unit->type,
                'services' => $unit->services ?? [],
                'amenities' => $unit->amenities->map(function($amenity) {
                    return [
                        'id' => $amenity->id,
                        'name' => $amenity->name,
                        'description' => $amenity->description,
                        'is_included' => $amenity->is_included,
                        'additional_cost' => $amenity->additional_cost,
                        'cost_frequency' => $amenity->cost_frequency,
                        'is_available' => $amenity->is_available,
                    ];
                }),
                'pricing_model' => $unit->pricing_model,
                'base_price' => $unit->base_price,
                'monthly_rate' => $unit->monthly_rate,
                'security_deposit' => $unit->security_deposit,
                'setup_fee' => $unit->setup_fee,
                'tax_rate' => $unit->tax_rate,
                'offers_fulfillment' => (bool) $unit->offers_fulfillment,
                'fulfillment_fee_rate' => $unit->fulfillment_fee_rate,
                'total_amount' => $unit->total_amount,
                'tax_amount' => $unit->tax_amount,
                'final_amount' => $unit->final_amount,
                'currency' => $unit->currency,
                'contact_person' => $unit->contact_person,
                'contact_phone' => $unit->contact_phone,
                'contact_email' => $unit->contact_email,
                'status' => $this->getUnitStatus($unit),
                'is_active' => $unit->is_active,
                'is_available' => $unit->is_available,
                'availability_status' => $this->getAvailabilityStatus($unit),
                'approval_status' => $unit->currentApproval?->status ?? 'pending',
                'images' => $unit->images->map(function($image) {
                    return [
                        'id' => $image->id,
                        'url' => $image->url,
                        'alt_text' => $image->alt_text,
                        'caption' => $image->caption,
                        'type' => $image->type,
                        'sort_order' => $image->sort_order,
                    ];
                }),
                'documents' => $unit->documents->where('is_public', true)->map(function($document) {
                    return [
                        'id' => $document->id,
                        'title' => $document->document_title,
                        'type' => $document->type,
                        'url' => $document->url,
                        'size' => $document->formatted_size,
                    ];
                }),
                'created_at' => $unit->created_at,
                'updated_at' => $unit->updated_at,
            ];
        });

        return response()->json($units);
    }

    private function getUnitStatus($unit)
    {
        if (!$unit->is_active) {
            return 'Inactive';
        }
        
        $approvalStatus = $unit->currentApproval?->status ?? 'pending';
        
        if ($approvalStatus === 'pending' || $approvalStatus === 'under_review') {
            return 'Pending Approval';
        }
        
        if ($approvalStatus === 'rejected') {
            return 'Rejected';
        }
        
        if ($approvalStatus === 'suspended') {
            return 'Suspended';
        }
        
        if ($approvalStatus === 'maintenance') {
            return 'Under Maintenance';
        }
        
        // For approved units, check availability
        if ($approvalStatus === 'approved') {
            return $unit->is_available ? 'Available' : 'Occupied';
        }
        
        return 'Unavailable';
    }

    private function getAvailabilityStatus($unit)
    {
        if (!$unit->is_active) {
            return 'Inactive';
        }
        
        $approvalStatus = $unit->currentApproval?->status ?? 'pending';
        
        if ($approvalStatus === 'pending' || $approvalStatus === 'under_review') {
            return 'Pending Approval';
        }
        
        if ($approvalStatus === 'rejected') {
            return 'Rejected';
        }
        
        if ($approvalStatus === 'suspended') {
            return 'Suspended';
        }
        
        if ($approvalStatus === 'maintenance') {
            return 'Under Maintenance';
        }
        
        if ($approvalStatus === 'approved') {
            return $unit->is_available ? 'Available' : 'Occupied';
        }
        
        return 'Unavailable';
    }

    public function store(Request $request)
    {
        // Check if the request size is too large
        if ($request->hasFile('images') && count($request->file('images')) > 20) {
            return back()->withErrors(['images' => 'You can upload a maximum of 20 images.'])->withInput();
        }

        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'address' => ['required', 'string'],
                'latitude' => ['nullable', 'numeric', 'between:-90,90'],
                'longitude' => ['nullable', 'numeric', 'between:-180,180'],
                'total_area' => ['nullable', 'numeric', 'min:0'],
                'capacity' => ['nullable', 'numeric', 'min:0'],
                'capacity_unit' => ['nullable', 'string', 'in:sq_ft,sq_m,cubic_ft,cubic_m'],
                'type' => ['required', 'string', Rule::in(self::WAREHOUSE_TYPES)],
                // Sent as a JSON-encoded string over multipart form data, same as amenities.
                'services' => ['nullable'],
                'pricing_model' => ['required', 'string', Rule::in(['hourly', 'daily', 'monthly', 'yearly'])],
                'base_price' => ['nullable', 'numeric', 'min:0'],
                'price' => ['nullable', 'numeric', 'min:0'],
                'monthly_rate' => ['nullable', 'numeric', 'min:0'],
                'security_deposit' => ['nullable', 'numeric', 'min:0'],
                'setup_fee' => ['nullable', 'numeric', 'min:0'],
                'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'fulfillment_fee_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'total_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'final_amount' => ['nullable', 'numeric', 'min:0'],
                'currency' => ['nullable', 'string', 'size:3'],
                'contact_person' => ['nullable', 'string', 'max:255'],
                'contact_phone' => ['nullable', 'string', 'max:20'],
                'contact_email' => ['nullable', 'email', 'max:255'],
                'amenities' => ['nullable'],
                'images.*' => ['nullable', 'image', 'mimes:jpeg,jpg,png,gif,webp', 'max:51200'],
                'documents.*' => ['nullable', 'file', 'mimes:pdf,doc,docx,txt', 'max:51200'],
                'terms_conditions' => ['nullable', 'string'],
                'terms_pdf' => ['nullable', 'file', 'mimes:pdf', 'max:51200'],
                'is_active' => ['nullable', Rule::in(['0','1'])],
                'is_available' => ['nullable', Rule::in(['0','1'])],
                'available_from' => ['nullable', 'date'],
                'available_until' => ['nullable', 'date'],
                'operating_hours' => ['nullable', 'array'],
                'special_requirements' => ['nullable', 'string'],
                'restrictions' => ['nullable', 'string'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            if (empty($_POST) && empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
                return back()->withErrors(['error' => 'The uploaded files are too large. Please reduce the file sizes or upload fewer files.'])->withInput();
            }
            throw $e;
        }

        // Helper function to convert empty strings to null for numeric fields
        $nullIfEmpty = function($value) {
            return ($value === '' || $value === null) ? null : $value;
        };

        $normalizeTaxRate = function($value) use ($nullIfEmpty) {
            $clean = $nullIfEmpty($value);
            if ($clean === null) {
                return null;
            }

            $numeric = (float) $clean;
            return $numeric > 1 ? ($numeric / 100) : $numeric;
        };

        // Parse amenities if they come as JSON string
        $amenities = [];
        if (isset($validated['amenities'])) {
            if (is_string($validated['amenities'])) {
                $amenities = json_decode($validated['amenities'], true) ?? [];
            } else {
                $amenities = $validated['amenities'];
            }
        }

        // Parse services the same way (JSON string over multipart form data,
        // plain array otherwise). "Fulfillment" here is the single source of
        // truth for whether this listing offers the fulfillment add-on.
        $services = [];
        if (isset($validated['services'])) {
            $services = is_string($validated['services'])
                ? (json_decode($validated['services'], true) ?? [])
                : $validated['services'];
        }
        $services = array_values(array_intersect(is_array($services) ? $services : [], self::WAREHOUSE_SERVICES));
        $offersFulfillment = in_array('fulfillment', $services, true);

        // Create the main warehouse unit
        $unit = WarehouseUnit::create([
            'user_id' => Auth::id(),
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'address' => $validated['address'],
            'latitude' => $nullIfEmpty($validated['latitude'] ?? null),
            'longitude' => $nullIfEmpty($validated['longitude'] ?? null),
            'total_area' => $nullIfEmpty($validated['total_area'] ?? null),
            'capacity' => $nullIfEmpty($validated['capacity'] ?? null),
            'capacity_unit' => $validated['capacity_unit'] ?? 'sq_ft',
            'type' => $validated['type'],
            'services' => $services,
            'pricing_model' => $validated['pricing_model'],
            'base_price' => $validated['price'] ?? $validated['base_price'] ?? $validated['monthly_rate'],
            'monthly_rate' => $nullIfEmpty($validated['monthly_rate'] ?? null),
            'security_deposit' => $nullIfEmpty($validated['security_deposit'] ?? null),
            'setup_fee' => $nullIfEmpty($validated['setup_fee'] ?? null),
            'tax_rate' => $normalizeTaxRate($validated['tax_rate'] ?? null),
            'offers_fulfillment' => $offersFulfillment,
            'fulfillment_fee_rate' => $nullIfEmpty($validated['fulfillment_fee_rate'] ?? null),
            'total_amount' => $nullIfEmpty($validated['total_amount'] ?? null),
            'tax_amount' => $nullIfEmpty($validated['tax_amount'] ?? null),
            'final_amount' => $nullIfEmpty($validated['final_amount'] ?? null),
            'currency' => $validated['currency'] ?? 'LKR',
            'contact_person' => $validated['contact_person'] ?? null,
            'contact_phone' => $validated['contact_phone'] ?? null,
            'contact_email' => $validated['contact_email'] ?? null,
            'terms_conditions' => $validated['terms_conditions'] ?? null,
            'is_active' => ($validated['is_active'] ?? '1') === '1',
            'is_available' => ($validated['is_available'] ?? '1') === '1',
            'available_from' => $validated['available_from'] ?? null,
            'available_until' => $validated['available_until'] ?? null,
            'operating_hours' => $validated['operating_hours'] ?? null,
            'special_requirements' => $validated['special_requirements'] ?? null,
            'restrictions' => $validated['restrictions'] ?? null,
        ]);

        // Create amenities
        if (!empty($amenities)) {
            foreach ($amenities as $amenityName) {
                // Handle both string amenities and object amenities
                if (is_string($amenityName)) {
                    $unit->amenities()->create([
                        'name' => $amenityName,
                        'description' => null,
                        'is_included' => true,
                        'additional_cost' => null,
                        'cost_frequency' => null,
                        'is_available' => true,
                    ]);
                } elseif (is_array($amenityName) && isset($amenityName['name'])) {
                    $unit->amenities()->create([
                        'name' => $amenityName['name'],
                        'description' => $amenityName['description'] ?? null,
                        'is_included' => $amenityName['is_included'] ?? true,
                        'additional_cost' => $amenityName['additional_cost'] ?? null,
                        'cost_frequency' => $amenityName['cost_frequency'] ?? null,
                        'is_available' => true,
                    ]);
                }
            }
        }

        // Handle images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                $imagePath = $image->store('warehouse/images', 'public');
                $dimensions = null;
                
                // Try to get image dimensions
                try {
                    $imageInfo = getimagesize($image->getPathname());
                    if ($imageInfo) {
                        $dimensions = ['width' => $imageInfo[0], 'height' => $imageInfo[1]];
                    }
                } catch (\Exception $e) {
                    // Ignore if we can't get dimensions
                }

                $unit->images()->create([
                    'file_path' => $imagePath,
                    'original_name' => $image->getClientOriginalName(),
                    'type' => $index === 0 ? 'main' : 'gallery',
                    'sort_order' => $index,
                    'mime_type' => $image->getMimeType(),
                    'file_size' => $image->getSize(),
                    'dimensions' => $dimensions,
                    'is_active' => true,
                ]);
            }
        }

        // Handle documents
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $document) {
                $documentPath = $document->store('warehouse/documents', 'public');
                
                $unit->documents()->create([
                    'file_path' => $documentPath,
                    'original_name' => $document->getClientOriginalName(),
                    'document_title' => pathinfo($document->getClientOriginalName(), PATHINFO_FILENAME),
                    'type' => 'other',
                    'mime_type' => $document->getMimeType(),
                    'file_size' => $document->getSize(),
                    'is_public' => false,
                    'is_required' => false,
                    'version' => 1,
                    'uploaded_by' => Auth::id(),
                    'is_active' => true,
                ]);
            }
        }

        // Handle terms PDF
        if ($request->hasFile('terms_pdf')) {
            $termsPdf = $request->file('terms_pdf');
            $termsPdfPath = $termsPdf->store('warehouse/terms', 'public');
            
            // Update the warehouse unit with terms PDF path
            $unit->update(['terms_pdf_path' => $termsPdfPath]);
            
            $unit->documents()->create([
                'file_path' => $termsPdfPath,
                'original_name' => $termsPdf->getClientOriginalName(),
                'document_title' => 'Terms and Conditions',
                'type' => 'terms_conditions',
                'mime_type' => $termsPdf->getMimeType(),
                'file_size' => $termsPdf->getSize(),
                'is_public' => true,
                'is_required' => true,
                'version' => 1,
                'uploaded_by' => Auth::id(),
                'is_active' => true,
            ]);
        }

        // Create initial approval record
        $unit->approvals()->create([
            'status' => 'pending',
            'notes' => 'Initial submission for approval',
        ]);

        return redirect()
            ->route('vendors.warehouse.units')
            ->with('success', 'Warehouse unit created successfully and submitted for approval.');
    }

    public function show($id)
    {
        try {
            Log::info('Fetching warehouse unit', ['id' => $id, 'user_id' => Auth::id()]);
            
            $unit = WarehouseUnit::where('id', $id)
                ->where('user_id', Auth::id())
                ->with(['amenities', 'images', 'documents', 'currentApproval'])
                ->first();

            if (!$unit) {
                Log::warning('Warehouse unit not found', ['id' => $id, 'user_id' => Auth::id()]);
                return response()->json(['error' => 'Warehouse unit not found'], 404);
            }
            
            Log::info('Warehouse unit found', [
                'unit_id' => $unit->id,
                'amenities_count' => $unit->amenities->count(),
                'images_count' => $unit->images->count(),
                'documents_count' => $unit->documents->count(),
            ]);

            // Get amenities as array of names for frontend compatibility
            $amenitiesArray = [];
            if ($unit->amenities && $unit->amenities->count() > 0) {
                $amenitiesArray = $unit->amenities->pluck('name')->toArray();
            }

            // Get images as URLs for frontend compatibility
            $imagesArray = [];
            if ($unit->images && $unit->images->count() > 0) {
                $imagesArray = $unit->images->map(function($image) {
                    try {
                        return $image->url;
                    } catch (\Exception $e) {
                        Log::warning('Error getting image URL', ['image_id' => $image->id, 'error' => $e->getMessage()]);
                        return null;
                    }
                })->filter()->values()->toArray(); // Filter out null URLs and re-index
            }

            // Get documents as URLs for frontend compatibility  
            $documentsArray = [];
            if ($unit->documents && $unit->documents->count() > 0) {
                $documentsArray = $unit->documents->map(function($document) {
                    try {
                        return $document->url;
                    } catch (\Exception $e) {
                        Log::warning('Error getting document URL', ['document_id' => $document->id, 'error' => $e->getMessage()]);
                        return null;
                    }
                })->filter()->values()->toArray(); // Filter out null URLs and re-index
            }

            // Handle terms PDF path - ensure it's accessible
            $termsPdfPath = null;
            if ($unit->terms_pdf_path) {
                try {
                    $termsPdfPath = Storage::url($unit->terms_pdf_path);
                } catch (\Exception $e) {
                    Log::warning('Error getting terms PDF URL', ['path' => $unit->terms_pdf_path, 'error' => $e->getMessage()]);
                    $termsPdfPath = null;
                }
            }

            // Handle legacy price field compatibility
            $price = $unit->base_price ?? $unit->monthly_rate ?? '';

            $responseData = [
                'id' => $unit->id,
                'name' => $unit->name ?? '',
                'description' => $unit->description ?? '',
                'address' => $unit->address ?? '',
                'latitude' => $unit->latitude ?? '',
                'longitude' => $unit->longitude ?? '',
                'total_area' => $unit->total_area ?? '',
                'capacity' => $unit->capacity ?? '',
                'capacity_unit' => $unit->capacity_unit ?? 'sq_ft',
                'type' => $unit->type ?? '',
                'services' => $unit->services ?? [],
                'amenities' => $amenitiesArray,
                'pricing_model' => $unit->pricing_model ?? '',
                'price' => $price, // Legacy price field
                'base_price' => $unit->base_price ?? '',
                'monthly_rate' => $unit->monthly_rate ?? '',
                'security_deposit' => $unit->security_deposit ?? '',
                'setup_fee' => $unit->setup_fee ?? '',
                'tax_rate' => $unit->tax_rate ?? '',
                'offers_fulfillment' => (bool) $unit->offers_fulfillment,
                'fulfillment_fee_rate' => $unit->fulfillment_fee_rate ?? '',
                'total_amount' => $unit->total_amount ?? '',
                'tax_amount' => $unit->tax_amount ?? '',
                'final_amount' => $unit->final_amount ?? '',
                'currency' => $unit->currency ?? 'LKR',
                'contact_person' => $unit->contact_person ?? '',
                'contact_phone' => $unit->contact_phone ?? '',
                'contact_email' => $unit->contact_email ?? '',
                'images' => $imagesArray,
                'documents' => $documentsArray,
                'terms_conditions' => $unit->terms_conditions ?? '',
                'terms_pdf_path' => $termsPdfPath,
                'is_active' => $unit->is_active ?? true,
                'is_available' => $unit->is_available ?? true,
                'available_from' => $unit->available_from,
                'available_until' => $unit->available_until,
                'operating_hours' => $unit->operating_hours,
                'special_requirements' => $unit->special_requirements ?? '',
                'restrictions' => $unit->restrictions ?? '',
                'approval_status' => $unit->currentApproval?->status ?? 'pending',
                'approval_notes' => $unit->currentApproval?->notes ?? '',
                'rejection_reason' => $unit->currentApproval?->rejection_reason ?? '',
                'approved_at' => $unit->currentApproval?->approved_at,
                'status' => $this->getUnitStatus($unit),
                'availability_status' => $this->getAvailabilityStatus($unit),
                'created_at' => $unit->created_at,
                'updated_at' => $unit->updated_at,
            ];
            
            Log::info('Returning warehouse unit data', [
                'unit_id' => $unit->id,
                'response_keys' => array_keys($responseData),
                'amenities_count' => count($amenitiesArray),
                'images_count' => count($imagesArray),
                'documents_count' => count($documentsArray),
            ]);

            return response()->json($responseData);
            
        } catch (\Exception $e) {
            Log::error('Error fetching warehouse unit: ' . $e->getMessage(), [
                'unit_id' => $id,
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to load warehouse data. Please try again.'
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $unit = WarehouseUnit::where('id', $id)
                ->where('user_id', Auth::id())
                ->with(['images', 'documents', 'amenities'])
                ->first();

            if (!$unit) {
                return response()->json(['error' => 'Warehouse unit not found'], 404);
            }

            // Check if the request size is too large
            if ($request->hasFile('images') && count($request->file('images')) > 20) {
                return response()->json(['errors' => ['images' => ['You can upload a maximum of 20 images.']]], 422);
            }

            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'address' => ['required', 'string'],
                'latitude' => ['nullable', 'numeric', 'between:-90,90'],
                'longitude' => ['nullable', 'numeric', 'between:-180,180'],
                'total_area' => ['nullable', 'numeric', 'min:0'],
                'capacity' => ['nullable', 'numeric', 'min:0'],
                'type' => ['required', 'string', Rule::in(self::WAREHOUSE_TYPES)],
                // Sent as a JSON-encoded string over multipart form data, same as amenities.
                'services' => ['nullable'],
                'pricing_model' => ['required', 'string', Rule::in([
                    'per_sqft_monthly', 'per_sqft_daily', 'per_pallet_monthly',
                    'per_pallet_daily', 'flat_rate_monthly', 'flat_rate_daily',
                    'monthly', 'daily', 'hourly' // Legacy values for backwards compatibility
                ])],
                'price' => ['nullable', 'numeric', 'min:0'], // Legacy price field
                'base_price' => ['nullable', 'numeric', 'min:0'],
                // Detailed pricing fields
                'monthly_rate' => ['nullable', 'numeric', 'min:0'],
                'security_deposit' => ['nullable', 'numeric', 'min:0'],
                'setup_fee' => ['nullable', 'numeric', 'min:0'],
                'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'fulfillment_fee_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'total_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'final_amount' => ['nullable', 'numeric', 'min:0'],
                'amenities' => ['nullable', 'string'], // JSON encoded
                'images.*' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:10240'], // 10MB max per image
                'documents.*' => ['nullable', 'file', 'mimes:pdf,doc,docx,txt', 'max:10240'], // 10MB max per document
                'terms_conditions' => ['nullable', 'string'],
                'terms_pdf' => ['nullable', 'file', 'mimes:pdf', 'max:10240'], // 10MB max
                'is_active' => ['nullable', Rule::in(['0','1'])],
                'remove_images' => ['nullable', 'array'], // Array of image paths to remove
                'remove_documents' => ['nullable', 'array'], // Array of document paths to remove
                'remove_terms_pdf' => ['nullable', 'boolean'], // Flag to remove terms PDF
            ]);

            // Parse amenities
            $amenities = [];
            if (!empty($validated['amenities'])) {
                $decoded = json_decode($validated['amenities'], true);
                if (is_array($decoded)) {
                    $amenities = $decoded;
                }
            }

            // Parse services (JSON string over multipart form data, same as
            // amenities). "Fulfillment" here is the single source of truth
            // for whether this listing offers the fulfillment add-on.
            $rawServices = $validated['services'] ?? [];
            $services = is_string($rawServices) ? (json_decode($rawServices, true) ?? []) : $rawServices;
            $services = array_values(array_intersect(is_array($services) ? $services : [], self::WAREHOUSE_SERVICES));
            $offersFulfillment = in_array('fulfillment', $services, true);

            // Handle image removals
            if (!empty($validated['remove_images'])) {
                foreach ($validated['remove_images'] as $imageToRemove) {
                    // Find and delete the image record
                    $imageRecord = $unit->images()->where('file_path', 'like', '%' . basename($imageToRemove))->first();
                    if ($imageRecord) {
                        // Remove from storage
                        if (Storage::disk('public')->exists($imageRecord->file_path)) {
                            Storage::disk('public')->delete($imageRecord->file_path);
                        }
                        $imageRecord->delete();
                    } else {
                        // Fallback: try to remove by direct path
                        if (Storage::disk('public')->exists($imageToRemove)) {
                            Storage::disk('public')->delete($imageToRemove);
                        }
                    }
                }
            }

            // Handle new images
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $image) {
                    $imagePath = $image->store('warehouse/images', 'public');
                    $dimensions = null;
                    
                    // Try to get image dimensions
                    try {
                        $imageInfo = getimagesize($image->getPathname());
                        if ($imageInfo) {
                            $dimensions = ['width' => $imageInfo[0], 'height' => $imageInfo[1]];
                        }
                    } catch (\Exception $e) {
                        // Ignore if we can't get dimensions
                    }

                    $unit->images()->create([
                        'file_path' => $imagePath,
                        'original_name' => $image->getClientOriginalName(),
                        'type' => $unit->images()->count() === 0 ? 'main' : 'gallery',
                        'sort_order' => $unit->images()->count() + $index,
                        'mime_type' => $image->getMimeType(),
                        'file_size' => $image->getSize(),
                        'dimensions' => $dimensions,
                        'is_active' => true,
                    ]);
                }
            }

            // Handle document removals
            if (!empty($validated['remove_documents'])) {
                foreach ($validated['remove_documents'] as $docToRemove) {
                    // Find and delete the document record
                    $docRecord = $unit->documents()->where('file_path', 'like', '%' . basename($docToRemove))->first();
                    if ($docRecord) {
                        // Remove from storage
                        if (Storage::disk('public')->exists($docRecord->file_path)) {
                            Storage::disk('public')->delete($docRecord->file_path);
                        }
                        $docRecord->delete();
                    } else {
                        // Fallback: try to remove by direct path
                        if (Storage::disk('public')->exists($docToRemove)) {
                            Storage::disk('public')->delete($docToRemove);
                        }
                    }
                }
            }

            // Handle new documents
            if ($request->hasFile('documents')) {
                foreach ($request->file('documents') as $document) {
                    $documentPath = $document->store('warehouse/documents', 'public');
                    
                    $unit->documents()->create([
                        'file_path' => $documentPath,
                        'original_name' => $document->getClientOriginalName(),
                        'document_title' => pathinfo($document->getClientOriginalName(), PATHINFO_FILENAME),
                        'type' => 'other',
                        'mime_type' => $document->getMimeType(),
                        'file_size' => $document->getSize(),
                        'is_public' => false,
                        'is_required' => false,
                        'version' => 1,
                        'uploaded_by' => Auth::id(),
                        'is_active' => true,
                    ]);
                }
            }

            // Handle terms PDF
            $termsPdfPath = $unit->terms_pdf_path;
            if (!empty($validated['remove_terms_pdf']) && $validated['remove_terms_pdf']) {
                // Remove existing terms PDF
                if ($termsPdfPath && Storage::disk('public')->exists($termsPdfPath)) {
                    Storage::disk('public')->delete($termsPdfPath);
                }
                // Also remove the document record
                $unit->documents()->where('type', 'terms_conditions')->delete();
                $termsPdfPath = null;
            }

            if ($request->hasFile('terms_pdf')) {
                // Remove old terms PDF if exists
                if ($termsPdfPath && Storage::disk('public')->exists($termsPdfPath)) {
                    Storage::disk('public')->delete($termsPdfPath);
                }
                // Remove old document record
                $unit->documents()->where('type', 'terms_conditions')->delete();
                
                $termsPdf = $request->file('terms_pdf');
                $termsPdfPath = $termsPdf->store('warehouse/terms', 'public');
                
                // Create new document record
                $unit->documents()->create([
                    'file_path' => $termsPdfPath,
                    'original_name' => $termsPdf->getClientOriginalName(),
                    'document_title' => 'Terms and Conditions',
                    'type' => 'terms_conditions',
                    'mime_type' => $termsPdf->getMimeType(),
                    'file_size' => $termsPdf->getSize(),
                    'is_public' => true,
                    'is_required' => true,
                    'version' => 1,
                    'uploaded_by' => Auth::id(),
                    'is_active' => true,
                ]);
            }

            // Helper function to convert empty strings to null for numeric fields
            $nullIfEmpty = function($value) {
                return ($value === '' || $value === null) ? null : $value;
            };

            $normalizeTaxRate = function($value) use ($nullIfEmpty) {
                $clean = $nullIfEmpty($value);
                if ($clean === null) {
                    return null;
                }

                $numeric = (float) $clean;
                return $numeric > 1 ? ($numeric / 100) : $numeric;
            };

            // Update amenities
            if (!empty($amenities)) {
                // Delete existing amenities
                $unit->amenities()->delete();
                
                // Create new amenities
                foreach ($amenities as $amenityName) {
                    if (is_string($amenityName) && !empty(trim($amenityName))) {
                        $unit->amenities()->create([
                            'name' => trim($amenityName),
                            'description' => null,
                            'is_included' => true,
                            'additional_cost' => null,
                            'cost_frequency' => null,
                            'is_available' => true,
                        ]);
                    }
                }
            }

            // Update the unit
            $unit->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'address' => $validated['address'],
                'latitude' => $nullIfEmpty($validated['latitude'] ?? null),
                'longitude' => $nullIfEmpty($validated['longitude'] ?? null),
                'total_area' => $nullIfEmpty($validated['total_area'] ?? null),
                'capacity' => $nullIfEmpty($validated['capacity'] ?? null),
                'type' => $validated['type'],
                'services' => $services,
                'pricing_model' => $validated['pricing_model'],
                'base_price' => $nullIfEmpty($validated['price'] ?? $validated['base_price'] ?? null),
                // Detailed pricing fields
                'monthly_rate' => $nullIfEmpty($validated['monthly_rate'] ?? null),
                'security_deposit' => $nullIfEmpty($validated['security_deposit'] ?? null),
                'setup_fee' => $nullIfEmpty($validated['setup_fee'] ?? null),
                'tax_rate' => $normalizeTaxRate($validated['tax_rate'] ?? null),
                'offers_fulfillment' => $offersFulfillment,
                'fulfillment_fee_rate' => $nullIfEmpty($validated['fulfillment_fee_rate'] ?? null),
                'total_amount' => $nullIfEmpty($validated['total_amount'] ?? null),
                'tax_amount' => $nullIfEmpty($validated['tax_amount'] ?? null),
                'final_amount' => $nullIfEmpty($validated['final_amount'] ?? null),
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'terms_pdf_path' => $termsPdfPath,
                'is_active' => ($validated['is_active'] ?? '1') === '1',
            ]);

            // Create new approval record for updated unit
            $unit->approvals()->create([
                'status' => 'pending',
                'notes' => 'Updated warehouse unit submitted for re-approval',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Warehouse unit updated successfully and submitted for approval.',
                'unit' => [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'status' => $this->getUnitStatus($unit),
                    'availability_status' => $this->getAvailabilityStatus($unit),
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Error updating warehouse unit: ' . $e->getMessage(), [
                'unit_id' => $id,
                'user_id' => Auth::id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to update warehouse unit. Please try again.'
            ], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        $unit = WarehouseUnit::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();

        if (!$unit) {
            return response()->json(['error' => 'Warehouse unit not found'], 404);
        }

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $unit->update([
            'is_active' => $validated['is_active']
        ]);

        return response()->json([
            'message' => 'Warehouse unit status updated successfully',
            'unit' => [
                'id' => $unit->id,
                'is_active' => $unit->is_active,
                'status' => $this->getUnitStatus($unit),
                'availability_status' => $this->getAvailabilityStatus($unit),
            ]
        ]);
    }

    // Admin approval methods
    public function approve(Request $request, $id)
    {
        $unit = WarehouseUnit::findOrFail($id);

        $unit->update([
            'approval_status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::id(),
            'rejection_reason' => null,
            'is_active' => true, // Automatically activate when approved
        ]);

        return response()->json([
            'message' => 'Warehouse unit approved and activated successfully',
            'unit' => [
                'id' => $unit->id,
                'approval_status' => $unit->approval_status,
                'is_active' => $unit->is_active,
                'status' => $this->getUnitStatus($unit),
                'availability_status' => $this->getAvailabilityStatus($unit),
            ]
        ]);
    }

    public function reject(Request $request, $id)
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $unit = WarehouseUnit::findOrFail($id);

        $unit->update([
            'approval_status' => 'rejected',
            'approved_at' => null,
            'approved_by' => null,
            'rejection_reason' => $validated['rejection_reason'],
            'is_active' => false, // Deactivate when rejected
        ]);

        return response()->json([
            'message' => 'Warehouse unit rejected successfully',
            'unit' => [
                'id' => $unit->id,
                'approval_status' => $unit->approval_status,
                'is_active' => $unit->is_active,
                'rejection_reason' => $unit->rejection_reason,
                'status' => $this->getUnitStatus($unit),
                'availability_status' => $this->getAvailabilityStatus($unit),
            ]
        ]);
    }

    public function destroy($id)
    {
        try {
            $unit = WarehouseUnit::where('id', $id)
                ->where('user_id', Auth::id())
                ->with(['images', 'documents', 'amenities', 'approvals'])
                ->first();

            if (!$unit) {
                return response()->json(['error' => 'Warehouse unit not found'], 404);
            }

            DB::transaction(function () use ($unit) {
                // Delete associated images
                foreach ($unit->images as $image) {
                    if ($image->path && Storage::disk('public')->exists($image->path)) {
                        Storage::disk('public')->delete($image->path);
                    }
                    $image->delete();
                }

                // Delete associated documents
                foreach ($unit->documents as $document) {
                    if ($document->path && Storage::disk('public')->exists($document->path)) {
                        Storage::disk('public')->delete($document->path);
                    }
                    $document->delete();
                }

                // Delete terms PDF if exists
                if ($unit->terms_pdf_path && Storage::disk('public')->exists($unit->terms_pdf_path)) {
                    Storage::disk('public')->delete($unit->terms_pdf_path);
                }

                // Delete amenities
                $unit->amenities()->delete();

                // Delete approvals
                $unit->approvals()->delete();

                // Delete the unit itself
                $unit->delete();
            });

            return response()->json([
                'success' => true,
                'message' => 'Warehouse unit deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting warehouse unit: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to delete warehouse unit. Please try again.'
            ], 500);
        }
    }
}
