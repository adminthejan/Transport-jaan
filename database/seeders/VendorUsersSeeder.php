<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class VendorUsersSeeder extends Seeder
{
    public function run(): void
    {
        // Create vendors in different statuses for testing

        // Unverified/New vendors
        User::firstOrCreate(
            ['email' => 'newvendor1@example.com'],
            [
                'name' => 'John Doe',
                'email' => 'newvendor1@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'unverified',
                'phone' => '+1-555-123-4567',
                'address' => 'New York, USA',
                'country' => 'USA',
            ]
        );

        User::firstOrCreate(
            ['email' => 'newvendor2@example.com'],
            [
                'name' => 'Jane Smith',
                'email' => 'newvendor2@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'unverified',
                'phone' => '+1-555-234-5678',
                'address' => 'California, USA',
                'country' => 'USA',
            ]
        );

        User::firstOrCreate(
            ['email' => 'newvendor3@example.com'],
            [
                'name' => 'Alice Johnson',
                'email' => 'newvendor3@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'unverified',
                'phone' => '+1-555-345-6789',
                'address' => 'Texas, USA',
                'country' => 'USA',
            ]
        );

        // Verified vendors
        User::firstOrCreate(
            ['email' => 'verifiedvendor1@example.com'],
            [
                'name' => 'Elena Morales',
                'email' => 'verifiedvendor1@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'verified',
                'phone' => '+1-619-876-5432',
                'address' => 'San Diego, USA',
                'country' => 'USA',
            ]
        );

        User::firstOrCreate(
            ['email' => 'verifiedvendor2@example.com'],
            [
                'name' => 'Jacob Singh',
                'email' => 'verifiedvendor2@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'verified',
                'phone' => '+1-702-345-6789',
                'address' => 'Las Vegas, USA',
                'country' => 'USA',
            ]
        );

        User::firstOrCreate(
            ['email' => 'verifiedvendor3@example.com'],
            [
                'name' => 'Chloe Kim',
                'email' => 'verifiedvendor3@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'verified',
                'phone' => '+1-408-567-8901',
                'address' => 'San Jose, USA',
                'country' => 'USA',
            ]
        );

        // Additional verified vendors — one per remaining service line so every
        // category (waterborne, private railway, specialised warehousing) has an
        // owner. Their data is attached by VendorDataTallySeeder.
        $extraVerified = [
            ['verifiedvendor4@example.com', 'Nimal Perera', '+94-77-410-2201', 'Galle, Sri Lanka'],
            ['verifiedvendor5@example.com', 'Dilani Fernando', '+94-71-520-3302', 'Colombo, Sri Lanka'],
            ['verifiedvendor6@example.com', 'Kasun Wickramasinghe', '+94-76-630-4403', 'Negombo, Sri Lanka'],
        ];

        foreach ($extraVerified as [$email, $name, $phone, $address]) {
            User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'role' => 'vendor',
                    'status' => 'verified',
                    'phone' => $phone,
                    'address' => $address,
                    'country' => 'Sri Lanka',
                ]
            );
        }

        // Blocked vendors
        User::firstOrCreate(
            ['email' => 'blockedvendor1@example.com'],
            [
                'name' => 'Amara Patel',
                'email' => 'blockedvendor1@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'blocked',
                'phone' => '+1-612-987-6543',
                'address' => 'Minneapolis, USA',
                'country' => 'USA',
            ]
        );

        User::firstOrCreate(
            ['email' => 'blockedvendor2@example.com'],
            [
                'name' => 'Liam Nguyen',
                'email' => 'blockedvendor2@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'blocked',
                'phone' => '+1-718-456-7890',
                'address' => 'Brooklyn, USA',
                'country' => 'USA',
            ]
        );

        // Rejected vendors
        User::firstOrCreate(
            ['email' => 'rejectedvendor1@example.com'],
            [
                'name' => 'Sofia Alvarez',
                'email' => 'rejectedvendor1@example.com',
                'password' => Hash::make('password'),
                'role' => 'vendor',
                'status' => 'rejected',
                'phone' => '+1-503-234-5678',
                'address' => 'Portland, USA',
                'country' => 'USA',
            ]
        );
    }
}
