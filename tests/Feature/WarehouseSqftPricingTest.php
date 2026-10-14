<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Warehouse\WarehouseBooking;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class WarehouseSqftPricingTest extends TestCase
{
    use DatabaseTransactions;

    private function vendor(): User
    {
        return User::factory()->create(['role' => 'vendor', 'vendor_type' => 'business', 'status' => 'verified']);
    }

    private function unit(User $vendor, array $over = []): WarehouseUnit
    {
        return WarehouseUnit::create(array_merge([
            'user_id' => $vendor->id, 'name' => 'Test WH', 'address' => 'Colombo',
            'total_area' => 10000, 'capacity' => 10000, 'capacity_unit' => 'sq_ft',
            'type' => 'general_warehouse', 'pricing_model' => 'monthly',
            'base_price' => 400000, 'monthly_rate' => 400000, 'rate_per_sqft' => 50,
            'security_deposit' => 10000, 'setup_fee' => 5000, 'tax_rate' => 0.1,
            'is_active' => true, 'is_available' => true,
        ], $over));
    }

    private function payload(WarehouseUnit $u, array $over = []): array
    {
        return array_merge([
            'warehouse_id' => $u->id, 'contact_person' => 'Jane', 'email' => 'j@example.com',
            'phone' => '0771234567', 'storage_type' => 'General Storage',
            'required_space' => 2500, 'storage_unit' => 'sqft', 'goods_type' => 'General',
            'goods_description' => 'boxes', 'quantity' => '100', 'estimated_weight' => 500,
            'start_date' => now()->addDays(3)->toDateString(), 'duration_months' => 3,
            'payment_method' => 'PayHere', 'terms_accepted' => true,
            // deliberately tampered amounts - must be ignored
            'monthly_rate' => 1, 'total_amount' => 1, 'final_amount' => 1,
        ], $over);
    }

    public function test_vendor_can_save_rate_per_sqft(): void
    {
        $vendor = $this->vendor();
        $res = $this->actingAs($vendor)->withoutMiddleware(['vendor.verified', \App\Http\Middleware\EnsureVendorHasApprovedServiceAccess::class])
            ->postJson('/vendors/warehouse/api/units', [
                'name' => 'New WH', 'address' => 'Kandy', 'type' => 'general_warehouse',
                'pricing_model' => 'monthly', 'total_area' => 8000, 'monthly_rate' => 300000,
                'rate_per_sqft' => 42.5,
            ]);
        $res->assertRedirect();
        $this->assertSame('42.50', WarehouseUnit::where('name', 'New WH')->first()->rate_per_sqft);

        // only rate_per_sqft given: base_price falls back to rate x area
        $this->actingAs($vendor)->withoutMiddleware(['vendor.verified', \App\Http\Middleware\EnsureVendorHasApprovedServiceAccess::class])
            ->postJson('/vendors/warehouse/api/units', [
                'name' => 'Sqft only', 'address' => 'Galle', 'type' => 'general_warehouse',
                'pricing_model' => 'monthly', 'total_area' => 1000, 'rate_per_sqft' => 10,
            ])->assertRedirect();
        $this->assertSame('10000.00', WarehouseUnit::where('name', 'Sqft only')->first()->base_price);
    }

    public function test_booking_is_priced_server_side_by_sqft(): void
    {
        $unit = $this->unit($this->vendor());
        $client = User::factory()->create(['role' => 'client']);

        $res = $this->actingAs($client)->postJson('/warehouse-bookings/book', $this->payload($unit));
        $res->assertSuccessful();

        $b = WarehouseBooking::where('warehouse_unit_id', $unit->id)->latest('id')->first();
        $this->assertEquals(125000, $b->monthly_rate);          // 2500 x 50
        $this->assertEquals(412500, $b->total_amount);          // 3 x 125000 x 1.1
        $this->assertEquals(37500, $b->tax_amount);
        $this->assertEquals(427500, $b->final_amount);          // + 10000 + 5000
        $this->assertEquals(2500, $b->required_space);
    }

    public function test_legacy_unit_still_prorates(): void
    {
        $unit = $this->unit($this->vendor(), ['rate_per_sqft' => null, 'tax_rate' => 0]);
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)->postJson('/warehouse-bookings/book', $this->payload($unit, ['duration_months' => 1]))->assertSuccessful();
        $b = WarehouseBooking::where('warehouse_unit_id', $unit->id)->latest('id')->first();
        $this->assertEquals(100000, $b->monthly_rate);          // 400000 x 25%
        $this->assertEquals(115000, $b->final_amount);
    }

    public function test_fulfillment_addon_uses_booked_space_rate(): void
    {
        $unit = $this->unit($this->vendor(), ['offers_fulfillment' => true, 'fulfillment_fee_rate' => 10, 'tax_rate' => 0]);
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)->postJson('/warehouse-bookings/book', $this->payload($unit, ['duration_months' => 1, 'fulfillment_service' => true]))->assertSuccessful();
        $b = WarehouseBooking::where('warehouse_unit_id', $unit->id)->latest('id')->first();
        $this->assertEquals(12500, $b->add_ons_cost);           // 10% of 125000
        $this->assertEquals(125000 + 12500 + 15000, $b->final_amount);
    }

    public function test_rejects_oversize_and_non_sqft_unit(): void
    {
        $unit = $this->unit($this->vendor());
        $client = User::factory()->create(['role' => 'client']);

        $this->actingAs($client)->postJson('/warehouse-bookings/book', $this->payload($unit, ['required_space' => 10001]))->assertStatus(422);
        $this->actingAs($client)->postJson('/warehouse-bookings/book', $this->payload($unit, ['storage_unit' => 'sqm']))->assertStatus(422);
        $this->assertSame(0, WarehouseBooking::where('warehouse_unit_id', $unit->id)->count());
    }

    public function test_vendor_can_edit_rate_per_sqft(): void
    {
        $vendor = $this->vendor();
        $unit = $this->unit($vendor);
        $mw = ['vendor.verified', \App\Http\Middleware\EnsureVendorHasApprovedServiceAccess::class];

        $this->actingAs($vendor)->withoutMiddleware($mw)->getJson("/vendors/warehouse/api/units/{$unit->id}")
            ->assertSuccessful()->assertJsonFragment(['rate_per_sqft' => '50.00']);

        $this->actingAs($vendor)->withoutMiddleware($mw)->putJson("/vendors/warehouse/api/units/{$unit->id}", [
            'name' => 'Test WH', 'address' => 'Colombo', 'type' => 'general_warehouse', 'pricing_model' => 'monthly',
            'total_area' => 10000, 'monthly_rate' => 400000, 'rate_per_sqft' => 60,
        ]);
        $this->assertSame('60.00', $unit->fresh()->rate_per_sqft);
    }
}
