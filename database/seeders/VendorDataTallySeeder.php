<?php

namespace Database\Seeders;

use App\Models\ServiceSubCategory;
use App\Models\User;
use App\Models\VendorProfile;
use App\Models\VendorServiceRegistration;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Makes the demo data line up with the vendor accounts.
 *
 * Every vendor gets a profile + service registrations that match its status,
 * and each dummy data set (vehicles, buses, trains, warehouse units) is owned
 * by a vendor that is verified AND registered for that service line.
 * Re-runnable: it only sets ownership/profile/registration rows by key.
 *
 *   php artisan db:seed --class=VendorUsersSeeder
 *   php artisan db:seed --class=VendorDataTallySeeder
 */
class VendorDataTallySeeder extends Seeder
{
    /** email => [company, type, city, sub-category slugs] */
    private const VENDORS = [
        'vendor@example.com' => ['Kandy Transport & Logistics', 'business', 'Kandy', ['domestic', 'international', 'local-transportation', 'public-government', 'customs-bonded-warehouse']],
        'verifiedvendor1@example.com' => ['Morales Car & Bus Rentals', 'business', 'San Diego', ['local-transportation', 'tourism-purpose']],
        'verifiedvendor2@example.com' => ['Singh 3PL Warehousing', 'business', 'Las Vegas', ['commercial-3pl-warehouses']],
        'verifiedvendor3@example.com' => ['Kim Air Charters', 'business', 'San Jose', ['domestic-air-transport']],
        'verifiedvendor4@example.com' => ['Galle Marine Services', 'business', 'Galle', ['private-yacht-boat']],
        'verifiedvendor5@example.com' => ['Fernando Private Rail', 'business', 'Colombo', ['private']],
        'verifiedvendor6@example.com' => ['Negombo Specialist Storage', 'business', 'Negombo', ['specialized-functional-warehouse']],
        // Not verified: profile/registration reflect that state.
        'newvendor1@example.com' => ['Doe Warehousing', 'individual', 'New York', ['commercial-3pl-warehouses']],
        'newvendor2@example.com' => ['Smith Couriers', 'individual', 'California', ['domestic']],
        'newvendor3@example.com' => ['Johnson Rentals', 'individual', 'Texas', ['local-transportation']],
        'blockedvendor1@example.com' => ['Patel Storage', 'business', 'Minneapolis', ['commercial-3pl-warehouses']],
        'blockedvendor2@example.com' => ['Nguyen Freight', 'business', 'Brooklyn', ['customs-bonded-warehouse']],
        'rejectedvendor1@example.com' => ['Alvarez Transport', 'individual', 'Portland', ['local-transportation']],
    ];

    private const BUS_OWNERS = [
        'NB-1234' => 'vendor@example.com',
        'NC-4567' => 'vendor@example.com',
        'NA-9912' => 'verifiedvendor1@example.com',
        'NC-2211' => 'verifiedvendor1@example.com',
        'NC-7711' => 'verifiedvendor1@example.com',
    ];

    /** Public (government) trains 1-4 stay with the demo vendor, private trains go to vendor 5. */
    private const TRAIN_OWNERS = [
        'TRN001' => 'vendor@example.com',
        'TRN002' => 'vendor@example.com',
        'TRN003' => 'vendor@example.com',
        'TRN004' => 'vendor@example.com',
        'TRN005' => 'verifiedvendor5@example.com',
        'TRN006' => 'verifiedvendor5@example.com',
        'TRN007' => 'verifiedvendor5@example.com',
        'TRN008' => 'verifiedvendor5@example.com',
    ];

    /** vehicle type => vendors (round-robin by id) */
    private const VEHICLE_OWNERS = [
        'land' => ['vendor@example.com', 'verifiedvendor1@example.com'],
        'air' => ['verifiedvendor3@example.com'],
        'sea' => ['verifiedvendor4@example.com'],
    ];

    private const WAREHOUSE_OWNERS = ['vendor@example.com', 'verifiedvendor2@example.com', 'verifiedvendor6@example.com'];

    public function run(): void
    {
        $users = User::where('role', 'vendor')->get()->keyBy('email');
        $adminId = User::where('role', 'SuperAdmin')->value('id');

        $this->seedProfilesAndRegistrations($users, $adminId);
        $this->assignBusesAndTrains($users);
        $this->assignVehicles($users);
        $this->assignWarehouseUnits($users);
    }

    private function seedProfilesAndRegistrations($users, ?int $adminId): void
    {
        $subCategories = ServiceSubCategory::all()->keyBy('slug');

        foreach (self::VENDORS as $email => [$company, $type, $city, $slugs]) {
            $user = $users[$email] ?? null;
            if (! $user) {
                $this->command?->warn("Vendor {$email} missing - run VendorUsersSeeder first.");
                continue;
            }

            // verified => approved; blocked => was approved before the block;
            // rejected => rejected; unverified => waiting for review.
            $state = match ($user->status) {
                'verified', 'blocked' => 'approved',
                'rejected' => 'rejected',
                default => 'submitted',
            };
            $reviewed = in_array($state, ['approved', 'rejected'], true);

            $user->forceFill(['vendor_type' => $type])->save();

            VendorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'company_name' => $company,
                    'business_type' => $type === 'business' ? 'company' : 'individual',
                    'description' => "Demo vendor profile for {$company}.",
                    'address_line1' => $user->address ?: $city,
                    'city' => $city,
                    'postal_code' => '00000',
                    'country' => $user->country ?: 'Sri Lanka',
                    'contact_person' => $user->name,
                    'contact_phone' => $user->phone ?: '0000000000',
                    'contact_email' => $user->email,
                    'submission_status' => $state,
                    'submitted_at' => now()->subDays(20),
                    'reviewed_at' => $reviewed ? now()->subDays(15) : null,
                    'reviewed_by' => $reviewed ? $adminId : null,
                ]
            );

            foreach ($slugs as $slug) {
                $sub = $subCategories[$slug] ?? null;
                if (! $sub) {
                    $this->command?->warn("Sub-category '{$slug}' missing - run ServiceCategorySeeder first.");
                    continue;
                }

                $registration = VendorServiceRegistration::firstOrNew([
                    'user_id' => $user->id,
                    'service_sub_category_id' => $sub->id,
                ]);

                // Keep documents on registrations that were submitted through the UI.
                $registration->fill([
                    'service_category_id' => $sub->service_category_id,
                    'status' => $state,
                    'submitted_at' => $registration->submitted_at ?? now()->subDays(20),
                    'reviewed_at' => $reviewed ? ($registration->reviewed_at ?? now()->subDays(15)) : null,
                    'reviewed_by' => $reviewed ? $adminId : null,
                ]);
                if ($registration->field_values === null) {
                    $registration->field_values = [];
                }
                $registration->save();
            }
        }
    }

    private function assignBusesAndTrains($users): void
    {
        foreach (self::BUS_OWNERS as $number => $email) {
            if ($id = $users[$email]->id ?? null) {
                DB::table('buses')->where('bus_number', $number)->update(['vendor_id' => $id]);
            }
        }
        foreach (self::TRAIN_OWNERS as $number => $email) {
            if ($id = $users[$email]->id ?? null) {
                DB::table('trains')->where('train_number', $number)->update(['vendor_id' => $id]);
            }
        }
    }

    private function assignVehicles($users): void
    {
        foreach (self::VEHICLE_OWNERS as $type => $emails) {
            $owners = collect($emails)->map(fn ($e) => $users[$e]->id ?? null)->filter()->values();
            if ($owners->isEmpty()) {
                continue;
            }
            DB::table('vehicles')->where('type', $type)->orderBy('id')->pluck('id')
                ->each(fn ($vehicleId, $i) => DB::table('vehicles')->where('id', $vehicleId)
                    ->update(['provider_id' => $owners[$i % $owners->count()]]));
        }
    }

    private function assignWarehouseUnits($users): void
    {
        $owners = collect(self::WAREHOUSE_OWNERS)->map(fn ($e) => $users[$e] ?? null)->filter()->values();
        if ($owners->isEmpty()) {
            return;
        }

        DB::table('warehouse_units')->orderBy('id')->pluck('id')->each(function ($unitId, $i) use ($owners) {
            $owner = $owners[$i % $owners->count()];
            DB::table('warehouse_units')->where('id', $unitId)->update([
                'user_id' => $owner->id,
                'contact_person' => $owner->name,
                'contact_email' => $owner->email,
                'contact_phone' => $owner->phone,
            ]);
        });
    }
}
