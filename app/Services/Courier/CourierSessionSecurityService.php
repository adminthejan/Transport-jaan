<?php

namespace App\Services\Courier;

use App\Models\Courier\CourierTrustedDevice;
use App\Models\Courier\VendorCourierSetting;
use App\Models\User;
use App\Models\VendorActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class CourierSessionSecurityService
{
    public function defaultPolicy(): array
    {
        return [
            'enabled' => true,
            'deviceTrust' => [
                'enabled' => true,
                'enforceForRoles' => ['courier_owner', 'courier_admin'],
                'enforceForUserIds' => [],
                'trustDurationDays' => 30,
            ],
            'concurrentSessions' => [
                'enabled' => true,
                'mode' => 'revoke_oldest',
                'defaultLimit' => 3,
                'limitsByRole' => [
                    'courier_owner' => 2,
                    'courier_admin' => 2,
                    'courier_dispatcher' => 3,
                    'courier_finance' => 2,
                    'courier_support' => 3,
                    'courier_tracking_officer' => 4,
                    'courier_viewer' => 5,
                ],
            ],
            'anomalyDetection' => [
                'enabled' => true,
                'rapidSwitchMinutes' => 120,
                'clearStepUpOnAnomaly' => false,
                'ipAllowList' => [],
                'ipDenyList' => [],
            ],
            'stepUp' => [
                'enabled' => false,
                'ttlMinutes' => 120,
                'twoFactorTtlMinutes' => 120,
                'persistOnTrustedDevice' => true,
                'deviceRememberDays' => 30,
                'sensitiveRouteNames' => [
                    'courierService.team.access.update',
                    'courierService.team.bulk',
                    'courierService.team.transfer-ownership',
                    'courierService.team.roles.store',
                    'courierService.team.roles.store-template',
                    'courierService.team.roles.clone',
                    'courierService.team.roles.update',
                    'courierService.team.sensitive-approvals.approve',
                    'courierService.team.sensitive-approvals.reject',
                    'courierService.team.temporary-access.approve',
                    'courierService.team.temporary-access.reject',
                    'courierService.team.temporary-access.revoke',
                    'courierService.team.temporary-access.break-glass',
                    'courierService.team.access-reviews.certify',
                    'courierService.team.api-access.store',
                    'courierService.team.api-access.rotate',
                    'courierService.team.api-access.revoke',
                ],
            ],
            'mandatory2FA' => [
                'enabled' => false,
                'roles' => ['courier_owner', 'courier_admin'],
                'userIds' => [],
                'forSensitiveActions' => true,
            ],
        ];
    }

    public function normalizePolicy(array $input): array
    {
        $defaults = $this->defaultPolicy();
        $deviceTrust = is_array($input['deviceTrust'] ?? null) ? $input['deviceTrust'] : [];
        $concurrentSessions = is_array($input['concurrentSessions'] ?? null) ? $input['concurrentSessions'] : [];
        $anomalyDetection = is_array($input['anomalyDetection'] ?? null) ? $input['anomalyDetection'] : [];
        $stepUp = is_array($input['stepUp'] ?? null) ? $input['stepUp'] : [];
        $mandatory2FA = is_array($input['mandatory2FA'] ?? null) ? $input['mandatory2FA'] : [];

        $limitsByRole = is_array($concurrentSessions['limitsByRole'] ?? null)
            ? $concurrentSessions['limitsByRole']
            : $defaults['concurrentSessions']['limitsByRole'];

        $normalizedLimitsByRole = collect($limitsByRole)
            ->mapWithKeys(fn ($value, $key) => [
                trim((string) $key) => max(1, min(10, (int) $value)),
            ])
            ->filter(fn ($limit, $role) => $role !== '' && Str::startsWith($role, 'courier_'))
            ->all();

        return [
            'enabled' => (bool) ($input['enabled'] ?? $defaults['enabled']),
            'deviceTrust' => [
                'enabled' => (bool) ($deviceTrust['enabled'] ?? $defaults['deviceTrust']['enabled']),
                'enforceForRoles' => collect($deviceTrust['enforceForRoles'] ?? $defaults['deviceTrust']['enforceForRoles'])
                    ->map(fn ($role) => trim((string) $role))
                    ->filter(fn ($role) => $role !== '')
                    ->unique()
                    ->values()
                    ->all(),
                'enforceForUserIds' => $this->normalizeUserIds($deviceTrust['enforceForUserIds'] ?? $defaults['deviceTrust']['enforceForUserIds']),
                'trustDurationDays' => max(1, min(365, (int) ($deviceTrust['trustDurationDays'] ?? $defaults['deviceTrust']['trustDurationDays']))),
            ],
            'concurrentSessions' => [
                'enabled' => (bool) ($concurrentSessions['enabled'] ?? $defaults['concurrentSessions']['enabled']),
                'mode' => in_array((string) ($concurrentSessions['mode'] ?? ''), ['revoke_oldest', 'block'], true)
                    ? (string) $concurrentSessions['mode']
                    : $defaults['concurrentSessions']['mode'],
                'defaultLimit' => max(1, min(10, (int) ($concurrentSessions['defaultLimit'] ?? $defaults['concurrentSessions']['defaultLimit']))),
                'limitsByRole' => count($normalizedLimitsByRole) > 0
                    ? $normalizedLimitsByRole
                    : $defaults['concurrentSessions']['limitsByRole'],
            ],
            'anomalyDetection' => [
                'enabled' => (bool) ($anomalyDetection['enabled'] ?? $defaults['anomalyDetection']['enabled']),
                'rapidSwitchMinutes' => max(5, min(720, (int) ($anomalyDetection['rapidSwitchMinutes'] ?? $defaults['anomalyDetection']['rapidSwitchMinutes']))),
                'clearStepUpOnAnomaly' => (bool) ($anomalyDetection['clearStepUpOnAnomaly'] ?? $defaults['anomalyDetection']['clearStepUpOnAnomaly']),
                'ipAllowList' => collect($anomalyDetection['ipAllowList'] ?? $defaults['anomalyDetection']['ipAllowList'])
                    ->map(fn ($ip) => trim((string) $ip))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
                'ipDenyList' => collect($anomalyDetection['ipDenyList'] ?? $defaults['anomalyDetection']['ipDenyList'])
                    ->map(fn ($ip) => trim((string) $ip))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ],
            'stepUp' => [
                'enabled' => (bool) ($stepUp['enabled'] ?? $defaults['stepUp']['enabled']),
                'ttlMinutes' => max(5, min(120, (int) ($stepUp['ttlMinutes'] ?? $defaults['stepUp']['ttlMinutes']))),
                'twoFactorTtlMinutes' => max(5, min(120, (int) ($stepUp['twoFactorTtlMinutes'] ?? $defaults['stepUp']['twoFactorTtlMinutes']))),
                'persistOnTrustedDevice' => (bool) ($stepUp['persistOnTrustedDevice'] ?? $defaults['stepUp']['persistOnTrustedDevice']),
                'deviceRememberDays' => max(1, min(365, (int) ($stepUp['deviceRememberDays'] ?? $defaults['stepUp']['deviceRememberDays']))),
                'sensitiveRouteNames' => collect($stepUp['sensitiveRouteNames'] ?? $defaults['stepUp']['sensitiveRouteNames'])
                    ->map(fn ($routeName) => trim((string) $routeName))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ],
            'mandatory2FA' => [
                'enabled' => (bool) ($mandatory2FA['enabled'] ?? $defaults['mandatory2FA']['enabled']),
                'roles' => collect($mandatory2FA['roles'] ?? $defaults['mandatory2FA']['roles'])
                    ->map(fn ($role) => trim((string) $role))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
                'userIds' => $this->normalizeUserIds($mandatory2FA['userIds'] ?? $defaults['mandatory2FA']['userIds']),
                'forSensitiveActions' => (bool) ($mandatory2FA['forSensitiveActions'] ?? $defaults['mandatory2FA']['forSensitiveActions']),
            ],
        ];
    }

    public function resolvePolicyForVendor(int $vendorUserId): array
    {
        $record = VendorCourierSetting::query()->firstWhere('vendor_user_id', $vendorUserId);
        $settings = is_array($record?->settings) ? $record->settings : [];
        $team = is_array($settings['team'] ?? null) ? $settings['team'] : [];
        $policy = is_array($team['sessionSecurity'] ?? null) ? $team['sessionSecurity'] : [];

        return $this->normalizePolicy($policy);
    }

    public function enforce(Request $request, int $vendorUserId, int $workspaceId): array
    {
        $user = $request->user();
        if (!$user) {
            return ['ok' => true];
        }

        $policy = $this->resolvePolicyForVendor($vendorUserId);

        // Step-up/2FA enforcement is temporarily bypassed org-wide, regardless of
        // any per-vendor override, while keeping the feature and its settings intact.
        $policy['stepUp']['enabled'] = false;
        $policy['mandatory2FA']['enabled'] = false;

        if (!(bool) ($policy['enabled'] ?? true)) {
            return ['ok' => true, 'policy' => $policy];
        }

        $ipAddress = (string) ($request->ip() ?? '');
        $ipPrefix = $this->ipPrefix($ipAddress);
        $currentSessionId = (string) $request->session()->getId();
        $actorUserId = (int) $user->id;
        $actorRole = $this->resolveActorRole($user, $workspaceId, $vendorUserId);

        if ($this->isIpDenied($policy, $ipAddress)) {
            return [
                'ok' => false,
                'status' => 403,
                'message' => 'Access blocked by security network policy.',
                'code' => 'ip_denied',
            ];
        }

        $this->enforceConcurrentSessionLimit($policy, $user->id, $currentSessionId, $actorRole);
        $this->evaluateAnomalySignals($request, $policy, $user->id, $currentSessionId, $ipPrefix, $vendorUserId);

        if ($this->requiresTrustedDevice($policy, $actorRole, $actorUserId)) {
            // Bootstrap rule: do not hard-block first-time users with no trusted devices yet.
            if ($this->hasAnyTrustedDevicesForActor($vendorUserId, $workspaceId, $actorUserId)) {
                $trustedDevice = $this->findTrustedDevice($vendorUserId, $workspaceId, $user->id, $this->deviceHash($request));
                if (!$trustedDevice) {
                    return [
                        'ok' => false,
                        'status' => 403,
                        'message' => 'Trusted device verification is required for your role.',
                        'code' => 'trusted_device_required',
                    ];
                }

                $trustedDevice->update([
                    'last_seen_at' => now(),
                    'last_ip_address' => $ipAddress,
                    'last_ip_prefix' => $ipPrefix,
                ]);
            }
        }

        $stepUpRequired = $this->requiresStepUpForRequest($request, $policy, $actorRole, $actorUserId);
        if ($stepUpRequired) {
            $isStepUpValid = $this->hasFreshSessionTimestamp($request, 'courier_security.step_up_verified_at', (int) ($policy['stepUp']['ttlMinutes'] ?? 20));
            $requiresTwoFactor = $this->requiresTwoFactorForRequest($request, $policy, $actorRole, $actorUserId);
            $isTwoFactorValid = !$requiresTwoFactor
                || $this->hasFreshSessionTimestamp($request, 'courier_security.two_factor_verified_at', (int) ($policy['stepUp']['twoFactorTtlMinutes'] ?? 20));

            if ((!$isStepUpValid || !$isTwoFactorValid) && ($policy['stepUp']['persistOnTrustedDevice'] ?? true)) {
                $trustedDevice = $trustedDevice ?? $this->findTrustedDevice($vendorUserId, $workspaceId, $user->id, $this->deviceHash($request));
                if ($trustedDevice && is_array($trustedDevice->metadata)) {
                    $meta = $trustedDevice->metadata;
                    $deviceVerifiedAt = $meta['step_up_verified_at'] ?? null;
                    if ($deviceVerifiedAt) {
                        $days = (int) ($policy['stepUp']['deviceRememberDays'] ?? 30);
                        try {
                            $verifiedDate = now()->createFromFormat('Y-m-d H:i:s', $deviceVerifiedAt);
                            if ($verifiedDate && now()->diffInDays($verifiedDate) <= max(1, $days)) {
                                $request->session()->put('courier_security.step_up_verified_at', $deviceVerifiedAt);
                                $request->session()->put('courier_security.two_factor_verified_at', $deviceVerifiedAt);
                                $isStepUpValid = true;
                                $isTwoFactorValid = true;
                            }
                        } catch (\Throwable) {
                            // Invalid date format
                        }
                    }
                }
            }

            if (!$isStepUpValid || !$isTwoFactorValid) {
                return [
                    'ok' => false,
                    'status' => 428,
                    'message' => 'Step-up authentication is required before this action.',
                    'code' => 'step_up_required',
                    'requiresTwoFactor' => $requiresTwoFactor,
                ];
            }
        }

        return [
            'ok' => true,
            'policy' => $policy,
            'actorRole' => $actorRole,
        ];
    }

    public function trustCurrentDevice(Request $request, int $vendorUserId, int $workspaceId, ?string $label = null): CourierTrustedDevice
    {
        $user = $request->user();
        $hash = $this->deviceHash($request);
        $policy = $this->resolvePolicyForVendor($vendorUserId);
        $durationDays = (int) ($policy['deviceTrust']['trustDurationDays'] ?? 30);

        $record = CourierTrustedDevice::query()->updateOrCreate(
            [
                'vendor_user_id' => $vendorUserId,
                'user_id' => (int) $user->id,
                'device_hash' => $hash,
            ],
            [
                'service_workspace_id' => $workspaceId,
                'device_label' => trim((string) ($label ?: 'Trusted Device')),
                'last_ip_address' => (string) ($request->ip() ?? ''),
                'last_ip_prefix' => $this->ipPrefix((string) ($request->ip() ?? '')),
                'trusted_at' => now(),
                'last_seen_at' => now(),
                'expires_at' => now()->addDays(max(1, min(365, $durationDays))),
                'is_active' => true,
                'metadata' => [
                    'user_agent' => Str::limit((string) ($request->userAgent() ?? ''), 240, ''),
                ],
            ]
        );

        return $record->fresh();
    }

    public function trustedDevicesForActor(int $vendorUserId, int $workspaceId, int $userId): array
    {
        return CourierTrustedDevice::query()
            ->where('vendor_user_id', $vendorUserId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where(function ($query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')->orWhere('service_workspace_id', $workspaceId);
            })
            ->orderByDesc('last_seen_at')
            ->limit(20)
            ->get()
            ->map(fn (CourierTrustedDevice $item) => [
                'id' => (int) $item->id,
                'label' => (string) ($item->device_label ?? ''),
                'lastIpAddress' => (string) ($item->last_ip_address ?? ''),
                'lastSeenAt' => optional($item->last_seen_at)->format('Y-m-d H:i:s'),
                'expiresAt' => optional($item->expires_at)->format('Y-m-d H:i:s'),
            ])
            ->values()
            ->all();
    }

    private function evaluateAnomalySignals(Request $request, array $policy, int $userId, string $currentSessionId, string $ipPrefix, int $vendorUserId): void
    {
        if (!(bool) ($policy['anomalyDetection']['enabled'] ?? true)) {
            return;
        }

        $recent = DB::table('sessions')
            ->where('user_id', $userId)
            ->where('id', '!=', $currentSessionId)
            ->orderByDesc('last_activity')
            ->first(['id', 'ip_address', 'last_activity']);

        if (!$recent) {
            return;
        }

        $recentPrefix = $this->ipPrefix((string) ($recent->ip_address ?? ''));
        $switchMinutes = abs(now()->diffInMinutes(now()->setTimestamp((int) ($recent->last_activity ?? 0)), false));
        $threshold = (int) ($policy['anomalyDetection']['rapidSwitchMinutes'] ?? 45);

        if ($ipPrefix !== '' && $recentPrefix !== '' && $ipPrefix !== $recentPrefix && $switchMinutes <= $threshold) {
            $request->session()->put('courier_security.anomaly_detected_at', now()->toDateTimeString());

            if ((bool) ($policy['anomalyDetection']['clearStepUpOnAnomaly'] ?? true)) {
                $request->session()->forget('courier_security.step_up_verified_at');
                $request->session()->forget('courier_security.two_factor_verified_at');

                $trustedDevice = $this->findTrustedDevice($vendorUserId, $request->attributes->get('service_workspace_id', 0), $userId, $this->deviceHash($request));
                if ($trustedDevice && is_array($trustedDevice->metadata)) {
                    $meta = $trustedDevice->metadata;
                    unset($meta['step_up_verified_at'], $meta['two_factor_verified_at']);
                    $trustedDevice->update(['metadata' => $meta]);
                }
            }

            VendorActivityLog::query()->create([
                'vendor_id' => $vendorUserId,
                'admin_id' => (int) optional($request->user())->id,
                'action' => 'courier_team_security_ip_anomaly',
                'target_type' => 'session',
                'target_id' => 0,
                'description' => 'Potential IP anomaly detected for team session.',
                'metadata' => [
                    'current_ip_prefix' => $ipPrefix,
                    'recent_ip_prefix' => $recentPrefix,
                    'switch_minutes' => $switchMinutes,
                ],
            ]);
        }
    }

    private function enforceConcurrentSessionLimit(array $policy, int $userId, string $currentSessionId, string $actorRole): void
    {
        if (!(bool) ($policy['concurrentSessions']['enabled'] ?? true)) {
            return;
        }

        $defaultLimit = (int) ($policy['concurrentSessions']['defaultLimit'] ?? 3);
        $roleLimit = (int) ($policy['concurrentSessions']['limitsByRole'][$actorRole] ?? $defaultLimit);
        $limit = max(1, min(10, $roleLimit));

        $sessions = DB::table('sessions')
            ->where('user_id', $userId)
            ->orderByDesc('last_activity')
            ->get(['id', 'last_activity']);

        if ($sessions->count() <= $limit) {
            return;
        }

        $mode = (string) ($policy['concurrentSessions']['mode'] ?? 'revoke_oldest');

        if ($mode === 'block') {
            return;
        }

        $keepIds = $sessions->pluck('id')->take($limit)->map(fn ($id) => (string) $id)->all();
        if ($currentSessionId !== '' && !in_array($currentSessionId, $keepIds, true)) {
            $keepIds = array_slice(array_merge([$currentSessionId], $keepIds), 0, $limit);
        }

        DB::table('sessions')
            ->where('user_id', $userId)
            ->whereNotIn('id', $keepIds)
            ->delete();
    }

    private function requiresStepUpForRequest(Request $request, array $policy, string $role, int $userId): bool
    {
        if (!(bool) ($policy['stepUp']['enabled'] ?? true)) {
            return false;
        }

        if (!$this->isWriteRequest($request)) {
            return false;
        }

        if ($this->isSensitiveRoute($request, $policy)) {
            return true;
        }

        return in_array($role, (array) ($policy['mandatory2FA']['roles'] ?? []), true)
            || in_array($userId, (array) ($policy['mandatory2FA']['userIds'] ?? []), true);
    }

    private function requiresTwoFactorForRequest(Request $request, array $policy, string $role, int $userId): bool
    {
        if (!(bool) ($policy['mandatory2FA']['enabled'] ?? true)) {
            return false;
        }

        if (
            $this->isWriteRequest($request)
            && (
                in_array($role, (array) ($policy['mandatory2FA']['roles'] ?? []), true)
                || in_array($userId, (array) ($policy['mandatory2FA']['userIds'] ?? []), true)
            )
        ) {
            return true;
        }

        if ((bool) ($policy['mandatory2FA']['forSensitiveActions'] ?? true) && $this->isSensitiveRoute($request, $policy)) {
            return true;
        }

        return false;
    }

    private function isWriteRequest(Request $request): bool
    {
        return in_array(strtoupper((string) $request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'], true);
    }

    private function isSensitiveRoute(Request $request, array $policy): bool
    {
        $route = $request->route();
        $routeName = is_object($route) ? (string) $route->getName() : '';

        return in_array($routeName, (array) ($policy['stepUp']['sensitiveRouteNames'] ?? []), true);
    }

    private function hasFreshSessionTimestamp(Request $request, string $key, int $ttlMinutes): bool
    {
        $value = (string) $request->session()->get($key, '');
        if ($value === '') {
            return false;
        }

        try {
            $verifiedAt = now()->createFromFormat('Y-m-d H:i:s', $value);
            return $verifiedAt && now()->diffInMinutes($verifiedAt) <= max(1, $ttlMinutes);
        } catch (\Throwable $exception) {
            return false;
        }
    }

    public function findTrustedDevice(int $vendorUserId, int $workspaceId, int $userId, string $hash): ?CourierTrustedDevice
    {
        return CourierTrustedDevice::query()
            ->where('vendor_user_id', $vendorUserId)
            ->where('user_id', $userId)
            ->where('device_hash', $hash)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where(function ($query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')->orWhere('service_workspace_id', $workspaceId);
            })
            ->latest('id')
            ->first();
    }

    private function hasAnyTrustedDevicesForActor(int $vendorUserId, int $workspaceId, int $userId): bool
    {
        return CourierTrustedDevice::query()
            ->where('vendor_user_id', $vendorUserId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->where(function ($query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')->orWhere('service_workspace_id', $workspaceId);
            })
            ->exists();
    }

    private function requiresTrustedDevice(array $policy, string $role, int $userId): bool
    {
        if (!(bool) ($policy['deviceTrust']['enabled'] ?? true)) {
            return false;
        }

        return in_array($role, (array) ($policy['deviceTrust']['enforceForRoles'] ?? []), true)
            || in_array($userId, (array) ($policy['deviceTrust']['enforceForUserIds'] ?? []), true);
    }

    private function normalizeUserIds($value): array
    {
        return collect(is_array($value) ? $value : [])
            ->map(fn ($userId) => (int) $userId)
            ->filter(fn ($userId) => $userId > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function resolveActorRole(User $user, int $workspaceId, int $vendorUserId): string
    {
        if ((int) $user->id === $vendorUserId) {
            return 'courier_owner';
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspaceId);

        $role = $user->roles
            ->pluck('name')
            ->map(fn ($name) => (string) $name)
            ->first(fn ($name) => Str::startsWith($name, 'courier_'));

        return $role ?: 'courier_viewer';
    }

    private function isIpDenied(array $policy, string $ipAddress): bool
    {
        $deny = (array) ($policy['anomalyDetection']['ipDenyList'] ?? []);
        $allow = (array) ($policy['anomalyDetection']['ipAllowList'] ?? []);

        if (in_array($ipAddress, $allow, true)) {
            return false;
        }

        return in_array($ipAddress, $deny, true);
    }

    private function ipPrefix(string $ipAddress): string
    {
        $ipAddress = trim($ipAddress);
        if ($ipAddress === '') {
            return '';
        }

        if (str_contains($ipAddress, '.')) {
            $parts = explode('.', $ipAddress);
            return implode('.', array_slice($parts, 0, 3));
        }

        if (str_contains($ipAddress, ':')) {
            $parts = explode(':', $ipAddress);
            return implode(':', array_slice($parts, 0, 4));
        }

        return $ipAddress;
    }

    public function deviceHash(Request $request): string
    {
        return hash('sha384', implode('|', [
            (string) optional($request->user())->id,
            (string) $request->ip(),
            (string) $request->userAgent(),
            (string) config('app.key'),
        ]));
    }
}
