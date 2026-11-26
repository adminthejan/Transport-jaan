<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\VerifyEmailController;
use App\Http\Controllers\WebController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('/registerNew', [RegisterController::class, 'create'])->name('register.show');
    Route::post('/register', [RegisterController::class, 'store'])->name('register.store');

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    Route::post('signin', [AuthenticatedSessionController::class, 'store'])->name('signin');

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->middleware('throttle:3,1')
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->middleware('throttle:3,1')
        ->name('password.store');
});

Route::get('approval-pending', function() {
    // Check if user is authenticated but unverified
    if (Auth::check() && Auth::user()->status !== 'verified') {
        $user = Auth::user();
        
        // Unverified vendors go to their All Bookings Dashboard
        if ($user->role === 'vendor') {
            return redirect()->route('vendorAllBookings');
        }
        
        // All other unverified users see the approval pending page
        return Inertia::render('Auth/ApprovalPending');
    }

    // Redirect authenticated users who are verified to appropriate dashboard
    if (Auth::check() && Auth::user()->status === 'verified') {
        $user = Auth::user();
        
        if ($user->role === 'vendor') {
            return redirect()->route('vendorAllBookings');
        } elseif ($user->role === 'client') {
            return redirect()->route('client.mainDashboard');
        } elseif ($user->role === 'SuperAdmin') {
            return redirect()->route('superadmin.Analytics');
        }
        
        // Default fallback
        return redirect()->route('client.mainDashboard');
    }

    // Redirect guests to signin
    return redirect()->route('signin.signin');
})->name('approval.pending');

Route::middleware('auth')->group(function () {
    Route::get('verify-email', EmailVerificationPromptController::class)
                ->name('verification.notice');    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::put('password', [PasswordController::class, 'update'])->name('password.update');

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');

    // Alternative logout route in case CSRF fails
    Route::get('logout-alt', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout.alt');
});

// CSRF token refresh route (without CSRF protection)
Route::get('/csrf-token', function () {
    return response()->json(['token' => csrf_token()]);
})->name('csrf.refresh');
