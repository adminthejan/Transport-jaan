<?php

namespace App\Http\Controllers\CourierControllers\Vendor;

use App\Mail\CourierNotificationTestMail;
use App\Http\Middleware\CourierTemporaryAccessLifecycle;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Courier\CourierContact;
use App\Models\Courier\CourierCustomerEmailDispatch;
use App\Models\Courier\CourierSensitiveActionApproval;
use App\Models\Courier\CourierTeamSecurityAudit;
use App\Models\Courier\CourierTemporaryAccessGrant;
use App\Models\Courier\CourierVendorCodCapability;
use App\Models\Courier\CourierVendorCodCapabilityAudit;
use App\Models\Courier\SuperAdminCourierActionAudit;
use App\Models\Courier\VendorCourierSetting;
use App\Models\Courier\CourierShipment;
use App\Models\Courier\CourierShipmentPayment;
use App\Models\Courier\VendorCourierLabel;
use App\Models\Courier\VendorCourierClientProfile;
use App\Models\VendorActivityLog;
use App\Models\VendorProfile;
use App\Models\VendorServiceRegistration;
use App\Models\VendorUserMembership;
use App\Services\Courier\CourierSensitiveActionApprovalService;
use App\Services\Courier\CourierAccessReviewService;
use App\Services\Courier\CourierApiServiceAccessService;
use App\Services\Courier\CourierCustomerEmailDispatchService;
use App\Services\Courier\CourierExchangeRateService;
use App\Services\Courier\CourierNotificationPreferenceService;
use App\Services\Courier\CourierPricingImportService;
use App\Services\Courier\CourierSessionSecurityService;
use App\Services\Courier\CourierTeamSecurityAuditService;
use App\Services\Courier\CourierTemporaryAccessService;
use App\Services\Rbac\CourierRoleModelService;
use App\Support\CourierRbac;
use App\Support\CourierLabelDefaults;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class VendorCourierDashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware('service.workspace:courier_service');
        $this->middleware(CourierTemporaryAccessLifecycle::class);

        $this->middleware('service.permission:courier.dashboard.view')->only(['dashboard']);

        $this->middleware('service.permission:courier.bookings.view')->only(['bookings']);
        $this->middleware('service.permission:courier.bookings.manage_lifecycle')->only(['updateBookingLifecycle']);
        $this->middleware('service.permission:courier.bookings.bulk_update')->only(['bulkUpdateBookingLifecycle']);
        $this->middleware('service.permission:courier.finance.view')->only(['payments']);

        $this->middleware('service.permission:courier.shipments.view')->only(['shipments']);
        $this->middleware('service.permission:courier.shipments.update_stage')->only(['updateShipmentStage']);
        $this->middleware('service.permission:courier.shipments.bulk_update')->only(['bulkUpdateShipmentStage']);

        $this->middleware('service.permission:courier.clients.view')->only(['clients']);
        $this->middleware('service.permission:courier.clients.manage')->only(['updateClientProfile']);

        $this->middleware('service.permission:courier.tracking.view')->only(['tracking']);
        $this->middleware('service.permission:courier.calendar.view')->only(['calendar']);

        $this->middleware('service.permission:courier.settings.view')->only(['settings']);
        $this->middleware('service.permission:courier.settings.update')->only(['updateSettings', 'pricingImportPreview', 'pricingImportApply', 'requestCodCapability', 'sendNotificationTestEmail']);

        $this->middleware('service.permission:courier.profile.view')->only(['profile']);
        $this->middleware('service.permission:courier.profile.update')->only(['updateProfile', 'updateOwnerProfile', 'removeOwnerProfileImage', 'removeProfileLogo']);
    }

    private const BOOKING_STATUS_OPTIONS = [
        'new_request',
        'quote_pending',
        'quoted',
        'awaiting_client_confirmation',
        'confirmed',
        'cancelled',
        'rejected',
        'expired',
    ];

    private const BOOKING_ACTION_META = [
        'accept_booking' => [
            'status' => CourierShipment::STATUS_CONFIRMED,
            'event' => 'booking_confirmed',
            'nextBookingStatus' => 'confirmed',
        ],
        'request_revision' => [
            'status' => null,
            'event' => 'booking_revision_requested',
            'nextBookingStatus' => 'quote_pending',
        ],
        'send_quote' => [
            'status' => null,
            'event' => 'booking_quoted',
            'nextBookingStatus' => 'quoted',
        ],
        'mark_awaiting_confirmation' => [
            'status' => null,
            'event' => 'booking_awaiting_client_confirmation',
            'nextBookingStatus' => 'awaiting_client_confirmation',
        ],
        'cancel_booking' => [
            'status' => CourierShipment::STATUS_CANCELLED,
            'event' => 'booking_cancelled',
            'nextBookingStatus' => 'cancelled',
        ],
        'reject_booking' => [
            'status' => CourierShipment::STATUS_CANCELLED,
            'event' => 'booking_rejected',
            'nextBookingStatus' => 'rejected',
        ],
        'expire_booking' => [
            'status' => CourierShipment::STATUS_CANCELLED,
            'event' => 'booking_expired',
            'nextBookingStatus' => 'expired',
        ],
        'reopen_booking' => [
            'status' => CourierShipment::STATUS_PENDING,
            'event' => 'booking_reopened',
            'nextBookingStatus' => 'new_request',
        ],
        'cod_collected' => [
            'status' => null,
            'event' => 'cod_collected',
            'nextBookingStatus' => 'confirmed',
        ],
        'cod_failed' => [
            'status' => null,
            'event' => 'cod_collection_failed',
            'nextBookingStatus' => 'confirmed',
        ],
        'cod_refused' => [
            'status' => null,
            'event' => 'cod_collection_refused',
            'nextBookingStatus' => 'confirmed',
        ],
    ];

    private const COD_COLLECTION_ACTIONS = [
        'cod_collected',
        'cod_failed',
        'cod_refused',
    ];

    private const BOOKING_ALLOWED_ACTIONS = [
        'new_request' => ['send_quote', 'request_revision', 'accept_booking', 'reject_booking', 'expire_booking'],
        'quote_pending' => ['send_quote', 'request_revision', 'reject_booking', 'expire_booking'],
        'quoted' => ['mark_awaiting_confirmation', 'accept_booking', 'request_revision', 'reject_booking'],
        'awaiting_client_confirmation' => ['accept_booking', 'request_revision', 'cancel_booking'],
        'confirmed' => ['cancel_booking'],
        'cancelled' => ['reopen_booking'],
        'rejected' => ['reopen_booking'],
        'expired' => ['reopen_booking'],
    ];

    private const SHIPMENT_STAGE_OPTIONS = [
        'new_assignments',
        'ready_for_pickup',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'exception',
        'delivered',
        'cancelled',
    ];

    private const ACTION_META = [
        'accept_assignment' => [
            'status' => CourierShipment::STATUS_CONFIRMED,
            'event' => 'accepted',
            'nextStage' => 'ready_for_pickup',
        ],
        'ready_for_pickup' => [
            'status' => CourierShipment::STATUS_CONFIRMED,
            'event' => 'ready_for_pickup',
            'nextStage' => 'ready_for_pickup',
        ],
        'picked_up' => [
            'status' => CourierShipment::STATUS_IN_TRANSIT,
            'event' => 'picked_up',
            'nextStage' => 'picked_up',
        ],
        'in_transit' => [
            'status' => CourierShipment::STATUS_IN_TRANSIT,
            'event' => 'in_transit',
            'nextStage' => 'in_transit',
        ],
        'out_for_delivery' => [
            'status' => CourierShipment::STATUS_IN_TRANSIT,
            'event' => 'out_for_delivery',
            'nextStage' => 'out_for_delivery',
        ],
        'mark_exception' => [
            'status' => CourierShipment::STATUS_IN_TRANSIT,
            'event' => 'exception',
            'nextStage' => 'exception',
        ],
        'mark_delivered' => [
            'status' => CourierShipment::STATUS_DELIVERED,
            'event' => 'delivered',
            'nextStage' => 'delivered',
        ],
        'cancel_shipment' => [
            'status' => CourierShipment::STATUS_CANCELLED,
            'event' => 'cancelled',
            'nextStage' => 'cancelled',
        ],
    ];

    private const ALLOWED_STAGE_ACTIONS = [
        'new_assignments' => ['accept_assignment', 'ready_for_pickup', 'cancel_shipment'],
        'ready_for_pickup' => ['picked_up', 'mark_exception', 'cancel_shipment'],
        'picked_up' => ['in_transit', 'mark_exception'],
        'in_transit' => ['out_for_delivery', 'mark_exception'],
        'out_for_delivery' => ['mark_delivered', 'mark_exception'],
        'exception' => ['in_transit', 'cancel_shipment'],
        'delivered' => [],
        'cancelled' => [],
    ];

    private const ADVANCED_PERMISSION_RESOURCES = [
        'shipments',
        'bookings',
        'clients',
        'reports',
        'pricing',
        'payouts',
    ];

    private const ADVANCED_PERMISSION_ACTIONS = [
        'view',
        'create',
        'update',
        'cancel',
        'reassign',
        'export',
        'approve',
        'refund',
    ];

    private const ADVANCED_SCOPE_LEVELS = [
        'own_records',
        'assigned_region',
        'assigned_hub',
        'all_workspace',
    ];

    private const SENSITIVE_FIELD_KEYS = [
        'rate_cards',
        'margin',
        'customer_phone',
        'payment_refs',
    ];

    private const ADVANCED_ENVIRONMENTS = [
        'production',
        'sandbox',
    ];

    private const ABAC_RULE_EFFECTS = [
        'allow',
        'deny',
    ];

    private const ABAC_CLIENT_TIERS = [
        'enterprise',
        'sme',
        'individual',
    ];

    private const ABAC_SLA_CLASSES = [
        'on_track',
        'at_risk',
        'on_time',
        'delayed',
        'early',
        'unknown',
    ];

    public function dashboard(Request $request)
    {
        [$filters, $shipments, $approvedCategories] = $this->buildFilteredShipments($request, 'reports', 'view');
        $policy = $this->resolveTeamAccessPolicy((int) $request->attributes->get('vendor_user_id'));

        if ($request->query('export') === 'csv') {
            $this->assertAdvancedPermission($request, $policy, 'reports', 'export');
            return $this->downloadCsv($shipments);
        }

        return Inertia::render('Web/home/vendors/courierService/Dashboard', [
            'courierDashboard' => $this->buildDashboardPayload($shipments, $filters, $approvedCategories),
        ]);
    }

    public function bookings(Request $request)
    {
        [$filters, $shipments, $approvedCategories] = $this->buildFilteredShipments($request, 'bookings', 'view');
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy((int) $request->attributes->get('vendor_user_id'));
        $canViewRates = $this->canActorViewRates($request, $policy);
        $canCodOverride = $this->canActorUseCodOverrideActions($request, $vendorId);

        return Inertia::render('Web/home/vendors/courierService/Booking', [
            'courierBookings' => $this->buildBookingsPayload($shipments, $filters, $canViewRates, $canCodOverride, $approvedCategories),
        ]);
    }

    public function payments(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to access payments.');
        }

        $this->assertAdvancedPermission($request, $policy, 'payouts', 'view');

        $approvedCategories = $this->resolveApprovedCourierPricingCategories($vendorId);
        $scope = $this->resolveScopeForPermission($request, $policy, 'payouts', 'view');
        $dataScopeConstraints = $this->resolveEffectiveDataScopeConstraints($request, $policy, 'payouts', 'view');

        $allowedStatuses = [
            CourierShipmentPayment::STATUS_PENDING,
            CourierShipmentPayment::STATUS_PAID,
            CourierShipmentPayment::STATUS_FAILED,
            CourierShipmentPayment::STATUS_CANCELLED,
            CourierShipmentPayment::STATUS_EXPIRED,
        ];

        $statusFilter = strtolower(trim((string) $request->query('status', '')));
        if (!in_array($statusFilter, $allowedStatuses, true)) {
            $statusFilter = '';
        }

        $filters = [
            'q' => trim((string) $request->query('q', '')),
            'status' => $statusFilter,
            'category' => $this->sanitizeApprovedCategoryFilter(
                trim((string) $request->query('category', '')),
                $approvedCategories
            ),
            'service' => trim((string) $request->query('service', '')),
            'fromDate' => trim((string) $request->query('fromDate', '')),
            'toDate' => trim((string) $request->query('toDate', '')),
            'perPage' => max(5, min(50, (int) $request->query('perPage', 10))),
            'page' => max(1, (int) $request->query('page', 1)),
        ];

        $query = CourierShipmentPayment::query()
            ->with([
                'shipment:id,reference,service_level,status,assignment_category,assigned_vendor_user_id,currency_code,sender_contact_id,sender_address_id,recipient_address_id,estimated_cost',
                'shipment.sender:id,name,company_name',
                'shipment.senderAddress:id,city,country',
                'shipment.recipientAddress:id,city,country',
                'shipment.packages:id,shipment_id,quantity,courier_provider_name,service_tier_label,service_tier_key',
                'shipment.latestPayment' => function ($query) {
                    $query->select(
                        'courier_shipment_payments.id',
                        'courier_shipment_payments.courier_shipment_id',
                        'courier_shipment_payments.payment_method',
                        'courier_shipment_payments.is_required',
                        'courier_shipment_payments.status'
                    );
                },
            ])
            ->where('provider', CourierShipmentPayment::PROVIDER_PAYHERE)
            ->where('payment_method', CourierShipmentPayment::PAYMENT_METHOD_CARD)
            ->whereHas('shipment', function (Builder $shipmentQuery) use ($vendorId, $scope, $request, $dataScopeConstraints, $approvedCategories, $filters) {
                $shipmentQuery->where('assigned_vendor_user_id', $vendorId);
                $this->applyShipmentScopeFilter($shipmentQuery, $scope, $request, $vendorId);
                $this->applyShipmentDataScopeFilter($shipmentQuery, $dataScopeConstraints, $vendorId);
                $this->applyApprovedCategoryConstraints($shipmentQuery, $approvedCategories);

                if ($filters['service'] !== '') {
                    $shipmentQuery->where('service_level', $filters['service']);
                }

                if ($filters['category'] === 'domestic') {
                    $this->applyDomesticCategoryConstraint($shipmentQuery);
                }

                if ($filters['category'] === 'international') {
                    $this->applyInternationalCategoryConstraint($shipmentQuery);
                }
            })
            ->orderByDesc('created_at');

        if ($filters['q'] !== '') {
            $raw = strtoupper($filters['q']);
            $normalized = str_starts_with($raw, 'TRK-')
                ? 'CR-' . substr($raw, 4)
                : $raw;

            $query->where(function (Builder $nested) use ($raw, $normalized) {
                $nested->whereRaw('UPPER(gateway_order_id) LIKE ?', ['%' . $raw . '%'])
                    ->orWhereRaw('UPPER(gateway_payment_id) LIKE ?', ['%' . $raw . '%'])
                    ->orWhereRaw('UPPER(tx_reference) LIKE ?', ['%' . $raw . '%'])
                    ->orWhereHas('shipment', function (Builder $shipmentQuery) use ($raw, $normalized) {
                        $shipmentQuery->whereRaw('UPPER(reference) LIKE ?', ['%' . $raw . '%'])
                            ->orWhereRaw('UPPER(reference) LIKE ?', ['%' . $normalized . '%'])
                            ->orWhereHas('sender', function (Builder $senderQuery) use ($raw) {
                                $senderQuery->whereRaw('UPPER(name) LIKE ?', ['%' . $raw . '%']);
                            });
                    });
            });
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['fromDate'] !== '') {
            $query->whereDate('created_at', '>=', $filters['fromDate']);
        }

        if ($filters['toDate'] !== '') {
            $query->whereDate('created_at', '<=', $filters['toDate']);
        }

        $payments = $query->get();

        return Inertia::render('Web/home/vendors/courierService/Payment', [
            'courierPayments' => $this->buildPaymentsPayload($payments, $filters, $approvedCategories),
        ]);
    }

    public function updateBookingLifecycle(Request $request, CourierShipment $shipment)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if ((int) $shipment->assigned_vendor_user_id !== $vendorId) {
            abort(403, 'You are not allowed to modify this booking.');
        }

        $this->assertAdvancedPermission($request, $policy, 'bookings', 'update', $shipment);

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:' . implode(',', array_keys(self::BOOKING_ACTION_META))],
            'codCollectedAmount' => ['nullable', 'numeric', 'min:0.01'],
            'codOverrideReason' => ['nullable', 'string', 'max:500'],
        ]);

        $codOverrideContext = $this->resolveCodOverrideContext(
            $shipment,
            (string) $validated['action'],
            [
                'codCollectedAmount' => $validated['codCollectedAmount'] ?? null,
            ]
        );

        $codOverrideReason = trim((string) ($validated['codOverrideReason'] ?? ''));
        if ($codOverrideReason === '') {
            $codOverrideReason = null;
        }

        $this->assertAdvancedPermission(
            $request,
            $policy,
            'bookings',
            $this->mapBookingLifecycleActionToPermissionAction((string) $validated['action']),
            $shipment
        );

        $cancelGuard = $this->guardCancelActionByPolicy($request, $policy, (string) $validated['action']);
        if (!$cancelGuard['ok']) {
            return back()->with('error', $cancelGuard['message']);
        }

        $approvalGate = $this->ensureSensitiveActionApproval(
            $request,
            $policy,
            (string) $validated['action'],
            [
                'resourceType' => 'courier_shipment',
                'resourceId' => (int) $shipment->id,
                'subject' => (string) $shipment->reference,
                'subjectIds' => [(int) $shipment->id],
                'amount' => (float) ($shipment->estimated_cost ?? 0),
            ]
        );

        if (!$approvalGate['ok']) {
            return back()->with('error', (string) $approvalGate['message']);
        }

        $codOverrideApprovalGate = [
            'ok' => true,
            'approval' => null,
            'message' => null,
        ];
        $codCapability = null;

        if ((bool) ($codOverrideContext['isOverride'] ?? false)) {
            if (!$this->canActorUseCodOverrideActions($request, $vendorId)) {
                $this->logPermissionDenied($request, 'bookings', 'cod_override', [
                    'reason' => 'cod_override_permission_blocked',
                    'shipment_id' => (int) $shipment->id,
                    'override_amount' => (float) ($codOverrideContext['overrideAmount'] ?? 0),
                    'override_action' => (string) $validated['action'],
                ]);

                return back()->with('error', 'You do not have permission to override COD collection outcomes.');
            }

            $codCapability = $this->resolveActiveCodCapabilityForVendor($vendorId, $request);
            if (!$codCapability) {
                return back()->with('error', 'Active COD capability approval is required before recording COD overrides.');
            }

            $codOverrideApprovalGate = $this->ensureSensitiveActionApproval(
                $request,
                $policy,
                '__cod_override__',
                [
                    'resourceType' => 'courier_cod_override',
                    'resourceId' => (int) $shipment->id,
                    'subject' => (string) $shipment->reference,
                    'subjectIds' => [(int) $shipment->id],
                    'amount' => (float) ($codOverrideContext['overrideAmount'] ?? 0),
                    'reason' => $codOverrideReason,
                    'action' => (string) $validated['action'],
                    'requestedAmount' => (float) ($codOverrideContext['requestedAmount'] ?? 0),
                    'collectedAmount' => (float) ($codOverrideContext['collectedAmount'] ?? 0),
                ]
            );

            if (!$codOverrideApprovalGate['ok']) {
                return back()->with('error', (string) $codOverrideApprovalGate['message']);
            }
        }

        $result = ['ok' => false, 'message' => 'Unable to update booking.'];

        try {
            DB::transaction(function () use (&$result, $shipment, $validated, $codOverrideContext, $codCapability, $codOverrideReason, $codOverrideApprovalGate, $request) {
                $result = $this->applyBookingAction($shipment, $validated['action'], [
                    'codCollectedAmount' => $validated['codCollectedAmount'] ?? null,
                ]);

                if (!(bool) ($result['ok'] ?? false)) {
                    return;
                }

                if ((bool) ($codOverrideContext['isOverride'] ?? false) && $codCapability) {
                    $this->recordCodOverrideAuditEvent(
                        $codCapability,
                        $shipment,
                        (string) $validated['action'],
                        $codOverrideContext,
                        (int) optional($request->user())->id,
                        $codOverrideReason,
                        $codOverrideApprovalGate['approval'] ?? null
                    );
                }
            });
        } catch (\Throwable $exception) {
            report($exception);

            return back()->with('error', 'Unable to complete COD override workflow. Please try again.');
        }

        if (!$result['ok']) {
            return back()->with('error', $result['message']);
        }

        $this->markSensitiveActionApprovalExecuted($approvalGate['approval'] ?? null);
        $this->markSensitiveActionApprovalExecuted($codOverrideApprovalGate['approval'] ?? null);

        return back()->with('success', 'Booking updated successfully.');
    }

    public function bulkUpdateBookingLifecycle(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to manage bookings.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'shipmentIds' => ['required', 'array', 'min:1', 'max:200'],
            'shipmentIds.*' => ['required', 'integer'],
            'action' => ['required', 'string', 'in:' . implode(',', array_keys(self::BOOKING_ACTION_META))],
        ]);

        $this->assertAdvancedPermission(
            $request,
            $policy,
            'bookings',
            $this->mapBookingLifecycleActionToPermissionAction((string) $validated['action'])
        );

        $ids = collect($validated['shipmentIds'])->unique()->values();
        $action = $validated['action'];

        if (in_array($action, self::COD_COLLECTION_ACTIONS, true)) {
            return back()->with('error', 'COD collection actions must be recorded per booking.');
        }

        $cancelGuard = $this->guardCancelActionByPolicy($request, $policy, (string) $action);
        if (!$cancelGuard['ok']) {
            return back()->with('error', $cancelGuard['message']);
        }

        $shipments = CourierShipment::query()
            ->where('assigned_vendor_user_id', $vendorId)
            ->whereIn('id', $ids)
            ->with([
                'trackingEvents:id,shipment_id,status,recorded_at',
                'latestPayment',
            ])
            ;

        $this->applyShipmentScopeFilter(
            $shipments,
            $this->resolveScopeForPermission($request, $policy, 'bookings', $this->mapBookingLifecycleActionToPermissionAction((string) $action)),
            $request,
            $vendorId
        );
        $this->applyShipmentDataScopeFilter(
            $shipments,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, 'bookings', $this->mapBookingLifecycleActionToPermissionAction((string) $action)),
            $vendorId
        );

        $shipments = $shipments->get();

        $approvalGate = $this->ensureSensitiveActionApproval(
            $request,
            $policy,
            (string) $action,
            [
                'resourceType' => 'courier_shipment_batch',
                'subject' => 'booking_lifecycle_bulk',
                'subjectIds' => $shipments->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                'amount' => (float) $shipments->max('estimated_cost'),
            ]
        );

        if (!$approvalGate['ok']) {
            return back()->with('error', (string) $approvalGate['message']);
        }

        $successCount = 0;
        $blockedCount = 0;

        foreach ($shipments as $shipment) {
            $result = $this->applyBookingAction($shipment, $action, []);

            if ($result['ok']) {
                $successCount++;
            } else {
                $blockedCount++;
            }
        }

        if ($successCount === 0) {
            return back()->with('error', 'No bookings were updated. Selected action is not allowed for current booking statuses.');
        }

        $this->markSensitiveActionApprovalExecuted($approvalGate['approval'] ?? null);

        $message = $successCount . ' booking(s) updated successfully.';

        if ($blockedCount > 0) {
            $message .= ' ' . $blockedCount . ' booking(s) skipped due to lifecycle rules.';
        }

        return back()->with('success', $message);
    }

    public function clients(Request $request)
    {
        [$filters, $clientsPayload] = $this->buildClientsPayload($request);
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if ($request->query('export') === 'csv') {
            $this->assertAdvancedPermission($request, $policy, 'clients', 'export');

            $approvalGate = $this->ensureSensitiveActionApproval(
                $request,
                $policy,
                '__client_export__',
                [
                    'resourceType' => 'client_list',
                    'subject' => 'client_export',
                    'rowCount' => (int) ($clientsPayload['pagination']['total'] ?? 0),
                ]
            );

            if (!$approvalGate['ok']) {
                return back()->with('error', (string) $approvalGate['message']);
            }

            $response = $this->downloadClientsCsv(collect($clientsPayload['allRows'] ?? []));
            $this->markSensitiveActionApprovalExecuted($approvalGate['approval'] ?? null);

            return $response;
        }

        unset($clientsPayload['allRows']);

        return Inertia::render('Web/home/vendors/courierService/Client', [
            'courierClients' => $clientsPayload,
        ]);
    }

    public function tracking(Request $request)
    {
        [$filters, $shipments, $approvedCategories] = $this->buildFilteredShipments($request, 'reports', 'view');
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $canCodOverride = $this->canActorUseCodOverrideActions($request, $vendorId);
        $canManageBookingLifecycle = $this->isVendorOwnerActor($request)
            || (
                (bool) optional($request->user())->can('courier.bookings.manage_lifecycle')
                && $this->canRolePerformAction($request, $policy, 'bookings', 'update')
            );

        $trackingPayload = $this->buildTrackingPayload(
            $shipments,
            $filters,
            $approvedCategories,
            $canCodOverride,
            $canManageBookingLifecycle
        );

        if ($request->query('export') === 'csv') {
            $this->assertAdvancedPermission($request, $policy, 'reports', 'export');
            return $this->downloadTrackingCsv(collect($trackingPayload['allRows'] ?? []));
        }

        unset($trackingPayload['allRows']);

        return Inertia::render('Web/home/vendors/courierService/Tracking', [
            'courierTracking' => $trackingPayload,
        ]);
    }

    public function calendar(Request $request)
    {
        [$filters, $shipments] = $this->buildFilteredShipments($request, 'reports', 'view');

        return Inertia::render('Web/home/vendors/courierService/Calendar', [
            'courierCalendar' => $this->buildCalendarPayload($shipments, $request, $filters),
        ]);
    }

    public function settings(Request $request, ?string $module = null, ?string $teamTopic = null, ?string $pricingTopic = null, ?string $pricingCategory = null)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $workspaceId = (int) $request->attributes->get('service_workspace_id');

        $allowedModules = [
            'business',
            'operations',
            'sla',
            'tracking',
            'notifications',
            'integrations',
            'services',
            'labels',
            'pricing',
            'team',
        ];

        $selectedModule = in_array((string) $module, $allowedModules, true)
            ? (string) $module
            : 'business';

        $allowedTeamTopics = [
            'policy-controls',
            'user-defaults',
            'api-access',
            'role-studio',
        ];

        $selectedTeamTopic = in_array((string) $teamTopic, $allowedTeamTopics, true)
            ? (string) $teamTopic
            : 'policy-controls';

        $allowedPricingTopics = [
            'currency-formula',
            'policy-modules',
            'contracts',
            'service-catalog',
            'governance',
            'rate-cards',
            'zone-master',
            'lane-matrix',
            'preview',
        ];

        $selectedPricingTopic = in_array((string) $pricingTopic, $allowedPricingTopics, true)
            ? (string) $pricingTopic
            : 'currency-formula';

        $selectedCodCategory = CourierVendorCodCapability::CATEGORY_DOMESTIC;

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to access settings.');
        }

        $record = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );

        $mergedSettings = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record->settings) ? $record->settings : []
        );
        if (is_array($mergedSettings['services'] ?? null)) {
            $mergedSettings['services'] = $this->normalizeCourierServiceSettings($mergedSettings['services']);
        }
        if (is_array($mergedSettings['notifications'] ?? null)) {
            $mergedSettings['notifications'] = $this->normalizeNotificationSettings($mergedSettings['notifications']);
        } else {
            $mergedSettings['notifications'] = $this->normalizeNotificationSettings([]);
        }
        $approvedPricingCategories = $this->resolveApprovedCourierPricingCategories($vendorId);

        $selectedPricingCategory = in_array('domestic', $approvedPricingCategories, true)
            ? 'domestic'
            : (in_array('international', $approvedPricingCategories, true) ? 'international' : 'domestic');

        $requestedPricingCategory = strtolower((string) ($pricingCategory ?? $request->query('category', '')));
        if (
            in_array($requestedPricingCategory, ['domestic', 'international'], true)
            && in_array($requestedPricingCategory, $approvedPricingCategories, true)
        ) {
            $selectedPricingCategory = $requestedPricingCategory;
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspaceId);
        $roleModel = app(CourierRoleModelService::class);
        $roleModel->ensureWorkspaceRoleProfiles($workspaceId, (int) $request->user()->id);
        $workspaceRoles = $roleModel->listWorkspaceRoles($workspaceId);
        $serviceZones = collect(explode(',', (string) ($mergedSettings['business']['serviceZones'] ?? '')))
            ->map(fn ($zone) => trim((string) $zone))
            ->filter()
            ->values();
        $primaryHub = trim((string) ($mergedSettings['business']['primaryHub'] ?? ''));
        $customerScopeOptions = CourierContact::query()
            ->select(['id', 'name', 'company_name'])
            ->whereHas('sentShipments', function (Builder $query) use ($vendorId) {
                $query->where('assigned_vendor_user_id', $vendorId);
            })
            ->orderBy('name')
            ->limit(300)
            ->get()
            ->map(function (CourierContact $contact) {
                return [
                    'id' => (int) $contact->id,
                    'label' => trim((string) (($contact->name ?? '') . (($contact->company_name ?? '') !== '' ? ' (' . $contact->company_name . ')' : ''))),
                ];
            })
            ->values();
        $teamAccessAudit = CourierTeamSecurityAudit::query()
            ->where('vendor_user_id', $vendorId)
            ->where(function (Builder $query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')
                    ->orWhere('service_workspace_id', $workspaceId);
            })
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(function (CourierTeamSecurityAudit $log) {
                return [
                    'id' => (int) $log->id,
                    'action' => (string) $log->event_type,
                    'eventFamily' => (string) ($log->event_family ?? 'other'),
                    'isAlert' => (bool) ($log->is_alert ?? false),
                    'alertCode' => (string) ($log->alert_code ?? ''),
                    'description' => (string) ((is_array($log->metadata) ? ($log->metadata['summary'] ?? '') : '') ?: str_replace('_', ' ', (string) $log->event_type)),
                    'createdAt' => optional($log->created_at)->format('Y-m-d H:i:s'),
                    'metadata' => array_merge(
                        is_array($log->metadata) ? $log->metadata : [],
                        [
                            'before_snapshot' => is_array($log->before_snapshot) ? $log->before_snapshot : [],
                            'after_snapshot' => is_array($log->after_snapshot) ? $log->after_snapshot : [],
                            'snapshot_diff' => is_array($log->snapshot_diff) ? $log->snapshot_diff : [],
                        ]
                    ),
                ];
            })
            ->values();

        $courierCodCapability = $this->buildCodCapabilityPayload(
            $request,
            $vendorId,
            $workspaceId,
            CourierVendorCodCapability::CATEGORY_DOMESTIC
        );

        return Inertia::render('Web/home/vendors/courierService/SettingsPage', [
            'courierSettings' => $mergedSettings,
            'courierCodCapability' => $courierCodCapability,
            'courierCodCapabilities' => [
                CourierVendorCodCapability::CATEGORY_DOMESTIC => $courierCodCapability,
            ],
            'courierCodCapabilityCategory' => $selectedCodCategory,
            'approvedCourierPricingCategories' => $approvedPricingCategories,
            'initialSettingsModule' => $selectedModule,
            'initialTeamAccessTopic' => $selectedTeamTopic,
            'initialPricingTopic' => $selectedPricingTopic,
            'initialPricingCategory' => $selectedPricingCategory,
            'teamPermissionOptions' => Permission::query()
                ->where('name', 'like', 'courier.%')
                ->orderBy('name')
                ->pluck('name')
                ->values(),
            'teamRoleOptions' => $workspaceRoles->pluck('name')->values(),
            'teamRoleCatalog' => $workspaceRoles,
            'teamRoleTemplates' => $roleModel->roleTemplates(),
            'teamCapabilities' => [
                'assignPermissions' => $request->user()->can('courier.team.assign_permissions'),
                'assignRole' => $request->user()->can('courier.team.assign_role'),
            ],
            'permissionModelMeta' => [
                'resources' => self::ADVANCED_PERMISSION_RESOURCES,
                'actions' => self::ADVANCED_PERMISSION_ACTIONS,
                'scopes' => self::ADVANCED_SCOPE_LEVELS,
                'sensitiveFields' => self::SENSITIVE_FIELD_KEYS,
                'environments' => self::ADVANCED_ENVIRONMENTS,
                'ruleEffects' => self::ABAC_RULE_EFFECTS,
                'ruleConditionOptions' => [
                    'shipmentStages' => self::SHIPMENT_STAGE_OPTIONS,
                    'clientTiers' => self::ABAC_CLIENT_TIERS,
                    'slaClasses' => self::ABAC_SLA_CLASSES,
                ],
            ],
            'teamScopeControlOptions' => [
                'availableZones' => $serviceZones,
                'availableHubs' => $primaryHub !== '' ? [$primaryHub] : [],
                'customerAccounts' => $customerScopeOptions,
            ],
            'teamAccessAudit' => $teamAccessAudit,
            'teamSensitiveApprovals' => $this->listTeamSensitiveApprovals($vendorId, $workspaceId),
            'teamTemporaryAccessGrants' => $this->listTeamTemporaryAccessGrants($vendorId, $workspaceId),
            'teamAccessReviewQueue' => app(CourierAccessReviewService::class)->listPendingForWorkspace($vendorId, $workspaceId),
            'teamApiCredentials' => app(CourierApiServiceAccessService::class)->listCredentials($vendorId, $workspaceId),
            'teamApiScopeOptions' => app(CourierApiServiceAccessService::class)->apiScopeCatalog(),
            'teamWebhookScopeOptions' => app(CourierApiServiceAccessService::class)->resolvePolicyForVendor($vendorId)['webhookScopesCatalog'] ?? [],
            'notificationMeta' => [
                'eventTypes' => app(CourierNotificationPreferenceService::class)->eventTypes(),
                'rollout' => [
                    'v2EnabledForVendor' => app(CourierNotificationPreferenceService::class)->isV2EnabledForVendor($vendorId),
                    'mode' => (string) config('courier.notifications_v2.rollout.mode', 'canary'),
                ],
            ],
            'notificationMetrics' => $this->buildNotificationMetrics($vendorId),
        ]);
    }

    public function settingsTeamTopic(Request $request, string $topic)
    {
        if ($topic === 'step-up-runtime') {
            return redirect()->route('courierService.profile.module', ['module' => 'security']);
        }

        return $this->settings($request, 'team', $topic);
    }

    public function settingsPricingTopic(Request $request, string $topic, ?string $category = null)
    {
        return $this->settings($request, 'pricing', null, $topic, $category);
    }

    public function updateSettings(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to update settings.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:save_section,save_all,reset_defaults,pricing_publish_now,pricing_schedule_publish,pricing_approve_publish,pricing_reject_publish,pricing_rollback_version'],
            'section' => ['nullable', 'string', 'in:business,operations,sla,tracking,notifications,integrations,services,labels,pricing,team'],
            'settings' => ['nullable', 'array'],
            'effectiveAt' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:400'],
            'rollbackVersion' => ['nullable', 'integer', 'min:1'],
            'pricingCategory' => ['nullable', 'string', 'in:domestic,international'],
        ]);

        $record = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );

        $current = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record->settings) ? $record->settings : []
        );
        if (is_array($current['services'] ?? null)) {
            $current['services'] = $this->normalizeCourierServiceSettings($current['services']);
        }

        $action = $validated['action'];
        $actorId = (int) optional($request->user())->id ?: null;
        $pricingCategory = (string) ($validated['pricingCategory'] ?? 'domestic');
        $approvedPricingCategories = $this->resolveApprovedCourierPricingCategories($vendorId);
        if (!in_array($pricingCategory, ['domestic', 'international'], true)) {
            $pricingCategory = 'domestic';
        }

        if (in_array($action, ['pricing_publish_now', 'pricing_schedule_publish', 'pricing_approve_publish', 'pricing_reject_publish', 'pricing_rollback_version'], true)) {
            if (!in_array($pricingCategory, $approvedPricingCategories, true)) {
                abort(403, 'This pricing category is not approved for this vendor.');
            }

            $pricing = $this->normalizePricingSettings(is_array($current['pricing'] ?? null) ? $current['pricing'] : []);
            $governanceByCategory = is_array($pricing['governance'] ?? null)
                ? $pricing['governance']
                : $this->defaultPricingGovernance();
            $governance = is_array($governanceByCategory[$pricingCategory] ?? null)
                ? $governanceByCategory[$pricingCategory]
                : ($this->defaultPricingGovernance()[$pricingCategory] ?? []);

            if (
                ($governance['approvalAuthority'] ?? 'vendor') === 'superadmin'
                && in_array($action, ['pricing_approve_publish', 'pricing_reject_publish', 'pricing_rollback_version'], true)
            ) {
                abort(403, 'Pricing approval authority is delegated to SuperAdmin.');
            }

            if ($action === 'pricing_publish_now') {
                $snapshot = $this->extractPricingSnapshot($pricing, $pricingCategory);
                if ((bool) ($governance['requireApproval'] ?? false)) {
                    $governance['pendingApproval'] = [
                        'snapshot' => $snapshot,
                        'requestedAt' => now()->toDateTimeString(),
                        'requestedBy' => $actorId,
                        'note' => (string) ($validated['note'] ?? ''),
                    ];
                    $pricing['governance'][$pricingCategory] = $governance;
                    $pricing = $this->appendPricingGovernanceLog($pricing, 'publish_requested', $actorId, [
                        'note' => (string) ($validated['note'] ?? ''),
                    ], $pricingCategory);
                    $current['pricing'] = $pricing;
                    $record->update(['settings' => $current]);

                    return back()->with('success', ucfirst($pricingCategory) . ' pricing publish request submitted for approval.');
                }

                $pricing = $this->publishPricingSnapshot($pricing, $snapshot, $actorId, 'published_now', $pricingCategory);
                $current['pricing'] = $pricing;
                $record->update(['settings' => $current]);

                return back()->with('success', ucfirst($pricingCategory) . ' pricing published successfully.');
            }

            if ($action === 'pricing_schedule_publish') {
                $effectiveAt = $validated['effectiveAt'] ?? null;
                if (!$effectiveAt) {
                    return back()->with('error', 'Effective date/time is required to schedule pricing publish.');
                }

                $governance['scheduledPublish'] = [
                    'snapshot' => $this->extractPricingSnapshot($pricing, $pricingCategory),
                    'effectiveAt' => Carbon::parse((string) $effectiveAt)->toDateTimeString(),
                    'scheduledBy' => $actorId,
                    'note' => (string) ($validated['note'] ?? ''),
                ];
                $pricing['governance'][$pricingCategory] = $governance;
                $pricing = $this->appendPricingGovernanceLog($pricing, 'publish_scheduled', $actorId, [
                    'effectiveAt' => Carbon::parse((string) $effectiveAt)->toDateTimeString(),
                ], $pricingCategory);
                $current['pricing'] = $pricing;
                $record->update(['settings' => $current]);

                return back()->with('success', ucfirst($pricingCategory) . ' pricing publish scheduled successfully.');
            }

            if ($action === 'pricing_approve_publish') {
                $pending = is_array($governance['pendingApproval'] ?? null) ? $governance['pendingApproval'] : null;
                if (!$pending || !is_array($pending['snapshot'] ?? null)) {
                    return back()->with('error', 'No pending pricing publish request found.');
                }

                if (!$this->canActorApprovePricingGovernance($request, $governance, $pending, 'approve')) {
                    abort(403, 'You are not allowed to approve pricing governance actions.');
                }

                $pricing = $this->publishPricingSnapshot($pricing, $pending['snapshot'], $actorId, 'publish_approved', $pricingCategory);
                $pricing['governance'][$pricingCategory]['pendingApproval'] = null;
                $current['pricing'] = $pricing;
                $record->update(['settings' => $current]);

                return back()->with('success', 'Pending ' . $pricingCategory . ' pricing publish approved and published.');
            }

            if ($action === 'pricing_reject_publish') {
                if (!$this->canActorApprovePricingGovernance($request, $governance)) {
                    abort(403, 'You are not allowed to reject pricing governance actions.');
                }

                $pending = is_array($governance['pendingApproval'] ?? null) ? $governance['pendingApproval'] : null;
                if (!$pending) {
                    return back()->with('error', 'No pending pricing publish request found.');
                }

                $governance['pendingApproval'] = null;
                $pricing['governance'][$pricingCategory] = $governance;
                $pricing = $this->appendPricingGovernanceLog($pricing, 'publish_rejected', $actorId, [
                    'note' => (string) ($validated['note'] ?? ''),
                ], $pricingCategory);
                $current['pricing'] = $pricing;
                $record->update(['settings' => $current]);

                return back()->with('success', 'Pending pricing publish request rejected.');
            }

            if ($action === 'pricing_rollback_version') {
                if (!$this->canActorApprovePricingGovernance($request, $governance)) {
                    abort(403, 'You are not allowed to rollback pricing versions.');
                }

                if (is_array($governance['pendingApproval'] ?? null)) {
                    return back()->with('error', 'Cannot rollback while a pending pricing approval request exists. Resolve it first.');
                }

                $targetVersion = isset($validated['rollbackVersion']) ? (int) $validated['rollbackVersion'] : null;
                $target = $this->resolvePricingRollbackTarget($governance, $targetVersion);
                if (!$target || !is_array($target['snapshot'] ?? null)) {
                    return back()->with('error', 'No eligible published pricing version was found to rollback.');
                }

                $resolvedTargetVersion = (int) ($target['version'] ?? 0);
                $pricing = $this->publishPricingSnapshot(
                    $pricing,
                    $target['snapshot'],
                    $actorId,
                    'publish_rolled_back',
                    $pricingCategory,
                    [
                        'rolledBackFromVersion' => $resolvedTargetVersion,
                        'note' => (string) ($validated['note'] ?? ''),
                    ]
                );
                $current['pricing'] = $pricing;
                $record->update(['settings' => $current]);

                return back()->with('success', 'Rolled back ' . $pricingCategory . ' pricing to published version ' . $resolvedTargetVersion . '.');
            }
        }

        if ($action === 'reset_defaults') {
            $record->update(['settings' => $this->defaultCourierSettings()]);

            return back()->with('success', 'Courier settings reset to defaults.');
        }

        if ($action === 'save_section') {
            $section = (string) ($validated['section'] ?? '');

            if ($section === '' || !isset($current[$section])) {
                return back()->with('error', 'Invalid settings section selected.');
            }

            $incomingSection = $validated['settings'][$section] ?? [];

            if (!is_array($incomingSection)) {
                return back()->with('error', 'Invalid settings payload for the selected section.');
            }

            if ($section === 'team') {
                $incomingSection = $this->normalizeTeamSettings(array_replace_recursive($current['team'] ?? [], $incomingSection));
            }

            if ($section === 'pricing') {
                $incomingSection = $this->normalizePricingSettings(array_replace_recursive($current['pricing'] ?? [], $incomingSection));
                $incomingSection = $this->enforceSuperAdminPricingGovernanceAuthorityLock($incomingSection, $current['pricing'] ?? []);
                $incomingSection = $this->enforceApprovedPricingCategoryWriteScope($incomingSection, $current['pricing'] ?? [], $approvedPricingCategories);
                $incomingSection = $this->appendPricingGovernanceLog($incomingSection, 'draft_saved', $actorId, [
                    'mode' => 'save_section',
                ], $pricingCategory);
            }

            if ($section === 'labels') {
                if (!$this->hasLabelManagePermission($request)) {
                    abort(403, 'You do not have permission to manage label settings.');
                }
                $incomingSection = $this->normalizeLabelSettings(array_replace_recursive($current['labels'] ?? [], $incomingSection));
            }

            if ($section === 'services') {
                $incomingSection = $this->normalizeCourierServiceSettings(array_replace_recursive($current['services'] ?? [], $incomingSection));
            }

            if ($section === 'notifications') {
                $incomingSection = $this->normalizeNotificationSettings(array_replace_recursive($current['notifications'] ?? [], $incomingSection));
            }

            $current[$section] = array_replace($current[$section], $incomingSection);
            $record->update(['settings' => $current]);

            if ($section === 'team') {
                $this->logTeamAccessPolicyChange($request, 'courier_team_permission_model_updated', [
                    'mode' => 'save_section',
                ]);
            }

            return back()->with('success', ucfirst($section) . ' settings saved successfully.');
        }

        $incomingAll = $validated['settings'] ?? [];

        if (!is_array($incomingAll)) {
            return back()->with('error', 'Invalid settings payload.');
        }

        $next = array_replace_recursive($current, $incomingAll);

        if (is_array($next['team'] ?? null)) {
            $next['team'] = $this->normalizeTeamSettings($next['team']);
        }

        if (is_array($next['pricing'] ?? null)) {
            $next['pricing'] = $this->normalizePricingSettings($next['pricing']);
            $next['pricing'] = $this->enforceSuperAdminPricingGovernanceAuthorityLock($next['pricing'], $current['pricing'] ?? []);
            $next['pricing'] = $this->enforceApprovedPricingCategoryWriteScope($next['pricing'], $current['pricing'] ?? [], $approvedPricingCategories);
            $next['pricing'] = $this->appendPricingGovernanceLog($next['pricing'], 'draft_saved', $actorId, [
                'mode' => 'save_all',
            ], $pricingCategory);
        }

        if (is_array($next['labels'] ?? null)) {
            if (!$this->hasLabelManagePermission($request)) {
                abort(403, 'You do not have permission to manage label settings.');
            }
            $next['labels'] = $this->normalizeLabelSettings($next['labels']);
        }

        if (is_array($next['services'] ?? null)) {
            $next['services'] = $this->normalizeCourierServiceSettings($next['services']);
        }

        if (is_array($next['notifications'] ?? null)) {
            $next['notifications'] = $this->normalizeNotificationSettings($next['notifications']);
        }

        $record->update(['settings' => $next]);

        if (array_key_exists('team', $incomingAll)) {
            $this->logTeamAccessPolicyChange($request, 'courier_team_permission_model_updated', [
                'mode' => 'save_all',
            ]);
        }

        return back()->with('success', 'All courier settings saved successfully.');
    }

    public function sendNotificationTestEmail(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to send notification test email.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'to' => ['nullable', 'email:rfc,dns'],
        ]);

        $record = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );
        $current = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record->settings) ? $record->settings : []
        );
        $notifications = $this->normalizeNotificationSettings(is_array($current['notifications'] ?? null) ? $current['notifications'] : []);
        $deliverability = is_array($notifications['deliverability'] ?? null) ? $notifications['deliverability'] : [];

        $to = trim((string) ($validated['to'] ?? optional($request->user())->email));
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'message' => 'A valid recipient email address is required for the test email.',
            ], 422);
        }

        try {
            Mail::mailer((string) config('courier.notifications_v2.transactional_mailer', config('mail.default')))
                ->to($to)
                ->send(new CourierNotificationTestMail($vendorId, [
                    'fromName' => (string) ($deliverability['fromName'] ?? ''),
                    'fromEmail' => (string) ($deliverability['fromEmail'] ?? ''),
                    'replyTo' => (string) ($deliverability['replyTo'] ?? ''),
                ]));
        } catch (\Throwable $exception) {
            $message = mb_substr((string) $exception->getMessage(), 0, 500);
            $normalized = mb_strtolower($message);

            if (str_contains($normalized, 'sender is not allowed to relay')) {
                return response()->json([
                    'message' => 'Email sender is not authorized by your SMTP/provider. Use the configured MAIL_FROM_ADDRESS or verify domain sender settings.',
                    'code' => 'sender_not_authorized',
                ], 422);
            }

            return response()->json([
                'message' => $message !== '' ? $message : 'Failed to send notification test email.',
                'code' => 'notification_test_email_failed',
            ], 422);
        }

        return response()->json([
            'message' => 'Notification test email sent to ' . $to . '.',
        ]);
    }

    public function requestCodCapability(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $workspaceId = (int) $request->attributes->get('service_workspace_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $actor = $request->user();

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to request COD capability.');
        }

        $canRequestCod = (string) (optional($actor)->role ?? '') === 'vendor'
            || (bool) optional($actor)->can('courier.services.cod.request')
            || (bool) optional($actor)->can('courier.settings.update');

        if (!$canRequestCod) {
            abort(403, 'You do not have permission to request COD capability.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', 'string', Rule::in([
                CourierVendorCodCapability::CATEGORY_DOMESTIC,
            ])],
        ]);

        $actorId = (int) optional($request->user())->id ?: null;
        $note = trim((string) ($validated['note'] ?? ''));
        $category = CourierVendorCodCapability::normalizeCategory(
            (string) ($validated['category'] ?? CourierVendorCodCapability::CATEGORY_DOMESTIC)
        );

        $capability = CourierVendorCodCapability::query()->firstOrNew([
            'vendor_user_id' => $vendorId,
            'category' => $category,
        ]);
        $previousStatus = (string) ($capability->status ?: CourierVendorCodCapability::STATUS_NOT_REQUESTED);

        if (!$capability->exists) {
            $capability->service_workspace_id = $workspaceId > 0 ? $workspaceId : null;
        }

        $isApprovedAndActive = (string) $capability->status === CourierVendorCodCapability::STATUS_APPROVED
            && (!$capability->expires_at || $capability->expires_at->isFuture());

        if ($isApprovedAndActive) {
            return response()->json([
                'message' => 'COD capability is already approved for your courier account.',
                'capability' => $this->buildCodCapabilityPayload($request, $vendorId, $workspaceId, $category),
            ]);
        }

        if ((string) $capability->status === CourierVendorCodCapability::STATUS_PENDING) {
            return response()->json([
                'message' => 'COD capability request is already pending superadmin review.',
                'capability' => $this->buildCodCapabilityPayload($request, $vendorId, $workspaceId, $category),
            ]);
        }

        $capability->fill([
            'category' => $category,
            'requested_by_user_id' => $actorId > 0 ? $actorId : null,
            'status' => CourierVendorCodCapability::STATUS_PENDING,
            'requested_at' => now(),
            'requested_note' => $note !== '' ? $note : null,
            'reviewed_at' => null,
            'reviewed_by_user_id' => null,
            'approved_at' => null,
            'expires_at' => null,
            'decision_reason' => null,
        ]);
        $capability->save();

        CourierVendorCodCapabilityAudit::recordEvent(
            $capability,
            'cod_capability_request_submitted',
            $previousStatus,
            CourierVendorCodCapability::STATUS_PENDING,
            $actorId > 0 ? $actorId : null,
            $note !== '' ? $note : null,
            [
                'source' => 'vendor_settings',
                'request_channel' => 'settings_page',
            ]
        );

        return response()->json([
            'message' => 'COD capability request submitted successfully.',
            'capability' => $this->buildCodCapabilityPayload($request, $vendorId, $workspaceId, $category),
        ]);
    }

    public function pricingExchangeRates(Request $request)
    {
        $validated = $request->validate([
            'base' => ['nullable', 'string', 'size:3'],
            'targets' => ['nullable', 'array'],
            'targets.*' => ['string', 'size:3'],
        ]);

        $base = strtoupper((string) ($validated['base'] ?? 'LKR'));
        $targets = collect($validated['targets'] ?? [])->map(fn ($item) => strtoupper((string) $item))->values()->all();

        $payload = app(CourierExchangeRateService::class)->latest($base, $targets);

        if (!($payload['ok'] ?? false)) {
            return response()->json([
                'message' => (string) ($payload['message'] ?? 'Unable to fetch live exchange rates right now.'),
                'code' => 'exchange_rate_unavailable',
            ], 422);
        }

        return response()->json($payload);
    }

    public function pricingImportPreview(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to import pricing.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'pricingCategory' => ['required', 'string', 'in:domestic,international'],
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt,json,pdf', 'max:15360'],
        ]);

        $pricingCategory = (string) ($validated['pricingCategory'] ?? 'domestic');
        $approvedPricingCategories = $this->resolveApprovedCourierPricingCategories($vendorId);
        if (!in_array($pricingCategory, $approvedPricingCategories, true)) {
            abort(403, 'This pricing category is not approved for this vendor.');
        }

        $record = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );

        $current = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record->settings) ? $record->settings : []
        );

        $pricing = $this->normalizePricingSettings(is_array($current['pricing'] ?? null) ? $current['pricing'] : []);
        $serviceCatalog = is_array($pricing['serviceCatalog'][$pricingCategory] ?? null)
            ? $pricing['serviceCatalog'][$pricingCategory]
            : [];

        try {
            $payload = app(CourierPricingImportService::class)->preview(
                $request->file('file'),
                $pricingCategory,
                $serviceCatalog
            );
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Unable to analyze pricing file right now. Please verify the file and try again.',
                'code' => 'pricing_import_preview_failed',
            ], 422);
        }

        $detectedFormat = strtolower((string) ($payload['detectedFormat'] ?? 'unknown'));
        $requiresManualReviewConfirmation = (bool) ($payload['requiresManualReview'] ?? false);
        $recommendedResolutionStrategy = $detectedFormat === 'pdf'
            || count(is_array($payload['conflicts'] ?? null) ? $payload['conflicts'] : []) > 0
            ? 'manual'
            : 'prefer_most_frequent';

        $warnings = is_array($payload['warnings'] ?? null) ? $payload['warnings'] : [];
        if ($detectedFormat === 'pdf') {
            $warnings[] = 'Best accuracy: verify parsed rows, then correct in XLSX/CSV and re-import before final apply.';
        }

        $encodedPatch = json_encode(is_array($payload['patch'] ?? null) ? $payload['patch'] : [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $patchChecksum = hash('sha256', is_string($encodedPatch) ? $encodedPatch : '{}');

        $previewToken = (string) Str::uuid();
        $previewStore = is_array($request->session()->get('courier.pricing_import_previews'))
            ? $request->session()->get('courier.pricing_import_previews')
            : [];

        $previewStore[$previewToken] = [
            'vendorId' => $vendorId,
            'pricingCategory' => $pricingCategory,
            'detectedFormat' => $detectedFormat,
            'requiresManualReviewConfirmation' => $requiresManualReviewConfirmation,
            'patchChecksum' => $patchChecksum,
            'createdAt' => now()->timestamp,
        ];

        if (count($previewStore) > 20) {
            uasort($previewStore, fn ($left, $right) => (int) ($left['createdAt'] ?? 0) <=> (int) ($right['createdAt'] ?? 0));
            $previewStore = array_slice($previewStore, -20, null, true);
        }

        $request->session()->put('courier.pricing_import_previews', $previewStore);

        $payload['warnings'] = array_values(array_unique(array_filter($warnings)));
        $payload['previewToken'] = $previewToken;
        $payload['accuracyPolicy'] = [
            'requiresManualReviewConfirmation' => $requiresManualReviewConfirmation,
            'recommendedResolutionStrategy' => $recommendedResolutionStrategy,
            'recommendedSourceFormat' => $detectedFormat === 'pdf' ? 'xlsx_or_csv' : $detectedFormat,
        ];

        return response()->json($payload);
    }

    public function pricingImportApply(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $actorId = (int) optional($request->user())->id ?: null;

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to import pricing.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'pricingCategory' => ['required', 'string', 'in:domestic,international'],
            'mode' => ['nullable', 'string', Rule::in(['replace', 'merge'])],
            'previewToken' => ['required', 'string', 'max:120'],
            'manualReviewConfirmed' => ['nullable', 'boolean'],
            'resolutionStrategy' => ['nullable', 'string', Rule::in(['prefer_existing', 'prefer_most_frequent', 'manual'])],
            'manualResolutions' => ['nullable', 'array'],
            'manualResolutions.*' => ['nullable', 'string', 'max:120'],
            'importPayload' => ['required', 'array'],
        ]);

        $pricingCategory = (string) ($validated['pricingCategory'] ?? 'domestic');
        $mode = (string) ($validated['mode'] ?? 'replace');
        $previewToken = (string) ($validated['previewToken'] ?? '');
        $manualReviewConfirmed = (bool) ($validated['manualReviewConfirmed'] ?? false);
        $resolutionStrategy = (string) ($validated['resolutionStrategy'] ?? 'prefer_most_frequent');
        $manualResolutions = is_array($validated['manualResolutions'] ?? null) ? $validated['manualResolutions'] : [];
        $approvedPricingCategories = $this->resolveApprovedCourierPricingCategories($vendorId);
        if (!in_array($pricingCategory, $approvedPricingCategories, true)) {
            abort(403, 'This pricing category is not approved for this vendor.');
        }

        $previewStore = is_array($request->session()->get('courier.pricing_import_previews'))
            ? $request->session()->get('courier.pricing_import_previews')
            : [];
        $previewContext = is_array($previewStore[$previewToken] ?? null) ? $previewStore[$previewToken] : null;

        if (!$previewContext) {
            return response()->json([
                'message' => 'Import preview has expired. Analyze the file again before applying.',
                'code' => 'pricing_import_preview_expired',
            ], 422);
        }

        if (
            (int) ($previewContext['vendorId'] ?? 0) !== $vendorId
            || (string) ($previewContext['pricingCategory'] ?? '') !== $pricingCategory
        ) {
            return response()->json([
                'message' => 'Import preview does not match this vendor/category. Analyze the file again before applying.',
                'code' => 'pricing_import_preview_mismatch',
            ], 422);
        }

        $previewCreatedAt = (int) ($previewContext['createdAt'] ?? 0);
        if ($previewCreatedAt <= 0 || (now()->timestamp - $previewCreatedAt) > 3600) {
            unset($previewStore[$previewToken]);
            $request->session()->put('courier.pricing_import_previews', $previewStore);

            return response()->json([
                'message' => 'Import preview has expired. Analyze the file again before applying.',
                'code' => 'pricing_import_preview_expired',
            ], 422);
        }

        $previewDetectedFormat = strtolower((string) ($previewContext['detectedFormat'] ?? 'unknown'));
        $requiresManualReviewConfirmation = (bool) ($previewContext['requiresManualReviewConfirmation'] ?? false);

        $record = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );

        $current = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record->settings) ? $record->settings : []
        );

        $pricing = $this->normalizePricingSettings(is_array($current['pricing'] ?? null) ? $current['pricing'] : []);
        $serviceCatalog = is_array($pricing['serviceCatalog'][$pricingCategory] ?? null)
            ? $pricing['serviceCatalog'][$pricingCategory]
            : [];

        $patch = app(CourierPricingImportService::class)->sanitizePatch(
            is_array($validated['importPayload'] ?? null) ? $validated['importPayload'] : [],
            $pricingCategory,
            $serviceCatalog
        );

        $encodedPatch = json_encode($patch, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $patchChecksum = hash('sha256', is_string($encodedPatch) ? $encodedPatch : '{}');
        if (!hash_equals((string) ($previewContext['patchChecksum'] ?? ''), $patchChecksum)) {
            return response()->json([
                'message' => 'Import payload changed since preview. Analyze the file again before applying.',
                'code' => 'pricing_import_preview_mismatch',
            ], 422);
        }

        if ($requiresManualReviewConfirmation && !$manualReviewConfirmed) {
            return response()->json([
                'message' => 'Manual review confirmation is required before applying this import.',
                'code' => 'pricing_import_manual_review_confirmation_required',
            ], 422);
        }

        $incomingZoneRows = is_array($patch['zoneMaster'] ?? null) ? $patch['zoneMaster'] : [];
        $incomingCategoryRows = is_array($patch['categories'] ?? null) ? $patch['categories'] : [];
        $incomingLaneRows = is_array($patch['laneMatrix']['rows'] ?? null) ? $patch['laneMatrix']['rows'] : [];
        $incomingLaneEnabled = (bool) ($patch['laneMatrix']['enabled'] ?? count($incomingLaneRows) > 0);
        $incomingCityZoneMapRows = is_array($patch['cityZoneMap'] ?? null) ? $patch['cityZoneMap'] : [];
        $pdfHasConflicts = collect($incomingCityZoneMapRows)->contains(function ($row) {
            $item = is_array($row) ? $row : [];
            $zoneVotes = is_array($item['zones'] ?? null) ? $item['zones'] : [];

            return (bool) ($item['isConflict'] ?? false) || count($zoneVotes) > 1;
        });

        if ($previewDetectedFormat === 'pdf' && $pdfHasConflicts && $resolutionStrategy !== 'manual') {
            return response()->json([
                'message' => 'PDF import conflicts require Manual City Mapping for best accuracy.',
                'code' => 'pricing_import_pdf_manual_strategy_required',
            ], 422);
        }

        $existingCityZoneMapRows = is_array($pricing['cityZoneMap'][$pricingCategory] ?? null)
            ? $pricing['cityZoneMap'][$pricingCategory]
            : [];

        $resolvedCityZoneMap = $this->resolveImportedCityZoneMapConflicts(
            $incomingCityZoneMapRows,
            $existingCityZoneMapRows,
            $resolutionStrategy,
            $manualResolutions
        );

        if ($resolutionStrategy === 'manual' && count($resolvedCityZoneMap['missingManual'] ?? []) > 0) {
            return response()->json([
                'message' => 'Manual conflict resolution is incomplete. Select a zone for each conflicting city and retry.',
                'code' => 'pricing_import_manual_resolution_required',
                'missingCities' => $resolvedCityZoneMap['missingManual'],
            ], 422);
        }

        $incomingCityZoneMapRows = is_array($resolvedCityZoneMap['rows'] ?? null)
            ? $resolvedCityZoneMap['rows']
            : [];
        $incomingLaneRows = $this->applyCityZoneResolutionToLaneRows($incomingLaneRows, $incomingCityZoneMapRows);

        $currentZoneLabelMap = collect(is_array($pricing['zoneMaster'][$pricingCategory] ?? null) ? $pricing['zoneMaster'][$pricingCategory] : [])
            ->mapWithKeys(function ($row) {
                $zoneKey = $this->normalizeZoneKey((string) ($row['key'] ?? ''));
                if ($zoneKey === '*' || $zoneKey === '') {
                    return [];
                }

                return [$zoneKey => trim((string) ($row['label'] ?? $zoneKey)) ?: $zoneKey];
            })
            ->all();

        $derivedZoneRows = collect($incomingCityZoneMapRows)
            ->map(function ($row) use ($currentZoneLabelMap) {
                $item = is_array($row) ? $row : [];
                $zoneKey = $this->normalizeZoneKey((string) ($item['zone'] ?? ''));
                if ($zoneKey === '*' || $zoneKey === '') {
                    return null;
                }

                return [
                    'key' => $zoneKey,
                    'label' => $currentZoneLabelMap[$zoneKey] ?? ucwords(str_replace('_', ' ', $zoneKey)),
                    'isActive' => true,
                ];
            })
            ->filter(fn ($row) => is_array($row))
            ->values()
            ->all();

        $incomingZoneRows = $this->mergePricingImportZoneRows($incomingZoneRows, $derivedZoneRows);

        if (!is_array($pricing['laneMatrix']['enabled'] ?? null)) {
            $pricing['laneMatrix']['enabled'] = [
                'domestic' => (bool) ($pricing['laneMatrix']['enabled'] ?? false),
                'international' => (bool) ($pricing['laneMatrix']['enabled'] ?? false),
            ];
        }

        if ($mode === 'merge') {
            $pricing['zoneMaster'][$pricingCategory] = $this->mergePricingImportZoneRows(
                is_array($pricing['zoneMaster'][$pricingCategory] ?? null) ? $pricing['zoneMaster'][$pricingCategory] : [],
                $incomingZoneRows
            );

            $pricing['categories'][$pricingCategory] = $this->mergePricingImportCategoryRows(
                is_array($pricing['categories'][$pricingCategory] ?? null) ? $pricing['categories'][$pricingCategory] : [],
                $incomingCategoryRows
            );

            $pricing['laneMatrix'][$pricingCategory] = $this->mergePricingImportLaneRows(
                is_array($pricing['laneMatrix'][$pricingCategory] ?? null) ? $pricing['laneMatrix'][$pricingCategory] : [],
                $incomingLaneRows
            );

            $pricing['cityZoneMap'][$pricingCategory] = $this->mergePricingImportCityZoneMapRows(
                is_array($pricing['cityZoneMap'][$pricingCategory] ?? null) ? $pricing['cityZoneMap'][$pricingCategory] : [],
                $incomingCityZoneMapRows
            );

            $pricing['laneMatrix']['enabled'][$pricingCategory] =
                (bool) ($pricing['laneMatrix']['enabled'][$pricingCategory] ?? false)
                || $incomingLaneEnabled
                || count($incomingLaneRows) > 0;
        } else {
            $pricing['zoneMaster'][$pricingCategory] = $incomingZoneRows;
            $pricing['categories'][$pricingCategory] = $incomingCategoryRows;
            $pricing['laneMatrix'][$pricingCategory] = $incomingLaneRows;
            $pricing['cityZoneMap'][$pricingCategory] = $incomingCityZoneMapRows;
            $pricing['laneMatrix']['enabled'][$pricingCategory] = $incomingLaneEnabled;
        }

        $pricing = $this->normalizePricingSettings($pricing);
        $pricing = $this->enforceApprovedPricingCategoryWriteScope(
            $pricing,
            is_array($current['pricing'] ?? null) ? $current['pricing'] : [],
            $approvedPricingCategories
        );
        $pricing = $this->appendPricingGovernanceLog($pricing, 'draft_saved', $actorId, [
            'mode' => 'pricing_import_' . $mode,
            'detectedFormat' => $previewDetectedFormat,
            'manualReviewConfirmed' => $manualReviewConfirmed,
            'resolutionStrategy' => $resolutionStrategy,
            'resolvedConflictCount' => (int) ($resolvedCityZoneMap['resolvedConflictCount'] ?? 0),
            'zoneCount' => count($incomingZoneRows),
            'categoryCount' => count($incomingCategoryRows),
            'laneCount' => count($incomingLaneRows),
        ], $pricingCategory);

        $current['pricing'] = $pricing;
        $record->update(['settings' => $current]);

        unset($previewStore[$previewToken]);
        $request->session()->put('courier.pricing_import_previews', $previewStore);

        return response()->json([
            'message' => 'Imported pricing was applied to your draft settings.',
            'pricing' => $pricing,
            'summary' => [
                'zoneCount' => count($incomingZoneRows),
                'categoryCount' => count($incomingCategoryRows),
                'laneCount' => count($incomingLaneRows),
                'mode' => $mode,
                'detectedFormat' => $previewDetectedFormat,
                'manualReviewConfirmed' => $manualReviewConfirmed,
                'resolutionStrategy' => $resolutionStrategy,
                'resolvedConflictCount' => (int) ($resolvedCityZoneMap['resolvedConflictCount'] ?? 0),
            ],
        ]);
    }

    public function profile(Request $request, ?string $module = null)
    {
        $actorUserId = (int) optional($request->user())->id;

        if (!$this->hasApprovedCourierRegistration($actorUserId) && !$this->isActiveCourierTeamMember($actorUserId)) {
            abort(403, 'Courier service registration approval is required to access profile.');
        }

        $allowedModules = ['company', 'owner', 'security', 'compliance', 'services', 'activity'];
        $moduleFromQuery = (string) $request->query('tab', '');
        $selectedModule = in_array((string) $module, $allowedModules, true)
            ? (string) $module
            : (in_array($moduleFromQuery, $allowedModules, true) ? $moduleFromQuery : 'company');

        return Inertia::render('Web/home/vendors/courierService/Profile', [
            'courierProfile' => $this->buildCourierProfilePayload($request, $actorUserId),
            'initialProfileModule' => $selectedModule,
            'profileSecurityStatus' => [
                'trustedDevices' => app(CourierSessionSecurityService::class)->trustedDevicesForActor(
                    (int) $request->attributes->get('vendor_user_id'),
                    (int) $request->attributes->get('service_workspace_id'),
                    $actorUserId
                ),
                'stepUpVerifiedAt' => $this->formatCourierProfileDateTime($request->session()->get('courier_security.step_up_verified_at', '')),
                'twoFactorVerifiedAt' => $this->formatCourierProfileDateTime($request->session()->get('courier_security.two_factor_verified_at', '')),
                'anomalyDetectedAt' => $this->formatCourierProfileDateTime($request->session()->get('courier_security.anomaly_detected_at', '')),
            ],
        ]);
    }

    public function updateProfile(Request $request)
    {
        $actor = $request->user();
        $vendorId = (int) optional($actor)->id;

        $membership = VendorUserMembership::query()
            ->where('user_id', $vendorId)
            ->where('status', 'active')
            ->first();

        $isTeamUser = $membership && (int) $membership->vendor_user_id !== $vendorId;

        if (!$this->hasApprovedCourierRegistration($vendorId) && !$this->isActiveCourierTeamMember($vendorId)) {
            abort(403, 'Courier service registration approval is required to update profile.');
        }

        $section = trim((string) $request->input('section', 'company'));

        if (!in_array($section, ['company', 'compliance', 'services', 'activity'], true)) {
            return back()->with('error', 'Invalid profile section.');
        }

        if ($section !== 'company') {
            return back()->with('error', 'This profile section is currently read-only.');
        }

        $contactEmailRules = ['nullable', 'email', 'max:180'];

        if ($isTeamUser && $actor) {
            $contactEmailRules[] = Rule::unique('users', 'email')->ignore((int) $actor->id);
        }

        $validated = $request->validate([
            'section' => ['nullable', 'string'],
            'companyName' => ['required', 'string', 'max:180'],
            'displayName' => ['nullable', 'string', 'max:180'],
            'ownerName' => ['nullable', 'string', 'max:180'],
            'ownerAddress' => ['nullable', 'string', 'max:255'],
            'businessRegistrationNo' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9\-\/\s]+$/'],
            'taxId' => ['nullable', 'string', 'max:120', 'regex:/^[A-Za-z0-9\-\/\s]+$/'],
            'contactPerson' => ['nullable', 'string', 'max:180'],
            'contactEmail' => $contactEmailRules,
            'contactPhone' => ['nullable', 'string', 'max:50', 'regex:/^[0-9\+\-\s\(\)]{7,25}$/'],
            'supportEmail' => ['nullable', 'email', 'max:180'],
            'supportHotline' => ['nullable', 'string', 'max:50', 'regex:/^[0-9\+\-\s\(\)]{7,25}$/'],
            'website' => ['nullable', 'url', 'max:255'],
            'addressLine1' => ['nullable', 'string', 'max:255'],
            'addressLine2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'postalCode' => ['nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9\-\s]{3,12}$/'],
            'country' => ['nullable', 'string', 'max:120'],
            'publicAbout' => ['nullable', 'string', 'max:2000'],
            'publicSupportHours' => ['nullable', 'string', 'max:120'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:3072'],
        ]);

        $profile = VendorProfile::query()->firstOrCreate(
            ['user_id' => $vendorId],
            [
                'company_name' => (string) ($validated['companyName'] ?? ''),
                'business_type' => 'company',
                'address_line1' => (string) ($validated['addressLine1'] ?? ''),
                'city' => (string) ($validated['city'] ?? ''),
                'postal_code' => (string) ($validated['postalCode'] ?? ''),
                'country' => (string) ($validated['country'] ?? ''),
                'contact_person' => (string) ($validated['contactPerson'] ?? ''),
                'contact_phone' => (string) ($validated['contactPhone'] ?? ''),
                'contact_email' => (string) ($validated['contactEmail'] ?? ''),
                'submission_status' => 'draft',
            ]
        );

        $profile->update([
            'company_name' => (string) ($validated['companyName'] ?? ''),
            'business_registration_no' => (string) ($validated['businessRegistrationNo'] ?? ''),
            'tax_id' => (string) ($validated['taxId'] ?? ''),
            'website' => (string) ($validated['website'] ?? ''),
            'description' => (string) ($validated['publicAbout'] ?? ''),
            'address_line1' => (string) ($validated['addressLine1'] ?? ''),
            'address_line2' => (string) ($validated['addressLine2'] ?? ''),
            'city' => (string) ($validated['city'] ?? ''),
            'state' => (string) ($validated['state'] ?? ''),
            'postal_code' => (string) ($validated['postalCode'] ?? ''),
            'country' => (string) ($validated['country'] ?? ''),
            'contact_person' => (string) ($validated['contactPerson'] ?? ''),
            'contact_phone' => (string) ($validated['contactPhone'] ?? ''),
            'contact_email' => (string) ($validated['contactEmail'] ?? ''),
        ]);

        if ($isTeamUser && $actor) {
            $actor->update([
                'name' => (string) ($validated['displayName'] ?: $validated['companyName']),
                'email' => (string) ($validated['contactEmail'] ?: $actor->email),
                'phone' => (string) ($validated['contactPhone'] ?: $actor->phone),
            ]);
        } elseif ($actor) {
            $actor->update([
                'name' => (string) ($validated['ownerName'] ?: $validated['displayName'] ?: $validated['companyName'] ?: $actor->name),
                'address' => (string) ($validated['ownerAddress'] ?? $actor->address),
            ]);
        }

        if ($request->hasFile('logo')) {
            if (!empty($profile->logo)) {
                Storage::disk('public')->delete($profile->logo);
            }

            $logoPath = $request->file('logo')->store('uploads/vendors/' . $vendorId . '/logo', 'public');
            $profile->update(['logo' => $logoPath]);

            if ($isTeamUser && $actor) {
                if (!empty($actor->image)) {
                    Storage::disk('public')->delete($actor->image);
                }

                $actor->update(['image' => $logoPath]);
            }
        }

        $setting = VendorCourierSetting::query()->firstOrCreate(
            ['vendor_user_id' => $vendorId],
            ['settings' => $this->defaultCourierSettings()]
        );

        $currentSettings = is_array($setting->settings) ? $setting->settings : $this->defaultCourierSettings();
        $profileExtras = $currentSettings['profile'] ?? [];
        $profileExtras = array_replace($profileExtras, [
            'displayName' => (string) ($validated['displayName'] ?? ''),
            'supportEmail' => (string) ($validated['supportEmail'] ?? ''),
            'supportHotline' => (string) ($validated['supportHotline'] ?? ''),
            'publicSupportHours' => (string) ($validated['publicSupportHours'] ?? ''),
        ]);
        $currentSettings['profile'] = $profileExtras;
        $setting->update(['settings' => $currentSettings]);

        VendorActivityLog::create([
            'vendor_id' => $vendorId,
            'action' => 'courier_profile_updated',
            'target_type' => 'vendor_profile',
            'target_id' => $profile->id,
            'description' => 'Courier vendor profile updated from dashboard profile module.',
            'metadata' => [
                'company_name' => (string) ($validated['companyName'] ?? ''),
                'section' => $section,
            ],
        ]);

        return back()->with('success', ucfirst($section) . ' profile section updated successfully.');
    }

    public function updateOwnerProfile(Request $request)
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401, 'Authentication required.');
        }

        $actorId = (int) $actor->id;

        if (!$this->hasApprovedCourierRegistration($actorId) && !$this->isActiveCourierTeamMember($actorId)) {
            abort(403, 'Courier service registration approval is required to update profile.');
        }

        $membership = VendorUserMembership::query()
            ->where('user_id', $actorId)
            ->where('status', 'active')
            ->first();

        if ($membership && (int) $membership->vendor_user_id !== $actorId) {
            abort(403, 'Only courier account owner can update owner profile info.');
        }

        $validated = $request->validate([
            'ownerName' => ['nullable', 'string', 'max:180', 'required_without:ownerImage'],
            'ownerAddress' => ['nullable', 'string', 'max:255'],
            'ownerCountry' => ['nullable', 'string', 'max:120'],
            'ownerEmail' => ['nullable', 'email', 'max:180', Rule::unique('users', 'email')->ignore($actorId), 'required_without:ownerImage'],
            'ownerPhone' => ['nullable', 'string', 'max:50'],
            'ownerImage' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:3072'],
        ]);

        $actor->update([
            'name' => array_key_exists('ownerName', $validated)
                ? (string) ($validated['ownerName'] ?? '')
                : (string) $actor->name,
            'address' => array_key_exists('ownerAddress', $validated)
                ? (string) ($validated['ownerAddress'] ?? '')
                : (string) ($actor->address ?? ''),
            'country' => array_key_exists('ownerCountry', $validated)
                ? (string) ($validated['ownerCountry'] ?? '')
                : (string) ($actor->country ?? ''),
            'email' => array_key_exists('ownerEmail', $validated)
                ? (string) ($validated['ownerEmail'] ?? '')
                : (string) $actor->email,
            'phone' => array_key_exists('ownerPhone', $validated)
                ? (string) ($validated['ownerPhone'] ?? '')
                : (string) ($actor->phone ?? ''),
        ]);

        if ($request->hasFile('ownerImage')) {
            if (!empty($actor->image)) {
                Storage::disk('public')->delete($actor->image);
            }

            $ownerImagePath = $request->file('ownerImage')->store('uploads/vendors/' . $actorId . '/profile', 'public');
            $actor->update(['image' => $ownerImagePath]);
        }

        VendorActivityLog::create([
            'vendor_id' => $actorId,
            'action' => 'courier_owner_profile_updated',
            'target_type' => 'user',
            'target_id' => $actorId,
            'description' => 'Courier owner profile info updated from profile page.',
            'metadata' => [
                'owner_name' => (string) ($validated['ownerName'] ?? $actor->name),
            ],
        ]);

        return back()->with('success', 'Owner profile info updated successfully.');
    }

    public function removeOwnerProfileImage(Request $request)
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401, 'Authentication required.');
        }

        $actorId = (int) $actor->id;

        if (!$this->hasApprovedCourierRegistration($actorId) && !$this->isActiveCourierTeamMember($actorId)) {
            abort(403, 'Courier service registration approval is required to update profile.');
        }

        $membership = VendorUserMembership::query()
            ->where('user_id', $actorId)
            ->where('status', 'active')
            ->first();

        if ($membership && (int) $membership->vendor_user_id !== $actorId) {
            abort(403, 'Only courier account owner can remove owner profile photo.');
        }

        if (!empty($actor->image)) {
            Storage::disk('public')->delete($actor->image);
            $actor->update(['image' => null]);
        }

        VendorActivityLog::create([
            'vendor_id' => $actorId,
            'action' => 'courier_owner_profile_image_removed',
            'target_type' => 'user',
            'target_id' => $actorId,
            'description' => 'Courier owner profile image removed from profile page.',
            'metadata' => [],
        ]);

        return back()->with('success', 'Owner profile picture removed successfully.');
    }

    public function removeProfileLogo(Request $request)
    {
        $vendorId = (int) optional($request->user())->id;

        if (!$this->hasApprovedCourierRegistration($vendorId) && !$this->isActiveCourierTeamMember($vendorId)) {
            abort(403, 'Courier service registration approval is required to update profile.');
        }

        $profile = VendorProfile::query()->where('user_id', $vendorId)->first();

        if (!$profile) {
            return back()->with('error', 'Profile not found.');
        }

        if (!empty($profile->logo)) {
            Storage::disk('public')->delete($profile->logo);
            $profile->update(['logo' => null]);
        }

        VendorActivityLog::create([
            'vendor_id' => $vendorId,
            'action' => 'courier_profile_logo_removed',
            'target_type' => 'vendor_profile',
            'target_id' => $profile->id,
            'description' => 'Courier vendor profile logo removed.',
        ]);

        return back()->with('success', 'Profile logo removed successfully.');
    }

    public function updateClientProfile(Request $request, CourierContact $contact)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to manage clients.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $belongsToVendor = CourierShipment::query()
            ->where('assigned_vendor_user_id', $vendorId)
            ->where('sender_contact_id', $contact->id)
            ;

        $this->applyShipmentScopeFilter(
            $belongsToVendor,
            $this->resolveScopeForPermission($request, $policy, 'clients', 'update'),
            $request,
            $vendorId
        );
        $this->applyShipmentDataScopeFilter(
            $belongsToVendor,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, 'clients', 'update'),
            $vendorId
        );

        $belongsToVendor = $belongsToVendor->exists();

        if (!$belongsToVendor) {
            abort(403, 'You are not allowed to modify this client profile.');
        }

        $this->assertAdvancedPermission($request, $policy, 'clients', 'update');

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:toggle_watchlist,set_priority,set_owner,add_note,set_tier'],
            'priorityTag' => ['nullable', 'string', 'in:vip,standard,watchlist'],
            'accountOwner' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:1200'],
            'clientTier' => ['nullable', 'string', 'in:enterprise,sme,individual'],
        ]);

        $profile = VendorCourierClientProfile::firstOrCreate([
            'vendor_user_id' => $vendorId,
            'contact_id' => $contact->id,
        ]);

        $action = $validated['action'];

        $clientContext = [
            'clientTier' => (string) ($validated['clientTier'] ?? $profile->client_tier ?? ''),
        ];

        $this->assertAdvancedPermission(
            $request,
            $policy,
            'clients',
            $this->mapClientActionToPermissionAction($action),
            null,
            $clientContext
        );

        if ($action === 'set_owner' && !$this->canActorReassignOwner($request, $policy)) {
            return back()->with('error', 'Reassigning client ownership is disabled by Team Access Control policy.');
        }

        if ($action === 'toggle_watchlist') {
            $profile->watchlist = !$profile->watchlist;
        }

        if ($action === 'set_priority') {
            $profile->priority_tag = $validated['priorityTag'] ?? 'standard';
        }

        if ($action === 'set_owner') {
            $profile->account_owner = $validated['accountOwner'] ?? null;
        }

        if ($action === 'set_tier') {
            $profile->client_tier = $validated['clientTier'] ?? null;
        }

        if ($action === 'add_note' && !empty($validated['note'])) {
            $existing = trim((string) $profile->internal_notes);
            $newLine = '[' . now()->format('Y-m-d H:i') . '] ' . trim((string) $validated['note']);
            $profile->internal_notes = $existing === '' ? $newLine : ($existing . "\n" . $newLine);
        }

        $profile->save();

        return back()->with('success', 'Client profile updated successfully.');
    }

    public function shipments(Request $request)
    {
        [$filters, $shipments, $approvedCategories] = $this->buildFilteredShipments($request, 'shipments', 'view');
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $canCodOverride = $this->canActorUseCodOverrideActions($request, $vendorId);
        $canManageBookingLifecycle = $this->isVendorOwnerActor($request)
            || (
                (bool) optional($request->user())->can('courier.bookings.manage_lifecycle')
                && $this->canRolePerformAction($request, $policy, 'bookings', 'update')
            );

        return Inertia::render('Web/home/vendors/courierService/Unit', [
            'courierShipments' => $this->buildShipmentsPayload(
                $shipments,
                $filters,
                $approvedCategories,
                $canCodOverride,
                $canManageBookingLifecycle
            ),
        ]);
    }

    public function updateShipmentStage(Request $request, CourierShipment $shipment)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if ((int) $shipment->assigned_vendor_user_id !== $vendorId) {
            abort(403, 'You are not allowed to modify this shipment.');
        }

        $this->assertAdvancedPermission($request, $policy, 'shipments', 'update', $shipment);

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:' . implode(',', array_keys(self::ACTION_META))],
        ]);

        $this->assertAdvancedPermission(
            $request,
            $policy,
            'shipments',
            $this->mapShipmentActionToPermissionAction((string) $validated['action']),
            $shipment
        );

        $cancelGuard = $this->guardCancelActionByPolicy($request, $policy, (string) $validated['action']);
        if (!$cancelGuard['ok']) {
            return back()->with('error', $cancelGuard['message']);
        }

        $action = $validated['action'];
        $result = $this->applyShipmentAction($shipment, $action);

        if (!$result['ok']) {
            return back()->with('error', $result['message']);
        }

        return back()->with('success', 'Shipment updated successfully.');
    }

    /**
     * Approve or reject a shipment that requires vendor review before the
     * customer can proceed to payment (currently: shipment_type "other").
     * This is a review gate, not a lifecycle stage transition, so it is kept
     * separate from ACTION_META / applyShipmentAction rather than folded
     * into the stage machine.
     */
    public function updateVendorApproval(Request $request, CourierShipment $shipment)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');

        if ((int) $shipment->assigned_vendor_user_id !== $vendorId) {
            abort(403, 'You are not allowed to review this shipment.');
        }

        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $this->assertAdvancedPermission($request, $policy, 'shipments', 'update', $shipment);
        $this->assertStaffSecurityPolicy($request, $policy);

        if ($shipment->vendor_approval_status !== CourierShipment::VENDOR_APPROVAL_PENDING) {
            return back()->with('error', 'This shipment is not awaiting approval.');
        }

        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:approved,rejected'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $decision = $validated['decision'];

        $trackingEvent = DB::transaction(function () use ($shipment, $decision, $validated, $request) {
            $shipment->update([
                'vendor_approval_status' => $decision,
                'vendor_approval_decided_at' => now(),
                'vendor_approval_decided_by_user_id' => optional($request->user())->id,
                'vendor_approval_notes' => $validated['notes'] ?? null,
            ]);

            return $shipment->trackingEvents()->create([
                'status' => $decision === 'approved' ? 'vendor_approved' : 'vendor_rejected',
                'description' => $decision === 'approved'
                    ? 'Vendor approved this shipment type for processing.'
                    : 'Vendor rejected this shipment' . (!empty($validated['notes']) ? ': ' . $validated['notes'] : '.'),
                'recorded_at' => now(),
            ]);
        });

        // Previously silent — a rejected/approved customer got no email at all
        // and had to notice a missing "Pay" button to figure out what happened.
        $emailDispatch = app(CourierCustomerEmailDispatchService::class);
        if ($decision === 'approved') {
            $emailDispatch->queueVendorApproved($shipment, $trackingEvent);
        } else {
            $emailDispatch->queueVendorRejected($shipment, $trackingEvent);
        }

        return back()->with('success', $decision === 'approved'
            ? 'Shipment approved. The customer can now proceed to payment.'
            : 'Shipment rejected.');
    }

    public function bulkUpdateShipmentStage(Request $request)
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to manage shipments.');
        }

        $this->assertStaffSecurityPolicy($request, $policy);

        $validated = $request->validate([
            'shipmentIds' => ['required', 'array', 'min:1', 'max:200'],
            'shipmentIds.*' => ['required', 'integer'],
            'action' => ['required', 'string', 'in:' . implode(',', array_keys(self::ACTION_META))],
        ]);

        $this->assertAdvancedPermission(
            $request,
            $policy,
            'shipments',
            $this->mapShipmentActionToPermissionAction((string) $validated['action'])
        );

        $cancelGuard = $this->guardCancelActionByPolicy($request, $policy, (string) $validated['action']);
        if (!$cancelGuard['ok']) {
            return back()->with('error', $cancelGuard['message']);
        }

        $action = $validated['action'];
        $ids = collect($validated['shipmentIds'])->unique()->values();

        $shipments = CourierShipment::query()
            ->where('assigned_vendor_user_id', $vendorId)
            ->whereIn('id', $ids)
            ->with('trackingEvents:id,shipment_id,status,recorded_at')
            ;

        $this->applyShipmentScopeFilter(
            $shipments,
            $this->resolveScopeForPermission($request, $policy, 'shipments', $this->mapShipmentActionToPermissionAction((string) $action)),
            $request,
            $vendorId
        );
        $this->applyShipmentDataScopeFilter(
            $shipments,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, 'shipments', $this->mapShipmentActionToPermissionAction((string) $action)),
            $vendorId
        );

        $shipments = $shipments->get();

        $successCount = 0;
        $blockedCount = 0;

        foreach ($shipments as $shipment) {
            $result = $this->applyShipmentAction($shipment, $action);

            if ($result['ok']) {
                $successCount++;
            } else {
                $blockedCount++;
            }
        }

        if ($successCount === 0) {
            return back()->with('error', 'No shipments were updated. Selected action is not allowed for current stages.');
        }

        $message = $successCount . ' shipment(s) updated successfully.';

        if ($blockedCount > 0) {
            $message .= ' ' . $blockedCount . ' shipment(s) skipped due to stage rules.';
        }

        return back()->with('success', $message);
    }

    private function buildFilteredShipments(Request $request, string $resource = 'shipments', string $action = 'view'): array
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $approvedCategories = $this->resolveApprovedCourierPricingCategories($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to access this dashboard.');
        }

        $this->assertAdvancedPermission($request, $policy, $resource, $action);

        $filters = [
            'q' => trim((string) $request->query('q', '')),
            'status' => trim((string) $request->query('status', '')),
            'service' => trim((string) $request->query('service', '')),
            'category' => $this->sanitizeApprovedCategoryFilter(
                trim((string) $request->query('category', '')),
                $approvedCategories
            ),
            'urgentType' => trim((string) $request->query('urgentType', '')),
            'bookingStatus' => trim((string) $request->query('bookingStatus', '')),
            'paymentStatus' => trim((string) $request->query('paymentStatus', '')),
            'sla' => trim((string) $request->query('sla', '')),
            'exceptionOnly' => trim((string) $request->query('exceptionOnly', '')),
            'unscannedHours' => max(0, (int) $request->query('unscannedHours', 0)),
            'groupBy' => trim((string) $request->query('groupBy', '')),
            'fromDate' => trim((string) $request->query('fromDate', '')),
            'toDate' => trim((string) $request->query('toDate', '')),
            'bookingRange' => trim((string) $request->query('bookingRange', 'this_year')),
            'earningRange' => trim((string) $request->query('earningRange', 'last_12_months')),
            'statusRange' => trim((string) $request->query('statusRange', 'this_week')),
            'stage' => trim((string) $request->query('stage', '')),
            'perPage' => max(5, (int) $request->query('perPage', 10)),
            'page' => max(1, (int) $request->query('page', 1)),
        ];

        $query = CourierShipment::query()
            ->with([
                'sender:id,name',
                'recipient:id,name',
                'senderAddress:id,country,city,state',
                'recipientAddress:id,country,city,state',
                'packages:id,shipment_id,service_tier_label,service_tier_key,service_eta,courier_provider_name',
                'latestPayment',
                'trackingEvents:id,shipment_id,status,location,description,recorded_at',
                'labels:id,shipment_id',
            ])
            ->where('assigned_vendor_user_id', $vendorId)
            ->orderByDesc('created_at');

        $scope = $this->resolveScopeForPermission($request, $policy, $resource, $action);
        $this->applyShipmentScopeFilter($query, $scope, $request, $vendorId);
        $this->applyShipmentDataScopeFilter(
            $query,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, $resource, $action),
            $vendorId
        );
        $this->applyApprovedCategoryConstraints($query, $approvedCategories);

        $this->applyFilters($query, $filters);

        $shipments = $query->get();

        if ($filters['stage'] !== '' && in_array($filters['stage'], self::SHIPMENT_STAGE_OPTIONS, true)) {
            $shipments = $shipments
                ->filter(fn (CourierShipment $shipment) => $this->getShipmentStage($shipment) === $filters['stage'])
                ->values();
        }

        return [$filters, $shipments, $approvedCategories];
    }

    private function buildShipmentsPayload(
        Collection $shipments,
        array $filters,
        array $approvedCategories,
        bool $canCodOverride = false,
        bool $canManageBookingLifecycle = false
    ): array
    {
        $rows = $shipments->map(function (CourierShipment $shipment) use ($canCodOverride, $canManageBookingLifecycle) {
            $latestEvent = $this->getLatestTrackingEvent($shipment);
            $stage = $this->getShipmentStage($shipment);
            $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
            $deliveredAt = $this->getDeliveredAt($shipment);
            $timelineState = $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt);
            $assignmentHealth = $this->resolveAssignmentHealth($shipment);
            $codAllowedActions = $assignmentHealth === 'assigned'
                ? $this->getAllowedCodCollectionActionsForShipment($shipment, $canCodOverride, $canManageBookingLifecycle)
                : [];

            return [
                'id' => $shipment->id,
                'bookingNumber' => $shipment->reference,
                'trackingNumber' => $this->trackingNumber($shipment),
                'category' => $this->resolveCategory($shipment),
                'service' => $this->normalizeServiceLabel($shipment->service_level),
                'currency' => (string) ($shipment->currency_code ?? 'LKR'),
                'status' => $shipment->status,
                'statusLabel' => $this->statusLabel($shipment->status),
                'stage' => $stage,
                'stageLabel' => $this->stageLabel($stage),
                'sender' => $shipment->sender?->name,
                'recipient' => $shipment->recipient?->name,
                'origin' => trim(implode(', ', array_filter([
                    optional($shipment->senderAddress)->city,
                    optional($shipment->senderAddress)->country,
                ]))),
                'destination' => trim(implode(', ', array_filter([
                    optional($shipment->recipientAddress)->city,
                    optional($shipment->recipientAddress)->country,
                ]))),
                'pickupWindow' => $this->formatPickupWindow($shipment),
                'estimatedDelivery' => optional($estimatedDelivery)->format('Y-m-d H:i'),
                'lastScan' => optional(optional($latestEvent)->recorded_at)->format('Y-m-d H:i'),
                'lastScanStatus' => optional($latestEvent)->status,
                'assignedAt' => optional($shipment->assigned_at)->format('Y-m-d H:i'),
                'exception' => $this->hasException($shipment),
                'slaStatus' => $this->resolveSlaStatus($shipment, $estimatedDelivery, $timelineState),
                'assignmentHealth' => $assignmentHealth,
                'allowedActions' => $assignmentHealth === 'assigned'
                    ? $this->getAllowedActionsForStage($stage)
                    : [],
                'canManageBookingLifecycle' => $canManageBookingLifecycle,
                'canCodOverride' => $canCodOverride,
                'codEnabled' => (bool) ($shipment->is_cod_enabled ?? false),
                'codRequestedAmount' => $shipment->cod_requested_amount !== null
                    ? (float) $shipment->cod_requested_amount
                    : null,
                'codCollectionStatus' => $shipment->cod_collection_status,
                'codCollectedAmount' => $shipment->cod_collected_amount !== null
                    ? (float) $shipment->cod_collected_amount
                    : null,
                'codCollectionRecordedAt' => optional($shipment->cod_collection_recorded_at)->format('Y-m-d H:i'),
                'codAllowedActions' => $codAllowedActions,
                'shipmentType' => $shipment->shipment_type,
                'shipmentTypeDescription' => $shipment->shipment_type_description,
                'vendorApprovalStatus' => $shipment->vendor_approval_status,
                'vendorApprovalNotes' => $shipment->vendor_approval_notes,
                'details' => [
                    'deliveryNotes' => $shipment->delivery_notes,
                    'internalNotes' => $shipment->internal_notes,
                    'packageCount' => $shipment->packages->count(),
                    'totalWeight' => (float) $shipment->packages->sum('weight_kg'),
                ],
            ];
        })->values();

        $summary = [
            'totalAssigned' => $rows->count(),
            'newAssignments' => $rows->where('stage', 'new_assignments')->count(),
            'readyForPickup' => $rows->where('stage', 'ready_for_pickup')->count(),
            'inTransit' => $rows->whereIn('stage', ['picked_up', 'in_transit', 'out_for_delivery'])->count(),
            'exception' => $rows->where('stage', 'exception')->count(),
            'deliveredToday' => $rows->filter(function ($row) {
                if (!$row['lastScan'] || $row['stage'] !== 'delivered') {
                    return false;
                }

                return Carbon::parse($row['lastScan'])->isToday();
            })->count(),
        ];

        $perPage = max(5, min(50, (int) ($filters['perPage'] ?? 10)));
        $total = $rows->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min((int) $filters['page'], $totalPages);
        $pagedRows = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        return [
            'summary' => $summary,
            'rows' => $pagedRows,
            'filters' => array_merge($filters, ['page' => $page, 'perPage' => $perPage]),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'stages' => collect(self::SHIPMENT_STAGE_OPTIONS)
                    ->map(fn ($stage) => ['value' => $stage, 'label' => $this->stageLabel($stage)])
                    ->values(),
                'statuses' => $shipments
                    ->pluck('status')
                    ->filter()
                    ->unique()
                    ->map(fn ($status) => [
                        'value' => $status,
                        'label' => $this->statusLabel($status),
                    ])
                    ->values(),
                'services' => $shipments
                    ->pluck('service_level')
                    ->filter()
                    ->unique()
                    ->sort()
                    ->values(),
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'perPageOptions' => [10, 20, 50],
            ],
        ];
    }

    private function buildTrackingPayload(
        Collection $shipments,
        array $filters,
        array $approvedCategories,
        bool $canCodOverride = false,
        bool $canManageBookingLifecycle = false
    ): array
    {
        $rows = $shipments->map(function (CourierShipment $shipment) use ($canCodOverride, $canManageBookingLifecycle) {
            $latestEvent = $this->getLatestTrackingEvent($shipment);
            $stage = $this->getShipmentStage($shipment);
            $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
            $deliveredAt = $this->getDeliveredAt($shipment);
            $timelineState = $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt);
            $assignmentHealth = $this->resolveAssignmentHealth($shipment);
            $codAllowedActions = $assignmentHealth === 'assigned'
                ? $this->getAllowedCodCollectionActionsForShipment($shipment, $canCodOverride, $canManageBookingLifecycle)
                : [];

            $timeline = $shipment->trackingEvents
                ->sortByDesc(fn ($event) => optional($event->recorded_at)?->timestamp ?? 0)
                ->map(function ($event) {
                    return [
                        'status' => (string) $event->status,
                        'statusLabel' => ucwords(str_replace('_', ' ', (string) $event->status)),
                        'location' => (string) ($event->location ?? ''),
                        'description' => (string) ($event->description ?? ''),
                        'recordedAt' => optional($event->recorded_at)->format('Y-m-d H:i'),
                    ];
                })
                ->values();

            return [
                'id' => $shipment->id,
                'bookingNumber' => $shipment->reference,
                'trackingNumber' => $this->trackingNumber($shipment),
                'service' => $this->normalizeServiceLabel($shipment->service_level),
                'provider' => (string) optional($shipment->packages->first())->courier_provider_name,
                'category' => $this->resolveCategory($shipment),
                'currency' => (string) ($shipment->currency_code ?? 'LKR'),
                'status' => $shipment->status,
                'statusLabel' => $this->statusLabel($shipment->status),
                'stage' => $stage,
                'stageLabel' => $this->stageLabel($stage),
                'origin' => trim(implode(', ', array_filter([
                    optional($shipment->senderAddress)->city,
                    optional($shipment->senderAddress)->country,
                ]))),
                'destination' => trim(implode(', ', array_filter([
                    optional($shipment->recipientAddress)->city,
                    optional($shipment->recipientAddress)->country,
                ]))),
                'currentLocation' => (string) (optional($latestEvent)->location ?: '-'),
                'lastScanAt' => optional(optional($latestEvent)->recorded_at)->format('Y-m-d H:i'),
                'lastScanTimestamp' => optional(optional($latestEvent)->recorded_at)->timestamp,
                'lastScanStatus' => (string) (optional($latestEvent)->status ?? ''),
                'eta' => optional($estimatedDelivery)->format('Y-m-d H:i'),
                'slaStatus' => $this->resolveSlaStatus($shipment, $estimatedDelivery, $timelineState),
                'exception' => $this->hasException($shipment),
                'assignmentHealth' => $assignmentHealth,
                'allowedActions' => $assignmentHealth === 'assigned'
                    ? $this->getAllowedActionsForStage($stage)
                    : [],
                'canManageBookingLifecycle' => $canManageBookingLifecycle,
                'canCodOverride' => $canCodOverride,
                'codEnabled' => (bool) ($shipment->is_cod_enabled ?? false),
                'codRequestedAmount' => $shipment->cod_requested_amount !== null
                    ? (float) $shipment->cod_requested_amount
                    : null,
                'codCollectionStatus' => $shipment->cod_collection_status,
                'codCollectedAmount' => $shipment->cod_collected_amount !== null
                    ? (float) $shipment->cod_collected_amount
                    : null,
                'codCollectionRecordedAt' => optional($shipment->cod_collection_recorded_at)->format('Y-m-d H:i'),
                'codAllowedActions' => $codAllowedActions,
                'timeline' => $timeline,
            ];
        })->values();

        $summary = [
            'inTransitNow' => $rows->whereIn('stage', ['picked_up', 'in_transit'])->count(),
            'outForDeliveryNow' => $rows->where('stage', 'out_for_delivery')->count(),
            'delayedNow' => $rows->where('slaStatus', 'delayed')->count(),
            'exceptionNow' => $rows->where('exception', true)->count(),
            'unscanned6h' => $rows->filter(function ($row) {
                if (empty($row['lastScanAt'])) {
                    return true;
                }

                return Carbon::parse($row['lastScanAt'])->lt(now()->subHours(6));
            })->count(),
            'deliveredToday' => $rows->filter(function ($row) {
                return $row['stage'] === 'delivered'
                    && !empty($row['lastScanAt'])
                    && Carbon::parse($row['lastScanAt'])->isToday();
            })->count(),
        ];

        $slaFilter = trim((string) ($filters['sla'] ?? ''));
        $exceptionOnly = trim((string) ($filters['exceptionOnly'] ?? ''));
        $unscannedHours = max(0, (int) ($filters['unscannedHours'] ?? 0));

        if ($slaFilter !== '') {
            $rows = $rows->where('slaStatus', $slaFilter)->values();
        }

        if ($exceptionOnly === '1') {
            $rows = $rows->where('exception', true)->values();
        }

        if ($unscannedHours > 0) {
            $threshold = now()->subHours($unscannedHours)->timestamp;
            $rows = $rows->filter(function ($row) use ($threshold) {
                return empty($row['lastScanTimestamp']) || ((int) $row['lastScanTimestamp'] < $threshold);
            })->values();
        }

        $providerStats = $rows
            ->groupBy(fn ($row) => $row['provider'] !== '' ? $row['provider'] : 'Unspecified')
            ->map(function (Collection $group, string $provider) {
                return [
                    'provider' => $provider,
                    'total' => $group->count(),
                    'inTransit' => $group->whereIn('stage', ['picked_up', 'in_transit', 'out_for_delivery'])->count(),
                    'delayed' => $group->where('slaStatus', 'delayed')->count(),
                    'exceptions' => $group->where('exception', true)->count(),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $filteredRows = $rows->values();

        $perPage = max(5, min(50, (int) ($filters['perPage'] ?? 10)));
        $total = $filteredRows->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($filters['page'] ?? 1), $totalPages);
        $pagedRows = $filteredRows->slice(($page - 1) * $perPage, $perPage)->values();

        return [
            'summary' => $summary,
            'providerStats' => $providerStats,
            'allRows' => $filteredRows,
            'rows' => $pagedRows,
            'filters' => [
                'q' => (string) ($filters['q'] ?? ''),
                'category' => (string) ($filters['category'] ?? ''),
                'service' => (string) ($filters['service'] ?? ''),
                'status' => (string) ($filters['status'] ?? ''),
                'stage' => (string) ($filters['stage'] ?? ''),
                'sla' => $slaFilter,
                'exceptionOnly' => $exceptionOnly,
                'unscannedHours' => $unscannedHours,
                'groupBy' => (string) ($filters['groupBy'] ?? ''),
                'fromDate' => (string) ($filters['fromDate'] ?? ''),
                'toDate' => (string) ($filters['toDate'] ?? ''),
                'perPage' => $perPage,
                'page' => $page,
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'stages' => collect(self::SHIPMENT_STAGE_OPTIONS)
                    ->map(fn ($stage) => ['value' => $stage, 'label' => $this->stageLabel($stage)])
                    ->values(),
                'statuses' => $shipments
                    ->pluck('status')
                    ->filter()
                    ->unique()
                    ->map(fn ($status) => ['value' => $status, 'label' => $this->statusLabel($status)])
                    ->values(),
                'services' => $shipments->pluck('service_level')->filter()->unique()->sort()->values(),
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'slaStatuses' => [
                    ['value' => 'on_track', 'label' => 'On Track'],
                    ['value' => 'at_risk', 'label' => 'At Risk'],
                    ['value' => 'delayed', 'label' => 'Delayed'],
                    ['value' => 'on_time', 'label' => 'On Time'],
                    ['value' => 'early', 'label' => 'Early'],
                    ['value' => 'unknown', 'label' => 'Unknown'],
                ],
                'unscannedHourOptions' => [0, 6, 12, 24],
                'groupByOptions' => [
                    ['value' => '', 'label' => 'None'],
                    ['value' => 'provider', 'label' => 'Provider'],
                ],
                'perPageOptions' => [10, 20, 50],
            ],
        ];
    }

    private function buildBookingsPayload(Collection $shipments, array $filters, bool $canViewRates, bool $canCodOverride, array $approvedCategories): array
    {
        $rows = $shipments->map(function (CourierShipment $shipment) use ($canCodOverride) {
            $bookingStatus = $this->resolveBookingStatus($shipment);
            $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
            $confirmHours = $this->resolveBookingConfirmHours($shipment);

            return [
                'id' => $shipment->id,
                'bookingNumber' => $shipment->reference,
                'createdAt' => optional($shipment->created_at)->format('Y-m-d H:i'),
                'client' => $shipment->sender?->name,
                'clientCompany' => $shipment->sender?->company_name,
                'trackingNumber' => $this->trackingNumber($shipment),
                'category' => $this->resolveCategory($shipment),
                'service' => $this->normalizeServiceLabel($shipment->service_level),
                'route' => trim(implode(' to ', array_filter([
                    trim(implode(', ', array_filter([
                        optional($shipment->senderAddress)->city,
                        optional($shipment->senderAddress)->country,
                    ]))),
                    trim(implode(', ', array_filter([
                        optional($shipment->recipientAddress)->city,
                        optional($shipment->recipientAddress)->country,
                    ]))),
                ]))),
                'quoteAmount' => (float) ($shipment->estimated_cost ?? 0),
                'currency' => (string) ($shipment->currency_code ?? 'LKR'),
                'paymentStatus' => $this->derivePaymentStatus($shipment),
                'bookingStatus' => $bookingStatus,
                'bookingStatusLabel' => $this->bookingStatusLabel($bookingStatus),
                'pickupWindow' => $this->formatPickupWindow($shipment),
                'eta' => optional($estimatedDelivery)->format('Y-m-d H:i'),
                'allowedActions' => $this->getAllowedBookingActionsForShipment($shipment, $bookingStatus, $canCodOverride),
                'codEnabled' => (bool) ($shipment->is_cod_enabled ?? false),
                'canCodOverride' => $canCodOverride,
                'codRequestedAmount' => $shipment->cod_requested_amount !== null
                    ? (float) $shipment->cod_requested_amount
                    : null,
                'codCollectionStatus' => $shipment->cod_collection_status,
                'codCollectedAmount' => $shipment->cod_collected_amount !== null
                    ? (float) $shipment->cod_collected_amount
                    : null,
                'codCollectionRecordedAt' => optional($shipment->cod_collection_recorded_at)->format('Y-m-d H:i'),
                'confirmHours' => $confirmHours,
            ];
        })->values();

        if (!$canViewRates) {
            $rows = $rows->map(function (array $row) {
                $row['quoteAmount'] = null;
                return $row;
            })->values();
        }

        $summary = [
            'newRequestsToday' => $rows->filter(fn ($row) => $row['bookingStatus'] === 'new_request' && str_starts_with((string) $row['createdAt'], now()->format('Y-m-d')))->count(),
            'awaitingConfirmation' => $rows->where('bookingStatus', 'awaiting_client_confirmation')->count(),
            'confirmedToday' => $rows->filter(fn ($row) => $row['bookingStatus'] === 'confirmed' && str_starts_with((string) $row['createdAt'], now()->format('Y-m-d')))->count(),
            'cancellationsToday' => $rows->filter(fn ($row) => in_array($row['bookingStatus'], ['cancelled', 'rejected', 'expired'], true) && str_starts_with((string) $row['createdAt'], now()->format('Y-m-d')))->count(),
            'conversionRate' => $rows->count() > 0
                ? round(($rows->where('bookingStatus', 'confirmed')->count() / $rows->count()) * 100, 1)
                : 0,
            'avgConfirmationHours' => $rows->filter(fn ($row) => $row['confirmHours'] !== null)->count() > 0
                ? round($rows->filter(fn ($row) => $row['confirmHours'] !== null)->avg('confirmHours'), 1)
                : 0,
        ];

        $statusCounts = collect(self::BOOKING_STATUS_OPTIONS)
            ->map(fn ($status) => [
                'value' => $status,
                'label' => $this->bookingStatusLabel($status),
                'count' => $rows->where('bookingStatus', $status)->count(),
            ])
            ->values();

        $statusFilter = trim((string) ($filters['bookingStatus'] ?? ''));
        $paymentFilter = trim((string) ($filters['paymentStatus'] ?? ''));

        if ($statusFilter !== '' && in_array($statusFilter, self::BOOKING_STATUS_OPTIONS, true)) {
            $rows = $rows->where('bookingStatus', $statusFilter)->values();
        }

        if ($paymentFilter !== '') {
            $rows = $rows->where('paymentStatus', $paymentFilter)->values();
        }

        $perPage = max(5, min(50, (int) ($filters['perPage'] ?? 10)));
        $total = $rows->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($filters['page'] ?? 1), $totalPages);
        $pagedRows = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        return [
            'summary' => $summary,
            'statusCounts' => $statusCounts,
            'rows' => $pagedRows,
            'filters' => [
                'q' => (string) ($filters['q'] ?? ''),
                'category' => (string) ($filters['category'] ?? ''),
                'service' => (string) ($filters['service'] ?? ''),
                'bookingStatus' => $statusFilter,
                'paymentStatus' => $paymentFilter,
                'fromDate' => (string) ($filters['fromDate'] ?? ''),
                'toDate' => (string) ($filters['toDate'] ?? ''),
                'perPage' => $perPage,
                'page' => $page,
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'bookingStatuses' => collect(self::BOOKING_STATUS_OPTIONS)
                    ->map(fn ($status) => ['value' => $status, 'label' => $this->bookingStatusLabel($status)])
                    ->values(),
                'paymentStatuses' => [
                    ['value' => 'paid', 'label' => 'Paid'],
                    ['value' => 'pending', 'label' => 'Pending'],
                    ['value' => 'failed', 'label' => 'Failed'],
                ],
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'services' => $shipments->pluck('service_level')->filter()->unique()->sort()->values(),
                'perPageOptions' => [10, 20, 50],
                'actionOptions' => collect(array_keys(self::BOOKING_ACTION_META))
                    ->reject(fn ($action) => in_array((string) $action, self::COD_COLLECTION_ACTIONS, true))
                    ->map(fn ($action) => [
                        'value' => (string) $action,
                        'label' => Str::title(str_replace('_', ' ', (string) $action)),
                    ])
                    ->values(),
            ],
        ];
    }

    private function buildPaymentsPayload(Collection $payments, array $filters, array $approvedCategories): array
    {
        $rows = $payments
            ->map(function (CourierShipmentPayment $payment) {
                $shipment = $payment->shipment;
                if (!$shipment instanceof CourierShipment) {
                    return null;
                }

                $packageCount = (int) $shipment->packages->sum('quantity');
                if ($packageCount <= 0) {
                    $packageCount = $shipment->packages->count();
                }

                $effectiveUpdatedAt = $payment->paid_at
                    ?: $payment->failed_at
                    ?: $payment->last_notified_at
                    ?: $payment->updated_at
                    ?: $payment->created_at;

                $status = strtolower((string) ($payment->status ?? CourierShipmentPayment::STATUS_PENDING));
                $cardRequired = (bool) $shipment->requiresCardPayment();
                $resolvedPaymentStatus = strtolower($shipment->resolvedPaymentStatus());

                return [
                    'id' => (int) $payment->id,
                    'paymentNumber' => 'CP-' . str_pad((string) $payment->id, 6, '0', STR_PAD_LEFT),
                    'shipmentId' => (int) $shipment->id,
                    'shipmentReference' => (string) $shipment->reference,
                    'trackingNumber' => $this->trackingNumber($shipment),
                    'client' => (string) ($shipment->sender?->name ?? '-'),
                    'clientCompany' => (string) ($shipment->sender?->company_name ?? ''),
                    'route' => trim(implode(' to ', array_filter([
                        trim(implode(', ', array_filter([
                            optional($shipment->senderAddress)->city,
                            optional($shipment->senderAddress)->country,
                        ]))),
                        trim(implode(', ', array_filter([
                            optional($shipment->recipientAddress)->city,
                            optional($shipment->recipientAddress)->country,
                        ]))),
                    ]))),
                    'category' => $this->resolveCategory($shipment),
                    'service' => $this->normalizeServiceLabel((string) $shipment->service_level),
                    'packageCount' => $packageCount,
                    'amount' => (float) $payment->amount,
                    'currency' => strtoupper((string) ($payment->currency_code ?: ($shipment->currency_code ?? 'LKR'))),
                    'status' => $status,
                    'statusLabel' => Str::title(str_replace('_', ' ', $status)),
                    'gatewayOrderId' => (string) ($payment->gateway_order_id ?? ''),
                    'gatewayPaymentId' => (string) ($payment->gateway_payment_id ?? ''),
                    'txReference' => (string) ($payment->tx_reference ?? ''),
                    'gatewayStatus' => (string) ($payment->gateway_status ?? ''),
                    'failureReason' => (string) ($payment->failure_reason ?? ''),
                    'initiatedAt' => optional($payment->initiated_at)->format('Y-m-d H:i'),
                    'createdAt' => optional($payment->created_at)->format('Y-m-d H:i'),
                    'updatedAt' => optional($effectiveUpdatedAt)->format('Y-m-d H:i'),
                    'paidAt' => optional($payment->paid_at)->format('Y-m-d H:i'),
                    'failedAt' => optional($payment->failed_at)->format('Y-m-d H:i'),
                    'shipmentStatus' => (string) ($shipment->status ?? CourierShipment::STATUS_PENDING),
                    'resolvedPaymentStatus' => $resolvedPaymentStatus,
                    'cardRequired' => $cardRequired,
                    'lifecycleBlocked' => $cardRequired && $resolvedPaymentStatus !== CourierShipmentPayment::STATUS_PAID,
                ];
            })
            ->filter()
            ->values();

        $summary = [
            'totalTransactions' => $rows->count(),
            'paidTransactions' => $rows->where('status', CourierShipmentPayment::STATUS_PAID)->count(),
            'pendingTransactions' => $rows->where('status', CourierShipmentPayment::STATUS_PENDING)->count(),
            'failedTransactions' => $rows->filter(fn ($row) => in_array($row['status'], [
                CourierShipmentPayment::STATUS_FAILED,
                CourierShipmentPayment::STATUS_CANCELLED,
                CourierShipmentPayment::STATUS_EXPIRED,
            ], true))->count(),
            'collectedAmount' => round((float) $rows->where('status', CourierShipmentPayment::STATUS_PAID)->sum('amount'), 2),
            'pendingAmount' => round((float) $rows->where('status', CourierShipmentPayment::STATUS_PENDING)->sum('amount'), 2),
        ];

        $perPage = max(5, min(50, (int) ($filters['perPage'] ?? 10)));
        $total = $rows->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min((int) ($filters['page'] ?? 1), $totalPages);
        $pagedRows = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        $summaryCurrency = (string) ($rows->pluck('currency')->filter()->countBy()->sortDesc()->keys()->first() ?? 'LKR');

        return [
            'summary' => $summary,
            'summaryCurrency' => $summaryCurrency,
            'rows' => $pagedRows,
            'filters' => [
                'q' => (string) ($filters['q'] ?? ''),
                'status' => (string) ($filters['status'] ?? ''),
                'category' => (string) ($filters['category'] ?? ''),
                'service' => (string) ($filters['service'] ?? ''),
                'fromDate' => (string) ($filters['fromDate'] ?? ''),
                'toDate' => (string) ($filters['toDate'] ?? ''),
                'perPage' => $perPage,
                'page' => $page,
            ],
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'statuses' => [
                    ['value' => CourierShipmentPayment::STATUS_PAID, 'label' => 'Paid'],
                    ['value' => CourierShipmentPayment::STATUS_PENDING, 'label' => 'Pending'],
                    ['value' => CourierShipmentPayment::STATUS_FAILED, 'label' => 'Failed'],
                    ['value' => CourierShipmentPayment::STATUS_CANCELLED, 'label' => 'Cancelled'],
                    ['value' => CourierShipmentPayment::STATUS_EXPIRED, 'label' => 'Expired'],
                ],
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'services' => $payments
                    ->map(fn (CourierShipmentPayment $payment) => $payment->shipment?->service_level)
                    ->filter()
                    ->unique()
                    ->sort()
                    ->values(),
                'perPageOptions' => [10, 20, 50],
            ],
        ];
    }

    private function buildCalendarPayload(Collection $shipments, Request $request, array $filters): array
    {
        $monthParam = trim((string) $request->query('month', now()->format('Y-m')));
        try {
            $monthDate = preg_match('/^\d{4}-\d{2}$/', $monthParam)
                ? Carbon::createFromFormat('Y-m', $monthParam)
                : null;
        } catch (\Throwable) {
            $monthDate = null;
        }

        if (!$monthDate) {
            $monthDate = now();
        }

        $monthStart = $monthDate->copy()->startOfMonth();
        $monthEnd = $monthDate->copy()->endOfMonth();

        $eventType = trim((string) $request->query('eventType', 'all'));
        if (!in_array($eventType, ['all', 'pickup', 'delivery', 'exception'], true)) {
            $eventType = 'all';
        }

        $events = $shipments->flatMap(function (CourierShipment $shipment) {
            $stage = $this->getShipmentStage($shipment);
            $status = (string) ($shipment->status ?? 'pending');
            $trackingNumber = $this->trackingNumber($shipment);
            $service = $this->normalizeServiceLabel($shipment->service_level);
            $clientName = (string) ($shipment->sender?->name ?? '-');
            $bookingNumber = (string) $shipment->reference;
            $destination = trim(implode(', ', array_filter([
                optional($shipment->recipientAddress)->city,
                optional($shipment->recipientAddress)->country,
            ])));

            $pickupDate = $shipment->pickup_date ? Carbon::parse($shipment->pickup_date) : null;
            $pickupTime = $shipment->pickup_window_start
                ? Carbon::parse($shipment->pickup_window_start)->format('H:i')
                : '09:00';

            $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
            $deliveredAt = $this->getDeliveredAt($shipment);
            $deliveryDate = $deliveredAt ?: $estimatedDelivery;

            $base = [
                'shipmentId' => $shipment->id,
                'bookingNumber' => $bookingNumber,
                'trackingNumber' => $trackingNumber,
                'service' => $service,
                'client' => $clientName,
                'stage' => $stage,
                'status' => $status,
                'destination' => $destination,
            ];

            $eventRows = collect();

            if ($pickupDate) {
                $eventRows->push(array_merge($base, [
                    'id' => 'pickup-' . $shipment->id,
                    'type' => 'pickup',
                    'title' => 'Pickup • ' . $trackingNumber,
                    'subtitle' => $clientName,
                    'date' => $pickupDate->format('Y-m-d'),
                    'time' => $pickupTime,
                    'priority' => in_array($stage, ['new_assignments', 'ready_for_pickup'], true) ? 'high' : 'normal',
                    'tone' => 'pickup',
                ]));
            }

            if ($deliveryDate) {
                $eventRows->push(array_merge($base, [
                    'id' => 'delivery-' . $shipment->id,
                    'type' => 'delivery',
                    'title' => ($deliveredAt ? 'Delivered' : 'ETA') . ' • ' . $trackingNumber,
                    'subtitle' => $destination !== '' ? $destination : $clientName,
                    'date' => $deliveryDate->format('Y-m-d'),
                    'time' => $deliveryDate->format('H:i'),
                    'priority' => $this->hasException($shipment) ? 'high' : 'normal',
                    'tone' => $deliveredAt ? 'delivered' : 'eta',
                ]));
            }

            if ($this->hasException($shipment)) {
                $latest = $this->getLatestTrackingEvent($shipment);
                $exceptionDate = optional($latest?->recorded_at)
                    ? Carbon::parse($latest->recorded_at)
                    : ($pickupDate ?: now());

                $eventRows->push(array_merge($base, [
                    'id' => 'exception-' . $shipment->id,
                    'type' => 'exception',
                    'title' => 'Exception • ' . $trackingNumber,
                    'subtitle' => $this->statusLabel($status),
                    'date' => $exceptionDate->format('Y-m-d'),
                    'time' => $exceptionDate->format('H:i'),
                    'priority' => 'high',
                    'tone' => 'exception',
                ]));
            }

            return $eventRows;
        })->values();

        $q = trim((string) ($filters['q'] ?? ''));

        $events = $events
            ->filter(function (array $event) use ($monthStart, $monthEnd) {
                try {
                    $eventDate = Carbon::createFromFormat('Y-m-d', (string) $event['date']);
                } catch (\Throwable) {
                    return false;
                }

                return $eventDate->betweenIncluded($monthStart, $monthEnd);
            })
            ->values();

        if ($eventType !== 'all') {
            $events = $events->where('type', $eventType)->values();
        }

        if ($q !== '') {
            $qUpper = strtoupper($q);
            $events = $events->filter(function (array $event) use ($qUpper) {
                $searchBlob = strtoupper(implode(' ', [
                    (string) ($event['title'] ?? ''),
                    (string) ($event['subtitle'] ?? ''),
                    (string) ($event['trackingNumber'] ?? ''),
                    (string) ($event['bookingNumber'] ?? ''),
                    (string) ($event['client'] ?? ''),
                    (string) ($event['service'] ?? ''),
                ]));

                return str_contains($searchBlob, $qUpper);
            })->values();
        }

        $dayBuckets = $events
            ->groupBy('date')
            ->map(function (Collection $dayEvents) {
                return [
                    'total' => $dayEvents->count(),
                    'pickup' => $dayEvents->where('type', 'pickup')->count(),
                    'delivery' => $dayEvents->where('type', 'delivery')->count(),
                    'exception' => $dayEvents->where('type', 'exception')->count(),
                ];
            })
            ->toArray();

        $selectedDate = trim((string) $request->query('selectedDate', now()->format('Y-m-d')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $selectedDate)) {
            $selectedDate = $monthStart->format('Y-m-d');
        }

        try {
            $selectedDateValue = Carbon::createFromFormat('Y-m-d', $selectedDate);
            if (!$selectedDateValue->betweenIncluded($monthStart, $monthEnd)) {
                $selectedDate = $monthStart->format('Y-m-d');
            }
        } catch (\Throwable) {
            $selectedDate = $monthStart->format('Y-m-d');
        }

        $agendaRows = $events
            ->where('date', $selectedDate)
            ->sortBy(['time', 'type'])
            ->values();

        return [
            'summary' => [
                'totalEvents' => $events->count(),
                'pickups' => $events->where('type', 'pickup')->count(),
                'deliveries' => $events->where('type', 'delivery')->count(),
                'exceptions' => $events->where('type', 'exception')->count(),
                'highPriority' => $events->where('priority', 'high')->count(),
                'activeShipments' => $events->pluck('shipmentId')->unique()->count(),
            ],
            'filters' => [
                'month' => $monthStart->format('Y-m'),
                'eventType' => $eventType,
                'q' => $q,
                'selectedDate' => $selectedDate,
            ],
            'monthLabel' => $monthStart->format('F Y'),
            'monthStart' => $monthStart->format('Y-m-d'),
            'monthEnd' => $monthEnd->format('Y-m-d'),
            'selectedDate' => $selectedDate,
            'events' => $events->values(),
            'dayBuckets' => $dayBuckets,
            'agenda' => $agendaRows,
            'exceptionQueue' => $events
                ->where('type', 'exception')
                ->sortBy('date')
                ->take(8)
                ->values(),
            'eventTypeOptions' => [
                ['value' => 'all', 'label' => 'All'],
                ['value' => 'pickup', 'label' => 'Pickup'],
                ['value' => 'delivery', 'label' => 'Delivery'],
                ['value' => 'exception', 'label' => 'Exception'],
            ],
        ];
    }

    private function resolveBookingStatus(CourierShipment $shipment): string
    {
        $latestEventStatus = strtolower((string) optional($this->getLatestTrackingEvent($shipment))->status);

        return match ($latestEventStatus) {
            'booking_quote_pending', 'booking_revision_requested' => 'quote_pending',
            'booking_quoted' => 'quoted',
            'booking_awaiting_client_confirmation' => 'awaiting_client_confirmation',
            'booking_confirmed' => 'confirmed',
            'booking_cancelled' => 'cancelled',
            'booking_rejected' => 'rejected',
            'booking_expired' => 'expired',
            'booking_reopened' => 'new_request',
            default => match ($shipment->status) {
                CourierShipment::STATUS_PENDING => 'new_request',
                CourierShipment::STATUS_CONFIRMED,
                CourierShipment::STATUS_IN_TRANSIT,
                CourierShipment::STATUS_DELIVERED => 'confirmed',
                CourierShipment::STATUS_CANCELLED => 'cancelled',
                default => 'new_request',
            },
        };
    }

    private function bookingStatusLabel(string $status): string
    {
        return ucwords(str_replace('_', ' ', $status));
    }

    private function derivePaymentStatus(CourierShipment $shipment): string
    {
        return $shipment->resolvedPaymentStatus();
    }

    private function resolveBookingConfirmHours(CourierShipment $shipment): ?float
    {
        $confirmedEvent = $shipment->trackingEvents
            ->filter(fn ($event) => strtolower((string) $event->status) === 'booking_confirmed')
            ->sortBy('recorded_at')
            ->first();

        if (!$confirmedEvent || !$confirmedEvent->recorded_at || !$shipment->created_at) {
            return null;
        }

        return round($shipment->created_at->diffInMinutes($confirmedEvent->recorded_at) / 60, 2);
    }

    private function getAllowedBookingActionsForStatus(string $bookingStatus): array
    {
        return self::BOOKING_ALLOWED_ACTIONS[$bookingStatus] ?? [];
    }

    private function getAllowedBookingActionsForShipment(CourierShipment $shipment, string $bookingStatus, bool $canCodOverride = false): array
    {
        if ($shipment->requiresCardPayment() && $shipment->resolvedPaymentStatus() !== CourierShipmentPayment::STATUS_PAID) {
            return [];
        }

        $actions = $this->getAllowedBookingActionsForStatus($bookingStatus);

        if ($this->canPerformCodCollectionAction($shipment)) {
            $actions[] = 'cod_collected';

            if ($canCodOverride) {
                $actions[] = 'cod_failed';
                $actions[] = 'cod_refused';
            }
        }

        return array_values(array_unique($actions));
    }

    private function getAllowedCodCollectionActionsForShipment(
        CourierShipment $shipment,
        bool $canCodOverride = false,
        bool $canManageBookingLifecycle = false
    ): array {
        if (!$canManageBookingLifecycle) {
            return [];
        }

        return collect($this->getAllowedBookingActionsForShipment($shipment, $this->resolveBookingStatus($shipment), $canCodOverride))
            ->filter(fn ($action) => in_array((string) $action, self::COD_COLLECTION_ACTIONS, true))
            ->values()
            ->all();
    }

    private function canPerformBookingAction(string $bookingStatus, string $action): bool
    {
        return in_array($action, $this->getAllowedBookingActionsForStatus($bookingStatus), true);
    }

    private function canPerformCodCollectionAction(CourierShipment $shipment): bool
    {
        if (!(bool) ($shipment->is_cod_enabled ?? false)) {
            return false;
        }

        if ((float) ($shipment->cod_requested_amount ?? 0) <= 0) {
            return false;
        }

        return (string) $shipment->status === CourierShipment::STATUS_DELIVERED;
    }

    private function canActorUseCodOverrideActions(Request $request, int $vendorId): bool
    {
        if (!(bool) optional($request->user())->can('courier.services.cod.override')) {
            return false;
        }

        $record = VendorCourierSetting::query()->where('vendor_user_id', $vendorId)->first();
        $settings = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array($record?->settings) ? $record->settings : []
        );
        $services = is_array($settings['services'] ?? null)
            ? $this->normalizeCourierServiceSettings($settings['services'])
            : $this->defaultCourierServiceSettings();

        return (bool) ($services['cod']['allowTeamOverride'] ?? false);
    }

    private function resolveActiveCodCapabilityForVendor(int $vendorId, ?Request $request = null): ?CourierVendorCodCapability
    {
        $capability = CourierVendorCodCapability::query()
            ->where('vendor_user_id', $vendorId)
            ->where('category', CourierVendorCodCapability::CATEGORY_DOMESTIC)
            ->where('status', CourierVendorCodCapability::STATUS_APPROVED)
            ->where(function (Builder $query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('approved_at')
            ->orderByDesc('id')
            ->first();

        if (!$capability) {
            return null;
        }

        if ($request) {
            $workspaceId = (int) $request->attributes->get('service_workspace_id');
            if (
                $workspaceId > 0
                && $capability->service_workspace_id !== null
                && (int) $capability->service_workspace_id !== $workspaceId
            ) {
                return null;
            }
        }

        return $capability;
    }

    private function resolveCodOverrideContext(CourierShipment $shipment, string $action, array $payload): array
    {
        $requestedAmount = $shipment->cod_requested_amount !== null
            ? max(0, (float) $shipment->cod_requested_amount)
            : 0.0;
        $fromCollectionStatus = $shipment->cod_collection_status !== null
            ? (string) $shipment->cod_collection_status
            : null;

        $collectedAmount = $requestedAmount;
        $toCollectionStatus = $fromCollectionStatus;
        $isOverride = false;

        if ($action === 'cod_collected') {
            $inputAmount = $payload['codCollectedAmount'] ?? null;
            if ($inputAmount !== null && $inputAmount !== '') {
                $collectedAmount = max(0, (float) $inputAmount);
            }

            $isPartial = $requestedAmount > 0 && ($collectedAmount + 0.005 < $requestedAmount);
            $toCollectionStatus = $isPartial ? 'partially_collected' : 'collected';
            $isOverride = $isPartial;
        } elseif ($action === 'cod_failed') {
            $collectedAmount = 0.0;
            $toCollectionStatus = 'failed';
            $isOverride = $requestedAmount > 0;
        } elseif ($action === 'cod_refused') {
            $collectedAmount = 0.0;
            $toCollectionStatus = 'refused';
            $isOverride = $requestedAmount > 0;
        }

        $overrideAmount = max(0, round($requestedAmount - $collectedAmount, 2));

        return [
            'isOverride' => $isOverride,
            'requestedAmount' => $requestedAmount,
            'collectedAmount' => $collectedAmount,
            'overrideAmount' => $overrideAmount,
            'fromCollectionStatus' => $fromCollectionStatus,
            'toCollectionStatus' => $toCollectionStatus,
        ];
    }

    private function recordCodOverrideAuditEvent(
        CourierVendorCodCapability $capability,
        CourierShipment $shipment,
        string $action,
        array $context,
        ?int $actorUserId = null,
        ?string $note = null,
        ?CourierSensitiveActionApproval $approval = null
    ): void {
        $eventType = match ($action) {
            'cod_collected' => 'cod_collection_override_partial',
            'cod_failed' => 'cod_collection_override_failed',
            'cod_refused' => 'cod_collection_override_refused',
            default => 'cod_collection_override',
        };

        CourierVendorCodCapabilityAudit::recordEvent(
            $capability,
            $eventType,
            $context['fromCollectionStatus'] ?? null,
            $context['toCollectionStatus'] ?? null,
            $actorUserId && $actorUserId > 0 ? $actorUserId : null,
            $note,
            [
                'source' => 'vendor_booking_lifecycle',
                'shipmentId' => (int) $shipment->id,
                'shipmentReference' => (string) $shipment->reference,
                'bookingAction' => $action,
                'requestedAmount' => (float) ($context['requestedAmount'] ?? 0),
                'collectedAmount' => (float) ($context['collectedAmount'] ?? 0),
                'overrideAmount' => (float) ($context['overrideAmount'] ?? 0),
                'codCollectionStatus' => (string) ($shipment->cod_collection_status ?? ''),
                'approvalRequestId' => $approval?->id ? (int) $approval->id : null,
                'approvalThresholdLevel' => (string) ($approval?->threshold_level ?? ''),
                'approvalRequiredApprovals' => $approval?->required_approvals !== null ? (int) $approval->required_approvals : null,
            ]
        );
    }

    private function applyBookingAction(CourierShipment $shipment, string $action, array $payload): array
    {
        $shipment->loadMissing('trackingEvents:id,shipment_id,status,recorded_at');

        if (SuperAdminCourierActionAudit::isShipmentOperationsFrozen((int) $shipment->id)) {
            return [
                'ok' => false,
                'message' => 'Shipment operations are temporarily frozen by SuperAdmin.',
            ];
        }

        if ($shipment->requiresCardPayment() && $shipment->resolvedPaymentStatus() !== CourierShipmentPayment::STATUS_PAID) {
            return [
                'ok' => false,
                'message' => 'Booking lifecycle actions are blocked until card payment is completed.',
            ];
        }

        if (in_array($action, self::COD_COLLECTION_ACTIONS, true)) {
            return $this->applyCodCollectionAction($shipment, $action, $payload);
        }

        $bookingStatus = $this->resolveBookingStatus($shipment);

        if (!$this->canPerformBookingAction($bookingStatus, $action)) {
            return [
                'ok' => false,
                'message' => 'Action "' . str_replace('_', ' ', $action) . '" is not allowed from booking status "' . $this->bookingStatusLabel($bookingStatus) . '".',
            ];
        }

        $meta = self::BOOKING_ACTION_META[$action];
        $trackingEvent = null;

        DB::transaction(function () use ($shipment, $meta, $action, &$trackingEvent) {
            $updateData = [];

            if (!empty($meta['status'])) {
                $updateData['status'] = $meta['status'];
            }

            if (!empty($updateData)) {
                $shipment->update($updateData);
            }

            $trackingEvent = $shipment->trackingEvents()->create([
                'status' => $meta['event'],
                'description' => 'Booking action: ' . str_replace('_', ' ', $action),
                'recorded_at' => now(),
            ]);
        });

        if ($trackingEvent) {
            $emailDispatch = app(CourierCustomerEmailDispatchService::class);

            if ($action === 'accept_booking') {
                $emailDispatch->queueBookingConfirmed($shipment, $trackingEvent);
            }

            if (in_array($action, ['cancel_booking', 'reject_booking', 'expire_booking'], true)) {
                $emailDispatch->queueBookingCancelled($shipment, $trackingEvent);
            }
        }

        return ['ok' => true, 'message' => 'Updated'];
    }

    private function applyCodCollectionAction(CourierShipment $shipment, string $action, array $payload): array
    {
        if (!(bool) ($shipment->is_cod_enabled ?? false)) {
            return [
                'ok' => false,
                'message' => 'COD collection is not enabled for this booking.',
            ];
        }

        if ((string) $shipment->status !== CourierShipment::STATUS_DELIVERED) {
            return [
                'ok' => false,
                'message' => 'COD collection can be recorded only after the shipment is delivered.',
            ];
        }

        $requestedAmount = $shipment->cod_requested_amount !== null
            ? (float) $shipment->cod_requested_amount
            : 0.0;

        if ($requestedAmount <= 0) {
            return [
                'ok' => false,
                'message' => 'COD requested amount is missing for this booking.',
            ];
        }

        $collectedAmount = null;
        $collectionStatus = null;
        $eventStatus = null;
        $description = null;

        if ($action === 'cod_collected') {
            $inputAmount = $payload['codCollectedAmount'] ?? null;
            $collectedAmount = $inputAmount !== null ? (float) $inputAmount : $requestedAmount;

            if ($collectedAmount <= 0) {
                return [
                    'ok' => false,
                    'message' => 'Enter a valid COD collected amount.',
                ];
            }

            if ($collectedAmount - $requestedAmount > 0.01) {
                return [
                    'ok' => false,
                    'message' => 'Collected amount cannot exceed the requested COD amount.',
                ];
            }

            $isPartial = $collectedAmount + 0.005 < $requestedAmount;
            $collectionStatus = $isPartial ? 'partially_collected' : 'collected';
            $eventStatus = $isPartial ? 'cod_partially_collected' : 'cod_collected';
            $description = $isPartial ? 'COD partially collected.' : 'COD collected.';
        } elseif ($action === 'cod_failed') {
            $collectedAmount = 0.0;
            $collectionStatus = 'failed';
            $eventStatus = 'cod_collection_failed';
            $description = 'COD collection failed.';
        } elseif ($action === 'cod_refused') {
            $collectedAmount = 0.0;
            $collectionStatus = 'refused';
            $eventStatus = 'cod_collection_refused';
            $description = 'COD collection refused.';
        } else {
            return [
                'ok' => false,
                'message' => 'Unsupported COD collection action.',
            ];
        }

        $recordedAt = now();

        DB::transaction(function () use ($shipment, $collectedAmount, $collectionStatus, $recordedAt, $eventStatus, $description, $requestedAmount) {
            $shipment->update([
                'cod_collection_status' => $collectionStatus,
                'cod_collected_amount' => $collectedAmount,
                'cod_collection_recorded_at' => $recordedAt,
            ]);

            $shipment->trackingEvents()->create([
                'status' => $eventStatus,
                'description' => $description,
                'recorded_at' => $recordedAt,
                'meta' => [
                    'requestedAmount' => $requestedAmount,
                    'collectedAmount' => $collectedAmount,
                    'collectionStatus' => $collectionStatus,
                ],
            ]);
        });

        return ['ok' => true, 'message' => 'Updated'];
    }

    private function buildClientsPayload(Request $request): array
    {
        $vendorId = (int) $request->attributes->get('vendor_user_id');
        $policy = $this->resolveTeamAccessPolicy($vendorId);
        $approvedCategories = $this->resolveApprovedCourierPricingCategories($vendorId);

        if (!$this->hasApprovedCourierRegistration($vendorId)) {
            abort(403, 'Courier service registration approval is required to access clients.');
        }

        $this->assertAdvancedPermission($request, $policy, 'clients', 'view');

        $filters = [
            'q' => trim((string) $request->query('q', '')),
            'category' => $this->sanitizeApprovedCategoryFilter(
                trim((string) $request->query('category', '')),
                $approvedCategories
            ),
            'tier' => trim((string) $request->query('tier', '')),
            'risk' => trim((string) $request->query('risk', '')),
            'watchlist' => trim((string) $request->query('watchlist', '')),
            'perPage' => max(5, (int) $request->query('perPage', 10)),
            'page' => max(1, (int) $request->query('page', 1)),
        ];

        $scope = $this->resolveScopeForPermission($request, $policy, 'clients', 'view');
        $shipmentQuery = CourierShipment::query()
            ->with([
                'sender:id,name,email,phone,company_name',
                'senderAddress:id,contact_id,city,country',
                'recipientAddress:id,contact_id,city,country',
                'trackingEvents:id,shipment_id,status,recorded_at',
            ])
            ->where('assigned_vendor_user_id', $vendorId)
            ->orderByDesc('created_at');

        $this->applyShipmentScopeFilter($shipmentQuery, $scope, $request, $vendorId);
        $this->applyShipmentDataScopeFilter(
            $shipmentQuery,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, 'clients', 'view'),
            $vendorId
        );
        $this->applyApprovedCategoryConstraints($shipmentQuery, $approvedCategories);
        $shipments = $shipmentQuery->get();

        $clientGroups = $shipments
            ->filter(fn (CourierShipment $shipment) => $shipment->sender_contact_id !== null)
            ->groupBy('sender_contact_id');

        $profiles = VendorCourierClientProfile::query()
            ->where('vendor_user_id', $vendorId)
            ->whereIn('contact_id', $clientGroups->keys())
            ->get()
            ->keyBy('contact_id');

        $rows = $clientGroups->map(function (Collection $items, $contactId) use ($profiles) {
            $first = $items->first();
            $profile = $profiles->get($contactId);

            $total = $items->count();
            $deliveredCount = $items->where('status', CourierShipment::STATUS_DELIVERED)->count();
            $activeCount = $items->whereNotIn('status', [CourierShipment::STATUS_DELIVERED, CourierShipment::STATUS_CANCELLED])->count();
            $exceptionCount = $items->filter(fn (CourierShipment $shipment) => $this->hasException($shipment))->count();

            $domesticCount = $items->filter(function (CourierShipment $shipment) {
                return $this->resolveCategory($shipment) === 'Domestic';
            })->count();

            $internationalCount = $total - $domesticCount;

            $deliveredRate = $total > 0 ? round(($deliveredCount / $total) * 100, 1) : 0;
            $exceptionRate = $total > 0 ? round(($exceptionCount / $total) * 100, 1) : 0;

            $slaGood = $items->filter(function (CourierShipment $shipment) {
                $eta = $this->estimateDeliveryDateTime($shipment);
                $timeline = $this->getTimelineState($shipment, $eta, $this->getDeliveredAt($shipment));
                return in_array($timeline, ['on_time', 'early'], true);
            })->count();

            $slaPerformance = $total > 0 ? round(($slaGood / $total) * 100, 1) : 0;
            $risk = $this->resolveClientRisk($exceptionRate, $deliveredRate);

            $derivedTier = $this->resolveClientTier($total);
            $tier = $profile?->client_tier ?: $derivedTier;

            $categoryMix = 'Mixed';
            if ($internationalCount === 0) {
                $categoryMix = 'Domestic';
            } elseif ($domesticCount === 0) {
                $categoryMix = 'International';
            }

            $lastShipment = optional($items->sortByDesc('created_at')->first()->created_at)->format('Y-m-d H:i');

            return [
                'id' => (int) $contactId,
                'name' => $first->sender?->name,
                'company' => $first->sender?->company_name,
                'email' => $first->sender?->email,
                'phone' => $first->sender?->phone,
                'clientTier' => $tier,
                'categoryMix' => $categoryMix,
                'priorityTag' => $profile?->priority_tag ?: ($risk === 'critical' ? 'watchlist' : 'standard'),
                'watchlist' => (bool) ($profile?->watchlist),
                'accountOwner' => $profile?->account_owner,
                'internalNotes' => $profile?->internal_notes,
                'totalShipments' => $total,
                'activeShipments' => $activeCount,
                'deliveredRate' => $deliveredRate,
                'exceptionRate' => $exceptionRate,
                'slaPerformance' => $slaPerformance,
                'lastShipmentDate' => $lastShipment,
                'riskLevel' => $risk,
                'openExceptions' => $exceptionCount,
                'domesticCount' => $domesticCount,
                'internationalCount' => $internationalCount,
            ];
        })->values();

        if (!$this->canActorViewSensitiveField($request, $policy, 'customer_phone')) {
            $rows = $rows->map(function (array $row) {
                $row['phone'] = null;
                return $row;
            })->values();
        }

        if ($filters['q'] !== '') {
            $needle = strtolower($filters['q']);
            $rows = $rows->filter(function ($row) use ($needle) {
                return str_contains(strtolower((string) $row['name']), $needle)
                    || str_contains(strtolower((string) $row['company']), $needle)
                    || str_contains(strtolower((string) $row['email']), $needle)
                    || str_contains(strtolower((string) $row['phone']), $needle);
            })->values();
        }

        if ($filters['category'] !== '') {
            $rows = $rows->filter(function ($row) use ($filters) {
                return strtolower((string) $row['categoryMix']) === strtolower($filters['category'])
                    || strtolower((string) $row['categoryMix']) === 'mixed';
            })->values();
        }

        if ($filters['tier'] !== '') {
            $rows = $rows->where('clientTier', $filters['tier'])->values();
        }

        if ($filters['risk'] !== '') {
            $rows = $rows->where('riskLevel', $filters['risk'])->values();
        }

        if ($filters['watchlist'] === 'only') {
            $rows = $rows->where('watchlist', true)->values();
        }

        $summary = [
            'totalActiveClients' => $rows->count(),
            'watchlistClients' => $rows->where('watchlist', true)->count(),
            'criticalRiskClients' => $rows->where('riskLevel', 'critical')->count(),
            'clientsWithOpenExceptions' => $rows->filter(fn ($row) => $row['openExceptions'] > 0)->count(),
            'enterpriseClients' => $rows->where('clientTier', 'enterprise')->count(),
            'avgSlaPerformance' => $rows->count() > 0
                ? round($rows->avg('slaPerformance'), 1)
                : 0,
        ];

        $perPage = max(5, min(50, (int) $filters['perPage']));
        $total = $rows->count();
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min((int) $filters['page'], $totalPages);
        $pagedRows = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        return [$filters, [
            'summary' => $summary,
            'allRows' => $rows,
            'rows' => $pagedRows,
            'filters' => array_merge($filters, ['page' => $page, 'perPage' => $perPage]),
            'pagination' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'tiers' => [
                    ['value' => 'enterprise', 'label' => 'Enterprise'],
                    ['value' => 'sme', 'label' => 'SME'],
                    ['value' => 'individual', 'label' => 'Individual'],
                ],
                'risks' => [
                    ['value' => 'critical', 'label' => 'Critical'],
                    ['value' => 'at_risk', 'label' => 'At Risk'],
                    ['value' => 'stable', 'label' => 'Stable'],
                ],
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'perPageOptions' => [10, 20, 50],
                'priorityTags' => [
                    ['value' => 'vip', 'label' => 'VIP'],
                    ['value' => 'standard', 'label' => 'Standard'],
                    ['value' => 'watchlist', 'label' => 'Watchlist'],
                ],
            ],
        ]];
    }

    private function applyShipmentAction(CourierShipment $shipment, string $action): array
    {
        $shipment->loadMissing('trackingEvents:id,shipment_id,status,recorded_at');

        if (SuperAdminCourierActionAudit::isShipmentOperationsFrozen((int) $shipment->id)) {
            return [
                'ok' => false,
                'message' => 'Shipment operations are temporarily frozen by SuperAdmin.',
            ];
        }

        $assignmentHealth = $this->resolveAssignmentHealth($shipment);

        if ($assignmentHealth !== 'assigned') {
            return [
                'ok' => false,
                'message' => 'Shipment assignment is not active. Update is blocked.',
            ];
        }

        $currentStage = $this->getShipmentStage($shipment);

        if (!$this->canPerformAction($currentStage, $action)) {
            return [
                'ok' => false,
                'message' => 'Action "' . str_replace('_', ' ', $action) . '" is not allowed from stage "' . $this->stageLabel($currentStage) . '".',
            ];
        }

        $next = self::ACTION_META[$action];
        $trackingEvent = null;

        DB::transaction(function () use ($shipment, $next, $action, &$trackingEvent) {
            $shipment->update([
                'status' => $next['status'],
            ]);

            $trackingEvent = $shipment->trackingEvents()->create([
                'status' => $next['event'],
                'description' => 'Vendor action: ' . str_replace('_', ' ', $action),
                'recorded_at' => now(),
            ]);
        });

        if ($trackingEvent) {
            $emailDispatch = app(CourierCustomerEmailDispatchService::class);

            if ($action === 'picked_up') {
                $emailDispatch->queueTrackingPickedUp($shipment, $trackingEvent);
            }

            if ($action === 'out_for_delivery') {
                $emailDispatch->queueTrackingOutForDelivery($shipment, $trackingEvent);
            }

            if ($action === 'mark_delivered') {
                $emailDispatch->queueTrackingDelivered($shipment, $trackingEvent);
            }

            if ($action === 'cancel_shipment') {
                $emailDispatch->queueBookingCancelled($shipment, $trackingEvent);
            }
        }

        return ['ok' => true, 'message' => 'Updated'];
    }

    private function canPerformAction(string $stage, string $action): bool
    {
        $allowed = self::ALLOWED_STAGE_ACTIONS[$stage] ?? [];
        return in_array($action, $allowed, true);
    }

    private function getAllowedActionsForStage(string $stage): array
    {
        return self::ALLOWED_STAGE_ACTIONS[$stage] ?? [];
    }

    private function resolveAssignmentHealth(CourierShipment $shipment): string
    {
        if (!$shipment->assigned_vendor_user_id) {
            return 'unassigned';
        }

        if (!$shipment->assigned_vendor_registration_id) {
            return 'registration_missing';
        }

        if (!$shipment->assigned_at) {
            return 'pending_confirmation';
        }

        return 'assigned';
    }

    private function resolveSlaStatus(CourierShipment $shipment, ?Carbon $estimatedDelivery, ?string $timelineState): string
    {
        if (!$estimatedDelivery) {
            return 'unknown';
        }

        if ($timelineState === 'delayed') {
            return 'delayed';
        }

        if ($timelineState === 'early') {
            return 'early';
        }

        if ($shipment->status === CourierShipment::STATUS_DELIVERED) {
            return 'on_time';
        }

        $hoursToEta = now()->diffInHours($estimatedDelivery, false);

        if ($hoursToEta >= 0 && $hoursToEta <= 6) {
            return 'at_risk';
        }

        return 'on_track';
    }

    private function resolveClientRisk(float $exceptionRate, float $deliveredRate): string
    {
        if ($exceptionRate >= 20 || $deliveredRate < 65) {
            return 'critical';
        }

        if ($exceptionRate >= 10 || $deliveredRate < 80) {
            return 'at_risk';
        }

        return 'stable';
    }

    private function resolveClientTier(int $totalShipments): string
    {
        if ($totalShipments >= 50) {
            return 'enterprise';
        }

        if ($totalShipments >= 15) {
            return 'sme';
        }

        return 'individual';
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        if ($filters['q'] !== '') {
            $raw = strtoupper($filters['q']);
            $normalized = str_starts_with($raw, 'TRK-')
                ? 'CR-' . substr($raw, 4)
                : $raw;

            $query->where(function (Builder $nested) use ($raw, $normalized) {
                $nested->whereRaw('UPPER(reference) LIKE ?', ['%' . $raw . '%'])
                    ->orWhereRaw('UPPER(reference) LIKE ?', ['%' . $normalized . '%']);
            });
        }

        if ($filters['status'] !== '') {
            $query->where('status', $filters['status']);
        }

        if ($filters['service'] !== '') {
            $query->where('service_level', $filters['service']);
        }

        if ($filters['fromDate'] !== '') {
            $query->whereDate('created_at', '>=', $filters['fromDate']);
        }

        if ($filters['toDate'] !== '') {
            $query->whereDate('created_at', '<=', $filters['toDate']);
        }

        if ($filters['category'] === 'domestic') {
            $this->applyDomesticCategoryConstraint($query);
        }

        if ($filters['category'] === 'international') {
            $this->applyInternationalCategoryConstraint($query);
        }
    }

    private function buildApprovedCategoryFilterOptions(array $approvedCategories): array
    {
        return collect([
            ['value' => 'domestic', 'label' => 'Domestic'],
            ['value' => 'international', 'label' => 'International'],
        ])
            ->filter(fn (array $option) => in_array($option['value'], $approvedCategories, true))
            ->values()
            ->all();
    }

    private function sanitizeApprovedCategoryFilter(string $category, array $approvedCategories): string
    {
        $normalized = strtolower(trim($category));

        if (!in_array($normalized, ['domestic', 'international'], true)) {
            return '';
        }

        return in_array($normalized, $approvedCategories, true) ? $normalized : '';
    }

    private function applyApprovedCategoryConstraints(Builder $query, array $approvedCategories): void
    {
        $allowDomestic = in_array('domestic', $approvedCategories, true);
        $allowInternational = in_array('international', $approvedCategories, true);

        if ($allowDomestic && $allowInternational) {
            return;
        }

        if ($allowDomestic) {
            $this->applyDomesticCategoryConstraint($query);
            return;
        }

        if ($allowInternational) {
            $this->applyInternationalCategoryConstraint($query);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function applyDomesticCategoryConstraint(Builder $query): void
    {
        $query
            ->whereHas('senderAddress', function (Builder $sender) {
                $sender->whereRaw('UPPER(country) = ?', ['LK']);
            })
            ->whereHas('recipientAddress', function (Builder $recipient) {
                $recipient->whereRaw('UPPER(country) = ?', ['LK']);
            });
    }

    private function applyInternationalCategoryConstraint(Builder $query): void
    {
        $query->where(function (Builder $nested) {
            $nested
                ->whereHas('senderAddress', function (Builder $sender) {
                    $sender->whereRaw('UPPER(country) <> ?', ['LK']);
                })
                ->orWhereHas('recipientAddress', function (Builder $recipient) {
                    $recipient->whereRaw('UPPER(country) <> ?', ['LK']);
                });
        });
    }

    private function buildDashboardPayload(Collection $shipments, array $filters, array $approvedCategories): array
    {
        $timelineRows = $shipments
            ->map(function (CourierShipment $shipment) {
                $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
                $deliveredAt = $this->getDeliveredAt($shipment);

                return [
                    'shipment' => $shipment,
                    'timelineState' => $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt),
                ];
            });

        $rows = $shipments
            ->map(function (CourierShipment $shipment) {
                $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
                $deliveredAt = $this->getDeliveredAt($shipment);
                $timeline = $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt);

                return [
                    'id' => $shipment->id,
                    'bookingNumber' => $shipment->reference,
                    'bookingDate' => $this->formatCourierProfileDateTime($shipment->created_at),
                    'trackingNumber' => $this->trackingNumber($shipment),
                    'service' => $this->normalizeServiceLabel($shipment->service_level),
                    'provider' => (string) (optional($shipment->packages->first())->courier_provider_name ?? 'Unspecified'),
                    'originCity' => (string) (optional($shipment->senderAddress)->city ?? '-'),
                    'destinationCity' => (string) (optional($shipment->recipientAddress)->city ?? '-'),
                    'status' => $shipment->status,
                    'statusLabel' => $this->statusLabel($shipment->status),
                    'category' => $this->resolveCategory($shipment),
                    'estimatedDelivery' => optional($estimatedDelivery)->format('Y-m-d H:i'),
                    'client' => $shipment->sender?->name,
                    'timelineState' => $timeline,
                    'hasException' => $this->hasException($shipment),
                    'pendingPickup' => $this->isPendingPickup($shipment),
                    'labelCreated' => $this->isLabelCreated($shipment),
                    'deliveredAt' => optional($deliveredAt)->format('Y-m-d H:i'),
                ];
            })
            ->values();

        $urgentType = trim((string) ($filters['urgentType'] ?? ''));

        if ($urgentType !== '') {
            $rows = $rows->filter(function ($row) use ($urgentType) {
                if ($urgentType === 'delayed') {
                    return $row['timelineState'] === 'delayed';
                }

                if ($urgentType === 'exception') {
                    return $row['hasException'] === true;
                }

                if ($urgentType === 'pending_pickup') {
                    return $row['pendingPickup'] === true;
                }

                return true;
            })->values();
        }

        $pageSize = 12;
        $total = $rows->count();
        $totalPages = max(1, (int) ceil($total / $pageSize));
        $page = min($filters['page'], $totalPages);

        $pagedRows = $rows
            ->slice(($page - 1) * $pageSize, $pageSize)
            ->values();

        $metrics = [
            'delayed' => $rows->where('timelineState', 'delayed')->count(),
            'exceptions' => $rows->where('hasException', true)->count(),
            'labelCreated' => $rows->where('labelCreated', true)->count(),
            'pendingPickups' => $rows->where('pendingPickup', true)->count(),
            'delivered' => $rows->where('status', CourierShipment::STATUS_DELIVERED)->count(),
            'onTime' => $rows->where('timelineState', 'on_time')->count(),
            'early' => $rows->where('timelineState', 'early')->count(),
        ];

        $bookingOverview = $this->buildMonthlyBookingsSeries($shipments, $filters['bookingRange']);
        $earningSummary = $this->buildMonthlyEarningsSeries($shipments, $filters['earningRange']);

        $statusRangeShipments = $this->filterShipmentsByRange($shipments, $filters['statusRange']);
        $statusTimelineRows = $statusRangeShipments
            ->map(function (CourierShipment $shipment) {
                $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
                $deliveredAt = $this->getDeliveredAt($shipment);

                return [
                    'timelineState' => $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt),
                ];
            });

        $totalTimeline = max(1, $statusTimelineRows->count());
        $statusBreakdown = [
            [
                'name' => 'On Time',
                'value' => (int) round(($statusTimelineRows->where('timelineState', 'on_time')->count() / $totalTimeline) * 100),
                'color' => '#3DD0FF',
                'change' => 'up',
            ],
            [
                'name' => 'Delayed',
                'value' => (int) round(($statusTimelineRows->where('timelineState', 'delayed')->count() / $totalTimeline) * 100),
                'color' => '#0955AC',
                'change' => 'down',
            ],
            [
                'name' => 'Early',
                'value' => (int) round(($statusTimelineRows->where('timelineState', 'early')->count() / $totalTimeline) * 100),
                'color' => '#C4C4C4',
                'change' => 'up',
            ],
        ];

        $bookingFunnel = collect(self::BOOKING_STATUS_OPTIONS)
            ->map(function ($status) use ($shipments) {
                $count = $shipments->filter(function (CourierShipment $shipment) use ($status) {
                    return $this->resolveBookingStatus($shipment) === $status;
                })->count();

                return [
                    'status' => $status,
                    'label' => $this->bookingStatusLabel($status),
                    'count' => $count,
                ];
            })
            ->values();

        $stageBoard = collect(self::SHIPMENT_STAGE_OPTIONS)
            ->map(function ($stage) use ($shipments) {
                $count = $shipments->filter(function (CourierShipment $shipment) use ($stage) {
                    return $this->getShipmentStage($shipment) === $stage;
                })->count();

                return [
                    'stage' => $stage,
                    'label' => $this->stageLabel($stage),
                    'count' => $count,
                ];
            })
            ->values();

        $providerPerformance = $rows
            ->groupBy(fn ($row) => (string) ($row['provider'] ?? 'Unspecified'))
            ->map(function (Collection $group, string $provider) {
                $total = max(1, $group->count());

                return [
                    'provider' => $provider,
                    'total' => $group->count(),
                    'delayed' => $group->where('timelineState', 'delayed')->count(),
                    'exceptions' => $group->where('hasException', true)->count(),
                    'onTimeRate' => round(($group->where('timelineState', 'on_time')->count() / $total) * 100, 1),
                ];
            })
            ->sortByDesc('total')
            ->take(6)
            ->values();

        $urgentQueue = $rows
            ->filter(function ($row) {
                return $row['timelineState'] === 'delayed'
                    || $row['hasException'] === true
                    || $row['pendingPickup'] === true;
            })
            ->sortByDesc(function ($row) {
                if ($row['timelineState'] === 'delayed') {
                    return 3;
                }

                if ($row['hasException'] === true) {
                    return 2;
                }

                return 1;
            })
            ->take(10)
            ->map(function ($row) {
                return [
                    'id' => $row['id'],
                    'bookingNumber' => $row['bookingNumber'],
                    'trackingNumber' => $row['trackingNumber'],
                    'statusLabel' => $row['statusLabel'],
                    'timelineState' => $row['timelineState'],
                    'hasException' => $row['hasException'],
                    'pendingPickup' => $row['pendingPickup'],
                ];
            })
            ->values();

        $topRoutes = $rows
            ->map(function ($row) {
                return [
                    'route' => trim(($row['originCity'] ?? '-') . ' to ' . ($row['destinationCity'] ?? '-')),
                    'delayed' => $row['timelineState'] === 'delayed' ? 1 : 0,
                    'total' => 1,
                ];
            })
            ->groupBy('route')
            ->map(function (Collection $group, string $route) {
                $total = max(1, $group->sum('total'));

                return [
                    'route' => $route,
                    'total' => $group->sum('total'),
                    'delayed' => $group->sum('delayed'),
                    'delayRate' => round(($group->sum('delayed') / $total) * 100, 1),
                ];
            })
            ->sortByDesc('total')
            ->take(6)
            ->values();

        return [
            'metrics' => $metrics,
            'rows' => $pagedRows,
            'generatedAt' => $this->formatCourierProfileDateTime(now()),
            'filters' => array_merge($filters, ['page' => $page]),
            'pagination' => [
                'page' => $page,
                'pageSize' => $pageSize,
                'total' => $total,
                'totalPages' => $totalPages,
            ],
            'filterOptions' => [
                'statuses' => $shipments
                    ->pluck('status')
                    ->filter()
                    ->unique()
                    ->map(fn ($status) => [
                        'value' => $status,
                        'label' => $this->statusLabel($status),
                    ])
                    ->values(),
                'services' => $shipments
                    ->pluck('service_level')
                    ->filter()
                    ->unique()
                    ->sort()
                    ->values(),
                'categories' => $this->buildApprovedCategoryFilterOptions($approvedCategories),
                'urgentTypes' => [
                    ['value' => '', 'label' => 'All Priorities'],
                    ['value' => 'delayed', 'label' => 'Delayed'],
                    ['value' => 'exception', 'label' => 'Exception'],
                    ['value' => 'pending_pickup', 'label' => 'Pending Pickup'],
                ],
            ],
            'charts' => [
                'bookingOverview' => $bookingOverview,
                'earningSummary' => $earningSummary,
                'statusBreakdown' => $statusBreakdown,
            ],
            'ops' => [
                'bookingFunnel' => $bookingFunnel,
                'stageBoard' => $stageBoard,
                'providerPerformance' => $providerPerformance,
                'urgentQueue' => $urgentQueue,
                'topRoutes' => $topRoutes,
            ],
        ];
    }

    private function buildMonthlyBookingsSeries(Collection $shipments, string $range): Collection
    {
        return $this->buildMonthlySeries($shipments, $range, function (Collection $monthlyShipments) {
            return $monthlyShipments->count();
        }, 'bookings');
    }

    private function buildMonthlyEarningsSeries(Collection $shipments, string $range): Collection
    {
        return $this->buildMonthlySeries($shipments, $range, function (Collection $monthlyShipments) {
            return round($monthlyShipments->sum(fn (CourierShipment $shipment) => (float) ($shipment->estimated_cost ?? 0)), 2);
        }, 'value');
    }

    private function buildMonthlySeries(Collection $shipments, string $range, callable $resolver, string $valueKey): Collection
    {
        $months = $this->resolveMonthlyPoints($range);

        return $months->map(function (Carbon $pointDate) use ($shipments, $resolver, $valueKey) {
            $monthShipments = $shipments
                ->filter(fn (CourierShipment $shipment) => optional($shipment->created_at)?->isSameMonth($pointDate));

            return [
                'name' => $pointDate->format('M'),
                $valueKey => $resolver($monthShipments),
            ];
        })->values();
    }

    private function resolveMonthlyPoints(string $range): Collection
    {
        $normalized = strtolower($range);

        if ($normalized === 'last_6_months') {
            return collect(range(5, 0))->map(fn ($monthsAgo) => now()->startOfMonth()->subMonths($monthsAgo));
        }

        if ($normalized === 'this_year') {
            $start = now()->startOfYear();
            $months = collect();

            while ($start->lte(now()->startOfMonth())) {
                $months->push($start->copy());
                $start->addMonth();
            }

            return $months;
        }

        return collect(range(11, 0))->map(fn ($monthsAgo) => now()->startOfMonth()->subMonths($monthsAgo));
    }

    private function filterShipmentsByRange(Collection $shipments, string $range): Collection
    {
        $normalized = strtolower($range);
        $now = now();

        $start = match ($normalized) {
            'this_month' => $now->copy()->startOfMonth(),
            'this_year' => $now->copy()->startOfYear(),
            default => $now->copy()->startOfWeek(),
        };

        return $shipments->filter(function (CourierShipment $shipment) use ($start, $now) {
            if (!$shipment->created_at) {
                return false;
            }

            return $shipment->created_at->between($start, $now);
        })->values();
    }

    private function downloadCsv(Collection $shipments)
    {
        $filename = 'courier-dashboard-report-' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($shipments) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Booking Number',
                'Booking Date',
                'Tracking Number',
                'Category',
                'Service',
                'Status',
                'Estimated Delivery',
                'Delivered At',
            ]);

            foreach ($shipments as $shipment) {
                $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
                $deliveredAt = $this->getDeliveredAt($shipment);

                fputcsv($handle, [
                    $shipment->reference,
                    $this->formatCourierProfileDateTime($shipment->created_at),
                    $this->trackingNumber($shipment),
                    $this->resolveCategory($shipment),
                    $this->normalizeServiceLabel($shipment->service_level),
                    $this->statusLabel($shipment->status),
                    optional($estimatedDelivery)->format('Y-m-d H:i'),
                    optional($deliveredAt)->format('Y-m-d H:i'),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function downloadTrackingCsv(Collection $rows)
    {
        $filename = 'courier-tracking-report-' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Tracking Number',
                'Booking Number',
                'Category',
                'Service',
                'Provider',
                'Current Stage',
                'Current Location',
                'Last Scan At',
                'ETA',
                'SLA Status',
                'Exception',
            ]);

            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['trackingNumber'] ?? '',
                    $row['bookingNumber'] ?? '',
                    $row['category'] ?? '',
                    $row['service'] ?? '',
                    $row['provider'] ?? '',
                    $row['stageLabel'] ?? '',
                    $row['currentLocation'] ?? '',
                    $row['lastScanAt'] ?? '',
                    $row['eta'] ?? '',
                    $row['slaStatus'] ?? '',
                    !empty($row['exception']) ? 'Yes' : 'No',
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function downloadClientsCsv(Collection $rows)
    {
        $filename = 'courier-clients-export-' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Client Name',
                'Company',
                'Email',
                'Phone',
                'Tier',
                'Risk',
                'Watchlist',
                'Total Shipments',
                'Active Shipments',
                'Delivered Rate',
                'SLA Performance',
            ]);

            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row['name'] ?? '',
                    $row['company'] ?? '',
                    $row['email'] ?? '',
                    $row['phone'] ?? '',
                    $row['clientTier'] ?? '',
                    $row['riskLevel'] ?? '',
                    !empty($row['watchlist']) ? 'Yes' : 'No',
                    $row['totalShipments'] ?? 0,
                    $row['activeShipments'] ?? 0,
                    $row['deliveredRate'] ?? 0,
                    $row['slaPerformance'] ?? 0,
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function normalizeServiceLabel(?string $service): string
    {
        $value = strtolower((string) $service);

        if (str_contains($value, 'express') || str_contains($value, 'same day')) {
            return 'Express';
        }

        return 'Economy';
    }

    private function defaultCourierSettings(): array
    {
        return [
            'profile' => [
                'displayName' => '',
                'supportEmail' => '',
                'supportHotline' => '',
                'publicSupportHours' => '',
            ],
            'business' => [
                'companyName' => '',
                'supportEmail' => '',
                'hotline' => '',
                'primaryHub' => '',
                'serviceZones' => '',
            ],
            'operations' => [
                'autoAcceptBookings' => false,
                'workStart' => '08:00',
                'workEnd' => '20:00',
                'sameDayCutoff' => '14:00',
                'maxDailyBookings' => 350,
            ],
            'sla' => [
                'expressHours' => 8,
                'economyHours' => 24,
                'breachAlertMinutes' => 90,
                'autoEscalateExceptions' => true,
            ],
            'tracking' => [
                'noScan6h' => true,
                'noScan12h' => true,
                'noScan24h' => false,
                'requirePodPhoto' => true,
                'requirePodSignature' => false,
                'allowManualScanCorrection' => true,
            ],
            'notifications' => $this->normalizeNotificationSettings([]),
            'integrations' => [
                'webhookUrl' => '',
                'apiKeyAlias' => '',
                'retryWindowMinutes' => 15,
                'rotateKeysEveryDays' => 90,
            ],
            'services' => $this->defaultCourierServiceSettings(),
            'labels' => $this->defaultCourierLabelSettings(),
            'pricing' => $this->defaultPricingSettings(),
            'team' => [
                'dispatcherCanCancel' => false,
                'opsLeadCanReassign' => true,
                'financeCanViewRates' => true,
                'enforce2FA' => true,
                'approvalControl' => app(CourierSensitiveActionApprovalService::class)->defaultPolicy(),
                'sodControl' => $this->defaultSodControlPolicy(),
                'temporaryAccessControl' => app(CourierTemporaryAccessService::class)->defaultPolicy(),
                'accessReviewControl' => app(CourierAccessReviewService::class)->defaultPolicy(),
                'apiServiceAccessControl' => app(CourierApiServiceAccessService::class)->defaultPolicy(),
                'sessionSecurity' => app(CourierSessionSecurityService::class)->defaultPolicy(),
                'teamAccessControl' => [
                    'defaultDirectPermissionsByRole' => [],
                    'defaultDataScopeByRole' => [],
                    'onboardingBundles' => [],
                ],
                'permissionModel' => $this->defaultAdvancedPermissionModel(),
            ],
        ];
    }

    private function defaultCourierServiceSettings(): array
    {
        return [
            'cod' => [
                'acceptCodAtCheckout' => false,
                'allowCodForDomestic' => true,
                'allowCodForInternational' => false,
                'allowTeamOverride' => false,
            ],
        ];
    }

    private function normalizeCourierServiceSettings(array $settings): array
    {
        $normalized = array_replace_recursive($this->defaultCourierServiceSettings(), $settings);

        $cod = is_array($normalized['cod'] ?? null)
            ? $normalized['cod']
            : $this->defaultCourierServiceSettings()['cod'];

        if (!array_key_exists('allowCodForInternational', $cod) && array_key_exists('allowCodForLogistic', $cod)) {
            $cod['allowCodForInternational'] = (bool) $cod['allowCodForLogistic'];
        }

        if (array_key_exists('allowCodForLogistic', $cod)) {
            unset($cod['allowCodForLogistic']);
        }

        $cod['acceptCodAtCheckout'] = (bool) ($cod['acceptCodAtCheckout'] ?? false);
        $cod['allowCodForDomestic'] = (bool) ($cod['allowCodForDomestic'] ?? false);
        $cod['allowCodForInternational'] = false;
        $cod['allowTeamOverride'] = (bool) ($cod['allowTeamOverride'] ?? false);

        $normalized['cod'] = $cod;

        return $normalized;
    }

    private function normalizeNotificationSettings(array $settings): array
    {
        return app(CourierNotificationPreferenceService::class)->normalize($settings);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildNotificationMetrics(int $vendorId): array
    {
        $lookbackDays = max(1, (int) config('courier.notifications_v2.metrics_lookback_days', 30));
        $from = now()->subDays($lookbackDays);

        $rows = CourierCustomerEmailDispatch::query()
            ->where('vendor_user_id', $vendorId)
            ->where('created_at', '>=', $from)
            ->selectRaw('channel, status, count(*) as aggregate_count')
            ->groupBy('channel', 'status')
            ->get();

        $totals = [
            'email_sent' => 0,
            'email_failed' => 0,
            'email_pending' => 0,
            'email_skipped' => 0,
            'in_app_sent' => 0,
            'in_app_failed' => 0,
            'suppressed' => 0,
        ];

        foreach ($rows as $row) {
            $channel = (string) ($row->channel ?? 'email');
            $status = (string) ($row->status ?? '');
            $count = (int) ($row->aggregate_count ?? 0);

            if ($channel === 'in_app' && $status === CourierCustomerEmailDispatch::STATUS_SENT) {
                $totals['in_app_sent'] += $count;
            }

            if ($channel === 'in_app' && $status === CourierCustomerEmailDispatch::STATUS_FAILED) {
                $totals['in_app_failed'] += $count;
            }

            if ($channel === 'email' && $status === CourierCustomerEmailDispatch::STATUS_SENT) {
                $totals['email_sent'] += $count;
            }

            if ($channel === 'email' && $status === CourierCustomerEmailDispatch::STATUS_FAILED) {
                $totals['email_failed'] += $count;
            }

            if ($channel === 'email' && $status === CourierCustomerEmailDispatch::STATUS_PENDING) {
                $totals['email_pending'] += $count;
            }

            if ($channel === 'email' && $status === CourierCustomerEmailDispatch::STATUS_SKIPPED) {
                $totals['email_skipped'] += $count;
            }
        }

        $totals['suppressed'] = CourierCustomerEmailDispatch::query()
            ->where('vendor_user_id', $vendorId)
            ->where('created_at', '>=', $from)
            ->where('status', CourierCustomerEmailDispatch::STATUS_SKIPPED)
            ->where(function (Builder $query) {
                $query->where('failed_reason_code', 'suppressed')
                    ->orWhere('last_error', 'like', '%suppressed%');
            })
            ->count();

        $inAppCreated = Notification::query()
            ->where('type', 'courier_event')
            ->where('created_at', '>=', $from)
            ->get(['data'])
            ->filter(function (Notification $notification) use ($vendorId) {
                $data = is_array($notification->data) ? $notification->data : [];
                return (int) ($data['vendor_user_id'] ?? 0) === $vendorId;
            })
            ->count();

        return [
            'lookbackDays' => $lookbackDays,
            'totals' => $totals,
            'inAppCreated' => $inAppCreated,
        ];
    }

    private function buildCodCapabilityPayload(Request $request, int $vendorId, int $workspaceId, ?string $category = null): array
    {
        $resolvedCategory = CourierVendorCodCapability::CATEGORY_DOMESTIC;

        $capability = CourierVendorCodCapability::query()
            ->where('vendor_user_id', $vendorId)
            ->where('category', $resolvedCategory)
            ->with(['requester:id,name', 'reviewer:id,name'])
            ->first();

        $status = (string) ($capability?->status ?: CourierVendorCodCapability::STATUS_NOT_REQUESTED);
        $isExpired = (bool) ($capability?->expires_at && $capability->expires_at->isPast());
        $canRequestByPermission = (string) (optional($request->user())->role ?? '') === 'vendor'
            || (bool) optional($request->user())->can('courier.services.cod.request')
            || (bool) optional($request->user())->can('courier.settings.update');
        $canRequest = $canRequestByPermission && in_array($status, [
            CourierVendorCodCapability::STATUS_NOT_REQUESTED,
            CourierVendorCodCapability::STATUS_REJECTED,
        ], true);
        if ($canRequestByPermission && $status === CourierVendorCodCapability::STATUS_APPROVED && $isExpired) {
            $canRequest = true;
        }
        $canOverride = $this->canActorUseCodOverrideActions($request, $vendorId);

        return [
            'status' => $status,
            'statusLabel' => CourierVendorCodCapability::STATUS_LABELS[$status] ?? 'Unknown',
            'category' => $resolvedCategory,
            'categoryLabel' => CourierVendorCodCapability::CATEGORY_LABELS[$resolvedCategory] ?? 'Domestic',
            'requestedAt' => optional($capability?->requested_at)->format('Y-m-d H:i:s'),
            'requestedByName' => (string) ($capability?->requester?->name ?? ''),
            'requestedNote' => (string) ($capability?->requested_note ?? ''),
            'reviewedAt' => optional($capability?->reviewed_at)->format('Y-m-d H:i:s'),
            'reviewedByName' => (string) ($capability?->reviewer?->name ?? ''),
            'decisionReason' => (string) ($capability?->decision_reason ?? ''),
            'approvedAt' => optional($capability?->approved_at)->format('Y-m-d H:i:s'),
            'expiresAt' => optional($capability?->expires_at)->format('Y-m-d H:i:s'),
            'isExpired' => $isExpired,
            'canRequest' => $canRequest,
            'canOverride' => $canOverride,
            'isEnabled' => $status === CourierVendorCodCapability::STATUS_APPROVED && !$isExpired,
            'workspaceId' => $workspaceId,
        ];
    }

    private function defaultPricingSettings(): array
    {
        return [
            'localization' => [
                'domestic' => [
                    'baseCurrency' => 'LKR',
                    'displayCurrency' => 'LKR',
                    'locale' => 'en-LK',
                    'exchangeRateProvider' => 'frankfurter.app',
                    'autoLiveRates' => true,
                    'manualRates' => [
                        'LKR' => 1,
                        'USD' => 0.00308,
                        'EUR' => 0.00284,
                    ],
                    'lastSyncedAt' => null,
                ],
                'international' => [
                    'baseCurrency' => 'LKR',
                    'displayCurrency' => 'LKR',
                    'locale' => 'en-LK',
                    'exchangeRateProvider' => 'frankfurter.app',
                    'autoLiveRates' => true,
                    'manualRates' => [
                        'LKR' => 1,
                        'USD' => 0.00308,
                        'EUR' => 0.00284,
                    ],
                    'lastSyncedAt' => null,
                ],
            ],
            'formula' => [
                'domestic' => [
                    'volumetricDivisor' => 5000,
                    'useChargeableWeight' => true,
                    'fuelSurchargePercent' => 0,
                    'handlingFee' => 0,
                    'taxPercent' => 0,
                    'roundTo' => 2,
                ],
                'international' => [
                    'volumetricDivisor' => 5000,
                    'useChargeableWeight' => true,
                    'fuelSurchargePercent' => 0,
                    'handlingFee' => 0,
                    'taxPercent' => 0,
                    'roundTo' => 2,
                ],
            ],
            'serviceCatalog' => $this->defaultPricingServiceCatalog(),
            'zoneMaster' => $this->defaultPricingZoneMaster(),
            'cityZoneMap' => [
                'domestic' => [],
                'international' => [],
            ],
            'laneMatrix' => [
                'enabled' => [
                    'domestic' => false,
                    'international' => false,
                ],
                'domestic' => [],
                'international' => [],
            ],
            'policyModules' => $this->defaultPricingPolicyModules(),
            'categories' => [
                'domestic' => [
                    [
                        'id' => 'domestic_within_3_days',
                        'label' => 'Within 3 Days',
                        'serviceLevelKey' => 'two_three_day',
                        'slaDays' => 3,
                        'basePrice' => 250,
                        'perKgPrice' => 35,
                        'minPrice' => 250,
                        'priorityMultiplier' => 1,
                    ],
                    [
                        'id' => 'domestic_one_day',
                        'label' => 'One Day',
                        'serviceLevelKey' => 'next_day',
                        'slaDays' => 1,
                        'basePrice' => 1000,
                        'perKgPrice' => 70,
                        'minPrice' => 1000,
                        'priorityMultiplier' => 1,
                    ],
                ],
                'international' => [
                    [
                        'id' => 'international_standard',
                        'label' => 'International Standard',
                        'serviceLevelKey' => 'two_three_day',
                        'slaDays' => 4,
                        'basePrice' => 1400,
                        'perKgPrice' => 90,
                        'minPrice' => 1400,
                        'priorityMultiplier' => 1,
                    ],
                    [
                        'id' => 'international_express',
                        'label' => 'International Express',
                        'serviceLevelKey' => 'next_day',
                        'slaDays' => 2,
                        'basePrice' => 2200,
                        'perKgPrice' => 130,
                        'minPrice' => 2200,
                        'priorityMultiplier' => 1.12,
                    ],
                ],
            ],
            'governance' => $this->defaultPricingGovernance(),
        ];
    }

    private function defaultCourierLabelSettings(): array
    {
        return CourierLabelDefaults::settings();
    }

    private function normalizeLabelSettings(array $input): array
    {
        $defaults = CourierLabelDefaults::settings();
        $normalized = array_replace_recursive($defaults, $input);

        $policy = is_array($normalized['printPolicy'] ?? null) ? $normalized['printPolicy'] : [];
        $policy['bulkAsyncThreshold'] = max(1, (int) ($policy['bulkAsyncThreshold'] ?? 50));
        $policy['bulkHardLimit'] = max($policy['bulkAsyncThreshold'], (int) ($policy['bulkHardLimit'] ?? 200));
        $policy['allowCustomSizes'] = (bool) ($policy['allowCustomSizes'] ?? true);
        $policy['allowTemplateUpload'] = (bool) ($policy['allowTemplateUpload'] ?? true);
        $policy['allowHtmlTemplates'] = (bool) ($policy['allowHtmlTemplates'] ?? true);
        $policy['allowPdfBackground'] = (bool) ($policy['allowPdfBackground'] ?? true);
        $normalized['printPolicy'] = $policy;

        foreach (['domestic', 'international'] as $category) {
            $defaultRow = is_array($normalized['defaults'][$category] ?? null) ? $normalized['defaults'][$category] : [];
            $normalized['defaults'][$category] = [
                'templateId' => isset($defaultRow['templateId']) ? (int) $defaultRow['templateId'] : null,
                'sizeId' => isset($defaultRow['sizeId']) ? (int) $defaultRow['sizeId'] : null,
            ];
        }

        return $normalized;
    }

    private function hasLabelManagePermission(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        return $user->hasPermissionTo('courier.labels.manage_templates');
    }

    private function defaultPricingPolicyModules(): array
    {
        $categoryDefaults = [
            'remoteAreaSurcharge' => [
                'enabled' => false,
                'flatFee' => 0,
                'applyOnOrigin' => false,
                'applyOnDestination' => true,
                'postalCodePrefixes' => [],
                'cityKeywords' => [],
            ],
            'oversizeOverweightRules' => [
                'enabled' => false,
                'maxWeightKg' => 25,
                'overweightPerKgFee' => 0,
                'maxLengthCm' => 120,
                'maxWidthCm' => 80,
                'maxHeightCm' => 80,
                'oversizeFlatFee' => 0,
            ],
            'peakHolidaySurcharge' => [
                'enabled' => false,
                'peakStartTime' => '17:00',
                'peakEndTime' => '21:00',
                'daysOfWeek' => [1, 2, 3, 4, 5],
                'peakPercent' => 0,
                'peakFlatFee' => 0,
                'holidayDates' => [],
                'holidayPercent' => 0,
                'holidayFlatFee' => 0,
            ],
            'codFee' => [
                'enabled' => false,
                'flatFee' => 0,
                'percentOfDeclaredValue' => 0,
                'minFee' => 0,
                'maxFee' => null,
            ],
            'minimumShipmentCharge' => [
                'enabled' => true,
                'minimumTotal' => 0,
            ],
            'customerContractPricing' => [
                'enabled' => false,
                'contracts' => [],
            ],
            'quoteRuntimeGovernance' => [
                'enabled' => false,
                'fieldLocks' => [
                    'enabled' => false,
                    'lockShipmentServiceLevel' => true,
                    'lockPackageServiceLevel' => true,
                    'lockPackageCourierProvider' => true,
                    'lockQuoteTotal' => true,
                ],
                'discountGuardrails' => [
                    'enabled' => false,
                    'maxDiscountPercent' => 0,
                    'maxDiscountAmountUsd' => 0,
                ],
                'floorPriceGuardrail' => [
                    'enabled' => false,
                    'minimumTotalUsd' => 0,
                ],
            ],
            'speedEtaTierEngine' => [
                'enabled' => false,
                'enforceFixedNamedTiers' => true,
                'enforceTierPricingMultiplier' => true,
                'tiers' => [
                    'priority_4h' => [
                        'enabled' => true,
                        'etaLabel' => 'Priority 4 Hours',
                        'etaMinDays' => 0,
                        'etaMaxDays' => 0,
                        'priceMultiplier' => 1.45,
                        'maxDistanceKm' => 35,
                        'maxWeightKg' => 12,
                        'minLeadHours' => 0.5,
                        'maxLeadHours' => 4,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'same_day' => [
                        'enabled' => true,
                        'etaLabel' => 'Same Day',
                        'etaMinDays' => 0,
                        'etaMaxDays' => 1,
                        'priceMultiplier' => 1.25,
                        'maxDistanceKm' => 80,
                        'maxWeightKg' => 20,
                        'minLeadHours' => 1,
                        'maxLeadHours' => 12,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'next_day' => [
                        'enabled' => true,
                        'etaLabel' => 'Next Day',
                        'etaMinDays' => 1,
                        'etaMaxDays' => 2,
                        'priceMultiplier' => 1.12,
                        'maxDistanceKm' => 250,
                        'maxWeightKg' => 30,
                        'minLeadHours' => 2,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'two_three_day' => [
                        'enabled' => true,
                        'etaLabel' => '2-3 Days',
                        'etaMinDays' => 2,
                        'etaMaxDays' => 3,
                        'priceMultiplier' => 1.0,
                        'maxDistanceKm' => null,
                        'maxWeightKg' => null,
                        'minLeadHours' => 0,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                    'economy' => [
                        'enabled' => true,
                        'etaLabel' => 'Economy',
                        'etaMinDays' => 4,
                        'etaMaxDays' => 7,
                        'priceMultiplier' => 0.92,
                        'maxDistanceKm' => null,
                        'maxWeightKg' => null,
                        'minLeadHours' => 0,
                        'maxLeadHours' => null,
                        'allowedPickupDays' => [1, 2, 3, 4, 5, 6, 7],
                        'blackoutDates' => [],
                    ],
                ],
            ],
            'internationalDimensionsEngine' => [
                'enabled' => false,
                'enforceForInternationalOnly' => true,
                'unitTypeMultipliers' => [
                    'parcel' => 1.0,
                    'pallet' => 1.18,
                    'crate' => 1.24,
                    'container_20ft' => 1.55,
                    'container_40ft' => 1.85,
                ],
                'routeClassMultipliers' => [
                    'standard' => 1.0,
                    'express_corridor' => 1.12,
                    'remote_corridor' => 1.22,
                    'multimodal' => 1.3,
                ],
                'handlingClassMultipliers' => [
                    'standard' => 1.0,
                    'fragile' => 1.08,
                    'hazardous' => 1.2,
                    'cold_chain' => 1.18,
                    'heavy_lift' => 1.26,
                ],
                'w2wOption' => [
                    'enabled' => true,
                    'strictForInternational' => true,
                    'defaultMode' => 'door_to_door',
                    'minimumUnitCount' => 1,
                    'maximumUnitCount' => null,
                    'modeMultipliers' => [
                        'door_to_door' => 1.15,
                        'port_to_port' => 0.92,
                        'hybrid' => 1.0,
                    ],
                ],
            ],
        ];

        return [
            'domestic' => $categoryDefaults,
            'international' => $categoryDefaults,
        ];
    }

    private function defaultPricingServiceCatalog(): array
    {
        return [
            'domestic' => [
                [
                    'key' => 'same_day',
                    'label' => 'Same Day',
                    'promisedSlaDays' => 1,
                    'cutoffTime' => '10:30',
                    'isActive' => true,
                    'sortOrder' => 1,
                ],
                [
                    'key' => 'next_day',
                    'label' => 'Next Day',
                    'promisedSlaDays' => 1,
                    'cutoffTime' => '15:00',
                    'isActive' => true,
                    'sortOrder' => 2,
                ],
                [
                    'key' => 'two_three_day',
                    'label' => '2-3 Day',
                    'promisedSlaDays' => 3,
                    'cutoffTime' => '17:00',
                    'isActive' => true,
                    'sortOrder' => 3,
                ],
                [
                    'key' => 'economy',
                    'label' => 'Economy',
                    'promisedSlaDays' => 5,
                    'cutoffTime' => '18:00',
                    'isActive' => true,
                    'sortOrder' => 4,
                ],
            ],
            'international' => [
                [
                    'key' => 'next_day',
                    'label' => 'Next Day',
                    'promisedSlaDays' => 2,
                    'cutoffTime' => '13:00',
                    'isActive' => true,
                    'sortOrder' => 1,
                ],
                [
                    'key' => 'two_three_day',
                    'label' => '2-3 Day',
                    'promisedSlaDays' => 3,
                    'cutoffTime' => '16:00',
                    'isActive' => true,
                    'sortOrder' => 2,
                ],
                [
                    'key' => 'economy',
                    'label' => 'Economy',
                    'promisedSlaDays' => 6,
                    'cutoffTime' => '18:00',
                    'isActive' => true,
                    'sortOrder' => 3,
                ],
            ],
        ];
    }

    private function defaultPricingGovernance(): array
    {
        return [
            'domestic' => [
                'requireApproval' => false,
                'approvalAuthority' => 'vendor',
                'approverRoles' => ['courier_owner', 'courier_admin'],
                'draftVersion' => 1,
                'publishedVersion' => 1,
                'publishedAt' => null,
                'publishedBy' => null,
                'pendingApproval' => null,
                'scheduledPublish' => null,
                'versionHistory' => [],
                'changeLog' => [],
            ],
            'international' => [
                'requireApproval' => false,
                'approvalAuthority' => 'vendor',
                'approverRoles' => ['courier_owner', 'courier_admin'],
                'draftVersion' => 1,
                'publishedVersion' => 1,
                'publishedAt' => null,
                'publishedBy' => null,
                'pendingApproval' => null,
                'scheduledPublish' => null,
                'versionHistory' => [],
                'changeLog' => [],
            ],
        ];
    }

    private function defaultPricingZoneMaster(): array
    {
        return [
            'domestic' => [],
            'international' => [],
        ];
    }

    private function normalizePricingSettings(array $pricing): array
    {
        $defaults = $this->defaultPricingSettings();
        $pricing = array_replace_recursive($defaults, $pricing);

        $localizationInput = is_array($pricing['localization'] ?? null) ? $pricing['localization'] : [];
        $hasCategoryLocalization = is_array($localizationInput['domestic'] ?? null) || is_array($localizationInput['international'] ?? null);
        if (!$hasCategoryLocalization) {
            $localizationInput = [
                'domestic' => $localizationInput,
                'international' => $localizationInput,
            ];
        }

        foreach (['domestic', 'international'] as $category) {
            $localization = array_replace(
                is_array($defaults['localization'][$category] ?? null) ? $defaults['localization'][$category] : [],
                is_array($localizationInput[$category] ?? null) ? $localizationInput[$category] : []
            );

            $baseCurrency = strtoupper((string) ($localization['baseCurrency'] ?? 'LKR'));
            $displayCurrency = strtoupper((string) ($localization['displayCurrency'] ?? $baseCurrency));
            $manualRates = is_array($localization['manualRates'] ?? null) ? $localization['manualRates'] : [];

            $normalizedRates = [];
            foreach ($manualRates as $currency => $rate) {
                $currency = strtoupper(trim((string) $currency));
                if ($currency === '' || strlen($currency) !== 3) {
                    continue;
                }
                $normalizedRates[$currency] = max(0.000001, (float) $rate);
            }
            $normalizedRates[$baseCurrency] = 1.0;

            $pricing['localization'][$category] = [
                'baseCurrency' => $baseCurrency,
                'displayCurrency' => $displayCurrency,
                'locale' => trim((string) ($localization['locale'] ?? 'en-LK')) ?: 'en-LK',
                'exchangeRateProvider' => trim((string) ($localization['exchangeRateProvider'] ?? 'frankfurter.app')) ?: 'frankfurter.app',
                'autoLiveRates' => (bool) ($localization['autoLiveRates'] ?? true),
                'manualRates' => $normalizedRates,
                'lastSyncedAt' => $localization['lastSyncedAt'] ?? null,
            ];
        }

        $formulaInput = is_array($pricing['formula'] ?? null) ? $pricing['formula'] : [];
        $hasCategoryFormula = is_array($formulaInput['domestic'] ?? null) || is_array($formulaInput['international'] ?? null);
        if (!$hasCategoryFormula) {
            $formulaInput = [
                'domestic' => $formulaInput,
                'international' => $formulaInput,
            ];
        }

        foreach (['domestic', 'international'] as $category) {
            $formula = array_replace(
                is_array($defaults['formula'][$category] ?? null) ? $defaults['formula'][$category] : [],
                is_array($formulaInput[$category] ?? null) ? $formulaInput[$category] : []
            );

            $pricing['formula'][$category] = [
                'volumetricDivisor' => max(1, (int) ($formula['volumetricDivisor'] ?? 5000)),
                'useChargeableWeight' => (bool) ($formula['useChargeableWeight'] ?? true),
                'fuelSurchargePercent' => max(0, (float) ($formula['fuelSurchargePercent'] ?? 0)),
                'handlingFee' => max(0, (float) ($formula['handlingFee'] ?? 0)),
                'taxPercent' => max(0, (float) ($formula['taxPercent'] ?? 0)),
                'roundTo' => max(0, min(4, (int) ($formula['roundTo'] ?? 2))),
            ];
        }

        $pricing['serviceCatalog'] = $this->normalizePricingServiceCatalog(
            is_array($pricing['serviceCatalog'] ?? null) ? $pricing['serviceCatalog'] : []
        );
        $pricing['zoneMaster'] = $this->normalizePricingZoneMaster(
            is_array($pricing['zoneMaster'] ?? null) ? $pricing['zoneMaster'] : []
        );
        $pricing['cityZoneMap'] = $this->normalizePricingCityZoneMap(
            is_array($pricing['cityZoneMap'] ?? null) ? $pricing['cityZoneMap'] : []
        );
        $pricing['laneMatrix'] = $this->normalizePricingLaneMatrix(
            is_array($pricing['laneMatrix'] ?? null) ? $pricing['laneMatrix'] : [],
            $pricing['serviceCatalog'],
            $pricing['zoneMaster']
        );
        $pricing['policyModules'] = $this->normalizePricingPolicyModules(
            is_array($pricing['policyModules'] ?? null) ? $pricing['policyModules'] : []
        );

        foreach (['domestic', 'international'] as $category) {
            $items = is_array($pricing['categories'][$category] ?? null) ? $pricing['categories'][$category] : [];
            $allowedServiceKeys = collect($pricing['serviceCatalog'][$category] ?? [])
                ->map(fn ($item) => (string) ($item['key'] ?? ''))
                ->filter()
                ->values()
                ->all();
            $defaultServiceKey = $allowedServiceKeys[0] ?? 'economy';

            $pricing['categories'][$category] = collect($items)
                ->map(function ($item, $index) use ($category, $allowedServiceKeys, $defaultServiceKey) {
                    $row = is_array($item) ? $item : [];
                    $serviceLevelKey = $this->normalizeServiceLevelKey((string) ($row['serviceLevelKey'] ?? ''));
                    if (!in_array($serviceLevelKey, $allowedServiceKeys, true)) {
                        $serviceLevelKey = $defaultServiceKey;
                    }

                    return [
                        'id' => trim((string) ($row['id'] ?? "{$category}_tier_{$index}")) ?: "{$category}_tier_{$index}",
                        'label' => trim((string) ($row['label'] ?? 'Tier')) ?: 'Tier',
                        'serviceLevelKey' => $serviceLevelKey,
                        'slaDays' => max(1, (int) ($row['slaDays'] ?? 1)),
                        'basePrice' => max(0, (float) ($row['basePrice'] ?? 0)),
                        'perKgPrice' => max(0, (float) ($row['perKgPrice'] ?? 0)),
                        'minPrice' => max(0, (float) ($row['minPrice'] ?? 0)),
                        'priorityMultiplier' => max(0.1, (float) ($row['priorityMultiplier'] ?? 1)),
                    ];
                })
                ->values()
                ->all();
        }

        $governanceInput = is_array($pricing['governance'] ?? null) ? $pricing['governance'] : [];
        $defaultGovernance = $this->defaultPricingGovernance();
        $hasCategoryGovernance = is_array($governanceInput['domestic'] ?? null) || is_array($governanceInput['international'] ?? null);
        if (!$hasCategoryGovernance) {
            $governanceInput = [
                'domestic' => $governanceInput,
                'international' => $governanceInput,
            ];
        }

        foreach (['domestic', 'international'] as $category) {
            $governance = array_replace(
                is_array($defaultGovernance[$category] ?? null) ? $defaultGovernance[$category] : [],
                is_array($governanceInput[$category] ?? null) ? $governanceInput[$category] : []
            );

            $approvalAuthority = strtolower(trim((string) ($governance['approvalAuthority'] ?? 'vendor')));
            if (!in_array($approvalAuthority, ['vendor', 'superadmin'], true)) {
                $approvalAuthority = 'vendor';
            }

            $governance['approvalAuthority'] = $approvalAuthority;
            $governance['requireApproval'] = (bool) ($governance['requireApproval'] ?? false);
            if ($approvalAuthority === 'superadmin') {
                $governance['requireApproval'] = true;
            }
            $governance['approverRoles'] = collect($governance['approverRoles'] ?? ($defaultGovernance[$category]['approverRoles'] ?? []))
                ->map(fn ($role) => trim((string) $role))
                ->filter()
                ->unique()
                ->values()
                ->all();
            $governance['draftVersion'] = max(1, (int) ($governance['draftVersion'] ?? 1));
            $governance['publishedVersion'] = max(1, (int) ($governance['publishedVersion'] ?? 1));
            $governance['versionHistory'] = collect($governance['versionHistory'] ?? [])
                ->filter(fn ($entry) => is_array($entry))
                ->map(function ($entry) {
                    $item = is_array($entry) ? $entry : [];
                    return [
                        'version' => max(1, (int) ($item['version'] ?? 1)),
                        'publishedAt' => $item['publishedAt'] ?? null,
                        'publishedBy' => isset($item['publishedBy']) ? (int) $item['publishedBy'] : null,
                        'event' => trim((string) ($item['event'] ?? 'published_now')),
                        'snapshot' => is_array($item['snapshot'] ?? null) ? $item['snapshot'] : [],
                        'meta' => is_array($item['meta'] ?? null) ? $item['meta'] : [],
                    ];
                })
                ->take(25)
                ->values()
                ->all();
            $governance['changeLog'] = collect($governance['changeLog'] ?? [])
                ->filter(fn ($entry) => is_array($entry))
                ->take(50)
                ->values()
                ->all();

            $pricing['governance'][$category] = $governance;
        }

        return $pricing;
    }

    private function normalizePricingPolicyModules(array $input): array
    {
        $defaults = $this->defaultPricingPolicyModules();
        $source = is_array($input) ? $input : [];
        $hasCategoryShape = is_array($source['domestic'] ?? null) || is_array($source['international'] ?? null);
        if (!$hasCategoryShape) {
            $source = [
                'domestic' => $source,
                'international' => $source,
            ];
        }

        $normalized = [];
        foreach (['domestic', 'international'] as $category) {
            $row = array_replace_recursive(
                is_array($defaults[$category] ?? null) ? $defaults[$category] : [],
                is_array($source[$category] ?? null) ? $source[$category] : []
            );

            $normalized[$category] = [
                'remoteAreaSurcharge' => [
                    'enabled' => (bool) ($row['remoteAreaSurcharge']['enabled'] ?? false),
                    'flatFee' => max(0, (float) ($row['remoteAreaSurcharge']['flatFee'] ?? 0)),
                    'applyOnOrigin' => (bool) ($row['remoteAreaSurcharge']['applyOnOrigin'] ?? false),
                    'applyOnDestination' => (bool) ($row['remoteAreaSurcharge']['applyOnDestination'] ?? true),
                    'postalCodePrefixes' => collect($row['remoteAreaSurcharge']['postalCodePrefixes'] ?? [])
                        ->map(fn ($item) => strtoupper(trim((string) $item)))
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                    'cityKeywords' => collect($row['remoteAreaSurcharge']['cityKeywords'] ?? [])
                        ->map(fn ($item) => strtolower(trim((string) $item)))
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                ],
                'oversizeOverweightRules' => [
                    'enabled' => (bool) ($row['oversizeOverweightRules']['enabled'] ?? false),
                    'maxWeightKg' => max(0.1, (float) ($row['oversizeOverweightRules']['maxWeightKg'] ?? 25)),
                    'overweightPerKgFee' => max(0, (float) ($row['oversizeOverweightRules']['overweightPerKgFee'] ?? 0)),
                    'maxLengthCm' => max(1, (float) ($row['oversizeOverweightRules']['maxLengthCm'] ?? 120)),
                    'maxWidthCm' => max(1, (float) ($row['oversizeOverweightRules']['maxWidthCm'] ?? 80)),
                    'maxHeightCm' => max(1, (float) ($row['oversizeOverweightRules']['maxHeightCm'] ?? 80)),
                    'oversizeFlatFee' => max(0, (float) ($row['oversizeOverweightRules']['oversizeFlatFee'] ?? 0)),
                ],
                'peakHolidaySurcharge' => [
                    'enabled' => (bool) ($row['peakHolidaySurcharge']['enabled'] ?? false),
                    'peakStartTime' => $this->normalizeTimeValue((string) ($row['peakHolidaySurcharge']['peakStartTime'] ?? '17:00')),
                    'peakEndTime' => $this->normalizeTimeValue((string) ($row['peakHolidaySurcharge']['peakEndTime'] ?? '21:00')),
                    'daysOfWeek' => collect($row['peakHolidaySurcharge']['daysOfWeek'] ?? [1, 2, 3, 4, 5])
                        ->map(fn ($item) => (int) $item)
                        ->filter(fn ($item) => $item >= 1 && $item <= 7)
                        ->unique()
                        ->values()
                        ->all(),
                    'peakPercent' => max(0, (float) ($row['peakHolidaySurcharge']['peakPercent'] ?? 0)),
                    'peakFlatFee' => max(0, (float) ($row['peakHolidaySurcharge']['peakFlatFee'] ?? 0)),
                    'holidayDates' => collect($row['peakHolidaySurcharge']['holidayDates'] ?? [])
                        ->map(fn ($item) => trim((string) $item))
                        ->filter(fn ($item) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $item) === 1)
                        ->unique()
                        ->values()
                        ->all(),
                    'holidayPercent' => max(0, (float) ($row['peakHolidaySurcharge']['holidayPercent'] ?? 0)),
                    'holidayFlatFee' => max(0, (float) ($row['peakHolidaySurcharge']['holidayFlatFee'] ?? 0)),
                ],
                'codFee' => [
                    'enabled' => (bool) ($row['codFee']['enabled'] ?? false),
                    'flatFee' => max(0, (float) ($row['codFee']['flatFee'] ?? 0)),
                    'percentOfDeclaredValue' => max(0, (float) ($row['codFee']['percentOfDeclaredValue'] ?? 0)),
                    'minFee' => max(0, (float) ($row['codFee']['minFee'] ?? 0)),
                    'maxFee' => isset($row['codFee']['maxFee']) && $row['codFee']['maxFee'] !== ''
                        ? max(0, (float) $row['codFee']['maxFee'])
                        : null,
                ],
                'minimumShipmentCharge' => [
                    'enabled' => (bool) ($row['minimumShipmentCharge']['enabled'] ?? true),
                    'minimumTotal' => max(0, (float) ($row['minimumShipmentCharge']['minimumTotal'] ?? 0)),
                ],
                'customerContractPricing' => [
                    'enabled' => (bool) ($row['customerContractPricing']['enabled'] ?? false),
                    'contracts' => collect($row['customerContractPricing']['contracts'] ?? [])
                        ->map(function ($contract) use ($category) {
                            $item = is_array($contract) ? $contract : [];
                            $allowedCategories = ['domestic', 'international'];
                            $normalizedContractCategory = strtolower(trim((string) ($item['category'] ?? '')));
                            if (!in_array($normalizedContractCategory, $allowedCategories, true)) {
                                $normalizedContractCategory = $category;
                            }

                            $normalizedContractCategories = collect($item['categories'] ?? [])
                                ->map(fn ($value) => strtolower(trim((string) $value)))
                                ->filter(fn ($value) => in_array($value, $allowedCategories, true))
                                ->unique()
                                ->values()
                                ->all();
                            if (empty($normalizedContractCategories)) {
                                $normalizedContractCategories = [$normalizedContractCategory];
                            }

                            $effectiveFrom = trim((string) ($item['effectiveFrom'] ?? ''));
                            $effectiveTo = trim((string) ($item['effectiveTo'] ?? ''));
                            $renewalCycleDays = max(0, (int) ($item['renewalCycleDays'] ?? 0));
                            $renewalGraceDays = max(0, (int) ($item['renewalGraceDays'] ?? 0));
                            $maxRenewals = max(0, (int) ($item['maxRenewals'] ?? 0));

                            $volumeLookbackDays = max(1, (int) ($item['volumeLookbackDays'] ?? 30));
                            $volumeMetric = strtolower(trim((string) ($item['volumeMetric'] ?? 'shipment_count_30d')));
                            if ($volumeMetric === '') {
                                $volumeMetric = 'shipment_count_30d';
                            }

                            $volumeTiers = collect($item['volumeTiers'] ?? [])
                                ->map(function ($tier) {
                                    $tierRow = is_array($tier) ? $tier : [];
                                    $minVolume = max(0, (float) ($tierRow['minVolume'] ?? 0));
                                    $hasMaxVolume = isset($tierRow['maxVolume']) && $tierRow['maxVolume'] !== '' && $tierRow['maxVolume'] !== null;

                                    return [
                                        'enabled' => (bool) ($tierRow['enabled'] ?? true),
                                        'minVolume' => $minVolume,
                                        'maxVolume' => $hasMaxVolume ? max($minVolume, (float) $tierRow['maxVolume']) : null,
                                        'adjustmentType' => strtolower(trim((string) ($tierRow['adjustmentType'] ?? 'percent_off'))),
                                        'adjustmentValue' => max(0, (float) ($tierRow['adjustmentValue'] ?? 0)),
                                    ];
                                })
                                ->values()
                                ->all();

                            return [
                                'enabled' => (bool) ($item['enabled'] ?? true),
                                'priority' => (int) ($item['priority'] ?? 0),
                                'allAccounts' => (bool) ($item['allAccounts'] ?? false),
                                'accountUserId' => (int) ($item['accountUserId'] ?? 0),
                                'accountUserIds' => collect($item['accountUserIds'] ?? [])
                                    ->map(fn ($value) => (int) $value)
                                    ->filter(fn ($value) => $value > 0)
                                    ->unique()
                                    ->values()
                                    ->all(),
                                'category' => $normalizedContractCategory,
                                'categories' => $normalizedContractCategories,
                                'effectiveFrom' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $effectiveFrom) === 1 ? $effectiveFrom : null,
                                'effectiveTo' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $effectiveTo) === 1 ? $effectiveTo : null,
                                'autoRenew' => (bool) ($item['autoRenew'] ?? false),
                                'renewalCycleDays' => $renewalCycleDays,
                                'renewalGraceDays' => $renewalGraceDays,
                                'maxRenewals' => $maxRenewals,
                                'negotiatedRateType' => strtolower(trim((string) ($item['negotiatedRateType'] ?? ''))),
                                'negotiatedRateValue' => max(0, (float) ($item['negotiatedRateValue'] ?? 0)),
                                'minimumTotal' => max(0, (float) ($item['minimumTotal'] ?? 0)),
                                'volumeMetric' => $volumeMetric,
                                'volumeLookbackDays' => $volumeLookbackDays,
                                'volumeTiers' => $volumeTiers,
                            ];
                        })
                        ->values()
                        ->all(),
                ],
                'quoteRuntimeGovernance' => [
                    'enabled' => (bool) ($row['quoteRuntimeGovernance']['enabled'] ?? false),
                    'fieldLocks' => [
                        'enabled' => (bool) ($row['quoteRuntimeGovernance']['fieldLocks']['enabled'] ?? false),
                        'lockShipmentServiceLevel' => (bool) ($row['quoteRuntimeGovernance']['fieldLocks']['lockShipmentServiceLevel'] ?? true),
                        'lockPackageServiceLevel' => (bool) ($row['quoteRuntimeGovernance']['fieldLocks']['lockPackageServiceLevel'] ?? true),
                        'lockPackageCourierProvider' => (bool) ($row['quoteRuntimeGovernance']['fieldLocks']['lockPackageCourierProvider'] ?? true),
                        'lockQuoteTotal' => (bool) ($row['quoteRuntimeGovernance']['fieldLocks']['lockQuoteTotal'] ?? true),
                    ],
                    'discountGuardrails' => [
                        'enabled' => (bool) ($row['quoteRuntimeGovernance']['discountGuardrails']['enabled'] ?? false),
                        'maxDiscountPercent' => max(0, (float) ($row['quoteRuntimeGovernance']['discountGuardrails']['maxDiscountPercent'] ?? 0)),
                        'maxDiscountAmountUsd' => max(0, (float) ($row['quoteRuntimeGovernance']['discountGuardrails']['maxDiscountAmountUsd'] ?? 0)),
                    ],
                    'floorPriceGuardrail' => [
                        'enabled' => (bool) ($row['quoteRuntimeGovernance']['floorPriceGuardrail']['enabled'] ?? false),
                        'minimumTotalUsd' => max(0, (float) ($row['quoteRuntimeGovernance']['floorPriceGuardrail']['minimumTotalUsd'] ?? 0)),
                    ],
                ],
                'speedEtaTierEngine' => [
                    'enabled' => (bool) ($row['speedEtaTierEngine']['enabled'] ?? false),
                    'enforceFixedNamedTiers' => (bool) ($row['speedEtaTierEngine']['enforceFixedNamedTiers'] ?? true),
                    'enforceTierPricingMultiplier' => (bool) ($row['speedEtaTierEngine']['enforceTierPricingMultiplier'] ?? true),
                    'tiers' => collect(array_values(array_unique(array_merge(
                        array_keys(is_array($defaults[$category]['speedEtaTierEngine']['tiers'] ?? null) ? $defaults[$category]['speedEtaTierEngine']['tiers'] : []),
                        array_keys(is_array($row['speedEtaTierEngine']['tiers'] ?? null) ? $row['speedEtaTierEngine']['tiers'] : [])
                    ))))
                        ->mapWithKeys(function ($tierKey) use ($row, $defaults, $category) {
                            $fallbackTier = is_array($defaults[$category]['speedEtaTierEngine']['tiers'][$tierKey] ?? null)
                                ? $defaults[$category]['speedEtaTierEngine']['tiers'][$tierKey]
                                : [];
                            $tierInput = is_array($row['speedEtaTierEngine']['tiers'][$tierKey] ?? null)
                                ? $row['speedEtaTierEngine']['tiers'][$tierKey]
                                : [];
                            $tierRow = array_replace(
                                is_array($fallbackTier) ? $fallbackTier : [],
                                is_array($tierInput) ? $tierInput : []
                            );

                            $etaMinDays = max(0, (int) ($tierRow['etaMinDays'] ?? 0));
                            $etaMaxDays = isset($tierRow['etaMaxDays']) && $tierRow['etaMaxDays'] !== '' && $tierRow['etaMaxDays'] !== null
                                ? max($etaMinDays, (int) $tierRow['etaMaxDays'])
                                : null;
                            $minLeadHours = max(0, (float) ($tierRow['minLeadHours'] ?? 0));
                            $maxLeadHours = isset($tierRow['maxLeadHours']) && $tierRow['maxLeadHours'] !== '' && $tierRow['maxLeadHours'] !== null
                                ? max($minLeadHours, (float) $tierRow['maxLeadHours'])
                                : null;
                            $allowedPickupDays = collect($tierRow['allowedPickupDays'] ?? [1, 2, 3, 4, 5, 6, 7])
                                ->map(fn ($item) => (int) $item)
                                ->filter(fn ($item) => $item >= 1 && $item <= 7)
                                ->unique()
                                ->values()
                                ->all();

                            return [
                                $tierKey => [
                                    'enabled' => (bool) ($tierRow['enabled'] ?? true),
                                    'etaLabel' => trim((string) ($tierRow['etaLabel'] ?? '')) ?: ucwords(str_replace('_', ' ', (string) $tierKey)),
                                    'etaMinDays' => $etaMinDays,
                                    'etaMaxDays' => $etaMaxDays,
                                    'priceMultiplier' => max(0.1, (float) ($tierRow['priceMultiplier'] ?? 1)),
                                    'maxDistanceKm' => isset($tierRow['maxDistanceKm']) && $tierRow['maxDistanceKm'] !== '' && $tierRow['maxDistanceKm'] !== null
                                        ? max(0.1, (float) $tierRow['maxDistanceKm'])
                                        : null,
                                    'maxWeightKg' => isset($tierRow['maxWeightKg']) && $tierRow['maxWeightKg'] !== '' && $tierRow['maxWeightKg'] !== null
                                        ? max(0.1, (float) $tierRow['maxWeightKg'])
                                        : null,
                                    'minLeadHours' => $minLeadHours,
                                    'maxLeadHours' => $maxLeadHours,
                                    'allowedPickupDays' => !empty($allowedPickupDays) ? $allowedPickupDays : [1, 2, 3, 4, 5, 6, 7],
                                    'blackoutDates' => collect($tierRow['blackoutDates'] ?? [])
                                        ->map(fn ($item) => trim((string) $item))
                                        ->filter(fn ($item) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $item) === 1)
                                        ->unique()
                                        ->values()
                                        ->all(),
                                ],
                            ];
                        })
                        ->all(),
                ],
                'internationalDimensionsEngine' => [
                    'enabled' => (bool) ($row['internationalDimensionsEngine']['enabled'] ?? false),
                    'enforceForInternationalOnly' => (bool) ($row['internationalDimensionsEngine']['enforceForInternationalOnly'] ?? true),
                    'unitTypeMultipliers' => collect($row['internationalDimensionsEngine']['unitTypeMultipliers'] ?? [])
                        ->mapWithKeys(function ($value, $key) {
                            $normalizedKey = strtolower(trim((string) $key));
                            if ($normalizedKey === '') {
                                return [];
                            }

                            return [$normalizedKey => max(0.1, (float) $value)];
                        })
                        ->all(),
                    'routeClassMultipliers' => collect($row['internationalDimensionsEngine']['routeClassMultipliers'] ?? [])
                        ->mapWithKeys(function ($value, $key) {
                            $normalizedKey = strtolower(trim((string) $key));
                            if ($normalizedKey === '') {
                                return [];
                            }

                            return [$normalizedKey => max(0.1, (float) $value)];
                        })
                        ->all(),
                    'handlingClassMultipliers' => collect($row['internationalDimensionsEngine']['handlingClassMultipliers'] ?? [])
                        ->mapWithKeys(function ($value, $key) {
                            $normalizedKey = strtolower(trim((string) $key));
                            if ($normalizedKey === '') {
                                return [];
                            }

                            return [$normalizedKey => max(0.1, (float) $value)];
                        })
                        ->all(),
                    'w2wOption' => [
                        'enabled' => (bool) ($row['internationalDimensionsEngine']['w2wOption']['enabled'] ?? true),
                        'strictForInternational' => (bool) ($row['internationalDimensionsEngine']['w2wOption']['strictForInternational'] ?? true),
                        'defaultMode' => strtolower(trim((string) ($row['internationalDimensionsEngine']['w2wOption']['defaultMode'] ?? ''))),
                        'minimumUnitCount' => max(1, (int) ($row['internationalDimensionsEngine']['w2wOption']['minimumUnitCount'] ?? 1)),
                        'maximumUnitCount' => isset($row['internationalDimensionsEngine']['w2wOption']['maximumUnitCount'])
                            && $row['internationalDimensionsEngine']['w2wOption']['maximumUnitCount'] !== ''
                            && $row['internationalDimensionsEngine']['w2wOption']['maximumUnitCount'] !== null
                            ? max(1, (int) $row['internationalDimensionsEngine']['w2wOption']['maximumUnitCount'])
                            : null,
                        'modeMultipliers' => collect($row['internationalDimensionsEngine']['w2wOption']['modeMultipliers'] ?? [])
                            ->mapWithKeys(function ($value, $key) {
                                $normalizedKey = strtolower(trim((string) $key));
                                if ($normalizedKey === '') {
                                    return [];
                                }

                                return [$normalizedKey => max(0.1, (float) $value)];
                            })
                            ->all(),
                    ],
                ],
            ];
        }

        return $normalized;
    }

    private function extractPricingSnapshot(array $pricing, ?string $category = null): array
    {
        $category = in_array((string) $category, ['domestic', 'international'], true) ? (string) $category : null;

        if ($category !== null) {
            return [
                'category' => $category,
                'localization' => is_array($pricing['localization'][$category] ?? null) ? $pricing['localization'][$category] : [],
                'formula' => is_array($pricing['formula'][$category] ?? null) ? $pricing['formula'][$category] : [],
                'serviceCatalog' => is_array($pricing['serviceCatalog'][$category] ?? null) ? $pricing['serviceCatalog'][$category] : [],
                'zoneMaster' => is_array($pricing['zoneMaster'][$category] ?? null) ? $pricing['zoneMaster'][$category] : [],
                'cityZoneMap' => is_array($pricing['cityZoneMap'][$category] ?? null) ? $pricing['cityZoneMap'][$category] : [],
                'laneMatrix' => [
                    'enabled' => (bool) ((is_array($pricing['laneMatrix']['enabled'] ?? null)
                        ? ($pricing['laneMatrix']['enabled'][$category] ?? false)
                        : ($pricing['laneMatrix']['enabled'] ?? false))),
                    'rows' => is_array($pricing['laneMatrix'][$category] ?? null) ? $pricing['laneMatrix'][$category] : [],
                ],
                'policyModules' => is_array($pricing['policyModules'][$category] ?? null) ? $pricing['policyModules'][$category] : [],
                'categories' => is_array($pricing['categories'][$category] ?? null) ? $pricing['categories'][$category] : [],
            ];
        }

        return [
            'localization' => is_array($pricing['localization'] ?? null) ? $pricing['localization'] : [],
            'formula' => is_array($pricing['formula'] ?? null) ? $pricing['formula'] : [],
            'serviceCatalog' => is_array($pricing['serviceCatalog'] ?? null) ? $pricing['serviceCatalog'] : [],
            'zoneMaster' => is_array($pricing['zoneMaster'] ?? null) ? $pricing['zoneMaster'] : [],
            'cityZoneMap' => is_array($pricing['cityZoneMap'] ?? null) ? $pricing['cityZoneMap'] : [],
            'laneMatrix' => is_array($pricing['laneMatrix'] ?? null) ? $pricing['laneMatrix'] : [],
            'policyModules' => is_array($pricing['policyModules'] ?? null) ? $pricing['policyModules'] : [],
            'categories' => is_array($pricing['categories'] ?? null) ? $pricing['categories'] : [],
        ];
    }

    private function applyPricingSnapshot(array $pricing, array $snapshot, ?string $category = null): array
    {
        $categoryFromSnapshot = in_array((string) ($snapshot['category'] ?? ''), ['domestic', 'international'], true)
            ? (string) $snapshot['category']
            : null;
        $category = in_array((string) $category, ['domestic', 'international'], true) ? (string) $category : $categoryFromSnapshot;

        if ($category !== null) {
            $pricing['localization'][$category] = is_array($snapshot['localization'] ?? null) ? $snapshot['localization'] : ($pricing['localization'][$category] ?? []);
            $pricing['formula'][$category] = is_array($snapshot['formula'] ?? null) ? $snapshot['formula'] : ($pricing['formula'][$category] ?? []);
            $pricing['serviceCatalog'][$category] = is_array($snapshot['serviceCatalog'] ?? null) ? $snapshot['serviceCatalog'] : ($pricing['serviceCatalog'][$category] ?? []);
            $pricing['zoneMaster'][$category] = is_array($snapshot['zoneMaster'] ?? null) ? $snapshot['zoneMaster'] : ($pricing['zoneMaster'][$category] ?? []);
            $pricing['cityZoneMap'][$category] = is_array($snapshot['cityZoneMap'] ?? null)
                ? $snapshot['cityZoneMap']
                : ($pricing['cityZoneMap'][$category] ?? []);
            $pricing['laneMatrix']['enabled'] = is_array($pricing['laneMatrix']['enabled'] ?? null) ? $pricing['laneMatrix']['enabled'] : [
                'domestic' => (bool) ($pricing['laneMatrix']['enabled'] ?? false),
                'international' => (bool) ($pricing['laneMatrix']['enabled'] ?? false),
            ];
            $pricing['laneMatrix']['enabled'][$category] = (bool) ($snapshot['laneMatrix']['enabled'] ?? false);
            $pricing['laneMatrix'][$category] = is_array($snapshot['laneMatrix']['rows'] ?? null)
                ? $snapshot['laneMatrix']['rows']
                : ($pricing['laneMatrix'][$category] ?? []);
            $pricing['policyModules'][$category] = is_array($snapshot['policyModules'] ?? null)
                ? $snapshot['policyModules']
                : ($pricing['policyModules'][$category] ?? []);
            $pricing['categories'][$category] = is_array($snapshot['categories'] ?? null) ? $snapshot['categories'] : ($pricing['categories'][$category] ?? []);

            return $this->normalizePricingSettings($pricing);
        }

        $pricing['localization'] = is_array($snapshot['localization'] ?? null) ? $snapshot['localization'] : ($pricing['localization'] ?? []);
        $pricing['formula'] = is_array($snapshot['formula'] ?? null) ? $snapshot['formula'] : ($pricing['formula'] ?? []);
        $pricing['serviceCatalog'] = is_array($snapshot['serviceCatalog'] ?? null) ? $snapshot['serviceCatalog'] : ($pricing['serviceCatalog'] ?? []);
        $pricing['zoneMaster'] = is_array($snapshot['zoneMaster'] ?? null) ? $snapshot['zoneMaster'] : ($pricing['zoneMaster'] ?? []);
        $pricing['cityZoneMap'] = is_array($snapshot['cityZoneMap'] ?? null) ? $snapshot['cityZoneMap'] : ($pricing['cityZoneMap'] ?? []);
        $pricing['laneMatrix'] = is_array($snapshot['laneMatrix'] ?? null) ? $snapshot['laneMatrix'] : ($pricing['laneMatrix'] ?? []);
        $pricing['policyModules'] = is_array($snapshot['policyModules'] ?? null) ? $snapshot['policyModules'] : ($pricing['policyModules'] ?? []);
        $pricing['categories'] = is_array($snapshot['categories'] ?? null) ? $snapshot['categories'] : ($pricing['categories'] ?? []);

        return $this->normalizePricingSettings($pricing);
    }

    private function normalizePricingZoneMaster(array $input): array
    {
        $isCategoryShape = is_array($input['domestic'] ?? null) || is_array($input['international'] ?? null);
        $flatRows = $isCategoryShape ? [] : (array_values($input) === $input ? $input : []);

        $normalized = [];
        foreach (['domestic', 'international'] as $category) {
            $source = $isCategoryShape
                ? (is_array($input[$category] ?? null) ? $input[$category] : [])
                : $flatRows;

            $rows = $this->normalizePricingZoneRows($source);
            $normalized[$category] = $rows;
        }

        return $normalized;
    }

    private function normalizePricingZoneRows(array $source): array
    {
        return collect($source)
            ->map(function ($item, $index) {
                $row = is_array($item) ? $item : [];
                $key = $this->normalizeZoneKey((string) ($row['key'] ?? $row['label'] ?? ''));
                $label = trim((string) ($row['label'] ?? ''));

                return [
                    'key' => $key,
                    'label' => $label !== '' ? $label : ucwords(str_replace('_', ' ', $key)),
                    'isActive' => (bool) ($row['isActive'] ?? true),
                    'sortOrder' => max(1, (int) ($row['sortOrder'] ?? ($index + 1))),
                ];
            })
            ->filter(fn ($row) => ($row['key'] ?? '') !== '*' && trim((string) ($row['key'] ?? '')) !== '')
            ->unique('key')
            ->sortBy('sortOrder')
            ->values()
            ->all();
    }

    private function normalizePricingCityZoneMap(array $input): array
    {
        $isCategoryShape = is_array($input['domestic'] ?? null) || is_array($input['international'] ?? null);
        $flatRows = $isCategoryShape ? [] : (array_values($input) === $input ? $input : []);

        $normalized = [];
        foreach (['domestic', 'international'] as $category) {
            $source = $isCategoryShape
                ? (is_array($input[$category] ?? null) ? $input[$category] : [])
                : $flatRows;

            $rows = collect($source)
                ->map(function ($item) {
                    $row = is_array($item) ? $item : [];
                    $city = trim((string) ($row['city'] ?? ''));
                    $cityKey = strtolower(trim((string) ($row['cityKey'] ?? '')));
                    $cityKey = preg_replace('/[^a-z0-9]+/i', '_', $cityKey) ?? '';
                    $cityKey = trim((string) $cityKey, '_');

                    if ($cityKey === '' && $city !== '') {
                        $cityKey = strtolower($city);
                        $cityKey = preg_replace('/[^a-z0-9]+/i', '_', $cityKey) ?? '';
                        $cityKey = trim((string) $cityKey, '_');
                    }

                    $zone = $this->normalizeZoneKey((string) ($row['zone'] ?? ''));
                    if ($cityKey === '' || $zone === '*' || $zone === '') {
                        return null;
                    }

                    $zonesInput = is_array($row['zones'] ?? null) ? $row['zones'] : [];
                    $zones = [];
                    foreach ($zonesInput as $zoneKey => $votes) {
                        $normalizedZone = $this->normalizeZoneKey((string) $zoneKey);
                        if ($normalizedZone === '*' || $normalizedZone === '') {
                            continue;
                        }

                        $zones[$normalizedZone] = max(0, (int) $votes);
                    }

                    if (!isset($zones[$zone])) {
                        $zones[$zone] = max(1, (int) ($row['votes'] ?? 1));
                    }

                    arsort($zones);
                    $recommendedZone = (string) array_key_first($zones);
                    $topVotes = (int) ($zones[$recommendedZone] ?? 0);
                    $totalVotes = max(1, array_sum($zones));

                    return [
                        'cityKey' => $cityKey,
                        'city' => $city !== '' ? $city : ucwords(str_replace('_', ' ', $cityKey)),
                        'zone' => $recommendedZone,
                        'zones' => $zones,
                        'isConflict' => count($zones) > 1,
                        'recommendedConfidence' => round($topVotes / $totalVotes, 2),
                    ];
                })
                ->filter(fn ($row) => is_array($row))
                ->keyBy(fn ($row) => (string) ($row['cityKey'] ?? ''))
                ->values()
                ->all();

            $normalized[$category] = $rows;
        }

        return $normalized;
    }

    private function normalizePricingServiceCatalog(array $input): array
    {
        $defaults = $this->defaultPricingServiceCatalog();
        $normalized = [];

        foreach (['domestic', 'international'] as $category) {
            $source = is_array($input[$category] ?? null) ? $input[$category] : ($defaults[$category] ?? []);
            $fallback = is_array($defaults[$category] ?? null) ? $defaults[$category] : [];

            $rows = collect($source)
                ->map(function ($item, $index) use ($fallback) {
                    $row = is_array($item) ? $item : [];
                    $fallbackItem = $fallback[$index] ?? [];

                    $key = $this->normalizeServiceLevelKey((string) ($row['key'] ?? ($fallbackItem['key'] ?? '')));
                    $label = trim((string) ($row['label'] ?? ($fallbackItem['label'] ?? 'Service Level')));
                    $cutoff = $this->normalizeTimeValue((string) ($row['cutoffTime'] ?? ($fallbackItem['cutoffTime'] ?? '18:00')));

                    return [
                        'key' => $key !== '' ? $key : 'service_level_' . ($index + 1),
                        'label' => $label !== '' ? $label : 'Service Level',
                        'promisedSlaDays' => max(1, (int) ($row['promisedSlaDays'] ?? ($fallbackItem['promisedSlaDays'] ?? 1))),
                        'cutoffTime' => $cutoff,
                        'isActive' => (bool) ($row['isActive'] ?? ($fallbackItem['isActive'] ?? true)),
                        'sortOrder' => max(1, (int) ($row['sortOrder'] ?? ($fallbackItem['sortOrder'] ?? ($index + 1)))),
                    ];
                })
                ->filter(fn ($row) => trim((string) ($row['key'] ?? '')) !== '')
                ->unique('key')
                ->sortBy('sortOrder')
                ->values()
                ->all();

            if (empty($rows)) {
                $rows = $defaults[$category] ?? [];
            }

            $normalized[$category] = $rows;
        }

        return $normalized;
    }

    private function normalizeServiceLevelKey(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');

        return match ($normalized) {
            'priority_4h', 'priority4h', 'priority_4_hours', 'priority_4hour', '4h', 'rush_4h', 'rush4h' => 'priority_4h',
            'same_day', 'sameday' => 'same_day',
            'next_day', 'nextday', 'express', 'one_day', 'oneday' => 'next_day',
            '2_3_day', '2_3_days', 'two_three_day', 'standard', 'within_3_days' => 'two_three_day',
            default => $normalized,
        };
    }

    private function normalizePricingLaneMatrix(array $input, array $serviceCatalog, array $zoneMaster): array
    {
        $normalized = array_replace([
            'enabled' => [
                'domestic' => false,
                'international' => false,
            ],
            'domestic' => [],
            'international' => [],
        ], $input);

        $enabledInput = $normalized['enabled'] ?? false;
        if (!is_array($enabledInput)) {
            $enabledInput = [
                'domestic' => (bool) $enabledInput,
                'international' => (bool) $enabledInput,
            ];
        }
        $normalized['enabled'] = [
            'domestic' => (bool) ($enabledInput['domestic'] ?? false),
            'international' => (bool) ($enabledInput['international'] ?? false),
        ];

        foreach (['domestic', 'international'] as $category) {
            $items = is_array($normalized[$category] ?? null) ? $normalized[$category] : [];
            $allowedServiceKeys = collect($serviceCatalog[$category] ?? [])
                ->map(fn ($item) => (string) ($item['key'] ?? ''))
                ->filter()
                ->values()
                ->all();
            $allowedZones = collect($zoneMaster[$category] ?? [])
                ->filter(fn ($zone) => (bool) ($zone['isActive'] ?? true))
                ->map(fn ($zone) => $this->normalizeZoneKey((string) ($zone['key'] ?? '')))
                ->filter(fn ($zone) => $zone !== '*' && $zone !== '')
                ->values()
                ->all();
            $defaultServiceKey = $allowedServiceKeys[0] ?? 'economy';
            $defaultZone = $allowedZones[0] ?? '*';

            $normalized[$category] = collect($items)
                ->map(function ($item, $index) use ($category, $allowedServiceKeys, $defaultServiceKey, $allowedZones, $defaultZone) {
                    $row = is_array($item) ? $item : [];
                    $distanceFrom = max(0, (float) ($row['distanceFromKm'] ?? 0));
                    $distanceTo = isset($row['distanceToKm']) && $row['distanceToKm'] !== ''
                        ? max($distanceFrom, (float) $row['distanceToKm'])
                        : null;

                    $serviceLevelKey = $this->normalizeServiceLevelKey((string) ($row['serviceLevelKey'] ?? ''));
                    if (!in_array($serviceLevelKey, $allowedServiceKeys, true)) {
                        $serviceLevelKey = $defaultServiceKey;
                    }

                    $originZone = $this->normalizeZoneKey((string) ($row['originZone'] ?? '*'));
                    if ($originZone !== '*' && !in_array($originZone, $allowedZones, true)) {
                        $originZone = $defaultZone;
                    }

                    $destinationZone = $this->normalizeZoneKey((string) ($row['destinationZone'] ?? '*'));
                    if ($destinationZone !== '*' && !in_array($destinationZone, $allowedZones, true)) {
                        $destinationZone = $defaultZone;
                    }

                    return [
                        'id' => trim((string) ($row['id'] ?? "{$category}_lane_{$index}")) ?: "{$category}_lane_{$index}",
                        'originZone' => $originZone,
                        'destinationZone' => $destinationZone,
                        'serviceLevelKey' => $serviceLevelKey,
                        'distanceFromKm' => $distanceFrom,
                        'distanceToKm' => $distanceTo,
                        'distanceBaseKm' => max(0, (float) ($row['distanceBaseKm'] ?? 0)),
                        'perKmPrice' => max(0, (float) ($row['perKmPrice'] ?? 0)),
                        'distanceSurcharge' => max(0, (float) ($row['distanceSurcharge'] ?? 0)),
                        'distanceMultiplier' => max(0.1, (float) ($row['distanceMultiplier'] ?? 1)),
                        'basePrice' => max(0, (float) ($row['basePrice'] ?? 0)),
                        'perKgPrice' => max(0, (float) ($row['perKgPrice'] ?? 0)),
                        'minPrice' => max(0, (float) ($row['minPrice'] ?? 0)),
                        'priorityMultiplier' => max(0.1, (float) ($row['priorityMultiplier'] ?? 1)),
                        'isActive' => (bool) ($row['isActive'] ?? true),
                    ];
                })
                ->values()
                ->all();
        }

        return $normalized;
    }

    private function normalizeZoneKey(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '*' || $trimmed === '') {
            return '*';
        }

        $normalized = strtolower($trimmed);
        $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized) ?? '';
        $normalized = trim($normalized, '_');

        return $normalized !== '' ? $normalized : '*';
    }

    private function appendPricingGovernanceLog(array $pricing, string $event, ?int $actorId, array $meta = [], ?string $category = null): array
    {
        $pricing = $this->normalizePricingSettings($pricing);
        $category = in_array((string) $category, ['domestic', 'international'], true) ? (string) $category : 'domestic';
        $governanceByCategory = is_array($pricing['governance'] ?? null) ? $pricing['governance'] : $this->defaultPricingGovernance();
        $governance = is_array($governanceByCategory[$category] ?? null)
            ? $governanceByCategory[$category]
            : ($this->defaultPricingGovernance()[$category] ?? []);

        if ($event === 'draft_saved') {
            $governance['draftVersion'] = max(1, (int) ($governance['draftVersion'] ?? 1)) + 1;
        }

        $governance['changeLog'] = collect($governance['changeLog'] ?? [])
            ->prepend([
                'event' => $event,
                'at' => now()->toDateTimeString(),
                'actorUserId' => $actorId,
                'meta' => $meta,
            ])
            ->take(50)
            ->values()
            ->all();

        $pricing['governance'][$category] = $governance;
        return $pricing;
    }

    private function publishPricingSnapshot(
        array $pricing,
        array $snapshot,
        ?int $actorId,
        string $event = 'published_now',
        ?string $category = null,
        array $eventMeta = []
    ): array
    {
        $category = in_array((string) $category, ['domestic', 'international'], true)
            ? (string) $category
            : (in_array((string) ($snapshot['category'] ?? ''), ['domestic', 'international'], true) ? (string) $snapshot['category'] : 'domestic');

        $pricing = $this->applyPricingSnapshot($pricing, $snapshot, $category);
        $governance = is_array($pricing['governance'][$category] ?? null)
            ? $pricing['governance'][$category]
            : ($this->defaultPricingGovernance()[$category] ?? []);
        $governance['publishedVersion'] = max(1, (int) ($governance['publishedVersion'] ?? 1)) + 1;
        $governance['publishedAt'] = now()->toDateTimeString();
        $governance['publishedBy'] = $actorId;
        $governance['scheduledPublish'] = null;
        $governance['pendingApproval'] = null;
        $governance['versionHistory'] = collect($governance['versionHistory'] ?? [])
            ->prepend([
                'version' => (int) $governance['publishedVersion'],
                'publishedAt' => $governance['publishedAt'],
                'publishedBy' => $actorId,
                'event' => $event,
                'snapshot' => $this->extractPricingSnapshot($pricing, $category),
                'meta' => $eventMeta,
            ])
            ->take(25)
            ->values()
            ->all();
        $pricing['governance'][$category] = $governance;

        return $this->appendPricingGovernanceLog($pricing, $event, $actorId, [
            'publishedVersion' => $governance['publishedVersion'],
            ...$eventMeta,
        ], $category);
    }

    private function canActorApprovePricingGovernance(
        Request $request,
        array $governance,
        ?array $pendingApproval = null,
        string $action = 'review'
    ): bool
    {
        $actorId = (int) optional($request->user())->id;
        if ($action === 'approve' && $actorId > 0 && is_array($pendingApproval)) {
            $requestedBy = (int) ($pendingApproval['requestedBy'] ?? 0);
            if ($requestedBy > 0 && $requestedBy === $actorId) {
                return false;
            }
        }

        if ($this->isVendorOwnerActor($request)) {
            return true;
        }

        $approverRoles = collect($governance['approverRoles'] ?? [])
            ->map(fn ($role) => strtolower(trim((string) $role)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($approverRoles)) {
            return false;
        }

        $actorRoles = collect($this->actorCourierRoles($request))
            ->map(fn ($role) => strtolower(trim((string) $role)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        return !empty(array_intersect($actorRoles, $approverRoles));
    }

    private function resolvePricingRollbackTarget(array $governance, ?int $targetVersion = null): ?array
    {
        $history = collect($governance['versionHistory'] ?? [])
            ->filter(fn ($entry) => is_array($entry) && is_array($entry['snapshot'] ?? null))
            ->map(function ($entry) {
                $item = is_array($entry) ? $entry : [];
                return [
                    'version' => max(1, (int) ($item['version'] ?? 1)),
                    'snapshot' => is_array($item['snapshot'] ?? null) ? $item['snapshot'] : [],
                ];
            })
            ->sortByDesc(fn ($entry) => (int) ($entry['version'] ?? 0))
            ->values();

        if ($history->isEmpty()) {
            return null;
        }

        if ($targetVersion !== null && $targetVersion > 0) {
            return $history->first(fn ($entry) => (int) ($entry['version'] ?? 0) === $targetVersion);
        }

        $currentPublishedVersion = max(1, (int) ($governance['publishedVersion'] ?? 1));
        $previous = $history->first(fn ($entry) => (int) ($entry['version'] ?? 0) < $currentPublishedVersion);
        if ($previous) {
            return $previous;
        }

        return $history->skip(1)->first();
    }

    private function normalizeTeamSettings(array $team): array
    {
        $defaults = $this->defaultCourierSettings()['team'] ?? [];
        $merged = array_replace_recursive($defaults, $team);

        $merged['teamAccessControl'] = array_replace(
            $defaults['teamAccessControl'] ?? ['defaultDirectPermissionsByRole' => []],
            is_array($merged['teamAccessControl'] ?? null) ? $merged['teamAccessControl'] : []
        );

        if (!is_array($merged['teamAccessControl']['defaultDirectPermissionsByRole'] ?? null)) {
            $merged['teamAccessControl']['defaultDirectPermissionsByRole'] = [];
        }

        if (!is_array($merged['teamAccessControl']['defaultDataScopeByRole'] ?? null)) {
            $merged['teamAccessControl']['defaultDataScopeByRole'] = [];
        }

        if (!is_array($merged['teamAccessControl']['onboardingBundles'] ?? null)) {
            $merged['teamAccessControl']['onboardingBundles'] = [];
        }

        $approvalControl = is_array($merged['approvalControl'] ?? null) ? $merged['approvalControl'] : [];
        $merged['approvalControl'] = app(CourierSensitiveActionApprovalService::class)->normalizePolicy($approvalControl);
        $merged['sodControl'] = $this->normalizeSodControlPolicy(
            is_array($merged['sodControl'] ?? null)
                ? $merged['sodControl']
                : []
        );
        $merged['temporaryAccessControl'] = app(CourierTemporaryAccessService::class)->normalizePolicy(
            is_array($merged['temporaryAccessControl'] ?? null)
                ? $merged['temporaryAccessControl']
                : []
        );
        $merged['accessReviewControl'] = app(CourierAccessReviewService::class)->normalizePolicy(
            is_array($merged['accessReviewControl'] ?? null)
                ? $merged['accessReviewControl']
                : []
        );
        $merged['apiServiceAccessControl'] = app(CourierApiServiceAccessService::class)->normalizePolicy(
            is_array($merged['apiServiceAccessControl'] ?? null)
                ? $merged['apiServiceAccessControl']
                : []
        );
        $merged['sessionSecurity'] = app(CourierSessionSecurityService::class)->normalizePolicy(
            is_array($merged['sessionSecurity'] ?? null)
                ? $merged['sessionSecurity']
                : []
        );

        $merged['permissionModel'] = $this->normalizeAdvancedPermissionModel(
            is_array($merged['permissionModel'] ?? null)
                ? $merged['permissionModel']
                : []
        );

        $merged['permissionModel'] = $this->applyProvisioningDataScopeDefaultsToPermissionModel(
            $merged['permissionModel'],
            is_array($merged['teamAccessControl'] ?? null) ? $merged['teamAccessControl'] : []
        );

        return $merged;
    }

    private function defaultSodControlPolicy(): array
    {
        return [
            'enabled' => true,
            'toxicCombinations' => [
                [
                    'key' => 'refund_create_and_approve',
                    'label' => 'Cannot both create refunds and approve refunds',
                    'permissions' => ['courier.refunds.create', 'courier.refunds.approve'],
                    'enforceRoleEdit' => true,
                    'enforceUserAssignment' => true,
                    'enabled' => true,
                ],
                [
                    'key' => 'assign_permissions_and_approve_access_request',
                    'label' => 'Cannot both assign permissions and approve access requests',
                    'permissions' => ['courier.team.assign_permissions', 'courier.team.access_requests.approve'],
                    'enforceRoleEdit' => true,
                    'enforceUserAssignment' => true,
                    'enabled' => true,
                ],
            ],
        ];
    }

    private function normalizeSodControlPolicy(array $policy): array
    {
        $defaults = $this->defaultSodControlPolicy();
        $incomingToxicCombinations = is_array($policy['toxicCombinations'] ?? null) ? $policy['toxicCombinations'] : [];

        $normalizedCombinations = collect($defaults['toxicCombinations'])
            ->map(function (array $defaultRule) use ($incomingToxicCombinations) {
                $incoming = collect($incomingToxicCombinations)
                    ->first(fn ($row) => is_array($row) && (string) ($row['key'] ?? '') === (string) $defaultRule['key']);

                return [
                    'key' => (string) $defaultRule['key'],
                    'label' => trim((string) ($incoming['label'] ?? $defaultRule['label'])),
                    'permissions' => collect($incoming['permissions'] ?? $defaultRule['permissions'])
                        ->map(fn ($permission) => trim((string) $permission))
                        ->filter()
                        ->take(2)
                        ->values()
                        ->all(),
                    'enforceRoleEdit' => (bool) ($incoming['enforceRoleEdit'] ?? $defaultRule['enforceRoleEdit']),
                    'enforceUserAssignment' => (bool) ($incoming['enforceUserAssignment'] ?? $defaultRule['enforceUserAssignment']),
                    'enabled' => (bool) ($incoming['enabled'] ?? $defaultRule['enabled']),
                ];
            })
            ->values()
            ->all();

        return [
            'enabled' => (bool) ($policy['enabled'] ?? $defaults['enabled']),
            'toxicCombinations' => $normalizedCombinations,
        ];
    }

    private function applyProvisioningDataScopeDefaultsToPermissionModel(array $permissionModel, array $teamAccessControl): array
    {
        $rolePolicies = is_array($permissionModel['rolePolicies'] ?? null) ? $permissionModel['rolePolicies'] : [];
        $scopeDefaultsByRole = is_array($teamAccessControl['defaultDataScopeByRole'] ?? null)
            ? $teamAccessControl['defaultDataScopeByRole']
            : [];

        foreach ($rolePolicies as $roleName => $rolePolicy) {
            if (!is_array($rolePolicy)) {
                continue;
            }

            $scopeDefault = is_array($scopeDefaultsByRole[$roleName] ?? null) ? $scopeDefaultsByRole[$roleName] : [];

            $scope = trim((string) ($scopeDefault['scope'] ?? $rolePolicy['scope'] ?? ''));
            if (!in_array($scope, self::ADVANCED_SCOPE_LEVELS, true)) {
                $scope = (string) ($rolePolicy['scope'] ?? 'own_records');
            }

            $constraints = $this->normalizeRoleDataScopeConstraints(
                is_array($rolePolicy['constraints'] ?? null) ? $rolePolicy['constraints'] : [],
                $this->defaultRoleDataScopeConstraints()
            );

            if (is_array($scopeDefault)) {
                $constraints['regionZones'] = collect($scopeDefault['regionZones'] ?? $constraints['regionZones'] ?? [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter()
                    ->values()
                    ->all();

                $constraints['hubBranches'] = collect($scopeDefault['hubBranches'] ?? $constraints['hubBranches'] ?? [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter()
                    ->values()
                    ->all();
            }

            $rolePolicies[$roleName]['scope'] = $scope;
            $rolePolicies[$roleName]['constraints'] = $constraints;
        }

        $permissionModel['rolePolicies'] = $rolePolicies;

        return $permissionModel;
    }

    private function defaultAdvancedPermissionModel(): array
    {
        $resourcesAll = $this->buildPermissionResourceActions(true);
        $resourcesReadMostly = $this->buildPermissionResourceActions(false, [
            'shipments' => ['view' => true, 'export' => true],
            'bookings' => ['view' => true, 'export' => true],
            'clients' => ['view' => true, 'export' => true],
            'reports' => ['view' => true, 'export' => true],
            'pricing' => ['view' => true, 'export' => true],
            'payouts' => ['view' => true, 'export' => true],
        ]);
        $resourcesFinance = $this->buildPermissionResourceActions(false, [
            'pricing' => ['view' => true, 'update' => true, 'approve' => true],
            'payouts' => ['view' => true, 'approve' => true, 'refund' => true, 'export' => true],
            'reports' => ['view' => true, 'export' => true],
            'bookings' => ['view' => true],
            'shipments' => ['view' => true],
            'clients' => ['view' => true],
        ]);

        return [
            'enabled' => true,
            'rolePolicies' => [
                'courier_owner' => [
                    'scope' => 'all_workspace',
                    'resources' => $resourcesAll,
                    'constraints' => $this->defaultRoleDataScopeConstraints(),
                ],
                'courier_admin' => [
                    'scope' => 'all_workspace',
                    'resources' => $resourcesAll,
                    'constraints' => $this->defaultRoleDataScopeConstraints(),
                ],
                'courier_dispatcher' => [
                    'scope' => 'assigned_hub',
                    'resources' => $this->buildPermissionResourceActions(false, [
                        'bookings' => ['view' => true, 'create' => true, 'update' => true, 'cancel' => false, 'reassign' => false, 'approve' => true],
                        'shipments' => ['view' => true, 'create' => false, 'update' => true, 'cancel' => false, 'reassign' => true, 'approve' => true],
                        'clients' => ['view' => true, 'update' => true, 'reassign' => false],
                        'reports' => ['view' => true, 'export' => true],
                    ]),
                    'constraints' => array_replace($this->defaultRoleDataScopeConstraints(), [
                        'enforceShiftWindow' => true,
                        'shiftStart' => '08:00',
                        'shiftEnd' => '20:00',
                    ]),
                ],
                'courier_tracking_officer' => [
                    'scope' => 'assigned_region',
                    'resources' => $this->buildPermissionResourceActions(false, [
                        'shipments' => ['view' => true, 'update' => true, 'cancel' => false, 'reassign' => false],
                        'bookings' => ['view' => true],
                        'clients' => ['view' => true],
                        'reports' => ['view' => true, 'export' => true],
                    ]),
                    'constraints' => array_replace($this->defaultRoleDataScopeConstraints(), [
                        'enforceShiftWindow' => true,
                        'shiftStart' => '06:00',
                        'shiftEnd' => '22:00',
                    ]),
                ],
                'courier_support' => [
                    'scope' => 'own_records',
                    'resources' => $this->buildPermissionResourceActions(false, [
                        'clients' => ['view' => true, 'update' => true],
                        'bookings' => ['view' => true, 'update' => true, 'cancel' => false],
                        'shipments' => ['view' => true],
                        'reports' => ['view' => true],
                    ]),
                    'constraints' => array_replace($this->defaultRoleDataScopeConstraints(), [
                        'keyAccountsOnly' => true,
                        'enforceShiftWindow' => true,
                        'shiftStart' => '08:00',
                        'shiftEnd' => '18:00',
                    ]),
                ],
                'courier_finance' => [
                    'scope' => 'all_workspace',
                    'resources' => $resourcesFinance,
                    'constraints' => array_replace($this->defaultRoleDataScopeConstraints(), [
                        'blockedActionsByEnvironment' => [
                            'production' => [],
                            'sandbox' => ['approve', 'refund'],
                        ],
                    ]),
                ],
                'courier_viewer' => [
                    'scope' => 'assigned_region',
                    'resources' => $resourcesReadMostly,
                    'constraints' => $this->defaultRoleDataScopeConstraints(),
                ],
            ],
            'fieldVisibility' => [
                'rate_cards' => ['visibleToRoles' => ['courier_owner', 'courier_admin', 'courier_finance']],
                'margin' => ['visibleToRoles' => ['courier_owner', 'courier_admin', 'courier_finance']],
                'customer_phone' => ['visibleToRoles' => ['courier_owner', 'courier_admin', 'courier_dispatcher', 'courier_support']],
                'payment_refs' => ['visibleToRoles' => ['courier_owner', 'courier_admin', 'courier_finance']],
            ],
        ];
    }

    private function buildPermissionResourceActions(bool $allEnabled, array $overrides = []): array
    {
        $resourceTemplate = [];

        foreach (self::ADVANCED_PERMISSION_RESOURCES as $resource) {
            $resourceTemplate[$resource] = [];
            foreach (self::ADVANCED_PERMISSION_ACTIONS as $action) {
                $resourceTemplate[$resource][$action] = $allEnabled;
            }
        }

        foreach ($overrides as $resource => $override) {
            if (!isset($resourceTemplate[$resource]) || !is_array($override)) {
                continue;
            }

            foreach ($override as $action => $enabled) {
                if (array_key_exists($action, $resourceTemplate[$resource])) {
                    $resourceTemplate[$resource][$action] = (bool) $enabled;
                }
            }
        }

        return $resourceTemplate;
    }

    private function defaultRoleDataScopeConstraints(): array
    {
        return [
            'regionZones' => [],
            'hubBranches' => [],
            'allowedCustomerIds' => [],
            'keyAccountsOnly' => false,
            'enforceShiftWindow' => false,
            'shiftStart' => '00:00',
            'shiftEnd' => '23:59',
            'allowedEnvironments' => self::ADVANCED_ENVIRONMENTS,
            'blockedActionsByEnvironment' => [
                'production' => [],
                'sandbox' => [],
            ],
            'policyRules' => [],
        ];
    }

    private function normalizeAdvancedPermissionModel(array $input): array
    {
        $defaults = $this->defaultAdvancedPermissionModel();
        $normalized = [
            'enabled' => (bool) ($input['enabled'] ?? $defaults['enabled']),
            'rolePolicies' => [],
            'fieldVisibility' => [],
        ];

        $inputRolePolicies = is_array($input['rolePolicies'] ?? null) ? $input['rolePolicies'] : [];
        foreach ($defaults['rolePolicies'] as $roleName => $defaultPolicy) {
            $incoming = is_array($inputRolePolicies[$roleName] ?? null) ? $inputRolePolicies[$roleName] : [];
            $scope = (string) ($incoming['scope'] ?? $defaultPolicy['scope']);
            if (!in_array($scope, self::ADVANCED_SCOPE_LEVELS, true)) {
                $scope = (string) $defaultPolicy['scope'];
            }

            $resources = $this->buildPermissionResourceActions(false);
            $incomingResources = is_array($incoming['resources'] ?? null) ? $incoming['resources'] : [];

            foreach ($resources as $resource => $actions) {
                foreach ($actions as $action => $placeholder) {
                    $resources[$resource][$action] = (bool) (
                        $incomingResources[$resource][$action]
                        ?? $defaultPolicy['resources'][$resource][$action]
                        ?? false
                    );
                }
            }

            $normalized['rolePolicies'][$roleName] = [
                'scope' => $scope,
                'resources' => $resources,
                'constraints' => $this->normalizeRoleDataScopeConstraints(
                    is_array($incoming['constraints'] ?? null) ? $incoming['constraints'] : [],
                    is_array($defaultPolicy['constraints'] ?? null)
                        ? $defaultPolicy['constraints']
                        : $this->defaultRoleDataScopeConstraints()
                ),
            ];
        }

        $inputFieldVisibility = is_array($input['fieldVisibility'] ?? null) ? $input['fieldVisibility'] : [];
        foreach (self::SENSITIVE_FIELD_KEYS as $fieldKey) {
            $defaultRoles = $defaults['fieldVisibility'][$fieldKey]['visibleToRoles'] ?? [];
            $incomingRoles = $inputFieldVisibility[$fieldKey]['visibleToRoles'] ?? $defaultRoles;
            $normalized['fieldVisibility'][$fieldKey] = [
                'visibleToRoles' => collect(is_array($incomingRoles) ? $incomingRoles : [])
                    ->map(fn ($role) => trim((string) $role))
                    ->filter()
                    ->values()
                    ->all(),
            ];
        }

        return $normalized;
    }

    private function normalizeRoleDataScopeConstraints(array $incoming, array $defaults): array
    {
        $normalized = array_replace($this->defaultRoleDataScopeConstraints(), $defaults);

        $normalized['regionZones'] = collect(is_array($incoming['regionZones'] ?? null) ? $incoming['regionZones'] : $normalized['regionZones'])
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->values()
            ->all();

        $normalized['hubBranches'] = collect(is_array($incoming['hubBranches'] ?? null) ? $incoming['hubBranches'] : $normalized['hubBranches'])
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->values()
            ->all();

        $normalized['allowedCustomerIds'] = collect(is_array($incoming['allowedCustomerIds'] ?? null) ? $incoming['allowedCustomerIds'] : $normalized['allowedCustomerIds'])
            ->map(fn ($item) => (int) $item)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $normalized['keyAccountsOnly'] = (bool) ($incoming['keyAccountsOnly'] ?? $normalized['keyAccountsOnly']);
        $normalized['enforceShiftWindow'] = (bool) ($incoming['enforceShiftWindow'] ?? $normalized['enforceShiftWindow']);
        $normalized['shiftStart'] = $this->normalizeTimeValue((string) ($incoming['shiftStart'] ?? $normalized['shiftStart']));
        $normalized['shiftEnd'] = $this->normalizeTimeValue((string) ($incoming['shiftEnd'] ?? $normalized['shiftEnd']));

        $allowedEnvironments = collect(is_array($incoming['allowedEnvironments'] ?? null) ? $incoming['allowedEnvironments'] : $normalized['allowedEnvironments'])
            ->map(fn ($item) => trim((string) $item))
            ->filter(fn ($env) => in_array($env, self::ADVANCED_ENVIRONMENTS, true))
            ->unique()
            ->values()
            ->all();
        $normalized['allowedEnvironments'] = !empty($allowedEnvironments) ? $allowedEnvironments : self::ADVANCED_ENVIRONMENTS;

        $incomingBlocked = is_array($incoming['blockedActionsByEnvironment'] ?? null)
            ? $incoming['blockedActionsByEnvironment']
            : (is_array($normalized['blockedActionsByEnvironment'] ?? null) ? $normalized['blockedActionsByEnvironment'] : []);

        $normalized['blockedActionsByEnvironment'] = [];
        foreach (self::ADVANCED_ENVIRONMENTS as $environment) {
            $normalized['blockedActionsByEnvironment'][$environment] = collect(is_array($incomingBlocked[$environment] ?? null) ? $incomingBlocked[$environment] : [])
                ->map(fn ($item) => trim((string) $item))
                ->filter(fn ($action) => in_array($action, self::ADVANCED_PERMISSION_ACTIONS, true))
                ->unique()
                ->values()
                ->all();
        }

        $incomingRules = is_array($incoming['policyRules'] ?? null) ? $incoming['policyRules'] : [];
        $normalized['policyRules'] = collect($incomingRules)
            ->filter(fn ($rule) => is_array($rule))
            ->map(function (array $rule, int $index) {
                $effect = trim((string) ($rule['effect'] ?? 'allow'));
                if (!in_array($effect, self::ABAC_RULE_EFFECTS, true)) {
                    $effect = 'allow';
                }

                $resource = trim((string) ($rule['resource'] ?? '*'));
                if ($resource !== '*' && !in_array($resource, self::ADVANCED_PERMISSION_RESOURCES, true)) {
                    $resource = '*';
                }

                $action = trim((string) ($rule['action'] ?? '*'));
                if ($action !== '*' && !in_array($action, self::ADVANCED_PERMISSION_ACTIONS, true)) {
                    $action = '*';
                }

                $conditions = is_array($rule['conditions'] ?? null) ? $rule['conditions'] : [];

                $shipmentStages = collect(is_array($conditions['shipmentStages'] ?? null) ? $conditions['shipmentStages'] : [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter(fn ($stage) => in_array($stage, self::SHIPMENT_STAGE_OPTIONS, true))
                    ->unique()
                    ->values()
                    ->all();

                $clientTiers = collect(is_array($conditions['clientTiers'] ?? null) ? $conditions['clientTiers'] : [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter(fn ($tier) => in_array($tier, self::ABAC_CLIENT_TIERS, true))
                    ->unique()
                    ->values()
                    ->all();

                $slaClasses = collect(is_array($conditions['slaClasses'] ?? null) ? $conditions['slaClasses'] : [])
                    ->map(fn ($item) => trim((string) $item))
                    ->filter(fn ($sla) => in_array($sla, self::ABAC_SLA_CLASSES, true))
                    ->unique()
                    ->values()
                    ->all();

                $minAmount = is_numeric($conditions['minAmount'] ?? null)
                    ? max(0, (float) $conditions['minAmount'])
                    : null;

                $maxAmount = is_numeric($conditions['maxAmount'] ?? null)
                    ? max(0, (float) $conditions['maxAmount'])
                    : null;

                if ($minAmount !== null && $maxAmount !== null && $minAmount > $maxAmount) {
                    [$minAmount, $maxAmount] = [$maxAmount, $minAmount];
                }

                $ruleId = trim((string) ($rule['id'] ?? ''));
                if ($ruleId === '') {
                    $ruleId = 'rule_' . ($index + 1);
                }

                return [
                    'id' => $ruleId,
                    'label' => trim((string) ($rule['label'] ?? '')),
                    'effect' => $effect,
                    'resource' => $resource,
                    'action' => $action,
                    'conditions' => [
                        'shipmentStages' => $shipmentStages,
                        'minAmount' => $minAmount,
                        'maxAmount' => $maxAmount,
                        'clientTiers' => $clientTiers,
                        'slaClasses' => $slaClasses,
                    ],
                ];
            })
            ->values()
            ->all();

        return $normalized;
    }

    private function normalizeTimeValue(string $value): string
    {
        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
            return $value;
        }

        return '00:00';
    }

    private function buildCourierProfilePayload(Request $request, int $profileUserId): array
    {
        $user = $request->user();
        $actorUserId = (int) optional($user)->id;

        $membership = VendorUserMembership::query()
            ->where('user_id', $actorUserId)
            ->where('status', 'active')
            ->first();

        $isTeamUser = $membership && (int) $membership->vendor_user_id !== $actorUserId;

        $profile = VendorProfile::query()->where('user_id', $profileUserId)->first();
        $setting = VendorCourierSetting::query()->where('vendor_user_id', $profileUserId)->first();
        $settings = array_replace_recursive(
            $this->defaultCourierSettings(),
            is_array(optional($setting)->settings) ? $setting->settings : []
        );

        $registrations = $isTeamUser
            ? collect()
            : VendorServiceRegistration::query()
                ->where('user_id', $profileUserId)
                ->with(['serviceCategory:id,name', 'serviceSubCategory:id,name,slug'])
                ->orderByDesc('updated_at')
                ->get();

        $activities = VendorActivityLog::query()
            ->where('vendor_id', $profileUserId)
            ->orderByDesc('created_at')
            ->limit(12)
            ->get()
            ->map(function (VendorActivityLog $item) {
                return [
                    'id' => $item->id,
                    'action' => $item->action,
                    'description' => $item->description,
                    'createdAt' => $this->formatCourierProfileDateTime($item->created_at),
                ];
            })
            ->values();

        $mandatoryChecks = [
            !empty($profile?->company_name),
            !empty($profile?->business_registration_no),
            !empty($profile?->tax_id),
            !empty($profile?->contact_person),
            !empty($profile?->contact_email),
            !empty($profile?->contact_phone),
            !empty($profile?->address_line1),
            !empty($profile?->city),
            !empty($profile?->country),
        ];

        $completion = (int) round((collect($mandatoryChecks)->filter()->count() / count($mandatoryChecks)) * 100);

        return [
            'isTeamUser' => (bool) $isTeamUser,
            'profile' => [
                'logoUrl' => $profile?->logo
                    ? asset('storage/' . $profile->logo) . '?v=' . urlencode((string) optional($profile?->updated_at)->timestamp)
                    : ($user?->image ? asset('storage/' . $user->image) . '?v=' . urlencode((string) optional($user?->updated_at)->timestamp) : null),
                'ownerImageUrl' => $user?->image
                    ? asset('storage/' . $user->image) . '?v=' . urlencode((string) optional($user?->updated_at)->timestamp)
                    : null,
                'companyName' => (string) ($profile?->company_name ?? $user?->name ?? ''),
                'displayName' => (string) ($settings['profile']['displayName'] ?? $user?->name ?? ''),
                'ownerName' => (string) ($user?->name ?? ''),
                'ownerAddress' => (string) ($user?->address ?? ''),
                'ownerCountry' => (string) ($user?->country ?? ''),
                'ownerEmail' => (string) ($user?->email ?? ''),
                'ownerPhone' => (string) ($user?->phone ?? ''),
                'businessRegistrationNo' => (string) ($profile?->business_registration_no ?? ''),
                'taxId' => (string) ($profile?->tax_id ?? ''),
                'website' => (string) ($profile?->website ?? ''),
                'contactPerson' => (string) ($profile?->contact_person ?? $user?->name ?? ''),
                'contactEmail' => (string) ($profile?->contact_email ?? $user?->email ?? ''),
                'contactPhone' => (string) ($profile?->contact_phone ?? $user?->phone ?? ''),
                'supportEmail' => (string) ($settings['profile']['supportEmail'] ?? ''),
                'supportHotline' => (string) ($settings['profile']['supportHotline'] ?? ''),
                'addressLine1' => (string) ($profile?->address_line1 ?? ''),
                'addressLine2' => (string) ($profile?->address_line2 ?? ''),
                'city' => (string) ($profile?->city ?? ''),
                'state' => (string) ($profile?->state ?? ''),
                'postalCode' => (string) ($profile?->postal_code ?? ''),
                'country' => (string) ($profile?->country ?? ''),
                'publicAbout' => (string) ($profile?->description ?? ''),
                'publicSupportHours' => (string) ($settings['profile']['publicSupportHours'] ?? ''),
                'status' => (string) ($isTeamUser ? 'active' : ($profile?->submission_status ?? 'draft')),
                'reviewedAt' => $this->formatCourierProfileDateTime($profile?->reviewed_at),
                'adminNotes' => (string) ($isTeamUser ? '' : ($profile?->admin_notes ?? '')),
            ],
            'summary' => [
                'completionScore' => $completion,
                'approvedServices' => $registrations->where('status', 'approved')->count(),
                'pendingServices' => $registrations->whereIn('status', ['draft', 'submitted', 'revision_requested'])->count(),
                'rejectedServices' => $registrations->where('status', 'rejected')->count(),
            ],
            'serviceEnrollment' => $registrations->map(function (VendorServiceRegistration $item) {
                return [
                    'id' => $item->id,
                    'service' => (string) optional($item->serviceSubCategory)->name,
                    'category' => (string) optional($item->serviceCategory)->name,
                    'status' => (string) $item->status,
                    'submittedAt' => $this->formatCourierProfileDateTime($item->submitted_at),
                    'reviewedAt' => $this->formatCourierProfileDateTime($item->reviewed_at),
                ];
            })->values(),
            'activity' => $activities,
        ];
    }

    private function formatCourierProfileDateTime($value): string
    {
        if (empty($value)) {
            return '';
        }

        $timezone = (string) config('app.display_timezone', config('app.timezone', 'UTC'));

        try {
            if ($value instanceof Carbon) {
                return $value->copy()->setTimezone($timezone)->format('Y-m-d H:i');
            }

            return Carbon::parse((string) $value, (string) config('app.timezone', 'UTC'))
                ->setTimezone($timezone)
                ->format('Y-m-d H:i');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function trackingNumber(CourierShipment $shipment): string
    {
        return 'TRK-' . str_replace('CR-', '', (string) $shipment->reference);
    }

    private function getLatestTrackingEvent(CourierShipment $shipment)
    {
        return $shipment->trackingEvents
            ->sortByDesc(function ($event) {
                return optional($event->recorded_at)?->timestamp ?? 0;
            })
            ->first();
    }

    private function getShipmentStage(CourierShipment $shipment): string
    {
        $latestEventStatus = strtolower((string) optional($this->getLatestTrackingEvent($shipment))->status);

        if (in_array($latestEventStatus, self::SHIPMENT_STAGE_OPTIONS, true)) {
            return $latestEventStatus;
        }

        if (in_array($latestEventStatus, ['assigned', 'accepted'], true)) {
            return 'new_assignments';
        }

        if ($latestEventStatus === 'picked_up') {
            return 'picked_up';
        }

        if ($latestEventStatus === 'out_for_delivery') {
            return 'out_for_delivery';
        }

        if ($latestEventStatus === 'exception') {
            return 'exception';
        }

        if ($latestEventStatus === 'delivered') {
            return 'delivered';
        }

        return match ($shipment->status) {
            CourierShipment::STATUS_PENDING => 'new_assignments',
            CourierShipment::STATUS_CONFIRMED => 'ready_for_pickup',
            CourierShipment::STATUS_IN_TRANSIT => 'in_transit',
            CourierShipment::STATUS_DELIVERED => 'delivered',
            CourierShipment::STATUS_CANCELLED => 'cancelled',
            default => 'new_assignments',
        };
    }

    private function stageLabel(string $stage): string
    {
        return ucwords(str_replace('_', ' ', $stage));
    }

    private function formatPickupWindow(CourierShipment $shipment): ?string
    {
        if (!$shipment->pickup_date) {
            return null;
        }

        $date = Carbon::parse($shipment->pickup_date)->format('Y-m-d');
        $start = $shipment->pickup_window_start ? Carbon::parse($shipment->pickup_window_start)->format('H:i') : null;
        $end = $shipment->pickup_window_end ? Carbon::parse($shipment->pickup_window_end)->format('H:i') : null;

        if ($start && $end) {
            return $date . ' ' . $start . ' - ' . $end;
        }

        return $date;
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            CourierShipment::STATUS_PENDING => 'Pending',
            CourierShipment::STATUS_CONFIRMED => 'Confirmed',
            CourierShipment::STATUS_IN_TRANSIT => 'In Transit',
            CourierShipment::STATUS_DELIVERED => 'Delivered',
            CourierShipment::STATUS_CANCELLED => 'Cancelled',
            default => ucwords(str_replace('_', ' ', (string) $status)),
        };
    }

    private function resolveCategory(CourierShipment $shipment): string
    {
        if (in_array($shipment->assignment_category, ['domestic', 'international'], true)) {
            return ucfirst($shipment->assignment_category);
        }

        $senderCountry = strtoupper((string) optional($shipment->senderAddress)->country);
        $recipientCountry = strtoupper((string) optional($shipment->recipientAddress)->country);

        if ($senderCountry === 'LK' && $recipientCountry === 'LK') {
            return 'Domestic';
        }

        return 'International';
    }

    private function estimateDeliveryDateTime(CourierShipment $shipment): ?Carbon
    {
        if (!$shipment->pickup_date) {
            return null;
        }

        $estimated = Carbon::parse($shipment->pickup_date)->setTime(18, 0, 0);
        $service = strtolower((string) $shipment->service_level);

        if (str_contains($service, 'same day')) {
            return $estimated;
        }

        if (str_contains($service, 'express')) {
            return $estimated->addDay();
        }

        return $estimated->addDays(3);
    }

    private function getDeliveredAt(CourierShipment $shipment): ?Carbon
    {
        $event = $shipment->trackingEvents
            ->filter(fn ($tracking) => strtolower((string) $tracking->status) === 'delivered')
            ->sortByDesc('recorded_at')
            ->first();

        if (!$event || !$event->recorded_at) {
            return null;
        }

        return Carbon::parse($event->recorded_at);
    }

    private function getTimelineState(CourierShipment $shipment, ?Carbon $estimatedDelivery, ?Carbon $deliveredAt): ?string
    {
        if (!$estimatedDelivery) {
            return null;
        }

        if ($deliveredAt) {
            if ($deliveredAt->lt($estimatedDelivery)) {
                return 'early';
            }

            if ($deliveredAt->gt($estimatedDelivery)) {
                return 'delayed';
            }

            return 'on_time';
        }

        if ($shipment->status !== CourierShipment::STATUS_DELIVERED && now()->gt($estimatedDelivery)) {
            return 'delayed';
        }

        return null;
    }

    private function hasException(CourierShipment $shipment): bool
    {
        $exceptionStatuses = ['exception', 'failed', 'returned', 'cancelled'];

        if (in_array(strtolower((string) $shipment->status), $exceptionStatuses, true)) {
            return true;
        }

        return $shipment->trackingEvents
            ->contains(fn ($event) => in_array(strtolower((string) $event->status), $exceptionStatuses, true));
    }

    private function isPendingPickup(CourierShipment $shipment): bool
    {
        $status = strtolower((string) $shipment->status);
        return in_array($status, [CourierShipment::STATUS_PENDING, CourierShipment::STATUS_CONFIRMED], true);
    }

    private function isLabelCreated(CourierShipment $shipment): bool
    {
        if ($shipment->relationLoaded('labels')) {
            return $shipment->labels->isNotEmpty();
        }

        return VendorCourierLabel::query()
            ->where('shipment_id', $shipment->id)
            ->exists();
    }

    private function resolveTeamAccessPolicy(int $vendorId): array
    {
        $record = VendorCourierSetting::query()->firstWhere('vendor_user_id', $vendorId);
        $settings = is_array($record?->settings) ? $record->settings : [];
        $team = $this->normalizeTeamSettings(is_array($settings['team'] ?? null) ? $settings['team'] : []);

        return array_replace($this->defaultCourierSettings()['team'] ?? [], $team);
    }

    private function isVendorOwnerActor(Request $request): bool
    {
        return (int) optional($request->user())->id === (int) $request->attributes->get('vendor_user_id');
    }

    private function guardCancelActionByPolicy(Request $request, array $policy, string $action): array
    {
        if (!in_array($action, ['cancel_booking', 'cancel_shipment'], true)) {
            return ['ok' => true, 'message' => null];
        }

        if (!(bool) ($policy['dispatcherCanCancel'] ?? false) && !$this->isVendorOwnerActor($request)) {
            return ['ok' => false, 'message' => 'Cancellation by dispatchers is disabled by Team Access Control policy.'];
        }

        $resource = $action === 'cancel_booking' ? 'bookings' : 'shipments';

        if (!$this->canRolePerformAction($request, $policy, $resource, 'cancel')) {
            return ['ok' => false, 'message' => 'Cancellation by dispatchers is disabled by Team Access Control policy.'];
        }

        return ['ok' => true, 'message' => null];
    }

    private function canActorReassignOwner(Request $request, array $policy): bool
    {
        if (!(bool) ($policy['opsLeadCanReassign'] ?? true) && !$this->isVendorOwnerActor($request)) {
            return false;
        }

        return $this->canRolePerformAction($request, $policy, 'clients', 'reassign');
    }

    private function canActorViewRates(Request $request, array $policy): bool
    {
        if (!(bool) ($policy['financeCanViewRates'] ?? true) && !$this->isVendorOwnerActor($request)) {
            return false;
        }

        if (!$this->passesContextualRestrictionChecks($request, $policy, 'pricing', 'view', null, [])) {
            return false;
        }

        return $this->canRolePerformAction($request, $policy, 'pricing', 'view')
            && $this->canActorViewSensitiveField($request, $policy, 'rate_cards');
    }

    private function actorCourierRoles(Request $request): array
    {
        if ($this->isVendorOwnerActor($request)) {
            return ['courier_owner'];
        }

        return collect(optional($request->user())->roles ?? [])
            ->filter(fn ($role) => ($role->guard_name ?? null) === CourierRbac::GUARD)
            ->map(fn ($role) => (string) $role->name)
            ->filter(fn ($role) => str_starts_with($role, 'courier_'))
            ->unique()
            ->values()
            ->all();
    }

    private function canRolePerformAction(Request $request, array $policy, string $resource, string $action): bool
    {
        if (!in_array($resource, self::ADVANCED_PERMISSION_RESOURCES, true)
            || !in_array($action, self::ADVANCED_PERMISSION_ACTIONS, true)) {
            return false;
        }

        if ($this->isVendorOwnerActor($request)) {
            return true;
        }

        $permissionModel = $this->normalizeAdvancedPermissionModel(is_array($policy['permissionModel'] ?? null) ? $policy['permissionModel'] : []);
        if (!(bool) ($permissionModel['enabled'] ?? true)) {
            return true;
        }

        $roles = $this->actorCourierRoles($request);
        if (empty($roles)) {
            return false;
        }

        foreach ($roles as $roleName) {
            $rolePolicy = $permissionModel['rolePolicies'][$roleName] ?? null;
            if (!$rolePolicy) {
                continue;
            }

            if ((bool) ($rolePolicy['resources'][$resource][$action] ?? false)) {
                return true;
            }
        }

        return false;
    }

    private function resolveScopeForPermission(Request $request, array $policy, string $resource, string $action): string
    {
        if ($this->isVendorOwnerActor($request)) {
            return 'all_workspace';
        }

        $permissionModel = $this->normalizeAdvancedPermissionModel(is_array($policy['permissionModel'] ?? null) ? $policy['permissionModel'] : []);
        if (!(bool) ($permissionModel['enabled'] ?? true)) {
            return 'all_workspace';
        }

        $roles = $this->actorCourierRoles($request);
        $bestScope = 'own_records';

        foreach ($roles as $roleName) {
            $rolePolicy = $permissionModel['rolePolicies'][$roleName] ?? null;
            if (!$rolePolicy) {
                continue;
            }

            if (!(bool) ($rolePolicy['resources'][$resource][$action] ?? false)) {
                continue;
            }

            $candidate = (string) ($rolePolicy['scope'] ?? 'own_records');
            if ($this->scopeRank($candidate) > $this->scopeRank($bestScope)) {
                $bestScope = $candidate;
            }
        }

        return in_array($bestScope, self::ADVANCED_SCOPE_LEVELS, true) ? $bestScope : 'own_records';
    }

    private function scopeRank(string $scope): int
    {
        return match ($scope) {
            'all_workspace' => 4,
            'assigned_hub' => 3,
            'assigned_region' => 2,
            default => 1,
        };
    }

    private function assertAdvancedPermission(
        Request $request,
        array $policy,
        string $resource,
        string $action,
        ?CourierShipment $shipment = null,
        array $extraContext = []
    ): void {
        if (!$this->canRolePerformAction($request, $policy, $resource, $action)) {
            $this->logPermissionDenied($request, $resource, $action, [
                'reason' => 'role_action_blocked',
            ]);
            abort(403, 'Team Access Control policy blocks this action for your role.');
        }

        $deniedReason = null;
        $contextMeta = [];
        if (!$this->passesContextualRestrictionChecks($request, $policy, $resource, $action, $shipment, $extraContext, $deniedReason, $contextMeta)) {
            $this->logPermissionDenied($request, $resource, $action, array_merge([
                'reason' => $deniedReason ?: 'context_restriction_blocked',
            ], $contextMeta));
            abort(403, 'Team Access Control context restriction blocked this action.');
        }

        if (!$shipment) {
            if ($action === 'refund') {
                $this->ensureSensitiveActionApproval($request, $policy, '__refund__', [
                    'resourceType' => $resource,
                    'subject' => 'refund_action',
                    'amount' => (float) ($extraContext['amount'] ?? 0),
                ], true);
            }
            return;
        }

        $scope = $this->resolveScopeForPermission($request, $policy, $resource, $action);
        $query = CourierShipment::query()->whereKey($shipment->id);
        $this->applyShipmentScopeFilter(
            $query,
            $scope,
            $request,
            (int) $request->attributes->get('vendor_user_id')
        );
        $this->applyShipmentDataScopeFilter(
            $query,
            $this->resolveEffectiveDataScopeConstraints($request, $policy, $resource, $action),
            (int) $request->attributes->get('vendor_user_id')
        );

        if (!$query->exists()) {
            $this->logPermissionDenied($request, $resource, $action, [
                'reason' => 'scope_blocked',
                'scope' => $scope,
                'shipment_id' => $shipment->id,
            ]);
            abort(403, 'Team Access Control scope does not allow this record.');
        }
    }

    private function logPermissionDenied(Request $request, string $resource, string $action, array $context = []): void
    {
        try {
            VendorActivityLog::create([
                'vendor_id' => (int) $request->attributes->get('vendor_user_id'),
                'admin_id' => (int) optional($request->user())->id,
                'action' => 'courier_permission_denied',
                'target_type' => 'team_access_policy',
                'target_id' => null,
                'description' => 'Permission denied by Team Access Control policy.',
                'metadata' => array_merge([
                    'resource' => $resource,
                    'requested_action' => $action,
                    'roles' => $this->actorCourierRoles($request),
                ], $context),
            ]);

            app(CourierTeamSecurityAuditService::class)->recordPermissionDenied(
                $request,
                'team_access_policy_denied',
                array_merge([
                    'resource' => $resource,
                    'requested_action' => $action,
                ], $context)
            );
        } catch (\Throwable) {
            // Ignore audit write failures to avoid breaking business flow.
        }
    }

    private function logTeamAccessPolicyChange(Request $request, string $action, array $context = []): void
    {
        try {
            VendorActivityLog::create([
                'vendor_id' => (int) $request->attributes->get('vendor_user_id'),
                'admin_id' => (int) optional($request->user())->id,
                'action' => $action,
                'target_type' => 'team_access_policy',
                'target_id' => null,
                'description' => 'Team Access Control policy updated.',
                'metadata' => $context,
            ]);
        } catch (\Throwable) {
            // Ignore audit write failures to avoid breaking settings updates.
        }
    }

    private function listTeamSensitiveApprovals(int $vendorId, int $workspaceId): array
    {
        return CourierSensitiveActionApproval::query()
            ->where('vendor_user_id', $vendorId)
            ->where(function (Builder $query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')
                    ->orWhere('service_workspace_id', $workspaceId);
            })
            ->whereIn('status', [
                CourierSensitiveActionApprovalService::STATUS_PENDING,
                CourierSensitiveActionApprovalService::STATUS_APPROVED,
            ])
            ->with(['requester:id,name,email', 'approver:id,name,email'])
            ->orderByDesc('id')
            ->limit(80)
            ->get()
            ->map(function (CourierSensitiveActionApproval $item) {
                return [
                    'id' => (int) $item->id,
                    'actionKey' => (string) $item->action_key,
                    'status' => (string) $item->status,
                    'requiredApprovals' => (int) $item->required_approvals,
                    'approvedCount' => (int) $item->approved_count,
                    'amount' => $item->amount !== null ? (float) $item->amount : null,
                    'thresholdLevel' => (string) ($item->threshold_level ?? ''),
                    'reason' => (string) ($item->reason ?? ''),
                    'context' => is_array($item->context) ? $item->context : [],
                    'requester' => [
                        'id' => (int) ($item->requester?->id ?? 0),
                        'name' => (string) ($item->requester?->name ?? ''),
                        'email' => (string) ($item->requester?->email ?? ''),
                    ],
                    'lastApprover' => [
                        'id' => (int) ($item->approver?->id ?? 0),
                        'name' => (string) ($item->approver?->name ?? ''),
                        'email' => (string) ($item->approver?->email ?? ''),
                    ],
                    'expiresAt' => optional($item->expires_at)->format('Y-m-d H:i:s'),
                    'createdAt' => optional($item->created_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->values()
            ->all();
    }

    private function listTeamTemporaryAccessGrants(int $vendorId, int $workspaceId): array
    {
        return CourierTemporaryAccessGrant::query()
            ->where('vendor_user_id', $vendorId)
            ->where(function (Builder $query) use ($workspaceId) {
                $query->whereNull('service_workspace_id')
                    ->orWhere('service_workspace_id', $workspaceId);
            })
            ->whereIn('status', [
                CourierTemporaryAccessService::STATUS_PENDING,
                CourierTemporaryAccessService::STATUS_ACTIVE,
            ])
            ->with(['requester:id,name,email', 'approver:id,name,email', 'targetUser:id,name,email'])
            ->orderByDesc('id')
            ->limit(120)
            ->get()
            ->map(function (CourierTemporaryAccessGrant $item) {
                return [
                    'id' => (int) $item->id,
                    'grantType' => (string) $item->grant_type,
                    'status' => (string) $item->status,
                    'elevatedRoleName' => (string) $item->elevated_role_name,
                    'ticketRef' => (string) $item->ticket_ref,
                    'reason' => (string) $item->reason,
                    'durationMinutes' => (int) $item->duration_minutes,
                    'startsAt' => optional($item->starts_at)->format('Y-m-d H:i:s'),
                    'expiresAt' => optional($item->expires_at)->format('Y-m-d H:i:s'),
                    'createdAt' => optional($item->created_at)->format('Y-m-d H:i:s'),
                    'targetUser' => [
                        'id' => (int) ($item->targetUser?->id ?? 0),
                        'name' => (string) ($item->targetUser?->name ?? ''),
                        'email' => (string) ($item->targetUser?->email ?? ''),
                    ],
                    'requester' => [
                        'id' => (int) ($item->requester?->id ?? 0),
                        'name' => (string) ($item->requester?->name ?? ''),
                        'email' => (string) ($item->requester?->email ?? ''),
                    ],
                    'approver' => [
                        'id' => (int) ($item->approver?->id ?? 0),
                        'name' => (string) ($item->approver?->name ?? ''),
                        'email' => (string) ($item->approver?->email ?? ''),
                    ],
                    'context' => is_array($item->grant_context) ? $item->grant_context : [],
                ];
            })
            ->values()
            ->all();
    }

    private function ensureSensitiveActionApproval(
        Request $request,
        array $policy,
        string $action,
        array $context = [],
        bool $throwOnPending = false
    ): array {
        $actionKey = match ($action) {
            'cancel_booking', 'cancel_shipment' => CourierSensitiveActionApprovalService::ACTION_HIGH_VALUE_CANCELLATION,
            '__refund__' => CourierSensitiveActionApprovalService::ACTION_REFUND,
            '__cod_override__' => CourierSensitiveActionApprovalService::ACTION_COD_OVERRIDE,
            '__ownership_transfer__' => CourierSensitiveActionApprovalService::ACTION_OWNERSHIP_TRANSFER,
            '__client_export__' => CourierSensitiveActionApprovalService::ACTION_CLIENT_LIST_EXPORT,
            default => null,
        };

        if (!$actionKey) {
            return ['ok' => true, 'approval' => null, 'message' => null];
        }

        $service = app(CourierSensitiveActionApprovalService::class);
        $result = $service->ensureApprovedOrQueue(
            $request,
            (int) $request->attributes->get('vendor_user_id'),
            (int) $request->attributes->get('service_workspace_id'),
            is_array($policy['approvalControl'] ?? null) ? $policy['approvalControl'] : [],
            $actionKey,
            $context
        );

        if (!(bool) ($result['ok'] ?? false) && $throwOnPending) {
            abort(403, (string) ($result['message'] ?? 'Sensitive action approval is required.'));
        }

        if (!(bool) ($result['ok'] ?? false)) {
            $this->logPermissionDenied($request, 'team_access', 'approval_required', [
                'reason' => 'approval_required',
                'approval_action' => $actionKey,
                'approval_message' => (string) ($result['message'] ?? ''),
            ]);
        }

        return [
            'ok' => (bool) ($result['ok'] ?? false),
            'approval' => $result['approval'] ?? null,
            'message' => (string) ($result['message'] ?? ''),
        ];
    }

    private function markSensitiveActionApprovalExecuted($approval): void
    {
        if (!$approval instanceof CourierSensitiveActionApproval) {
            return;
        }

        if ($approval->status !== CourierSensitiveActionApprovalService::STATUS_APPROVED) {
            return;
        }

        app(CourierSensitiveActionApprovalService::class)->markExecuted($approval);
    }

    private function applyShipmentScopeFilter(Builder $query, string $scope, Request $request, int $vendorId): void
    {
        if ($this->isVendorOwnerActor($request) || $scope === 'all_workspace') {
            return;
        }

        if ($scope === 'own_records') {
            $query->where(function (Builder $builder) use ($request) {
                $actorId = (int) optional($request->user())->id;
                $builder->where('requested_by_user_id', $actorId)
                    ->orWhereHas('sender', function (Builder $sender) use ($actorId) {
                        $sender->where('user_id', $actorId);
                    });
            });
            return;
        }

        if ($scope === 'assigned_hub') {
            $keywords = $this->resolveScopeKeywords($vendorId, 'assigned_hub');
            if (empty($keywords)) {
                $query->whereRaw('1 = 0');
                return;
            }

            $query->where(function (Builder $builder) use ($keywords) {
                $builder->whereHas('senderAddress', function (Builder $address) use ($keywords) {
                    $address->where(function (Builder $nested) use ($keywords) {
                        foreach ($keywords as $keyword) {
                            $nested->orWhere('city', 'like', '%' . $keyword . '%')
                                ->orWhere('state', 'like', '%' . $keyword . '%');
                        }
                    });
                })->orWhereHas('recipientAddress', function (Builder $address) use ($keywords) {
                    $address->where(function (Builder $nested) use ($keywords) {
                        foreach ($keywords as $keyword) {
                            $nested->orWhere('city', 'like', '%' . $keyword . '%')
                                ->orWhere('state', 'like', '%' . $keyword . '%');
                        }
                    });
                });
            });
            return;
        }

        if ($scope === 'assigned_region') {
            $keywords = $this->resolveScopeKeywords($vendorId, 'assigned_region');
            if (empty($keywords)) {
                $query->whereRaw('1 = 0');
                return;
            }

            $query->where(function (Builder $builder) use ($keywords) {
                $builder->whereHas('senderAddress', function (Builder $address) use ($keywords) {
                    $address->where(function (Builder $nested) use ($keywords) {
                        foreach ($keywords as $keyword) {
                            $nested->orWhere('city', 'like', '%' . $keyword . '%')
                                ->orWhere('country', 'like', '%' . $keyword . '%')
                                ->orWhere('state', 'like', '%' . $keyword . '%');
                        }
                    });
                })->orWhereHas('recipientAddress', function (Builder $address) use ($keywords) {
                    $address->where(function (Builder $nested) use ($keywords) {
                        foreach ($keywords as $keyword) {
                            $nested->orWhere('city', 'like', '%' . $keyword . '%')
                                ->orWhere('country', 'like', '%' . $keyword . '%')
                                ->orWhere('state', 'like', '%' . $keyword . '%');
                        }
                    });
                });
            });
        }
    }

    private function resolveEffectiveDataScopeConstraints(Request $request, array $policy, string $resource, string $action): array
    {
        $defaults = $this->defaultRoleDataScopeConstraints();

        if ($this->isVendorOwnerActor($request)) {
            return $defaults;
        }

        $permissionModel = $this->normalizeAdvancedPermissionModel(is_array($policy['permissionModel'] ?? null) ? $policy['permissionModel'] : []);
        if (!(bool) ($permissionModel['enabled'] ?? true)) {
            return $defaults;
        }

        $applicablePolicies = $this->resolveApplicableRolePolicies($request, $permissionModel, $resource, $action);

        if (empty($applicablePolicies)) {
            return $defaults;
        }

        $restrictiveListMerge = function (array $policies, string $key): array {
            $result = null;
            foreach ($policies as $rolePolicy) {
                $items = collect($rolePolicy['constraints'][$key] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
                if (empty($items)) {
                    continue;
                }

                if ($result === null) {
                    $result = $items;
                    continue;
                }

                $result = array_values(array_intersect($result, $items));
            }

            return $result === null ? [] : $result;
        };

        $restrictiveIntListMerge = function (array $policies, string $key): array {
            $result = null;
            foreach ($policies as $rolePolicy) {
                $items = collect($rolePolicy['constraints'][$key] ?? [])->map(fn ($item) => (int) $item)->filter(fn ($id) => $id > 0)->values()->all();
                if (empty($items)) {
                    continue;
                }

                if ($result === null) {
                    $result = $items;
                    continue;
                }

                $result = array_values(array_intersect($result, $items));
            }

            return $result === null ? [] : $result;
        };

        $allowedEnvironments = $restrictiveListMerge($applicablePolicies, 'allowedEnvironments');
        if (empty($allowedEnvironments)) {
            $allowedEnvironments = self::ADVANCED_ENVIRONMENTS;
        }

        $blockedActionsByEnvironment = [];
        foreach (self::ADVANCED_ENVIRONMENTS as $environment) {
            $blockedActionsByEnvironment[$environment] = collect($applicablePolicies)
                ->flatMap(fn ($rolePolicy) => $rolePolicy['constraints']['blockedActionsByEnvironment'][$environment] ?? [])
                ->map(fn ($item) => trim((string) $item))
                ->filter(fn ($actionName) => in_array($actionName, self::ADVANCED_PERMISSION_ACTIONS, true))
                ->unique()
                ->values()
                ->all();
        }

        $enforceShiftWindow = collect($applicablePolicies)->contains(fn ($rolePolicy) => (bool) ($rolePolicy['constraints']['enforceShiftWindow'] ?? false));

        $shiftStarts = collect($applicablePolicies)
            ->filter(fn ($rolePolicy) => (bool) ($rolePolicy['constraints']['enforceShiftWindow'] ?? false))
            ->map(fn ($rolePolicy) => $this->normalizeTimeValue((string) ($rolePolicy['constraints']['shiftStart'] ?? '00:00')))
            ->values();

        $shiftEnds = collect($applicablePolicies)
            ->filter(fn ($rolePolicy) => (bool) ($rolePolicy['constraints']['enforceShiftWindow'] ?? false))
            ->map(fn ($rolePolicy) => $this->normalizeTimeValue((string) ($rolePolicy['constraints']['shiftEnd'] ?? '23:59')))
            ->values();

        return array_replace($defaults, [
            'regionZones' => $restrictiveListMerge($applicablePolicies, 'regionZones'),
            'hubBranches' => $restrictiveListMerge($applicablePolicies, 'hubBranches'),
            'allowedCustomerIds' => $restrictiveIntListMerge($applicablePolicies, 'allowedCustomerIds'),
            'keyAccountsOnly' => collect($applicablePolicies)->contains(fn ($rolePolicy) => (bool) ($rolePolicy['constraints']['keyAccountsOnly'] ?? false)),
            'enforceShiftWindow' => $enforceShiftWindow,
            'shiftStart' => $enforceShiftWindow ? (string) $shiftStarts->max() : '00:00',
            'shiftEnd' => $enforceShiftWindow ? (string) $shiftEnds->min() : '23:59',
            'allowedEnvironments' => $allowedEnvironments,
            'blockedActionsByEnvironment' => $blockedActionsByEnvironment,
        ]);
    }

    private function resolveApplicableRolePolicies(Request $request, array $permissionModel, string $resource, string $action): array
    {
        $roles = $this->actorCourierRoles($request);

        return collect($roles)
            ->map(fn ($roleName) => $permissionModel['rolePolicies'][$roleName] ?? null)
            ->filter(function ($rolePolicy) use ($resource, $action) {
                return is_array($rolePolicy)
                    && (bool) ($rolePolicy['resources'][$resource][$action] ?? false);
            })
            ->values()
            ->all();
    }

    private function applyShipmentDataScopeFilter(Builder $query, array $constraints, int $vendorId): void
    {
        $regionZones = collect($constraints['regionZones'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!empty($regionZones)) {
            $query->where(function (Builder $builder) use ($regionZones) {
                $builder->whereHas('senderAddress', function (Builder $address) use ($regionZones) {
                    $address->where(function (Builder $nested) use ($regionZones) {
                        foreach ($regionZones as $zone) {
                            $nested->orWhere('city', 'like', '%' . $zone . '%')
                                ->orWhere('state', 'like', '%' . $zone . '%')
                                ->orWhere('country', 'like', '%' . $zone . '%');
                        }
                    });
                })->orWhereHas('recipientAddress', function (Builder $address) use ($regionZones) {
                    $address->where(function (Builder $nested) use ($regionZones) {
                        foreach ($regionZones as $zone) {
                            $nested->orWhere('city', 'like', '%' . $zone . '%')
                                ->orWhere('state', 'like', '%' . $zone . '%')
                                ->orWhere('country', 'like', '%' . $zone . '%');
                        }
                    });
                });
            });
        }

        $hubBranches = collect($constraints['hubBranches'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!empty($hubBranches)) {
            $query->where(function (Builder $builder) use ($hubBranches) {
                $builder->whereHas('senderAddress', function (Builder $address) use ($hubBranches) {
                    $address->where(function (Builder $nested) use ($hubBranches) {
                        foreach ($hubBranches as $hub) {
                            $nested->orWhere('city', 'like', '%' . $hub . '%')
                                ->orWhere('state', 'like', '%' . $hub . '%');
                        }
                    });
                })->orWhereHas('recipientAddress', function (Builder $address) use ($hubBranches) {
                    $address->where(function (Builder $nested) use ($hubBranches) {
                        foreach ($hubBranches as $hub) {
                            $nested->orWhere('city', 'like', '%' . $hub . '%')
                                ->orWhere('state', 'like', '%' . $hub . '%');
                        }
                    });
                });
            });
        }

        $allowedCustomerIds = collect($constraints['allowedCustomerIds'] ?? [])->map(fn ($item) => (int) $item)->filter(fn ($id) => $id > 0)->values()->all();
        if (!empty($allowedCustomerIds)) {
            $query->whereIn('sender_contact_id', $allowedCustomerIds);
        }

        if ((bool) ($constraints['keyAccountsOnly'] ?? false)) {
            $keyAccountIds = $this->resolveKeyAccountContactIds($vendorId);
            if (empty($keyAccountIds)) {
                $query->whereRaw('1 = 0');
                return;
            }

            $query->whereIn('sender_contact_id', $keyAccountIds);
        }
    }

    private function resolveKeyAccountContactIds(int $vendorId): array
    {
        return VendorCourierClientProfile::query()
            ->where('vendor_user_id', $vendorId)
            ->where(function (Builder $query) {
                $query->where('priority_tag', 'vip')
                    ->orWhere('client_tier', 'enterprise');
            })
            ->pluck('contact_id')
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();
    }

    private function passesContextualRestrictionChecks(
        Request $request,
        array $policy,
        string $resource,
        string $action,
        ?CourierShipment $shipment,
        array $extraContext = [],
        ?string &$reason = null,
        ?array &$contextMeta = null
    ): bool {
        $constraints = $this->resolveEffectiveDataScopeConstraints($request, $policy, $resource, $action);
        $environment = $this->resolvePolicyEnvironmentKey();

        $allowedEnvironments = collect($constraints['allowedEnvironments'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!in_array($environment, $allowedEnvironments, true)) {
            $reason = 'environment_blocked';
            $contextMeta = ['environment' => $environment];
            return false;
        }

        $blockedActions = collect($constraints['blockedActionsByEnvironment'][$environment] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (in_array($action, $blockedActions, true)) {
            $reason = 'environment_action_blocked';
            $contextMeta = ['environment' => $environment];
            return false;
        }

        if ((bool) ($constraints['enforceShiftWindow'] ?? false) && $action !== 'view') {
            $start = $this->normalizeTimeValue((string) ($constraints['shiftStart'] ?? '00:00'));
            $end = $this->normalizeTimeValue((string) ($constraints['shiftEnd'] ?? '23:59'));
            if (!$this->isCurrentTimeWithinWindow($start, $end)) {
                $reason = 'outside_shift_window';
                $contextMeta = [
                    'shift_start' => $start,
                    'shift_end' => $end,
                ];
                return false;
            }
        }

        if (!$this->evaluateAbacPolicyRules($request, $policy, $resource, $action, $shipment, $extraContext, $reason, $contextMeta)) {
            return false;
        }

        return true;
    }

    private function evaluateAbacPolicyRules(
        Request $request,
        array $policy,
        string $resource,
        string $action,
        ?CourierShipment $shipment,
        array $extraContext,
        ?string &$reason = null,
        ?array &$contextMeta = null
    ): bool {
        if ($this->isVendorOwnerActor($request)) {
            return true;
        }

        $permissionModel = $this->normalizeAdvancedPermissionModel(is_array($policy['permissionModel'] ?? null) ? $policy['permissionModel'] : []);
        if (!(bool) ($permissionModel['enabled'] ?? true)) {
            return true;
        }

        $applicablePolicies = $this->resolveApplicableRolePolicies($request, $permissionModel, $resource, $action);
        if (empty($applicablePolicies)) {
            return true;
        }

        $context = $this->resolveAbacContext($shipment, $extraContext, (int) $request->attributes->get('vendor_user_id'));

        $matchingAllowRules = [];
        $matchingDenyRules = [];
        $hasScopedRules = false;

        foreach ($applicablePolicies as $rolePolicy) {
            $rules = is_array($rolePolicy['constraints']['policyRules'] ?? null) ? $rolePolicy['constraints']['policyRules'] : [];

            foreach ($rules as $rule) {
                if (!$this->ruleTargetsActionAndResource($rule, $resource, $action)) {
                    continue;
                }

                $hasScopedRules = true;

                if (!$this->ruleConditionsMatchContext($rule, $context)) {
                    continue;
                }

                if (($rule['effect'] ?? 'allow') === 'deny') {
                    $matchingDenyRules[] = $rule;
                } else {
                    $matchingAllowRules[] = $rule;
                }
            }
        }

        if (!empty($matchingDenyRules)) {
            $rule = $matchingDenyRules[0];
            $reason = 'abac_deny_rule';
            $contextMeta = [
                'rule_id' => (string) ($rule['id'] ?? ''),
                'rule_label' => (string) ($rule['label'] ?? ''),
            ];
            return false;
        }

        if (!empty($matchingAllowRules)) {
            return true;
        }

        if ($hasScopedRules) {
            $reason = 'abac_allow_not_matched';
            $contextMeta = [
                'abac_context' => $context,
            ];
            return false;
        }

        return true;
    }

    private function resolveAbacContext(?CourierShipment $shipment, array $extraContext, int $vendorId): array
    {
        $context = [
            'shipmentStage' => null,
            'amount' => null,
            'clientTier' => null,
            'slaClass' => null,
        ];

        if ($shipment) {
            $estimatedDelivery = $this->estimateDeliveryDateTime($shipment);
            $deliveredAt = $this->getDeliveredAt($shipment);
            $timelineState = $this->getTimelineState($shipment, $estimatedDelivery, $deliveredAt);

            $context['shipmentStage'] = $this->getShipmentStage($shipment);
            $context['amount'] = (float) ($shipment->estimated_cost ?? 0);
            $context['slaClass'] = $this->resolveSlaStatus($shipment, $estimatedDelivery, $timelineState);

            if ($shipment->sender_contact_id) {
                $context['clientTier'] = VendorCourierClientProfile::query()
                    ->where('vendor_user_id', $vendorId)
                    ->where('contact_id', (int) $shipment->sender_contact_id)
                    ->value('client_tier');
            }
        }

        if (array_key_exists('shipmentStage', $extraContext)) {
            $context['shipmentStage'] = trim((string) $extraContext['shipmentStage']) ?: null;
        }

        if (array_key_exists('amount', $extraContext) && is_numeric($extraContext['amount'])) {
            $context['amount'] = (float) $extraContext['amount'];
        }

        if (array_key_exists('clientTier', $extraContext)) {
            $tier = trim((string) $extraContext['clientTier']);
            $context['clientTier'] = $tier !== '' ? $tier : null;
        }

        if (array_key_exists('slaClass', $extraContext)) {
            $slaClass = trim((string) $extraContext['slaClass']);
            $context['slaClass'] = $slaClass !== '' ? $slaClass : null;
        }

        return $context;
    }

    private function ruleTargetsActionAndResource(array $rule, string $resource, string $action): bool
    {
        $ruleResource = trim((string) ($rule['resource'] ?? '*'));
        $ruleAction = trim((string) ($rule['action'] ?? '*'));

        $resourceMatches = $ruleResource === '*' || $ruleResource === $resource;
        $actionMatches = $ruleAction === '*' || $ruleAction === $action;

        return $resourceMatches && $actionMatches;
    }

    private function ruleConditionsMatchContext(array $rule, array $context): bool
    {
        $conditions = is_array($rule['conditions'] ?? null) ? $rule['conditions'] : [];

        $shipmentStages = collect($conditions['shipmentStages'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!empty($shipmentStages) && !in_array((string) ($context['shipmentStage'] ?? ''), $shipmentStages, true)) {
            return false;
        }

        $minAmount = is_numeric($conditions['minAmount'] ?? null) ? (float) $conditions['minAmount'] : null;
        if ($minAmount !== null && (!is_numeric($context['amount'] ?? null) || (float) $context['amount'] < $minAmount)) {
            return false;
        }

        $maxAmount = is_numeric($conditions['maxAmount'] ?? null) ? (float) $conditions['maxAmount'] : null;
        if ($maxAmount !== null && (!is_numeric($context['amount'] ?? null) || (float) $context['amount'] > $maxAmount)) {
            return false;
        }

        $clientTiers = collect($conditions['clientTiers'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!empty($clientTiers) && !in_array((string) ($context['clientTier'] ?? ''), $clientTiers, true)) {
            return false;
        }

        $slaClasses = collect($conditions['slaClasses'] ?? [])->map(fn ($item) => trim((string) $item))->filter()->values()->all();
        if (!empty($slaClasses) && !in_array((string) ($context['slaClass'] ?? ''), $slaClasses, true)) {
            return false;
        }

        return true;
    }

    private function resolvePolicyEnvironmentKey(): string
    {
        $env = strtolower((string) app()->environment());
        return in_array($env, ['production', 'prod'], true) ? 'production' : 'sandbox';
    }

    private function isCurrentTimeWithinWindow(string $start, string $end): bool
    {
        $now = now()->format('H:i');

        if ($start <= $end) {
            return $now >= $start && $now <= $end;
        }

        return $now >= $start || $now <= $end;
    }

    private function resolveScopeKeywords(int $vendorId, string $scope): array
    {
        $record = VendorCourierSetting::query()->firstWhere('vendor_user_id', $vendorId);
        $settings = is_array($record?->settings) ? $record->settings : [];
        $business = is_array($settings['business'] ?? null) ? $settings['business'] : [];

        if ($scope === 'assigned_hub') {
            $hub = trim((string) ($business['primaryHub'] ?? ''));
            return $hub !== '' ? [$hub] : [];
        }

        $zones = collect(explode(',', (string) ($business['serviceZones'] ?? '')))
            ->map(fn ($item) => trim((string) $item))
            ->filter()
            ->values()
            ->all();

        return $zones;
    }

    private function canActorViewSensitiveField(Request $request, array $policy, string $fieldKey): bool
    {
        if ($this->isVendorOwnerActor($request)) {
            return true;
        }

        if (!in_array($fieldKey, self::SENSITIVE_FIELD_KEYS, true)) {
            return true;
        }

        $permissionModel = $this->normalizeAdvancedPermissionModel(is_array($policy['permissionModel'] ?? null) ? $policy['permissionModel'] : []);
        if (!(bool) ($permissionModel['enabled'] ?? true)) {
            return true;
        }

        $allowedRoles = collect($permissionModel['fieldVisibility'][$fieldKey]['visibleToRoles'] ?? [])->map(fn ($role) => (string) $role)->all();
        if (empty($allowedRoles)) {
            return false;
        }

        return collect($this->actorCourierRoles($request))
            ->intersect($allowedRoles)
            ->isNotEmpty();
    }

    private function mapBookingLifecycleActionToPermissionAction(string $action): string
    {
        return match ($action) {
            'accept_booking' => 'approve',
            'cancel_booking', 'reject_booking', 'expire_booking' => 'cancel',
            default => 'update',
        };
    }

    private function mapShipmentActionToPermissionAction(string $action): string
    {
        return match ($action) {
            'accept_assignment' => 'approve',
            'cancel_shipment' => 'cancel',
            default => 'update',
        };
    }

    private function mapClientActionToPermissionAction(string $action): string
    {
        return $action === 'set_owner' ? 'reassign' : 'update';
    }

    private function assertStaffSecurityPolicy(Request $request, array $policy): void
    {
        if (!(bool) ($policy['enforce2FA'] ?? true)) {
            return;
        }

        if ($this->isVendorOwnerActor($request)) {
            return;
        }

        $user = $request->user();
        if ($user && (bool) $user->must_change_password) {
            abort(403, 'Security policy requires staff account hardening before this action. Please change your password and sign in again.');
        }
    }

    private function mergePricingImportZoneRows(array $existing, array $incoming): array
    {
        $merged = [];

        foreach (array_merge($existing, $incoming) as $index => $item) {
            $row = is_array($item) ? $item : [];
            $key = $this->normalizeZoneKey((string) ($row['key'] ?? $row['label'] ?? ''));
            if ($key === '*' || $key === '') {
                continue;
            }

            $label = trim((string) ($row['label'] ?? ''));
            if ($label === '') {
                $label = ucwords(str_replace('_', ' ', $key));
            }

            $merged[$key] = [
                'key' => $key,
                'label' => $label,
                'isActive' => (bool) ($row['isActive'] ?? true),
                'sortOrder' => max(1, (int) ($row['sortOrder'] ?? ($index + 1))),
            ];
        }

        $rows = array_values($merged);
        usort($rows, fn ($a, $b) => (int) $a['sortOrder'] <=> (int) $b['sortOrder']);

        foreach ($rows as $index => $row) {
            $rows[$index]['sortOrder'] = $index + 1;
        }

        return $rows;
    }

    private function mergePricingImportCategoryRows(array $existing, array $incoming): array
    {
        $merged = [];

        foreach (array_merge($existing, $incoming) as $index => $item) {
            $row = is_array($item) ? $item : [];
            $serviceLevelKey = $this->normalizeServiceLevelKey((string) ($row['serviceLevelKey'] ?? ''));
            $label = trim((string) ($row['label'] ?? ''));
            $city = trim((string) ($row['city'] ?? ''));

            if ($serviceLevelKey === '' && $label === '') {
                continue;
            }

            $signature = strtolower($serviceLevelKey . '|' . $label . '|' . $city);

            $merged[$signature] = [
                'id' => trim((string) ($row['id'] ?? '')) ?: 'import_tier_' . $index,
                'label' => $label !== '' ? $label : 'Imported Tier',
                'serviceLevelKey' => $serviceLevelKey !== '' ? $serviceLevelKey : 'economy',
                'slaDays' => max(1, (int) ($row['slaDays'] ?? 1)),
                'basePrice' => max(0, (float) ($row['basePrice'] ?? 0)),
                'perKgPrice' => max(0, (float) ($row['perKgPrice'] ?? 0)),
                'minPrice' => max(0, (float) ($row['minPrice'] ?? 0)),
                'priorityMultiplier' => max(0.1, (float) ($row['priorityMultiplier'] ?? 1)),
                'city' => $city,
            ];
        }

        return array_values($merged);
    }

    private function mergePricingImportLaneRows(array $existing, array $incoming): array
    {
        $merged = [];

        foreach (array_merge($existing, $incoming) as $index => $item) {
            $row = is_array($item) ? $item : [];

            $originZone = $this->normalizeZoneKey((string) ($row['originZone'] ?? '*'));
            $destinationZone = $this->normalizeZoneKey((string) ($row['destinationZone'] ?? '*'));
            $serviceLevelKey = $this->normalizeServiceLevelKey((string) ($row['serviceLevelKey'] ?? ''));
            $distanceFrom = max(0, (float) ($row['distanceFromKm'] ?? 0));
            $distanceTo = isset($row['distanceToKm']) && $row['distanceToKm'] !== '' && $row['distanceToKm'] !== null
                ? max($distanceFrom, (float) $row['distanceToKm'])
                : null;

            $signature = implode('|', [
                $originZone,
                $destinationZone,
                $serviceLevelKey,
                (string) $distanceFrom,
                $distanceTo === null ? '' : (string) $distanceTo,
            ]);

            $merged[$signature] = [
                'id' => trim((string) ($row['id'] ?? '')) ?: 'import_lane_' . $index,
                'originZone' => $originZone,
                'destinationZone' => $destinationZone,
                'serviceLevelKey' => $serviceLevelKey !== '' ? $serviceLevelKey : 'economy',
                'distanceFromKm' => $distanceFrom,
                'distanceToKm' => $distanceTo,
                'distanceBaseKm' => max(0, (float) ($row['distanceBaseKm'] ?? 0)),
                'perKmPrice' => max(0, (float) ($row['perKmPrice'] ?? 0)),
                'distanceSurcharge' => max(0, (float) ($row['distanceSurcharge'] ?? 0)),
                'distanceMultiplier' => max(0.1, (float) ($row['distanceMultiplier'] ?? 1)),
                'basePrice' => max(0, (float) ($row['basePrice'] ?? 0)),
                'perKgPrice' => max(0, (float) ($row['perKgPrice'] ?? 0)),
                'minPrice' => max(0, (float) ($row['minPrice'] ?? 0)),
                'priorityMultiplier' => max(0.1, (float) ($row['priorityMultiplier'] ?? 1)),
                'isActive' => (bool) ($row['isActive'] ?? true),
                'city' => trim((string) ($row['city'] ?? '')),
            ];
        }

        return array_values($merged);
    }

    private function normalizeImportCityKey(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized) ?? '';

        return trim((string) $normalized, '_');
    }

    private function resolveImportedCityZoneMapConflicts(
        array $incomingRows,
        array $existingRows,
        string $resolutionStrategy,
        array $manualResolutions
    ): array {
        $existingByCity = collect($existingRows)
            ->mapWithKeys(function ($item) {
                $row = is_array($item) ? $item : [];
                $cityKey = $this->normalizeImportCityKey((string) ($row['cityKey'] ?? $row['city'] ?? ''));
                $zone = $this->normalizeZoneKey((string) ($row['zone'] ?? ''));

                if ($cityKey === '' || $zone === '*' || $zone === '') {
                    return [];
                }

                return [$cityKey => $zone];
            })
            ->all();

        $manualByCity = collect($manualResolutions)
            ->mapWithKeys(function ($zone, $cityRef) {
                $cityKey = $this->normalizeImportCityKey((string) $cityRef);
                $zoneKey = $this->normalizeZoneKey((string) $zone);

                if ($cityKey === '' || $zoneKey === '*' || $zoneKey === '') {
                    return [];
                }

                return [$cityKey => $zoneKey];
            })
            ->all();

        $resolvedRows = [];
        $missingManual = [];
        $resolvedConflictCount = 0;

        foreach ($incomingRows as $item) {
            $row = is_array($item) ? $item : [];
            $cityLabel = trim((string) ($row['city'] ?? ''));
            $cityKey = $this->normalizeImportCityKey((string) ($row['cityKey'] ?? $cityLabel));
            if ($cityKey === '') {
                continue;
            }

            $zones = [];
            $zonesInput = is_array($row['zones'] ?? null) ? $row['zones'] : [];
            foreach ($zonesInput as $zoneKey => $votes) {
                $normalizedZone = $this->normalizeZoneKey((string) $zoneKey);
                if ($normalizedZone === '*' || $normalizedZone === '') {
                    continue;
                }

                $zones[$normalizedZone] = max(0, (int) $votes);
            }

            $zoneFromRow = $this->normalizeZoneKey((string) ($row['zone'] ?? ''));
            if ($zoneFromRow !== '*' && $zoneFromRow !== '' && !isset($zones[$zoneFromRow])) {
                $zones[$zoneFromRow] = max(1, (int) ($row['votes'] ?? 1));
            }

            if (count($zones) === 0) {
                continue;
            }

            arsort($zones);
            $zoneKeys = array_keys($zones);
            $defaultZone = (string) ($zoneKeys[0] ?? '');
            $isConflict = count($zones) > 1;
            $resolvedZone = $defaultZone;
            $resolvedBy = $isConflict ? 'most_frequent' : 'single_zone';

            if ($resolutionStrategy === 'prefer_existing' && isset($existingByCity[$cityKey])) {
                $resolvedZone = (string) $existingByCity[$cityKey];
                $resolvedBy = 'existing';
            } elseif ($resolutionStrategy === 'manual') {
                if (isset($manualByCity[$cityKey])) {
                    $resolvedZone = (string) $manualByCity[$cityKey];
                    $resolvedBy = 'manual';
                } elseif ($isConflict) {
                    $missingManual[] = [
                        'cityKey' => $cityKey,
                        'city' => $cityLabel !== '' ? $cityLabel : ucwords(str_replace('_', ' ', $cityKey)),
                        'zones' => $zoneKeys,
                    ];
                }
            }

            if ($isConflict) {
                $resolvedConflictCount++;
            }

            $topVotes = (int) ($zones[$defaultZone] ?? 0);
            $totalVotes = max(1, array_sum($zones));

            $resolvedRows[] = [
                'cityKey' => $cityKey,
                'city' => $cityLabel !== '' ? $cityLabel : ucwords(str_replace('_', ' ', $cityKey)),
                'zone' => $resolvedZone,
                'zones' => $zones,
                'isConflict' => $isConflict,
                'recommendedConfidence' => round($topVotes / $totalVotes, 2),
                'resolvedBy' => $resolvedBy,
            ];
        }

        $resolvedRows = collect($resolvedRows)
            ->keyBy(fn ($row) => (string) ($row['cityKey'] ?? ''))
            ->values()
            ->all();

        return [
            'rows' => $resolvedRows,
            'missingManual' => $missingManual,
            'resolvedConflictCount' => $resolvedConflictCount,
        ];
    }

    private function applyCityZoneResolutionToLaneRows(array $laneRows, array $cityZoneRows): array
    {
        $cityZoneByKey = collect($cityZoneRows)
            ->mapWithKeys(function ($item) {
                $row = is_array($item) ? $item : [];
                $cityKey = $this->normalizeImportCityKey((string) ($row['cityKey'] ?? $row['city'] ?? ''));
                $zone = $this->normalizeZoneKey((string) ($row['zone'] ?? ''));

                if ($cityKey === '' || $zone === '*' || $zone === '') {
                    return [];
                }

                return [$cityKey => $zone];
            })
            ->all();

        return collect($laneRows)
            ->map(function ($item) use ($cityZoneByKey) {
                $row = is_array($item) ? $item : [];
                $cityKey = $this->normalizeImportCityKey((string) ($row['city'] ?? ''));

                if ($cityKey !== '' && isset($cityZoneByKey[$cityKey])) {
                    $row['destinationZone'] = $cityZoneByKey[$cityKey];
                }

                return $row;
            })
            ->values()
            ->all();
    }

    private function mergePricingImportCityZoneMapRows(array $existing, array $incoming): array
    {
        $merged = [];

        foreach (array_merge($existing, $incoming) as $item) {
            $row = is_array($item) ? $item : [];
            $cityKey = $this->normalizeImportCityKey((string) ($row['cityKey'] ?? $row['city'] ?? ''));
            $zone = $this->normalizeZoneKey((string) ($row['zone'] ?? ''));
            if ($cityKey === '' || $zone === '*' || $zone === '') {
                continue;
            }

            $zones = [];
            $zonesInput = is_array($row['zones'] ?? null) ? $row['zones'] : [];
            foreach ($zonesInput as $zoneKey => $votes) {
                $normalizedZone = $this->normalizeZoneKey((string) $zoneKey);
                if ($normalizedZone === '*' || $normalizedZone === '') {
                    continue;
                }

                $zones[$normalizedZone] = max(0, (int) $votes);
            }

            if (!isset($zones[$zone])) {
                $zones[$zone] = max(1, (int) ($row['votes'] ?? 1));
            }

            arsort($zones);
            $recommendedZone = (string) array_key_first($zones);
            $topVotes = (int) ($zones[$recommendedZone] ?? 0);
            $totalVotes = max(1, array_sum($zones));

            $merged[$cityKey] = [
                'cityKey' => $cityKey,
                'city' => trim((string) ($row['city'] ?? '')) ?: ucwords(str_replace('_', ' ', $cityKey)),
                'zone' => $zone,
                'zones' => $zones,
                'isConflict' => count($zones) > 1,
                'recommendedConfidence' => round($topVotes / $totalVotes, 2),
            ];
        }

        return array_values($merged);
    }

    private function hasApprovedCourierRegistration(int $vendorId): bool
    {
        if ($vendorId <= 0) {
            return false;
        }

        return VendorServiceRegistration::query()
            ->where('user_id', $vendorId)
            ->where('status', 'approved')
            ->whereHas('serviceCategory', function (Builder $query) {
                $query->where('slug', 'courier-services');
            })
            ->exists();
    }

    private function resolveApprovedCourierPricingCategories(int $vendorId): array
    {
        if ($vendorId <= 0) {
            return [];
        }

        $approvedSubCategorySlugs = VendorServiceRegistration::query()
            ->where('user_id', $vendorId)
            ->where('status', 'approved')
            ->whereHas('serviceCategory', function (Builder $query) {
                $query->where('slug', 'courier-services');
            })
            ->with('serviceSubCategory:id,slug')
            ->get()
            ->map(fn (VendorServiceRegistration $registration) => strtolower(trim((string) optional($registration->serviceSubCategory)->slug)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $categories = [];
        foreach ($approvedSubCategorySlugs as $slug) {
            if ($slug === 'domestic') {
                $categories[] = 'domestic';
                continue;
            }

            if ($slug === 'international') {
                $categories[] = 'international';
            }
        }

        return collect($categories)
            ->filter(fn ($item) => in_array($item, ['domestic', 'international'], true))
            ->unique()
            ->values()
            ->all();
    }

    private function enforceApprovedPricingCategoryWriteScope(array $nextPricing, array $currentPricing, array $approvedCategories): array
    {
        $categories = ['domestic', 'international'];
        $next = $nextPricing;

        foreach ($categories as $category) {
            if (in_array($category, $approvedCategories, true)) {
                continue;
            }

            foreach (['localization', 'formula', 'serviceCatalog', 'zoneMaster', 'cityZoneMap', 'policyModules', 'categories'] as $sectionKey) {
                if (!is_array($next[$sectionKey] ?? null)) {
                    $next[$sectionKey] = [];
                }

                $next[$sectionKey][$category] = $currentPricing[$sectionKey][$category] ?? ($next[$sectionKey][$category] ?? []);
            }

            if (!is_array($next['laneMatrix'] ?? null)) {
                $next['laneMatrix'] = [];
            }

            $next['laneMatrix'][$category] = $currentPricing['laneMatrix'][$category] ?? ($next['laneMatrix'][$category] ?? []);
            $enabledCurrent = $currentPricing['laneMatrix']['enabled'][$category]
                ?? ($currentPricing['laneMatrix']['enabled'] ?? false);

            if (!is_array($next['laneMatrix']['enabled'] ?? null)) {
                $next['laneMatrix']['enabled'] = [
                    'domestic' => (bool) ($next['laneMatrix']['enabled'] ?? false),
                    'international' => (bool) ($next['laneMatrix']['enabled'] ?? false),
                ];
            }

            $next['laneMatrix']['enabled'][$category] = (bool) $enabledCurrent;

            if (!is_array($next['governance'] ?? null)) {
                $next['governance'] = [];
            }

            $next['governance'][$category] = $currentPricing['governance'][$category] ?? ($next['governance'][$category] ?? []);
        }

        return $next;
    }

    private function enforceSuperAdminPricingGovernanceAuthorityLock(array $nextPricing, array $currentPricing): array
    {
        $next = $nextPricing;
        $currentGovernance = is_array($currentPricing['governance'] ?? null)
            ? $currentPricing['governance']
            : [];

        foreach (['domestic', 'international'] as $category) {
            $currentCategoryGovernance = is_array($currentGovernance[$category] ?? null)
                ? $currentGovernance[$category]
                : [];

            if (($currentCategoryGovernance['approvalAuthority'] ?? 'vendor') !== 'superadmin') {
                continue;
            }

            if (!is_array($next['governance'] ?? null)) {
                $next['governance'] = [];
            }

            $nextCategoryGovernance = is_array($next['governance'][$category] ?? null)
                ? $next['governance'][$category]
                : [];

            $nextCategoryGovernance['approvalAuthority'] = 'superadmin';
            $nextCategoryGovernance['requireApproval'] = true;

            if (array_key_exists('approverRoles', $currentCategoryGovernance)) {
                $nextCategoryGovernance['approverRoles'] = is_array($currentCategoryGovernance['approverRoles'])
                    ? $currentCategoryGovernance['approverRoles']
                    : [];
            }

            $next['governance'][$category] = $nextCategoryGovernance;
        }

        return $next;
    }

    private function isActiveCourierTeamMember(int $userId): bool
    {
        if ($userId <= 0) {
            return false;
        }

        return VendorUserMembership::query()
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->exists();
    }
}
