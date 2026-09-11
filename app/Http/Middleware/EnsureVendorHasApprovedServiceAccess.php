<?php

namespace App\Http\Middleware;

use App\Models\VendorServiceRegistration;
use App\Models\VendorUserMembership;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureVendorHasApprovedServiceAccess
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $routeName = $request->route()?->getName() ?? '';

        $requiredSlugs = $this->resolveRequiredServiceSlugs($request->path(), $routeName);

        if (empty($requiredSlugs)) {
            return $next($request);
        }

        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to access this dashboard.');
        }

        $user = Auth::user();

        $vendorUserId = (int) $user->id;

        if ($user->role !== 'vendor') {
            $membership = VendorUserMembership::query()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->first();

            if (!$membership) {
                abort(403, 'Vendor team membership required.');
            }

            $vendorUserId = (int) $membership->vendor_user_id;

            foreach ($requiredSlugs as $slug) {
                $serviceKey = $this->serviceKeyFromSlug($slug);

                if ($serviceKey && $membership->isBlockedForService($serviceKey)) {
                    abort(403, 'Your access to this service is blocked by admin.');
                }
            }
        } elseif ($user->status !== 'verified') {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Your vendor account is pending admin verification.'], 403);
            }

            return redirect()->route('approval.pending')->with('error', 'Your vendor account is pending admin verification.');
        }

        $approvedSlugs = VendorServiceRegistration::query()
            ->where('user_id', $vendorUserId)
            ->where('status', 'approved')
            ->with('serviceCategory:id,slug')
            ->get()
            ->pluck('serviceCategory.slug')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
        $hasAccess = !empty(array_intersect($requiredSlugs, $approvedSlugs));

        if ($hasAccess) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'This dashboard is available only for admin-approved registered services.'], 403);
        }

        return redirect()->route('vendorAllBookings')->with('error', 'Access denied. This dashboard is available only for your admin-approved registered services.');
    }

    private function serviceKeyFromSlug(string $slug): ?string
    {
        return match ($slug) {
            'courier-services' => 'courier_service',
            'vehicle-rental' => 'vehicle_rental',
            'aviation-service', 'railway-service' => 'ticket_booking',
            'warehousing' => 'warehousing',
            'waterborne-transport' => 'freight',
            default => null,
        };
    }

    /**
     * Resolve required approved service category slugs for a vendor dashboard route.
     */
    private function resolveRequiredServiceSlugs(string $path, string $routeName): array
    {
        $path = ltrim($path, '/');

        // Legacy vendor route names.
        // Excludes 'ticketBooking.ticketBooking' — the public, client-facing
        // ticket booking page (bus/train/flight search) — which happens to
        // share this name prefix with the vendor dashboard routes below
        // (ticketBooking.dashboard, .bookings, .units, etc.) but must stay
        // open to guests and non-vendor clients.
        if (str_starts_with($routeName, 'ticketBooking.') && $routeName !== 'ticketBooking.ticketBooking') {
            return ['aviation-service', 'railway-service'];
        }

        if (str_starts_with($routeName, 'courierService.')) {
            return ['courier-services'];
        }

        // Excludes the public freight marketing/booking-request pages, which
        // share this name prefix with the vendor dashboard routes below
        // (freight.dashboard, .bookings, .units, etc.).
        if (str_starts_with($routeName, 'freight.') && !in_array($routeName, ['freight.home', 'freight.booking.create'], true)) {
            return ['waterborne-transport'];
        }

        if (str_starts_with($routeName, 'multimodal.')) {
            return ['vehicle-rental', 'aviation-service', 'railway-service', 'waterborne-transport'];
        }

        if (str_starts_with($routeName, 'warehouse.') && !in_array($routeName, ['warehouse.home', 'warehouse.list', 'warehouse.details'], true)) {
            return ['warehousing'];
        }

        // /vendors/* vehicle rental pages
        if (
            in_array($routeName, [
                'vendors.dashboard',
                'vendors.bookings',
                'vendors.clients',
                'vendors.payment',
                'vendors.expenses',
                'vendors.tracking',
                'vendors.calendar',
                'vendors.units',
                'vendors.addUnit',
                'vendors.addUnit.edit',
                'vendors.unitDetails',
                'vendors.unitDetails.show',
                'vendors.drivers',
            ], true)
        ) {
            return ['vehicle-rental'];
        }

        // /vendors/warehouse/*
        if (str_starts_with($routeName, 'vendors.warehouse.')) {
            return ['warehousing'];
        }

        // Fallback by path for routes without names or inconsistent names
        if (str_starts_with($path, 'ticketBooking/')) {
            return ['aviation-service', 'railway-service'];
        }

        if (str_starts_with($path, 'courierService/')) {
            return ['courier-services'];
        }

        if (str_starts_with($path, 'freight/')) {
            return ['waterborne-transport'];
        }

        if (str_starts_with($path, 'multimodal/') && $path !== 'multimodal') {
            return ['vehicle-rental', 'aviation-service', 'railway-service', 'waterborne-transport'];
        }

        if (str_starts_with($path, 'vendors/warehouse/')) {
            return ['warehousing'];
        }

        if (str_starts_with($path, 'warehouse/')) {
            $vendorWarehousePaths = [
                'warehouse/dashboard',
                'warehouse/bookings',
                'warehouse/clients',
                'warehouse/expenses',
                'warehouse/payment',
                'warehouse/tracking',
                'warehouse/calendar',
                'warehouse/addUnit',
                'warehouse/unitDetails',
                'warehouse/settingsPage',
                'warehouse/unit',
            ];

            if (in_array($path, $vendorWarehousePaths, true)) {
                return ['warehousing'];
            }
        }

        return [];
    }
}
