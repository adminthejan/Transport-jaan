<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\PasswordStrength;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults(), new PasswordStrength()],
            'role_type' => ['required', 'in:client,vendor'],
                'vendor_type' => ['required_if:role_type,client,vendor', 'in:individual,business'],
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:255',
            'country' => 'required|string|max:2',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role_type,
                'vendor_type' => $request->vendor_type,
            'status' => $request->role_type === 'client' ? 'verified' : 'unverified',
            'phone' => $request->phone,
            'address' => $request->address,
            'country' => $request->country,
        ]);

        event(new Registered($user));

        Auth::login($user);

        $redirectTo = match($user->role) {
            'client' => route('client.mainDashboard', absolute: false),
            'vendor' => route('vendorAllBookings', absolute: false),
            default => route('landingPage.home', absolute: false),
        };

        return redirect($redirectTo);
    }
}
