import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { BadgeDollarSign, BellRing, ChevronDown, Clock3, KeyRound, MapPinned, Printer, ShieldCheck, Users } from "lucide-react";
import CourierFeedbackModal from "./common/CourierFeedbackModal";
import useCourierActionModal from "./common/useCourierActionModal";

const NOTIFICATION_EVENT_MATRIX_DEFAULT = {
    shipment_placed: { client: { email: true, inApp: false }, internal: { email: false, inApp: false } },
    booking_confirmed: { client: { email: true, inApp: false }, internal: { email: false, inApp: false } },
    booking_cancelled: { client: { email: true, inApp: true }, internal: { email: true, inApp: true } },
    tracking_picked_up: { client: { email: true, inApp: true }, internal: { email: false, inApp: false } },
    tracking_out_for_delivery: { client: { email: true, inApp: true }, internal: { email: false, inApp: false } },
    tracking_delivered: { client: { email: true, inApp: true }, internal: { email: false, inApp: false } },
    payment_paid: { client: { email: true, inApp: true }, internal: { email: false, inApp: false } },
    payment_failed: { client: { email: true, inApp: true }, internal: { email: true, inApp: true } },
    payment_cancelled: { client: { email: true, inApp: true }, internal: { email: true, inApp: true } },
    internal_exception: { internal: { email: true, inApp: true } },
    internal_sla_risk: { internal: { email: true, inApp: true } },
};

const LEGACY_NOTIFICATION_MAP = {
    notifyClientShipmentPlaced: { event: "shipment_placed", audience: "client" },
    notifyClientBookingConfirmed: { event: "booking_confirmed", audience: "client" },
    notifyClientBookingCancelled: { event: "booking_cancelled", audience: "client" },
    notifyClientPickup: { event: "tracking_picked_up", audience: "client" },
    notifyClientOutForDelivery: { event: "tracking_out_for_delivery", audience: "client" },
    notifyClientDelivered: { event: "tracking_delivered", audience: "client" },
    notifyClientPaymentPaid: { event: "payment_paid", audience: "client" },
    notifyClientPaymentFailed: { event: "payment_failed", audience: "client" },
    notifyClientPaymentCancelled: { event: "payment_cancelled", audience: "client" },
    notifyInternalException: { event: "internal_exception", audience: "internal" },
    notifyInternalSlaRisk: { event: "internal_sla_risk", audience: "internal" },
};

const NOTIFICATION_EVENT_LABELS = {
    shipment_placed: "Shipment Placed",
    booking_confirmed: "Booking Confirmed",
    booking_cancelled: "Booking Cancelled",
    tracking_picked_up: "Tracking Picked Up",
    tracking_out_for_delivery: "Out For Delivery",
    tracking_delivered: "Delivered",
    payment_paid: "Payment Paid",
    payment_failed: "Payment Failed",
    payment_cancelled: "Payment Cancelled",
    internal_exception: "Internal Exception",
    internal_sla_risk: "Internal SLA Risk",
};

const buildLegacyNotificationFlags = (eventMatrix) => {
    const matrix = eventMatrix && typeof eventMatrix === "object" ? eventMatrix : {};
    return Object.entries(LEGACY_NOTIFICATION_MAP).reduce((acc, [legacyKey, mapping]) => {
        const fallback = Boolean(NOTIFICATION_EVENT_MATRIX_DEFAULT?.[mapping.event]?.[mapping.audience]?.email);
        const rawValue = matrix?.[mapping.event]?.[mapping.audience]?.email;
        acc[legacyKey] = typeof rawValue === "boolean" ? rawValue : fallback;
        return acc;
    }, {});
};

const buildDefaultNotificationSettings = () => {
    const eventMatrix = JSON.parse(JSON.stringify(NOTIFICATION_EVENT_MATRIX_DEFAULT));
    return {
        ...buildLegacyNotificationFlags(eventMatrix),
        version: 2,
        channels: {
            email: { enabled: true },
            inApp: { enabled: true },
        },
        clientRecipients: {
            requester: true,
            sender: true,
            recipient: true,
            extraEmails: [],
        },
        internalRecipients: {
            roleNames: ["ops_lead"],
            userIds: [],
            extraEmails: [],
        },
        eventMatrix,
        delivery: {
            quietHours: {
                enabled: false,
                start: "22:00",
                end: "06:00",
                timezone: "Asia/Colombo",
            },
            digest: {
                enabled: false,
                frequency: "daily",
                time: "09:00",
                timezone: "Asia/Colombo",
            },
        },
        deliverability: {
            fromName: "Transport Jaan Courier",
            fromEmail: "",
            replyTo: "",
            respectSuppression: true,
        },
    };
};

const DEFAULT_NOTIFICATION_SETTINGS = buildDefaultNotificationSettings();

const DEFAULT_SETTINGS = {
    business: {
        companyName: "Sonnac Lanka Enterprises",
        supportEmail: "ops@sonnac.lk",
        hotline: "+94 11 123 4567",
        primaryHub: "Colombo Hub",
        serviceZones: "Colombo, Gampaha, Kalutara, Kandy",
    },
    operations: {
        autoAcceptBookings: false,
        workStart: "08:00",
        workEnd: "20:00",
        sameDayCutoff: "14:00",
        maxDailyBookings: 350,
    },
    sla: {
        expressHours: 8,
        economyHours: 24,
        breachAlertMinutes: 90,
        autoEscalateExceptions: true,
    },
    tracking: {
        noScan6h: true,
        noScan12h: true,
        noScan24h: false,
        requirePodPhoto: true,
        requirePodSignature: false,
        allowManualScanCorrection: true,
    },
    notifications: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
    },
    integrations: {
        webhookUrl: "",
        apiKeyAlias: "CourierProdKey",
        retryWindowMinutes: 15,
        rotateKeysEveryDays: 90,
    },
    services: {
        cod: {
            acceptCodAtCheckout: false,
            allowCodForDomestic: true,
            allowCodForInternational: false,
            allowTeamOverride: false,
            allowCashCod: true,
            allowBankTransferCod: true,
        },
    },
    labels: {
        defaults: {
            domestic: {
                templateId: null,
                sizeId: null,
            },
            international: {
                templateId: null,
                sizeId: null,
            },
        },
        printPolicy: {
            bulkAsyncThreshold: 50,
            bulkHardLimit: 200,
            allowCustomSizes: true,
            allowTemplateUpload: true,
            allowHtmlTemplates: true,
            allowPdfBackground: true,
        },
    },
    pricing: {
        localization: {
            domestic: {
                baseCurrency: "LKR",
                displayCurrency: "LKR",
                locale: "en-LK",
                exchangeRateProvider: "frankfurter.app",
                autoLiveRates: true,
                manualRates: {
                    LKR: 1,
                    USD: 0.00308,
                    EUR: 0.00284,
                },
                lastSyncedAt: null,
            },
            international: {
                baseCurrency: "LKR",
                displayCurrency: "LKR",
                locale: "en-LK",
                exchangeRateProvider: "frankfurter.app",
                autoLiveRates: true,
                manualRates: {
                    LKR: 1,
                    USD: 0.00308,
                    EUR: 0.00284,
                },
                lastSyncedAt: null,
            },
        },
        formula: {
            domestic: {
                volumetricDivisor: 5000,
                useChargeableWeight: true,
                fuelSurchargePercent: 0,
                handlingFee: 0,
                taxPercent: 0,
                roundTo: 2,
            },
            international: {
                volumetricDivisor: 5000,
                useChargeableWeight: true,
                fuelSurchargePercent: 0,
                handlingFee: 0,
                taxPercent: 0,
                roundTo: 2,
            },
        },
        serviceCatalog: {
            domestic: [
                { key: "same_day", label: "Same Day", promisedSlaDays: 1, cutoffTime: "10:30", isActive: true, sortOrder: 1 },
                { key: "next_day", label: "Next Day", promisedSlaDays: 1, cutoffTime: "15:00", isActive: true, sortOrder: 2 },
                { key: "two_three_day", label: "2-3 Day", promisedSlaDays: 3, cutoffTime: "17:00", isActive: true, sortOrder: 3 },
                { key: "economy", label: "Economy", promisedSlaDays: 5, cutoffTime: "18:00", isActive: true, sortOrder: 4 },
            ],
            international: [
                { key: "next_day", label: "Next Day", promisedSlaDays: 2, cutoffTime: "13:00", isActive: true, sortOrder: 1 },
                { key: "two_three_day", label: "2-3 Day", promisedSlaDays: 3, cutoffTime: "16:00", isActive: true, sortOrder: 2 },
                { key: "economy", label: "Economy", promisedSlaDays: 6, cutoffTime: "18:00", isActive: true, sortOrder: 3 },
            ],
        },
        zoneMaster: {
            domestic: [],
            international: [],
        },
        laneMatrix: {
            enabled: {
                domestic: false,
                international: false,
            },
            domestic: [],
            international: [],
        },
        policyModules: {
            domestic: {
                remoteAreaSurcharge: {
                    enabled: false,
                    flatFee: 0,
                    applyOnOrigin: false,
                    applyOnDestination: true,
                    postalCodePrefixes: [],
                    cityKeywords: [],
                },
                oversizeOverweightRules: {
                    enabled: false,
                    maxWeightKg: 25,
                    overweightPerKgFee: 0,
                    maxLengthCm: 120,
                    maxWidthCm: 80,
                    maxHeightCm: 80,
                    oversizeFlatFee: 0,
                },
                peakHolidaySurcharge: {
                    enabled: false,
                    peakStartTime: "17:00",
                    peakEndTime: "21:00",
                    daysOfWeek: [1, 2, 3, 4, 5],
                    peakPercent: 0,
                    peakFlatFee: 0,
                    holidayDates: [],
                    holidayPercent: 0,
                    holidayFlatFee: 0,
                },
                codFee: {
                    enabled: false,
                    flatFee: 0,
                    percentOfDeclaredValue: 0,
                    minFee: 0,
                    maxFee: null,
                },
                minimumShipmentCharge: {
                    enabled: true,
                    minimumTotal: 0,
                },
                customerContractPricing: {
                    enabled: false,
                    contracts: [],
                },
                quoteRuntimeGovernance: {
                    enabled: false,
                    fieldLocks: {
                        enabled: false,
                        lockShipmentServiceLevel: true,
                        lockPackageServiceLevel: true,
                        lockPackageCourierProvider: true,
                        lockQuoteTotal: true,
                    },
                    discountGuardrails: {
                        enabled: false,
                        maxDiscountPercent: 0,
                        maxDiscountAmountUsd: 0,
                    },
                    floorPriceGuardrail: {
                        enabled: false,
                        minimumTotalUsd: 0,
                    },
                },
                speedEtaTierEngine: {
                    enabled: false,
                    enforceFixedNamedTiers: true,
                    enforceTierPricingMultiplier: true,
                    tiers: {
                        priority_4h: {
                            enabled: true,
                            etaLabel: "Priority 4 Hours",
                            etaMinDays: 0,
                            etaMaxDays: 0,
                            priceMultiplier: 1.45,
                            maxDistanceKm: 35,
                            maxWeightKg: 12,
                            minLeadHours: 0.5,
                            maxLeadHours: 4,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        same_day: {
                            enabled: true,
                            etaLabel: "Same Day",
                            etaMinDays: 0,
                            etaMaxDays: 1,
                            priceMultiplier: 1.25,
                            maxDistanceKm: 80,
                            maxWeightKg: 20,
                            minLeadHours: 1,
                            maxLeadHours: 12,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        next_day: {
                            enabled: true,
                            etaLabel: "Next Day",
                            etaMinDays: 1,
                            etaMaxDays: 2,
                            priceMultiplier: 1.12,
                            maxDistanceKm: 250,
                            maxWeightKg: 30,
                            minLeadHours: 2,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        two_three_day: {
                            enabled: true,
                            etaLabel: "2-3 Days",
                            etaMinDays: 2,
                            etaMaxDays: 3,
                            priceMultiplier: 1,
                            maxDistanceKm: null,
                            maxWeightKg: null,
                            minLeadHours: 0,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        economy: {
                            enabled: true,
                            etaLabel: "Economy",
                            etaMinDays: 4,
                            etaMaxDays: 7,
                            priceMultiplier: 0.92,
                            maxDistanceKm: null,
                            maxWeightKg: null,
                            minLeadHours: 0,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                    },
                },
                internationalDimensionsEngine: {
                    enabled: false,
                    enforceForInternationalOnly: true,
                    unitTypeMultipliers: {
                        parcel: 1.0,
                        pallet: 1.18,
                        crate: 1.24,
                        container_20ft: 1.55,
                        container_40ft: 1.85,
                    },
                    routeClassMultipliers: {
                        standard: 1.0,
                        express_corridor: 1.12,
                        remote_corridor: 1.22,
                        multimodal: 1.3,
                    },
                    handlingClassMultipliers: {
                        standard: 1.0,
                        fragile: 1.08,
                        hazardous: 1.2,
                        cold_chain: 1.18,
                        heavy_lift: 1.26,
                    },
                    w2wOption: {
                        enabled: true,
                        strictForInternational: true,
                        defaultMode: "door_to_door",
                        minimumUnitCount: 1,
                        maximumUnitCount: null,
                        modeMultipliers: {
                            door_to_door: 1.15,
                            port_to_port: 0.92,
                            hybrid: 1,
                        },
                    },
                },
            },
            international: {
                remoteAreaSurcharge: {
                    enabled: false,
                    flatFee: 0,
                    applyOnOrigin: false,
                    applyOnDestination: true,
                    postalCodePrefixes: [],
                    cityKeywords: [],
                },
                oversizeOverweightRules: {
                    enabled: false,
                    maxWeightKg: 25,
                    overweightPerKgFee: 0,
                    maxLengthCm: 120,
                    maxWidthCm: 80,
                    maxHeightCm: 80,
                    oversizeFlatFee: 0,
                },
                peakHolidaySurcharge: {
                    enabled: false,
                    peakStartTime: "17:00",
                    peakEndTime: "21:00",
                    daysOfWeek: [1, 2, 3, 4, 5],
                    peakPercent: 0,
                    peakFlatFee: 0,
                    holidayDates: [],
                    holidayPercent: 0,
                    holidayFlatFee: 0,
                },
                codFee: {
                    enabled: false,
                    flatFee: 0,
                    percentOfDeclaredValue: 0,
                    minFee: 0,
                    maxFee: null,
                },
                minimumShipmentCharge: {
                    enabled: true,
                    minimumTotal: 0,
                },
                customerContractPricing: {
                    enabled: false,
                    contracts: [],
                },
                quoteRuntimeGovernance: {
                    enabled: false,
                    fieldLocks: {
                        enabled: false,
                        lockShipmentServiceLevel: true,
                        lockPackageServiceLevel: true,
                        lockPackageCourierProvider: true,
                        lockQuoteTotal: true,
                    },
                    discountGuardrails: {
                        enabled: false,
                        maxDiscountPercent: 0,
                        maxDiscountAmountUsd: 0,
                    },
                    floorPriceGuardrail: {
                        enabled: false,
                        minimumTotalUsd: 0,
                    },
                },
                speedEtaTierEngine: {
                    enabled: false,
                    enforceFixedNamedTiers: true,
                    enforceTierPricingMultiplier: true,
                    tiers: {
                        priority_4h: {
                            enabled: true,
                            etaLabel: "Priority 4 Hours",
                            etaMinDays: 0,
                            etaMaxDays: 0,
                            priceMultiplier: 1.45,
                            maxDistanceKm: 35,
                            maxWeightKg: 12,
                            minLeadHours: 0.5,
                            maxLeadHours: 4,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        same_day: {
                            enabled: true,
                            etaLabel: "Same Day",
                            etaMinDays: 0,
                            etaMaxDays: 1,
                            priceMultiplier: 1.25,
                            maxDistanceKm: 80,
                            maxWeightKg: 20,
                            minLeadHours: 1,
                            maxLeadHours: 12,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        next_day: {
                            enabled: true,
                            etaLabel: "Next Day",
                            etaMinDays: 1,
                            etaMaxDays: 2,
                            priceMultiplier: 1.12,
                            maxDistanceKm: 250,
                            maxWeightKg: 30,
                            minLeadHours: 2,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        two_three_day: {
                            enabled: true,
                            etaLabel: "2-3 Days",
                            etaMinDays: 2,
                            etaMaxDays: 3,
                            priceMultiplier: 1,
                            maxDistanceKm: null,
                            maxWeightKg: null,
                            minLeadHours: 0,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                        economy: {
                            enabled: true,
                            etaLabel: "Economy",
                            etaMinDays: 4,
                            etaMaxDays: 7,
                            priceMultiplier: 0.92,
                            maxDistanceKm: null,
                            maxWeightKg: null,
                            minLeadHours: 0,
                            maxLeadHours: null,
                            allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
                            blackoutDates: [],
                        },
                    },
                },
                internationalDimensionsEngine: {
                    enabled: false,
                    enforceForInternationalOnly: true,
                    unitTypeMultipliers: {
                        parcel: 1.0,
                        pallet: 1.18,
                        crate: 1.24,
                        container_20ft: 1.55,
                        container_40ft: 1.85,
                    },
                    routeClassMultipliers: {
                        standard: 1.0,
                        express_corridor: 1.12,
                        remote_corridor: 1.22,
                        multimodal: 1.3,
                    },
                    handlingClassMultipliers: {
                        standard: 1.0,
                        fragile: 1.08,
                        hazardous: 1.2,
                        cold_chain: 1.18,
                        heavy_lift: 1.26,
                    },
                    w2wOption: {
                        enabled: true,
                        strictForInternational: true,
                        defaultMode: "door_to_door",
                        minimumUnitCount: 1,
                        maximumUnitCount: null,
                        modeMultipliers: {
                            door_to_door: 1.15,
                            port_to_port: 0.92,
                            hybrid: 1,
                        },
                    },
                },
            },
        },
        categories: {
            domestic: [
                {
                    id: "domestic_within_3_days",
                    label: "Within 3 Days",
                    serviceLevelKey: "two_three_day",
                    slaDays: 3,
                    basePrice: 250,
                    perKgPrice: 35,
                    minPrice: 250,
                    priorityMultiplier: 1,
                },
                {
                    id: "domestic_one_day",
                    label: "One Day",
                    serviceLevelKey: "next_day",
                    slaDays: 1,
                    basePrice: 1000,
                    perKgPrice: 70,
                    minPrice: 1000,
                    priorityMultiplier: 1,
                },
            ],
            international: [
                {
                    id: "international_standard",
                    label: "international Standard",
                    serviceLevelKey: "two_three_day",
                    slaDays: 4,
                    basePrice: 1400,
                    perKgPrice: 90,
                    minPrice: 1400,
                    priorityMultiplier: 1,
                },
                {
                    id: "international_express",
                    label: "international Express",
                    serviceLevelKey: "next_day",
                    slaDays: 2,
                    basePrice: 2200,
                    perKgPrice: 130,
                    minPrice: 2200,
                    priorityMultiplier: 1.12,
                },
            ],
        },
        governance: {
            domestic: {
                requireApproval: false,
                approverRoles: ["courier_owner", "courier_admin"],
                draftVersion: 1,
                publishedVersion: 1,
                publishedAt: null,
                publishedBy: null,
                pendingApproval: null,
                scheduledPublish: null,
                versionHistory: [],
                changeLog: [],
            },
            international: {
                requireApproval: false,
                approverRoles: ["courier_owner", "courier_admin"],
                draftVersion: 1,
                publishedVersion: 1,
                publishedAt: null,
                publishedBy: null,
                pendingApproval: null,
                scheduledPublish: null,
                versionHistory: [],
                changeLog: [],
            },
        },
    },
    team: {
        dispatcherCanCancel: false,
        opsLeadCanReassign: true,
        financeCanViewRates: true,
        enforce2FA: true,
        approvalControl: {
            enabled: true,
            makerChecker: true,
            approvalTtlMinutes: 240,
            sensitiveActions: {
                high_value_cancellation: {
                    enabled: true,
                    minAmount: 50000,
                    requiredApprovals: 1,
                },
                refund: {
                    enabled: true,
                    level1MinAmount: 25000,
                    level2MinAmount: 100000,
                    requiredApprovalsLevel1: 1,
                    requiredApprovalsLevel2: 2,
                },
                cod_override: {
                    enabled: true,
                    level1MinAmount: 25000,
                    level2MinAmount: 100000,
                    requiredApprovalsLevel1: 1,
                    requiredApprovalsLevel2: 2,
                },
                ownership_transfer: {
                    enabled: true,
                    requiredApprovals: 2,
                },
                client_list_export: {
                    enabled: true,
                    minRows: 100,
                    requiredApprovals: 1,
                },
            },
        },
        sodControl: {
            enabled: true,
            toxicCombinations: [
                {
                    key: "refund_create_and_approve",
                    label: "Cannot both create refunds and approve refunds",
                    permissions: ["courier.refunds.create", "courier.refunds.approve"],
                    enforceRoleEdit: true,
                    enforceUserAssignment: true,
                    enabled: true,
                },
                {
                    key: "assign_permissions_and_approve_access_request",
                    label: "Cannot both assign permissions and approve access requests",
                    permissions: ["courier.team.assign_permissions", "courier.team.access_requests.approve"],
                    enforceRoleEdit: true,
                    enforceUserAssignment: true,
                    enabled: true,
                },
            ],
        },
        temporaryAccessControl: {
            enabled: true,
            defaultDurationMinutes: 120,
            maxDurationMinutes: 240,
            requireTicket: true,
            requireReason: true,
            makerChecker: true,
            allowedElevationRoles: ["courier_admin"],
            breakGlass: {
                enabled: true,
                defaultDurationMinutes: 30,
                maxDurationMinutes: 60,
                requireTicket: true,
                requireReason: true,
                notifyOwners: true,
                notifyRequester: true,
                notifyTarget: true,
                alertEmails: [],
                alertWebhookUrl: "",
            },
        },
        accessReviewControl: {
            enabled: true,
            reviewFrequency: "monthly",
            reviewDueDays: 7,
            requireManagerCertification: true,
            autoDisableStaleAccounts: true,
            staleAccountDays: 45,
            alertDormantPrivilegedUsers: true,
            dormantPrivilegedDays: 21,
            privilegedRoles: ["courier_owner", "courier_admin", "courier_finance"],
        },
        apiServiceAccessControl: {
            enabled: true,
            requireExpiry: true,
            defaultTtlDays: 30,
            maxTtlDays: 90,
            allowWebhookScopes: true,
            maxActiveKeysPerServiceAccount: 2,
            webhookScopesCatalog: ["webhook.events.write"],
        },
        sessionSecurity: {
            enabled: true,
            deviceTrust: {
                enabled: true,
                enforceForRoles: ["courier_owner", "courier_admin"],
                enforceForUserIds: [],
                trustDurationDays: 30,
            },
            concurrentSessions: {
                enabled: true,
                mode: "revoke_oldest",
                defaultLimit: 3,
                limitsByRole: {
                    courier_owner: 2,
                    courier_admin: 2,
                    courier_dispatcher: 3,
                    courier_finance: 2,
                    courier_support: 3,
                    courier_tracking_officer: 4,
                    courier_viewer: 5,
                },
            },
            anomalyDetection: {
                enabled: true,
                rapidSwitchMinutes: 120,
                clearStepUpOnAnomaly: false,
                ipAllowList: [],
                ipDenyList: [],
            },
            stepUp: {
                enabled: true,
                ttlMinutes: 120,
                twoFactorTtlMinutes: 120,
                persistOnTrustedDevice: true,
                deviceRememberDays: 30,
                sensitiveRouteNames: [
                    "courierService.team.access.update",
                    "courierService.team.bulk",
                    "courierService.team.transfer-ownership",
                    "courierService.team.roles.store",
                    "courierService.team.roles.store-template",
                    "courierService.team.roles.clone",
                    "courierService.team.roles.update",
                    "courierService.team.sensitive-approvals.approve",
                    "courierService.team.sensitive-approvals.reject",
                    "courierService.team.temporary-access.approve",
                    "courierService.team.temporary-access.reject",
                    "courierService.team.temporary-access.revoke",
                    "courierService.team.temporary-access.break-glass",
                    "courierService.team.access-reviews.certify",
                    "courierService.team.api-access.store",
                    "courierService.team.api-access.rotate",
                    "courierService.team.api-access.revoke",
                ],
            },
            mandatory2FA: {
                enabled: true,
                roles: ["courier_owner", "courier_admin"],
                userIds: [],
                forSensitiveActions: true,
            },
        },
        teamAccessControl: {
            defaultDirectPermissionsByRole: {},
            defaultDataScopeByRole: {},
            onboardingBundles: [],
        },
        permissionModel: {
            enabled: true,
            rolePolicies: {},
            fieldVisibility: {
                rate_cards: { visibleToRoles: [] },
                margin: { visibleToRoles: [] },
                customer_phone: { visibleToRoles: [] },
                payment_refs: { visibleToRoles: [] },
            },
        },
    },
};

const TAB_CONFIG = [
    { key: "business", label: "Business", icon: MapPinned },
    { key: "operations", label: "Operations", icon: Clock3 },
    { key: "sla", label: "SLA", icon: ShieldCheck },
    { key: "tracking", label: "Tracking", icon: MapPinned },
    { key: "notifications", label: "Notifications", icon: BellRing },
    { key: "integrations", label: "Integrations", icon: KeyRound },
    { key: "services", label: "Services", icon: ShieldCheck },
    { key: "labels", label: "Labels", icon: Printer },
    { key: "pricing", label: "Pricing", icon: BadgeDollarSign },
    { key: "team", label: "Team Access", icon: Users },
];

const CURRENCY_OPTIONS = [
    "LKR",
    "USD",
    "EUR",
    "GBP",
    "AED",
    "AUD",
    "CAD",
    "CHF",
    "CNY",
    "HKD",
    "INR",
    "JPY",
    "SGD",
];

const LABEL_UNIT_OPTIONS = [
    { value: "mm", label: "mm" },
    { value: "cm", label: "cm" },
    { value: "in", label: "in" },
];

const TEAM_ACCESS_TOPIC_CONFIG = [
    { key: "policy-controls", label: "Team Policy Controls" },
    { key: "user-defaults", label: "Team User Creation Defaults" },
    { key: "api-access", label: "API and Service Access" },
    { key: "role-studio", label: "Role Studio" },
];

const PRICING_TOPIC_CONFIG = [
    { key: "currency-formula", label: "Currency and Formula", sectionId: "pricing-topic-currency-formula" },
    { key: "policy-modules", label: "Policy Modules", sectionId: "pricing-topic-policy-modules" },
    { key: "contracts", label: "Customer Contracts", sectionId: "pricing-topic-contracts" },
    { key: "service-catalog", label: "Service Catalog", sectionId: "pricing-topic-service-catalog" },
    { key: "governance", label: "Pricing Governance", sectionId: "pricing-topic-governance" },
    { key: "rate-cards", label: "Rate Cards", sectionId: "pricing-topic-rate-cards" },
    { key: "zone-master", label: "Zone Master", sectionId: "pricing-topic-zone-master" },
    { key: "lane-matrix", label: "Lane Matrix", sectionId: "pricing-topic-lane-matrix" },
    { key: "preview", label: "Formula Preview", sectionId: "pricing-topic-preview" },
];

const COD_CAPABILITY_CATEGORY_LABEL = "Domestic";

const DEFAULT_SPEED_ETA_TIER_TEMPLATE = {
    enabled: true,
    etaLabel: "Custom Tier",
    etaMinDays: 0,
    etaMaxDays: null,
    priceMultiplier: 1,
    maxDistanceKm: null,
    maxWeightKg: null,
    minLeadHours: 0,
    maxLeadHours: null,
    allowedPickupDays: [1, 2, 3, 4, 5, 6, 7],
    blackoutDates: [],
};

const SectionCard = ({ title, description, children }) => (
    <div className="bg-white rounded-[10px] p-5 md:p-6" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
        <div className="mb-4">
            <h2 className="text-[18px] font-[700] text-[#111827]">{title}</h2>
            {description && <p className="text-[12px] text-[#6B7280] mt-1">{description}</p>}
        </div>
        {children}
    </div>
);

const Field = ({ label, children, help }) => (
    <label className="block">
        <span className="text-[13px] font-[700] text-[#374151]">{label}</span>
        <div className="mt-1">{children}</div>
        {help && <p className="text-[11px] text-[#6B7280] mt-1">{help}</p>}
    </label>
);

const Toggle = ({ label, checked, onChange, description, disabled = false }) => (
    <div className={`flex items-start justify-between gap-3 border border-[#E5E7EB] rounded-[8px] px-3 py-3 ${disabled ? "opacity-50" : ""}`}>
        <div>
            <p className="text-[13px] font-[700] text-[#111827]">{label}</p>
            {description && <p className="text-[11px] text-[#6B7280] mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
                if (disabled) {
                    return;
                }
                onChange(!checked);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-[#0955AC]" : "bg-[#D1D5DB]"} ${disabled ? "cursor-not-allowed" : ""}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    </div>
);

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
const humanizeFieldKey = (value) => titleCase(String(value || "").replaceAll("_", " "));
const formatLabelSize = (size) => {
    const width = size?.width_mm ?? size?.widthMm ?? "";
    const height = size?.height_mm ?? size?.heightMm ?? "";
    const unit = String(size?.unit || "mm");
    return `${width}x${height} ${unit}`.trim();
};
const toDayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const tryParseDate = (value) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};
const DEFAULT_ROLE_SCOPE_CONSTRAINTS = {
    regionZones: [],
    hubBranches: [],
    allowedCustomerIds: [],
    keyAccountsOnly: false,
    enforceShiftWindow: false,
    shiftStart: "00:00",
    shiftEnd: "23:59",
    allowedEnvironments: ["production", "sandbox"],
    blockedActionsByEnvironment: {
        production: [],
        sandbox: [],
    },
    policyRules: [],
};

const Settings = () => {
    const props = usePage().props;
    const flash = props.flash || {};
    const incoming = props.courierSettings || {};
    const teamPermissionOptions = Array.isArray(props.teamPermissionOptions) ? props.teamPermissionOptions : [];
    const teamRoleOptions = Array.isArray(props.teamRoleOptions) ? props.teamRoleOptions : [];
    const teamRoleCatalog = Array.isArray(props.teamRoleCatalog) ? props.teamRoleCatalog : [];
    const teamRoleTemplates = props.teamRoleTemplates && typeof props.teamRoleTemplates === "object" ? props.teamRoleTemplates : {};
    const teamAccessAudit = Array.isArray(props.teamAccessAudit) ? props.teamAccessAudit : [];
    const teamSensitiveApprovals = Array.isArray(props.teamSensitiveApprovals) ? props.teamSensitiveApprovals : [];
    const teamTemporaryAccessGrants = Array.isArray(props.teamTemporaryAccessGrants) ? props.teamTemporaryAccessGrants : [];
    const teamAccessReviewQueue = Array.isArray(props.teamAccessReviewQueue) ? props.teamAccessReviewQueue : [];
    const teamApiCredentials = Array.isArray(props.teamApiCredentials) ? props.teamApiCredentials : [];
    const teamApiScopeOptions = Array.isArray(props.teamApiScopeOptions) ? props.teamApiScopeOptions : [];
    const teamWebhookScopeOptions = Array.isArray(props.teamWebhookScopeOptions) ? props.teamWebhookScopeOptions : [];
    const permissionModelMeta = props.permissionModelMeta && typeof props.permissionModelMeta === "object" ? props.permissionModelMeta : {};
    const permissionResources = Array.isArray(permissionModelMeta.resources) ? permissionModelMeta.resources : ["shipments", "bookings", "clients", "reports", "pricing", "payouts"];
    const permissionActions = Array.isArray(permissionModelMeta.actions) ? permissionModelMeta.actions : ["view", "create", "update", "cancel", "reassign", "export", "approve", "refund"];
    const permissionScopes = Array.isArray(permissionModelMeta.scopes) ? permissionModelMeta.scopes : ["own_records", "assigned_region", "assigned_hub", "all_workspace"];
    const sensitiveFieldKeys = Array.isArray(permissionModelMeta.sensitiveFields) ? permissionModelMeta.sensitiveFields : ["rate_cards", "margin", "customer_phone", "payment_refs"];
    const permissionEnvironments = Array.isArray(permissionModelMeta.environments) ? permissionModelMeta.environments : ["production", "sandbox"];
    const permissionRuleEffects = Array.isArray(permissionModelMeta.ruleEffects) ? permissionModelMeta.ruleEffects : ["allow", "deny"];
    const permissionRuleConditionOptions = permissionModelMeta.ruleConditionOptions && typeof permissionModelMeta.ruleConditionOptions === "object"
        ? permissionModelMeta.ruleConditionOptions
        : {};
    const permissionRuleShipmentStages = Array.isArray(permissionRuleConditionOptions.shipmentStages)
        ? permissionRuleConditionOptions.shipmentStages
        : ["new_assignments", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "exception", "delivered", "cancelled"];
    const permissionRuleClientTiers = Array.isArray(permissionRuleConditionOptions.clientTiers)
        ? permissionRuleConditionOptions.clientTiers
        : ["enterprise", "sme", "individual"];
    const permissionRuleSlaClasses = Array.isArray(permissionRuleConditionOptions.slaClasses)
        ? permissionRuleConditionOptions.slaClasses
        : ["on_track", "at_risk", "on_time", "delayed", "early", "unknown"];
    const teamScopeControlOptions = props.teamScopeControlOptions && typeof props.teamScopeControlOptions === "object" ? props.teamScopeControlOptions : {};
    const scopeZoneOptions = Array.isArray(teamScopeControlOptions.availableZones) ? teamScopeControlOptions.availableZones : [];
    const scopeHubOptions = Array.isArray(teamScopeControlOptions.availableHubs) ? teamScopeControlOptions.availableHubs : [];
    const scopeCustomerOptions = Array.isArray(teamScopeControlOptions.customerAccounts) ? teamScopeControlOptions.customerAccounts : [];
    const authUser = props.auth && typeof props.auth === "object" && props.auth.user && typeof props.auth.user === "object"
        ? props.auth.user
        : {};
    const courierPermissions = Array.isArray(authUser?.courier_permissions) ? authUser.courier_permissions : [];
    const hasCourierPermission = (permission) => {
        if (String(authUser?.role || "") === "vendor") {
            return true;
        }

        if (!permission) {
            return true;
        }

        return courierPermissions.includes(permission);
    };
    const canViewLabels = hasCourierPermission("courier.labels.view")
        || hasCourierPermission("courier.labels.manage_templates");
    const canManageLabels = hasCourierPermission("courier.labels.manage_templates");
    const currentUserRoleNames = [
        ...(Array.isArray(authUser.roles) ? authUser.roles : []).map((role) => {
            if (typeof role === "string") {
                return role;
            }

            if (role && typeof role === "object") {
                return role.name || role.slug || role.code || role.role || "";
            }

            return "";
        }),
        String(authUser.role || ""),
        String(authUser.roleName || ""),
        String(authUser.currentRole || ""),
    ]
        .map((role) => String(role || "").trim())
        .filter(Boolean);
    const initialSettingsModule = String(props.initialSettingsModule || "business");
    const initialTeamAccessTopic = String(props.initialTeamAccessTopic || "policy-controls");
    const initialPricingTopic = String(props.initialPricingTopic || "currency-formula");
    const initialPricingCategory = String(props.initialPricingCategory || "").toLowerCase();
    const incomingCodCapability = props.courierCodCapability && typeof props.courierCodCapability === "object"
        ? props.courierCodCapability
        : {};
    const notificationMeta = props.notificationMeta && typeof props.notificationMeta === "object"
        ? props.notificationMeta
        : {};
    const notificationMetrics = props.notificationMetrics && typeof props.notificationMetrics === "object"
        ? props.notificationMetrics
        : {};
    const notificationRollout = notificationMeta.rollout && typeof notificationMeta.rollout === "object"
        ? notificationMeta.rollout
        : {};
    const notificationV2EnabledForVendor = Boolean(notificationRollout.v2EnabledForVendor);
    const teamCapabilities = props.teamCapabilities || {};
    const canAssignPermissions = Boolean(teamCapabilities.assignPermissions);
    const canAssignRole = Boolean(teamCapabilities.assignRole);
    const approvedPricingCategories = Array.isArray(props.approvedCourierPricingCategories)
        ? props.approvedCourierPricingCategories
            .map((item) => String(item || "").toLowerCase())
            .filter((item) => item === "domestic" || item === "international")
        : ["domestic", "international"];
    const visiblePricingCategoryOptions = [
        { key: "domestic", label: "Domestic" },
        { key: "international", label: "International" },
    ].filter((item) => approvedPricingCategories.includes(item.key));
    const defaultPricingCategory = visiblePricingCategoryOptions[0]?.key || "domestic";

    const [activeTab] = useState(
        TAB_CONFIG.some((tab) => tab.key === initialSettingsModule) ? initialSettingsModule : "business",
    );
    const [activeTeamAccessTopic, setActiveTeamAccessTopic] = useState(
        TEAM_ACCESS_TOPIC_CONFIG.some((topic) => topic.key === initialTeamAccessTopic)
            ? initialTeamAccessTopic
            : "policy-controls",
    );
    const [activePricingTopic, setActivePricingTopic] = useState(
        PRICING_TOPIC_CONFIG.some((topic) => topic.key === initialPricingTopic)
            ? initialPricingTopic
            : "currency-formula",
    );
    const [settings, setSettings] = useState(() => {
        const incomingTeam = incoming.team && typeof incoming.team === "object" ? incoming.team : {};
        const incomingPricing = incoming.pricing && typeof incoming.pricing === "object" ? incoming.pricing : {};
        const incomingServices = incoming.services && typeof incoming.services === "object" ? incoming.services : {};
        const incomingServicesCod = incomingServices.cod && typeof incomingServices.cod === "object" ? incomingServices.cod : {};
        const incomingNotifications = incoming.notifications && typeof incoming.notifications === "object" ? incoming.notifications : {};
        const incomingNotificationChannels = incomingNotifications.channels && typeof incomingNotifications.channels === "object"
            ? incomingNotifications.channels
            : {};
        const incomingNotificationClientRecipients = incomingNotifications.clientRecipients && typeof incomingNotifications.clientRecipients === "object"
            ? incomingNotifications.clientRecipients
            : {};
        const incomingNotificationInternalRecipients = incomingNotifications.internalRecipients && typeof incomingNotifications.internalRecipients === "object"
            ? incomingNotifications.internalRecipients
            : {};
        const incomingNotificationEventMatrix = incomingNotifications.eventMatrix && typeof incomingNotifications.eventMatrix === "object"
            ? incomingNotifications.eventMatrix
            : {};
        const mergedNotificationEventMatrix = Object.entries(NOTIFICATION_EVENT_MATRIX_DEFAULT).reduce((acc, [eventKey, audienceMap]) => {
            const incomingAudienceMap = incomingNotificationEventMatrix[eventKey] && typeof incomingNotificationEventMatrix[eventKey] === "object"
                ? incomingNotificationEventMatrix[eventKey]
                : {};
            const nextAudienceMap = Object.entries(audienceMap || {}).reduce((audAcc, [audienceKey, channelMap]) => {
                const incomingChannelMap = incomingAudienceMap[audienceKey] && typeof incomingAudienceMap[audienceKey] === "object"
                    ? incomingAudienceMap[audienceKey]
                    : {};
                audAcc[audienceKey] = {
                    ...channelMap,
                    ...incomingChannelMap,
                };
                return audAcc;
            }, {});

            acc[eventKey] = nextAudienceMap;
            return acc;
        }, {});
        Object.entries(LEGACY_NOTIFICATION_MAP).forEach(([legacyKey, mapping]) => {
            if (typeof incomingNotifications?.[legacyKey] !== "boolean") {
                return;
            }

            if (!mergedNotificationEventMatrix?.[mapping.event]?.[mapping.audience]) {
                return;
            }

            mergedNotificationEventMatrix[mapping.event][mapping.audience] = {
                ...mergedNotificationEventMatrix[mapping.event][mapping.audience],
                email: incomingNotifications[legacyKey],
            };
        });
        const mergedLegacyNotificationFlags = {
            ...buildLegacyNotificationFlags(mergedNotificationEventMatrix),
        };
        const hasLegacyInternationalFlag = typeof incomingServicesCod.allowCodForLogistic === "boolean";
        const incomingLabels = incoming.labels && typeof incoming.labels === "object" ? incoming.labels : {};
        const incomingLabelDefaults = incomingLabels.defaults && typeof incomingLabels.defaults === "object" ? incomingLabels.defaults : {};
        const incomingLabelPolicy = incomingLabels.printPolicy && typeof incomingLabels.printPolicy === "object" ? incomingLabels.printPolicy : {};
        const incomingTeamAccessControl = incomingTeam.teamAccessControl && typeof incomingTeam.teamAccessControl === "object"
            ? incomingTeam.teamAccessControl
            : {};
        const incomingSodControl = incomingTeam.sodControl && typeof incomingTeam.sodControl === "object"
            ? incomingTeam.sodControl
            : {};
        const incomingTemporaryAccessControl = incomingTeam.temporaryAccessControl && typeof incomingTeam.temporaryAccessControl === "object"
            ? incomingTeam.temporaryAccessControl
            : {};
        const incomingAccessReviewControl = incomingTeam.accessReviewControl && typeof incomingTeam.accessReviewControl === "object"
            ? incomingTeam.accessReviewControl
            : {};
        const incomingSessionSecurity = incomingTeam.sessionSecurity && typeof incomingTeam.sessionSecurity === "object"
            ? incomingTeam.sessionSecurity
            : {};
        const incomingPermissionModel = incomingTeam.permissionModel && typeof incomingTeam.permissionModel === "object"
            ? incomingTeam.permissionModel
            : {};
        const incomingFieldVisibility = incomingPermissionModel.fieldVisibility && typeof incomingPermissionModel.fieldVisibility === "object"
            ? incomingPermissionModel.fieldVisibility
            : {};

        return {
            ...DEFAULT_SETTINGS,
            ...incoming,
            notifications: {
                ...DEFAULT_NOTIFICATION_SETTINGS,
                ...incomingNotifications,
                ...mergedLegacyNotificationFlags,
                version: typeof incomingNotifications.version === "number" ? incomingNotifications.version : DEFAULT_NOTIFICATION_SETTINGS.version,
                channels: {
                    ...DEFAULT_NOTIFICATION_SETTINGS.channels,
                    ...incomingNotificationChannels,
                    email: {
                        ...DEFAULT_NOTIFICATION_SETTINGS.channels.email,
                        ...(incomingNotificationChannels.email && typeof incomingNotificationChannels.email === "object" ? incomingNotificationChannels.email : {}),
                    },
                    inApp: {
                        ...DEFAULT_NOTIFICATION_SETTINGS.channels.inApp,
                        ...(incomingNotificationChannels.inApp && typeof incomingNotificationChannels.inApp === "object" ? incomingNotificationChannels.inApp : {}),
                    },
                },
                clientRecipients: {
                    ...DEFAULT_NOTIFICATION_SETTINGS.clientRecipients,
                    ...incomingNotificationClientRecipients,
                    extraEmails: Array.isArray(incomingNotificationClientRecipients.extraEmails)
                        ? incomingNotificationClientRecipients.extraEmails
                        : DEFAULT_NOTIFICATION_SETTINGS.clientRecipients.extraEmails,
                },
                internalRecipients: {
                    ...DEFAULT_NOTIFICATION_SETTINGS.internalRecipients,
                    ...incomingNotificationInternalRecipients,
                    roleNames: Array.isArray(incomingNotificationInternalRecipients.roleNames)
                        ? incomingNotificationInternalRecipients.roleNames
                        : DEFAULT_NOTIFICATION_SETTINGS.internalRecipients.roleNames,
                    userIds: Array.isArray(incomingNotificationInternalRecipients.userIds)
                        ? incomingNotificationInternalRecipients.userIds
                        : DEFAULT_NOTIFICATION_SETTINGS.internalRecipients.userIds,
                    extraEmails: Array.isArray(incomingNotificationInternalRecipients.extraEmails)
                        ? incomingNotificationInternalRecipients.extraEmails
                        : DEFAULT_NOTIFICATION_SETTINGS.internalRecipients.extraEmails,
                },
                eventMatrix: mergedNotificationEventMatrix,
                delivery: {
                    ...DEFAULT_NOTIFICATION_SETTINGS.delivery,
                    ...(incomingNotifications.delivery && typeof incomingNotifications.delivery === "object" ? incomingNotifications.delivery : {}),
                    quietHours: {
                        ...DEFAULT_NOTIFICATION_SETTINGS.delivery.quietHours,
                        ...(incomingNotifications?.delivery?.quietHours && typeof incomingNotifications.delivery.quietHours === "object"
                            ? incomingNotifications.delivery.quietHours
                            : {}),
                    },
                    digest: {
                        ...DEFAULT_NOTIFICATION_SETTINGS.delivery.digest,
                        ...(incomingNotifications?.delivery?.digest && typeof incomingNotifications.delivery.digest === "object"
                            ? incomingNotifications.delivery.digest
                            : {}),
                    },
                },
                deliverability: {
                    ...DEFAULT_NOTIFICATION_SETTINGS.deliverability,
                    ...(incomingNotifications.deliverability && typeof incomingNotifications.deliverability === "object"
                        ? incomingNotifications.deliverability
                        : {}),
                },
            },
            services: {
                ...DEFAULT_SETTINGS.services,
                ...incomingServices,
                cod: {
                    ...DEFAULT_SETTINGS.services.cod,
                    ...incomingServicesCod,
                    allowCodForInternational: typeof incomingServicesCod.allowCodForInternational === "boolean"
                        ? incomingServicesCod.allowCodForInternational
                        : (hasLegacyInternationalFlag
                            ? incomingServicesCod.allowCodForLogistic
                            : DEFAULT_SETTINGS.services.cod.allowCodForInternational),
                },
            },
            labels: {
                ...DEFAULT_SETTINGS.labels,
                ...incomingLabels,
                defaults: {
                    domestic: {
                        ...DEFAULT_SETTINGS.labels.defaults.domestic,
                        ...(incomingLabelDefaults.domestic && typeof incomingLabelDefaults.domestic === "object" ? incomingLabelDefaults.domestic : {}),
                    },
                    international: {
                        ...DEFAULT_SETTINGS.labels.defaults.international,
                        ...(incomingLabelDefaults.international && typeof incomingLabelDefaults.international === "object" ? incomingLabelDefaults.international : {}),
                    },
                },
                printPolicy: {
                    ...DEFAULT_SETTINGS.labels.printPolicy,
                    ...incomingLabelPolicy,
                },
            },
            pricing: {
                ...DEFAULT_SETTINGS.pricing,
                ...incomingPricing,
                localization: {
                    domestic: {
                        ...DEFAULT_SETTINGS.pricing.localization.domestic,
                        ...(incomingPricing.localization && typeof incomingPricing.localization === "object" && incomingPricing.localization.domestic && typeof incomingPricing.localization.domestic === "object"
                            ? incomingPricing.localization.domestic
                            : (incomingPricing.localization && typeof incomingPricing.localization === "object" ? incomingPricing.localization : {})),
                        manualRates: {
                            ...DEFAULT_SETTINGS.pricing.localization.domestic.manualRates,
                            ...(incomingPricing.localization?.domestic?.manualRates && typeof incomingPricing.localization.domestic.manualRates === "object"
                                ? incomingPricing.localization.domestic.manualRates
                                : (incomingPricing.localization?.manualRates && typeof incomingPricing.localization.manualRates === "object"
                                    ? incomingPricing.localization.manualRates
                                    : {})),
                        },
                    },
                    international: {
                        ...DEFAULT_SETTINGS.pricing.localization.international,
                        ...(incomingPricing.localization && typeof incomingPricing.localization === "object" && incomingPricing.localization.international && typeof incomingPricing.localization.international === "object"
                            ? incomingPricing.localization.international
                            : (incomingPricing.localization && typeof incomingPricing.localization === "object" ? incomingPricing.localization : {})),
                        manualRates: {
                            ...DEFAULT_SETTINGS.pricing.localization.international.manualRates,
                            ...(incomingPricing.localization?.international?.manualRates && typeof incomingPricing.localization.international.manualRates === "object"
                                ? incomingPricing.localization.international.manualRates
                                : (incomingPricing.localization?.manualRates && typeof incomingPricing.localization.manualRates === "object"
                                    ? incomingPricing.localization.manualRates
                                    : {})),
                        },
                    },
                },
                formula: {
                    domestic: {
                        ...DEFAULT_SETTINGS.pricing.formula.domestic,
                        ...((incomingPricing.formula && typeof incomingPricing.formula === "object" && incomingPricing.formula.domestic && typeof incomingPricing.formula.domestic === "object")
                            ? incomingPricing.formula.domestic
                            : (incomingPricing.formula && typeof incomingPricing.formula === "object" ? incomingPricing.formula : {})),
                    },
                    international: {
                        ...DEFAULT_SETTINGS.pricing.formula.international,
                        ...((incomingPricing.formula && typeof incomingPricing.formula === "object" && incomingPricing.formula.international && typeof incomingPricing.formula.international === "object")
                            ? incomingPricing.formula.international
                            : (incomingPricing.formula && typeof incomingPricing.formula === "object" ? incomingPricing.formula : {})),
                    },
                },
                serviceCatalog: {
                    domestic: Array.isArray(incomingPricing.serviceCatalog?.domestic)
                        ? incomingPricing.serviceCatalog.domestic
                        : DEFAULT_SETTINGS.pricing.serviceCatalog.domestic,
                    international: Array.isArray(incomingPricing.serviceCatalog?.international)
                        ? incomingPricing.serviceCatalog.international
                        : DEFAULT_SETTINGS.pricing.serviceCatalog.international,
                },
                zoneMaster: {
                    domestic: Array.isArray(incomingPricing.zoneMaster?.domestic)
                        ? incomingPricing.zoneMaster.domestic
                        : (Array.isArray(incomingPricing.zoneMaster) ? incomingPricing.zoneMaster : DEFAULT_SETTINGS.pricing.zoneMaster.domestic),
                    international: Array.isArray(incomingPricing.zoneMaster?.international)
                        ? incomingPricing.zoneMaster.international
                        : (Array.isArray(incomingPricing.zoneMaster) ? incomingPricing.zoneMaster : DEFAULT_SETTINGS.pricing.zoneMaster.international),
                },
                laneMatrix: {
                    enabled: {
                        domestic: typeof incomingPricing.laneMatrix?.enabled === "object"
                            ? Boolean(incomingPricing.laneMatrix.enabled?.domestic)
                            : Boolean(incomingPricing.laneMatrix?.enabled),
                        international: typeof incomingPricing.laneMatrix?.enabled === "object"
                            ? Boolean(incomingPricing.laneMatrix.enabled?.international)
                            : Boolean(incomingPricing.laneMatrix?.enabled),
                    },
                    domestic: Array.isArray(incomingPricing.laneMatrix?.domestic)
                        ? incomingPricing.laneMatrix.domestic
                        : DEFAULT_SETTINGS.pricing.laneMatrix.domestic,
                    international: Array.isArray(incomingPricing.laneMatrix?.international)
                        ? incomingPricing.laneMatrix.international
                        : DEFAULT_SETTINGS.pricing.laneMatrix.international,
                },
                policyModules: {
                    domestic: {
                        ...DEFAULT_SETTINGS.pricing.policyModules.domestic,
                        ...(incomingPricing.policyModules && typeof incomingPricing.policyModules === "object" && incomingPricing.policyModules.domestic && typeof incomingPricing.policyModules.domestic === "object"
                            ? incomingPricing.policyModules.domestic
                            : (incomingPricing.policyModules && typeof incomingPricing.policyModules === "object" ? incomingPricing.policyModules : {})),
                        speedEtaTierEngine: {
                            ...DEFAULT_SETTINGS.pricing.policyModules.domestic.speedEtaTierEngine,
                            ...(incomingPricing.policyModules?.domestic?.speedEtaTierEngine && typeof incomingPricing.policyModules.domestic.speedEtaTierEngine === "object"
                                ? incomingPricing.policyModules.domestic.speedEtaTierEngine
                                : (incomingPricing.policyModules?.speedEtaTierEngine && typeof incomingPricing.policyModules.speedEtaTierEngine === "object"
                                    ? incomingPricing.policyModules.speedEtaTierEngine
                                    : {})),
                            tiers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.domestic.speedEtaTierEngine.tiers,
                                ...(incomingPricing.policyModules?.domestic?.speedEtaTierEngine?.tiers && typeof incomingPricing.policyModules.domestic.speedEtaTierEngine.tiers === "object"
                                    ? incomingPricing.policyModules.domestic.speedEtaTierEngine.tiers
                                    : (incomingPricing.policyModules?.speedEtaTierEngine?.tiers && typeof incomingPricing.policyModules.speedEtaTierEngine.tiers === "object"
                                        ? incomingPricing.policyModules.speedEtaTierEngine.tiers
                                        : {})),
                            },
                        },
                        internationalDimensionsEngine: {
                            ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine,
                            ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine === "object"
                                ? incomingPricing.policyModules.domestic.internationalDimensionsEngine
                                : (incomingPricing.policyModules?.internationalDimensionsEngine && typeof incomingPricing.policyModules.internationalDimensionsEngine === "object"
                                    ? incomingPricing.policyModules.internationalDimensionsEngine
                                    : {})),
                            unitTypeMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine.unitTypeMultipliers,
                                ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine?.unitTypeMultipliers && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine.unitTypeMultipliers === "object"
                                    ? incomingPricing.policyModules.domestic.internationalDimensionsEngine.unitTypeMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.unitTypeMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.unitTypeMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.unitTypeMultipliers
                                        : {})),
                            },
                            routeClassMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine.routeClassMultipliers,
                                ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine?.routeClassMultipliers && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine.routeClassMultipliers === "object"
                                    ? incomingPricing.policyModules.domestic.internationalDimensionsEngine.routeClassMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.routeClassMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.routeClassMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.routeClassMultipliers
                                        : {})),
                            },
                            handlingClassMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine.handlingClassMultipliers,
                                ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine?.handlingClassMultipliers && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine.handlingClassMultipliers === "object"
                                    ? incomingPricing.policyModules.domestic.internationalDimensionsEngine.handlingClassMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.handlingClassMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.handlingClassMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.handlingClassMultipliers
                                        : {})),
                            },
                            w2wOption: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine.w2wOption,
                                ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine?.w2wOption && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine.w2wOption === "object"
                                    ? incomingPricing.policyModules.domestic.internationalDimensionsEngine.w2wOption
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.w2wOption && typeof incomingPricing.policyModules.internationalDimensionsEngine.w2wOption === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.w2wOption
                                        : {})),
                                modeMultipliers: {
                                    ...DEFAULT_SETTINGS.pricing.policyModules.domestic.internationalDimensionsEngine.w2wOption.modeMultipliers,
                                    ...(incomingPricing.policyModules?.domestic?.internationalDimensionsEngine?.w2wOption?.modeMultipliers && typeof incomingPricing.policyModules.domestic.internationalDimensionsEngine.w2wOption.modeMultipliers === "object"
                                        ? incomingPricing.policyModules.domestic.internationalDimensionsEngine.w2wOption.modeMultipliers
                                        : (incomingPricing.policyModules?.internationalDimensionsEngine?.w2wOption?.modeMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.w2wOption.modeMultipliers === "object"
                                            ? incomingPricing.policyModules.internationalDimensionsEngine.w2wOption.modeMultipliers
                                            : {})),
                                },
                            },
                        },
                    },
                    international: {
                        ...DEFAULT_SETTINGS.pricing.policyModules.international,
                        ...(incomingPricing.policyModules && typeof incomingPricing.policyModules === "object" && incomingPricing.policyModules.international && typeof incomingPricing.policyModules.international === "object"
                            ? incomingPricing.policyModules.international
                            : (incomingPricing.policyModules && typeof incomingPricing.policyModules === "object" ? incomingPricing.policyModules : {})),
                        speedEtaTierEngine: {
                            ...DEFAULT_SETTINGS.pricing.policyModules.international.speedEtaTierEngine,
                            ...(incomingPricing.policyModules?.international?.speedEtaTierEngine && typeof incomingPricing.policyModules.international.speedEtaTierEngine === "object"
                                ? incomingPricing.policyModules.international.speedEtaTierEngine
                                : (incomingPricing.policyModules?.speedEtaTierEngine && typeof incomingPricing.policyModules.speedEtaTierEngine === "object"
                                    ? incomingPricing.policyModules.speedEtaTierEngine
                                    : {})),
                            tiers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.international.speedEtaTierEngine.tiers,
                                ...(incomingPricing.policyModules?.international?.speedEtaTierEngine?.tiers && typeof incomingPricing.policyModules.international.speedEtaTierEngine.tiers === "object"
                                    ? incomingPricing.policyModules.international.speedEtaTierEngine.tiers
                                    : (incomingPricing.policyModules?.speedEtaTierEngine?.tiers && typeof incomingPricing.policyModules.speedEtaTierEngine.tiers === "object"
                                        ? incomingPricing.policyModules.speedEtaTierEngine.tiers
                                        : {})),
                            },
                        },
                        internationalDimensionsEngine: {
                            ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine,
                            ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine && typeof incomingPricing.policyModules.international.internationalDimensionsEngine === "object"
                                ? incomingPricing.policyModules.international.internationalDimensionsEngine
                                : (incomingPricing.policyModules?.internationalDimensionsEngine && typeof incomingPricing.policyModules.internationalDimensionsEngine === "object"
                                    ? incomingPricing.policyModules.internationalDimensionsEngine
                                    : {})),
                            unitTypeMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine.unitTypeMultipliers,
                                ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine?.unitTypeMultipliers && typeof incomingPricing.policyModules.international.internationalDimensionsEngine.unitTypeMultipliers === "object"
                                    ? incomingPricing.policyModules.international.internationalDimensionsEngine.unitTypeMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.unitTypeMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.unitTypeMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.unitTypeMultipliers
                                        : {})),
                            },
                            routeClassMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine.routeClassMultipliers,
                                ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine?.routeClassMultipliers && typeof incomingPricing.policyModules.international.internationalDimensionsEngine.routeClassMultipliers === "object"
                                    ? incomingPricing.policyModules.international.internationalDimensionsEngine.routeClassMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.routeClassMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.routeClassMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.routeClassMultipliers
                                        : {})),
                            },
                            handlingClassMultipliers: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine.handlingClassMultipliers,
                                ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine?.handlingClassMultipliers && typeof incomingPricing.policyModules.international.internationalDimensionsEngine.handlingClassMultipliers === "object"
                                    ? incomingPricing.policyModules.international.internationalDimensionsEngine.handlingClassMultipliers
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.handlingClassMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.handlingClassMultipliers === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.handlingClassMultipliers
                                        : {})),
                            },
                            w2wOption: {
                                ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine.w2wOption,
                                ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine?.w2wOption && typeof incomingPricing.policyModules.international.internationalDimensionsEngine.w2wOption === "object"
                                    ? incomingPricing.policyModules.international.internationalDimensionsEngine.w2wOption
                                    : (incomingPricing.policyModules?.internationalDimensionsEngine?.w2wOption && typeof incomingPricing.policyModules.internationalDimensionsEngine.w2wOption === "object"
                                        ? incomingPricing.policyModules.internationalDimensionsEngine.w2wOption
                                        : {})),
                                modeMultipliers: {
                                    ...DEFAULT_SETTINGS.pricing.policyModules.international.internationalDimensionsEngine.w2wOption.modeMultipliers,
                                    ...(incomingPricing.policyModules?.international?.internationalDimensionsEngine?.w2wOption?.modeMultipliers && typeof incomingPricing.policyModules.international.internationalDimensionsEngine.w2wOption.modeMultipliers === "object"
                                        ? incomingPricing.policyModules.international.internationalDimensionsEngine.w2wOption.modeMultipliers
                                        : (incomingPricing.policyModules?.internationalDimensionsEngine?.w2wOption?.modeMultipliers && typeof incomingPricing.policyModules.internationalDimensionsEngine.w2wOption.modeMultipliers === "object"
                                            ? incomingPricing.policyModules.internationalDimensionsEngine.w2wOption.modeMultipliers
                                            : {})),
                                },
                            },
                        },
                    },
                },
                categories: {
                    domestic: Array.isArray(incomingPricing.categories?.domestic)
                        ? incomingPricing.categories.domestic
                        : DEFAULT_SETTINGS.pricing.categories.domestic,
                    international: Array.isArray(incomingPricing.categories?.international)
                        ? incomingPricing.categories.international
                        : DEFAULT_SETTINGS.pricing.categories.international,
                },
                governance: {
                    domestic: {
                        ...DEFAULT_SETTINGS.pricing.governance.domestic,
                        ...(incomingPricing.governance && typeof incomingPricing.governance === "object" && incomingPricing.governance.domestic && typeof incomingPricing.governance.domestic === "object"
                            ? incomingPricing.governance.domestic
                            : (incomingPricing.governance && typeof incomingPricing.governance === "object" ? incomingPricing.governance : {})),
                        approverRoles: Array.isArray(incomingPricing.governance?.domestic?.approverRoles)
                            ? incomingPricing.governance.domestic.approverRoles
                            : (Array.isArray(incomingPricing.governance?.approverRoles)
                                ? incomingPricing.governance.approverRoles
                                : DEFAULT_SETTINGS.pricing.governance.domestic.approverRoles),
                        changeLog: Array.isArray(incomingPricing.governance?.domestic?.changeLog)
                            ? incomingPricing.governance.domestic.changeLog
                            : (Array.isArray(incomingPricing.governance?.changeLog)
                                ? incomingPricing.governance.changeLog
                                : DEFAULT_SETTINGS.pricing.governance.domestic.changeLog),
                    },
                    international: {
                        ...DEFAULT_SETTINGS.pricing.governance.international,
                        ...(incomingPricing.governance && typeof incomingPricing.governance === "object" && incomingPricing.governance.international && typeof incomingPricing.governance.international === "object"
                            ? incomingPricing.governance.international
                            : (incomingPricing.governance && typeof incomingPricing.governance === "object" ? incomingPricing.governance : {})),
                        approverRoles: Array.isArray(incomingPricing.governance?.international?.approverRoles)
                            ? incomingPricing.governance.international.approverRoles
                            : (Array.isArray(incomingPricing.governance?.approverRoles)
                                ? incomingPricing.governance.approverRoles
                                : DEFAULT_SETTINGS.pricing.governance.international.approverRoles),
                        changeLog: Array.isArray(incomingPricing.governance?.international?.changeLog)
                            ? incomingPricing.governance.international.changeLog
                            : (Array.isArray(incomingPricing.governance?.changeLog)
                                ? incomingPricing.governance.changeLog
                                : DEFAULT_SETTINGS.pricing.governance.international.changeLog),
                    },
                },
            },
            team: {
                ...DEFAULT_SETTINGS.team,
                ...incomingTeam,
                approvalControl: {
                    ...DEFAULT_SETTINGS.team.approvalControl,
                    ...(incomingTeam.approvalControl && typeof incomingTeam.approvalControl === "object" ? incomingTeam.approvalControl : {}),
                    sensitiveActions: {
                        ...DEFAULT_SETTINGS.team.approvalControl.sensitiveActions,
                        ...(incomingTeam.approvalControl?.sensitiveActions && typeof incomingTeam.approvalControl.sensitiveActions === "object"
                            ? incomingTeam.approvalControl.sensitiveActions
                            : {}),
                    },
                },
                sodControl: {
                    ...DEFAULT_SETTINGS.team.sodControl,
                    ...incomingSodControl,
                    toxicCombinations: Array.isArray(incomingSodControl.toxicCombinations)
                        ? incomingSodControl.toxicCombinations
                        : DEFAULT_SETTINGS.team.sodControl.toxicCombinations,
                },
                temporaryAccessControl: {
                    ...DEFAULT_SETTINGS.team.temporaryAccessControl,
                    ...incomingTemporaryAccessControl,
                    allowedElevationRoles: Array.isArray(incomingTemporaryAccessControl.allowedElevationRoles)
                        ? incomingTemporaryAccessControl.allowedElevationRoles
                        : DEFAULT_SETTINGS.team.temporaryAccessControl.allowedElevationRoles,
                    breakGlass: {
                        ...DEFAULT_SETTINGS.team.temporaryAccessControl.breakGlass,
                        ...(incomingTemporaryAccessControl.breakGlass && typeof incomingTemporaryAccessControl.breakGlass === "object"
                            ? incomingTemporaryAccessControl.breakGlass
                            : {}),
                    },
                },
                accessReviewControl: {
                    ...DEFAULT_SETTINGS.team.accessReviewControl,
                    ...incomingAccessReviewControl,
                    privilegedRoles: Array.isArray(incomingAccessReviewControl.privilegedRoles)
                        ? incomingAccessReviewControl.privilegedRoles
                        : DEFAULT_SETTINGS.team.accessReviewControl.privilegedRoles,
                },
                sessionSecurity: {
                    ...DEFAULT_SETTINGS.team.sessionSecurity,
                    ...incomingSessionSecurity,
                    deviceTrust: {
                        ...DEFAULT_SETTINGS.team.sessionSecurity.deviceTrust,
                        ...(incomingSessionSecurity.deviceTrust && typeof incomingSessionSecurity.deviceTrust === "object" ? incomingSessionSecurity.deviceTrust : {}),
                    },
                    concurrentSessions: {
                        ...DEFAULT_SETTINGS.team.sessionSecurity.concurrentSessions,
                        ...(incomingSessionSecurity.concurrentSessions && typeof incomingSessionSecurity.concurrentSessions === "object" ? incomingSessionSecurity.concurrentSessions : {}),
                        limitsByRole: {
                            ...DEFAULT_SETTINGS.team.sessionSecurity.concurrentSessions.limitsByRole,
                            ...(incomingSessionSecurity.concurrentSessions && incomingSessionSecurity.concurrentSessions.limitsByRole && typeof incomingSessionSecurity.concurrentSessions.limitsByRole === "object"
                                ? incomingSessionSecurity.concurrentSessions.limitsByRole
                                : {}),
                        },
                    },
                    anomalyDetection: {
                        ...DEFAULT_SETTINGS.team.sessionSecurity.anomalyDetection,
                        ...(incomingSessionSecurity.anomalyDetection && typeof incomingSessionSecurity.anomalyDetection === "object" ? incomingSessionSecurity.anomalyDetection : {}),
                    },
                    stepUp: {
                        ...DEFAULT_SETTINGS.team.sessionSecurity.stepUp,
                        ...(incomingSessionSecurity.stepUp && typeof incomingSessionSecurity.stepUp === "object" ? incomingSessionSecurity.stepUp : {}),
                    },
                    mandatory2FA: {
                        ...DEFAULT_SETTINGS.team.sessionSecurity.mandatory2FA,
                        ...(incomingSessionSecurity.mandatory2FA && typeof incomingSessionSecurity.mandatory2FA === "object" ? incomingSessionSecurity.mandatory2FA : {}),
                    },
                },
                teamAccessControl: {
                    ...DEFAULT_SETTINGS.team.teamAccessControl,
                    ...incomingTeamAccessControl,
                    defaultDirectPermissionsByRole: incomingTeamAccessControl.defaultDirectPermissionsByRole
                        && typeof incomingTeamAccessControl.defaultDirectPermissionsByRole === "object"
                        ? incomingTeamAccessControl.defaultDirectPermissionsByRole
                        : {},
                    defaultDataScopeByRole: incomingTeamAccessControl.defaultDataScopeByRole
                        && typeof incomingTeamAccessControl.defaultDataScopeByRole === "object"
                        ? incomingTeamAccessControl.defaultDataScopeByRole
                        : {},
                    onboardingBundles: Array.isArray(incomingTeamAccessControl.onboardingBundles)
                        ? incomingTeamAccessControl.onboardingBundles
                        : [],
                },
                permissionModel: {
                    ...DEFAULT_SETTINGS.team.permissionModel,
                    ...incomingPermissionModel,
                    rolePolicies: incomingPermissionModel.rolePolicies && typeof incomingPermissionModel.rolePolicies === "object"
                        ? incomingPermissionModel.rolePolicies
                        : {},
                    fieldVisibility: sensitiveFieldKeys.reduce((acc, fieldKey) => {
                        const incomingField = incomingFieldVisibility[fieldKey] && typeof incomingFieldVisibility[fieldKey] === "object"
                            ? incomingFieldVisibility[fieldKey]
                            : {};
                        acc[fieldKey] = {
                            visibleToRoles: Array.isArray(incomingField.visibleToRoles)
                                ? incomingField.visibleToRoles
                                : [],
                        };
                        return acc;
                    }, {}),
                },
            },
        };
    });
    const [teamDefaultPermissionSearch, setTeamDefaultPermissionSearch] = useState("");
    const [auditTypeFilter, setAuditTypeFilter] = useState("all");
    const [auditResourceFilter, setAuditResourceFilter] = useState("all");
    const [auditSearch, setAuditSearch] = useState("");
    const [auditPage, setAuditPage] = useState(1);
    const [activeRoleForDefaults, setActiveRoleForDefaults] = useState(() => teamRoleOptions[0] || "courier_dispatcher");
    const [activeRoleForPermissionModel, setActiveRoleForPermissionModel] = useState(() => teamRoleOptions[0] || "courier_dispatcher");
    const [roleStudioRoles, setRoleStudioRoles] = useState(teamRoleCatalog);
    const [roleStudioTemplates] = useState(teamRoleTemplates);
    const [selectedRoleName, setSelectedRoleName] = useState(() => teamRoleCatalog[0]?.name || teamRoleOptions[0] || "");
    const [roleStudioPermissionSearch, setRoleStudioPermissionSearch] = useState("");
    const [roleCatalogSearch, setRoleCatalogSearch] = useState("");
    const [roleTypeFilter, setRoleTypeFilter] = useState("all");
    const [roleVersionTimeline, setRoleVersionTimeline] = useState([]);
    const [leftVersionNumber, setLeftVersionNumber] = useState("");
    const [rightVersionNumber, setRightVersionNumber] = useState("");
    const [loadingRoleVersions, setLoadingRoleVersions] = useState(false);
    const [roleStudioBusy, setRoleStudioBusy] = useState(false);
    const [roleFormErrors, setRoleFormErrors] = useState({});
    const [roleTemplateFormErrors, setRoleTemplateFormErrors] = useState({});
    const [roleCloneFormErrors, setRoleCloneFormErrors] = useState({});
    const [roleForm, setRoleForm] = useState({
        name: "",
        label: "",
        description: "",
        permissions: [],
    });
    const [roleTemplateForm, setRoleTemplateForm] = useState({
        template: Object.keys(teamRoleTemplates || {})[0] || "operations",
        name: "",
        label: "",
        description: "",
        permissions: [],
    });
    const [roleCloneForm, setRoleCloneForm] = useState({
        sourceRole: teamRoleCatalog[0]?.name || teamRoleOptions[0] || "",
        name: "",
        label: "",
        description: "",
        permissions: [],
    });
    const [teamPolicyPanels, setTeamPolicyPanels] = useState({
        basic: true,
        approvalDualControl: false,
        advancedModel: false,
    });
    const [approvalQueue, setApprovalQueue] = useState(teamSensitiveApprovals);
    const [approvalActionBusyId, setApprovalActionBusyId] = useState(null);
    const [temporaryAccessQueue, setTemporaryAccessQueue] = useState(teamTemporaryAccessGrants);
    const [accessReviewQueue, setAccessReviewQueue] = useState(teamAccessReviewQueue);
    const [apiCredentialQueue, setApiCredentialQueue] = useState(teamApiCredentials);
    const [temporaryAccessActionBusyId, setTemporaryAccessActionBusyId] = useState(null);
    const [apiAccessActionBusyId, setApiAccessActionBusyId] = useState(null);
    const [latestApiKeySecret, setLatestApiKeySecret] = useState("");
    const [apiCredentialStatusFilter, setApiCredentialStatusFilter] = useState("all");
    const [apiCredentialServiceFilter, setApiCredentialServiceFilter] = useState("all");
    const [apiCredentialSearch, setApiCredentialSearch] = useState("");
    const [apiCredentialPage, setApiCredentialPage] = useState(1);
    const [apiTrendWindowDays, setApiTrendWindowDays] = useState(30);
    const [apiCredentialForm, setApiCredentialForm] = useState({
        credentialName: "",
        serviceAccountCode: "",
        roleName: teamRoleOptions[0] || "courier_dispatcher",
        ttlDays: Number(settings?.team?.apiServiceAccessControl?.defaultTtlDays || 30),
        permissionScopes: [],
        webhookScopes: [],
    });
    const [temporaryAccessForm, setTemporaryAccessForm] = useState({
        targetUserId: "",
        elevatedRoleName: "courier_admin",
        durationMinutes: 120,
        ticketRef: "",
        reason: "",
    });
    const [breakGlassForm, setBreakGlassForm] = useState({
        targetUserId: "",
        durationMinutes: 30,
        ticketRef: "",
        reason: "",
    });
    const [activePricingCategory, setActivePricingCategory] = useState(() => {
        if (approvedPricingCategories.includes(initialPricingCategory)) {
            return initialPricingCategory;
        }

        return defaultPricingCategory;
    });
    const [pricingPreviewInput, setPricingPreviewInput] = useState({
        weightKg: 3,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 20,
    });
    const [pricingPublishAt, setPricingPublishAt] = useState("");
    const [pricingGovernanceNote, setPricingGovernanceNote] = useState("");
    const [pricingGovernanceActionBusy, setPricingGovernanceActionBusy] = useState(false);
    const [pricingRollbackVersion, setPricingRollbackVersion] = useState("");
    const [liveRateBusy, setLiveRateBusy] = useState(false);
    const [pricingZoneDraft, setPricingZoneDraft] = useState("");
    const [addTierModalOpen, setAddTierModalOpen] = useState(false);
    const [addTierModalCategory, setAddTierModalCategory] = useState("domestic");
    const [addTierDraftKey, setAddTierDraftKey] = useState("");
    const [addTierDraftError, setAddTierDraftError] = useState("");
    const [pricingImportFile, setPricingImportFile] = useState(null);
    const [pricingImportMode, setPricingImportMode] = useState("replace");
    const [pricingImportResolutionStrategy, setPricingImportResolutionStrategy] = useState("prefer_most_frequent");
    const [pricingImportManualResolutions, setPricingImportManualResolutions] = useState({});
    const [pricingImportPreviewBusy, setPricingImportPreviewBusy] = useState(false);
    const [pricingImportApplyBusy, setPricingImportApplyBusy] = useState(false);
    const [pricingImportPreviewToken, setPricingImportPreviewToken] = useState("");
    const [pricingImportManualReviewConfirmed, setPricingImportManualReviewConfirmed] = useState(false);
    const [pricingImportResult, setPricingImportResult] = useState(null);
    const [labelSizes, setLabelSizes] = useState([]);
    const [labelTemplates, setLabelTemplates] = useState([]);
    const [labelCatalogBusy, setLabelCatalogBusy] = useState(false);
    const [labelCatalogError, setLabelCatalogError] = useState("");
    const [labelSizeForm, setLabelSizeForm] = useState({
        name: "",
        widthMm: "",
        heightMm: "",
        unit: "mm",
    });
    const [labelSizeDrafts, setLabelSizeDrafts] = useState({});
    const [labelTemplateForm, setLabelTemplateForm] = useState({
        name: "",
        templateType: "builder",
        categoryScope: "all",
        sizeId: "",
        orientation: "portrait",
        builderSchema: "",
        htmlTemplate: "",
        cssTemplate: "",
        fieldOverrides: "",
        backgroundFile: null,
    });
    const [labelTemplateDrafts, setLabelTemplateDrafts] = useState({});
    const [labelSizeSaveBusyId, setLabelSizeSaveBusyId] = useState(null);
    const [labelTemplateSaveBusyId, setLabelTemplateSaveBusyId] = useState(null);
    const [labelPreviewBusyId, setLabelPreviewBusyId] = useState(null);
    const [labelTemplateUploadBusy, setLabelTemplateUploadBusy] = useState(false);
    const [codRequestBusy, setCodRequestBusy] = useState(false);
    const [codRequestNote, setCodRequestNote] = useState(String(incomingCodCapability.requestedNote || ""));
    const [notificationBasicView, setNotificationBasicView] = useState(true);
    const [notificationTestEmailBusy, setNotificationTestEmailBusy] = useState(false);
    const [notificationTestEmailTo, setNotificationTestEmailTo] = useState(String(authUser?.email || ""));

    useEffect(() => {
        if (!approvedPricingCategories.includes(activePricingCategory)) {
            setActivePricingCategory(defaultPricingCategory);
        }
    }, [activePricingCategory, approvedPricingCategories, defaultPricingCategory]);

    useEffect(() => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const policyModules = pricing.policyModules || DEFAULT_SETTINGS.pricing.policyModules;
            const categoryPolicy = (policyModules && typeof policyModules[activePricingCategory] === "object")
                ? policyModules[activePricingCategory]
                : DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory];
            const customerContractPricing = (categoryPolicy && typeof categoryPolicy.customerContractPricing === "object")
                ? categoryPolicy.customerContractPricing
                : DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].customerContractPricing;
            const contracts = Array.isArray(customerContractPricing.contracts)
                ? customerContractPricing.contracts
                : [];

            let hasChanges = false;
            const normalizedContracts = contracts.map((contract) => {
                const row = contract && typeof contract === "object" ? contract : {};
                const rowCategory = String(row.category || "").toLowerCase();
                const rowCategories = Array.isArray(row.categories)
                    ? row.categories.map((item) => String(item || "").toLowerCase()).filter(Boolean)
                    : [];

                const isAlreadyScoped = rowCategory === activePricingCategory
                    && rowCategories.length === 1
                    && rowCategories[0] === activePricingCategory;

                if (isAlreadyScoped) {
                    return row;
                }

                hasChanges = true;

                return {
                    ...row,
                    category: activePricingCategory,
                    categories: [activePricingCategory],
                };
            });

            if (!hasChanges) {
                return prev;
            }

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    policyModules: {
                        ...policyModules,
                        [activePricingCategory]: {
                            ...categoryPolicy,
                            customerContractPricing: {
                                ...customerContractPricing,
                                contracts: normalizedContracts,
                            },
                        },
                    },
                },
            };
        });
    }, [activePricingCategory]);

    useEffect(() => {
        setPricingImportResult(null);
        setPricingImportFile(null);
        setPricingImportPreviewToken("");
        setPricingImportManualReviewConfirmed(false);
        setPricingImportResolutionStrategy("prefer_most_frequent");
        setPricingImportManualResolutions({});
    }, [activePricingCategory]);

    useEffect(() => {
        if (activeTab !== "labels") {
            return;
        }

        if (!canViewLabels) {
            setLabelCatalogError("You do not have permission to view labels.");
            return;
        }

        loadLabelCatalog();
    }, [activeTab, canViewLabels]);

    const {
        feedback,
        closeFeedback,
        setFeedback,
        confirmState,
        openConfirm,
        closeConfirm,
        runConfirm,
    } = useCourierActionModal(flash, 2800);

    const updateValue = (section, key, value) => {
        setSettings((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value,
            },
        }));
    };

    const syncLegacyNotificationFlags = (notificationSettings) => {
        const eventMatrix = notificationSettings?.eventMatrix && typeof notificationSettings.eventMatrix === "object"
            ? notificationSettings.eventMatrix
            : DEFAULT_NOTIFICATION_SETTINGS.eventMatrix;
        return {
            ...notificationSettings,
            ...buildLegacyNotificationFlags(eventMatrix),
        };
    };

    const updateNotificationState = (mutator) => {
        setSettings((prev) => {
            const currentNotifications = prev.notifications && typeof prev.notifications === "object"
                ? prev.notifications
                : DEFAULT_NOTIFICATION_SETTINGS;
            const nextNotifications = mutator(currentNotifications);
            return {
                ...prev,
                notifications: syncLegacyNotificationFlags(nextNotifications),
            };
        });
    };

    const updateNotificationChannelEnabled = (channelKey, enabled) => {
        updateNotificationState((current) => ({
            ...current,
            channels: {
                ...(current.channels || DEFAULT_NOTIFICATION_SETTINGS.channels),
                [channelKey]: {
                    ...(((current.channels && current.channels[channelKey]) || DEFAULT_NOTIFICATION_SETTINGS.channels[channelKey]) || {}),
                    enabled,
                },
            },
        }));
    };

    const updateNotificationEventMatrix = (eventKey, audienceKey, channelKey, enabled) => {
        updateNotificationState((current) => ({
            ...current,
            eventMatrix: {
                ...(current.eventMatrix || DEFAULT_NOTIFICATION_SETTINGS.eventMatrix),
                [eventKey]: {
                    ...(((current.eventMatrix && current.eventMatrix[eventKey]) || DEFAULT_NOTIFICATION_SETTINGS.eventMatrix[eventKey]) || {}),
                    [audienceKey]: {
                        ...((((current.eventMatrix && current.eventMatrix[eventKey] && current.eventMatrix[eventKey][audienceKey]) || DEFAULT_NOTIFICATION_SETTINGS.eventMatrix?.[eventKey]?.[audienceKey]) || {})),
                        [channelKey]: enabled,
                    },
                },
            },
        }));
    };

    const updateNotificationLegacyToggle = (legacyKey, enabled) => {
        const mapping = LEGACY_NOTIFICATION_MAP[legacyKey];
        if (!mapping) {
            return;
        }
        updateNotificationEventMatrix(mapping.event, mapping.audience, "email", enabled);
    };

    const updateNotificationRecipients = (groupKey, fieldKey, value) => {
        updateNotificationState((current) => ({
            ...current,
            [groupKey]: {
                ...(current[groupKey] || DEFAULT_NOTIFICATION_SETTINGS[groupKey]),
                [fieldKey]: value,
            },
        }));
    };

    const updateNotificationDelivery = (groupKey, fieldKey, value) => {
        updateNotificationState((current) => ({
            ...current,
            delivery: {
                ...(current.delivery || DEFAULT_NOTIFICATION_SETTINGS.delivery),
                [groupKey]: {
                    ...(((current.delivery && current.delivery[groupKey]) || DEFAULT_NOTIFICATION_SETTINGS.delivery[groupKey]) || {}),
                    [fieldKey]: value,
                },
            },
        }));
    };

    const updateNotificationDeliverability = (fieldKey, value) => {
        updateNotificationState((current) => ({
            ...current,
            deliverability: {
                ...(current.deliverability || DEFAULT_NOTIFICATION_SETTINGS.deliverability),
                [fieldKey]: value,
            },
        }));
    };

    const sendNotificationTestEmail = async () => {
        setNotificationTestEmailBusy(true);
        try {
            const payload = await requestJson("POST", route("courierService.settings.notifications.test-email"), {
                to: notificationTestEmailTo || null,
            });
            setFeedback({ type: "success", message: payload?.message || "Notification test email sent." });
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to send notification test email." });
        } finally {
            setNotificationTestEmailBusy(false);
        }
    };

    const updateServiceCodValue = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            services: {
                ...(prev.services || DEFAULT_SETTINGS.services),
                cod: {
                    ...((prev.services && prev.services.cod) || DEFAULT_SETTINGS.services.cod),
                    [key]: value,
                },
            },
        }));
    };

    const updateLabelDefaults = (categoryKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            labels: {
                ...(prev.labels || DEFAULT_SETTINGS.labels),
                defaults: {
                    ...((prev.labels && prev.labels.defaults) || DEFAULT_SETTINGS.labels.defaults),
                    [categoryKey]: {
                        ...(((prev.labels && prev.labels.defaults && prev.labels.defaults[categoryKey]) || DEFAULT_SETTINGS.labels.defaults[categoryKey]) || {}),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updateLabelPolicy = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            labels: {
                ...(prev.labels || DEFAULT_SETTINGS.labels),
                printPolicy: {
                    ...((prev.labels && prev.labels.printPolicy) || DEFAULT_SETTINGS.labels.printPolicy),
                    [key]: value,
                },
            },
        }));
    };

    const updatePricingLocalization = (categoryKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            pricing: {
                ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                localization: {
                    ...((prev.pricing && prev.pricing.localization) || DEFAULT_SETTINGS.pricing.localization),
                    [categoryKey]: {
                        ...(((prev.pricing && prev.pricing.localization && prev.pricing.localization[categoryKey]) || DEFAULT_SETTINGS.pricing.localization[categoryKey])),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updatePricingFormula = (categoryKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            pricing: {
                ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                formula: {
                    ...((prev.pricing && prev.pricing.formula) || DEFAULT_SETTINGS.pricing.formula),
                    [categoryKey]: {
                        ...(((prev.pricing && prev.pricing.formula && prev.pricing.formula[categoryKey]) || DEFAULT_SETTINGS.pricing.formula[categoryKey])),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updatePricingGovernance = (categoryKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            pricing: {
                ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                governance: {
                    ...((prev.pricing && prev.pricing.governance) || DEFAULT_SETTINGS.pricing.governance),
                    [categoryKey]: {
                        ...(((prev.pricing && prev.pricing.governance && prev.pricing.governance[categoryKey]) || DEFAULT_SETTINGS.pricing.governance[categoryKey])),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updatePricingPolicyModule = (categoryKey, moduleKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            pricing: {
                ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                policyModules: {
                    ...((prev.pricing && prev.pricing.policyModules) || DEFAULT_SETTINGS.pricing.policyModules),
                    [categoryKey]: {
                        ...((prev.pricing && prev.pricing.policyModules && prev.pricing.policyModules[categoryKey]) || DEFAULT_SETTINGS.pricing.policyModules[categoryKey]),
                        [moduleKey]: {
                            ...((prev.pricing
                                && prev.pricing.policyModules
                                && prev.pricing.policyModules[categoryKey]
                                && prev.pricing.policyModules[categoryKey][moduleKey]) || DEFAULT_SETTINGS.pricing.policyModules[categoryKey][moduleKey]),
                            [key]: value,
                        },
                    },
                },
            },
        }));
    };

    const updatePricingTierEngineTier = (categoryKey, tierKey, key, value) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const policyModules = pricing.policyModules || DEFAULT_SETTINGS.pricing.policyModules;
            const categoryModules = policyModules[categoryKey] || DEFAULT_SETTINGS.pricing.policyModules[categoryKey];
            const tierEngine = categoryModules.speedEtaTierEngine || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine;
            const tiers = tierEngine.tiers || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine.tiers;

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    policyModules: {
                        ...policyModules,
                        [categoryKey]: {
                            ...categoryModules,
                            speedEtaTierEngine: {
                                ...tierEngine,
                                tiers: {
                                    ...tiers,
                                    [tierKey]: {
                                        ...(tiers[tierKey] || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine.tiers[tierKey] || {}),
                                        [key]: value,
                                    },
                                },
                            },
                        },
                    },
                },
            };
        });
    };

    const openAddTierModal = (categoryKey) => {
        setAddTierModalCategory(categoryKey);
        setAddTierDraftKey("");
        setAddTierDraftError("");
        setAddTierModalOpen(true);
    };

    const closeAddTierModal = () => {
        setAddTierModalOpen(false);
        setAddTierDraftKey("");
        setAddTierDraftError("");
    };

    const addPricingTierEngineTier = (categoryKey, rawKey) => {
        const tierKey = String(rawKey || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        if (!tierKey) {
            setAddTierDraftError("Tier key is required.");
            return;
        }

        setAddTierDraftError("");
        let added = false;
        let duplicate = false;

        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const policyModules = pricing.policyModules || DEFAULT_SETTINGS.pricing.policyModules;
            const categoryModules = policyModules[categoryKey] || DEFAULT_SETTINGS.pricing.policyModules[categoryKey];
            const tierEngine = categoryModules.speedEtaTierEngine || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine;
            const tiers = tierEngine.tiers || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine.tiers;

            if (tiers[tierKey]) {
                duplicate = true;
                return prev;
            }

            added = true;

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    policyModules: {
                        ...policyModules,
                        [categoryKey]: {
                            ...categoryModules,
                            speedEtaTierEngine: {
                                ...tierEngine,
                                tiers: {
                                    ...tiers,
                                    [tierKey]: {
                                        ...DEFAULT_SPEED_ETA_TIER_TEMPLATE,
                                        etaLabel: titleCase(tierKey),
                                    },
                                },
                            },
                        },
                    },
                },
            };
        });

        if (duplicate) {
            setAddTierDraftError("Tier key already exists.");
            return;
        }

        if (added) {
            closeAddTierModal();
        }
    };

    const removePricingTierEngineTier = (categoryKey, tierKey) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const policyModules = pricing.policyModules || DEFAULT_SETTINGS.pricing.policyModules;
            const categoryModules = policyModules[categoryKey] || DEFAULT_SETTINGS.pricing.policyModules[categoryKey];
            const tierEngine = categoryModules.speedEtaTierEngine || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine;
            const tiers = { ...(tierEngine.tiers || DEFAULT_SETTINGS.pricing.policyModules[categoryKey].speedEtaTierEngine.tiers) };

            if (!tiers[tierKey]) {
                return prev;
            }

            delete tiers[tierKey];

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    policyModules: {
                        ...policyModules,
                        [categoryKey]: {
                            ...categoryModules,
                            speedEtaTierEngine: {
                                ...tierEngine,
                                tiers,
                            },
                        },
                    },
                },
            };
        });
    };

    const parseCommaList = (value, transform = (item) => item) => String(value || "")
        .split(",")
        .map((item) => transform(String(item || "").trim()))
        .filter((item) => Boolean(item));

    const parseMultiplierMapInput = (value) => String(value || "")
        .split(/\r?\n|,/)
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .reduce((acc, row) => {
            const [rawKey, rawValue] = row.split(":");
            const normalizedKey = String(rawKey || "")
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");
            const numericValue = Number(rawValue);

            if (!normalizedKey || Number.isNaN(numericValue) || numericValue <= 0) {
                return acc;
            }

            acc[normalizedKey] = numericValue;
            return acc;
        }, {});

    const formatMultiplierMapInput = (value) => {
        if (!value || typeof value !== "object") {
            return "";
        }

        return Object.entries(value)
            .map(([key, multiplier]) => `${key}: ${Number(multiplier || 1)}`)
            .join("\n");
    };

    const runPricingGovernanceAction = (action, options = {}) => {
        setPricingGovernanceActionBusy(true);
        router.post(
            route("courierService.settings.update"),
            {
                action,
                effectiveAt: options.effectiveAt || null,
                note: options.note || pricingGovernanceNote || null,
                rollbackVersion: options.rollbackVersion || null,
                pricingCategory: activePricingCategory,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setPricingGovernanceActionBusy(false),
                onError: (errors) => handleInertiaActionError(errors, "Pricing governance action failed."),
            },
        );
    };

    const updatePricingServiceLevel = (categoryKey, index, key, value) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const catalog = pricing.serviceCatalog || DEFAULT_SETTINGS.pricing.serviceCatalog;
            const rows = Array.isArray(catalog[categoryKey]) ? catalog[categoryKey] : [];

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    serviceCatalog: {
                        ...catalog,
                        [categoryKey]: rows.map((row, rowIndex) => {
                            if (rowIndex !== index) {
                                return row;
                            }

                            return {
                                ...row,
                                [key]: value,
                            };
                        }),
                    },
                },
            };
        });
    };

    const updatePricingLaneMatrix = (categoryKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            pricing: {
                ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                laneMatrix: {
                    ...((prev.pricing && prev.pricing.laneMatrix) || DEFAULT_SETTINGS.pricing.laneMatrix),
                    [key]: {
                        ...((((prev.pricing && prev.pricing.laneMatrix && prev.pricing.laneMatrix[key]) || DEFAULT_SETTINGS.pricing.laneMatrix[key]) && typeof ((prev.pricing && prev.pricing.laneMatrix && prev.pricing.laneMatrix[key]) || DEFAULT_SETTINGS.pricing.laneMatrix[key]) === "object"
                            ? ((prev.pricing && prev.pricing.laneMatrix && prev.pricing.laneMatrix[key]) || DEFAULT_SETTINGS.pricing.laneMatrix[key])
                            : { domestic: Boolean((prev.pricing && prev.pricing.laneMatrix && prev.pricing.laneMatrix[key]) || false), international: Boolean((prev.pricing && prev.pricing.laneMatrix && prev.pricing.laneMatrix[key]) || false) })),
                        [categoryKey]: value,
                    },
                },
            },
        }));
    };

    const sanitizePricingZoneKey = (value) => String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const addPricingZone = (categoryKey) => {
        const zoneLabel = String(pricingZoneDraft || "").trim();
        const zoneKey = sanitizePricingZoneKey(zoneLabel);
        if (!zoneKey) {
            return;
        }

        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const zoneMaster = pricing.zoneMaster || DEFAULT_SETTINGS.pricing.zoneMaster;
            const currentZones = Array.isArray(zoneMaster[categoryKey]) ? zoneMaster[categoryKey] : [];
            if (currentZones.some((row) => String(row?.key || "") === zoneKey)) {
                return prev;
            }

            const nextSortOrder = currentZones.length + 1;
            return {
                ...prev,
                pricing: {
                    ...pricing,
                    zoneMaster: {
                        ...zoneMaster,
                        [categoryKey]: [
                            ...currentZones,
                            {
                                key: zoneKey,
                                label: zoneLabel,
                                isActive: true,
                                sortOrder: nextSortOrder,
                            },
                        ],
                    },
                },
            };
        });

        setPricingZoneDraft("");
    };

    const updatePricingZone = (categoryKey, index, key, value) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const zoneMaster = pricing.zoneMaster || DEFAULT_SETTINGS.pricing.zoneMaster;
            const currentZones = Array.isArray(zoneMaster[categoryKey]) ? zoneMaster[categoryKey] : [];

            const nextZones = currentZones.map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return row;
                }

                if (key === "label") {
                    return {
                        ...row,
                        label: String(value || ""),
                    };
                }

                return {
                    ...row,
                    [key]: value,
                };
            });

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    zoneMaster: {
                        ...zoneMaster,
                        [categoryKey]: nextZones,
                    },
                },
            };
        });
    };

    const removePricingZone = (categoryKey, index) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const zoneMaster = pricing.zoneMaster || DEFAULT_SETTINGS.pricing.zoneMaster;
            const currentZones = Array.isArray(zoneMaster[categoryKey]) ? zoneMaster[categoryKey] : [];
            if (currentZones.length <= 1) {
                return prev;
            }

            const removedZoneKey = String(currentZones[index]?.key || "");
            const nextZones = currentZones
                .filter((_, rowIndex) => rowIndex !== index)
                .map((row, rowIndex) => ({
                    ...row,
                    sortOrder: rowIndex + 1,
                }));

            const laneMatrix = pricing.laneMatrix || DEFAULT_SETTINGS.pricing.laneMatrix;
            const fallbackZoneKey = String(nextZones[0]?.key || "*");
            const nextLaneMatrix = {
                ...laneMatrix,
                [categoryKey]: (Array.isArray(laneMatrix[categoryKey]) ? laneMatrix[categoryKey] : []).map((row) => ({
                    ...row,
                    originZone: String(row?.originZone || "*") === removedZoneKey ? fallbackZoneKey : String(row?.originZone || "*"),
                    destinationZone: String(row?.destinationZone || "*") === removedZoneKey ? fallbackZoneKey : String(row?.destinationZone || "*"),
                })),
            };

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    zoneMaster: {
                        ...zoneMaster,
                        [categoryKey]: nextZones,
                    },
                    laneMatrix: nextLaneMatrix,
                },
            };
        });
    };

    const updatePricingLaneRule = (categoryKey, index, key, value) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const laneMatrix = pricing.laneMatrix || DEFAULT_SETTINGS.pricing.laneMatrix;
            const rows = Array.isArray(laneMatrix[categoryKey]) ? laneMatrix[categoryKey] : [];

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    laneMatrix: {
                        ...laneMatrix,
                        [categoryKey]: rows.map((row, rowIndex) => {
                            if (rowIndex !== index) {
                                return row;
                            }

                            return {
                                ...row,
                                [key]: value,
                            };
                        }),
                    },
                },
            };
        });
    };

    const addPricingLaneRule = (categoryKey) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const laneMatrix = pricing.laneMatrix || DEFAULT_SETTINGS.pricing.laneMatrix;
            const rows = Array.isArray(laneMatrix[categoryKey]) ? laneMatrix[categoryKey] : [];
            const defaultServiceLevelKey = String((pricing.serviceCatalog?.[categoryKey]?.[0]?.key) || "economy");

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    laneMatrix: {
                        ...laneMatrix,
                        [categoryKey]: [
                            ...rows,
                            {
                                id: `${categoryKey}_lane_${rows.length + 1}`,
                                originZone: "*",
                                destinationZone: "*",
                                serviceLevelKey: defaultServiceLevelKey,
                                distanceFromKm: 0,
                                distanceToKm: null,
                                distanceBaseKm: 0,
                                perKmPrice: 0,
                                distanceSurcharge: 0,
                                distanceMultiplier: 1,
                                basePrice: 0,
                                perKgPrice: 0,
                                minPrice: 0,
                                priorityMultiplier: 1,
                                isActive: true,
                            },
                        ],
                    },
                },
            };
        });
    };

    const removePricingLaneRule = (categoryKey, index) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const laneMatrix = pricing.laneMatrix || DEFAULT_SETTINGS.pricing.laneMatrix;
            const rows = Array.isArray(laneMatrix[categoryKey]) ? laneMatrix[categoryKey] : [];

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    laneMatrix: {
                        ...laneMatrix,
                        [categoryKey]: rows.filter((_, rowIndex) => rowIndex !== index),
                    },
                },
            };
        });
    };

    const addPricingServiceLevel = (categoryKey) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const catalog = pricing.serviceCatalog || DEFAULT_SETTINGS.pricing.serviceCatalog;
            const rows = Array.isArray(catalog[categoryKey]) ? catalog[categoryKey] : [];
            const nextIndex = rows.length + 1;
            const nextKey = `${categoryKey}_service_${nextIndex}`;

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    serviceCatalog: {
                        ...catalog,
                        [categoryKey]: [
                            ...rows,
                            {
                                key: nextKey,
                                label: "New Service",
                                promisedSlaDays: 2,
                                cutoffTime: "18:00",
                                isActive: true,
                                sortOrder: nextIndex,
                            },
                        ],
                    },
                },
            };
        });
    };

    const removePricingServiceLevel = (categoryKey, index) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const catalog = pricing.serviceCatalog || DEFAULT_SETTINGS.pricing.serviceCatalog;
            const categories = pricing.categories || DEFAULT_SETTINGS.pricing.categories;
            const rows = Array.isArray(catalog[categoryKey]) ? catalog[categoryKey] : [];

            if (rows.length <= 1) {
                return prev;
            }

            const removedKey = String(rows[index]?.key || "");
            const nextCatalogRows = rows.filter((_, rowIndex) => rowIndex !== index);
            const fallbackServiceKey = String(nextCatalogRows[0]?.key || "economy");
            const nextCategoryRows = (Array.isArray(categories[categoryKey]) ? categories[categoryKey] : []).map((tierRow) => {
                if (String(tierRow?.serviceLevelKey || "") !== removedKey) {
                    return tierRow;
                }

                return {
                    ...tierRow,
                    serviceLevelKey: fallbackServiceKey,
                };
            });

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    serviceCatalog: {
                        ...catalog,
                        [categoryKey]: nextCatalogRows,
                    },
                    categories: {
                        ...categories,
                        [categoryKey]: nextCategoryRows,
                    },
                },
            };
        });
    };

    const updatePricingTier = (categoryKey, index, key, value) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const categories = pricing.categories || DEFAULT_SETTINGS.pricing.categories;
            const currentRows = Array.isArray(categories[categoryKey]) ? categories[categoryKey] : [];

            const nextRows = currentRows.map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return row;
                }

                return {
                    ...row,
                    [key]: value,
                };
            });

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    categories: {
                        ...categories,
                        [categoryKey]: nextRows,
                    },
                },
            };
        });
    };

    const addPricingTier = (categoryKey) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const categories = pricing.categories || DEFAULT_SETTINGS.pricing.categories;
            const serviceCatalog = pricing.serviceCatalog || DEFAULT_SETTINGS.pricing.serviceCatalog;
            const serviceLevels = Array.isArray(serviceCatalog[categoryKey]) ? serviceCatalog[categoryKey] : [];
            const rows = Array.isArray(categories[categoryKey]) ? categories[categoryKey] : [];
            const defaultServiceLevelKey = String(serviceLevels[0]?.key || "economy");

            const nextRow = {
                id: `${categoryKey}_tier_${rows.length + 1}`,
                label: "New Tier",
                serviceLevelKey: defaultServiceLevelKey,
                slaDays: 2,
                basePrice: 0,
                perKgPrice: 0,
                minPrice: 0,
                priorityMultiplier: 1,
            };

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    categories: {
                        ...categories,
                        [categoryKey]: [...rows, nextRow],
                    },
                },
            };
        });
    };

    const removePricingTier = (categoryKey, index) => {
        setSettings((prev) => {
            const pricing = prev.pricing || DEFAULT_SETTINGS.pricing;
            const categories = pricing.categories || DEFAULT_SETTINGS.pricing.categories;
            const rows = Array.isArray(categories[categoryKey]) ? categories[categoryKey] : [];
            if (rows.length <= 1) {
                return prev;
            }

            return {
                ...prev,
                pricing: {
                    ...pricing,
                    categories: {
                        ...categories,
                        [categoryKey]: rows.filter((_, rowIndex) => rowIndex !== index),
                    },
                },
            };
        });
    };

    const toggleTeamPolicyPanel = (panelKey) => {
        setTeamPolicyPanels((prev) => ({
            ...prev,
            [panelKey]: !prev[panelKey],
        }));
    };

    const toggleInArray = (list, value) => {
        if (list.includes(value)) {
            return list.filter((item) => item !== value);
        }

        return [...list, value];
    };

    const requestJson = async (method, url, body = null) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
            },
            credentials: "same-origin",
            body: body ? JSON.stringify(body) : undefined,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(payload?.message || "Request failed");
            error.code = payload?.code || null;
            error.status = response.status;
            throw error;
        }

        return payload;
    };

    const requestFormDataJson = async (url, formData) => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
            },
            credentials: "same-origin",
            body: formData,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = new Error(payload?.message || "Request failed");
            error.code = payload?.code || null;
            error.status = response.status;
            throw error;
        }

        return payload;
    };

    const syncLabelSizeDrafts = (sizes) => {
        const nextDrafts = {};
        (Array.isArray(sizes) ? sizes : []).forEach((size) => {
            nextDrafts[size.id] = {
                name: String(size?.name || ""),
                widthMm: String(size?.width_mm ?? size?.widthMm ?? ""),
                heightMm: String(size?.height_mm ?? size?.heightMm ?? ""),
                unit: String(size?.unit || "mm"),
                isActive: Boolean(size?.is_active ?? size?.isActive ?? true),
                isSystem: Boolean(size?.is_system ?? size?.isSystem ?? false),
            };
        });
        setLabelSizeDrafts(nextDrafts);
    };

    const syncLabelTemplateDrafts = (templates) => {
        const nextDrafts = {};
        (Array.isArray(templates) ? templates : []).forEach((template) => {
            nextDrafts[template.id] = {
                name: String(template?.name || ""),
                templateType: String(template?.template_type || "builder"),
                categoryScope: String(template?.category_scope || "all"),
                sizeId: template?.size_id ? String(template.size_id) : "",
                orientation: String(template?.orientation || "portrait"),
                isActive: Boolean(template?.is_active ?? true),
                isSystem: Boolean(template?.is_system ?? false),
            };
        });
        setLabelTemplateDrafts(nextDrafts);
    };

    const loadLabelCatalog = async () => {
        if (!canViewLabels) {
            setLabelCatalogError("You do not have permission to view labels.");
            return;
        }

        setLabelCatalogBusy(true);
        setLabelCatalogError("");
        try {
            const [sizesPayload, templatesPayload] = await Promise.all([
                requestJson("GET", route("courierService.labels.sizes.index")),
                requestJson("GET", route("courierService.labels.templates.index")),
            ]);

            const sizes = Array.isArray(sizesPayload?.sizes) ? sizesPayload.sizes : [];
            const templates = Array.isArray(templatesPayload?.templates) ? templatesPayload.templates : [];
            setLabelSizes(sizes);
            setLabelTemplates(templates);
            syncLabelSizeDrafts(sizes);
            syncLabelTemplateDrafts(templates);
        } catch (error) {
            setLabelCatalogError(error?.message || "Failed to load label catalog.");
        } finally {
            setLabelCatalogBusy(false);
        }
    };

    const createLabelSize = async () => {
        if (!labelPolicy.allowCustomSizes) {
            setFeedback({ type: "error", message: "Custom label sizes are disabled by policy." });
            return;
        }

        const name = String(labelSizeForm.name || "").trim();
        const widthMm = Number(labelSizeForm.widthMm || 0);
        const heightMm = Number(labelSizeForm.heightMm || 0);
        const unit = LABEL_UNIT_OPTIONS.some((option) => option.value === labelSizeForm.unit)
            ? labelSizeForm.unit
            : "mm";

        if (!name) {
            setFeedback({ type: "error", message: "Label size name is required." });
            return;
        }

        if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
            setFeedback({ type: "error", message: "Width and height must be valid positive numbers." });
            return;
        }

        try {
            await requestJson("POST", route("courierService.labels.sizes.store"), {
                name,
                widthMm,
                heightMm,
                unit,
            });
            setLabelSizeForm({ name: "", widthMm: "", heightMm: "", unit: "mm" });
            setFeedback({ type: "success", message: "Label size created successfully." });
            await loadLabelCatalog();
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to create label size." });
        }
    };

    const saveLabelSize = async (sizeId) => {
        if (!labelPolicy.allowCustomSizes) {
            setFeedback({ type: "error", message: "Custom label sizes are disabled by policy." });
            return;
        }

        const draft = labelSizeDrafts[sizeId];
        if (!draft) {
            return;
        }

        const widthMm = Number(draft.widthMm || 0);
        const heightMm = Number(draft.heightMm || 0);
        const unit = LABEL_UNIT_OPTIONS.some((option) => option.value === draft.unit)
            ? draft.unit
            : "mm";

        if (!draft.name || !draft.name.trim()) {
            setFeedback({ type: "error", message: "Label size name is required." });
            return;
        }

        if (!Number.isFinite(widthMm) || widthMm <= 0 || !Number.isFinite(heightMm) || heightMm <= 0) {
            setFeedback({ type: "error", message: "Width and height must be valid positive numbers." });
            return;
        }

        setLabelSizeSaveBusyId(sizeId);
        try {
            await requestJson("PATCH", route("courierService.labels.sizes.update", { size: sizeId }), {
                name: String(draft.name || "").trim(),
                widthMm,
                heightMm,
                unit,
                isActive: Boolean(draft.isActive),
            });
            setFeedback({ type: "success", message: "Label size updated." });
            await loadLabelCatalog();
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to update label size." });
        } finally {
            setLabelSizeSaveBusyId(null);
        }
    };

    const deleteLabelSize = (sizeId) => {
        const size = labelSizes.find((item) => item.id === sizeId);
        openConfirm({
            title: "Remove Label Size",
            message: `Delete ${size?.name || "this size"}? This cannot be undone.`,
            onConfirm: async () => {
                try {
                    await requestJson("DELETE", route("courierService.labels.sizes.delete", { size: sizeId }));
                    setFeedback({ type: "success", message: "Label size removed." });
                    await loadLabelCatalog();
                } catch (error) {
                    setFeedback({ type: "error", message: error?.message || "Failed to remove label size." });
                }
            },
        });
    };

    const parseLabelJsonField = (rawValue, fieldLabel) => {
        const trimmed = String(rawValue || "").trim();
        if (!trimmed) {
            return { ok: true, value: null };
        }

        try {
            return { ok: true, value: JSON.parse(trimmed) };
        } catch {
            return { ok: false, message: `${fieldLabel} must be valid JSON.` };
        }
    };

    const createLabelTemplate = async () => {
        if (!labelPolicy.allowTemplateUpload) {
            setFeedback({ type: "error", message: "Template uploads are disabled by policy." });
            return;
        }

        const name = String(labelTemplateForm.name || "").trim();
        const templateType = String(labelTemplateForm.templateType || "builder");
        const categoryScope = String(labelTemplateForm.categoryScope || "all");
        const sizeId = labelTemplateForm.sizeId ? Number(labelTemplateForm.sizeId) : null;
        const orientation = String(labelTemplateForm.orientation || "portrait");

        if (!name) {
            setFeedback({ type: "error", message: "Template name is required." });
            return;
        }

        if (templateType === "upload" && !labelTemplateForm.backgroundFile) {
            setFeedback({ type: "error", message: "Upload templates require a background file." });
            return;
        }

        if (templateType === "upload" && labelTemplateForm.backgroundFile) {
            const fileName = String(labelTemplateForm.backgroundFile.name || "").toLowerCase();
            if (fileName.endsWith(".pdf") && !labelPolicy.allowPdfBackground) {
                setFeedback({ type: "error", message: "PDF background uploads are disabled by policy." });
                return;
            }
        }

        if (templateType === "html" && !String(labelTemplateForm.htmlTemplate || "").trim()) {
            setFeedback({ type: "error", message: "HTML template content is required." });
            return;
        }

        if (templateType === "html" && !labelPolicy.allowHtmlTemplates) {
            setFeedback({ type: "error", message: "HTML templates are disabled by policy." });
            return;
        }

        const parsedBuilder = templateType === "builder"
            ? parseLabelJsonField(labelTemplateForm.builderSchema, "Builder schema")
            : { ok: true, value: null };
        if (!parsedBuilder.ok) {
            setFeedback({ type: "error", message: parsedBuilder.message });
            return;
        }

        if (templateType === "builder" && (!Array.isArray(parsedBuilder.value) || parsedBuilder.value.length === 0)) {
            setFeedback({ type: "error", message: "Builder schema must be a JSON array with at least one field." });
            return;
        }

        const parsedOverrides = templateType === "upload"
            ? { ok: true, value: null }
            : parseLabelJsonField(labelTemplateForm.fieldOverrides, "Field overrides");
        if (!parsedOverrides.ok) {
            setFeedback({ type: "error", message: parsedOverrides.message });
            return;
        }

        setLabelTemplateUploadBusy(true);

        try {
            if (templateType === "upload") {
                if (!labelTemplateForm.backgroundFile) {
                    setFeedback({ type: "error", message: "Upload templates require a background file." });
                    return;
                }

                const formData = new FormData();
                formData.append("name", name);
                formData.append("templateType", templateType);
                formData.append("categoryScope", categoryScope);
                if (sizeId) {
                    formData.append("sizeId", String(sizeId));
                }
                formData.append("orientation", orientation);
                formData.append("background", labelTemplateForm.backgroundFile);

                await requestFormDataJson(route("courierService.labels.templates.store"), formData);
            } else {
                await requestJson("POST", route("courierService.labels.templates.store"), {
                    name,
                    templateType,
                    categoryScope,
                    sizeId,
                    orientation,
                    builderSchema: templateType === "builder" ? parsedBuilder.value : null,
                    htmlTemplate: templateType === "html" ? labelTemplateForm.htmlTemplate : null,
                    cssTemplate: templateType === "html" ? labelTemplateForm.cssTemplate : null,
                    fieldOverrides: parsedOverrides.value,
                });
            }

            setLabelTemplateForm({
                name: "",
                templateType: "builder",
                categoryScope: "all",
                sizeId: "",
                orientation: "portrait",
                builderSchema: "",
                htmlTemplate: "",
                cssTemplate: "",
                fieldOverrides: "",
                backgroundFile: null,
            });
            setFeedback({ type: "success", message: "Label template created." });
            await loadLabelCatalog();
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to create label template." });
        } finally {
            setLabelTemplateUploadBusy(false);
        }
    };

    const saveLabelTemplate = async (templateId) => {
        if (!labelPolicy.allowTemplateUpload) {
            setFeedback({ type: "error", message: "Template updates are disabled by policy." });
            return;
        }

        const template = labelTemplates.find((item) => item.id === templateId);
        const draft = labelTemplateDrafts[templateId];

        if (!template || !draft) {
            return;
        }

        if (!draft.name || !draft.name.trim()) {
            setFeedback({ type: "error", message: "Template name is required." });
            return;
        }

        const templateType = String(template.template_type || "builder");
        const builderSchema = template.builder_schema || null;
        const htmlTemplate = template.html_template || null;

        if (templateType === "builder" && (!Array.isArray(builderSchema) || builderSchema.length === 0)) {
            setFeedback({ type: "error", message: "Builder schema is missing for this template." });
            return;
        }

        if (templateType === "html" && !String(htmlTemplate || "").trim()) {
            setFeedback({ type: "error", message: "HTML template content is missing for this template." });
            return;
        }

        if (templateType === "html" && !labelPolicy.allowHtmlTemplates) {
            setFeedback({ type: "error", message: "HTML templates are disabled by policy." });
            return;
        }

        setLabelTemplateSaveBusyId(templateId);
        try {
            await requestJson("PATCH", route("courierService.labels.templates.update", { template: templateId }), {
                name: String(draft.name || "").trim(),
                templateType,
                categoryScope: String(draft.categoryScope || "all"),
                sizeId: draft.sizeId ? Number(draft.sizeId) : null,
                orientation: String(draft.orientation || "portrait"),
                builderSchema: templateType === "builder" ? builderSchema : null,
                htmlTemplate: templateType === "html" ? htmlTemplate : null,
                cssTemplate: templateType === "html" ? (template.css_template || "") : null,
                fieldOverrides: template.field_overrides || null,
                isActive: Boolean(draft.isActive),
            });
            setFeedback({ type: "success", message: "Label template updated." });
            await loadLabelCatalog();
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Failed to update label template." });
        } finally {
            setLabelTemplateSaveBusyId(null);
        }
    };

    const deleteLabelTemplate = (templateId) => {
        const template = labelTemplates.find((item) => item.id === templateId);
        openConfirm({
            title: "Remove Label Template",
            message: `Delete ${template?.name || "this template"}?`,
            onConfirm: async () => {
                try {
                    await requestJson("DELETE", route("courierService.labels.templates.delete", { template: templateId }));
                    setFeedback({ type: "success", message: "Label template removed." });
                    await loadLabelCatalog();
                } catch (error) {
                    setFeedback({ type: "error", message: error?.message || "Failed to remove label template." });
                }
            },
        });
    };

    const previewLabelTemplate = async (templateId, sizeId) => {
        setLabelPreviewBusyId(templateId);

        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
            const response = await fetch(route("courierService.labels.preview"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/pdf",
                    ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    templateId,
                    sizeId: sizeId || null,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.message || "Unable to preview label template.");
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(url), 30000);
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Unable to preview label template." });
        } finally {
            setLabelPreviewBusyId(null);
        }
    };

    const normalizeImportCityKey = (value) => String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const previewPricingImport = async () => {
        if (!pricingImportFile) {
            setFeedback({ type: "error", message: "Select an import file first." });
            return;
        }

        const formData = new FormData();
        formData.append("file", pricingImportFile);
        formData.append("pricingCategory", activePricingCategory);

        setPricingImportPreviewBusy(true);
        try {
            const payload = await requestFormDataJson(route("courierService.settings.pricing.import.preview"), formData);
            setPricingImportResult(payload);
            setPricingImportPreviewToken(String(payload?.previewToken || ""));
            setPricingImportManualReviewConfirmed(false);

            const recommendedResolutionStrategy = String(payload?.accuracyPolicy?.recommendedResolutionStrategy || "");
            if (["prefer_existing", "prefer_most_frequent", "manual"].includes(recommendedResolutionStrategy)) {
                setPricingImportResolutionStrategy(recommendedResolutionStrategy);
            }

            const nextManualResolutions = {};
            (Array.isArray(payload?.conflicts) ? payload.conflicts : []).forEach((conflict) => {
                const cityKey = normalizeImportCityKey(conflict?.cityKey || conflict?.city || "");
                const defaultZone = String(conflict?.recommendedZone || (Array.isArray(conflict?.zones) ? conflict.zones[0] : "") || "");
                if (cityKey && defaultZone) {
                    nextManualResolutions[cityKey] = defaultZone;
                }
            });
            setPricingImportManualResolutions(nextManualResolutions);
            setFeedback({ type: "success", message: "Import file analyzed. Review confidence and conflicts before applying." });
        } catch (error) {
            setPricingImportResult(null);
            setPricingImportPreviewToken("");
            setPricingImportManualReviewConfirmed(false);
            setPricingImportManualResolutions({});
            setFeedback({ type: "error", message: error?.message || "Unable to analyze pricing import file." });
        } finally {
            setPricingImportPreviewBusy(false);
        }
    };

    const applyPricingImportToDraft = async () => {
        if (!pricingImportResult?.patch) {
            setFeedback({ type: "error", message: "Run import analysis before applying changes." });
            return;
        }

        if (!pricingImportPreviewToken) {
            setFeedback({ type: "error", message: "Preview token is missing. Analyze the import file again before applying." });
            return;
        }

        if (pricingImportResult?.requiresManualReview && !pricingImportManualReviewConfirmed) {
            setFeedback({ type: "error", message: "Confirm manual review before applying this import." });
            return;
        }

        const detectedFormat = String(pricingImportResult?.detectedFormat || "").toLowerCase();
        if (detectedFormat === "pdf" && (pricingImportResult?.conflicts || []).length > 0 && pricingImportResolutionStrategy !== "manual") {
            setFeedback({ type: "error", message: "PDF conflicts should use Manual City Mapping for best accuracy." });
            return;
        }

        if (pricingImportResolutionStrategy === "manual") {
            const conflicts = Array.isArray(pricingImportResult?.conflicts) ? pricingImportResult.conflicts : [];
            const missingCities = conflicts
                .map((conflict) => ({
                    cityKey: normalizeImportCityKey(conflict?.cityKey || conflict?.city || ""),
                    city: String(conflict?.city || conflict?.cityKey || "city"),
                }))
                .filter((item) => item.cityKey && !pricingImportManualResolutions[item.cityKey])
                .map((item) => item.city);

            if (missingCities.length > 0) {
                setFeedback({
                    type: "error",
                    message: `Manual conflict resolution is incomplete for: ${missingCities.slice(0, 4).join(", ")}${missingCities.length > 4 ? "..." : ""}`,
                });
                return;
            }
        }

        setPricingImportApplyBusy(true);
        try {
            const payload = await requestJson("POST", route("courierService.settings.pricing.import.apply"), {
                pricingCategory: activePricingCategory,
                mode: pricingImportMode,
                previewToken: pricingImportPreviewToken,
                manualReviewConfirmed: pricingImportManualReviewConfirmed,
                resolutionStrategy: pricingImportResolutionStrategy,
                manualResolutions: pricingImportManualResolutions,
                importPayload: pricingImportResult.patch,
            });

            if (payload?.pricing && typeof payload.pricing === "object") {
                setSettings((prev) => ({
                    ...prev,
                    pricing: payload.pricing,
                }));
            }

            if (payload?.summary && typeof payload.summary === "object") {
                setPricingImportResult((prev) => (prev && typeof prev === "object"
                    ? {
                        ...prev,
                        appliedSummary: payload.summary,
                    }
                    : prev));
            }

            setFeedback({ type: "success", message: payload?.message || "Imported pricing applied to draft." });
        } catch (error) {
            if (error?.code === "pricing_import_pdf_manual_strategy_required") {
                setPricingImportResolutionStrategy("manual");
            }
            setFeedback({ type: "error", message: error?.message || "Unable to apply imported pricing." });
        } finally {
            setPricingImportApplyBusy(false);
        }
    };

    const resolveExchangeRate = (localization) => {
        const baseCurrency = String(localization?.baseCurrency || "LKR").toUpperCase();
        const displayCurrency = String(localization?.displayCurrency || baseCurrency).toUpperCase();
        if (baseCurrency === displayCurrency) {
            return 1;
        }

        const rates = localization?.manualRates || {};
        const value = Number(rates[displayCurrency] || 0);
        if (!Number.isFinite(value) || value <= 0) {
            return 1;
        }

        return value;
    };

    const formatMoney = (value, currencyCode, locale) => {
        try {
            return new Intl.NumberFormat(locale || "en-LK", {
                style: "currency",
                currency: currencyCode || "LKR",
                maximumFractionDigits: 2,
            }).format(Number(value || 0));
        } catch {
            return `${currencyCode || "LKR"} ${Number(value || 0).toFixed(2)}`;
        }
    };

    const fetchLiveExchangeRates = async () => {
        const activeLocalization = (settings?.pricing?.localization && settings.pricing.localization[activePricingCategory])
            ? settings.pricing.localization[activePricingCategory]
            : DEFAULT_SETTINGS.pricing.localization[activePricingCategory];
        const baseCurrency = String(activeLocalization?.baseCurrency || "LKR").toUpperCase();
        const manualRates = activeLocalization?.manualRates || {};
        const targets = Object.keys(manualRates)
            .map((code) => String(code || "").toUpperCase())
            .filter((code) => code && code !== baseCurrency);

        setLiveRateBusy(true);

        try {
            const payload = await requestJson("GET", `${route("courierService.settings.pricing.exchange-rates")}?base=${encodeURIComponent(baseCurrency)}${targets.length > 0 ? `&${targets.map((target) => `targets[]=${encodeURIComponent(target)}`).join("&")}` : ""}`);
            const rates = payload?.rates && typeof payload.rates === "object" ? payload.rates : {};

            setSettings((prev) => ({
                ...prev,
                pricing: {
                    ...(prev.pricing || DEFAULT_SETTINGS.pricing),
                    localization: {
                        ...((prev.pricing && prev.pricing.localization) || DEFAULT_SETTINGS.pricing.localization),
                        [activePricingCategory]: {
                            ...((prev.pricing && prev.pricing.localization && prev.pricing.localization[activePricingCategory]) || DEFAULT_SETTINGS.pricing.localization[activePricingCategory]),
                            manualRates: {
                                ...((prev.pricing
                                    && prev.pricing.localization
                                    && prev.pricing.localization[activePricingCategory]
                                    && prev.pricing.localization[activePricingCategory].manualRates) || {}),
                                ...rates,
                                [baseCurrency]: 1,
                            },
                            lastSyncedAt: payload?.date || new Date().toISOString(),
                            exchangeRateProvider: payload?.provider || "frankfurter.app",
                        },
                    },
                },
            }));

            setFeedback({ type: "success", message: "Live exchange rates synced successfully." });
        } catch (error) {
            setFeedback({ type: "error", message: error?.message || "Unable to fetch live exchange rates right now." });
        } finally {
            setLiveRateBusy(false);
        }
    };

    const isStepUpRequiredError = (error) => {
        const code = String(error?.code || "").toLowerCase();
        const message = String(error?.message || "").toLowerCase();

        return code === "step_up_required" || message.includes("step-up authentication is required");
    };

    const resolveInertiaErrorMessage = (errors, fallbackMessage) => {
        if (!errors || typeof errors !== "object") {
            return fallbackMessage;
        }

        if (typeof errors.message === "string" && errors.message.trim()) {
            return errors.message.trim();
        }

        const firstMessage = Object.values(errors)
            .flatMap((value) => {
                if (Array.isArray(value)) {
                    return value;
                }

                return [value];
            })
            .find((value) => typeof value === "string" && value.trim());

        return firstMessage || fallbackMessage;
    };

    const openStepUpGuidance = (message, options = {}) => {
        const { preserveFeedback = false } = options;

        if (typeof window !== "undefined") {
            window.sessionStorage.setItem("courier.profileStepUpGuidancePending", "1");
        }

        router.get(route("courierService.profile.module", { module: "security" }), {}, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });

        if (!preserveFeedback) {
            setFeedback({
                type: "error",
                message: message || "Step-up authentication is required before this action. Complete verification in Profile Security, then try again.",
            });
        }
    };

    const handleActionError = (error, fallbackMessage) => {
        if (isStepUpRequiredError(error)) {
            openStepUpGuidance(error?.message);
            return;
        }

        setFeedback({ type: "error", message: error?.message || fallbackMessage });
    };

    const handleInertiaActionError = (errors, fallbackMessage) => {
        const message = resolveInertiaErrorMessage(errors, fallbackMessage);

        if (isStepUpRequiredError({ message })) {
            openStepUpGuidance(message);
            return;
        }

        setFeedback({ type: "error", message });
    };

    useEffect(() => {
        const feedbackMessage = String(feedback?.message || "");
        if (!feedback || feedback.type !== "error") {
            return;
        }

        if (!isStepUpRequiredError({ message: feedbackMessage })) {
            return;
        }

        openStepUpGuidance(feedbackMessage, { preserveFeedback: true });
    }, [feedback?.type, feedback?.message]);

    const refreshRoleStudioRoles = async () => {
        try {
            const payload = await requestJson("GET", route("courierService.team.roles.index"));
            const roles = Array.isArray(payload.roles) ? payload.roles : [];
            setRoleStudioRoles(roles);

            if (roles.length > 0 && !roles.some((role) => role.name === selectedRoleName)) {
                setSelectedRoleName(roles[0].name);
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to refresh role catalog." });
        }
    };

    const loadRoleVersions = async (roleName) => {
        if (!roleName) {
            setRoleVersionTimeline([]);
            return;
        }

        setLoadingRoleVersions(true);

        try {
            const payload = await requestJson("GET", route("courierService.team.roles.versions", { roleName }));
            setRoleVersionTimeline(Array.isArray(payload.versions) ? payload.versions : []);
        } catch {
            setRoleVersionTimeline([]);
            setFeedback({ type: "error", message: "Failed to load role version timeline." });
        } finally {
            setLoadingRoleVersions(false);
        }
    };

    const groupedTeamPermissions = useMemo(() => {
        return teamPermissionOptions.reduce((acc, perm) => {
            const group = String(perm || "").split(".")[1] || "other";

            if (!acc[group]) {
                acc[group] = [];
            }

            acc[group].push(perm);
            return acc;
        }, {});
    }, [teamPermissionOptions]);

    const activeRoleDefaultPermissions = useMemo(() => {
        const byRole = settings.team?.teamAccessControl?.defaultDirectPermissionsByRole;

        if (!byRole || typeof byRole !== "object") {
            return [];
        }

        const selected = byRole[activeRoleForDefaults];
        return Array.isArray(selected) ? selected : [];
    }, [activeRoleForDefaults, settings.team]);

    const activeRoleDefaultDataScope = useMemo(() => {
        const byRole = settings.team?.teamAccessControl?.defaultDataScopeByRole;

        if (!byRole || typeof byRole !== "object") {
            return {
                scope: "own_records",
                regionZones: [],
                hubBranches: [],
            };
        }

        const selected = byRole[activeRoleForDefaults];

        return {
            scope: permissionScopes.includes(selected?.scope) ? selected.scope : "own_records",
            regionZones: Array.isArray(selected?.regionZones) ? selected.regionZones : [],
            hubBranches: Array.isArray(selected?.hubBranches) ? selected.hubBranches : [],
        };
    }, [activeRoleForDefaults, settings.team, permissionScopes]);

    const permissionModelRoleOptions = useMemo(() => {
        const fromRoles = Array.isArray(teamRoleOptions) ? teamRoleOptions : [];
        const fromPolicies = Object.keys(settings.team?.permissionModel?.rolePolicies || {});
        return [...new Set([...fromRoles, ...fromPolicies])].filter(Boolean);
    }, [teamRoleOptions, settings.team]);

    const activePermissionRolePolicy = useMemo(() => {
        const policies = settings.team?.permissionModel?.rolePolicies || {};
        const fallbackResources = permissionResources.reduce((acc, resource) => {
            acc[resource] = permissionActions.reduce((actionAcc, action) => {
                actionAcc[action] = false;
                return actionAcc;
            }, {});
            return acc;
        }, {});

        const selected = policies[activeRoleForPermissionModel] || {};
        const selectedResources = selected.resources && typeof selected.resources === "object" ? selected.resources : {};

        return {
            scope: permissionScopes.includes(selected.scope) ? selected.scope : "own_records",
            resources: permissionResources.reduce((acc, resource) => {
                const incoming = selectedResources[resource] && typeof selectedResources[resource] === "object"
                    ? selectedResources[resource]
                    : {};
                acc[resource] = permissionActions.reduce((actionsAcc, action) => {
                    actionsAcc[action] = Boolean(incoming[action] ?? fallbackResources[resource][action]);
                    return actionsAcc;
                }, {});
                return acc;
            }, {}),
            constraints: {
                ...DEFAULT_ROLE_SCOPE_CONSTRAINTS,
                ...(selected.constraints && typeof selected.constraints === "object" ? selected.constraints : {}),
                regionZones: Array.isArray(selected.constraints?.regionZones) ? selected.constraints.regionZones : [],
                hubBranches: Array.isArray(selected.constraints?.hubBranches) ? selected.constraints.hubBranches : [],
                allowedCustomerIds: Array.isArray(selected.constraints?.allowedCustomerIds)
                    ? selected.constraints.allowedCustomerIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
                    : [],
                allowedEnvironments: Array.isArray(selected.constraints?.allowedEnvironments)
                    ? selected.constraints.allowedEnvironments
                    : permissionEnvironments,
                blockedActionsByEnvironment: {
                    production: Array.isArray(selected.constraints?.blockedActionsByEnvironment?.production)
                        ? selected.constraints.blockedActionsByEnvironment.production
                        : [],
                    sandbox: Array.isArray(selected.constraints?.blockedActionsByEnvironment?.sandbox)
                        ? selected.constraints.blockedActionsByEnvironment.sandbox
                        : [],
                },
                policyRules: Array.isArray(selected.constraints?.policyRules)
                    ? selected.constraints.policyRules.map((rule, index) => {
                        const conditions = rule && typeof rule.conditions === "object" ? rule.conditions : {};
                        return {
                            id: String(rule?.id || `rule_${index + 1}`),
                            label: String(rule?.label || ""),
                            effect: permissionRuleEffects.includes(rule?.effect) ? rule.effect : "allow",
                            resource: permissionResources.includes(rule?.resource) || rule?.resource === "*" ? rule.resource : "*",
                            action: permissionActions.includes(rule?.action) || rule?.action === "*" ? rule.action : "*",
                            conditions: {
                                shipmentStages: Array.isArray(conditions.shipmentStages)
                                    ? conditions.shipmentStages.filter((value) => permissionRuleShipmentStages.includes(value))
                                    : [],
                                minAmount: Number.isFinite(Number(conditions.minAmount)) ? Number(conditions.minAmount) : "",
                                maxAmount: Number.isFinite(Number(conditions.maxAmount)) ? Number(conditions.maxAmount) : "",
                                clientTiers: Array.isArray(conditions.clientTiers)
                                    ? conditions.clientTiers.filter((value) => permissionRuleClientTiers.includes(value))
                                    : [],
                                slaClasses: Array.isArray(conditions.slaClasses)
                                    ? conditions.slaClasses.filter((value) => permissionRuleSlaClasses.includes(value))
                                    : [],
                            },
                        };
                    })
                    : [],
            },
        };
    }, [
        settings.team,
        activeRoleForPermissionModel,
        permissionResources,
        permissionActions,
        permissionScopes,
        permissionEnvironments,
        permissionRuleEffects,
        permissionRuleShipmentStages,
        permissionRuleClientTiers,
        permissionRuleSlaClasses,
    ]);

    const selectedRole = useMemo(
        () => roleStudioRoles.find((role) => role.name === selectedRoleName) || null,
        [roleStudioRoles, selectedRoleName],
    );

    const filteredRoleStudioRoles = useMemo(() => {
        return roleStudioRoles.filter((role) => {
            const matchesSearch = `${role.name || ""} ${role.label || ""}`
                .toLowerCase()
                .includes(roleCatalogSearch.toLowerCase());
            const matchesType = roleTypeFilter === "all" || String(role.sourceType || "custom") === roleTypeFilter;
            return matchesSearch && matchesType;
        });
    }, [roleStudioRoles, roleCatalogSearch, roleTypeFilter]);

    const selectedLeftVersion = useMemo(
        () => roleVersionTimeline.find((version) => String(version.version) === String(leftVersionNumber)) || null,
        [roleVersionTimeline, leftVersionNumber],
    );

    const selectedRightVersion = useMemo(
        () => roleVersionTimeline.find((version) => String(version.version) === String(rightVersionNumber)) || null,
        [roleVersionTimeline, rightVersionNumber],
    );

    const roleVersionDiff = useMemo(() => {
        if (!selectedLeftVersion || !selectedRightVersion) {
            return { added: [], removed: [] };
        }

        const left = new Set(Array.isArray(selectedLeftVersion.permissions) ? selectedLeftVersion.permissions : []);
        const right = new Set(Array.isArray(selectedRightVersion.permissions) ? selectedRightVersion.permissions : []);

        const added = [...right].filter((permission) => !left.has(permission)).sort();
        const removed = [...left].filter((permission) => !right.has(permission)).sort();

        return { added, removed };
    }, [selectedLeftVersion, selectedRightVersion]);

    const groupedRoleStudioPermissions = useMemo(() => {
        return teamPermissionOptions.reduce((acc, perm) => {
            const group = String(perm || "").split(".")[1] || "other";
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push(perm);
            return acc;
        }, {});
    }, [teamPermissionOptions]);

    const filteredTeamAccessAudit = useMemo(() => {
        return teamAccessAudit.filter((event) => {
            const isDenied = ["courier_permission_denied", "access_denied"].includes(String(event.action || ""));
            const isAlert = Boolean(event.isAlert) || String(event.eventFamily || "") === "alert";
            const type = isAlert ? "alert" : (isDenied ? "denied" : "updated");
            const meta = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
            const resource = String(meta.resource || meta.target_type || "").trim();

            if (auditTypeFilter !== "all" && auditTypeFilter !== type) {
                return false;
            }

            if (auditResourceFilter !== "all" && auditResourceFilter !== resource) {
                return false;
            }

            const needle = auditSearch.trim().toLowerCase();
            if (!needle) {
                return true;
            }

            const haystack = [
                String(event.action || ""),
                String(event.alertCode || ""),
                String(event.description || ""),
                String(meta.resource || ""),
                String(meta.requested_action || ""),
                String(meta.scope || ""),
                String(meta.reason || ""),
                String(meta.mode || ""),
                JSON.stringify(meta.snapshot_diff || []),
                String(event.createdAt || ""),
            ].join(" ").toLowerCase();

            return haystack.includes(needle);
        });
    }, [teamAccessAudit, auditTypeFilter, auditResourceFilter, auditSearch]);

    const auditResourceOptions = useMemo(() => {
        return [...new Set(teamAccessAudit
            .map((event) => {
                if (!(event.metadata && typeof event.metadata === "object")) {
                    return "";
                }

                return String(event.metadata.resource || event.metadata.target_type || "").trim();
            })
            .filter(Boolean))]
            .sort();
    }, [teamAccessAudit]);

    const auditPerPage = 10;

    const auditPagination = useMemo(() => {
        const total = filteredTeamAccessAudit.length;
        const totalPages = Math.max(1, Math.ceil(total / auditPerPage));
        const currentPage = Math.min(Math.max(auditPage, 1), totalPages);
        const start = (currentPage - 1) * auditPerPage;
        const rows = filteredTeamAccessAudit.slice(start, start + auditPerPage);

        return {
            total,
            totalPages,
            currentPage,
            rows,
        };
    }, [filteredTeamAccessAudit, auditPage]);

    const apiServiceAccountOptions = useMemo(() => {
        return [...new Set((apiCredentialQueue || [])
            .map((credential) => String(credential?.serviceAccountCode || "").trim())
            .filter(Boolean))]
            .sort((left, right) => left.localeCompare(right));
    }, [apiCredentialQueue]);

    const filteredApiCredentials = useMemo(() => {
        const needle = String(apiCredentialSearch || "").trim().toLowerCase();

        return (apiCredentialQueue || []).filter((credential) => {
            const status = String(credential?.status || "").trim().toLowerCase();
            const serviceAccountCode = String(credential?.serviceAccountCode || "").trim();

            if (apiCredentialStatusFilter !== "all" && status !== apiCredentialStatusFilter) {
                return false;
            }

            if (apiCredentialServiceFilter !== "all" && serviceAccountCode !== apiCredentialServiceFilter) {
                return false;
            }

            if (!needle) {
                return true;
            }

            const haystack = [
                String(credential?.credentialName || ""),
                serviceAccountCode,
                String(credential?.roleName || ""),
                String(credential?.keyPrefix || ""),
                String(credential?.status || ""),
                Array.isArray(credential?.permissionScopes) ? credential.permissionScopes.join(" ") : "",
                Array.isArray(credential?.webhookScopes) ? credential.webhookScopes.join(" ") : "",
            ].join(" ").toLowerCase();

            return haystack.includes(needle);
        });
    }, [apiCredentialQueue, apiCredentialStatusFilter, apiCredentialServiceFilter, apiCredentialSearch]);

    const apiCredentialPagination = useMemo(() => {
        const perPage = 8;
        const total = filteredApiCredentials.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const currentPage = Math.min(Math.max(apiCredentialPage, 1), totalPages);
        const start = (currentPage - 1) * perPage;

        return {
            total,
            totalPages,
            currentPage,
            rows: filteredApiCredentials.slice(start, start + perPage),
        };
    }, [filteredApiCredentials, apiCredentialPage]);

    const apiServiceAccountAnalytics = useMemo(() => {
        const now = Date.now();
        const groups = new Map();

        (apiCredentialQueue || []).forEach((credential) => {
            const serviceAccountCode = String(credential?.serviceAccountCode || "").trim() || "unassigned";
            const status = String(credential?.status || "").trim().toLowerCase();
            const expiresAt = credential?.expiresAt ? new Date(credential.expiresAt) : null;
            const lastUsedAt = credential?.lastUsedAt ? new Date(credential.lastUsedAt) : null;
            const isExpiringSoon = Boolean(
                expiresAt
                && !Number.isNaN(expiresAt.getTime())
                && expiresAt.getTime() >= now
                && expiresAt.getTime() <= now + (7 * 24 * 60 * 60 * 1000)
                && status === "active",
            );

            if (!groups.has(serviceAccountCode)) {
                groups.set(serviceAccountCode, {
                    serviceAccountCode,
                    total: 0,
                    active: 0,
                    revoked: 0,
                    expiringSoon: 0,
                    permissionScopeCount: 0,
                    webhookScopeCount: 0,
                    lastUsedAt: null,
                    usageScore: 0,
                });
            }

            const current = groups.get(serviceAccountCode);
            current.total += 1;
            if (status === "active") {
                current.active += 1;
            }
            if (status === "revoked") {
                current.revoked += 1;
            }
            if (isExpiringSoon) {
                current.expiringSoon += 1;
            }

            current.permissionScopeCount += Array.isArray(credential?.permissionScopes) ? credential.permissionScopes.length : 0;
            current.webhookScopeCount += Array.isArray(credential?.webhookScopes) ? credential.webhookScopes.length : 0;

            if (lastUsedAt && !Number.isNaN(lastUsedAt.getTime())) {
                if (!current.lastUsedAt || lastUsedAt.getTime() > current.lastUsedAt.getTime()) {
                    current.lastUsedAt = lastUsedAt;
                }
            }
        });

        const rows = [...groups.values()].map((group) => {
            let recencyBoost = 0;
            if (group.lastUsedAt) {
                const days = Math.floor((now - group.lastUsedAt.getTime()) / (24 * 60 * 60 * 1000));
                if (days <= 7) {
                    recencyBoost = 40;
                } else if (days <= 30) {
                    recencyBoost = 20;
                }
            }

            const scopeDensityBoost = Math.min(20, group.permissionScopeCount + group.webhookScopeCount);
            const activeBoost = Math.min(40, group.active * 20);
            const totalScore = Math.max(5, Math.min(100, recencyBoost + scopeDensityBoost + activeBoost));

            return {
                ...group,
                usageScore: totalScore,
                lastUsedLabel: group.lastUsedAt ? group.lastUsedAt.toLocaleString() : "Never",
            };
        });

        return rows.sort((left, right) => right.usageScore - left.usageScore);
    }, [apiCredentialQueue]);

    const apiAccessTrendRows = useMemo(() => {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - (Math.max(1, apiTrendWindowDays) - 1));

        const rows = [];
        const indexByDay = new Map();
        const cursor = new Date(start);
        while (cursor <= today) {
            const dayKey = toDayKey(cursor);
            const row = {
                dayKey,
                label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                created: 0,
                rotated: 0,
                revoked: 0,
                used: 0,
            };
            indexByDay.set(dayKey, row);
            rows.push(row);
            cursor.setDate(cursor.getDate() + 1);
        }

        (teamAccessAudit || []).forEach((event) => {
            const eventType = String(event?.action || "").trim();
            if (!["api_key_created", "api_key_rotated", "api_key_revoked"].includes(eventType)) {
                return;
            }

            const at = tryParseDate(event?.createdAt);
            if (!at) {
                return;
            }

            const day = toDayKey(at);
            const row = indexByDay.get(day);
            if (!row) {
                return;
            }

            if (eventType === "api_key_created") {
                row.created += 1;
            }
            if (eventType === "api_key_rotated") {
                row.rotated += 1;
            }
            if (eventType === "api_key_revoked") {
                row.revoked += 1;
            }
        });

        (apiCredentialQueue || []).forEach((credential) => {
            const lastUsed = tryParseDate(credential?.lastUsedAt);
            if (!lastUsed) {
                return;
            }

            const day = toDayKey(lastUsed);
            const row = indexByDay.get(day);
            if (!row) {
                return;
            }

            row.used += 1;
        });

        return rows;
    }, [apiTrendWindowDays, teamAccessAudit, apiCredentialQueue]);

    const apiAccessTrendScale = useMemo(() => {
        return Math.max(
            1,
            ...apiAccessTrendRows.map((row) => Math.max(row.created + row.rotated + row.revoked, row.used)),
        );
    }, [apiAccessTrendRows]);

    const exportAuditCsv = () => {
        if (filteredTeamAccessAudit.length === 0) {
            return;
        }

        const escapeCsv = (value) => {
            const text = String(value ?? "");
            return `"${text.replaceAll("\"", "\"\"")}"`;
        };

        const lines = [
            [
                "Timestamp",
                "Event Type",
                "Description",
                "Alert Code",
                "Resource",
                "Requested Action",
                "Scope",
                "Reason",
                "Mode",
                "Changed Fields",
            ].join(","),
            ...filteredTeamAccessAudit.map((event) => {
                const isDenied = ["courier_permission_denied", "access_denied"].includes(String(event.action || ""));
                const isAlert = Boolean(event.isAlert) || String(event.eventFamily || "") === "alert";
                const meta = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
                const changedFields = Array.isArray(meta.snapshot_diff)
                    ? meta.snapshot_diff.map((change) => change?.field).filter(Boolean).join(" | ")
                    : "";

                return [
                    escapeCsv(event.createdAt || ""),
                    escapeCsv(isAlert ? "Alert" : (isDenied ? "Denied" : "Policy Updated")),
                    escapeCsv(event.description || ""),
                    escapeCsv(event.alertCode || ""),
                    escapeCsv(meta.resource || meta.target_type || ""),
                    escapeCsv(meta.requested_action || ""),
                    escapeCsv(meta.scope || ""),
                    escapeCsv(meta.reason || ""),
                    escapeCsv(meta.mode || ""),
                    escapeCsv(changedFields),
                ].join(",");
            }),
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.setAttribute("download", `team-access-audit-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(href);
    };

    useEffect(() => {
        setAuditPage(1);
    }, [auditTypeFilter, auditResourceFilter, auditSearch]);

    useEffect(() => {
        setApprovalQueue(teamSensitiveApprovals);
    }, [teamSensitiveApprovals]);

    useEffect(() => {
        setTemporaryAccessQueue(teamTemporaryAccessGrants);
    }, [teamTemporaryAccessGrants]);

    useEffect(() => {
        setApiCredentialQueue(teamApiCredentials);
    }, [teamApiCredentials]);

    useEffect(() => {
        setApiCredentialPage(1);
    }, [apiCredentialStatusFilter, apiCredentialServiceFilter, apiCredentialSearch]);

    useEffect(() => {
        setApiCredentialForm((prev) => ({
            ...prev,
            roleName: prev.roleName || teamRoleOptions[0] || "courier_dispatcher",
        }));
    }, [teamRoleOptions]);

    useEffect(() => {
        setAccessReviewQueue(teamAccessReviewQueue);
    }, [teamAccessReviewQueue]);

    useEffect(() => {
        if (teamRoleOptions.length > 0 && !teamRoleOptions.includes(activeRoleForDefaults)) {
            setActiveRoleForDefaults(teamRoleOptions[0]);
        }
    }, [teamRoleOptions, activeRoleForDefaults]);

    useEffect(() => {
        if (permissionModelRoleOptions.length > 0 && !permissionModelRoleOptions.includes(activeRoleForPermissionModel)) {
            setActiveRoleForPermissionModel(permissionModelRoleOptions[0]);
        }
    }, [permissionModelRoleOptions, activeRoleForPermissionModel]);

    useEffect(() => {
        if (filteredRoleStudioRoles.length > 0 && !filteredRoleStudioRoles.some((role) => role.name === selectedRoleName)) {
            setSelectedRoleName(filteredRoleStudioRoles[0].name);
        }
    }, [filteredRoleStudioRoles, selectedRoleName]);

    useEffect(() => {
        if (!selectedRole) {
            return;
        }

        setRoleForm((prev) => ({
            ...prev,
            label: selectedRole.label || "",
            description: selectedRole.description || "",
            permissions: Array.isArray(selectedRole.permissions) ? selectedRole.permissions : [],
        }));

        setRoleCloneForm((prev) => ({
            ...prev,
            sourceRole: selectedRole.name,
            permissions: Array.isArray(selectedRole.permissions) ? selectedRole.permissions : [],
            label: prev.label || `${selectedRole.label || titleCase(selectedRole.name)} Clone`,
        }));
    }, [selectedRole]);

    useEffect(() => {
        const source = roleStudioRoles.find((role) => role.name === roleCloneForm.sourceRole);
        if (!source) {
            return;
        }

        setRoleCloneForm((prev) => ({
            ...prev,
            permissions: Array.isArray(source.permissions) ? source.permissions : [],
            label: prev.label || `${source.label || titleCase(source.name)} Clone`,
        }));
    }, [roleCloneForm.sourceRole, roleStudioRoles]);

    useEffect(() => {
        loadRoleVersions(selectedRoleName);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRoleName]);

    useEffect(() => {
        if (roleVersionTimeline.length > 1) {
            setRightVersionNumber(String(roleVersionTimeline[0].version));
            setLeftVersionNumber(String(roleVersionTimeline[1].version));
            return;
        }

        if (roleVersionTimeline.length === 1) {
            setRightVersionNumber(String(roleVersionTimeline[0].version));
            setLeftVersionNumber(String(roleVersionTimeline[0].version));
            return;
        }

        setRightVersionNumber("");
        setLeftVersionNumber("");
    }, [roleVersionTimeline]);

    const validateRoleForm = () => {
        const nextErrors = {};

        if (!String(roleForm.name || "").trim()) {
            nextErrors.name = "Role name is required.";
        }

        if (!String(roleForm.label || "").trim()) {
            nextErrors.label = "Role label is required.";
        }

        if (!Array.isArray(roleForm.permissions) || roleForm.permissions.length === 0) {
            nextErrors.permissions = "Select at least one permission.";
        }

        const sodViolations = findSodViolationsForPermissions(roleForm.permissions || [], "role_edit");
        if (sodViolations.length > 0) {
            nextErrors.permissions = `SoD violation: ${sodViolations.join(" | ")}`;
        }

        setRoleFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const validateRoleTemplateForm = () => {
        const nextErrors = {};

        if (!String(roleTemplateForm.template || "").trim()) {
            nextErrors.template = "Template is required.";
        }

        if (!String(roleTemplateForm.name || "").trim()) {
            nextErrors.name = "New role name is required.";
        }

        const templateDefinition = roleStudioTemplates[String(roleTemplateForm.template || "")] || {};
        const effectiveTemplatePermissions = Array.isArray(roleTemplateForm.permissions) && roleTemplateForm.permissions.length > 0
            ? roleTemplateForm.permissions
            : (Array.isArray(templateDefinition.permissions) ? templateDefinition.permissions : []);
        const sodViolations = findSodViolationsForPermissions(effectiveTemplatePermissions, "role_edit");
        if (sodViolations.length > 0) {
            nextErrors.permissions = `SoD violation: ${sodViolations.join(" | ")}`;
        }

        setRoleTemplateFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const validateRoleCloneForm = () => {
        const nextErrors = {};

        if (!String(roleCloneForm.sourceRole || "").trim()) {
            nextErrors.sourceRole = "Source role is required.";
        }

        if (!String(roleCloneForm.name || "").trim()) {
            nextErrors.name = "Cloned role name is required.";
        }

        const cloneSource = roleStudioRoles.find((role) => role.name === roleCloneForm.sourceRole);
        const effectiveClonePermissions = Array.isArray(roleCloneForm.permissions) && roleCloneForm.permissions.length > 0
            ? roleCloneForm.permissions
            : (Array.isArray(cloneSource?.permissions) ? cloneSource.permissions : []);
        const sodViolations = findSodViolationsForPermissions(effectiveClonePermissions, "role_edit");
        if (sodViolations.length > 0) {
            nextErrors.permissions = `SoD violation: ${sodViolations.join(" | ")}`;
        }

        setRoleCloneFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const findSodViolationsForPermissions = (permissions, context = "role_edit") => {
        const sodControl = settings.team?.sodControl || {};
        if (!Boolean(sodControl.enabled)) {
            return [];
        }

        const permissionSet = new Set((Array.isArray(permissions) ? permissions : []).map((perm) => String(perm || "")).filter(Boolean));
        const toxicCombinations = Array.isArray(sodControl.toxicCombinations) ? sodControl.toxicCombinations : [];

        return toxicCombinations
            .filter((rule) => {
                if (!Boolean(rule?.enabled)) {
                    return false;
                }

                if (context === "role_edit" && !Boolean(rule?.enforceRoleEdit)) {
                    return false;
                }

                if (context === "user_assignment" && !Boolean(rule?.enforceUserAssignment)) {
                    return false;
                }

                return true;
            })
            .filter((rule) => {
                const pair = Array.isArray(rule?.permissions) ? rule.permissions : [];
                if (pair.length !== 2) {
                    return false;
                }

                return permissionSet.has(String(pair[0])) && permissionSet.has(String(pair[1]));
            })
            .map((rule) => String(rule?.label || "Toxic permission combination detected."));
    };

    const roleFormSodViolations = useMemo(
        () => findSodViolationsForPermissions(roleForm.permissions || [], "role_edit"),
        [roleForm.permissions, settings.team?.sodControl],
    );

    const roleTemplateSodViolations = useMemo(() => {
        const templateDefinition = roleStudioTemplates[String(roleTemplateForm.template || "")] || {};
        const effectiveTemplatePermissions = Array.isArray(roleTemplateForm.permissions) && roleTemplateForm.permissions.length > 0
            ? roleTemplateForm.permissions
            : (Array.isArray(templateDefinition.permissions) ? templateDefinition.permissions : []);
        return findSodViolationsForPermissions(effectiveTemplatePermissions, "role_edit");
    }, [roleTemplateForm.template, roleTemplateForm.permissions, roleStudioTemplates, settings.team?.sodControl]);

    const roleCloneSodViolations = useMemo(() => {
        const cloneSource = roleStudioRoles.find((role) => role.name === roleCloneForm.sourceRole);
        const effectiveClonePermissions = Array.isArray(roleCloneForm.permissions) && roleCloneForm.permissions.length > 0
            ? roleCloneForm.permissions
            : (Array.isArray(cloneSource?.permissions) ? cloneSource.permissions : []);
        return findSodViolationsForPermissions(effectiveClonePermissions, "role_edit");
    }, [roleCloneForm.sourceRole, roleCloneForm.permissions, roleStudioRoles, settings.team?.sodControl]);

    const toggleRoleDefaultPermission = (permission) => {
        const nextRoleDefaults = toggleInArray(activeRoleDefaultPermissions, permission);

        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                teamAccessControl: {
                    ...prev.team.teamAccessControl,
                    defaultDirectPermissionsByRole: {
                        ...(prev.team.teamAccessControl.defaultDirectPermissionsByRole || {}),
                        [activeRoleForDefaults]: nextRoleDefaults,
                    },
                },
            },
        }));
    };

    const updateApprovalControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                approvalControl: {
                    ...(prev.team.approvalControl || DEFAULT_SETTINGS.team.approvalControl),
                    [key]: value,
                },
            },
        }));
    };

    const updateApprovalActionControl = (actionKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                approvalControl: {
                    ...(prev.team.approvalControl || DEFAULT_SETTINGS.team.approvalControl),
                    sensitiveActions: {
                        ...((prev.team.approvalControl && prev.team.approvalControl.sensitiveActions) || DEFAULT_SETTINGS.team.approvalControl.sensitiveActions),
                        [actionKey]: {
                            ...(((prev.team.approvalControl && prev.team.approvalControl.sensitiveActions && prev.team.approvalControl.sensitiveActions[actionKey])
                                || DEFAULT_SETTINGS.team.approvalControl.sensitiveActions[actionKey]
                                || {})),
                            [key]: value,
                        },
                    },
                },
            },
        }));
    };

    const updateSodControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                sodControl: {
                    ...(prev.team.sodControl || DEFAULT_SETTINGS.team.sodControl),
                    [key]: value,
                },
            },
        }));
    };

    const updateSodCombination = (combinationKey, key, value) => {
        const base = Array.isArray(settings.team?.sodControl?.toxicCombinations)
            ? settings.team.sodControl.toxicCombinations
            : DEFAULT_SETTINGS.team.sodControl.toxicCombinations;

        const nextCombinations = base.map((rule) => {
            if (String(rule?.key || "") !== combinationKey) {
                return rule;
            }

            return {
                ...rule,
                [key]: value,
            };
        });

        updateSodControl("toxicCombinations", nextCombinations);
    };

    const updateTemporaryAccessControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                temporaryAccessControl: {
                    ...(prev.team.temporaryAccessControl || DEFAULT_SETTINGS.team.temporaryAccessControl),
                    [key]: value,
                },
            },
        }));
    };

    const updateBreakGlassControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                temporaryAccessControl: {
                    ...(prev.team.temporaryAccessControl || DEFAULT_SETTINGS.team.temporaryAccessControl),
                    breakGlass: {
                        ...((prev.team.temporaryAccessControl && prev.team.temporaryAccessControl.breakGlass) || DEFAULT_SETTINGS.team.temporaryAccessControl.breakGlass),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updateSessionSecurityControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                sessionSecurity: {
                    ...(prev.team.sessionSecurity || DEFAULT_SETTINGS.team.sessionSecurity),
                    [key]: value,
                },
            },
        }));
    };

    const updateAccessReviewControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                accessReviewControl: {
                    ...(prev.team.accessReviewControl || DEFAULT_SETTINGS.team.accessReviewControl),
                    [key]: value,
                },
            },
        }));
    };

    const updateApiServiceAccessControl = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                apiServiceAccessControl: {
                    ...(prev.team.apiServiceAccessControl || DEFAULT_SETTINGS.team.apiServiceAccessControl),
                    [key]: value,
                },
            },
        }));
    };

    const updateSessionSecurityNested = (groupKey, key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                sessionSecurity: {
                    ...(prev.team.sessionSecurity || DEFAULT_SETTINGS.team.sessionSecurity),
                    [groupKey]: {
                        ...((prev.team.sessionSecurity && prev.team.sessionSecurity[groupKey]) || DEFAULT_SETTINGS.team.sessionSecurity[groupKey]),
                        [key]: value,
                    },
                },
            },
        }));
    };

    const updateSessionRoleLimit = (roleName, limit) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                sessionSecurity: {
                    ...(prev.team.sessionSecurity || DEFAULT_SETTINGS.team.sessionSecurity),
                    concurrentSessions: {
                        ...((prev.team.sessionSecurity && prev.team.sessionSecurity.concurrentSessions) || DEFAULT_SETTINGS.team.sessionSecurity.concurrentSessions),
                        limitsByRole: {
                            ...(((prev.team.sessionSecurity && prev.team.sessionSecurity.concurrentSessions && prev.team.sessionSecurity.concurrentSessions.limitsByRole) || DEFAULT_SETTINGS.team.sessionSecurity.concurrentSessions.limitsByRole)),
                            [roleName]: Number(limit || 1),
                        },
                    },
                },
            },
        }));
    };

    const toggleSessionSecurityRole = (groupKey, roleName) => {
        const currentRoles = settings.team?.sessionSecurity?.[groupKey]?.roles;
        const roleList = Array.isArray(currentRoles) ? currentRoles : [];
        const nextRoles = roleList.includes(roleName)
            ? roleList.filter((role) => role !== roleName)
            : [...roleList, roleName];

        updateSessionSecurityNested(groupKey, "roles", nextRoles);
    };

    const updateSessionSecurityUserIds = (groupKey, key, rawValue) => {
        const ids = String(rawValue || "")
            .split(/[,\s]+/)
            .map((value) => Number.parseInt(value, 10))
            .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index);

        updateSessionSecurityNested(groupKey, key, ids);
    };

    const certifyAccessReview = async (reviewId, keepAccess) => {
        setTemporaryAccessActionBusyId(`access_review_${reviewId}_${keepAccess ? "keep" : "revoke"}`);

        try {
            const payload = await requestJson("POST", route("courierService.team.access-reviews.certify", { review: reviewId }), {
                keepAccess,
                notes: keepAccess
                    ? "Manager certified access still required."
                    : "Manager revoked access during periodic certification.",
            });
            setFeedback({ type: "success", message: payload?.message || "Access review processed." });
            router.reload({ only: ["teamAccessReviewQueue"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to process access review.");
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const createApiCredential = async () => {
        if (!String(apiCredentialForm.credentialName || "").trim()) {
            setFeedback({ type: "error", message: "Credential name is required." });
            return;
        }

        if (!Array.isArray(apiCredentialForm.permissionScopes) || apiCredentialForm.permissionScopes.length === 0) {
            setFeedback({ type: "error", message: "Select at least one API permission scope." });
            return;
        }

        setApiAccessActionBusyId("create");
        try {
            const payload = await requestJson("POST", route("courierService.team.api-access.store"), {
                credentialName: apiCredentialForm.credentialName,
                serviceAccountCode: apiCredentialForm.serviceAccountCode,
                roleName: apiCredentialForm.roleName,
                ttlDays: Number(apiCredentialForm.ttlDays || 30),
                permissionScopes: apiCredentialForm.permissionScopes,
                webhookScopes: apiCredentialForm.webhookScopes,
            });

            setLatestApiKeySecret(String(payload?.plainApiKey || ""));
            setFeedback({ type: "success", message: payload?.message || "API credential created." });
            router.reload({ only: ["teamApiCredentials"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to create API credential.");
        } finally {
            setApiAccessActionBusyId(null);
        }
    };

    const rotateApiCredential = async (credentialId) => {
        setApiAccessActionBusyId(`rotate_${credentialId}`);
        try {
            const payload = await requestJson("POST", route("courierService.team.api-access.rotate", { credential: credentialId }), {
                ttlDays: Number(apiCredentialForm.ttlDays || 30),
            });

            setLatestApiKeySecret(String(payload?.plainApiKey || ""));
            setFeedback({ type: "success", message: payload?.message || "API credential rotated." });
            router.reload({ only: ["teamApiCredentials"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to rotate API credential.");
        } finally {
            setApiAccessActionBusyId(null);
        }
    };

    const revokeApiCredential = async (credentialId) => {
        setApiAccessActionBusyId(`revoke_${credentialId}`);
        try {
            const payload = await requestJson("POST", route("courierService.team.api-access.revoke", { credential: credentialId }));
            setFeedback({ type: "success", message: payload?.message || "API credential revoked." });
            router.reload({ only: ["teamApiCredentials"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to revoke API credential.");
        } finally {
            setApiAccessActionBusyId(null);
        }
    };

    const copyLatestApiKeySecret = async () => {
        if (!latestApiKeySecret) {
            return;
        }

        try {
            await navigator.clipboard.writeText(latestApiKeySecret);
            setFeedback({ type: "success", message: "Latest API key copied to clipboard." });
        } catch (error) {
            setFeedback({ type: "error", message: "Clipboard write failed. Copy the key manually." });
        }
    };

    const downloadLatestApiKeySecret = () => {
        if (!latestApiKeySecret) {
            return;
        }

        const generatedAt = new Date().toISOString();
        const content = [
            "Courier Service API Key",
            `Generated At: ${generatedAt}`,
            `Key: ${latestApiKeySecret}`,
            "",
            "Store this key in your secret manager. This value is only shown once.",
        ].join("\n");

        const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.setAttribute("download", `courier-api-key-${generatedAt.slice(0, 19).replaceAll(":", "-")}.txt`);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(href);
    };

    const approveSensitiveAction = async (approvalId) => {
        setApprovalActionBusyId(approvalId);

        try {
            const payload = await requestJson("POST", route("courierService.team.sensitive-approvals.approve", { approval: approvalId }));
            setFeedback({ type: "success", message: payload?.message || "Approval recorded." });
            router.reload({ only: ["teamSensitiveApprovals"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to approve request.");
        } finally {
            setApprovalActionBusyId(null);
        }
    };

    const rejectSensitiveAction = async (approvalId) => {
        setApprovalActionBusyId(approvalId);

        try {
            const payload = await requestJson("POST", route("courierService.team.sensitive-approvals.reject", { approval: approvalId }), {
                reason: "Rejected by approver from Team Access Control queue.",
            });
            setFeedback({ type: "success", message: payload?.message || "Approval rejected." });
            router.reload({ only: ["teamSensitiveApprovals"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to reject request.");
        } finally {
            setApprovalActionBusyId(null);
        }
    };

    const requestTemporaryElevation = async () => {
        if (!String(temporaryAccessForm.ticketRef || "").trim() || !String(temporaryAccessForm.reason || "").trim()) {
            setFeedback({ type: "error", message: "Ticket reference and reason are required for temporary elevation." });
            return;
        }

        setTemporaryAccessActionBusyId("request");
        try {
            const payload = await requestJson("POST", route("courierService.team.temporary-access.request"), {
                targetUserId: temporaryAccessForm.targetUserId ? Number(temporaryAccessForm.targetUserId) : null,
                elevatedRoleName: temporaryAccessForm.elevatedRoleName,
                durationMinutes: Number(temporaryAccessForm.durationMinutes || 120),
                ticketRef: temporaryAccessForm.ticketRef,
                reason: temporaryAccessForm.reason,
            });
            setFeedback({ type: "success", message: payload?.message || "Temporary access request submitted." });
            router.reload({ only: ["teamTemporaryAccessGrants"], preserveScroll: true, preserveState: true });
        } catch (error) {
            setFeedback({ type: "error", message: error.message || "Failed to request temporary access." });
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const approveTemporaryElevation = async (grantId) => {
        setTemporaryAccessActionBusyId(`approve_${grantId}`);
        try {
            const payload = await requestJson("POST", route("courierService.team.temporary-access.approve", { grant: grantId }));
            setFeedback({ type: "success", message: payload?.message || "Temporary access approved." });
            router.reload({ only: ["teamTemporaryAccessGrants"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to approve temporary access.");
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const rejectTemporaryElevation = async (grantId) => {
        setTemporaryAccessActionBusyId(`reject_${grantId}`);
        try {
            const payload = await requestJson("POST", route("courierService.team.temporary-access.reject", { grant: grantId }), {
                reason: "Rejected by approver from temporary access queue.",
            });
            setFeedback({ type: "success", message: payload?.message || "Temporary access request rejected." });
            router.reload({ only: ["teamTemporaryAccessGrants"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to reject temporary access request.");
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const revokeTemporaryElevation = async (grantId) => {
        setTemporaryAccessActionBusyId(`revoke_${grantId}`);
        try {
            const payload = await requestJson("POST", route("courierService.team.temporary-access.revoke", { grant: grantId }), {
                reason: "Revoked by authorized manager.",
            });
            setFeedback({ type: "success", message: payload?.message || "Temporary access revoked." });
            router.reload({ only: ["teamTemporaryAccessGrants"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to revoke temporary access.");
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const activateBreakGlassAccess = async () => {
        if (!String(breakGlassForm.ticketRef || "").trim() || !String(breakGlassForm.reason || "").trim()) {
            setFeedback({ type: "error", message: "Break-glass requires ticket reference and reason." });
            return;
        }

        setTemporaryAccessActionBusyId("break_glass");
        try {
            const payload = await requestJson("POST", route("courierService.team.temporary-access.break-glass"), {
                targetUserId: breakGlassForm.targetUserId ? Number(breakGlassForm.targetUserId) : null,
                durationMinutes: Number(breakGlassForm.durationMinutes || 30),
                ticketRef: breakGlassForm.ticketRef,
                reason: breakGlassForm.reason,
            });
            setFeedback({ type: "success", message: payload?.message || "Break-glass access activated." });
            router.reload({ only: ["teamTemporaryAccessGrants"], preserveScroll: true, preserveState: true });
        } catch (error) {
            handleActionError(error, "Failed to activate break-glass access.");
        } finally {
            setTemporaryAccessActionBusyId(null);
        }
    };

    const updateRoleDefaultDataScope = (key, value) => {
        setSettings((prev) => {
            const currentScope = prev.team?.teamAccessControl?.defaultDataScopeByRole?.[activeRoleForDefaults] || {};

            return {
                ...prev,
                team: {
                    ...prev.team,
                    teamAccessControl: {
                        ...prev.team.teamAccessControl,
                        defaultDataScopeByRole: {
                            ...(prev.team.teamAccessControl.defaultDataScopeByRole || {}),
                            [activeRoleForDefaults]: {
                                scope: permissionScopes.includes(currentScope.scope) ? currentScope.scope : "own_records",
                                regionZones: Array.isArray(currentScope.regionZones) ? currentScope.regionZones : [],
                                hubBranches: Array.isArray(currentScope.hubBranches) ? currentScope.hubBranches : [],
                                [key]: value,
                            },
                        },
                    },
                },
            };
        });
    };

    const toggleRoleDefaultDataScopeArray = (key, value) => {
        const current = Array.isArray(activeRoleDefaultDataScope[key]) ? activeRoleDefaultDataScope[key] : [];
        updateRoleDefaultDataScope(key, toggleInArray(current, value));
    };

    const updatePermissionModelEnabled = (enabled) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                permissionModel: {
                    ...prev.team.permissionModel,
                    enabled,
                },
            },
        }));
    };

    const updatePermissionRoleScope = (roleName, scope) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                permissionModel: {
                    ...prev.team.permissionModel,
                    rolePolicies: {
                        ...(prev.team.permissionModel.rolePolicies || {}),
                        [roleName]: {
                            ...(prev.team.permissionModel.rolePolicies?.[roleName] || {}),
                            scope,
                            resources: {
                                ...(prev.team.permissionModel.rolePolicies?.[roleName]?.resources || activePermissionRolePolicy.resources),
                            },
                        },
                    },
                },
            },
        }));
    };

    const togglePermissionRoleAction = (roleName, resource, action) => {
        const currentValue = Boolean(activePermissionRolePolicy.resources?.[resource]?.[action]);
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                permissionModel: {
                    ...prev.team.permissionModel,
                    rolePolicies: {
                        ...(prev.team.permissionModel.rolePolicies || {}),
                        [roleName]: {
                            ...(prev.team.permissionModel.rolePolicies?.[roleName] || {}),
                            scope: prev.team.permissionModel.rolePolicies?.[roleName]?.scope || activePermissionRolePolicy.scope,
                            resources: {
                                ...(prev.team.permissionModel.rolePolicies?.[roleName]?.resources || activePermissionRolePolicy.resources),
                                [resource]: {
                                    ...(prev.team.permissionModel.rolePolicies?.[roleName]?.resources?.[resource] || activePermissionRolePolicy.resources?.[resource] || {}),
                                    [action]: !currentValue,
                                },
                            },
                            constraints: {
                                ...DEFAULT_ROLE_SCOPE_CONSTRAINTS,
                                ...(prev.team.permissionModel.rolePolicies?.[roleName]?.constraints || activePermissionRolePolicy.constraints),
                            },
                        },
                    },
                },
            },
        }));
    };

    const updatePermissionRoleConstraint = (roleName, key, value) => {
        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                permissionModel: {
                    ...prev.team.permissionModel,
                    rolePolicies: {
                        ...(prev.team.permissionModel.rolePolicies || {}),
                        [roleName]: {
                            ...(prev.team.permissionModel.rolePolicies?.[roleName] || {}),
                            scope: prev.team.permissionModel.rolePolicies?.[roleName]?.scope || activePermissionRolePolicy.scope,
                            resources: {
                                ...(prev.team.permissionModel.rolePolicies?.[roleName]?.resources || activePermissionRolePolicy.resources),
                            },
                            constraints: {
                                ...DEFAULT_ROLE_SCOPE_CONSTRAINTS,
                                ...(prev.team.permissionModel.rolePolicies?.[roleName]?.constraints || activePermissionRolePolicy.constraints),
                                [key]: value,
                            },
                        },
                    },
                },
            },
        }));
    };

    const togglePermissionRoleConstraintArrayValue = (roleName, key, itemValue) => {
        const current = Array.isArray(activePermissionRolePolicy.constraints?.[key])
            ? activePermissionRolePolicy.constraints[key]
            : [];
        updatePermissionRoleConstraint(roleName, key, toggleInArray(current, itemValue));
    };

    const togglePermissionRoleBlockedActionForEnvironment = (roleName, environment, action) => {
        const current = Array.isArray(activePermissionRolePolicy.constraints?.blockedActionsByEnvironment?.[environment])
            ? activePermissionRolePolicy.constraints.blockedActionsByEnvironment[environment]
            : [];

        updatePermissionRoleConstraint(roleName, "blockedActionsByEnvironment", {
            ...(activePermissionRolePolicy.constraints?.blockedActionsByEnvironment || {}),
            [environment]: toggleInArray(current, action),
        });
    };

    const addPermissionPolicyRule = (roleName) => {
        const nextRules = [
            ...(Array.isArray(activePermissionRolePolicy.constraints?.policyRules) ? activePermissionRolePolicy.constraints.policyRules : []),
            {
                id: `rule_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                label: "",
                effect: "allow",
                resource: "*",
                action: "*",
                conditions: {
                    shipmentStages: [],
                    minAmount: "",
                    maxAmount: "",
                    clientTiers: [],
                    slaClasses: [],
                },
            },
        ];

        updatePermissionRoleConstraint(roleName, "policyRules", nextRules);
    };

    const updatePermissionPolicyRule = (roleName, ruleId, updater) => {
        const currentRules = Array.isArray(activePermissionRolePolicy.constraints?.policyRules)
            ? activePermissionRolePolicy.constraints.policyRules
            : [];
        const nextRules = currentRules.map((rule) => (rule.id === ruleId ? updater(rule) : rule));
        updatePermissionRoleConstraint(roleName, "policyRules", nextRules);
    };

    const removePermissionPolicyRule = (roleName, ruleId) => {
        const currentRules = Array.isArray(activePermissionRolePolicy.constraints?.policyRules)
            ? activePermissionRolePolicy.constraints.policyRules
            : [];
        updatePermissionRoleConstraint(roleName, "policyRules", currentRules.filter((rule) => rule.id !== ruleId));
    };

    const toggleFieldVisibilityRole = (fieldKey, roleName) => {
        const currentRoles = settings.team?.permissionModel?.fieldVisibility?.[fieldKey]?.visibleToRoles || [];
        const nextRoles = toggleInArray(currentRoles, roleName);

        setSettings((prev) => ({
            ...prev,
            team: {
                ...prev.team,
                permissionModel: {
                    ...prev.team.permissionModel,
                    fieldVisibility: {
                        ...(prev.team.permissionModel.fieldVisibility || {}),
                        [fieldKey]: {
                            visibleToRoles: nextRoles,
                        },
                    },
                },
            },
        }));
    };

    const navigateTeamAccessTopic = (topicKey, options = {}) => {
        const { syncUrl = true, preserveState = activeTab === "team" } = options;

        if (!TEAM_ACCESS_TOPIC_CONFIG.some((topic) => topic.key === topicKey)) {
            return;
        }

        setActiveTeamAccessTopic(topicKey);

        if (!syncUrl) {
            return;
        }

        router.get(route("courierService.settings.team.topic", { topic: topicKey }), {}, {
            preserveScroll: true,
            preserveState,
            replace: true,
        });
    };

    const navigatePricingTopic = (topicKey, options = {}) => {
        const { syncUrl = true, category = activePricingCategory } = options;

        if (!PRICING_TOPIC_CONFIG.some((topic) => topic.key === topicKey)) {
            return;
        }

        const resolvedCategory = approvedPricingCategories.includes(category)
            ? category
            : defaultPricingCategory;

        setActivePricingTopic(topicKey);
        if (resolvedCategory) {
            setActivePricingCategory(resolvedCategory);
        }

        if (!syncUrl) {
            return;
        }

        router.get(route("courierService.settings.pricing.topic", {
            topic: topicKey,
            category: resolvedCategory,
        }), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const navigatePricingCategory = (categoryKey, options = {}) => {
        const { syncUrl = true } = options;

        if (!approvedPricingCategories.includes(categoryKey)) {
            return;
        }

        setActivePricingCategory(categoryKey);

        if (!syncUrl) {
            return;
        }

        const topicKey = PRICING_TOPIC_CONFIG.some((topic) => topic.key === activePricingTopic)
            ? activePricingTopic
            : "currency-formula";

        router.get(route("courierService.settings.pricing.topic", {
            topic: topicKey,
            category: categoryKey,
        }), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const createCustomRole = () => {
        if (!canAssignRole || !canAssignPermissions) {
            return;
        }

        if (!validateRoleForm()) {
            return;
        }

        openConfirm({
            title: "Create Custom Role",
            message: "Create this custom role and apply selected permissions?",
            onConfirm: async () => {
                setRoleStudioBusy(true);
                try {
                    const payload = await requestJson("POST", route("courierService.team.roles.store"), roleForm);
                    const createdName = payload?.role?.name;
                    await refreshRoleStudioRoles();
                    if (createdName) {
                        setSelectedRoleName(createdName);
                        await loadRoleVersions(createdName);
                    }
                    setFeedback({ type: "success", message: "Custom role created successfully." });
                } catch (error) {
                    setFeedback({ type: "error", message: error.message || "Failed to create custom role." });
                } finally {
                    setRoleStudioBusy(false);
                }
            },
        });
    };

    const createRoleFromTemplate = () => {
        if (!canAssignRole || !canAssignPermissions) {
            return;
        }

        if (!validateRoleTemplateForm()) {
            return;
        }

        openConfirm({
            title: "Create Role From Template",
            message: "Generate a new role from selected template settings?",
            onConfirm: async () => {
                setRoleStudioBusy(true);
                try {
                    const payload = await requestJson("POST", route("courierService.team.roles.store-template"), roleTemplateForm);
                    const createdName = payload?.role?.name;
                    await refreshRoleStudioRoles();
                    if (createdName) {
                        setSelectedRoleName(createdName);
                        await loadRoleVersions(createdName);
                    }
                    setFeedback({ type: "success", message: "Template-based role created successfully." });
                } catch (error) {
                    setFeedback({ type: "error", message: error.message || "Failed to create role from template." });
                } finally {
                    setRoleStudioBusy(false);
                }
            },
        });
    };

    const cloneExistingRole = () => {
        if (!canAssignRole || !canAssignPermissions || !roleCloneForm.sourceRole) {
            return;
        }

        if (!validateRoleCloneForm()) {
            return;
        }

        openConfirm({
            title: "Clone Role",
            message: `Clone ${titleCase(roleCloneForm.sourceRole)} with selected adjustments?`,
            onConfirm: async () => {
                setRoleStudioBusy(true);
                try {
                    const payload = await requestJson("POST", route("courierService.team.roles.clone", { roleName: roleCloneForm.sourceRole }), roleCloneForm);
                    const createdName = payload?.role?.name;
                    await refreshRoleStudioRoles();
                    if (createdName) {
                        setSelectedRoleName(createdName);
                        await loadRoleVersions(createdName);
                    }
                    setFeedback({ type: "success", message: "Role cloned successfully." });
                } catch (error) {
                    setFeedback({ type: "error", message: error.message || "Failed to clone role." });
                } finally {
                    setRoleStudioBusy(false);
                }
            },
        });
    };

    const saveRoleEdits = () => {
        if (!canAssignRole || !canAssignPermissions || !selectedRole?.name) {
            return;
        }

        const nextErrors = {};
        if (!String(roleForm.label || "").trim()) {
            nextErrors.label = "Role label is required.";
        }
        if (!Array.isArray(roleForm.permissions) || roleForm.permissions.length === 0) {
            nextErrors.permissions = "Select at least one permission.";
        }
        setRoleFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        openConfirm({
            title: "Update Role",
            message: `Apply permission and profile updates to ${titleCase(selectedRole.name)}?`,
            onConfirm: async () => {
                setRoleStudioBusy(true);
                try {
                    await requestJson("PATCH", route("courierService.team.roles.update", { roleName: selectedRole.name }), {
                        label: roleForm.label,
                        description: roleForm.description,
                        permissions: roleForm.permissions,
                    });

                    await refreshRoleStudioRoles();
                    await loadRoleVersions(selectedRole.name);
                    setFeedback({ type: "success", message: "Role updated successfully." });
                } catch (error) {
                    setFeedback({ type: "error", message: error.message || "Failed to update role." });
                } finally {
                    setRoleStudioBusy(false);
                }
            },
        });
    };

    const submitCodCapabilityRequest = () => {
        openConfirm({
            title: "Request COD Capability",
            message: "Submit this domestic COD enablement request for superadmin review?",
            confirmText: "Submit Request",
            onConfirm: async () => {
                setCodRequestBusy(true);
                try {
                    const payload = await requestJson("POST", route("courierService.settings.services.cod.request"), {
                        category: "domestic",
                        note: codRequestNote,
                    });
                    setFeedback({ type: "success", message: payload?.message || "COD capability request submitted." });
                    router.reload({
                        preserveScroll: true,
                        preserveState: true,
                    });
                } catch (error) {
                    setFeedback({ type: "error", message: error?.message || "Failed to submit COD capability request." });
                } finally {
                    setCodRequestBusy(false);
                }
            },
        });
    };

    const saveSection = (sectionKey) => {
        router.post(
            route("courierService.settings.update"),
            {
                action: "save_section",
                section: sectionKey,
                pricingCategory: activePricingCategory,
                settings: {
                    [sectionKey]: settings[sectionKey],
                },
            },
            {
                preserveScroll: true,
                preserveState: true,
                onError: (errors) => {
                    handleInertiaActionError(errors, "Failed to save section settings. Please review input and try again.");
                },
            },
        );
    };

    const saveAll = () => {
        openConfirm({
            title: "Confirm Save All Settings",
            message: "Apply all courier operational setting changes now?",
            onConfirm: () => {
                router.post(
                    route("courierService.settings.update"),
                    {
                        action: "save_all",
                        pricingCategory: activePricingCategory,
                        settings,
                    },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onError: (errors) => {
                            handleInertiaActionError(errors, "Failed to save all settings.");
                        },
                    },
                );
            },
        });
    };

    const resetAll = () => {
        openConfirm({
            title: "Reset Settings",
            message: "Reset all courier settings to defaults? This cannot be undone.",
            onConfirm: () => {
                setSettings(DEFAULT_SETTINGS);
                router.post(
                    route("courierService.settings.update"),
                    {
                        action: "reset_defaults",
                    },
                    {
                        preserveScroll: true,
                        preserveState: true,
                        onError: (errors) => {
                            handleInertiaActionError(errors, "Failed to reset settings.");
                        },
                    },
                );
            },
        });
    };

    const saveButtonLabel = TAB_CONFIG.find((tab) => tab.key === activeTab)?.label;
    const servicesSettings = settings?.services || DEFAULT_SETTINGS.services;
    const servicesCodSettings = (servicesSettings && typeof servicesSettings.cod === "object")
        ? servicesSettings.cod
        : DEFAULT_SETTINGS.services.cod;
    const codCapabilityCategoryLabel = COD_CAPABILITY_CATEGORY_LABEL;
    const codCapabilityRequestedNote = String(incomingCodCapability.requestedNote || "");
    const codCapabilityStatus = String(incomingCodCapability.status || "not_requested");
    const codCapabilityStatusLabel = String(incomingCodCapability.statusLabel || "Not Requested");
    const codCapabilityCanRequest = Boolean(incomingCodCapability.canRequest ?? true);
    const codCapabilityRequestedAt = String(incomingCodCapability.requestedAt || "");
    const codCapabilityReviewedAt = String(incomingCodCapability.reviewedAt || "");
    const codCapabilityReviewedBy = String(incomingCodCapability.reviewedByName || "");
    const codCapabilityDecisionReason = String(incomingCodCapability.decisionReason || "");

    useEffect(() => {
        setCodRequestNote(codCapabilityRequestedNote);
    }, [codCapabilityRequestedNote]);

    const codStatusTone = (() => {
        if (codCapabilityStatus === "approved") {
            return "bg-[#ECFDF3] border-[#86EFAC] text-[#166534]";
        }

        if (codCapabilityStatus === "pending") {
            return "bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]";
        }

        if (codCapabilityStatus === "rejected") {
            return "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]";
        }

        return "bg-[#F9FAFB] border-[#D1D5DB] text-[#374151]";
    })();
    const labelSettings = settings?.labels || DEFAULT_SETTINGS.labels;
    const labelDefaults = (labelSettings && typeof labelSettings.defaults === "object")
        ? labelSettings.defaults
        : DEFAULT_SETTINGS.labels.defaults;
    const labelPolicy = (labelSettings && typeof labelSettings.printPolicy === "object")
        ? labelSettings.printPolicy
        : DEFAULT_SETTINGS.labels.printPolicy;
    const activeLabelSizes = (Array.isArray(labelSizes) ? labelSizes : []).filter((size) => Boolean(size?.is_active ?? size?.isActive ?? true));
    const activeLabelTemplates = (Array.isArray(labelTemplates) ? labelTemplates : []).filter((template) => Boolean(template?.is_active ?? template?.isActive ?? true));
    const pricingLocalizationByCategory = settings?.pricing?.localization || DEFAULT_SETTINGS.pricing.localization;
    const pricingFormulaByCategory = settings?.pricing?.formula || DEFAULT_SETTINGS.pricing.formula;
    const pricingServiceCatalog = settings?.pricing?.serviceCatalog || DEFAULT_SETTINGS.pricing.serviceCatalog;
    const pricingZoneMasterByCategory = settings?.pricing?.zoneMaster || DEFAULT_SETTINGS.pricing.zoneMaster;
    const pricingLaneMatrix = settings?.pricing?.laneMatrix || DEFAULT_SETTINGS.pricing.laneMatrix;
    const pricingPolicyModulesByCategory = settings?.pricing?.policyModules || DEFAULT_SETTINGS.pricing.policyModules;
    const pricingGovernanceByCategory = settings?.pricing?.governance || DEFAULT_SETTINGS.pricing.governance;
    const normalizedCurrentUserRoles = currentUserRoleNames.map((role) => role.toLowerCase());
    const activePricingLocalization = (pricingLocalizationByCategory && typeof pricingLocalizationByCategory[activePricingCategory] === "object")
        ? pricingLocalizationByCategory[activePricingCategory]
        : DEFAULT_SETTINGS.pricing.localization[activePricingCategory];
    const activePricingGovernance = (pricingGovernanceByCategory && typeof pricingGovernanceByCategory[activePricingCategory] === "object")
        ? pricingGovernanceByCategory[activePricingCategory]
        : DEFAULT_SETTINGS.pricing.governance[activePricingCategory];
    const activePricingApprovalAuthority = String(activePricingGovernance.approvalAuthority || "vendor").toLowerCase() === "superadmin"
        ? "superadmin"
        : "vendor";
    const isSuperAdminPricingAuthority = activePricingApprovalAuthority === "superadmin";
    const activePricingVersionHistory = Array.isArray(activePricingGovernance.versionHistory)
        ? activePricingGovernance.versionHistory
        : [];
    const pendingApprovalRequestedByCurrentActor = Boolean(
        activePricingGovernance.pendingApproval
        && Number(activePricingGovernance.pendingApproval.requestedBy || 0) > 0
        && Number(activePricingGovernance.pendingApproval.requestedBy || 0) === Number(authUser.id || 0),
    );
    const rollbackCandidates = activePricingVersionHistory.filter((entry) => Number(entry?.version || 0) > 0);
    const normalizedApproverRoles = (Array.isArray(activePricingGovernance.approverRoles) ? activePricingGovernance.approverRoles : [])
        .map((role) => String(role || "").trim().toLowerCase())
        .filter(Boolean);
    const hasGovernanceApproverRole = normalizedApproverRoles.length > 0
        ? normalizedApproverRoles.some((role) => normalizedCurrentUserRoles.includes(role))
        : false;
    const governanceApproverRoleOptions = [...new Set([
        ...(Array.isArray(teamRoleOptions) ? teamRoleOptions : []),
        ...(Array.isArray(activePricingGovernance.approverRoles) ? activePricingGovernance.approverRoles : []),
    ])]
        .map((role) => String(role || "").trim())
        .filter(Boolean);
    const canConfigurePricingGovernance = canAssignPermissions && !isSuperAdminPricingAuthority;
    const canPublishPricingChanges = canAssignPermissions;
    const canReviewPricingPublish = !isSuperAdminPricingAuthority && canAssignPermissions && (hasGovernanceApproverRole || normalizedCurrentUserRoles.length === 0);
    const activeServiceCatalogRows = Array.isArray(pricingServiceCatalog?.[activePricingCategory])
        ? pricingServiceCatalog[activePricingCategory]
        : [];
    const activePricingFormula = (pricingFormulaByCategory && typeof pricingFormulaByCategory[activePricingCategory] === "object")
        ? pricingFormulaByCategory[activePricingCategory]
        : DEFAULT_SETTINGS.pricing.formula[activePricingCategory];
    const activePricingPolicyModules = (pricingPolicyModulesByCategory && typeof pricingPolicyModulesByCategory[activePricingCategory] === "object")
        ? pricingPolicyModulesByCategory[activePricingCategory]
        : DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory];
    const activeSpeedEtaTierEngine = (activePricingPolicyModules && typeof activePricingPolicyModules.speedEtaTierEngine === "object")
        ? activePricingPolicyModules.speedEtaTierEngine
        : DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].speedEtaTierEngine;
    const activeSpeedEtaTierRows = Object.entries(activeSpeedEtaTierEngine?.tiers || {})
        .map(([tierKey, tierRow]) => ({
            key: tierKey,
            row: tierRow && typeof tierRow === "object" ? tierRow : {},
        }))
        .sort((a, b) => {
            const aMin = Number(a.row?.etaMinDays ?? 0);
            const bMin = Number(b.row?.etaMinDays ?? 0);
            if (aMin !== bMin) {
                return aMin - bMin;
            }

            return String(a.key).localeCompare(String(b.key));
        });
    const activeInternationalDimensionsEngine = (activePricingPolicyModules && typeof activePricingPolicyModules.internationalDimensionsEngine === "object")
        ? activePricingPolicyModules.internationalDimensionsEngine
        : DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine;
    const activePricingZones = Array.isArray(pricingZoneMasterByCategory?.[activePricingCategory])
        ? pricingZoneMasterByCategory[activePricingCategory]
        : DEFAULT_SETTINGS.pricing.zoneMaster[activePricingCategory];
    const activeServiceLevelOptions = activeServiceCatalogRows
        .map((row) => ({
            key: String(row?.key || ""),
            label: String(row?.label || row?.key || "Service"),
            promisedSlaDays: Number(row?.promisedSlaDays || 1),
            cutoffTime: String(row?.cutoffTime || "18:00"),
            isActive: Boolean(row?.isActive),
        }))
        .filter((row) => row.key);
    const serviceLevelLabelMap = activeServiceLevelOptions.reduce((acc, item) => {
        acc[item.key] = item.label;
        return acc;
    }, {});
    const serviceLevelMetaMap = activeServiceLevelOptions.reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
    }, {});
    const activePricingRows = Array.isArray(settings?.pricing?.categories?.[activePricingCategory])
        ? settings.pricing.categories[activePricingCategory]
        : [];
    const activeLaneRows = Array.isArray(pricingLaneMatrix?.[activePricingCategory])
        ? pricingLaneMatrix[activePricingCategory]
        : [];
    const activeLaneEnabled = (() => {
        const enabled = pricingLaneMatrix?.enabled;
        if (enabled && typeof enabled === "object") {
            return Boolean(enabled[activePricingCategory]);
        }
        return Boolean(enabled);
    })();
    const activeZoneOptions = [
        { key: "*", label: "Any zone (*)" },
        ...activePricingZones
            .filter((row) => Boolean(row?.isActive))
            .map((row) => ({
                key: String(row?.key || ""),
                label: String(row?.label || row?.key || ""),
            }))
            .filter((row) => row.key),
    ];
    const pricingPreviewRows = activePricingRows.map((row) => {
        const actualWeight = Math.max(0.1, Number(pricingPreviewInput.weightKg || 0));
        const length = Math.max(1, Number(pricingPreviewInput.lengthCm || 0));
        const width = Math.max(1, Number(pricingPreviewInput.widthCm || 0));
        const height = Math.max(1, Number(pricingPreviewInput.heightCm || 0));
        const divisor = Math.max(1, Number(activePricingFormula.volumetricDivisor || 5000));
        const volumetricWeight = (length * width * height) / divisor;
        const chargeableWeight = activePricingFormula.useChargeableWeight
            ? Math.max(actualWeight, volumetricWeight)
            : actualWeight;

        const roundedChargeable = Number(chargeableWeight.toFixed(3));
        const basePrice = Math.max(0, Number(row?.basePrice || 0));
        const perKgPrice = Math.max(0, Number(row?.perKgPrice || 0));
        const minPrice = Math.max(0, Number(row?.minPrice || 0));
        const priorityMultiplier = Math.max(0.1, Number(row?.priorityMultiplier || 1));
        const computedBase = basePrice + (Math.max(roundedChargeable - 1, 0) * perKgPrice);
        const tierPrice = Math.max(minPrice, computedBase) * priorityMultiplier;
        const fuelFee = tierPrice * (Math.max(0, Number(activePricingFormula.fuelSurchargePercent || 0)) / 100);
        const handlingFee = Math.max(0, Number(activePricingFormula.handlingFee || 0));
        const subtotal = tierPrice + fuelFee + handlingFee;
        const taxFee = subtotal * (Math.max(0, Number(activePricingFormula.taxPercent || 0)) / 100);
        const totalBaseCurrency = subtotal + taxFee;
        const conversionRate = resolveExchangeRate(activePricingLocalization);
        const totalDisplayCurrency = totalBaseCurrency * conversionRate;
        const roundTo = Math.max(0, Math.min(4, Number(activePricingFormula.roundTo || 2)));

        return {
            id: String(row?.id || ""),
            label: String(row?.label || "Tier"),
            serviceLevelLabel: serviceLevelLabelMap[String(row?.serviceLevelKey || "")] || "Unmapped",
            cutoffTime: serviceLevelMetaMap[String(row?.serviceLevelKey || "")]?.cutoffTime || "-",
            slaDays: Number(row?.slaDays || 1),
            chargeableWeight: roundedChargeable,
            totalBaseCurrency: Number(totalBaseCurrency.toFixed(roundTo)),
            totalDisplayCurrency: Number(totalDisplayCurrency.toFixed(roundTo)),
        };
    });

    if (!settings || typeof settings !== "object") {
        return (
            <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
                <div className="bg-white rounded-[10px] p-6" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    <p className="text-[14px] text-[#6B7280]">Unable to load settings data.</p>
                </div>
            </div>
        );
    }

    const tabContent = (() => {
        if (activeTab === "business") {
            return (
                <SectionCard title="Business Profile" description="Main identity and service coverage used across booking and tracking experiences.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Company Name">
                            <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.business.companyName} onChange={(e) => updateValue("business", "companyName", e.target.value)} />
                        </Field>
                        <Field label="Support Email">
                            <input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.business.supportEmail} onChange={(e) => updateValue("business", "supportEmail", e.target.value)} />
                        </Field>
                        <Field label="Hotline">
                            <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.business.hotline} onChange={(e) => updateValue("business", "hotline", e.target.value)} />
                        </Field>
                        <Field label="Primary Hub">
                            <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.business.primaryHub} onChange={(e) => updateValue("business", "primaryHub", e.target.value)} />
                        </Field>
                        <div className="md:col-span-2">
                            <Field label="Service Zones" help="Comma-separated zone list for booking/assignment filtering.">
                                <textarea rows={3} className="w-full rounded-[8px] border border-[#D1D5DB]" value={settings.business.serviceZones} onChange={(e) => updateValue("business", "serviceZones", e.target.value)} />
                            </Field>
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeTab === "operations") {
            return (
                <SectionCard title="Operations" description="Daily operations guardrails for booking intake and dispatch capacity.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Toggle label="Auto-Accept Bookings" checked={settings.operations.autoAcceptBookings} onChange={(next) => updateValue("operations", "autoAcceptBookings", next)} description="If disabled, all bookings require manual review." />
                        <Field label="Max Daily Bookings">
                            <input type="number" min={1} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.operations.maxDailyBookings} onChange={(e) => updateValue("operations", "maxDailyBookings", Number(e.target.value || 0))} />
                        </Field>
                        <Field label="Workday Start">
                            <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.operations.workStart} onChange={(e) => updateValue("operations", "workStart", e.target.value)} />
                        </Field>
                        <Field label="Workday End">
                            <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.operations.workEnd} onChange={(e) => updateValue("operations", "workEnd", e.target.value)} />
                        </Field>
                        <Field label="Same Day Cutoff">
                            <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.operations.sameDayCutoff} onChange={(e) => updateValue("operations", "sameDayCutoff", e.target.value)} />
                        </Field>
                    </div>
                </SectionCard>
            );
        }

        if (activeTab === "sla") {
            return (
                <SectionCard title="SLA Policies" description="Configure expected commitments and breach alerts by service tier.">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Express SLA (hours)">
                            <input type="number" min={1} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.sla.expressHours} onChange={(e) => updateValue("sla", "expressHours", Number(e.target.value || 0))} />
                        </Field>
                        <Field label="Economy SLA (hours)">
                            <input type="number" min={1} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.sla.economyHours} onChange={(e) => updateValue("sla", "economyHours", Number(e.target.value || 0))} />
                        </Field>
                        <Field label="Breach Alert Lead (minutes)">
                            <input type="number" min={5} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.sla.breachAlertMinutes} onChange={(e) => updateValue("sla", "breachAlertMinutes", Number(e.target.value || 0))} />
                        </Field>
                        <div className="md:col-span-3">
                            <Toggle label="Auto Escalate Exceptions" checked={settings.sla.autoEscalateExceptions} onChange={(next) => updateValue("sla", "autoEscalateExceptions", next)} description="Automatically flag repeated exceptions to Ops lead queue." />
                        </div>
                    </div>
                </SectionCard>
            );
        }

        if (activeTab === "tracking") {
            return (
                <SectionCard title="Tracking and POD Rules" description="Define scan monitoring and proof-of-delivery requirements.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Toggle label="No Scan Alert > 6h" checked={settings.tracking.noScan6h} onChange={(next) => updateValue("tracking", "noScan6h", next)} />
                        <Toggle label="No Scan Alert > 12h" checked={settings.tracking.noScan12h} onChange={(next) => updateValue("tracking", "noScan12h", next)} />
                        <Toggle label="No Scan Alert > 24h" checked={settings.tracking.noScan24h} onChange={(next) => updateValue("tracking", "noScan24h", next)} />
                        <Toggle label="Require POD Photo" checked={settings.tracking.requirePodPhoto} onChange={(next) => updateValue("tracking", "requirePodPhoto", next)} />
                        <Toggle label="Require POD Signature" checked={settings.tracking.requirePodSignature} onChange={(next) => updateValue("tracking", "requirePodSignature", next)} />
                        <Toggle label="Allow Manual Scan Correction" checked={settings.tracking.allowManualScanCorrection} onChange={(next) => updateValue("tracking", "allowManualScanCorrection", next)} />
                    </div>
                </SectionCard>
            );
        }

        if (activeTab === "notifications") {
            const notificationSettings = settings.notifications && typeof settings.notifications === "object"
                ? settings.notifications
                : DEFAULT_NOTIFICATION_SETTINGS;
            const notificationChannels = notificationSettings.channels && typeof notificationSettings.channels === "object"
                ? notificationSettings.channels
                : DEFAULT_NOTIFICATION_SETTINGS.channels;
            const notificationClientRecipients = notificationSettings.clientRecipients && typeof notificationSettings.clientRecipients === "object"
                ? notificationSettings.clientRecipients
                : DEFAULT_NOTIFICATION_SETTINGS.clientRecipients;
            const notificationInternalRecipients = notificationSettings.internalRecipients && typeof notificationSettings.internalRecipients === "object"
                ? notificationSettings.internalRecipients
                : DEFAULT_NOTIFICATION_SETTINGS.internalRecipients;
            const notificationEventMatrix = notificationSettings.eventMatrix && typeof notificationSettings.eventMatrix === "object"
                ? notificationSettings.eventMatrix
                : DEFAULT_NOTIFICATION_SETTINGS.eventMatrix;
            const notificationDelivery = notificationSettings.delivery && typeof notificationSettings.delivery === "object"
                ? notificationSettings.delivery
                : DEFAULT_NOTIFICATION_SETTINGS.delivery;
            const notificationDeliverability = notificationSettings.deliverability && typeof notificationSettings.deliverability === "object"
                ? notificationSettings.deliverability
                : DEFAULT_NOTIFICATION_SETTINGS.deliverability;
            const metricTotals = notificationMetrics.totals && typeof notificationMetrics.totals === "object"
                ? notificationMetrics.totals
                : {};
            const lookbackDays = Number(notificationMetrics.lookbackDays || 30);

            return (
                <div className="space-y-4">
                    <SectionCard title="Notification Preferences v2" description="Advanced courier notifications with event/channel matrix, recipients, and deliverability controls.">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div className="rounded-[8px] border border-[#D1D5DB] p-3">
                                <p className="text-[11px] text-[#6B7280]">Email Sent ({lookbackDays}d)</p>
                                <p className="text-[18px] font-[700]">{Number(metricTotals.email_sent || 0)}</p>
                            </div>
                            <div className="rounded-[8px] border border-[#D1D5DB] p-3">
                                <p className="text-[11px] text-[#6B7280]">Email Failed</p>
                                <p className="text-[18px] font-[700]">{Number(metricTotals.email_failed || 0)}</p>
                            </div>
                            <div className="rounded-[8px] border border-[#D1D5DB] p-3">
                                <p className="text-[11px] text-[#6B7280]">Suppressed</p>
                                <p className="text-[18px] font-[700]">{Number(metricTotals.suppressed || 0)}</p>
                            </div>
                            <div className="rounded-[8px] border border-[#D1D5DB] p-3">
                                <p className="text-[11px] text-[#6B7280]">In-App Sent</p>
                                <p className="text-[18px] font-[700]">{Number(metricTotals.in_app_sent || 0)}</p>
                            </div>
                            <div className="rounded-[8px] border border-[#D1D5DB] p-3">
                                <p className="text-[11px] text-[#6B7280]">Rollout</p>
                                <p className="text-[14px] font-[700]">{notificationV2EnabledForVendor ? "v2 Active" : "Legacy Fallback"}</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Toggle
                                label="Channel: Email"
                                checked={Boolean(notificationChannels?.email?.enabled)}
                                onChange={(next) => updateNotificationChannelEnabled("email", next)}
                            />
                            <Toggle
                                label="Channel: In-App"
                                checked={Boolean(notificationChannels?.inApp?.enabled)}
                                onChange={(next) => updateNotificationChannelEnabled("inApp", next)}
                            />
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-[12px] text-[#6B7280]">Basic mode manages legacy email toggles. Advanced mode edits full event × channel matrix.</p>
                            <button
                                type="button"
                                onClick={() => setNotificationBasicView((prev) => !prev)}
                                className="h-[34px] px-4 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700]"
                            >
                                {notificationBasicView ? "Switch to Advanced Matrix" : "Switch to Basic Toggles"}
                            </button>
                        </div>

                        {notificationBasicView ? (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.keys(LEGACY_NOTIFICATION_MAP).map((legacyKey) => (
                                    <Toggle
                                        key={legacyKey}
                                        label={legacyKey.replace("notify", "").replace(/([A-Z])/g, " $1").trim()}
                                        checked={Boolean(notificationSettings[legacyKey])}
                                        onChange={(next) => updateNotificationLegacyToggle(legacyKey, next)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-[10px] border border-[#D1D5DB] overflow-hidden">
                                <div className="grid grid-cols-[1.7fr_repeat(4,minmax(0,1fr))] bg-[#F8FAFC] border-b border-[#E5E7EB]">
                                    <div className="px-3 py-2 text-[12px] font-[700]">Event</div>
                                    <div className="px-3 py-2 text-[12px] font-[700]">Client Email</div>
                                    <div className="px-3 py-2 text-[12px] font-[700]">Client In-App</div>
                                    <div className="px-3 py-2 text-[12px] font-[700]">Internal Email</div>
                                    <div className="px-3 py-2 text-[12px] font-[700]">Internal In-App</div>
                                </div>
                                {Object.entries(notificationEventMatrix).map(([eventKey, audienceMap]) => {
                                    const supportsClient = Boolean(audienceMap && typeof audienceMap === "object" && audienceMap.client && typeof audienceMap.client === "object");
                                    const supportsInternal = Boolean(audienceMap && typeof audienceMap === "object" && audienceMap.internal && typeof audienceMap.internal === "object");
                                    return (
                                        <div key={eventKey} className="grid grid-cols-[1.7fr_repeat(4,minmax(0,1fr))] border-b border-[#F1F5F9] last:border-b-0">
                                            <div className="px-3 py-2 text-[12px] font-[600]">{NOTIFICATION_EVENT_LABELS[eventKey] || eventKey}</div>
                                            <div className="px-3 py-2">
                                                {supportsClient ? <input type="checkbox" checked={Boolean(notificationEventMatrix?.[eventKey]?.client?.email)} onChange={(e) => updateNotificationEventMatrix(eventKey, "client", "email", e.target.checked)} /> : <span className="text-[12px] text-[#94A3B8]">-</span>}
                                            </div>
                                            <div className="px-3 py-2">
                                                {supportsClient ? <input type="checkbox" checked={Boolean(notificationEventMatrix?.[eventKey]?.client?.inApp)} onChange={(e) => updateNotificationEventMatrix(eventKey, "client", "inApp", e.target.checked)} /> : <span className="text-[12px] text-[#94A3B8]">-</span>}
                                            </div>
                                            <div className="px-3 py-2">
                                                {supportsInternal ? <input type="checkbox" checked={Boolean(notificationEventMatrix?.[eventKey]?.internal?.email)} onChange={(e) => updateNotificationEventMatrix(eventKey, "internal", "email", e.target.checked)} /> : <span className="text-[12px] text-[#94A3B8]">-</span>}
                                            </div>
                                            <div className="px-3 py-2">
                                                {supportsInternal ? <input type="checkbox" checked={Boolean(notificationEventMatrix?.[eventKey]?.internal?.inApp)} onChange={(e) => updateNotificationEventMatrix(eventKey, "internal", "inApp", e.target.checked)} /> : <span className="text-[12px] text-[#94A3B8]">-</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Recipients" description="Control who receives client and internal notifications.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <p className="text-[13px] font-[700]">Client Recipients</p>
                                <Toggle label="Requester" checked={Boolean(notificationClientRecipients.requester)} onChange={(next) => updateNotificationRecipients("clientRecipients", "requester", next)} />
                                <Toggle label="Sender" checked={Boolean(notificationClientRecipients.sender)} onChange={(next) => updateNotificationRecipients("clientRecipients", "sender", next)} />
                                <Toggle label="Recipient" checked={Boolean(notificationClientRecipients.recipient)} onChange={(next) => updateNotificationRecipients("clientRecipients", "recipient", next)} />
                                <Field label="Client Extra Emails (comma separated)">
                                    <textarea
                                        rows={2}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={Array.isArray(notificationClientRecipients.extraEmails) ? notificationClientRecipients.extraEmails.join(", ") : ""}
                                        onChange={(event) => updateNotificationRecipients("clientRecipients", "extraEmails", event.target.value.split(",").map((item) => String(item || "").trim()).filter(Boolean))}
                                    />
                                </Field>
                            </div>
                            <div className="space-y-3">
                                <p className="text-[13px] font-[700]">Internal Recipients</p>
                                <Field label="Role Names (comma separated)">
                                    <input
                                        className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                        value={Array.isArray(notificationInternalRecipients.roleNames) ? notificationInternalRecipients.roleNames.join(", ") : ""}
                                        onChange={(event) => updateNotificationRecipients("internalRecipients", "roleNames", event.target.value.split(",").map((item) => String(item || "").trim()).filter(Boolean))}
                                    />
                                </Field>
                                <Field label="Internal User IDs (comma separated)">
                                    <input
                                        className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                        value={Array.isArray(notificationInternalRecipients.userIds) ? notificationInternalRecipients.userIds.join(", ") : ""}
                                        onChange={(event) => updateNotificationRecipients("internalRecipients", "userIds", event.target.value.split(",").map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))}
                                    />
                                </Field>
                                <Field label="Internal Extra Emails (comma separated)">
                                    <textarea
                                        rows={2}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={Array.isArray(notificationInternalRecipients.extraEmails) ? notificationInternalRecipients.extraEmails.join(", ") : ""}
                                        onChange={(event) => updateNotificationRecipients("internalRecipients", "extraEmails", event.target.value.split(",").map((item) => String(item || "").trim()).filter(Boolean))}
                                    />
                                </Field>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Delivery & Deliverability" description="Quiet hours, digest, sender identity, suppression policy, and test email.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Toggle
                                label="Quiet Hours Enabled"
                                checked={Boolean(notificationDelivery?.quietHours?.enabled)}
                                onChange={(next) => updateNotificationDelivery("quietHours", "enabled", next)}
                            />
                            <Toggle
                                label="Digest Enabled"
                                checked={Boolean(notificationDelivery?.digest?.enabled)}
                                onChange={(next) => updateNotificationDelivery("digest", "enabled", next)}
                            />
                            <Field label="Quiet Hours Start">
                                <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDelivery?.quietHours?.start || "22:00")} onChange={(e) => updateNotificationDelivery("quietHours", "start", e.target.value)} />
                            </Field>
                            <Field label="Quiet Hours End">
                                <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDelivery?.quietHours?.end || "06:00")} onChange={(e) => updateNotificationDelivery("quietHours", "end", e.target.value)} />
                            </Field>
                            <Field label="Digest Time">
                                <input type="time" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDelivery?.digest?.time || "09:00")} onChange={(e) => updateNotificationDelivery("digest", "time", e.target.value)} />
                            </Field>
                            <Field label="Digest Frequency">
                                <select className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDelivery?.digest?.frequency || "daily")} onChange={(e) => updateNotificationDelivery("digest", "frequency", e.target.value)}>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </Field>
                            <Field label="From Name">
                                <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDeliverability?.fromName || "")} onChange={(e) => updateNotificationDeliverability("fromName", e.target.value)} />
                            </Field>
                            <Field label="From Email">
                                <input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDeliverability?.fromEmail || "")} onChange={(e) => updateNotificationDeliverability("fromEmail", e.target.value)} />
                            </Field>
                            <Field label="Reply-To Email">
                                <input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={String(notificationDeliverability?.replyTo || "")} onChange={(e) => updateNotificationDeliverability("replyTo", e.target.value)} />
                            </Field>
                            <Toggle
                                label="Respect Suppression List"
                                checked={Boolean(notificationDeliverability?.respectSuppression)}
                                onChange={(next) => updateNotificationDeliverability("respectSuppression", next)}
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                            <Field label="Send Test Email To">
                                <input type="email" className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={notificationTestEmailTo} onChange={(event) => setNotificationTestEmailTo(event.target.value)} />
                            </Field>
                            <button
                                type="button"
                                className="h-[38px] px-5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50"
                                disabled={notificationTestEmailBusy}
                                onClick={sendNotificationTestEmail}
                            >
                                {notificationTestEmailBusy ? "Sending..." : "Send Test Email"}
                            </button>
                        </div>
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === "integrations") {
            return (
                <SectionCard title="Integrations" description="Webhook and API configuration for operational integrations.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Field label="Webhook URL" help="Leave empty if you do not use external webhook consumers.">
                                <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.integrations.webhookUrl} onChange={(e) => updateValue("integrations", "webhookUrl", e.target.value)} placeholder="https://example.com/webhooks/courier" />
                            </Field>
                        </div>
                        <Field label="API Key Alias">
                            <input className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.integrations.apiKeyAlias} onChange={(e) => updateValue("integrations", "apiKeyAlias", e.target.value)} />
                        </Field>
                        <Field label="Retry Window (minutes)">
                            <input type="number" min={1} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.integrations.retryWindowMinutes} onChange={(e) => updateValue("integrations", "retryWindowMinutes", Number(e.target.value || 0))} />
                        </Field>
                        <Field label="Rotate Keys Every (days)">
                            <input type="number" min={30} className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]" value={settings.integrations.rotateKeysEveryDays} onChange={(e) => updateValue("integrations", "rotateKeysEveryDays", Number(e.target.value || 0))} />
                        </Field>
                    </div>
                </SectionCard>
            );
        }

        if (activeTab === "services") {
            return (
                <div className="space-y-4">
                    <SectionCard title="Service Capabilities" description="Configure operational service behavior and request controlled capability enablement.">
                        <p className="text-[12px] text-[#6B7280] mb-3">COD capability applies to domestic routes only.</p>

                        <div className={`rounded-[10px] border px-4 py-3 ${codStatusTone}`}>
                            <p className="text-[13px] font-[700]">{codCapabilityCategoryLabel} COD Capability Status: {codCapabilityStatusLabel}</p>
                            <p className="text-[12px] mt-1">
                                {codCapabilityStatus === "approved" && `Your courier workspace is approved to operate ${codCapabilityCategoryLabel.toLowerCase()} COD bookings.`}
                                {codCapabilityStatus === "pending" && `Your ${codCapabilityCategoryLabel.toLowerCase()} COD request is pending superadmin review.`}
                                {codCapabilityStatus === "rejected" && `Your previous ${codCapabilityCategoryLabel.toLowerCase()} COD request was rejected. Update details and re-submit.`}
                                {codCapabilityStatus === "not_requested" && `${codCapabilityCategoryLabel} COD is not enabled yet. Submit a request for superadmin approval.`}
                            </p>
                            {codCapabilityRequestedAt && (
                                <p className="text-[11px] mt-2">Requested at: {codCapabilityRequestedAt}</p>
                            )}
                            {codCapabilityReviewedAt && (
                                <p className="text-[11px] mt-1">Reviewed at: {codCapabilityReviewedAt}{codCapabilityReviewedBy ? ` by ${codCapabilityReviewedBy}` : ""}</p>
                            )}
                            {codCapabilityDecisionReason && (
                                <p className="text-[11px] mt-1">Decision note: {codCapabilityDecisionReason}</p>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Toggle
                                label="Allow COD At Checkout"
                                checked={Boolean(servicesCodSettings.acceptCodAtCheckout)}
                                onChange={(next) => updateServiceCodValue("acceptCodAtCheckout", next)}
                                description="Expose COD as an option during courier booking checkout."
                            />
                            <Toggle
                                label="Allow Domestic COD"
                                checked={Boolean(servicesCodSettings.allowCodForDomestic)}
                                onChange={(next) => updateServiceCodValue("allowCodForDomestic", next)}
                                description="Keep domestic COD path active once capability is approved."
                            />
                            <Toggle
                                label="Accept Cash COD"
                                checked={servicesCodSettings.allowCashCod !== false}
                                onChange={(next) => updateServiceCodValue("allowCashCod", next)}
                                description="Customers can pay the courier in cash on delivery."
                            />
                            <Toggle
                                label="Accept Bank Transfer COD"
                                checked={servicesCodSettings.allowBankTransferCod !== false}
                                onChange={(next) => updateServiceCodValue("allowBankTransferCod", next)}
                                description="Customers can pay by bank transfer when the parcel is delivered."
                            />
                            <Toggle
                                label="Allow Team Override"
                                checked={Boolean(servicesCodSettings.allowTeamOverride)}
                                onChange={(next) => updateServiceCodValue("allowTeamOverride", next)}
                                description="Use only with explicit COD override permissions for authorized staff."
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                            <Field label={`${codCapabilityCategoryLabel} COD Request Note`} help="Share readiness details such as SOP, collection controls, and reconciliation process.">
                                <textarea
                                    rows={3}
                                    className="w-full rounded-[8px] border border-[#D1D5DB]"
                                    value={codRequestNote}
                                    onChange={(event) => setCodRequestNote(event.target.value)}
                                    placeholder="COD readiness summary..."
                                />
                            </Field>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={submitCodCapabilityRequest}
                                    disabled={!codCapabilityCanRequest || codRequestBusy}
                                    className="h-[38px] px-5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50"
                                >
                                    {codRequestBusy
                                        ? "Submitting..."
                                        : (codCapabilityStatus === "rejected"
                                            ? `Re-submit ${codCapabilityCategoryLabel} COD Request`
                                            : `Submit ${codCapabilityCategoryLabel} COD Request`)}
                                </button>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === "labels") {
            if (!canViewLabels) {
                return (
                    <SectionCard title="Label Access" description="Permissions required to view label settings.">
                        <p className="text-[12px] text-[#6B7280]">
                            You do not have permission to view label settings. Contact an admin to grant label access.
                        </p>
                    </SectionCard>
                );
            }

            const labelControlsDisabled = !canManageLabels;
            const templateOptionsForCategory = (categoryKey) => labelTemplates.filter((template) => {
                const scope = String(template?.category_scope || template?.categoryScope || "all");
                return scope === "all" || scope === categoryKey;
            });

            return (
                <div className="space-y-4">
                    <SectionCard title="Label Defaults and Policy" description="Set default label templates and sizes per category, then control bulk print limits and access.">
                        {labelCatalogError && (
                            <p className="text-[12px] text-[#B91C1C] mb-2">{labelCatalogError}</p>
                        )}
                        {labelCatalogBusy && (
                            <p className="text-[11px] text-[#6B7280] mb-2">Refreshing label catalog...</p>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="border border-[#E5E7EB] rounded-[10px] p-3">
                                <p className="text-[13px] font-[700] text-[#111827]">Domestic Defaults</p>
                                <div className="mt-3 grid grid-cols-1 gap-3">
                                    <Field label="Default Template">
                                        <select
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                            disabled={labelControlsDisabled}
                                            value={String(labelDefaults?.domestic?.templateId || "")}
                                            onChange={(e) => updateLabelDefaults("domestic", "templateId", e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">No default template</option>
                                            {templateOptionsForCategory("domestic").map((template) => (
                                                <option key={`label-template-dom-${template.id}`} value={template.id}>
                                                    {template.name}{template.is_active === false ? " (Inactive)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Default Size">
                                        <select
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                            disabled={labelControlsDisabled}
                                            value={String(labelDefaults?.domestic?.sizeId || "")}
                                            onChange={(e) => updateLabelDefaults("domestic", "sizeId", e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">No default size</option>
                                            {(Array.isArray(labelSizes) ? labelSizes : []).map((size) => (
                                                <option key={`label-size-dom-${size.id}`} value={size.id}>
                                                    {size.name} ({formatLabelSize(size)}){size.is_active === false ? " (Inactive)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                            <div className="border border-[#E5E7EB] rounded-[10px] p-3">
                                <p className="text-[13px] font-[700] text-[#111827]">international Defaults</p>
                                <div className="mt-3 grid grid-cols-1 gap-3">
                                    <Field label="Default Template">
                                        <select
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                            disabled={labelControlsDisabled}
                                            value={String(labelDefaults?.international?.templateId || "")}
                                            onChange={(e) => updateLabelDefaults("international", "templateId", e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">No default template</option>
                                            {templateOptionsForCategory("international").map((template) => (
                                                <option key={`label-template-log-${template.id}`} value={template.id}>
                                                    {template.name}{template.is_active === false ? " (Inactive)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Default Size">
                                        <select
                                            className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                            disabled={labelControlsDisabled}
                                            value={String(labelDefaults?.international?.sizeId || "")}
                                            onChange={(e) => updateLabelDefaults("international", "sizeId", e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">No default size</option>
                                            {(Array.isArray(labelSizes) ? labelSizes : []).map((size) => (
                                                <option key={`label-size-log-${size.id}`} value={size.id}>
                                                    {size.name} ({formatLabelSize(size)}){size.is_active === false ? " (Inactive)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            <Field label="Bulk Async Threshold">
                                <input
                                    type="number"
                                    min={1}
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    disabled={labelControlsDisabled}
                                    value={labelPolicy.bulkAsyncThreshold}
                                    onChange={(e) => updateLabelPolicy("bulkAsyncThreshold", Number(e.target.value || 1))}
                                />
                            </Field>
                            <Field label="Bulk Hard Limit">
                                <input
                                    type="number"
                                    min={1}
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    disabled={labelControlsDisabled}
                                    value={labelPolicy.bulkHardLimit}
                                    onChange={(e) => updateLabelPolicy("bulkHardLimit", Number(e.target.value || 1))}
                                />
                            </Field>
                            <Toggle
                                label="Allow Custom Sizes"
                                checked={labelPolicy.allowCustomSizes}
                                onChange={(next) => updateLabelPolicy("allowCustomSizes", next)}
                                description="If disabled, only system sizes can be used."
                                disabled={labelControlsDisabled}
                            />
                            <Toggle
                                label="Allow Template Uploads"
                                checked={labelPolicy.allowTemplateUpload}
                                onChange={(next) => updateLabelPolicy("allowTemplateUpload", next)}
                                description="Disable to lock vendors to system templates."
                                disabled={labelControlsDisabled}
                            />
                            <Toggle
                                label="Allow HTML Templates"
                                checked={labelPolicy.allowHtmlTemplates}
                                onChange={(next) => updateLabelPolicy("allowHtmlTemplates", next)}
                                description="Restrict custom HTML if you only want uploads."
                                disabled={labelControlsDisabled}
                            />
                            <Toggle
                                label="Allow PDF Backgrounds"
                                checked={labelPolicy.allowPdfBackground}
                                onChange={(next) => updateLabelPolicy("allowPdfBackground", next)}
                                description="Toggle PDF uploads for label backgrounds."
                                disabled={labelControlsDisabled}
                            />
                        </div>
                    </SectionCard>

                    <SectionCard title="Label Sizes" description="Define thermal or A4 label sizes available for template design.">
                        {!labelPolicy.allowCustomSizes && (
                            <p className="text-[11px] text-[#B45309] mb-2">Custom label sizes are disabled by policy.</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <Field label="Size Name">
                                <input
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelSizeForm.name}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelSizeForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="4x6 Thermal"
                                />
                            </Field>
                            <Field label="Unit">
                                <select
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelSizeForm.unit}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelSizeForm((prev) => ({ ...prev, unit: e.target.value }))}
                                >
                                    {LABEL_UNIT_OPTIONS.map((option) => (
                                        <option key={`label-unit-${option.value}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={`Width (${labelSizeForm.unit || "mm"})`}>
                                <input
                                    type="number"
                                    min={1}
                                    step={0.1}
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelSizeForm.widthMm}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelSizeForm((prev) => ({ ...prev, widthMm: e.target.value }))}
                                />
                            </Field>
                            <Field label={`Height (${labelSizeForm.unit || "mm"})`}>
                                <input
                                    type="number"
                                    min={1}
                                    step={0.1}
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelSizeForm.heightMm}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelSizeForm((prev) => ({ ...prev, heightMm: e.target.value }))}
                                />
                            </Field>
                            <button
                                type="button"
                                className="h-[42px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50"
                                onClick={createLabelSize}
                                disabled={labelCatalogBusy || !labelPolicy.allowCustomSizes || labelControlsDisabled}
                            >
                                Add Size
                            </button>
                        </div>

                        <div className="mt-4 space-y-2">
                            {labelSizes.length === 0 && (
                                <p className="text-[11px] text-[#6B7280]">No label sizes configured yet.</p>
                            )}

                            {labelSizes.map((size) => {
                                const draft = labelSizeDrafts[size.id] || {
                                    name: size.name || "",
                                    widthMm: size.width_mm || size.widthMm || "",
                                    heightMm: size.height_mm || size.heightMm || "",
                                    unit: size.unit || "mm",
                                    isActive: Boolean(size.is_active ?? true),
                                    isSystem: Boolean(size.is_system ?? false),
                                };
                                const sizeBusy = labelSizeSaveBusyId === size.id;

                                return (
                                    <div key={`label-size-${size.id}`} className="border border-[#E5E7EB] rounded-[10px] p-3">
                                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                                            <Field label="Name">
                                                <input
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.name}
                                                    disabled={draft.isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelSizeDrafts((prev) => ({
                                                        ...prev,
                                                        [size.id]: { ...draft, name: e.target.value },
                                                    }))}
                                                />
                                            </Field>
                                            <Field label="Unit">
                                                <select
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.unit || "mm"}
                                                    disabled={draft.isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelSizeDrafts((prev) => ({
                                                        ...prev,
                                                        [size.id]: { ...draft, unit: e.target.value },
                                                    }))}
                                                >
                                                    {LABEL_UNIT_OPTIONS.map((option) => (
                                                        <option key={`label-size-unit-${size.id}-${option.value}`} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label={`Width (${draft.unit || "mm"})`}>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={0.1}
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.widthMm}
                                                    disabled={draft.isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelSizeDrafts((prev) => ({
                                                        ...prev,
                                                        [size.id]: { ...draft, widthMm: e.target.value },
                                                    }))}
                                                />
                                            </Field>
                                            <Field label={`Height (${draft.unit || "mm"})`}>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={0.1}
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.heightMm}
                                                    disabled={draft.isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelSizeDrafts((prev) => ({
                                                        ...prev,
                                                        [size.id]: { ...draft, heightMm: e.target.value },
                                                    }))}
                                                />
                                            </Field>
                                            <div className="flex items-center gap-2">
                                                <label className="inline-flex items-center gap-2 text-[12px] text-[#374151]">
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.isActive}
                                                        disabled={draft.isSystem || labelControlsDisabled}
                                                        onChange={(e) => setLabelSizeDrafts((prev) => ({
                                                            ...prev,
                                                            [size.id]: { ...draft, isActive: e.target.checked },
                                                        }))}
                                                    />
                                                    Active
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="h-[34px] px-3 rounded-[8px] bg-[#111827] text-white text-[12px] font-[700] disabled:opacity-50"
                                                    onClick={() => saveLabelSize(size.id)}
                                                    disabled={sizeBusy || draft.isSystem || !labelPolicy.allowCustomSizes || labelControlsDisabled}
                                                >
                                                    {sizeBusy ? "Saving" : "Save"}
                                                </button>
                                                {!draft.isSystem && (
                                                    <button
                                                        type="button"
                                                        className="h-[34px] px-3 rounded-[8px] border border-[#FCA5A5] text-[#B91C1C] text-[12px] font-[700] disabled:opacity-50"
                                                        onClick={() => deleteLabelSize(size.id)}
                                                        disabled={labelControlsDisabled}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {draft.isSystem && (
                                            <p className="mt-2 text-[11px] text-[#6B7280]">System sizes cannot be edited or removed.</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>

                    <SectionCard title="Label Templates" description="Create templates from HTML or uploaded backgrounds. Use JSON tokens to map shipment fields.">
                        {!labelPolicy.allowTemplateUpload && (
                            <p className="text-[11px] text-[#B45309] mb-2">Template uploads are disabled by policy.</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                            <Field label="Template Name">
                                <input
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelTemplateForm.name}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Default Thermal Label"
                                />
                            </Field>
                            <Field label="Type">
                                <select
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelTemplateForm.templateType}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, templateType: e.target.value }))}
                                >
                                    <option value="builder">Builder (JSON)</option>
                                    <option value="html" disabled={!labelPolicy.allowHtmlTemplates}>HTML/CSS</option>
                                    <option value="upload">Upload Background</option>
                                </select>
                            </Field>
                            <Field label="Scope">
                                <select
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelTemplateForm.categoryScope}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, categoryScope: e.target.value }))}
                                >
                                    <option value="all">All</option>
                                    <option value="domestic">Domestic</option>
                                    <option value="international">international</option>
                                </select>
                            </Field>
                            <Field label="Size">
                                <select
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelTemplateForm.sizeId}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, sizeId: e.target.value }))}
                                >
                                    <option value="">Select size</option>
                                    {activeLabelSizes.map((size) => (
                                        <option key={`template-size-${size.id}`} value={size.id}>
                                            {size.name} ({formatLabelSize(size)})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Orientation">
                                <select
                                    className="w-full h-[42px] rounded-[8px] border border-[#D1D5DB]"
                                    value={labelTemplateForm.orientation}
                                    disabled={labelControlsDisabled}
                                    onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, orientation: e.target.value }))}
                                >
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </Field>
                            <button
                                type="button"
                                className="h-[42px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50"
                                onClick={createLabelTemplate}
                                disabled={labelTemplateUploadBusy || !labelPolicy.allowTemplateUpload || labelControlsDisabled}
                            >
                                {labelTemplateUploadBusy ? "Saving" : "Create Template"}
                            </button>
                        </div>

                        {labelTemplateForm.templateType === "builder" && (
                            <div className="mt-3">
                                <Field label="Builder Schema (JSON array)" help="Use tokens like {{trackingNumber}}, {{sender.name}}, {{recipient.address.city}}">
                                    <textarea
                                        rows={4}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={labelTemplateForm.builderSchema}
                                        disabled={labelControlsDisabled}
                                        onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, builderSchema: e.target.value }))}
                                        placeholder='[{"type":"text","x":12,"y":14,"value":"{{trackingNumber}}"}]'
                                    />
                                </Field>
                            </div>
                        )}

                        {labelTemplateForm.templateType === "html" && (
                            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <Field label="HTML Template" help="Tokens map to shipment data, e.g. {{trackingNumber}}">
                                    <textarea
                                        rows={6}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={labelTemplateForm.htmlTemplate}
                                        disabled={labelControlsDisabled}
                                        onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, htmlTemplate: e.target.value }))}
                                    />
                                </Field>
                                <Field label="CSS (optional)">
                                    <textarea
                                        rows={6}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={labelTemplateForm.cssTemplate}
                                        disabled={labelControlsDisabled}
                                        onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, cssTemplate: e.target.value }))}
                                    />
                                </Field>
                            </div>
                        )}

                        {labelTemplateForm.templateType === "upload" && (
                            <div className="mt-3">
                                <Field label="Background File" help="Upload PDF, PNG, or JPG to use as the label background.">
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                                        className="w-full"
                                        disabled={labelControlsDisabled}
                                        onChange={(e) => setLabelTemplateForm((prev) => ({
                                            ...prev,
                                            backgroundFile: e.target.files?.[0] || null,
                                        }))}
                                    />
                                </Field>
                            </div>
                        )}

                        {labelTemplateForm.templateType !== "upload" && (
                            <div className="mt-3">
                                <Field label="Field Overrides (JSON)" help="Optional JSON object to override token values at render time.">
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-[8px] border border-[#D1D5DB]"
                                        value={labelTemplateForm.fieldOverrides}
                                        disabled={labelControlsDisabled}
                                        onChange={(e) => setLabelTemplateForm((prev) => ({ ...prev, fieldOverrides: e.target.value }))}
                                    />
                                </Field>
                            </div>
                        )}

                        <div className="mt-4 space-y-2">
                            {labelTemplates.length === 0 && (
                                <p className="text-[11px] text-[#6B7280]">No label templates yet. Create one above.</p>
                            )}

                            {labelTemplates.map((template) => {
                                const draft = labelTemplateDrafts[template.id] || {
                                    name: template.name || "",
                                    categoryScope: template.category_scope || "all",
                                    sizeId: template.size_id ? String(template.size_id) : "",
                                    orientation: template.orientation || "portrait",
                                    isActive: Boolean(template.is_active ?? true),
                                    isSystem: Boolean(template.is_system ?? false),
                                };
                                const templateBusy = labelTemplateSaveBusyId === template.id;
                                const isSystem = Boolean(draft.isSystem);

                                return (
                                    <div key={`label-template-${template.id}`} className="border border-[#E5E7EB] rounded-[10px] p-3">
                                        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-end">
                                            <Field label="Name">
                                                <input
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.name}
                                                    disabled={isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelTemplateDrafts((prev) => ({
                                                        ...prev,
                                                        [template.id]: { ...draft, name: e.target.value },
                                                    }))}
                                                />
                                            </Field>
                                            <Field label="Type">
                                                <input
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB] bg-[#F9FAFB]"
                                                    value={titleCase(template.template_type || "")}
                                                    disabled={true}
                                                />
                                            </Field>
                                            <Field label="Scope">
                                                <select
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.categoryScope}
                                                    disabled={isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelTemplateDrafts((prev) => ({
                                                        ...prev,
                                                        [template.id]: { ...draft, categoryScope: e.target.value },
                                                    }))}
                                                >
                                                    <option value="all">All</option>
                                                    <option value="domestic">Domestic</option>
                                                    <option value="international">international</option>
                                                </select>
                                            </Field>
                                            <Field label="Size">
                                                <select
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.sizeId}
                                                    disabled={isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelTemplateDrafts((prev) => ({
                                                        ...prev,
                                                        [template.id]: { ...draft, sizeId: e.target.value },
                                                    }))}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {(Array.isArray(labelSizes) ? labelSizes : []).map((size) => (
                                                        <option key={`template-size-${template.id}-${size.id}`} value={size.id}>
                                                            {size.name} ({formatLabelSize(size)})
                                                        </option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Orientation">
                                                <select
                                                    className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB]"
                                                    value={draft.orientation}
                                                    disabled={isSystem || labelControlsDisabled}
                                                    onChange={(e) => setLabelTemplateDrafts((prev) => ({
                                                        ...prev,
                                                        [template.id]: { ...draft, orientation: e.target.value },
                                                    }))}
                                                >
                                                    <option value="portrait">Portrait</option>
                                                    <option value="landscape">Landscape</option>
                                                </select>
                                            </Field>
                                            <div className="flex items-center gap-2">
                                                <label className="inline-flex items-center gap-2 text-[12px] text-[#374151]">
                                                    <input
                                                        type="checkbox"
                                                        checked={draft.isActive}
                                                        disabled={isSystem || labelControlsDisabled}
                                                        onChange={(e) => setLabelTemplateDrafts((prev) => ({
                                                            ...prev,
                                                            [template.id]: { ...draft, isActive: e.target.checked },
                                                        }))}
                                                    />
                                                    Active
                                                </label>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700] text-[#374151] disabled:opacity-50"
                                                    onClick={() => previewLabelTemplate(template.id, draft.sizeId || template.size_id)}
                                                    disabled={labelPreviewBusyId === template.id}
                                                >
                                                    {labelPreviewBusyId === template.id ? "Previewing" : "Preview"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="h-[34px] px-3 rounded-[8px] bg-[#111827] text-white text-[12px] font-[700] disabled:opacity-50"
                                                    onClick={() => saveLabelTemplate(template.id)}
                                                    disabled={templateBusy || isSystem || !labelPolicy.allowTemplateUpload || labelControlsDisabled}
                                                >
                                                    {templateBusy ? "Saving" : "Save"}
                                                </button>
                                                {!isSystem && (
                                                    <button
                                                        type="button"
                                                        className="h-[34px] px-3 rounded-[8px] border border-[#FCA5A5] text-[#B91C1C] text-[12px] font-[700] disabled:opacity-50"
                                                        onClick={() => deleteLabelTemplate(template.id)}
                                                        disabled={labelControlsDisabled}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[11px] text-[#6B7280]">
                                            Template ID: {template.id} • Category: {titleCase(template.category_scope || "all")}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                </div>
            );
        }

        if (activeTab === "pricing") {
            if (visiblePricingCategoryOptions.length === 0) {
                return (
                    <SectionCard title="Advanced Pricing" description="Configure domestic/international rate cards with category-based approvals.">
                        <p className="text-[12px] text-[#B45309]">
                            Pricing setup is locked because no courier pricing category is approved yet. Ask super admin to approve Domestic and/or international courier registration.
                        </p>
                    </SectionCard>
                );
            }

            return (
                <div className="space-y-4">
                    <div className="bg-white rounded-[10px] p-4" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[12px] text-[#6B7280] font-[700] uppercase tracking-wide">Pricing Category</p>
                                <p className="text-[12px] text-[#475569] mt-1">Switch between Domestic and International pricing using URL-based tabs.</p>
                            </div>
                            <div className="inline-flex rounded-[8px] border border-[#D1D5DB] p-1 bg-[#F8FAFC]">
                                {visiblePricingCategoryOptions.map((item) => (
                                    <button
                                        key={`pricing-category-tab-${item.key}`}
                                        type="button"
                                        className={`h-[30px] px-4 rounded-[6px] text-[12px] font-[700] transition-colors ${activePricingCategory === item.key ? "bg-[#0955AC] text-white" : "text-[#475569] hover:text-[#1F2937]"}`}
                                        onClick={() => navigatePricingCategory(item.key)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {visiblePricingCategoryOptions.length === 1 && (
                            <p className="mt-2 text-[11px] text-[#64748B]">
                                Pricing is currently available only for {titleCase(visiblePricingCategoryOptions[0].key)} based on super admin service approval.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5">
                        <div className="bg-white rounded-[10px] p-4 h-fit" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                            <p className="text-[12px] text-[#6B7280] font-[700] uppercase tracking-wide mb-3">Pricing Topics</p>
                            <div className="space-y-2">
                                {PRICING_TOPIC_CONFIG.map((topic) => (
                                    <button
                                        key={topic.key}
                                        type="button"
                                        onClick={() => navigatePricingTopic(topic.key, { category: activePricingCategory })}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-left text-[13px] font-[700] transition-colors ${activePricingTopic === topic.key
                                                ? "bg-[#0955AC] text-white"
                                                : "bg-[#F3F4F6] text-[#374151]"
                                            }`}
                                    >
                                        <span>{topic.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SectionCard title="Advanced Pricing" description={`Configure ${titleCase(activePricingCategory)} rate cards, localized currency display, and formula controls for accurate quote calculations.`}>
                            <div className="space-y-4">
                            {activePricingTopic === "currency-formula" && (
                                <div id="pricing-topic-currency-formula" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-24">
                                    <div className="border border-[#E5E7EB] rounded-[10px] p-3 bg-[#F8FAFC]">
                                        <p className="text-[13px] font-[700] text-[#111827] mb-2">Currency Localization</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <Field label="Base Currency">
                                                <select
                                                    className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={String(activePricingLocalization.baseCurrency || "LKR").toUpperCase()}
                                                    onChange={(e) => updatePricingLocalization(activePricingCategory, "baseCurrency", String(e.target.value || "LKR").toUpperCase())}
                                                >
                                                    {CURRENCY_OPTIONS.map((currencyCode) => (
                                                        <option key={`base_currency_${currencyCode}`} value={currencyCode}>{currencyCode}</option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Display Currency">
                                                <select
                                                    className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={String(activePricingLocalization.displayCurrency || "LKR").toUpperCase()}
                                                    onChange={(e) => updatePricingLocalization(activePricingCategory, "displayCurrency", String(e.target.value || "LKR").toUpperCase())}
                                                >
                                                    {CURRENCY_OPTIONS.map((currencyCode) => (
                                                        <option key={`display_currency_${currencyCode}`} value={currencyCode}>{currencyCode}</option>
                                                    ))}
                                                </select>
                                            </Field>
                                            <Field label="Locale">
                                                <input
                                                    className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={String(activePricingLocalization.locale || "en-LK")}
                                                    onChange={(e) => updatePricingLocalization(activePricingCategory, "locale", e.target.value)}
                                                    placeholder="en-LK"
                                                />
                                            </Field>
                                            <Field label="Display Exchange Rate">
                                                <input
                                                    type="number"
                                                    min={0.000001}
                                                    step="0.000001"
                                                    className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={Number((activePricingLocalization.manualRates || {})[String(activePricingLocalization.displayCurrency || "LKR").toUpperCase()] || 1)}
                                                    onChange={(e) => {
                                                        const displayCurrency = String(activePricingLocalization.displayCurrency || "LKR").toUpperCase();
                                                        const nextRate = Math.max(0.000001, Number(e.target.value || 1));
                                                        const currentManual = activePricingLocalization.manualRates || {};
                                                        updatePricingLocalization(activePricingCategory, "manualRates", {
                                                            ...currentManual,
                                                            [String(activePricingLocalization.baseCurrency || "LKR").toUpperCase()]: 1,
                                                            [displayCurrency]: nextRate,
                                                        });
                                                    }}
                                                />
                                            </Field>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={liveRateBusy}
                                                className="h-[32px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700] disabled:opacity-50"
                                                onClick={fetchLiveExchangeRates}
                                            >
                                                {liveRateBusy ? "Syncing..." : "Sync Live Rates"}
                                            </button>
                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingLocalization.autoLiveRates)}
                                                    onChange={(e) => updatePricingLocalization(activePricingCategory, "autoLiveRates", e.target.checked)}
                                                />
                                                Enable live-rate strategy
                                            </label>
                                            <span className="text-[11px] text-[#64748B]">
                                                Provider: {activePricingLocalization.exchangeRateProvider || "frankfurter.app"}
                                            </span>
                                            <span className="text-[11px] text-[#64748B]">
                                                Last Sync: {activePricingLocalization.lastSyncedAt || "Not synced"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border border-[#E5E7EB] rounded-[10px] p-3 bg-[#F8FAFC]">
                                        <p className="text-[13px] font-[700] text-[#111827] mb-2">Formula Controls ({titleCase(activePricingCategory)})</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Field label="Volumetric Divisor">
                                                <input type="number" min={1} className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingFormula.volumetricDivisor || 5000)} onChange={(e) => updatePricingFormula(activePricingCategory, "volumetricDivisor", Number(e.target.value || 5000))} />
                                            </Field>
                                            <Field label="Fuel Surcharge %">
                                                <input type="number" min={0} step="0.01" className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingFormula.fuelSurchargePercent || 0)} onChange={(e) => updatePricingFormula(activePricingCategory, "fuelSurchargePercent", Number(e.target.value || 0))} />
                                            </Field>
                                            <Field label="Handling Fee">
                                                <input type="number" min={0} step="0.01" className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingFormula.handlingFee || 0)} onChange={(e) => updatePricingFormula(activePricingCategory, "handlingFee", Number(e.target.value || 0))} />
                                            </Field>
                                            <Field label="Tax %">
                                                <input type="number" min={0} step="0.01" className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingFormula.taxPercent || 0)} onChange={(e) => updatePricingFormula(activePricingCategory, "taxPercent", Number(e.target.value || 0))} />
                                            </Field>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingFormula.useChargeableWeight)}
                                                    onChange={(e) => updatePricingFormula(activePricingCategory, "useChargeableWeight", e.target.checked)}
                                                />
                                                Use chargeable weight
                                            </label>
                                            <Field label="Round Decimals">
                                                <input type="number" min={0} max={4} className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingFormula.roundTo || 2)} onChange={(e) => updatePricingFormula(activePricingCategory, "roundTo", Number(e.target.value || 2))} />
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "policy-modules" && (
                                <div id="pricing-topic-policy-modules" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-[#F8FAFC] scroll-mt-24">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Rule-Based Policy Modules ({titleCase(activePricingCategory)})</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3 md:col-span-2">
                                            <p className="text-[12px] font-[700] text-[#111827]">Speed/ETA Explicit Tier Engine</p>
                                            <p className="text-[11px] text-[#64748B] mt-1">Manage your own tiers with explicit ETA ranges, constraints, and optional tier price multipliers.</p>
                                            <div className="mt-2 flex flex-wrap gap-3">
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activeSpeedEtaTierEngine?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(activePricingCategory, "speedEtaTierEngine", "enabled", e.target.checked)}
                                                    />
                                                    Enable
                                                </label>
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activeSpeedEtaTierEngine?.enforceFixedNamedTiers)}
                                                        onChange={(e) => updatePricingPolicyModule(activePricingCategory, "speedEtaTierEngine", "enforceFixedNamedTiers", e.target.checked)}
                                                    />
                                                    Require Selected Service Tier To Exist
                                                </label>
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activeSpeedEtaTierEngine?.enforceTierPricingMultiplier)}
                                                        onChange={(e) => updatePricingPolicyModule(activePricingCategory, "speedEtaTierEngine", "enforceTierPricingMultiplier", e.target.checked)}
                                                    />
                                                    Enforce Tier Price Multiplier
                                                </label>
                                                <button
                                                    type="button"
                                                    className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                                    onClick={() => openAddTierModal(activePricingCategory)}
                                                >
                                                    Add Tier
                                                </button>
                                            </div>

                                            <div className="mt-3 overflow-x-auto">
                                                <table className="w-full min-w-[1200px] text-[12px]">
                                                    <thead>
                                                        <tr className="bg-[#F8FAFC] text-left border border-[#E5E7EB]">
                                                            <th className="px-2 py-2">Tier</th>
                                                            <th className="px-2 py-2">Enabled</th>
                                                            <th className="px-2 py-2">ETA Label</th>
                                                            <th className="px-2 py-2">ETA Min Days</th>
                                                            <th className="px-2 py-2">ETA Max Days</th>
                                                            <th className="px-2 py-2">Price Multiplier</th>
                                                            <th className="px-2 py-2">Max Distance (km)</th>
                                                            <th className="px-2 py-2">Max Weight (kg)</th>
                                                            <th className="px-2 py-2">Min Lead Hours</th>
                                                            <th className="px-2 py-2">Max Lead Hours</th>
                                                            <th className="px-2 py-2">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activeSpeedEtaTierRows.map((tier) => {
                                                            const tierRow = tier.row || {};
                                                            return (
                                                                <tr key={`speed-eta-tier-${tier.key}`} className="border-x border-b border-[#E5E7EB]">
                                                                    <td className="px-2 py-2 font-[700] text-[#0F172A]">{tier.key}</td>
                                                                    <td className="px-2 py-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={Boolean(tierRow?.enabled)}
                                                                            onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "enabled", e.target.checked)}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-2"><input className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={String(tierRow?.etaLabel || titleCase(tier.key))} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "etaLabel", e.target.value)} /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0} step="1" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={Number(tierRow?.etaMinDays ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "etaMinDays", Number(e.target.value || 0))} /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0} step="1" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={tierRow?.etaMaxDays === null || tierRow?.etaMaxDays === undefined ? "" : Number(tierRow?.etaMaxDays ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "etaMaxDays", e.target.value === "" ? null : Number(e.target.value || 0))} placeholder="No cap" /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0.1} step="0.01" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={Number(tierRow?.priceMultiplier ?? 1)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "priceMultiplier", Number(e.target.value || 1))} /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0.1} step="0.1" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={tierRow?.maxDistanceKm === null || tierRow?.maxDistanceKm === undefined ? "" : Number(tierRow?.maxDistanceKm ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "maxDistanceKm", e.target.value === "" ? null : Number(e.target.value || 0))} placeholder="No cap" /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0.1} step="0.1" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={tierRow?.maxWeightKg === null || tierRow?.maxWeightKg === undefined ? "" : Number(tierRow?.maxWeightKg ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "maxWeightKg", e.target.value === "" ? null : Number(e.target.value || 0))} placeholder="No cap" /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0} step="0.25" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={Number(tierRow?.minLeadHours ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "minLeadHours", Number(e.target.value || 0))} /></td>
                                                                    <td className="px-2 py-2"><input type="number" min={0} step="0.25" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={tierRow?.maxLeadHours === null || tierRow?.maxLeadHours === undefined ? "" : Number(tierRow?.maxLeadHours ?? 0)} onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "maxLeadHours", e.target.value === "" ? null : Number(e.target.value || 0))} placeholder="No cap" /></td>
                                                                    <td className="px-2 py-2">
                                                                        <button
                                                                            type="button"
                                                                            className="h-[28px] px-2 rounded-[6px] border border-[#DC2626] text-[#DC2626] text-[11px] font-[700]"
                                                                            onClick={() => removePricingTierEngineTier(activePricingCategory, tier.key)}
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {activeSpeedEtaTierRows.map((tier) => {
                                                    const tierRow = tier.row || {};
                                                    return (
                                                        <div key={`speed-eta-tier-list-${tier.key}`} className="rounded-[8px] border border-[#E5E7EB] p-2">
                                                            <p className="text-[11px] font-[700] text-[#0F172A]">{tierRow?.etaLabel || titleCase(tier.key)} Constraints</p>
                                                            <Field label="Allowed Pickup Days (1-7, comma-separated)">
                                                                <input
                                                                    className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={Array.isArray(tierRow?.allowedPickupDays) ? tierRow.allowedPickupDays.join(", ") : "1, 2, 3, 4, 5, 6, 7"}
                                                                    onChange={(e) => updatePricingTierEngineTier(
                                                                        activePricingCategory,
                                                                        tier.key,
                                                                        "allowedPickupDays",
                                                                        parseCommaList(e.target.value, (item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 1 && item <= 7),
                                                                    )}
                                                                />
                                                            </Field>
                                                            <Field label="Blackout Dates (YYYY-MM-DD, comma-separated)">
                                                                <input
                                                                    className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={Array.isArray(tierRow?.blackoutDates) ? tierRow.blackoutDates.join(", ") : ""}
                                                                    onChange={(e) => updatePricingTierEngineTier(activePricingCategory, tier.key, "blackoutDates", parseCommaList(e.target.value))}
                                                                    placeholder="2026-12-25, 2027-01-01"
                                                                />
                                                            </Field>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {activePricingCategory === "international" && (
                                            <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3 md:col-span-2">
                                                <p className="text-[12px] font-[700] text-[#111827]">International Dimensions Engine</p>
                                                <p className="text-[11px] text-[#64748B] mt-1">Enforce unit type, route class, handling class, and W2W option multipliers. Keys should match shipment inputs.</p>
                                                <div className="mt-2 flex flex-wrap gap-3">
                                                    <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activeInternationalDimensionsEngine?.enabled)}
                                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "internationalDimensionsEngine", "enabled", e.target.checked)}
                                                        />
                                                        Enable
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activeInternationalDimensionsEngine?.enforceForInternationalOnly)}
                                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "internationalDimensionsEngine", "enforceForInternationalOnly", e.target.checked)}
                                                        />
                                                        Enforce for International category only
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activeInternationalDimensionsEngine?.w2wOption?.enabled)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "internationalDimensionsEngine",
                                                                "w2wOption",
                                                                {
                                                                    ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                    enabled: e.target.checked,
                                                                },
                                                            )}
                                                        />
                                                        Enable W2W mode engine
                                                    </label>
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    <Field label="Unit Type Multipliers (key: value)">
                                                        <textarea
                                                            rows={5}
                                                            className="w-full rounded-[8px] border border-[#D1D5DB] px-2 py-2 text-[12px]"
                                                            value={formatMultiplierMapInput(activeInternationalDimensionsEngine?.unitTypeMultipliers || {})}
                                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "internationalDimensionsEngine", "unitTypeMultipliers", parseMultiplierMapInput(e.target.value))}
                                                            placeholder={"parcel: 1.0\npallet: 1.18\ncrate: 1.24"}
                                                        />
                                                    </Field>
                                                    <Field label="Route Class Multipliers (key: value)">
                                                        <textarea
                                                            rows={5}
                                                            className="w-full rounded-[8px] border border-[#D1D5DB] px-2 py-2 text-[12px]"
                                                            value={formatMultiplierMapInput(activeInternationalDimensionsEngine?.routeClassMultipliers || {})}
                                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "internationalDimensionsEngine", "routeClassMultipliers", parseMultiplierMapInput(e.target.value))}
                                                            placeholder={"standard: 1.0\nexpress_corridor: 1.12\nremote_corridor: 1.22"}
                                                        />
                                                    </Field>
                                                    <Field label="Handling Class Multipliers (key: value)">
                                                        <textarea
                                                            rows={5}
                                                            className="w-full rounded-[8px] border border-[#D1D5DB] px-2 py-2 text-[12px]"
                                                            value={formatMultiplierMapInput(activeInternationalDimensionsEngine?.handlingClassMultipliers || {})}
                                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "internationalDimensionsEngine", "handlingClassMultipliers", parseMultiplierMapInput(e.target.value))}
                                                            placeholder={"standard: 1.0\nfragile: 1.08\nhazardous: 1.2"}
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="mt-3 rounded-[8px] border border-[#E5E7EB] p-3">
                                                    <p className="text-[11px] font-[700] text-[#111827]">W2W Option Policy</p>
                                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                        <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(activeInternationalDimensionsEngine?.w2wOption?.strictForInternational)}
                                                                onChange={(e) => updatePricingPolicyModule(
                                                                    activePricingCategory,
                                                                    "internationalDimensionsEngine",
                                                                    "w2wOption",
                                                                    {
                                                                        ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                        strictForInternational: e.target.checked,
                                                                    },
                                                                )}
                                                            />
                                                            Strict for international
                                                        </label>
                                                        <Field label="Default Mode">
                                                            <input
                                                                className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={String(activeInternationalDimensionsEngine?.w2wOption?.defaultMode || "")}
                                                                onChange={(e) => updatePricingPolicyModule(
                                                                    activePricingCategory,
                                                                    "internationalDimensionsEngine",
                                                                    "w2wOption",
                                                                    {
                                                                        ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                        defaultMode: String(e.target.value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
                                                                    },
                                                                )}
                                                            />
                                                        </Field>
                                                        <Field label="Min Unit Count">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                step="1"
                                                                className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={Number(activeInternationalDimensionsEngine?.w2wOption?.minimumUnitCount || 1)}
                                                                onChange={(e) => updatePricingPolicyModule(
                                                                    activePricingCategory,
                                                                    "internationalDimensionsEngine",
                                                                    "w2wOption",
                                                                    {
                                                                        ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                        minimumUnitCount: Number(e.target.value || 1),
                                                                    },
                                                                )}
                                                            />
                                                        </Field>
                                                        <Field label="Max Unit Count (optional)">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                step="1"
                                                                className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={activeInternationalDimensionsEngine?.w2wOption?.maximumUnitCount === null || activeInternationalDimensionsEngine?.w2wOption?.maximumUnitCount === undefined ? "" : Number(activeInternationalDimensionsEngine?.w2wOption?.maximumUnitCount || 1)}
                                                                onChange={(e) => updatePricingPolicyModule(
                                                                    activePricingCategory,
                                                                    "internationalDimensionsEngine",
                                                                    "w2wOption",
                                                                    {
                                                                        ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                        maximumUnitCount: e.target.value === "" ? null : Number(e.target.value || 1),
                                                                    },
                                                                )}
                                                            />
                                                        </Field>
                                                    </div>
                                                    <Field label="W2W Mode Multipliers (key: value)">
                                                        <textarea
                                                            rows={4}
                                                            className="w-full rounded-[8px] border border-[#D1D5DB] px-2 py-2 text-[12px]"
                                                            value={formatMultiplierMapInput(activeInternationalDimensionsEngine?.w2wOption?.modeMultipliers || {})}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "internationalDimensionsEngine",
                                                                "w2wOption",
                                                                {
                                                                    ...(activeInternationalDimensionsEngine?.w2wOption || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].internationalDimensionsEngine.w2wOption),
                                                                    modeMultipliers: parseMultiplierMapInput(e.target.value),
                                                                },
                                                            )}
                                                            placeholder={"door_to_door: 1.15\nport_to_port: 0.92\nhybrid: 1.0"}
                                                        />
                                                    </Field>
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
                                            <p className="text-[12px] font-[700] text-[#111827]">Remote Area Surcharge</p>
                                            <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingPolicyModules.remoteAreaSurcharge?.enabled)}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "enabled", e.target.checked)}
                                                />
                                                Enable
                                            </label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <Field label="Flat Fee">
                                                    <input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.remoteAreaSurcharge?.flatFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "flatFee", Number(e.target.value || 0))} />
                                                </Field>
                                                <div className="grid grid-cols-1 gap-1">
                                                    <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                        <input type="checkbox" checked={Boolean(activePricingPolicyModules.remoteAreaSurcharge?.applyOnOrigin)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "applyOnOrigin", e.target.checked)} />
                                                        Apply on origin
                                                    </label>
                                                    <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                        <input type="checkbox" checked={Boolean(activePricingPolicyModules.remoteAreaSurcharge?.applyOnDestination)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "applyOnDestination", e.target.checked)} />
                                                        Apply on destination
                                                    </label>
                                                </div>
                                            </div>
                                            <Field label="Postal Prefixes (comma-separated)">
                                                <input
                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={(activePricingPolicyModules.remoteAreaSurcharge?.postalCodePrefixes || []).join(", ")}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "postalCodePrefixes", parseCommaList(e.target.value, (item) => item.toUpperCase()))}
                                                    placeholder="81, 82"
                                                />
                                            </Field>
                                            <Field label="City Keywords (comma-separated)">
                                                <input
                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={(activePricingPolicyModules.remoteAreaSurcharge?.cityKeywords || []).join(", ")}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "remoteAreaSurcharge", "cityKeywords", parseCommaList(e.target.value, (item) => item.toLowerCase()))}
                                                    placeholder="rural, mountain"
                                                />
                                            </Field>
                                        </div>

                                        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
                                            <p className="text-[12px] font-[700] text-[#111827]">Oversize / Overweight Rules</p>
                                            <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingPolicyModules.oversizeOverweightRules?.enabled)}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "enabled", e.target.checked)}
                                                />
                                                Enable
                                            </label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <Field label="Max Weight (kg)"><input type="number" min={0.1} step="0.1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.maxWeightKg || 25)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "maxWeightKg", Number(e.target.value || 25))} /></Field>
                                                <Field label="Overweight Fee / kg"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.overweightPerKgFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "overweightPerKgFee", Number(e.target.value || 0))} /></Field>
                                                <Field label="Max Length (cm)"><input type="number" min={1} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.maxLengthCm || 120)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "maxLengthCm", Number(e.target.value || 120))} /></Field>
                                                <Field label="Max Width (cm)"><input type="number" min={1} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.maxWidthCm || 80)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "maxWidthCm", Number(e.target.value || 80))} /></Field>
                                                <Field label="Max Height (cm)"><input type="number" min={1} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.maxHeightCm || 80)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "maxHeightCm", Number(e.target.value || 80))} /></Field>
                                                <Field label="Oversize Flat Fee"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.oversizeOverweightRules?.oversizeFlatFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "oversizeOverweightRules", "oversizeFlatFee", Number(e.target.value || 0))} /></Field>
                                            </div>
                                        </div>

                                        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
                                            <p className="text-[12px] font-[700] text-[#111827]">Peak Hour / Holiday Surcharges</p>
                                            <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingPolicyModules.peakHolidaySurcharge?.enabled)}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "enabled", e.target.checked)}
                                                />
                                                Enable
                                            </label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <Field label="Peak Start"><input type="time" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={String(activePricingPolicyModules.peakHolidaySurcharge?.peakStartTime || "17:00")} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "peakStartTime", e.target.value)} /></Field>
                                                <Field label="Peak End"><input type="time" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={String(activePricingPolicyModules.peakHolidaySurcharge?.peakEndTime || "21:00")} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "peakEndTime", e.target.value)} /></Field>
                                                <Field label="Peak %"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.peakHolidaySurcharge?.peakPercent || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "peakPercent", Number(e.target.value || 0))} /></Field>
                                                <Field label="Peak Flat Fee"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.peakHolidaySurcharge?.peakFlatFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "peakFlatFee", Number(e.target.value || 0))} /></Field>
                                                <Field label="Holiday %"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.peakHolidaySurcharge?.holidayPercent || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "holidayPercent", Number(e.target.value || 0))} /></Field>
                                                <Field label="Holiday Flat Fee"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.peakHolidaySurcharge?.holidayFlatFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "holidayFlatFee", Number(e.target.value || 0))} /></Field>
                                            </div>
                                            <Field label="Holiday Dates (YYYY-MM-DD, comma-separated)">
                                                <input
                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={(activePricingPolicyModules.peakHolidaySurcharge?.holidayDates || []).join(", ")}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "peakHolidaySurcharge", "holidayDates", parseCommaList(e.target.value))}
                                                    placeholder="2026-12-25, 2027-01-01"
                                                />
                                            </Field>
                                        </div>

                                        {activePricingCategory === "domestic" && (
                                            <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
                                                <p className="text-[12px] font-[700] text-[#111827]">COD and Minimum Charge Guardrail</p>
                                                <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePricingPolicyModules.codFee?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(activePricingCategory, "codFee", "enabled", e.target.checked)}
                                                    />
                                                    Enable COD Fee
                                                </label>
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    <Field label="COD Flat Fee"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.codFee?.flatFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "codFee", "flatFee", Number(e.target.value || 0))} /></Field>
                                                    <Field label="COD % Declared"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.codFee?.percentOfDeclaredValue || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "codFee", "percentOfDeclaredValue", Number(e.target.value || 0))} /></Field>
                                                    <Field label="COD Min Fee"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.codFee?.minFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "codFee", "minFee", Number(e.target.value || 0))} /></Field>
                                                    <Field label="COD Max Fee (optional)"><input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={activePricingPolicyModules.codFee?.maxFee === null || activePricingPolicyModules.codFee?.maxFee === undefined ? "" : Number(activePricingPolicyModules.codFee?.maxFee || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "codFee", "maxFee", e.target.value === "" ? null : Number(e.target.value || 0))} /></Field>
                                                </div>
                                                <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePricingPolicyModules.minimumShipmentCharge?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(activePricingCategory, "minimumShipmentCharge", "enabled", e.target.checked)}
                                                    />
                                                    Enforce Minimum Shipment Charge
                                                </label>
                                                <Field label="Minimum Total">
                                                    <input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(activePricingPolicyModules.minimumShipmentCharge?.minimumTotal || 0)} onChange={(e) => updatePricingPolicyModule(activePricingCategory, "minimumShipmentCharge", "minimumTotal", Number(e.target.value || 0))} />
                                                </Field>
                                            </div>
                                        )}

                                        <div className="rounded-[8px] border border-[#E5E7EB] bg-white p-3">
                                            <p className="text-[12px] font-[700] text-[#111827]">Quote Runtime Governance Guardrails</p>
                                            <p className="mt-1 text-[11px] text-[#64748B]">Lock quote-critical fields and enforce discount/floor controls at booking runtime.</p>

                                            <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.enabled)}
                                                    onChange={(e) => updatePricingPolicyModule(activePricingCategory, "quoteRuntimeGovernance", "enabled", e.target.checked)}
                                                />
                                                Enable Quote Runtime Governance
                                            </label>

                                            <div className="mt-3 rounded-[8px] border border-[#E5E7EB] p-2">
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(
                                                            activePricingCategory,
                                                            "quoteRuntimeGovernance",
                                                            "fieldLocks",
                                                            {
                                                                ...(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.fieldLocks),
                                                                enabled: e.target.checked,
                                                            },
                                                        )}
                                                    />
                                                    Enable Field Locks
                                                </label>
                                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-[#334155]">
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks?.lockShipmentServiceLevel)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "fieldLocks",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.fieldLocks),
                                                                    lockShipmentServiceLevel: e.target.checked,
                                                                },
                                                            )}
                                                        />
                                                        Lock Shipment Service Level
                                                    </label>
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks?.lockPackageServiceLevel)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "fieldLocks",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.fieldLocks),
                                                                    lockPackageServiceLevel: e.target.checked,
                                                                },
                                                            )}
                                                        />
                                                        Lock Package Service Level
                                                    </label>
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks?.lockPackageCourierProvider)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "fieldLocks",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.fieldLocks),
                                                                    lockPackageCourierProvider: e.target.checked,
                                                                },
                                                            )}
                                                        />
                                                        Lock Package Courier Provider
                                                    </label>
                                                    <label className="inline-flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks?.lockQuoteTotal)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "fieldLocks",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.fieldLocks || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.fieldLocks),
                                                                    lockQuoteTotal: e.target.checked,
                                                                },
                                                            )}
                                                        />
                                                        Lock Review Quote Total
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="mt-3 rounded-[8px] border border-[#E5E7EB] p-2">
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(
                                                            activePricingCategory,
                                                            "quoteRuntimeGovernance",
                                                            "discountGuardrails",
                                                            {
                                                                ...(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.discountGuardrails),
                                                                enabled: e.target.checked,
                                                            },
                                                        )}
                                                    />
                                                    Enable Discount Ceiling Guardrails
                                                </label>
                                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <Field label="Max Discount (%)">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={Number(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails?.maxDiscountPercent || 0)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "discountGuardrails",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.discountGuardrails),
                                                                    maxDiscountPercent: Number(e.target.value || 0),
                                                                },
                                                            )}
                                                        />
                                                    </Field>
                                                    <Field label="Max Discount Amount (USD)">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={Number(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails?.maxDiscountAmountUsd || 0)}
                                                            onChange={(e) => updatePricingPolicyModule(
                                                                activePricingCategory,
                                                                "quoteRuntimeGovernance",
                                                                "discountGuardrails",
                                                                {
                                                                    ...(activePricingPolicyModules.quoteRuntimeGovernance?.discountGuardrails || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.discountGuardrails),
                                                                    maxDiscountAmountUsd: Number(e.target.value || 0),
                                                                },
                                                            )}
                                                        />
                                                    </Field>
                                                </div>
                                            </div>

                                            <div className="mt-3 rounded-[8px] border border-[#E5E7EB] p-2">
                                                <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePricingPolicyModules.quoteRuntimeGovernance?.floorPriceGuardrail?.enabled)}
                                                        onChange={(e) => updatePricingPolicyModule(
                                                            activePricingCategory,
                                                            "quoteRuntimeGovernance",
                                                            "floorPriceGuardrail",
                                                            {
                                                                ...(activePricingPolicyModules.quoteRuntimeGovernance?.floorPriceGuardrail || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.floorPriceGuardrail),
                                                                enabled: e.target.checked,
                                                            },
                                                        )}
                                                    />
                                                    Enable Floor Price Guardrail
                                                </label>
                                                <Field label="Minimum Total (USD)">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(activePricingPolicyModules.quoteRuntimeGovernance?.floorPriceGuardrail?.minimumTotalUsd || 0)}
                                                        onChange={(e) => updatePricingPolicyModule(
                                                            activePricingCategory,
                                                            "quoteRuntimeGovernance",
                                                            "floorPriceGuardrail",
                                                            {
                                                                ...(activePricingPolicyModules.quoteRuntimeGovernance?.floorPriceGuardrail || DEFAULT_SETTINGS.pricing.policyModules[activePricingCategory].quoteRuntimeGovernance.floorPriceGuardrail),
                                                                minimumTotalUsd: Number(e.target.value || 0),
                                                            },
                                                        )}
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "contracts" && (
                                <div id="pricing-topic-contracts" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-white scroll-mt-24">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[13px] font-[700] text-[#111827]">Customer Contract Pricing</p>
                                            <p className="text-[11px] text-[#64748B] mt-1">Configure account-level negotiated rates, effective ranges, renewal controls, and volume tiers.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                            onClick={() => {
                                                const existingContracts = Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts)
                                                    ? activePricingPolicyModules.customerContractPricing.contracts
                                                    : [];
                                                updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", [
                                                    ...existingContracts,
                                                    {
                                                        enabled: true,
                                                        priority: 0,
                                                        allAccounts: true,
                                                        accountUserIds: [],
                                                        category: activePricingCategory,
                                                        categories: [activePricingCategory],
                                                        effectiveFrom: "",
                                                        effectiveTo: "",
                                                        autoRenew: false,
                                                        renewalCycleDays: 30,
                                                        renewalGraceDays: 0,
                                                        maxRenewals: 0,
                                                        negotiatedRateType: "percent_off",
                                                        negotiatedRateValue: 0,
                                                        minimumTotal: 0,
                                                        volumeMetric: "shipment_count_30d",
                                                        volumeLookbackDays: 30,
                                                        volumeTiers: [],
                                                    },
                                                ]);
                                            }}
                                        >
                                            Add Contract
                                        </button>
                                    </div>

                                    <label className="mt-3 inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(activePricingPolicyModules.customerContractPricing?.enabled)}
                                            onChange={(e) => updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "enabled", e.target.checked)}
                                        />
                                        Enable Customer Contract Pricing
                                    </label>

                                    <div className="mt-3 space-y-3">
                                        {(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts)
                                            ? activePricingPolicyModules.customerContractPricing.contracts
                                            : []).map((contract, contractIndex) => {
                                                const contractRow = contract && typeof contract === "object" ? contract : {};
                                                const tiers = Array.isArray(contractRow.volumeTiers) ? contractRow.volumeTiers : [];

                                                return (
                                                    <div key={`contract-${activePricingCategory}-${contractIndex}`} className="rounded-[8px] border border-[#E5E7EB] p-3 bg-[#F8FAFC]">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[12px] font-[700] text-[#111827]">Contract #{contractIndex + 1}</p>
                                                            <button
                                                                type="button"
                                                                className="h-[26px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700]"
                                                                onClick={() => {
                                                                    const nextContracts = (Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts)
                                                                        ? activePricingPolicyModules.customerContractPricing.contracts
                                                                        : []).filter((_, idx) => idx !== contractIndex);
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(contractRow.enabled ?? true)}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, enabled: e.target.checked };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                                Active
                                                            </label>
                                                            <Field label="Priority">
                                                                <input
                                                                    type="number"
                                                                    step="1"
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={Number(contractRow.priority || 0)}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, priority: Number(e.target.value || 0) };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                            </Field>
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(contractRow.allAccounts)}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, allAccounts: e.target.checked };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                                Apply To All Accounts
                                                            </label>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            <Field label="Account User IDs (comma-separated)">
                                                                <input
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={Array.isArray(contractRow.accountUserIds) ? contractRow.accountUserIds.join(", ") : ""}
                                                                    onChange={(e) => {
                                                                        const parsedIds = parseCommaList(e.target.value)
                                                                            .map((value) => Number(value))
                                                                            .filter((value) => Number.isInteger(value) && value > 0);
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, accountUserIds: parsedIds };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                    placeholder="102, 204, 305"
                                                                />
                                                            </Field>
                                                            <Field label="Contract Category (Locked)">
                                                                <div className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] bg-[#F8FAFC] px-2 text-[12px] text-[#334155] flex items-center">
                                                                    {titleCase(activePricingCategory)}
                                                                </div>
                                                            </Field>
                                                            <Field label="Effective From">
                                                                <input
                                                                    type="date"
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={String(contractRow.effectiveFrom || "")}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, effectiveFrom: e.target.value };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                            </Field>
                                                            <Field label="Effective To">
                                                                <input
                                                                    type="date"
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={String(contractRow.effectiveTo || "")}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, effectiveTo: e.target.value };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                            </Field>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(contractRow.autoRenew)}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, autoRenew: e.target.checked };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                />
                                                                Auto Renew
                                                            </label>
                                                            <Field label="Renewal Cycle (days)">
                                                                <input type="number" min={0} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.renewalCycleDays || 0)} onChange={(e) => {
                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                    nextContracts[contractIndex] = { ...contractRow, renewalCycleDays: Number(e.target.value || 0) };
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }} />
                                                            </Field>
                                                            <Field label="Renewal Grace (days)">
                                                                <input type="number" min={0} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.renewalGraceDays || 0)} onChange={(e) => {
                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                    nextContracts[contractIndex] = { ...contractRow, renewalGraceDays: Number(e.target.value || 0) };
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }} />
                                                            </Field>
                                                            <Field label="Max Renewals (0 = unlimited)">
                                                                <input type="number" min={0} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.maxRenewals || 0)} onChange={(e) => {
                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                    nextContracts[contractIndex] = { ...contractRow, maxRenewals: Number(e.target.value || 0) };
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }} />
                                                            </Field>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                            <Field label="Negotiated Rate Type">
                                                                <select
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={String(contractRow.negotiatedRateType || "percent_off")}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, negotiatedRateType: e.target.value };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                >
                                                                    <option value="percent_off">Percent Off</option>
                                                                    <option value="flat_off">Flat Off</option>
                                                                    <option value="fixed_total">Fixed Total</option>
                                                                    <option value="multiplier">Multiplier</option>
                                                                </select>
                                                            </Field>
                                                            <Field label="Negotiated Value">
                                                                <input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.negotiatedRateValue || 0)} onChange={(e) => {
                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                    nextContracts[contractIndex] = { ...contractRow, negotiatedRateValue: Number(e.target.value || 0) };
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }} />
                                                            </Field>
                                                            <Field label="Contract Minimum Total">
                                                                <input type="number" min={0} step="0.01" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.minimumTotal || 0)} onChange={(e) => {
                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                    nextContracts[contractIndex] = { ...contractRow, minimumTotal: Number(e.target.value || 0) };
                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                }} />
                                                            </Field>
                                                            <Field label="Volume Metric">
                                                                <select
                                                                    className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                    value={String(contractRow.volumeMetric || "shipment_count_30d")}
                                                                    onChange={(e) => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        nextContracts[contractIndex] = { ...contractRow, volumeMetric: e.target.value };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                >
                                                                    <option value="shipment_count_30d">Shipment Count (30d)</option>
                                                                    <option value="total_weight_kg_30d">Total Weight KG (30d)</option>
                                                                    <option value="revenue_usd_30d">Revenue USD (30d)</option>
                                                                    <option value="current_shipment_weight_kg">Current Shipment Weight KG</option>
                                                                </select>
                                                            </Field>
                                                        </div>

                                                        <Field label="Volume Lookback Days">
                                                            <input type="number" min={1} step="1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(contractRow.volumeLookbackDays || 30)} onChange={(e) => {
                                                                const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                nextContracts[contractIndex] = { ...contractRow, volumeLookbackDays: Number(e.target.value || 30) };
                                                                updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                            }} />
                                                        </Field>

                                                        <div className="mt-2 rounded-[8px] border border-[#E5E7EB] bg-white p-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[11px] font-[700] text-[#334155]">Volume Tiers</p>
                                                                <button
                                                                    type="button"
                                                                    className="h-[24px] px-2 rounded-[6px] border border-[#0955AC] text-[#0955AC] text-[10px] font-[700]"
                                                                    onClick={() => {
                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                        const nextTiers = [...tiers, { enabled: true, minVolume: 0, maxVolume: null, adjustmentType: "percent_off", adjustmentValue: 0 }];
                                                                        nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                    }}
                                                                >
                                                                    Add Tier
                                                                </button>
                                                            </div>

                                                            <div className="mt-2 space-y-2">
                                                                {tiers.map((tier, tierIndex) => {
                                                                    const tierRow = tier && typeof tier === "object" ? tier : {};
                                                                    return (
                                                                        <div key={`tier-${contractIndex}-${tierIndex}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155] pb-1">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={Boolean(tierRow.enabled ?? true)}
                                                                                    onChange={(e) => {
                                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                        const nextTiers = [...tiers];
                                                                                        nextTiers[tierIndex] = { ...tierRow, enabled: e.target.checked };
                                                                                        nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                                    }}
                                                                                />
                                                                                Active
                                                                            </label>
                                                                            <Field label="Min Volume"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(tierRow.minVolume || 0)} onChange={(e) => {
                                                                                const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                const nextTiers = [...tiers];
                                                                                nextTiers[tierIndex] = { ...tierRow, minVolume: Number(e.target.value || 0) };
                                                                                nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                            }} /></Field>
                                                                            <Field label="Max Volume"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={tierRow.maxVolume === null || tierRow.maxVolume === undefined ? "" : Number(tierRow.maxVolume || 0)} onChange={(e) => {
                                                                                const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                const nextTiers = [...tiers];
                                                                                nextTiers[tierIndex] = { ...tierRow, maxVolume: e.target.value === "" ? null : Number(e.target.value || 0) };
                                                                                nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                            }} /></Field>
                                                                            <Field label="Adjustment Type">
                                                                                <select className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={String(tierRow.adjustmentType || "percent_off")} onChange={(e) => {
                                                                                    const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                    const nextTiers = [...tiers];
                                                                                    nextTiers[tierIndex] = { ...tierRow, adjustmentType: e.target.value };
                                                                                    nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                    updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                                }}>
                                                                                    <option value="percent_off">Percent Off</option>
                                                                                    <option value="flat_off">Flat Off</option>
                                                                                    <option value="fixed_total">Fixed Total</option>
                                                                                    <option value="multiplier">Multiplier</option>
                                                                                </select>
                                                                            </Field>
                                                                            <Field label="Adjustment Value"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(tierRow.adjustmentValue || 0)} onChange={(e) => {
                                                                                const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                const nextTiers = [...tiers];
                                                                                nextTiers[tierIndex] = { ...tierRow, adjustmentValue: Number(e.target.value || 0) };
                                                                                nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                            }} /></Field>
                                                                            <div className="flex items-end">
                                                                                <button
                                                                                    type="button"
                                                                                    className="h-[44px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[10px] font-[700]"
                                                                                    onClick={() => {
                                                                                        const nextContracts = [...(Array.isArray(activePricingPolicyModules.customerContractPricing?.contracts) ? activePricingPolicyModules.customerContractPricing.contracts : [])];
                                                                                        const nextTiers = tiers.filter((_, idx) => idx !== tierIndex);
                                                                                        nextContracts[contractIndex] = { ...contractRow, volumeTiers: nextTiers };
                                                                                        updatePricingPolicyModule(activePricingCategory, "customerContractPricing", "contracts", nextContracts);
                                                                                    }}
                                                                                >
                                                                                    Remove Tier
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "service-catalog" && (
                                <div id="pricing-topic-service-catalog" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-white scroll-mt-24">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[13px] font-[700] text-[#111827]">Service Catalog</p>
                                        <button
                                            type="button"
                                            className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                            onClick={() => addPricingServiceLevel(activePricingCategory)}
                                        >
                                            Add Service Level
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[#64748B] mt-1">Define explicit service-level policies with cutoff times and promised SLA for {titleCase(activePricingCategory)}.</p>
                                    <div className="mt-2 overflow-x-auto">
                                        <table className="w-full min-w-[920px] text-[12px]">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] text-left border border-[#E5E7EB]">
                                                    <th className="px-2 py-2">Key</th>
                                                    <th className="px-2 py-2">Label</th>
                                                    <th className="px-2 py-2">Promised SLA (days)</th>
                                                    <th className="px-2 py-2">Cutoff Time</th>
                                                    <th className="px-2 py-2">Active</th>
                                                    <th className="px-2 py-2">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeServiceCatalogRows.map((row, index) => (
                                                    <tr key={`${activePricingCategory}-service-${row?.key || index}`} className="border-x border-b border-[#E5E7EB]">
                                                        <td className="px-2 py-2">
                                                            <input
                                                                className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2"
                                                                value={String(row?.key || "")}
                                                                onChange={(e) => updatePricingServiceLevel(
                                                                    activePricingCategory,
                                                                    index,
                                                                    "key",
                                                                    String(e.target.value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
                                                                )}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2"><input className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={String(row?.label || "")} onChange={(e) => updatePricingServiceLevel(activePricingCategory, index, "label", e.target.value)} /></td>
                                                        <td className="px-2 py-2"><input type="number" min={1} className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={Number(row?.promisedSlaDays || 1)} onChange={(e) => updatePricingServiceLevel(activePricingCategory, index, "promisedSlaDays", Number(e.target.value || 1))} /></td>
                                                        <td className="px-2 py-2"><input type="time" className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] px-2" value={String(row?.cutoffTime || "18:00")} onChange={(e) => updatePricingServiceLevel(activePricingCategory, index, "cutoffTime", e.target.value)} /></td>
                                                        <td className="px-2 py-2">
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(row?.isActive)}
                                                                    onChange={(e) => updatePricingServiceLevel(activePricingCategory, index, "isActive", e.target.checked)}
                                                                />
                                                                Active
                                                            </label>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <button type="button" className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700]" onClick={() => removePricingServiceLevel(activePricingCategory, index)}>
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "governance" && (
                                <div id="pricing-topic-governance" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-[#F8FAFC] scroll-mt-24">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Pricing Governance</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(activePricingGovernance.requireApproval)}
                                                disabled={!canConfigurePricingGovernance}
                                                onChange={(e) => updatePricingGovernance(activePricingCategory, "requireApproval", e.target.checked)}
                                            />
                                            Require approval before publish
                                        </label>
                                        <Field label="Approver Roles">
                                            <div className="w-full rounded-[8px] border border-[#D1D5DB] bg-white p-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {governanceApproverRoleOptions.map((roleName) => {
                                                        const selectedRoles = Array.isArray(activePricingGovernance.approverRoles)
                                                            ? activePricingGovernance.approverRoles
                                                            : [];
                                                        const isSelected = selectedRoles.includes(roleName);

                                                        return (
                                                            <label
                                                                key={`governance-approver-${roleName}`}
                                                                className={`inline-flex items-center gap-1 rounded-[999px] border px-2 py-1 text-[11px] font-[700] ${isSelected ? "border-[#0955AC] bg-[#EFF6FF] text-[#0955AC]" : "border-[#E5E7EB] text-[#475569]"}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-[12px] w-[12px]"
                                                                    disabled={!canConfigurePricingGovernance}
                                                                    checked={isSelected}
                                                                    onChange={() => updatePricingGovernance(
                                                                        activePricingCategory,
                                                                        "approverRoles",
                                                                        toggleInArray(selectedRoles, roleName),
                                                                    )}
                                                                />
                                                                {roleName}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </Field>
                                        <Field label="Schedule Publish At">
                                            <input
                                                type="datetime-local"
                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                value={pricingPublishAt}
                                                onChange={(e) => setPricingPublishAt(e.target.value)}
                                            />
                                        </Field>
                                    </div>

                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <p className="text-[11px] text-[#475569]">Draft Version: {Number(activePricingGovernance.draftVersion || 1)}</p>
                                        <p className="text-[11px] text-[#475569]">Published Version: {Number(activePricingGovernance.publishedVersion || 1)}</p>
                                        <p className="text-[11px] text-[#475569]">Published At: {activePricingGovernance.publishedAt || "Not published"}</p>
                                        <p className="text-[11px] text-[#475569]">Pending Approval: {activePricingGovernance.pendingApproval ? "Yes" : "No"}</p>
                                        <p className="text-[11px] text-[#475569]">Approval Authority: {titleCase(activePricingApprovalAuthority)}</p>
                                    </div>

                                    <textarea
                                        rows={2}
                                        className="mt-2 w-full rounded-[8px] border border-[#D1D5DB] px-2 py-1 text-[12px]"
                                        placeholder="Optional governance note"
                                        value={pricingGovernanceNote}
                                        onChange={(e) => setPricingGovernanceNote(e.target.value)}
                                    />

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {canPublishPricingChanges && (
                                            <button
                                                type="button"
                                                disabled={pricingGovernanceActionBusy}
                                                className="h-[30px] px-3 rounded-[8px] bg-[#0F766E] text-white text-[11px] font-[700] disabled:opacity-50"
                                                onClick={() => runPricingGovernanceAction("pricing_publish_now")}
                                            >
                                                Publish Now
                                            </button>
                                        )}
                                        {canPublishPricingChanges && (
                                            <button
                                                type="button"
                                                disabled={pricingGovernanceActionBusy || !pricingPublishAt}
                                                className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700] disabled:opacity-50"
                                                onClick={() => runPricingGovernanceAction("pricing_schedule_publish", { effectiveAt: pricingPublishAt })}
                                            >
                                                Schedule Publish
                                            </button>
                                        )}
                                        {canReviewPricingPublish && (
                                            <button
                                                type="button"
                                                disabled={pricingGovernanceActionBusy || !activePricingGovernance.pendingApproval || pendingApprovalRequestedByCurrentActor}
                                                className="h-[30px] px-3 rounded-[8px] bg-[#0955AC] text-white text-[11px] font-[700] disabled:opacity-50"
                                                onClick={() => runPricingGovernanceAction("pricing_approve_publish")}
                                            >
                                                Approve Publish
                                            </button>
                                        )}
                                        {canReviewPricingPublish && (
                                            <button
                                                type="button"
                                                disabled={pricingGovernanceActionBusy || !activePricingGovernance.pendingApproval}
                                                className="h-[30px] px-3 rounded-[8px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700] disabled:opacity-50"
                                                onClick={() => runPricingGovernanceAction("pricing_reject_publish")}
                                            >
                                                Reject Publish
                                            </button>
                                        )}
                                        {canReviewPricingPublish && (
                                            <div className="inline-flex items-center gap-2">
                                                <select
                                                    className="h-[30px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                                    value={pricingRollbackVersion}
                                                    onChange={(e) => setPricingRollbackVersion(e.target.value)}
                                                >
                                                    <option value="">Previous Version</option>
                                                    {rollbackCandidates.map((entry) => (
                                                        <option key={`rollback-version-${entry.version}`} value={String(entry.version)}>
                                                            v{Number(entry.version)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    disabled={pricingGovernanceActionBusy || rollbackCandidates.length === 0}
                                                    className="h-[30px] px-3 rounded-[8px] border border-[#0F766E] text-[#0F766E] text-[11px] font-[700] disabled:opacity-50"
                                                    onClick={() => runPricingGovernanceAction("pricing_rollback_version", {
                                                        rollbackVersion: pricingRollbackVersion ? Number(pricingRollbackVersion) : null,
                                                    })}
                                                >
                                                    Rollback Version
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {pendingApprovalRequestedByCurrentActor && canReviewPricingPublish && (
                                        <p className="mt-2 text-[11px] text-[#B45309]">Four-eyes control: requester cannot approve their own publish request.</p>
                                    )}
                                    {isSuperAdminPricingAuthority && (
                                        <p className="mt-2 text-[11px] text-[#1E3A8A]">Approval, rejection, and rollback are delegated to SuperAdmin for this pricing category.</p>
                                    )}
                                    {!canPublishPricingChanges && !canReviewPricingPublish && (
                                        <p className="mt-2 text-[11px] text-[#6B7280]">You do not have permission to run pricing governance actions.</p>
                                    )}

                                    <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white max-h-[180px] overflow-y-auto">
                                        <p className="text-[12px] font-[700] text-[#111827] mb-1">Pricing Audit Trail</p>
                                        {(activePricingGovernance.changeLog || []).length === 0 && (
                                            <p className="text-[11px] text-[#6B7280]">No governance events yet.</p>
                                        )}
                                        {(activePricingGovernance.changeLog || []).map((entry, idx) => (
                                            <p key={`pricing-log-${idx}`} className="text-[11px] text-[#475569] mb-1">
                                                {String(entry?.at || "-")} • {titleCase(String(entry?.event || "event"))}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "rate-cards" && (
                                <div id="pricing-topic-rate-cards" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-white scroll-mt-24">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[13px] font-[700] text-[#111827]">Rate Cards</p>
                                        <span className="inline-flex items-center h-[28px] px-3 rounded-[999px] bg-[#EFF6FF] text-[#1E3A8A] text-[11px] font-[700]">
                                            {titleCase(activePricingCategory)}
                                        </span>
                                    </div>
                                    <div className="mt-2 overflow-x-auto">
                                        <table className="w-max min-w-[1100px] text-[11px]">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] text-left border border-[#E5E7EB]">
                                                    <th className="px-2 py-2 min-w-[140px]">Label</th>
                                                    <th className="px-2 py-2 min-w-[180px]">Service Level</th>
                                                    <th className="px-2 py-2 min-w-[90px]">SLA Days</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Base Price</th>
                                                    <th className="px-2 py-2 min-w-[90px]">Per Kg</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Min Price</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Priority Mult.</th>
                                                    <th className="px-2 py-2 min-w-[80px]">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activePricingRows.map((row, index) => (
                                                    <tr key={`${activePricingCategory}-${row?.id || index}`} className="border-x border-b border-[#E5E7EB]">
                                                        <td className="px-2 py-3"><input className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={String(row?.label || "")} onChange={(e) => updatePricingTier(activePricingCategory, index, "label", e.target.value)} /></td>
                                                        <td className="px-2 py-3 min-w-[180px]">
                                                            <select
                                                                className="h-[44px] w-full min-w-[160px] rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A]"
                                                                value={String(row?.serviceLevelKey || activeServiceLevelOptions[0]?.key || "")}
                                                                onChange={(e) => updatePricingTier(activePricingCategory, index, "serviceLevelKey", e.target.value)}
                                                            >
                                                                {activeServiceLevelOptions.map((option) => (
                                                                    <option key={`${activePricingCategory}-tier-service-${option.key}`} value={option.key}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-3"><input type="number" min={1} className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.slaDays || 1)} onChange={(e) => updatePricingTier(activePricingCategory, index, "slaDays", Number(e.target.value || 1))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.basePrice || 0)} onChange={(e) => updatePricingTier(activePricingCategory, index, "basePrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.perKgPrice || 0)} onChange={(e) => updatePricingTier(activePricingCategory, index, "perKgPrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.minPrice || 0)} onChange={(e) => updatePricingTier(activePricingCategory, index, "minPrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0.1} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.priorityMultiplier || 1)} onChange={(e) => updatePricingTier(activePricingCategory, index, "priorityMultiplier", Number(e.target.value || 1))} /></td>
                                                        <td className="px-2 py-3">
                                                            <button type="button" className="h-[44px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700]" onClick={() => removePricingTier(activePricingCategory, index)}>
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-2">
                                        <button type="button" className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]" onClick={() => addPricingTier(activePricingCategory)}>
                                            Add Tier
                                        </button>
                                    </div>

                                    <div className="mt-4 border border-[#E2E8F0] rounded-[10px] p-3 bg-[#F8FAFC]">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="text-[13px] font-[700] text-[#111827]">Bulk Import (Advanced)</p>
                                                <p className="text-[11px] text-[#64748B] mt-1">Upload XLSX, CSV, JSON, or PDF pricing files. System auto-detects structure, scores confidence, and flags mapping conflicts.</p>
                                            </div>
                                            <div className="inline-flex items-center gap-2">
                                                <select
                                                    className="h-[30px] rounded-[8px] border border-[#CBD5E1] px-2 text-[11px]"
                                                    value={pricingImportMode}
                                                    onChange={(e) => setPricingImportMode(e.target.value)}
                                                >
                                                    <option value="replace">Replace {titleCase(activePricingCategory)} Draft</option>
                                                    <option value="merge">Merge Into {titleCase(activePricingCategory)} Draft</option>
                                                </select>
                                                <select
                                                    className="h-[30px] rounded-[8px] border border-[#CBD5E1] px-2 text-[11px]"
                                                    value={pricingImportResolutionStrategy}
                                                    onChange={(e) => setPricingImportResolutionStrategy(e.target.value)}
                                                >
                                                    <option value="prefer_most_frequent">Conflicts: Prefer Most Frequent Zone</option>
                                                    <option value="prefer_existing">Conflicts: Prefer Existing City Mapping</option>
                                                    <option value="manual">Conflicts: Manual City Mapping</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    disabled={pricingImportPreviewBusy || pricingImportApplyBusy}
                                                    className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700] disabled:opacity-50"
                                                    onClick={previewPricingImport}
                                                >
                                                    {pricingImportPreviewBusy ? "Analyzing..." : "Analyze Import"}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={pricingImportApplyBusy || !pricingImportResult?.patch || !pricingImportPreviewToken || (pricingImportResult?.requiresManualReview && !pricingImportManualReviewConfirmed)}
                                                    className="h-[30px] px-3 rounded-[8px] bg-[#0F766E] text-white text-[11px] font-[700] disabled:opacity-50"
                                                    onClick={applyPricingImportToDraft}
                                                >
                                                    {pricingImportApplyBusy ? "Applying..." : "Apply To Draft"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <input
                                                key={`pricing-import-file-${activePricingCategory}`}
                                                type="file"
                                                accept=".xlsx,.xls,.csv,.txt,.json,.pdf"
                                                className="block w-full md:w-[420px] text-[11px] text-[#334155] file:mr-2 file:rounded-[6px] file:border file:border-[#CBD5E1] file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-[600] file:text-[#334155]"
                                                onChange={(e) => {
                                                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                                    setPricingImportFile(file);
                                                    setPricingImportResult(null);
                                                    setPricingImportPreviewToken("");
                                                    setPricingImportManualReviewConfirmed(false);
                                                    setPricingImportManualResolutions({});
                                                }}
                                            />
                                            {pricingImportFile && (
                                                <span className="inline-flex items-center rounded-[999px] bg-white border border-[#CBD5E1] px-2 py-1 text-[11px] font-[700] text-[#334155]">
                                                    {pricingImportFile.name}
                                                </span>
                                            )}
                                        </div>

                                        {pricingImportResult && (
                                            <div className="mt-3 border border-[#E2E8F0] rounded-[8px] p-3 bg-white">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                    <div className="rounded-[8px] border border-[#E2E8F0] px-2 py-2">
                                                        <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Detected</p>
                                                        <p className="text-[12px] font-[700] text-[#0F172A] mt-1">{String(pricingImportResult?.detectedFormat || "unknown").toUpperCase()}</p>
                                                    </div>
                                                    <div className="rounded-[8px] border border-[#E2E8F0] px-2 py-2">
                                                        <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Confidence</p>
                                                        <p className="text-[12px] font-[700] text-[#0F172A] mt-1">{Math.round(Number(pricingImportResult?.confidence || 0) * 100)}%</p>
                                                    </div>
                                                    <div className="rounded-[8px] border border-[#E2E8F0] px-2 py-2">
                                                        <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Rows Parsed</p>
                                                        <p className="text-[12px] font-[700] text-[#0F172A] mt-1">{Number(pricingImportResult?.rowsParsed || 0)} / {Number(pricingImportResult?.rowsScanned || 0)}</p>
                                                    </div>
                                                    <div className="rounded-[8px] border border-[#E2E8F0] px-2 py-2">
                                                        <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Patch Size</p>
                                                        <p className="text-[12px] font-[700] text-[#0F172A] mt-1">
                                                            {Number(pricingImportResult?.summary?.zoneCount || 0)} zones, {Number(pricingImportResult?.summary?.categoryCount || 0)} tiers, {Number(pricingImportResult?.summary?.laneCount || 0)} lanes
                                                        </p>
                                                    </div>
                                                </div>

                                                {pricingImportResult?.requiresManualReview && (
                                                    <div className="mt-2 rounded-[8px] border border-[#FCD34D] bg-[#FFFBEB] px-2 py-2">
                                                        <p className="text-[11px] text-[#92400E] font-[700]">Manual review required before apply</p>
                                                        <p className="mt-1 text-[11px] text-[#92400E]">Low confidence or conflicts were detected. Confirm review after checking sample rows, warnings, and conflict mappings.</p>
                                                        {String(pricingImportResult?.detectedFormat || "").toLowerCase() === "pdf" && (
                                                            <p className="mt-1 text-[11px] text-[#92400E]">Best practice for PDF: correct extracted rows in XLSX/CSV and re-import before final apply.</p>
                                                        )}
                                                        <label className="mt-2 inline-flex items-center gap-2 text-[11px] text-[#78350F] font-[700]">
                                                            <input
                                                                type="checkbox"
                                                                className="h-3.5 w-3.5 rounded border border-[#D97706]"
                                                                checked={pricingImportManualReviewConfirmed}
                                                                onChange={(e) => setPricingImportManualReviewConfirmed(Boolean(e.target.checked))}
                                                            />
                                                            I reviewed conflicts/warnings and confirm this import is ready to apply.
                                                        </label>
                                                    </div>
                                                )}

                                                {(pricingImportResult?.conflicts || []).length > 0 && (
                                                    <div className="mt-2 rounded-[8px] border border-[#FCA5A5] bg-[#FEF2F2] p-2">
                                                        <p className="text-[11px] font-[700] text-[#991B1B]">Conflicts</p>
                                                        <p className="text-[11px] text-[#7F1D1D] mt-1">
                                                            Strategy: {pricingImportResolutionStrategy === "manual"
                                                                ? "Manual city mapping"
                                                                : pricingImportResolutionStrategy === "prefer_existing"
                                                                    ? "Prefer existing saved city mapping"
                                                                    : "Prefer most frequent imported zone"}
                                                        </p>
                                                        {(pricingImportResult?.conflicts || []).slice(0, 8).map((conflict, idx) => {
                                                            const cityKey = normalizeImportCityKey(conflict?.cityKey || conflict?.city || "");
                                                            const selectedZone = pricingImportManualResolutions[cityKey] || "";

                                                            return (
                                                                <div key={`import-conflict-${idx}`} className="mt-2 rounded-[6px] border border-[#FECACA] bg-white px-2 py-2">
                                                                    <p className="text-[11px] text-[#7F1D1D] font-[700]">
                                                                        {String(conflict?.city || conflict?.cityKey || "City")}
                                                                    </p>
                                                                    <p className="text-[11px] text-[#7F1D1D] mt-1">
                                                                        {Array.isArray(conflict?.zones) ? `Zones: ${conflict.zones.join(", ")}` : "Multiple zones detected"}
                                                                    </p>
                                                                    {conflict?.zoneVotes && typeof conflict.zoneVotes === "object" && (
                                                                        <p className="text-[11px] text-[#7F1D1D] mt-1">
                                                                            Votes: {Object.entries(conflict.zoneVotes)
                                                                                .map(([zoneKey, count]) => `${zoneKey}=${Number(count || 0)}`)
                                                                                .join(", ")}
                                                                        </p>
                                                                    )}
                                                                    {pricingImportResolutionStrategy === "manual" && (
                                                                        <div className="mt-2 inline-flex items-center gap-2">
                                                                            <span className="text-[11px] font-[700] text-[#7F1D1D]">Select zone</span>
                                                                            <select
                                                                                className="h-[28px] rounded-[6px] border border-[#FCA5A5] bg-white px-2 text-[11px]"
                                                                                value={selectedZone}
                                                                                onChange={(e) => {
                                                                                    const value = String(e.target.value || "");
                                                                                    if (!cityKey) {
                                                                                        return;
                                                                                    }

                                                                                    setPricingImportManualResolutions((prev) => ({
                                                                                        ...prev,
                                                                                        [cityKey]: value,
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                <option value="">Select zone</option>
                                                                                {(Array.isArray(conflict?.zones) ? conflict.zones : []).map((zoneOption) => (
                                                                                    <option key={`conflict-zone-option-${cityKey}-${zoneOption}`} value={String(zoneOption)}>{String(zoneOption)}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {(pricingImportResult?.warnings || []).length > 0 && (
                                                    <div className="mt-2 rounded-[8px] border border-[#FCD34D] bg-[#FFFBEB] p-2">
                                                        <p className="text-[11px] font-[700] text-[#92400E]">Warnings</p>
                                                        {(pricingImportResult?.warnings || []).slice(0, 4).map((warning, idx) => (
                                                            <p key={`import-warning-${idx}`} className="text-[11px] text-[#92400E] mt-1">{String(warning || "")}</p>
                                                        ))}
                                                    </div>
                                                )}

                                                {(pricingImportResult?.sampleRows || []).length > 0 && (
                                                    <div className="mt-2 rounded-[8px] border border-[#E2E8F0] p-2">
                                                        <p className="text-[11px] font-[700] text-[#111827]">Parsed Row Sample</p>
                                                        <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {(pricingImportResult?.sampleRows || []).slice(0, 4).map((sample, idx) => (
                                                                <div key={`import-sample-${idx}`} className="rounded-[6px] bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0]">
                                                                    <p className="text-[11px] text-[#334155]">City: {String(sample?.city || "-")}</p>
                                                                    <p className="text-[11px] text-[#334155]">Zone: {String(sample?.zone || "-")}</p>
                                                                    <p className="text-[11px] text-[#334155]">Service: {String(sample?.serviceLevelKey || "-")}</p>
                                                                    <p className="text-[11px] text-[#334155]">Base: {sample?.basePrice ?? "-"} • Per Kg: {sample?.perKgPrice ?? "-"}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {pricingImportResult?.appliedSummary && (
                                                    <p className="mt-2 text-[11px] text-[#0F766E] font-[700]">
                                                        Applied in {String(pricingImportResult.appliedSummary.mode || pricingImportMode)} mode: {Number(pricingImportResult.appliedSummary.zoneCount || 0)} zones, {Number(pricingImportResult.appliedSummary.categoryCount || 0)} tiers, {Number(pricingImportResult.appliedSummary.laneCount || 0)} lanes.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "zone-master" && (
                                <div id="pricing-topic-zone-master" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-white scroll-mt-24">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[13px] font-[700] text-[#111827]">Zone Master ({titleCase(activePricingCategory)})</p>
                                            <p className="text-[11px] text-[#64748B] mt-1">Define category-specific zones for {titleCase(activePricingCategory)} lane rules.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                className="h-[32px] w-[220px] rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]"
                                                value={pricingZoneDraft}
                                                placeholder="Add zone label"
                                                onChange={(e) => setPricingZoneDraft(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                                onClick={() => addPricingZone(activePricingCategory)}
                                            >
                                                Add Zone
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-2 overflow-x-auto">
                                        <table className="w-full min-w-[560px] text-[12px]">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] text-left border border-[#E5E7EB]">
                                                    <th className="px-2 py-2">Zone Label</th>
                                                    <th className="px-2 py-2">Zone Key</th>
                                                    <th className="px-2 py-2">Active</th>
                                                    <th className="px-2 py-2">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activePricingZones.map((zone, index) => (
                                                    <tr key={`zone-master-${zone?.key || index}`} className="border-x border-b border-[#E5E7EB]">
                                                        <td className="px-2 py-2">
                                                            <input
                                                                className="h-[32px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]"
                                                                value={String(zone?.label || "")}
                                                                onChange={(e) => updatePricingZone(activePricingCategory, index, "label", e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <span className="inline-flex h-[32px] items-center rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] px-2 text-[11px] font-[700] text-[#334155]">{String(zone?.key || "")}</span>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(zone?.isActive)}
                                                                    onChange={(e) => updatePricingZone(activePricingCategory, index, "isActive", e.target.checked)}
                                                                />
                                                                Active
                                                            </label>
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <button
                                                                type="button"
                                                                className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700]"
                                                                onClick={() => removePricingZone(activePricingCategory, index)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "lane-matrix" && (
                                <div id="pricing-topic-lane-matrix" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-white scroll-mt-24">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-[13px] font-[700] text-[#111827]">Lane Matrix Pricing</p>
                                        <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                            <input
                                                type="checkbox"
                                                checked={activeLaneEnabled}
                                                onChange={(e) => updatePricingLaneMatrix(activePricingCategory, "enabled", e.target.checked)}
                                            />
                                            Enable lane-based pricing enforcement
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-[#64748B] mt-1">When enabled, booking runtime requires a matching lane rule by origin zone, destination zone, service level, and distance band (if configured).</p>

                                    <div className="mt-2 overflow-x-auto">
                                        <table className="w-max min-w-[2100px] text-[11px]">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] text-left border border-[#E5E7EB]">
                                                    <th className="px-2 py-2 min-w-[160px]">Origin Zone</th>
                                                    <th className="px-2 py-2 min-w-[160px]">Destination Zone</th>
                                                    <th className="px-2 py-2 min-w-[160px]">Service Level</th>
                                                    <th className="px-2 py-2 min-w-[130px]">Distance From (km)</th>
                                                    <th className="px-2 py-2 min-w-[130px]">Distance To (km)</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Included Km</th>
                                                    <th className="px-2 py-2 min-w-[90px]">Per Km</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Distance Fee</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Distance Mult.</th>
                                                    <th className="px-2 py-2 min-w-[100px]">Base Price</th>
                                                    <th className="px-2 py-2 min-w-[90px]">Per Kg</th>
                                                    <th className="px-2 py-2 min-w-[100px]">Min Price</th>
                                                    <th className="px-2 py-2 min-w-[110px]">Priority Mult.</th>
                                                    <th className="px-2 py-2 min-w-[70px]">Active</th>
                                                    <th className="px-2 py-2 min-w-[80px]">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeLaneRows.map((row, index) => (
                                                    <tr key={`${activePricingCategory}-lane-${row?.id || index}`} className="border-x border-b border-[#E5E7EB]">
                                                        <td className="px-2 py-3 min-w-[160px]">
                                                            <select
                                                                className="h-[44px] w-full min-w-[140px] rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A]"
                                                                value={String(row?.originZone || "*")}
                                                                onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "originZone", String(e.target.value || "*"))}
                                                            >
                                                                {activeZoneOptions.map((option) => (
                                                                    <option key={`${activePricingCategory}-origin-zone-${option.key}`} value={option.key}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-3 min-w-[160px]">
                                                            <select
                                                                className="h-[44px] w-full min-w-[140px] rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A]"
                                                                value={String(row?.destinationZone || "*")}
                                                                onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "destinationZone", String(e.target.value || "*"))}
                                                            >
                                                                {activeZoneOptions.map((option) => (
                                                                    <option key={`${activePricingCategory}-destination-zone-${option.key}`} value={option.key}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-3 min-w-[160px]">
                                                            <select
                                                                className="h-[44px] w-full min-w-[140px] rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A]"
                                                                value={String(row?.serviceLevelKey || activeServiceLevelOptions[0]?.key || "")}
                                                                onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "serviceLevelKey", e.target.value)}
                                                            >
                                                                {activeServiceLevelOptions.map((option) => (
                                                                    <option key={`${activePricingCategory}-lane-service-${option.key}`} value={option.key}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.1" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.distanceFromKm || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "distanceFromKm", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.1" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={row?.distanceToKm === null || row?.distanceToKm === undefined || row?.distanceToKm === "" ? "" : Number(row?.distanceToKm || 0)} placeholder="No limit" onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "distanceToKm", e.target.value === "" ? null : Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.1" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.distanceBaseKm || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "distanceBaseKm", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.perKmPrice || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "perKmPrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.distanceSurcharge || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "distanceSurcharge", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0.1} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.distanceMultiplier || 1)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "distanceMultiplier", Number(e.target.value || 1))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.basePrice || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "basePrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.perKgPrice || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "perKgPrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.minPrice || 0)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "minPrice", Number(e.target.value || 0))} /></td>
                                                        <td className="px-2 py-3"><input type="number" min={0.1} step="0.01" className="h-[44px] w-full rounded-[8px] border border-[#D1D5DB] bg-white px-2 text-[#0F172A] placeholder:text-[#94A3B8]" value={Number(row?.priorityMultiplier || 1)} onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "priorityMultiplier", Number(e.target.value || 1))} /></td>
                                                        <td className="px-2 py-3">
                                                            <label className="inline-flex items-center gap-2 text-[11px] font-[700] text-[#334155]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(row?.isActive)}
                                                                    onChange={(e) => updatePricingLaneRule(activePricingCategory, index, "isActive", e.target.checked)}
                                                                />
                                                                Active
                                                            </label>
                                                        </td>
                                                        <td className="px-2 py-3">
                                                            <button type="button" className="h-[44px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700]" onClick={() => removePricingLaneRule(activePricingCategory, index)}>
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-2">
                                        <button type="button" className="h-[30px] px-3 rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]" onClick={() => addPricingLaneRule(activePricingCategory)}>
                                            Add Lane Rule
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activePricingTopic === "preview" && (
                                <div id="pricing-topic-preview" className="mt-4 border border-[#E5E7EB] rounded-[10px] p-3 bg-[#F8FAFC] scroll-mt-24">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Formula Validation Preview</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <Field label="Weight (kg)"><input type="number" min={0.1} step="0.1" className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(pricingPreviewInput.weightKg || 0)} onChange={(e) => setPricingPreviewInput((prev) => ({ ...prev, weightKg: Number(e.target.value || 0) }))} /></Field>
                                        <Field label="Length (cm)"><input type="number" min={1} className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(pricingPreviewInput.lengthCm || 0)} onChange={(e) => setPricingPreviewInput((prev) => ({ ...prev, lengthCm: Number(e.target.value || 0) }))} /></Field>
                                        <Field label="Width (cm)"><input type="number" min={1} className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(pricingPreviewInput.widthCm || 0)} onChange={(e) => setPricingPreviewInput((prev) => ({ ...prev, widthCm: Number(e.target.value || 0) }))} /></Field>
                                        <Field label="Height (cm)"><input type="number" min={1} className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]" value={Number(pricingPreviewInput.heightCm || 0)} onChange={(e) => setPricingPreviewInput((prev) => ({ ...prev, heightCm: Number(e.target.value || 0) }))} /></Field>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                        {pricingPreviewRows.map((row) => (
                                            <div key={`preview-${row.id}`} className="border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827]">{row.label} ({row.slaDays} day{row.slaDays > 1 ? "s" : ""})</p>
                                                <p className="text-[11px] text-[#475569] mt-1">Service Level: {row.serviceLevelLabel} • Cutoff {row.cutoffTime}</p>
                                                <p className="text-[11px] text-[#475569] mt-1">Chargeable Weight: {row.chargeableWeight} kg</p>
                                                <p className="text-[11px] text-[#475569] mt-1">Base Currency Total: {formatMoney(row.totalBaseCurrency, activePricingLocalization.baseCurrency, activePricingLocalization.locale)}</p>
                                                <p className="text-[12px] font-[700] text-[#0F172A] mt-1">Display Total: {formatMoney(row.totalDisplayCurrency, activePricingLocalization.displayCurrency, activePricingLocalization.locale)}</p>
                                            </div>
                                        ))}
                                        {pricingPreviewRows.length === 0 && (
                                            <p className="text-[11px] text-[#6B7280]">No pricing tiers configured for this category.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            </div>
                        </SectionCard>
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
                <div className="bg-white rounded-[10px] p-4 h-fit" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    <p className="text-[12px] text-[#6B7280] font-[700] uppercase tracking-wide mb-3">Team Access Topics</p>
                    <div className="space-y-2">
                        {TEAM_ACCESS_TOPIC_CONFIG.map((topic) => (
                            <button
                                key={topic.key}
                                type="button"
                                onClick={() => navigateTeamAccessTopic(topic.key)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-left text-[13px] font-[700] transition-colors ${activeTeamAccessTopic === topic.key
                                        ? "bg-[#0955AC] text-white"
                                        : "bg-[#F3F4F6] text-[#374151]"
                                    }`}
                            >
                                <span>{topic.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <SectionCard title="Team Access Control" description="Set role powers for key operational decisions.">
                    {activeTeamAccessTopic === "policy-controls" && (
                        <div className="space-y-4">
                            <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-[#FAFBFD]">
                                <button
                                    type="button"
                                    onClick={() => toggleTeamPolicyPanel("basic")}
                                    className="w-full flex items-center justify-between gap-3 text-left"
                                >
                                    <div>
                                        <p className="text-[14px] font-[700] text-[#111827]">Core Team Policy Toggles</p>
                                        <p className="text-[12px] text-[#6B7280] mt-1">Quick operational gates for cancellation, reassignment, rates, and 2FA enforcement.</p>
                                    </div>
                                    <ChevronDown size={16} className={`text-[#6B7280] transition-transform ${teamPolicyPanels.basic ? "rotate-180" : ""}`} />
                                </button>

                                {teamPolicyPanels.basic && (
                                    <div className="space-y-3 mt-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Toggle label="Dispatcher Can Cancel Shipments" checked={settings.team.dispatcherCanCancel} onChange={(next) => updateValue("team", "dispatcherCanCancel", next)} />
                                            <Toggle label="Ops Lead Can Reassign" checked={settings.team.opsLeadCanReassign} onChange={(next) => updateValue("team", "opsLeadCanReassign", next)} />
                                            <Toggle label="Finance Can View Rate Cards" checked={settings.team.financeCanViewRates} onChange={(next) => updateValue("team", "financeCanViewRates", next)} />
                                            <Toggle label="Enforce 2FA For All Staff" checked={settings.team.enforce2FA} onChange={(next) => updateValue("team", "enforce2FA", next)} />
                                        </div>

                                        <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Toggle
                                                    label="Enable Separation of Duties (SoD)"
                                                    checked={Boolean(settings.team?.sodControl?.enabled)}
                                                    onChange={(next) => updateSodControl("enabled", next)}
                                                    description="Blocks toxic permission combinations during role edits and user assignment."
                                                />
                                            </div>

                                            <div className="space-y-2 mt-2">
                                                {(settings.team?.sodControl?.toxicCombinations || []).map((rule, index) => {
                                                    const permissions = Array.isArray(rule?.permissions) ? rule.permissions : [];
                                                    const allPermissionsAvailable = permissions.every((permission) => teamPermissionOptions.includes(permission));

                                                    return (
                                                        <div key={rule?.key || `sod_rule_${index}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[12px] font-[700] text-[#111827]">{rule?.label || "Toxic Combination"}</p>
                                                                <label className="inline-flex items-center gap-1 text-[11px] font-[700] text-[#374151]">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(rule?.enabled)}
                                                                        onChange={(e) => updateSodCombination(String(rule?.key || ""), "enabled", e.target.checked)}
                                                                    />
                                                                    Enforce
                                                                </label>
                                                            </div>
                                                            <p className="text-[11px] text-[#6B7280] mt-1">{permissions.join(" + ")}</p>
                                                            {!allPermissionsAvailable && (
                                                                <p className="text-[11px] text-[#B91C1C] mt-1">Some permissions in this SoD pair are not yet available in current role options.</p>
                                                            )}
                                                            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-[#374151]">
                                                                <label className="inline-flex items-center gap-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(rule?.enforceRoleEdit)}
                                                                        onChange={(e) => updateSodCombination(String(rule?.key || ""), "enforceRoleEdit", e.target.checked)}
                                                                    />
                                                                    Validate on role edit
                                                                </label>
                                                                <label className="inline-flex items-center gap-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(rule?.enforceUserAssignment)}
                                                                        onChange={(e) => updateSodCombination(String(rule?.key || ""), "enforceUserAssignment", e.target.checked)}
                                                                    />
                                                                    Validate on user assignment
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Temporary Access and JIT Elevation</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Toggle
                                                    label="Enable Temporary Access"
                                                    checked={Boolean(settings.team?.temporaryAccessControl?.enabled)}
                                                    onChange={(next) => updateTemporaryAccessControl("enabled", next)}
                                                    description="Allows temporary time-bound elevated access with ticket and reason."
                                                />
                                                <Toggle
                                                    label="Require Maker-Checker for JIT"
                                                    checked={Boolean(settings.team?.temporaryAccessControl?.makerChecker)}
                                                    onChange={(next) => updateTemporaryAccessControl("makerChecker", next)}
                                                    description="Requester and approver must be different users for normal JIT elevation."
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                                <Field label="Default Duration (minutes)">
                                                    <input
                                                        type="number"
                                                        min={15}
                                                        max={480}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={settings.team?.temporaryAccessControl?.defaultDurationMinutes ?? 120}
                                                        onChange={(e) => updateTemporaryAccessControl("defaultDurationMinutes", Number(e.target.value || 120))}
                                                    />
                                                </Field>
                                                <Field label="Max Duration (minutes)">
                                                    <input
                                                        type="number"
                                                        min={15}
                                                        max={720}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={settings.team?.temporaryAccessControl?.maxDurationMinutes ?? 240}
                                                        onChange={(e) => updateTemporaryAccessControl("maxDurationMinutes", Number(e.target.value || 240))}
                                                    />
                                                </Field>
                                                <Field label="Elevated Role">
                                                    <select
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={temporaryAccessForm.elevatedRoleName}
                                                        onChange={(e) => setTemporaryAccessForm((prev) => ({ ...prev, elevatedRoleName: e.target.value }))}
                                                    >
                                                        {(settings.team?.temporaryAccessControl?.allowedElevationRoles || ["courier_admin"]).map((roleName) => (
                                                            <option key={roleName} value={roleName}>{titleCase(roleName)}</option>
                                                        ))}
                                                    </select>
                                                </Field>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <p className="text-[12px] font-[700] text-[#111827] mb-1">Request Temporary Admin</p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <input
                                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            placeholder="Ticket reference (required)"
                                                            value={temporaryAccessForm.ticketRef}
                                                            onChange={(e) => setTemporaryAccessForm((prev) => ({ ...prev, ticketRef: e.target.value }))}
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            className="rounded-[8px] border border-[#D1D5DB] px-2 py-1 text-[12px]"
                                                            placeholder="Reason for elevation (required)"
                                                            value={temporaryAccessForm.reason}
                                                            onChange={(e) => setTemporaryAccessForm((prev) => ({ ...prev, reason: e.target.value }))}
                                                        />
                                                        <input
                                                            type="number"
                                                            min={15}
                                                            max={Number(settings.team?.temporaryAccessControl?.maxDurationMinutes || 240)}
                                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={temporaryAccessForm.durationMinutes}
                                                            onChange={(e) => setTemporaryAccessForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value || 120) }))}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={temporaryAccessActionBusyId === "request"}
                                                            className="h-[32px] rounded-[8px] bg-[#0955AC] text-white text-[11px] font-[700] disabled:opacity-50"
                                                            onClick={requestTemporaryElevation}
                                                        >
                                                            Submit JIT Request
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2 bg-[#FFF7ED]">
                                                    <p className="text-[12px] font-[700] text-[#9A3412] mb-1">Break-Glass Emergency Access</p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <label className="inline-flex items-center gap-2 text-[11px] text-[#7C2D12]">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(settings.team?.temporaryAccessControl?.breakGlass?.enabled)}
                                                                onChange={(e) => updateBreakGlassControl("enabled", e.target.checked)}
                                                            />
                                                            Enable break-glass mode
                                                        </label>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                            <label className="inline-flex items-center gap-2 text-[11px] text-[#7C2D12]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(settings.team?.temporaryAccessControl?.breakGlass?.notifyOwners)}
                                                                    onChange={(e) => updateBreakGlassControl("notifyOwners", e.target.checked)}
                                                                />
                                                                Notify owners
                                                            </label>
                                                            <label className="inline-flex items-center gap-2 text-[11px] text-[#7C2D12]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(settings.team?.temporaryAccessControl?.breakGlass?.notifyRequester)}
                                                                    onChange={(e) => updateBreakGlassControl("notifyRequester", e.target.checked)}
                                                                />
                                                                Notify requester
                                                            </label>
                                                            <label className="inline-flex items-center gap-2 text-[11px] text-[#7C2D12]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(settings.team?.temporaryAccessControl?.breakGlass?.notifyTarget)}
                                                                    onChange={(e) => updateBreakGlassControl("notifyTarget", e.target.checked)}
                                                                />
                                                                Notify target
                                                            </label>
                                                        </div>
                                                        <input
                                                            className="h-[34px] rounded-[8px] border border-[#FDBA74] px-2 text-[12px]"
                                                            placeholder="Alert emails (comma separated)"
                                                            value={(settings.team?.temporaryAccessControl?.breakGlass?.alertEmails || []).join(", ")}
                                                            onChange={(e) => updateBreakGlassControl(
                                                                "alertEmails",
                                                                String(e.target.value || "")
                                                                    .split(",")
                                                                    .map((email) => String(email || "").trim())
                                                                    .filter(Boolean),
                                                            )}
                                                        />
                                                        <input
                                                            className="h-[34px] rounded-[8px] border border-[#FDBA74] px-2 text-[12px]"
                                                            placeholder="Alert webhook URL (optional)"
                                                            value={String(settings.team?.temporaryAccessControl?.breakGlass?.alertWebhookUrl || "")}
                                                            onChange={(e) => updateBreakGlassControl("alertWebhookUrl", e.target.value)}
                                                        />
                                                        <input
                                                            className="h-[34px] rounded-[8px] border border-[#FDBA74] px-2 text-[12px]"
                                                            placeholder="Emergency ticket reference (required)"
                                                            value={breakGlassForm.ticketRef}
                                                            onChange={(e) => setBreakGlassForm((prev) => ({ ...prev, ticketRef: e.target.value }))}
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            className="rounded-[8px] border border-[#FDBA74] px-2 py-1 text-[12px]"
                                                            placeholder="Emergency justification (required)"
                                                            value={breakGlassForm.reason}
                                                            onChange={(e) => setBreakGlassForm((prev) => ({ ...prev, reason: e.target.value }))}
                                                        />
                                                        <input
                                                            type="number"
                                                            min={10}
                                                            max={Number(settings.team?.temporaryAccessControl?.breakGlass?.maxDurationMinutes || 60)}
                                                            className="h-[34px] rounded-[8px] border border-[#FDBA74] px-2 text-[12px]"
                                                            value={breakGlassForm.durationMinutes}
                                                            onChange={(e) => setBreakGlassForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value || 30) }))}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={temporaryAccessActionBusyId === "break_glass"}
                                                            className="h-[32px] rounded-[8px] bg-[#C2410C] text-white text-[11px] font-[700] disabled:opacity-50"
                                                            onClick={activateBreakGlassAccess}
                                                        >
                                                            Activate Break-Glass
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827] mb-2">Temporary Access Queue</p>
                                                {(temporaryAccessQueue || []).length === 0 && (
                                                    <p className="text-[11px] text-[#6B7280]">No pending or active temporary grants.</p>
                                                )}

                                                <div className="space-y-2">
                                                    {(temporaryAccessQueue || []).map((grant) => (
                                                        <div key={`jit-${grant.id}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[12px] font-[700] text-[#111827]">{titleCase(grant.grantType)} • {titleCase(grant.elevatedRoleName)}</p>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-[700] ${grant.status === "active" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                                                                    {titleCase(grant.status || "pending")}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-[#6B7280] mt-1">
                                                                Target: {grant.targetUser?.name || "-"} • Ticket: {grant.ticketRef || "-"} • Duration: {grant.durationMinutes || 0} min
                                                            </p>
                                                            <p className="text-[11px] text-[#6B7280] mt-1">Reason: {grant.reason || "-"}</p>
                                                            <p className="text-[11px] text-[#6B7280] mt-1">Start: {grant.startsAt || "-"} • Expires: {grant.expiresAt || "-"}</p>

                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {grant.status === "pending" && (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            disabled={temporaryAccessActionBusyId === `approve_${grant.id}`}
                                                                            className="h-[28px] px-2 rounded-[6px] bg-[#0955AC] text-white text-[10px] font-[700] disabled:opacity-50"
                                                                            onClick={() => approveTemporaryElevation(grant.id)}
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={temporaryAccessActionBusyId === `reject_${grant.id}`}
                                                                            className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[10px] font-[700] disabled:opacity-50"
                                                                            onClick={() => rejectTemporaryElevation(grant.id)}
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {grant.status === "active" && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={temporaryAccessActionBusyId === `revoke_${grant.id}`}
                                                                        className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[10px] font-[700] disabled:opacity-50"
                                                                        onClick={() => revokeTemporaryElevation(grant.id)}
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Session and Device Security</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Toggle
                                                    label="Enable Session Security"
                                                    checked={Boolean(settings.team?.sessionSecurity?.enabled)}
                                                    onChange={(next) => updateSessionSecurityControl("enabled", next)}
                                                    description="Central enforcement for trusted devices, session limits, anomaly handling, and step-up checks."
                                                />
                                                <Toggle
                                                    label="Enable Device Trust"
                                                    checked={Boolean(settings.team?.sessionSecurity?.deviceTrust?.enabled)}
                                                    onChange={(next) => updateSessionSecurityNested("deviceTrust", "enabled", next)}
                                                    description="Roles configured below can operate only from trusted devices."
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                                <Field label="Trust Duration (days)">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(settings.team?.sessionSecurity?.deviceTrust?.trustDurationDays || 30)}
                                                        onChange={(e) => updateSessionSecurityNested("deviceTrust", "trustDurationDays", Number(e.target.value || 30))}
                                                    />
                                                </Field>
                                                <Field label="Default Concurrent Sessions">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(settings.team?.sessionSecurity?.concurrentSessions?.defaultLimit || 3)}
                                                        onChange={(e) => updateSessionSecurityNested("concurrentSessions", "defaultLimit", Number(e.target.value || 3))}
                                                    />
                                                </Field>
                                                <Field label="Anomaly Rapid-Switch Window (minutes)">
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        max={720}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(settings.team?.sessionSecurity?.anomalyDetection?.rapidSwitchMinutes || 120)}
                                                        onChange={(e) => updateSessionSecurityNested("anomalyDetection", "rapidSwitchMinutes", Number(e.target.value || 120))}
                                                    />
                                                </Field>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                                <Toggle
                                                    label="Enable Concurrent Session Limits"
                                                    checked={Boolean(settings.team?.sessionSecurity?.concurrentSessions?.enabled)}
                                                    onChange={(next) => updateSessionSecurityNested("concurrentSessions", "enabled", next)}
                                                />
                                                <Toggle
                                                    label="Enable Geo/IP Anomaly Detection"
                                                    checked={Boolean(settings.team?.sessionSecurity?.anomalyDetection?.enabled)}
                                                    onChange={(next) => updateSessionSecurityNested("anomalyDetection", "enabled", next)}
                                                />
                                                <Toggle
                                                    label="Keep Step-up Valid After Anomaly"
                                                    checked={!Boolean(settings.team?.sessionSecurity?.anomalyDetection?.clearStepUpOnAnomaly)}
                                                    onChange={(next) => updateSessionSecurityNested("anomalyDetection", "clearStepUpOnAnomaly", !next)}
                                                />
                                                <Toggle
                                                    label="Enable Step-up for Risky Actions"
                                                    checked={Boolean(settings.team?.sessionSecurity?.stepUp?.enabled)}
                                                    onChange={(next) => updateSessionSecurityNested("stepUp", "enabled", next)}
                                                />
                                                <Toggle
                                                    label="Enable Mandatory 2FA Controls"
                                                    checked={Boolean(settings.team?.sessionSecurity?.mandatory2FA?.enabled)}
                                                    onChange={(next) => updateSessionSecurityNested("mandatory2FA", "enabled", next)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                <Field label="Step-up TTL (minutes)">
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        max={120}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(settings.team?.sessionSecurity?.stepUp?.ttlMinutes || 120)}
                                                        onChange={(e) => updateSessionSecurityNested("stepUp", "ttlMinutes", Number(e.target.value || 120))}
                                                    />
                                                </Field>
                                                <Field label="2FA TTL (minutes)">
                                                    <input
                                                        type="number"
                                                        min={5}
                                                        max={120}
                                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                        value={Number(settings.team?.sessionSecurity?.stepUp?.twoFactorTtlMinutes || 120)}
                                                        onChange={(e) => updateSessionSecurityNested("stepUp", "twoFactorTtlMinutes", Number(e.target.value || 120))}
                                                    />
                                                </Field>
                                            </div>

                                            <div className="mt-4 border-t border-[#E5E7EB] pt-4 mb-2">
                                                <Toggle
                                                    label="Persist Step-Up on Trusted Devices"
                                                    description="Allows trusted devices to remember step-up verification across logins. If disabled, step-up always clears on logout."
                                                    checked={Boolean(settings.team?.sessionSecurity?.stepUp?.persistOnTrustedDevice)}
                                                    onChange={(val) => updateSessionSecurityNested("stepUp", "persistOnTrustedDevice", val)}
                                                />

                                                {Boolean(settings.team?.sessionSecurity?.stepUp?.persistOnTrustedDevice) && (
                                                    <div className="mt-3">
                                                        <Field label="Device Remember Duration (Days)">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={365}
                                                                className="h-[36px] w-full max-w-[200px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={Number(settings.team?.sessionSecurity?.stepUp?.deviceRememberDays || 30)}
                                                                onChange={(e) => updateSessionSecurityNested("stepUp", "deviceRememberDays", Number(e.target.value || 30))}
                                                            />
                                                        </Field>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827] mb-1">Targeting: All Team Roles or Selected Members</p>
                                                <p className="text-[11px] text-[#6B7280] mb-2">Use roles for broad policy and user IDs for specific employee exceptions.</p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                        <p className="text-[11px] font-[700] text-[#111827] mb-2">Mandatory 2FA Roles</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                            {(teamRoleOptions || []).map((roleName) => {
                                                                const selected = Boolean(settings.team?.sessionSecurity?.mandatory2FA?.roles?.includes(roleName));
                                                                return (
                                                                    <label key={`mfa-role-${roleName}`} className="inline-flex items-center gap-2 text-[11px] text-[#374151]">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selected}
                                                                            onChange={() => toggleSessionSecurityRole("mandatory2FA", roleName)}
                                                                        />
                                                                        <span>{titleCase(roleName)}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                        <p className="text-[11px] font-[700] text-[#111827] mb-2">Trusted Device Enforcement Roles</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                                            {(teamRoleOptions || []).map((roleName) => {
                                                                const selected = Boolean(settings.team?.sessionSecurity?.deviceTrust?.enforceForRoles?.includes(roleName));
                                                                const currentRoles = settings.team?.sessionSecurity?.deviceTrust?.enforceForRoles;
                                                                const roleList = Array.isArray(currentRoles) ? currentRoles : [];
                                                                return (
                                                                    <label key={`trust-role-${roleName}`} className="inline-flex items-center gap-2 text-[11px] text-[#374151]">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selected}
                                                                            onChange={() => updateSessionSecurityNested(
                                                                                "deviceTrust",
                                                                                "enforceForRoles",
                                                                                roleList.includes(roleName)
                                                                                    ? roleList.filter((role) => role !== roleName)
                                                                                    : [...roleList, roleName],
                                                                            )}
                                                                        />
                                                                        <span>{titleCase(roleName)}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                                    <Field label="Mandatory 2FA for Selected User IDs (comma separated)">
                                                        <input
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            placeholder="e.g. 30, 45, 78"
                                                            value={(settings.team?.sessionSecurity?.mandatory2FA?.userIds || []).join(", ")}
                                                            onChange={(e) => updateSessionSecurityUserIds("mandatory2FA", "userIds", e.target.value)}
                                                        />
                                                    </Field>
                                                    <Field label="Trusted Device for Selected User IDs (comma separated)">
                                                        <input
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            placeholder="e.g. 30, 45, 78"
                                                            value={(settings.team?.sessionSecurity?.deviceTrust?.enforceForUserIds || []).join(", ")}
                                                            onChange={(e) => updateSessionSecurityUserIds("deviceTrust", "enforceForUserIds", e.target.value)}
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="mt-2">
                                                    <Toggle
                                                        label="Require 2FA For Sensitive Actions"
                                                        checked={Boolean(settings.team?.sessionSecurity?.mandatory2FA?.forSensitiveActions)}
                                                        onChange={(next) => updateSessionSecurityNested("mandatory2FA", "forSensitiveActions", next)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2">
                                                <p className="text-[12px] font-[700] text-[#111827] mb-2">Concurrent Session Limits by Role</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                    {(teamRoleOptions || []).map((roleName) => (
                                                        <Field key={`ssl-${roleName}`} label={titleCase(roleName)}>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={10}
                                                                className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={Number(settings.team?.sessionSecurity?.concurrentSessions?.limitsByRole?.[roleName] || settings.team?.sessionSecurity?.concurrentSessions?.defaultLimit || 3)}
                                                                onChange={(e) => updateSessionRoleLimit(roleName, Number(e.target.value || 1))}
                                                            />
                                                        </Field>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827]">Step-up Verification (Runtime)</p>
                                                <p className="text-[11px] text-[#6B7280] mt-1">Runtime step-up challenge has moved to Profile Security for all account-level authentication checks.</p>
                                                <button
                                                    type="button"
                                                    className="mt-2 h-[30px] px-3 rounded-[6px] border border-[#0955AC] text-[#0955AC] text-[11px] font-[700]"
                                                    onClick={() => router.get(route("courierService.profile.module", { module: "security" }), {}, {
                                                        preserveScroll: true,
                                                        preserveState: false,
                                                    })}
                                                >
                                                    Open Profile Security
                                                </button>
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827] mb-2">Access Review and Certification</p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <Toggle
                                                        label="Enable Access Review Control"
                                                        checked={Boolean(settings.team?.accessReviewControl?.enabled)}
                                                        onChange={(next) => updateAccessReviewControl("enabled", next)}
                                                        description="Run periodic certifications and stale account governance automatically."
                                                    />
                                                    <Toggle
                                                        label="Require Manager Certification"
                                                        checked={Boolean(settings.team?.accessReviewControl?.requireManagerCertification)}
                                                        onChange={(next) => updateAccessReviewControl("requireManagerCertification", next)}
                                                    />
                                                    <Toggle
                                                        label="Auto-disable Stale Accounts"
                                                        checked={Boolean(settings.team?.accessReviewControl?.autoDisableStaleAccounts)}
                                                        onChange={(next) => updateAccessReviewControl("autoDisableStaleAccounts", next)}
                                                    />
                                                    <Toggle
                                                        label="Alert Dormant Privileged Users"
                                                        checked={Boolean(settings.team?.accessReviewControl?.alertDormantPrivilegedUsers)}
                                                        onChange={(next) => updateAccessReviewControl("alertDormantPrivilegedUsers", next)}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                                                    <Field label="Review Frequency">
                                                        <select
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={String(settings.team?.accessReviewControl?.reviewFrequency || "monthly")}
                                                            onChange={(e) => updateAccessReviewControl("reviewFrequency", e.target.value)}
                                                        >
                                                            <option value="monthly">Monthly</option>
                                                            <option value="quarterly">Quarterly</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Review Due (days)">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={30}
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={Number(settings.team?.accessReviewControl?.reviewDueDays || 7)}
                                                            onChange={(e) => updateAccessReviewControl("reviewDueDays", Number(e.target.value || 7))}
                                                        />
                                                    </Field>
                                                    <Field label="Stale Account Days">
                                                        <input
                                                            type="number"
                                                            min={7}
                                                            max={365}
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={Number(settings.team?.accessReviewControl?.staleAccountDays || 45)}
                                                            onChange={(e) => updateAccessReviewControl("staleAccountDays", Number(e.target.value || 45))}
                                                        />
                                                    </Field>
                                                    <Field label="Dormant Privileged Days">
                                                        <input
                                                            type="number"
                                                            min={3}
                                                            max={180}
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={Number(settings.team?.accessReviewControl?.dormantPrivilegedDays || 21)}
                                                            onChange={(e) => updateAccessReviewControl("dormantPrivilegedDays", Number(e.target.value || 21))}
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="mt-3">
                                                    <p className="text-[12px] font-[700] text-[#111827] mb-1">Pending Manager Certifications</p>
                                                    {(accessReviewQueue || []).length === 0 && (
                                                        <p className="text-[11px] text-[#6B7280]">No pending access review certifications.</p>
                                                    )}
                                                    <div className="space-y-2">
                                                        {(accessReviewQueue || []).map((review) => (
                                                            <div key={`ar-${review.id}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-[12px] font-[700] text-[#111827]">
                                                                        {review.subjectUser?.name || "Unknown User"} • {String(review.cycleType || "monthly").toUpperCase()} • {review.cycleKey || "-"}
                                                                    </p>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-[700] bg-[#FEF3C7] text-[#92400E]">
                                                                        {titleCase(review.status || "pending")}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-[#6B7280] mt-1">
                                                                    Due: {review.dueAt || "-"} • Last Access: {review.lastAccessAt || "Unknown"}
                                                                </p>
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={temporaryAccessActionBusyId === `access_review_${review.id}_keep`}
                                                                        className="h-[28px] px-2 rounded-[6px] bg-[#0955AC] text-white text-[10px] font-[700] disabled:opacity-50"
                                                                        onClick={() => certifyAccessReview(review.id, true)}
                                                                    >
                                                                        Certify Keep Access
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={temporaryAccessActionBusyId === `access_review_${review.id}_revoke`}
                                                                        className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[10px] font-[700] disabled:opacity-50"
                                                                        onClick={() => certifyAccessReview(review.id, false)}
                                                                    >
                                                                        Revoke Access
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                                <p className="text-[12px] font-[700] text-[#111827]">API and Service Access</p>
                                                <p className="text-[11px] text-[#6B7280] mt-1">Move credential issuance, scope governance, and service-account analytics to a dedicated workspace.</p>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <p className="text-[11px] text-[#374151]">
                                                        Active Keys: {(apiCredentialQueue || []).filter((credential) => String(credential?.status || "active") === "active").length} / {(apiCredentialQueue || []).length}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="h-[30px] px-3 rounded-[6px] bg-[#0955AC] text-white text-[11px] font-[700]"
                                                        onClick={() => navigateTeamAccessTopic("api-access")}
                                                    >
                                                        Open API Access Topic
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-[#FAFBFD]">
                                <button
                                    type="button"
                                    onClick={() => toggleTeamPolicyPanel("approvalDualControl")}
                                    className="w-full flex items-center justify-between gap-3 text-left"
                                >
                                    <div>
                                        <p className="text-[14px] font-[700] text-[#111827]">Approval and Dual Control</p>
                                        <p className="text-[12px] text-[#6B7280] mt-1">Require maker-checker approvals for high-risk actions (cancellation, refunds, COD overrides, ownership transfer, and full client exports).</p>
                                    </div>
                                    <ChevronDown size={16} className={`text-[#6B7280] transition-transform ${teamPolicyPanels.approvalDualControl ? "rotate-180" : ""}`} />
                                </button>

                                {teamPolicyPanels.approvalDualControl && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                            <Toggle
                                                label="Enable Sensitive Action Approval"
                                                checked={Boolean(settings.team?.approvalControl?.enabled)}
                                                onChange={(next) => updateApprovalControl("enabled", next)}
                                                description="When enabled, configured sensitive actions create approval requests before execution."
                                            />
                                            <Toggle
                                                label="Enforce Maker-Checker"
                                                checked={Boolean(settings.team?.approvalControl?.makerChecker)}
                                                onChange={(next) => updateApprovalControl("makerChecker", next)}
                                                description="Requester and approver must be different users."
                                            />
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <Field label="Approval TTL (minutes)">
                                                <input
                                                    type="number"
                                                    min={10}
                                                    max={10080}
                                                    className="h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={settings.team?.approvalControl?.approvalTtlMinutes ?? 240}
                                                    onChange={(e) => updateApprovalControl("approvalTtlMinutes", Number(e.target.value || 240))}
                                                />
                                            </Field>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Sensitive Action Thresholds</p>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <Toggle
                                                        label="High-Value Cancellation"
                                                        checked={Boolean(settings.team?.approvalControl?.sensitiveActions?.high_value_cancellation?.enabled)}
                                                        onChange={(next) => updateApprovalActionControl("high_value_cancellation", "enabled", next)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <Field label="Min Amount (LKR)">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.high_value_cancellation?.minAmount ?? 50000}
                                                                onChange={(e) => updateApprovalActionControl("high_value_cancellation", "minAmount", Number(e.target.value || 0))}
                                                            />
                                                        </Field>
                                                        <Field label="Required Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.high_value_cancellation?.requiredApprovals ?? 1}
                                                                onChange={(e) => updateApprovalActionControl("high_value_cancellation", "requiredApprovals", Number(e.target.value || 1))}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>

                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <Toggle
                                                        label="Refund Approval"
                                                        checked={Boolean(settings.team?.approvalControl?.sensitiveActions?.refund?.enabled)}
                                                        onChange={(next) => updateApprovalActionControl("refund", "enabled", next)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <Field label="Level 1 Min (LKR)">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.refund?.level1MinAmount ?? 25000}
                                                                onChange={(e) => updateApprovalActionControl("refund", "level1MinAmount", Number(e.target.value || 0))}
                                                            />
                                                        </Field>
                                                        <Field label="L1 Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.refund?.requiredApprovalsLevel1 ?? 1}
                                                                onChange={(e) => updateApprovalActionControl("refund", "requiredApprovalsLevel1", Number(e.target.value || 1))}
                                                            />
                                                        </Field>
                                                        <Field label="Level 2 Min (LKR)">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.refund?.level2MinAmount ?? 100000}
                                                                onChange={(e) => updateApprovalActionControl("refund", "level2MinAmount", Number(e.target.value || 0))}
                                                            />
                                                        </Field>
                                                        <Field label="L2 Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.refund?.requiredApprovalsLevel2 ?? 2}
                                                                onChange={(e) => updateApprovalActionControl("refund", "requiredApprovalsLevel2", Number(e.target.value || 2))}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>

                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <Toggle
                                                        label="COD Override Approval"
                                                        checked={Boolean(settings.team?.approvalControl?.sensitiveActions?.cod_override?.enabled)}
                                                        onChange={(next) => updateApprovalActionControl("cod_override", "enabled", next)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <Field label="Level 1 Min (LKR)">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.cod_override?.level1MinAmount ?? 25000}
                                                                onChange={(e) => updateApprovalActionControl("cod_override", "level1MinAmount", Number(e.target.value || 0))}
                                                            />
                                                        </Field>
                                                        <Field label="L1 Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.cod_override?.requiredApprovalsLevel1 ?? 1}
                                                                onChange={(e) => updateApprovalActionControl("cod_override", "requiredApprovalsLevel1", Number(e.target.value || 1))}
                                                            />
                                                        </Field>
                                                        <Field label="Level 2 Min (LKR)">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.cod_override?.level2MinAmount ?? 100000}
                                                                onChange={(e) => updateApprovalActionControl("cod_override", "level2MinAmount", Number(e.target.value || 0))}
                                                            />
                                                        </Field>
                                                        <Field label="L2 Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.cod_override?.requiredApprovalsLevel2 ?? 2}
                                                                onChange={(e) => updateApprovalActionControl("cod_override", "requiredApprovalsLevel2", Number(e.target.value || 2))}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>

                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <Toggle
                                                        label="Ownership Transfer"
                                                        checked={Boolean(settings.team?.approvalControl?.sensitiveActions?.ownership_transfer?.enabled)}
                                                        onChange={(next) => updateApprovalActionControl("ownership_transfer", "enabled", next)}
                                                    />
                                                    <Field label="Required Approvals">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={3}
                                                            className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={settings.team?.approvalControl?.sensitiveActions?.ownership_transfer?.requiredApprovals ?? 2}
                                                            onChange={(e) => updateApprovalActionControl("ownership_transfer", "requiredApprovals", Number(e.target.value || 2))}
                                                        />
                                                    </Field>
                                                </div>

                                                <div className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                    <Toggle
                                                        label="Full Client Export"
                                                        checked={Boolean(settings.team?.approvalControl?.sensitiveActions?.client_list_export?.enabled)}
                                                        onChange={(next) => updateApprovalActionControl("client_list_export", "enabled", next)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <Field label="Min Rows">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.client_list_export?.minRows ?? 100}
                                                                onChange={(e) => updateApprovalActionControl("client_list_export", "minRows", Number(e.target.value || 100))}
                                                            />
                                                        </Field>
                                                        <Field label="Required Approvals">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={3}
                                                                className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                                value={settings.team?.approvalControl?.sensitiveActions?.client_list_export?.requiredApprovals ?? 1}
                                                                onChange={(e) => updateApprovalActionControl("client_list_export", "requiredApprovals", Number(e.target.value || 1))}
                                                            />
                                                        </Field>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Sensitive Action Approval Queue</p>
                                            {(approvalQueue || []).length === 0 && (
                                                <p className="text-[12px] text-[#6B7280]">No pending or approved requests waiting execution.</p>
                                            )}

                                            <div className="space-y-2">
                                                {(approvalQueue || []).map((item) => (
                                                    <div key={`approval-${item.id}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[12px] font-[700] text-[#111827]">{titleCase(item.actionKey || "action")}</p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-[700] ${item.status === "approved" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]"}`}>
                                                                {titleCase(item.status || "pending")}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-[#6B7280] mt-1">
                                                            Requested by {item.requester?.name || "-"} • Approvals {item.approvedCount || 0}/{item.requiredApprovals || 0}
                                                            {item.amount !== null ? ` • Amount LKR ${item.amount}` : ""}
                                                        </p>
                                                        <p className="text-[11px] text-[#6B7280] mt-1">Created at {item.createdAt || "-"} • Expires at {item.expiresAt || "-"}</p>

                                                        {canAssignPermissions && item.status === "pending" && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={approvalActionBusyId === item.id}
                                                                    className="h-[30px] px-2 rounded-[6px] bg-[#0955AC] text-white text-[11px] font-[700] disabled:opacity-50"
                                                                    onClick={() => approveSensitiveAction(item.id)}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={approvalActionBusyId === item.id}
                                                                    className="h-[30px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[11px] font-[700] disabled:opacity-50"
                                                                    onClick={() => rejectSensitiveAction(item.id)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-[#FAFBFD]">
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => toggleTeamPolicyPanel("advancedModel")}
                                        className="flex-1 flex items-center justify-between gap-3 text-left"
                                    >
                                        <div>
                                            <p className="text-[14px] font-[700] text-[#111827]">Advanced Permission Model</p>
                                            <p className="text-[12px] text-[#6B7280]">Configure action-level permissions by resource, role scope, and sensitive field visibility.</p>
                                        </div>
                                        <ChevronDown size={16} className={`text-[#6B7280] transition-transform ${teamPolicyPanels.advancedModel ? "rotate-180" : ""}`} />
                                    </button>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(settings.team?.permissionModel?.enabled)}
                                        onClick={() => updatePermissionModelEnabled(!Boolean(settings.team?.permissionModel?.enabled))}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.team?.permissionModel?.enabled ? "bg-[#0955AC]" : "bg-[#D1D5DB]"}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.team?.permissionModel?.enabled ? "translate-x-6" : "translate-x-1"}`} />
                                    </button>
                                </div>

                                {teamPolicyPanels.advancedModel && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 mb-3">
                                            <div>
                                                <label className="text-[12px] font-[700] text-[#374151]">Role</label>
                                                <select
                                                    className="mt-1 h-[42px] w-full rounded-[8px] border border-[#D1D5DB] px-3 text-[13px] leading-[1.35]"
                                                    value={activeRoleForPermissionModel}
                                                    onChange={(e) => setActiveRoleForPermissionModel(e.target.value)}
                                                >
                                                    {permissionModelRoleOptions.map((role) => (
                                                        <option key={role} value={role}>{titleCase(role)}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[12px] font-[700] text-[#374151]">Scope Level</label>
                                                <select
                                                    className="mt-1 h-[42px] w-full rounded-[8px] border border-[#D1D5DB] px-3 text-[13px] leading-[1.35]"
                                                    value={activePermissionRolePolicy.scope}
                                                    onChange={(e) => updatePermissionRoleScope(activeRoleForPermissionModel, e.target.value)}
                                                >
                                                    {permissionScopes.map((scope) => (
                                                        <option key={scope} value={scope}>{titleCase(scope)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto border border-[#E5E7EB] rounded-[8px] bg-white">
                                            <table className="w-full min-w-[760px] text-[12px]">
                                                <thead>
                                                    <tr className="bg-[#F9FAFB] text-left">
                                                        <th className="px-3 py-2 font-[700] text-[#374151]">Resource</th>
                                                        {permissionActions.map((action) => (
                                                            <th key={action} className="px-3 py-2 font-[700] text-[#374151]">{titleCase(action)}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {permissionResources.map((resource) => (
                                                        <tr key={resource} className="border-t border-[#E5E7EB]">
                                                            <td className="px-3 py-2 font-[700] text-[#111827]">{titleCase(resource)}</td>
                                                            {permissionActions.map((action) => (
                                                                <td key={`${resource}-${action}`} className="px-3 py-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Boolean(activePermissionRolePolicy.resources?.[resource]?.[action])}
                                                                        onChange={() => togglePermissionRoleAction(activeRoleForPermissionModel, resource, action)}
                                                                    />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Data Scope Controls</p>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[12px] font-[700] text-[#374151] mb-1">Region Restrictions (zones)</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {scopeZoneOptions.length === 0 && <p className="text-[11px] text-[#6B7280]">No zone options configured.</p>}
                                                        {scopeZoneOptions.map((zone) => (
                                                            <label key={zone} className="inline-flex items-center gap-1 text-[12px] text-[#374151]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={activePermissionRolePolicy.constraints.regionZones.includes(zone)}
                                                                    onChange={() => togglePermissionRoleConstraintArrayValue(activeRoleForPermissionModel, "regionZones", zone)}
                                                                />
                                                                {zone}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[12px] font-[700] text-[#374151] mb-1">Hub/Branch Restrictions</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {scopeHubOptions.length === 0 && <p className="text-[11px] text-[#6B7280]">No hub options configured.</p>}
                                                        {scopeHubOptions.map((hub) => (
                                                            <label key={hub} className="inline-flex items-center gap-1 text-[12px] text-[#374151]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={activePermissionRolePolicy.constraints.hubBranches.includes(hub)}
                                                                    onChange={() => togglePermissionRoleConstraintArrayValue(activeRoleForPermissionModel, "hubBranches", hub)}
                                                                />
                                                                {hub}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <p className="text-[12px] font-[700] text-[#374151] mb-1">Customer/Account Restrictions</p>
                                                <label className="inline-flex items-center gap-2 text-[12px] text-[#374151] mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(activePermissionRolePolicy.constraints.keyAccountsOnly)}
                                                        onChange={(e) => updatePermissionRoleConstraint(activeRoleForPermissionModel, "keyAccountsOnly", e.target.checked)}
                                                    />
                                                    Key accounts only
                                                </label>

                                                <div className="max-h-[160px] overflow-y-auto border border-[#E5E7EB] rounded-[8px] p-2">
                                                    {scopeCustomerOptions.length === 0 && <p className="text-[11px] text-[#6B7280]">No customer accounts found.</p>}
                                                    {scopeCustomerOptions.map((account) => (
                                                        <label key={account.id} className="block text-[12px] text-[#374151]">
                                                            <input
                                                                type="checkbox"
                                                                className="mr-2"
                                                                checked={activePermissionRolePolicy.constraints.allowedCustomerIds.includes(Number(account.id))}
                                                                onChange={() => togglePermissionRoleConstraintArrayValue(activeRoleForPermissionModel, "allowedCustomerIds", Number(account.id))}
                                                            />
                                                            {account.label}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[12px] font-[700] text-[#374151] mb-1">Time Window Restrictions</p>
                                                    <label className="inline-flex items-center gap-2 text-[12px] text-[#374151] mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(activePermissionRolePolicy.constraints.enforceShiftWindow)}
                                                            onChange={(e) => updatePermissionRoleConstraint(activeRoleForPermissionModel, "enforceShiftWindow", e.target.checked)}
                                                        />
                                                        Enforce shift window for non-view actions
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="time"
                                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={activePermissionRolePolicy.constraints.shiftStart || "00:00"}
                                                            onChange={(e) => updatePermissionRoleConstraint(activeRoleForPermissionModel, "shiftStart", e.target.value)}
                                                        />
                                                        <input
                                                            type="time"
                                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                            value={activePermissionRolePolicy.constraints.shiftEnd || "23:59"}
                                                            onChange={(e) => updatePermissionRoleConstraint(activeRoleForPermissionModel, "shiftEnd", e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-[12px] font-[700] text-[#374151] mb-1">Environment Restrictions</p>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {permissionEnvironments.map((environment) => (
                                                            <label key={environment} className="inline-flex items-center gap-1 text-[12px] text-[#374151]">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={activePermissionRolePolicy.constraints.allowedEnvironments.includes(environment)}
                                                                    onChange={() => togglePermissionRoleConstraintArrayValue(activeRoleForPermissionModel, "allowedEnvironments", environment)}
                                                                />
                                                                {titleCase(environment)}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    {permissionEnvironments.map((environment) => (
                                                        <div key={`blocked-${environment}`} className="mb-1">
                                                            <p className="text-[11px] font-[700] text-[#6B7280]">Blocked actions in {titleCase(environment)}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {permissionActions.map((action) => (
                                                                    <label key={`${environment}-${action}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={Boolean(activePermissionRolePolicy.constraints.blockedActionsByEnvironment?.[environment]?.includes(action))}
                                                                            onChange={() => togglePermissionRoleBlockedActionForEnvironment(activeRoleForPermissionModel, environment, action)}
                                                                        />
                                                                        {titleCase(action)}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <p className="text-[13px] font-[700] text-[#111827]">Policy Rules (ABAC)</p>
                                                <button
                                                    type="button"
                                                    className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151]"
                                                    onClick={() => addPermissionPolicyRule(activeRoleForPermissionModel)}
                                                >
                                                    Add Rule
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-[#6B7280] mb-2">Rules are evaluated with deny-over-allow priority. If any scoped rule exists for an action, at least one matching allow rule is required.</p>

                                            {activePermissionRolePolicy.constraints.policyRules.length === 0 && (
                                                <p className="text-[12px] text-[#6B7280]">No ABAC rules configured for this role.</p>
                                            )}

                                            <div className="space-y-2">
                                                {activePermissionRolePolicy.constraints.policyRules.map((rule) => (
                                                    <div key={rule.id} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_110px_1fr_1fr_auto] gap-2 items-end">
                                                            <div>
                                                                <label className="text-[11px] font-[700] text-[#374151]">Rule Label</label>
                                                                <input
                                                                    className="mt-1 h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                    value={rule.label || ""}
                                                                    placeholder="High-value delivery restriction"
                                                                    onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({ ...prev, label: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-[700] text-[#374151]">Effect</label>
                                                                <select
                                                                    className="mt-1 h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                    value={rule.effect}
                                                                    onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({ ...prev, effect: e.target.value }))}
                                                                >
                                                                    {permissionRuleEffects.map((effect) => (
                                                                        <option key={effect} value={effect}>{titleCase(effect)}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-[700] text-[#374151]">Resource</label>
                                                                <select
                                                                    className="mt-1 h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                    value={rule.resource}
                                                                    onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({ ...prev, resource: e.target.value }))}
                                                                >
                                                                    <option value="*">Any Resource</option>
                                                                    {permissionResources.map((resource) => (
                                                                        <option key={resource} value={resource}>{titleCase(resource)}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-[700] text-[#374151]">Action</label>
                                                                <select
                                                                    className="mt-1 h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                    value={rule.action}
                                                                    onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({ ...prev, action: e.target.value }))}
                                                                >
                                                                    <option value="*">Any Action</option>
                                                                    {permissionActions.map((action) => (
                                                                        <option key={action} value={action}>{titleCase(action)}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="h-[32px] px-2 rounded-[6px] border border-[#FECACA] text-[11px] font-[700] text-[#B91C1C]"
                                                                onClick={() => removePermissionPolicyRule(activeRoleForPermissionModel, rule.id)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                                                            <div>
                                                                <p className="text-[11px] font-[700] text-[#374151] mb-1">Shipment Stage</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {permissionRuleShipmentStages.map((stage) => (
                                                                        <label key={`${rule.id}-stage-${stage}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Array.isArray(rule.conditions?.shipmentStages) && rule.conditions.shipmentStages.includes(stage)}
                                                                                onChange={() => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({
                                                                                    ...prev,
                                                                                    conditions: {
                                                                                        ...(prev.conditions || {}),
                                                                                        shipmentStages: toggleInArray(Array.isArray(prev.conditions?.shipmentStages) ? prev.conditions.shipmentStages : [], stage),
                                                                                    },
                                                                                }))}
                                                                            />
                                                                            {titleCase(stage)}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-[700] text-[#374151] mb-1">Amount Threshold (LKR)</p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="h-[38px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                        placeholder="Min"
                                                                        value={rule.conditions?.minAmount ?? ""}
                                                                        onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({
                                                                            ...prev,
                                                                            conditions: {
                                                                                ...(prev.conditions || {}),
                                                                                minAmount: e.target.value === "" ? "" : Number(e.target.value),
                                                                            },
                                                                        }))}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        className="h-[38px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] leading-[1.35]"
                                                                        placeholder="Max"
                                                                        value={rule.conditions?.maxAmount ?? ""}
                                                                        onChange={(e) => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({
                                                                            ...prev,
                                                                            conditions: {
                                                                                ...(prev.conditions || {}),
                                                                                maxAmount: e.target.value === "" ? "" : Number(e.target.value),
                                                                            },
                                                                        }))}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-[700] text-[#374151] mb-1">Client Tier</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {permissionRuleClientTiers.map((tier) => (
                                                                        <label key={`${rule.id}-tier-${tier}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Array.isArray(rule.conditions?.clientTiers) && rule.conditions.clientTiers.includes(tier)}
                                                                                onChange={() => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({
                                                                                    ...prev,
                                                                                    conditions: {
                                                                                        ...(prev.conditions || {}),
                                                                                        clientTiers: toggleInArray(Array.isArray(prev.conditions?.clientTiers) ? prev.conditions.clientTiers : [], tier),
                                                                                    },
                                                                                }))}
                                                                            />
                                                                            {titleCase(tier)}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-[700] text-[#374151] mb-1">SLA Class</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {permissionRuleSlaClasses.map((slaClass) => (
                                                                        <label key={`${rule.id}-sla-${slaClass}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Array.isArray(rule.conditions?.slaClasses) && rule.conditions.slaClasses.includes(slaClass)}
                                                                                onChange={() => updatePermissionPolicyRule(activeRoleForPermissionModel, rule.id, (prev) => ({
                                                                                    ...prev,
                                                                                    conditions: {
                                                                                        ...(prev.conditions || {}),
                                                                                        slaClasses: toggleInArray(Array.isArray(prev.conditions?.slaClasses) ? prev.conditions.slaClasses : [], slaClass),
                                                                                    },
                                                                                }))}
                                                                            />
                                                                            {titleCase(slaClass)}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <p className="text-[13px] font-[700] text-[#111827] mb-2">Sensitive Field Visibility</p>
                                            <div className="space-y-2">
                                                {sensitiveFieldKeys.map((fieldKey) => {
                                                    const visibleTo = settings.team?.permissionModel?.fieldVisibility?.[fieldKey]?.visibleToRoles || [];
                                                    return (
                                                        <div key={fieldKey} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                            <p className="text-[12px] font-[700] text-[#374151]">{humanizeFieldKey(fieldKey)}</p>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
                                                                {permissionModelRoleOptions.map((role) => (
                                                                    <label key={`${fieldKey}-${role}`} className="inline-flex items-center gap-2 text-[12px] text-[#374151]">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={visibleTo.includes(role)}
                                                                            onChange={() => toggleFieldVisibilityRole(fieldKey, role)}
                                                                        />
                                                                        {titleCase(role)}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <p className="text-[13px] font-[700] text-[#111827]">Access Denials and Policy Audit</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-[#6B7280]">Showing {filteredTeamAccessAudit.length} / {teamAccessAudit.length}</span>
                                                    <button
                                                        type="button"
                                                        className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151] disabled:opacity-50"
                                                        onClick={exportAuditCsv}
                                                        disabled={filteredTeamAccessAudit.length === 0}
                                                    >
                                                        Export CSV
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                                <select
                                                    className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={auditTypeFilter}
                                                    onChange={(e) => setAuditTypeFilter(e.target.value)}
                                                >
                                                    <option value="all">All Event Types</option>
                                                    <option value="denied">Denied Only</option>
                                                    <option value="alert">Alerts Only</option>
                                                    <option value="updated">Policy Updated Only</option>
                                                </select>

                                                <select
                                                    className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    value={auditResourceFilter}
                                                    onChange={(e) => setAuditResourceFilter(e.target.value)}
                                                >
                                                    <option value="all">All Resources</option>
                                                    {auditResourceOptions.map((resource) => (
                                                        <option key={resource} value={resource}>{titleCase(resource)}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                                    placeholder="Search reason, scope, action"
                                                    value={auditSearch}
                                                    onChange={(e) => setAuditSearch(e.target.value)}
                                                />
                                            </div>

                                            <div className="max-h-[280px] overflow-y-auto border border-[#E5E7EB] rounded-[8px]">
                                                {auditPagination.rows.length === 0 && (
                                                    <p className="text-[12px] text-[#6B7280] px-3 py-3">No Team Access audit events found yet.</p>
                                                )}

                                                {auditPagination.rows.map((event) => {
                                                    const isDenied = ["courier_permission_denied", "access_denied"].includes(String(event.action || ""));
                                                    const isAlert = Boolean(event.isAlert) || String(event.eventFamily || "") === "alert";
                                                    const meta = event.metadata && typeof event.metadata === "object" ? event.metadata : {};
                                                    const diffRows = Array.isArray(meta.snapshot_diff) ? meta.snapshot_diff.slice(0, 3) : [];

                                                    return (
                                                        <div key={event.id} className="px-3 py-2 border-b border-[#E5E7EB] last:border-b-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-[12px] font-[700] text-[#111827]">{isAlert ? "Security Alert" : (isDenied ? "Permission Denied" : "Policy Updated")}</p>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-[700] ${isAlert
                                                                    ? "bg-[#FEF3C7] text-[#92400E]"
                                                                    : (isDenied ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#DCFCE7] text-[#166534]")
                                                                    }`}>
                                                                    {isAlert ? "Alert" : (isDenied ? "Denied" : "Updated")}
                                                                </span>
                                                            </div>

                                                            <p className="text-[11px] text-[#374151] mt-1">{event.description || "-"}</p>

                                                            <div className="text-[11px] text-[#6B7280] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                                                {(meta.resource || meta.target_type) && <span>Resource: {titleCase(meta.resource || meta.target_type)}</span>}
                                                                {meta.requested_action && <span>Action: {titleCase(meta.requested_action)}</span>}
                                                                {meta.scope && <span>Scope: {titleCase(meta.scope)}</span>}
                                                                {meta.reason && <span>Reason: {titleCase(meta.reason)}</span>}
                                                                {meta.mode && <span>Mode: {titleCase(meta.mode)}</span>}
                                                                {event.alertCode && <span>Alert Code: {titleCase(event.alertCode)}</span>}
                                                            </div>

                                                            {diffRows.length > 0 && (
                                                                <div className="mt-2 rounded-[6px] border border-[#E5E7EB] bg-[#F8FAFC] p-2">
                                                                    <p className="text-[10px] font-[700] text-[#334155] mb-1">Before vs After Snapshot (Top Changes)</p>
                                                                    <div className="space-y-1">
                                                                        {diffRows.map((change, index) => (
                                                                            <p key={`${event.id}_diff_${index}`} className="text-[10px] text-[#475569]">
                                                                                {titleCase(String(change?.field || "field"))}: {String(change?.before ?? "-")} → {String(change?.after ?? "-")}
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <p className="text-[10px] text-[#9CA3AF] mt-1">{event.createdAt || "-"}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-2 flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151] disabled:opacity-50"
                                                    disabled={auditPagination.currentPage <= 1}
                                                    onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                                                >
                                                    Prev
                                                </button>
                                                <span className="text-[11px] text-[#6B7280]">
                                                    Page {auditPagination.currentPage} of {auditPagination.totalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151] disabled:opacity-50"
                                                    disabled={auditPagination.currentPage >= auditPagination.totalPages}
                                                    onClick={() => setAuditPage((prev) => Math.min(auditPagination.totalPages, prev + 1))}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTeamAccessTopic === "user-defaults" && (
                        <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-[#FAFBFD]">
                            <p className="text-[15px] font-[700] text-[#111827]">Team User Creation Defaults</p>
                            <p className="text-[12px] text-[#6B7280] mt-1">Configure default direct permissions, data scope defaults, and available onboarding bundles used during team-user creation.</p>

                            <div className="mt-3 mb-2">
                                <label className="text-[12px] font-[700] text-[#374151]">Role To Configure</label>
                                <select
                                    className="mt-1 h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[13px]"
                                    disabled={!canAssignPermissions}
                                    value={activeRoleForDefaults}
                                    onChange={(e) => setActiveRoleForDefaults(e.target.value)}
                                >
                                    {teamRoleOptions.map((role) => (
                                        <option key={role} value={role}>{titleCase(role)}</option>
                                    ))}
                                </select>
                            </div>

                            <p className="text-[12px] font-[700] text-[#374151] mt-3 mb-2">Default Direct Permissions For Selected Role</p>
                            <input
                                className="h-[34px] w-full rounded-[8px] border border-[#D1D5DB] px-3 mb-2 text-[13px]"
                                placeholder="Search default permissions"
                                disabled={!canAssignPermissions}
                                value={teamDefaultPermissionSearch}
                                onChange={(e) => setTeamDefaultPermissionSearch(e.target.value)}
                            />

                            <div className="max-h-[220px] overflow-y-auto border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                {Object.keys(groupedTeamPermissions).length === 0 && (
                                    <p className="text-[12px] text-[#6B7280] px-1 py-2">No courier permissions found.</p>
                                )}

                                {Object.keys(groupedTeamPermissions).map((group) => (
                                    <div key={group} className="mb-2">
                                        <p className="text-[11px] font-[700] uppercase text-[#6B7280] mb-1">{group.replaceAll("_", " ")}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {groupedTeamPermissions[group]
                                                .filter((perm) => perm.toLowerCase().includes(teamDefaultPermissionSearch.toLowerCase()))
                                                .map((perm) => (
                                                    <label key={perm} className="inline-flex items-center gap-2 text-[12px]">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canAssignPermissions}
                                                            checked={activeRoleDefaultPermissions.includes(perm)}
                                                            onChange={() => toggleRoleDefaultPermission(perm)}
                                                        />
                                                        {perm}
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                <p className="text-[12px] font-[700] text-[#374151] mb-2">Default Data Scope For Selected Role</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Field label="Scope Level">
                                        <select
                                            className="h-[38px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[13px] leading-[1.2]"
                                            disabled={!canAssignPermissions}
                                            value={activeRoleDefaultDataScope.scope}
                                            onChange={(e) => updateRoleDefaultDataScope("scope", e.target.value)}
                                        >
                                            {permissionScopes.map((scope) => (
                                                <option key={scope} value={scope}>{titleCase(scope)}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>

                                {(scopeZoneOptions.length > 0 || scopeHubOptions.length > 0) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                                        <div>
                                            <p className="text-[11px] font-[700] text-[#6B7280] mb-1">Region Zones</p>
                                            <div className="flex flex-wrap gap-2">
                                                {scopeZoneOptions.map((zone) => (
                                                    <label key={`${activeRoleForDefaults}-zone-${zone}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canAssignPermissions}
                                                            checked={activeRoleDefaultDataScope.regionZones.includes(zone)}
                                                            onChange={() => toggleRoleDefaultDataScopeArray("regionZones", zone)}
                                                        />
                                                        {zone}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[11px] font-[700] text-[#6B7280] mb-1">Hub Branches</p>
                                            <div className="flex flex-wrap gap-2">
                                                {scopeHubOptions.map((hub) => (
                                                    <label key={`${activeRoleForDefaults}-hub-${hub}`} className="inline-flex items-center gap-1 text-[11px] text-[#374151]">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canAssignPermissions}
                                                            checked={activeRoleDefaultDataScope.hubBranches.includes(hub)}
                                                            onChange={() => toggleRoleDefaultDataScopeArray("hubBranches", hub)}
                                                        />
                                                        {hub}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(settings.team?.teamAccessControl?.onboardingBundles || []).length > 0 && (
                                <div className="mt-4 border border-[#E5E7EB] rounded-[8px] p-3 bg-white">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Optional Onboarding Bundles</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {settings.team.teamAccessControl.onboardingBundles.map((bundle) => (
                                            <div key={bundle.key} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                                <p className="text-[12px] font-[700]">{bundle.label}</p>
                                                <p className="text-[11px] text-[#6B7280] mt-1">Role: {titleCase(bundle.role)}</p>
                                                {bundle.description && <p className="text-[11px] text-[#6B7280] mt-1">{bundle.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTeamAccessTopic === "role-studio" && (
                        <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-white">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                    <p className="text-[16px] font-[700] text-[#111827]">Role Studio</p>
                                    <p className="text-[12px] text-[#6B7280] mt-1">Create custom roles, generate from templates, clone existing roles, and review role version history.</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                    onClick={refreshRoleStudioRoles}
                                    className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700] disabled:opacity-50"
                                >
                                    Refresh Roles
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                                <input
                                    className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                    placeholder="Search role by name or label"
                                    value={roleCatalogSearch}
                                    onChange={(e) => setRoleCatalogSearch(e.target.value)}
                                />
                                <select
                                    className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                    value={roleTypeFilter}
                                    onChange={(e) => setRoleTypeFilter(e.target.value)}
                                >
                                    <option value="all">All Role Types</option>
                                    <option value="predefined">Predefined</option>
                                    <option value="template">Template</option>
                                    <option value="clone">Clone</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-[#FAFBFD]">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Create Custom Role</p>
                                    <p className="text-[11px] text-[#6B7280] mb-2">Uses the permission matrix in "Edit Selected Role Permissions" below.</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="Role name (e.g. last_mile_ops)"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleForm.name}
                                            onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                                        />
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="Role label"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleForm.label}
                                            onChange={(e) => setRoleForm((prev) => ({ ...prev, label: e.target.value }))}
                                        />
                                        <textarea
                                            rows={2}
                                            className="rounded-[8px] border border-[#D1D5DB] px-2 py-1 text-[12px]"
                                            placeholder="Role description"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleForm.description}
                                            onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                                        />
                                        {(roleFormErrors.name || roleFormErrors.label || roleFormErrors.permissions) && (
                                            <p className="text-[11px] text-[#B91C1C]">
                                                {roleFormErrors.name || roleFormErrors.label || roleFormErrors.permissions}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            onClick={createCustomRole}
                                            className="h-[34px] rounded-[8px] bg-[#0955AC] text-white text-[12px] font-[700] disabled:opacity-50"
                                        >
                                            Create Custom Role
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-[#FAFBFD]">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Create From Template</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <select
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleTemplateForm.template}
                                            onChange={(e) => setRoleTemplateForm((prev) => ({ ...prev, template: e.target.value }))}
                                        >
                                            {Object.keys(roleStudioTemplates).map((template) => (
                                                <option key={template} value={template}>{titleCase(template)}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="New role name"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleTemplateForm.name}
                                            onChange={(e) => setRoleTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                                        />
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="Role label (optional)"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleTemplateForm.label}
                                            onChange={(e) => setRoleTemplateForm((prev) => ({ ...prev, label: e.target.value }))}
                                        />
                                        {(roleTemplateFormErrors.template || roleTemplateFormErrors.name || roleTemplateFormErrors.permissions) && (
                                            <p className="text-[11px] text-[#B91C1C]">
                                                {roleTemplateFormErrors.template || roleTemplateFormErrors.name || roleTemplateFormErrors.permissions}
                                            </p>
                                        )}
                                        {roleTemplateSodViolations.length > 0 && (
                                            <p className="text-[11px] text-[#92400E]">
                                                SoD check: {roleTemplateSodViolations.join(" | ")}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            onClick={createRoleFromTemplate}
                                            className="h-[34px] rounded-[8px] bg-[#0F766E] text-white text-[12px] font-[700] disabled:opacity-50"
                                        >
                                            Create From Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-[#FAFBFD]">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Clone Existing Role</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <select
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleCloneForm.sourceRole}
                                            onChange={(e) => setRoleCloneForm((prev) => ({ ...prev, sourceRole: e.target.value }))}
                                        >
                                            {roleStudioRoles.map((role) => (
                                                <option key={role.name} value={role.name}>{role.label || titleCase(role.name)}</option>
                                            ))}
                                        </select>
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="Cloned role name"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleCloneForm.name}
                                            onChange={(e) => setRoleCloneForm((prev) => ({ ...prev, name: e.target.value }))}
                                        />
                                        <input
                                            className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                            placeholder="Cloned role label"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy}
                                            value={roleCloneForm.label}
                                            onChange={(e) => setRoleCloneForm((prev) => ({ ...prev, label: e.target.value }))}
                                        />
                                        {(roleCloneFormErrors.sourceRole || roleCloneFormErrors.name || roleCloneFormErrors.permissions) && (
                                            <p className="text-[11px] text-[#B91C1C]">
                                                {roleCloneFormErrors.sourceRole || roleCloneFormErrors.name || roleCloneFormErrors.permissions}
                                            </p>
                                        )}
                                        {roleCloneSodViolations.length > 0 && (
                                            <p className="text-[11px] text-[#92400E]">
                                                SoD check: {roleCloneSodViolations.join(" | ")}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy || !roleCloneForm.sourceRole}
                                            onClick={cloneExistingRole}
                                            className="h-[34px] rounded-[8px] bg-[#92400E] text-white text-[12px] font-[700] disabled:opacity-50"
                                        >
                                            Clone Role
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-[#E5E7EB] rounded-[8px] p-3 bg-[#FAFBFD]">
                                    <p className="text-[13px] font-[700] text-[#111827] mb-2">Role Catalog</p>
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] w-full"
                                        value={selectedRoleName}
                                        onChange={(e) => setSelectedRoleName(e.target.value)}
                                    >
                                        {filteredRoleStudioRoles.map((role) => (
                                            <option key={role.name} value={role.name}>{role.label || titleCase(role.name)}</option>
                                        ))}
                                    </select>
                                    {filteredRoleStudioRoles.length === 0 && (
                                        <p className="text-[11px] text-[#6B7280] mt-1">No roles found for selected filter/search.</p>
                                    )}
                                    {selectedRole && (
                                        <div className="mt-2 text-[12px] text-[#374151] space-y-1">
                                            <p><span className="font-[700]">Type:</span> {titleCase(selectedRole.sourceType || "custom")}</p>
                                            <p><span className="font-[700]">Latest Version:</span> v{selectedRole.latestVersion || 1}</p>
                                            <p><span className="font-[700]">Template:</span> {selectedRole.template || "-"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 border border-[#E5E7EB] rounded-[8px] p-3">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <p className="text-[13px] font-[700] text-[#111827]">Edit Selected Role Permissions</p>
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px] md:w-[260px]"
                                        placeholder="Search permissions"
                                        value={roleStudioPermissionSearch}
                                        onChange={(e) => setRoleStudioPermissionSearch(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="Selected role label"
                                        disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy || !selectedRole}
                                        value={roleForm.label}
                                        onChange={(e) => setRoleForm((prev) => ({ ...prev, label: e.target.value }))}
                                    />
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="Selected role description"
                                        disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy || !selectedRole}
                                        value={roleForm.description}
                                        onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                                {(roleFormErrors.label || roleFormErrors.permissions) && (
                                    <p className="text-[11px] text-[#B91C1C] mt-2">
                                        {roleFormErrors.label || roleFormErrors.permissions}
                                    </p>
                                )}
                                {roleFormSodViolations.length > 0 && (
                                    <p className="text-[11px] text-[#92400E] mt-2">
                                        SoD check: {roleFormSodViolations.join(" | ")}
                                    </p>
                                )}

                                <div className="max-h-[240px] overflow-y-auto border border-[#E5E7EB] rounded-[8px] p-2 mt-2 bg-[#FAFBFD]">
                                    {Object.keys(groupedRoleStudioPermissions).map((group) => (
                                        <div key={group} className="mb-2">
                                            <p className="text-[11px] font-[700] uppercase text-[#6B7280] mb-1">{titleCase(group)}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {groupedRoleStudioPermissions[group]
                                                    .filter((perm) => perm.toLowerCase().includes(roleStudioPermissionSearch.toLowerCase()))
                                                    .map((perm) => (
                                                        <label key={perm} className="inline-flex items-center gap-2 text-[12px]">
                                                            <input
                                                                type="checkbox"
                                                                disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy || !selectedRole}
                                                                checked={roleForm.permissions.includes(perm)}
                                                                onChange={() => setRoleForm((prev) => ({ ...prev, permissions: toggleInArray(prev.permissions, perm) }))}
                                                            />
                                                            {perm}
                                                        </label>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end mt-3">
                                    <button
                                        type="button"
                                        disabled={!canAssignRole || !canAssignPermissions || roleStudioBusy || !selectedRole}
                                        onClick={saveRoleEdits}
                                        className="h-[34px] px-3 rounded-[8px] bg-[#111827] text-white text-[12px] font-[700] disabled:opacity-50"
                                    >
                                        Save Role Changes
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 border border-[#E5E7EB] rounded-[8px] p-3 bg-[#FAFBFD]">
                                <p className="text-[13px] font-[700] text-[#111827] mb-2">Version Timeline</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={leftVersionNumber}
                                        onChange={(e) => setLeftVersionNumber(e.target.value)}
                                    >
                                        {roleVersionTimeline.map((version) => (
                                            <option key={`left-${version.version}`} value={String(version.version)}>
                                                Left: v{version.version}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={rightVersionNumber}
                                        onChange={(e) => setRightVersionNumber(e.target.value)}
                                    >
                                        {roleVersionTimeline.map((version) => (
                                            <option key={`right-${version.version}`} value={String(version.version)}>
                                                Right: v{version.version}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedLeftVersion && selectedRightVersion && (
                                    <div className="border border-[#D1D5DB] rounded-[8px] p-2 bg-white mb-2">
                                        <p className="text-[12px] font-[700] text-[#111827]">
                                            Permission Diff: v{selectedLeftVersion.version}{" -> "}v{selectedRightVersion.version}
                                        </p>
                                        <p className="text-[11px] text-[#166534] mt-1">Added: {roleVersionDiff.added.length}</p>
                                        {roleVersionDiff.added.length > 0 && (
                                            <p className="text-[11px] text-[#374151]">{roleVersionDiff.added.join(", ")}</p>
                                        )}
                                        <p className="text-[11px] text-[#B91C1C] mt-1">Removed: {roleVersionDiff.removed.length}</p>
                                        {roleVersionDiff.removed.length > 0 && (
                                            <p className="text-[11px] text-[#374151]">{roleVersionDiff.removed.join(", ")}</p>
                                        )}
                                    </div>
                                )}

                                <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                                    {loadingRoleVersions && (
                                        <p className="text-[12px] text-[#6B7280]">Loading role versions...</p>
                                    )}

                                    {!loadingRoleVersions && roleVersionTimeline.length === 0 && (
                                        <p className="text-[12px] text-[#6B7280]">No versions available for selected role.</p>
                                    )}

                                    {!loadingRoleVersions && roleVersionTimeline.map((version) => (
                                        <div key={`${selectedRoleName}-${version.version}`} className="border border-[#D1D5DB] rounded-[8px] p-2 bg-white">
                                            <p className="text-[12px] font-[700] text-[#111827]">v{version.version} • {titleCase(version.changeType)}</p>
                                            <p className="text-[11px] text-[#6B7280] mt-1">{version.createdAt || "-"}</p>
                                            <p className="text-[11px] text-[#374151] mt-1">Permissions: {Array.isArray(version.permissions) ? version.permissions.length : 0}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTeamAccessTopic === "api-access" && (
                        <div className="border border-[#E5E7EB] rounded-[10px] p-4 bg-[#FAFBFD]">
                            <p className="text-[15px] font-[700] text-[#111827]">API and Service Access</p>
                            <p className="text-[12px] text-[#6B7280] mt-1">Manage service accounts, scoped keys, rotation, and webhook permissions in one place.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                <Toggle
                                    label="Enable Service API Access"
                                    checked={Boolean(settings.team?.apiServiceAccessControl?.enabled)}
                                    onChange={(next) => updateApiServiceAccessControl("enabled", next)}
                                    description="Allow service accounts to authenticate with scoped API keys."
                                />
                                <Toggle
                                    label="Require Key Expiry"
                                    checked={Boolean(settings.team?.apiServiceAccessControl?.requireExpiry)}
                                    onChange={(next) => updateApiServiceAccessControl("requireExpiry", next)}
                                />
                                <Toggle
                                    label="Enable Webhook Scopes"
                                    checked={Boolean(settings.team?.apiServiceAccessControl?.allowWebhookScopes)}
                                    onChange={(next) => updateApiServiceAccessControl("allowWebhookScopes", next)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <Field label="Default Key TTL (days)">
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={Number(settings.team?.apiServiceAccessControl?.defaultTtlDays || 30)}
                                        onChange={(e) => updateApiServiceAccessControl("defaultTtlDays", Number(e.target.value || 30))}
                                    />
                                </Field>
                                <Field label="Maximum Key TTL (days)">
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={Number(settings.team?.apiServiceAccessControl?.maxTtlDays || 90)}
                                        onChange={(e) => updateApiServiceAccessControl("maxTtlDays", Number(e.target.value || 90))}
                                    />
                                </Field>
                                <Field label="Max Active Keys / Service Account">
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        className="h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={Number(settings.team?.apiServiceAccessControl?.maxActiveKeysPerServiceAccount || 2)}
                                        onChange={(e) => updateApiServiceAccessControl("maxActiveKeysPerServiceAccount", Number(e.target.value || 2))}
                                    />
                                </Field>
                            </div>

                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                <p className="text-[12px] font-[700] text-[#111827] mb-2">Create Service Account Credential</p>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="Credential name"
                                        value={apiCredentialForm.credentialName}
                                        onChange={(e) => setApiCredentialForm((prev) => ({ ...prev, credentialName: e.target.value }))}
                                    />
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="Service account code (optional)"
                                        value={apiCredentialForm.serviceAccountCode}
                                        onChange={(e) => setApiCredentialForm((prev) => ({ ...prev, serviceAccountCode: e.target.value }))}
                                    />
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={apiCredentialForm.roleName}
                                        onChange={(e) => setApiCredentialForm((prev) => ({ ...prev, roleName: e.target.value }))}
                                    >
                                        {(teamRoleOptions || []).map((roleName) => (
                                            <option key={`api-role-${roleName}`} value={roleName}>{titleCase(roleName)}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={Number(apiCredentialForm.ttlDays || 30)}
                                        onChange={(e) => setApiCredentialForm((prev) => ({ ...prev, ttlDays: Number(e.target.value || 30) }))}
                                    />
                                </div>

                                <div className="mt-2">
                                    <p className="text-[11px] font-[700] text-[#374151] mb-1">API Scopes</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {(teamApiScopeOptions || []).map((scope) => (
                                            <label key={`api-scope-${scope}`} className="inline-flex items-center gap-2 text-[11px] text-[#374151]">
                                                <input
                                                    type="checkbox"
                                                    checked={apiCredentialForm.permissionScopes.includes(scope)}
                                                    onChange={() => setApiCredentialForm((prev) => ({
                                                        ...prev,
                                                        permissionScopes: prev.permissionScopes.includes(scope)
                                                            ? prev.permissionScopes.filter((item) => item !== scope)
                                                            : [...prev.permissionScopes, scope],
                                                    }))}
                                                />
                                                {scope}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-2">
                                    <p className="text-[11px] font-[700] text-[#374151] mb-1">Webhook Scopes</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {(teamWebhookScopeOptions || []).map((scope) => (
                                            <label key={`webhook-scope-${scope}`} className="inline-flex items-center gap-2 text-[11px] text-[#374151]">
                                                <input
                                                    type="checkbox"
                                                    checked={apiCredentialForm.webhookScopes.includes(scope)}
                                                    onChange={() => setApiCredentialForm((prev) => ({
                                                        ...prev,
                                                        webhookScopes: prev.webhookScopes.includes(scope)
                                                            ? prev.webhookScopes.filter((item) => item !== scope)
                                                            : [...prev.webhookScopes, scope],
                                                    }))}
                                                />
                                                {scope}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={apiAccessActionBusyId === "create"}
                                        className="h-[30px] px-3 rounded-[6px] bg-[#0955AC] text-white text-[11px] font-[700] disabled:opacity-50"
                                        onClick={createApiCredential}
                                    >
                                        Create API Key
                                    </button>
                                    {latestApiKeySecret && (
                                        <>
                                            <p className="text-[11px] text-[#0F172A]">New key: <span className="font-[700]">{latestApiKeySecret}</span></p>
                                            <button
                                                type="button"
                                                className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151]"
                                                onClick={copyLatestApiKeySecret}
                                            >
                                                Copy Key
                                            </button>
                                            <button
                                                type="button"
                                                className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151]"
                                                onClick={downloadLatestApiKeySecret}
                                            >
                                                Download .txt
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-[12px] font-[700] text-[#111827]">Service Account Credentials</p>
                                    <span className="text-[11px] text-[#6B7280]">Showing {apiCredentialPagination.rows.length} / {apiCredentialPagination.total}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={apiCredentialStatusFilter}
                                        onChange={(e) => setApiCredentialStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="revoked">Revoked</option>
                                        <option value="expired">Expired</option>
                                        <option value="rotated">Rotated</option>
                                    </select>
                                    <select
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        value={apiCredentialServiceFilter}
                                        onChange={(e) => setApiCredentialServiceFilter(e.target.value)}
                                    >
                                        <option value="all">All Service Accounts</option>
                                        {apiServiceAccountOptions.map((serviceAccountCode) => (
                                            <option key={`api-filter-${serviceAccountCode}`} value={serviceAccountCode}>{serviceAccountCode}</option>
                                        ))}
                                    </select>
                                    <input
                                        className="h-[34px] rounded-[8px] border border-[#D1D5DB] px-2 text-[12px]"
                                        placeholder="Search credential, role, scope"
                                        value={apiCredentialSearch}
                                        onChange={(e) => setApiCredentialSearch(e.target.value)}
                                    />
                                </div>

                                {apiCredentialPagination.total === 0 && (
                                    <p className="text-[11px] text-[#6B7280]">No API credentials match current filters.</p>
                                )}

                                <div className="space-y-2">
                                    {apiCredentialPagination.rows.map((credential) => (
                                        <div key={`api-credential-${credential.id}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[12px] font-[700] text-[#111827]">{credential.credentialName} • {credential.serviceAccountCode}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-[700] ${String(credential.status || "active") === "active" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
                                                    {titleCase(credential.status || "active")}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#6B7280] mt-1">
                                                Role: {titleCase(credential.roleName || "-")} • Prefix: {credential.keyPrefix || "-"} • Expires: {credential.expiresAt || "Never"}
                                            </p>
                                            <p className="text-[11px] text-[#6B7280] mt-1">Last Used: {credential.lastUsedAt || "Never"}</p>
                                            <p className="text-[11px] text-[#6B7280] mt-1">Scopes: {(credential.permissionScopes || []).join(", ") || "-"}</p>
                                            <p className="text-[11px] text-[#6B7280] mt-1">Webhook Scopes: {(credential.webhookScopes || []).join(", ") || "-"}</p>

                                            <div className="mt-2 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={apiAccessActionBusyId === `rotate_${credential.id}` || String(credential.status || "") !== "active"}
                                                    className="h-[28px] px-2 rounded-[6px] bg-[#0955AC] text-white text-[10px] font-[700] disabled:opacity-50"
                                                    onClick={() => rotateApiCredential(credential.id)}
                                                >
                                                    Rotate Key
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={apiAccessActionBusyId === `revoke_${credential.id}` || String(credential.status || "") !== "active"}
                                                    className="h-[28px] px-2 rounded-[6px] border border-[#FCA5A5] text-[#B91C1C] text-[10px] font-[700] disabled:opacity-50"
                                                    onClick={() => revokeApiCredential(credential.id)}
                                                >
                                                    Revoke Key
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-2 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151] disabled:opacity-50"
                                        disabled={apiCredentialPagination.currentPage <= 1}
                                        onClick={() => setApiCredentialPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Prev
                                    </button>
                                    <span className="text-[11px] text-[#6B7280]">
                                        Page {apiCredentialPagination.currentPage} of {apiCredentialPagination.totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        className="h-[30px] px-2 rounded-[6px] border border-[#D1D5DB] text-[11px] font-[700] text-[#374151] disabled:opacity-50"
                                        disabled={apiCredentialPagination.currentPage >= apiCredentialPagination.totalPages}
                                        onClick={() => setApiCredentialPage((prev) => Math.min(apiCredentialPagination.totalPages, prev + 1))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                <p className="text-[12px] font-[700] text-[#111827] mb-1">Usage Analytics by Service Account</p>
                                <p className="text-[11px] text-[#6B7280] mb-2">Scores combine key recency, active credential count, and scope footprint.</p>

                                {apiServiceAccountAnalytics.length === 0 && (
                                    <p className="text-[11px] text-[#6B7280]">No service account analytics available yet.</p>
                                )}

                                <div className="space-y-2">
                                    {apiServiceAccountAnalytics.map((row) => (
                                        <div key={`api-analytics-${row.serviceAccountCode}`} className="border border-[#E5E7EB] rounded-[8px] p-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[12px] font-[700] text-[#111827]">{row.serviceAccountCode}</p>
                                                <p className="text-[11px] text-[#6B7280]">Score: {row.usageScore}/100</p>
                                            </div>
                                            <div className="mt-1 h-[8px] w-full rounded-full bg-[#E5E7EB] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-[#0955AC]"
                                                    style={{ width: `${row.usageScore}%` }}
                                                />
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-[#475569]">
                                                <span>Total Keys: {row.total}</span>
                                                <span>Active: {row.active}</span>
                                                <span>Revoked: {row.revoked}</span>
                                                <span>Expiring ≤ 7d: {row.expiringSoon}</span>
                                            </div>
                                            <p className="text-[11px] text-[#6B7280] mt-1">Last Used: {row.lastUsedLabel}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3 border border-[#E5E7EB] rounded-[8px] p-2 bg-white">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div>
                                        <p className="text-[12px] font-[700] text-[#111827]">API Key Trend Charts</p>
                                        <p className="text-[11px] text-[#6B7280]">Lifecycle events come from immutable audit logs; usage touches come from key last-used timestamps.</p>
                                    </div>
                                    <select
                                        className="h-[32px] rounded-[8px] border border-[#D1D5DB] px-2 text-[11px]"
                                        value={String(apiTrendWindowDays)}
                                        onChange={(e) => setApiTrendWindowDays(Number(e.target.value || 30))}
                                    >
                                        <option value="14">Last 14 Days</option>
                                        <option value="30">Last 30 Days</option>
                                        <option value="60">Last 60 Days</option>
                                        <option value="90">Last 90 Days</option>
                                    </select>
                                </div>

                                {apiAccessTrendRows.every((row) => row.created === 0 && row.rotated === 0 && row.revoked === 0 && row.used === 0) && (
                                    <p className="text-[11px] text-[#6B7280]">No trend points available for this window yet.</p>
                                )}

                                {!apiAccessTrendRows.every((row) => row.created === 0 && row.rotated === 0 && row.revoked === 0 && row.used === 0) && (
                                    <>
                                        <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-[#475569]">
                                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0955AC]" />Created</span>
                                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#0E7490]" />Rotated</span>
                                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#B91C1C]" />Revoked</span>
                                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#166534]" />Used (last-seen)</span>
                                        </div>

                                        <div className="h-[180px] border border-[#E5E7EB] rounded-[8px] p-2 overflow-x-auto">
                                            <div className="h-full min-w-[680px] flex items-end gap-1">
                                                {apiAccessTrendRows.map((row) => {
                                                    const lifecycleTotal = row.created + row.rotated + row.revoked;
                                                    const lifecycleHeight = Math.max(2, Math.round((lifecycleTotal / apiAccessTrendScale) * 120));
                                                    const usedHeight = Math.max(2, Math.round((row.used / apiAccessTrendScale) * 120));
                                                    const createdPct = lifecycleTotal > 0 ? (row.created / lifecycleTotal) * 100 : 0;
                                                    const rotatedPct = lifecycleTotal > 0 ? (row.rotated / lifecycleTotal) * 100 : 0;
                                                    const revokedPct = lifecycleTotal > 0 ? (row.revoked / lifecycleTotal) * 100 : 0;

                                                    return (
                                                        <div key={`api-trend-${row.dayKey}`} className="flex-1 min-w-[8px] max-w-[22px] flex flex-col items-center justify-end gap-1">
                                                            <div className="w-full flex items-end justify-center gap-[2px] h-[130px]">
                                                                <div className="w-[7px] rounded-[2px] overflow-hidden bg-[#E2E8F0]" style={{ height: `${lifecycleHeight}px` }} title={`${row.label}: Created ${row.created}, Rotated ${row.rotated}, Revoked ${row.revoked}`}>
                                                                    <div className="bg-[#0955AC]" style={{ height: `${createdPct}%` }} />
                                                                    <div className="bg-[#0E7490]" style={{ height: `${rotatedPct}%` }} />
                                                                    <div className="bg-[#B91C1C]" style={{ height: `${revokedPct}%` }} />
                                                                </div>
                                                                <div className="w-[5px] rounded-[2px] bg-[#166534]" style={{ height: `${usedHeight}px` }} title={`${row.label}: Used ${row.used}`} />
                                                            </div>
                                                            <span className="text-[9px] text-[#94A3B8] [writing-mode:vertical-rl] rotate-180 h-[32px]">{row.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
        );
    })();

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <CourierFeedbackModal
                open={Boolean(feedback)}
                type={feedback?.type || "info"}
                message={feedback?.message || ""}
                passwordChangeRequired={Boolean(feedback?.passwordChangeRequired)}
                passwordChangeTargetUrl={feedback?.passwordChangeTargetUrl || ""}
                onClose={closeFeedback}
            />

            <CourierFeedbackModal
                open={confirmState.open}
                type={confirmState.type || "warning"}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText || "Confirm"}
                showCancel={true}
                onConfirm={runConfirm}
                onClose={closeConfirm}
            />

            {addTierModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-[460px] rounded-[12px] bg-white border border-[#E5E7EB] p-4 shadow-2xl">
                        <p className="text-[15px] font-[700] text-[#111827]">Add Speed/ETA Tier</p>
                        <p className="mt-1 text-[12px] text-[#6B7280]">
                            Create a new tier key for {titleCase(addTierModalCategory)} pricing (example: priority_weekend).
                        </p>
                        <div className="mt-3">
                            <label className="block text-[12px] font-[700] text-[#374151]">Tier Key</label>
                            <input
                                autoFocus
                                className="mt-1 h-[36px] w-full rounded-[8px] border border-[#D1D5DB] px-3 text-[13px]"
                                value={addTierDraftKey}
                                onChange={(e) => {
                                    setAddTierDraftKey(e.target.value);
                                    if (addTierDraftError) {
                                        setAddTierDraftError("");
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addPricingTierEngineTier(addTierModalCategory, addTierDraftKey);
                                    }
                                }}
                                placeholder="priority_weekend"
                            />
                            {addTierDraftError && <p className="mt-1 text-[11px] text-[#DC2626]">{addTierDraftError}</p>}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                className="h-[34px] px-3 rounded-[8px] border border-[#D1D5DB] text-[12px] font-[700] text-[#374151]"
                                onClick={closeAddTierModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="h-[34px] px-3 rounded-[8px] bg-[#0955AC] text-white text-[12px] font-[700]"
                                onClick={() => addPricingTierEngineTier(addTierModalCategory, addTierDraftKey)}
                            >
                                Add Tier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Settings</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Configure courier operations, SLA policies, tracking rules, notifications, and access controls.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button type="button" onClick={resetAll} className="h-[38px] px-4 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]">
                        Reset Defaults
                    </button>
                    <button type="button" onClick={saveAll} className="h-[38px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">
                        Save All
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {tabContent}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => saveSection(activeTab)}
                        className="h-[38px] px-5 rounded-[8px] bg-[#111827] text-white text-[13px] font-[700]"
                    >
                        Save {saveButtonLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
