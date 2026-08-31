<?php

namespace App\Http\Controllers\CourierControllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Courier\StoreCourierShipmentRequest;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\SuperAdminCourierActionAudit;
use App\Models\Courier\CourierVendorCodCapability;
use App\Models\Location\LocationCity;
use App\Models\Location\LocationCountry;
use App\Models\User;
use App\Models\Courier\VendorCourierSetting;
use App\Models\VendorServiceRegistration;
use App\Services\Courier\CourierClientObservabilityService;
use App\Services\Courier\CourierCustomerEmailDispatchService;
use App\Services\Courier\PayHereGatewayService;
use App\Support\Courier\ClientCourierShipmentTransformer;
use App\Services\Courier\CourierVendorAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ClientCourierController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('signin.signin');
        }

        // Fetch all shipments for the user with relationships
        $shipments = CourierShipment::with([
            'sender',
            'recipient',
            'senderAddress',
            'recipientAddress',
            'packages',
            'latestPayment',
            'trackingEvents' => function ($query) {
                $query->orderBy('recorded_at', 'desc');
            }
        ])
            ->where('requested_by_user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $favoriteRecipients = CourierContact::query()
            ->with(['addresses' => function ($query) {
                $query->orderByDesc('is_primary')->orderBy('id');
            }])
            ->where('user_id', $user->id)
            ->where('role', CourierContact::ROLE_RECIPIENT)
            ->where('is_favorite', true)
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function (CourierContact $contact) {
                $address = $contact->addresses->first();

                return [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'email' => $contact->email,
                    'phone' => $contact->phone,
                    'company' => $contact->company_name,
                    'address' => $address ? [
                        'line1' => $address->line1,
                        'line2' => $address->line2,
                        'city' => $address->city,
                        'state' => $address->state,
                        'postalCode' => $address->postal_code,
                        'country' => $address->country,
                        'instructions' => $address->instructions,
                    ] : null,
                ];
            })
            ->values();

        $favoriteSenders = CourierContact::query()
            ->with(['addresses' => function ($query) {
                $query->orderByDesc('is_primary')->orderBy('id');
            }])
            ->where('user_id', $user->id)
            ->where('role', CourierContact::ROLE_SENDER)
            ->where('is_favorite', true)
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function (CourierContact $contact) {
                $address = $contact->addresses->first();

                return [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'email' => $contact->email,
                    'phone' => $contact->phone,
                    'company' => $contact->company_name,
                    'address' => $address ? [
                        'line1' => $address->line1,
                        'line2' => $address->line2,
                        'city' => $address->city,
                        'state' => $address->state,
                        'postalCode' => $address->postal_code,
                        'country' => $address->country,
                        'instructions' => $address->instructions,
                    ] : null,
                ];
            })
            ->values();

        $countries = $this->resolveSupportedCountryCodes();

        // Calculate statistics
        $totalShipments = $shipments->count();

        // Count by package type
        $documentCount = 0;
        $parcelCount = 0;
        $freightCount = 0;

        foreach ($shipments as $shipment) {
            foreach ($shipment->packages as $package) {
                if (stripos($package->package_type, 'document') !== false) {
                    $documentCount++;
                } elseif (stripos($package->package_type, 'freight') !== false) {
                    $freightCount++;
                } else {
                    $parcelCount++;
                }
            }
        }

        // Count by status
        $confirmedCount = $shipments->where('status', 'confirmed')->count();
        $inTransitCount = $shipments->where('status', 'in_transit')->count();
        $deliveredCount = $shipments->where('status', 'delivered')->count();
        $pendingCount = $shipments->where('status', 'pending')->count();
        $cancelledCount = $shipments->where('status', 'cancelled')->count();

        // Monthly breakdown (last 12 months)
        $monthlyData = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();

            $monthShipments = $shipments->filter(function ($shipment) use ($monthStart, $monthEnd) {
                return $shipment->created_at >= $monthStart && $shipment->created_at <= $monthEnd;
            });

            $docCount = 0;
            $parcCount = 0;
            $freightCount = 0;

            foreach ($monthShipments as $shipment) {
                foreach ($shipment->packages as $package) {
                    if (stripos($package->package_type, 'document') !== false) {
                        $docCount++;
                    } elseif (stripos($package->package_type, 'freight') !== false) {
                        $freightCount++;
                    } else {
                        $parcCount++;
                    }
                }
            }

            $monthlyData[] = [
                'month' => $month->format('M'),
                'document' => $docCount,
                'parcel' => $parcCount,
                'freight' => $freightCount,
            ];
        }

        $transformer = app(ClientCourierShipmentTransformer::class);

        // Format shipments for frontend with a shared DTO contract.
        $formattedShipments = $shipments
            ->map(fn(CourierShipment $shipment) => $transformer->forDashboard($shipment))
            ->values();

        return Inertia::render('Web/home/client/CourierBookingDashboard', [
            'shipments' => $formattedShipments,
            'statistics' => [
                'total' => $totalShipments,
                'document' => $documentCount,
                'parcel' => $parcelCount,
                'freight' => $freightCount,
                'confirmed' => $confirmedCount,
                'inTransit' => $inTransitCount,
                'delivered' => $deliveredCount,
                'pending' => $pendingCount,
                'cancelled' => $cancelledCount,
            ],
            'monthlyData' => $monthlyData,
            'favoriteRecipients' => $favoriteRecipients,
            'favoriteSenders' => $favoriteSenders,
            'countries' => $countries,
        ]);
    }

    public function storeFavoriteRecipient(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            return redirect()->route('signin.signin');
        }

        $requestedRole = strtolower((string) $request->input('role', CourierContact::ROLE_RECIPIENT));
        $allowedRoles = [
            CourierContact::ROLE_RECIPIENT,
            CourierContact::ROLE_SENDER,
        ];
        $role = in_array($requestedRole, $allowedRoles, true)
            ? $requestedRole
            : CourierContact::ROLE_RECIPIENT;
        $payloadKey = $role === CourierContact::ROLE_SENDER ? 'sender' : 'recipient';
        $roleLabel = $role === CourierContact::ROLE_SENDER ? 'Sender' : 'Recipient';

        $validated = $request->validate(
            [
                "{$payloadKey}.name" => ['required', 'string', 'max:120'],
                "{$payloadKey}.email" => ['nullable', 'email', 'max:150'],
                "{$payloadKey}.phone" => ['nullable', 'string', 'max:40'],
                "{$payloadKey}.company" => ['nullable', 'string', 'max:120'],
                "{$payloadKey}.address.line1" => ['required', 'string', 'max:180'],
                "{$payloadKey}.address.line2" => ['nullable', 'string', 'max:180'],
                "{$payloadKey}.address.city" => ['nullable', 'string', 'max:120'],
                "{$payloadKey}.address.state" => ['nullable', 'string', 'max:120'],
                "{$payloadKey}.address.postalCode" => ['nullable', 'string', 'max:30'],
                "{$payloadKey}.address.country" => ['nullable', 'string', 'max:2'],
                "{$payloadKey}.address.instructions" => ['nullable', 'string', 'max:500'],
            ],
            [],
            [
                "{$payloadKey}.address.line1" => strtolower($roleLabel) . ' address line 1',
            ]
        );

        $contactPayload = $validated[$payloadKey] ?? [];
        $address = $contactPayload['address'] ?? [];

        $name = trim((string) ($contactPayload['name'] ?? ''));
        $email = trim((string) ($contactPayload['email'] ?? ''));
        $phone = trim((string) ($contactPayload['phone'] ?? ''));
        $company = trim((string) ($contactPayload['company'] ?? ''));

        $email = $email !== '' ? $email : null;
        $phone = $phone !== '' ? $phone : null;
        $company = $company !== '' ? $company : null;

        $contactQuery = CourierContact::query()
            ->where('user_id', $user->id)
            ->where('role', $role)
            ->where('name', $name);

        if ($email === null) {
            $contactQuery->whereNull('email');
        } else {
            $contactQuery->where('email', $email);
        }

        if ($phone === null) {
            $contactQuery->whereNull('phone');
        } else {
            $contactQuery->where('phone', $phone);
        }

        if ($company === null) {
            $contactQuery->whereNull('company_name');
        } else {
            $contactQuery->where('company_name', $company);
        }

        $contact = $contactQuery->first();

        if (!$contact) {
            $contact = CourierContact::create([
                'user_id' => $user->id,
                'role' => $role,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'company_name' => $company,
                'is_favorite' => true,
            ]);
        } else {
            $contact->update([
                'email' => $email,
                'phone' => $phone,
                'company_name' => $company,
                'is_favorite' => true,
            ]);
        }

        $addressData = [
            'label' => $role === CourierContact::ROLE_SENDER ? 'pickup' : 'dropoff',
            'line1' => $address['line1'],
            'line2' => $address['line2'] ?? null,
            'city' => trim((string) ($address['city'] ?? '')),
            'state' => $address['state'] ?? null,
            'postal_code' => $address['postalCode'] ?? null,
            'country' => strtoupper(trim((string) ($address['country'] ?? ''))),
            'instructions' => $address['instructions'] ?? null,
            'is_primary' => true,
        ];

        $primaryAddress = $contact->addresses()
            ->where('is_primary', true)
            ->orderByDesc('id')
            ->first();

        if ($primaryAddress) {
            $primaryAddress->update($addressData);
        } else {
            $contact->addresses()->create($addressData);
        }

        $contact->load([
            'addresses' => function ($query) {
                $query->orderByDesc('is_primary')->orderBy('id');
            },
        ]);

        $message = $roleLabel . ' saved to favorites.';

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'contact' => $this->mapFavoriteContact($contact),
            ]);
        }

        return redirect()
            ->route('courierBookingDashboard')
            ->with('success', $message);
    }

    public function removeFavoriteRecipient(Request $request, CourierContact $contact)
    {
        $user = Auth::user();

        if (!$user) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            return redirect()->route('signin.signin');
        }

        if ((int) $contact->user_id !== (int) $user->id) {
            abort(404);
        }

        if ($contact->is_favorite) {
            $contact->update([
                'is_favorite' => false,
            ]);
        }

        $roleLabel = $contact->role === CourierContact::ROLE_SENDER ? 'Sender' : 'Recipient';
        $message = $roleLabel . ' removed from favorites.';

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return back()->with('success', $message);
    }

    private function mapFavoriteContact(CourierContact $contact): array
    {
        $contact->loadMissing([
            'addresses' => function ($query) {
                $query->orderByDesc('is_primary')->orderBy('id');
            },
        ]);

        $address = $contact->addresses->first();

        return [
            'id' => $contact->id,
            'name' => $contact->name,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'company' => $contact->company_name,
            'address' => $address ? [
                'line1' => $address->line1,
                'line2' => $address->line2,
                'instructions' => $address->instructions,
            ] : null,
        ];
    }

    /**
     * Public "Track Shipment" page — no login required, but a reference
     * number alone is guessable/shareable, so full details are only shown
     * once the requester also confirms the email on file AND the 6-digit
     * tracking PIN generated when the shipment was created (see
     * CourierShipment::generateTrackingPin()). Reference-only lookups get a
     * "verify to continue" state instead of the stripped tracking payload.
     */
    public function trackPublic(Request $request)
    {
        $reference = trim((string) $request->query('reference', ''));
        $email = trim((string) $request->query('email', ''));
        $pin = trim((string) $request->query('pin', ''));
        $result = null;
        $notFound = false;
        $needsVerification = false;

        if ($reference !== '') {
            $shipment = CourierShipment::with([
                'sender',
                'recipient',
                'senderAddress',
                'recipientAddress',
                'trackingEvents' => function ($query) {
                    $query->orderBy('recorded_at', 'desc');
                },
            ])
                ->where('reference', $reference)
                ->first();

            if (!$shipment) {
                $notFound = true;
            } else {
                $senderEmail = mb_strtolower((string) ($shipment->sender?->email ?? ''));
                $recipientEmail = mb_strtolower((string) ($shipment->recipient?->email ?? ''));
                $emailMatches = $email !== '' && in_array(mb_strtolower($email), array_filter([$senderEmail, $recipientEmail]), true);
                $pinMatches = $pin !== '' && hash_equals((string) $shipment->tracking_pin, $pin);

                if ($emailMatches && $pinMatches) {
                    $result = app(ClientCourierShipmentTransformer::class)->forPublicTracking($shipment);
                } else {
                    $needsVerification = true;
                }
            }
        }

        return Inertia::render('Web/courier/TrackShipment', [
            'reference' => $reference !== '' ? $reference : null,
            'email' => $email !== '' ? $email : null,
            'result' => $result,
            'notFound' => $notFound,
            'needsVerification' => $needsVerification,
        ]);
    }

    public function show(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user) {
            $this->observability()->recordAuthorizationDenial($request, 'unauthenticated_detail_read', [
                'requested_shipment_id' => (int) $id,
            ]);

            return redirect()->route('signin.signin');
        }

        // Fetch shipment with all relationships
        $shipment = CourierShipment::with([
            'sender',
            'recipient',
            'senderAddress',
            'recipientAddress',
            'packages',
            'latestPayment',
            'trackingEvents' => function ($query) {
                $query->orderBy('recorded_at', 'desc');
            }
        ])
            ->where('id', $id)
            ->firstOrFail();

        if ((int) $shipment->requested_by_user_id !== (int) $user->id) {
            $this->observability()->recordOwnershipFailure($request, 'shipment_detail_read', (int) $shipment->id, [
                'requested_shipment_id' => (int) $id,
                'owner_user_id' => (int) $shipment->requested_by_user_id,
            ]);

            abort(404);
        }

        $this->observability()->logDetailRead($request, (int) $shipment->id, [
            'mode' => 'detail_page',
            'shipment_reference' => (string) $shipment->reference,
        ]);

        $transformer = app(ClientCourierShipmentTransformer::class);

        // Format shipment data with the same shared contract used by list/dashboard.
        $shipmentData = $transformer->forDetail($shipment);

        return Inertia::render('Web/home/client/CourierShipmentDetail', [
            'shipment' => $shipmentData,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user) {
            $this->observability()->recordAuthorizationDenial($request, 'unauthenticated_status_update', [
                'requested_shipment_id' => (int) $id,
            ]);

            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $shipment = CourierShipment::where('id', $id)->firstOrFail();

        if ((int) $shipment->requested_by_user_id !== (int) $user->id) {
            $this->observability()->recordOwnershipFailure($request, 'shipment_status_update', (int) $shipment->id, [
                'requested_shipment_id' => (int) $id,
                'owner_user_id' => (int) $shipment->requested_by_user_id,
            ]);

            abort(404);
        }

        if (SuperAdminCourierActionAudit::isShipmentOperationsFrozen((int) $shipment->id)) {
            return response()->json([
                'error' => 'Shipment operations are temporarily frozen by SuperAdmin.',
            ], 423);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,in_transit,delivered,cancelled',
        ]);

        $targetStatus = (string) $validated['status'];
        $currentStatus = (string) $shipment->status;

        if ($currentStatus === $targetStatus) {
            return response()->json([
                'success' => true,
                'message' => 'Shipment status is already up to date.',
                'shipment' => [
                    'id' => $shipment->id,
                    'status' => $shipment->status,
                ],
            ]);
        }

        if (!$this->isAllowedStatusTransition($currentStatus, $targetStatus)) {
            return response()->json([
                'error' => 'Invalid shipment status transition.',
            ], 422);
        }

        $shipment->update([
            'status' => $targetStatus,
        ]);

        // Optionally create a tracking event for successful status transitions.
        if ($request->has('create_tracking_event') && $request->create_tracking_event) {
            $shipment->trackingEvents()->create([
                'status' => $targetStatus,
                'location' => $request->input('location'),
                'description' => $request->input('description', 'Status updated to ' . $targetStatus),
                'recorded_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully',
            'shipment' => [
                'id' => $shipment->id,
                'status' => $shipment->status,
            ],
        ]);
    }

    public function cancelShipment(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user) {
            $this->observability()->recordAuthorizationDenial($request, 'unauthenticated_cancel_request', [
                'requested_shipment_id' => (int) $id,
            ]);

            return redirect()->route('signin.signin');
        }

        $shipment = CourierShipment::where('id', $id)->firstOrFail();

        if ((int) $shipment->requested_by_user_id !== (int) $user->id) {
            $this->observability()->recordOwnershipFailure($request, 'shipment_cancel', (int) $shipment->id, [
                'requested_shipment_id' => (int) $id,
                'owner_user_id' => (int) $shipment->requested_by_user_id,
            ]);

            abort(404);
        }

        if (SuperAdminCourierActionAudit::isShipmentOperationsFrozen((int) $shipment->id)) {
            return back()->with('error', 'Shipment operations are temporarily frozen by SuperAdmin.');
        }

        if ($shipment->status === CourierShipment::STATUS_CANCELLED) {
            return back()->with('success', 'Shipment is already cancelled.');
        }

        // Cancellation is blocked once delivery is finalized.
        if ($shipment->status === CourierShipment::STATUS_DELIVERED) {
            return back()->with('error', 'Cannot cancel this shipment.');
        }

        if (!$this->isAllowedStatusTransition((string) $shipment->status, CourierShipment::STATUS_CANCELLED)) {
            return back()->with('error', 'Cannot cancel this shipment.');
        }

        $shipment->update([
            'status' => CourierShipment::STATUS_CANCELLED,
        ]);

        // Create tracking event
        $trackingEvent = $shipment->trackingEvents()->create([
            'status' => CourierShipment::STATUS_CANCELLED,
            'description' => 'Shipment cancelled by customer',
            'recorded_at' => now(),
        ]);

        app(CourierCustomerEmailDispatchService::class)->queueBookingCancelled($shipment, $trackingEvent);

        return back()->with('success', 'Shipment cancelled successfully.');
    }

    public function create(Request $request)
    {
        $this->observability()->logCreateViewOpened($request, [
            'has_recent_reference' => $request->session()->has('courier_reference'),
            'has_recent_bill_id' => $request->session()->has('courier_bill_id'),
        ]);

        $flow = $this->resolveBookingFlow((string) $request->route('flow'));
        $serviceCategory = $this->hasFlowRouteContext($request) ? $flow : 'domestic';
        $serviceLevels = $this->serviceLevelLabelsForCategory($serviceCategory);
        $packageTypes = ['document', 'parcel', 'freight', 'temperature_controlled'];
        $countries = $this->resolveSupportedCountryCodes();

        return Inertia::render($this->resolveFlowPageComponent($request, 'Create'), [
            'serviceLevels' => $serviceLevels,
            'packageTypes' => $packageTypes,
            'countries' => $countries,
            'quoteProviders' => $this->resolveCreateQuoteProviders(),
            'recentReference' => $request->session()->pull('courier_reference'),
            'recentShipmentId' => $request->session()->pull('courier_bill_id'),
            'recentPricingExplanation' => $request->session()->pull('courier_pricing_explanation'),
            'bookingFlow' => $this->hasFlowRouteContext($request) ? $flow : null,
            'flowRoutes' => $this->resolveBookingFlowRoutes($request),
        ]);
    }

    public function lookupCountries(Request $request)
    {
        $validated = $request->validate([
            'query' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $searchQuery = trim((string) ($validated['query'] ?? ''));
        $searchQueryUpper = strtoupper($searchQuery);
        $searchQueryLower = strtolower($searchQuery);
        $limit = (int) ($validated['limit'] ?? 20);

        $catalog = $this->resolveCountryCatalog();

        $buildSuggestion = function (string $code, string $name, string $iso3 = '', string $nameNative = '') use ($searchQueryLower, $searchQueryUpper) {
            $normalizedCode = strtoupper(trim($code));
            $normalizedIso3 = strtoupper(trim($iso3));
            $normalizedName = trim($name);
            $normalizedNative = trim($nameNative);

            if ($normalizedCode === '' || $normalizedName === '') {
                return null;
            }

            if ($searchQueryLower === '') {
                return [
                    'code' => $normalizedCode,
                    'name' => $normalizedName,
                    'score' => 5,
                ];
            }

            $nameLower = strtolower($normalizedName);
            $nativeLower = strtolower($normalizedNative);

            if ($normalizedCode === $searchQueryUpper || ($normalizedIso3 !== '' && $normalizedIso3 === $searchQueryUpper)) {
                $score = 0;
            } elseif ($nameLower === $searchQueryLower || ($nativeLower !== '' && $nativeLower === $searchQueryLower)) {
                $score = 1;
            } elseif (
                str_starts_with($nameLower, $searchQueryLower)
                || ($nativeLower !== '' && str_starts_with($nativeLower, $searchQueryLower))
                || str_starts_with($normalizedCode, $searchQueryUpper)
                || ($normalizedIso3 !== '' && str_starts_with($normalizedIso3, $searchQueryUpper))
            ) {
                $score = 2;
            } elseif (
                str_contains($nameLower, $searchQueryLower)
                || ($nativeLower !== '' && str_contains($nativeLower, $searchQueryLower))
            ) {
                $score = 3;
            } else {
                return null;
            }

            return [
                'code' => $normalizedCode,
                'name' => $normalizedName,
                'score' => $score,
            ];
        };

        $suggestions = collect($catalog)
            ->map(fn(array $entry) => $buildSuggestion(
                (string) ($entry['code'] ?? ''),
                (string) ($entry['name'] ?? ''),
                (string) ($entry['iso3'] ?? ''),
                (string) ($entry['nameNative'] ?? '')
            ))
            ->filter(fn($entry) => is_array($entry) && $entry['code'] !== '' && $entry['name'] !== '')
            ->unique(fn(array $entry) => $entry['code'])
            ->sortBy([
                ['score', 'asc'],
                ['name', 'asc'],
            ])
            ->values()
            ->take($limit)
            ->map(fn(array $entry) => [
                'code' => $entry['code'],
                'name' => $entry['name'],
            ])
            ->all();

        return response()->json([
            'suggestions' => $suggestions,
            'meta' => [
                'query' => $searchQuery !== '' ? $searchQuery : null,
                'count' => count($suggestions),
            ],
        ]);
    }

    private function resolveSupportedCountryCodes(): array
    {
        return collect($this->resolveCountryCatalog())
            ->map(fn(array $entry) => strtoupper(trim((string) ($entry['code'] ?? ''))))
            ->filter(fn(string $code) => strlen($code) === 2)
            ->unique()
            ->values()
            ->all();
    }

    private function resolveCountryCatalog(): array
    {
        $databaseCatalog = LocationCountry::query()
            ->select(['iso2', 'iso3', 'name_en', 'name_native'])
            ->where('is_active', true)
            ->orderBy('name_en')
            ->orderBy('iso2')
            ->get()
            ->toBase()
            ->map(function (LocationCountry $country) {
                $code = strtoupper(trim((string) ($country->iso2 ?? '')));
                $iso3 = strtoupper(trim((string) ($country->iso3 ?? '')));
                $nameEnglish = trim((string) ($country->name_en ?? ''));
                $nameNative = trim((string) ($country->name_native ?? ''));
                $name = $nameEnglish !== '' ? $nameEnglish : ($nameNative !== '' ? $nameNative : $code);

                return [
                    'code' => $code,
                    'iso3' => $iso3,
                    'name' => $name,
                    'nameNative' => $nameNative,
                ];
            })
            ->filter(fn(array $entry) => $entry['code'] !== '' && $entry['name'] !== '')
            ->values();

        $externalCatalog = Cache::remember('courier:countries:external_catalog', now()->addDay(), function () {
            $baseUrl = rtrim((string) config('services.restcountries.base_url', 'https://restcountries.com/v3.1'), '/');
            $timeoutSeconds = max(2, (int) config('services.restcountries.timeout', 8));

            try {
                $response = Http::acceptJson()
                    ->timeout($timeoutSeconds)
                    ->get($baseUrl . '/all', [
                        'fields' => 'cca2,cca3,name',
                    ]);

                if (!$response->successful()) {
                    return [];
                }

                $payload = $response->json();
                if (!is_array($payload)) {
                    return [];
                }

                return collect($payload)
                    ->filter(fn($item) => is_array($item))
                    ->map(function (array $item) {
                        $code = strtoupper(trim((string) ($item['cca2'] ?? '')));
                        $iso3 = strtoupper(trim((string) ($item['cca3'] ?? '')));
                        $name = trim((string) (($item['name']['common'] ?? '') ?: ''));

                        return [
                            'code' => $code,
                            'iso3' => $iso3,
                            'name' => $name,
                            'nameNative' => '',
                        ];
                    })
                    ->filter(fn(array $entry) => strlen($entry['code']) === 2 && $entry['name'] !== '')
                    ->values()
                    ->all();
            } catch (\Throwable $exception) {
                report($exception);

                return [];
            }
        });

        return $databaseCatalog
            ->merge(collect($externalCatalog))
            ->filter(fn($entry) => is_array($entry))
            ->map(function (array $entry) {
                return [
                    'code' => strtoupper(trim((string) ($entry['code'] ?? ''))),
                    'iso3' => strtoupper(trim((string) ($entry['iso3'] ?? ''))),
                    'name' => trim((string) ($entry['name'] ?? '')),
                    'nameNative' => trim((string) ($entry['nameNative'] ?? '')),
                ];
            })
            ->filter(fn(array $entry) => strlen($entry['code']) === 2 && $entry['name'] !== '')
            ->unique(fn(array $entry) => $entry['code'])
            ->sortBy('name')
            ->values()
            ->all();
    }

    public function lookupPostalCodesByCity(Request $request)
    {
        $validated = $request->validate([
            'city' => ['required', 'string', 'max:120'],
            'country' => ['required', 'string', 'size:2'],
            'state' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'routeType' => ['nullable', 'string', 'in:international'],
        ]);

        if ($this->hasFlowRouteContext($request)) {
            if ($this->resolveBookingFlow((string) $request->route('flow')) !== 'international') {
                return response()->json([
                    'message' => 'Postal code lookup is available for international bookings only.',
                    'postalCodes' => [],
                ], 422);
            }
        } else {
            $isInternationalRequest = strtolower((string) ($validated['routeType'] ?? '')) === 'international';

            if (!$isInternationalRequest) {
                return response()->json([
                    'message' => 'Postal code lookup is available for international bookings only.',
                    'postalCodes' => [],
                ], 422);
            }
        }

        $apiKey = trim((string) config('services.zipcodebase.api_key'));
        if ($apiKey === '') {
            return response()->json([
                'message' => 'Postal code lookup service is not configured.',
                'postalCodes' => [],
            ], 503);
        }

        $baseUrl = rtrim((string) config('services.zipcodebase.base_url', 'https://app.zipcodebase.com/api/v1'), '/');
        $configuredTimeout = (int) config('services.zipcodebase.timeout', 10);
        $timeoutSeconds = max(2, min($configuredTimeout, 5));
        $country = strtoupper((string) $validated['country']);
        $query = [
            'city' => trim((string) $validated['city']),
            'country' => $country,
            'limit' => (int) ($validated['limit'] ?? 10),
            'apikey' => $apiKey,
        ];
        $isShortCityPrefix = mb_strlen($query['city']) <= 4;

        if (!empty($validated['state'])) {
            $query['state_name'] = trim((string) $validated['state']);
        }

        $cityCandidates = $this->resolvePostalLookupCityCandidates($query['city']);

        try {
            if ($isShortCityPrefix) {
                $fastSuggestions = $this->searchOpenDataPostalCitySuggestionsByCityPrefix(
                    $query['city'],
                    $country,
                    max((int) $query['limit'], 1) * 3
                );

                $fastPostalCodes = collect($fastSuggestions)
                    ->map(fn($item) => trim((string) ($item['postalCode'] ?? '')))
                    ->filter()
                    ->unique()
                    ->values()
                    ->take((int) $query['limit'])
                    ->all();

                if (!empty($fastPostalCodes)) {
                    return response()->json([
                        'postalCodes' => $fastPostalCodes,
                        'meta' => [
                            'city' => $query['city'],
                            'matchedCity' => $query['city'],
                            'country' => $query['country'],
                            'count' => count($fastPostalCodes),
                            'attemptedCities' => [$query['city']],
                            'source' => 'opendatasoft-geonames-fast',
                        ],
                    ]);
                }
            }

            $matchedCity = $query['city'];
            $postalCodes = [];
            $hadSuccessfulResponse = false;
            $lastErrorStatus = null;

            foreach ($cityCandidates as $candidateCity) {
                $candidateQuery = $query;
                $candidateQuery['city'] = $candidateCity;

                $response = Http::acceptJson()
                    ->timeout($timeoutSeconds)
                    ->withHeaders(['apikey' => $apiKey])
                    ->get($baseUrl . '/code/city', $candidateQuery);

                if (!$response->successful()) {
                    $lastErrorStatus = $response->status();
                    continue;
                }

                $hadSuccessfulResponse = true;
                $postalCodes = $this->extractPostalCodesFromLookupResponse($response->json());

                if (!empty($postalCodes)) {
                    $matchedCity = $candidateCity;
                    break;
                }
            }

            if (empty($postalCodes)) {
                $fallbackSuggestions = $this->searchOpenDataPostalCitySuggestionsByCityPrefix(
                    $query['city'],
                    $country,
                    max((int) $query['limit'], 1) * 3
                );

                $fallbackPostalCodes = collect($fallbackSuggestions)
                    ->map(fn($item) => trim((string) ($item['postalCode'] ?? '')))
                    ->filter()
                    ->unique()
                    ->values()
                    ->take((int) $query['limit'])
                    ->all();

                if (!empty($fallbackPostalCodes)) {
                    return response()->json([
                        'postalCodes' => $fallbackPostalCodes,
                        'meta' => [
                            'city' => $query['city'],
                            'matchedCity' => $query['city'],
                            'country' => $query['country'],
                            'count' => count($fallbackPostalCodes),
                            'attemptedCities' => $cityCandidates,
                            'source' => 'opendatasoft-geonames',
                        ],
                    ]);
                }
            }

            if (!$hadSuccessfulResponse) {
                return response()->json([
                    'message' => 'Postal code lookup failed.',
                    'postalCodes' => [],
                ], ($lastErrorStatus !== null && $lastErrorStatus >= 500) ? 502 : 422);
            }

            return response()->json([
                'postalCodes' => $postalCodes,
                'meta' => [
                    'city' => $query['city'],
                    'matchedCity' => $matchedCity,
                    'country' => $query['country'],
                    'count' => count($postalCodes),
                    'attemptedCities' => $cityCandidates,
                    'source' => 'zipcodebase',
                ],
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Postal code lookup is temporarily unavailable.',
                'postalCodes' => [],
            ], 502);
        }
    }

    public function lookupCityByPostalCode(Request $request)
    {
        $validated = $request->validate([
            'postalCode' => ['nullable', 'string', 'max:20', 'required_without:city'],
            'city' => ['nullable', 'string', 'max:120', 'required_without:postalCode'],
            'country' => ['required', 'string', 'size:2'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'routeType' => ['nullable', 'string', 'in:international'],
        ]);

        if ($this->hasFlowRouteContext($request)) {
            if ($this->resolveBookingFlow((string) $request->route('flow')) !== 'international') {
                return response()->json([
                    'message' => 'City lookup is available for international bookings only.',
                    'city' => null,
                    'cities' => [],
                ], 422);
            }
        } else {
            $isInternationalRequest = strtolower((string) ($validated['routeType'] ?? '')) === 'international';

            if (!$isInternationalRequest) {
                return response()->json([
                    'message' => 'City lookup is available for international bookings only.',
                    'city' => null,
                    'cities' => [],
                ], 422);
            }
        }

        $postalCodePrefix = trim((string) ($validated['postalCode'] ?? ''));
        $cityPrefix = trim((string) ($validated['city'] ?? ''));
        $countryCode = strtoupper((string) $validated['country']);
        $limit = (int) ($validated['limit'] ?? 20);
        $isCityLookup = $cityPrefix !== '';
        $isShortPrefixLookup = $isCityLookup
            ? mb_strlen($cityPrefix) <= 4
            : mb_strlen($postalCodePrefix) <= 3;

        $queryCandidates = $isCityLookup
            ? $this->resolvePostalLookupCityCandidates($cityPrefix)
            : [$postalCodePrefix];

        $queryCandidates = collect($queryCandidates)
            ->map(fn($candidate) => trim((string) $candidate))
            ->filter()
            ->unique()
            ->values()
            ->take($isShortPrefixLookup ? 1 : 3)
            ->all();

        if (empty($queryCandidates)) {
            return response()->json([
                'city' => $isCityLookup ? ($cityPrefix !== '' ? $cityPrefix : null) : null,
                'cities' => [],
                'suggestions' => [],
                'meta' => [
                    'postalCode' => $postalCodePrefix !== '' ? $postalCodePrefix : null,
                    'city' => $cityPrefix !== '' ? $cityPrefix : null,
                    'country' => $countryCode,
                    'count' => 0,
                    'exactMatch' => false,
                    'queryType' => $isCityLookup ? 'city' : 'postalCode',
                    'source' => 'zipcodebase',
                ],
            ]);
        }

        if ($isShortPrefixLookup) {
            $fastSuggestions = $isCityLookup
                ? $this->searchOpenDataPostalCitySuggestionsByCityPrefix($cityPrefix, $countryCode, $limit)
                : $this->searchOpenDataPostalCitySuggestionsByPrefix($postalCodePrefix, $countryCode, $limit);

            if (!empty($fastSuggestions)) {
                $fastExactMatch = $isCityLookup
                    ? collect($fastSuggestions)->first(
                        fn($item) => strcasecmp(trim((string) ($item['city'] ?? '')), $cityPrefix) === 0
                    )
                    : collect($fastSuggestions)->first(
                        fn($item) => trim((string) ($item['postalCode'] ?? '')) === $postalCodePrefix
                    );
                $fastCities = collect($fastSuggestions)
                    ->map(fn($item) => trim((string) ($item['city'] ?? '')))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                return response()->json([
                    'city' => $isCityLookup
                        ? (is_array($fastExactMatch) ? ($fastExactMatch['city'] ?? $cityPrefix) : $cityPrefix)
                        : (is_array($fastExactMatch) ? ($fastExactMatch['city'] ?? null) : null),
                    'cities' => $fastCities,
                    'suggestions' => collect($fastSuggestions)->values()->take($limit)->all(),
                    'meta' => [
                        'postalCode' => $postalCodePrefix !== '' ? $postalCodePrefix : null,
                        'city' => $cityPrefix !== '' ? $cityPrefix : null,
                        'country' => $countryCode,
                        'count' => count($fastSuggestions),
                        'exactMatch' => is_array($fastExactMatch),
                        'queryType' => $isCityLookup ? 'city' : 'postalCode',
                        'source' => 'opendatasoft-geonames-fast',
                    ],
                ]);
            }
        }

        $apiKey = trim((string) config('services.zipcodebase.api_key'));
        if ($apiKey === '') {
            return response()->json([
                'message' => 'Postal/city lookup service is not configured.',
                'city' => null,
                'cities' => [],
            ], 503);
        }

        $baseUrl = rtrim((string) config('services.zipcodebase.base_url', 'https://app.zipcodebase.com/api/v1'), '/');
        $configuredTimeout = (int) config('services.zipcodebase.timeout', 10);
        $timeoutSeconds = max(2, min($configuredTimeout, 5));

        try {
            $matchedQuery = $queryCandidates[0];
            $suggestions = [];
            $hadSuccessfulResponse = false;
            $lastErrorStatus = null;

            foreach ($queryCandidates as $candidate) {
                $query = $isCityLookup
                    ? [
                        'city' => $candidate,
                        'country' => $countryCode,
                        'limit' => $limit,
                        'apikey' => $apiKey,
                    ]
                    : [
                        'codes' => $candidate,
                        'country' => $countryCode,
                        'apikey' => $apiKey,
                    ];

                $response = Http::acceptJson()
                    ->timeout($timeoutSeconds)
                    ->withHeaders(['apikey' => $apiKey])
                    ->get($baseUrl . ($isCityLookup ? '/code/city' : '/search'), $query);

                if (!$response->successful()) {
                    $lastErrorStatus = $response->status();
                    continue;
                }

                $hadSuccessfulResponse = true;

                if ($isCityLookup) {
                    $postalCodes = $this->extractPostalCodesFromLookupResponse($response->json());

                    $candidateSuggestions = collect($postalCodes)
                        ->map(function ($postalCode) use ($candidate) {
                            return [
                                'postalCode' => trim((string) $postalCode),
                                'city' => $candidate,
                            ];
                        })
                        ->filter(fn($item) => $item['postalCode'] !== '' && $item['city'] !== '')
                        ->unique(fn($item) => strtolower((string) $item['postalCode']) . '|' . strtolower((string) $item['city']))
                        ->values()
                        ->all();
                } else {
                    $candidateSuggestions = $this->extractPostalCitySuggestionsFromLookupResponse(
                        $response->json(),
                        $query['codes'],
                        $query['country']
                    );
                }

                if (!empty($candidateSuggestions)) {
                    $matchedQuery = $candidate;
                    $suggestions = $candidateSuggestions;
                    break;
                }
            }

            if (!$hadSuccessfulResponse) {
                return response()->json([
                    'message' => 'City lookup failed.',
                    'city' => null,
                    'cities' => [],
                ], ($lastErrorStatus !== null && $lastErrorStatus >= 500) ? 502 : 422);
            }

            if (empty($suggestions)) {
                $fallbackSuggestions = $isCityLookup
                    ? $this->searchOpenDataPostalCitySuggestionsByCityPrefix($cityPrefix, $countryCode, $limit)
                    : $this->searchOpenDataPostalCitySuggestionsByPrefix($postalCodePrefix, $countryCode, $limit);

                if (!empty($fallbackSuggestions)) {
                    $fallbackExactMatch = $isCityLookup
                        ? collect($fallbackSuggestions)->first(
                            fn($item) => strcasecmp(trim((string) ($item['city'] ?? '')), $cityPrefix) === 0
                        )
                        : collect($fallbackSuggestions)->first(
                            fn($item) => trim((string) ($item['postalCode'] ?? '')) === $postalCodePrefix
                        );
                    $fallbackCities = collect($fallbackSuggestions)
                        ->map(fn($item) => trim((string) ($item['city'] ?? '')))
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();

                    return response()->json([
                        'city' => $isCityLookup
                            ? (is_array($fallbackExactMatch) ? ($fallbackExactMatch['city'] ?? $cityPrefix) : $cityPrefix)
                            : (is_array($fallbackExactMatch) ? ($fallbackExactMatch['city'] ?? null) : null),
                        'cities' => $fallbackCities,
                        'suggestions' => collect($fallbackSuggestions)->values()->take($limit)->all(),
                        'meta' => [
                            'postalCode' => $postalCodePrefix !== '' ? $postalCodePrefix : null,
                            'city' => $cityPrefix !== '' ? $cityPrefix : null,
                            'country' => $countryCode,
                            'count' => count($fallbackSuggestions),
                            'exactMatch' => is_array($fallbackExactMatch),
                            'queryType' => $isCityLookup ? 'city' : 'postalCode',
                            'source' => 'opendatasoft-geonames',
                        ],
                    ]);
                }
            }

            $suggestions = collect($suggestions)
                ->values()
                ->take($limit)
                ->all();

            $exactMatch = $isCityLookup
                ? collect($suggestions)->first(
                    fn($item) => strcasecmp(trim((string) ($item['city'] ?? '')), $cityPrefix) === 0
                )
                : collect($suggestions)->first(
                    fn($item) => trim((string) ($item['postalCode'] ?? '')) === $postalCodePrefix
                );
            $cities = collect($suggestions)
                ->map(fn($item) => trim((string) ($item['city'] ?? '')))
                ->filter()
                ->unique()
                ->values()
                ->all();

            return response()->json([
                'city' => $isCityLookup
                    ? ($cityPrefix !== '' ? $cityPrefix : null)
                    : (is_array($exactMatch) ? ($exactMatch['city'] ?? null) : null),
                'cities' => $cities,
                'suggestions' => $suggestions,
                'meta' => [
                    'postalCode' => $postalCodePrefix !== '' ? $postalCodePrefix : null,
                    'city' => $cityPrefix !== '' ? $cityPrefix : null,
                    'country' => $countryCode,
                    'count' => count($suggestions),
                    'exactMatch' => is_array($exactMatch),
                    'queryType' => $isCityLookup ? 'city' : 'postalCode',
                    'source' => 'zipcodebase',
                    'matchedQuery' => $matchedQuery,
                ],
            ]);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'City lookup is temporarily unavailable.',
                'city' => null,
                'cities' => [],
            ], 502);
        }
    }

    private function searchOpenDataPostalCitySuggestionsByPrefix(string $postalCodePrefix, string $countryCode, int $limit): array
    {
        $prefix = trim($postalCodePrefix);
        if ($prefix === '' || $limit < 1) {
            return [];
        }

        $country = strtoupper(trim($countryCode));
        if (strlen($country) !== 2) {
            return [];
        }

        $baseUrl = trim((string) config(
            'services.opendatasoft_geonames.base_url',
            'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-postal-code/records'
        ));
        if ($baseUrl === '') {
            return [];
        }

        $configuredTimeout = (int) config('services.opendatasoft_geonames.timeout', 8);
        $timeoutSeconds = max(2, min($configuredTimeout, 5));
        $normalizedPrefix = str_replace('"', '\\"', $prefix);
        $where = 'country_code="' . $country . '" AND startswith(postal_code,"' . $normalizedPrefix . '")';
        $requestLimit = min(max($limit, 1) * 2, 60);
        $cacheKey = 'courier:postal-prefix:opendatasoft:v3:'
            . strtolower($country)
            . ':' . strtolower($normalizedPrefix)
            . ':' . max($limit, 1);

        $cachedResults = Cache::get($cacheKey);
        $results = is_array($cachedResults) && !empty($cachedResults)
            ? $cachedResults
            : [];

        if (empty($results)) {
            try {
                $response = Http::acceptJson()
                    ->timeout($timeoutSeconds)
                    ->get(rtrim($baseUrl, '/'), [
                        'select' => 'country_code,postal_code,place_name',
                        'where' => $where,
                        'order_by' => 'postal_code',
                        'limit' => $requestLimit,
                    ]);

                if ($response->successful()) {
                    $payload = $response->json();
                    $results = is_array($payload['results'] ?? null)
                        ? $payload['results']
                        : [];

                    if (!empty($results)) {
                        Cache::put($cacheKey, $results, now()->addMinutes(30));
                    }
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return collect($results)
            ->filter(fn($item) => is_array($item))
            ->map(function (array $item) {
                return [
                    'postalCode' => trim((string) ($item['postal_code'] ?? '')),
                    'city' => trim((string) ($item['place_name'] ?? '')),
                ];
            })
            ->filter(fn($item) => $item['postalCode'] !== '' && $item['city'] !== '')
            ->unique(fn($item) => strtolower($item['postalCode']) . '|' . strtolower($item['city']))
            ->values()
            ->take($limit)
            ->all();
    }

    private function searchOpenDataPostalCitySuggestionsByCityPrefix(string $cityPrefix, string $countryCode, int $limit): array
    {
        $prefix = trim($cityPrefix);
        if ($prefix === '' || $limit < 1) {
            return [];
        }

        $country = strtoupper(trim($countryCode));
        if (strlen($country) !== 2) {
            return [];
        }

        $baseUrl = trim((string) config(
            'services.opendatasoft_geonames.base_url',
            'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-postal-code/records'
        ));
        if ($baseUrl === '') {
            return [];
        }

        $configuredTimeout = (int) config('services.opendatasoft_geonames.timeout', 8);
        $timeoutSeconds = max(2, min($configuredTimeout, 5));
        $escapedPrefix = str_replace('"', '\\"', $prefix);
        $coarsePrefix = strlen($escapedPrefix) > 3
            ? substr($escapedPrefix, 0, 3)
            : $escapedPrefix;
        $requestLimit = min(max($limit, 1) * 3, 80);
        $prefixVariants = collect([
            $escapedPrefix,
            ucfirst(strtolower($escapedPrefix)),
            strtoupper($escapedPrefix),
            $coarsePrefix,
            ucfirst(strtolower($coarsePrefix)),
            strtoupper($coarsePrefix),
        ])
            ->filter(fn($value) => trim((string) $value) !== '')
            ->unique()
            ->values();

        $startsWithConditions = $prefixVariants
            ->map(fn($variant) => 'startswith(place_name,"' . $variant . '")')
            ->implode(' OR ');

        if ($startsWithConditions === '') {
            return [];
        }

        $where = 'country_code="' . $country . '" AND (' . $startsWithConditions . ')';
        $cacheKey = 'courier:city-prefix:opendatasoft:v3:'
            . strtolower($country)
            . ':' . strtolower($prefix)
            . ':' . max($limit, 1);

        $cachedResults = Cache::get($cacheKey);
        $results = is_array($cachedResults) && !empty($cachedResults)
            ? $cachedResults
            : [];

        if (empty($results)) {
            try {
                $queryVariants = [
                    [
                        'select' => 'country_code,postal_code,place_name',
                        'where' => $where,
                        'order_by' => 'place_name,postal_code',
                        'limit' => $requestLimit,
                    ],
                    [
                        'select' => 'country_code,postal_code,place_name',
                        'where' => 'country_code="' . $country . '"',
                        'search' => $prefix,
                        'order_by' => 'place_name,postal_code',
                        'limit' => $requestLimit,
                    ],
                ];

                foreach ($queryVariants as $query) {
                    $response = Http::acceptJson()
                        ->timeout($timeoutSeconds)
                        ->get(rtrim($baseUrl, '/'), $query);

                    if (!$response->successful()) {
                        continue;
                    }

                    $payload = $response->json();
                    $candidateResults = is_array($payload['results'] ?? null)
                        ? $payload['results']
                        : [];

                    if (!empty($candidateResults)) {
                        $results = $candidateResults;
                        break;
                    }
                }

                if (!empty($results)) {
                    Cache::put($cacheKey, $results, now()->addMinutes(30));
                }
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $normalizedPrefix = strtolower($prefix);
        $normalizedCoarsePrefix = strlen($normalizedPrefix) > 3
            ? substr($normalizedPrefix, 0, 3)
            : $normalizedPrefix;

        return collect($results)
            ->filter(fn($item) => is_array($item))
            ->map(function (array $item) {
                return [
                    'postalCode' => trim((string) ($item['postal_code'] ?? '')),
                    'city' => trim((string) ($item['place_name'] ?? '')),
                ];
            })
            ->filter(fn($item) => $item['postalCode'] !== '' && $item['city'] !== '')
            ->filter(function (array $item) use ($normalizedPrefix, $normalizedCoarsePrefix) {
                $city = strtolower((string) ($item['city'] ?? ''));

                if (str_starts_with($city, $normalizedPrefix) || str_contains($city, $normalizedPrefix)) {
                    return true;
                }

                if ($normalizedCoarsePrefix === '') {
                    return false;
                }

                return str_starts_with($city, $normalizedCoarsePrefix)
                    || str_contains($city, $normalizedCoarsePrefix);
            })
            ->sortBy(function (array $item) use ($normalizedPrefix, $normalizedCoarsePrefix) {
                $city = strtolower((string) ($item['city'] ?? ''));

                $rank = '3';
                if (str_starts_with($city, $normalizedPrefix)) {
                    $rank = '0';
                } elseif (str_contains($city, $normalizedPrefix)) {
                    $rank = '1';
                } elseif (
                    $normalizedCoarsePrefix !== ''
                    && (str_starts_with($city, $normalizedCoarsePrefix) || str_contains($city, $normalizedCoarsePrefix))
                ) {
                    $rank = '2';
                }

                return $rank . '|' . $city . '|' . strtolower((string) $item['postalCode']);
            })
            ->unique(fn($item) => strtolower((string) $item['postalCode']) . '|' . strtolower((string) $item['city']))
            ->values()
            ->take($limit)
            ->all();
    }

    private function extractPostalCitySuggestionsFromLookupResponse($payload, string $postalCodePrefix, string $country): array
    {
        if (!is_array($payload) || !is_array($payload['results'] ?? null)) {
            return [];
        }

        $normalizedPostalCodePrefix = trim($postalCodePrefix);
        $normalizedCountry = strtoupper(trim($country));
        $results = $payload['results'];

        return collect($results)
            ->flatMap(function ($items, $code) {
                if (!is_array($items)) {
                    return [];
                }

                return collect($items)
                    ->filter(fn($entry) => is_array($entry))
                    ->map(function (array $entry) use ($code) {
                        if (trim((string) ($entry['postal_code'] ?? '')) === '') {
                            $entry['postal_code'] = is_scalar($code) ? (string) $code : '';
                        }

                        return $entry;
                    })
                    ->all();
            })
            ->filter(fn($entry) => is_array($entry))
            ->filter(function (array $entry) use ($normalizedCountry) {
                $entryCountry = strtoupper(trim((string) ($entry['country_code'] ?? '')));

                return $entryCountry === '' || $entryCountry === $normalizedCountry;
            })
            ->map(function (array $entry) {
                $postalCode = trim((string) ($entry['postal_code'] ?? ''));
                $city = trim((string) ($entry['city'] ?? ''));

                if ($city === '') {
                    $city = trim((string) ($entry['city_en'] ?? ''));
                }

                return [
                    'postalCode' => $postalCode,
                    'city' => $city,
                ];
            })
            ->filter(function ($entry) {
                return is_array($entry)
                    && trim((string) ($entry['postalCode'] ?? '')) !== ''
                    && trim((string) ($entry['city'] ?? '')) !== '';
            })
            ->filter(function (array $entry) use ($normalizedPostalCodePrefix) {
                if ($normalizedPostalCodePrefix === '') {
                    return true;
                }

                return str_starts_with((string) $entry['postalCode'], $normalizedPostalCodePrefix);
            })
            ->unique(fn($entry) => strtolower((string) $entry['postalCode']) . '|' . strtolower((string) $entry['city']))
            ->sortBy(fn($entry) => (string) ($entry['postalCode'] ?? ''))
            ->values()
            ->take(50)
            ->all();
    }

    private function searchLocalPostalCitySuggestions(string $postalCodePrefix, string $countryCode, int $limit): array
    {
        $prefix = trim($postalCodePrefix);
        if ($prefix === '' || $limit < 1) {
            return [];
        }

        $normalizedCountry = strtoupper(trim($countryCode));

        $rows = LocationCity::query()
            ->select(['location_cities.postcode', 'location_cities.name_en'])
            ->join('location_districts', 'location_districts.id', '=', 'location_cities.district_id')
            ->join('location_provinces', 'location_provinces.id', '=', 'location_districts.province_id')
            ->join('location_countries', 'location_countries.id', '=', 'location_provinces.country_id')
            ->whereNotNull('location_cities.postcode')
            ->where('location_countries.iso2', $normalizedCountry)
            ->where('location_cities.postcode', 'like', $prefix . '%')
            ->orderBy('location_cities.postcode')
            ->orderBy('location_cities.name_en')
            ->limit(max($limit, 1) * 3)
            ->get();

        return collect($rows)
            ->map(function ($row) {
                return [
                    'postalCode' => trim((string) ($row->postcode ?? '')),
                    'city' => trim((string) ($row->name_en ?? '')),
                ];
            })
            ->filter(fn($item) => $item['postalCode'] !== '' && $item['city'] !== '')
            ->unique(fn($item) => strtolower($item['postalCode']) . '|' . strtolower($item['city']))
            ->values()
            ->take($limit)
            ->all();
    }

    private function searchLocalPostalCitySuggestionsByCity(string $cityPrefix, string $countryCode, int $limit): array
    {
        $prefix = trim($cityPrefix);
        if ($prefix === '' || $limit < 1) {
            return [];
        }

        $normalizedCountry = strtoupper(trim($countryCode));

        $rows = LocationCity::query()
            ->select(['location_cities.postcode', 'location_cities.name_en', 'location_cities.sub_name_en'])
            ->join('location_districts', 'location_districts.id', '=', 'location_cities.district_id')
            ->join('location_provinces', 'location_provinces.id', '=', 'location_districts.province_id')
            ->join('location_countries', 'location_countries.id', '=', 'location_provinces.country_id')
            ->whereNotNull('location_cities.postcode')
            ->where('location_countries.iso2', $normalizedCountry)
            ->where(function ($query) use ($prefix) {
                $query->where('location_cities.name_en', 'like', $prefix . '%')
                    ->orWhere('location_cities.sub_name_en', 'like', $prefix . '%');
            })
            ->orderBy('location_cities.name_en')
            ->orderBy('location_cities.postcode')
            ->limit(max($limit, 1) * 3)
            ->get();

        return collect($rows)
            ->map(function ($row) {
                $city = trim((string) ($row->name_en ?? ''));
                if ($city === '') {
                    $city = trim((string) ($row->sub_name_en ?? ''));
                }

                return [
                    'postalCode' => trim((string) ($row->postcode ?? '')),
                    'city' => $city,
                ];
            })
            ->filter(fn($item) => $item['postalCode'] !== '' && $item['city'] !== '')
            ->unique(fn($item) => strtolower((string) $item['postalCode']) . '|' . strtolower((string) $item['city']))
            ->values()
            ->take($limit)
            ->all();
    }

    private function resolvePostalLookupCityCandidates(string $city): array
    {
        $normalizedCity = trim(preg_replace('/\s+/', ' ', $city));
        if ($normalizedCity === '') {
            return [];
        }

        $candidates = [$normalizedCity];

        return collect($candidates)
            ->map(fn($candidate) => trim((string) $candidate))
            ->filter()
            ->unique()
            ->values()
            ->take(5)
            ->all();
    }

    public function searchDomesticCities(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query   = trim((string) ($validated['q'] ?? ''));
        $limit   = (int) ($validated['limit'] ?? 20);

        if ($query === '' || mb_strlen($query) < 1) {
            return response()->json(['cities' => []]);
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('location_cities')) {
            return response()->json(['cities' => []]);
        }

        $rows = \Illuminate\Support\Facades\DB::table('location_cities')
            ->join('location_districts', 'location_districts.id', '=', 'location_cities.district_id')
            ->join('location_provinces', 'location_provinces.id', '=', 'location_districts.province_id')
            ->select([
                'location_cities.id',
                'location_cities.name_en',
                'location_cities.sub_name_en',
                'location_cities.postcode',
                'location_cities.district_id',
                'location_districts.name_en as district_name_en',
                'location_provinces.name_en as province_name_en',
            ])
            ->where(function ($builder) use ($query) {
                $builder->where('location_cities.name_en', 'like', $query . '%')
                    ->orWhere('location_cities.name_en', 'like', '% ' . $query . '%')
                    ->orWhere('location_cities.sub_name_en', 'like', $query . '%');
            })
            ->orderByRaw("CASE WHEN LOWER(location_cities.name_en) LIKE ? THEN 0 ELSE 1 END", [strtolower($query) . '%'])
            ->orderBy('location_cities.name_en')
            ->limit($limit)
            ->get();

        $cities = $rows->map(function ($row) {
            $subName = trim((string) ($row->sub_name_en ?? ''));
            $subName = ($subName === '' || strtoupper($subName) === 'NULL') ? '' : $subName;
            $displayName = $subName !== ''
                ? $row->name_en . ' - ' . $subName
                : $row->name_en;

            return [
                'id'          => (int) $row->id,
                'nameEn'      => (string) $row->name_en,
                'displayName' => $displayName,
                'postcode'    => $row->postcode,
                'districtId'  => (int) $row->district_id,
                'districtName' => (string) ($row->district_name_en ?? ''),
                'provinceName' => (string) ($row->province_name_en ?? ''),
            ];
        })->values()->all();

        return response()->json(['cities' => $cities]);
    }

    public function review(Request $request)
    {
        $payload = $request->validate([
            'sender' => ['nullable', 'array'],
            'sender.address' => ['nullable', 'array'],
            'recipient' => ['nullable', 'array'],
            'recipient.address' => ['nullable', 'array'],
            'shipment' => ['nullable', 'array'],
            'shipment.paymentOptions' => ['nullable', 'array'],
            'shipment.paymentOptions.all' => ['nullable', 'boolean'],
            'shipment.paymentOptions.cod' => ['nullable', 'boolean'],
            'shipment.paymentOptions.card' => ['nullable', 'boolean'],
            'shipment.requiresCardPayment' => ['nullable', 'boolean'],
            'shipment.codEnabled' => ['nullable', 'boolean'],
            'shipment.codPaymentMethod' => ['nullable', 'string', 'in:cash,card,check,bank_transfer'],
            'shipment.internationalDimensions' => ['nullable', 'array'],
            'shipment.internationalDimensions.unitType' => ['nullable', 'string', 'max:40'],
            'shipment.internationalDimensions.unitCount' => ['nullable', 'integer', 'min:1'],
            'shipment.internationalDimensions.routeClass' => ['nullable', 'string', 'max:50'],
            'shipment.internationalDimensions.handlingClass' => ['nullable', 'string', 'max:50'],
            'shipment.internationalDimensions.w2wMode' => ['nullable', 'string', 'max:40'],
            'shipment.shipmentType' => ['nullable', 'string', 'max:60'],
            'shipment.shipmentTypeDescription' => ['nullable', 'string', 'max:200'],
            'packages' => ['required', 'array', 'min:1'],
            'packages.*.label' => ['nullable', 'string', 'max:120'],
            'packages.*.packageType' => ['nullable', 'string', 'max:50'],
            'packages.*.courierProvider' => ['required', 'string', 'max:80'],
            'packages.*.serviceLevel' => ['required', 'string', 'max:80'],
            'packages.*.quantity' => ['required', 'integer', 'min:1'],
            'packages.*.weightKg' => ['required', 'numeric', 'min:0.1'],
            'packages.*.lengthCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.widthCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.heightCm' => ['nullable', 'numeric', 'min:0'],
            'packages.*.declaredValue' => ['nullable', 'numeric', 'min:0'],
            'packages.*.description' => ['nullable', 'string', 'max:500'],
            'reviewContext' => ['required', 'array'],
            'reviewContext.displayCurrency' => ['nullable', 'string', 'max:4'],
            'reviewContext.totalPriceUSD' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.discountPercent' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.discountAmountUSD' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.accountUserId' => ['nullable', 'integer', 'min:1'],
            'reviewContext.selectedQuotes' => ['required', 'array', 'min:1'],
            'reviewContext.selectedQuotes.*.packageIndex' => ['required', 'integer', 'min:0'],
            'reviewContext.selectedQuotes.*.providerId' => ['required', 'string', 'max:80'],
            'reviewContext.selectedQuotes.*.providerName' => ['required', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.serviceLevel' => ['required', 'string', 'max:80'],
            'reviewContext.selectedQuotes.*.serviceLabel' => ['required', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.eta' => ['nullable', 'string', 'max:120'],
            'reviewContext.selectedQuotes.*.description' => ['nullable', 'string'],
            'reviewContext.selectedQuotes.*.priceUSD' => ['required', 'numeric', 'min:0'],
            'reviewContext.selectedQuotes.*.weight' => ['nullable', 'numeric', 'min:0'],
            'reviewContext.selectedQuotes.*.billableWeight' => ['nullable', 'numeric', 'min:0'],
        ]);

        $defaults = [
            'sender' => [
                'name' => null,
                'email' => null,
                'phone' => null,
                'company' => null,
                'saveToFavorites' => false,
                'address' => [
                    'line1' => null,
                    'line2' => null,
                    'city' => null,
                    'state' => null,
                    'postalCode' => null,
                    'country' => null,
                    'instructions' => null,
                ],
            ],
            'recipient' => [
                'name' => null,
                'email' => null,
                'phone' => null,
                'company' => null,
                'saveToFavorites' => false,
                'address' => [
                    'line1' => null,
                    'line2' => null,
                    'city' => null,
                    'state' => null,
                    'postalCode' => null,
                    'country' => null,
                    'instructions' => null,
                ],
            ],
            'shipment' => [
                'pickupDate' => null,
                'pickupWindowStart' => null,
                'pickupWindowEnd' => null,
                'courierProvider' => null,
                'insurance' => false,
                'deliveryNotes' => null,
                'estimatedValue' => null,
                'paymentOptions' => [
                    'all' => false,
                    'cod' => false,
                    'card' => false,
                ],
                'codEnabled' => false,
                'codAmount' => null,
                'codPaymentMethod' => null,
                'distanceKm' => null,
                'shipmentType' => null,
                'shipmentTypeDescription' => null,
                'internationalDimensions' => [
                    'unitType' => null,
                    'unitCount' => 1,
                    'routeClass' => null,
                    'handlingClass' => null,
                    'w2wMode' => null,
                ],
            ],
        ];

        $normalized = array_replace_recursive($defaults, $payload);
        $normalized = $this->normalizeShipmentPreferencePayload($normalized);
        $normalized['reviewContext'] = is_array($normalized['reviewContext'] ?? null) ? $normalized['reviewContext'] : [];
        $normalized['reviewContext']['displayCurrency'] = $normalized['shipment']['currency'];
        $this->assertShipmentPaymentIntentPayload($normalized);

        $this->assertPayloadMatchesFlowRoute($normalized, $request);
        $request->session()->put('courier_preview', $normalized);

        return redirect()->to($this->resolveFlowRoute($request, 'details'));
    }

    public function details(Request $request)
    {
        $formData = $request->session()->get('courier_preview');

        if (!$this->hasCreateStepCourierPreviewPayload($formData)) {
            $this->observability()->logStoreFailed($request, 'details_view_without_valid_preview', [
                'phase' => 'details',
            ]);

            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Your booking session expired. Please start again.');
        }

        if ($this->previewMismatchesScopedFlow($formData, $request)) {
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Flow mismatch detected. Please restart the booking from this URL.');
        }

        $category = $this->hasFlowRouteContext($request)
            ? $this->resolveBookingFlow((string) $request->route('flow'))
            : $this->resolvePayloadCategory($formData);
        $serviceLevels = $this->serviceLevelLabelsForCategory($category);
        $packageTypes = ['document', 'parcel', 'freight', 'temperature_controlled'];
        $countries = $this->resolveSupportedCountryCodes();
        $favoriteRecipients = [];
        $favoriteSenders = [];
        $senderProfile = null;

        $user = Auth::user();
        if ($user) {
            $senderProfile = $this->buildSenderProfilePayload($user, $countries);
            $favoriteSenders = CourierContact::query()
                ->with(['addresses' => function ($query) {
                    $query->orderByDesc('is_primary')->orderBy('id');
                }])
                ->where('user_id', $user->id)
                ->where('role', CourierContact::ROLE_SENDER)
                ->where('is_favorite', true)
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function (CourierContact $contact) {
                    $address = $contact->addresses->first();

                    return [
                        'id' => $contact->id,
                        'name' => $contact->name,
                        'email' => $contact->email,
                        'phone' => $contact->phone,
                        'company' => $contact->company_name,
                        'address' => $address ? [
                            'line1' => $address->line1,
                            'line2' => $address->line2,
                            'city' => $address->city,
                            'state' => $address->state,
                            'postalCode' => $address->postal_code,
                            'country' => $address->country,
                            'instructions' => $address->instructions,
                        ] : null,
                    ];
                })
                ->values();
            $favoriteRecipients = CourierContact::query()
                ->with(['addresses' => function ($query) {
                    $query->orderByDesc('is_primary')->orderBy('id');
                }])
                ->where('user_id', $user->id)
                ->where('role', CourierContact::ROLE_RECIPIENT)
                ->where('is_favorite', true)
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function (CourierContact $contact) {
                    $address = $contact->addresses->first();

                    return [
                        'id' => $contact->id,
                        'name' => $contact->name,
                        'email' => $contact->email,
                        'phone' => $contact->phone,
                        'company' => $contact->company_name,
                        'address' => $address ? [
                            'line1' => $address->line1,
                            'line2' => $address->line2,
                            'city' => $address->city,
                            'state' => $address->state,
                            'postalCode' => $address->postal_code,
                            'country' => $address->country,
                            'instructions' => $address->instructions,
                        ] : null,
                    ];
                })
                ->values();
        }

        $this->observability()->logDetailsViewOpened($request, [
            'category' => $category,
            'package_count' => count((array) ($formData['packages'] ?? [])),
        ]);

        return Inertia::render($this->resolveFlowPageComponent($request, 'Details'), [
            'formData' => $formData,
            'serviceLevels' => $serviceLevels,
            'packageTypes' => $packageTypes,
            'countries' => $countries,
            'favoriteRecipients' => $favoriteRecipients,
            'favoriteSenders' => $favoriteSenders,
            'senderProfile' => $senderProfile,
            'bookingFlow' => $this->hasFlowRouteContext($request)
                ? $this->resolveBookingFlow((string) $request->route('flow'))
                : null,
            'flowRoutes' => $this->resolveBookingFlowRoutes($request),
        ]);
    }

    private function buildSenderProfilePayload(User $user, array $countries): array
    {
        $user->loadMissing('vendorProfile');

        $isBusiness = $user->vendor_type === 'business';
        $vendorProfile = $isBusiness ? $user->vendorProfile : null;

        $nameParts = array_filter([$user->first_name, $user->last_name]);
        $fallbackName = $nameParts ? trim(implode(' ', $nameParts)) : (string) $user->name;

        $name = $isBusiness
            ? (string) ($vendorProfile?->contact_person ?: $fallbackName)
            : $fallbackName;
        $email = $isBusiness
            ? (string) ($vendorProfile?->contact_email ?: $user->email)
            : (string) $user->email;
        $phone = $isBusiness
            ? (string) ($vendorProfile?->contact_phone ?: $user->phone)
            : (string) $user->phone;
        $company = $isBusiness
            ? (string) ($vendorProfile?->company_name ?: $user->name)
            : '';

        $addressLine1 = $vendorProfile?->address_line1 ?: $user->address_line1;
        $addressLine2 = $vendorProfile?->address_line2 ?: $user->address_line2;
        $city = $vendorProfile?->city ?: $user->city;
        $state = $vendorProfile?->state ?: $user->state;
        $postalCode = $vendorProfile?->postal_code ?: $user->postal_code;
        $country = strtoupper((string) ($vendorProfile?->country ?: $user->country ?: ($countries[0] ?? '')));

        return [
            'label' => $isBusiness ? 'Same as company profile' : 'Same as profile',
            'isBusiness' => $isBusiness,
            'sender' => [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'company' => $company,
                'address' => [
                    'line1' => (string) ($addressLine1 ?? ''),
                    'line2' => (string) ($addressLine2 ?? ''),
                    'city' => (string) ($city ?? ''),
                    'state' => (string) ($state ?? ''),
                    'postalCode' => (string) ($postalCode ?? ''),
                    'country' => $country,
                    'instructions' => null,
                ],
            ],
        ];
    }

    private function resolveInternationalDimensionOptionsForPayload(array $payload, string $category): array
    {
        $shipment = new CourierShipment();
        $shipment->setRelation('senderAddress', (object) [
            'country' => strtoupper((string) ($payload['sender']['address']['country'] ?? '')),
        ]);
        $shipment->setRelation('recipientAddress', (object) [
            'country' => strtoupper((string) ($payload['recipient']['address']['country'] ?? '')),
        ]);

        $assignmentService = app(CourierVendorAssignmentService::class);
        $assignment = $assignmentService->determineAssignment($shipment);
        $vendorId = (int) ($assignment['assigned_vendor_user_id'] ?? 0);

        $pricingConfig = $this->resolveCategoryPricingConfigForVendor($vendorId, $category);
        $policyModules = is_array($pricingConfig['policyModules'] ?? null) ? $pricingConfig['policyModules'] : [];
        $engine = is_array($policyModules['internationalDimensionsEngine'] ?? null)
            ? $policyModules['internationalDimensionsEngine']
            : [];
        $w2wOption = is_array($engine['w2wOption'] ?? null) ? $engine['w2wOption'] : [];

        return [
            'unitTypes' => array_values(array_filter(array_keys(is_array($engine['unitTypeMultipliers'] ?? null) ? $engine['unitTypeMultipliers'] : []))),
            'routeClasses' => array_values(array_filter(array_keys(is_array($engine['routeClassMultipliers'] ?? null) ? $engine['routeClassMultipliers'] : []))),
            'handlingClasses' => array_values(array_filter(array_keys(is_array($engine['handlingClassMultipliers'] ?? null) ? $engine['handlingClassMultipliers'] : []))),
            'w2wModes' => array_values(array_filter(array_keys(is_array($w2wOption['modeMultipliers'] ?? null) ? $w2wOption['modeMultipliers'] : []))),
        ];
    }

    public function storeDetails(Request $request)
    {
        $existing = $request->session()->get('courier_preview');

        if (!$this->hasCreateStepCourierPreviewPayload($existing)) {
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Your booking session expired. Please start again.');
        }

        if ($this->previewMismatchesScopedFlow($existing, $request)) {
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Flow mismatch detected. Please restart the booking from this URL.');
        }

        $reviewContextInput = null;
        $category = $this->hasFlowRouteContext($request)
            ? $this->resolveBookingFlow((string) $request->route('flow'))
            : $this->resolvePayloadCategory($existing);
        $allowedServiceLevels = $this->serviceLevelLabelsForCategory($category);

        $validated = $request->validate(
            [
                'sender.name' => ['required', 'string', 'max:120'],
                'sender.email' => ['nullable', 'email', 'max:150'],
                'sender.phone' => ['nullable', 'string', 'max:40'],
                'sender.company' => ['nullable', 'string', 'max:120'],
                'sender.saveToFavorites' => ['nullable', 'boolean'],
                'sender.address.line1' => ['required', 'string', 'max:180'],
                'sender.address.line2' => ['nullable', 'string', 'max:180'],
                'sender.address.city' => ['required', 'string', 'max:120'],
                'sender.address.state' => ['nullable', 'string', 'max:120'],
                'sender.address.postalCode' => ['nullable', 'string', 'max:30'],
                'sender.address.country' => ['required', 'string', 'size:2'],
                'sender.address.instructions' => ['nullable', 'string', 'max:500'],

                'recipient.name' => ['required', 'string', 'max:120'],
                'recipient.email' => ['nullable', 'email', 'max:150'],
                'recipient.phone' => ['nullable', 'string', 'max:40'],
                'recipient.company' => ['nullable', 'string', 'max:120'],
                'recipient.saveToFavorites' => ['nullable', 'boolean'],
                'recipient.address.line1' => ['required', 'string', 'max:180'],
                'recipient.address.line2' => ['nullable', 'string', 'max:180'],
                'recipient.address.city' => ['required', 'string', 'max:120'],
                'recipient.address.state' => ['nullable', 'string', 'max:120'],
                'recipient.address.postalCode' => ['nullable', 'string', 'max:30'],
                'recipient.address.country' => ['required', 'string', 'size:2'],
                'recipient.address.instructions' => ['nullable', 'string', 'max:500'],

                'shipment.pickupDate' => ['nullable', 'date', 'after_or_equal:today'],
                'shipment.pickupWindowStart' => ['nullable', 'date_format:H:i'],
                'shipment.pickupWindowEnd' => ['nullable', 'date_format:H:i'],
                'shipment.serviceLevel' => ['nullable', 'string', 'max:50'],
                'shipment.currency' => ['nullable', 'string', 'size:3'],
                'shipment.insurance' => ['nullable', 'boolean'],
                'shipment.deliveryNotes' => ['nullable', 'string', 'max:1000'],
                'shipment.estimatedValue' => [
                    \Illuminate\Validation\Rule::requiredIf(function () {
                        return request()->input('shipment.insurance') || request()->input('shipment.codEnabled');
                    }),
                    'nullable',
                    'numeric',
                    'min:0'
                ],
                'shipment.paymentOptions' => ['nullable', 'array'],
                'shipment.paymentOptions.all' => ['nullable', 'boolean'],
                'shipment.paymentOptions.cod' => ['nullable', 'boolean'],
                'shipment.paymentOptions.card' => ['nullable', 'boolean'],
                'shipment.requiresCardPayment' => ['nullable', 'boolean'],
                'shipment.codEnabled' => ['nullable', 'boolean'],
                'shipment.codPaymentMethod' => ['nullable', 'string', 'in:cash,card,check,bank_transfer'],
                'shipment.distanceKm' => ['nullable', 'numeric', 'min:0.1'],
                'shipment.internationalDimensions' => ['nullable', 'array'],
                'shipment.internationalDimensions.unitType' => ['nullable', 'string', 'max:40'],
                'shipment.internationalDimensions.unitCount' => ['nullable', 'integer', 'min:1'],
                'shipment.internationalDimensions.routeClass' => ['nullable', 'string', 'max:50'],
                'shipment.internationalDimensions.handlingClass' => ['nullable', 'string', 'max:50'],
                'shipment.internationalDimensions.w2wMode' => ['nullable', 'string', 'max:40'],
                'packages' => ['required', 'array', 'min:1'],
                'packages.*.label' => ['nullable', 'string', 'max:120'],
                'packages.*.packageType' => ['nullable', 'string', 'max:50'],
                'packages.*.courierProvider' => ['required', 'string', 'max:80'],
                'packages.*.serviceLevel' => ['required', 'string', 'max:80'],
                'packages.*.quantity' => ['required', 'integer', 'min:1'],
                'packages.*.weightKg' => ['required', 'numeric', 'min:0.1'],
                'packages.*.lengthCm' => ['nullable', 'numeric', 'min:0'],
                'packages.*.widthCm' => ['nullable', 'numeric', 'min:0'],
                'packages.*.heightCm' => ['nullable', 'numeric', 'min:0'],
                'packages.*.declaredValue' => ['nullable', 'numeric', 'min:0'],
                'packages.*.description' => ['nullable', 'string', 'max:500'],
                'reviewContext' => ['nullable', 'array'],
                'reviewContext.displayCurrency' => ['nullable', 'string', 'max:4'],
                'reviewContext.totalPriceUSD' => ['nullable', 'numeric', 'min:0'],
                'reviewContext.discountPercent' => ['nullable', 'numeric', 'min:0'],
                'reviewContext.discountAmountUSD' => ['nullable', 'numeric', 'min:0'],
                'reviewContext.accountUserId' => ['nullable', 'integer', 'min:1'],
                'reviewContext.selectedQuotes' => ['nullable', 'array'],
                'reviewContext.selectedQuotes.*.packageIndex' => ['required_with:reviewContext.selectedQuotes', 'integer', 'min:0'],
                'reviewContext.selectedQuotes.*.providerId' => ['required_with:reviewContext.selectedQuotes', 'string', 'max:80'],
                'reviewContext.selectedQuotes.*.providerName' => ['required_with:reviewContext.selectedQuotes', 'string', 'max:120'],
                'reviewContext.selectedQuotes.*.serviceLevel' => ['required_with:reviewContext.selectedQuotes', 'string', 'max:80'],
                'reviewContext.selectedQuotes.*.serviceLabel' => ['required_with:reviewContext.selectedQuotes', 'string', 'max:120'],
                'reviewContext.selectedQuotes.*.eta' => ['nullable', 'string', 'max:120'],
                'reviewContext.selectedQuotes.*.description' => ['nullable', 'string'],
                'reviewContext.selectedQuotes.*.priceUSD' => ['required_with:reviewContext.selectedQuotes', 'numeric', 'min:0'],
                'reviewContext.selectedQuotes.*.weight' => ['nullable', 'numeric', 'min:0'],
                'reviewContext.selectedQuotes.*.billableWeight' => ['nullable', 'numeric', 'min:0'],
            ],
            [],
            [
                'sender.address.line1' => 'sender address line 1',
                'recipient.address.line1' => 'recipient address line 1',
                'shipment.pickupDate' => 'pickup date',
            ]
        );

        $packagesInput = $validated['packages'] ?? [];
        $reviewContextInput = $validated['reviewContext'] ?? null;

        unset($validated['packages'], $validated['reviewContext']);

        $normalized = array_replace_recursive($existing, $validated);

        if (!empty($packagesInput)) {
            $normalized['packages'] = [];
            foreach ($packagesInput as $index => $package) {
                $existingPackage = $existing['packages'][$index] ?? [];
                $normalized['packages'][$index] = array_replace($existingPackage, $package);
            }
            $normalized['packages'] = array_values($normalized['packages']);
        }

        $normalized['sender']['address']['country'] = strtoupper($normalized['sender']['address']['country'] ?? '');
        $normalized['recipient']['address']['country'] = strtoupper($normalized['recipient']['address']['country'] ?? '');
        $normalized['shipment']['insurance'] = (bool) ($normalized['shipment']['insurance'] ?? false);
        $normalized['sender']['saveToFavorites'] = (bool) ($normalized['sender']['saveToFavorites'] ?? false);
        $normalized['recipient']['saveToFavorites'] = (bool) ($normalized['recipient']['saveToFavorites'] ?? false);

        if ($reviewContextInput !== null) {
            $normalized['reviewContext'] = array_replace(
                $normalized['reviewContext'] ?? [],
                $reviewContextInput
            );
        } elseif (!isset($normalized['reviewContext'])) {
            $normalized['reviewContext'] = $existing['reviewContext'] ?? [];
        }

        $normalized['reviewContext'] = $normalized['reviewContext'] ?? [];

        $selectedQuotesInput = $normalized['reviewContext']['selectedQuotes'] ?? [];
        $normalizedSelectedQuotes = [];

        foreach ($selectedQuotesInput as $index => $quote) {
            $packageIndex = array_key_exists('packageIndex', $quote)
                ? (int) $quote['packageIndex']
                : $index;

            $normalizedSelectedQuotes[] = [
                'packageIndex' => $packageIndex,
                'label' => $quote['label'] ?? ('Package ' . ($packageIndex + 1)),
                'weight' => isset($quote['weight']) ? (float) $quote['weight'] : null,
                'billableWeight' => isset($quote['billableWeight']) ? (float) $quote['billableWeight'] : null,
                'providerId' => $quote['providerId'] ?? null,
                'providerName' => $quote['providerName'] ?? null,
                'serviceLevel' => $quote['serviceLevel'] ?? null,
                'serviceLabel' => $quote['serviceLabel'] ?? null,
                'eta' => $quote['eta'] ?? null,
                'description' => $quote['description'] ?? null,
                'priceUSD' => isset($quote['priceUSD']) ? (float) $quote['priceUSD'] : 0.0,
            ];
        }

        $normalized['reviewContext']['selectedQuotes'] = $normalizedSelectedQuotes;
        $normalized['reviewContext']['displayCurrency'] = strtoupper((string) ($normalized['reviewContext']['displayCurrency'] ?? 'LKR'));
        $normalized = $this->normalizeShipmentPreferencePayload($normalized, $allowedServiceLevels);
        $this->assertShipmentPaymentIntentPayload($normalized);
        $this->assertShipmentCodRequestPayload($normalized);
        $normalized['reviewContext']['displayCurrency'] = $normalized['shipment']['currency'];
        $normalized['reviewContext']['totalPriceUSD'] = array_reduce(
            $normalizedSelectedQuotes,
            static fn($carry, $quote) => $carry + ($quote['priceUSD'] ?? 0),
            0.0
        );
        $normalized['reviewContext']['accountUserId'] = (int) (
            $normalized['reviewContext']['accountUserId']
            ?? ($existing['reviewContext']['accountUserId'] ?? Auth::id())
        );

        $this->assertPayloadMatchesFlowRoute($normalized, $request);
        $request->session()->put('courier_preview', $normalized);

        return redirect()->to($this->resolveFlowRoute($request, 'summary'));
    }

    public function summary(Request $request)
    {
        $formData = $request->session()->get('courier_preview');

        if (!$this->hasValidCourierPreviewPayload($formData)) {
            $this->observability()->logStoreFailed($request, 'summary_view_without_valid_preview', [
                'phase' => 'summary',
            ]);
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Your booking session expired. Please start again.');
        }

        if ($this->previewMismatchesScopedFlow($formData, $request)) {
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Flow mismatch detected. Please restart the booking from this URL.');
        }

        $pricingPreview = $this->buildSummaryPricingPreview((array) $formData, $request);

        return Inertia::render($this->resolveFlowPageComponent($request, 'Summary'), [
            'formData' => $formData,
            'pricingPreview' => $pricingPreview,
            'bookingFlow' => $this->hasFlowRouteContext($request)
                ? $this->resolveBookingFlow((string) $request->route('flow'))
                : null,
            'flowRoutes' => $this->resolveBookingFlowRoutes($request),
        ]);
    }

    private function buildSummaryPricingPreview(array $formData, ?Request $request = null): array
    {
        $selectedQuotes = collect($formData['reviewContext']['selectedQuotes'] ?? []);
        $fallbackEstimatedUsd = (float) ($formData['reviewContext']['totalPriceUSD'] ?? 0);
        if ($fallbackEstimatedUsd <= 0) {
            $fallbackEstimatedUsd = (float) $selectedQuotes->reduce(
                fn($carry, $quote) => $carry + (float) ($quote['priceUSD'] ?? 0),
                0.0
            );
        }

        $shipment = new CourierShipment();
        $shipment->setRelation('senderAddress', (object) [
            'country' => strtoupper((string) ($formData['sender']['address']['country'] ?? '')),
        ]);
        $shipment->setRelation('recipientAddress', (object) [
            'country' => strtoupper((string) ($formData['recipient']['address']['country'] ?? '')),
        ]);

        $assignmentService = app(CourierVendorAssignmentService::class);
        $assignment = $assignmentService->determineAssignment($shipment);

        $shipment->assignment_category = (string) ($assignment['assignment_category'] ?? $this->resolvePayloadCategory($formData));
        $shipment->assignment_status = (string) ($assignment['assignment_status'] ?? 'unassigned');
        $shipment->assigned_vendor_user_id = $assignment['assigned_vendor_user_id'] ?? null;
        $shipment->assigned_vendor_registration_id = $assignment['assigned_vendor_registration_id'] ?? null;

        $pricingExplanation = null;
        try {
            $enforcedEstimatedUsd = $this->resolveEstimatedCostWithLaneMatrix($shipment, $formData, $fallbackEstimatedUsd, $pricingExplanation);
        } catch (ValidationException $exception) {
            $message = (string) collect($exception->errors())
                ->flatten()
                ->first();

            if ($request) {
                $this->observability()->reportPricingException(
                    $request,
                    'summary_preview',
                    $message !== '' ? $message : $exception->getMessage(),
                    [
                        'category' => (string) ($shipment->assignment_category ?: $this->resolvePayloadCategory($formData)),
                        'assigned_vendor_user_id' => (int) ($shipment->assigned_vendor_user_id ?? 0),
                        'package_count' => count((array) ($formData['packages'] ?? [])),
                    ]
                );
            }

            return [
                'mode' => 'lane_matrix_unmatched',
                'reason' => $message !== '' ? $message : 'No active lane pricing rule found for the selected shipment details.',
                'distanceKm' => $formData['shipment']['distanceKm'] ?? null,
                'matchedRule' => null,
                'totalEstimatedUsd' => round(max(0, $fallbackEstimatedUsd), 2),
                'assignment' => [
                    'category' => $shipment->assignment_category,
                    'status' => $shipment->assignment_status,
                    'vendorUserId' => $shipment->assigned_vendor_user_id,
                ],
            ];
        }

        $pricingExplanation = is_array($pricingExplanation) ? $pricingExplanation : [];
        $pricingExplanation['totalEstimatedUsd'] = round(max(0, (float) $enforcedEstimatedUsd), 2);
        $pricingExplanation['assignment'] = [
            'category' => $shipment->assignment_category,
            'status' => $shipment->assignment_status,
            'vendorUserId' => $shipment->assigned_vendor_user_id,
        ];

        return $pricingExplanation;
    }

    public function store(StoreCourierShipmentRequest $request)
    {
        $payload = $request->validated();
        $preview = $request->session()->get('courier_preview');

        $this->observability()->logStoreAttempt($request, [
            'package_count' => count((array) ($payload['packages'] ?? [])),
            'selected_quote_count' => count((array) ($payload['reviewContext']['selectedQuotes'] ?? [])),
            'category' => $this->resolvePayloadCategory($payload),
        ]);

        if (!$this->hasValidCourierPreviewPayload($preview)) {
            $this->observability()->logStoreFailed($request, 'store_without_valid_preview', [
                'phase' => 'store',
            ]);

            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Your booking session expired. Please start again.');
        }

        if ($this->previewMismatchesScopedFlow($preview, $request)) {
            $request->session()->forget('courier_preview');

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Flow mismatch detected. Please restart the booking from this URL.');
        }

        if (!$this->flowPayloadMatchesSessionPreview((array) $preview, $payload)) {
            $this->observability()->logStoreFailed($request, 'store_preview_tamper_detected', [
                'phase' => 'store',
            ]);

            return redirect()
                ->to($this->resolveFlowRoute($request, 'summary'))
                ->with('error', 'Your booking details changed. Please review and submit again.');
        }

        // Persist from validated payload merged over session preview to prevent partial-session drift.
        $payload = array_replace_recursive((array) $preview, $payload);

        $assignmentService = app(CourierVendorAssignmentService::class);
        $reviewContext = is_array($request->input('reviewContext', []))
            ? $request->input('reviewContext', [])
            : [];
        $reviewContext['accountUserId'] = (int) ($reviewContext['accountUserId'] ?? Auth::id());
        $payload['reviewContext'] = array_replace(
            is_array($payload['reviewContext'] ?? null) ? $payload['reviewContext'] : [],
            $reviewContext
        );
        $payload['reviewContext']['requestedShipmentServiceLevel'] = $payload['shipment']['serviceLevel'] ?? null;
        $category = $this->resolvePayloadCategory($payload);
        $payload = $this->normalizeShipmentPreferencePayload(
            $payload,
            $this->serviceLevelLabelsForCategory($category)
        );
        $this->assertPayloadMatchesFlowRoute($payload, $request);
        $this->assertShipmentPaymentIntentPayload($payload);
        $this->assertShipmentCodRequestPayload($payload);
        $codRequest = $this->resolveCodBookingPayload($payload);
        $paymentOptions = (array) ($payload['shipment']['paymentOptions'] ?? []);
        $requiresCardPayment = (bool) ($payload['shipment']['requiresCardPayment'] ?? ($paymentOptions['card'] ?? false));

        if ($requiresCardPayment && (
            !(bool) config('courier.payments.enabled', false)
            || !(bool) config('courier.payments.provider.payhere.enabled', false)
        )) {
            throw ValidationException::withMessages([
                'shipment.paymentOptions.card' => 'Card payments are currently unavailable for courier bookings. Please choose a different payment option.',
            ]);
        }

        $selectedQuotes = collect($reviewContext['selectedQuotes'] ?? [])->keyBy('packageIndex');
        $estimatedCostUsd = $selectedQuotes->reduce(function ($carry, $quote) {
            return $carry + (float) ($quote['priceUSD'] ?? 0);
        }, 0.0);
        $saveSenderFavorite = (bool) ($payload['sender']['saveToFavorites'] ?? false);
        $saveRecipientFavorite = (bool) ($payload['recipient']['saveToFavorites'] ?? false);

        try {
            $shipment = DB::transaction(function () use ($payload, $selectedQuotes, $assignmentService, $saveSenderFavorite, $saveRecipientFavorite, $codRequest) {
                $sender = CourierContact::create([
                    'user_id' => Auth::id(),
                    'role' => CourierContact::ROLE_SENDER,
                    'name' => $payload['sender']['name'],
                    'email' => $payload['sender']['email'] ?? null,
                    'phone' => $payload['sender']['phone'] ?? null,
                    'company_name' => $payload['sender']['company'] ?? null,
                    'is_favorite' => $saveSenderFavorite,
                ]);

                $senderAddressData = $payload['sender']['address'];
                $senderAddress = $sender->addresses()->create([
                    'label' => 'pickup',
                    'line1' => $senderAddressData['line1'],
                    'line2' => $senderAddressData['line2'] ?? null,
                    'city' => $senderAddressData['city'],
                    'state' => $senderAddressData['state'] ?? null,
                    'postal_code' => $senderAddressData['postalCode'] ?? null,
                    'country' => strtoupper($senderAddressData['country']),
                    'instructions' => $senderAddressData['instructions'] ?? null,
                    'is_primary' => true,
                ]);

                $recipient = CourierContact::create([
                    'user_id' => Auth::id(),
                    'role' => CourierContact::ROLE_RECIPIENT,
                    'name' => $payload['recipient']['name'],
                    'email' => $payload['recipient']['email'] ?? null,
                    'phone' => $payload['recipient']['phone'] ?? null,
                    'company_name' => $payload['recipient']['company'] ?? null,
                    'is_favorite' => $saveRecipientFavorite,
                ]);

                $recipientAddressData = $payload['recipient']['address'];
                $recipientAddress = $recipient->addresses()->create([
                    'label' => 'dropoff',
                    'line1' => $recipientAddressData['line1'],
                    'line2' => $recipientAddressData['line2'] ?? null,
                    'city' => $recipientAddressData['city'],
                    'state' => $recipientAddressData['state'] ?? null,
                    'postal_code' => $recipientAddressData['postalCode'] ?? null,
                    'country' => strtoupper($recipientAddressData['country']),
                    'instructions' => $recipientAddressData['instructions'] ?? null,
                    'is_primary' => true,
                ]);

                $shipment = CourierShipment::create([
                    'requested_by_user_id' => Auth::id(),
                    'sender_contact_id' => $sender->id,
                    'recipient_contact_id' => $recipient->id,
                    'sender_address_id' => $senderAddress->id,
                    'recipient_address_id' => $recipientAddress->id,
                    'service_level' => $payload['shipment']['serviceLevel'],
                    'status' => CourierShipment::STATUS_PENDING,
                    'pickup_date' => $payload['shipment']['pickupDate'] ? $payload['shipment']['pickupDate'] : null,
                    'pickup_window_start' => $payload['shipment']['pickupWindowStart'] ? $payload['shipment']['pickupWindowStart'] : null,
                    'pickup_window_end' => $payload['shipment']['pickupWindowEnd'] ? $payload['shipment']['pickupWindowEnd'] : null,
                    'insurance_required' => (bool) ($payload['shipment']['insurance'] ?? false),
                    'declared_value' => isset($payload['shipment']['estimatedValue'])
                        ? (float) $payload['shipment']['estimatedValue']
                        : 0,
                    'is_cod_enabled' => (bool) ($codRequest['enabled'] ?? false),
                    'cod_requested_amount' => $codRequest['requestedAmount'] ?? null,
                    'cod_requested_method' => $codRequest['requestedMethod'] ?? null,
                    'currency_code' => strtoupper($payload['shipment']['currency'] ?? 'LKR'),
                    'delivery_notes' => $payload['shipment']['deliveryNotes'] ?? null,
                ]);

                foreach ($payload['packages'] as $index => $package) {
                    $quote = $selectedQuotes->get($index);

                    $shipment->packages()->create([
                        'label' => $package['label'] ?? 'Package ' . ($index + 1),
                        'package_type' => $package['packageType'] ?? null,
                        'courier_provider_key' => $package['courierProvider'] ?? ($quote['providerId'] ?? null),
                        'courier_provider_name' => $quote['providerName'] ?? null,
                        'service_tier_key' => $package['serviceLevel'] ?? ($quote['serviceLevel'] ?? null),
                        'service_tier_label' => $quote['serviceLabel'] ?? null,
                        'service_eta' => $quote['eta'] ?? null,
                        'quoted_price_usd' => $quote ? (float) ($quote['priceUSD'] ?? 0) : null,
                        'quantity' => $package['quantity'],
                        'weight_kg' => $package['weightKg'],
                        'length_cm' => $package['lengthCm'] ?? null,
                        'width_cm' => $package['widthCm'] ?? null,
                        'height_cm' => $package['heightCm'] ?? null,
                        'declared_value' => $package['declaredValue'] ?? null,
                        'description' => $package['description'] ?? null,
                    ]);
                }

                $assignmentService->assignShipment($shipment);
                $this->assertShipmentServiceCatalogPolicy($shipment, $payload);

                $codPolicyContext = $this->assertShipmentCODPolicy($shipment, $payload, $codRequest);
                if ((bool) ($codRequest['enabled'] ?? false)) {
                    $shipment->update([
                        'cod_capability_id' => $codPolicyContext['capabilityId'] ?? null,
                        'cod_policy_snapshot' => $codPolicyContext['policySnapshot'] ?? null,
                    ]);
                }

                return $shipment;
            });

            $pricingExplanation = null;
            $enforcedEstimatedCostUsd = $this->resolveEstimatedCostWithLaneMatrix($shipment, $payload, $estimatedCostUsd, $pricingExplanation);
        } catch (ValidationException $exception) {
            $firstError = (string) collect($exception->errors())->flatten()->first();

            $this->observability()->reportPricingException(
                $request,
                'store_pricing_enforcement',
                $firstError !== '' ? $firstError : $exception->getMessage(),
                [
                    'category' => $this->resolvePayloadCategory($payload),
                    'package_count' => count((array) ($payload['packages'] ?? [])),
                    'selected_quote_count' => count((array) ($payload['reviewContext']['selectedQuotes'] ?? [])),
                ]
            );

            $this->observability()->logStoreFailed($request, 'pricing_validation_exception', [
                'error' => $firstError !== '' ? $firstError : $exception->getMessage(),
            ]);

            throw $exception;
        } catch (\Throwable $exception) {
            $this->observability()->logStoreFailed($request, 'store_runtime_exception', [
                'exception_class' => get_class($exception),
                'error' => mb_substr($exception->getMessage(), 0, 300),
            ]);

            throw $exception;
        }

        $finalPayableAmountUsd = $enforcedEstimatedCostUsd > 0
            ? round($enforcedEstimatedCostUsd, 2)
            : null;

        $shipment->update([
            'estimated_cost' => $finalPayableAmountUsd,
        ]);

        $this->observability()->logStoreSucceeded($request, (int) $shipment->id, [
            'shipment_reference' => (string) $shipment->reference,
            'assigned_vendor_user_id' => (int) ($shipment->assigned_vendor_user_id ?? 0),
            'estimated_cost_usd' => $shipment->estimated_cost !== null ? (float) $shipment->estimated_cost : null,
        ]);

        app(CourierCustomerEmailDispatchService::class)->queueShipmentPlaced($shipment);

        if ($requiresCardPayment) {
            $checkoutAmountUsd = (float) ($finalPayableAmountUsd ?? 0);
            if ($checkoutAmountUsd <= 0) {
                throw ValidationException::withMessages([
                    'shipment.paymentOptions.card' => 'Card payment cannot be initialized because the shipment amount is not available.',
                ]);
            }

            [$paymentCurrency, $currencyNotice, $fallbackApplied] = $this->resolveCourierCheckoutCurrency($payload);
            $checkoutAmount = $this->resolveCourierCheckoutAmount(
                $checkoutAmountUsd,
                $paymentCurrency,
                $shipment,
                $payload
            );

            $payment = CourierShipmentPayment::create([
                'courier_shipment_id' => (int) $shipment->id,
                'requested_by_user_id' => Auth::id(),
                'provider' => CourierShipmentPayment::PROVIDER_PAYHERE,
                'payment_method' => CourierShipmentPayment::PAYMENT_METHOD_CARD,
                'is_required' => true,
                'amount' => round($checkoutAmount, 2),
                'currency_code' => $paymentCurrency,
                'status' => CourierShipmentPayment::STATUS_PENDING,
                'gateway_order_id' => $this->generateCourierPaymentOrderReference($shipment),
                'initiated_at' => now(),
                'metadata' => [
                    'shipmentFlow' => $this->resolvePayloadCategory($payload),
                    'selectedCurrency' => strtoupper((string) ($payload['shipment']['currency'] ?? '')),
                    'fallbackApplied' => $fallbackApplied,
                    'payableAmountSource' => 'enforced_estimate',
                    'baseAmountUsd' => round($checkoutAmountUsd, 2),
                ],
            ]);

            $request->session()->forget('courier_preview');
            $request->session()->flash('courier_pricing_explanation', $pricingExplanation);
            $this->rememberGuestBillAccess($request, (int) $shipment->id);

            $gateway = app(PayHereGatewayService::class);
            $checkout = $gateway->buildCheckoutPayload($payment, $shipment, Auth::user());

            if ($request->expectsJson()) {
                return response()->json([
                    'ok' => true,
                    'shipment' => [
                        'id' => (int) $shipment->id,
                        'reference' => (string) $shipment->reference,
                        'detailUrl' => route('courier.shipment.show', ['id' => (int) $shipment->id]),
                    ],
                    'payment' => [
                        'id' => (int) $payment->id,
                        'status' => (string) $payment->status,
                        'amount' => (float) $payment->amount,
                        'currency' => (string) $payment->currency_code,
                        'orderId' => (string) ($payment->gateway_order_id ?? ''),
                    ],
                    'checkout' => $checkout,
                    'fallbackCheckoutUrl' => route('couriers.payments.checkout', ['shipment' => (int) $shipment->id]),
                    'message' => 'Courier request submitted. Proceed to card checkout.',
                    'warning' => $currencyNotice,
                ], 201);
            }

            $response = redirect()
                ->route('couriers.payments.checkout', ['shipment' => (int) $shipment->id])
                ->with('success', 'Courier request submitted. Complete PayHere payment to continue processing.')
                ->with('courier_reference', $shipment->reference)
                ->with('courier_bill_id', $shipment->id);

            if ($currencyNotice !== null) {
                $response->with('warning', $currencyNotice);
            }

            return $response;
        }

        $request->session()->forget('courier_preview');
        $request->session()->flash('courier_pricing_explanation', $pricingExplanation);
        $this->rememberGuestBillAccess($request, (int) $shipment->id);

        return redirect()
            ->route('courier.shipment.show', ['id' => (int) $shipment->id])
            ->with('success', 'Courier request submitted successfully.')
            ->with('courier_reference', $shipment->reference)
            ->with('courier_bill_id', $shipment->id);
    }

    private function hasReviewStagePreviewPayload($payload): bool
    {
        if (!is_array($payload)) {
            return false;
        }

        if (!$this->hasValidShipmentPaymentIntent($payload)) {
            return false;
        }

        $packages = $payload['packages'] ?? [];
        if (!is_array($packages) || count($packages) < 1) {
            return false;
        }

        foreach ($packages as $package) {
            if (!is_array($package)) {
                return false;
            }

            if ((int) ($package['quantity'] ?? 0) < 1) {
                return false;
            }

            if ((float) ($package['weightKg'] ?? 0) <= 0) {
                return false;
            }

            if (empty($package['courierProvider'] ?? null) || empty($package['serviceLevel'] ?? null)) {
                return false;
            }
        }

        $selectedQuotes = $payload['reviewContext']['selectedQuotes'] ?? [];

        return is_array($selectedQuotes) && count($selectedQuotes) >= 1;
    }

    private function hasCreateStepCourierPreviewPayload($payload): bool
    {
        if (!is_array($payload)) {
            return false;
        }

        if (!$this->hasValidShipmentPaymentIntent($payload)) {
            return false;
        }

        $packages = $payload['packages'] ?? [];
        if (!is_array($packages) || count($packages) < 1) {
            return false;
        }

        foreach ($packages as $package) {
            if (!is_array($package)) {
                return false;
            }

            if ((int) ($package['quantity'] ?? 0) < 1) {
                return false;
            }

            if ((float) ($package['weightKg'] ?? 0) <= 0) {
                return false;
            }
        }

        $selectedQuotes = $payload['reviewContext']['selectedQuotes'] ?? [];

        return is_array($selectedQuotes) && count($selectedQuotes) >= 1;
    }

    private function hasValidCourierPreviewPayload($payload): bool
    {
        if (!is_array($payload)) {
            return false;
        }

        if (!$this->hasValidShipmentPaymentIntent($payload)) {
            return false;
        }

        if (empty($payload['sender']['name'] ?? null) || empty($payload['recipient']['name'] ?? null)) {
            return false;
        }

        if (empty($payload['sender']['address']['line1'] ?? null) || empty($payload['recipient']['address']['line1'] ?? null)) {
            return false;
        }

        if (empty($payload['sender']['address']['city'] ?? null) || empty($payload['recipient']['address']['city'] ?? null)) {
            return false;
        }

        if (empty($payload['sender']['address']['country'] ?? null) || empty($payload['recipient']['address']['country'] ?? null)) {
            return false;
        }

        if (empty($payload['shipment']['serviceLevel'] ?? null)) {
            return false;
        }

        $packages = $payload['packages'] ?? [];
        if (!is_array($packages) || count($packages) < 1) {
            return false;
        }

        foreach ($packages as $package) {
            if (!is_array($package)) {
                return false;
            }

            if ((int) ($package['quantity'] ?? 0) < 1) {
                return false;
            }

            if ((float) ($package['weightKg'] ?? 0) <= 0) {
                return false;
            }
        }

        $selectedQuotes = $payload['reviewContext']['selectedQuotes'] ?? [];

        return is_array($selectedQuotes) && count($selectedQuotes) >= 1;
    }

    private function hasValidShipmentPaymentIntent(array $payload): bool
    {
        $paymentOptions = $this->resolveShipmentPaymentOptions($payload);
        $requiresSelection = (bool) ($paymentOptions['cod'] ?? false) || (bool) ($paymentOptions['card'] ?? false);

        if (!$requiresSelection) {
            return false;
        }

        $shipment = is_array($payload['shipment'] ?? null) ? $payload['shipment'] : [];
        if (array_key_exists('requiresCardPayment', $shipment)) {
            return (bool) $shipment['requiresCardPayment'] === (bool) ($paymentOptions['card'] ?? false);
        }

        return true;
    }

    private function assertShipmentPaymentIntentPayload(array $payload): void
    {
        if ($this->hasValidShipmentPaymentIntent($payload)) {
            return;
        }

        $paymentOptions = $this->resolveShipmentPaymentOptions($payload);
        if (!(bool) ($paymentOptions['cod'] ?? false) && !(bool) ($paymentOptions['card'] ?? false)) {
            throw ValidationException::withMessages([
                'shipment.paymentOptions' => 'Select at least one payment option to continue.',
            ]);
        }

        throw ValidationException::withMessages([
            'shipment.requiresCardPayment' => 'Payment intent mismatch detected. Please reselect your payment options and continue.',
        ]);
    }

    private function flowPayloadMatchesSessionPreview(array $preview, array $payload): bool
    {
        $previewFingerprint = $this->flowPayloadFingerprint($preview);
        $payloadFingerprint = $this->flowPayloadFingerprint($payload);

        return hash_equals($previewFingerprint, $payloadFingerprint);
    }

    private function flowPayloadFingerprint(array $payload): string
    {
        $codRequest = $this->resolveCodBookingPayload($payload);
        $paymentOptions = $this->resolveShipmentPaymentOptions($payload);

        $packages = collect($payload['packages'] ?? [])
            ->values()
            ->map(function ($package, $index) {
                return [
                    'i' => (int) $index,
                    'provider' => (string) ($package['courierProvider'] ?? ''),
                    'service' => $this->normalizeServiceLevelKey((string) ($package['serviceLevel'] ?? '')),
                    'qty' => (int) ($package['quantity'] ?? 0),
                    'weight' => round((float) ($package['weightKg'] ?? 0), 3),
                ];
            })
            ->all();

        $selectedQuotes = collect($payload['reviewContext']['selectedQuotes'] ?? [])
            ->values()
            ->map(function ($quote, $index) {
                return [
                    'i' => (int) ($quote['packageIndex'] ?? $index),
                    'provider' => (string) ($quote['providerId'] ?? ''),
                    'service' => $this->normalizeServiceLevelKey((string) ($quote['serviceLevel'] ?? '')),
                    'price' => round((float) ($quote['priceUSD'] ?? 0), 2),
                ];
            })
            ->sortBy('i')
            ->values()
            ->all();

        $comparable = [
            'sender' => [
                'name' => strtolower(trim((string) ($payload['sender']['name'] ?? ''))),
                'line1' => strtolower(trim((string) ($payload['sender']['address']['line1'] ?? ''))),
                'city' => strtolower(trim((string) ($payload['sender']['address']['city'] ?? ''))),
                'country' => strtoupper(trim((string) ($payload['sender']['address']['country'] ?? ''))),
            ],
            'recipient' => [
                'name' => strtolower(trim((string) ($payload['recipient']['name'] ?? ''))),
                'line1' => strtolower(trim((string) ($payload['recipient']['address']['line1'] ?? ''))),
                'city' => strtolower(trim((string) ($payload['recipient']['address']['city'] ?? ''))),
                'country' => strtoupper(trim((string) ($payload['recipient']['address']['country'] ?? ''))),
            ],
            'shipment' => [
                'serviceLevel' => trim((string) ($payload['shipment']['serviceLevel'] ?? '')),
                'currency' => strtoupper(trim((string) ($payload['shipment']['currency'] ?? 'LKR'))),
                'pickupDate' => (string) ($payload['shipment']['pickupDate'] ?? ''),
                'paymentOptions' => [
                    'all' => (bool) ($paymentOptions['all'] ?? false),
                    'cod' => (bool) ($paymentOptions['cod'] ?? false),
                    'card' => (bool) ($paymentOptions['card'] ?? false),
                ],
                'requiresCardPayment' => (bool) ($payload['shipment']['requiresCardPayment'] ?? ($paymentOptions['card'] ?? false)),
                'resolvedRequiresCardPayment' => (bool) ($paymentOptions['card'] ?? false),
                'codEnabled' => (bool) ($codRequest['enabled'] ?? false),
                'rawCodEnabled' => (bool) ($payload['shipment']['codEnabled'] ?? false),
                'codAmount' => $codRequest['requestedAmount'] !== null
                    ? round((float) $codRequest['requestedAmount'], 2)
                    : 0.0,
                'codPaymentMethod' => (string) ($codRequest['requestedMethod'] ?? ''),
                'rawCodPaymentMethod' => strtolower(trim((string) ($payload['shipment']['codPaymentMethod'] ?? ''))),
            ],
            'packages' => $packages,
            'selectedQuotes' => $selectedQuotes,
        ];

        return hash('sha256', json_encode($comparable, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    private function extractPostalCodesFromLookupResponse($payload): array
    {
        if (!is_array($payload) || !is_array($payload['results'] ?? null)) {
            return [];
        }

        $values = [];
        $stack = [$payload['results']];

        while (!empty($stack)) {
            $item = array_pop($stack);

            if (is_array($item)) {
                foreach ($item as $value) {
                    $stack[] = $value;
                }

                continue;
            }

            if (is_scalar($item)) {
                $values[] = (string) $item;
            }
        }

        return collect($values)
            ->map(fn($value) => trim($value))
            ->filter()
            ->unique()
            ->values()
            ->take(100)
            ->all();
    }

    private function isAllowedStatusTransition(string $from, string $to): bool
    {
        $from = trim(strtolower($from));
        $to = trim(strtolower($to));

        $allowed = [
            CourierShipment::STATUS_PENDING => [CourierShipment::STATUS_CONFIRMED, CourierShipment::STATUS_CANCELLED],
            CourierShipment::STATUS_CONFIRMED => [CourierShipment::STATUS_IN_TRANSIT, CourierShipment::STATUS_CANCELLED],
            CourierShipment::STATUS_IN_TRANSIT => [CourierShipment::STATUS_DELIVERED, CourierShipment::STATUS_CANCELLED],
            CourierShipment::STATUS_DELIVERED => [],
            CourierShipment::STATUS_CANCELLED => [],
        ];

        return in_array($to, $allowed[$from] ?? [], true);
    }

    private function defaultServiceCatalog(): array
    {
        return [
            'domestic' => [
                ['key' => 'same_day', 'label' => 'Same Day', 'promisedSlaDays' => 1, 'cutoffTime' => '10:30', 'isActive' => true],
                ['key' => 'next_day', 'label' => 'Next Day', 'promisedSlaDays' => 1, 'cutoffTime' => '15:00', 'isActive' => true],
                ['key' => 'two_three_day', 'label' => '2-3 Day', 'promisedSlaDays' => 3, 'cutoffTime' => '17:00', 'isActive' => true],
                ['key' => 'economy', 'label' => 'Economy', 'promisedSlaDays' => 5, 'cutoffTime' => '18:00', 'isActive' => true],
            ],
            'international' => [
                ['key' => 'next_day', 'label' => 'Next Day', 'promisedSlaDays' => 2, 'cutoffTime' => '13:00', 'isActive' => true],
                ['key' => 'two_three_day', 'label' => '2-3 Day', 'promisedSlaDays' => 3, 'cutoffTime' => '16:00', 'isActive' => true],
                ['key' => 'economy', 'label' => 'Economy', 'promisedSlaDays' => 6, 'cutoffTime' => '18:00', 'isActive' => true],
            ],
        ];
    }

    private function serviceLevelLabelsForCategory(string $category): array
    {
        $category = $category === 'international' ? 'international' : 'domestic';
        $catalog = $this->defaultServiceCatalog();

        return collect($catalog[$category] ?? [])
            ->filter(fn($item) => (bool) ($item['isActive'] ?? false))
            ->map(fn($item) => (string) ($item['label'] ?? ''))
            ->filter()
            ->values()
            ->all();
    }

    private function hasFlowRouteContext(Request $request): bool
    {
        $flow = $request->route('flow');

        return is_string($flow) && in_array($flow, ['domestic', 'international'], true);
    }

    private function resolveBookingFlow(?string $flow): string
    {
        return strtolower((string) $flow) === 'international' ? 'international' : 'domestic';
    }

    private function resolveFlowPageComponent(Request $request, string $page): string
    {
        if (!$this->hasFlowRouteContext($request)) {
            return "Web/courier/{$page}";
        }

        $flow = $this->resolveBookingFlow((string) $request->route('flow'));

        return "Web/courier/{$flow}/{$page}";
    }

    private function resolveBookingFlowRoutes(Request $request): array
    {
        $isFlowScopedRoute = $this->hasFlowRouteContext($request);
        $flow = $this->resolveBookingFlow((string) $request->route('flow'));
        $basePath = $isFlowScopedRoute ? "/couriers/{$flow}" : '/couriers';

        return [
            'basePath' => $basePath,
            'create' => "{$basePath}/create",
            'review' => "{$basePath}/review",
            'details' => "{$basePath}/details",
            'detailsStore' => "{$basePath}/details",
            'summary' => "{$basePath}/summary",
            'countrySuggestions' => "{$basePath}/countries/suggestions",
            'postalByCity' => "{$basePath}/postal-codes/by-city",
            'cityByPostal' => "{$basePath}/cities/by-postal-code",
            'domesticCitySearch' => "{$basePath}/cities/search",
            'store' => $basePath,
            'createByFlow' => [
                'domestic' => '/couriers/domestic/create',
                'international' => '/couriers/international/create',
            ],
        ];
    }

    private function resolveFlowRoute(Request $request, string $step, array $extraParameters = []): string
    {
        if (!$this->hasFlowRouteContext($request)) {
            return route("couriers.{$step}", $extraParameters);
        }

        return route("couriers.flow.{$step}", array_merge([
            'flow' => $this->resolveBookingFlow((string) $request->route('flow')),
        ], $extraParameters));
    }

    private function previewMismatchesScopedFlow($previewPayload, Request $request): bool
    {
        if (!$this->hasFlowRouteContext($request) || !is_array($previewPayload)) {
            return false;
        }

        $routeFlow = $this->resolveBookingFlow((string) $request->route('flow'));
        $payloadFlow = $this->resolvePayloadCategory($previewPayload);

        return $payloadFlow !== $routeFlow;
    }

    private function assertPayloadMatchesFlowRoute(array $payload, Request $request): void
    {
        if (!$this->hasFlowRouteContext($request)) {
            return;
        }

        $routeFlow = $this->resolveBookingFlow((string) $request->route('flow'));
        $payloadFlow = $this->resolvePayloadCategory($payload);

        if ($payloadFlow !== $routeFlow) {
            throw ValidationException::withMessages([
                'shipment.routeType' => "This URL accepts {$routeFlow} shipments only.",
            ]);
        }
    }

    private function resolvePayloadCategory(array $payload): string
    {
        $senderCountry = strtoupper((string) ($payload['sender']['address']['country'] ?? ''));
        $recipientCountry = strtoupper((string) ($payload['recipient']['address']['country'] ?? ''));

        if ($senderCountry === 'LK' && $recipientCountry === 'LK') {
            return 'domestic';
        }

        return 'international';
    }

    private function normalizeServiceLevelKey(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');

        return match ($normalized) {
            'priority_4h', 'priority4h', 'priority_4_hours', 'priority_4hour', '4h', 'rush_4h', 'rush4h' => 'priority_4h',
            'same_day', 'sameday', 'priority' => 'same_day',
            'next_day', 'nextday', 'express', 'one_day', 'oneday' => 'next_day',
            '2_3_day', '2_3_days', 'two_three_day', 'standard', 'within_3_days' => 'two_three_day',
            default => $normalized,
        };
    }

    private function resolveServiceCatalogForVendor(?int $vendorId, string $category): array
    {
        $category = $category === 'international' ? 'international' : 'domestic';
        $defaults = $this->defaultServiceCatalog();

        if (!$vendorId || $vendorId <= 0) {
            return $defaults[$category] ?? [];
        }

        $settings = VendorCourierSetting::query()
            ->where('vendor_user_id', $vendorId)
            ->value('settings');

        $serviceCatalog = is_array($settings['pricing']['serviceCatalog'][$category] ?? null)
            ? $settings['pricing']['serviceCatalog'][$category]
            : ($defaults[$category] ?? []);

        return collect($serviceCatalog)
            ->map(function ($item) {
                if (!is_array($item)) {
                    return null;
                }

                $key = $this->normalizeServiceLevelKey((string) ($item['key'] ?? ''));
                if ($key === '') {
                    return null;
                }

                return [
                    'key' => $key,
                    'label' => trim((string) ($item['label'] ?? '')) ?: 'Service Level',
                    'promisedSlaDays' => max(1, (int) ($item['promisedSlaDays'] ?? 1)),
                    'cutoffTime' => trim((string) ($item['cutoffTime'] ?? '18:00')) ?: '18:00',
                    'isActive' => (bool) ($item['isActive'] ?? true),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    private function resolveLaneMatrixForVendor(?int $vendorId, string $category): array
    {
        $category = $category === 'international' ? 'international' : 'domestic';

        if (!$vendorId || $vendorId <= 0) {
            return ['enabled' => false, 'rows' => []];
        }

        $settings = VendorCourierSetting::query()
            ->where('vendor_user_id', $vendorId)
            ->value('settings');

        $laneConfig = is_array($settings['pricing']['laneMatrix'] ?? null) ? $settings['pricing']['laneMatrix'] : [];
        $rows = is_array($laneConfig[$category] ?? null) ? $laneConfig[$category] : [];
        $enabledConfig = $laneConfig['enabled'] ?? false;
        $isEnabled = is_array($enabledConfig)
            ? (bool) ($enabledConfig[$category] ?? false)
            : (bool) $enabledConfig;

        $normalizedRows = collect($rows)
            ->map(function ($item) {
                if (!is_array($item)) {
                    return null;
                }

                $distanceFrom = max(0, (float) ($item['distanceFromKm'] ?? 0));
                $distanceTo = isset($item['distanceToKm']) && $item['distanceToKm'] !== ''
                    ? max($distanceFrom, (float) $item['distanceToKm'])
                    : null;

                return [
                    'originZone' => $this->normalizeZoneKey((string) ($item['originZone'] ?? '*')),
                    'destinationZone' => $this->normalizeZoneKey((string) ($item['destinationZone'] ?? '*')),
                    'serviceLevelKey' => $this->normalizeServiceLevelKey((string) ($item['serviceLevelKey'] ?? '')),
                    'distanceFromKm' => $distanceFrom,
                    'distanceToKm' => $distanceTo,
                    'distanceBaseKm' => max(0, (float) ($item['distanceBaseKm'] ?? 0)),
                    'perKmPrice' => max(0, (float) ($item['perKmPrice'] ?? 0)),
                    'distanceSurcharge' => max(0, (float) ($item['distanceSurcharge'] ?? 0)),
                    'distanceMultiplier' => max(0.1, (float) ($item['distanceMultiplier'] ?? 1)),
                    'basePrice' => max(0, (float) ($item['basePrice'] ?? 0)),
                    'perKgPrice' => max(0, (float) ($item['perKgPrice'] ?? 0)),
                    'minPrice' => max(0, (float) ($item['minPrice'] ?? 0)),
                    'priorityMultiplier' => max(0.1, (float) ($item['priorityMultiplier'] ?? 1)),
                    'isActive' => (bool) ($item['isActive'] ?? true),
                ];
            })
            ->filter(fn($item) => is_array($item) && (bool) ($item['isActive'] ?? false))
            ->values()
            ->all();

        return [
            'enabled' => $isEnabled,
            'rows' => $normalizedRows,
        ];
    }

    private function normalizeZoneKey(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '' || $trimmed === '*') {
            return '*';
        }

        $normalized = strtolower($trimmed);
        $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');

        return $normalized !== '' ? $normalized : '*';
    }

    private function resolveZoneFromPayloadAddress(array $address): string
    {
        $candidate = (string) ($address['state'] ?? '');
        if (trim($candidate) === '') {
            $candidate = (string) ($address['city'] ?? '');
        }

        return $this->normalizeZoneKey($candidate);
    }

    private function normalizeShipmentPreferencePayload(array $payload, array $allowedServiceLevels = []): array
    {
        $payload['shipment'] = is_array($payload['shipment'] ?? null) ? $payload['shipment'] : [];

        $payload['shipment']['serviceLevel'] = $this->resolveShipmentServiceLevelFromPayload(
            $payload,
            $allowedServiceLevels
        );
        $payload['shipment']['currency'] = $this->resolveShipmentCurrencyFromPayload($payload);
        $payload['shipment']['paymentOptions'] = $this->resolveShipmentPaymentOptions($payload);
        $payload['shipment']['requiresCardPayment'] = (bool) ($payload['shipment']['paymentOptions']['card'] ?? false);

        $codRequest = $this->resolveCodBookingPayload($payload);
        $payload['shipment']['codEnabled'] = (bool) ($codRequest['enabled'] ?? false);
        $payload['shipment']['codAmount'] = $codRequest['requestedAmount'];
        $payload['shipment']['codPaymentMethod'] = $codRequest['requestedMethod'];

        return $payload;
    }

    private function resolveShipmentServiceLevelFromPayload(array $payload, array $allowedServiceLevels = []): string
    {
        $candidates = [];

        foreach (($payload['reviewContext']['selectedQuotes'] ?? []) as $quote) {
            if (!is_array($quote)) {
                continue;
            }

            $candidates[] = $quote['serviceLevel'] ?? null;
            $candidates[] = $quote['serviceLabel'] ?? null;
        }

        foreach (($payload['packages'] ?? []) as $package) {
            if (!is_array($package)) {
                continue;
            }

            $candidates[] = $package['serviceLevel'] ?? null;
        }

        $candidates[] = $payload['shipment']['serviceLevel'] ?? null;

        foreach ($candidates as $candidate) {
            $candidate = is_string($candidate) ? trim($candidate) : '';
            if ($candidate !== '') {
                return $candidate;
            }
        }

        if (!empty($allowedServiceLevels)) {
            return (string) $allowedServiceLevels[0];
        }

        return 'standard';
    }

    private function resolveShipmentCurrencyFromPayload(array $payload): string
    {
        $shipmentCurrency = $payload['shipment']['currency'] ?? null;
        $reviewCurrency = $payload['reviewContext']['displayCurrency'] ?? null;
        $candidate = is_string($shipmentCurrency) ? $shipmentCurrency : $reviewCurrency;
        $candidate = is_string($candidate) ? strtoupper(trim($candidate)) : '';

        return $candidate !== '' ? $candidate : 'LKR';
    }

    private function resolveShipmentPaymentOptions(array $payload): array
    {
        $shipment = is_array($payload['shipment'] ?? null) ? $payload['shipment'] : [];
        $options = is_array($shipment['paymentOptions'] ?? null) ? $shipment['paymentOptions'] : [];

        $normalized = [
            'all' => (bool) ($options['all'] ?? false),
            'cod' => (bool) ($options['cod'] ?? false),
            'card' => (bool) ($options['card'] ?? false),
        ];

        if ($normalized['all']) {
            $normalized['cod'] = true;
            $normalized['card'] = true;
        }

        $normalized['all'] = $normalized['cod'] && $normalized['card'];

        return $normalized;
    }

    private function resolveCourierCheckoutCurrency(array $payload): array
    {
        $category = $this->resolvePayloadCategory($payload);
        $selectedCurrency = strtoupper(trim((string) ($payload['shipment']['currency'] ?? '')));

        $domesticCurrency = strtoupper(trim((string) config('courier.payments.provider.payhere.domestic_currency', 'LKR')));
        if ($category === 'domestic') {
            return [$domesticCurrency !== '' ? $domesticCurrency : 'LKR', null, false];
        }

        $supportedInternationalCurrencies = collect(config('courier.payments.provider.payhere.supported_international_currencies', ['USD']))
            ->map(fn($currency) => strtoupper(trim((string) $currency)))
            ->filter(fn($currency) => $currency !== '')
            ->values();

        if ($selectedCurrency !== '' && $supportedInternationalCurrencies->contains($selectedCurrency)) {
            return [$selectedCurrency, null, false];
        }

        $fallbackCurrency = strtoupper(trim((string) config('courier.payments.provider.payhere.international_fallback_currency', 'USD')));
        $fallbackCurrency = $fallbackCurrency !== '' ? $fallbackCurrency : 'USD';

        $warning = $selectedCurrency !== ''
            ? "Selected currency {$selectedCurrency} is not supported for international card payments. Checkout will continue in {$fallbackCurrency}."
            : "No supported international checkout currency was selected. Checkout will continue in {$fallbackCurrency}.";

        return [$fallbackCurrency, $warning, true];
    }

    private function resolveCourierCheckoutAmount(
        float $amountUsd,
        string $paymentCurrency,
        CourierShipment $shipment,
        array $payload
    ): float {
        $paymentCurrency = strtoupper(trim($paymentCurrency));
        if ($paymentCurrency === '' || $paymentCurrency === 'USD') {
            return $amountUsd;
        }

        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        $category = (string) ($shipment->assignment_category ?: $this->resolvePayloadCategory($payload));
        $pricingConfig = $this->resolveCategoryPricingConfigForVendor($vendorId, $category);
        $localization = is_array($pricingConfig['localization'] ?? null) ? $pricingConfig['localization'] : [];
        $baseCurrency = strtoupper(trim((string) ($localization['baseCurrency'] ?? 'USD')));
        $baseCurrency = $baseCurrency !== '' ? $baseCurrency : 'USD';

        $manualRatesRaw = is_array($localization['manualRates'] ?? null) ? $localization['manualRates'] : [];
        $manualRates = [];
        foreach ($manualRatesRaw as $currency => $rate) {
            $code = strtoupper(trim((string) $currency));
            if ($code !== '') {
                $manualRates[$code] = (float) $rate;
            }
        }

        $rateBaseToUsd = 1.0;
        if ($baseCurrency !== 'USD') {
            $rateBaseToUsd = (float) ($manualRates['USD'] ?? 0);
            if ($rateBaseToUsd <= 0) {
                return $amountUsd;
            }
        }

        $amountInBase = $baseCurrency === 'USD'
            ? $amountUsd
            : $amountUsd / $rateBaseToUsd;

        if ($paymentCurrency === $baseCurrency) {
            return $amountInBase;
        }

        $rateBaseToTarget = (float) ($manualRates[$paymentCurrency] ?? 0);
        if ($rateBaseToTarget <= 0) {
            return $amountUsd;
        }

        return $amountInBase * $rateBaseToTarget;
    }

    private function generateCourierPaymentOrderReference(CourierShipment $shipment): string
    {
        return 'CPH-' . (int) $shipment->id . '-' . strtoupper(Str::random(8));
    }

    private function resolveCodBookingPayload(array $payload): array
    {
        $shipment = is_array($payload['shipment'] ?? null) ? $payload['shipment'] : [];
        $enabled = (bool) ($shipment['codEnabled'] ?? false);

        if (!$enabled) {
            return [
                'enabled' => false,
                'requestedAmount' => null,
                'requestedMethod' => null,
            ];
        }

        $requestedMethod = $this->normalizeCodPaymentMethod($shipment['codPaymentMethod'] ?? null);

        $requestedAmount = null;
        $declaredValue = isset($shipment['estimatedValue']) ? max(0, (float) $shipment['estimatedValue']) : 0.0;
        if ($declaredValue > 0) {
            $requestedAmount = $declaredValue;
        }

        if ($requestedAmount === null || $requestedAmount <= 0) {
            $requestedAmount = collect($payload['packages'] ?? [])
                ->reduce(static function (float $carry, $package): float {
                    $declaredValue = is_array($package)
                        ? max(0, (float) ($package['declaredValue'] ?? 0))
                        : 0.0;

                    return $carry + $declaredValue;
                }, 0.0);
            if ($requestedAmount <= 0) {
                $requestedAmount = null;
            }
        }

        return [
            'enabled' => true,
            'requestedAmount' => $requestedAmount !== null ? round($requestedAmount, 2) : null,
            'requestedMethod' => $requestedMethod,
        ];
    }

    private function normalizeCodPaymentMethod($value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $normalized = strtolower(trim($value));
        $normalized = str_replace('-', '_', $normalized);
        $normalized = str_replace(' ', '_', $normalized);

        return in_array($normalized, ['cash', 'card', 'check', 'bank_transfer'], true)
            ? $normalized
            : null;
    }

    private function assertShipmentCodRequestPayload(array $payload): void
    {
        $codRequest = $this->resolveCodBookingPayload($payload);
        if (!(bool) ($codRequest['enabled'] ?? false)) {
            return;
        }

        if ($this->resolvePayloadCategory($payload) !== 'domestic') {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'Cash on Delivery is available only for domestic routes.',
            ]);
        }

        if (!isset($codRequest['requestedAmount']) || (float) $codRequest['requestedAmount'] <= 0) {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'COD collection amount is auto-calculated from declared values. Set a positive declared value on shipment or package items.',
            ]);
        }

        if (!is_string($codRequest['requestedMethod']) || $codRequest['requestedMethod'] === '') {
            throw ValidationException::withMessages([
                'shipment.codPaymentMethod' => 'Select a COD payment method.',
            ]);
        }
    }

    private function resolveDistanceKmFromPayload(array $payload): ?float
    {
        $distanceKm = $payload['shipment']['distanceKm'] ?? null;
        if ($distanceKm === null || $distanceKm === '') {
            return null;
        }

        return max(0, (float) $distanceKm);
    }

    private function laneRuleMatchesDistance(array $rule, ?float $distanceKm): bool
    {
        $distanceFrom = max(0, (float) ($rule['distanceFromKm'] ?? 0));
        $distanceTo = isset($rule['distanceToKm']) && $rule['distanceToKm'] !== ''
            ? max(0, (float) $rule['distanceToKm'])
            : null;

        if ($distanceKm === null) {
            return true;
        }

        if ($distanceKm < $distanceFrom) {
            return false;
        }

        if ($distanceTo !== null && $distanceKm > $distanceTo) {
            return false;
        }

        return true;
    }

    private function laneRuleSpecificityScore(array $rule, ?float $distanceKm = null): int
    {
        $score = 0;

        if ((string) ($rule['serviceLevelKey'] ?? '') !== '') {
            $score += 4;
        }

        if ((string) ($rule['originZone'] ?? '*') !== '*') {
            $score += 3;
        }

        if ((string) ($rule['destinationZone'] ?? '*') !== '*') {
            $score += 3;
        }

        if ($distanceKm !== null) {
            $distanceFrom = max(0, (float) ($rule['distanceFromKm'] ?? 0));
            $distanceTo = isset($rule['distanceToKm']) && $rule['distanceToKm'] !== ''
                ? max(0, (float) ($rule['distanceToKm']))
                : null;
            if ($distanceFrom > 0 || $distanceTo !== null) {
                $score += 2;
            }

            if ($distanceTo !== null) {
                $score += 1;
            }
        }

        return $score;
    }

    private function resolveEstimatedCostWithLaneMatrix(CourierShipment $shipment, array $payload, float $fallbackEstimatedUsd, ?array &$pricingExplanation = null): float
    {
        $codRequest = $this->resolveCodBookingPayload($payload);
        $packages = collect($payload['packages'] ?? [])->map(fn($item) => is_array($item) ? $item : [])->values();
        $declaredValueForCodPreview = max(
            0,
            (float) (($payload['shipment']['estimatedValue'] ?? 0) ?: $packages->sum(fn($pkg) => (float) ($pkg['declaredValue'] ?? 0)))
        );
        $codEnabled = (bool) ($codRequest['enabled'] ?? false);
        $codFeeBaseAmount = $codEnabled
            ? max(0, (float) ($codRequest['requestedAmount'] ?? 0))
            : $declaredValueForCodPreview;
        $codFeeBaseSource = $codEnabled ? 'requested_amount' : 'declared_value';

        $pricingExplanation = [
            'mode' => 'fallback_quotes',
            'reason' => null,
            'distanceKm' => null,
            'matchedRule' => null,
            'speedEtaTier' => null,
            'internationalDimensions' => null,
            'codDetails' => [
                'enabled' => $codEnabled,
                'requestedAmount' => $codRequest['requestedAmount'] ?? null,
                'requestedMethod' => $codRequest['requestedMethod'] ?? null,
                'feeBaseAmount' => $codFeeBaseAmount > 0 ? round($codFeeBaseAmount, 2) : 0.0,
                'feeBaseSource' => $codFeeBaseSource,
                'policyFeeApplied' => 0.0,
            ],
            'policyAdjustments' => [],
            'totalEstimatedUsd' => round(max(0, $fallbackEstimatedUsd), 2),
        ];

        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        if ($vendorId <= 0) {
            $pricingExplanation['reason'] = 'No assigned vendor for lane matrix enforcement.';
            return $fallbackEstimatedUsd;
        }

        $category = (string) ($shipment->assignment_category ?: $this->resolvePayloadCategory($payload));
        $selectedLevelKey = $this->normalizeServiceLevelKey((string) ($payload['shipment']['serviceLevel'] ?? ''));
        $pricingConfig = $this->resolveCategoryPricingConfigForVendor($vendorId, $category);
        $formula = $pricingConfig['formula'];
        $localization = $pricingConfig['localization'];
        $policyModules = $pricingConfig['policyModules'];
        $pricingExplanation['speedEtaTier'] = $this->resolveSpeedEtaTierProjection(
            $policyModules,
            $selectedLevelKey,
            $payload
        );
        $pricingExplanation['internationalDimensions'] = $this->resolveInternationalDimensionsProjection(
            $policyModules,
            $payload,
            $category
        );
        $baseCurrency = strtoupper((string) ($localization['baseCurrency'] ?? 'USD'));
        $manualRates = is_array($localization['manualRates'] ?? null) ? $localization['manualRates'] : [];
        $usdRate = 1.0;
        if ($baseCurrency !== 'USD') {
            $usdRate = max(0.000001, (float) ($manualRates['USD'] ?? 1));
        }

        $laneMatrix = $this->resolveLaneMatrixForVendor($vendorId, $category);
        if (!(bool) ($laneMatrix['enabled'] ?? false)) {
            $pricingExplanation['reason'] = 'Lane matrix pricing is disabled for this category.';

            $policyBreakdown = [];
            $totalWithPolicy = $this->applyAdvancedPricingPolicies(
                max(0, $fallbackEstimatedUsd),
                $payload,
                $policyModules,
                $policyBreakdown,
                1,
                $usdRate,
                $vendorId,
                $category
            );
            $normalizedPolicyBreakdown = $this->normalizePolicyAdjustmentBreakdown($policyBreakdown);
            $pricingExplanation['policyAdjustments'] = $normalizedPolicyBreakdown;
            $pricingExplanation['codDetails']['policyFeeApplied'] = $this->resolvePolicyAdjustmentAmount($normalizedPolicyBreakdown, 'cod_fee');
            $pricingExplanation['totalEstimatedUsd'] = round(max(0, $totalWithPolicy), 2);

            return $totalWithPolicy;
        }

        $originZone = $this->resolveZoneFromPayloadAddress((array) ($payload['sender']['address'] ?? []));
        $destinationZone = $this->resolveZoneFromPayloadAddress((array) ($payload['recipient']['address'] ?? []));
        $distanceKm = $this->resolveDistanceKmFromPayload($payload);
        $pricingExplanation['distanceKm'] = $distanceKm;

        $matchedRule = collect($laneMatrix['rows'] ?? [])
            ->values()
            ->map(function ($rule, $index) use ($selectedLevelKey, $originZone, $destinationZone, $distanceKm) {
                if (!is_array($rule)) {
                    return null;
                }

                $ruleLevel = (string) ($rule['serviceLevelKey'] ?? '');
                if ($ruleLevel !== '' && $ruleLevel !== $selectedLevelKey) {
                    return null;
                }

                $ruleOrigin = (string) ($rule['originZone'] ?? '*');
                $ruleDestination = (string) ($rule['destinationZone'] ?? '*');

                $originMatches = $ruleOrigin === '*' || $ruleOrigin === $originZone;
                $destinationMatches = $ruleDestination === '*' || $ruleDestination === $destinationZone;
                if (!$originMatches || !$destinationMatches) {
                    return null;
                }

                if (!$this->laneRuleMatchesDistance($rule, $distanceKm)) {
                    return null;
                }

                return [
                    'rule' => $rule,
                    'index' => (int) $index,
                    'score' => $this->laneRuleSpecificityScore($rule, $distanceKm),
                ];
            })
            ->filter()
            ->sort(function ($left, $right) {
                $scoreCompare = ($right['score'] ?? 0) <=> ($left['score'] ?? 0);
                if ($scoreCompare !== 0) {
                    return $scoreCompare;
                }

                return ($left['index'] ?? 0) <=> ($right['index'] ?? 0);
            })
            ->map(fn($entry) => $entry['rule'])
            ->first();

        if (!$matchedRule) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => 'No active lane pricing rule found for the selected route, service level, and distance band.',
            ]);
        }

        $pricingExplanation['mode'] = 'lane_matrix';
        $pricingExplanation['reason'] = 'Estimated cost enforced by active lane matrix tariff.';
        $pricingExplanation['matchedRule'] = [
            'originZone' => (string) ($matchedRule['originZone'] ?? '*'),
            'destinationZone' => (string) ($matchedRule['destinationZone'] ?? '*'),
            'serviceLevelKey' => (string) ($matchedRule['serviceLevelKey'] ?? ''),
            'distanceFromKm' => isset($matchedRule['distanceFromKm']) ? (float) $matchedRule['distanceFromKm'] : 0.0,
            'distanceToKm' => isset($matchedRule['distanceToKm']) && $matchedRule['distanceToKm'] !== null
                ? (float) $matchedRule['distanceToKm']
                : null,
            'distanceBaseKm' => isset($matchedRule['distanceBaseKm']) ? (float) $matchedRule['distanceBaseKm'] : 0.0,
            'perKmPrice' => isset($matchedRule['perKmPrice']) ? (float) $matchedRule['perKmPrice'] : 0.0,
            'distanceSurcharge' => isset($matchedRule['distanceSurcharge']) ? (float) $matchedRule['distanceSurcharge'] : 0.0,
            'distanceMultiplier' => isset($matchedRule['distanceMultiplier']) ? (float) $matchedRule['distanceMultiplier'] : 1.0,
            'basePrice' => isset($matchedRule['basePrice']) ? (float) $matchedRule['basePrice'] : 0.0,
            'perKgPrice' => isset($matchedRule['perKgPrice']) ? (float) $matchedRule['perKgPrice'] : 0.0,
            'minPrice' => isset($matchedRule['minPrice']) ? (float) $matchedRule['minPrice'] : 0.0,
            'priorityMultiplier' => isset($matchedRule['priorityMultiplier']) ? (float) $matchedRule['priorityMultiplier'] : 1.0,
        ];

        $divisor = max(1, (float) ($formula['volumetricDivisor'] ?? 5000));
        $useChargeableWeight = (bool) ($formula['useChargeableWeight'] ?? true);
        $fuelPercent = max(0, (float) ($formula['fuelSurchargePercent'] ?? 0));
        $handlingFee = max(0, (float) ($formula['handlingFee'] ?? 0));
        $taxPercent = max(0, (float) ($formula['taxPercent'] ?? 0));

        $subtotal = collect($payload['packages'] ?? [])->reduce(function ($carry, $package) use ($matchedRule, $divisor, $useChargeableWeight, $distanceKm) {
            $actualWeight = max(0.1, (float) ($package['weightKg'] ?? 0));
            $length = max(1, (float) ($package['lengthCm'] ?? 1));
            $width = max(1, (float) ($package['widthCm'] ?? 1));
            $height = max(1, (float) ($package['heightCm'] ?? 1));
            $qty = max(1, (int) ($package['quantity'] ?? 1));

            $volumetric = ($length * $width * $height) / $divisor;
            $chargeableWeight = $useChargeableWeight ? max($actualWeight, $volumetric) : $actualWeight;
            $base = (float) ($matchedRule['basePrice'] ?? 0);
            $perKg = (float) ($matchedRule['perKgPrice'] ?? 0);
            $minPrice = (float) ($matchedRule['minPrice'] ?? 0);
            $priorityMultiplier = max(0.1, (float) ($matchedRule['priorityMultiplier'] ?? 1));
            $distanceBaseKm = max(0, (float) ($matchedRule['distanceBaseKm'] ?? 0));
            $perKmPrice = max(0, (float) ($matchedRule['perKmPrice'] ?? 0));
            $distanceSurcharge = max(0, (float) ($matchedRule['distanceSurcharge'] ?? 0));
            $distanceMultiplier = max(0.1, (float) ($matchedRule['distanceMultiplier'] ?? 1));
            $effectiveDistanceKm = max(0, (float) ($distanceKm ?? 0));
            $billableDistanceKm = max($effectiveDistanceKm - $distanceBaseKm, 0);

            $raw = $base
                + (max($chargeableWeight - 1, 0) * $perKg)
                + ($billableDistanceKm * $perKmPrice)
                + $distanceSurcharge;
            $tierTotal = max($minPrice, $raw) * $priorityMultiplier * $distanceMultiplier;

            return $carry + ($tierTotal * $qty);
        }, 0.0);

        $fuelFee = $subtotal * ($fuelPercent / 100);
        $subtotalWithFees = $subtotal + $fuelFee + $handlingFee;
        $taxFee = $subtotalWithFees * ($taxPercent / 100);
        $totalBase = $subtotalWithFees + $taxFee;

        $policyBreakdown = [];
        $totalBase = $this->applyAdvancedPricingPolicies(
            $totalBase,
            $payload,
            $policyModules,
            $policyBreakdown,
            1,
            1,
            $vendorId,
            $category
        );

        $totalEstimatedUsd = $totalBase * $usdRate;
        $normalizedPolicyBreakdown = $this->normalizePolicyAdjustmentBreakdown($policyBreakdown);
        $pricingExplanation['policyAdjustments'] = $normalizedPolicyBreakdown;
        $pricingExplanation['codDetails']['policyFeeApplied'] = $this->resolvePolicyAdjustmentAmount($normalizedPolicyBreakdown, 'cod_fee');
        $pricingExplanation['totalEstimatedUsd'] = round(max(0, $totalEstimatedUsd), 2);

        return $totalEstimatedUsd;
    }

    private function resolveCategoryPricingConfigForVendor(int $vendorId, string $category): array
    {
        $settings = VendorCourierSetting::query()->where('vendor_user_id', $vendorId)->value('settings');
        $pricing = is_array($settings['pricing'] ?? null) ? $settings['pricing'] : [];

        $formulaConfig = is_array($pricing['formula'] ?? null) ? $pricing['formula'] : [];
        $formulaDefaults = [
            'volumetricDivisor' => 5000,
            'useChargeableWeight' => true,
            'fuelSurchargePercent' => 0,
            'handlingFee' => 0,
            'taxPercent' => 0,
            'roundTo' => 2,
        ];
        $formula = array_replace(
            $formulaDefaults,
            is_array($formulaConfig[$category] ?? null)
                ? $formulaConfig[$category]
                : (is_array($formulaConfig) ? $formulaConfig : [])
        );

        $localizationConfig = is_array($pricing['localization'] ?? null) ? $pricing['localization'] : [];
        $localizationDefaults = [
            'baseCurrency' => 'LKR',
            'displayCurrency' => 'LKR',
            'locale' => 'en-LK',
            'exchangeRateProvider' => 'frankfurter.app',
            'autoLiveRates' => true,
            'manualRates' => [
                'LKR' => 1,
                'USD' => 0.00308,
                'EUR' => 0.00284,
            ],
            'lastSyncedAt' => null,
        ];
        $localization = array_replace(
            $localizationDefaults,
            is_array($localizationConfig[$category] ?? null)
                ? $localizationConfig[$category]
                : (is_array($localizationConfig) ? $localizationConfig : [])
        );

        $policyModules = $this->resolvePolicyModulesForCategory($pricing, $category);

        return [
            'formula' => $formula,
            'localization' => $localization,
            'policyModules' => $policyModules,
        ];
    }

    private function resolvePolicyModulesForCategory(array $pricing, string $category): array
    {
        $defaults = [
            'remoteAreaSurcharge' => [
                'enabled' => false,
                'flatFee' => 0,
                'applyOnOrigin' => false,
                'applyOnDestination' => true,
                'postalCodePrefixes' => [],
                'cityKeywords' => [],
            ],
            'oversizeOverweightRules' => [
                'enabled' => false,
                'maxWeightKg' => 25,
                'overweightPerKgFee' => 0,
                'maxLengthCm' => 120,
                'maxWidthCm' => 80,
                'maxHeightCm' => 80,
                'oversizeFlatFee' => 0,
            ],
            'peakHolidaySurcharge' => [
                'enabled' => false,
                'peakStartTime' => '17:00',
                'peakEndTime' => '21:00',
                'daysOfWeek' => [1, 2, 3, 4, 5],
                'peakPercent' => 0,
                'peakFlatFee' => 0,
                'holidayDates' => [],
                'holidayPercent' => 0,
                'holidayFlatFee' => 0,
            ],
            'codFee' => [
                'enabled' => false,
                'domesticOnly' => true,
                'flatFee' => 0,
                'percentOfDeclaredValue' => 0,
                'minFee' => 0,
                'maxFee' => null,
            ],
            'minimumShipmentCharge' => [
                'enabled' => true,
                'minimumTotal' => 0,
            ],
            'customerContractPricing' => [
                'enabled' => false,
                'contracts' => [],
            ],
            'quoteRuntimeGovernance' => [
                'enabled' => false,
                'fieldLocks' => [
                    'enabled' => false,
                    'lockShipmentServiceLevel' => true,
                    'lockPackageServiceLevel' => true,
                    'lockPackageCourierProvider' => true,
                    'lockQuoteTotal' => true,
                ],
                'discountGuardrails' => [
                    'enabled' => false,
                    'maxDiscountPercent' => 0,
                    'maxDiscountAmountUsd' => 0,
                ],
                'floorPriceGuardrail' => [
                    'enabled' => false,
                    'minimumTotalUsd' => 0,
                ],
            ],
            'speedEtaTierEngine' => [
                'enabled' => false,
                'enforceFixedNamedTiers' => true,
                'enforceTierPricingMultiplier' => true,
                'tiers' => [
                    'priority_4h' => [
                        'enabled' => true,
                        'etaLabel' => 'Priority 4 Hours',
                        'etaMinDays' => 0,
                        'etaMaxDays' => 0,
                        'priceMultiplier' => 1.45,
                        'maxDistanceKm' => 35,
                        'maxWeightKg' => 12,
                        'minLeadHours' => 0.5,
                        'maxLeadHours' => 4,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'same_day' => [
                        'enabled' => true,
                        'etaLabel' => 'Same Day',
                        'etaMinDays' => 0,
                        'etaMaxDays' => 1,
                        'priceMultiplier' => 1.25,
                        'maxDistanceKm' => 80,
                        'maxWeightKg' => 20,
                        'minLeadHours' => 1,
                        'maxLeadHours' => 12,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'next_day' => [
                        'enabled' => true,
                        'etaLabel' => 'Next Day',
                        'etaMinDays' => 1,
                        'etaMaxDays' => 2,
                        'priceMultiplier' => 1.12,
                        'maxDistanceKm' => 250,
                        'maxWeightKg' => 30,
                        'minLeadHours' => 2,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'two_three_day' => [
                        'enabled' => true,
                        'etaLabel' => '2-3 Days',
                        'etaMinDays' => 2,
                        'etaMaxDays' => 3,
                        'priceMultiplier' => 1.0,
                        'maxDistanceKm' => null,
                        'maxWeightKg' => null,
                        'minLeadHours' => 0,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'economy' => [
                        'enabled' => true,
                        'etaLabel' => 'Economy',
                        'etaMinDays' => 4,
                        'etaMaxDays' => 7,
                        'priceMultiplier' => 0.92,
                        'maxDistanceKm' => null,
                        'maxWeightKg' => null,
                        'minLeadHours' => 0,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                ],
            ],
            'internationalDimensionsEngine' => [
                'enabled' => false,
                'enforceForInternationalOnly' => true,
                'unitTypeMultipliers' => [
                    'parcel' => 1.0,
                    'pallet' => 1.18,
                    'crate' => 1.24,
                    'container_20ft' => 1.55,
                    'container_40ft' => 1.85,
                ],
                'routeClassMultipliers' => [
                    'standard' => 1.0,
                    'express_corridor' => 1.12,
                    'remote_corridor' => 1.22,
                    'multimodal' => 1.3,
                ],
                'handlingClassMultipliers' => [
                    'standard' => 1.0,
                    'fragile' => 1.08,
                    'hazardous' => 1.2,
                    'cold_chain' => 1.18,
                    'heavy_lift' => 1.26,
                ],
                'w2wOption' => [
                    'enabled' => true,
                    'strictForInternational' => true,
                    'defaultMode' => 'door_to_door',
                    'minimumUnitCount' => 1,
                    'maximumUnitCount' => null,
                    'modeMultipliers' => [
                        'door_to_door' => 1.15,
                        'port_to_port' => 0.92,
                        'hybrid' => 1.0,
                    ],
                ],
            ],
        ];

        $policyInput = is_array($pricing['policyModules'] ?? null) ? $pricing['policyModules'] : [];
        $categoryInput = is_array($policyInput[$category] ?? null)
            ? $policyInput[$category]
            : (is_array($policyInput) ? $policyInput : []);

        return array_replace_recursive($defaults, $categoryInput);
    }

    private function applyAdvancedPricingPolicies(
        float $currentTotal,
        array $payload,
        array $policyModules,
        array &$policyBreakdown,
        float $flatFeeFactor,
        float $percentBaseFactor,
        ?int $vendorId = null,
        ?string $category = null
    ): float {
        $total = max(0, $currentTotal);
        $policyBreakdown = [];

        $senderAddress = (array) ($payload['sender']['address'] ?? []);
        $recipientAddress = (array) ($payload['recipient']['address'] ?? []);
        $packages = collect($payload['packages'] ?? [])->map(fn($item) => is_array($item) ? $item : [])->values();
        $declaredValue = max(
            0,
            (float) (($payload['shipment']['estimatedValue'] ?? 0) ?: $packages->sum(fn($pkg) => (float) ($pkg['declaredValue'] ?? 0)))
        );
        $codRequest = $this->resolveCodBookingPayload($payload);
        $codEnabled = (bool) ($codRequest['enabled'] ?? false);
        $requestedCodAmount = max(0, (float) ($codRequest['requestedAmount'] ?? 0));
        $codFeeBaseAmount = $codEnabled ? $requestedCodAmount : $declaredValue;
        $category = $category ?: $this->resolvePayloadCategory($payload);

        $this->assertQuoteRuntimeGovernanceFieldLocks($payload, $policyModules);

        $internationalDimensionsPolicy = is_array($policyModules['internationalDimensionsEngine'] ?? null) ? $policyModules['internationalDimensionsEngine'] : [];
        $dimensionsPolicyInScope = !((bool) ($internationalDimensionsPolicy['enforceForInternationalOnly'] ?? true)) || $category === 'international';
        if ((bool) ($internationalDimensionsPolicy['enabled'] ?? false) && $dimensionsPolicyInScope) {
            $dimensions = is_array($payload['shipment']['internationalDimensions'] ?? null) ? $payload['shipment']['internationalDimensions'] : [];
            $unitType = $this->normalizeZoneKey((string) ($dimensions['unitType'] ?? ''));
            $routeClass = $this->normalizeZoneKey((string) ($dimensions['routeClass'] ?? ''));
            $handlingClass = $this->normalizeZoneKey((string) ($dimensions['handlingClass'] ?? ''));
            $w2wMode = $this->normalizeZoneKey((string) ($dimensions['w2wMode'] ?? ''));

            $unitTypeMultipliers = is_array($internationalDimensionsPolicy['unitTypeMultipliers'] ?? null)
                ? $internationalDimensionsPolicy['unitTypeMultipliers']
                : [];
            $routeClassMultipliers = is_array($internationalDimensionsPolicy['routeClassMultipliers'] ?? null)
                ? $internationalDimensionsPolicy['routeClassMultipliers']
                : [];
            $handlingClassMultipliers = is_array($internationalDimensionsPolicy['handlingClassMultipliers'] ?? null)
                ? $internationalDimensionsPolicy['handlingClassMultipliers']
                : [];

            $w2wOption = is_array($internationalDimensionsPolicy['w2wOption'] ?? null) ? $internationalDimensionsPolicy['w2wOption'] : [];
            $modeMultipliers = is_array($w2wOption['modeMultipliers'] ?? null) ? $w2wOption['modeMultipliers'] : [];
            $w2wEnabled = (bool) ($w2wOption['enabled'] ?? true);
            $effectiveW2wMode = $w2wMode !== ''
                ? $w2wMode
                : $this->normalizeZoneKey((string) ($w2wOption['defaultMode'] ?? ''));

            $multiplier = 1.0;
            $multiplier *= max(0.1, (float) ($unitTypeMultipliers[$unitType] ?? 1));
            $multiplier *= max(0.1, (float) ($routeClassMultipliers[$routeClass] ?? 1));
            $multiplier *= max(0.1, (float) ($handlingClassMultipliers[$handlingClass] ?? 1));
            if ($w2wEnabled) {
                $multiplier *= max(0.1, (float) ($modeMultipliers[$effectiveW2wMode] ?? 1));
            }

            if (abs($multiplier - 1.0) > 0.0001) {
                $before = $total;
                $total = $total * $multiplier;
                $delta = $total - $before;
                if (abs($delta) > 0.0001) {
                    $policyBreakdown[] = [
                        'key' => 'international_dimensions_engine',
                        'amount' => round($delta, 2),
                    ];
                }
            }
        }

        $tierPolicy = is_array($policyModules['speedEtaTierEngine'] ?? null) ? $policyModules['speedEtaTierEngine'] : [];
        $selectedTierKey = $this->normalizeServiceLevelKey((string) ($payload['shipment']['serviceLevel'] ?? ''));
        $selectedTier = is_array($tierPolicy['tiers'][$selectedTierKey] ?? null) ? $tierPolicy['tiers'][$selectedTierKey] : null;
        if (
            (bool) ($tierPolicy['enabled'] ?? false)
            && (bool) ($tierPolicy['enforceTierPricingMultiplier'] ?? true)
            && is_array($selectedTier)
            && (bool) ($selectedTier['enabled'] ?? true)
        ) {
            $multiplier = max(0.1, (float) ($selectedTier['priceMultiplier'] ?? 1));
            if (abs($multiplier - 1.0) > 0.0001) {
                $preMultiplier = $total;
                $total = $total * $multiplier;
                $delta = $total - $preMultiplier;
                if (abs($delta) > 0.0001) {
                    $policyBreakdown[] = [
                        'key' => 'speed_eta_tier_multiplier',
                        'amount' => round($delta, 2),
                    ];
                }
            }
        }

        $remotePolicy = is_array($policyModules['remoteAreaSurcharge'] ?? null) ? $policyModules['remoteAreaSurcharge'] : [];
        if ((bool) ($remotePolicy['enabled'] ?? false)) {
            $originRemote = (bool) ($remotePolicy['applyOnOrigin'] ?? false)
                && $this->addressMatchesRemotePolicy($senderAddress, $remotePolicy);
            $destinationRemote = (bool) ($remotePolicy['applyOnDestination'] ?? true)
                && $this->addressMatchesRemotePolicy($recipientAddress, $remotePolicy);

            if ($originRemote || $destinationRemote) {
                $fee = max(0, (float) ($remotePolicy['flatFee'] ?? 0)) * $flatFeeFactor;
                if ($fee > 0) {
                    $total += $fee;
                    $policyBreakdown[] = [
                        'key' => 'remote_area_surcharge',
                        'amount' => round($fee, 2),
                    ];
                }
            }
        }

        $oversizePolicy = is_array($policyModules['oversizeOverweightRules'] ?? null) ? $policyModules['oversizeOverweightRules'] : [];
        if ((bool) ($oversizePolicy['enabled'] ?? false)) {
            $maxWeight = max(0.1, (float) ($oversizePolicy['maxWeightKg'] ?? 25));
            $overweightPerKg = max(0, (float) ($oversizePolicy['overweightPerKgFee'] ?? 0)) * $flatFeeFactor;
            $maxLength = max(1, (float) ($oversizePolicy['maxLengthCm'] ?? 120));
            $maxWidth = max(1, (float) ($oversizePolicy['maxWidthCm'] ?? 80));
            $maxHeight = max(1, (float) ($oversizePolicy['maxHeightCm'] ?? 80));
            $oversizeFlatFee = max(0, (float) ($oversizePolicy['oversizeFlatFee'] ?? 0)) * $flatFeeFactor;

            $overweightTotal = 0.0;
            $oversizeTotal = 0.0;
            foreach ($packages as $package) {
                $qty = max(1, (int) ($package['quantity'] ?? 1));
                $weight = max(0, (float) ($package['weightKg'] ?? 0));
                $length = max(0, (float) ($package['lengthCm'] ?? 0));
                $width = max(0, (float) ($package['widthCm'] ?? 0));
                $height = max(0, (float) ($package['heightCm'] ?? 0));

                $overweightKg = max(0, $weight - $maxWeight);
                if ($overweightKg > 0 && $overweightPerKg > 0) {
                    $overweightTotal += $overweightKg * $overweightPerKg * $qty;
                }

                $isOversize = $length > $maxLength || $width > $maxWidth || $height > $maxHeight;
                if ($isOversize && $oversizeFlatFee > 0) {
                    $oversizeTotal += $oversizeFlatFee * $qty;
                }
            }

            if ($overweightTotal > 0) {
                $total += $overweightTotal;
                $policyBreakdown[] = [
                    'key' => 'overweight_surcharge',
                    'amount' => round($overweightTotal, 2),
                ];
            }

            if ($oversizeTotal > 0) {
                $total += $oversizeTotal;
                $policyBreakdown[] = [
                    'key' => 'oversize_surcharge',
                    'amount' => round($oversizeTotal, 2),
                ];
            }
        }

        $timePolicy = is_array($policyModules['peakHolidaySurcharge'] ?? null) ? $policyModules['peakHolidaySurcharge'] : [];
        if ((bool) ($timePolicy['enabled'] ?? false)) {
            $pickupDate = isset($payload['shipment']['pickupDate']) && $payload['shipment']['pickupDate']
                ? Carbon::parse((string) $payload['shipment']['pickupDate'])
                : null;
            $pickupTime = isset($payload['shipment']['pickupWindowStart']) && $payload['shipment']['pickupWindowStart']
                ? trim((string) $payload['shipment']['pickupWindowStart'])
                : '';

            if ($pickupDate) {
                $holidayDates = collect($timePolicy['holidayDates'] ?? [])
                    ->map(fn($item) => trim((string) $item))
                    ->filter()
                    ->values()
                    ->all();

                if (in_array($pickupDate->format('Y-m-d'), $holidayDates, true)) {
                    $percentFee = $total * (max(0, (float) ($timePolicy['holidayPercent'] ?? 0)) / 100) * $percentBaseFactor;
                    $flatFee = max(0, (float) ($timePolicy['holidayFlatFee'] ?? 0)) * $flatFeeFactor;
                    $holidayFee = $percentFee + $flatFee;
                    if ($holidayFee > 0) {
                        $total += $holidayFee;
                        $policyBreakdown[] = [
                            'key' => 'holiday_surcharge',
                            'amount' => round($holidayFee, 2),
                        ];
                    }
                }

                $daysOfWeek = collect($timePolicy['daysOfWeek'] ?? [1, 2, 3, 4, 5])
                    ->map(fn($item) => (int) $item)
                    ->filter(fn($item) => $item >= 1 && $item <= 7)
                    ->values()
                    ->all();
                $start = trim((string) ($timePolicy['peakStartTime'] ?? '17:00'));
                $end = trim((string) ($timePolicy['peakEndTime'] ?? '21:00'));
                if ($pickupTime !== '' && in_array($pickupDate->dayOfWeekIso, $daysOfWeek, true) && $this->isWithinPeakWindow($pickupTime, $start, $end)) {
                    $percentFee = $total * (max(0, (float) ($timePolicy['peakPercent'] ?? 0)) / 100) * $percentBaseFactor;
                    $flatFee = max(0, (float) ($timePolicy['peakFlatFee'] ?? 0)) * $flatFeeFactor;
                    $peakFee = $percentFee + $flatFee;
                    if ($peakFee > 0) {
                        $total += $peakFee;
                        $policyBreakdown[] = [
                            'key' => 'peak_hour_surcharge',
                            'amount' => round($peakFee, 2),
                        ];
                    }
                }
            }
        }

        $codPolicy = is_array($policyModules['codFee'] ?? null) ? $policyModules['codFee'] : [];
        $codInScopeCategory = $category === 'domestic';
        if ((bool) ($codPolicy['enabled'] ?? false) && $codInScopeCategory && $codFeeBaseAmount > 0) {
            $flatFee = max(0, (float) ($codPolicy['flatFee'] ?? 0)) * $flatFeeFactor;
            $percentFee = $codFeeBaseAmount * (max(0, (float) ($codPolicy['percentOfDeclaredValue'] ?? 0)) / 100) * $percentBaseFactor;
            $codFee = $flatFee + $percentFee;

            $minFee = max(0, (float) ($codPolicy['minFee'] ?? 0)) * $flatFeeFactor;
            if ($codFee < $minFee) {
                $codFee = $minFee;
            }

            if (isset($codPolicy['maxFee']) && $codPolicy['maxFee'] !== null && $codPolicy['maxFee'] !== '') {
                $maxFee = max(0, (float) $codPolicy['maxFee']) * $flatFeeFactor;
                if ($maxFee > 0) {
                    $codFee = min($codFee, $maxFee);
                }
            }

            if ($codFee > 0) {
                $total += $codFee;
                $policyBreakdown[] = [
                    'key' => 'cod_fee',
                    'amount' => round($codFee, 2),
                ];
            }
        }

        $total = $this->applyCustomerContractPricing(
            $total,
            $payload,
            $policyModules,
            $policyBreakdown,
            (int) ($vendorId ?? 0),
            $category,
            $flatFeeFactor,
            $percentBaseFactor
        );

        $minimumPolicy = is_array($policyModules['minimumShipmentCharge'] ?? null) ? $policyModules['minimumShipmentCharge'] : [];
        if ((bool) ($minimumPolicy['enabled'] ?? true)) {
            $minimumTotal = max(0, (float) ($minimumPolicy['minimumTotal'] ?? 0)) * $flatFeeFactor;
            if ($minimumTotal > 0 && $total < $minimumTotal) {
                $minimumAdjustment = $minimumTotal - $total;
                $total = $minimumTotal;
                $policyBreakdown[] = [
                    'key' => 'minimum_shipment_guardrail',
                    'amount' => round($minimumAdjustment, 2),
                ];
            }
        }

        $total = $this->applyQuoteRuntimeGovernanceGuardrails($total, $payload, $policyModules, $policyBreakdown);

        return $total;
    }

    private function resolvePolicyAdjustmentAmount(array $policyBreakdown, string $key): float
    {
        $entry = collect($policyBreakdown)
            ->first(fn($item) => is_array($item) && (string) ($item['key'] ?? '') === $key);

        return $entry ? (float) ($entry['amount'] ?? 0) : 0.0;
    }

    private function normalizePolicyAdjustmentBreakdown(array $policyBreakdown): array
    {
        $policyOrder = [
            'international_dimensions_engine' => 10,
            'speed_eta_tier_multiplier' => 20,
            'remote_area_surcharge' => 30,
            'overweight_surcharge' => 40,
            'oversize_surcharge' => 50,
            'holiday_surcharge' => 60,
            'peak_hour_surcharge' => 70,
            'cod_fee' => 80,
            'contract_negotiated_rate_discount' => 90,
            'contract_negotiated_rate_override' => 100,
            'contract_negotiated_rate_multiplier' => 110,
            'contract_volume_tier_discount' => 120,
            'contract_volume_tier_override' => 130,
            'contract_volume_tier_multiplier' => 140,
            'contract_minimum_guardrail' => 150,
            'minimum_shipment_guardrail' => 160,
            'quote_runtime_discount_applied' => 170,
            'quote_runtime_discount_ceiling_guardrail' => 180,
            'quote_runtime_floor_price_guardrail' => 190,
        ];

        $normalized = collect($policyBreakdown)
            ->map(function ($item, $index) {
                $entry = is_array($item) ? $item : [];

                return [
                    'index' => (int) $index,
                    'key' => trim((string) ($entry['key'] ?? '')),
                    'amount' => round((float) ($entry['amount'] ?? 0), 2),
                ];
            })
            ->filter(fn($entry) => $entry['key'] !== '')
            ->values()
            ->all();

        usort($normalized, function (array $left, array $right) use ($policyOrder) {
            $leftRank = $policyOrder[$left['key']] ?? 1000;
            $rightRank = $policyOrder[$right['key']] ?? 1000;
            if ($leftRank !== $rightRank) {
                return $leftRank <=> $rightRank;
            }

            $keyCompare = strcmp($left['key'], $right['key']);
            if ($keyCompare !== 0) {
                return $keyCompare;
            }

            return ($left['index'] ?? 0) <=> ($right['index'] ?? 0);
        });

        return array_map(static function (array $entry): array {
            return [
                'key' => $entry['key'],
                'amount' => $entry['amount'],
            ];
        }, $normalized);
    }

    private function applyCustomerContractPricing(
        float $currentTotal,
        array $payload,
        array $policyModules,
        array &$policyBreakdown,
        int $vendorId,
        string $category,
        float $flatFeeFactor,
        float $percentBaseFactor
    ): float {
        $policy = is_array($policyModules['customerContractPricing'] ?? null)
            ? $policyModules['customerContractPricing']
            : [];
        if (!(bool) ($policy['enabled'] ?? false) || $vendorId <= 0) {
            return $currentTotal;
        }

        $reviewContext = is_array($payload['reviewContext'] ?? null) ? $payload['reviewContext'] : [];
        $accountUserId = (int) ($reviewContext['accountUserId'] ?? Auth::id());
        if ($accountUserId <= 0) {
            return $currentTotal;
        }

        $contract = $this->resolveActiveCustomerContract($policy, $accountUserId, $category);
        if (!$contract) {
            return $currentTotal;
        }

        $total = max(0, $currentTotal);

        $negotiatedType = $this->normalizeZoneKey((string) ($contract['negotiatedRateType'] ?? ''));
        $negotiatedValue = max(0, (float) ($contract['negotiatedRateValue'] ?? 0));
        if ($negotiatedType !== '' && $negotiatedValue > 0) {
            if ($negotiatedType === 'percent_off') {
                $discount = min($total, $total * ($negotiatedValue / 100) * $percentBaseFactor);
                if ($discount > 0) {
                    $total -= $discount;
                    $policyBreakdown[] = [
                        'key' => 'contract_negotiated_rate_discount',
                        'amount' => round(-1 * $discount, 2),
                    ];
                }
            } elseif ($negotiatedType === 'flat_off') {
                $discount = min($total, $negotiatedValue * $flatFeeFactor);
                if ($discount > 0) {
                    $total -= $discount;
                    $policyBreakdown[] = [
                        'key' => 'contract_negotiated_rate_discount',
                        'amount' => round(-1 * $discount, 2),
                    ];
                }
            } elseif ($negotiatedType === 'fixed_total') {
                $targetTotal = max(0, $negotiatedValue * $flatFeeFactor);
                $delta = $targetTotal - $total;
                $total = $targetTotal;
                if (abs($delta) > 0.0001) {
                    $policyBreakdown[] = [
                        'key' => 'contract_negotiated_rate_override',
                        'amount' => round($delta, 2),
                    ];
                }
            } elseif ($negotiatedType === 'multiplier') {
                $multiplier = max(0.01, $negotiatedValue);
                $before = $total;
                $total *= $multiplier;
                $delta = $total - $before;
                if (abs($delta) > 0.0001) {
                    $policyBreakdown[] = [
                        'key' => 'contract_negotiated_rate_multiplier',
                        'amount' => round($delta, 2),
                    ];
                }
            }
        }

        $volumeTiers = collect($contract['volumeTiers'] ?? [])
            ->map(fn($item) => is_array($item) ? $item : [])
            ->filter(fn($item) => (bool) ($item['enabled'] ?? true))
            ->values()
            ->all();
        if (!empty($volumeTiers)) {
            $metricValue = $this->resolveContractVolumeMetric($payload, $vendorId, $accountUserId, $category, $contract);
            $matchedTier = $this->resolveBestVolumeTier($metricValue, $volumeTiers);
            if ($matchedTier) {
                $tierType = $this->normalizeZoneKey((string) ($matchedTier['adjustmentType'] ?? ''));
                $tierValue = max(0, (float) ($matchedTier['adjustmentValue'] ?? 0));

                if ($tierType === 'percent_off' && $tierValue > 0) {
                    $discount = min($total, $total * ($tierValue / 100) * $percentBaseFactor);
                    if ($discount > 0) {
                        $total -= $discount;
                        $policyBreakdown[] = [
                            'key' => 'contract_volume_tier_discount',
                            'amount' => round(-1 * $discount, 2),
                        ];
                    }
                } elseif ($tierType === 'flat_off' && $tierValue > 0) {
                    $discount = min($total, $tierValue * $flatFeeFactor);
                    if ($discount > 0) {
                        $total -= $discount;
                        $policyBreakdown[] = [
                            'key' => 'contract_volume_tier_discount',
                            'amount' => round(-1 * $discount, 2),
                        ];
                    }
                } elseif ($tierType === 'multiplier' && $tierValue > 0) {
                    $multiplier = max(0.01, $tierValue);
                    $before = $total;
                    $total *= $multiplier;
                    $delta = $total - $before;
                    if (abs($delta) > 0.0001) {
                        $policyBreakdown[] = [
                            'key' => 'contract_volume_tier_multiplier',
                            'amount' => round($delta, 2),
                        ];
                    }
                } elseif ($tierType === 'fixed_total' && $tierValue > 0) {
                    $targetTotal = max(0, $tierValue * $flatFeeFactor);
                    $delta = $targetTotal - $total;
                    $total = $targetTotal;
                    if (abs($delta) > 0.0001) {
                        $policyBreakdown[] = [
                            'key' => 'contract_volume_tier_override',
                            'amount' => round($delta, 2),
                        ];
                    }
                }
            }
        }

        $contractMinimum = max(0, (float) ($contract['minimumTotal'] ?? 0)) * $flatFeeFactor;
        if ($contractMinimum > 0 && $total < $contractMinimum) {
            $delta = $contractMinimum - $total;
            $total = $contractMinimum;
            $policyBreakdown[] = [
                'key' => 'contract_minimum_guardrail',
                'amount' => round($delta, 2),
            ];
        }

        return max(0, $total);
    }

    private function resolveActiveCustomerContract(array $policy, int $accountUserId, string $category): ?array
    {
        $contracts = collect($policy['contracts'] ?? [])
            ->map(function ($item, $index) {
                return [
                    'contract' => is_array($item) ? $item : [],
                    'index' => (int) $index,
                ];
            })
            ->filter(fn($entry) => (bool) ($entry['contract']['enabled'] ?? true))
            ->values();
        if ($contracts->isEmpty()) {
            return null;
        }

        $now = Carbon::now();

        return $contracts
            ->filter(function (array $entry) use ($accountUserId, $category, $now) {
                $contract = is_array($entry['contract'] ?? null) ? $entry['contract'] : [];

                $accountIds = collect($contract['accountUserIds'] ?? [])
                    ->map(fn($item) => (int) $item)
                    ->filter(fn($item) => $item > 0)
                    ->values();
                $singleAccountId = (int) ($contract['accountUserId'] ?? 0);
                if ($singleAccountId > 0) {
                    $accountIds->push($singleAccountId);
                }
                $allAccounts = (bool) ($contract['allAccounts'] ?? false);
                if (!$allAccounts && $accountIds->isNotEmpty() && !$accountIds->contains($accountUserId)) {
                    return false;
                }

                $categories = collect($contract['categories'] ?? [])
                    ->map(fn($item) => $this->normalizeZoneKey((string) $item))
                    ->filter(fn($item) => $item !== '' && $item !== '*')
                    ->values();
                $contractCategory = $this->normalizeZoneKey((string) ($contract['category'] ?? ''));
                if ($contractCategory !== '*' && !$categories->contains($contractCategory)) {
                    $categories->push($contractCategory);
                }
                $normalizedCategory = $this->normalizeZoneKey($category);
                if ($categories->isNotEmpty() && $normalizedCategory !== '*' && !$categories->contains($normalizedCategory)) {
                    return false;
                }

                $effectiveFromRaw = trim((string) ($contract['effectiveFrom'] ?? ''));
                $effectiveToRaw = trim((string) ($contract['effectiveTo'] ?? ''));

                $effectiveFrom = $effectiveFromRaw !== '' ? Carbon::parse($effectiveFromRaw)->startOfDay() : null;
                $effectiveTo = $effectiveToRaw !== '' ? Carbon::parse($effectiveToRaw)->endOfDay() : null;

                if ($effectiveFrom && $now->lt($effectiveFrom)) {
                    return false;
                }

                if ($effectiveTo && $now->gt($effectiveTo)) {
                    if (!(bool) ($contract['autoRenew'] ?? false)) {
                        return false;
                    }

                    $renewalCycleDays = max(0, (int) ($contract['renewalCycleDays'] ?? 0));
                    $renewalGraceDays = max(0, (int) ($contract['renewalGraceDays'] ?? 0));
                    if ($renewalCycleDays <= 0) {
                        return $now->lte($effectiveTo->copy()->addDays($renewalGraceDays));
                    }

                    $maxRenewals = max(0, (int) ($contract['maxRenewals'] ?? 0));
                    $rollingEnd = $effectiveTo->copy();
                    $renewalCount = 0;
                    while ($rollingEnd->lt($now)) {
                        if ($maxRenewals > 0 && $renewalCount >= $maxRenewals) {
                            return false;
                        }
                        $rollingEnd->addDays($renewalCycleDays);
                        $renewalCount++;
                    }

                    return true;
                }

                return true;
            })
            ->sort(function (array $leftEntry, array $rightEntry) {
                $left = is_array($leftEntry['contract'] ?? null) ? $leftEntry['contract'] : [];
                $right = is_array($rightEntry['contract'] ?? null) ? $rightEntry['contract'] : [];

                $leftPriority = (int) ($left['priority'] ?? 0);
                $rightPriority = (int) ($right['priority'] ?? 0);
                if ($leftPriority !== $rightPriority) {
                    return $rightPriority <=> $leftPriority;
                }

                $leftFrom = trim((string) ($left['effectiveFrom'] ?? ''));
                $rightFrom = trim((string) ($right['effectiveFrom'] ?? ''));
                if ($leftFrom !== $rightFrom) {
                    return strcmp($rightFrom, $leftFrom);
                }

                $leftTo = trim((string) ($left['effectiveTo'] ?? ''));
                $rightTo = trim((string) ($right['effectiveTo'] ?? ''));
                if ($leftTo !== $rightTo) {
                    return strcmp($rightTo, $leftTo);
                }

                $leftAllAccounts = (bool) ($left['allAccounts'] ?? false);
                $rightAllAccounts = (bool) ($right['allAccounts'] ?? false);
                if ($leftAllAccounts !== $rightAllAccounts) {
                    return $leftAllAccounts <=> $rightAllAccounts;
                }

                return ((int) ($leftEntry['index'] ?? 0)) <=> ((int) ($rightEntry['index'] ?? 0));
            })
            ->map(fn($entry) => is_array($entry['contract'] ?? null) ? $entry['contract'] : null)
            ->filter()
            ->first();
    }

    private function resolveContractVolumeMetric(
        array $payload,
        int $vendorId,
        int $accountUserId,
        string $category,
        array $contract
    ): float {
        $metric = $this->normalizeZoneKey((string) ($contract['volumeMetric'] ?? 'shipment_count_30d'));
        $lookbackDays = max(1, (int) ($contract['volumeLookbackDays'] ?? 30));
        $since = Carbon::now()->subDays($lookbackDays);

        if ($metric === 'current_shipment_weight_kg') {
            return collect($payload['packages'] ?? [])->reduce(function ($carry, $package) {
                $item = is_array($package) ? $package : [];
                $qty = max(1, (int) ($item['quantity'] ?? 1));
                $weight = max(0, (float) ($item['weightKg'] ?? 0));

                return $carry + ($qty * $weight);
            }, 0.0);
        }

        $shipmentsQuery = CourierShipment::query()
            ->where('requested_by_user_id', $accountUserId)
            ->where('assigned_vendor_user_id', $vendorId)
            ->where('created_at', '>=', $since);

        $normalizedCategory = $this->normalizeZoneKey($category);
        if ($normalizedCategory !== '') {
            $shipmentsQuery->where('assignment_category', $normalizedCategory);
        }

        if ($metric === 'revenue_usd_30d') {
            return (float) $shipmentsQuery->sum('estimated_cost');
        }

        if ($metric === 'total_weight_kg_30d') {
            return (float) $shipmentsQuery
                ->with(['packages:id,courier_shipment_id,weight_kg,quantity'])
                ->get()
                ->sum(function (CourierShipment $shipment) {
                    return $shipment->packages->sum(function ($package) {
                        $qty = max(1, (int) ($package->quantity ?? 1));
                        $weight = max(0, (float) ($package->weight_kg ?? 0));

                        return $qty * $weight;
                    });
                });
        }

        return (float) $shipmentsQuery->count();
    }

    private function resolveBestVolumeTier(float $metricValue, array $volumeTiers): ?array
    {
        return collect($volumeTiers)
            ->map(function ($item, $index) {
                return [
                    'tier' => is_array($item) ? $item : [],
                    'index' => (int) $index,
                ];
            })
            ->filter(function (array $entry) use ($metricValue) {
                $tier = is_array($entry['tier'] ?? null) ? $entry['tier'] : [];
                $minVolume = max(0, (float) ($tier['minVolume'] ?? 0));
                $hasMaxVolume = isset($tier['maxVolume']) && $tier['maxVolume'] !== null && $tier['maxVolume'] !== '';
                $maxVolume = $hasMaxVolume ? max($minVolume, (float) $tier['maxVolume']) : null;

                if ($metricValue < $minVolume) {
                    return false;
                }

                return $maxVolume === null ? true : $metricValue <= $maxVolume;
            })
            ->sort(function (array $leftEntry, array $rightEntry) {
                $left = is_array($leftEntry['tier'] ?? null) ? $leftEntry['tier'] : [];
                $right = is_array($rightEntry['tier'] ?? null) ? $rightEntry['tier'] : [];

                $leftMin = max(0, (float) ($left['minVolume'] ?? 0));
                $rightMin = max(0, (float) ($right['minVolume'] ?? 0));
                if ($leftMin !== $rightMin) {
                    return $rightMin <=> $leftMin;
                }

                $leftHasMax = isset($left['maxVolume']) && $left['maxVolume'] !== null && $left['maxVolume'] !== '';
                $rightHasMax = isset($right['maxVolume']) && $right['maxVolume'] !== null && $right['maxVolume'] !== '';
                if ($leftHasMax !== $rightHasMax) {
                    return $leftHasMax ? -1 : 1;
                }

                if ($leftHasMax && $rightHasMax) {
                    $leftMax = max($leftMin, (float) $left['maxVolume']);
                    $rightMax = max($rightMin, (float) $right['maxVolume']);
                    if ($leftMax !== $rightMax) {
                        return $leftMax <=> $rightMax;
                    }
                }

                return ((int) ($leftEntry['index'] ?? 0)) <=> ((int) ($rightEntry['index'] ?? 0));
            })
            ->map(fn($entry) => is_array($entry['tier'] ?? null) ? $entry['tier'] : null)
            ->filter()
            ->first();
    }

    private function assertQuoteRuntimeGovernanceFieldLocks(array $payload, array $policyModules): void
    {
        $governance = is_array($policyModules['quoteRuntimeGovernance'] ?? null)
            ? $policyModules['quoteRuntimeGovernance']
            : [];
        if (!(bool) ($governance['enabled'] ?? false)) {
            return;
        }

        $fieldLocks = is_array($governance['fieldLocks'] ?? null) ? $governance['fieldLocks'] : [];
        if (!(bool) ($fieldLocks['enabled'] ?? false)) {
            return;
        }

        $selectedQuotes = collect($payload['reviewContext']['selectedQuotes'] ?? [])->map(fn($item) => is_array($item) ? $item : [])->values();
        $errors = [];

        if ((bool) ($fieldLocks['lockShipmentServiceLevel'] ?? true) && $selectedQuotes->isNotEmpty()) {
            $selectedServiceLevel = $this->normalizeServiceLevelKey((string) ($selectedQuotes->first()['serviceLevel'] ?? ''));
            $requestedShipmentServiceLevel = $this->normalizeServiceLevelKey((string) (
                $payload['reviewContext']['requestedShipmentServiceLevel']
                ?? ($payload['shipment']['serviceLevel'] ?? '')
            ));
            if ($selectedServiceLevel !== '' && $requestedShipmentServiceLevel !== '' && $selectedServiceLevel !== $requestedShipmentServiceLevel) {
                $errors['shipment.serviceLevel'] = 'Shipment service level is locked by pricing governance and must match the selected quote.';
            }
        }

        if ((bool) ($fieldLocks['lockPackageServiceLevel'] ?? true)) {
            $packages = collect($payload['packages'] ?? [])->map(fn($item) => is_array($item) ? $item : [])->values();
            foreach ($packages as $index => $package) {
                $quote = is_array($selectedQuotes->get($index)) ? $selectedQuotes->get($index) : [];
                if (empty($quote)) {
                    continue;
                }

                $packageLevel = $this->normalizeServiceLevelKey((string) ($package['serviceLevel'] ?? ''));
                $quoteLevel = $this->normalizeServiceLevelKey((string) ($quote['serviceLevel'] ?? ''));
                if ($packageLevel !== '' && $quoteLevel !== '' && $packageLevel !== $quoteLevel) {
                    $errors["packages.{$index}.serviceLevel"] = 'Package service level is locked by pricing governance and must match the selected quote tier.';
                }
            }
        }

        if ((bool) ($fieldLocks['lockPackageCourierProvider'] ?? true)) {
            $packages = collect($payload['packages'] ?? [])->map(fn($item) => is_array($item) ? $item : [])->values();
            foreach ($packages as $index => $package) {
                $quote = is_array($selectedQuotes->get($index)) ? $selectedQuotes->get($index) : [];
                if (empty($quote)) {
                    continue;
                }

                $packageProvider = $this->normalizeZoneKey((string) ($package['courierProvider'] ?? ''));
                $quoteProvider = $this->normalizeZoneKey((string) ($quote['providerId'] ?? ''));
                if ($packageProvider !== '' && $quoteProvider !== '' && $packageProvider !== $quoteProvider) {
                    $errors["packages.{$index}.courierProvider"] = 'Courier provider is locked by pricing governance and must match the selected quote provider.';
                }
            }
        }

        if ((bool) ($fieldLocks['lockQuoteTotal'] ?? true)) {
            $selectedQuoteTotal = (float) $selectedQuotes->reduce(
                fn($carry, $quote) => $carry + (float) ($quote['priceUSD'] ?? 0),
                0.0
            );
            $reviewTotal = max(0, (float) ($payload['reviewContext']['totalPriceUSD'] ?? 0));
            if (abs($reviewTotal - $selectedQuoteTotal) > 0.01) {
                $errors['reviewContext.totalPriceUSD'] = 'Quote total is locked by pricing governance and must equal the sum of selected quotes.';
            }
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function applyQuoteRuntimeGovernanceGuardrails(
        float $currentTotal,
        array $payload,
        array $policyModules,
        array &$policyBreakdown
    ): float {
        $governance = is_array($policyModules['quoteRuntimeGovernance'] ?? null)
            ? $policyModules['quoteRuntimeGovernance']
            : [];
        if (!(bool) ($governance['enabled'] ?? false)) {
            return $currentTotal;
        }

        $total = max(0, $currentTotal);
        $reviewContext = is_array($payload['reviewContext'] ?? null) ? $payload['reviewContext'] : [];
        $requestedDiscountPercent = max(0, (float) ($reviewContext['discountPercent'] ?? 0));
        $requestedDiscountAmount = max(0, (float) ($reviewContext['discountAmountUSD'] ?? 0));

        $discountGuardrails = is_array($governance['discountGuardrails'] ?? null) ? $governance['discountGuardrails'] : [];
        if ((bool) ($discountGuardrails['enabled'] ?? false) && ($requestedDiscountPercent > 0 || $requestedDiscountAmount > 0)) {
            $maxDiscountPercent = max(0, (float) ($discountGuardrails['maxDiscountPercent'] ?? 0));
            $maxDiscountAmount = max(0, (float) ($discountGuardrails['maxDiscountAmountUsd'] ?? 0));

            $cappedPercent = min($requestedDiscountPercent, $maxDiscountPercent);
            $cappedAmount = min($requestedDiscountAmount, $maxDiscountAmount);
            $requestedTotalDiscount = ($total * ($requestedDiscountPercent / 100)) + $requestedDiscountAmount;
            $allowedTotalDiscount = ($total * ($cappedPercent / 100)) + $cappedAmount;
            $effectiveDiscount = min($total, max(0, $allowedTotalDiscount));

            if ($effectiveDiscount > 0) {
                $total -= $effectiveDiscount;
                $policyBreakdown[] = [
                    'key' => 'quote_runtime_discount_applied',
                    'amount' => round(-1 * $effectiveDiscount, 2),
                ];
            }

            if ($requestedTotalDiscount - $allowedTotalDiscount > 0.0001) {
                $policyBreakdown[] = [
                    'key' => 'quote_runtime_discount_ceiling_guardrail',
                    'amount' => round($requestedTotalDiscount - $allowedTotalDiscount, 2),
                ];
            }
        }

        $floorGuardrail = is_array($governance['floorPriceGuardrail'] ?? null) ? $governance['floorPriceGuardrail'] : [];
        if ((bool) ($floorGuardrail['enabled'] ?? false)) {
            $minimumTotal = max(0, (float) ($floorGuardrail['minimumTotalUsd'] ?? 0));
            if ($minimumTotal > 0 && $total < $minimumTotal) {
                $floorAdjustment = $minimumTotal - $total;
                $total = $minimumTotal;
                $policyBreakdown[] = [
                    'key' => 'quote_runtime_floor_price_guardrail',
                    'amount' => round($floorAdjustment, 2),
                ];
            }
        }

        return $total;
    }

    private function resolveSpeedEtaTierProjection(array $policyModules, string $selectedLevelKey, array $payload): ?array
    {
        $tierEngine = is_array($policyModules['speedEtaTierEngine'] ?? null) ? $policyModules['speedEtaTierEngine'] : [];
        if (!(bool) ($tierEngine['enabled'] ?? false)) {
            return null;
        }

        $tiers = is_array($tierEngine['tiers'] ?? null) ? $tierEngine['tiers'] : [];
        $tier = is_array($tiers[$selectedLevelKey] ?? null) ? $tiers[$selectedLevelKey] : null;
        if (!$tier) {
            return null;
        }

        $etaMinDays = max(0, (int) ($tier['etaMinDays'] ?? 0));
        $etaMaxDays = isset($tier['etaMaxDays']) && $tier['etaMaxDays'] !== null && $tier['etaMaxDays'] !== ''
            ? max($etaMinDays, (int) $tier['etaMaxDays'])
            : null;

        $pickupDate = isset($payload['shipment']['pickupDate']) && $payload['shipment']['pickupDate']
            ? Carbon::parse((string) $payload['shipment']['pickupDate'])
            : null;
        $etaStartDate = $pickupDate ? $pickupDate->copy()->addDays($etaMinDays)->format('Y-m-d') : null;
        $etaEndDate = $pickupDate
            ? ($etaMaxDays !== null ? $pickupDate->copy()->addDays($etaMaxDays)->format('Y-m-d') : null)
            : null;

        return [
            'tierKey' => $selectedLevelKey,
            'tierLabel' => ucwords(str_replace('_', ' ', $selectedLevelKey)),
            'etaLabel' => trim((string) ($tier['etaLabel'] ?? '')),
            'etaMinDays' => $etaMinDays,
            'etaMaxDays' => $etaMaxDays,
            'enforceTierPricingMultiplier' => (bool) ($tierEngine['enforceTierPricingMultiplier'] ?? true),
            'priceMultiplier' => max(0.1, (float) ($tier['priceMultiplier'] ?? 1)),
            'etaStartDate' => $etaStartDate,
            'etaEndDate' => $etaEndDate,
        ];
    }

    private function resolveInternationalDimensionsProjection(array $policyModules, array $payload, string $category): ?array
    {
        $engine = is_array($policyModules['internationalDimensionsEngine'] ?? null)
            ? $policyModules['internationalDimensionsEngine']
            : [];
        if (!(bool) ($engine['enabled'] ?? false)) {
            return null;
        }

        if ((bool) ($engine['enforceForInternationalOnly'] ?? true) && $category !== 'international') {
            return null;
        }

        $dimensions = is_array($payload['shipment']['internationalDimensions'] ?? null)
            ? $payload['shipment']['internationalDimensions']
            : [];
        $unitType = $this->normalizeZoneKey((string) ($dimensions['unitType'] ?? ''));
        $routeClass = $this->normalizeZoneKey((string) ($dimensions['routeClass'] ?? ''));
        $handlingClass = $this->normalizeZoneKey((string) ($dimensions['handlingClass'] ?? ''));
        $w2wMode = $this->normalizeZoneKey((string) ($dimensions['w2wMode'] ?? ''));
        $unitCount = max(0, (int) ($dimensions['unitCount'] ?? 0));

        $unitTypeMultiplier = max(
            0.1,
            (float) ((is_array($engine['unitTypeMultipliers'] ?? null) ? $engine['unitTypeMultipliers'] : [])[$unitType] ?? 1)
        );
        $routeClassMultiplier = max(
            0.1,
            (float) ((is_array($engine['routeClassMultipliers'] ?? null) ? $engine['routeClassMultipliers'] : [])[$routeClass] ?? 1)
        );
        $handlingClassMultiplier = max(
            0.1,
            (float) ((is_array($engine['handlingClassMultipliers'] ?? null) ? $engine['handlingClassMultipliers'] : [])[$handlingClass] ?? 1)
        );

        $w2wOption = is_array($engine['w2wOption'] ?? null) ? $engine['w2wOption'] : [];
        $defaultMode = $this->normalizeZoneKey((string) ($w2wOption['defaultMode'] ?? ''));
        $effectiveMode = $w2wMode !== '' ? $w2wMode : $defaultMode;
        $w2wMultiplier = max(
            0.1,
            (float) ((is_array($w2wOption['modeMultipliers'] ?? null) ? $w2wOption['modeMultipliers'] : [])[$effectiveMode] ?? 1)
        );

        return [
            'unitType' => $unitType,
            'unitCount' => $unitCount,
            'routeClass' => $routeClass,
            'handlingClass' => $handlingClass,
            'w2wMode' => $effectiveMode,
            'unitTypeMultiplier' => $unitTypeMultiplier,
            'routeClassMultiplier' => $routeClassMultiplier,
            'handlingClassMultiplier' => $handlingClassMultiplier,
            'w2wMultiplier' => $w2wMultiplier,
            'totalMultiplier' => $unitTypeMultiplier * $routeClassMultiplier * $handlingClassMultiplier * $w2wMultiplier,
        ];
    }

    private function addressMatchesRemotePolicy(array $address, array $remotePolicy): bool
    {
        $postalPrefixes = collect($remotePolicy['postalCodePrefixes'] ?? [])
            ->map(fn($item) => strtoupper(trim((string) $item)))
            ->filter()
            ->values();
        $cityKeywords = collect($remotePolicy['cityKeywords'] ?? [])
            ->map(fn($item) => strtolower(trim((string) $item)))
            ->filter()
            ->values();

        $postal = strtoupper(trim((string) ($address['postalCode'] ?? '')));
        $cityState = strtolower(trim((string) (($address['city'] ?? '') . ' ' . ($address['state'] ?? ''))));

        if ($postalPrefixes->contains(fn($prefix) => $prefix !== '' && str_starts_with($postal, $prefix))) {
            return true;
        }

        return $cityKeywords->contains(fn($keyword) => $keyword !== '' && str_contains($cityState, $keyword));
    }

    private function isWithinPeakWindow(string $pickupTime, string $start, string $end): bool
    {
        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $pickupTime) !== 1) {
            return false;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $start) !== 1 || preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $end) !== 1) {
            return false;
        }

        if ($start <= $end) {
            return $pickupTime >= $start && $pickupTime <= $end;
        }

        return $pickupTime >= $start || $pickupTime <= $end;
    }

    private function assertShipmentServiceCatalogPolicy(CourierShipment $shipment, array $payload): void
    {
        $category = (string) ($shipment->assignment_category ?: $this->resolvePayloadCategory($payload));
        $selectedLevelKey = $this->normalizeServiceLevelKey((string) ($payload['shipment']['serviceLevel'] ?? ''));
        $catalog = $this->resolveServiceCatalogForVendor((int) ($shipment->assigned_vendor_user_id ?? 0), $category);

        $selectedEntry = collect($catalog)
            ->first(fn($item) => (bool) ($item['isActive'] ?? false) && (string) ($item['key'] ?? '') === $selectedLevelKey);

        if (!$selectedEntry) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => 'Selected service level is not available for the assigned courier service catalog.',
            ]);
        }

        $cutoff = trim((string) ($selectedEntry['cutoffTime'] ?? ''));
        $pickupDate = isset($payload['shipment']['pickupDate']) && $payload['shipment']['pickupDate']
            ? Carbon::parse((string) $payload['shipment']['pickupDate'])
            : null;
        $pickupStart = isset($payload['shipment']['pickupWindowStart']) && $payload['shipment']['pickupWindowStart']
            ? (string) $payload['shipment']['pickupWindowStart']
            : null;

        if ($cutoff !== '' && $pickupDate && $pickupDate->isToday() && now()->format('H:i') > $cutoff) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => "{$selectedEntry['label']} service is closed for today's cutoff ({$cutoff}).",
            ]);
        }

        if ($cutoff !== '' && $pickupStart && $pickupStart > $cutoff) {
            throw ValidationException::withMessages([
                'shipment.pickupWindowStart' => "Pickup start must be before service cutoff time ({$cutoff}) for {$selectedEntry['label']}.",
            ]);
        }

        $this->assertSpeedEtaTierPolicyConstraints($shipment, $payload, $category, $selectedLevelKey, $selectedEntry);
        $this->assertInternationalDimensionsPolicyConstraints($shipment, $payload, $category);
    }

    private function assertShipmentCODPolicy(CourierShipment $shipment, array $payload, array $codRequest): array
    {
        if (!(bool) ($codRequest['enabled'] ?? false)) {
            return [];
        }

        $category = (string) ($shipment->assignment_category ?: $this->resolvePayloadCategory($payload));
        if ($category !== 'domestic') {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'Cash on Delivery is available only for domestic routes.',
            ]);
        }

        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        if ($vendorId <= 0) {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'COD booking is not available until a courier vendor is assigned.',
            ]);
        }

        $capability = $this->resolveApprovedVendorCodCapability($vendorId, $category);
        if (!$capability) {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'Selected courier vendor does not have approved COD capability.',
            ]);
        }

        $servicePolicy = $this->resolveVendorCodServicePolicy($vendorId);
        if (!(bool) ($servicePolicy['acceptCodAtCheckout'] ?? false) || !(bool) ($servicePolicy['allowCodForDomestic'] ?? false)) {
            throw ValidationException::withMessages([
                'shipment.codEnabled' => 'Selected courier vendor has COD disabled for domestic checkout.',
            ]);
        }

        return [
            'capabilityId' => (int) $capability->id,
            'policySnapshot' => [
                'enabled' => true,
                'requestedAmount' => isset($codRequest['requestedAmount']) ? (float) $codRequest['requestedAmount'] : null,
                'requestedMethod' => $codRequest['requestedMethod'] ?? null,
                'assignmentCategory' => $category,
                'vendorUserId' => $vendorId,
                'capability' => [
                    'id' => (int) $capability->id,
                    'status' => (string) ($capability->status ?? CourierVendorCodCapability::STATUS_NOT_REQUESTED),
                    'approvedAt' => optional($capability->approved_at)->format('Y-m-d H:i:s'),
                ],
                'servicePolicy' => $servicePolicy,
            ],
        ];
    }

    private function resolveApprovedVendorCodCapability(int $vendorId, string $category = 'domestic'): ?CourierVendorCodCapability
    {
        if ($vendorId <= 0) {
            return null;
        }

        $normalizedCategory = CourierVendorCodCapability::normalizeCategory($category);

        return CourierVendorCodCapability::query()
            ->where('vendor_user_id', $vendorId)
            ->where('category', $normalizedCategory)
            ->where('status', CourierVendorCodCapability::STATUS_APPROVED)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();
    }

    private function resolveVendorCodServicePolicy(int $vendorId): array
    {
        $settings = VendorCourierSetting::query()
            ->where('vendor_user_id', $vendorId)
            ->value('settings');

        return $this->resolveVendorCodServicePolicyFromSettings(is_array($settings) ? $settings : []);
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, bool>
     */
    private function resolveVendorCodServicePolicyFromSettings(array $settings): array
    {
        $cod = is_array($settings['services']['cod'] ?? null)
            ? $settings['services']['cod']
            : [];

        return [
            'acceptCodAtCheckout' => (bool) ($cod['acceptCodAtCheckout'] ?? false),
            'allowCodForDomestic' => (bool) ($cod['allowCodForDomestic'] ?? false),
            'allowCodForInternational' => false,
            'allowTeamOverride' => (bool) ($cod['allowTeamOverride'] ?? false),
        ];
    }

    private function assertSpeedEtaTierPolicyConstraints(
        CourierShipment $shipment,
        array $payload,
        string $category,
        string $selectedLevelKey,
        array $selectedEntry
    ): void {
        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        if ($vendorId <= 0) {
            return;
        }

        $pricingConfig = $this->resolveCategoryPricingConfigForVendor($vendorId, $category);
        $policyModules = is_array($pricingConfig['policyModules'] ?? null) ? $pricingConfig['policyModules'] : [];
        $tierEngine = is_array($policyModules['speedEtaTierEngine'] ?? null) ? $policyModules['speedEtaTierEngine'] : [];

        if (!(bool) ($tierEngine['enabled'] ?? false)) {
            return;
        }

        $tiers = is_array($tierEngine['tiers'] ?? null) ? $tierEngine['tiers'] : [];
        $selectedTier = is_array($tiers[$selectedLevelKey] ?? null) ? $tiers[$selectedLevelKey] : null;
        $requiresFixedNamedTier = (bool) ($tierEngine['enforceFixedNamedTiers'] ?? true);
        if ($requiresFixedNamedTier && !$selectedTier) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => 'Selected service level is not part of the fixed speed/ETA tier engine.',
            ]);
        }

        if (!$selectedTier) {
            return;
        }

        if (!(bool) ($selectedTier['enabled'] ?? true)) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => 'Selected service tier is currently disabled by speed/ETA policy controls.',
            ]);
        }

        $pickupDate = isset($payload['shipment']['pickupDate']) && $payload['shipment']['pickupDate']
            ? Carbon::parse((string) $payload['shipment']['pickupDate'])
            : null;
        $pickupStart = isset($payload['shipment']['pickupWindowStart']) && $payload['shipment']['pickupWindowStart']
            ? trim((string) $payload['shipment']['pickupWindowStart'])
            : '00:00';

        if ($pickupDate) {
            $allowedPickupDays = collect($selectedTier['allowedPickupDays'] ?? [1, 2, 3, 4, 5, 6, 7])
                ->map(fn($value) => (int) $value)
                ->filter(fn($value) => $value >= 1 && $value <= 7)
                ->values()
                ->all();
            if (!empty($allowedPickupDays) && !in_array($pickupDate->dayOfWeekIso, $allowedPickupDays, true)) {
                throw ValidationException::withMessages([
                    'shipment.pickupDate' => 'Selected pickup date is not allowed for this service tier.',
                ]);
            }

            $blackoutDates = collect($selectedTier['blackoutDates'] ?? [])
                ->map(fn($value) => trim((string) $value))
                ->filter()
                ->values()
                ->all();
            if (in_array($pickupDate->format('Y-m-d'), $blackoutDates, true)) {
                throw ValidationException::withMessages([
                    'shipment.pickupDate' => 'Selected pickup date is blocked by tier blackout policy.',
                ]);
            }

            $pickupDateTime = Carbon::parse($pickupDate->format('Y-m-d') . ' ' . (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $pickupStart) === 1 ? $pickupStart : '00:00'));
            $leadHours = now()->diffInMinutes($pickupDateTime, false) / 60;
            $minLeadHours = max(0, (float) ($selectedTier['minLeadHours'] ?? 0));
            if ($leadHours < $minLeadHours) {
                throw ValidationException::withMessages([
                    'shipment.pickupWindowStart' => 'Pickup lead time is below the minimum allowed for this service tier.',
                ]);
            }

            if (isset($selectedTier['maxLeadHours']) && $selectedTier['maxLeadHours'] !== null && $selectedTier['maxLeadHours'] !== '') {
                $maxLeadHours = max($minLeadHours, (float) $selectedTier['maxLeadHours']);
                if ($leadHours > $maxLeadHours) {
                    throw ValidationException::withMessages([
                        'shipment.pickupWindowStart' => 'Pickup lead time exceeds the maximum window allowed for this service tier.',
                    ]);
                }
            }
        }

        if (isset($selectedTier['maxDistanceKm']) && $selectedTier['maxDistanceKm'] !== null && $selectedTier['maxDistanceKm'] !== '') {
            $distanceKm = $this->resolveDistanceKmFromPayload($payload);
            if ($distanceKm !== null && $distanceKm > (float) $selectedTier['maxDistanceKm']) {
                throw ValidationException::withMessages([
                    'shipment.distanceKm' => 'Route distance exceeds the maximum allowed for this service tier.',
                ]);
            }
        }

        if (isset($selectedTier['maxWeightKg']) && $selectedTier['maxWeightKg'] !== null && $selectedTier['maxWeightKg'] !== '') {
            $maxPackageWeight = collect($payload['packages'] ?? [])
                ->map(fn($item) => max(0, (float) ((is_array($item) ? ($item['weightKg'] ?? 0) : 0))))
                ->max();
            if ($maxPackageWeight !== null && $maxPackageWeight > (float) $selectedTier['maxWeightKg']) {
                throw ValidationException::withMessages([
                    'packages' => 'At least one package exceeds the maximum weight allowed for this service tier.',
                ]);
            }
        }

        $promisedSlaDays = max(1, (int) ($selectedEntry['promisedSlaDays'] ?? 1));
        $etaMinDays = max(0, (int) ($selectedTier['etaMinDays'] ?? 0));
        $etaMaxDays = isset($selectedTier['etaMaxDays']) && $selectedTier['etaMaxDays'] !== null && $selectedTier['etaMaxDays'] !== ''
            ? max($etaMinDays, (int) $selectedTier['etaMaxDays'])
            : null;

        if ($promisedSlaDays < $etaMinDays || ($etaMaxDays !== null && $promisedSlaDays > $etaMaxDays)) {
            throw ValidationException::withMessages([
                'shipment.serviceLevel' => 'Selected service level SLA is outside the allowed speed/ETA tier range.',
            ]);
        }
    }

    private function assertInternationalDimensionsPolicyConstraints(CourierShipment $shipment, array $payload, string $category): void
    {
        $vendorId = (int) ($shipment->assigned_vendor_user_id ?? 0);
        if ($vendorId <= 0) {
            return;
        }

        $pricingConfig = $this->resolveCategoryPricingConfigForVendor($vendorId, $category);
        $policyModules = is_array($pricingConfig['policyModules'] ?? null) ? $pricingConfig['policyModules'] : [];
        $engine = is_array($policyModules['internationalDimensionsEngine'] ?? null)
            ? $policyModules['internationalDimensionsEngine']
            : [];

        if (!(bool) ($engine['enabled'] ?? false)) {
            return;
        }

        if ((bool) ($engine['enforceForInternationalOnly'] ?? true) && $category !== 'international') {
            return;
        }

        $dimensions = is_array($payload['shipment']['internationalDimensions'] ?? null) ? $payload['shipment']['internationalDimensions'] : [];
        $unitType = $this->normalizeZoneKey((string) ($dimensions['unitType'] ?? ''));
        $routeClass = $this->normalizeZoneKey((string) ($dimensions['routeClass'] ?? ''));
        $handlingClass = $this->normalizeZoneKey((string) ($dimensions['handlingClass'] ?? ''));
        $w2wMode = $this->normalizeZoneKey((string) ($dimensions['w2wMode'] ?? ''));
        $unitCount = max(0, (int) ($dimensions['unitCount'] ?? 0));

        if ($category === 'international' && ($unitType === '' || $routeClass === '' || $handlingClass === '')) {
            throw ValidationException::withMessages([
                'shipment.internationalDimensions' => 'international unit type, route class, and handling class are required for international shipments.',
            ]);
        }

        $unitTypeMap = is_array($engine['unitTypeMultipliers'] ?? null) ? $engine['unitTypeMultipliers'] : [];
        $routeClassMap = is_array($engine['routeClassMultipliers'] ?? null) ? $engine['routeClassMultipliers'] : [];
        $handlingClassMap = is_array($engine['handlingClassMultipliers'] ?? null) ? $engine['handlingClassMultipliers'] : [];
        if ($unitType !== '' && !array_key_exists($unitType, $unitTypeMap)) {
            throw ValidationException::withMessages([
                'shipment.internationalDimensions.unitType' => 'Selected unit type is not allowed by international dimension policy.',
            ]);
        }

        if ($routeClass !== '' && !array_key_exists($routeClass, $routeClassMap)) {
            throw ValidationException::withMessages([
                'shipment.internationalDimensions.routeClass' => 'Selected route class is not allowed by international dimension policy.',
            ]);
        }

        if ($handlingClass !== '' && !array_key_exists($handlingClass, $handlingClassMap)) {
            throw ValidationException::withMessages([
                'shipment.internationalDimensions.handlingClass' => 'Selected handling class is not allowed by international dimension policy.',
            ]);
        }

        $w2wOption = is_array($engine['w2wOption'] ?? null) ? $engine['w2wOption'] : [];
        $w2wEnabled = (bool) ($w2wOption['enabled'] ?? true);
        if ($w2wEnabled) {
            $modeMap = is_array($w2wOption['modeMultipliers'] ?? null) ? $w2wOption['modeMultipliers'] : [];
            $defaultMode = $this->normalizeZoneKey((string) ($w2wOption['defaultMode'] ?? ''));
            $effectiveMode = $w2wMode !== '' ? $w2wMode : $defaultMode;

            if ((bool) ($w2wOption['strictForInternational'] ?? true) && $category === 'international' && $effectiveMode === '') {
                throw ValidationException::withMessages([
                    'shipment.internationalDimensions.w2wMode' => 'A warehouse-to-warehouse mode is required for international shipments.',
                ]);
            }

            if ($effectiveMode !== '' && !array_key_exists($effectiveMode, $modeMap)) {
                throw ValidationException::withMessages([
                    'shipment.internationalDimensions.w2wMode' => 'Selected warehouse-to-warehouse mode is not allowed by policy.',
                ]);
            }
        }

        $minUnits = max(1, (int) ($w2wOption['minimumUnitCount'] ?? 1));
        if ($unitCount > 0 && $unitCount < $minUnits) {
            throw ValidationException::withMessages([
                'shipment.internationalDimensions.unitCount' => 'Unit count is below the minimum allowed by international policy.',
            ]);
        }

        if (isset($w2wOption['maximumUnitCount']) && $w2wOption['maximumUnitCount'] !== null && $w2wOption['maximumUnitCount'] !== '') {
            $maxUnits = max($minUnits, (int) $w2wOption['maximumUnitCount']);
            if ($unitCount > 0 && $unitCount > $maxUnits) {
                throw ValidationException::withMessages([
                    'shipment.internationalDimensions.unitCount' => 'Unit count exceeds the maximum allowed by international policy.',
                ]);
            }
        }
    }

    private function resolveCreateQuoteProviders(): array
    {
        $registrations = VendorServiceRegistration::query()
            ->where('status', 'approved')
            ->whereHas('user', function ($query) {
                $query->whereIn('status', ['verified', 'Verified']);
            })
            ->whereHas('serviceCategory', function ($query) {
                $query->where('slug', 'courier-services');
            })
            ->whereHas('serviceSubCategory', function ($query) {
                $query->whereIn('slug', ['domestic', 'international']);
            })
            ->with([
                'user:id,name,status',
                'user.vendorProfile:id,user_id,company_name,logo,city,country',
                'serviceSubCategory:id,slug,name',
            ])
            ->get();

        if ($registrations->isEmpty()) {
            return [];
        }

        $vendorIds = $registrations
            ->pluck('user_id')
            ->map(fn($value) => (int) $value)
            ->filter(fn(int $value) => $value > 0)
            ->unique()
            ->values();

        $settingsByVendor = VendorCourierSetting::query()
            ->whereIn('vendor_user_id', $vendorIds)
            ->pluck('settings', 'vendor_user_id')
            ->all();

        $approvedDomesticCodVendorLookup = CourierVendorCodCapability::query()
            ->whereIn('vendor_user_id', $vendorIds)
            ->where('category', CourierVendorCodCapability::CATEGORY_DOMESTIC)
            ->where('status', CourierVendorCodCapability::STATUS_APPROVED)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->pluck('vendor_user_id')
            ->map(fn($value) => (int) $value)
            ->filter(fn(int $value) => $value > 0)
            ->unique()
            ->mapWithKeys(fn(int $value) => [$value => true])
            ->all();

        return $registrations
            ->map(function (VendorServiceRegistration $registration) use ($approvedDomesticCodVendorLookup, $settingsByVendor) {
                $vendorId = (int) $registration->user_id;
                $vendorSettings = $settingsByVendor[$vendorId] ?? [];

                if (is_string($vendorSettings)) {
                    $decodedSettings = json_decode($vendorSettings, true);
                    $vendorSettings = is_array($decodedSettings) ? $decodedSettings : [];
                }

                return $this->mapRegistrationToCreateQuoteProvider(
                    $registration,
                    is_array($vendorSettings) ? $vendorSettings : [],
                    $approvedDomesticCodVendorLookup
                );
            })
            ->filter()
            ->sort(function (array $left, array $right) {
                $leftCategoryOrder = ($left['category'] ?? 'international') === 'domestic' ? 0 : 1;
                $rightCategoryOrder = ($right['category'] ?? 'international') === 'domestic' ? 0 : 1;

                if ($leftCategoryOrder !== $rightCategoryOrder) {
                    return $leftCategoryOrder <=> $rightCategoryOrder;
                }

                return strcasecmp((string) ($left['name'] ?? ''), (string) ($right['name'] ?? ''));
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<int, bool>  $approvedDomesticCodVendorLookup
     */
    private function mapRegistrationToCreateQuoteProvider(
        VendorServiceRegistration $registration,
        array $settings,
        array $approvedDomesticCodVendorLookup = []
    ): ?array {
        $category = $this->normalizeQuoteProviderCategory((string) optional($registration->serviceSubCategory)->slug);
        $vendor = $registration->user;

        if (!$vendor || $category === null) {
            return null;
        }

        if (!in_array((string) ($vendor->status ?? ''), ['verified', 'Verified'], true)) {
            return null;
        }

        $profile = $vendor->vendorProfile;
        $providerName = trim((string) ($profile?->company_name ?? $vendor->name ?? 'Courier Vendor'));
        if ($providerName === '') {
            $providerName = 'Courier Vendor';
        }

        $theme = $this->resolveQuoteProviderTheme((int) $vendor->id, $category);
        $pricing = $this->resolveQuoteProviderPricing($category, $settings);
        $codServicePolicy = $this->resolveVendorCodServicePolicyFromSettings($settings);
        $hasApprovedDomesticCodCapability = isset($approvedDomesticCodVendorLookup[(int) $vendor->id]);
        $supportsCodAtCheckout = $category === 'domestic'
            && $hasApprovedDomesticCodCapability
            && (bool) ($codServicePolicy['acceptCodAtCheckout'] ?? false)
            && (bool) ($codServicePolicy['allowCodForDomestic'] ?? false);

        return [
            'id' => sprintf('vendor-%d-%s', (int) $vendor->id, $category),
            'name' => $providerName,
            'logo' => $this->resolveVendorProfileLogoUrl((string) ($profile?->logo ?? '')),
            'category' => $category,
            'brandColor' => $theme['brandColor'],
            'badgeColor' => $theme['badgeColor'],
            'rateMultiplier' => $pricing['rateMultiplier'],
            'fuelSurcharge' => $pricing['fuelSurcharge'],
            'customsBuffer' => $pricing['customsBuffer'],
            'coverage' => $this->resolveQuoteProviderCoverage($category, $profile?->city, $profile?->country),
            'cutoff' => $this->resolveQuoteProviderCutoff($category, $settings),
            'badges' => $this->resolveQuoteProviderBadges($category),
            'tiers' => $this->resolveQuoteProviderTiers($category),
            'paymentOptions' => [
                'cod' => $supportsCodAtCheckout,
                'card' => true,
            ],
            'isVerified' => true,
            'codEligibility' => [
                'hasApprovedDomesticCapability' => $hasApprovedDomesticCodCapability,
                'servicePolicy' => $codServicePolicy,
            ],
        ];
    }

    private function normalizeQuoteProviderCategory(string $serviceSubCategorySlug): ?string
    {
        $normalized = strtolower(trim($serviceSubCategorySlug));

        if ($normalized === 'domestic') {
            return 'domestic';
        }

        if ($normalized === 'international') {
            return 'international';
        }

        return null;
    }

    private function resolveQuoteProviderTheme(int $vendorId, string $category): array
    {
        $palettes = [
            'domestic' => [
                ['brandColor' => '#0055A4', 'badgeColor' => '#CCE5FF'],
                ['brandColor' => '#E84B1C', 'badgeColor' => '#FFE8E0'],
                ['brandColor' => '#0D9488', 'badgeColor' => '#CCFBF1'],
                ['brandColor' => '#7C3AED', 'badgeColor' => '#EDE9FE'],
            ],
            'international' => [
                ['brandColor' => '#FFB800', 'badgeColor' => '#FFF4CC'],
                ['brandColor' => '#4D148C', 'badgeColor' => '#EFE6FB'],
                ['brandColor' => '#3B2419', 'badgeColor' => '#F4EDE5'],
                ['brandColor' => '#E7002A', 'badgeColor' => '#FFE0E6'],
            ],
        ];

        $palette = $palettes[$category] ?? $palettes['domestic'];
        $index = count($palette) > 0 ? abs($vendorId) % count($palette) : 0;

        return $palette[$index] ?? ['brandColor' => '#0955AC', 'badgeColor' => '#E8F0FE'];
    }

    private function resolveQuoteProviderPricing(string $category, array $settings): array
    {
        $defaults = $category === 'international'
            ? ['rateMultiplier' => 1.05, 'fuelSurcharge' => 0.05, 'customsBuffer' => 3.5]
            : ['rateMultiplier' => 1.015, 'fuelSurcharge' => 0.03, 'customsBuffer' => 0.0];

        $formulaConfig = is_array($settings['pricing']['formula'] ?? null) ? $settings['pricing']['formula'] : [];
        $scopedFormula = is_array($formulaConfig[$category] ?? null)
            ? $formulaConfig[$category]
            : (is_array($formulaConfig) ? $formulaConfig : []);

        $fuelSurcharge = $defaults['fuelSurcharge'];
        if (isset($scopedFormula['fuelSurchargePercent'])) {
            $fuelSurcharge = round(max(0, (float) $scopedFormula['fuelSurchargePercent']) / 100, 3);
        }

        $taxRate = isset($scopedFormula['taxPercent'])
            ? max(0, (float) $scopedFormula['taxPercent']) / 100
            : 0.0;
        $rateMultiplier = round(min(1.35, max(0.85, $defaults['rateMultiplier'] + $taxRate)), 3);

        $customsBuffer = $defaults['customsBuffer'];
        if ($category === 'international' && isset($scopedFormula['handlingFee'])) {
            $customsBuffer = round(max($customsBuffer, min(12, (float) $scopedFormula['handlingFee'] / 10)), 2);
        }

        return [
            'rateMultiplier' => $rateMultiplier,
            'fuelSurcharge' => $fuelSurcharge,
            'customsBuffer' => $customsBuffer,
        ];
    }

    private function resolveQuoteProviderCoverage(string $category, ?string $city, ?string $country): string
    {
        $city = trim((string) $city);
        $country = strtoupper(trim((string) $country));

        if ($category === 'domestic') {
            return $city !== ''
                ? sprintf('Island-wide delivery from %s', $city)
                : 'Island-wide domestic delivery';
        }

        return $country !== ''
            ? sprintf('Cross-border international delivery from %s', $country)
            : 'Cross-border international delivery support';
    }

    private function resolveQuoteProviderCutoff(string $category, array $settings): string
    {
        $default = $category === 'international' ? 'Pickup by 3:30 PM' : 'Pickup by 5:00 PM';

        $serviceCatalogConfig = is_array($settings['pricing']['serviceCatalog'] ?? null)
            ? $settings['pricing']['serviceCatalog']
            : [];
        $serviceCatalog = is_array($serviceCatalogConfig[$category] ?? null)
            ? $serviceCatalogConfig[$category]
            : [];

        foreach ($serviceCatalog as $item) {
            if (!is_array($item)) {
                continue;
            }

            if (isset($item['isActive']) && !(bool) $item['isActive']) {
                continue;
            }

            $formattedCutoff = $this->formatQuoteProviderCutoff((string) ($item['cutoffTime'] ?? ''));
            if ($formattedCutoff !== null) {
                return 'Pickup by ' . $formattedCutoff;
            }
        }

        return $default;
    }

    private function formatQuoteProviderCutoff(string $value): ?string
    {
        $candidate = trim($value);
        if ($candidate === '') {
            return null;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $candidate) === 1) {
            try {
                return Carbon::createFromFormat('H:i', $candidate)->format('g:i A');
            } catch (\Throwable $exception) {
                return null;
            }
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $candidate) === 1) {
            try {
                return Carbon::createFromFormat('H:i:s', $candidate)->format('g:i A');
            } catch (\Throwable $exception) {
                return null;
            }
        }

        if (preg_match('/^([1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i', $candidate) === 1) {
            try {
                return Carbon::createFromFormat('g:i A', strtoupper($candidate))->format('g:i A');
            } catch (\Throwable $exception) {
                return null;
            }
        }

        return null;
    }

    private function resolveQuoteProviderBadges(string $category): array
    {
        return $category === 'international'
            ? ['Approved vendor', 'Customs support']
            : ['Approved vendor', 'Door-to-door'];
    }

    private function resolveQuoteProviderTiers(string $category): array
    {
        if ($category === 'international') {
            return [
                [
                    'id' => 'economy',
                    'label' => 'Economy',
                    'base' => 16,
                    'perKg' => 1.2,
                    'eta' => '4-7 business days',
                    'description' => 'Economical cross-border courier service.',
                ],
                [
                    'id' => 'express',
                    'label' => 'Express',
                    'base' => 29,
                    'perKg' => 1.85,
                    'eta' => '2-4 business days',
                    'description' => 'Faster global shipping with customs assistance.',
                ],
                [
                    'id' => 'priority',
                    'label' => 'Priority',
                    'base' => 52,
                    'perKg' => 2.6,
                    'eta' => '1-2 business days',
                    'description' => 'Priority international shipping for urgent cargo.',
                ],
            ];
        }

        return [
            [
                'id' => 'economy',
                'label' => 'Economy',
                'base' => 2.9,
                'perKg' => 0.38,
                'eta' => '2-4 business days',
                'description' => 'Affordable island-wide domestic delivery.',
            ],
            [
                'id' => 'express',
                'label' => 'Express',
                'base' => 5.8,
                'perKg' => 0.68,
                'eta' => 'Next-day delivery',
                'description' => 'Fast domestic service with dependable tracking.',
            ],
            [
                'id' => 'priority',
                'label' => 'Priority',
                'base' => 9.7,
                'perKg' => 0.98,
                'eta' => 'Same-day delivery',
                'description' => 'Rapid same-day pickup and door-to-door fulfillment.',
            ],
        ];
    }

    private function resolveVendorProfileLogoUrl(string $logoPath): ?string
    {
        $logoPath = trim($logoPath);
        if ($logoPath === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $logoPath) === 1) {
            return $logoPath;
        }

        $normalized = ltrim($logoPath, '/');
        if (str_starts_with($normalized, 'storage/')) {
            $normalized = substr($normalized, strlen('storage/'));
        }

        return Storage::url($normalized);
    }

    public function downloadBill(Request $request, CourierShipment $shipment)
    {
        $shipmentOwnerId = (int) ($shipment->requested_by_user_id ?? 0);
        $authenticatedUserId = (int) (Auth::id() ?? 0);
        $isAuthenticatedOwner = $authenticatedUserId > 0
            && $shipmentOwnerId > 0
            && $shipmentOwnerId === $authenticatedUserId;
        $hasGuestSessionAccess = $shipmentOwnerId === 0
            && $this->hasGuestBillAccess($request, (int) $shipment->id);

        if (!$isAuthenticatedOwner && !$hasGuestSessionAccess) {
            if ($authenticatedUserId > 0) {
                $this->observability()->recordOwnershipFailure($request, 'shipment_bill_download', (int) $shipment->id, [
                    'owner_user_id' => (int) $shipment->requested_by_user_id,
                ]);

                abort(403);
            }

            $this->observability()->recordAuthorizationDenial($request, 'guest_bill_download_without_session_access', [
                'requested_shipment_id' => (int) ($shipment->id ?? 0),
            ]);

            return redirect()
                ->to($this->resolveFlowRoute($request, 'create'))
                ->with('error', 'Unable to download that bill from this session.');
        }

        $shipment->loadMissing([
            'sender',
            'recipient',
            'senderAddress',
            'recipientAddress',
            'packages',
        ]);

        $this->observability()->logDetailRead($request, (int) $shipment->id, [
            'mode' => 'bill_download',
            'shipment_reference' => (string) $shipment->reference,
        ]);

        $escape = static function ($value) {
            return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
        };

        $formatAddress = static function ($address) use ($escape) {
            if (!$address) {
                return '—';
            }

            $street = array_filter([$address->line1, $address->line2]);
            $locality = array_filter([$address->city, $address->state, $address->postal_code]);

            $parts = array_filter([
                implode(', ', array_map($escape, $street)),
                implode(', ', array_map($escape, $locality)),
                $escape($address->country),
            ]);

            $filtered = array_filter($parts);

            return $filtered ? implode(' • ', $filtered) : '—';
        };

        $packagesRows = '';
        foreach ($shipment->packages as $index => $package) {
            $dimensions = ($package->length_cm && $package->width_cm && $package->height_cm)
                ? sprintf('%s × %s × %s', $escape($package->length_cm), $escape($package->width_cm), $escape($package->height_cm))
                : '—';

            $packagesRows .= '<tr>'
                . '<td>' . $escape($index + 1) . '</td>'
                . '<td>' . ($escape($package->label) ?: 'Package ' . ($index + 1)) . '</td>'
                . '<td>' . ($escape($package->package_type) ?: '—') . '</td>'
                . '<td>' . ($escape($package->quantity) ?: '—') . '</td>'
                . '<td>' . ($escape($package->weight_kg) ?: '—') . '</td>'
                . '<td>' . $dimensions . '</td>'
                . '<td>' . ($escape($package->declared_value) ?: '—') . '</td>'
                . '<td>' . ($escape($package->courier_provider_name) ?: '—') . '</td>'
                . '<td>' . ($escape($package->service_tier_label) ?: '—') . '</td>'
                . '<td>' . ($escape($package->service_eta) ?: '—') . '</td>'
                . '<td>' . ($escape($package->quoted_price_usd) ?: '—') . '</td>'
                . '<td>' . ($escape($package->description) ?: '—') . '</td>'
                . '</tr>';
        }

        if ($packagesRows === '') {
            $packagesRows = '<tr><td colspan="12">No packages recorded.</td></tr>';
        }

        $totalUsd = $shipment->packages->reduce(
            static fn($carry, $package) => $carry + (float) ($package->quoted_price_usd ?? 0),
            0.0
        );
        $codEnabled = (bool) ($shipment->is_cod_enabled ?? false);
        $codAmountText = $shipment->cod_requested_amount !== null
            ? number_format((float) $shipment->cod_requested_amount, 2) . ' ' . ($shipment->currency_code ?: 'USD')
            : '—';
        $codMethodText = $shipment->cod_requested_method
            ? ucwords(str_replace('_', ' ', (string) $shipment->cod_requested_method))
            : '—';

        $html = '<!DOCTYPE html>'
            . '<html lang="en"><head><meta charset="UTF-8"><title>Courier Bill ' . $escape($shipment->reference) . '</title>'
            . '<style>body{font-family:Arial,Helvetica,sans-serif;color:#0B1739;padding:24px;}h1{font-size:22px;margin-bottom:8px;}h2{font-size:18px;margin:24px 0 12px;}table{width:100%;border-collapse:collapse;margin-top:12px;}th,td{border:1px solid #D6DEEB;padding:8px;text-align:left;font-size:13px;}th{background:#F4F7FB;}p{margin:4px 0;font-size:13px;}small{display:block;margin-top:32px;color:#6B7893;}</style>'
            . '</head><body>'
            . '<h1>Courier Service Bill</h1>'
            . '<p><strong>Reference:</strong> ' . $escape($shipment->reference) . '</p>'
            . '<p><strong>Generated:</strong> ' . $escape(now()->format('Y-m-d H:i')) . '</p>'
            . '<h2>Sender details</h2>'
            . '<p><strong>Name:</strong> ' . ($escape(optional($shipment->sender)->name) ?: '—') . '</p>'
            . '<p><strong>Email:</strong> ' . ($escape(optional($shipment->sender)->email) ?: '—') . '</p>'
            . '<p><strong>Phone:</strong> ' . ($escape(optional($shipment->sender)->phone) ?: '—') . '</p>'
            . '<p><strong>Company:</strong> ' . ($escape(optional($shipment->sender)->company_name) ?: '—') . '</p>'
            . '<p><strong>Address:</strong> ' . $formatAddress($shipment->senderAddress) . '</p>'
            . '<h2>Recipient details</h2>'
            . '<p><strong>Name:</strong> ' . ($escape(optional($shipment->recipient)->name) ?: '—') . '</p>'
            . '<p><strong>Email:</strong> ' . ($escape(optional($shipment->recipient)->email) ?: '—') . '</p>'
            . '<p><strong>Phone:</strong> ' . ($escape(optional($shipment->recipient)->phone) ?: '—') . '</p>'
            . '<p><strong>Company:</strong> ' . ($escape(optional($shipment->recipient)->company_name) ?: '—') . '</p>'
            . '<p><strong>Address:</strong> ' . $formatAddress($shipment->recipientAddress) . '</p>'
            . '<h2>Shipment preferences</h2>'
            . '<p><strong>Pickup date:</strong> ' . ($shipment->pickup_date ? $escape($shipment->pickup_date->format('Y-m-d')) : '—') . '</p>'
            . '<p><strong>Pickup window:</strong> ' . ($shipment->pickup_window_start && $shipment->pickup_window_end
                ? $escape($shipment->pickup_window_start . ' - ' . $shipment->pickup_window_end)
                : '—') . '</p>'
            . '<p><strong>Insurance required:</strong> ' . ($shipment->insurance_required ? 'Yes' : 'No') . '</p>'
            . '<p><strong>Declared value:</strong> ' . ($escape($shipment->declared_value) ?: '—') . ' ' . ($escape($shipment->currency_code) ?: 'USD') . '</p>'
            . '<p><strong>Cash on delivery enabled:</strong> ' . ($codEnabled ? 'Yes' : 'No') . '</p>'
            . ($codEnabled
                ? '<p><strong>COD collection amount:</strong> ' . $escape($codAmountText) . '</p>'
                . '<p><strong>COD payment method:</strong> ' . $escape($codMethodText) . '</p>'
                : '')
            . '<h2>Package details</h2>'
            . '<table><thead><tr><th>#</th><th>Label</th><th>Type</th><th>Quantity</th><th>Weight (kg)</th><th>Dimensions (cm)</th><th>Declared value</th><th>Courier</th><th>Service</th><th>ETA</th><th>Quote (USD)</th><th>Description</th></tr></thead><tbody>'
            . $packagesRows
            . '</tbody></table>'
            . '<p><strong>Total quoted cost (USD):</strong> ' . number_format($totalUsd, 2) . '</p>'
            . '<p><strong>Stored estimated cost (USD):</strong> ' . ($shipment->estimated_cost !== null
                ? number_format((float) $shipment->estimated_cost, 2)
                : '—') . '</p>'
            . '<small>This bill is generated for reference based on the confirmed courier request.</small>'
            . '</body></html>';

        $filename = 'courier-bill-' . $shipment->reference . '.html';

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function rememberGuestBillAccess(Request $request, int $shipmentId): void
    {
        if ($shipmentId <= 0) {
            return;
        }

        $existingIds = collect((array) $request->session()->get('courier_guest_bill_access_ids', []))
            ->map(fn($value) => (int) $value)
            ->filter(fn(int $value) => $value > 0);

        $request->session()->put(
            'courier_guest_bill_access_ids',
            $existingIds
                ->push($shipmentId)
                ->unique()
                ->values()
                ->slice(-25)
                ->values()
                ->all()
        );
    }

    private function hasGuestBillAccess(Request $request, int $shipmentId): bool
    {
        if ($shipmentId <= 0) {
            return false;
        }

        $allowedIds = collect((array) $request->session()->get('courier_guest_bill_access_ids', []))
            ->map(fn($value) => (int) $value)
            ->filter(fn(int $value) => $value > 0)
            ->values();

        return $allowedIds->contains($shipmentId);
    }

    private function observability(): CourierClientObservabilityService
    {
        return app(CourierClientObservabilityService::class);
    }
}
