import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";

const EMPTY = {
    summary: {
        newRequestsToday: 0,
        awaitingConfirmation: 0,
        confirmedToday: 0,
        cancellationsToday: 0,
        conversionRate: 0,
        avgConfirmationHours: 0,
    },
    rows: [],
    filters: {
        q: "",
        category: "",
        service: "",
        bookingStatus: "",
        paymentStatus: "",
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
        bookingStatuses: [],
        paymentStatuses: [],
        categories: [],
        services: [],
        perPageOptions: [10, 20, 50],
        actionOptions: [],
    },
    statusCounts: [],
};

const actionLabels = {
    accept_booking: "Accept",
    request_revision: "Request Revision",
    send_quote: "Send Quote",
    mark_awaiting_confirmation: "Awaiting Confirmation",
    cancel_booking: "Cancel",
    reject_booking: "Reject",
    expire_booking: "Expire",
    reopen_booking: "Reopen",
    cod_collected: "COD Collected",
    cod_failed: "COD Failed",
    cod_refused: "COD Refused",
};

const DESTRUCTIVE_BOOKING_ACTIONS = ["cancel_booking", "reject_booking", "expire_booking", "cod_failed", "cod_refused"];
const COD_COLLECTION_ACTIONS = ["cod_collected", "cod_failed", "cod_refused"];

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const bookingBadge = (status) => {
    switch (status) {
        case "new_request":
            return "bg-[#EEF2FF] text-[#3730A3]";
        case "quote_pending":
            return "bg-[#FFF7ED] text-[#9A3412]";
        case "quoted":
            return "bg-[#DBEAFE] text-[#1E40AF]";
        case "awaiting_client_confirmation":
            return "bg-[#FEF3C7] text-[#92400E]";
        case "confirmed":
            return "bg-[#DCFCE7] text-[#166534]";
        case "cancelled":
        case "rejected":
        case "expired":
            return "bg-[#FEE2E2] text-[#991B1B]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const paymentBadge = (status) => {
    switch (status) {
        case "paid":
            return "bg-[#DCFCE7] text-[#166534]";
        case "pending":
            return "bg-[#FEF3C7] text-[#92400E]";
        default:
            return "bg-[#FEE2E2] text-[#991B1B]";
    }
};

const BookingContent = () => {
    const props = usePage().props;
    const bookings = props.courierBookings || EMPTY;
    const flash = props.flash || {};

    const [filters, setFilters] = useState({
        q: bookings.filters.q || "",
        category: bookings.filters.category || "",
        service: bookings.filters.service || "",
        bookingStatus: bookings.filters.bookingStatus || "",
        paymentStatus: bookings.filters.paymentStatus || "",
        fromDate: bookings.filters.fromDate || "",
        toDate: bookings.filters.toDate || "",
        perPage: bookings.filters.perPage || 10,
    });

    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkAction, setBulkAction] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [codModalOpen, setCodModalOpen] = useState(false);
    const [codModalBooking, setCodModalBooking] = useState(null);
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

    useEffect(() => {
        const msg = String(flash.error || "").toLowerCase();
        if (msg.includes("step-up authentication is required")) {
            if (typeof window !== "undefined") {
                window.sessionStorage.setItem("courier.profileStepUpGuidancePending", "1");
            }
            router.get(route("courierService.profile.module", { module: "security" }), {}, {
                preserveScroll: true,
                preserveState: false,
                replace: true,
            });
        }
    }, [flash.error]);

    const summaryCards = useMemo(
        () => [
            { key: "newRequestsToday", label: "New Requests Today", value: bookings.summary.newRequestsToday },
            { key: "awaitingConfirmation", label: "Awaiting Confirmation", value: bookings.summary.awaitingConfirmation },
            { key: "confirmedToday", label: "Confirmed Today", value: bookings.summary.confirmedToday },
            { key: "cancellationsToday", label: "Cancellations Today", value: bookings.summary.cancellationsToday },
            { key: "conversionRate", label: "Conversion Rate", value: `${bookings.summary.conversionRate}%` },
            { key: "avgConfirmationHours", label: "Avg Confirm Time", value: `${bookings.summary.avgConfirmationHours}h` },
        ],
        [bookings.summary],
    );

    const bookingStatusPills = useMemo(() => {
        const allCount = bookings.statusCounts.reduce((total, item) => total + Number(item.count || 0), 0);

        return [
            { value: "", label: "All", count: allCount },
            ...bookings.statusCounts,
        ];
    }, [bookings.statusCounts]);

    const hasActiveFilters = useMemo(() => {
        return Boolean(
            filters.q ||
            filters.category ||
            filters.service ||
            filters.bookingStatus ||
            filters.paymentStatus ||
            filters.fromDate ||
            filters.toDate,
        );
    }, [filters]);

    const submitFilters = (page = 1, overrides = {}) => {
        router.get(
            route("courierService.bookings"),
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

    const openCodCollectedModal = (booking) => {
        if (!booking) {
            return;
        }

        const requested = Number(booking.codRequestedAmount);
        const defaultAmount = Number.isFinite(requested) && requested > 0
            ? requested.toFixed(2)
            : "";

        setCodModalBooking(booking);
        setCodCollectedAmount(defaultAmount);
        setCodModalOpen(true);
    };

    const closeCodCollectedModal = () => {
        setCodModalOpen(false);
        setCodModalBooking(null);
        setCodCollectedAmount("");
    };

    const submitCodCollected = () => {
        if (!codModalBooking) {
            return;
        }

        const amount = Number(codCollectedAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            setFeedback({ type: "error", message: "Enter a valid COD collected amount." });
            return;
        }

        const requested = Number(codModalBooking.codRequestedAmount);
        if (Number.isFinite(requested) && requested > 0 && amount - requested > 0.01) {
            setFeedback({ type: "error", message: "Collected amount cannot exceed the requested COD amount." });
            return;
        }

        if (!Boolean(codModalBooking?.canCodOverride) && Number.isFinite(requested) && requested - amount > 0.01) {
            setFeedback({ type: "error", message: "You do not have permission to record a COD amount below the requested value." });
            return;
        }

        router.post(
            route("courierService.bookings.lifecycle", codModalBooking.id),
            { action: "cod_collected", codCollectedAmount: amount },
            {
                preserveScroll: true,
                onSuccess: closeCodCollectedModal,
            },
        );
    };

    const runAction = (booking, action) => {
        const shipmentId = booking?.id;
        if (!shipmentId) {
            return;
        }

        if (COD_COLLECTION_ACTIONS.includes(action) && !booking?.codEnabled) {
            setFeedback({ type: "error", message: "COD is not enabled for this booking." });
            return;
        }

        if (action === "cod_collected") {
            openCodCollectedModal(booking);
            return;
        }

        const execute = () => {
            router.post(route("courierService.bookings.lifecycle", shipmentId), { action }, { preserveScroll: true });
        };

        if (DESTRUCTIVE_BOOKING_ACTIONS.includes(action)) {
            openConfirm({
                title: "Confirm Booking Action",
                message: `Are you sure you want to ${titleCase(action)} for this booking? This affects booking lifecycle and can impact operations.`,
                onConfirm: execute,
            });
            return;
        }

        execute();
    };

    const runBulkAction = () => {
        if (!bulkAction || selectedIds.length === 0) {
            return;
        }

        const execute = () => {
            router.post(
                route("courierService.bookings.bulk.lifecycle"),
                { shipmentIds: selectedIds, action: bulkAction },
                {
                    preserveScroll: true,
                    onSuccess: () => setSelectedIds([]),
                },
            );
        };

        openConfirm({
            title: "Confirm Bulk Booking Action",
            message: `Apply ${titleCase(bulkAction)} to ${selectedIds.length} selected booking(s)?`,
            onConfirm: execute,
        });
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

            {codModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50" onClick={closeCodCollectedModal}>
                    <div
                        className="absolute left-1/2 top-1/2 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 bg-white rounded-[12px] p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-[18px] font-[700]">Record COD Collection</h2>
                        <p className="text-[12px] text-[#6B7280] mt-1">
                            Booking {codModalBooking?.bookingNumber || "-"}
                        </p>

                        <div className="mt-4">
                            <label className="block text-[12px] font-[700] text-[#374151]">
                                Collected amount ({codModalBooking?.currency || "LKR"})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={codCollectedAmount}
                                onChange={(e) => setCodCollectedAmount(e.target.value)}
                                className="mt-1 w-full h-[38px] rounded-[8px] border border-[#D1D5DB] px-3 text-[13px]"
                                placeholder="Enter collected amount"
                            />
                            {codModalBooking?.codRequestedAmount !== null && codModalBooking?.codRequestedAmount !== undefined && (
                                <p className="mt-2 text-[11px] text-[#6B7280]">
                                    Requested: {Number(codModalBooking.codRequestedAmount).toFixed(2)} {codModalBooking?.currency || "LKR"}
                                </p>
                            )}
                            <p className="mt-1 text-[11px] text-[#6B7280]">
                                Use a smaller amount to record partial collection.
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                className="h-[36px] px-4 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700]"
                                onClick={closeCodCollectedModal}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="h-[36px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]"
                                onClick={submitCodCollected}
                            >
                                Record Collection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Bookings</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">Intake, confirmation, and conversion controls before shipment execution.</p>
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

            <div className="mt-6 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                    {bookingStatusPills.map((pill) => (
                        <button
                            key={pill.value || "all"}
                            type="button"
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, bookingStatus: pill.value }));
                                submitFilters(1, { bookingStatus: pill.value });
                            }}
                            className={`px-3 py-2 rounded-full text-[12px] font-[700] transition-colors ${
                                filters.bookingStatus === pill.value
                                    ? "bg-[#0955AC] text-white"
                                    : "bg-white text-[#4B5563]"
                            }`}
                            style={filters.bookingStatus === pill.value ? {} : { boxShadow: "2px 2px 4px #00000014" }}
                        >
                            {pill.label} ({pill.count})
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[10px] p-4 mt-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 gap-2 mb-4">
                    <div className="xl:col-span-2 h-[38px] rounded-[8px] bg-[#F3F4F6] px-3 flex items-center gap-2">
                        <Search size={16} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={filters.q}
                            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                            placeholder="Search Booking/Tracking/Client"
                            className="w-full border-none bg-transparent outline-none focus:ring-0"
                        />
                    </div>
                    <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Category</option>
                        {bookings.filterOptions.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <select value={filters.service} onChange={(e) => setFilters((prev) => ({ ...prev, service: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Service</option>
                        {bookings.filterOptions.services.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <select value={filters.bookingStatus} onChange={(e) => setFilters((prev) => ({ ...prev, bookingStatus: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Booking Status</option>
                        {bookings.filterOptions.bookingStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <select value={filters.paymentStatus} onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Payment</option>
                        {bookings.filterOptions.paymentStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
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
                </div>

                <div className="flex items-center justify-between mb-4 text-[13px]">
                    <p className="text-[#6B7280]">
                        {hasActiveFilters
                            ? "Filters are active"
                            : "Showing all bookings"}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            const reset = {
                                q: "",
                                category: "",
                                service: "",
                                bookingStatus: "",
                                paymentStatus: "",
                                fromDate: "",
                                toDate: "",
                                perPage: filters.perPage,
                            };

                            setFilters(reset);
                            submitFilters(1, reset);
                        }}
                        className="text-[#0955AC] font-[700] disabled:opacity-50"
                        disabled={!hasActiveFilters}
                    >
                        Clear Filters
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                    <p className="text-[13px] text-[#6B7280]">{selectedIds.length} selected for bulk lifecycle update</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="h-[36px] px-3 rounded-[8px] border border-[#D1D5DB] text-[13px] font-[700] disabled:opacity-50"
                            onClick={() => setSelectedIds([])}
                            disabled={selectedIds.length === 0}
                        >
                            Clear Selection
                        </button>
                        <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="h-[36px] rounded-[8px] border border-[#D1D5DB] px-3 text-[13px]">
                            <option value="">Bulk Action</option>
                            {bookings.filterOptions.actionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <button type="button" onClick={runBulkAction} disabled={!bulkAction || selectedIds.length === 0} className="h-[36px] px-3 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] disabled:opacity-50">Apply To Selected</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-max min-w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#D8E4F2] sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-3 font-[700]"><input type="checkbox" checked={bookings.rows.length > 0 && selectedIds.length === bookings.rows.length} onChange={(e) => setSelectedIds(e.target.checked ? bookings.rows.map((row) => row.id) : [])} /></th>
                                <th className="px-3 py-3 font-[700]">Booking No</th>
                                <th className="px-3 py-3 font-[700]">Created</th>
                                <th className="px-3 py-3 font-[700]">Client</th>
                                <th className="px-3 py-3 font-[700]">Route</th>
                                <th className="px-3 py-3 font-[700]">Category</th>
                                <th className="px-3 py-3 font-[700]">Service</th>
                                <th className="px-3 py-3 font-[700]">Quote</th>
                                <th className="px-3 py-3 font-[700]">Payment</th>
                                <th className="px-3 py-3 font-[700]">Booking Status</th>
                                <th className="px-3 py-3 font-[700]">SLA To Confirm</th>
                                <th className="px-3 py-3 font-[700]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.rows.length > 0 ? bookings.rows.map((row) => (
                                <tr key={row.id} className="border-b border-[#E5E7EB] cursor-pointer" onClick={() => setSelectedBooking(row)}>
                                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(row.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id))} /></td>
                                    <td className="px-3 py-3 font-[700]">{row.bookingNumber}</td>
                                    <td className="px-3 py-3">{row.createdAt || "-"}</td>
                                    <td className="px-3 py-3">{row.client || "-"}</td>
                                    <td className="px-3 py-3">{row.route || "-"}</td>
                                    <td className="px-3 py-3">{row.category}</td>
                                    <td className="px-3 py-3">{row.service}</td>
                                    <td className="px-3 py-3">{row.currency} {Number(row.quoteAmount).toFixed(2)}</td>
                                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-[700] ${paymentBadge(row.paymentStatus)}`}>{titleCase(row.paymentStatus)}</span></td>
                                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-[700] ${bookingBadge(row.bookingStatus)}`}>{row.bookingStatusLabel}</span></td>
                                    <td className="px-3 py-3">{row.confirmHours !== null ? `${row.confirmHours} h` : "-"}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            {(row.allowedActions || []).map((action) => (
                                                <button key={action} type="button" onClick={() => runAction(row, action)} className="px-2 py-1 rounded-[5px] bg-[#F3F4F6] text-[11px] font-[700]">{actionLabels[action] || titleCase(action)}</button>
                                            ))}
                                            {row.allowedActions.length === 0 && <span className="text-[11px] text-[#9CA3AF]">No actions</span>}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={12} className="px-3 py-10 text-center text-[#6B7280]">
                                        <p className="font-[700] text-[15px]">No bookings found for current filters.</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const reset = {
                                                    q: "",
                                                    category: "",
                                                    service: "",
                                                    bookingStatus: "",
                                                    paymentStatus: "",
                                                    fromDate: "",
                                                    toDate: "",
                                                    perPage: filters.perPage,
                                                };
                                                setFilters(reset);
                                                submitFilters(1, reset);
                                            }}
                                            className="mt-3 px-4 py-2 rounded-[8px] bg-[#0955AC] text-white text-[12px] font-[700]"
                                        >
                                            Reset and Show All
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-5">
                    <div className="flex items-center gap-2 text-[13px]">
                        <span>Rows per page</span>
                        <div className="relative">
                            <select value={filters.perPage} onChange={(e) => { const nextPerPage = Number(e.target.value); setFilters((prev) => ({ ...prev, perPage: nextPerPage })); submitFilters(1, { perPage: nextPerPage }); }} className="h-[34px] rounded-[6px] border border-[#D1D5DB] px-3 pr-7 text-[13px]">
                                {bookings.filterOptions.perPageOptions.map((count) => <option key={count} value={count}>{count}</option>)}
                            </select>
                            <ChevronDown className="size-[14px] text-[#6B7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                    <p className="text-[13px] text-[#6B7280]">Page {bookings.pagination.page} / {bookings.pagination.totalPages} ({bookings.pagination.total} records)</p>
                    <div className="flex gap-2">
                        <button type="button" disabled={bookings.pagination.page <= 1} onClick={() => submitFilters(bookings.pagination.page - 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Previous</button>
                        <button type="button" disabled={bookings.pagination.page >= bookings.pagination.totalPages} onClick={() => submitFilters(bookings.pagination.page + 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {selectedBooking && (
                <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelectedBooking(null)}>
                    <div className="h-full w-full max-w-[500px] bg-white p-6 overflow-y-auto shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                            <div>
                                <h2 className="text-[20px] font-[700] text-[#111827]">Booking Details</h2>
                                <p className="text-[12px] text-[#6B7280]">Ref: {selectedBooking.bookingNumber} • Track: {selectedBooking.trackingNumber}</p>
                            </div>
                            <button
                                type="button"
                                className="w-8 h-8 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center font-[700] hover:bg-[#E5E7EB]"
                                onClick={() => setSelectedBooking(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-5 text-[13px] mt-4 flex-1">
                            {/* 1. Pickup & Delivery */}
                            <div className="bg-[#F9FAFB] rounded-[10px] p-4 border border-[#E5E7EB]">
                                <h3 className="text-[14px] font-[700] text-[#0955AC] mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> 1. Pickup & Delivery
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Pickup Date</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.pickupDate || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Pickup Time</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.pickupTime || selectedBooking.pickupWindow || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Estimated Delivery Date</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.estimatedDeliveryDate || selectedBooking.eta || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Delivery Time / Slot</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.deliveryTimeSlot || "Standard Window"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Shipment Details */}
                            <div className="bg-[#F9FAFB] rounded-[10px] p-4 border border-[#E5E7EB]">
                                <h3 className="text-[14px] font-[700] text-[#0955AC] mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> 2. Shipment Details
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Tracking Number</p>
                                        <p className="font-[700] text-[#0955AC]">{selectedBooking.trackingNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Package Type</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.packageType || selectedBooking.category || "Parcel"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Number of Packages</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.numberOfPackages || 1}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Weight</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.weight || "1.5 kg"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Dimensions</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.dimensions || "30 x 20 x 15 cm"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Delivery Priority</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.deliveryPriority || selectedBooking.service || "Standard"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Customer Details */}
                            <div className="bg-[#F9FAFB] rounded-[10px] p-4 border border-[#E5E7EB]">
                                <h3 className="text-[14px] font-[700] text-[#0955AC] mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> 3. Customer Details
                                </h3>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Customer / Sender</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.client || "Customer"} {selectedBooking.clientCompany ? `(${selectedBooking.clientCompany})` : ""}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Customer Contact</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.customerContact || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Pickup Location</p>
                                        <p className="font-[500] text-[#374151]">{selectedBooking.pickupLocation || selectedBooking.route?.split(" to ")?.[0] || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Delivery Location</p>
                                        <p className="font-[500] text-[#374151]">{selectedBooking.deliveryLocation || selectedBooking.route?.split(" to ")?.[1] || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Payment */}
                            <div className="bg-[#F9FAFB] rounded-[10px] p-4 border border-[#E5E7EB]">
                                <h3 className="text-[14px] font-[700] text-[#0955AC] mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> 4. Payment
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Payment Status</p>
                                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-[700] ${paymentBadge(selectedBooking.paymentStatus)}`}>
                                            {titleCase(selectedBooking.paymentStatus)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Payment Method</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.paymentMethod || "Card"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">COD Amount</p>
                                        <p className="font-[600] text-[#1F2937]">
                                            {selectedBooking.currency || "LKR"} {Number(selectedBooking.codAmount || selectedBooking.codRequestedAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Shipping Charge</p>
                                        <p className="font-[600] text-[#1F2937]">
                                            {selectedBooking.currency || "LKR"} {Number(selectedBooking.shippingCharge || selectedBooking.quoteAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-[#E5E7EB] flex justify-between items-center">
                                        <span className="text-[12px] font-[700] text-[#1F2937]">Total Amount</span>
                                        <span className="text-[15px] font-[700] text-[#0955AC]">
                                            {selectedBooking.currency || "LKR"} {Number(selectedBooking.totalAmount || selectedBooking.quoteAmount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 5. Provider Booking */}
                            <div className="bg-[#F9FAFB] rounded-[10px] p-4 border border-[#E5E7EB]">
                                <h3 className="text-[14px] font-[700] text-[#0955AC] mb-3 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#0955AC]"></span> 5. Provider Booking
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Assigned Provider</p>
                                        <p className="font-[600] text-[#1F2937]">{selectedBooking.assignedProvider || "LARA Delivery Fleet"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-[#6B7280]">Provider Status</p>
                                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-[700] bg-[#DCFCE7] text-[#166534]">
                                            {selectedBooking.providerStatus || "Assigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-5 pt-4 border-t border-[#E5E7EB]">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {(selectedBooking.allowedActions || []).map((action) => (
                                    <button key={action} type="button" onClick={() => runAction(selectedBooking, action)} className="h-[36px] rounded-[8px] bg-[#F3F4F6] text-[12px] font-[700] hover:bg-[#E5E7EB]">
                                        {actionLabels[action] || titleCase(action)}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="w-full h-[40px] rounded-[8px] bg-[#111827] text-white font-[700] hover:bg-black transition-colors" onClick={() => setSelectedBooking(null)}>
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingContent;
