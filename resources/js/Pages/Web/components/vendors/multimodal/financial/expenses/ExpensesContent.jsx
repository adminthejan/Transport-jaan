import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import search from "../../../../../assets/vendors/dashboard/searchIcon.svg";
import settings from "../../../../../assets/vendors/dashboard/settings.svg";
import bell from "../../../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../../../assets/vendors/dashboard/proPic.svg";
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
        const { auth } = usePage().props;
        const user = auth?.user;

        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Helper for pagination numbers with ellipsis
    const getPageNumbers = () => {
        const { auth } = usePage().props;
        const user = auth?.user;

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

    // Function to download table as PDF
    const downloadTableAsPDF = () => {
        const { auth } = usePage().props;
        const user = auth?.user;

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Recent Transactions", 14, 20);

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

    // Reset to first page when itemsPerPage changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    return (
        <div className="flex flex-col gap-10 w-full h-auto px-5 lg:pr-5 lg:px-0 py-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[24px] md:text-[35px] font-[700]">
                    Multimodal Expenses
                </h1>
                {/* <div className="flex flex-row gap-5">
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={search} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={settings} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={bell} />
                    </div>
                    <div className="size-[60px] rounded-[10px] bg-[#E8EBEF] flex justify-center items-center">
                        <img src={proPic} />
                    </div>
                    <div className="figtree flex flex-col justify-center items-start">
                        <h1 className="text-[20px] font-[700]">{user?.name || 'Service Provider'}</h1>
                        <h1 className="text-[16px] font-[600] text-[#7B7B7A]">
                            Service Provider
                        </h1>
                    </div>
                </div> */}
                <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("freight.settingsPage")} />
                </div>
            </div>
            {/* end of header section */}

            {/* mini 4 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
                {/* card 1 */}
                <div
                    className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={wallet} />
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
                            <img src={upArrow} className="size-[19px]" />
                            <h1 className="">+2.86%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
                {/* end of card 1 */}

                {/* card 2 */}
                <div
                    className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={income} />
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
                            <img src={upArrow} className="size-[19px]" />
                            <h1 className="">+1.73%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
                {/* end of card 2 */}

                {/* card 3 */}
                <div
                    className="w-full min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={expenses} />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Expenses
                            </h1>
                            <h1 className="text-[20px] font-[700]">
                                $14,756
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                            <img
                                src={upArrow}
                                className="size-[19px] rotate-180"
                            />
                            <h1 className="">+2.86%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
                {/* end of card 3 */}
            </div>

            {/* bar chart and pie chart section */}
            <div className="flex flex-col lg:flex-row w-full gap-8">
                <div
                    className="w-full min-h-[426px] xl:min-w-[700px] bg-[#FFFFFF] rounded-[10px]"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
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
                    className="w-full min-h-[426px] bg-[#FFFFFF] flex flex-col justify-center items-center rounded-[10px] px-5 py-5"
                    style={{
                        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                    }}
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
                            <div className="w-full flex flex-row justify-between items-center ">
                                <h2 className="text-[24px] font-bold mb-2 w-full text-left">
                                    Expenses Breakdown
                                </h2>
                                <img src={dotThree} />
                            </div>
                            <ExpensesPieChart />
                        </>
                    )}
                </div>
            </div>

            {/* Transaction table */}
            <div
                className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-4 md:px-10 py-5 md:py-10"
                style={{
                    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                }}
            >
                {/* card header */}
                <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-0">
                    <h1 className="text-[20px] md:text-[24px] font-[700]">
                        Recent Transactions
                    </h1>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-5">
                        <div className="w-full md:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                            <img src={miniSearchIcon} />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Search client name, car, etc."
                            />
                        </div>
                        <div className="w-full md:w-[125px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img src={filterIcon} className="size-[12px]" />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Status"
                            />
                            <img src={miniDownArrow} />
                        </div>
                        <div className="w-full md:w-[139px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
                            <img src={calendar} className="size-[17px]" />
                            <input
                                type="text"
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="25th May"
                            />
                            <img src={miniDownArrow} />
                        </div>
                        <button
                            onClick={downloadTableAsPDF}
                            className="w-full md:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3"
                        >
                            <img src={downloadLogo} />
                            <h1>Download</h1>
                        </button>
                    </div>
                </div>
                {/* end */}

                {/* expenses table */}
                {/* table headings */}
                <div className="hidden md:grid grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-10 mt-10">
                    <div className="flex flex-row gap-5 items-center col-span-2">
                        <input
                            type="checkbox"
                            className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                        />
                        <h1>Expenses</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center col-span-2">
                        <h1>Category</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Quantity</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Amount</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Date</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Status</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Action</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                </div>
                {/* end */}

                {/* Mobile Cards View */}
                <div className="md:hidden flex flex-col gap-4 mt-10">
                    {currentExpenses.map((expense, idx) => (
                        <div
                            key={expense.name + startIdx + idx}
                            className="bg-[#FFFFFF] rounded-[10px] p-4 shadow-md"
                            style={{
                                boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
                            }}
                        >
                            <div className="flex flex-col gap-3 justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                                    />
                                    <h1 className="text-[18px] font-[600]">{expense.name}</h1>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-[54px] h-[20px] border-[1px] border-[#0955AC] rounded-[4px] text-[10px] text-[#0955AC] font-500 flex justify-center items-center">
                                        Edit
                                    </button>
                                    <button className="w-[54px] h-[20px] border-[1px] border-[#FF0000] rounded-[4px] text-[10px] text-[#FF0000] font-500 flex justify-center items-center">
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-[20px] h-[20px] rounded-[4px] flex items-center justify-center"
                                        style={{
                                            backgroundColor: expense.category.color,
                                        }}
                                    ></div>
                                    <span className="text-[14px] font-[500]">{expense.category.label}</span>
                                </div>
                                <span className="text-[16px] font-[600]">{expense.amount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[14px] font-[500] text-[#7B7B7A]">Quantity: {expense.quantity}</span>
                                <span className="text-[14px] font-[500] text-[#7B7B7A]">{expense.date}</span>
                            </div>
                            <div className="flex justify-end mt-2">
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
                        </div>
                    ))}
                </div>

                {/* expenses rows */}
                <div className="hidden md:block">
                    {currentExpenses.map((expense, idx) => (
                        <div
                            key={expense.name + startIdx + idx}
                            className="grid grid-cols-9 text-[15px] font-[500] px-10 h-[100px] border-b-[1.5px] border-[#00000033] items-center"
                        >
                            <div className="flex flex-row gap-5 col-span-2">
                                <input
                                    type="checkbox"
                                    className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                                />
                                <h1>{expense.name}</h1>
                            </div>
                            <div className={`col-span-2`}>
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
                            <div className="">{expense.quantity}</div>
                            <div>{expense.amount}</div>
                            <div>{expense.date}</div>
                            <div>
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
                            <div className="flex flex-row justify-center items-center gap-2">
                                <div className="w-[54px] h-[20px] border-[1px] border-[#0955AC] rounded-[4px] text-[10px] text-[#0955AC] font-500 flex justify-center items-center cursor-pointer">
                                    Edit
                                </div>
                                <div className="w-[54px] h-[20px] border-[1px] border-[#FF0000] rounded-[4px] text-[10px] text-[#FF0000] font-500 flex justify-center items-center cursor-pointer">
                                    Delete
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* end */}

                {/* Pagination Controls and Results per page inline */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-20">
                    {/* Left: Results per page */}
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
                    {/* Right: Pagination */}
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <span className="text-lg">&#60;</span>
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
                                            ? " text-[#0955AC] font-[600] border-[2px] border-[#0955AC]"
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
                            <span className="text-lg">&#62;</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpensesContent;
