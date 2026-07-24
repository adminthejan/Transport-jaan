import React, { useState, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { API_BASE_URL } from "../../../../../../../config/api";

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

import UserDropdown from "../../../UserDropdown";
import NotificationDropdown from "../../NotificationDropdown";

const PaymentContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const isVerified = user?.status === 'verified' || user?.status === 'Verified';
    const [warehouseNotifications, setWarehouseNotifications] = useState([]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    // State management
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        balance: { amount: '0', growth: 0, isPositive: true },
        income: { amount: '0', growth: 0, isPositive: true },
        expenses: { amount: '0', growth: 0, isPositive: false }
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const perPageOptions = [5, 10, 20, 50];

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!auth?.user) return;

            try {
                const response = await fetch(`${API_BASE_URL}vendors/warehouse/notifications/data`);
                if (response.ok) {
                    const data = await response.json();
                    setWarehouseNotifications(data.notifications || []);
                    setNotificationUnreadCount(data.unread_count || 0);
                }
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
            }
        };

        if (auth?.user) {
            fetchNotifications();
            // Refresh notifications every 30 seconds
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [auth?.user]);

    // Fetch payment statistics
    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/payment-stats`);
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching payment stats:', error);
        }
    };

    // Fetch payment transactions
    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                per_page: itemsPerPage,
                ...(searchQuery && { search: searchQuery }),
                ...(statusFilter && { status: statusFilter }),
                ...(dateFilter && { date: dateFilter })
            });

            const response = await fetch(`${API_BASE_URL}vendors/warehouse/api/payment-transactions?${params}`);
            const data = await response.json();

            if (data.success) {
                setTransactions(data.data);
                setTotalPages(data.pagination.last_page);
                setTotalRecords(data.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial load and when filters change
    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [currentPage, itemsPerPage, searchQuery, statusFilter, dateFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) {
                fetchTransactions();
            } else {
                setCurrentPage(1);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const startIdx = (currentPage - 1) * itemsPerPage;
    const currentTransactions = transactions;

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

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
    };

    const handleDateChange = (e) => {
        setDateFilter(e.target.value);
        setCurrentPage(1);
    };

    const downloadTableAsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Recent Transactions", 14, 20);

        const tableData = transactions.map((txn) => [
            txn.id,
            txn.client,
            txn.warehouse,
            txn.ratePerDay,
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
                    "Warehouse / Unit",
                    "Rate Per Day",
                    "Days",
                    "Amount",
                    "Due Date",
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
                2: { cellWidth: 40 },
                3: { cellWidth: 25 },
                4: { cellWidth: 15 },
                5: { cellWidth: 25 },
                6: { cellWidth: 25 },
                7: { cellWidth: 20 },
            },
        });

        doc.save("warehouse-transactions.pdf");
    };

    return (
        <div className="flex flex-col gap-10 w-full h-auto  lg:pr-5 lg:pl-5 pt-6 pb-12">
            {/* Header section */}
            <div className="flex lg:flex-row flex-col gap-5 justify-between items-center md:gap-3 mt-10 lg:mt-0">
                <h1 className="figtree md:text-[35px] font-[700] text-[24px]">Warehouse Payment</h1>
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
                {/* <div className="hidden lg:flex items-center gap-3">
                    <NotificationDropdown
                        notifications={warehouseNotifications}
                        unreadCount={notificationUnreadCount}
                    />
                    <UserDropdown settingsRoute={route("warehouse.settingsPage")} />
                </div> */}
            </div>
            {/* end of header section */}

            {/* mini 4 cards */}
            <div className="flex xl:flex-row flex-col gap-5 w-full">
                {/* card 1 - Balance */}
                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{
                        boxShadow: "4px 4px 4px #0000001A",
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
                            <h1 className="text-[20px] font-[700]">LKR {stats.balance.amount}</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div
                            className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${stats.balance.isPositive ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'
                                }`}
                        >
                            <img
                                src={upArrow}
                                className={`size-[19px] ${!stats.balance.isPositive ? 'rotate-180' : ''}`}
                            />
                            <h1>{stats.balance.isPositive ? '+' : ''}{stats.balance.growth}%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
                {/* end of card 1 */}

                {/* card 2 - Income */}
                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{
                        boxShadow: "4px 4px 4px #0000001A",
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
                            <h1 className="text-[20px] font-[700]">LKR {stats.income.amount}</h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div
                            className={`w-[81px] h-[26px] rounded-[5px] flex flex-row justify-center items-center ${stats.income.isPositive ? 'bg-[#D8E4F2]' : 'bg-[#FF888880]'
                                }`}
                        >
                            <img
                                src={upArrow}
                                className={`size-[19px] ${!stats.income.isPositive ? 'rotate-180' : ''}`}
                            />
                            <h1>{stats.income.isPositive ? '+' : ''}{stats.income.growth}%</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from last week</h1>
                    </div>
                </div>
                {/* end of card 2 */}

                <div className="flex flex-row gap-5 w-full">
                    {/* card 3 - Expenses */}
                    <div
                        className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                        style={{
                            boxShadow: "4px 4px 4px #0000001A",
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
                                    LKR {stats.expenses.amount}
                                </h1>
                                {/* <h1 className="text-[26px] font-[700]">LKR {stats.balance.amount}</h1> */}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                            <div className="w-[81px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                                <img
                                    src={upArrow}
                                    className={`size-[19px] ${!stats.balance.isPositive ? 'rotate-180' : ''}`}
                                />
                                <h1>{stats.balance.isPositive ? '+' : ''}{stats.balance.growth}%</h1>
                            </div>
                            <h1 className="text-[#7B7B7A]">fromz last week</h1>
                        </div>
                    </div>
                    {/* end of card 3 */}
                </div>
            </div>

            <div
                className="w-full max-w-full h-auto bg-[#FFFFFF] rounded-[10px] py-10 px-5 sm:px-10"
                style={{
                    boxShadow: "4px 4px 4px #0000001A",
                }}
            >
                {/* card header */}
                <div className="flex xl:flex-row flex-col justify-between gap-4">
                    <h1 className="text-[24px] font-[700] md:text-[18px]">
                        Recent Transactions
                    </h1>
                    <div className="flex lg:flex-row flex-col gap-5 lg:gap-2">
                        <div className="xl:w-[253px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5 md:w-full md:h-[32px] md:px-3">
                            <img src={miniSearchIcon} className="md:w-4 md:h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] md:text-[12px] md:placeholder:text-[12px]"
                                placeholder="Search client, warehouse, etc."
                            />
                        </div>
                        <div className="xl:w-[125px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5 md:flex-1 md:h-[32px] md:px-3">
                            <img src={filterIcon} className="size-[12px] md:w-3 md:h-3" />
                            <select
                                value={statusFilter}
                                onChange={handleStatusChange}
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-[14px] md:text-[12px]"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <img src={miniDownArrow} className="md:w-3 md:h-3" />
                        </div>
                        <div className="xl:w-[139px] xl:h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5 md:flex-1 md:h-[32px] md:px-3">
                            <img src={calendar} className="size-[17px] md:w-4 md:h-4" />
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={handleDateChange}
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC] text-[12px] md:text-[11px]"
                            />
                        </div>
                        <button
                            onClick={downloadTableAsPDF}
                            disabled={loading || transactions.length === 0}
                            className="xl:w-[125px] xl:h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed md:flex-1 md:h-[32px] md:text-[12px] md:gap-2 px-4 py-2"
                        >
                            <img src={downloadLogo} className="md:w-4 md:h-4" />
                            <h1>Download</h1>
                        </button>
                    </div>
                </div>
                {/* end */}

                {/* expenses table */}
                {/* table headings */}
                <div className="figtree xl:grid grid-cols-9 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-10 mt-10 hidden">
                    <div className="flex flex-row gap-3 items-center">
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
                        <h1>Invoice Id</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Client Name</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Warehouse / Unit</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center ml-5">
                        <h1>Rate Per Day</h1>
                        <div className="flex flex-col justify-center items-center">
                            <img src={miniUp} className="w-[6px] h-[4px]" />
                            <img src={miniDown} className="w-[6px] h-[4px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center ml-10">
                        <h1>Days</h1>
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
                        <h1>Due Date</h1>
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

                {loading ? (
                    <div className="flex justify-center items-center h-[400px]">
                        <div className="text-center">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0955AC] border-r-transparent"></div>
                            <p className="mt-4 text-[#7B7B7A]">Loading transactions...</p>
                        </div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex justify-center items-center h-[400px]">
                        <div className="text-center">
                            <p className="text-[#7B7B7A] text-[18px]">No transactions found</p>
                            <p className="text-[#7B7B7A] text-[14px] mt-2">Try adjusting your filters</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop table view */}
                        <div className="hidden xl:block">
                            {currentTransactions.map((txn, idx) => (
                                <div
                                    key={txn.id ?? idx}
                                    className="grid grid-cols-9 items-center min-w-[250px] w-full min-h-[70px] bg-[#FFFFFF] rounded-[8px] gap-2 px-5 py-2 mb-2"
                                    style={{
                                        boxShadow: "4px 4px 4px #0000001A",
                                    }}
                                >
                                    <div className="flex flex-row gap-3 items-center">
                                        <input
                                            type="checkbox"
                                            className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                                            checked={selectedRows.has(startIdx + idx)}
                                            onChange={() => handleRowSelection(idx)}
                                        />
                                        <span className="font-[600]">{txn.id}</span>
                                    </div>
                                    <div>{txn.client}</div>
                                    <div>{txn.warehouse}</div>
                                    <div className="ml-5">{txn.ratePerDay}</div>
                                    <div className="ml-10">{txn.days}</div>
                                    <div className="font-[600]">{txn.amount}</div>
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
                                        <button
                                            type="button"
                                            onClick={() => router.visit("/warehouse/bookings")}
                                            className="w-[54px] h-[20px] border-[1px] border-[#0955AC] rounded-[4px] text-[10px] text-[#0955AC] font-500 flex justify-center items-center cursor-pointer"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Mobile/Tablet card view */}
                        <div className="xl:hidden block mt-4">
                            {currentTransactions.map((txn, idx) => (
                                <div
                                    key={startIdx + idx}
                                    className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm"
                                    style={{
                                        backgroundColor: selectedRows.has(startIdx + idx)
                                            ? "#CCCCCC4F"
                                            : "white",
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="size-[16px] rounded-[4px] bg-[#CCCCCC73]"
                                                checked={selectedRows.has(startIdx + idx)}
                                                onChange={() => handleRowSelection(idx)}
                                            />
                                            <span className="text-[12px] font-[600] text-[#7B7B7A]">Invoice: {txn.id}</span>
                                        </div>
                                        <div
                                            className="px-2 py-1 text-[9px] font-[700] rounded-[4px]"
                                            style={{
                                                border: `1px solid ${txn.statusColor}`,
                                                background: txn.statusBg,
                                                color: txn.statusColor,
                                            }}
                                        >
                                            {txn.status}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-[12px]">
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Client:</span>
                                            <span className="font-[600]">{txn.client}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Warehouse:</span>
                                            <span className="font-[600]">{txn.warehouse}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Rate/Day:</span>
                                            <span className="font-[600]">{txn.ratePerDay}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Days:</span>
                                            <span className="font-[600]">{txn.days}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Amount:</span>
                                            <span className="font-[700] text-[14px]">{txn.amount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#7B7B7A] font-[500]">Due Date:</span>
                                            <span className="font-[600]">{txn.dueDate}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button className="flex-1 h-[28px] border-[1px] border-[#0955AC] rounded-[4px] text-[11px] text-[#0955AC] font-[500]">
                                            Edit
                                        </button>
                                        <button className="flex-1 h-[28px] border-[1px] border-[#FF0000] rounded-[4px] text-[11px] text-[#FF0000] font-[500]">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {/* Pagination Controls and Results per page inline */}
                <div className="flex md:flex-row justify-between items-center gap-2 mt-20 md:mt-6 flex-col md:gap-4">
                    {/* Left: Results per page */}
                    <div className="flex items-center md:w-full">
                        <span className="mr-3 text-[#00000080] text-[15px] md:text-[12px]">
                            Results per page
                        </span>
                        <select
                            className="rounded px-3 py-1 font-[600] text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[71px] h-[40px] focus:outline-none md:w-[60px] md:h-[35px] md:text-[14px]"
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
                    <div className="flex items-center gap-2 md:w-full md:justify-end">
                        <button
                            className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 md:size-[35px] md:text-[14px]"
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <span className="text-lg md:text-base">&#60;</span>
                        </button>
                        {getPageNumbers().map((num, idx) =>
                            num === "..." ? (
                                <span key={idx} className="px-2 md:px-1 md:text-[14px]">
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={num}
                                    className={`px-3 py-1 text-[16px] font-[600] rounded-[4px] size-[40px] bg-[#F4F3F3] md:size-[35px] md:text-[14px] ${currentPage === num
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
                            className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 md:size-[35px] md:text-[14px]"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <span className="text-lg md:text-base">&#62;</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentContent;