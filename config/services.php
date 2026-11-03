<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'courier' => [
        'break_glass_alert_emails_csv' => env('COURIER_BREAK_GLASS_ALERT_EMAILS', ''),
        'break_glass_webhook_url' => env('COURIER_BREAK_GLASS_WEBHOOK_URL', ''),
    ],

    'paymentslk' => [
        // sk_test_... = sandbox, sk_live_... = live. Server-side only.
        'secret_key' => env('PAYMENTSLK_SECRET_KEY'),
        // whsec_... signing secret of the webhook endpoint (Dashboard > Developers).
        'webhook_secret' => env('PAYMENTSLK_WEBHOOK_SECRET'),
        'api_base' => env('PAYMENTSLK_API_BASE', 'https://api.payments.lk'),
        'checkout_expiry_minutes' => (int) env('PAYMENTSLK_CHECKOUT_EXPIRY_MINUTES', 60),

        // order-id prefix => [controller, method] that applies a webhook result.
        // Every handler is `applyPaymentsLkResult(array $result): void`.
        'handlers' => [
            'CPH' => [\App\Http\Controllers\CourierControllers\Client\CourierPaymentController::class, 'applyPaymentsLkResult'],
            'WTP' => [\App\Http\Controllers\Client\WalletController::class, 'applyPaymentsLkResult'],
            'VEH' => [\App\Http\Controllers\VehicleControllers\Client\ClientBookingController::class, 'applyPaymentsLkResult'],
            'AIR' => [\App\Http\Controllers\VehicleControllers\Client\ClientBookingController::class, 'applyPaymentsLkResult'],
            'SEA' => [\App\Http\Controllers\VehicleControllers\Client\ClientBookingController::class, 'applyPaymentsLkResult'],
            'BUP' => [\App\Http\Controllers\BusBookingController::class, 'applyPaymentsLkResult'],
            'TRP' => [\App\Http\Controllers\TrainController::class, 'applyPaymentsLkResult'],
            'WHP' => [\App\Http\Controllers\WarehouseControllers\Client\WarehouseBookingController::class, 'applyPaymentsLkResult'],
        ],
    ],

    'zipcodebase' => [
        'api_key' => env('ZIPCODEBASE_API_KEY', ''),
        'base_url' => env('ZIPCODEBASE_BASE_URL', 'https://app.zipcodebase.com/api/v1'),
        'timeout' => env('ZIPCODEBASE_TIMEOUT', 10),
    ],

    'restcountries' => [
        'base_url' => env('RESTCOUNTRIES_BASE_URL', 'https://restcountries.com/v3.1'),
        'timeout' => env('RESTCOUNTRIES_TIMEOUT', 8),
    ],

    'opendatasoft_geonames' => [
        'base_url' => env(
            'OPENDATASOFT_GEONAMES_BASE_URL',
            'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-postal-code/records'
        ),
        'timeout' => env('OPENDATASOFT_GEONAMES_TIMEOUT', 8),
    ],

];
