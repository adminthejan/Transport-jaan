import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import wallet from "../../../../../assets/financial/expenses/wallet.svg";
import income from "../../../../../assets/financial/expenses/income.svg";
import expensesIcon from "../../../../../assets/financial/expenses/expenses.svg";
import dotThree from "../../../../../assets/financial/expenses/dots3.svg";
import filterIcon from "../../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import downloadLogo from "../../../../../assets/financial/expenses/download.svg";
import calendar from "../../../../../assets/financial/expenses/cal.svg";
import miniUp from "../../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../../assets/vendors/dashboard/icons/miniDown.svg";
import upArrow from "../../../../../assets/vendors/dashboard/icons/upArrow.svg";
import CashflowChart from "./CashflowChart";
import ExpensesPieChart from "./ExpensesPieChart";

const CATEGORIES = ["Rent", "Utilities", "Maintenance", "Inventory Supplies", "Insurance", "Compliance", "Services", "Software", "Other"];
const EMPTY_FORM = { name: "", category: CATEGORIES[0], quantity: 1, amount: "", expense_date: "", status: "completed", notes: "" };

const ExpensesContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        balance: { amount: "0", growth: 0, isPositive: true },
        income: { amount: "0", growth: 0, isPositive: true },
        expenses: { amount: "0", growth: 0, isPositive: false },
        categoryBreakdown: [],
        cashflow: [],
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const perPageOptions = [5, 10, 20, 50];

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchStats = async () => {
        try {
            const response = await fetch("/vendors/warehouse/api/expenses/stats");
            const json = await response.json();
            if (json.success) setStats(json.data);
        } catch (e) {
            console.error("Failed to fetch expense stats:", e);
        }
    };

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                per_page: itemsPerPage,
                ...(searchQuery && { search: searchQuery }),
                ...(statusFilter && { status: statusFilter }),
                ...(dateFilter && { date: dateFilter }),
            });
            const response = await fetch(`/vendors/warehouse/api/expenses?${params}`);
            const json = await response.json();
            if (json.success) {
                setExpenses(json.data);
                setTotalPages(json.pagination.last_page);
            }
        } catch (e) {
            console.error("Failed to fetch expenses:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, itemsPerPage, statusFilter, dateFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) fetchExpenses();
            else setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const totalRecords = expenses.length;

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
        return pages;
    };

    const downloadTableAsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Warehouse Expenses", 14, 20);

        const tableData = expenses.map((e) => [e.name, e.category, e.quantity, e.amount_formatted, e.expense_date, e.status]);

        autoTable(doc, {
            head: [["Expense", "Category", "Quantity", "Amount", "Date", "Status"]],
            body: tableData,
            startY: 30,
            theme: "grid",
            headStyles: { fillColor: [216, 228, 242], textColor: [0, 0, 0], fontStyle: "bold" },
            styles: { cellPadding: 2, fontSize: 10, textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
        });

        doc.save("warehouse-expenses.pdf");
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().slice(0, 10) });
        setFormErrors({});
        setModalOpen(true);
    };

    const openEditModal = (expense) => {
        setEditingId(expense.id);
        setForm({
            name: expense.name,
            category: expense.category,
            quantity: expense.quantity,
            amount: expense.amount,
            expense_date: expense.expense_date,
            status: expense.status.toLowerCase(),
            notes: expense.notes || "",
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
    };

    const submitForm = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormErrors({});
        try {
            const isEdit = Boolean(editingId);
            const url = isEdit ? `/vendors/warehouse/api/expenses/${editingId}` : "/vendors/warehouse/api/expenses";
            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "",
                },
                body: JSON.stringify(form),
            });
            const json = await response.json();
            if (response.ok && json.success) {
                closeModal();
                fetchExpenses();
                fetchStats();
            } else if (json.errors) {
                setFormErrors(json.errors);
            }
        } catch (e) {
            console.error("Failed to save expense:", e);
        } finally {
            setSaving(false);
        }
    };

    const deleteExpense = async (id) => {
        if (!window.confirm("Delete this expense? This cannot be undone.")) return;
        setDeletingId(id);
        try {
            const response = await fetch(`/vendors/warehouse/api/expenses/${id}`, {
                method: "DELETE",
                headers: {
                    Accept: "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content || "",
                },
            });
            const json = await response.json();
            if (json.success) {
                fetchExpenses();
                fetchStats();
            }
        } catch (e) {
            console.error("Failed to delete expense:", e);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 lg:gap-10 w-full h-auto lg:pl-5 lg:pr-5 py-4 lg:py-10 pt-6 pb-12 bg-[#E5E5E5]">
            {/* Header section */}
            <div className="flex md:flex-row flex-col gap-5 justify-between items-center">
                <h1 className="figtree text-[24px] md:text-[30px] font-[700] text-center md:text-left md:mt-0">
                    Warehouse Expenses
                </h1>
                <button
                    type="button"
                    onClick={openAddModal}
                    className="h-[42px] px-6 bg-[#0955AC] text-white rounded-[6px] text-[14px] font-[700]"
                >
                    + Add Expense
                </button>
            </div>

            {/* mini cards */}
            <div className="flex flex-col md:flex-row gap-3 lg:gap-5 w-full">
                {[
                    { label: "Balance", icon: wallet, stat: stats.balance },
                    { label: "Income", icon: income, stat: stats.income },
                    { label: "Expenses", icon: expensesIcon, stat: stats.expenses },
                ].map((c) => (
                    <div
                        key={c.label}
                        className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-3 sm:px-5 py-2"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                    >
                        <div className="flex flex-row gap-3 sm:gap-5 justify-center items-center">
                            <div className="size-[40px] sm:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center shrink-0">
                                <img src={c.icon} className="w-5 h-5 sm:w-auto sm:h-auto" />
                            </div>
                            <div>
                                <h1 className="text-sm sm:text-[16px] font-[500] text-[#7B7B7A]">{c.label}</h1>
                                <h1 className="text-xl sm:text-[26px] font-[700]">LKR {c.stat.amount}</h1>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 items-end text-xs sm:text-[14px] font-[500]">
                            <div
                                className={`w-[70px] sm:w-[81px] h-[24px] sm:h-[26px] rounded-[5px] flex flex-row justify-center items-center ${
                                    c.stat.isPositive ? "bg-[#D8E4F2]" : "bg-[#FF888880]"
                                }`}
                            >
                                <img src={upArrow} className={`size-[16px] sm:size-[19px] ${!c.stat.isPositive ? "rotate-180" : ""}`} />
                                <h1>{c.stat.isPositive ? "+" : ""}{c.stat.growth}%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A] text-[10px] sm:text-xs">from last week</h1>
                        </div>
                    </div>
                ))}
            </div>

            {/* bar chart and pie chart section */}
            <div className="flex flex-col lg:flex-row items-start xl:items-center w-full gap-4 lg:gap-8">
                <div className="w-full min-h-[350px] lg:min-h-[456px] bg-[#FFFFFF] rounded-[10px]" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    <CashflowChart points={stats.cashflow} />
                </div>
                <div
                    className="w-full xl:w-[349px] min-h-[350px] lg:min-h-[456px] bg-[#FFFFFF] flex flex-col justify-between items-center rounded-[10px] px-4 sm:px-10 py-10"
                    style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                    <div className="w-full flex flex-row justify-between items-center mb-5">
                        <h2 className="text-lg sm:text-[24px] font-bold w-full text-left">Expenses Breakdown</h2>
                        <img src={dotThree} className="w-5 h-5 sm:w-auto sm:h-auto" />
                    </div>
                    <ExpensesPieChart categories={stats.categoryBreakdown} />
                </div>
            </div>

            {/* Expenses table */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-10"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
            >
                <div className="flex flex-col md:flex-row gap-3 md:gap-0 justify-between">
                    <h1 className="text-lg sm:text-xl lg:text-[24px] font-[700]">Recent Expenses</h1>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-5">
                        <div className="w-full sm:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-3 sm:px-5">
                            <img src={miniSearchIcon} className="w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-sm"
                                placeholder="Search expense or category..."
                            />
                        </div>
                        <div className="flex flex-row gap-2 sm:gap-3">
                            <div className="flex-1 sm:w-[125px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-3 sm:px-5">
                                <img src={filterIcon} className="size-[12px]" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none text-sm"
                                >
                                    <option value="">Status</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                </select>
                                <img src={miniDownArrow} className="w-3 h-3" />
                            </div>
                            <div className="flex-1 sm:w-[139px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-3 sm:px-5">
                                <img src={calendar} className="size-[14px] sm:size-[17px]" />
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={downloadTableAsPDF}
                            disabled={loading || expenses.length === 0}
                            className="w-full sm:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3 disabled:opacity-50"
                        >
                            <img src={downloadLogo} className="w-4 h-4" />
                            <h1>Download</h1>
                        </button>
                    </div>
                </div>

                {/* table headings */}
                <div className="hidden lg:grid figtree grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-10 mt-10">
                    <div className="flex flex-row gap-2 items-center col-span-2">
                        <h1>Expense</h1>
                        <div className="flex flex-col justify-center items-center"><img src={miniUp} className="w-[6px] h-[4px]" /><img src={miniDown} className="w-[6px] h-[4px]" /></div>
                    </div>
                    <div className="flex flex-row gap-2 items-center col-span-2"><h1>Category</h1></div>
                    <div>Quantity</div>
                    <div>Amount</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Action</div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-[200px]">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0955AC] border-r-transparent" />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-[200px] text-[#7B7B7A]">
                        <p>No expenses recorded yet.</p>
                        <button type="button" onClick={openAddModal} className="mt-3 text-[#0955AC] font-[600] text-sm">
                            Add your first expense
                        </button>
                    </div>
                ) : (
                    expenses.map((expense) => (
                        <div key={expense.id}>
                            {/* Desktop view */}
                            <div className="hidden lg:grid grid-cols-9 text-[15px] font-[500] px-10 h-[80px] border-b-[1.5px] border-[#00000033] items-center">
                                <div className="col-span-2">{expense.name}</div>
                                <div className="col-span-2">
                                    <div className="w-fit h-[20px] bg-[#E8E8E8] rounded-[4px] text-[10px] flex flex-row justify-start items-center gap-2 px-2">
                                        {expense.category}
                                    </div>
                                </div>
                                <div>{expense.quantity}</div>
                                <div>{expense.amount_formatted}</div>
                                <div>{expense.expense_date}</div>
                                <div>
                                    <div
                                        className="w-[72px] h-[20px] border-[1.5px] text-[10px] flex justify-center items-center rounded-[4px]"
                                        style={{ borderColor: expense.status_color, background: expense.status_bg, color: expense.status_color }}
                                    >
                                        {expense.status}
                                    </div>
                                </div>
                                <div className="flex flex-row justify-center items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(expense)}
                                        className="w-[54px] h-[20px] border-[1px] border-[#0955AC] rounded-[4px] text-[10px] text-[#0955AC] font-500"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteExpense(expense.id)}
                                        disabled={deletingId === expense.id}
                                        className="w-[54px] h-[20px] border-[1px] border-[#FF0000] rounded-[4px] text-[10px] text-[#FF0000] font-500 disabled:opacity-50"
                                    >
                                        {deletingId === expense.id ? "…" : "Delete"}
                                    </button>
                                </div>
                            </div>

                            {/* Mobile card view */}
                            <div className="lg:hidden bg-white border-b-[1.5px] border-[#00000033] p-4 mb-3 rounded-lg">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h1 className="font-[600] text-[15px] mb-1">{expense.name}</h1>
                                        <div className="inline-flex h-[20px] bg-[#E8E8E8] rounded-[4px] text-[10px] items-center gap-2 px-2">
                                            {expense.category}
                                        </div>
                                    </div>
                                    <div
                                        className="px-2 py-1 border-[1.5px] text-[10px] rounded-[4px] shrink-0"
                                        style={{ borderColor: expense.status_color, background: expense.status_bg, color: expense.status_color }}
                                    >
                                        {expense.status}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[13px] mb-3">
                                    <div><span className="text-[#7B7B7A] text-xs">Quantity:</span> <span className="font-[500]">{expense.quantity}</span></div>
                                    <div><span className="text-[#7B7B7A] text-xs">Amount:</span> <span className="font-[600]">{expense.amount_formatted}</span></div>
                                    <div className="col-span-2"><span className="text-[#7B7B7A] text-xs">Date:</span> <span className="font-[500]">{expense.expense_date}</span></div>
                                </div>
                                <div className="flex flex-row gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(expense)}
                                        className="flex-1 h-[32px] border-[1px] border-[#0955AC] rounded-[4px] text-[12px] text-[#0955AC] font-500"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteExpense(expense.id)}
                                        disabled={deletingId === expense.id}
                                        className="flex-1 h-[32px] border-[1px] border-[#FF0000] rounded-[4px] text-[12px] text-[#FF0000] font-500 disabled:opacity-50"
                                    >
                                        {deletingId === expense.id ? "…" : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-2 mt-10 sm:mt-20">
                    <div className="flex items-center">
                        <span className="mr-3 text-[#00000080] text-[13px] sm:text-[15px]">Results per page</span>
                        <select
                            className="rounded px-3 py-1 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[71px] h-[40px] focus:outline-none"
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            {perPageOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            className="px-2 sm:px-3 py-1 w-[35px] h-[35px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <span className="text-base sm:text-lg">&#60;</span>
                        </button>
                        {getPageNumbers().map((num, idx) =>
                            num === "..." ? (
                                <span key={idx} className="px-1 sm:px-2 text-sm">...</span>
                            ) : (
                                <button
                                    key={num}
                                    className={`px-2 sm:px-3 py-1 text-[14px] sm:text-[16px] font-[600] rounded-[4px] w-[35px] h-[35px] sm:size-[40px] bg-[#F4F3F3] ${
                                        currentPage === num ? "text-[#0955AC] font-[600] border-[2px] border-[#0955AC]" : ""
                                    }`}
                                    onClick={() => goToPage(num)}
                                >
                                    {num}
                                </button>
                            )
                        )}
                        <button
                            className="px-2 sm:px-3 py-1 w-[35px] h-[35px] sm:size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <span className="text-base sm:text-lg">&#62;</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Add/Edit modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-[10px] w-full max-w-[480px] p-6">
                        <h2 className="text-[20px] font-[700] mb-4">{editingId ? "Edit Expense" : "Add Expense"}</h2>
                        <form onSubmit={submitForm} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[13px] font-[600] text-gray-700">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                />
                                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name[0]}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[13px] font-[600] text-gray-700">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                    >
                                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[13px] font-[600] text-gray-700">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[13px] font-[600] text-gray-700">Amount (LKR) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                    />
                                    {formErrors.amount && <p className="text-red-600 text-xs mt-1">{formErrors.amount[0]}</p>}
                                </div>
                                <div>
                                    <label className="text-[13px] font-[600] text-gray-700">Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.expense_date}
                                        onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                                        className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                    />
                                    {formErrors.expense_date && <p className="text-red-600 text-xs mt-1">{formErrors.expense_date[0]}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="text-[13px] font-[600] text-gray-700">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full h-[42px] mt-1 rounded-[6px] border-gray-300"
                                >
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-[6px] border border-gray-300 text-sm font-[600]">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 rounded-[6px] bg-[#0955AC] text-white text-sm font-[600] disabled:opacity-60"
                                >
                                    {saving ? "Saving…" : editingId ? "Save changes" : "Add expense"}
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
