<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

// Override PHP settings for file uploads
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '100M');
ini_set('max_file_uploads', '20');
ini_set('max_execution_time', '0');
ini_set('memory_limit', '512M');

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust Cloudflare/edge proxy headers so asset URLs keep the original HTTPS scheme.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO
                | Request::HEADER_X_FORWARDED_AWS_ELB,
        );

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\RefreshSessionOnAuth::class,
            \App\Http\Middleware\EnsureVendorHasApprovedServiceAccess::class,
            \App\Http\Middleware\RequirePasswordChange::class,
        ]);

        // Exclude specific URIs from CSRF verification
        $middleware->validateCsrfTokens(except: [
            'logout-alt',
            'csrf-token',
            'couriers/payments/payhere/notify',
            'client/wallet/payhere/notify',
            'client/bookings/payhere/notify',
            'client/airBookings/payhere/notify',
            'client/seaBookings/payhere/notify',
            'bus-bookings/payhere/notify',
            'train-bookings/payhere/notify',
            'warehouse-bookings/payhere/notify',
        ]);

        // Add CORS middleware to API routes
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'superadmin' => \App\Http\Middleware\SuperAdminMiddleware::class,
            'superadmin.courier.permission' => \App\Http\Middleware\EnsureSuperAdminCourierPermission::class,
            'vendor.verified' => \App\Http\Middleware\VendorVerificationCheck::class,
            'vendor.service.approved' => \App\Http\Middleware\EnsureVendorHasApprovedServiceAccess::class,
            'service.workspace' => \App\Http\Middleware\SetServiceWorkspaceContext::class,
            'service.permission' => \App\Http\Middleware\EnsureServicePermission::class,
            'courier.session.security' => \App\Http\Middleware\CourierSessionSecurityMiddleware::class,
            'courier.access.review.lifecycle' => \App\Http\Middleware\CourierAccessReviewLifecycle::class,
            'courier.api.key' => \App\Http\Middleware\CourierServiceApiKeyAuth::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
