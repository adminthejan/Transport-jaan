<?php

namespace App\Http\Controllers\VehicleControllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ClientVehicleController extends Controller
{
    /** Home Page */
 public function home()
{
    $type = request()->get('type', 'land'); // 'land', 'water', 'air'

    // --- BRANDS ---
    $brands = Vehicle::query()
        ->whereNotNull('manufacturer')
        ->selectRaw('LOWER(manufacturer) AS key_name, MIN(manufacturer) AS display_name')
        ->groupBy('key_name')
        ->orderBy('display_name')
        ->get()
        ->map(fn($row) => [
            'name' => $row->display_name,
            'logo' => '/brand-logos/' . strtolower($row->display_name) . '.png',
        ]);

    // --- BODY TYPES ---
    $bodyTypes = VehicleCategory::where('type', $type)
        ->orderBy('name')
        ->get()
        ->map(fn($c) => [
            'name' => $c->name,
            'icon' => '/body-icons/' . strtolower($c->name) . '.png',
        ]);

    // --- VEHICLES ---
    $vehicles = Vehicle::with([$type . 'Spec', 'images', 'primaryImage'])
        ->active()
        ->type($type)
        ->take(12)
        ->get()
        ->map(function ($v) use ($type) {
            $primaryUrl = $v->primary_image_url
                ?? optional($v->images->sortByDesc('is_primary')->sortBy('sort_order')->first())->url;

            return [
                'id'                   => $v->id,
                'model'                => $v->model,
                'manufacturer'         => $v->manufacturer,
                'rental_price_per_day' => $v->rental_price_per_day,
                'primary_image_url'    => $primaryUrl,
                'specs'                => $type === 'land' ? $v->landSpec : null,
                'mileage_km'           => $v->mileage_km,
                'passenger_capacity'   => $v->passenger_capacity,
            ];
        });

    $likedVehicleIds = Auth::check()
        ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
        : [];

    return Inertia::render('Web/home/HomePage', [
        'brands'          => $brands,
        'bodyTypes'       => $bodyTypes,
        'vehicles'        => $vehicles,
        'likedVehicleIds' => $likedVehicleIds,
        'selectedType'    => $type, // helps frontend know current type
    ]);
}

    /** Vehicle List with filters (brand/model case-insensitive) */
    public function vehicleList(Request $request)
    {
        $filters = $request->only([
            'pickupLocation',
            'pickupDate',
            'dropoffLocation',
            'dropoffDate',
            'brand',
            'model',
            'bodyType',
            "capacity",
            'body_type',
            'transmission',
            'fuel',
        ]);

        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])
            ->active()
            ->type('land');

        // Transmission filter (land) — comma-separated enum values
        if ($request->filled('transmission')) {
            $transmissions = array_filter(array_map(
                fn ($t) => mb_strtolower(trim($t)),
                explode(',', (string) $request->input('transmission'))
            ));
            if (!empty($transmissions)) {
                $query->whereHas('landSpec', fn ($q) => $q->whereIn('transmission_type', $transmissions));
            }
        }

        // Fuel-type filter — comma-separated enum values
        if ($request->filled('fuel')) {
            $fuels = array_filter(array_map(
                fn ($f) => mb_strtolower(trim($f)),
                explode(',', (string) $request->input('fuel'))
            ));
            if (!empty($fuels)) {
                $query->whereHas('landSpec', fn ($q) => $q->whereIn('fuel_type', $fuels));
            }
        }

        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $query->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }

        if (!empty($filters['model'])) {
            $model = mb_strtolower(trim($filters['model']));
            $query->whereRaw('LOWER(model) = ?', [$model]);
        }

        $rawBodyType = $filters['bodyType'] ?? $filters['body_type'] ?? null;
        if (!empty($rawBodyType)) {
            $bodyType = mb_strtolower(trim($rawBodyType));
            $allowed = ['suv','wagon','crossover','family','sportcoupe','compact','coupe','truck','othe'];
            if (in_array($bodyType, $allowed, true)) {
                $query->whereHas('landSpec', fn($q) => $q->whereRaw('LOWER(body_type) = ?', [$bodyType]));
            }
        }

        // Capacity Filter (multiple values)
        if ($request->filled('capacity')) {
            $capacities = explode(',', $request->capacity); // e.g. "2person,4person,8ormore"

            $query->where(function ($q) use ($capacities) {
                foreach ($capacities as $cap) {
                    if ($cap === '8ormore') {
                        $q->orWhere('passenger_capacity', '>=', 8);
                    } else {
                        $num = intval($cap); // "2person" -> 2
                        $q->orWhere('passenger_capacity', $num);
                    }
                }
            });
        }

                // Price Filter (multiple values)
        if ($request->filled('price')) {
            $prices = explode(',', $request->price);

            $query->where(function ($q) use ($prices) {
                foreach ($prices as $price) {
                    if ($price === '200plus') {
                        // Special case: price 200+
                        $q->orWhere('rental_price_per_day', '>=', 200);
                    } else {
                        // Other ranges like "0-50"
                        [$min, $max] = explode('-', $price);
                        $q->orWhereBetween('rental_price_per_day', [(int)$min, (int)$max]);
                    }
                }
            });
        }

        // Mileage Filter
        if ($request->filled('mileage')) {
            // Expecting comma-separated values like "limited,unlimited"
            $mileages = explode(',', $request->mileage);

            $query->where(function ($q) use ($mileages) {
                foreach ($mileages as $m) {
                    if ($m === 'limited') {
                        // Define what "limited" means, e.g., less than 50,000 km
                        $q->orWhere('mileage_km', '<', 50000);
                    } elseif ($m === 'unlimited') {
                        // "unlimited" means 50,000 km or more
                        $q->orWhere('mileage_km', '>=', 50000);
                    }
                }
            });
        }


        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );

                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,

                    'primary_image_url'    => $primaryMedia?->url,

                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'title'      => $m->title,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),

                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,

                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $brandCollection = Vehicle::query()
            ->when(!empty($rawBodyType), function ($q) use ($rawBodyType) {
                $bt = mb_strtolower(trim($rawBodyType));
                $q->whereHas('landSpec', fn($qq) => $qq->whereRaw('LOWER(body_type) = ?', [$bt]));
            })
            ->selectRaw('LOWER(manufacturer) AS key_name, MIN(manufacturer) AS display_name')
            ->whereNotNull('manufacturer')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->get()
            ->map(fn($row) => $row->display_name);

        $modelQuery = Vehicle::query();
        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $modelQuery->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }
        $modelCollection = $modelQuery
            ->whereNotNull('model')
            ->selectRaw('LOWER(model) AS key_name, MIN(model) AS display_name')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->pluck('display_name');

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return Inertia::render('Web/home/vehicleList', [
            'vehicles'         => $vehicles,
            'filters'          => [
                ...$filters,
                'bodyType' => $rawBodyType,
            ],
            'likedVehicleIds'  => $likedVehicleIds,
            'brandCollection'  => $brandCollection,
            'modelCollection'  => $modelCollection,
        ]);
    }

    /**
     * Return vehicle list as JSON (for inline loading in multimodal page).
     */
    public function vehicleListJson(Request $request)
    {
        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])->active()->type('land');

        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );
                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,
                    'primary_image_url'    => $primaryMedia?->url,
                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),
                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,
                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return response()->json([
            'vehicles'        => $vehicles,
            'likedVehicleIds' => $likedVehicleIds,
            'auth'            => ['user' => Auth::user()],
        ]);
    }

    public function seaVehicleListJson(Request $request)
    {
        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])->active()->type('sea');

        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );
                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,
                    'primary_image_url'    => $primaryMedia?->url,
                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),
                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,
                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return response()->json([
            'vehicles'        => $vehicles,
            'likedVehicleIds' => $likedVehicleIds,
            'auth'            => ['user' => Auth::user()],
        ]);
    }

    public function airVehicleListJson(Request $request)
    {
        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])->active()->type('air');

        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );
                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,
                    'primary_image_url'    => $primaryMedia?->url,
                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),
                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,
                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return response()->json([
            'vehicles'        => $vehicles,
            'likedVehicleIds' => $likedVehicleIds,
            'auth'            => ['user' => Auth::user()],
        ]);
    }

     public function seaVehicleList(Request $request)
    {
        $filters = $request->only([
            'pickupLocation',
            'pickupDate',
            'dropoffLocation',
            'dropoffDate',
            'brand',
            'model',
            'bodyType',
            "capacity",
            'body_type',
            'fuel',
        ]);

        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])
            ->active()
            ->type('sea');

        // Fuel-type filter (sea) — comma-separated enum values
        if ($request->filled('fuel')) {
            $fuels = array_filter(array_map(
                fn ($f) => mb_strtolower(trim($f)),
                explode(',', (string) $request->input('fuel'))
            ));
            if (!empty($fuels)) {
                $query->whereHas('seaSpec', fn ($q) => $q->whereIn('fuel_type', $fuels));
            }
        }

        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $query->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }

        if (!empty($filters['model'])) {
            $model = mb_strtolower(trim($filters['model']));
            $query->whereRaw('LOWER(model) = ?', [$model]);
        }

        $rawBodyType = $filters['bodyType'] ?? $filters['body_type'] ?? null;
        if (!empty($rawBodyType)) {
            $bodyType = mb_strtolower(trim($rawBodyType));
            $allowed = ['suv','wagon','crossover','family','sportcoupe','compact','coupe','truck','othe'];
            if (in_array($bodyType, $allowed, true)) {
                $query->whereHas('landSpec', fn($q) => $q->whereRaw('LOWER(body_type) = ?', [$bodyType]));
            }
        }

        // Capacity Filter (multiple values)
        if ($request->filled('capacity')) {
            $capacities = explode(',', $request->capacity); // e.g. "2person,4person,8ormore"

            $query->where(function ($q) use ($capacities) {
                foreach ($capacities as $cap) {
                    if ($cap === '8ormore') {
                        $q->orWhere('passenger_capacity', '>=', 8);
                    } else {
                        $num = intval($cap); // "2person" -> 2
                        $q->orWhere('passenger_capacity', $num);
                    }
                }
            });
        }

                // Price Filter (multiple values)
        if ($request->filled('price')) {
            $prices = explode(',', $request->price);

            $query->where(function ($q) use ($prices) {
                foreach ($prices as $price) {
                    if ($price === '200plus') {
                        // Special case: price 200+
                        $q->orWhere('rental_price_per_day', '>=', 200);
                    } else {
                        // Other ranges like "0-50"
                        [$min, $max] = explode('-', $price);
                        $q->orWhereBetween('rental_price_per_day', [(int)$min, (int)$max]);
                    }
                }
            });
        }

        // Mileage Filter
        if ($request->filled('mileage')) {
            // Expecting comma-separated values like "limited,unlimited"
            $mileages = explode(',', $request->mileage);

            $query->where(function ($q) use ($mileages) {
                foreach ($mileages as $m) {
                    if ($m === 'limited') {
                        // Define what "limited" means, e.g., less than 50,000 km
                        $q->orWhere('mileage_km', '<', 50000);
                    } elseif ($m === 'unlimited') {
                        // "unlimited" means 50,000 km or more
                        $q->orWhere('mileage_km', '>=', 50000);
                    }
                }
            });
        }


        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );

                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,

                    'primary_image_url'    => $primaryMedia?->url,

                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'title'      => $m->title,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),

                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,

                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $brandCollection = Vehicle::query()
            ->when(!empty($rawBodyType), function ($q) use ($rawBodyType) {
                $bt = mb_strtolower(trim($rawBodyType));
                $q->whereHas('landSpec', fn($qq) => $qq->whereRaw('LOWER(body_type) = ?', [$bt]));
            })
            ->selectRaw('LOWER(manufacturer) AS key_name, MIN(manufacturer) AS display_name')
            ->whereNotNull('manufacturer')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->get()
            ->map(fn($row) => $row->display_name);

        $modelQuery = Vehicle::query();
        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $modelQuery->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }
        $modelCollection = $modelQuery
            ->whereNotNull('model')
            ->selectRaw('LOWER(model) AS key_name, MIN(model) AS display_name')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->pluck('display_name');

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return Inertia::render('Web/home/seaVehicleList', [
            'vehicles'         => $vehicles,
            'filters'          => [
                ...$filters,
                'bodyType' => $rawBodyType,
            ],
            'likedVehicleIds'  => $likedVehicleIds,
            'brandCollection'  => $brandCollection,
            'modelCollection'  => $modelCollection,
        ]);
    }

      public function airVehicleList(Request $request)
    {
        $filters = $request->only([
            'pickupLocation',
            'pickupDate',
            'dropoffLocation',
            'dropoffDate',
            'brand',
            'model',
            'bodyType',
            "capacity",
            'body_type',
            'fuel',
        ]);

        $query = Vehicle::with([
            'landSpec',
            'airSpec',
            'seaSpec',
            'images' => fn($q) => $q->orderByDesc('is_primary')
                ->orderBy('sort_order')
                ->orderBy('id'),
        ])
            ->active()
            ->type('air');

        // Fuel-type filter (air) — comma-separated enum values
        if ($request->filled('fuel')) {
            $fuels = array_filter(array_map(
                fn ($f) => mb_strtolower(trim($f)),
                explode(',', (string) $request->input('fuel'))
            ));
            if (!empty($fuels)) {
                $query->whereHas('airSpec', fn ($q) => $q->whereIn('fuel_type', $fuels));
            }
        }

        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $query->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }

        if (!empty($filters['model'])) {
            $model = mb_strtolower(trim($filters['model']));
            $query->whereRaw('LOWER(model) = ?', [$model]);
        }

        $rawBodyType = $filters['bodyType'] ?? $filters['body_type'] ?? null;
        if (!empty($rawBodyType)) {
            $bodyType = mb_strtolower(trim($rawBodyType));
            $allowed = ['suv','wagon','crossover','family','sportcoupe','compact','coupe','truck','othe'];
            if (in_array($bodyType, $allowed, true)) {
                $query->whereHas('landSpec', fn($q) => $q->whereRaw('LOWER(body_type) = ?', [$bodyType]));
            }
        }

        // Capacity Filter (multiple values)
        if ($request->filled('capacity')) {
            $capacities = explode(',', $request->capacity); // e.g. "2person,4person,8ormore"

            $query->where(function ($q) use ($capacities) {
                foreach ($capacities as $cap) {
                    if ($cap === '8ormore') {
                        $q->orWhere('passenger_capacity', '>=', 8);
                    } else {
                        $num = intval($cap); // "2person" -> 2
                        $q->orWhere('passenger_capacity', $num);
                    }
                }
            });
        }

                // Price Filter (multiple values)
        if ($request->filled('price')) {
            $prices = explode(',', $request->price);

            $query->where(function ($q) use ($prices) {
                foreach ($prices as $price) {
                    if ($price === '200plus') {
                        // Special case: price 200+
                        $q->orWhere('rental_price_per_day', '>=', 200);
                    } else {
                        // Other ranges like "0-50"
                        [$min, $max] = explode('-', $price);
                        $q->orWhereBetween('rental_price_per_day', [(int)$min, (int)$max]);
                    }
                }
            });
        }

        // Mileage Filter
        if ($request->filled('mileage')) {
            // Expecting comma-separated values like "limited,unlimited"
            $mileages = explode(',', $request->mileage);

            $query->where(function ($q) use ($mileages) {
                foreach ($mileages as $m) {
                    if ($m === 'limited') {
                        // Define what "limited" means, e.g., less than 50,000 km
                        $q->orWhere('mileage_km', '<', 50000);
                    } elseif ($m === 'unlimited') {
                        // "unlimited" means 50,000 km or more
                        $q->orWhere('mileage_km', '>=', 50000);
                    }
                }
            });
        }


        $vehicles = $query->paginate(12)->withQueryString()
            ->through(function (Vehicle $v) {
                $primaryMedia = optional(
                    $v->images->sortByDesc('is_primary')->sortBy('sort_order')->first()
                );

                return [
                    'id'                   => $v->id,
                    'model'                => $v->model,
                    'manufacturer'         => $v->manufacturer,
                    'rental_price_per_day' => $v->rental_price_per_day,

                    'primary_image_url'    => $primaryMedia?->url,

                    'images' => $v->images->map(fn($m) => [
                        'id'         => $m->id,
                        'title'      => $m->title,
                        'url'        => $m->url,
                        'is_primary' => (bool) $m->is_primary,
                        'sort_order' => (int) $m->sort_order,
                    ])->values(),

                    'landSpec' => [
                        'fuel_type'         => $v->landSpec?->fuel_type ?? $v->airSpec?->fuel_type ?? $v->seaSpec?->fuel_type ?? null,
                        'transmission_type' => $v->landSpec?->transmission_type ?? null,
                        'seats'             => $v->landSpec?->seats ?? $v->airSpec?->seats ?? null,
                    ],
                    // Distinguishing type-specific spec for the listing card
                    // chip — body_type (land), aircraft_type (air), or
                    // vessel_type (sea), whichever relation is loaded.
                    'typeSpec' => $v->landSpec?->body_type ?? $v->airSpec?->aircraft_type ?? $v->seaSpec?->vessel_type ?? null,

                    'mileage_km'         => $v->mileage_km,
                    'passenger_capacity' => $v->passenger_capacity,
                ];
            });

        $brandCollection = Vehicle::query()
            ->when(!empty($rawBodyType), function ($q) use ($rawBodyType) {
                $bt = mb_strtolower(trim($rawBodyType));
                $q->whereHas('landSpec', fn($qq) => $qq->whereRaw('LOWER(body_type) = ?', [$bt]));
            })
            ->selectRaw('LOWER(manufacturer) AS key_name, MIN(manufacturer) AS display_name')
            ->whereNotNull('manufacturer')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->get()
            ->map(fn($row) => $row->display_name);

        $modelQuery = Vehicle::query();
        if (!empty($filters['brand'])) {
            $brand = mb_strtolower(trim($filters['brand']));
            $modelQuery->whereRaw('LOWER(manufacturer) = ?', [$brand]);
        }
        $modelCollection = $modelQuery
            ->whereNotNull('model')
            ->selectRaw('LOWER(model) AS key_name, MIN(model) AS display_name')
            ->groupBy('key_name')
            ->orderBy('display_name')
            ->pluck('display_name');

        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];

        return Inertia::render('Web/home/airVehicleList', [
            'vehicles'         => $vehicles,
            'filters'          => [
                ...$filters,
                'bodyType' => $rawBodyType,
            ],
            'likedVehicleIds'  => $likedVehicleIds,
            'brandCollection'  => $brandCollection,
            'modelCollection'  => $modelCollection,
        ]);
    }

    /** Vehicle Details Page */
    public function vehicleDetails($idOrSlug)
    {
        $base = Vehicle::query()
            ->with([
                'landSpec',
                'images' => fn($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id'),
                'primaryImage',
                'documents',
                'crewMembers',
                'category',
                'provider',
                'reviews' => fn($q) => $q->latest(),
                'reviews.client:id,name,email,country',
                'policy',
            ])
            ->withAvg('reviews as rating_avg', 'rating')
            ->withCount('reviews as reviews_count')
            ->active();
            // ->type('land');

        $vehicle = (clone $base)
            ->when(
                is_numeric($idOrSlug),
                fn($q) => $q->where('id', (int) $idOrSlug),
                fn($q) => $q->where('registration_number', $idOrSlug)
            )
            ->firstOrFail();

        // Ratings histogram
        $rawBreakdown = $vehicle->reviews()
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingBreakdown = collect([5, 4, 3, 2, 1])
            ->mapWithKeys(fn($star) => [$star => (int) ($rawBreakdown[$star] ?? 0)]);

        // Likes / my review
        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];
        $vehicle->setAttribute('is_liked', Auth::check() && in_array($vehicle->id, $likedVehicleIds, true));
        $myReview   = Auth::check() ? $vehicle->reviews->firstWhere('client_id', Auth::id()) : null;

        $authUser =Auth::check() ? Auth::user() : null;
        $authUserId = Auth::id();

        $provider = $vehicle->provider
        ?[
            'id' => $vehicle->provider->id,
            'name' => $vehicle->provider->name,
            'email' => $vehicle->provider->email,
            'country' => $vehicle->provider->country,
            // Add other fields as necessary
        ] : null;

        // Frontend-friendly aliases (include URLs)
        $vehicle ->setAttribute('provider', $provider);
        $vehicle->setAttribute('landSpec', $vehicle->landSpec);
        $vehicle->setAttribute('primaryImage', $vehicle->primaryImage);
        $vehicle->setAttribute('primary_image_url', $vehicle->primary_image_url);
        $vehicle->setAttribute('images', $vehicle->images->map(fn($m) => [
            'id'         => $m->id,
            'title'      => $m->title,
            'url'        => $m->url,
            'is_primary' => (bool) $m->is_primary,
            'sort_order' => (int) $m->sort_order,
        ]));

        // Policy URLs for UI
        $vehicle->setAttribute('policy_pdf_url', $vehicle->policy_pdf_url);
        $vehicle->setAttribute('policy_stream_url', $vehicle->policy_stream_url);

        $similarVehicles = Vehicle::query()
            ->active()
            ->type('land')
            ->where('id', '!=', $vehicle->id)
            ->when($vehicle->category_id, fn($q) => $q->where('category_id', $vehicle->category_id))
            ->when($vehicle->manufacturer, fn($q) => $q->where('manufacturer', $vehicle->manufacturer))
            ->with(['primaryImage'])
            ->take(8)
            ->get()
            ->map(fn($v) => [
                'id'                   => $v->id,
                'model'                => $v->model,
                'manufacturer'         => $v->manufacturer,
                'primary_image_url'    => $v->primary_image_url,
                'rental_price_per_day' => $v->rental_price_per_day,
            ]);

        return Inertia::render('Web/home/land/VehicleDetails', [
            'vehicle'          => $vehicle,
            'similarVehicles'  => $similarVehicles,
            'ratingBreakdown'  => $ratingBreakdown,
            'likedVehicleIds'  => $likedVehicleIds,
            'myReview'         => $myReview,
            'authUserId'       => $authUserId,
            'authUser'         => $authUser,    
        ]);
    }

     /** Vehicle Details Page */
    public function airVehicleDetails($idOrSlug)
    {
        $base = Vehicle::query()
            ->with([
                'airSpec',
                'images' => fn($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id'),
                'primaryImage',
                'documents',
                'crewMembers',
                'category',
                'provider',
                'reviews' => fn($q) => $q->latest(),
                'reviews.client:id,name,email,country',
                'policy',
            ])
            ->withAvg('reviews as rating_avg', 'rating')
            ->withCount('reviews as reviews_count')
            ->active();
            // ->type('land');

        $vehicle = (clone $base)
            ->when(
                is_numeric($idOrSlug),
                fn($q) => $q->where('id', (int) $idOrSlug),
                fn($q) => $q->where('registration_number', $idOrSlug)
            )
            ->firstOrFail();

        // Ratings histogram
        $rawBreakdown = $vehicle->reviews()
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingBreakdown = collect([5, 4, 3, 2, 1])
            ->mapWithKeys(fn($star) => [$star => (int) ($rawBreakdown[$star] ?? 0)]);

        // Likes / my review
        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];
        $vehicle->setAttribute('is_liked', Auth::check() && in_array($vehicle->id, $likedVehicleIds, true));
        $myReview   = Auth::check() ? $vehicle->reviews->firstWhere('client_id', Auth::id()) : null;

        $authUser =Auth::check() ? Auth::user() : null;
        $authUserId = Auth::id();

        $provider = $vehicle->provider
        ?[
            'id' => $vehicle->provider->id,
            'name' => $vehicle->provider->name,
            'email' => $vehicle->provider->email,
            'phone' => $vehicle->provider->phone,
        ] : null;
        // Frontend-friendly aliases (include URLs)
        $vehicle ->setAttribute('provider', $provider);
        $vehicle->setAttribute('airSpec', $vehicle->airSpec);
        $vehicle->setAttribute('primaryImage', $vehicle->primaryImage);
        $vehicle->setAttribute('primary_image_url', $vehicle->primary_image_url);
        $vehicle->setAttribute('images', $vehicle->images->map(fn($m) => [
            'id'         => $m->id,
            'title'      => $m->title,
            'url'        => $m->url,
            'is_primary' => (bool) $m->is_primary,
            'sort_order' => (int) $m->sort_order,
        ]));

        // Policy URLs for UI
        $vehicle->setAttribute('policy_pdf_url', $vehicle->policy_pdf_url);
        $vehicle->setAttribute('policy_stream_url', $vehicle->policy_stream_url);

        $similarVehicles = Vehicle::query()
            ->active()
            ->type('air')
            ->where('id', '!=', $vehicle->id)
            ->when($vehicle->category_id, fn($q) => $q->where('category_id', $vehicle->category_id))
            ->when($vehicle->manufacturer, fn($q) => $q->where('manufacturer', $vehicle->manufacturer))
            ->with(['primaryImage'])
            ->take(8)
            ->get()
            ->map(fn($v) => [
                'id'                   => $v->id,
                'model'                => $v->model,
                'manufacturer'         => $v->manufacturer,
                'primary_image_url'    => $v->primary_image_url,
                'rental_price_per_day' => $v->rental_price_per_day,
            ]);

        return Inertia::render('Web/home/air/AirVehicleDetails', [
            'vehicle'          => $vehicle,
            'similarVehicles'  => $similarVehicles,
            'ratingBreakdown'  => $ratingBreakdown,
            'likedVehicleIds'  => $likedVehicleIds,
            'myReview'         => $myReview,
            'authUserId'       => $authUserId,
            'authUser'         => $authUser,
        ]);
    }

    /** Stream the policy PDF inline for preview (client public route) */
    public function policyPreview(Vehicle $vehicle)
    {
        $policy = $vehicle->policy;
        abort_if(!$policy, 404, 'No policy found for this vehicle.');

        $disk = $policy->disk ?: 'public';
        $path = $policy->file_path;

        $filename = $policy->original_name ?: 'policy.pdf';
        $headers  = ['Content-Type' => $policy->mime_type ?: 'application/pdf'];

        return Storage::disk($disk)->response($path, $filename, $headers);
    }

      /** Vehicle Details Page */
    public function seaVehicleDetails($idOrSlug)
    {
        $base = Vehicle::query()
            ->with([
                'airSpec',
                'images' => fn($q) => $q->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id'),
                'primaryImage',
                'documents',
                'crewMembers',
                'category',
                'provider',
                'reviews' => fn($q) => $q->latest(),
                'reviews.client:id,name,email,country',
                'policy',
            ])
            ->withAvg('reviews as rating_avg', 'rating')
            ->withCount('reviews as reviews_count')
            ->active();
            // ->type('land');

        $vehicle = (clone $base)
            ->when(
                is_numeric($idOrSlug),
                fn($q) => $q->where('id', (int) $idOrSlug),
                fn($q) => $q->where('registration_number', $idOrSlug)
            )
            ->firstOrFail();

        // Ratings histogram
        $rawBreakdown = $vehicle->reviews()
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingBreakdown = collect([5, 4, 3, 2, 1])
            ->mapWithKeys(fn($star) => [$star => (int) ($rawBreakdown[$star] ?? 0)]);

        // Likes / my review
        $likedVehicleIds = Auth::check()
            ? Auth::user()->vehicleLikes()->pluck('vehicle_id')->toArray()
            : [];
        $vehicle->setAttribute('is_liked', Auth::check() && in_array($vehicle->id, $likedVehicleIds, true));
        $myReview   = Auth::check() ? $vehicle->reviews->firstWhere('client_id', Auth::id()) : null;

        $authUser =Auth::check() ? Auth::user() : null;
        $authUserId = Auth::id();

        $provider = $vehicle->provider
        ?[
            'id' => $vehicle->provider->id,
            'name' => $vehicle->provider->name,
            'email' => $vehicle->provider->email,
            'phone' => $vehicle->provider->phone,
        ] : null;
        // Frontend-friendly aliases (include URLs)
        $vehicle ->setAttribute('provider', $provider);
        $vehicle->setAttribute('airSpec', $vehicle->airSpec);
        $vehicle->setAttribute('primaryImage', $vehicle->primaryImage);
        $vehicle->setAttribute('primary_image_url', $vehicle->primary_image_url);
        $vehicle->setAttribute('images', $vehicle->images->map(fn($m) => [
            'id'         => $m->id,
            'title'      => $m->title,
            'url'        => $m->url,
            'is_primary' => (bool) $m->is_primary,
            'sort_order' => (int) $m->sort_order,
        ]));

        // Policy URLs for UI
        $vehicle->setAttribute('policy_pdf_url', $vehicle->policy_pdf_url);
        $vehicle->setAttribute('policy_stream_url', $vehicle->policy_stream_url);

        $similarVehicles = Vehicle::query()
            ->active()
            ->type('air')
            ->where('id', '!=', $vehicle->id)
            ->when($vehicle->category_id, fn($q) => $q->where('category_id', $vehicle->category_id))
            ->when($vehicle->manufacturer, fn($q) => $q->where('manufacturer', $vehicle->manufacturer))
            ->with(['primaryImage'])
            ->take(8)
            ->get()
            ->map(fn($v) => [
                'id'                   => $v->id,
                'model'                => $v->model,
                'manufacturer'         => $v->manufacturer,
                'primary_image_url'    => $v->primary_image_url,
                'rental_price_per_day' => $v->rental_price_per_day,
            ]);

        return Inertia::render('Web/home/seaVehicle/SeaVehicleDetails', [
            'vehicle'          => $vehicle,
            'similarVehicles'  => $similarVehicles,
            'ratingBreakdown'  => $ratingBreakdown,
            'likedVehicleIds'  => $likedVehicleIds,
            'myReview'         => $myReview,
            'authUserId'       => $authUserId,
            'authUser'         => $authUser,
        ]);
    }

}
