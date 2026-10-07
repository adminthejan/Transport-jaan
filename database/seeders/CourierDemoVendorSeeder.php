<?php

namespace Database\Seeders;

use App\Models\Courier\CourierVendorCodCapability;
use App\Models\Courier\VendorCourierSetting;
use App\Models\ServiceSubCategory;
use App\Models\User;
use App\Models\VendorServiceRegistration;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CourierDemoVendorSeeder extends Seeder
{
    private const VENDOR_EMAIL = 'vendor@example.com';

    public function run(): void
    {
        $subCategory = ServiceSubCategory::query()
            ->where('slug', 'domestic')
            ->whereHas('serviceCategory', fn ($query) => $query->where('slug', 'courier-services'))
            ->first();

        if (! $subCategory) {
            $this->command?->warn('Courier Services > Domestic sub-category not found. Run ServiceCategorySeeder first.');
            return;
        }

        $vendor = User::firstOrCreate(
            ['email' => self::VENDOR_EMAIL],
            [
                'name' => 'Vendor User',
                'password' => Hash::make('12345678'),
                'role' => 'vendor',
                'phone' => '9876543210',
                'address' => 'Kandy, Sri Lanka',
                'country' => 'Sri Lanka',
            ]
        );
        $vendor->update(['status' => 'verified']);

        VendorServiceRegistration::updateOrCreate(
            [
                'user_id' => $vendor->id,
                'service_sub_category_id' => $subCategory->id,
            ],
            [
                'service_category_id' => $subCategory->service_category_id,
                'status' => 'approved',
                'submitted_at' => now(),
                'reviewed_at' => now(),
            ]
        );

        CourierVendorCodCapability::updateOrCreate(
            [
                'vendor_user_id' => $vendor->id,
                'category' => CourierVendorCodCapability::CATEGORY_DOMESTIC,
            ],
            [
                'status' => CourierVendorCodCapability::STATUS_APPROVED,
                'requested_at' => now(),
                'reviewed_at' => now(),
                'approved_at' => now(),
                'decision_reason' => 'Demo approval',
            ]
        );

        $setting = VendorCourierSetting::firstOrNew(['vendor_user_id' => $vendor->id]);
        $settings = is_array($setting->settings) ? $setting->settings : [];
        $settings['services']['cod'] = array_merge($settings['services']['cod'] ?? [], [
            'acceptCodAtCheckout' => true,
            'allowCodForDomestic' => true,
            'allowTeamOverride' => false,
            'allowCashCod' => true,
            'allowBankTransferCod' => true,
        ]);
        $setting->settings = $settings;
        $setting->save();
    }
}
