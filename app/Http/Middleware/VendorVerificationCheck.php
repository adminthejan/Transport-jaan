<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class VendorVerificationCheck
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Allow guests to proceed to login
        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to access the dashboard.');
        }

        // Check if user is a vendor
        if (Auth::user()->role !== 'vendor') {
            return redirect()->route('signin.signin')->with('error', 'Access denied. Vendor access required.');
        }

        // If vendor is logged in but not verified, redirect to approval pending page
        // Exception: Allow vendors to access vendorAllBookings and vendors/dashboard routes
        if (Auth::user()->status !== 'verified') {
            $isVendorAllBookings    = $request->path() === 'vendorAllBookings' || $request->route()?->getName() === 'vendorAllBookings';
            $isVendorDashboard     = $request->path() === 'vendors/dashboard' || $request->route()?->getName() === 'vendors.dashboard';
            $isWarehouseDashboard  = in_array($request->path(), ['vendors/warehouse/dashboard', 'warehouse/dashboard'], true)
                || in_array($request->route()?->getName(), ['vendors.warehouse.dashboard', 'warehouse.dashboard'], true);
            $isVehicleClientTable           = $request->path() === 'vendors/clients' || $request->route()?->getName() === 'vendors.clients';

            // Allow unverified vendors to access vendor profile/registration routes
            $isVendorProfile = str_starts_with($request->path(), 'vendor/profile') || str_starts_with($request->route()?->getName() ?? '', 'vendor.profile');

            // Allow unverified vendors to access their dashboards and profile page
            if ($isVendorAllBookings || $isVendorDashboard || $isWarehouseDashboard || $isVehicleClientTable || $isVendorProfile) {
                return $next($request);
            }

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Your vendor account is pending approval from admin.'], 403);
            }

            return redirect()->route('approval.pending');
        }

        return $next($request);
    }
}