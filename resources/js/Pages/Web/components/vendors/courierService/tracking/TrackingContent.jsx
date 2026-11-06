import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";

const EMPTY = {
    summary: {
        inTransitNow: 0,
        outForDeliveryNow: 0,
        delayedNow: 0,
        exceptionNow: 0,
        unscanned6h: 0,
        deliveredToday: 0,
    },
    rows: [],
    filters: {
        q: "",
        category: "",
        service: "",
        status: "",
        stage: "",
        sla: "",
        fromDate: "",
        toDate: "",
        perPage: 10,
        page: 1,
    },
    pagination: {
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
    },
    filterOptions: {
        stages: [],
        statuses: [],
        services: [],
        categories: [],
        slaStatuses: [],
        unscannedHourOptions: [0, 6, 12, 24],
        groupByOptions: [
            { value: "", label: "None" },
            { value: "provider", label: "Provider" },
        ],
        perPageOptions: [10, 20, 50],
    },
    providerStats: [],
};

const SHIPMENT_STAGE_ACTION_LABELS = {
    accept_assignment: "Accept",
    ready_for_pickup: "Ready",
    picked_up: "Picked Up",
    in_transit: "In Transit",
    out_for_delivery: "Out for Delivery",
    mark_exception: "Exception",
    mark_delivered: "Deliver",
    cancel_shipment: "Cancel",
};

const COD_COLLECTION_ACTION_LABELS = {
    cod_collected: "COD Collected",
    cod_failed: "COD Failed",
    cod_refused: "COD Refused",
};

const actionLabels = {
    ...SHIPMENT_STAGE_ACTION_LABELS,
    ...COD_COLLECTION_ACTION_LABELS,
};

const COD_COLLECTION_ACTIONS = ["cod_collected", "cod_failed", "cod_refused"];
const DESTRUCTIVE_ACTIONS = ["cancel_shipment", "cod_failed", "cod_refused"];

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatMoney = (value, currency = "LKR") => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
        return "-";
    }

    return `${amount.toFixed(2)} ${currency || "LKR"}`;
};
const buildRowActions = (row) => {
    const shipmentActions = Array.isArray(row?.allowedActions) ? row.allowedActions : [];
    const codActions = Array.isArray(row?.codAllowedActions) ? row.codAllowedActions : [];

    return Array.from(new Set([...shipmentActions, ...codActions]));
};

const stageBadge = (stage) => {
    switch (stage) {
        case "new_assignments":
            return "bg-[#EEF2FF] text-[#3730A3]";
        case "ready_for_pickup":
            return "bg-[#E0F2FE] text-[#075985]";
        case "picked_up":
        case "in_transit":
        case "out_for_delivery":
            return "bg-[#FEF3C7] text-[#92400E]";
        case "exception":
            return "bg-[#FEE2E2] text-[#991B1B]";
        case "delivered":
            return "bg-[#DCFCE7] text-[#166534]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const slaBadge = (slaStatus) => {
    switch (slaStatus) {
        case "delayed":
            return "bg-[#FEE2E2] text-[#991B1B]";
        case "at_risk":
            return "bg-[#FEF3C7] text-[#92400E]";
        case "early":
            return "bg-[#DCFCE7] text-[#166534]";
        case "on_time":
            return "bg-[#DBEAFE] text-[#1D4ED8]";
        case "on_track":
            return "bg-[#E0F2FE] text-[#075985]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const TrackingContent = () => {
    const props = usePage().props;
    const tracking = props.courierTracking || EMPTY;
    const flash = props.flash || {};

    const filterOptions = {
        stages: Array.isArray(tracking?.filterOptions?.stages) ? tracking.filterOptions.stages : EMPTY.filterOptions.stages,
        statuses: Array.isArray(tracking?.filterOptions?.statuses) ? tracking.filterOptions.statuses : EMPTY.filterOptions.statuses,
        services: Array.isArray(tracking?.filterOptions?.services) ? tracking.filterOptions.services : EMPTY.filterOptions.services,
        categories: Array.isArray(tracking?.filterOptions?.categories) ? tracking.filterOptions.categories : EMPTY.filterOptions.categories,
        slaStatuses: Array.isArray(tracking?.filterOptions?.slaStatuses) ? tracking.filterOptions.slaStatuses : EMPTY.filterOptions.slaStatuses,
        unscannedHourOptions: Array.isArray(tracking?.filterOptions?.unscannedHourOptions) ? tracking.filterOptions.unscannedHourOptions : EMPTY.filterOptions.unscannedHourOptions,
        groupByOptions: Array.isArray(tracking?.filterOptions?.groupByOptions) ? tracking.filterOptions.groupByOptions : EMPTY.filterOptions.groupByOptions,
        perPageOptions: Array.isArray(tracking?.filterOptions?.perPageOptions) ? tracking.filterOptions.perPageOptions : EMPTY.filterOptions.perPageOptions,
    };

    const trackingRows = Array.isArray(tracking?.rows) ? tracking.rows : [];
    const providerStats = Array.isArray(tracking?.providerStats) ? tracking.providerStats : [];

    const [filters, setFilters] = useState({
        q: tracking.filters.q || "",
        category: tracking.filters.category || "",
        service: tracking.filters.service || "",
        status: tracking.filters.status || "",
        stage: tracking.filters.stage || "",
        sla: tracking.filters.sla || "",
        exceptionOnly: tracking.filters.exceptionOnly || "",
        unscannedHours: tracking.filters.unscannedHours || 0,
        groupBy: tracking.filters.groupBy || "",
        fromDate: tracking.filters.fromDate || "",
        toDate: tracking.filters.toDate || "",
        perPage: tracking.filters.perPage || 10,
    });

    const [selectedShipment, setSelectedShipment] = useState(null);
    const [codModalOpen, setCodModalOpen] = useState(false);
    const [codModalShipment, setCodModalShipment] = useState(null);
    const [codCollectedAmount, setCodCollectedAmount] = useState("");

    const {
        feedback,
        closeFeedback,
        setFeedback,
        confirmState,
        openConfirm,
        closeConfirm,
        runConfirm,
    } = useCourierActionModal(flash);

    const summaryCards = useMemo(
        () => [
            { key: "inTransitNow", label: "In Transit Now", value: tracking.summary.inTransitNow },
            { key: "outForDeliveryNow", label: "Out For Delivery", value: tracking.summary.outForDeliveryNow },
            { key: "delayedNow", label: "Delayed", value: tracking.summary.delayedNow },
            { key: "exceptionNow", label: "Exceptions", value: tracking.summary.exceptionNow },
            { key: "unscanned6h", label: "Unscanned > 6h", value: tracking.summary.unscanned6h },
            { key: "deliveredToday", label: "Delivered Today", value: tracking.summary.deliveredToday },
        ],
        [tracking.summary],
    );

    const submitFilters = (page = 1, overrides = {}) => {
        router.get(
            route("courierService.tracking"),
            {
                ...filters,
                ...overrides,
                page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const openCodCollectedModal = (shipment) => {
        const requestedAmount = Number(shipment?.codRequestedAmount);
        const defaultAmount = Number.isFinite(requestedAmount) && requestedAmount > 0
            ? requestedAmount.toFixed(2)
            : "";

        setCodModalShipment(shipment);
        setCodCollectedAmount(defaultAmount);
        setCodModalOpen(true);
    };

    const closeCodCollectedModal = () => {
        setCodModalOpen(false);
        setCodModalShipment(null);
        setCodCollectedAmount("");
    };

    const submitCodCollected = () => {
        if (!codModalShipment) {
            return;
        }

        if (!Boolean(codModalShipment?.canManageBookingLifecycle)) {
            setFeedback({ type: "error", message: "You do not have permission to manage booking lifecycle actions." });
            return;
        }

        const amount = Number(codCollectedAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setFeedback({ type: "error", message: "Enter a valid COD collected amount." });
            return;
        }

        const requested = Number(codModalShipment.codRequestedAmount);
        if (Number.isFinite(requested) && amount - requested > 0.01) {
            setFeedback({ type: "error", message: "Collected amount cannot exceed the requested COD amount." });
            return;
        }

        if (!Boolean(codModalShipment?.canCodOverride) && Number.isFinite(requested) && requested - amount > 0.01) {
            setFeedback({ type: "error", message: "You do not have permission to record a COD amount below the requested value." });
            return;
        }

        router.post(
            route("courierService.bookings.lifecycle", codModalShipment.id),
            { action: "cod_collected", codCollectedAmount: amount },
            {
                preserveScroll: true,
                onSuccess: closeCodCollectedModal,
            },
        );
    };

    const runStageAction = (shipment, action) => {
        if (!shipment) {
            return;
        }

        const isCodAction = COD_COLLECTION_ACTIONS.includes(action);

        if (isCodAction && !Boolean(shipment?.canManageBookingLifecycle)) {
            setFeedback({ type: "error", message: "You do not have permission to manage booking lifecycle actions." });
            return;
        }

        if (isCodAction && !shipment?.codEnabled) {
            setFeedback({ type: "error", message: "COD is not enabled for this shipment." });
            return;
        }

        if (action === "cod_collected") {
            openCodCollectedModal(shipment);
            return;
        }

        const execute = () => {
            router.post(
                isCodAction
                    ? route("courierService.bookings.lifecycle", shipment.id)
                    : route("courierService.shipments.stage", shipment.id),
                { action },
                { preserveScroll: true },
            );
        };

        if (DESTRUCTIVE_ACTIONS.includes(action)) {
            openConfirm({
                title: "Confirm Tracking Action",
                message: `Are you sure you want to ${titleCase(action)} for this shipment?`,
                onConfirm: execute,
            });
            return;
        }

        execute();
    };

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

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Tracking</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Real-time shipment monitoring, SLA risk detection, and exception operations.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">
                {summaryCards.map((card) => (
                    <div key={card.key} className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <p className="text-[12px] text-[#6B7280] font-[600]">{card.label}</p>
                        <p className="text-[26px] leading-tight font-[700] mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[10px] p-4 mt-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            const next = filters.exceptionOnly === "1" ? "" : "1";
                            setFilters((prev) => ({ ...prev, exceptionOnly: next }));
                            submitFilters(1, { exceptionOnly: next });
                        }}
                        className={`px-3 py-2 rounded-full text-[12px] font-[700] ${
                            filters.exceptionOnly === "1"
                                ? "bg-[#991B1B] text-white"
                                : "bg-white text-[#991B1B] border border-[#FCA5A5]"
                        }`}
                    >
                        Exception Only
                    </button>

                    {filterOptions.unscannedHourOptions.map((hours) => (
                        <button
                            key={hours}
                            type="button"
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, unscannedHours: hours }));
                                submitFilters(1, { unscannedHours: hours });
                            }}
                            className={`px-3 py-2 rounded-full text-[12px] font-[700] ${
                                Number(filters.unscannedHours) === Number(hours)
                                    ? "bg-[#0955AC] text-white"
                                    : "bg-white text-[#4B5563]"
                            }`}
                            style={Number(filters.unscannedHours) === Number(hours) ? {} : { boxShadow: "2px 2px 4px #00000014" }}
                        >
                            {hours === 0 ? "Any Scan" : `No Scan > ${hours}h`}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-10 gap-2 mb-4">
                    <div className="xl:col-span-2 h-[38px] rounded-[8px] bg-[#F3F4F6] px-3 flex items-center gap-2">
                        <Search size={16} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={filters.q}
                            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                            placeholder="Search Booking/Tracking"
                            className="w-full border-none bg-transparent outline-none focus:ring-0"
                        />
                    </div>

                    <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Category</option>
                        {filterOptions.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>

                    <select value={filters.service} onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Service</option>
                        {filterOptions.services.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>

                    <select value={filters.stage} onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Stage</option>
                        {filterOptions.stages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>

                    <select value={filters.sla} onChange={(e) => setFilters((prev) => ({ ...prev, sla: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">SLA Status</option>
                        {filterOptions.slaStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>

                    <select value={filters.groupBy} onChange={(e) => setFilters((prev) => ({ ...prev, groupBy: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Group By</option>
                        {filterOptions.groupByOptions.map((item) => <option key={item.value || "none"} value={item.value}>{item.label}</option>)}
                    </select>

                    <div className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-2 flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} className="w-full border-none outline-none focus:ring-0 text-[13px]" />
                    </div>

                    <div className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-2 flex items-center gap-2">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} className="w-full border-none outline-none focus:ring-0 text-[13px]" />
                    </div>

                    <button type="button" onClick={() => submitFilters(1)} className="h-[38px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">Apply</button>
                    <button
                        type="button"
                        onClick={() => {
                            const reset = {
                                q: "",
                                category: "",
                                service: "",
                                status: "",
                                stage: "",
                                sla: "",
                                exceptionOnly: "",
                                unscannedHours: 0,
                                groupBy: "",
                                fromDate: "",
                                toDate: "",
                                perPage: filters.perPage,
                            };
                            setFilters(reset);
                            submitFilters(1, reset);
                        }}
                        className="h-[38px] rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const params = new URLSearchParams({
                                q: filters.q || "",
                                category: filters.category || "",
                                service: filters.service || "",
                                status: filters.status || "",
                                stage: filters.stage || "",
                                sla: filters.sla || "",
                                exceptionOnly: filters.exceptionOnly || "",
                                unscannedHours: String(filters.unscannedHours || 0),
                                fromDate: filters.fromDate || "",
                                toDate: filters.toDate || "",
                                export: "csv",
                            });
                            window.location.href = `${route("courierService.tracking")}?${params.toString()}`;
                        }}
                        className="h-[38px] rounded-[8px] border border-[#0955AC] text-[#0955AC] text-[13px] font-[700]"
                    >
                        Export CSV
                    </button>
                </div>

                {filters.groupBy === "provider" && providerStats.length > 0 && (
                    <div className="mb-4 overflow-x-auto">
                        <div className="flex gap-3 min-w-max">
                            {providerStats.map((item) => (
                                <div key={item.provider} className="min-w-[220px] rounded-[10px] border border-[#E5E7EB] px-3 py-3 bg-[#FAFAFA]">
                                    <p className="text-[12px] font-[700] text-[#111827]">{item.provider}</p>
                                    <p className="text-[12px] text-[#6B7280] mt-1">Total: {item.total}</p>
                                    <p className="text-[12px] text-[#6B7280]">In Transit: {item.inTransit}</p>
                                    <p className="text-[12px] text-[#6B7280]">Delayed: {item.delayed}</p>
                                    <p className="text-[12px] text-[#6B7280]">Exceptions: {item.exceptions}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-max min-w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#D8E4F2]">
                            <tr>
                                <th className="px-3 py-3 font-[700]">Tracking No</th>
                                <th className="px-3 py-3 font-[700]">Booking No</th>
                                <th className="px-3 py-3 font-[700]">Route</th>
                                <th className="px-3 py-3 font-[700]">Current Stage</th>
                                <th className="px-3 py-3 font-[700]">Current Location</th>
                                <th className="px-3 py-3 font-[700]">Last Scan</th>
                                <th className="px-3 py-3 font-[700]">ETA</th>
                                <th className="px-3 py-3 font-[700]">SLA</th>
                                <th className="px-3 py-3 font-[700]">COD</th>
                                <th className="px-3 py-3 font-[700]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trackingRows.length > 0 ? (
                                trackingRows.map((row) => {
                                    const rowActions = buildRowActions(row);

                                    return (
                                    <tr key={row.id} className="border-b border-[#E5E7EB] cursor-pointer" onClick={() => setSelectedShipment(row)}>
                                        <td className="px-3 py-3 font-[700]">{row.trackingNumber}</td>
                                        <td className="px-3 py-3">{row.bookingNumber}</td>
                                        <td className="px-3 py-3">{row.origin} to {row.destination}</td>
                                        <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${stageBadge(row.stage)}`}>{row.stageLabel}</span></td>
                                        <td className="px-3 py-3">{row.currentLocation || "-"}</td>
                                        <td className="px-3 py-3">{row.lastScanAt || "-"}</td>
                                        <td className="px-3 py-3">{row.eta || "-"}</td>
                                        <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${slaBadge(row.slaStatus)}`}>{titleCase(row.slaStatus)}</span></td>
                                        <td className="px-3 py-3">
                                            {row.codEnabled ? (
                                                <div className="text-[11px] leading-4 text-[#374151]">
                                                    <p>Req: {formatMoney(row.codRequestedAmount, row.currency)}</p>
                                                    <p>Collected: {formatMoney(row.codCollectedAmount, row.currency)}</p>
                                                    <p>Status: {row.codCollectionStatus ? titleCase(row.codCollectionStatus) : "Pending"}</p>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-[#9CA3AF]">No COD</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                {rowActions.map((action) => (
                                                    <button
                                                        key={action}
                                                        type="button"
                                                        onClick={() => runStageAction(row, action)}
                                                        className="px-2 py-1 rounded-[5px] bg-[#F3F4F6] text-[11px] font-[700]"
                                                    >
                                                        {actionLabels[action] || titleCase(action)}
                                                    </button>
                                                ))}
                                                {rowActions.length === 0 && <span className="text-[11px] text-[#9CA3AF]">No actions</span>}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-3 py-10 text-center text-[#6B7280]">No tracking records found for current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-5">
                    <div className="flex items-center gap-2 text-[13px]">
                        <span>Rows per page</span>
                        <div className="relative">
                            <select
                                value={filters.perPage}
                                onChange={(e) => {
                                    const nextPerPage = Number(e.target.value);
                                    setFilters((prev) => ({ ...prev, perPage: nextPerPage }));
                                    submitFilters(1, { perPage: nextPerPage });
                                }}
                                className="h-[34px] rounded-[6px] border border-[#D1D5DB] px-3 pr-7 text-[13px]"
                            >
                                {filterOptions.perPageOptions.map((count) => <option key={count} value={count}>{count}</option>)}
                            </select>
                            <ChevronDown className="size-[14px] text-[#6B7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <p className="text-[13px] text-[#6B7280]">Page {tracking.pagination.page} / {tracking.pagination.totalPages} ({tracking.pagination.total} records)</p>

                    <div className="flex gap-2">
                        <button type="button" disabled={tracking.pagination.page <= 1} onClick={() => submitFilters(tracking.pagination.page - 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Previous</button>
                        <button type="button" disabled={tracking.pagination.page >= tracking.pagination.totalPages} onClick={() => submitFilters(tracking.pagination.page + 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {codModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50" onClick={closeCodCollectedModal}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-[440px] bg-white p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-[22px] font-[700]">Record COD Collection</h2>
                        <p className="text-[13px] text-[#6B7280] mt-1">
                            Shipment {codModalShipment?.bookingNumber || codModalShipment?.trackingNumber || "-"}
                        </p>

                        <div className="mt-4">
                            <label className="block text-[13px] font-[700] text-[#111827] mb-1">
                                Collected amount ({codModalShipment?.currency || "LKR"})
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full h-[40px] rounded-[8px] border border-[#D1D5DB] px-3 text-[13px]"
                                value={codCollectedAmount}
                                onChange={(e) => setCodCollectedAmount(e.target.value)}
                            />
                            {codModalShipment?.codRequestedAmount !== null && codModalShipment?.codRequestedAmount !== undefined && (
                                <p className="text-[12px] text-[#6B7280] mt-2">
                                    Requested: {formatMoney(codModalShipment.codRequestedAmount, codModalShipment?.currency || "LKR")}
                                </p>
                            )}
                            {!Boolean(codModalShipment?.canCodOverride) && (
                                <p className="text-[11px] text-[#B45309] mt-2">
                                    Partial COD collection is blocked for your account.
                                </p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCodCollectedModal}
                                className="h-[36px] px-4 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitCodCollected}
                                className="h-[36px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]"
                            >
                                Record Collection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedShipment && (
                <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedShipment(null)}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-[450px] bg-white p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-[24px] font-[700] mb-4">Tracking Timeline</h2>
                        <div className="space-y-3 text-[14px] mb-5">
                            <p><span className="font-[700]">Tracking:</span> {selectedShipment.trackingNumber}</p>
                            <p><span className="font-[700]">Booking:</span> {selectedShipment.bookingNumber}</p>
                            <p><span className="font-[700]">Route:</span> {selectedShipment.origin} to {selectedShipment.destination}</p>
                            <p><span className="font-[700]">Stage:</span> {selectedShipment.stageLabel}</p>
                            <p><span className="font-[700]">SLA:</span> {titleCase(selectedShipment.slaStatus)}</p>
                            {selectedShipment.codEnabled ? (
                                <>
                                    <p><span className="font-[700]">COD Requested:</span> {formatMoney(selectedShipment.codRequestedAmount, selectedShipment.currency)}</p>
                                    <p><span className="font-[700]">COD Collected:</span> {formatMoney(selectedShipment.codCollectedAmount, selectedShipment.currency)}</p>
                                    <p><span className="font-[700]">COD Status:</span> {selectedShipment.codCollectionStatus ? titleCase(selectedShipment.codCollectionStatus) : "Pending"}</p>
                                    <p><span className="font-[700]">COD Recorded:</span> {selectedShipment.codCollectionRecordedAt || "-"}</p>
                                </>
                            ) : (
                                <p><span className="font-[700]">COD:</span> Not enabled</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            {(selectedShipment.timeline || []).length > 0 ? (
                                selectedShipment.timeline.map((event, index) => (
                                    <div key={`${event.recordedAt || "na"}-${index}`} className="rounded-[8px] border border-[#E5E7EB] p-3">
                                        <p className="text-[12px] font-[700]">{event.statusLabel}</p>
                                        <p className="text-[12px] text-[#6B7280]">{event.recordedAt || "-"}</p>
                                        <p className="text-[12px]">{event.location || "No location"}</p>
                                        <p className="text-[12px] text-[#6B7280]">{event.description || "-"}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-[13px] text-[#6B7280]">No tracking timeline events.</p>
                            )}
                        </div>

                        <button type="button" className="mt-6 w-full h-[40px] rounded-[8px] bg-[#0955AC] text-white font-[700]" onClick={() => setSelectedShipment(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackingContent;
