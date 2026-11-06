// resources/js/Pages/Web/components/vendors/expenses/ExpensesContent.jsx
import React, { useState, useEffect, useRef } from "react";
import { usePage, Link } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import bell from "../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../assets/vendors/dashboard/proPic.svg";
import upArrow from "../../../../assets/vendors/dashboard/icons/upArrow.svg";
import wallet from "../../../../assets/financial/expenses/wallet.svg";
import income from "../../../../assets/financial/expenses/income.svg";
import expenses from "../../../../assets/financial/expenses/expenses.svg";
import dotThree from "../../../../assets/financial/expenses/dots3.svg";
import filterIcon from "../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import downloadLogo from "../../../../assets/financial/expenses/download.svg";
import calendar from "../../../../assets/financial/expenses/cal.svg";
import miniUp from "../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../assets/vendors/dashboard/icons/miniDown.svg";
import logOutLogo from "../../../../assets/vendors/dashboard/logOutLogo.svg"; // ← NEW

import CashflowChart from "./CashflowChart";
import ExpensesPieChart from "./ExpensesPieChart";

import UserDropdown from "../../UserDropdown";

const ExpensesContent = () => {
    const { auth, unreadNotifications = 0 } = usePage().props;
    const user = auth?.user;

    // State for mobile detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Mobile detection effect
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cashflow data for mobile list view
    const cashflowData = [
        { month: "Jan", income: 4000, expenses: 15000 },
        { month: "Feb", income: 5000, expenses: 17000 },
        { month: "Mar", income: 4500, expenses: 16000 },
        { month: "Apr", income: 7000, expenses: 19000 },
        { month: "May", income: 6000, expenses: 17000 },
        { month: "Jun", income: 6500, expenses: 18000 },
        { month: "Jul", income: 9000, expenses: 18500 },
        { month: "Aug", income: 12000, expenses: 18200 },
        { month: "Sep", income: 11000, expenses: 17000 },
        { month: "Oct", income: 13000, expenses: 17500 },
        { month: "Nov", income: 15000, expenses: 20000 },
        { month: "Dec", income: 12000, expenses: 22000 },
    ];

    // Expenses breakdown data for mobile list view
    const expensesBreakdownData = [
        { name: "Vehicle Maintenance", value: 3000, percent: 65, color: "#344B8E" },
        { name: "Hired", value: 2500, percent: 25, color: "#3DD0FF" },
        { name: "Pending", value: 2000, percent: 30, color: "#0955AC" },
        { name: "Cancelled", value: 500, percent: 30, color: "#8CA9E6" },
    ];

    const expensesData = [
        {
            name: "Oil Change",
            category: {
                label: "Vehicle Maintenance",
                width: "w-[133px]",
                color: "#2E4683",
            },
            quantity: 12,
            amount: "$100",
            date: "2025.08.10",
            status: {
                label: "Completed",
                border: "#50AE31",
                bg: "#6DB4464D",
                text: "#50AE31",
            },
        },
        {
            name: "Fuel Purchase",
            category: { label: "Fuel", width: "w-[58px]", color: "#2E4683" },
            quantity: 12,
            amount: "$2000",
            date: "2025.08.10",
            status: {
                label: "Completed",
                border: "#50AE31",
                bg: "#6DB4464D",
                text: "#50AE31",
            },
        },
        {
            name: "Insurance Payment",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Vehicle Maintenance",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Tire Replacement",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Staff Salary",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Vehicle Maintenance",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Staff Salary",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Fuel Purchase",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
        {
            name: "Insurance Payment",
            category: {
                label: "Insurance",
                width: "w-[82px]",
                color: "#39CEF3",
            },
            quantity: 12,
            amount: "$1500",
            date: "2025.08.10",
            status: {
                label: "Pending",
                border: "#F0BB0D",
                bg: "#FFCD294D",
                text: "#F0BB0D",
            },
        },
    ];

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const perPageOptions = [5, 10, 20, 50];
    const totalPages = Math.ceil(expensesData.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const currentExpenses = expensesData.slice(startIdx, endIdx);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, "...", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(
                    1,
                    "...",
                    totalPages - 2,
                    totalPages - 1,
                    totalPages
                );
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
        doc.text("Recent Expenses", 14, 20);

        const tableData = expensesData.map((expense) => [
            expense.name,
            expense.category.label,
            expense.quantity.toString(),
            expense.amount,
            expense.date,
            expense.status.label,
        ]);

        autoTable(doc, {
            head: [
                [
                    "Expenses",
                    "Category",
                    "Quantity",
                    "Amount",
                    "Date",
                    "Status",
                ],
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
                1: { cellWidth: 30 },
                2: { cellWidth: 20 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 20 },
            },
        });

        doc.save("expenses.pdf");
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    return (
        <div className="flex flex-col gap-10 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* ==================== HEADER WITH DROPDOWN ==================== */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[20px] lg:text-[35px] font-[700] text-center">Vehicle Rental Expenses</h1>

                {/* <div className="flex flex-row gap-5 relative items-center">
                    <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div>
                </div> */}
            </div>

            {/* ==================== MINI CARDS ==================== */}
            <div className="flex flex-col md:flex-row gap-5 w-full">
                {/* card 1 */}
                <div
                    className="xl:min-w-[300px] w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={wallet} alt="wallet" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Balance
                            </h1>
                            <h1 className="text-[20px] font-[700]">$8,450</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                            <img
                                src={upArrow}
                                className="size-[19px]"
                                alt="up"
                            />
                            <h1>+2.86%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>

                {/* card 2 */}
                <div
                    className="xl:min-w-[300px] w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={income} alt="income" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Income
                            </h1>
                            <h1 className="text-[20px] font-[700]">$25,700</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                            <img
                                src={upArrow}
                                className="size-[19px]"
                                alt="up"
                            />
                            <h1>+1.73%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>

                {/* card 3 */}
                <div
                    className="xl:min-w-[300px] w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={expenses} alt="expenses" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Expenses
                            </h1>
                            <h1 className="text-[20px] font-[700]">$14,756</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                            <img
                                src={upArrow}
                                className="size-[19px] rotate-180"
                                alt="down"
                            />
                            <h1>+2.86%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
            </div>

            {/* ==================== CHARTS SECTION ==================== */}
            <div className="flex flex-col lg:flex-row w-full gap-8">
                <div
                    className="w-full min-h-[426px] xl:min-w-[680px] bg-[#FFFFFF] rounded-[10px]"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {isMobile ? (
                        // Mobile cashflow list view
                        <div className="w-full p-4">
                            <h3 className="text-[18px] font-[700] mb-4 text-center">Monthly Cashflow</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {cashflowData.map((month, index) => (
                                    <div key={index} className="bg-[#F8F9FA] rounded-[8px] p-3 border border-[#E9ECEF]">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-[600] text-[16px]">{month.month}</h4>
                                            <div className="text-right">
                                                <div className="text-[14px] text-[#28A745] font-[600]">
                                                    +${month.income.toLocaleString()} Income
                                                </div>
                                                <div className="text-[14px] text-[#DC3545] font-[600]">
                                                    -${month.expenses.toLocaleString()} Expenses
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-[#E9ECEF] rounded-full h-2">
                                            <div
                                                className="bg-[#0955AC] h-2 rounded-full"
                                                style={{ width: `${(month.income / (month.income + month.expenses)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-[12px] text-[#6C757D] mt-1 text-center">
                                            Net: ${(month.income - month.expenses).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Desktop chart view
                        <CashflowChart />
                    )}
                </div>
                <div
                    className="w-full xl:min-h-[426px] bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] px-5 py-5"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    {isMobile ? (
                        // Mobile expenses breakdown list view
                        <div className="w-full p-4">
                            <h3 className="text-[18px] font-[700] mb-4 text-center">Expenses Breakdown</h3>
                            <div className="space-y-3">
                                {expensesBreakdownData.map((item, index) => (
                                    <div key={index} className="bg-[#F8F9FA] rounded-[8px] p-3 border border-[#E9ECEF]">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-[600] text-[16px]">{item.name}</h4>
                                            <div className="text-right">
                                                <div className="text-[14px] font-[600]">
                                                    ${item.value.toLocaleString()}
                                                </div>
                                                <div className="text-[12px] text-[#6C757D]">
                                                    {item.percent}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-[#E9ECEF] rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full"
                                                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4 p-3 bg-[#0955AC] text-white rounded-[8px] text-center">
                                    <div className="text-[14px] font-[500]">Total Expenses</div>
                                    <div className="text-[20px] font-[700]">
                                        ${expensesBreakdownData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Desktop pie chart view
                        <>
                            <div className="w-full flex flex-row justify-between items-center">
                                <h2 className="text-[24px] font-bold mb-2 w-full text-left">
                                    Expenses Breakdown
                                </h2>
                                <img src={dotThree} alt="more" />
                            </div>
                            <ExpensesPieChart />
                        </>
                    )}
                </div>
            </div>

            {/* ==================== EXPENSES TABLE ==================== */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-4 md:px-10 py-5 md:py-10"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >
                {/* Table Header */}
                <div className="flex flex-col xl:flex-row justify-between gap-4 md:gap-0">
                    <h1 className="text-[20px] md:text-[24px] font-[700]">
                        Recent Transactions
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-5">
                        <div className="xl:w-[253px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                            <img src={miniSearchIcon} alt="search" />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Search client name, car, etc."
                            />
                        </div>
                        <div className="xl:w-[125px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img
                                src={filterIcon}
                                className="size-[12px]"
                                alt="filter"
                            />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Status"
                            />
                            <img src={miniDownArrow} alt="arrow" />
                        </div>
                        <div className="xl:w-[139px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img
                                src={calendar}
                                className="size-[17px]"
                                alt="calendar"
                            />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="25th May"
                            />
                            <img src={miniDownArrow} alt="arrow" />
                        </div>
                        <button
                            onClick={downloadTableAsPDF}
                            className="xl:w-[125px] xl:h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3 py-2 px-4"
                        >
                            <img src={downloadLogo} alt="download" />
                            <h1>Download</h1>
                        </button>
                    </div>
                </div>

                {/* Table Headings - hidden on mobile */}
                <div className="hidden md:grid figtree grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-10 mt-10">
                    <div className="flex flex-row gap-5 items-center col-span-2">
                        <input
                            type="checkbox"
                            className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                        />
                        <h1>Expenses</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center col-span-2">
                        <h1>Category</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Quantity</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Amount</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Date</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Status</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Action</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img
                                src={miniUp}
                                className="w-[6px] h-[4px]"
                                alt="up"
                            />
                            <img
                                src={miniDown}
                                className="w-[6px] h-[4px]"
                                alt="down"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Rows */}
                {currentExpenses.map((expense, idx) => (
                    <div
                        key={expense.name + startIdx + idx}
                        className="grid grid-cols-1 md:grid-cols-9 text-[12px] font-[500] px-4 md:px-10 h-auto md:h-[100px] border-b-[1.5px] border-[#00000033] items-center py-4 md:py-0 gap-3 lg:gap-0"
                    >
                        <div className="flex flex-row items-center gap-5 col-span-2 md:col-span-2">
                            <input
                                type="checkbox"
                                className="size-[15px] xl:size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                            />
                            <div>
                                <span className="md:hidden font-bold">Expense: </span>
                                <h1>{expense.name}</h1>
                            </div>
                        </div>
                        <div className={`col-span-2 md:col-span-2`}>
                            <span className="md:hidden font-bold">Category: </span>
                            <div
                                className={` ${expense.category.width} h-[20px] bg-[#E8E8E8] rounded-[4px] text-[10px] flex flex-row justify-start items-center gap-3 px-2`}
                            >
                                <div
                                    className="size-[10px] rounded-[2px]"
                                    style={{
                                        backgroundColor: expense.category.color,
                                    }}
                                ></div>
                                <h1>{expense.category.label}</h1>
                            </div>
                        </div>
                        <div>
                            <span className="md:hidden font-bold">Quantity: </span>
                            {expense.quantity}
                        </div>
                        <div>
                            <span className="md:hidden font-bold">Amount: </span>
                            {expense.amount}
                        </div>
                        <div>
                            <span className="md:hidden font-bold">Date: </span>
                            {expense.date}
                        </div>
                        <div>
                            <span className="md:hidden font-bold">Status: </span>
                            <div
                                className="w-[72px] h-[20px] border-[1.5px] text-[10px] flex justify-center items-center rounded-[4px]"
                                style={{
                                    borderColor: expense.status.border,
                                    background: expense.status.bg,
                                    color: expense.status.text,
                                }}
                            >
                                {expense.status.label}
                            </div>
                        </div>
                        <div className="flex flex-row justify-center items-center gap-2 mt-2 md:mt-0">
                            <span className="md:hidden font-bold mr-2">Actions: </span>
                            <div className="px-2 py-1 border-[1px] border-[#0955AC] rounded-[4px] text-[10px] text-[#0955AC] font-500 flex justify-center items-center cursor-pointer">
                                Edit
                            </div>
                            <div className="py-1 px-2 border-[1px] border-[#FF0000] rounded-[4px] text-[10px] text-[#FF0000] font-500 flex justify-center items-center cursor-pointer">
                                Delete
                            </div>
                        </div>
                    </div>
                ))}

                {/* Pagination */}
                <div className="flex md:flex-row flex-col justify-between items-center gap-2 mt-20">
                    <div className="flex items-center">
                        <span className="mr-3 text-[#00000080] text-[15px]">
                            Results per page
                        </span>
                        <select
                            className="rounded px-3 py-1 font-[600] text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[71px] h-[40px] focus:outline-none"
                            value={itemsPerPage}
                            onChange={(e) =>
                                setItemsPerPage(Number(e.target.value))
                            }
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
                                    className={`px-3 py-1 text-[16px] font-[600] rounded-[4px] size-[40px] bg-[#F4F3F3] ${
                                        currentPage === num
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
