<?php

namespace Tests\Feature\Courier;

use App\Models\Courier\CourierAddress;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\VendorCourierSetting;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use App\Models\ServiceCategory;
use App\Models\ServiceSubCategory;
use App\Models\ServiceWorkspace;
use App\Models\User;
use App\Models\VendorServiceRegistration;
use App\Models\VendorUserMembership;
use Database\Seeders\CourierRbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CourierTeamAccessAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        Carbon::setTestNow(Carbon::create(2026, 3, 30, 10, 0, 0, 'UTC'));
        $this->seed(CourierRbacSeeder::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_update_access_denies_role_change_without_assign_role_permission(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, ['courier.team.view']);
        $target = $this->createMemberTarget($vendor, $workspace, 'courier_viewer');

        $response = $this->actingAs($actor)->patch(
            route('courierService.team.access.update', ['user' => $target->id]),
            ['role' => 'courier_admin']
        );

        $response->assertForbidden();
    }

    public function test_update_access_denies_direct_permissions_change_without_assign_permissions_permission(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.team.view',
            'courier.team.manage_status',
        ]);
        $target = $this->createMemberTarget($vendor, $workspace, 'courier_viewer');

        $response = $this->actingAs($actor)->patch(
            route('courierService.team.access.update', ['user' => $target->id]),
            ['directPermissions' => ['courier.clients.manage']]
        );

        $response->assertForbidden();
    }

    public function test_update_access_allows_status_change_with_manage_status_permission_only(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.team.view',
            'courier.team.manage_status',
        ]);
        $target = $this->createMemberTarget($vendor, $workspace, 'courier_viewer');

        $response = $this->actingAs($actor)->patch(
            route('courierService.team.access.update', ['user' => $target->id]),
            ['status' => 'suspended']
        );

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('team_user_memberships', [
            'vendor_user_id' => $vendor->id,
            'user_id' => $target->id,
            'status' => 'suspended',
        ]);
    }

    public function test_store_forces_viewer_role_and_ignores_direct_permissions_without_assign_permissions_or_assign_role_permissions(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, ['courier.team.create_user']);

        $email = 'p0-1-new-member+' . uniqid() . '@example.com';

        $response = $this->actingAs($actor)->post(route('courierService.team.store'), [
            'name' => 'P0 User',
            'email' => $email,
            'password' => 'TempPass@123',
            'role' => 'courier_admin',
            'directPermissions' => ['courier.team.transfer_ownership'],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $created = User::query()->where('email', $email)->firstOrFail();

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);

        $this->assertTrue($created->hasRole('courier_viewer'));
        $this->assertCount(0, $created->permissions);
    }

    public function test_team_user_profile_update_rejects_duplicate_contact_email(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, ['courier.profile.update']);
        $originalEmail = (string) $actor->email;

        $existingEmail = 'already.used+' . uniqid() . '@example.com';

        $existing = User::factory()->create([
            'email' => $existingEmail,
            'role' => 'client',
            'status' => 'verified',
        ]);

        $response = $this->actingAs($actor)->post(route('courierService.profile.update'), [
            'section' => 'company',
            'companyName' => 'Team Member Name',
            'displayName' => 'Team Display',
            'contactEmail' => $existing->email,
            'contactPhone' => '+94 77 123 4567',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasErrors(['contactEmail']);

        $this->assertSame($originalEmail, (string) $actor->fresh()->email);
    }

    public function test_units_url_is_forbidden_without_workspace_shipments_permission(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.dashboard.view',
            'courier.tracking.view',
        ]);

        $response = $this->actingAs($actor)->getJson(route('courierService.units'));

        $response->assertForbidden();
    }

    public function test_global_shipments_permission_does_not_bypass_workspace_units_route_protection(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.dashboard.view',
        ]);

        [, $foreignWorkspace] = $this->createCourierVendorWorkspace();

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($foreignWorkspace->id);
        $actor->givePermissionTo('courier.shipments.view');

        $registrar->setPermissionsTeamId($workspace->id);

        $response = $this->actingAs($actor)->getJson(route('courierService.units'));

        $response->assertForbidden();
    }

    public function test_payments_route_is_forbidden_without_finance_permission(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.dashboard.view',
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $actor->syncRoles(['courier_tracking_officer']);

        $response = $this->actingAs($actor)->getJson(route('courierService.payment'));

        $response->assertForbidden();
    }

    public function test_payments_route_requires_approved_registration_even_with_finance_access(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.finance.view',
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $actor->syncRoles(['courier_finance']);

        VendorServiceRegistration::query()
            ->where('user_id', $vendor->id)
            ->update([
                'status' => 'submitted',
                'reviewed_at' => null,
            ]);

        $response = $this->actingAs($actor)->getJson(route('courierService.payment'));

        $response->assertForbidden();
    }

    public function test_payments_route_returns_card_payment_rows_and_lifecycle_gate_for_finance_role(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.finance.view',
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $actor->syncRoles(['courier_finance']);

        $shipment = $this->createAssignedShipment($vendor, [
            'status' => CourierShipment::STATUS_CONFIRMED,
            'estimated_cost' => 7600,
            'currency_code' => 'LKR',
        ]);

        $payment = CourierShipmentPayment::query()->create([
            'courier_shipment_id' => $shipment->id,
            'requested_by_user_id' => null,
            'provider' => CourierShipmentPayment::PROVIDER_PAYMENTSLK,
            'payment_method' => CourierShipmentPayment::PAYMENT_METHOD_CARD,
            'is_required' => true,
            'amount' => 7600,
            'currency_code' => 'LKR',
            'status' => CourierShipmentPayment::STATUS_PENDING,
            'gateway_order_id' => 'CPH-TEAM-' . $shipment->id,
            'gateway_payment_id' => 'PH-GW-' . $shipment->id,
            'tx_reference' => 'TX-PAY-' . $shipment->id,
            'initiated_at' => now()->subMinute(),
        ]);

        $response = $this->actingAs($actor)->get(route('courierService.payment'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Web/home/vendors/courierService/Payment')
            ->where('courierPayments.summary.totalTransactions', 1)
            ->where('courierPayments.summary.pendingTransactions', 1)
            ->where('courierPayments.rows.0.shipmentReference', (string) $shipment->reference)
            ->where('courierPayments.rows.0.status', CourierShipmentPayment::STATUS_PENDING)
            ->where('courierPayments.rows.0.gatewayOrderId', (string) $payment->gateway_order_id)
            ->where('courierPayments.rows.0.gatewayPaymentId', (string) $payment->gateway_payment_id)
            ->where('courierPayments.rows.0.txReference', (string) $payment->tx_reference)
            ->where('courierPayments.rows.0.cardRequired', true)
            ->where('courierPayments.rows.0.lifecycleBlocked', true)
        );
    }

    public function test_dispatcher_cannot_cancel_when_team_policy_disables_dispatcher_cancellation(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.bookings.manage_lifecycle',
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $actor->syncRoles(['courier_dispatcher']);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => $vendor->id],
            ['settings' => ['team' => [
                'dispatcherCanCancel' => false,
                'permissionModel' => ['enabled' => false],
            ]]],
        );

        $shipment = $this->createAssignedShipment($vendor);

        $response = $this->actingAs($actor)->post(
            route('courierService.bookings.lifecycle', ['shipment' => $shipment->id]),
            ['action' => 'cancel_booking']
        );

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertNotEquals(CourierShipment::STATUS_CANCELLED, $shipment->fresh()->status);
    }

    public function test_bookings_hide_quote_amount_when_finance_rate_visibility_is_disabled(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.bookings.view',
        ]);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => $vendor->id],
            ['settings' => ['team' => [
                'financeCanViewRates' => false,
                'permissionModel' => ['enabled' => false],
            ]]],
        );

        $this->createAssignedShipment($vendor, [
            'estimated_cost' => 12500,
            'status' => CourierShipment::STATUS_CONFIRMED,
        ]);

        $response = $this->actingAs($actor)->get(route('courierService.bookings'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('courierBookings.rows.0.quoteAmount', null)
        );
    }

    public function test_staff_mutating_actions_are_blocked_when_security_policy_is_enabled_and_password_change_is_required(): void
    {
        [$vendor, $workspace] = $this->createCourierVendorWorkspace();

        $actor = $this->createActorWithMembership($vendor, $workspace, [
            'courier.shipments.update_stage',
        ]);

        $actor->update(['must_change_password' => true]);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => $vendor->id],
            ['settings' => ['team' => ['enforce2FA' => true]]],
        );

        $shipment = $this->createAssignedShipment($vendor, [
            'status' => CourierShipment::STATUS_PENDING,
        ]);

        $response = $this->actingAs($actor)->post(
            route('courierService.shipments.stage', ['shipment' => $shipment->id]),
            ['action' => 'ready_for_pickup']
        );

        $response->assertForbidden();
    }

    private function createCourierVendorWorkspace(): array
    {
        $vendor = User::factory()->create([
            'role' => 'vendor',
            'status' => 'verified',
        ]);

        $category = ServiceCategory::query()->firstOrCreate(
            ['slug' => 'courier-services'],
            [
                'name' => 'Courier Services',
                'description' => 'Courier service category for tests',
                'display_order' => 1,
                'is_active' => true,
            ]
        );

        $subCategory = ServiceSubCategory::query()->firstOrCreate(
            [
                'service_category_id' => $category->id,
                'slug' => 'domestic',
            ],
            [
                'name' => 'Courier Domestic',
                'description' => 'Courier sub category for tests',
                'required_fields' => [],
                'display_order' => 1,
                'is_active' => true,
            ]
        );

        VendorServiceRegistration::query()->create([
            'user_id' => $vendor->id,
            'service_category_id' => $category->id,
            'service_sub_category_id' => $subCategory->id,
            'field_values' => [],
            'status' => 'approved',
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        $workspace = ServiceWorkspace::query()->create([
            'vendor_user_id' => $vendor->id,
            'service_key' => 'courier_service',
            'name' => 'Courier Service Workspace',
            'owner_user_id' => $vendor->id,
            'status' => 'active',
        ]);

        VendorUserMembership::query()->create([
            'vendor_user_id' => $vendor->id,
            'user_id' => $vendor->id,
            'membership_role' => 'owner',
            'status' => 'active',
            'blocked_service_keys' => [],
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $vendor->syncRoles(['courier_owner']);

        VendorCourierSetting::query()->updateOrCreate(
            ['vendor_user_id' => $vendor->id],
            ['settings' => [
                'team' => [
                    'sessionSecurity' => [
                        'enabled' => false,
                    ],
                ],
            ]],
        );

        return [$vendor, $workspace];
    }

    private function createActorWithMembership(User $vendor, ServiceWorkspace $workspace, array $permissions): User
    {
        $actor = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        VendorUserMembership::query()->create([
            'vendor_user_id' => $vendor->id,
            'user_id' => $actor->id,
            'membership_role' => 'admin',
            'status' => 'active',
            'blocked_service_keys' => [],
            'invited_by_user_id' => $vendor->id,
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $actor->syncRoles([]);
        $actor->syncPermissions($permissions);

        return $actor;
    }

    private function createMemberTarget(User $vendor, ServiceWorkspace $workspace, string $role = 'courier_viewer'): User
    {
        $target = User::factory()->create([
            'role' => 'client',
            'status' => 'verified',
        ]);

        VendorUserMembership::query()->create([
            'vendor_user_id' => $vendor->id,
            'user_id' => $target->id,
            'membership_role' => 'member',
            'status' => 'active',
            'blocked_service_keys' => [],
            'invited_by_user_id' => $vendor->id,
        ]);

        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId($workspace->id);
        $target->syncRoles([$role]);
        $target->syncPermissions([]);

        return $target;
    }

    private function createAssignedShipment(User $vendor, array $overrides = []): CourierShipment
    {
        $emailSuffix = uniqid();

        $sender = CourierContact::query()->create([
            'name' => 'Sender Test',
            'email' => 'sender+' . $emailSuffix . '@example.com',
        ]);

        $recipient = CourierContact::query()->create([
            'name' => 'Recipient Test',
            'email' => 'recipient+' . $emailSuffix . '@example.com',
        ]);

        $senderAddress = CourierAddress::query()->create([
            'contact_id' => $sender->id,
            'line1' => 'Sender Line 1',
            'city' => 'Colombo',
            'country' => 'LK',
        ]);

        $recipientAddress = CourierAddress::query()->create([
            'contact_id' => $recipient->id,
            'line1' => 'Recipient Line 1',
            'city' => 'Kandy',
            'country' => 'LK',
        ]);

        return CourierShipment::query()->create(array_merge([
            'reference' => 'CR-TST-' . strtoupper(substr(sha1((string) microtime(true)), 0, 8)),
            'assigned_vendor_user_id' => $vendor->id,
            'sender_contact_id' => $sender->id,
            'recipient_contact_id' => $recipient->id,
            'sender_address_id' => $senderAddress->id,
            'recipient_address_id' => $recipientAddress->id,
            'service_level' => 'express',
            'status' => CourierShipment::STATUS_CONFIRMED,
            'assignment_status' => CourierShipment::ASSIGNMENT_STATUS_ASSIGNED,
            'assignment_category' => 'domestic',
            'assigned_at' => now(),
            'estimated_cost' => 5000,
            'currency_code' => 'LKR',
        ], $overrides));
    }
}
