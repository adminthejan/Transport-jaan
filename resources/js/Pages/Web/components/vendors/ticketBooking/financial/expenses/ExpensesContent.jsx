import React, { useState, useRef, useEffect } from "react";
import { usePage, Link } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


import search from "../../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../../../assets/vendors/dashboard/logOutLogo.svg"; // Added

import upArrow from "../../../../../assets/vendors/dashboard/icons/upArrow.svg";
import wallet from "../../../../../assets/financial/expenses/wallet.svg";
import income from "../../../../../assets/financial/expenses/income.svg";
import expenses from "../../../../../assets/financial/expenses/expenses.svg";
import dotThree from "../../../../../assets/financial/expenses/dots3.svg";
import filterIcon from "../../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import downloadLogo from "../../../../../assets/financial/expenses/download.svg";
import calendar from "../../../../../assets/financial/expenses/cal.svg";
import miniUp from "../../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../../assets/vendors/dashboard/icons/miniDown.svg";

import CashflowChart from "./CashflowChart";
import ExpensesPieChart from "./ExpensesPieChart";

import UserDropdown from "../../../UserDropdown";

const ExpensesContent = () => {
  const { auth } = usePage().props;
  const user = auth?.user;
  const isVerified = user?.status === 'verified' || user?.status === 'Verified';

  const CATEGORY_CONFIG = {
    "Vehicle Maintenance": { label: "Vehicle Maintenance", color: "#2E4683", bg: "#E8EDF5" },
    "Fuel": { label: "Fuel", color: "#3DD0FF", bg: "#E5F9FF" },
    "Insurance": { label: "Insurance", color: "#39CEF3", bg: "#E8F8FC" },
    "Driver Salary": { label: "Driver Salary", color: "#0955AC", bg: "#E6EFF9" },
    "Terminal Cleaning": { label: "Terminal Cleaning", color: "#8CA9E6", bg: "#F0F4FC" },
  };

  const initialExpensesData = [
    {
      id: "EXP-TB-001",
      name: "Oil Change",
      category: CATEGORY_CONFIG["Vehicle Maintenance"],
      quantity: 12,
      amount: "$100",
      numericAmount: 100,
      date: "2026.09.10",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-002",
      name: "Fuel Purchase",
      category: CATEGORY_CONFIG["Fuel"],
      quantity: 12,
      amount: "$2,000",
      numericAmount: 2000,
      date: "2026.09.10",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-003",
      name: "Insurance Payment",
      category: CATEGORY_CONFIG["Insurance"],
      quantity: 12,
      amount: "$1,500",
      numericAmount: 1500,
      date: "2026.09.10",
      status: {
        label: "Pending",
        border: "#F0BB0D",
        bg: "#FFCD294D",
        text: "#F0BB0D",
      },
    },
    {
      id: "EXP-TB-004",
      name: "Driver Salary",
      category: CATEGORY_CONFIG["Driver Salary"],
      quantity: 1,
      amount: "$1,200",
      numericAmount: 1200,
      date: "2026.09.10",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-005",
      name: "Terminal Cleaning",
      category: CATEGORY_CONFIG["Terminal Cleaning"],
      quantity: 4,
      amount: "$450",
      numericAmount: 450,
      date: "2026.09.10",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-006",
      name: "Vehicle Maintenance",
      category: CATEGORY_CONFIG["Vehicle Maintenance"],
      quantity: 12,
      amount: "$1,500",
      numericAmount: 1500,
      date: "2026.09.10",
      status: {
        label: "Pending",
        border: "#F0BB0D",
        bg: "#FFCD294D",
        text: "#F0BB0D",
      },
    },
    {
      id: "EXP-TB-007",
      name: "Tire Replacement",
      category: CATEGORY_CONFIG["Vehicle Maintenance"],
      quantity: 8,
      amount: "$1,500",
      numericAmount: 1500,
      date: "2026.09.10",
      status: {
        label: "Pending",
        border: "#F0BB0D",
        bg: "#FFCD294D",
        text: "#F0BB0D",
      },
    },
    {
      id: "EXP-TB-008",
      name: "Fuel Purchase (Highway)",
      category: CATEGORY_CONFIG["Fuel"],
      quantity: 10,
      amount: "$1,800",
      numericAmount: 1800,
      date: "2026.09.08",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-009",
      name: "Bus Interior Sanitization",
      category: CATEGORY_CONFIG["Terminal Cleaning"],
      quantity: 6,
      amount: "$350",
      numericAmount: 350,
      date: "2026.09.07",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
    {
      id: "EXP-TB-010",
      name: "Fleet Route Permit Fee",
      category: CATEGORY_CONFIG["Insurance"],
      quantity: 2,
      amount: "$800",
      numericAmount: 800,
      date: "2026.09.05",
      status: {
        label: "Completed",
        border: "#50AE31",
        bg: "#6DB4464D",
        text: "#50AE31",
      },
    },
  ];

  const [expensesList, setExpensesList] = useState(initialExpensesData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);

  // Filtered expenses
  const filteredExpenses = expensesList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      item.status.label.toLowerCase() === statusFilter.toLowerCase();
    const matchesDate = !dateFilter || item.date.includes(dateFilter);
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const perPageOptions = [5, 10, 20, 50];
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentExpenses = filteredExpenses.slice(startIdx, endIdx);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedExpenses(currentExpenses.map((ex) => ex.id));
    } else {
      setSelectedExpenses([]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteExpense = (id) => {
    if (confirm("Are you sure you want to delete this expense record?")) {
      setExpensesList((prev) => prev.filter((item) => item.id !== id));
      setSelectedExpenses((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleEditExpense = (expense) => {
    const newAmount = prompt("Enter updated amount for " + expense.name + ":", expense.amount);
    if (newAmount) {
      setExpensesList((prev) =>
        prev.map((item) => (item.id === expense.id ? { ...item, amount: newAmount } : item))
      );
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }
    return pages;
  };

  const downloadTableAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Ticket Booking - Recent Expenses", 14, 20);

    const tableData = filteredExpenses.map((expense) => [
      expense.name,
      expense.category.label,
      expense.quantity.toString(),
      expense.amount,
      expense.date,
      expense.status.label,
    ]);

    autoTable(doc, {
      head: [
        ["Expenses", "Category", "Quantity", "Amount", "Date", "Status"],
      ],
      body: tableData,
      startY: 30,
      theme: "grid",
      headStyles: {
        fillColor: [216, 228, 242],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: {
        cellPadding: 2,
        fontSize: 10,
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
      },
    });

    doc.save("ticket_booking_expenses.pdf");
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchQuery, statusFilter, dateFilter]);

  return (
    <div className="flex flex-col gap-10 w-full h-auto px-5 py-10 mt-5 xl:mt-0 pt-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row gap-5 justify-between items-center">
        <h1 className="figtree text-[35px] font-[700]">
          Ticket Booking Expenses
        </h1>
        {/* <div className="flex flex-row gap-5 relative items-center">
          <div className="flex flex-row gap-5 relative items-center">
            <UserDropdown settingsRoute={route("ticketBooking.settingsPage")} />
          </div>
        </div> */}
      </div>

      {/* mini 3 cards */}
      <div className="flex flex-col xl:flex-row gap-5 w-full">
        {/* card 1 */}
        <div
          className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
        >
          <div className="flex flex-row gap-5 justify-center items-center">
            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
              <img src={wallet} alt="Wallet" />
            </div>
            <div>
              <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                Balance
              </h1>
              <h1 className="text-[20px] font-[700]">$8,450</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end text-[14px] font-[500]">
            <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
              <img src={upArrow} className="size-[19px] rotate-180" alt="Decrease" />
              <h1 className="text-[#8A1F1F] font-[600]">-2.06%</h1>
            </div>
            <h1 className="text-[#7B7B7A]">from last week</h1>
          </div>
        </div>

        {/* card 2 */}
        <div
          className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
        >
          <div className="flex flex-row gap-5 justify-center items-center">
            <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
              <img src={income} alt="Income" />
            </div>
            <div>
              <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                Income
              </h1>
              <h1 className="text-[20px] font-[700]">$25,700</h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end text-[14px] font-[500]">
            <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
              <img src={upArrow} className="size-[19px]" alt="Increase" />
              <h1 className="text-[#0955AC] font-[600]">+1.73%</h1>
            </div>
            <h1 className="text-[#7B7B7A]">from last week</h1>
          </div>
        </div>

        {/* card 3 */}
        <div className="flex flex-col lg:flex-row gap-5 w-full">
          <div
            className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
          >
            <div className="flex flex-row gap-5 justify-center items-center">
              <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                <img src={expenses} alt="Expenses" />
              </div>
              <div>
                <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                  Expenses
                </h1>
                <h1 className="text-[20px] font-[700]">$14,756</h1>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end text-[14px] font-[500]">
              <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                <img
                  src={upArrow}
                  className="size-[19px] rotate-180"
                  alt="Decrease"
                />
                <h1 className="text-[#8A1F1F] font-[600]">-2.86%</h1>
              </div>
              <h1 className="text-[#7B7B7A]">from last week</h1>
            </div>
          </div>
        </div>
      </div>

      {/* bar chart and pie chart section */}
      <div className="flex flex-col xl:flex-row gap-8">
        <div
          className="w-full h-auto bg-[#FFFFFF] rounded-[10px]"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
        >
          <CashflowChart />
        </div>
        <div
          className="w-full min-h-[426px] bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] px-5 lg:px-10 py-5"
          style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
        >
          <div className="w-full flex flex-row justify-between items-center">
            <h2 className="text-[24px] font-bold mb-2 w-full text-left">
              Expenses Breakdown
            </h2>
            <img src={dotThree} alt="More" />
          </div>
          <ExpensesPieChart />
        </div>
      </div>

      {/* Transaction table */}
      <div
        className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-5 lg:px-10 py-10"
        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
      >
        {/* card header */}
        <div className="flex flex-col lg:flex-row justify-between gap-5">
          <h1 className="text-[24px] font-[700]">Recent Transactions</h1>
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
              <img src={miniSearchIcon} alt="Search" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-[13px]"
                placeholder="Search expense or category..."
              />
            </div>
            <div className="w-full lg:w-[135px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-3">
              <img src={filterIcon} className="size-[12px] mr-1" alt="Filter" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none text-[13px] text-[#7B7B7ACC] cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="w-full lg:w-[145px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-3">
              <img src={calendar} className="size-[17px] mr-1" alt="Calendar" />
              <input
                type="text"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-[13px]"
                placeholder="Filter date..."
              />
            </div>
            <button
              onClick={downloadTableAsPDF}
              className="w-full lg:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3 cursor-pointer hover:bg-[#074288] transition"
            >
              <img src={downloadLogo} alt="Download" />
              <h1>Download</h1>
            </button>
          </div>
        </div>
        {/* end header */}

        {/* DESKTOP/TABLET TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <div className="figtree grid grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-5 lg:px-10 mt-10 min-w-[1000px]">
            <div className="flex flex-row gap-5 items-center col-span-2">
              <input
                type="checkbox"
                checked={
                  currentExpenses.length > 0 &&
                  currentExpenses.every((ex) => selectedExpenses.includes(ex.id))
                }
                onChange={toggleSelectAll}
                className="size-[20px] rounded-[4px] bg-[#CCCCCC73] cursor-pointer"
              />
              <h1>Expenses</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center col-span-2">
              <h1>Category</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Quantity</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Amount</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Date</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Status</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Action</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
          </div>

          {currentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="grid grid-cols-9 text-[15px] font-[500] px-5 lg:px-10 h-[70px] border-b-[1.5px] border-[#00000033] items-center min-w-[1000px] hover:bg-slate-50 transition"
            >
              <div className="flex flex-row gap-5 col-span-2 items-center">
                <input
                  type="checkbox"
                  checked={selectedExpenses.includes(expense.id)}
                  onChange={() => toggleSelectOne(expense.id)}
                  className="size-[20px] rounded-[4px] bg-[#CCCCCC73] cursor-pointer"
                />
                <h1 className="font-[600] text-[#1E293B]">{expense.name}</h1>
              </div>
              <div className="col-span-2">
                <div
                  className="h-[24px] px-2.5 rounded-[4px] text-[11px] font-[600] inline-flex items-center gap-2"
                  style={{ backgroundColor: expense.category.bg, color: expense.category.color }}
                >
                  <div
                    className="size-[8px] rounded-full"
                    style={{ backgroundColor: expense.category.color }}
                  ></div>
                  <h1>{expense.category.label}</h1>
                </div>
              </div>
              <div>{expense.quantity}</div>
              <div className="font-[600]">{expense.amount}</div>
              <div className="text-gray-600">{expense.date}</div>
              <div>
                <div
                  className="w-[78px] h-[22px] border-[1.5px] text-[11px] font-[600] flex justify-center items-center rounded-[4px]"
                  style={{
                    borderColor: expense.status.border,
                    background: expense.status.bg,
                    color: expense.status.text,
                  }}
                >
                  {expense.status.label}
                </div>
              </div>
              <div className="flex flex-row items-center gap-2">
                <button
                  onClick={() => handleEditExpense(expense)}
                  className="w-[54px] h-[22px] border-[1px] border-[#0955AC] rounded-[4px] text-[11px] text-[#0955AC] font-[600] flex justify-center items-center cursor-pointer hover:bg-[#0955AC] hover:text-white transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="w-[54px] h-[22px] border-[1px] border-[#FF0000] rounded-[4px] text-[11px] text-[#FF0000] font-[600] flex justify-center items-center cursor-pointer hover:bg-red-500 hover:text-white transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE VIEW – cards, no horizontal scroll */}
        <div className="md:hidden mt-6 space-y-4">
          {currentExpenses.map((expense, idx) => (
            <div
              key={expense.name + startIdx + idx}
              className="w-full rounded-[10px] border border-[#00000026] bg-white p-4"
            >
              {/* Top: checkbox + expense name */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                  />
                  <div>
                    <span className="block text-[12px] font-[600] text-[#00000080]">
                      Expenses
                    </span>
                    <span className="text-[14px] font-[600]">
                      {expense.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="mb-2">
                <span className="block text-[12px] font-[600] text-[#00000080]">
                  Category
                </span>
                <div
                  className={`inline-flex items-center gap-2 px-2 py-[2px] rounded-[4px] bg-[#E8E8E8] text-[11px] mt-1`}
                >
                  <div
                    className="size-[10px] rounded-[2px]"
                    style={{ backgroundColor: expense.category.color }}
                  />
                  <span>{expense.category.label}</span>
                </div>
              </div>

              {/* Quantity / Amount */}
              <div className="flex justify-between gap-4 mb-2">
                <div>
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Quantity
                  </span>
                  <span className="text-[13px]">{expense.quantity}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Amount
                  </span>
                  <span className="text-[13px]">{expense.amount}</span>
                </div>
              </div>

              {/* Date / Status */}
              <div className="flex justify-between gap-4 mb-3">
                <div>
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Date
                  </span>
                  <span className="text-[13px]">{expense.date}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[12px] font-[600] text-[#00000080] mb-1">
                    Status
                  </span>
                  <div
                    className="inline-flex px-2 py-[2px] rounded-[4px] text-[11px] font-[700]"
                    style={{
                      border: `1px solid ${expense.status.border}`,
                      background: expense.status.bg,
                      color: expense.status.text,
                    }}
                  >
                    {expense.status.label}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center gap-3">
                <button className="px-3 py-1 border border-[#0955AC] rounded-[4px] text-[11px] text-[#0955AC] font-[600]">
                  Edit
                </button>
                <button className="px-3 py-1 border border-[#FF0000] rounded-[4px] text-[11px] text-[#FF0000] font-[600]">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-2 mt-20">
          <div className="flex items-center">
            <span className="mr-3 text-[#00000080] text-[15px]">
              Results per page
            </span>
            <select
              className="rounded px-3 py-1 font-[600] text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[71px] h-[40px] focus:outline-none"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="text-lg">&lt;</span>
            </button>
            {getPageNumbers().map((num, idx) =>
              num === "..." ? (
                <span key={idx} className="px-2">
                  ...
                </span>
              ) : (
                <button
                  key={num}
                  className={`px-3 py-1 text-[16px] font-[600] rounded-[4px] size-[40px] bg-[#F4F3F3] ${currentPage === num
                      ? "text-[#0955AC] font-[600] border-[2px] border-[#0955AC]"
                      : "bg-[#F4F3F3]"
                    }`}
                  onClick={() => goToPage(num)}
                >
                  {num}
                </button>
              )
            )}
            <button
              className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="text-lg">&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesContent;
