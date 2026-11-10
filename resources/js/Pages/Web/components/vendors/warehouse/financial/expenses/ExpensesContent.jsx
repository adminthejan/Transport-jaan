import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import {
    Search,
    Plus,
    RotateCcw,
    CalendarDays,
    FileText,
    Download,
    Eye,
    Edit3,
    Trash2,
    TrendingUp,
    TrendingDown,
    Building2,
    DollarSign,
    CheckCircle2,
    Clock,
    Paperclip,
    AlertCircle,
} from "lucide-react";

const INITIAL_EXPENSES = [
    {
        id: "EXP-0003",
        unitId: "WH-C-001",
        warehouseName: "Kelaniya Warehouse",
        vendorSupplier: "Sunrise Trading (Pvt) Ltd",
        vendorContact: "accounts@sunrisetrading.lk",
        description: "Electricity bill for September & HVAC upkeep",
        expenseType: "Maintenance",
        paymentMethod: "Bank Transfer",
        amount: 225000,
        maintenanceCost: 200000,
        replacementCost: 25000,
        paidAmount: 225000,
        paymentStatus: "Paid",
        dueDate: "30/09/2025",
        date: "25 Sep 2025",
        hasReceipt: true,
    },
    {
        id: "EXP-0004",
        unitId: "WH-A-001",
        warehouseName: "Colombo Cold Storage",
        vendorSupplier: "CoolTech Refrigeration",
        vendorContact: "service@cooltech.lk",
        description: "Chiller refrigerant refill and compressor check",
        expenseType: "Utilities",
        paymentMethod: "Bank Transfer",
        amount: 85000,
        maintenanceCost: 75000,
        replacementCost: 10000,
        paidAmount: 85000,
        paymentStatus: "Paid",
        dueDate: "28/09/2025",
        date: "24 Sep 2025",
        hasReceipt: true,
    },
    {
        id: "EXP-0005",
        unitId: "WH-B-001",
        warehouseName: "Kelaniya Warehouse",
        vendorSupplier: " Lanka Fire & Safety PLC",
        vendorContact: "inspections@lankafire.lk",
        description: "Annual Fire Safety Certification and extinguisher test",
        expenseType: "Compliance",
        paymentMethod: "Cheque",
        amount: 140000,
        maintenanceCost: 120000,
        replacementCost: 20000,
        paidAmount: 70000,
        paymentStatus: "Pending",
        dueDate: "05/10/2025",
        date: "22 Sep 2025",
        hasReceipt: true,
    },
    {
        id: "EXP-0006",
        unitId: "WH-B-002",
        warehouseName: "Biyagama Distribution Hub",
        vendorSupplier: "Ceylon Security Services",
        vendorContact: "billing@ceylonsecurity.lk",
        description: "24/7 Security guards monthly payroll deployment",
        expenseType: "Security",
        paymentMethod: "Direct Debit",
        amount: 180000,
        maintenanceCost: 180000,
        replacementCost: 0,
        paidAmount: 0,
        paymentStatus: "Overdue",
        dueDate: "20/09/2025",
        date: "15 Sep 2025",
        hasReceipt: false,
    },
    {
        id: "EXP-0007",
        unitId: "WH-A-002",
        warehouseName: "Kelaniya Warehouse",
        vendorSupplier: "Forklift Solutions Ltd",
        vendorContact: "support@forklifts.lk",
        description: "Hydraulic oil change & pallet jack wheel replacement",
        expenseType: "Maintenance",
        paymentMethod: "Card",
        amount: 45000,
        maintenanceCost: 35000,
        replacementCost: 10000,
        paidAmount: 45000,
        paymentStatus: "Paid",
        dueDate: "22/09/2025",
        date: "18 Sep 2025",
        hasReceipt: true,
    },
];

const ExpensesContent = () => {
    const [expensesList, setExpensesList] = useState(INITIAL_EXPENSES);
    const [selectedExpense, setSelectedExpense] = useState(INITIAL_EXPENSES[0]);
    const [selectedRows, setSelectedRows] = useState(new Set());

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [warehouseFilter, setWarehouseFilter] = useState("all");
    const [expenseTypeFilter, setExpenseTypeFilter] = useState("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("");

    // Add Expense modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({
        unitId: "WH-C-001",
        warehouseName: "Kelaniya Warehouse",
        vendorSupplier: "",
        description: "",
        expenseType: "Maintenance",
        amount: "",
        paymentStatus: "Paid",
        dueDate: "2025-10-15",
    });

    const filteredExpenses = useMemo(() => {
        return expensesList.filter((e) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    e.id.toLowerCase().includes(q) ||
                    e.vendorSupplier.toLowerCase().includes(q) ||
                    e.description.toLowerCase().includes(q) ||
                    e.unitId.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (warehouseFilter !== "all" && !e.warehouseName.toLowerCase().includes(warehouseFilter.toLowerCase())) return false;
            if (expenseTypeFilter !== "all" && e.expenseType.toLowerCase() !== expenseTypeFilter.toLowerCase()) return false;
            if (paymentStatusFilter !== "all" && e.paymentStatus.toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
            return true;
        });
    }, [expensesList, searchQuery, warehouseFilter, expenseTypeFilter, paymentStatusFilter]);

    const handleReset = () => {
        setSearchQuery("");
        setWarehouseFilter("all");
        setExpenseTypeFilter("all");
        setPaymentStatusFilter("all");
        setDateRange("");
    };

    const handleCreateExpense = (e) => {
        e.preventDefault();
        const created = {
            id: `EXP-000${expensesList.length + 1}`,
            unitId: newExpense.unitId,
            warehouseName: newExpense.warehouseName,
            vendorSupplier: newExpense.vendorSupplier,
            vendorContact: "contact@vendor.lk",
            description: newExpense.description,
            expenseType: newExpense.expenseType,
            paymentMethod: "Bank Transfer",
            amount: parseFloat(newExpense.amount) || 50000,
            maintenanceCost: parseFloat(newExpense.amount) || 50000,
            replacementCost: 0,
            paidAmount: newExpense.paymentStatus === "Paid" ? (parseFloat(newExpense.amount) || 50000) : 0,
            paymentStatus: newExpense.paymentStatus,
            dueDate: newExpense.dueDate,
            date: "29 Sep 2025",
            hasReceipt: true,
        };
        setExpensesList([created, ...expensesList]);
        setSelectedExpense(created);
        setIsAddModalOpen(false);
        setNewExpense({
            unitId: "WH-C-001",
            warehouseName: "Kelaniya Warehouse",
            vendorSupplier: "",
            description: "",
            expenseType: "Maintenance",
            amount: "",
            paymentStatus: "Paid",
            dueDate: "2025-10-15",
        });
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
                        Warehouse Expenses
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        Track and manage all warehouse related expenses, vendors and payments.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm transition-colors cursor-pointer"
                    >
                        <Plus size={16} /> Add Expense
                    </button>
                </div>
            </div>

            {/* 5 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 mb-6">
                {/* Total Expenses */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Total Expenses</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 2,450,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+12% vs last month</span>
                    </div>
                </div>

                {/* Pending Expenses */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Pending Expenses</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 320,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-amber-600">
                        <span>8 due</span>
                    </div>
                </div>

                {/* Overdue Expenses */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Overdue Expenses</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 180,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#DC2626]">
                        <span>3 past due</span>
                    </div>
                </div>

                {/* This Month Expenses */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <p className="text-[12px] font-[600] text-[#6B7280]">This Month Expenses</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 680,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+8% vs last month</span>
                    </div>
                </div>

                {/* Maintenance Cost */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[12px] font-[600] text-[#6B7280]">Maintenance Cost</p>
                    <p className="text-[22px] font-[700] text-[#111827] mt-1">LKR 450,000</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#6B7280]">
                        <span>Warehouse upkeep</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="w-full sm:w-[260px] h-[36px] bg-[#F9FAFB] rounded-[6px] border border-[#D1D5DB] flex items-center px-3 gap-2">
                        <Search size={15} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by expense ID, vendor..."
                            className="w-full bg-transparent border-none text-[12px] outline-none focus:ring-0 placeholder:text-[#9CA3AF]"
                        />
                    </div>

                    {/* Warehouse / Unit */}
                    <select
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Warehouses</option>
                        <option value="kelaniya">Kelaniya Warehouse</option>
                        <option value="colombo">Colombo Cold Storage</option>
                        <option value="biyagama">Biyagama Hub</option>
                    </select>

                    {/* Expense Type */}
                    <select
                        value={expenseTypeFilter}
                        onChange={(e) => setExpenseTypeFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Types</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="utilities">Utilities</option>
                        <option value="compliance">Compliance</option>
                        <option value="security">Security</option>
                    </select>

                    {/* Payment Status */}
                    <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                    </select>

                    <div className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] flex items-center gap-2 bg-white text-[12px] text-[#374151]">
                        <CalendarDays size={14} className="text-[#6B7280]" />
                        <span>Date Range</span>
                    </div>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[#4B5563] text-[12px] font-[600] hover:bg-gray-50 flex items-center gap-1.5"
                    >
                        <RotateCcw size={13} /> Reset
                    </button>
                    <button
                        type="button"
                        className="h-[36px] px-4 rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[600] hover:bg-[#0744a0]"
                    >
                        Apply
                    </button>
                </div>
            </div>

            {/* Split Grid: Recent Expenses Table (Left) + Expense Details Sidebar (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Table (8 cols on lg) */}
                <div className="lg:col-span-8 bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-[#E5E7EB]">
                            <h2 className="text-[16px] font-[700] text-[#111827]">Recent Expenses</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[13px] whitespace-nowrap">
                                <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#4B5563] font-[700]">
                                    <tr>
                                        <th className="px-3.5 py-3 text-center">
                                            <input type="checkbox" className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300" />
                                        </th>
                                        <th className="px-3.5 py-3">Expense ID</th>
                                        <th className="px-3.5 py-3">Warehouse / Unit</th>
                                        <th className="px-3.5 py-3">Vendor / Supplier</th>
                                        <th className="px-3.5 py-3">Description</th>
                                        <th className="px-3.5 py-3">Expense Type</th>
                                        <th className="px-3.5 py-3">Amount (LKR)</th>
                                        <th className="px-3.5 py-3">Payment Status</th>
                                        <th className="px-3.5 py-3">Due Date</th>
                                        <th className="px-3.5 py-3 text-center">Receipt</th>
                                        <th className="px-3.5 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB]">
                                    {filteredExpenses.map((exp) => {
                                        const isSelected = selectedExpense?.id === exp.id;
                                        return (
                                            <tr
                                                key={exp.id}
                                                onClick={() => setSelectedExpense(exp)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected ? "bg-blue-50/70" : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(exp.id)}
                                                        onChange={() => toggleSelectRow(exp.id)}
                                                        className="w-3.5 h-3.5 text-[#0955AC] rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-3.5 py-3 font-[700] text-[#0955AC]">
                                                    {exp.id}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className="font-[600] text-[#111827]">{exp.unitId}</span>
                                                    <span className="text-[11px] text-[#6B7280] block">{exp.warehouseName}</span>
                                                </td>
                                                <td className="px-3.5 py-3 font-[600] text-[#111827]">
                                                    {exp.vendorSupplier}
                                                </td>
                                                <td className="px-3.5 py-3 text-[#4B5563] max-w-[220px] truncate" title={exp.description}>
                                                    {exp.description}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-[600] bg-gray-100 text-[#374151]">
                                                        {exp.expenseType}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 font-[700] text-[#111827]">
                                                    {exp.amount.toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${
                                                            exp.paymentStatus === "Paid"
                                                                ? "bg-[#DCFCE7] text-[#166534]"
                                                                : exp.paymentStatus === "Pending"
                                                                ? "bg-[#FEF3C7] text-[#92400E]"
                                                                : "bg-[#FEE2E2] text-[#991B1B]"
                                                        }`}
                                                    >
                                                        {exp.paymentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 text-[12px] text-[#6B7280]">
                                                    {exp.dueDate}
                                                </td>
                                                <td className="px-3.5 py-3 text-center">
                                                    {exp.hasReceipt ? (
                                                        <span className="text-[#0955AC]" title="Receipt attached">
                                                            <Paperclip size={15} className="inline" />
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedExpense(exp)}
                                                        className="p-1 rounded hover:bg-gray-200 text-[#0955AC]"
                                                        title="View Details"
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
                        <p>Showing 1–{filteredExpenses.length} of {filteredExpenses.length} expenses</p>
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

                {/* Expense Details Sidebar (4 cols on lg) */}
                <div className="lg:col-span-4 bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm p-5 flex flex-col justify-between">
                    {selectedExpense ? (
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] mb-4">
                                <div>
                                    <h3 className="text-[16px] font-[700] text-[#111827]">Expense Details</h3>
                                    <p className="text-[12px] font-[700] text-[#0955AC] mt-0.5">{selectedExpense.id}</p>
                                </div>
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${
                                        selectedExpense.paymentStatus === "Paid"
                                            ? "bg-[#DCFCE7] text-[#166534]"
                                            : "bg-[#FEF3C7] text-[#92400E]"
                                    }`}
                                >
                                    {selectedExpense.paymentStatus}
                                </span>
                            </div>

                            {/* Vendor card */}
                            <div className="p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] mb-4 text-[12px]">
                                <p className="font-[700] text-[13px] text-[#111827]">{selectedExpense.vendorSupplier}</p>
                                <p className="text-[#6B7280] mt-0.5">{selectedExpense.vendorContact}</p>
                            </div>

                            {/* Details list */}
                            <div className="p-3.5 bg-[#F9FAFB] rounded-[8px] border border-[#E5E7EB] mb-4 text-[12px] space-y-1">
                                <p className="text-[#6B7280] text-[11px]">Warehouse & Unit</p>
                                <p className="font-[600] text-[#111827]">{selectedExpense.unitId} ({selectedExpense.warehouseName})</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Expense Type</p>
                                <p className="font-[600] text-[#111827]">{selectedExpense.expenseType}</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Payment Method & Date</p>
                                <p className="font-[500] text-[#374151]">{selectedExpense.paymentMethod} • {selectedExpense.date}</p>
                                <p className="text-[#6B7280] text-[11px] pt-1">Description</p>
                                <p className="font-[500] text-[#374151]">{selectedExpense.description}</p>
                            </div>

                            {/* Breakdown table */}
                            <div className="border border-[#E5E7EB] rounded-[8px] p-3.5 text-[12px] space-y-2 mb-5">
                                <div className="flex justify-between text-[#6B7280]">
                                    <span>Maintenance</span>
                                    <span>{selectedExpense.maintenanceCost.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#6B7280]">
                                    <span>Replacement</span>
                                    <span>{selectedExpense.replacementCost.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-[#E5E7EB] pt-2 flex justify-between font-[700] text-[14px] text-[#111827]">
                                    <span>Total Amount (LKR)</span>
                                    <span className="text-[#0955AC]">{selectedExpense.amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[12px] font-[600] text-emerald-700">
                                    <span>Paid Amount</span>
                                    <span>{selectedExpense.paidAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => alert(`Downloading Invoice/Receipt for ${selectedExpense.id}`)}
                                    className="w-full py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm flex items-center justify-center gap-2"
                                >
                                    <Download size={15} /> Download Invoice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => alert(`Editing expense ${selectedExpense.id}`)}
                                    className="w-full py-2 rounded-[8px] border border-[#D1D5DB] text-[#374151] text-[13px] font-[600] hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <Edit3 size={15} /> Edit Expense
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-[#6B7280]">
                            Select an expense to inspect details
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add Expense */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsAddModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-[12px] p-6 max-w-lg w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="text-[18px] font-[700] text-[#111827]">Add Warehouse Expense</h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Unit ID *</label>
                                    <select
                                        value={newExpense.unitId}
                                        onChange={(e) => setNewExpense({ ...newExpense, unitId: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="WH-C-001">WH-C-001</option>
                                        <option value="WH-A-001">WH-A-001</option>
                                        <option value="WH-B-001">WH-B-001</option>
                                        <option value="WH-B-002">WH-B-002</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Expense Type *</label>
                                    <select
                                        value={newExpense.expenseType}
                                        onChange={(e) => setNewExpense({ ...newExpense, expenseType: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Compliance">Compliance</option>
                                        <option value="Security">Security</option>
                                        <option value="Insurance">Insurance</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Vendor / Supplier *</label>
                                <input
                                    type="text"
                                    required
                                    value={newExpense.vendorSupplier}
                                    onChange={(e) => setNewExpense({ ...newExpense, vendorSupplier: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="e.g. Sunrise Trading (Pvt) Ltd"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Description *</label>
                                <textarea
                                    rows={2}
                                    required
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    className="w-full p-2.5 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="Describe expense items or work completed"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Amount (LKR) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="e.g. 65000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Payment Status</label>
                                    <select
                                        value={newExpense.paymentStatus}
                                        onChange={(e) => setNewExpense({ ...newExpense, paymentStatus: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={newExpense.dueDate}
                                    onChange={(e) => setNewExpense({ ...newExpense, dueDate: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Receipt / Invoice File</label>
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-[6px] border border-gray-300 text-[13px] font-[600]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-[6px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0]"
                                >
                                    Save Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpensesContent;
