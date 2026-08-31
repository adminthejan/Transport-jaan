<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleCategory;
use App\Models\VehicleFeaturePricing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class VehicleController extends Controller
{
    public function index()
    {
        return redirect()->route('vendors.units');
    }

    /**
     * GET /vendor/vehicles/list
     */
    public function list(Request $request)
    {
        $userId = $request->user()->id;

        $query = Vehicle::query()
            ->where('provider_id', $userId)
            ->with([
                'landSpec:id,vehicle_id,fuel_type,transmission_type,seats,doors,body_type',
                'airSpec:id,vehicle_id,fuel_type,seats,crew_required,aircraft_type',
                'seaSpec:id,vehicle_id,fuel_type,vessel_type,cabins,berths',
                'media' => function ($q) {
                    $q->where('media_type', 'image')
                      ->orderByDesc('is_primary')
                      ->orderBy('sort_order')
                      ->select('id','vehicle_id','path','is_primary','sort_order');
                },
            ])
            ->latest('id');

        // search
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($qq) use ($search) {
                $qq->where('model', 'like', "%{$search}%")
                   ->orWhere('manufacturer', 'like', "%{$search}%")
                   ->orWhere('registration_number', 'like', "%{$search}%");
            });
        }

        // status: Available|Pending|Maintenance
        if ($status = trim((string) $request->query('status', ''))) {
            $s = strtolower($status);
            if ($s === 'available') {
                $query->where('approval_status', 'approved')
                      ->whereIn('status', ['active', 'available', 'ACTIVE', 'AVAILABLE']);
            } elseif ($s === 'pending') {
                $query->where('approval_status', 'pending');
            } elseif ($s === 'maintenance') {
                $query->whereRaw('LOWER(status) = ?', ['maintenance']);
            }
        }

        // category: Land|Air|Sea -> vehicles.type
        if ($category = trim((string) $request->query('category', ''))) {
            $t = match (strtolower($category)) {
                'land' => 'land',
                'air'  => 'air',
                'sea'  => 'sea',
                default => null,
            };
            if ($t) $query->where('type', $t);
        }

        $perPage   = min(100, max(1, (int) $request->query('per_page', 10)));
        $paginator = $query->paginate($perPage);

        $transformed = $paginator->getCollection()->map(function (Vehicle $v) {
            $isApproved  = strtolower((string) $v->approval_status) === 'approved';
            $isActive    = in_array(strtolower((string) $v->status), ['active','available'], true);
            $statusLabel = $isApproved && $isActive ? 'Available'
                : (strtolower((string) $v->status) === 'maintenance' ? 'Maintenance' : 'Pending');

            $fuel         = $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null;
            $transmission = $v->landSpec?->transmission_type ?? null;

            return [
                'id'           => $v->id,
                'brand'        => $v->manufacturer,
                'model'        => $v->model,
                'price'        => (float) ($v->rental_price_per_day ?? 0),
                'status'       => $statusLabel,
                'unitsCount'   => 1,
                'mileage'      => $v->mileage_km !== null ? number_format((int) $v->mileage_km) : null,
                'transmission' => $transmission ? ucfirst($transmission) : null,
                'capacity'     => $v->passenger_capacity ? ($v->passenger_capacity . ' Person') : null,
                'fuel_type'    => $fuel ? ucfirst($fuel) : null,
                'image'        => $v->primary_image_url,
                'images'       => $v->all_images_data,
            ];
        });

        $out = new LengthAwarePaginator(
            $transformed,
            $paginator->total(),
            $paginator->perPage(),
            $paginator->currentPage(),
            [
                'path'  => $request->url(),
                'query' => $request->query(),
            ]
        );

        return response()->json($out);
    }

    /**
     * Renders AddUnit prefilled for editing (UI route).
     * GET /vendors/addUnit/{vehicle}
     */
    public function edit(Request $request, Vehicle $vehicle)
    {
        $this->authorizeOwner($request, $vehicle);

        return Inertia::render('Web/home/vendors/AddUnit', [
            'mode'    => 'edit',
            'vehicle' => $this->serializeVehicleForForm($vehicle),
        ]);
    }

    /**
     * JSON details (if your React form fetches instead of SSR).
     * GET /vendor/vehicles/{vehicle}
     */
    public function show(Request $request, Vehicle $vehicle)
    {
        $this->authorizeOwner($request, $vehicle);
        return response()->json($this->serializeVehicleForForm($vehicle));
    }

    /**
     * UI details page (for View button).
     * GET /vendors/unitDetails/{vehicle}
     */
    public function unitDetails(Request $request, Vehicle $vehicle)
    {
        $this->authorizeOwner($request, $vehicle);

        // Component path: resources/js/Pages/Web/home/vendors/UnitDetails.jsx
        return Inertia::render('Web/home/vendors/UnitDetails', [
            'vehicle' => $this->serializeVehicleForForm($vehicle),
        ]);
    }

    /**
     * (Legacy alias)
     */
    public function detailsPage(Request $request, Vehicle $vehicle)
    {
        return $this->unitDetails($request, $vehicle);
    }

    public function store(Request $request)
    {
        return $this->persist($request);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        $this->authorizeOwner($request, $vehicle);
        return $this->persist($request, $vehicle);
    }

    public function destroy(Request $request, Vehicle $vehicle)
    {
        $this->authorizeOwner($request, $vehicle);

        DB::transaction(function () use ($vehicle) {
            // 🔻 Also delete policy rows/files if the table exists
            if (Schema::hasTable('vehicle_policies')) {
                $rows = DB::table('vehicle_policies')->where('vehicle_id', $vehicle->id)->get();
                foreach ($rows as $row) {
                    $disk = $row->disk ?: 'public';
                    if ($row->file_path) {
                        try { Storage::disk($disk)->delete($row->file_path); } catch (\Throwable $e) {}
                    }
                }
                DB::table('vehicle_policies')->where('vehicle_id', $vehicle->id)->delete();
            }

            $vehicle->media()->delete();
            $vehicle->documents()->delete();
            $vehicle->landSpec()->delete();
            $vehicle->airSpec()->delete();
            $vehicle->seaSpec()->delete();

            if (Schema::hasTable('vehicle_feature_pricings')) {
                VehicleFeaturePricing::where('vehicle_id', $vehicle->id)->delete();
            }

            if (method_exists($vehicle, 'forceDelete')) {
                $vehicle->forceDelete();
            } else {
                $vehicle->delete();
            }
        });

        $message = 'Unit deleted successfully.';

        if ($request->wantsJson()) {
            return response()->json(['ok' => true, 'message' => $message]);
        }

        return redirect()
            ->route('vendors.units', [], 303)
            ->with('success', $message);
    }

    /* ======================== Helpers ======================== */

    private function authorizeOwner(Request $request, Vehicle $vehicle): void
    {
        abort_unless($vehicle->provider_id === $request->user()->id, 403);
    }

    private function normalizeCategory(Request $request, ?string $fallback = 'land'): string
    {
        $raw = $request->has('category') ? $request->input('category') : $request->input('type');
        $val = strtolower(trim((string) $raw));

        $map = [
            'land' => 'land', 'air' => 'air', 'sea' => 'sea',
        ];

        return $map[$val] ?? (in_array(strtolower((string) $fallback), ['land','air','sea'], true) ? strtolower($fallback) : 'land');
    }

    /**
     * Build payload for AddUnit + UnitDetails pages.
     */
    private function serializeVehicleForForm(Vehicle $v)
    {
        $v->loadMissing([
            'landSpec', 'airSpec', 'seaSpec',
            'media'     => fn($q) => $q->where('media_type', 'image')->orderBy('sort_order'),
            'documents' => fn($q) => $q->orderBy('id'),
            'category',
        ]);

        $category = match ($v->type) {
            'land' => 'Land', 'air' => 'Air', 'sea' => 'Sea', default => ucfirst($v->type ?? 'Land')
        };

        // feature pricing
        $featureRows = collect();
        if (Schema::hasTable('vehicle_feature_pricings')) {
            $featureRows = VehicleFeaturePricing::where('vehicle_id', $v->id)
                ->get(['additional_feature_name as name', 'additional_feature_price as price']);
        }

        $norm = fn ($s) => strtolower(trim(preg_replace('/[\s_\-]+/',' ', (string)$s)));
        $namedMap = [
            'gps'               => ['gps'],
            'childSeat'         => ['child seat','child_seat','childseat'],
            'wifi'              => ['wi fi','wi-fi','wifi'],
            'insuranceCoverage' => ['insurance coverage','insurance_coverage','insurance'],
            'addDriver'         => ['add driver','additional driver','driver'],
        ];

        $pickPrice = function (array $aliases) use ($featureRows, $norm) {
            foreach ($aliases as $a) {
                $row = $featureRows->first(fn($r) => $norm($r->name) === $norm($a));
                if ($row) return (string) ($row->price ?? '');
            }
            return '';
        };

        $gpsPrice               = $pickPrice($namedMap['gps']);
        $childSeatPrice         = $pickPrice($namedMap['childSeat']);
        $wifiPrice              = $pickPrice($namedMap['wifi']);
        $insuranceCoveragePrice = $pickPrice($namedMap['insuranceCoverage']);
        $addDriverPrice         = $pickPrice($namedMap['addDriver']);

        $namedAllFlat = collect($namedMap)->flatten()->map($norm)->all();
        $extraFeatures = $featureRows
            ->filter(fn($r) => !in_array($norm($r->name), $namedAllFlat, true))
            ->map(fn($r) => [
                'name'  => (string) $r->name,
                'price' => $r->price === null ? '' : (string) $r->price,
            ])
            ->values()
            ->all();

        // insurance images
        $insurancePhotos = $v->documents
            ->where('doc_type', 'insurance')
            ->pluck('file_path')
            ->filter(fn($p) => preg_match('/\.(jpe?g|png|gif|webp)$/i', (string)$p))
            ->values()
            ->all();

        $imageEntries = $v->media->map(fn($m) => ['id' => $m->id, 'url' => $m->full_url])->values()->all();

        // 🔻 Policy URLs (safe even if table not migrated yet)
        $policyStreamUrl = null;
        $policyPdfUrl    = null;
        if (Schema::hasTable('vehicle_policies')) {
            $row = DB::table('vehicle_policies')
                ->where('vehicle_id', $v->id)
                ->orderByDesc('id')
                ->first();

            if ($row) {
                $policyStreamUrl = route('vendor.vehicles.policy.stream', ['vehicle' => $v->id]);
                $disk = $row->disk ?: 'public';
                try {
                    $policyPdfUrl = $disk === 'public'
                        ? '/storage/' . ltrim((string) $row->file_path, '/')
                        : null;
                } catch (\Throwable $e) {
                    $policyPdfUrl = null;
                }
            }
        }

        return [
            'id'                 => $v->id,
            'category'           => $category,
            'vehicleType'        => optional($v->category)->name ?? null,

            'model'              => $v->model,
            'manufacture'        => $v->manufacturer,
            'manufactureYear'    => $v->manufacture_year,
            'registerYear'       => $v->registration_year,
            'number'             => $v->registration_number,
            'colour'             => $v->colour,

            'condition'          => $v->condition,
            'ownershipType'      => $v->ownership_type,

            'passengerCapacity'  => $v->passenger_capacity,
            'mileage'            => $v->mileage_km,

            'rentalPricePerDay'  => $v->rental_price_per_day,
            'totalRentalPrice'   => $v->total_rental_price,
            'deposit'            => $v->deposit_amount,
            'advancePayment'     => $v->advance_payment_amount,

            'insuranceProvider'  => $v->insurance_provider,

            'gps'                => (bool) $v->gps,
            'childSeat'          => (bool) $v->child_seat,
            'wifi'               => (bool) $v->wifi,
            'insuranceCoverage'  => (bool) $v->insurance_coverage,

            // named feature prices
            'gpsPrice'                 => $gpsPrice,
            'childSeatPrice'           => $childSeatPrice,
            'wifiPrice'                => $wifiPrice,
            'insuranceCoveragePrice'   => $insuranceCoveragePrice,
            'addDriver'                => false,
            'addDriverPrice'           => $addDriverPrice,

            'extra'              => $v->extra,
            'description'        => $v->description, // << shows in UI

            // land
            'bodyType'           => $v->landSpec?->body_type,
            'industryCategory'   => $v->landSpec?->industry_category,
            'fuelType'           => $v->landSpec?->fuel_type,
            'transmissionType'   => $v->landSpec?->transmission_type,
            'gears'              => $v->landSpec?->gears,
            'seats'              => $v->landSpec?->seats,
            'doors'              => $v->landSpec?->doors,
            'luggageCapacity'    => $v->landSpec?->luggage_capacity,
            'fuelTankCapacity'   => $v->landSpec?->fuel_tank_capacity_l,

            // air
            'aircraft_type'        => $v->airSpec?->aircraft_type,
            'icao_type_designator' => $v->airSpec?->icao_type_designator,
            'base_airport_iata'    => $v->airSpec?->base_airport_iata,
            'base_airport_icao'    => $v->airSpec?->base_airport_icao,
            'crew_required'        => $v->airSpec?->crew_required,
            'range_km'             => $v->airSpec?->range_km,
            'mtow_kg'              => $v->airSpec?->mtow_kg,
            'cruising_speed_kts'   => $v->airSpec?->cruising_speed_kts,
            'air_fuel_type'        => $v->airSpec?->fuel_type,
            'flight_hours_total'   => $v->airSpec?->flight_hours_total,

            // sea
            'vessel_type'        => $v->seaSpec?->vessel_type,
            'hull_material'      => $v->seaSpec?->hull_material,
            'length_m'           => $v->seaSpec?->length_m,
            'beam_m'             => $v->seaSpec?->beam_m,
            'draft_m'            => $v->seaSpec?->draft_m,
            'engine_type'        => $v->seaSpec?->engine_type,
            'engine_power_hp'    => $v->seaSpec?->engine_power_hp,
            'sea_fuel_type'      => $v->seaSpec?->fuel_type,
            'cabins'             => $v->seaSpec?->cabins,
            'berths'             => $v->seaSpec?->berths,
            'toilets'            => $v->seaSpec?->toilets,
            'fuel_tank_l'        => $v->seaSpec?->fuel_tank_l,
            'water_tank_l'       => $v->seaSpec?->water_tank_l,

            // media & docs
            'images'             => $v->media->pluck('path')->values()->all(),
            'imageEntries'       => $imageEntries,
            'insurancePhotos'    => $insurancePhotos,
            'documents'          => $v->documents->map(fn($d) => [
                'id'   => $d->id,
                'type' => $d->doc_type,
                'path' => $d->file_path,
            ])->values()->all(),

            // dynamic extras
            'extraFeatures'      => $extraFeatures,

            // 🔻 Policy URLs for PoliciesTab.jsx
            'policy_pdf_url'     => $policyPdfUrl,
            'policy_stream_url'  => $policyStreamUrl,
        ];
    }

    /**
     * Create/Update
     */
    private function persist(Request $request, Vehicle $vehicle = null)
    {
        $type = $this->normalizeCategory($request, $vehicle?->type ?? 'land');

        $conditionRaw = strtolower(trim((string) $request->input('condition', '')));
        $condition = match ($conditionRaw) {
            'new' => 'new',
            'refurbished' => 'refurbished',
            'excellent','good','fair','needs repair','needs_repair' => 'used',
            default => $vehicle?->condition ?? ($conditionRaw ?: null),
        };

        $ownershipRaw = strtolower(trim((string) $request->input('ownershipType', '')));
        $ownership = match ($ownershipRaw) {
            'owned'     => 'company_owned',
            'leased'    => 'leased',
            'rented'    => 'partner_owned',
            'financed'  => 'partner_owned',
            default     => $vehicle?->ownership_type ?? null,
        };

        $regNormalized = strtoupper(preg_replace('/[\s\-]+/', '', trim((string) $request->input('number', ''))))
            ?: ($vehicle?->registration_number);

        $request->merge([
            'category'          => $type,
            'number'            => $regNormalized,
            'condition'         => $condition,
            'ownershipType'     => $ownership,
            'gps'               => $request->boolean('gps'),
            'childSeat'         => $request->boolean('childSeat'),
            'wifi'              => $request->boolean('wifi'),
            'insuranceCoverage' => $request->boolean('insuranceCoverage'),
            'addDriver'         => $request->boolean('addDriver'),
        ]);

        $rules = [
            'category'           => ['required', Rule::in(['land','air','sea'])],
            'vehicleType'        => ['nullable','string','max:100'],
            'model'              => ['nullable','string','max:255'],
            'manufacture'        => ['nullable','string','max:255'],
            'manufactureYear'    => ['nullable','integer','min:1900','max:2100'],
            'registerYear'       => ['nullable','integer','min:1900','max:2100'],
            'number'             => ['nullable','string','max:255'],
            'colour'             => ['nullable','string','max:64'],
            'description'        => ['nullable','string'],
            'passengerCapacity'  => ['nullable','integer','min:0','max:65535'],
            'mileage'            => ['nullable','integer','min:0'],

            // land — must match the land_vehicle_specs enum columns exactly
            // (see database/migrations/2025_08_18_000200_create_land_vehicle_specs_table.php)
            'bodyType'           => ['nullable', Rule::in(['sedan','hatchback','suv','van','bus','pickup','jeep','other','coupe','truck','convertible','limousine','crossover','wagon','familyMBP','sportcoupe','compact','mpv','motorcycle','three_wheeler','special_purpose'])],
            'industryCategory'   => ['nullable', Rule::in(['cars_suvs','vans_minibuses','buses','trucks','prime_movers_trailers','construction_equipment'])],
            'fuelType'           => ['nullable', Rule::in(['petrol','diesel','hybrid','electric','cng','lpg','other'])],
            'transmissionType'   => ['nullable', Rule::in(['manual','automatic','amt','cvt','dct'])],
            'gears'              => ['nullable','integer','min:0'],
            'seats'              => ['nullable','integer','min:0','max:255'],
            'doors'              => ['nullable','integer','min:0','max:255'],
            'luggageCapacity'    => ['nullable','integer','min:0','max:255'],
            'fuelTankCapacity'   => ['nullable','numeric','min:0'],

            // air
            'aircraft_type'          => ['nullable', Rule::in(['fixed_wing','private_jet','commercial_airliner','helicopter','charter_aircraft','light_aircraft','business_jet','turboprop_aircraft','glider','seaplane','cargo_aircraft','hot_air_balloon','other'])],
            'icao_type_designator'   => ['nullable','string','max:8'],
            'base_airport_iata'      => ['nullable','string','max:3'],
            'base_airport_icao'      => ['nullable','string','max:4'],
            'crew_required'          => ['nullable','integer','min:0','max:255'],
            'range_km'               => ['nullable','integer','min:0'],
            'mtow_kg'                => ['nullable','integer','min:0'],
            'cruising_speed_kts'     => ['nullable','integer','min:0'],
            'air_fuel_type'          => ['nullable', Rule::in(['jet_a1','avgas','electric','other'])],
            'flight_hours_total'     => ['nullable','integer','min:0'],

            // sea
            'vessel_type'        => ['nullable', Rule::in(['boat','speedboat','yacht','catamaran','sailboat','fishing_boat','cruise_ship','ferry','houseboat','jet_ski','tugboat','cargo_vessel','other'])],
            'hull_material'      => ['nullable','string','max:64'],
            'length_m'           => ['nullable','numeric','min:0'],
            'beam_m'             => ['nullable','numeric','min:0'],
            'draft_m'            => ['nullable','numeric','min:0'],
            'engine_type'        => ['nullable', Rule::in(['inboard','outboard','sail','hybrid','electric','other'])],
            'engine_power_hp'    => ['nullable','integer','min:0'],
            'sea_fuel_type'      => ['nullable', Rule::in(['diesel','petrol','electric','other'])],
            'cabins'             => ['nullable','integer','min:0','max:255'],
            'berths'             => ['nullable','integer','min:0','max:255'],
            'toilets'            => ['nullable','integer','min:0','max:255'],
            'fuel_tank_l'        => ['nullable','numeric','min:0'],
            'water_tank_l'       => ['nullable','numeric','min:0'],

            // pricing
            'rentalPricePerDay'  => ['nullable','numeric','min:0'],
            'totalRentalPrice'   => ['nullable','numeric','min:0'],
            'deposit'            => ['nullable','numeric','min:0'],
            'advancePayment'     => ['nullable','numeric','min:0'],

            // toggles & prices
            'gps'                      => ['nullable','boolean'],
            'childSeat'                => ['nullable','boolean'],
            'wifi'                     => ['nullable','boolean'],
            'insuranceCoverage'        => ['nullable','boolean'],
            'addDriver'                => ['nullable','boolean'],
            'gpsPrice'                 => ['nullable','numeric','min:0'],
            'childSeatPrice'           => ['nullable','numeric','min:0'],
            'wifiPrice'                => ['nullable','numeric','min:0'],
            'insuranceCoveragePrice'   => ['nullable','numeric','min:0'],
            'addDriverPrice'           => ['nullable','numeric','min:0'],

            // free-text notes
            'extra'                    => ['nullable','string'],

            // dynamic extras
            'extraFeatures'           => ['nullable'],
            'extraFeatures.*.name'    => ['sometimes','string','max:255'],
            'extraFeatures.*.price'   => ['sometimes','numeric','min:0'],

            // insurance quick
            'insuranceProvider'       => ['nullable','string','max:255'],

            // uploads
            'images.*'                => ['nullable','file','mimes:jpg,jpeg,png,webp,gif','max:10240'],
            'insuranceDocs.*'         => ['nullable','file','mimes:pdf,doc,docx,png,jpg,jpeg,webp,gif','max:10240'],
        ];

        if ($vehicle) {
            $rules['number'][] = Rule::unique('vehicles', 'registration_number')->ignore($vehicle->id);
        } else {
            $rules['number'][] = Rule::unique('vehicles', 'registration_number');
        }

        $validated = $request->validate($rules);

        try {
            $vehicle = DB::transaction(function () use ($request, $vehicle, $type, $condition, $ownership, $regNormalized) {

                // category row (optional)
                $categoryId = $vehicle?->category_id;
                $vehicleTypeName = trim((string) $request->input('vehicleType',''));
                if ($vehicleTypeName !== '') {
                    $cat = VehicleCategory::firstOrCreate(
                        ['type' => $type, 'name' => $vehicleTypeName],
                        ['type' => $type, 'name' => $vehicleTypeName]
                    );
                    $categoryId = $cat->id;
                }

                // passenger capacity inference
                $passengerCapacity = $request->integer('passengerCapacity');
                if ($passengerCapacity === null && $type === 'land') {
                    $passengerCapacity = $request->integer('seats') ?: null;
                }

                $data = [
                    'type'                   => $type,
                    'category_id'            => $categoryId,

                    'model'                  => $request->input('model'),
                    'manufacturer'           => $request->input('manufacture'),
                    'manufacture_year'       => $request->integer('manufactureYear') ?: null,
                    'registration_year'      => $request->integer('registerYear') ?: null,
                    'registration_number'    => $regNormalized,
                    'colour'                 => $request->input('colour'),

                    'condition'              => $condition,
                    'ownership_type'         => $ownership,

                    'passenger_capacity'     => $passengerCapacity,
                    'mileage_km'             => $request->integer('mileage') ?: null,

                    'rental_price_per_day'   => $request->input('rentalPricePerDay'),
                    'total_rental_price'     => $request->input('totalRentalPrice'),
                    'deposit_amount'         => $request->input('deposit'),
                    'advance_payment_amount' => $request->input('advancePayment'),

                    'insurance_provider'     => $request->input('insuranceProvider'),

                    'gps'                    => $request->boolean('gps'),
                    'child_seat'             => $type === 'land' ? $request->boolean('childSeat') : false,
                    'wifi'                   => $request->boolean('wifi'),
                    'insurance_coverage'     => $request->boolean('insuranceCoverage'),

                    'extra'                  => $request->input('extra'),

                    // Save description from form
                    'description'            => $request->input('description'),
                ];

                if ($vehicle) {
                    $vehicle->update($data);
                } else {
                    $vehicle = Vehicle::create(array_merge($data, [
                        'provider_id'     => $request->user()->id,
                        'status'          => 'inactive',
                        'approval_status' => 'pending',
                    ]));
                }

                // removals
                $this->applyRemovals($request, $vehicle);

                // specifics
                if ($type === 'air') {
                    $vehicle->airSpec()->updateOrCreate(
                        ['vehicle_id' => $vehicle->id],
                        [
                            'aircraft_type'        => $request->input('aircraft_type'),
                            'icao_type_designator' => $request->input('icao_type_designator'),
                            'base_airport_iata'    => $request->input('base_airport_iata'),
                            'base_airport_icao'    => $request->input('base_airport_icao'),
                            'seats'                => $request->integer('seats') ?: null,
                            'crew_required'        => $request->integer('crew_required') ?: null,
                            'range_km'             => $request->integer('range_km') ?: null,
                            'mtow_kg'              => $request->integer('mtow_kg') ?: null,
                            'cruising_speed_kts'   => $request->integer('cruising_speed_kts') ?: null,
                            'fuel_type'            => $request->input('air_fuel_type'),
                            'flight_hours_total'   => $request->integer('flight_hours_total') ?: null,
                        ]
                    );
                } elseif ($type === 'sea') {
                    $vehicle->seaSpec()->updateOrCreate(
                        ['vehicle_id' => $vehicle->id],
                        [
                            'vessel_type'      => $request->input('vessel_type'),
                            'hull_material'    => $request->input('hull_material'),
                            'length_m'         => $request->input('length_m'),
                            'beam_m'           => $request->input('beam_m'),
                            'draft_m'          => $request->input('draft_m'),
                            'engine_type'      => $request->input('engine_type'),
                            'engine_power_hp'  => $request->integer('engine_power_hp') ?: null,
                            'fuel_type'        => $request->input('sea_fuel_type'),
                            'cabins'           => $request->integer('cabins') ?: null,
                            'berths'           => $request->integer('berths') ?: null,
                            'toilets'          => $request->integer('toilets') ?: null,
                            'fuel_tank_l'      => $request->input('fuel_tank_l'),
                            'water_tank_l'     => $request->input('water_tank_l'),
                        ]
                    );
                } elseif ($type === 'land') {
                    $vehicle->landSpec()->updateOrCreate(
                        ['vehicle_id' => $vehicle->id],
                        [
                            'body_type'            => $request->input('bodyType'),
                            'industry_category'    => $request->input('industryCategory'),
                            'fuel_type'            => $request->input('fuelType'),
                            'transmission_type'    => $request->input('transmissionType'),
                            'gears'                => $request->integer('gears') ?: null,
                            'seats'                => $request->integer('seats') ?: null,
                            'doors'                => $request->integer('doors') ?: null,
                            'luggage_capacity'     => $request->integer('luggageCapacity') ?: null,
                            'fuel_tank_capacity_l' => $request->input('fuelTankCapacity'),
                        ]
                    );
                }

                // uploads (append)
                if ($request->hasFile('images')) {
                    $currentMax = (int) ($vehicle->media()->max('sort_order') ?? 0);
                    foreach ($request->file('images') as $i => $file) {
                        if (!$file) continue;
                        try {
                            $path = $file->store("vehicles/{$vehicle->id}/images", 'public');
                            if ($path) {
                                $vehicle->media()->create([
                                    'media_type' => 'image',
                                    'title'      => $file->getClientOriginalName(),
                                    'path'       => $path,
                                    'is_primary' => false,
                                    'sort_order' => $currentMax + $i + 1,
                                ]);
                            }
                        } catch (\Throwable $e) {
                            Log::error('Vehicle image upload failed', [
                                'vehicle_id' => $vehicle->id,
                                'file_name' => $file->getClientOriginalName(),
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                }

                if ($request->hasFile('insuranceDocs')) {
                    foreach ($request->file('insuranceDocs') as $file) {
                        if (!$file) continue;
                        $path = $file->store("vehicles/{$vehicle->id}/documents", 'public');
                        $vehicle->documents()->create([
                            'doc_type'             => 'insurance',
                            'provider_name'        => $request->input('insuranceProvider'),
                            'policy_or_doc_number' => null,
                            'issue_date'           => null,
                            'expiry_date'          => null,
                            'file_path'            => Storage::url($path),
                        ]);
                    }
                }

                // additional features
                $featureRows = [];
                if ($request->boolean('gps') || $request->filled('gpsPrice')) {
                    $featureRows[] = ['name' => 'GPS', 'price' => $request->input('gpsPrice')];
                }
                if ($type === 'land' && ($request->boolean('childSeat') || $request->filled('childSeatPrice'))) {
                    $featureRows[] = ['name' => 'Child Seat', 'price' => $request->input('childSeatPrice')];
                }
                if ($request->boolean('wifi') || $request->filled('wifiPrice')) {
                    $featureRows[] = ['name' => 'Wi-Fi', 'price' => $request->input('wifiPrice')];
                }
                if ($request->boolean('insuranceCoverage') || $request->filled('insuranceCoveragePrice')) {
                    $featureRows[] = ['name' => 'Insurance Coverage', 'price' => $request->input('insuranceCoveragePrice')];
                }
                if ($request->boolean('addDriver') || $request->filled('addDriverPrice')) {
                    $featureRows[] = ['name' => 'Add Driver', 'price' => $request->input('addDriverPrice')];
                }

                $extraFeatures = $request->input('extraFeatures');
                if (is_string($extraFeatures)) {
                    $decoded = json_decode($extraFeatures, true);
                    $extraFeatures = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : null;
                }
                if (!is_array($extraFeatures)) $extraFeatures = [];
                $extraFeatures = array_values(array_filter(array_map(function ($row) {
                    if (!is_array($row)) return null;
                    $name  = isset($row['name']) ? trim((string)$row['name']) : '';
                    if ($name === '') return null;
                    $price = (isset($row['price']) && $row['price'] !== '') ? (string)$row['price'] : null;
                    return ['name' => Str::limit($name, 255, ''), 'price' => $price];
                }, $extraFeatures)));

                $featureRows = array_merge($featureRows, $extraFeatures);

                if (Schema::hasTable('vehicle_feature_pricings')) {
                    VehicleFeaturePricing::where('vehicle_id', $vehicle->id)->delete();
                    foreach ($featureRows as $r) {
                        VehicleFeaturePricing::create([
                            'vehicle_id'               => $vehicle->id,
                            'additional_feature_name'  => $r['name'],
                            'additional_feature_price' => $r['price'],
                        ]);
                    }
                }

                return $vehicle;
            });

            return redirect()
                ->route('vendors.units')
                ->with('success', $vehicle->wasRecentlyCreated ? 'Unit saved successfully.' : 'Unit updated successfully.');

        } catch (\Illuminate\Database\QueryException $e) {
            return back()->withErrors([
                'server' => 'Database error: ' . $e->getMessage(),
            ])->withInput();
        } catch (\Throwable $e) {
            return back()->withErrors([
                'server' => 'Unexpected error: ' . $e->getMessage(),
            ])->withInput();
        }
    }

    private function applyRemovals(Request $request, Vehicle $vehicle): void
    {
        $collectIds = function (array $fields) use ($request): array {
            $out = [];
            foreach ($fields as $f) {
                $vals = (array) $request->input($f, []);
                foreach ($vals as $v) {
                    if ($v === null || $v === '') continue;
                    $out[] = (int) $v;
                }
            }
            return array_values(array_unique(array_filter($out)));
        };
        $collectUrls = function (array $fields) use ($request): array {
            $out = [];
            foreach ($fields as $f) {
                $vals = (array) $request->input($f, []);
                foreach ($vals as $v) {
                    if ($v === null || $v === '') continue;
                    $out[] = (string) $v;
                }
            }
            return array_values(array_unique(array_filter($out)));
        };

        $imgIds  = $collectIds(['remove_existing_images','remove_images','delete_images','delete_existing_images']);
        $imgUrls = $collectUrls(['remove_existing_images_by_url','remove_images_by_url']);

        $insIds  = $collectIds(['remove_existing_insurance','remove_insurance','delete_insurance','delete_existing_insurance']);
        $insUrls = $collectUrls(['remove_existing_insurance_by_url','remove_insurance_by_url']);

        if ($json = $request->input('remove_payload_json')) {
            $data = json_decode($json, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                $imgIds  = array_values(array_unique(array_merge($imgIds, (array) ($data['images']['ids']  ?? []))));
                $imgUrls = array_values(array_unique(array_merge($imgUrls,(array) ($data['images']['urls'] ?? []))));
                $insIds  = array_values(array_unique(array_merge($insIds, (array) ($data['insurance']['ids']  ?? []))));
                $insUrls = array_values(array_unique(array_merge($insUrls,(array) ($data['insurance']['urls'] ?? []))));
            }
        }

        if ($imgIds) {
            $medias = $vehicle->media()->whereIn('id', $imgIds)->get();
            foreach ($medias as $m) {
                $this->unlinkPublicUrl($m->path);
            }
            $vehicle->media()->whereIn('id', $imgIds)->delete();
        }
        if ($imgUrls) {
            $medias = $vehicle->media()->whereIn('path', $imgUrls)->get();
            foreach ($medias as $m) {
                $this->unlinkPublicUrl($m->path);
            }
            $vehicle->media()->whereIn('path', $imgUrls)->delete();
        }

        if ($insIds) {
            $docs = $vehicle->documents()->where('doc_type','insurance')->whereIn('id', $insIds)->get();
            foreach ($docs as $d) {
                $this->unlinkPublicUrl($d->file_path);
            }
            $vehicle->documents()->where('doc_type','insurance')->whereIn('id', $insIds)->delete();
        }
        if ($insUrls) {
            $docs = $vehicle->documents()->where('doc_type','insurance')->whereIn('file_path', $insUrls)->get();
            foreach ($docs as $d) {
                $this->unlinkPublicUrl($d->file_path);
            }
            $vehicle->documents()->where('doc_type','insurance')->whereIn('file_path', $insUrls)->delete();
        }
    }

    private function unlinkPublicUrl(?string $url): void
    {
        if (!$url) return;
        $base = rtrim(asset('storage'), '/');
        if (Str::startsWith($url, $base)) {
            $relative = ltrim(Str::after($url, $base), '/');
            Storage::disk('public')->delete($relative);
        }
    }
}
