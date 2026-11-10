import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import {
    Search,
    Download,
    Filter,
    CalendarDays,
    Eye,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Clock,
    CheckCircle2,
    FileText,
    ExternalLink,
    Building2,
    RotateCcw,
} from "lucide-react";

const INITIAL_TRANSACTIONS = [
    {
        id: "INV-2025-0014",
        clientCompany: "Global Traders Ltd",
        clientEmail: "info@globaltraders.lk",
        clientPhone: "+94 77 123 4567",
        warehouseName: "Kelaniya Warehouse",
        unitId: "WH-C-001",
        paymentType: "Advance Payment",
        serviceDetail: "Loading / Unloading",
        billingPeriod: "01/10/2025 - 31/10/2025",
        totalAmount: 280000,
        amountPaid: 280000,
        remaining: 0,
        baseStorageFee: 240000,
        additionalServices: 40000,
        tax: 50400,
        finalTotal: 330400,
        paymentMethod: "Card",
        paymentDate: "28 Sep 2025",
        status: "Paid",
    },
    {
        id: "INV-2025-0015",
        clientCompany: "ABC Logistics (Pvt) Ltd",
        clientEmail: "accounts@abclogistics.lk",
        clientPhone: "+94 77 987 6543",
        warehouseName: "Colombo Cold Storage",
        unitId: "WH-A-001",
        paymentType: "Monthly Storage Fee",
        serviceDetail: "Temperature Control Storage",
        billingPeriod: "01/10/2025 - 31/10/2025",
        totalAmount: 450000,
        amountPaid: 450000,
        remaining: 0,
        baseStorageFee: 400000,
        additionalServices: 50000,
        tax: 81000,
        finalTotal: 531000,
        paymentMethod: "Bank Transfer",
        paymentDate: "27 Sep 2025",
        status: "Paid",
    },
    {
        id: "INV-2025-0016",
        clientCompany: "Sunrise Foods (Pvt) Ltd",
        clientEmail: "finance@sunrisefoods.lk",
        clientPhone: "+94 76 112 3344",
        warehouseName: "Kelaniya Warehouse",
        unitId: "WH-B-001",
        paymentType: "Handling Charges",
        serviceDetail: "Pallet Inbound & Restacking",
        billingPeriod: "15/09/2025 - 30/09/2025",
        totalAmount: 120000,
        amountPaid: 60000,
        remaining: 60000,
        baseStorageFee: 100000,
        additionalServices: 20000,
        tax: 21600,
        finalTotal: 141600,
        paymentMethod: "Bank Transfer",
        paymentDate: "26 Sep 2025",
        status: "Pending",
    },
    {
        id: "INV-2025-0017",
        clientCompany: "Medicare Supplies Ltd",
        clientEmail: "ap@medicaresupplies.com",
        clientPhone: "+94 11 556 7788",
        warehouseName: "Colombo Cold Storage",
        unitId: "WH-C-002",
        paymentType: "Monthly Storage Fee",
        serviceDetail: "Cold Chain Storage",
        billingPeriod: "01/09/2025 - 30/09/2025",
        totalAmount: 320000,
        amountPaid: 320000,
        remaining: 0,
        baseStorageFee: 290000,
        additionalServices: 30000,
        tax: 57600,
        finalTotal: 377600,
        paymentMethod: "Card",
        paymentDate: "25 Sep 2025",
        status: "Paid",
    },
    {
        id: "INV-2025-0018",
        clientCompany: "Oceanic Traders PLC",
        clientEmail: "oceanic@traders.lk",
        clientPhone: "+94 77 445 6677",
        warehouseName: "Biyagama Distribution Hub",
        unitId: "WH-B-002",
        paymentType: "Security Deposit",
        serviceDetail: "Bonded Unit Bond Guarantee",
        billingPeriod: "One-Time Deposit",
        totalAmount: 450000,
        amountPaid: 450000,
        remaining: 0,
        baseStorageFee: 450000,
        additionalServices: 0,
        tax: 0,
        finalTotal: 450000,
        paymentMethod: "Bank Transfer",
        paymentDate: "24 Sep 2025",
        status: "Paid",
    },
    {
        id: "INV-2025-0019",
        clientCompany: "Ceylon Fresh Exports",
        clientEmail: "accounts@freshfruits.lk",
        clientPhone: "+94 71 334 5566",
        warehouseName: "Kelaniya Warehouse",
        unitId: "WH-C-007",
        paymentType: "Forklift Handling Fee",
        serviceDetail: "Forklift & Crane Rental",
        billingPeriod: "20/09/2025 - 25/09/2025",
        totalAmount: 75000,
        amountPaid: 0,
        remaining: 75000,
        baseStorageFee: 65000,
        additionalServices: 10000,
        tax: 13500,
        finalTotal: 88500,
        paymentMethod: "Pending Gateway",
        paymentDate: "24 Sep 2025",
        status: "Overdue",
    },
];

const PaymentContent = () => {
    const [transactions] = useState(INITIAL_TRANSACTIONS);
    const [selectedTxn, setSelectedTxn] = useState(INITIAL_TRANSACTIONS[0]);
    const [selectedRows, setSelectedRows] = useState(new Set());

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("01/09/2025 - 30/09/2025");

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    t.id.toLowerCase().includes(q) ||
                    t.clientCompany.toLowerCase().includes(q) ||
                    t.unitId.toLowerCase().includes(q) ||
                    t.paymentType.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (paymentTypeFilter !== "all" && !t.paymentType.toLowerCase().includes(paymentTypeFilter.toLowerCase())) return false;
            if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
            return true;
        });
    }, [transactions, searchQuery, paymentTypeFilter, statusFilter]);

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedRows(new Set(filteredTransactions.map((t) => t.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const toggleSelectRow = (id) => {
        const next = new Set(selectedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedRows(next);
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Warehouse Payment
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        Track and manage payments, invoices and financial transactions for your warehouse units.
                    </p>
                </div>
            </div>

            {/* 5 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
                {/* Total Revenue */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Total Revenue</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 2,450,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+12% vs last month</span>
                    </div>
                </div>

                {/* Outstanding Payments */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Outstanding Payments</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 320,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#DC2626]">
                        <TrendingDown size={13} />
                        <span>-8% vs last month</span>
                    </div>
                </div>

                {/* Pending Payments */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Pending Payments</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 180,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+5% vs last month</span>
                    </div>
                </div>

                {/* Security Deposits */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Security Deposits</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 450,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#6B7280]">
                        <span>4 active deposits held</span>
                    </div>
                </div>

                {/* Refunds */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Refunds</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 25,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingDown size={13} />
                        <span>-20% vs last month</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="w-full sm:w-[280px] h-[36px] bg-[#F9FAFB] rounded-[6px] border border-[#D1D5DB] flex items-center px-3 gap-2">
                        <Search size={15} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Company, Client, Unit, Invoice ID"
                            className="w-full bg-transparent border-none text-[12px] outline-none focus:ring-0 placeholder:text-[#9CA3AF]"
                        />
                    </div>

                    {/* Payment Type */}
                    <select
                        value={paymentTypeFilter}
                        onChange={(e) => setPaymentTypeFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Types</option>
                        <option value="advance">Advance Payment</option>
                        <option value="storage">Storage Fee</option>
                        <option value="handling">Handling Charges</option>
                        <option value="deposit">Security Deposit</option>
                    </select>

                    {/* Status */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                    </select>

                    {/* Date range picker */}
                    <div className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] flex items-center gap-2 bg-white text-[12px] text-[#374151]">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <span>01/09/2025 - 30/09/2025</span>
                    </div>

                    <button
                        type="button"
                        className="h-[36px] px-4 rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[600] hover:bg-[#0744a0]"
                    >
                        Apply
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => alert("Exporting transactions to CSV/Excel")}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[#374151] text-[12px] font-[600] flex items-center gap-1.5 hover:bg-gray-50"
                    >
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            {/* Split Grid: Recent Transactions Table (Left) + Payment Details Sidebar (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Table (8 cols on lg) */}
                <div className="lg:col-span-8 bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-[#E5E7EB]">
                            <h2 className="text-[16px] font-[700] text-[#111827]">Recent Transactions</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[13px] whitespace-nowrap">
                                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#4B5563] font-[700]">
                                    <tr>
                                        <th className="px-3.5 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size > 0 && selectedRows.size === filteredTransactions.length}
                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                                className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300"
                                            />
                                        </th>
                                        <th className="px-3.5 py-3">Invoice ID</th>
                                        <th className="px-3.5 py-3">Client / Company</th>
                                        <th className="px-3.5 py-3">Unit ID</th>
                                        <th className="px-3.5 py-3">Payment Type</th>
                                        <th className="px-3.5 py-3">Billing Period</th>
                                        <th className="px-3.5 py-3">Total Amount</th>
                                        <th className="px-3.5 py-3">Amount Paid</th>
                                        <th className="px-3.5 py-3">Remaining</th>
                                        <th className="px-3.5 py-3">Method</th>
                                        <th className="px-3.5 py-3">Status</th>
                                        <th className="px-3.5 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {filteredTransactions.map((txn) => {
                                        const isSelected = selectedTxn?.id === txn.id;
                                        return (
                                            <tr
                                                key={txn.id}
                                                onClick={() => setSelectedTxn(txn)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected ? "bg-blue-50/70" : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(txn.id)}
                                                        onChange={() => toggleSelectRow(txn.id)}
                                                        className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-3 font-[700] text-[#0955AC]">
                                                    {txn.id}
                                                </td>
                                                <td className="px-3.5 py-3 font-[600] text-[#111827]">
                                                    {txn.clientCompany}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-[700] bg-gray-100 text-[#374151]">
                                                        {txn.unitId}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 text-[#374151]">
                                                    {txn.paymentType}
                                                </td>
                                                <td className="px-3.5 py-3 text-[11px] text-[#6B7280]">
                                                    {txn.billingPeriod}
                                                </td>
                                                <td className="px-3.5 py-3 font-[700] text-[#111827]">
                                                    LKR {txn.totalAmount.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3 font-[600] text-emerald-700">
                                                    LKR {txn.amountPaid.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3 text-[12px] text-[#6B7280]">
                                                    LKR {txn.remaining.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3 text-[12px] text-[#374151]">
                                                    {txn.paymentMethod}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-[700] ${
                                                            txn.status === "Paid"
                                                                ? "bg-[#DCFCE7] text-[#166534]"
                                                                : txn.status === "Pending"
                                                                ? "bg-[#FEF3C7] text-[#92400E]"
                                                                : "bg-[#FEE2E2] text-[#991B1B]"
                                                        }`}
                                                    >
                                                        {txn.status}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedTxn(txn)}
                                                        className="p-1 rounded hover:bg-gray-200 text-[#0955AC]"
                                                        title="View Payment Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
                        <p>Showing 1–{filteredTransactions.length} of {filteredTransactions.length} transactions</p>
                        <div className="flex items-center gap-1.5">
                            <button type="button" disabled className="px-3 py-1 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
                                Previous
                            </button>
                            <button type="button" className="px-3 py-1 rounded bg-[#0955AC] text-white font-[700]">
                                1
                            </button>
                            <button type="button" disabled className="px-3 py-1 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payment Details Sidebar (4 cols on lg) */}
                <div className="lg:col-span-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between">
                    {selectedTxn ? (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
                                <div>
                                    <h3 className="text-[16px] font-[700] text-[#111827]">Payment Details</h3>
                                    <p className="text-[12px] font-[700] text-[#0955AC] mt-0.5">{selectedTxn.id}</p>
                                </div>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${
                                        selectedTxn.status === "Paid"
                                            ? "bg-[#DCFCE7] text-[#166534]"
                                            : "bg-[#FEF3C7] text-[#92400E]"
                                    }`}
                                >
                                    {selectedTxn.status}
                                </span>
                            </div>

                            {/* Client card */}
                            <div className="p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] mb-4 text-[12px]">
                                <p className="font-[700] text-[13px] text-[#111827]">{selectedTxn.clientCompany}</p>
                                <p className="text-[#6B7280] mt-0.5">{selectedTxn.clientEmail} • {selectedTxn.clientPhone}</p>
                            </div>

                            {/* Warehouse & Unit */}
                            <div className="p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] mb-4 text-[12px] space-y-1">
                                <p className="text-[#6B7280] text-[11px]">Warehouse & Unit</p>
                                <p className="font-[600] text-[#111827]">{selectedTxn.warehouseName} / {selectedTxn.unitId}</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Payment Type</p>
                                <p className="font-[600] text-[#111827]">{selectedTxn.serviceDetail}</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Billing Period</p>
                                <p className="font-[500] text-[#374151]">{selectedTxn.billingPeriod}</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Payment Method & Date</p>
                                <p className="font-[500] text-[#374151]">{selectedTxn.paymentMethod} • {selectedTxn.paymentDate}</p>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="border border-[#E5E7EB] rounded-[8px] p-3.5 text-[12px] space-y-2 mb-5">
                                <div className="flex justify-between text-[#6B7280]">
                                    <span>Base Storage Fee</span>
                                    <span>LKR {selectedTxn.baseStorageFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#6B7280]">
                                    <span>Additional Services</span>
                                    <span>LKR {selectedTxn.additionalServices.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#6B7280]">
                                    <span>Tax (18% VAT/SSCL)</span>
                                    <span>LKR {selectedTxn.tax.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between font-[700] text-[14px] text-[#111827]">
                                    <span>Total Amount</span>
                                    <span className="text-[#0955AC]">LKR {selectedTxn.finalTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[12px] font-[600] text-emerald-700">
                                    <span>Amount Paid</span>
                                    <span>LKR {selectedTxn.amountPaid.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[12px] text-[#6B7280]">
                                    <span>Outstanding Balance</span>
                                    <span>LKR {selectedTxn.remaining.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Status note */}
                            <p className="text-[11px] text-[#6B7280] text-center mb-4">
                                Payment processed in full via payment gateway.
                            </p>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => alert(`Opening Invoice ${selectedTxn.id}`)}
                                    className="w-full py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm flex items-center justify-center gap-2"
                                >
                                    <FileText size={15} /> View Invoice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit(route("vendors.warehouse.reservations"))}
                                    className="w-full py-2 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-[600] hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={15} /> View Booking Details
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-[#6B7280]">
                            Select a transaction to inspect details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentContent;
