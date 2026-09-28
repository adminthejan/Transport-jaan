<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class CourierRbac
{
    public const GUARD = 'web';

    public static function permissions(): array
    {
        return [
            'courier.dashboard.view',
            'courier.reports.export',
            'courier.bookings.view',
            'courier.bookings.manage_lifecycle',
            'courier.bookings.bulk_update',
            'courier.shipments.view',
            'courier.shipments.create',
            'courier.shipments.update_stage',
            'courier.shipments.bulk_update',
            'courier.tracking.view',
            'courier.clients.view',
            'courier.clients.manage',
            'courier.settings.view',
            'courier.settings.update',
            'courier.services.cod.request',
            'courier.services.cod.override',
            'courier.labels.view',
            'courier.labels.manage_templates',
            'courier.labels.print',
            'courier.profile.view',
            'courier.profile.update',
            'courier.finance.view',
            'courier.refunds.create',
            'courier.refunds.approve',
            'courier.calendar.view',
            'courier.team.view',
            'courier.team.create_user',
            'courier.team.assign_role',
            'courier.team.assign_permissions',
            'courier.team.access_requests.approve',
            'courier.team.temporary_access.manage',
            'courier.team.break_glass',
            'courier.team.access_review.view',
            'courier.team.access_review.certify',
            'courier.team.api_access.view',
            'courier.team.api_access.manage',
            'courier.team.manage_status',
            'courier.team.sessions.view',
            'courier.team.sessions.revoke',
            'courier.team.transfer_ownership',
        ];
    }

    public static function roleMap(): array
    {
        $permissions = self::permissions();
        $sodRestrictedPermissions = [
            'courier.refunds.approve',
            'courier.team.access_requests.approve',
        ];

        return [
            'courier_owner' => array_values(array_diff($permissions, $sodRestrictedPermissions)),
            'courier_admin' => array_values(array_diff($permissions, array_merge(['courier.team.transfer_ownership'], $sodRestrictedPermissions))),
            'courier_dispatcher' => [
                'courier.dashboard.view',
                'courier.bookings.view',
                'courier.bookings.manage_lifecycle',
                'courier.bookings.bulk_update',
                'courier.shipments.view',
                'courier.shipments.update_stage',
                'courier.shipments.bulk_update',
                'courier.labels.view',
                'courier.labels.print',
                'courier.tracking.view',
                'courier.clients.view',
                'courier.calendar.view',
                'courier.profile.view',
                'courier.profile.update',
            ],
            'courier_tracking_officer' => [
                'courier.dashboard.view',
                'courier.tracking.view',
                'courier.shipments.view',
                'courier.clients.view',
                'courier.profile.view',
                'courier.profile.update',
            ],
            'courier_support' => [
                'courier.dashboard.view',
                'courier.clients.view',
                'courier.clients.manage',
                'courier.tracking.view',
                'courier.profile.view',
                'courier.profile.update',
            ],
            'courier_finance' => [
                'courier.dashboard.view',
                'courier.bookings.view',
                'courier.shipments.view',
                'courier.clients.view',
                'courier.finance.view',
                'courier.refunds.create',
                'courier.reports.export',
                'courier.profile.view',
                'courier.profile.update',
            ],
            'courier_viewer' => [
                'courier.dashboard.view',
                'courier.bookings.view',
                'courier.shipments.view',
                'courier.tracking.view',
                'courier.clients.view',
                'courier.profile.view',
                'courier.profile.update',
            ],
        ];
    }

    public static function ensureDefinitionsExist(): void
    {
        // Runs on every request that touches a courier workspace (see
        // ServiceWorkspaceManager::ensureWorkspaceForVendor). Two concurrent
        // requests can both find a role's permissions "not yet synced" and
        // race to insert the same pivot rows, which throws a unique
        // constraint violation on team_user_role_has_permissions instead of
        // a normal Eloquent exception. Since the exception only occurs when
        // another process is inserting the exact rows we also want, it's
        // safe to treat as "already synced" and move on. The static guard
        // also avoids repeating this work if called more than once per
        // request/process.
        static $ensured = false;
        if ($ensured) {
            return;
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::permissions() as $permissionName) {
            Permission::findOrCreate($permissionName, self::GUARD);
        }

        foreach (self::roleMap() as $roleName => $rolePermissions) {
            $role = Role::findOrCreate($roleName, self::GUARD);
            try {
                $role->syncPermissions($rolePermissions);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                // A concurrent request already synced this role to the same
                // desired permission set; nothing left for us to do.
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $ensured = true;
    }
}