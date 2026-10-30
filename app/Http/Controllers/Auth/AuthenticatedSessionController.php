<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\VendorUserMembership;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        // Lets a page send the visitor back to where they were after signing in (same-site paths only).
        $redirect = (string) $request->query('redirect', '');
        if ($redirect !== '' && str_starts_with($redirect, '/') && ! str_starts_with($redirect, '//') && ! str_contains($redirect, '\\')) {
            $request->session()->put('url.intended', url($redirect));
        }

        return Inertia::render('Auth/signin', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        // Proceed with role-based redirection (both verified and unverified users)
        $role = $user->role;
        $status = $user->status;

        $membership = VendorUserMembership::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($membership) {
            return redirect()->intended(route('courierService.dashboard'));
        }

        $redirectTo = match($role) {
            'SuperAdmin' => route('superadmin.Analytics'),
            'client' => route('clientAllBookings'),
            'vendor' => $status === 'unverified' ? route('vendorAllBookings') : route('vendorAllBookings'),
            'admin' => route('landingPage.home'),
            default => route('landingPage.home'),
        };

        return redirect()->intended($redirectTo);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        try {
            Auth::guard('web')->logout();

            $request->session()->invalidate();

            $request->session()->regenerateToken();

            // Clear any existing messages and redirect to home
            return redirect('/')->with('message', 'You have been successfully logged out.');
        } catch (\Exception $e) {
            // If there's an error, still try to logout and redirect
            Auth::guard('web')->logout();

            // Force session regeneration even if there's an error
            if ($request->session()) {
                $request->session()->flush();
                $request->session()->regenerate();
            }

            return redirect('/')->with('message', 'You have been logged out.');
        }
    }
}
