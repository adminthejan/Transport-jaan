import React, { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";



const FlightBookingTable = ({ bookings }) => {
    const tableData = bookings || [];
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalPages = Math.max(1, Math.ceil(tableData.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRows = tableData.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [bookings]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value, 10));
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 4) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (currentPage <= 2) {
            return [1, 2, 3, 4];
        }

        if (currentPage >= totalPages - 1) {
            return [totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    };

    if (tableData.length === 0) {
        return (
            <div className="py-10 w-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-lg font-medium">No bookings found</p>
                <p className="text-sm">Try adjusting your filters</p>
            </div>
        );
    }
    return (
        <div className="py-10 w-full">
            {/* DESKTOP/TABLET TABLE (keeps your original layout) */}
            <div className="hidden md:block overflow-auto">
                {/* table headings */}
                <div className="grid grid-cols-8 bg-[#D8E4F2] min-h-[48px] items-center rounded-[8px] text-[12px] font-[600] px-12 py-3 gap-x-6">
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Booking ID</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Booking Date</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Client Name</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Unit (Type & No.)</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Route</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Travel Date & Seats</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center ml-10">
                        <h1>Payment Status</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 items-center">
                        <h1>Status</h1>
                        <div className="flex flex-col justify-center items-center">
                            <ArrowUp className="w-[6px] h-[10px]" />
                            <ArrowDown className="w-[6px] h-[10px]" />
                        </div>
                    </div>
                </div>

                <div>
                    {paginatedRows.map((row, index) => (
                        <div
                            key={index}
                            className="hidden md:grid grid-cols-8 border-b-[1.5px] border-[#00000033] min-h-[110px] items-center text-[13px] font-[500] px-12 py-4 gap-x-6"
                        >
                            <div>{row.id}</div>
                            <div>{row.date}</div>
                            <div>{row.customer}</div>
                            <div className="flex flex-col gap-2">
                                <h1>{row.unitName}</h1>
                                <div className="p-2 rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] flex justify-center items-center text-[#00000099] text-[11px]">
                                    {row.unitLabel}
                                </div>
                            </div>
                            <div>{row.route}</div>
                            <div className="text-[14px] font-[500] text-[#939392] space-y-2">
                                <div className="flex flex-row gap-2 justify-start items-center">
                                    <h1>Date</h1>
                                    <div className="p-1 border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[8px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                        {row.travelDate}
                                    </div>
                                </div>
                                <div className="flex flex-row gap-4 justify-start items-center">
                                    <h1>Seats</h1>
                                    <div className="p-1 border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[8px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                        {row.seatsLabel}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center items-center gap-2">
                                <h1>{row.price}</h1>
                                <div
                                    className="w-[66px] h-[19px] rounded-[4px] text-[10px] text-[#00000099] font-[500] flex justify-center items-center"
                                    style={{
                                        border: `0.5px solid ${row.paymentColor}`,
                                        backgroundColor: row.paymentBg,
                                    }}
                                >
                                    {row.paymentStatus}
                                </div>
                            </div>
                            <div
                                className="w-[75px] h-[19px] rounded-[4px] flex justify-center items-center text-[10px] font-[700]"
                                style={{
                                    backgroundColor: row.statusBg,
                                    border: `1px solid ${row.statusBorder}`,
                                    color: row.statusText,
                                }}
                            >
                                {row.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MOBILE VIEW: no side scroll, data stacked nicely */}
            <div className="md:hidden space-y-4">
                {paginatedRows.map((row, index) => (
                    <div
                        key={index}
                        className="border border-[#00000033] rounded-[8px] p-4 text-[14px] font-[500] space-y-2 bg-white"
                    >
                        <div className="flex justify-between">
                            <span className="font-[600]">Booking ID</span>
                            <span className="text-gray-600">{row.id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-[600]">Booking Date</span>
                            <span className="text-gray-600">{row.date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-[600]">Client</span>
                            <span className="text-gray-600">{row.customer}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="font-[600]">Unit</span>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-600">{row.unitName}</span>
                                <div className="w-[140px] h-[22px] rounded-[4px] bg-[#D9D9D957] border-[1.5px] border-[#0000004D] flex justify-center items-center text-[#00000099] text-[13px]">
                                    {row.unitLabel}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-[600]">Route</span>
                            <span className="text-gray-600">{row.route}</span>
                        </div>
                        <div className="space-y-1 text-[#939392]">
                            <div className="flex justify-between items-center">
                                <span className="font-[600] text-black">Travel Date</span>
                                <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                    {row.travelDate}
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-[600] text-black">Seats</span>
                                <div className="w-[90px] h-[19px] border-[0.5px] bg-[#D9D9D957] border-[#0000004D] text-[10px] font-[500] text-[#00000099] flex justify-center items-center rounded-[4px]">
                                    {row.seatsLabel}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-[600]">Price</span>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-gray-600">{row.price}</span>
                                <div
                                    className="w-[66px] h-[19px] rounded-[4px] text-[10px] text-[#00000099] font-[500] flex justify-center items-center"
                                    style={{
                                        border: `0.5px solid ${row.paymentColor}`,
                                        backgroundColor: row.paymentBg,
                                    }}
                                >
                                    {row.paymentStatus}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-[600]">Status</span>
                            <div
                                className="w-[75px] h-[19px] rounded-[4px] flex justify-center items-center text-[10px] font-[700]"
                                style={{
                                    backgroundColor: row.statusBg,
                                    border: `1px solid ${row.statusBorder}`,
                                    color: row.statusText,
                                }}
                            >
                                {row.status}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-8 py-4">
                <div className="flex items-center">
                    <span className="mr-3 text-[#00000080] text-[14px] sm:text-[15px]">
                        Results per page
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="rounded px-3 py-1 font-[600] text-[14px] sm:text-[16px] bg-[#F4F3F3] border-[1px] border-[#BEBEBE] w-[80px] h-[36px] focus:outline-none"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-lg">&#60;</span>
                    </button>

                    {getPageNumbers().map((pageNumber) => (
                        <button
                            key={pageNumber}
                            className={`px-3 py-1 text-[14px] sm:text-[16px] font-[600] rounded-[4px] size-[36px] bg-[#F4F3F3] ${
                                currentPage === pageNumber
                                    ? "text-[#0955AC] border-[2px] border-[#0955AC]"
                                    : "text-black"
                            }`}
                            onClick={() => goToPage(pageNumber)}
                        >
                            {pageNumber}
                        </button>
                    ))}

                    <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 size-[36px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-lg">&#62;</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlightBookingTable;
