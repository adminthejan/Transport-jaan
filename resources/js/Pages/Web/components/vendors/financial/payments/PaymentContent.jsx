// resources/js/Pages/Web/components/vendors/payments/PaymentContent.jsx
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

import NotificationDropdown from "../../NotificationDropdown";
import UserDropdown from "../../UserDropdown";
import MobilePaymentCards from "./MobilePaymentCards";

const PaymentContent = () => {
    const {
        auth,
        transactions: propsTransactions,
        stats,
        monthlyRevenue,
        unreadNotifications = 0,
    } = usePage().props;
    const user = auth?.user;

    // Use actual transactions from backend or fallback to empty array
    const [transactions] = useState(propsTransactions || []);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter transactions based on search
    const filteredTransactions = transactions.filter(
        (txn) =>
            txn.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.car?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const perPageOptions = [5, 10, 20, 50];
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const currentTransactions = filteredTransactions.slice(startIdx, endIdx);

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

    const handleRowSelection = (rowIndex) => {
        const actualIndex = startIdx + rowIndex;
        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.has(actualIndex)) {
            newSelectedRows.delete(actualIndex);
        } else {
            newSelectedRows.add(actualIndex);
        }
        setSelectedRows(newSelectedRows);
    };

    const handleSelectAll = () => {
        if (selectedRows.size === currentTransactions.length) {
            setSelectedRows(new Set());
        } else {
            const allCurrentIndices = currentTransactions.map(
                (_, index) => startIdx + index
            );
            setSelectedRows(new Set(allCurrentIndices));
        }
    };

    const handleEdit = (txn) => {
        // TODO: Implement edit functionality
        console.log("Edit transaction:", txn);
    };

    const handleDelete = (id) => {
        // TODO: Implement delete functionality
        console.log("Delete transaction:", id);
    };

    const downloadTableAsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Recent Transactions", 14, 20);

        const tableData = filteredTransactions.map((txn) => [
            txn.id,
            txn.client,
            txn.car,
            txn.rentPerDay,
            txn.days,
            txn.amount,
            txn.dueDate,
            txn.status,
        ]);

        autoTable(doc, {
            head: [
                [
                    "Invoice Id",
                    "Client Name",
                    "Car Model",
                    "Rent Per Day",
                    "Days",
                    "Amount",
                    "DueDate",
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
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 30 },
                3: { cellWidth: 25 },
                4: { cellWidth: 15 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 },
                7: { cellWidth: 20 },
            },
        });

        doc.save("transactions.pdf");
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm]);

    return (
        <div className="flex flex-col gap-10 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* ==================== HEADER WITH DROPDOWN ==================== */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[20px] md:text-[35px] font-[700] text-center">Vehicle Rental Payments</h1>

                {/* <div className="flex flex-row gap-5 relative items-center">
                    <div className="flex flex-row gap-5 relative items-center">
                    <UserDropdown settingsRoute={route("settingsPage")} />
                </div>
                </div> */}
            </div>

            {/* ==================== PAYMENT SUMMARY ==================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 w-full -mb-5">
                {[
                    { label: "Total Booking Value", value: stats?.total_booking_value, tone: "#D8E4F2" },
                    { label: "Amount Collected", value: stats?.total_completed, tone: "#DDF3D3" },
                    { label: "Pending Payments", value: stats?.total_pending, tone: "#FFF0C2" },
                    { label: "Refunds", value: stats?.total_refunds, tone: "#FADADA" },
                    { label: "Platform Commission", value: stats?.platform_commission, tone: "#E9DDF8" },
                    { label: "Vendor Earnings", value: stats?.vendor_earnings, tone: "#D6EEF5" },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="bg-[#FFFFFF] rounded-[8px] px-5 py-4 flex items-center gap-4"
                        style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)", borderLeft: `6px solid ${card.tone}` }}
                    >
                        <div>
                            <h2 className="text-[14px] font-[500] text-[#7B7B7A]">{card.label}</h2>
                            <p className="text-[20px] font-[700]">${Number(card.value || 0).toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ==================== MINI CARDS ==================== */}
            <div className="flex flex-col md:flex-row gap-5 w-full">
                {/* card 1 */}
                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={wallet} alt="wallet" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Total Revenue
                            </h1>
                            <h1 className="text-[20px] font-[700]">
                                ${stats?.total_revenue?.toFixed(2) || "0.00"}
                            </h1>
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
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={income} alt="income" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Completed
                            </h1>
                            <h1 className="text-[20px] font-[700]">
                                ${stats?.total_completed?.toFixed(2) || "0.00"}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[100px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                            <h1>{stats?.completed_count || 0} Payments</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">paid transactions</h1>
                    </div>
                </div>

                {/* card 3 */}
                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={expenses} alt="expenses" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                                Pending
                            </h1>
                            <h1 className="text-[20px] font-[700]">
                                ${stats?.total_pending?.toFixed(2) || "0.00"}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[100px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                            <h1>{stats?.pending_count || 0} Payments</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">awaiting payment</h1>
                    </div>
                </div>
            </div>

            {/* ==================== MOBILE CARDS ==================== */}
            <MobilePaymentCards
                transactions={currentTransactions}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
            />

            {/* ==================== TABLE CARD ==================== */}
            {/* Card Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-5">
                <h1 className="text-[24px] font-[700]">
                    Recent Transactions
                </h1>
                <div className="flex flex-col md:flex-row gap-3 md:gap-5 w-full md:w-auto">
                    <div className="w-full md:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                        <img src={miniSearchIcon} alt="search" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                            placeholder="Search client name, car, invoice..."
                        />
                    </div>
                    <div className="w-full md:w-[125px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
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
                    <div className="w-full md:w-[139px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
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
                        className="w-full md:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3"
                    >
                        <img src={downloadLogo} alt="download" />
                        <h1>Download</h1>
                    </button>
                </div>
            </div>
            <div
                className="hidden md:block w-full h-auto bg-[#FFFFFF] rounded-[10px] px-10 py-10"
                style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}
            >

                {/* Table Headings */}
                <div className="figtree grid grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-10 mt-10">
                    {[
                        ["Invoice Id", true],
                        ["Client Name", false],
                        ["Car Model", false],
                        ["Rent Per Day", false],
                        ["Days", false],
                        ["Amount", false],
                        ["DueDate", false],
                        ["Status", false],
                        ["Action", false],
                    ].map(([label, hasCheckbox], idx) => (
                        <div
                            key={label}
                            className={`flex flex-row gap-2 items-center ${
                                idx === 3 ? "ml-5" : idx === 4 ? "ml-10" : ""
                            }`}
                        >
                            {hasCheckbox && (
                                <input
                                    type="checkbox"
                                    className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                                    checked={
                                        selectedRows.size ===
                                            currentTransactions.length &&
                                        currentTransactions.length > 0
                                    }
                                    onChange={handleSelectAll}
                                />
                            )}
                            <h1>{label}</h1>
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
                    ))}
                </div>

                {/* Table Rows */}
                {currentTransactions.map((txn, idx) => (
                    <div
                        key={startIdx + idx}
                        className="grid grid-cols-9 h-[100px] justify-center items-center text-[15px] font-[500] px-10 border-b-[1.5px] border-[#00000033]"
                        style={{
                            backgroundColor: selectedRows.has(startIdx + idx)
                                ? "#CCCCCC4F"
                                : "transparent",
                        }}
                    >
                        <div className="flex flex-row items-center gap-5">
                            <input
                                type="checkbox"
                                className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                                checked={selectedRows.has(startIdx + idx)}
                                onChange={() => handleRowSelection(idx)}
                            />
                            <h1>{txn.id}</h1>
                        </div>
                        <div>{txn.client}</div>
                        <div>{txn.car}</div>
                        <div className="ml-5">{txn.rentPerDay}</div>
                        <div className="ml-10">{txn.days}</div>
                        <div>{txn.amount}</div>
                        <div>{txn.dueDate}</div>
                        <div>
                            <div
                                className="w-[72px] h-[20px] text-[10px] font-[700] rounded-[4px] flex justify-center items-center"
                                style={{
                                    border: `1px solid ${txn.statusColor}`,
                                    background: txn.statusBg,
                                    color: txn.statusColor,
                                }}
                            >
                                {txn.status}
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

            {/* Pagination */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-20">
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
    );
};

export default PaymentContent;
