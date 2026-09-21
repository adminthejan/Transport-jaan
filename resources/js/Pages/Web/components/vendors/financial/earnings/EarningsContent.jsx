import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";

import wallet from "../../../../assets/financial/expenses/wallet.svg";
import income from "../../../../assets/financial/expenses/income.svg";
import expenses from "../../../../assets/financial/expenses/expenses.svg";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniUp from "../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../assets/vendors/dashboard/icons/miniDown.svg";

const statusStyles = {
    Paid: { color: "#3B8F31", bg: "#ACE199" },
    Pending: { color: "#F0BB0D", bg: "#FFCD294D" },
    Failed: { color: "#FF6060", bg: "#FF60608C" },
};

const EarningsContent = () => {
    const {
        earnings: propsEarnings,
        stats,
        monthlyEarnings = [],
        server_error,
    } = usePage().props;

    const [earnings] = useState(propsEarnings || []);
    const [searchTerm, setSearchTerm] = useState("");

    const filtered = earnings.filter(
        (e) =>
            e.bookingRef?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.bookingType?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const perPageOptions = [5, 10, 20, 50];
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const currentRows = filtered.slice(startIdx, endIdx);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm]);

    const goToPage = (p) => {
        if (p < 1 || p > totalPages) return;
        setCurrentPage(p);
    };

    return (
        <div className="flex flex-col gap-10 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-5 justify-between items-center">
                <h1 className="figtree text-[20px] md:text-[35px] font-[700] text-center">
                    Earnings &amp; Payouts
                </h1>
            </div>

            {server_error && (
                <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-5 py-3 text-[14px]">
                    {server_error}
                </div>
            )}

            <p className="text-[13px] text-[#7B7B7A] -mt-6">
                Your share of the platform commission on confirmed bookings. Amounts marked{" "}
                <span className="font-[600] text-[#FF6060]">Failed</span> were reversed because the
                related booking was later cancelled.
            </p>

            {/* Mini cards */}
            <div className="flex flex-col md:flex-row gap-5 w-full">
                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={wallet} alt="wallet" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">Total Earned</h1>
                            <h1 className="text-[20px] font-[700]">
                                ${(stats?.total_earned ?? 0).toFixed(2)}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[100px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
                            <h1>{stats?.paid_count || 0} Bookings</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">paid out to you</h1>
                    </div>
                </div>

                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={income} alt="pending" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">Pending</h1>
                            <h1 className="text-[20px] font-[700]">
                                ${(stats?.total_pending ?? 0).toFixed(2)}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[100px] h-[26px] bg-[#FFCD294D] rounded-[5px] flex flex-row justify-center items-center">
                            <h1>{stats?.pending_count || 0} Bookings</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">awaiting payout</h1>
                    </div>
                </div>

                <div
                    className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
                    style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                    <div className="flex flex-row gap-5 justify-center items-center">
                        <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
                            <img src={expenses} alt="reversed" />
                        </div>
                        <div>
                            <h1 className="text-[14px] font-[500] text-[#7B7B7A]">Reversed</h1>
                            <h1 className="text-[20px] font-[700]">
                                ${(stats?.total_reversed ?? 0).toFixed(2)}
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
                        <div className="w-[100px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
                            <h1>{stats?.reversed_count || 0} Bookings</h1>
                        </div>
                        <h1 className="text-[#7B7B7A]">from cancellations</h1>
                    </div>
                </div>
            </div>

            {/* Monthly earnings chart (simple bars) */}
            <div
                className="w-full bg-[#FFFFFF] rounded-[10px] px-6 sm:px-10 py-8"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
            >
                <h1 className="text-[18px] font-[700] mb-6">Monthly Earnings (last 6 months)</h1>
                <div className="flex items-end gap-4 h-[160px]">
                    {(() => {
                        const max = Math.max(1, ...monthlyEarnings.map((m) => m.amount));
                        return monthlyEarnings.map((m, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full max-w-[40px] bg-[#0955AC] rounded-t-[4px]"
                                    style={{ height: `${Math.max(4, (m.amount / max) * 130)}px` }}
                                    title={`$${m.amount.toFixed(2)}`}
                                />
                                <span className="text-[11px] text-[#7B7B7A]">{m.month}</span>
                            </div>
                        ));
                    })()}
                </div>
            </div>

            {/* Table */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-5">
                <h1 className="text-[24px] font-[700]">Commission History</h1>
                <div className="w-full md:w-[280px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
                    <img src={miniSearchIcon} alt="search" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                        placeholder="Search booking ref / type..."
                    />
                </div>
            </div>

            <div
                className="hidden md:block w-full h-auto bg-[#FFFFFF] rounded-[10px] px-10 py-10"
                style={{ boxShadow: "4px 4px 4px #0000001A" }}
            >
                <div className="figtree grid grid-cols-7 bg-[#D8E4F2] h-[42px] items-center rounded-[8px] text-[14px] font-[600] px-10">
                    {["Booking", "Type", "Booking Amount", "Commission %", "Your Share", "Date", "Status"].map(
                        (label) => (
                            <div key={label} className="flex flex-row gap-2 items-center">
                                <h1>{label}</h1>
                                <div className="flex flex-col justify-center items-center">
                                    <img src={miniUp} className="w-[6px] h-[4px]" alt="up" />
                                    <img src={miniDown} className="w-[6px] h-[4px]" alt="down" />
                                </div>
                            </div>
                        )
                    )}
                </div>

                {currentRows.length === 0 && (
                    <div className="py-16 text-center text-[#7B7B7A] text-[14px]">
                        No commission records yet. They appear here once one of your bookings is confirmed.
                    </div>
                )}

                {currentRows.map((e) => {
                    const style = statusStyles[e.status] || { color: "#7B7B7A", bg: "#E8E8EF" };
                    return (
                        <div
                            key={e.id}
                            className="grid grid-cols-7 h-[70px] items-center text-[14px] font-[500] px-10 border-b-[1.5px] border-[#00000033]"
                        >
                            <div>{e.bookingRef}</div>
                            <div>{e.bookingType}</div>
                            <div>${e.bookingAmount.toFixed(2)}</div>
                            <div>{e.commissionPercentage}%</div>
                            <div className="font-[700]">${e.vendorAmount.toFixed(2)}</div>
                            <div>{e.paidAt ?? e.createdAt}</div>
                            <div>
                                <div
                                    className="w-[72px] h-[20px] text-[10px] font-[700] rounded-[4px] flex justify-center items-center"
                                    style={{ border: `1px solid ${style.color}`, background: style.bg, color: style.color }}
                                >
                                    {e.status}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
                {currentRows.map((e) => {
                    const style = statusStyles[e.status] || { color: "#7B7B7A", bg: "#E8E8EF" };
                    return (
                        <div
                            key={e.id}
                            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-[700] text-[#0955AC]">{e.bookingRef}</div>
                                <div
                                    className="px-3 py-1 rounded-[4px] text-[11px] font-[700]"
                                    style={{ background: style.bg, color: style.color }}
                                >
                                    {e.status}
                                </div>
                            </div>
                            <div className="text-[13px] text-[#7B7B7A]">{e.bookingType} vehicle</div>
                            <div className="flex justify-between mt-2 text-[13px]">
                                <span>Booking amount</span>
                                <span className="font-[600]">${e.bookingAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-[13px]">
                                <span>Your share ({e.commissionPercentage}% commission)</span>
                                <span className="font-[700]">${e.vendorAmount.toFixed(2)}</span>
                            </div>
                            <div className="text-[11px] text-[#7B7B7A] mt-1">{e.paidAt ?? e.createdAt}</div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-10">
                    <div className="flex items-center">
                        <span className="mr-3 text-[#00000080] text-[15px]">Results per page</span>
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
                        <span className="text-[14px] font-[600]">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <span className="text-lg">&gt;</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EarningsContent;
