<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use App\Models\FreightQuote;
use App\Mail\FreightQuoteSubmitted;
use Inertia\Inertia;
use App\Models\Vehicle;
use App\Models\Warehouse\WarehouseUnit;
use App\Models\Warehouse\WarehouseLike;
use App\Models\Warehouse\WarehouseReview;



class WebController extends Controller
{
    public function index()
    {
        return Inertia::render('Web/home/HomePage');
    }

    public function vehicleList(Request $request)
    {
        $query = \App\Models\Vehicle::with(['images', 'landSpec', 'provider'])
            ->where('type', 'land');

        if ($request->has('brand')) {
            $query->where('manufacturer', 'like', '%' . $request->brand . '%');
        }

        if ($request->has('bodyType')) {
            $query->whereHas('landSpec', function ($q) use ($request) {
                $q->where('body_type', $request->bodyType);
            });
        }

        $vehicles = $query->get()->map(function ($vehicle) {
            return [
                'id' => $vehicle->id,
                'name' => $vehicle->model,
                'brand' => $vehicle->manufacturer,
                'price' => $vehicle->rental_price_per_day ?? 89,
                'image' => $vehicle->primary_image_url,
                'bodyType' => $vehicle->landSpec ? $vehicle->landSpec->body_type : null,
                'vendor' => $vehicle->provider ? [
                    'id' => $vehicle->provider->id,
                    'name' => $vehicle->provider->business_name
                ] : null
            ];
        });

        return Inertia::render('Web/home/vehicleList', [
            'vehicles' => [],
            'searchParams' => $request->all()
        ]);
    }

    public function vehicleDetails(Request $request)
    {
        return Inertia::render('Web/home/land/VehicleDetails', [
            'vehicle' => $request->vehicle,
            'searchParams' => $request->except('vehicle')
        ]);
    }

    public function courierService()
    {
        return Inertia::render('Web/home/CourierService');
    }

    public function bookATicket()
    {
        return Inertia::render('Web/home/BookATicket');
    }

    public function bookingHome()
    {
        return Inertia::render('Web/home/BookingHomePage');
    }

    public function cargoFreight()
    {
        return Inertia::render('Web/home/cargoAndFreight/HomePage');
    }

    public function driversHome()
    {
        return Inertia::render('Web/home/DriversHomePage');
    }

    public function driverSearchResults(Request $request)
    {
        return Inertia::render('Web/home/DriverSearchResults', [
            'searchParams' => $request->all()
        ]);
    }

    public function driverDetails(Request $request)
    {
        return Inertia::render('Web/home/DriverDetails', [
            'driver' => $request->driver,
        ]);
    }

    public function vehicleCheckout()
    {
        return Inertia::render('Web/home/land/VehicleCheckout');
    }

    public function vehiclePayments()
    {
        return Inertia::render('Web/home/land/VehiclePayments');
    }

    public function summary()
    {
        return Inertia::render('Web/home/land/Summary');
    }

    public function freightHomepage()
    {
        return Inertia::render('Web/home/freight/Homepage');
    }


    public function multiModelHomepage()
    {
        return Inertia::render('Web/home/multiModel/HomePage');
    }

    public function multiModelPlanJourney()
    {
        try {
            Log::info('multiModelPlanJourney accessed');
            return Inertia::render('Web/home/multiModel/PlanJourney');
        } catch (\Exception $e) {
            Log::error('[multiModelPlanJourney] Exception: ' . get_class($e), [
                'error_code' => $e->getCode(),
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_class' => get_class($e),
                'full_trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function multiModelAvailableVehicles(Request $request)
    {
        // If this is an API call to fetch vehicles
        if ($request->ajax() || $request->wantsJson()) {
            return $this->fetchAvailableVehicles($request);
        }
        
        // Otherwise, render the page
        return Inertia::render('Web/home/multiModel/AvailableVehicles');
    }

    /**
     * Fetch available vehicles based on date/time range
     */
    public function fetchAvailableVehicles(Request $request)
    {
        $request->validate([
            'startDate' => 'required|date',
            'startTime' => 'required',
            'endDate' => 'required|date',
            'endTime' => 'required',
            'vehicleType' => 'required|in:land,sea,air'
        ]);

        // Parse the date and time into Carbon instances
        $startDateTime = \Carbon\Carbon::parse($request->startDate . ' ' . $request->startTime);
        $endDateTime = \Carbon\Carbon::parse($request->endDate . ' ' . $request->endTime);

        // Determine the model type based on vehicle type
        $vehicleType = $request->vehicleType;

        if ($vehicleType === 'land') {
            // Fetch land vehicles (cars)
            $vehicles = Vehicle::where('type', 'land')
                ->where('status', 'active')
                ->where('approval_status', 'approved')
                ->with(['landSpec', 'images', 'reviews'])
                ->get()
                ->filter(function ($vehicle) use ($startDateTime, $endDateTime) {
                    return $vehicle->isAvailable($startDateTime, $endDateTime);
                })
                ->map(function ($vehicle) {
                    $primaryImage = $vehicle->images->first();
                    return [
                        'id' => $vehicle->id,
                        'name' => $vehicle->model,
                        'manufacturer' => $vehicle->manufacturer,
                        'year' => $vehicle->year,
                        'price' => $vehicle->rental_price_per_day,
                        'passengerCapacity' => $vehicle->passenger_capacity,
                        'rating' => $vehicle->reviews->avg('rating') ?? 0,
                        'totalReviews' => $vehicle->reviews->count(),
                        'image' => $primaryImage ? $primaryImage->url : null,
                        'specs' => $vehicle->landSpec ? [
                            'bodyType' => $vehicle->landSpec->body_type,
                            'transmission' => $vehicle->landSpec->transmission,
                            'fuelType' => $vehicle->landSpec->fuel_type,
                            'seatingCapacity' => $vehicle->landSpec->seating_capacity,
                        ] : null,
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'vehicles' => $vehicles
            ]);

        } else if ($vehicleType === 'sea') {
            // Fetch sea vehicles (yachts)
            $vehicles = Vehicle::where('type', 'sea')
                ->where('status', 'active')
                ->where('approval_status', 'approved')
                ->with(['seaSpec', 'images', 'reviews'])
                ->get()
                ->filter(function ($vehicle) use ($startDateTime, $endDateTime) {
                    return $vehicle->isAvailable($startDateTime, $endDateTime);
                })
                ->map(function ($vehicle) {
                    $primaryImage = $vehicle->images->first();
                    return [
                        'id' => $vehicle->id,
                        'name' => $vehicle->model,
                        'manufacturer' => $vehicle->manufacturer,
                        'year' => $vehicle->year,
                        'price' => $vehicle->rental_price_per_day,
                        'passengerCapacity' => $vehicle->passenger_capacity,
                        'rating' => $vehicle->reviews->avg('rating') ?? 0,
                        'totalReviews' => $vehicle->reviews->count(),
                        'image' => $primaryImage ? $primaryImage->url : null,
                        'specs' => $vehicle->seaSpec ? [
                            'length' => $vehicle->seaSpec->length,
                            'beam' => $vehicle->seaSpec->beam,
                            'draft' => $vehicle->seaSpec->draft,
                            'cabins' => $vehicle->seaSpec->cabins,
                            'engineType' => $vehicle->seaSpec->engine_type,
                        ] : null,
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'vehicles' => $vehicles
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid vehicle type'
        ], 400);
    }

    public function ReviewJourney()
    {
        return Inertia::render('Web/home/multiModel/ReviewJourney');
    }

    public function TravellerDetails()
    {
        return Inertia::render('Web/home/multiModel/TravellerDetails');
    }


    public function Payment()
    {
        $journey = session('multimodel_journey');
        $cart = session('multimodel_cart', ['selections' => []]);
        $personalInfo = session('multimodel_personal');

        // Calculate totals
        $subtotal = 0;
        $totalDeposit = 0;
        $totalAdvance = 0;

        if (isset($cart['selections']) && is_array($cart['selections'])) {
            foreach ($cart['selections'] as $selection) {
                $subtotal += $selection['total_amount'] ?? 0;
                $totalDeposit += $selection['deposit_amount'] ?? 0;
                $totalAdvance += $selection['advance_amount'] ?? 0;
            }
        }

        return Inertia::render('Web/home/multiModel/Payment', [
            'journey' => $journey,
            'cart' => $cart,
            'personal_info' => $personalInfo,
            'pricing' => [
                'subtotal' => $subtotal,
                'deposit' => $totalDeposit,
                'advance' => $totalAdvance,
                'total' => $subtotal,
            ]
        ]);
    }

    

    public function MultimodelVehicleDetails(Request $request, $vehicleId)
    {
        // Fetch the vehicle with its relationships
        $vehicle = Vehicle::with(['landSpec', 'seaSpec', 'airSpec', 'images', 'reviews.user', 'provider'])
            ->where('id', $vehicleId)
            ->where('status', 'active')
            ->where('approval_status', 'approved')
            ->firstOrFail();

        // Get leg index from request (defaults to 0 if not provided)
        $legIndex = $request->query('legIndex', 0);

        // Get journey data from session if available
        $journeyData = session('multimodel_journey', null);
        
        // If no journey exists, create a temporary one for testing
        if (!$journeyData) {
            $journeyData = [
                'legs' => [
                    [
                        'from_location' => 'Colombo',
                        'to_location' => 'Kandy',
                        'start_date' => now()->addDays(1)->format('Y-m-d'),
                        'start_time' => '09:00',
                        'end_date' => now()->addDays(2)->format('Y-m-d'),
                        'end_time' => '18:00',
                        'vehicle_type' => $vehicle->type,
                    ]
                ]
            ];
            session(['multimodel_journey' => $journeyData]);
        }

        // Get primary image
        $primaryImage = $vehicle->images->first();

        // Prepare vehicle data
        $vehicleData = [
            'id' => $vehicle->id,
            'name' => $vehicle->model,
            'manufacturer' => $vehicle->manufacturer,
            'year' => $vehicle->year,
            'type' => $vehicle->type,
            'price' => $vehicle->rental_price_per_day,
            'passengerCapacity' => $vehicle->passenger_capacity,
            'location' => $vehicle->location,
            'description' => $vehicle->description,
            'rating' => $vehicle->reviews->avg('rating') ?? 0,
            'totalReviews' => $vehicle->reviews->count(),
            'image' => $primaryImage ? $primaryImage->url : null,
            'images' => $vehicle->images->map(function($img) {
                return [
                    'id' => $img->id,
                    'url' => $img->url,
                    'type' => $img->type
                ];
            }),
            'specs' => null,
            'provider' => $vehicle->provider ? [
                'id' => $vehicle->provider->id,
                'name' => $vehicle->provider->name,
                'email' => $vehicle->provider->email,
                'phone' => $vehicle->provider->phone,
                'business_name' => $vehicle->provider->business_name
            ] : null,
            'reviews' => $vehicle->reviews->map(function($review) {
                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'user_name' => $review->user ? $review->user->name : 'Anonymous',
                    'created_at' => $review->created_at->format('Y-m-d')
                ];
            })
        ];

        // Add type-specific specs
        if ($vehicle->type === 'land' && $vehicle->landSpec) {
            $vehicleData['specs'] = [
                'bodyType' => $vehicle->landSpec->body_type,
                'transmission' => $vehicle->landSpec->transmission,
                'fuelType' => $vehicle->landSpec->fuel_type,
                'seatingCapacity' => $vehicle->landSpec->seating_capacity,
                'doors' => $vehicle->landSpec->doors,
                'engineCapacity' => $vehicle->landSpec->engine_capacity,
                'color' => $vehicle->landSpec->color
            ];
        } else if ($vehicle->type === 'sea' && $vehicle->seaSpec) {
            $vehicleData['specs'] = [
                'length' => $vehicle->seaSpec->length,
                'beam' => $vehicle->seaSpec->beam,
                'draft' => $vehicle->seaSpec->draft,
                'cabins' => $vehicle->seaSpec->cabins,
                'engineType' => $vehicle->seaSpec->engine_type,
                'maxSpeed' => $vehicle->seaSpec->max_speed
            ];
        } else if ($vehicle->type === 'air' && $vehicle->airSpec) {
            $vehicleData['specs'] = [
                'aircraftType' => $vehicle->airSpec->aircraft_type,
                'maxAltitude' => $vehicle->airSpec->max_altitude,
                'range' => $vehicle->airSpec->range,
                'cruiseSpeed' => $vehicle->airSpec->cruise_speed,
                'engineType' => $vehicle->airSpec->engine_type
            ];
        }

        // Get journey data from session if available
        $journeyData = session('multimodel_journey', null);

        return Inertia::render('Web/home/multiModel/VehicleDetails', [
            'vehicle' => $vehicleData,
            'journey' => $journeyData,
            'legIndex' => $legIndex
        ]);
    }

    // bus section
    public function BusDetails()
    {
        return Inertia::render('Web/home/multiModel/bus/BusDetails');
    }

    public function BusPayment()
    {
        return Inertia::render('Web/home/multiModel/bus/Payment');
    }

    public function BusConfirmPayment()
    {
        return Inertia::render('Web/home/multiModel/bus/ConfirmPayment');
    }

    // train section
    public function TrainDetails()
    {
        return Inertia::render('Web/home/multiModel/train/TrainDetails');
    }

    public function TrainPayment()
    {
        return Inertia::render('Web/home/multiModel/train/Payment');
    }

    public function TrainConfirmPayment()
    {
        return Inertia::render('Web/home/multiModel/train/ConfirmPayment');
    }

    // yatch section
    public function YatchDetails()
    {
        return Inertia::render('Web/home/multiModel/yatch/YatchDetails');
    }

    public function YatchPayment()
    {
        return Inertia::render('Web/home/multiModel/yatch/Payment');
    }

    public function YatchConfirmPayment()
    {
        return Inertia::render('Web/home/multiModel/yatch/ConfirmPayment');
    }





    public function freightQuoteStore(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'origin'            => 'required|string|max:255',
                'destination'       => 'required|string|max:255',
                'load_type'         => 'required|string|max:100',
                'goods_description' => 'required|string',
                'length_cm'         => 'nullable|numeric|min:0',
                'width_cm'          => 'nullable|numeric|min:0',
                'height_cm'         => 'nullable|numeric|min:0',
                'total_weight_kg'   => 'required|numeric|min:0',
                'preferred_method'  => 'required|string|in:Air,Sea,Road',
                'shipping_date'     => 'required|date|after_or_equal:today',
                'notes'             => 'nullable|string',
            ]);

            // Create the freight quote
            $quote = FreightQuote::create(array_merge($validated, [
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]));


            try {
                Mail::send(new FreightQuoteSubmitted($quote));


                Log::info('Freight quote email sent successfully', [
                    'quote_id' => $quote->id,
                    'recipients' => ['alexchamara56@gmail@gmail.com', 'alexchamara76@gmail.com']
                ]);
            } catch (\Exception $emailException) {

                Log::error('Failed to send freight quote email', [
                    'quote_id' => $quote->id,
                    'error' => $emailException->getMessage()
                ]);
            }

            return back()->with('success', 'Freight quote submitted successfully! Quote ID: #' . $quote->id . '. We will contact you soon with a quotation.');
        } catch (\Illuminate\Validation\ValidationException $e) {

            return back()->withErrors($e->validator)->withInput();
        } catch (\Exception $e) {

            Log::error('Freight Quote Submission Error: ' . $e->getMessage());

            return back()->with('error', 'There was an error submitting your quote. Please try again or contact support.')
                ->withInput();
        }
    }




    public function freightTicketBooking()
    {
        return Inertia::render('Web/home/ticketBooking/TicketBooking');
    }    public function ticketBooking()
    {
        // Allow unauthenticated users to access the page
        return Inertia::render('Web/home/ticketBooking/TicketBooking');
    }

    public function TrainTicketBookingDetails()
    {
        return Inertia::render('Web/home/ticketBooking/TrainTicketBookingDetails');
    }

    public function busTicketBookingDetails(Request $request)
    {
        // Get stations for dropdown
        $stations = \App\Models\BusStation::where('status', 'active')->get();

        $schedules = collect();
        $searchParams = [
            'from' => $request->input('from'),
            'to' => $request->input('to'),
            'date' => $request->input('date')
        ];

        if ($searchParams['from'] && $searchParams['to'] && $searchParams['date']) {
            // Find departure and arrival stations
            $departureStation = \App\Models\BusStation::where('name', $searchParams['from'])->first();
            $arrivalStation = \App\Models\BusStation::where('name', $searchParams['to'])->first();

            if ($departureStation && $arrivalStation) {
                $schedules = \App\Models\BusSchedule::with(['bus', 'departureStation', 'arrivalStation'])
                    ->where('departure_station_id', $departureStation->id)
                    ->where('arrival_station_id', $arrivalStation->id)
                    ->where('date', $searchParams['date'])
                    ->where('status', 'active')
                    ->orderBy('departure_time')
                    ->get()
                    ->map(function ($schedule) {
                        return [
                            'id' => $schedule->id,
                            'operator' => $schedule->bus->operator,
                            'busType' => $schedule->bus->bus_type,
                            'routeNo' => $schedule->bus->route_number,
                            'busNo' => $schedule->bus->bus_number,
                            'depart' => date('g:i A', strtotime($schedule->departure_time)),
                            'arrive' => date('g:i A', strtotime($schedule->arrival_time)),
                            'day' => date('j M', strtotime($schedule->date)),
                            'duration' => $schedule->getFormattedDurationAttribute(),
                            'price' => $schedule->price,
                            'seatsAvailable' => $schedule->available_seats,
                            'totalSeats' => $schedule->bus->capacity,
                            'expressway' => $schedule->is_expressway,
                            'soldOut' => $schedule->available_seats <= 0,
                            'facilities' => $schedule->bus->facilities ?? [],
                            'departureStation' => $schedule->departureStation->name,
                            'arrivalStation' => $schedule->arrivalStation->name,
                        ];
                    });
            }
        }

        return Inertia::render('Web/home/ticketBooking/BusTicketBookingDetails', [
            'stations' => $stations,
            'schedules' => $schedules,
            'searchParams' => $searchParams
        ]);
    }

    public function flightBooking()
    {
        return Inertia::render('Web/home/ticketBooking/FlightBooking');
    }

    public function trainTicketBookingPreview()
    {
        return Inertia::render('Web/home/ticketBooking/TrainTicketBookingPreview');
    }

    public function busTicketBookingPreview(Request $request)
    {
        $scheduleId = $request->get('id');
        $searchParams = [
            'from' => $request->get('from'),
            'to' => $request->get('to'),
            'date' => $request->get('date'),
            'passengers' => $request->get('passengers', 1)
        ];

        $schedule = null;
        $tripData = null;

        if ($scheduleId) {
            $schedule = \App\Models\BusSchedule::with(['bus', 'departureStation', 'arrivalStation'])
                ->find($scheduleId);

            if ($schedule) {
                $tripData = [
                    'id' => $schedule->id,
                    'operator' => $schedule->bus->operator,
                    'busType' => $schedule->bus->bus_type,
                    'routeNo' => $schedule->bus->route_number,
                    'busNo' => $schedule->bus->bus_number,
                    'depart' => date('g:i A', strtotime($schedule->departure_time)),
                    'arrive' => date('g:i A', strtotime($schedule->arrival_time)),
                    'day' => date('j M', strtotime($schedule->date)),
                    'duration' => $schedule->getFormattedDurationAttribute(),
                    'price' => $schedule->price,
                    'seatsAvailable' => $schedule->available_seats,
                    'totalSeats' => $schedule->bus->capacity,
                    'expressway' => $schedule->is_expressway,
                    'soldOut' => $schedule->available_seats <= 0,
                    'facilities' => $schedule->bus->facilities ?? [],
                    'departureStation' => $schedule->departureStation->name,
                    'arrivalStation' => $schedule->arrivalStation->name,
                ];
            }
        }

        return Inertia::render('Web/home/ticketBooking/BusTicketBookingPreview', [
            'trip' => $tripData,
            'searchParams' => $searchParams
        ]);
    }




    public function landingPage()
    {
        return Inertia::render('Web/home/landingPages/LandingPage', [
            'auth' => [
                'user' => Auth::user() ? [
                    'id' => Auth::user()->id,
                    'role' => Auth::user()->role,
                    // ...other user fields
                ] : null
            ]
        ]);
    }

    public function blog()
    {
        return Inertia::render('Web/home/landingPages/Blog');
    }

    public function blogExample()
    {
        return Inertia::render('Web/home/landingPages/BlogExample');
    }

    public function termsAndConditions()
    {
        return Inertia::render('Web/home/landingPages/TermsAndConditions');
    }

    public function privacyPolicy()
    {
        return Inertia::render('Web/home/landingPages/PrivacyPolicyPage');
    }

    public function returnPolicy()
    {
        return Inertia::render('Web/home/landingPages/ReturnPolicyPage');
    }




    

    public function signin()
    {
        return Inertia::render('Web/home/auth/Signup');
    }

    public function signup()
    {
        return Inertia::render('Web/home/auth/Signin');
    }

    public function register()
    {
        return Inertia::render('Web/home/auth/Register');
    }

    public function warehouse()
    {
        return Inertia::render('Web/home/warehouse/WarehouseHome');
    }

    public function warehouseList(Request $request)
    {
        // Get approved and active warehouses from database
        $searchParams = $request->all();

        $query = WarehouseUnit::approved()
            ->active();

        // Apply filters based on search parameters

        // Location filter (from both search form and filter sidebar)
        if (isset($searchParams['location']) && !empty($searchParams['location'])) {
            $query->where('address', 'LIKE', '%' . $searchParams['location'] . '%');
        }
        if (isset($searchParams['warehouseLocation']) && !empty($searchParams['warehouseLocation'])) {
            $query->where('address', 'LIKE', '%' . $searchParams['warehouseLocation'] . '%');
        }

        // Warehouse type filter (multi-select: the facility itself)
        if (!empty($searchParams['warehouseType'])) {
            $types = is_array($searchParams['warehouseType']) ? $searchParams['warehouseType'] : [$searchParams['warehouseType']];
            $query->whereIn('type', $types);
        }

        // Services filter (multi-select: what can be booked on top of storage)
        if (!empty($searchParams['services'])) {
            $services = is_array($searchParams['services']) ? $searchParams['services'] : [$searchParams['services']];
            $query->where(function ($q) use ($services) {
                foreach ($services as $service) {
                    $q->orWhereJsonContains('services', $service);
                }
            });
        }

        // Required space filter (from search form)
        if (isset($searchParams['requiredSpace']) && !empty($searchParams['requiredSpace'])) {
            $query->where('total_area', '>=', $searchParams['requiredSpace']);
        }

        // Size filter (from filter sidebar)
        if (isset($searchParams['size']) && !empty($searchParams['size'])) {
            switch ($searchParams['size']) {
                case 'small':
                    $query->where('total_area', '<', 5000);
                    break;
                case 'medium':
                    $query->whereBetween('total_area', [5000, 20000]);
                    break;
                case 'large':
                    $query->whereBetween('total_area', [20000, 50000]);
                    break;
                case 'xlarge':
                    $query->where('total_area', '>=', 50000);
                    break;
            }
        }

        // Price filter
        if (isset($searchParams['price']) && !empty($searchParams['price'])) {
            switch ($searchParams['price']) {
                case '0-5000':
                    $query->where('price', '<=', 5000);
                    break;
                case '5000-15000':
                    $query->whereBetween('price', [5000, 15000]);
                    break;
                case '15000-30000':
                    $query->whereBetween('price', [15000, 30000]);
                    break;
                case '30000plus':
                    $query->where('price', '>=', 30000);
                    break;
            }
        }

        // Features filter (amenities in database)
        if (isset($searchParams['features']) && !empty($searchParams['features'])) {
            $features = is_array($searchParams['features']) ? $searchParams['features'] : [$searchParams['features']];
            foreach ($features as $feature) {
                $query->whereJsonContains('amenities', $feature);
            }
        }

        // Move-in date filter (you can add date-based filtering if needed)
        // if (isset($searchParams['moveinDate']) && !empty($searchParams['moveinDate'])) {
        //     // Add date-based filtering logic if your model supports availability dates
        // }

        // Lease duration filter (you can add duration-based filtering if needed)
        // if (isset($searchParams['leaseDuration']) && !empty($searchParams['leaseDuration'])) {
        //     // Add lease duration filtering logic if your model supports it
        // }

        $warehouses = $query->with(['images' => function($q) {
            $q->active()->ordered();
        }, 'mainImage'])->orderBy('created_at', 'desc')->get();

        // Check if JSON format is requested
        if ($request->get('format') === 'json' || $request->expectsJson()) {
            return response()->json([
                'warehouses' => $warehouses,
                'searchParams' => $searchParams
            ]);
        }

        return Inertia::render('Web/home/warehouse/WarehouseList', [
            'warehouses' => $warehouses,
            'searchParams' => $searchParams
        ]);
    }

    public function warehouseDetails(Request $request)
    {
        $warehouseData = $request->get('warehouse');

        if (!$warehouseData) {
            return redirect()->route('warehouse.list');
        }

        // If warehouse data contains an ID, fetch full data with relationships
        if (isset($warehouseData['id'])) {
            $warehouse = WarehouseUnit::with([
                'owner',
                'amenities' => function($query) {
                    $query->available();
                },
                'images' => function($query) {
                    $query->active()->ordered();
                },
                'activeImages' => function($query) {
                    $query->active()->ordered();
                },
                'mainImage' => function($query) {
                    $query->active();
                },
                'galleryImages' => function($query) {
                    $query->active()->ordered();
                },
                'documents' => function($query) {
                    $query->public()->active();
                },
                'currentApproval',
                'reviews' => function($query) {
                    $query->with('user')->latest();
                }
            ])->approved()->active()->find($warehouseData['id']);

            if ($warehouse) {
                // Prepare warehouse data with all relationships
                $warehouseData = array_merge($warehouseData, [
                    'owner' => $warehouse->owner,
                    'amenities' => $warehouse->amenities->map(function($amenity) {
                        return $amenity->name;
                    })->toArray(),
                    'images' => $warehouse->images,
                    'active_images' => $warehouse->activeImages,
                    'main_image' => $warehouse->mainImage,
                    'gallery_images' => $warehouse->galleryImages,
                    'primary_image_url' => $warehouse->mainImage ? $warehouse->mainImage->url : null,
                    'documents' => $warehouse->documents,
                    'rating_avg' => $warehouse->averageRating(),
                    'reviews_count' => $warehouse->reviewsCount(),
                    'reviews' => $warehouse->reviews->map(function($review) {
                        return [
                            'id' => $review->id,
                            'rating' => $review->rating,
                            'comment' => $review->comment,
                            'pros' => $review->pros,
                            'cons' => $review->cons,
                            'stay_duration' => $review->stay_duration,
                            'verified' => $review->verified,
                            'helpful_votes' => $review->helpful_votes,
                            'created_at' => $review->created_at,
                            'user' => $review->user ? [
                                'id' => $review->user->id,
                                'name' => $review->user->name,
                            ] : null,
                            'customer_name' => $review->customer_name ?: $review->user?->name
                        ];
                    }),
                    'is_liked' => $warehouse->isLikedBy(Auth::id()),
                    'status' => $warehouse->is_available ? 'available' : 'unavailable',
                    'terms_conditions' => $warehouse->terms_conditions,
                    'terms_pdf_path' => $warehouse->terms_pdf_path,
                    'operating_hours' => $warehouse->operating_hours,
                    'security_level' => $warehouse->security_level ?? 'standard',
                ]);
            }
        }

        // Get related warehouses (same type, different warehouse)
        $relatedWarehouses = WarehouseUnit::approved()
            ->active()
            ->with(['mainImage', 'amenities'])
            ->where('type', $warehouseData['type'] ?? '')
            ->where('id', '!=', $warehouseData['id'])
            ->limit(3)
            ->get();

        // Get liked warehouse IDs for the current user
        $likedWarehouseIds = [];
        if (Auth::check()) {
            $likedWarehouseIds = WarehouseLike::where('user_id', Auth::id())
                ->pluck('warehouse_unit_id')
                ->toArray();
        }

        return Inertia::render('Web/home/warehouse/WarehouseDetails', [
            'warehouse' => $warehouseData,
            'relatedWarehouses' => $relatedWarehouses,
            'likedWarehouseIds' => $likedWarehouseIds
        ]);
    }

    /**
     * Redirect to appropriate dashboard based on user role
     */
    public function redirectToDashboard()
    {
        if (!Auth::check()) {
            return redirect()->route('signin.signin');
        }

        $user = Auth::user();

        switch ($user->role) {
            case 'client':
                return redirect()->route('clientAllBookings');
            case 'vendor':
                return redirect()->route('vendor.dashboard');
            case 'SuperAdmin':
                return redirect()->route('superadmin.dashboard');
            default:
                return redirect()->route('user.dashboard');
        }
    }
}
