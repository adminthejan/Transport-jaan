<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\VendorSettingsController;
use App\Http\Controllers\WebController;
use App\Http\Controllers\FlightBookingController;
use App\Http\Controllers\TrainController;
use App\Http\Controllers\BusController;
use App\Http\Controllers\BusBookingController;
use App\Http\Controllers\WarehouseControllers\Client\WarehouseBookingController;
use App\Http\Controllers\User\UserDashboardController;
use Illuminate\Foundation\Application;
use App\Http\Controllers\WarehouseControllers\Vendor\WarehouseUnitController;
use App\Http\Controllers\MultiModel\MultiModelBookingController;

// Vendor controllers
use App\Http\Controllers\Vendor\VehicleController;
use App\Http\Controllers\Vendor\DashboardController;
use App\Http\Controllers\Vendor\BookingController as VendorBookingController;
use App\Http\Controllers\Vendor\VehicleMaintenanceController;
use App\Http\Controllers\Vendor\DriverController;
use App\Http\Controllers\Vendor\NotificationController;

// PDFs
use App\Http\Controllers\VehiclePolicyController;

// Client-side browsing/controllers
use App\Http\Controllers\VehicleControllers\Client\ClientVehicleController;
use App\Http\Controllers\VehicleControllers\Client\VehicleLikeController;
use App\Http\Controllers\VehicleControllers\Client\VehicleReviewController;
use App\Http\Controllers\VehicleControllers\Client\ClientBookingController;
use App\Http\Controllers\Client\ClientDashboardController;
use App\Http\Controllers\Client\ClientSettingsController;
use App\Http\Controllers\Api\LocationLookupController;
use App\Http\Controllers\CourierControllers\Client\ClientCourierController;
use App\Http\Controllers\CourierControllers\Client\CourierPaymentController;
use App\Http\Controllers\CourierControllers\Api\CourierServiceApiGatewayController;
use App\Http\Controllers\CourierControllers\Vendor\VendorCourierDashboardController;
use App\Http\Controllers\CourierControllers\Vendor\VendorCourierLabelController;
use App\Http\Controllers\CourierControllers\Vendor\CourierTeamController;
use App\Http\Controllers\CourierControllers\Webhooks\CourierEmailDeliveryWebhookController;
use App\Http\Controllers\Search\GlobalDashboardSearchController;
use App\Support\Courier\ClientCourierShipmentTransformer;

/*
|--------------------------------------------------------------------------
| Small helper to render an Inertia view
|--------------------------------------------------------------------------
*/
$render = function (string $view) {
    return function () use ($view) {
        return Inertia::render($view);
    };
};

/*
|--------------------------------------------------------------------------
| Public Routes (marketing / landing)
|--------------------------------------------------------------------------
*/

// Media serving route for storage files (public access)
Route::get('/storage/{path}', [\App\Http\Controllers\SuperAdmin\WebsiteSettingsController::class, 'serveFile'])
    ->name('storage.serve')
    ->where('path', '.*');

// Public logo endpoint - accessible to all pages
Route::get('/website/logo/current', [\App\Http\Controllers\SuperAdmin\WebsiteSettingsController::class, 'getCurrentLogo'])
    ->name('website.logo.current');

Route::get('/signup', [WebController::class, 'signup'])->name('signup.signup');
Route::get('/signin', [WebController::class, 'signin'])->name('signin.signin');

Route::get('/', [WebController::class, 'landingPage'])->name('landingPage.home');
Route::get('/dashboard-redirect', [WebController::class, 'signin.signin'])->name('dashboard.redirect');
Route::get('/landingPage/blog', [WebController::class, 'blog'])->name('landingPage.blog');
Route::get('/landingPage/blogExample', [WebController::class, 'blogExample'])->name('landingPage.blogExample');

Route::get('/landingPage/terms-and-conditions', [WebController::class, 'termsAndConditions'])->name('landingPage.termsAndConditions');

Route::get('/landingPage/privacy-policy', [WebController::class, 'privacyPolicy'])->name('landingPage.privacyPolicy');

Route::get('/landingPage/return-policy', [WebController::class, 'returnPolicy'])->name('landingPage.returnPolicy');

Route::get('/courier-service', [WebController::class, 'courierService'])->name('courier.service');
Route::prefix('couriers')->name('couriers.')->group(function () {
    Route::get('/create', function () {
        return redirect()->route('couriers.flow.create', ['flow' => 'domestic']);
    })->name('create');
    Route::post('/review', [ClientCourierController::class, 'review'])->name('review');
    Route::get('/details', [ClientCourierController::class, 'details'])->name('details');
    Route::post('/details', [ClientCourierController::class, 'storeDetails'])->name('details.store');
    Route::get('/summary', [ClientCourierController::class, 'summary'])->name('summary');
    Route::get('/countries/suggestions', [ClientCourierController::class, 'lookupCountries'])
        ->middleware('throttle:60,1')
        ->name('countries.suggestions');
    Route::get('/postal-codes/by-city', [ClientCourierController::class, 'lookupPostalCodesByCity'])
        ->middleware('throttle:60,1')
        ->name('postal-codes.by-city');
    Route::get('/cities/by-postal-code', [ClientCourierController::class, 'lookupCityByPostalCode'])
        ->middleware('throttle:60,1')
        ->name('cities.by-postal-code');
    Route::get('/cities/search', [ClientCourierController::class, 'searchDomesticCities'])
        ->middleware('throttle:120,1')
        ->name('cities.search');

    Route::prefix('{flow}')
        ->whereIn('flow', ['domestic', 'international'])
        ->name('flow.')
        ->group(function () {
            Route::get('/create', [ClientCourierController::class, 'create'])->name('create');
            Route::post('/review', [ClientCourierController::class, 'review'])->name('review');
            Route::get('/details', [ClientCourierController::class, 'details'])->name('details');
            Route::post('/details', [ClientCourierController::class, 'storeDetails'])->name('details.store');
            Route::get('/summary', [ClientCourierController::class, 'summary'])->name('summary');
            Route::get('/countries/suggestions', [ClientCourierController::class, 'lookupCountries'])
                ->middleware('throttle:60,1')
                ->name('countries.suggestions');
            Route::get('/postal-codes/by-city', [ClientCourierController::class, 'lookupPostalCodesByCity'])
                ->middleware('throttle:60,1')
                ->name('postal-codes.by-city');
            Route::get('/cities/by-postal-code', [ClientCourierController::class, 'lookupCityByPostalCode'])
                ->middleware('throttle:60,1')
                ->name('cities.by-postal-code');
            Route::get('/cities/search', [ClientCourierController::class, 'searchDomesticCities'])
                ->middleware('throttle:120,1')
                ->name('cities.search');
            Route::post('/', [ClientCourierController::class, 'store'])->name('store');
            Route::get('/{shipment}/bill', [ClientCourierController::class, 'downloadBill'])
                ->whereNumber('shipment')
                ->name('bill');
        });

    Route::post('/favorites', [ClientCourierController::class, 'storeFavoriteRecipient'])
        ->name('favorites.store');
    Route::delete('/favorites/{contact}', [ClientCourierController::class, 'removeFavoriteRecipient'])
        ->whereNumber('contact')
        ->name('favorites.remove');

    Route::prefix('payments')->name('payments.')->group(function () {
        Route::get('/{shipment}/checkout', [CourierPaymentController::class, 'checkout'])
            ->whereNumber('shipment')
            ->name('checkout');
        Route::get('/{shipment}/status', [CourierPaymentController::class, 'status'])
            ->whereNumber('shipment')
            ->name('status');
        Route::post('/{shipment}/retry', [CourierPaymentController::class, 'retry'])
            ->whereNumber('shipment')
            ->name('retry');
        Route::get('/payhere/return', [CourierPaymentController::class, 'handleReturn'])
            ->name('payhere.return');
        Route::get('/payhere/cancel', [CourierPaymentController::class, 'handleCancel'])
            ->name('payhere.cancel');
        Route::post('/payhere/notify', [CourierPaymentController::class, 'handleNotify'])
            ->name('payhere.notify');
    });

    Route::post('/', [ClientCourierController::class, 'store'])->name('store');
    Route::get('/{shipment}/bill', [ClientCourierController::class, 'downloadBill'])
        ->whereNumber('shipment')
        ->name('bill');
});

// Courier & Freight Booking Dashboards (protected - requires auth)
Route::middleware(['auth'])->group(function () {
    Route::get('/courierBookingDashboard', [ClientCourierController::class, 'dashboard'])->name('courierBookingDashboard');
    Route::get('/courier-shipment/{id}', [ClientCourierController::class, 'show'])->name('courier.shipment.show');
    Route::post('/courier-shipment/{id}/update-status', [ClientCourierController::class, 'updateStatus'])->name('courier.shipment.updateStatus');
    Route::post('/courier-shipment/{id}/cancel', [ClientCourierController::class, 'cancelShipment'])->name('courier.shipment.cancel');
    
    // Freight Booking Dashboard
    Route::get('/freightBookingDashboard', function () {
        return Inertia::render('Web/home/client/FreightBookingDashboard');
    })->name('freightBookingDashboard');
});

Route::get('/book-a-ticket', [WebController::class, 'bookATicket'])->name('book.a.ticket');
Route::get('/booking-home', [WebController::class, 'bookingHome'])->name('booking.home');
Route::get('/cargo-freight', [WebController::class, 'cargoFreight'])->name('cargo.freight');

Route::get('/freight-home', [WebController::class, 'freightHomepage'])->name('freight.home');
Route::get('/ffreight', [WebController::class, 'freightHomepage'])->name('ffreight.home');
Route::post('/freight-quotes', [WebController::class, 'freightQuoteStore'])->name('freight-quotes.store');
Route::get('/flight-booking', [WebController::class, 'freightTicketBooking'])->name('flight.ticket');

Route::get('/drivers-home', [WebController::class, 'driversHome'])->name('drivers.home');
Route::get('/driver-search-results', [WebController::class, 'driverSearchResults'])->name('driver.search.results');
Route::get('/driver-details', [WebController::class, 'driverDetails'])->name('driver.details');

Route::get('/vehicle-checkout', [WebController::class, 'vehicleCheckout'])->name('vehicle.checkout');
Route::get('/vehicle-payments', [WebController::class, 'vehiclePayments'])->name('vehicle.vehiclePayments');

Route::get('/summary', [WebController::class, 'summary'])->name('summary');

// Ticket booking (public screens)
Route::get('/ticketBooking', [WebController::class, 'ticketBooking'])->name('ticketBooking.ticketBooking');
Route::get('/trainTicketBookingDetails', [TrainController::class, 'search'])->name('TrainTicketBookingDetails.TrainTicketBookingDetails');
Route::get('/trainTicketBookingDetails/json', [TrainController::class, 'searchJson'])->name('trainTicketBookingDetails.json');
Route::get('/trainTicketBookingPreview', [TrainController::class, 'preview'])->name('trainTicketBookingPreview.trainTicketBookingPreview');
Route::post('/train-bookings', [TrainController::class, 'store'])->name('train-bookings.store')->middleware('auth');
Route::get('/train-booking-success/{reference}', [TrainController::class, 'bookingSuccess'])->name('train.booking.success')->middleware('auth');
// Bus booking routes (all routes are public - no auth required)
Route::get('/busTicketBookingDetails', [BusBookingController::class, 'search'])->name('busTicketBookingDetails.busTicketBookingDetails');
Route::get('/busTicketBookingDetails/json', [BusBookingController::class, 'searchJson'])->name('busTicketBookingDetails.json');
Route::post('/bus-bookings', [BusBookingController::class, 'store'])->name('bus-bookings.store')->middleware('auth');
Route::get('/bus-booking-success/{reference}', [BusBookingController::class, 'bookingSuccess'])->name('bus.booking.success')->middleware('auth');
Route::get('/busTicketBookingPreview', [BusBookingController::class, 'preview'])->name('busTicketBookingPreview.busTicketBookingPreview');

// Bus ticket routes
Route::get('/bus-ticket/download/{reference}', [BusBookingController::class, 'downloadTicket'])->name('bus.ticket.download')->middleware('auth');
Route::get('/bus-ticket/view/{reference}', [BusBookingController::class, 'viewTicket'])->name('bus.ticket.view')->middleware('auth');
Route::post('/bus-ticket/email/{reference}', [BusBookingController::class, 'emailTicket'])->name('bus.ticket.email')->middleware('auth');

// Bus booking cancellation routes
Route::get('/bus-bookings/{reference}/cancellation-policy', [BusBookingController::class, 'getCancellationPolicy'])->name('bus.booking.cancellation.policy')->middleware('auth');
Route::post('/bus-bookings/{reference}/cancel', [BusBookingController::class, 'cancelBooking'])->name('bus.booking.cancel')->middleware('auth');

// Train booking cancellation routes
Route::get('/train-bookings/{reference}/cancellation-policy', [TrainController::class, 'getCancellationPolicy'])->name('train.booking.cancellation.policy')->middleware('auth');
Route::post('/train-bookings/{reference}/cancel', [TrainController::class, 'cancelBooking'])->name('train.booking.cancel')->middleware('auth');

// Flight booking cancellation routes
Route::get('/flight-bookings/{reference}/cancellation-policy', [FlightBookingController::class, 'getCancellationPolicy'])->name('flight.booking.cancellation.policy')->middleware('auth');
Route::post('/flight-bookings/{reference}/cancel', [FlightBookingController::class, 'cancelBooking'])->name('flight.booking.cancel')->middleware('auth');

Route::get('/flightBooking', [WebController::class, 'flightBooking'])->name('flightBooking.flightBooking');
Route::post('/flight-bookings', [FlightBookingController::class, 'store'])->name('flight-bookings.store')->middleware('auth');

// Warehouse (public landing)
Route::get('/warehouse', [WebController::class, 'warehouse'])->name('warehouse.home');
Route::get('/warehouses/search', [WebController::class, 'warehouseList'])->name('warehouses.search');
Route::get('/warehouseList', [WebController::class, 'warehouseList'])->name('warehouse.list');
Route::get('/warehouseDetails', [WebController::class, 'warehouseDetails'])->name('warehouse.details');
Route::get('/freight-booking/create', [WebController::class, 'freightHomepage'])->name('freight.booking.create');

// multi - model (client-side)
Route::get('/multiModel', [WebController::class, 'multiModelHomepage'])->name('multiModelHomepage.home');
Route::get('/multiModel/plan-journey', [WebController::class, 'multiModelPlanJourney'])->name('multiModelPlanJourney.planJourney');
Route::get('/multiModel/available-vehicles', [WebController::class, 'multiModelAvailableVehicles'])->name('multiModelAvailableVehicles.availableVehicles');
Route::post('/multiModel/fetch-available-vehicles', [WebController::class, 'fetchAvailableVehicles'])->name('fetchAvailableVehicles');
Route::get('/multiModel/reviewJourney', [WebController::class, 'ReviewJourney'])->name('ReviewJourney.reviewJourney');
Route::get('/multiModel/travellerDetails', [WebController::class, 'TravellerDetails'])->name('TravellerDetails.travellerDetails');
Route::get('/multiModel/payment', [WebController::class, 'Payment'])->name('Payment.payment');
Route::get('/multiModel/vehicleDetails/{vehicle}', [WebController::class, 'MultimodelVehicleDetails'])->name('MultimodelVehicleDetails.multimodelVehicleDetails');

// Multi-Model Booking API Routes
Route::prefix('multiModel')->name('multiModel.')->group(function () {
    // Journey management
    Route::post('/journey/store', [MultiModelBookingController::class, 'storeJourneyPlan'])->name('journey.store');
    Route::get('/journey/get', [MultiModelBookingController::class, 'getJourneyPlan'])->name('journey.get');
    
    // Vehicle selection for legs
    Route::post('/leg/{legIndex}/available-vehicles', [MultiModelBookingController::class, 'getAvailableVehiclesForLeg'])->name('leg.vehicles');
    Route::post('/leg/{legIndex}/select-vehicle', [MultiModelBookingController::class, 'selectVehicleForLeg'])->name('leg.select');
    Route::delete('/leg/{legIndex}/remove-vehicle', [MultiModelBookingController::class, 'removeVehicleFromLeg'])->name('leg.remove');
    
    // Cart management
    Route::get('/cart', [MultiModelBookingController::class, 'getCart'])->name('cart.get');
    
    // Personal info (no auth required - stores in session)
    Route::post('/personal-info', [MultiModelBookingController::class, 'storePersonalInfo'])->name('personalInfo.store');
    
    // Checkout and payment (protected)
    Route::middleware(['auth'])->group(function () {
        Route::get('/checkout', [MultiModelBookingController::class, 'showCheckout'])->name('checkout');
        Route::get('/payment-page', [MultiModelBookingController::class, 'showPayment'])->name('payment.show');
        Route::post('/confirm', [MultiModelBookingController::class, 'confirmBooking'])->name('booking.confirm');
        Route::get('/booking/{id}/summary', [MultiModelBookingController::class, 'showSummary'])->name('booking.summary');
    });
    
    // Vendor approval endpoints (protected - requires vendor role)
    Route::middleware(['auth', 'vendor.verified'])->group(function () {
        Route::post('/vendor/booking/approve/{bookingId}/{bookingType}', [MultiModelBookingController::class, 'approveBooking'])->name('vendor.booking.approve');
        Route::post('/vendor/booking/reject/{bookingId}/{bookingType}', [MultiModelBookingController::class, 'rejectBooking'])->name('vendor.booking.reject');
    });
});

// bus section
Route::get('/multiModel/bus/busDetails', [WebController::class, 'BusDetails'])->name('BusDetails.busDetails');
Route::get('/multiModel/bus/payment', [WebController::class, 'BusPayment'])->name('BusPayment.busPayment');
Route::get('/multiModel/bus/confirmPayment', [WebController::class, 'BusConfirmPayment'])->name('BusConfirmPayment.busConfirmPayment');

// train section
Route::get('/multiModel/train/trainDetails', [WebController::class, 'TrainDetails'])->name('TrainDetails.trainDetails');
Route::get('/multiModel/train/payment', [WebController::class, 'TrainPayment'])->name('TrainPayment.trainPayment');
Route::get('/multiModel/train/confirmPayment', [WebController::class, 'TrainConfirmPayment'])->name('TrainConfirmPayment.trainConfirmPayment');

// yatch section
Route::get('/multiModel/yatch/yatchDetails', [WebController::class, 'YatchDetails'])->name('YatchDetails.yatchDetails');
Route::get('/multiModel/yatch/payment', [WebController::class, 'YatchPayment'])->name('YatchPayment.yatchPayment');
Route::get('/multiModel/yatch/confirmPayment', [WebController::class, 'YatchConfirmPayment'])->name('YatchConfirmPayment.yatchConfirmPayment');




// Warehouse booking flow
Route::prefix('warehouse-bookings')->name('warehouse-bookings.')->group(function () {
    // Public routes (category selection)
    Route::get('/', [WarehouseBookingController::class, 'category'])->name('category');

    // Warehouse listing by type (public)
    Route::get('/bookings/{type}', [WarehouseBookingController::class, 'index'])->name('index');

    // Warehouse details and booking form (public, but form submission requires auth)
    Route::get('/bookings/{type}/{id}', [WarehouseBookingController::class, 'details'])->name('details');

    // Public checkout and payment pages
    Route::get('/checkout', [WarehouseBookingController::class, 'checkout'])->name('checkout');
    Route::get('/payments', [WarehouseBookingController::class, 'payments'])->name('payments');

    // Booking endpoints used by frontend
    Route::post('/book', [WarehouseBookingController::class, 'store'])->name('book');
    Route::post('/store', [WarehouseBookingController::class, 'store'])->name('store');

    // Protected routes (require authentication)
    Route::middleware(['auth'])->group(function () {
        // Booking summary/confirmation
        Route::get('/summary/{bookingId?}', [WarehouseBookingController::class, 'summary'])->name('summary');

        // User's booking management
        Route::get('/my-bookings', [WarehouseBookingController::class, 'list'])->name('list');
        Route::get('/booking/{id}', [WarehouseBookingController::class, 'show'])->name('show');
        
        // Cancellation routes
        Route::get('/booking/{id}/cancel-preview', [\App\Http\Controllers\WarehouseBookingCancellationController::class, 'preview'])->name('cancel-preview');
        Route::post('/booking/{id}/cancel', [\App\Http\Controllers\WarehouseBookingCancellationController::class, 'cancel'])->name('cancel');
    });
});

/*
|--------------------------------------------------------------------------
| Public Vehicle Browsing
|--------------------------------------------------------------------------
*/
Route::get('/clientRent', [ClientVehicleController::class, 'home'])->name('client.home');
Route::get('/vehicleList', [ClientVehicleController::class, 'vehicleList'])->name('vehicle.list');
Route::get('/vehicleList/json', [ClientVehicleController::class, 'vehicleListJson'])->name('vehicle.list.json');
Route::get('/seaVehicleList', [ClientVehicleController::class, 'seaVehicleList'])->name('seaVehicle.list');
Route::get('/seaVehicleList/json', [ClientVehicleController::class, 'seaVehicleListJson'])->name('seaVehicle.list.json');
Route::get('/airVehicleList', [ClientVehicleController::class, 'airVehicleList'])->name('airVehicle.list');
Route::get('/airVehicleList/json', [ClientVehicleController::class, 'airVehicleListJson'])->name('airVehicle.list.json');
Route::get('/vehicleDetails/{vehicle}', [ClientVehicleController::class, 'vehicleDetails'])->name('vehicle.details');
Route::get('/airVehicleDetails/{vehicle}', [ClientVehicleController::class, 'airVehicleDetails'])->name('airVehicle.details');
Route::get('/seaVehicleDetails/{vehicle}', [ClientVehicleController::class, 'seaVehicleDetails'])->name('seaVehicle.details');
// API Routes for frontend functionality
Route::prefix('api')->name('api.')->group(function () {
    // Public normalized location lookup endpoints
    Route::get('/location/countries', [LocationLookupController::class, 'countries'])->name('location.countries');
    Route::get('/location/provinces', [LocationLookupController::class, 'provinces'])->name('location.provinces');
    Route::get('/location/districts', [LocationLookupController::class, 'districts'])->name('location.districts');
    Route::get('/location/cities', [LocationLookupController::class, 'cities'])->name('location.cities');

    // Public warehouse units list
    Route::get('/warehouse-units', [WarehouseBookingController::class, 'getWarehouseUnits'])->name('warehouse-units.index');

    // Warehouse API endpoints
    Route::get('/warehouse-units/{id}', [WarehouseBookingController::class, 'getWarehouseUnit'])->name('warehouse-units.show');
    Route::get('/warehouse-units/{id}/availability', [WarehouseBookingController::class, 'getWarehouseAvailability'])->name('warehouse-units.availability');

    // Warehouse like toggle (requires auth)
    Route::middleware(['auth'])->group(function () {
        Route::post('/warehouse/like-toggle', [WarehouseBookingController::class, 'toggleLike'])->name('client.warehouse.like.toggle');
        Route::get('/dashboard/global-search', GlobalDashboardSearchController::class)->name('dashboard.global-search');
    });
});

// Warehouse Reviews (requires auth)
Route::middleware(['auth'])->group(function () {
    Route::post('/warehouse-reviews', [WarehouseBookingController::class, 'storeReview'])->name('warehouse.reviews.store');
});

/*
|--------------------------------------------------------------------------
| Client booking flow (some public screens + protected actions)
|--------------------------------------------------------------------------
*/
Route::prefix('client')->as('client.')->group(function () {
    Route::get('/bookings/quote', [ClientBookingController::class, 'quote'])->name('bookings.quote');
    Route::get('/vehicles/{vehicle}/extras', [ClientBookingController::class, 'extras'])->name('vehicles.extras');
    Route::patch('/bookings/{booking}/addons', [ClientBookingController::class, 'updateAddons'])->name('bookings.updateAddons');
    Route::patch('/bookings/{airVehicleBooking}/addons', [ClientBookingController::class, 'updateAirVehicleAddons'])->name('bookings.updateAirVehicleAddons');

    // Authenticated client routes (must be client role)
    // NOTE: this route group is for client users. It previously used `role:vendor` which
    // prevented client accounts from accessing these pages (air/land booking checkout/payments).
    // Change to `role:client` so authenticated clients can reach the booking flows.
    Route::middleware(['auth', 'role:client'])->group(function () {
        Route::get('/bookings/checkout', [ClientBookingController::class, 'showCheckout'])->name('bookings.checkout');
        Route::post('/bookings', [ClientBookingController::class, 'store'])->name('bookings.store');
        Route::get('/bookings/{booking}/payments', [ClientBookingController::class, 'payments'])->name('bookings.payments');
        Route::post('/bookings/{booking}/confirm', [ClientBookingController::class, 'confirm'])->name('bookings.confirm');
        Route::get('/bookings/{booking}/summary', [ClientBookingController::class, 'summary'])->name('bookings.summary');
        Route::post('/bookings/{booking}/cancel', [ClientBookingController::class, 'cancel'])->name('bookings.cancel');
        
        // Vehicle booking cancellation routes
        Route::get('/bookings/{booking}/cancellation-policy', [ClientBookingController::class, 'getCancellationPolicy'])->name('bookings.cancellation-policy');
        Route::post('/bookings/{booking}/cancel-booking', [ClientBookingController::class, 'cancelBooking'])->name('bookings.cancel-booking');
        Route::get('/bookings/{booking}/vendor/cancellation-policy', [ClientBookingController::class, 'getVendorCancellationPolicy'])->name('bookings.vendor.cancellation-policy');
        Route::post('/bookings/{booking}/vendor/cancel-booking', [ClientBookingController::class, 'cancelBookingAsVendor'])->name('bookings.vendor.cancel-booking');

        Route::get('/airBookings/quote', [ClientBookingController::class, 'airVehicleQuote'])->name('airBookings.quote');
        Route::get('/airBookings/checkout', [ClientBookingController::class, 'showAirVehicleCheckout'])->name('airBookings.checkout');
        Route::post('/airBookings', [ClientBookingController::class, 'airVehicleStore'])->name('airBookings.store');
        // Use a consistent route parameter name so Laravel's route-model binding
        // can inject the AirVehicleBookings model into controller methods.
        Route::get('/airBookings/{airVehicleBooking}/payments', [ClientBookingController::class, 'airVehiclePayments'])->name('airBookings.payments');
        Route::post('/airBookings/{airVehicleBooking}/confirm', [ClientBookingController::class, 'airVehicleConfirm'])->name('airBookings.confirm');
        Route::get('/airBookings/{airVehicleBooking}/summary', [ClientBookingController::class, 'airVehicleSummary'])->name('airBookings.summary');
        Route::get('/airBookings/{airVehicleBooking}/cancellation-policy', [ClientBookingController::class, 'getAirVehicleCancellationPolicy'])->name('airBookings.cancellation-policy');
        Route::post('/airBookings/{airVehicleBooking}/cancel', [ClientBookingController::class, 'airVehicleCancel'])->name('airBookings.cancel');

        // Sea Vehicle Booking Routes
        Route::get('/seaBookings/quote', [ClientBookingController::class, 'seaVehicleQuote'])->name('seaBookings.quote');
        Route::get('/seaBookings/checkout', [ClientBookingController::class, 'showSeaVehicleCheckout'])->name('seaBookings.checkout');
        Route::post('/seaBookings', [ClientBookingController::class, 'seaVehicleStore'])->name('seaBookings.store');
        // Use a consistent route parameter name so Laravel's route-model binding
        // can inject the SeaVehicleBookings model into controller methods.
        Route::get('/seaBookings/{seaVehicleBooking}/payments', [ClientBookingController::class, 'seaVehiclePayments'])->name('seaBookings.payments');
        Route::post('/seaBookings/{seaVehicleBooking}/confirm', [ClientBookingController::class, 'seaVehicleConfirm'])->name('seaBookings.confirm');
        Route::get('/seaBookings/{seaVehicleBooking}/summary', [ClientBookingController::class, 'seaVehicleSummary'])->name('seaBookings.summary');
        Route::get('/seaBookings/{seaVehicleBooking}/cancellation-policy', [ClientBookingController::class, 'getSeaVehicleCancellationPolicy'])->name('seaBookings.cancellation-policy');
        Route::post('/seaBookings/{seaVehicleBooking}/cancel', [ClientBookingController::class, 'seaVehicleCancel'])->name('seaBookings.cancel');



        Route::post('/vehicle-like/toggle', [VehicleLikeController::class, 'toggle'])->name('vehicle.like.toggle');
        Route::get('/vehicles/{vehicle}/reviews', [VehicleReviewController::class, 'index'])->name('vehicles.reviews.index');
        Route::post('/vehicles/{vehicle}/reviews', [VehicleReviewController::class, 'store'])->name('vehicles.reviews.store');
        Route::get('/vehicles/{vehicle}/policy/preview', [ClientVehicleController::class, 'policyPreview'])->name('vehicles.policy.preview');

        Route::get('/warehouses/dashboard-data', [WarehouseBookingController::class, 'dashboardData'])->name('warehouses.dashboard-data');
    });
});

/*
|--------------------------------------------------------------------------
| Super Admin Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'superadmin'])->prefix('superadmin')->name('superadmin.')->group(function () {
    Route::redirect('/dashboard', '/superadmin/analytics')->name('dashboard');

    // Profile Routes
    Route::get('/profile', [\App\Http\Controllers\SuperAdmin\ProfileController::class, 'index'])->name('profile');
    Route::put('/profile', [\App\Http\Controllers\SuperAdmin\ProfileController::class, 'update'])->name('profile.update');

    // In-group mixed-case compatibility redirects.
    Route::redirect('/Analytics', '/superadmin/analytics');
    Route::redirect('/Users', '/superadmin/users');
    Route::redirect('/AddUser', '/superadmin/users/create')->name('AddUser');
    Route::redirect('/Vehicles', '/superadmin/vehicles');
    Route::redirect('/Warehouse', '/superadmin/warehouse');
    Route::redirect('/LandVehicleDetails', '/superadmin/land-vehicle-details');
    Route::redirect('/SeaVehicleDetails', '/superadmin/sea-vehicle-details');
    Route::redirect('/AirVehicleDetails', '/superadmin/air-vehicle-details');
    Route::redirect('/Vender', '/superadmin/vendors')->name('NewVender');
    Route::redirect('/CourierOperations', '/superadmin/courier-operations')->name('CourierOperations');
    Route::redirect('/PricingGovernance', '/superadmin/pricing-governance')->name('PricingGovernance');

    Route::get('/analytics', function () {
        return Inertia::render('Web/home/SuperAdmin/Analytics');
    })->name('Analytics');

    Route::get('/users', [\App\Http\Controllers\SuperAdmin\UserController::class, 'index'])->name('Users');

    // User Management Routes
    Route::prefix('users')->name('users.')->group(function () { 
        Route::get('/clients', [\App\Http\Controllers\SuperAdmin\UserController::class, 'clients'])->name('clients');
        Route::get('/service-providers', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'index'])->name('serviceProviders');
        Route::get('/service-providers/{user}/review', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'show'])->name('serviceProviders.review');
        Route::post('/service-providers/{registration}/approve-service', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'approveService'])->name('serviceProviders.approveService');
        Route::post('/service-providers/{registration}/reject-service', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'rejectService'])->name('serviceProviders.rejectService');
        Route::post('/service-providers/{registration}/request-service-revision', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'requestServiceRevision'])->name('serviceProviders.requestServiceRevision');
        Route::post('/service-providers/{registration}/handle-resubmitted', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'handleResubmittedService'])->name('serviceProviders.handleResubmitted');
        Route::post('/service-providers/{user}/approve-all', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'approveAll'])->name('serviceProviders.approveAll');
        Route::post('/service-providers/{user}/reject-all', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'rejectAll'])->name('serviceProviders.rejectAll');
        Route::post('/service-providers/{user}/request-revision', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'requestRevision'])->name('serviceProviders.requestRevision');
        Route::post('/service-providers/{user}/add-note', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'addNote'])->name('serviceProviders.addNote');
        Route::post('/service-providers/{user}/block', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'blockVendor'])->name('serviceProviders.block');
        Route::post('/service-providers/{user}/unblock', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'unblockVendor'])->name('serviceProviders.unblock');
        Route::get('/service-providers/{registration}/download-document/{fieldKey}', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'downloadDocument'])->name('serviceProviders.downloadDocument');
        Route::get('/service-providers/{user}/download-all-documents', [\App\Http\Controllers\SuperAdmin\ServiceProviderController::class, 'downloadAllDocuments'])->name('serviceProviders.downloadAllDocs');
        Route::get('/export', [\App\Http\Controllers\SuperAdmin\UserController::class, 'export'])->name('export');
        Route::get('/clients/export', [\App\Http\Controllers\SuperAdmin\UserController::class, 'export'])->name('clients.export');
        Route::get('/service-providers/export', [\App\Http\Controllers\SuperAdmin\UserController::class, 'export'])->name('serviceProviders.export');

        // Driver Management Routes
        Route::get('/drivers', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'index'])->name('drivers');
        Route::get('/drivers/{driver}', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'show'])->name('drivers.show');
        Route::post('/drivers/{driver}/status', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'changeStatus'])->name('drivers.changeStatus');
        Route::post('/drivers/{driver}/verify-license', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'verifyLicense'])->name('drivers.verifyLicense');
        Route::post('/drivers/{driver}/approve', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'approveDriver'])->name('drivers.approve');
        Route::delete('/drivers/{driver}', [\App\Http\Controllers\SuperAdmin\DriverController::class, 'destroy'])->name('drivers.destroy');

        Route::get('/create', [\App\Http\Controllers\SuperAdmin\UserController::class, 'create'])->name('create');
        Route::post('/', [\App\Http\Controllers\SuperAdmin\UserController::class, 'store'])->name('store');
        Route::get('/{user}', [\App\Http\Controllers\SuperAdmin\UserController::class, 'show'])->name('show');
        Route::get('/{user}/edit', [\App\Http\Controllers\SuperAdmin\UserController::class, 'edit'])->name('edit');
        Route::put('/{user}', [\App\Http\Controllers\SuperAdmin\UserController::class, 'update'])->name('update');
        Route::delete('/{user}', [\App\Http\Controllers\SuperAdmin\UserController::class, 'destroy'])->name('destroy');
        Route::post('/bulk-delete', [\App\Http\Controllers\SuperAdmin\UserController::class, 'bulkDelete'])->name('bulkDelete');
        Route::post('/{user}/status', [\App\Http\Controllers\SuperAdmin\UserController::class, 'changeStatus'])->name('changeStatus');
    });

    // Vehicle Management Routes
    Route::get('/vehicles', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'index'])->name('Vehicles');
    Route::get('/vehicles/{vehicle}', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'show'])->name('vehicles.show');
    Route::put('/vehicles/{vehicle}/approval', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'updateApprovalStatus'])->name('vehicles.approval');
    Route::put('/vehicles/{vehicle}/status', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'updateStatus'])->name('vehicles.status');
    Route::delete('/vehicles/{vehicle}', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'destroy'])->name('vehicles.destroy');
    Route::post('/vehicles/bulk-approve', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'bulkApprove'])->name('vehicles.bulkApprove');
    Route::post('/vehicles/bulk-reject', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'bulkReject'])->name('vehicles.bulkReject');
    Route::get('/vehicles/export', [\App\Http\Controllers\SuperAdmin\VehicleController::class, 'export'])->name('vehicles.export');

    // Warehouse Management Routes
    Route::get('/warehouse', [\App\Http\Controllers\SuperAdmin\WarehouseController::class, 'index'])->name('Warehouse');
    Route::get('/warehouses/{warehouse}', [\App\Http\Controllers\SuperAdmin\WarehouseController::class, 'show'])->name('warehouses.show');
    Route::put('/warehouses/{warehouse}/status', [\App\Http\Controllers\SuperAdmin\WarehouseController::class, 'updateStatus'])->name('warehouses.updateStatus');

    // Legacy vehicle detail routes (can be updated later to use the main vehicle show route)
    Route::get('/land-vehicle-details', function () {
        return Inertia::render('Web/home/SuperAdmin/LandVehicleDetails');
    })->name('LandVehicleDetails');

    Route::get('/sea-vehicle-details', function () {
        return Inertia::render('Web/home/SuperAdmin/SeaVehicleDetails');
    })->name('SeaVehicleDetails');

    Route::get('/air-vehicle-details', function () {
        return Inertia::render('Web/home/SuperAdmin/AirVehicleDetails');
    })->name('AirVehicleDetails');

    // Reports Routes
    Route::prefix('reports')->name('reports.')->middleware('superadmin.courier.permission:superadmin.courier.reports.view')->group(function () {
        Route::get('/filter-options', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'getFilterOptions'])->name('filterOptions');
        Route::get('/vehicles', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'vehicleBookings'])->name('vehicles');
        Route::get('/vehicles/land', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'landVehicleBookings'])->name('vehicles.land');
        Route::get('/vehicles/air', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'airVehicleBookings'])->name('vehicles.air');
        Route::get('/vehicles/sea', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'seaVehicleBookings'])->name('vehicles.sea');
        Route::get('/tickets', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'ticketBookings'])->name('tickets');
        Route::get('/warehouse', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'warehouseBookings'])->name('warehouse');
        Route::get('/multimodal', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'multimodalBookings'])->name('multimodal');
        Route::get('/courier', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'courierBookings'])->name('courier');
        Route::get('/freight', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'freightBookings'])->name('freight');
        Route::get('/users/clients', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'clientReports'])->name('users.clients');
        Route::get('/users/service-providers', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'serviceProviderReports'])->name('users.serviceProviders');
        Route::get('/users/drivers', [\App\Http\Controllers\SuperAdmin\ReportsController::class, 'driverReports'])->name('users.drivers');
    });

    // Courier Operations (Phase 3)
    Route::prefix('courier-operations')->name('courier-operations.')->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'index'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.view')
            ->name('index');

        Route::post('/shipments/{shipment}/reassign', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'reassign'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.reassign')
            ->name('reassign');

        Route::post('/shipments/{shipment}/force-transition', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'forceTransition'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.force_transition')
            ->name('force-transition');

        Route::post('/shipments/{shipment}/freeze', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'freeze'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.freeze')
            ->name('freeze');

        Route::post('/shipments/{shipment}/unfreeze', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'unfreeze'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.freeze')
            ->name('unfreeze');

        Route::post('/shipments/{shipment}/cancel-override', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'cancelOverride'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.cancel_override')
            ->name('cancel-override');

        Route::get('/shipments/{shipment}/audit-history', [\App\Http\Controllers\SuperAdmin\CourierOperationsController::class, 'auditHistory'])
            ->middleware('superadmin.courier.permission:superadmin.courier.operations.audit.view')
            ->name('audit-history');
    });

    // Courier Pricing Governance (Phase 4)
    Route::prefix('pricing-governance')->name('pricing-governance.')->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'index'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.view')
            ->name('index');

        Route::post('/vendors/{vendorUserId}/categories/{category}/policy', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'updatePolicy'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.policy.manage')
            ->name('policy.update');

        Route::post('/vendors/{vendorUserId}/categories/{category}/approve', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'approve'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.review')
            ->name('approve');

        Route::post('/vendors/{vendorUserId}/categories/{category}/reject', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'reject'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.review')
            ->name('reject');

        Route::post('/vendors/{vendorUserId}/categories/{category}/force-publish', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'forcePublish'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.override')
            ->name('force-publish');

        Route::post('/vendors/{vendorUserId}/categories/{category}/rollback', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'rollback'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.override')
            ->name('rollback');

        Route::get('/vendors/{vendorUserId}/categories/{category}/audit-history', [\App\Http\Controllers\SuperAdmin\CourierPricingGovernanceController::class, 'auditHistory'])
            ->middleware('superadmin.courier.permission:superadmin.courier.pricing.governance.audit.view')
            ->name('audit-history');
    });

    // Vendor User Management API Routes
    Route::prefix('vendors')->name('vendors.')->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\VendorUserController::class, 'index'])->name('index');
        Route::post('/{user}/verify', [\App\Http\Controllers\SuperAdmin\VendorUserController::class, 'verify'])->name('verify');
        Route::post('/{user}/block', [\App\Http\Controllers\SuperAdmin\VendorUserController::class, 'block'])->name('block');
        Route::post('/{user}/unblock', [\App\Http\Controllers\SuperAdmin\VendorUserController::class, 'unblock'])->name('unblock');
        Route::post('/{user}/reject', [\App\Http\Controllers\SuperAdmin\VendorUserController::class, 'reject'])->name('reject');
    });

    // Settings Routes
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/cancellation', [\App\Http\Controllers\CancellationSettingsController::class, 'edit'])->name('cancellation.edit');
        Route::put('/cancellation', [\App\Http\Controllers\CancellationSettingsController::class, 'update'])->name('cancellation.update');
        
        Route::get('/commission', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'edit'])->name('commission.edit');

        Route::get('/cod-settlement', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'index'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settings.view')
            ->name('cod-settlement.index');
        Route::put('/cod-settlement', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'update'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settings.update')
            ->name('cod-settlement.update');
        Route::post('/cod-settlement/capabilities/{capability}/approve', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'approveCapability'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.capabilities.review')
            ->name('cod-settlement.capabilities.approve');
        Route::post('/cod-settlement/capabilities/{capability}/reject', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'rejectCapability'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.capabilities.review')
            ->name('cod-settlement.capabilities.reject');
        Route::post('/cod-settlement/capabilities/{capability}/revoke', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'revokeCapability'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.capabilities.review')
            ->name('cod-settlement.capabilities.revoke');
        Route::post('/cod-settlement/capabilities/{capability}/incidents', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'openIntegrityIncident'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.incidents.manage')
            ->name('cod-settlement.capabilities.incidents.open');
        Route::get('/cod-settlement/capabilities/{capability}/audit-history', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'capabilityAuditHistory'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settings.view')
            ->name('cod-settlement.capabilities.audit-history');
        Route::get('/cod-settlement/compliance-export', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'exportCompliancePackage'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.compliance.export')
            ->name('cod-settlement.compliance-export');
        Route::post('/cod-settlement/incidents/{incident}/assign', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'assignIntegrityIncident'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.incidents.manage')
            ->name('cod-settlement.incidents.assign');
        Route::post('/cod-settlement/incidents/{incident}/resolve', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'resolveIntegrityIncident'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.incidents.manage')
            ->name('cod-settlement.incidents.resolve');
        Route::post('/cod-settlement/batches/generate', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'generateSettlementBatch'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settlement.batch.manage')
            ->name('cod-settlement.batches.generate');
        Route::post('/cod-settlement/lines/{line}/reconcile', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'reconcileSettlementLine'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settlement.line.reconcile')
            ->name('cod-settlement.lines.reconcile');
        Route::post('/cod-settlement/lines/{line}/dispute', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'openSettlementLineDispute'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settlement.dispute.manage')
            ->name('cod-settlement.lines.dispute');
        Route::post('/cod-settlement/lines/{line}/resolve', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'resolveSettlementLineDispute'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settlement.dispute.manage')
            ->name('cod-settlement.lines.resolve');
        Route::get('/cod-settlement/batches/{batch}/export', [\App\Http\Controllers\SuperAdmin\CourierCodSettingsController::class, 'exportSettlementBatch'])
            ->middleware('superadmin.courier.permission:superadmin.courier.cod.settlement.export')
            ->name('cod-settlement.batches.export');
        
        Route::get('/website', [\App\Http\Controllers\SuperAdmin\WebsiteSettingsController::class, 'index'])->name('website.index');
        Route::post('/website/logo', [\App\Http\Controllers\SuperAdmin\WebsiteSettingsController::class, 'uploadLogo'])->name('website.uploadLogo');
        Route::get('/website/current-logo', [\App\Http\Controllers\SuperAdmin\WebsiteSettingsController::class, 'getCurrentLogo'])->name('website.currentLogo');
    });

    // Commission API Routes
    Route::prefix('commissions')->name('commissions.')->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'store'])->name('store');
        Route::get('/{commission}', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'show'])->name('show');
        Route::put('/{commission}', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'update'])->name('update');
        Route::delete('/{commission}', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'destroy'])->name('destroy');
        Route::patch('/{commission}/status', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'updateStatus'])->name('updateStatus');
        Route::post('/bulk-delete', [\App\Http\Controllers\SuperAdmin\CommissionController::class, 'bulkDelete'])->name('bulkDelete');
    });

    // Commission Earnings Routes
    Route::prefix('commission-earnings')->name('commission-earnings.')->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\CommissionEarningsController::class, 'index'])->name('index');
        Route::get('/report', [\App\Http\Controllers\SuperAdmin\CommissionEarningsController::class, 'report'])->name('report');
        Route::get('/export', [\App\Http\Controllers\SuperAdmin\CommissionEarningsController::class, 'export'])->name('export');
        Route::get('/service/{serviceType}', [\App\Http\Controllers\SuperAdmin\CommissionEarningsController::class, 'byServiceType'])->name('byServiceType');
        Route::get('/vendor/{vendorId}', [\App\Http\Controllers\SuperAdmin\CommissionEarningsController::class, 'vendorEarnings'])->name('vendorEarnings');
    });

    // Payments Routes
    Route::get('/payments', [\App\Http\Controllers\SuperAdmin\PaymentsController::class, 'index'])
        ->middleware('superadmin.courier.permission:superadmin.courier.payments.view')
        ->name('payments');
    Route::get('/payments/stats', [\App\Http\Controllers\SuperAdmin\PaymentsController::class, 'getPaymentStats'])
        ->middleware('superadmin.courier.permission:superadmin.courier.payments.view')
        ->name('payments.stats');
});


// vendor routes
Route::middleware(['auth', 'vendor.verified'])->prefix('vendors')->name('vendors.')->group(function () {
    Route::get('/mainDashboard', function () {
        return Inertia::render('Web/home/vendors/MainDashboard');
    })->name('mainDashboard');
});

// Warehouse (vendor-only) under /vendors/warehouse/*
Route::middleware(['auth', 'vendor.verified'])->prefix('vendors/warehouse')->name('vendors.warehouse.')->group(function () {
    Route::get('/dashboard', fn() => Inertia::render('Web/home/vendors/warehouse/Dashboard'))->name('dashboard');
    Route::get('/units', fn() => Inertia::render('Web/home/vendors/warehouse/Unit'))->name('units');
    Route::get('/addUnit', fn() => Inertia::render('Web/home/vendors/warehouse/AddUnit'))->name('addUnit');
    Route::get('/editUnit/{id}', fn($id) => Inertia::render('Web/home/vendors/warehouse/EditUnit', ['unitId' => $id]))->name('editUnit');
    Route::get('/unitDetails/{id}', fn($id) => Inertia::render('Web/home/vendors/warehouse/UnitDetails', ['unitId' => $id]))->name('unitDetails');
    Route::get('/bookings', fn() => Inertia::render('Web/home/vendors/warehouse/Bookings'))->name('bookings');
    Route::get('/clients', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseClientController::class, 'index'])->name('clients');
    Route::get('/expenses', fn() => Inertia::render('Web/home/vendors/warehouse/Expenses'))->name('expenses');
    Route::get('/payment', fn() => Inertia::render('Web/home/vendors/warehouse/Payment'))->name('payment');
    Route::get('/tracking', fn() => Inertia::render('Web/home/vendors/warehouse/Tracking'))->name('tracking');
    Route::get('/calendar', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseCalendarController::class, 'index'])->name('calendar');

    // Notification routes
    Route::get('/notifications', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'index'])->name('notifications');
    Route::get('/notifications/data', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'getData'])->name('notifications.data');
    Route::get('/notifications/unread-count', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'unreadCount'])->name('notifications.unread-count');
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
    Route::delete('/notifications/{id}', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseNotificationController::class, 'destroy'])->name('notifications.destroy');

    // API routes for warehouse units
    Route::get('/api/units', [WarehouseUnitController::class, 'index'])->name('api.units.index');
    Route::post('/api/units', [WarehouseUnitController::class, 'store'])->name('api.units.store');
    Route::get('/api/units/{id}', [WarehouseUnitController::class, 'show'])->name('api.units.show');
    Route::put('/api/units/{id}', [WarehouseUnitController::class, 'update'])->name('api.units.update');
    Route::patch('/api/units/{id}', [WarehouseUnitController::class, 'update'])->name('api.units.patch');
    Route::patch('/api/units/{id}/status', [WarehouseUnitController::class, 'updateStatus'])->name('api.units.updateStatus');
    Route::delete('/api/units/{id}', [WarehouseUnitController::class, 'destroy'])->name('api.units.destroy');

    // Debug route
    Route::get('/api/debug/{id}', function($id) {
        return response()->json([
            'user_authenticated' => Auth::check(),
            'user_id' => Auth::id(),
            'user_role' => Auth::user()?->role,
            'requested_id' => $id,
            'warehouse_exists' => \App\Models\Warehouse\WarehouseUnit::where('id', $id)->exists(),
            'user_warehouse_exists' => \App\Models\Warehouse\WarehouseUnit::where('id', $id)->where('user_id', Auth::id())->exists(),
            'timestamp' => now(),
        ]);
    })->name('api.debug');

    // Test login endpoint for debugging
    Route::get('/api/test-login', function() {
        $user = \App\Models\User::find(1);
        if ($user) {
            Auth::login($user);
            return response()->json([
                'success' => true,
                'user_id' => Auth::id(),
                'user_role' => Auth::user()->role,
                'message' => 'User logged in successfully'
            ]);
        }
        return response()->json(['error' => 'User not found'], 404);
    })->name('api.test-login');

    // API routes for warehouse bookings management
    Route::get('/api/bookings', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'index'])->name('api.bookings.index');
    Route::get('/api/bookings/stats', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'getStats'])->name('api.bookings.stats');
    Route::get('/api/bookings/chart-data', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'getChartData'])->name('api.bookings.chart-data');
    Route::get('/api/bookings/{bookingId}', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'show'])->name('api.bookings.show');
    Route::patch('/api/bookings/{bookingId}/approve', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'approve'])->name('api.bookings.approve');
    Route::patch('/api/bookings/{bookingId}/reject', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'reject'])->name('api.bookings.reject');
    Route::patch('/api/bookings/{bookingId}/complete', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'complete'])->name('api.bookings.complete');
    Route::put('/api/bookings/{bookingId}', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'update'])->name('api.bookings.update');

    // API routes for warehouse reservations management
    Route::get('/reservations', fn() => Inertia::render('Web/home/vendors/warehouse/Reservation'))->name('reservations');
    Route::get('/api/reservations', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'index'])->name('api.reservations.index');
    Route::get('/api/reservations/stats', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'getStats'])->name('api.reservations.stats');
    Route::get('/api/reservations/chart-data', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'getChartData'])->name('api.reservations.chart-data');
    Route::get('/api/reservations/{reservationId}', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'show'])->name('api.reservations.show');
    Route::patch('/api/reservations/{reservationId}/confirm', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'confirm'])->name('api.reservations.confirm');
    Route::patch('/api/reservations/{reservationId}/cancel', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'cancel'])->name('api.reservations.cancel');
    Route::patch('/api/reservations/{reservationId}/complete', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'complete'])->name('api.reservations.complete');
    Route::put('/api/reservations/{reservationId}', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseReservationController::class, 'update'])->name('api.reservations.update');

    // Payment endpoints
    Route::get('/api/payment-transactions', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'getPaymentTransactions'])->name('api.payments.transactions');
    Route::get('/api/payment-stats', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'getPaymentStats'])->name('api.payments.stats');

    // Tracking / occupancy overview
    Route::get('/api/tracking', [\App\Http\Controllers\VendorWarehouseBookingController::class, 'getTrackingOverview'])->name('api.tracking');

    // Expenses
    Route::get('/api/expenses', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseExpenseController::class, 'index'])->name('api.expenses.index');
    Route::get('/api/expenses/stats', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseExpenseController::class, 'stats'])->name('api.expenses.stats');
    Route::post('/api/expenses', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseExpenseController::class, 'store'])->name('api.expenses.store');
    Route::put('/api/expenses/{id}', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseExpenseController::class, 'update'])->name('api.expenses.update');
    Route::delete('/api/expenses/{id}', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseExpenseController::class, 'destroy'])->name('api.expenses.destroy');
});

// Admin routes for warehouse approval (requires admin role)
Route::middleware(['auth', 'role:admin'])->prefix('admin/warehouse')->name('admin.warehouse.')->group(function () {
    Route::patch('/api/units/{id}/approve', [WarehouseUnitController::class, 'approve'])->name('api.units.approve');
    Route::patch('/api/units/{id}/reject', [WarehouseUnitController::class, 'reject'])->name('api.units.reject');

    Route::get('/unitDetails', fn() => Inertia::render('Web/home/vendors/warehouse/UnitDetails'))->name('unitDetails');
});

// Payments page (Legacy route for backward compatibility)
Route::redirect('/SuperAdmin/payments', '/superadmin/payments')->name('payments.index');

// Backward-compat: if any UI still links to /warehouse/*, redirect to /vendors/warehouse/* (protect with same middleware)
Route::middleware(['auth', 'vendor.verified'])->get('/warehouse/{path}', function (string $path) {
    return redirect('/vendors/warehouse/' . ltrim($path, '/'));
})->where('path', '.*');

// Bookings page with DB-fed props (table + chart)
Route::get('/bookings', [VendorBookingController::class, 'page'])->name('bookings');

// Clients page with actual booking data
Route::get('/clients', [VendorBookingController::class, 'clients'])->name('clients.public');

// Payment page with actual transaction data
Route::get('/payment', [VendorBookingController::class, 'payments'])->name('payment.public');

// Other pages (shells)
Route::get('/mainDashboard', fn() => Inertia::render('Web/home/vendors/MainDashboard'))->name('mainDashboard');
Route::get('/expenses', fn() => Inertia::render('Web/home/vendors/Expenses'))->name('expenses');
Route::get('/tracking', fn() => Inertia::render('Web/home/vendors/Tracking'))->name('tracking');
Route::get('/calendar', fn() => Inertia::render('Web/home/vendors/Calendar'))->name('calendar');

// Units UI
Route::get('/units', fn() => Inertia::render('Web/home/vendors/Unit'))->name('units');
Route::get('/addUnit', fn() => Inertia::render('Web/home/vendors/AddUnit'))->name('addUnit');
Route::get('/addUnit/{vehicle}', [VehicleController::class, 'edit'])->name('addUnit.edit');
Route::get('/unitDetails', fn() => Inertia::render('Web/home/vendors/UnitDetails'))->name('unitDetails');
Route::get('/unitDetails/{vehicle}', [VehicleController::class, 'detailsPage'])->name('unitDetails.show');

// Warehouse UI
Route::get('/warehouse', [WebController::class, 'warehouse'])->name('warehouse.home');
Route::get('/warehouse/unit', fn() => Inertia::render('Web/home/vendors/warehouse/Unit'))->name('warehouse.unit');

// Drivers UI
Route::get('/drivers', fn() => Inertia::render('Web/components/vendors/driver/Driver'))->name('drivers');

/*
|--------------------------------------------------------------------------
| Vendor App (Inertia UI)  /vendors/...
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'vendor.verified'])
    ->prefix('vendors')
    ->name('vendors.')
    ->group(function () use ($render) {
        // Dashboard with real props
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard'); // primary route
        Route::get('/', [DashboardController::class, 'index']); // legacy path

        // Notification routes
        Route::get('/notifications', [NotificationController::class, 'page'])->name('notifications');
        Route::get('/notifications/data', [NotificationController::class, 'index'])->name('notifications.index');
        Route::get('/notifications/count', [NotificationController::class, 'unreadCount'])->name('notifications.count');
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
        Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

        // Bookings page with DB-fed props (table + chart)
        Route::get('/bookings', [VendorBookingController::class, 'page'])->name('bookings');
        
        // API endpoint to update booking
        Route::patch('/api/bookings/{bookingId}', [VendorBookingController::class, 'update'])->name('api.bookings.update');

        // Clients page with actual booking data filtered by vehicle type
        Route::get('/clients', [VendorBookingController::class, 'clients'])->name('clients');

        // Payment page with actual transaction data
        Route::get('/payment', [VendorBookingController::class, 'payments'])->name('payment');

        // Vendor booking cancellation API routes
        Route::get('/bookings/{booking}/vendor/cancellation-policy', [ClientBookingController::class, 'getVendorCancellationPolicy'])->name('bookings.vendor.cancellation-policy');
        Route::post('/bookings/{booking}/vendor/cancel-booking', [ClientBookingController::class, 'cancelBookingAsVendor'])->name('bookings.vendor.cancel-booking');
        Route::get('/bookings/{bookingType}/{bookingId}/vendor/cancellation-policy', [VendorBookingController::class, 'getVendorCancellationPolicyByType'])->name('bookings.vendor.cancellation-policy.type');
        Route::post('/bookings/{bookingType}/{bookingId}/vendor/cancel-booking', [VendorBookingController::class, 'cancelBookingAsVendorByType'])->name('bookings.vendor.cancel-booking.type');
        Route::post('/bookings/{bookingType}/{bookingId}/assign-driver', [VendorBookingController::class, 'assignDriver'])->name('bookings.assign-driver');

        // Other pages (shells)
        Route::get('/mainDashboard', fn() => Inertia::render('Web/home/vendors/MainDashboard'))->name('mainDashboard');
        Route::get('/expenses', fn() => Inertia::render('Web/home/vendors/Expenses'))->name('expenses');
        Route::get('/tracking', fn() => Inertia::render('Web/home/vendors/Tracking'))->name('tracking');
        Route::get('/calendar', [VendorBookingController::class, 'calendar'])->name('calendar');

        // Units UI
        Route::get('/units',         $render('Web/home/vendors/Unit'))->name('units');
        Route::get('/addUnit',       $render('Web/home/vendors/AddUnit'))->name('addUnit');
        Route::get('/addUnit/{vehicle}', [VehicleController::class, 'edit'])->name('addUnit.edit');
        Route::get('/unitDetails',   $render('Web/home/vendors/UnitDetails'))->name('unitDetails');
        Route::get('/unitDetails/{vehicle}', [VehicleController::class, 'detailsPage'])->name('unitDetails.show');

        // Warehouse UI
        Route::get('/warehouse', [WebController::class, 'warehouse'])->name('warehouse.home');
        Route::get('/warehouse/unit', fn() => Inertia::render('Web/home/vendors/warehouse/Unit'))->name('warehouse.unit');

        // Drivers UI
        Route::get('/drivers', fn() => Inertia::render('Web/components/vendors/driver/Driver'))->name('drivers');
    });


/*
|--------------------------------------------------------------------------
| Vendor Backend (JSON / actions)  /vendor/...
|--------------------------------------------------------------------------
*/
Route::middleware(['auth']) // remove 'auth' here temporarily if testing unauthenticated
    ->prefix('vendor')
    ->name('vendor.')
    ->group(function () {
        // Vehicles CRUD
        Route::get('/vehicles', [VehicleController::class, 'index'])->name('vehicles.index');
        Route::get('/vehicles/list', [VehicleController::class, 'list'])->name('vehicles.list');
        Route::post('/vehicles', [VehicleController::class, 'store'])->name('vehicles.store.compat'); // legacy compat
        Route::post('/vehicles/store', [VehicleController::class, 'store'])->name('vehicles.store');
        Route::get('/vehicles/{vehicle}', [VehicleController::class, 'show'])->name('vehicles.show');
        Route::put('/vehicles/{vehicle}', [VehicleController::class, 'update'])->name('vehicles.update');
        Route::delete('/vehicles/{vehicle}', [VehicleController::class, 'destroy'])->name('vehicles.destroy');

        // Maintenance
        Route::post('/vehicles/{vehicle}/maintenance', [VehicleMaintenanceController::class, 'store'])->name('vehicles.maintenance.store');
        Route::get('/vehicles/{vehicle}/bookings/overlaps', [VehicleMaintenanceController::class, 'overlaps'])->name('vehicles.bookings.overlaps');
        Route::post('/vehicles/maintenance/notify', [VehicleMaintenanceController::class, 'notify'])->name('vehicles.maintenance.notify');

        // PDF policy
        Route::post('/vehicles/{vehicle}/policy', [VehiclePolicyController::class, 'store'])->name('vehicles.policy.store');
        Route::delete('/vehicles/{vehicle}/policy', [VehiclePolicyController::class, 'destroy'])->name('vehicles.policy.destroy');
        Route::get('/vehicles/{vehicle}/policy/view', [VehiclePolicyController::class, 'stream'])->name('vehicles.policy.stream');

        // Drivers JSON CRUD
        Route::get('/drivers', [DriverController::class, 'index'])->name('drivers.index');
        Route::post('/drivers', [DriverController::class, 'store'])->name('drivers.store');
        Route::get('/drivers/{driver}', [DriverController::class, 'show'])->name('drivers.show');
        Route::match(['put', 'post'], '/drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
        Route::delete('/drivers/{driver}', [DriverController::class, 'destroy'])->name('drivers.destroy');
        Route::post('/drivers/{driver}/renew-license', [DriverController::class, 'renewLicense'])->name('drivers.renew-license');

        // Image preview + download (auth-aware)
        Route::get('/drivers/{driver}/license/stream',   [DriverController::class, 'streamLicense'])->name('drivers.license.stream');
        Route::get('/drivers/{driver}/license/download', [DriverController::class, 'downloadLicense'])->name('drivers.license.download');
        Route::get('/drivers/{driver}/nic/stream',       [DriverController::class, 'streamNic'])->name('drivers.nic.stream');
        Route::get('/drivers/{driver}/nic/download',     [DriverController::class, 'downloadNic'])->name('drivers.nic.download');
    });

/*
|--------------------------------------------------------------------------
| Client dashboard
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'role:client'])
    ->prefix('client')
    ->name('client.')
    ->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('Web/home/client/ClientMainDashboard');
        })->name('mainDashboard');
    });

/*
|--------------------------------------------------------------------------
| User Dashboard Routes (Client Services)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', \App\Http\Middleware\ClientVerificationCheck::class])
    ->prefix('user')
    ->name('user.')
    ->group(function () {
        Route::get('/dashboard', [UserDashboardController::class, 'view'])->name('dashboard');
        Route::get('/flight-view', [UserDashboardController::class, 'flightView'])->name('fight_view');
        Route::get('/booking-view', [UserDashboardController::class, 'bookingView'])->name('booking_view');
        Route::get('/freight-bookings', [UserDashboardController::class, 'freightBookings'])->name('freight_bookings');
        Route::get('/airticket-book', [UserDashboardController::class, 'airticketBook'])->name('airticket_book');
        Route::get('/airticket-view', [UserDashboardController::class, 'airticketBookView'])->name('airticket_view');
        Route::delete('/booking/{id}', [UserDashboardController::class, 'destroy'])->name('booking_view.destroy');
    });

/*
|--------------------------------------------------------------------------
| General Dashboard Route (redirects based on role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard/view', [UserDashboardController::class, 'view'])->name('dashboard.view');
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard', [
            'user' => Auth::user()
        ]);
    })->name('dashboard');
});

// Client Dashboard Route with proper verification
Route::get('/client/dashboard', [ClientDashboardController::class, 'dashboard'])->name('client.dashboard');

// Main client dashboard route (referenced by auth controllers)
Route::get('/client/main-dashboard', [ClientDashboardController::class, 'dashboard'])->name('client.mainDashboard');

// Legacy client dashboard routes (public shell) - keep for backward compatibility
Route::get('/ClientDashboard', fn() => Inertia::render('Web/home/client/ClientDashboard'))->middleware(\App\Http\Middleware\ClientVerificationCheck::class)->name('ClientDashboard');
Route::get('/clientDashboard', [ClientDashboardController::class, 'dashboard'])->name('clientDashboard');

/*
|--------------------------------------------------------------------------
| Profile / App Shell
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // API route for user profile data
    Route::get('/api/user/profile', function () {
        return response()->json([
            'success' => true,
            'user' => Auth::user()
        ]);
    })->name('api.user.profile');
});

/*
|--------------------------------------------------------------------------
| Legacy redirects (keep all)
|--------------------------------------------------------------------------
*/
Route::redirect('/units', '/vendors/units')->name('units.legacy');
Route::redirect('/bookings', '/vendors/bookings')->name('bookings.legacy');
Route::redirect('/clients', '/vendors/clients')->name('clients.legacy');
Route::redirect('/expenses', '/vendors/expenses')->name('expenses.legacy');
Route::redirect('/payment', '/vendors/payment')->name('payment.legacy');
Route::redirect('/tracking', '/vendors/tracking')->name('tracking.legacy');
Route::redirect('/calendar', '/vendors/calendar')->name('calendar.legacy');
Route::redirect('/addUnit', '/vendors/addUnit')->name('addUnit.legacy');
Route::redirect('/unitDetails', '/vendors/unitDetails')->name('unitDetails.legacy');
Route::redirect('/dashboard', '/vendors/dashboard')->name('dashboard.legacy');

// SuperAdmin legacy redirects
Route::redirect('/SuperAdmin/Dashboard', '/superadmin/dashboard')->name('SuperAdmin.Dashboard.legacy');
Route::redirect('/SuperAdmin/Analytics', '/superadmin/analytics')->name('SuperAdmin.Analytics.legacy');
Route::redirect('/SuperAdmin/Users', '/superadmin/users')->name('SuperAdmin.Users.legacy');
Route::redirect('/SuperAdmin/AddUser', '/superadmin/users/create')->name('SuperAdmin.AddUser.legacy');
Route::redirect('/SuperAdmin/Vehicles', '/superadmin/vehicles')->name('SuperAdmin.Vehicles.legacy');
Route::redirect('/SuperAdmin/Warehouse', '/superadmin/warehouse')->name('SuperAdmin.Warehouse.legacy');
Route::redirect('/SuperAdmin/LandVehicleDetails', '/superadmin/land-vehicle-details')->name('SuperAdmin.LandVehicleDetails.legacy');
Route::redirect('/SuperAdmin/SeaVehicleDetails', '/superadmin/sea-vehicle-details')->name('SuperAdmin.SeaVehicleDetails.legacy');
Route::redirect('/SuperAdmin/AirVehicleDetails', '/superadmin/air-vehicle-details')->name('SuperAdmin.AirVehicleDetails.legacy');
Route::redirect('/SuperAdmin/Vender', '/superadmin/vendors')->name('SuperAdmin.NewVender.legacy');
Route::redirect('/SuperAdmin/settings/cancellation', '/superadmin/settings/cancellation')->name('SuperAdmin.settings.cancellation.legacy');
Route::redirect('/SuperAdmin/settings/commission', '/superadmin/settings/commission')->name('SuperAdmin.settings.commission.legacy');
Route::redirect('/SuperAdmin/settings/website', '/superadmin/settings/website')->name('SuperAdmin.settings.website.legacy');
Route::redirect('/SuperAdmin/settings/cod-settlement', '/superadmin/settings/cod-settlement')->name('SuperAdmin.settings.cod-settlement.legacy');
Route::redirect('/SuperAdmin/CourierOperations', '/superadmin/courier-operations')->name('SuperAdmin.CourierOperations.legacy');
Route::redirect('/SuperAdmin/PricingGovernance', '/superadmin/pricing-governance')->name('SuperAdmin.PricingGovernance.legacy');
// Route::get('/mainDashboard', function () {
//     return Inertia::render('Web/home/vendors/MainDashboard');
// })->name('mainDashboard');

Route::get('/unitDetails', function () {
    return Inertia::render('Web/home/vendors/UnitDetails');
})->name('unitDetails');

Route::middleware(['auth'])->group(function () {
    Route::get('/settingsPage', [VendorSettingsController::class, 'show'])->name('settingsPage');
    Route::post('/settingsPage', [VendorSettingsController::class, 'update'])->name('vendor.settings.update');
    Route::delete('/settingsPage/image', [VendorSettingsController::class, 'removeImage'])->name('vendor.settings.removeImage');
});

// end

// vendor dashboard - warehouse
Route::middleware(['auth', 'vendor.verified'])->group(function () {
    Route::get('/warehouse/bookings', function () {
        return Inertia::render('Web/home/vendors/warehouse/Bookings');
    })->name('warehouse.bookings');
});

// Legacy SuperAdmin report routes (mixed-case) redirected to canonical protected endpoints.
Route::redirect('/SuperAdmin/reports/filter-options', '/superadmin/reports/filter-options')->name('SuperAdmin.reports.filterOptions');
Route::redirect('/SuperAdmin/reports/vehicles', '/superadmin/reports/vehicles')->name('SuperAdmin.reports.vehicles');
Route::redirect('/SuperAdmin/reports/vehicles/land', '/superadmin/reports/vehicles/land')->name('SuperAdmin.reports.vehicles.land');
Route::redirect('/SuperAdmin/reports/vehicles/air', '/superadmin/reports/vehicles/air')->name('SuperAdmin.reports.vehicles.air');
Route::redirect('/SuperAdmin/reports/vehicles/sea', '/superadmin/reports/vehicles/sea')->name('SuperAdmin.reports.vehicles.sea');
Route::redirect('/SuperAdmin/reports/tickets', '/superadmin/reports/tickets')->name('SuperAdmin.reports.tickets');
Route::redirect('/SuperAdmin/reports/warehouse', '/superadmin/reports/warehouse')->name('SuperAdmin.reports.warehouse');
Route::redirect('/SuperAdmin/reports/multimodal', '/superadmin/reports/multimodal')->name('SuperAdmin.reports.multimodal');
Route::redirect('/SuperAdmin/reports/courier', '/superadmin/reports/courier')->name('SuperAdmin.reports.courier');
Route::redirect('/SuperAdmin/reports/freight', '/superadmin/reports/freight')->name('SuperAdmin.reports.freight');
Route::redirect('/SuperAdmin/reports/users/clients', '/superadmin/reports/users/clients')->name('SuperAdmin.reports.users.clients');
Route::redirect('/SuperAdmin/reports/users/service-providers', '/superadmin/reports/users/service-providers')->name('SuperAdmin.reports.users.serviceProviders');
Route::redirect('/SuperAdmin/reports/users/drivers', '/superadmin/reports/users/drivers')->name('SuperAdmin.reports.users.drivers');

// vendor - warehouse rent
Route::middleware(['auth', 'vendor.verified'])->group(function () {
    Route::get('/warehouse/unit', function () {
        return Inertia::render('Web/home/vendors/warehouse/Unit');
    })->name('warehouse.units');

    Route::get('/warehouse/dashboard', function () {
        return Inertia::render('Web/home/vendors/warehouse/Dashboard');
    })->name('warehouse.dashboard');

    Route::get('/warehouse/clients', function () {
        return Inertia::render('Web/home/vendors/warehouse/Client');
    })->name('warehouse.clients');

    Route::get('/warehouse/expenses', function () {
        return Inertia::render('Web/home/vendors/warehouse/Expenses');
    })->name('warehouse.expenses');

    Route::get('/warehouse/payment', function () {
        return Inertia::render('Web/home/vendors/warehouse/Payment');
    })->name('warehouse.payment');

    Route::get('/warehouse/tracking', function () {
        return Inertia::render('Web/home/vendors/warehouse/Tracking');
    })->name('warehouse.tracking');

    Route::get('/warehouse/calendar', [\App\Http\Controllers\WarehouseControllers\Vendor\WarehouseCalendarController::class, 'index'])->name('warehouse.calendar');

    Route::get('/warehouse/reservations', function () {
        return Inertia::render('Web/home/vendors/warehouse/Reservation');
    })->name('warehouse.reservations');

    Route::get('/warehouse/addUnit', function () {
        return Inertia::render('Web/home/vendors/warehouse/AddUnit');
    })->name('warehouse.addUnit');

    Route::get('/warehouse/unitDetails', function () {
        return Inertia::render('Web/home/vendors/warehouse/UnitDetails');
    })->name('warehouse.unitDetails');

    Route::get('/warehouse/settingsPage', [\App\Http\Controllers\VendorSettingsController::class, 'showWarehouse'])->name('warehouse.settingsPage');
});

// vendor dashboard - warehouse (all protected under auth + role:vendor in group above)

// vendor dashboard - ticket booking
Route::get('/ticketBooking/bookings', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Booking');
})->name('ticketBooking.bookings');

Route::get('/ticketBooking/units', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Unit');
})->name('ticketBooking.units');

Route::get('/ticketBooking/dashboard', function () {
    $userId = \Illuminate\Support\Facades\Auth::id();
    $baseQuery = \App\Models\FlightBooking::query();

    if ($userId) {
        $baseQuery->where('user_id', $userId);
    }

    $totalBookings = (clone $baseQuery)->count();
    $newBookings = (clone $baseQuery)
        ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
        ->count();
    $confirmedBookings = (clone $baseQuery)->where('status', 'confirmed')->count();

    return Inertia::render('Web/home/vendors/ticketBooking/Dashboard', [
        'ticketStats' => [
            'totalRevenue' => 0,
            'newBookings' => $newBookings,
            'confirmedBookings' => $confirmedBookings,
            'totalBookings' => $totalBookings,
        ],
    ]);
})->name('ticketBooking.dashboard');

Route::get('/ticketBooking/clients', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Client');
})->name('ticketBooking.clients');

Route::get('/ticketBooking/expenses', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Expenses');
})->name('ticketBooking.expenses');

Route::get('/ticketBooking/payment', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Payment');
})->name('ticketBooking.payment');

Route::get('/ticketBooking/tracking', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Tracking');
})->name('ticketBooking.tracking');

Route::get('/ticketBooking/calendar', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/Calendar');
})->name('ticketBooking.calendar');

Route::get('/ticketBooking/addUnit', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/AddUnit');
})->name('ticketBooking.addUnit');

Route::get('/ticketBooking/unitDetails', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/UnitDetails');
})->name('ticketBooking.unitDetails');

Route::get('/ticketBooking/settingsPage', function () {
    return Inertia::render('Web/home/vendors/ticketBooking/SettingsPage');
})->name('ticketBooking.settingsPage');



// vendor dashboard - courier service (service-scoped RBAC)
Route::middleware(['auth', 'service.workspace:courier_service', 'courier.session.security', 'courier.access.review.lifecycle'])->group(function () {
    Route::get('/courierService/bookings', [VendorCourierDashboardController::class, 'bookings'])
        ->middleware('service.permission:courier.bookings.view')
        ->name('courierService.bookings');

    Route::post('/courierService/bookings/{shipment}/lifecycle', [VendorCourierDashboardController::class, 'updateBookingLifecycle'])
        ->middleware('service.permission:courier.bookings.manage_lifecycle')
        ->name('courierService.bookings.lifecycle');

    Route::post('/courierService/bookings/bulk-lifecycle', [VendorCourierDashboardController::class, 'bulkUpdateBookingLifecycle'])
        ->middleware('service.permission:courier.bookings.bulk_update')
        ->name('courierService.bookings.bulk.lifecycle');

    Route::get('/courierService/units', [VendorCourierDashboardController::class, 'shipments'])
        ->middleware('service.permission:courier.shipments.view')
        ->name('courierService.units');

    Route::post('/courierService/shipments/{shipment}/stage', [VendorCourierDashboardController::class, 'updateShipmentStage'])
        ->middleware('service.permission:courier.shipments.update_stage')
        ->name('courierService.shipments.stage');

    Route::post('/courierService/shipments/bulk-stage', [VendorCourierDashboardController::class, 'bulkUpdateShipmentStage'])
        ->middleware('service.permission:courier.shipments.bulk_update')
        ->name('courierService.shipments.bulk.stage');

    Route::get('/courierService/dashboard', [VendorCourierDashboardController::class, 'dashboard'])
        ->middleware('service.permission:courier.dashboard.view')
        ->name('courierService.dashboard');

    Route::get('/courierService/dashboard/report', [VendorCourierDashboardController::class, 'dashboard'])
        ->middleware('service.permission:courier.reports.export')
        ->name('courierService.dashboard.report');

    Route::get('/courierService/clients', [VendorCourierDashboardController::class, 'clients'])
        ->middleware('service.permission:courier.clients.view')
        ->name('courierService.clients');

    Route::post('/courierService/clients/{contact}/profile', [VendorCourierDashboardController::class, 'updateClientProfile'])
        ->middleware('service.permission:courier.clients.manage')
        ->name('courierService.clients.profile');

    Route::get('/courierService/expenses', function () {
        return Inertia::render('Web/home/vendors/courierService/Expenses');
    })->middleware('service.permission:courier.finance.view')->name('courierService.expenses');

    Route::get('/courierService/payment', [VendorCourierDashboardController::class, 'payments'])
        ->middleware('service.permission:courier.finance.view')
        ->name('courierService.payment');

    Route::get('/courierService/tracking', [VendorCourierDashboardController::class, 'tracking'])
        ->middleware('service.permission:courier.tracking.view')
        ->name('courierService.tracking');

    Route::get('/courierService/calendar', [VendorCourierDashboardController::class, 'calendar'])
        ->middleware('service.permission:courier.calendar.view')
        ->name('courierService.calendar');

    Route::get('/courierService/addUnit', function () {
        return Inertia::render('Web/home/vendors/courierService/AddUnit');
    })->middleware('service.permission:courier.shipments.create')->name('courierService.addUnit');

    Route::get('/courierService/unitDetails', function () {
        return Inertia::render('Web/home/vendors/courierService/UnitDetails');
    })->middleware('service.permission:courier.shipments.view')->name('courierService.unitDetails');

    Route::get('/courierService/settingsPage', [VendorCourierDashboardController::class, 'settings'])
        ->middleware('service.permission:courier.settings.view')
        ->name('courierService.settingsPage');

    Route::get('/courierService/settingsPage/{module}', [VendorCourierDashboardController::class, 'settings'])
        ->where('module', 'business|operations|sla|tracking|notifications|integrations|services|labels|pricing|team')
        ->middleware('service.permission:courier.settings.view')
        ->name('courierService.settings.module');

    Route::get('/courierService/settingsPage/team/{topic}', [VendorCourierDashboardController::class, 'settingsTeamTopic'])
        ->where('topic', 'policy-controls|step-up-runtime|user-defaults|api-access|role-studio')
        ->middleware('service.permission:courier.settings.view')
        ->name('courierService.settings.team.topic');

    Route::get('/courierService/settingsPage/pricing/{topic}/{category?}', [VendorCourierDashboardController::class, 'settingsPricingTopic'])
        ->where([
            'topic' => 'currency-formula|policy-modules|contracts|service-catalog|governance|rate-cards|zone-master|lane-matrix|preview',
            'category' => 'domestic|international',
        ])
        ->middleware('service.permission:courier.settings.view')
        ->name('courierService.settings.pricing.topic');

    Route::post('/courierService/settingsPage', [VendorCourierDashboardController::class, 'updateSettings'])
        ->middleware('service.permission:courier.settings.update')
        ->name('courierService.settings.update');

    Route::post('/courierService/settingsPage/services/cod/request', [VendorCourierDashboardController::class, 'requestCodCapability'])
        ->middleware('service.permission:courier.settings.update')
        ->name('courierService.settings.services.cod.request');

    Route::post('/courierService/settingsPage/notifications/test-email', [VendorCourierDashboardController::class, 'sendNotificationTestEmail'])
        ->middleware(['service.permission:courier.settings.update', 'throttle:20,1'])
        ->name('courierService.settings.notifications.test-email');

    Route::get('/courierService/labels/sizes', [VendorCourierLabelController::class, 'listSizes'])
        ->middleware('service.permission:courier.labels.view')
        ->name('courierService.labels.sizes.index');

    Route::post('/courierService/labels/sizes', [VendorCourierLabelController::class, 'storeSize'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.sizes.store');

    Route::patch('/courierService/labels/sizes/{size}', [VendorCourierLabelController::class, 'updateSize'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.sizes.update');

    Route::delete('/courierService/labels/sizes/{size}', [VendorCourierLabelController::class, 'deleteSize'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.sizes.delete');

    Route::get('/courierService/labels/templates', [VendorCourierLabelController::class, 'listTemplates'])
        ->middleware('service.permission:courier.labels.view')
        ->name('courierService.labels.templates.index');

    Route::post('/courierService/labels/templates', [VendorCourierLabelController::class, 'storeTemplate'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.templates.store');

    Route::patch('/courierService/labels/templates/{template}', [VendorCourierLabelController::class, 'updateTemplate'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.templates.update');

    Route::delete('/courierService/labels/templates/{template}', [VendorCourierLabelController::class, 'deleteTemplate'])
        ->middleware(['service.permission:courier.labels.manage_templates', 'throttle:20,1'])
        ->name('courierService.labels.templates.delete');

    Route::post('/courierService/labels/preview', [VendorCourierLabelController::class, 'previewTemplate'])
        ->middleware(['service.permission:courier.labels.view', 'throttle:30,1'])
        ->name('courierService.labels.preview');

    Route::post('/courierService/labels/print', [VendorCourierLabelController::class, 'printLabels'])
        ->middleware(['service.permission:courier.labels.print', 'throttle:15,1'])
        ->name('courierService.labels.print');

    Route::get('/courierService/settingsPage/pricing/exchange-rates', [VendorCourierDashboardController::class, 'pricingExchangeRates'])
        ->middleware(['service.permission:courier.settings.view', 'throttle:20,1'])
        ->name('courierService.settings.pricing.exchange-rates');

    Route::post('/courierService/settingsPage/pricing/import/preview', [VendorCourierDashboardController::class, 'pricingImportPreview'])
        ->middleware(['service.permission:courier.settings.update', 'throttle:20,1'])
        ->name('courierService.settings.pricing.import.preview');

    Route::post('/courierService/settingsPage/pricing/import/apply', [VendorCourierDashboardController::class, 'pricingImportApply'])
        ->middleware(['service.permission:courier.settings.update', 'throttle:20,1'])
        ->name('courierService.settings.pricing.import.apply');

    Route::get('/courierService/profile', [VendorCourierDashboardController::class, 'profile'])
        ->middleware('service.permission:courier.profile.view')
        ->name('courierService.profile');

    Route::get('/courierService/profile/owner-info', [VendorCourierDashboardController::class, 'profile'])
        ->defaults('module', 'owner')
        ->middleware('service.permission:courier.profile.view')
        ->name('courierService.profile.owner');

    Route::get('/courierService/profile/{module}', [VendorCourierDashboardController::class, 'profile'])
        ->where('module', 'company|owner|security|compliance|services|activity')
        ->middleware('service.permission:courier.profile.view')
        ->name('courierService.profile.module');

    Route::post('/courierService/profile', [VendorCourierDashboardController::class, 'updateProfile'])
        ->middleware('service.permission:courier.profile.update')
        ->name('courierService.profile.update');

    Route::post('/courierService/profile/owner-info', [VendorCourierDashboardController::class, 'updateOwnerProfile'])
        ->middleware('service.permission:courier.profile.update')
        ->name('courierService.profile.owner.update');

    Route::delete('/courierService/profile/owner-image', [VendorCourierDashboardController::class, 'removeOwnerProfileImage'])
        ->middleware('service.permission:courier.profile.update')
        ->name('courierService.profile.owner.image.remove');

    Route::delete('/courierService/profile/logo', [VendorCourierDashboardController::class, 'removeProfileLogo'])
        ->middleware('service.permission:courier.profile.update')
        ->name('courierService.profile.logo.remove');

    Route::get('/courierService/team', [CourierTeamController::class, 'index'])
        ->middleware('service.permission:courier.team.view')
        ->name('courierService.team.index');

    Route::post('/courierService/team', [CourierTeamController::class, 'store'])
        ->middleware(['service.permission:courier.team.create_user', 'throttle:20,1'])
        ->name('courierService.team.store');

    Route::patch('/courierService/team/access-control-settings', [CourierTeamController::class, 'updateTeamAccessControlSettings'])
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:20,1'])
        ->name('courierService.team.access-control-settings.update');

    Route::post('/courierService/team/effective-access-preview', [CourierTeamController::class, 'previewEffectiveAccess'])
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.effective-access-preview');

    Route::get('/courierService/team/roles', [CourierTeamController::class, 'listRoles'])
        ->middleware('service.permission:courier.team.assign_role')
        ->name('courierService.team.roles.index');

    Route::post('/courierService/team/roles', [CourierTeamController::class, 'storeRole'])
        ->middleware(['service.permission:courier.team.assign_role', 'service.permission:courier.team.assign_permissions', 'throttle:20,1'])
        ->name('courierService.team.roles.store');

    Route::post('/courierService/team/roles/template', [CourierTeamController::class, 'storeRoleFromTemplate'])
        ->middleware(['service.permission:courier.team.assign_role', 'service.permission:courier.team.assign_permissions', 'throttle:20,1'])
        ->name('courierService.team.roles.store-template');

    Route::post('/courierService/team/roles/{roleName}/clone', [CourierTeamController::class, 'cloneRole'])
        ->middleware(['service.permission:courier.team.assign_role', 'service.permission:courier.team.assign_permissions', 'throttle:20,1'])
        ->name('courierService.team.roles.clone');

    Route::patch('/courierService/team/roles/{roleName}', [CourierTeamController::class, 'updateRole'])
        ->middleware(['service.permission:courier.team.assign_role', 'service.permission:courier.team.assign_permissions', 'throttle:20,1'])
        ->name('courierService.team.roles.update');

    Route::get('/courierService/team/roles/{roleName}/versions', [CourierTeamController::class, 'roleVersions'])
        ->middleware('service.permission:courier.team.assign_permissions')
        ->name('courierService.team.roles.versions');

    Route::patch('/courierService/team/{user}/access', [CourierTeamController::class, 'updateAccess'])
        ->middleware(['service.permission:courier.team.view', 'throttle:30,1'])
        ->name('courierService.team.access.update');

    Route::post('/courierService/team/bulk', [CourierTeamController::class, 'bulkUpdate'])
        ->middleware(['service.permission:courier.team.manage_status', 'throttle:15,1'])
        ->name('courierService.team.bulk');

    Route::get('/courierService/team/{user}/sessions', [CourierTeamController::class, 'listSessions'])
        ->middleware('service.permission:courier.team.sessions.view')
        ->name('courierService.team.sessions.index');

    Route::delete('/courierService/team/{user}/sessions/{sessionId}', [CourierTeamController::class, 'revokeSession'])
        ->middleware(['service.permission:courier.team.sessions.revoke', 'throttle:40,1'])
        ->name('courierService.team.sessions.revoke');

    Route::delete('/courierService/team/{user}/sessions', [CourierTeamController::class, 'revokeAllSessions'])
        ->middleware(['service.permission:courier.team.sessions.revoke', 'throttle:20,1'])
        ->name('courierService.team.sessions.revoke-all');

    Route::post('/courierService/team/ownership/{newOwner}', [CourierTeamController::class, 'transferOwnership'])
        ->middleware(['service.permission:courier.team.transfer_ownership', 'throttle:10,1'])
        ->name('courierService.team.transfer-ownership');

    Route::post('/courierService/team/sensitive-approvals/{approval}/approve', [CourierTeamController::class, 'approveSensitiveApproval'])
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.sensitive-approvals.approve');

    Route::post('/courierService/team/sensitive-approvals/{approval}/reject', [CourierTeamController::class, 'rejectSensitiveApproval'])
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.sensitive-approvals.reject');

    Route::post('/courierService/team/temporary-access/request', [CourierTeamController::class, 'requestTemporaryAccessElevation'])
        ->middleware(['service.permission:courier.team.view', 'throttle:20,1'])
        ->name('courierService.team.temporary-access.request');

    Route::post('/courierService/team/temporary-access/{grant}/approve', [CourierTeamController::class, 'approveTemporaryAccessElevation'])
        ->whereNumber('grant')
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.temporary-access.approve');

    Route::post('/courierService/team/temporary-access/{grant}/reject', [CourierTeamController::class, 'rejectTemporaryAccessElevation'])
        ->whereNumber('grant')
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.temporary-access.reject');

    Route::post('/courierService/team/temporary-access/{grant}/revoke', [CourierTeamController::class, 'revokeTemporaryAccessElevation'])
        ->whereNumber('grant')
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:30,1'])
        ->name('courierService.team.temporary-access.revoke');

    Route::post('/courierService/team/temporary-access/break-glass', [CourierTeamController::class, 'activateBreakGlassAccess'])
        ->middleware(['service.permission:courier.team.assign_permissions', 'throttle:10,1'])
        ->name('courierService.team.temporary-access.break-glass');

    Route::get('/courierService/security/session-status', [CourierTeamController::class, 'sessionSecurityStatus'])
        ->middleware('service.permission:courier.team.view')
        ->name('courierService.security.status');

    Route::post('/courierService/security/step-up/request', [CourierTeamController::class, 'requestStepUpVerification'])
        ->middleware(['service.permission:courier.team.view', 'throttle:10,1'])
        ->name('courierService.security.step-up.request');

    Route::post('/courierService/security/step-up/verify', [CourierTeamController::class, 'verifyStepUpVerification'])
        ->middleware(['service.permission:courier.team.view', 'throttle:20,1'])
        ->name('courierService.security.step-up.verify');

    Route::post('/courierService/security/device/trust', [CourierTeamController::class, 'trustCurrentDevice'])
        ->middleware(['service.permission:courier.team.view', 'throttle:15,1'])
        ->name('courierService.security.device.trust');

    Route::get('/courierService/team/access-reviews', [CourierTeamController::class, 'listAccessReviews'])
        ->middleware('service.permission:courier.team.access_review.view')
        ->name('courierService.team.access-reviews.index');

    Route::post('/courierService/team/access-reviews/{review}/certify', [CourierTeamController::class, 'certifyAccessReview'])
        ->whereNumber('review')
        ->middleware(['service.permission:courier.team.access_review.certify', 'throttle:20,1'])
        ->name('courierService.team.access-reviews.certify');

    Route::get('/courierService/team/api-access/credentials', [CourierTeamController::class, 'listApiCredentials'])
        ->middleware('service.permission:courier.team.api_access.view')
        ->name('courierService.team.api-access.index');

    Route::post('/courierService/team/api-access/credentials', [CourierTeamController::class, 'createApiCredential'])
        ->middleware(['service.permission:courier.team.api_access.manage', 'throttle:20,1'])
        ->name('courierService.team.api-access.store');

    Route::post('/courierService/team/api-access/credentials/{credential}/rotate', [CourierTeamController::class, 'rotateApiCredential'])
        ->whereNumber('credential')
        ->middleware(['service.permission:courier.team.api_access.manage', 'throttle:20,1'])
        ->name('courierService.team.api-access.rotate');

    Route::post('/courierService/team/api-access/credentials/{credential}/revoke', [CourierTeamController::class, 'revokeApiCredential'])
        ->whereNumber('credential')
        ->middleware(['service.permission:courier.team.api_access.manage', 'throttle:20,1'])
        ->name('courierService.team.api-access.revoke');
});

Route::prefix('/api/courier/service')->middleware(['throttle:120,1'])->group(function () {
    Route::get('/status', [CourierServiceApiGatewayController::class, 'status'])
        ->middleware('courier.api.key:service.status.read')
        ->name('courier.api.service.status');

    Route::post('/webhooks/shipments/status', [CourierServiceApiGatewayController::class, 'ingestShipmentWebhook'])
        ->middleware('courier.api.key:webhook.events.write,webhook.events.write')
        ->name('courier.api.webhooks.shipments.status');
});

Route::post('/webhooks/email/delivery', [CourierEmailDeliveryWebhookController::class, 'ingest'])
    ->middleware('throttle:120,1')
    ->name('courier.webhooks.email.delivery');



// vendor dashboard - freight
Route::get('/freight/bookings', function () {
    return Inertia::render('Web/home/vendors/freight/Booking');
})->name('freight.bookings');

Route::get('/freight/units', function () {
    return Inertia::render('Web/home/vendors/freight/Unit');
})->name('freight.units');

Route::get('/freight/dashboard', function () {
    $totalUnits = (int) (
        \App\Models\Unit::query()->sum('units_count')
    );

    return Inertia::render('Web/home/vendors/freight/Dashboard', [
        'freightStats' => [
            'totalUnits' => $totalUnits,
        ],
    ]);
})->name('freight.dashboard');

Route::get('/freight/clients', function () {
    return Inertia::render('Web/home/vendors/freight/Client');
})->name('freight.clients');

Route::get('/freight/expenses', function () {
    return Inertia::render('Web/home/vendors/freight/Expenses');
})->name('freight.expenses');

Route::get('/freight/payment', function () {
    return Inertia::render('Web/home/vendors/freight/Payment');
})->name('freight.payment');

Route::get('/freight/tracking', function () {
    return Inertia::render('Web/home/vendors/freight/Tracking');
})->name('freight.tracking');

Route::get('/freight/calendar', function () {
    return Inertia::render('Web/home/vendors/freight/Calendar');
})->name('freight.calendar');

Route::get('/freight/addUnit', function () {
    return Inertia::render('Web/home/vendors/freight/AddUnit');
})->name('freight.addUnit');

Route::get('/freight/unitDetails', function () {
    return Inertia::render('Web/home/vendors/freight/UnitDetails');
})->name('freight.unitDetails');

Route::get('/freight/settingsPage', function () {
    return Inertia::render('Web/home/vendors/freight/SettingsPage');
})->name('freight.settingsPage');



// vendor dashboard - multimodal
Route::get('/multimodal/bookings', function () {
    return Inertia::render('Web/home/vendors/multimodal/Booking');
})->name('multimodal.bookings');

Route::get('/multimodal/units', function () {
    return Inertia::render('Web/home/multimodal/MultimodalUnits');
})->name('multimodal.units');

Route::get('/multimodal/dashboard', function () {
    return Inertia::render('Web/home/vendors/multimodal/Dashboard');
})->name('multimodal.dashboard');

Route::get('/multimodal/clients', function () {
    return Inertia::render('Web/home/vendors/multimodal/Client');
})->name('multimodal.clients');

Route::get('/multimodal/expenses', function () {
    return Inertia::render('Web/home/vendors/multimodal/Expenses');
})->name('multimodal.expenses');

Route::get('/multimodal/payment', function () {
    return Inertia::render('Web/home/vendors/multimodal/Payment');
})->name('multimodal.payment');

Route::get('/multimodal/tracking', function () {
    return Inertia::render('Web/home/vendors/multimodal/Tracking');
})->name('multimodal.tracking');

Route::get('/multimodal/calendar', function () {
    return Inertia::render('Web/home/vendors/multimodal/Calendar');
})->name('multimodal.calendar');

Route::get('/multimodal/addUnit', function () {
    return Inertia::render('Web/home/vendors/multimodal/AddUnit');
})->name('multimodal.addUnit');

Route::get('/multimodal/unitDetails', function () {
    return Inertia::render('Web/home/vendors/multimodal/UnitDetails');
})->name('multimodal.unitDetails');


Route::get('/multimodal/settingsPage', function () {
    return Inertia::render('Web/home/vendors/multimodal/SettingsPage');
})->name('multimodal.settingsPage');


// end ==================================================


Route::get('/multimodal', function () {
    return Inertia::render('Web/home/multiModel/HomePage');
})->name('multimodal.home');


// Client dashboard - redirect to proper route
Route::get('/clientDashboard', function () {
    return redirect()->route('client.dashboard');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/clientDashboardSettings', [ClientSettingsController::class, 'show'])->name('clientDashboardSettings');
    Route::post('/clientDashboardSettings', [ClientSettingsController::class, 'update'])->name('client.settings.update');
    Route::delete('/clientDashboardSettings/image', [ClientSettingsController::class, 'removeImage'])->name('client.settings.removeImage');
});

Route::get('/clientTicketBookingDashboard', [UserDashboardController::class, 'ticketBookingDashboard'])->middleware(\App\Http\Middleware\ClientVerificationCheck::class)->name('clientTicketBookingDashboard');

Route::get('/clientVehicleDashboard', function () {
    $user = Auth::user();
    
    // Land bookings
    $landBookings = \App\Models\Booking::with(['vehicle', 'client'])
        ->where('client_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($booking) {
            $createdAt = $booking->created_at;
            return [
                'id' => $booking->id,
                'unique_key' => 'land-' . $booking->id,
                'booking_type' => 'land',
                'vehicle_name' => $booking->vehicle->name ?? $booking->vehicle->model ?? 'Vehicle',
                'vehicle_category' => $booking->vehicle->vehicle_category ?? 'land',
                'start_date' => $createdAt?->format('Y-m-d H:i'),
                'end_date' => $createdAt?->copy()?->addDays($booking->rental_days ?? 1)?->format('Y-m-d H:i'),
                'pickup_location' => $booking->vehicle->location ?? 'N/A',
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'hours' => 0,
                'created_at' => $booking->created_at,
                'booking_code' => $booking->booking_code ?? ('BK-' . $booking->id),
                'summary_url' => '/client/bookings/' . $booking->id . '/summary',
                'policy_url' => '/client/bookings/' . $booking->id . '/cancellation-policy',
                'cancel_url' => '/client/bookings/' . $booking->id . '/cancel-booking',
                'can_cancel' => true,
            ];
        });

    // Air bookings
    $airBookings = \App\Models\AirVehicleBookings::with(['vehicle', 'schedule'])
        ->where('client_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($booking) {
            return [
                'id' => $booking->id,
                'unique_key' => 'air-' . $booking->id,
                'booking_type' => 'air',
                'vehicle_name' => $booking->vehicle->name ?? $booking->vehicle->model ?? 'Air Vehicle',
                'vehicle_category' => 'air',
                'start_date' => $booking->schedule?->pickup_at ? \Carbon\Carbon::parse($booking->schedule->pickup_at)->format('Y-m-d H:i') : ($booking->created_at?->format('Y-m-d H:i')),
                'end_date' => $booking->schedule?->dropoff_at ? \Carbon\Carbon::parse($booking->schedule->dropoff_at)->format('Y-m-d H:i') : ($booking->created_at?->copy()?->addDays($booking->rental_days ?? 1)?->format('Y-m-d H:i')),
                'pickup_location' => $booking->schedule?->pickup_location ?? $booking->vehicle->location ?? 'N/A',
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'hours' => 0,
                'created_at' => $booking->created_at,
                'booking_code' => 'ABK-' . $booking->id,
                'summary_url' => '/client/airBookings/' . $booking->id . '/summary',
                'policy_url' => '/client/airBookings/' . $booking->id . '/cancellation-policy',
                'cancel_url' => '/client/airBookings/' . $booking->id . '/cancel',
                'can_cancel' => true,
            ];
        });

    // Sea bookings
    $seaBookings = \App\Models\SeaVehicleBookings::with(['vehicle', 'schedule'])
        ->where('client_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($booking) {
            return [
                'id' => $booking->id,
                'unique_key' => 'sea-' . $booking->id,
                'booking_type' => 'sea',
                'vehicle_name' => $booking->vehicle->name ?? $booking->vehicle->model ?? 'Sea Vehicle',
                'vehicle_category' => 'sea',
                'start_date' => $booking->schedule?->pickup_at ? \Carbon\Carbon::parse($booking->schedule->pickup_at)->format('Y-m-d H:i') : ($booking->created_at?->format('Y-m-d H:i')),
                'end_date' => $booking->schedule?->dropoff_at ? \Carbon\Carbon::parse($booking->schedule->dropoff_at)->format('Y-m-d H:i') : ($booking->created_at?->copy()?->addDays($booking->rental_days ?? 1)?->format('Y-m-d H:i')),
                'pickup_location' => $booking->schedule?->pickup_location ?? $booking->vehicle->location ?? 'N/A',
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'hours' => 0,
                'created_at' => $booking->created_at,
                'booking_code' => 'SBK-' . $booking->id,
                'summary_url' => '/client/seaBookings/' . $booking->id . '/summary',
                'policy_url' => '/client/seaBookings/' . $booking->id . '/cancellation-policy',
                'cancel_url' => '/client/seaBookings/' . $booking->id . '/cancel',
                'can_cancel' => true,
            ];
        });

    // Merge all booking types
    $bookings = $landBookings
        ->concat($airBookings)
        ->concat($seaBookings)
        ->sortByDesc('created_at')
        ->values();
    
    // Get available vehicles
    $vehicles = \App\Models\Vehicle::with(['provider'])
        ->where('status', 'active')
        ->get()
        ->map(function($vehicle) {
            return [
                'id' => $vehicle->id,
                'name' => $vehicle->name ?? $vehicle->model,
                'model' => $vehicle->model,
                'vehicle_category' => $vehicle->vehicle_category,
                'location' => $vehicle->location ?? 'N/A',
                'price' => $vehicle->price_per_day ?? 0,
                'price_per_day' => $vehicle->price_per_day ?? 0,
                'price_per_hour' => 0,
                'rating' => 0,
                'status' => $vehicle->status,
            ];
        });
    
    // Calculate monthly booking data (all booking types)
    $monthlyData = [];
    for ($i = 0; $i < 12; $i++) {
        $month = now()->subMonths(11 - $i);
        $monthLandBookings = \App\Models\Booking::with('vehicle')
            ->where('client_id', $user->id)
            ->whereYear('created_at', $month->year)
            ->whereMonth('created_at', $month->month)
            ->get();

        $monthAirCount = \App\Models\AirVehicleBookings::query()
            ->where('client_id', $user->id)
            ->whereYear('created_at', $month->year)
            ->whereMonth('created_at', $month->month)
            ->count();

        $monthSeaCount = \App\Models\SeaVehicleBookings::query()
            ->where('client_id', $user->id)
            ->whereYear('created_at', $month->year)
            ->whereMonth('created_at', $month->month)
            ->count();
        
        $monthlyData[] = [
            'month' => $month->format('M'),
            'land' => $monthLandBookings->filter(function($b) {
                $category = $b->vehicle->vehicle_category ?? 'land';
                return !in_array(strtolower($category), ['air', 'sea']);
            })->count(),
            'air' => $monthAirCount,
            'sea' => $monthSeaCount,
        ];
    }
    
    return Inertia::render('Web/home/client/ClientVehicleDashboard', [
        'bookings' => $bookings,
        'vehicles' => $vehicles,
        'monthlyData' => $monthlyData,
    ]);
})->middleware(\App\Http\Middleware\ClientVerificationCheck::class)->name('clientVehicleDashboard');

// Vendor All Bookings Dashboard
Route::get('/vendorAllBookings', [\App\Http\Controllers\VendorAllBookingsController::class, 'index'])
    ->middleware('auth')
    ->name('vendorAllBookings');

// Vendor Booking Calendar
Route::get('/vendorAllBookings/calendar', [\App\Http\Controllers\VendorAllBookingsController::class, 'calendar'])
    ->middleware('auth')
    ->name('vendorCalendar');

Route::get('/vendorAllBookings/clients', [\App\Http\Controllers\VendorAllBookingsController::class, 'clients'])
    ->middleware('auth')
    ->name('vendorAllBookingsClients');

Route::get('/vendorAllBookings/bookings', [\App\Http\Controllers\VendorAllBookingsController::class, 'bookings'])
    ->middleware('auth')
    ->name('vendorAllBookingsPage');

Route::get('/vendorAllBookings/payment', [\App\Http\Controllers\VendorAllBookingsController::class, 'payment'])
    ->middleware('auth')
    ->name('vendorAllBookingsPayment');

Route::get('/vendorAllBookings/expenses', [\App\Http\Controllers\VendorAllBookingsController::class, 'expenses'])
    ->middleware('auth')
    ->name('vendorAllBookingsExpenses');

// Vendor Profile Page (public view for clients)
Route::get('/vendors/profile/{userId}', [\App\Http\Controllers\VendorProfileController::class, 'showPublicProfile'])->name('vendors.public.profile');

// Vendor Profile & Service Registration Routes
Route::middleware(['auth'])->prefix('vendor/profile')->name('vendor.profile.')->group(function () {
    Route::get('/', [\App\Http\Controllers\VendorProfileController::class, 'index'])->name('index');
    Route::get('/step-1', [\App\Http\Controllers\VendorProfileController::class, 'step1'])->name('step1');
    Route::get('/service_registration', [\App\Http\Controllers\VendorProfileController::class, 'step2'])->name('step2');
    Route::get('/review_&_submit', [\App\Http\Controllers\VendorProfileController::class, 'step3'])->name('step3');
    Route::post('/activity-click', [\App\Http\Controllers\VendorProfileController::class, 'logButtonClick'])->name('activity-click');
    Route::post('/save', [\App\Http\Controllers\VendorProfileController::class, 'saveProfile'])->name('save');
    Route::post('/service/{subCategory}', [\App\Http\Controllers\VendorProfileController::class, 'saveServiceRegistration'])->name('service.save');
    Route::delete('/service/{subCategory}', [\App\Http\Controllers\VendorProfileController::class, 'removeServiceRegistration'])->name('service.remove');
    Route::post('/submit', [\App\Http\Controllers\VendorProfileController::class, 'submit'])->name('submit');
    Route::post('/submit-new-services', [\App\Http\Controllers\VendorProfileController::class, 'submitNewServices'])->name('submit-new-services');
    Route::delete('/logo', [\App\Http\Controllers\VendorProfileController::class, 'removeLogo'])->name('logo.remove');
});

Route::get('/clientAllBookings', function () {
    $clientId = Auth::id();
    
    // Fetch all booking types with relationships
    $vehicleBookings = \App\Models\Booking::where('client_id', $clientId)
        ->with(['vehicle.provider', 'client', 'customer', 'schedule', 'payments'])
        ->get()
        ->map(function($booking) {
            $vehicle = $booking->vehicle;
            $provider = $vehicle?->provider;
            $client = $booking->client;
            $customer = $booking->customer;
            $schedule = $booking->schedule;
            
            return [
                'id' => $booking->id,
                'booking_type' => 'vehicle',
                'service_name' => $vehicle->name ?? 'Vehicle Rental',
                'vehicle_name' => $vehicle->name ?? null,
                'vehicle_category' => $vehicle->category ?? null,
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'amount' => $booking->total_amount,
                'booking_date' => $booking->created_at->format('Y-m-d'),
                'start_date' => $booking->start_date,
                'end_date' => $booking->end_date,
                'pickup_location' => $schedule->pickup_location ?? null,
                'dropoff_location' => $schedule->dropoff_location ?? null,
                'booking_code' => $booking->booking_code ?? 'BK-' . $booking->id,
                'reference_number' => $booking->booking_code ?? 'REF-' . $booking->id,
                'currency' => $booking->currency ?? 'LKR',
                'created_at' => $booking->created_at,
                
                // User/Client Information
                'user' => $client ? [
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'address' => $client->address,
                ] : null,
                'customer_name' => $customer->name ?? $client->name ?? null,
                'customer_email' => $customer->email ?? $client->email ?? null,
                'customer_phone' => $customer->phone ?? $client->phone ?? null,
                'customer_address' => $customer->address ?? $client->address ?? null,
                
                // Vendor/Provider Information
                'vendor' => $provider ? [
                    'name' => $provider->name,
                    'email' => $provider->email,
                    'phone' => $provider->phone,
                    'address' => $provider->address,
                ] : null,
                'vendor_name' => $provider->name ?? null,
                'vendor_email' => $provider->email ?? null,
                'vendor_phone' => $provider->phone ?? null,
                'vendor_address' => $provider->address ?? null,
                'company_name' => $provider->company_name ?? $provider->name ?? null,
                
                // Payment Information
                'payment_method' => $booking->payments->first()->payment_method ?? 'Not specified',
                'payment_status' => $booking->payments->first()->status ?? $booking->status,
                
                // Additional Details
                'notes' => $booking->notes,
                'subtotal' => $booking->subtotal,
                'deposit_amount' => $booking->deposit_amount,
                'price_per_day' => $booking->price_per_day,
                'rental_days' => $booking->rental_days,
            ];
        });

    $airVehicleBookings = \App\Models\AirVehicleBookings::where('client_id', $clientId)
        ->with(['vehicle.provider', 'client', 'customer', 'schedule', 'payments'])
        ->get()
        ->map(function($booking) {
            $vehicle = $booking->vehicle;
            $provider = $vehicle?->provider;
            $client = $booking->client;
            $customer = $booking->customer;
            $schedule = $booking->schedule;

            return [
                'id' => 'air-' . $booking->id,
                'source_id' => $booking->id,
                'booking_type' => 'air',
                'service_name' => $vehicle->name ?? $vehicle->model ?? 'Air Vehicle Rental',
                'vehicle_name' => $vehicle->name ?? $vehicle->model ?? 'Air Vehicle',
                'vehicle_category' => 'air',
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'amount' => $booking->total_amount,
                'booking_date' => $booking->created_at?->format('Y-m-d'),
                'start_date' => $schedule?->pickup_at,
                'end_date' => $schedule?->dropoff_at,
                'pickup_location' => $schedule->pickup_location ?? null,
                'dropoff_location' => $schedule->dropoff_location ?? null,
                'booking_code' => 'ABK-' . $booking->id,
                'reference_number' => 'ABK-' . $booking->id,
                'currency' => $booking->currency ?? 'LKR',
                'created_at' => $booking->created_at,
                'user' => $client ? [
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'address' => $client->address,
                ] : null,
                'customer_name' => $customer->name ?? $client->name ?? null,
                'customer_email' => $customer->email ?? $client->email ?? null,
                'customer_phone' => $customer->phone ?? $client->phone ?? null,
                'customer_address' => $customer->address ?? $client->address ?? null,
                'vendor' => $provider ? [
                    'name' => $provider->name,
                    'email' => $provider->email,
                    'phone' => $provider->phone,
                    'address' => $provider->address,
                ] : null,
                'vendor_name' => $provider->name ?? null,
                'vendor_email' => $provider->email ?? null,
                'vendor_phone' => $provider->phone ?? null,
                'vendor_address' => $provider->address ?? null,
                'company_name' => $provider->company_name ?? $provider->name ?? null,
                'payment_method' => $booking->payments->first()->method ?? 'Not specified',
                'payment_status' => $booking->payments->first()->status ?? $booking->status,
                'notes' => $booking->notes,
                'subtotal' => $booking->subtotal,
                'deposit_amount' => $booking->deposit_amount,
                'price_per_day' => $booking->price_per_day,
                'rental_days' => $booking->rental_days,
            ];
        });

    $seaVehicleBookings = \App\Models\SeaVehicleBookings::where('client_id', $clientId)
        ->with(['vehicle.provider', 'client', 'customer', 'schedule', 'payments'])
        ->get()
        ->map(function($booking) {
            $vehicle = $booking->vehicle;
            $provider = $vehicle?->provider;
            $client = $booking->client;
            $customer = $booking->customer;
            $schedule = $booking->schedule;

            return [
                'id' => 'sea-' . $booking->id,
                'source_id' => $booking->id,
                'booking_type' => 'sea',
                'service_name' => $vehicle->name ?? $vehicle->model ?? 'Sea Vehicle Rental',
                'vehicle_name' => $vehicle->name ?? $vehicle->model ?? 'Sea Vehicle',
                'vehicle_category' => 'sea',
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'amount' => $booking->total_amount,
                'booking_date' => $booking->created_at?->format('Y-m-d'),
                'start_date' => $schedule?->pickup_at,
                'end_date' => $schedule?->dropoff_at,
                'pickup_location' => $schedule->pickup_location ?? null,
                'dropoff_location' => $schedule->dropoff_location ?? null,
                'booking_code' => 'SBK-' . $booking->id,
                'reference_number' => 'SBK-' . $booking->id,
                'currency' => $booking->currency ?? 'LKR',
                'created_at' => $booking->created_at,
                'user' => $client ? [
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'address' => $client->address,
                ] : null,
                'customer_name' => $customer->name ?? $client->name ?? null,
                'customer_email' => $customer->email ?? $client->email ?? null,
                'customer_phone' => $customer->phone ?? $client->phone ?? null,
                'customer_address' => $customer->address ?? $client->address ?? null,
                'vendor' => $provider ? [
                    'name' => $provider->name,
                    'email' => $provider->email,
                    'phone' => $provider->phone,
                    'address' => $provider->address,
                ] : null,
                'vendor_name' => $provider->name ?? null,
                'vendor_email' => $provider->email ?? null,
                'vendor_phone' => $provider->phone ?? null,
                'vendor_address' => $provider->address ?? null,
                'company_name' => $provider->company_name ?? $provider->name ?? null,
                'payment_method' => $booking->payments->first()->method ?? 'Not specified',
                'payment_status' => $booking->payments->first()->status ?? $booking->status,
                'notes' => $booking->notes,
                'subtotal' => $booking->subtotal,
                'deposit_amount' => $booking->deposit_amount,
                'price_per_day' => $booking->price_per_day,
                'rental_days' => $booking->rental_days,
            ];
        });

    // Fetch train bookings
    $trainBookings = \App\Models\TrainBooking::where('user_id', $clientId)
        ->with(['user', 'trainSchedule.train'])
        ->get()
        ->map(function($booking) {
            return [
                'id' => $booking->id,
                'booking_type' => 'train',
                'service_name' => 'Train Ticket - ' . ($booking->trainSchedule?->train?->name ?? 'Train'),
                'status' => $booking->status,
                'total_amount' => $booking->total_amount,
                'amount' => $booking->total_amount,
                'booking_date' => $booking->created_at->format('Y-m-d'),
                'reference_number' => $booking->booking_reference,
                'booking_code' => $booking->booking_reference,
                'currency' => 'LKR',
                'created_at' => $booking->created_at,
                'user' => $booking->user ? [
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'phone' => $booking->user->phone,
                    'address' => $booking->user->address,
                ] : null,
                'customer_name' => $booking->passenger_name,
                'customer_email' => $booking->passenger_email,
                'customer_phone' => $booking->passenger_phone,
                'payment_status' => $booking->payment_status,
                'notes' => "Adults: {$booking->adults}, Children: {$booking->children}, Infants: {$booking->infants}",
            ];
        });

    // Fetch bus bookings
    $busBookings = \App\Models\BusBooking::where('user_id', $clientId)
        ->with(['user', 'busSchedule'])
        ->get()
        ->map(function($booking) {
            return [
                'id' => $booking->id,
                'booking_type' => 'bus',
                'service_name' => 'Bus Ticket',
                'status' => $booking->status,
                'total_amount' => $booking->total_price,
                'amount' => $booking->total_price,
                'booking_date' => $booking->booking_date?->format('Y-m-d') ?? $booking->created_at->format('Y-m-d'),
                'reference_number' => $booking->booking_reference,
                'booking_code' => $booking->booking_reference,
                'currency' => 'LKR',
                'created_at' => $booking->created_at,
                'user' => $booking->user ? [
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'phone' => $booking->user->phone,
                    'address' => $booking->user->address,
                ] : null,
                'customer_name' => $booking->passenger_name,
                'customer_email' => $booking->passenger_email,
                'customer_phone' => $booking->passenger_phone,
                'notes' => "Passengers: {$booking->passenger_count}, Seats: " . implode(', ', $booking->seat_numbers ?? []),
            ];
        });

    // Fetch flight bookings
    $flightBookings = \App\Models\FlightBooking::when(
        Schema::hasColumn('flight_bookings', 'user_id'),
        fn($q) => $q->where('user_id', $clientId),
        fn($q) => $q->where('email', Auth::user()->email)
    )
        ->with(['user'])
        ->get()
        ->map(function($booking) {
            return [
                'id' => $booking->id,
                'booking_type' => 'flight',
                'service_name' => 'Flight Booking',
                'status' => $booking->status,
                'booking_date' => $booking->created_at->format('Y-m-d'),
                'start_date' => $booking->departure_date,
                'end_date' => $booking->return_date,
                'pickup_location' => $booking->departure_airport,
                'dropoff_location' => $booking->arriving_airport,
                'reference_number' => 'FL-' . $booking->id,
                'booking_code' => 'FL-' . $booking->id,
                'currency' => 'LKR',
                'created_at' => $booking->created_at,
                'user' => $booking->user ? [
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'phone' => $booking->user->phone,
                    'address' => $booking->user->address,
                ] : null,
                'customer_name' => $booking->name,
                'customer_email' => $booking->email,
                'customer_phone' => $booking->phone,
                'notes' => "Trip: {$booking->trip_type}. " . ($booking->special_requests ? "Requests: {$booking->special_requests}" : ''),
            ];
        });

    // Fetch courier shipments
    $courierShipmentTransformer = app(ClientCourierShipmentTransformer::class);

    $courierShipments = \App\Models\Courier\CourierShipment::where('requested_by_user_id', $clientId)
        ->with(['requestedBy', 'sender', 'recipient', 'senderAddress', 'recipientAddress', 'packages', 'latestPayment'])
        ->get()
        ->map(function ($shipment) use ($courierShipmentTransformer) {
            $booking = $courierShipmentTransformer->forUnifiedBooking($shipment);

            $paymentStatus = $booking['payment_status'] ?? $booking['paymentStatus'] ?? null;
            $paymentMethod = $booking['payment_method'] ?? $booking['paymentMethod'] ?? null;
            $paymentReference = $booking['payment_reference'] ?? $booking['paymentReference'] ?? null;

            return array_merge($booking, [
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'paymentStatus' => $paymentStatus ? \Illuminate\Support\Str::title(str_replace('_', ' ', (string) $paymentStatus)) : null,
                'paymentMethod' => $paymentMethod,
                'paymentReference' => $paymentReference,
            ]);
        });

    // Fetch warehouse bookings
    $warehouseBookings = \App\Models\Warehouse\WarehouseBooking::where('user_id', $clientId)
        ->with(['user', 'warehouseUnit.owner'])
        ->get()
        ->map(function($booking) {
            $unit = $booking->warehouseUnit;
            return [
                'id' => $booking->id,
                'booking_type' => 'warehouse',
                'service_name' => 'Warehouse Storage',
                'status' => $booking->status,
                'total_amount' => $booking->final_amount,
                'amount' => $booking->final_amount,
                'booking_date' => $booking->created_at->format('Y-m-d'),
                'start_date' => $booking->start_date,
                'end_date' => $booking->end_date,
                'reference_number' => $booking->booking_reference,
                'booking_code' => $booking->booking_reference,
                'currency' => 'LKR',
                'created_at' => $booking->created_at,
                'user' => $booking->user ? [
                    'name' => $booking->user->name,
                    'email' => $booking->user->email,
                    'phone' => $booking->user->phone,
                    'address' => $booking->user->address,
                ] : null,
                'customer_name' => $booking->contact_person ?? $booking->company_name,
                'customer_email' => $booking->email,
                'customer_phone' => $booking->phone,
                'company_name' => $booking->company_name,
                'vendor_name' => $unit?->owner?->name ?? 'Warehouse Provider',
                'vendor_email' => $unit?->owner?->email,
                'vendor_phone' => $unit?->owner?->phone,
                'payment_method' => $booking->payment_method,
                'payment_status' => $booking->payment_status,
                'notes' => "Storage: {$booking->storage_type}, Space: {$booking->required_space} sq ft. " . ($booking->notes ?? ''),
                'subtotal' => $booking->total_amount,
                'deposit_amount' => $booking->security_deposit,
            ];
        });

    // Combine all bookings
    $allBookings = collect($vehicleBookings)
        ->merge($airVehicleBookings)
        ->merge($seaVehicleBookings)
        ->merge($trainBookings)
        ->merge($busBookings)
        ->merge($flightBookings)
        ->merge($courierShipments)
        ->merge($warehouseBookings)
        ->sortByDesc('created_at')
        ->values();

    // Calculate statistics
    $statistics = [
        'total_bookings' => $allBookings->count(),
        'active_bookings' => $allBookings->whereIn('status', ['confirmed', 'paid', 'active'])->count(),
        'total_spent' => $allBookings->sum('total_amount'),
        'this_month' => $allBookings->filter(function($b) {
            return \Carbon\Carbon::parse($b['created_at'])->isCurrentMonth();
        })->count(),
    ];

    // Monthly data for charts
    $monthlyData = [];
    for ($i = 5; $i >= 0; $i--) {
        $month = now()->subMonths($i);
        $monthBookings = $allBookings->filter(function($b) use ($month) {
            return \Carbon\Carbon::parse($b['created_at'])->isSameMonth($month);
        });
        
        $monthlyData[] = [
            'month' => $month->format('M'),
            'vehicle' => $monthBookings->whereIn('booking_type', ['vehicle', 'air', 'sea'])->count(),
            'tickets' => $monthBookings->whereIn('booking_type', ['train', 'bus', 'flight'])->count(),
            'logistics' => $monthBookings->whereIn('booking_type', ['warehouse', 'courier', 'freight'])->count(),
        ];
    }

    return Inertia::render('Web/home/client/ClientAllBookings', [
        'allBookings' => $allBookings,
        'statistics' => $statistics,
        'monthlyData' => $monthlyData,
    ]);
})->middleware(\App\Http\Middleware\ClientVerificationCheck::class)->name('clientAllBookings');

// Warehouse Booking Dashboard (public access)
Route::get('/warehouseBookingDashboard', function () {
    return Inertia::render('Web/home/client/WarehouseBookingDashboard');
})->name('warehouseBookingDashboard');











// Route::get('/', function () {
//     return Inertia::render('Welcome', [
//         'canLogin' => Route::has('login'),
//         'canRegister' => Route::has('register'),
//         'laravelVersion' => Application::VERSION,
//         'phpVersion' => PHP_VERSION,
//     ]);
// });

// Route::get('/dashboard', function () {
//     return Inertia::render('Dashboard');
// })->middleware(['auth', 'verified'])->name('dashboard');

// Route::middleware('auth')->group(function () {
//     Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
//     Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
//     Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
// });

/*
|--------------------------------------------------------------------------
| Extra vendor dashboards (warehouse / ticket / courier / freight / multimodal)
|  — generated compactly (no routes removed)
|--------------------------------------------------------------------------
*/
// NOTE: 'warehouse' intentionally omitted — every warehouse vendor page now has
// an explicit, auth + vendor.verified-protected route defined above. This loop's
// "skip if already registered" guard (Route::has()) cannot see routes named via
// the standard fluent ->name() chain earlier in this same file (Laravel only
// refreshes the route-collection name lookup on real HTTP dispatch, not while
// the route file itself is still being loaded), so leaving 'warehouse' in this
// list would silently re-register unauthenticated duplicates of those routes.
$sections = [
    'ticketBooking' => 'Web/home/vendors/ticketBooking',
    'freight'       => 'Web/home/vendors/freight',
    'multimodal'    => 'Web/home/vendors/multimodal',
];

$pages = [
    // view folder => route path/name
    'Booking'      => 'bookings',
    'Unit'         => 'units',
    'Dashboard'    => 'dashboard',
    'Client'       => 'clients',
    'Expenses'     => 'expenses',
    'Payment'      => 'payment',
    'Tracking'     => 'tracking',
    'Calendar'     => 'calendar',
    'AddUnit'      => 'addUnit',
    'UnitDetails'  => 'unitDetails',
    'SettingsPage' => 'settingsPage',
];

foreach ($sections as $slug => $baseView) {
    Route::prefix($slug)->group(function () use ($slug, $baseView, $pages, $render) {
        foreach ($pages as $view => $route) {
            $routeName = "{$slug}.{$route}";

            // Do not override routes that were already defined with explicit middleware.
            if (Route::has($routeName)) {
                continue;
            }

            Route::get("/{$route}", $render("{$baseView}/{$view}"))->name($routeName);
        }
    });
}

/*
|--------------------------------------------------------------------------
| Client dashboards (public shells)
|--------------------------------------------------------------------------
*/
Route::get('/clientDashboard', function() { return redirect()->route('client.dashboard'); });
// Warehouse Booking Dashboard - public access
Route::get('/warehouseBookingDashboard', $render('Web/home/client/WarehouseBookingDashboard'))->name('warehouseBookingDashboard');
// Freight Booking Dashboard - moved to protected routes above (requires auth)

/*
|--------------------------------------------------------------------------
| Keep your global compat route (not removed)
|--------------------------------------------------------------------------
*/
Route::post('/drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update.compat');

/*
|--------------------------------------------------------------------------
| Storage streaming/downloading helpers
| (lets /storage/... work even without the public/storage symlink)
|--------------------------------------------------------------------------
*/
Route::get('/storage/{path}', function ($path) {
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    return Storage::disk('public')->response($path);
})->where('path', '.*');

Route::get('/storage/download/{path}', function ($path) {
    if (!Storage::disk('public')->exists($path)) {
        abort(404);
    }
    $name = request()->query('name');
    return Storage::disk('public')->download($path, $name ?: basename($path));
})->where('path', '.*');

/*
|--------------------------------------------------------------------------
| Auth scaffolding
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';
