<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="csrf-token" content="{{ csrf_token() }}"> {{-- REQUIRED for POST via fetch --}}

      <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230955AC'/%3E%3Cpath d='M9 9l14 14M23 9L9 23' stroke='white' stroke-width='3.5' stroke-linecap='round'/%3E%3C/svg%3E">

      <title inertia>{{ config('app.name', 'Laravel') }}</title>

      <link rel="preconnect" href="https://fonts.bunny.net">
      <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

      @routes
      @viteReactRefresh
      @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
      @inertiaHead
  </head>
  <body class="font-sans antialiased">
      @inertia
  </body>
</html>
