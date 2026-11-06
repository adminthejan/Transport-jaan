import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { CalendarDays, Download, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const EMPTY_PAYMENTS = {
    summary: {
        totalTransactions: 0,
        paidTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        collectedAmount: 0,
        pendingAmount: 0,
    },
    rows: [],
    filters: {
        q: "",
        status: "",
        category: "",
        service: "",
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
        statuses: [],
        categories: [],
        services: [],
        perPageOptions: [10, 20, 50],
    },
};

const normalizeText = (value) => String(value ?? "").trim();

const formatAmount = (amount, currency = "LKR") => {
    const numericAmount = Number(amount ?? 0);
    return `${String(currency || "LKR").toUpperCase()} ${numericAmount.toFixed(2)}`;
};

const statusBadgeClasses = (status) => {
    switch (status) {
        case "paid":
            return "text-[#2f6f28] bg-[#d7f1d2] border-[#9dd592]";
        case "pending":
            return "text-[#8a6200] bg-[#fff1ca] border-[#f0d68f]";
        case "failed":
        case "cancelled":
        case "expired":
            return "text-[#9d2626] bg-[#ffd9d9] border-[#e6adad]";
        default:
            return "text-[#4a5565] bg-[#edf1f6] border-[#cfd7e2]";
    }
};

const PaymentContent = () => {
    const { courierPayments: rawCourierPayments, flash = {} } = usePage().props;
    const courierPayments = rawCourierPayments ?? EMPTY_PAYMENTS;

    const rows = Array.isArray(courierPayments.rows) ? courierPayments.rows : [];
    const summary = courierPayments.summary ?? EMPTY_PAYMENTS.summary;
    const summaryCurrency = courierPayments.summaryCurrency || "LKR";
    const filterOptions = courierPayments.filterOptions ?? EMPTY_PAYMENTS.filterOptions;
    const pagination = courierPayments.pagination ?? EMPTY_PAYMENTS.pagination;
    const backendFilters = courierPayments.filters ?? EMPTY_PAYMENTS.filters;

    const [filters, setFilters] = useState({ ...backendFilters });

    useEffect(() => {
        setFilters({ ...backendFilters });
    }, [
        backendFilters.q,
        backendFilters.status,
        backendFilters.category,
        backendFilters.service,
        backendFilters.fromDate,
        backendFilters.toDate,
        backendFilters.perPage,
        backendFilters.page,
    ]);

    const hasActiveFilters = useMemo(
        () =>
            normalizeText(filters.q) !== "" ||
            normalizeText(filters.status) !== "" ||
            normalizeText(filters.category) !== "" ||
            normalizeText(filters.service) !== "" ||
            normalizeText(filters.fromDate) !== "" ||
            normalizeText(filters.toDate) !== "",
        [filters]
    );

    const runPaymentSearch = (overrides = {}) => {
        router.get(
            route("courierService.payment"),
            {
                ...filters,
                ...overrides,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const applyFilters = () => {
        runPaymentSearch({ page: 1 });
    };

    const resetFilters = () => {
        const resetState = {
            ...EMPTY_PAYMENTS.filters,
            perPage: Number(filters.perPage || 10),
            page: 1,
        };

        setFilters(resetState);
        router.get(route("courierService.payment"), resetState, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleFilterInput = (field, value) => {
        setFilters((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const downloadTableAsPDF = () => {
        const doc = new jsPDF({ orientation: "landscape" });

        doc.setFontSize(16);
        doc.text("Courier Payment Transactions", 14, 16);

        const tableData = rows.map((row) => [
            row.paymentNumber || row.id,
            row.shipmentReference || "-",
            row.client || "-",
            row.service || "-",
            formatAmount(row.amount, row.currency),
            row.statusLabel || row.status || "-",
            row.updatedAt || row.createdAt || "-",
            row.txReference || row.gatewayPaymentId || row.gatewayOrderId || "-",
        ]);

        autoTable(doc, {
            head: [
                [
                    "Payment",
                    "Shipment",
                    "Client",
                    "Service",
                    "Amount",
                    "Status",
                    "Updated",
                    "Gateway Ref",
                ],
            ],
            body: tableData,
            startY: 24,
            styles: {
                fontSize: 9,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [216, 228, 242],
                textColor: [0, 0, 0],
                fontStyle: "bold",
            },
            theme: "grid",
        });

        doc.save("courier-payment-transactions.pdf");
    };

    const summaryCards = [
        {
            label: "Total Transactions",
            value: summary.totalTransactions ?? 0,
            hint: "All card payment attempts",
        },
        {
            label: "Paid",
            value: summary.paidTransactions ?? 0,
            hint: "Successfully settled",
        },
        {
            label: "Pending",
            value: summary.pendingTransactions ?? 0,
            hint: "Awaiting confirmation",
        },
        {
            label: "Failed / Cancelled",
            value: summary.failedTransactions ?? 0,
            hint: "Needs retry or support",
        },
        {
            label: "Collected",
            value: formatAmount(summary.collectedAmount ?? 0, summaryCurrency),
            hint: "Paid card collection",
        },
        {
            label: "Pending Amount",
            value: formatAmount(summary.pendingAmount ?? 0, summaryCurrency),
            hint: "Pending card collection",
        },
    ];

    return (
        <div className="pt-6 pb-12">
            <div className="flex flex-col gap-8 w-full h-auto lg:pl-4 lg:pr-5">
                <div className="flex flex-row gap-5 justify-between items-center">
                    <h1 className="figtree text-[35px] font-[700]">Courier Service Payment</h1>
                    <button
                        onClick={downloadTableAsPDF}
                        className="h-[40px] px-4 bg-[#0955AC] text-[14px] rounded-[6px] text-white font-[700] flex justify-center items-center gap-2"
                    >
                        <Download size={16} />
                        Download
                    </button>
                </div>

                {flash?.success && (
                    <div className="rounded-[8px] border border-[#8bc48b] bg-[#e5f4e5] px-4 py-3 text-[14px] text-[#2f6f28]">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-[8px] border border-[#d89d9d] bg-[#fbe9e9] px-4 py-3 text-[14px] text-[#9d2626]">
                        {flash.error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
                    {summaryCards.map((card) => (
                        <div
                            key={card.label}
                            className="w-full min-h-[92px] bg-white rounded-[8px] px-5 py-4"
                            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                        >
                            <h2 className="text-[14px] font-[500] text-[#6c7583]">{card.label}</h2>
                            <h3 className="text-[24px] font-[700] text-[#111827]">{card.value}</h3>
                            <p className="text-[12px] text-[#8c96a3] mt-1">{card.hint}</p>
                        </div>
                    ))}
                </div>

                <div
                    className="w-full h-auto bg-white rounded-[10px] px-6 py-6"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-col gap-4">
                        <h2 className="text-[24px] font-[700]">Payment Transactions</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <Search size={14} />
                                <input
                                    type="text"
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    placeholder="Search payment, shipment, client"
                                    value={filters.q}
                                    onChange={(event) => handleFilterInput("q", event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            applyFilters();
                                        }
                                    }}
                                />
                            </div>

                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <select
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.status}
                                    onChange={(event) => handleFilterInput("status", event.target.value)}
                                >
                                    <option value="">All statuses</option>
                                    {(filterOptions.statuses || []).map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <select
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.category}
                                    onChange={(event) => handleFilterInput("category", event.target.value)}
                                >
                                    <option value="">All categories</option>
                                    {(filterOptions.categories || []).map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <select
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.service}
                                    onChange={(event) => handleFilterInput("service", event.target.value)}
                                >
                                    <option value="">All services</option>
                                    {(filterOptions.services || []).map((service) => (
                                        <option key={service} value={service}>
                                            {service}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <CalendarDays size={15} />
                                <input
                                    type="date"
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.fromDate}
                                    onChange={(event) => handleFilterInput("fromDate", event.target.value)}
                                />
                            </div>

                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <CalendarDays size={15} />
                                <input
                                    type="date"
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.toDate}
                                    onChange={(event) => handleFilterInput("toDate", event.target.value)}
                                />
                            </div>

                            <div className="h-[40px] bg-[#F3F3F3] rounded-[6px] flex items-center px-3 gap-2">
                                <span className="text-[13px] text-[#6c7583] whitespace-nowrap">Rows</span>
                                <select
                                    className="w-full bg-transparent border-none outline-none shadow-none focus:ring-0 text-[14px]"
                                    value={filters.perPage}
                                    onChange={(event) => {
                                        const nextPerPage = Number(event.target.value);
                                        handleFilterInput("perPage", nextPerPage);
                                        runPaymentSearch({ perPage: nextPerPage, page: 1 });
                                    }}
                                >
                                    {(filterOptions.perPageOptions || [10, 20, 50]).map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={applyFilters}
                                    className="h-[40px] px-4 rounded-[6px] bg-[#0955AC] text-white text-[14px] font-[600]"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={resetFilters}
                                    disabled={!hasActiveFilters}
                                    className="h-[40px] px-4 rounded-[6px] bg-[#EEF2F8] text-[#2f3a49] text-[14px] font-[600] disabled:opacity-50"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-[#D8E4F2] text-[13px] text-[#1f2937]">
                                    <th className="text-left px-4 py-3 rounded-tl-[8px]">Payment</th>
                                    <th className="text-left px-4 py-3">Shipment</th>
                                    <th className="text-left px-4 py-3">Client</th>
                                    <th className="text-left px-4 py-3">Service</th>
                                    <th className="text-left px-4 py-3">Amount</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Updated</th>
                                    <th className="text-left px-4 py-3">Gateway Ref</th>
                                    <th className="text-left px-4 py-3 rounded-tr-[8px]">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-10 text-center text-[14px] text-[#6c7583]">
                                            No courier payment transactions found for the current filters.
                                        </td>
                                    </tr>
                                )}

                                {rows.map((row) => (
                                    <tr key={row.id} className="text-[14px] border-b border-[#e4e8ef]">
                                        <td className="px-4 py-4 align-top">
                                            <div className="font-[600] text-[#111827]">{row.paymentNumber || row.id}</div>
                                            <div className="text-[12px] text-[#6b7280]">{row.category || "-"}</div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="font-[600] text-[#111827]">{row.shipmentReference || "-"}</div>
                                            <div className="text-[12px] text-[#6b7280]">{row.trackingNumber || "-"}</div>
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div className="font-[600] text-[#111827]">{row.client || "-"}</div>
                                            {row.clientCompany ? (
                                                <div className="text-[12px] text-[#6b7280]">{row.clientCompany}</div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <div>{row.service || "-"}</div>
                                            <div className="text-[12px] text-[#6b7280]">Packages: {row.packageCount || 0}</div>
                                        </td>
                                        <td className="px-4 py-4 align-top font-[600] text-[#111827]">
                                            {formatAmount(row.amount, row.currency)}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <span
                                                className={`inline-flex px-2 py-[3px] rounded-[5px] border text-[11px] font-[700] ${statusBadgeClasses(
                                                    row.status
                                                )}`}
                                            >
                                                {row.statusLabel || row.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 align-top text-[13px] text-[#374151]">
                                            {row.updatedAt || row.createdAt || "-"}
                                        </td>
                                        <td className="px-4 py-4 align-top text-[13px] text-[#374151]">
                                            {row.txReference || row.gatewayPaymentId || row.gatewayOrderId || "-"}
                                        </td>
                                        <td className="px-4 py-4 align-top">
                                            <button
                                                onClick={() =>
                                                    router.get(route("courierService.bookings"), {
                                                        q: row.shipmentReference,
                                                    })
                                                }
                                                className="h-[30px] px-3 rounded-[5px] border border-[#0955AC] text-[#0955AC] text-[12px] font-[700]"
                                            >
                                                Open Booking
                                            </button>
                                            {row.lifecycleBlocked ? (
                                                <p className="text-[11px] text-[#9d2626] mt-2">
                                                    Lifecycle actions are blocked until payment is paid.
                                                </p>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-[13px] text-[#5c6776]">
                        <div>
                            Showing {rows.length} of {pagination.total} transactions
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => runPaymentSearch({ page: Math.max(1, Number(pagination.page) - 1) })}
                                disabled={Number(pagination.page) <= 1}
                                className="h-[34px] px-3 rounded-[6px] bg-[#EEF2F8] text-[#2f3a49] disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <div className="h-[34px] px-3 rounded-[6px] bg-[#F8FAFD] border border-[#E1E7F0] flex items-center">
                                Page {pagination.page} of {pagination.totalPages}
                            </div>
                            <button
                                onClick={() =>
                                    runPaymentSearch({
                                        page: Math.min(Number(pagination.totalPages), Number(pagination.page) + 1),
                                    })
                                }
                                disabled={Number(pagination.page) >= Number(pagination.totalPages)}
                                className="h-[34px] px-3 rounded-[6px] bg-[#EEF2F8] text-[#2f3a49] disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentContent;
