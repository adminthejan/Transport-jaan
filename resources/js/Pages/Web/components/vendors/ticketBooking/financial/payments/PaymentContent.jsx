import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    Search,
    Download,
    DollarSign,
    CheckCircle2,
    Clock,
    RotateCcw,
    TrendingUp,
    FileText,
} from "lucide-react";

const INITIAL_TRANSACTIONS = [
    {
        id: "#INV-2026",
        clientName: "Nimal Perera",
        unit: "Bus 07",
        route: "Colombo - Kandy",
        travelDate: "24 Sep 2026",
        amount: 2400,
        status: "Paid",
        paymentMethod: "Card",
    },
    {
        id: "#INV-2025",
        clientName: "Shalini Fernando",
        unit: "Train NC-4521",
        route: "Colombo Fort - Kandy",
        travelDate: "24 Sep 2026",
        amount: 1850,
        status: "Pending",
        paymentMethod: "Bank Transfer",
    },
    {
        id: "#INV-2024",
        clientName: "Roshan Jayasuriya",
        unit: "Flight UL-225",
        route: "Colombo - Dubai",
        travelDate: "23 Sep 2026",
        amount: 68000,
        status: "Paid",
        paymentMethod: "Card",
    },
    {
        id: "#INV-2023",
        clientName: "Kumari Wickramasinghe",
        unit: "Bus 12",
        route: "Colombo - Galle",
        travelDate: "22 Sep 2026",
        amount: 3100,
        status: "Refunded",
        paymentMethod: "Mobile Wallet",
    },
    {
        id: "#INV-2022",
        clientName: "Dinesh Silva",
        unit: "Train R-201",
        route: "Kandy - Colombo",
        travelDate: "21 Sep 2026",
        amount: 1650,
        status: "Paid",
        paymentMethod: "Cash",
    },
];

const statusBadge = (status) => {
    switch (status) {
        case "Paid":
            return "bg-[#DCFCE7] text-[#166534]";
        case "Pending":
            return "bg-[#FEF3C7] text-[#92400E]";
        case "Refunded":
            return "bg-[#FEE2E2] text-[#991B1B]";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

const PaymentContent = () => {
    const [transactions] = useState(INITIAL_TRANSACTIONS);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedRows, setSelectedRows] = useState(new Set());

    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    t.id.toLowerCase().includes(q) ||
                    t.clientName.toLowerCase().includes(q) ||
                    t.unit.toLowerCase().includes(q) ||
                    t.route.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
            return true;
        });
    }, [transactions, searchQuery, statusFilter]);

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

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.text("Ticket Booking Payment Transactions", 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [["Invoice ID", "Client Name", "Unit", "Route", "Travel Date", "Amount (Rs.)", "Status", "Method"]],
            body: filteredTransactions.map((t) => [
                t.id,
                t.clientName,
                t.unit,
                t.route,
                t.travelDate,
                t.amount.toLocaleString(),
                t.status,
                t.paymentMethod,
            ]),
        });
        doc.save("ticket-booking-payments.pdf");
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Ticket Booking Payment
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        Track and manage all ticket booking revenue, invoices, and customer transactions.
                    </p>
                </div>
            </div>

            {/* 3 Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* Total Revenue */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[12px] font-[600] text-[#6B7280]">Total Revenue</p>
                        <p className="text-[26px] font-[700] text-[#111827] mt-1">Rs. 486,200</p>
                        <span className="text-[11px] font-[600] text-[#16A34A] flex items-center gap-1 mt-1">
                            <TrendingUp size={13} /> Paid revenue
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0955AC] flex items-center justify-center font-[700]">
                        Rs
                    </div>
                </div>

                {/* Paid Bookings */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[12px] font-[600] text-[#6B7280]">Paid Bookings</p>
                        <p className="text-[26px] font-[700] text-[#111827] mt-1">312</p>
                        <span className="text-[11px] font-[600] text-[#6B7280] mt-1 block">
                            512 Payments recorded
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                </div>

                {/* Pending */}
                <div className="bg-white rounded-[10px] p-5 border border-[#E5E7EB] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[12px] font-[600] text-[#6B7280]">Pending</p>
                        <p className="text-[26px] font-[700] text-[#111827] mt-1">Rs. 42,850</p>
                        <span className="text-[11px] font-[600] text-amber-700 mt-1 block">
                            9 Payments pending
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="w-full sm:w-[320px] h-[36px] bg-[#F9FAFB] rounded-[6px] border border-[#D1D5DB] flex items-center px-3 gap-2">
                        <Search size={15} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search client name, unit, invoice ID..."
                            className="w-full bg-transparent border-none text-[12px] outline-none focus:ring-0 placeholder:text-[#9CA3AF]"
                        />
                    </div>

                    {/* All Status */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="h-[36px] px-4 rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[600] flex items-center gap-1.5 hover:bg-[#0744a0] shadow-sm"
                    >
                        <Download size={14} /> Download
                    </button>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E7EB]">
                    <h2 className="text-[16px] font-[700] text-[#111827]">Recent Transactions</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#4B5563] font-[700]">
                            <tr>
                                <th className="px-4 py-3.5 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.size > 0 && selectedRows.size === filteredTransactions.length}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300"
                                    />
                                </th>
                                <th className="px-4 py-3.5">Invoice ID</th>
                                <th className="px-4 py-3.5">Client Name</th>
                                <th className="px-4 py-3.5">Unit</th>
                                <th className="px-4 py-3.5">Route</th>
                                <th className="px-4 py-3.5">Travel Date</th>
                                <th className="px-4 py-3.5">Amount</th>
                                <th className="px-4 py-3.5">Status</th>
                                <th className="px-4 py-3.5">Payment Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {filteredTransactions.map((txn) => (
                                <tr
                                    key={txn.id}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-4 py-3.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(txn.id)}
                                            onChange={() => toggleSelectRow(txn.id)}
                                            className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3.5 font-[700] text-[#0955AC]">
                                        {txn.id}
                                    </td>
                                    <td className="px-4 py-3.5 font-[600] text-[#111827]">
                                        {txn.clientName}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#374151]">
                                        {txn.unit}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#4B5563]">
                                        {txn.route}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#4B5563]">
                                        {txn.travelDate}
                                    </td>
                                    <td className="px-4 py-3.5 font-[700] text-[#111827]">
                                        Rs. {txn.amount.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${statusBadge(txn.status)}`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-[#374151]">
                                        {txn.paymentMethod}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
                    <p>Showing 1–{filteredTransactions.length} of {filteredTransactions.length} records</p>
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
        </div>
    );
};

export default PaymentContent;
