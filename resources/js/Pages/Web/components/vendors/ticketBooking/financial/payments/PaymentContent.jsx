import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import wallet from "../../../../../assets/financial/expenses/wallet.svg";
import income from "../../../../../assets/financial/expenses/income.svg";
import expenses from "../../../../../assets/financial/expenses/expenses.svg";
import filterIcon from "../../../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniDownArrow from "../../../../../assets/vendors/dashboard/icons/miniDownArrow.svg";
import downloadLogo from "../../../../../assets/financial/expenses/download.svg";
import miniUp from "../../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../../assets/vendors/dashboard/icons/miniDown.svg";
import upArrow from "../../../../../assets/vendors/dashboard/icons/upArrow.svg";

const PAYMENT_STATUS_STYLES = {
  Paid: { color: "#50AE31", bg: "#6DB4464D" },
  Pending: { color: "#F0BB0D", bg: "#FFCD294D" },
  Failed: { color: "#FF0000", bg: "#FF00004D" },
  Refunded: { color: "#7B7B7A", bg: "#CCCCCC4D" },
};

const getPaymentStatusStyle = (status) =>
  PAYMENT_STATUS_STYLES[status] || { color: "#7B7B7A", bg: "#CCCCCC4D" };

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `Rs. ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const PaymentContent = () => {
  const {
    auth,
    transactions: propsTransactions,
    stats,
    server_error,
  } = usePage().props;
  const user = auth?.user;

  const transactions = useMemo(() => propsTransactions || [], [propsTransactions]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return transactions.filter((txn) => {
      const matchesSearch =
        !term ||
        txn.id?.toLowerCase().includes(term) ||
        txn.clientName?.toLowerCase().includes(term) ||
        txn.unitName?.toLowerCase().includes(term) ||
        txn.route?.toLowerCase().includes(term);
      const matchesStatus =
        !statusFilter || txn.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const perPageOptions = [5, 10, 20, 50];
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
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

  const downloadTableAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Recent Transactions", 14, 20);

    const tableData = filteredTransactions.map((txn) => [
      txn.id,
      txn.bookingType === "train" ? "Train" : "Bus",
      txn.clientName,
      txn.unitName,
      txn.route,
      formatDate(txn.travelDate),
      formatCurrency(txn.amount),
      txn.status,
      txn.paymentStatus,
    ]);

    autoTable(doc, {
      head: [
        [
          "Invoice Id",
          "Type",
          "Client Name",
          "Unit",
          "Route",
          "Travel Date",
          "Amount",
          "Status",
          "Payment",
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
        fontSize: 9,
        textColor: [0, 0, 0],
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
    });

    doc.save("ticket-booking-transactions.pdf");
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, statusFilter]);

  return (
    <div className="flex flex-col gap-10 w-full h-auto px-5 py-10 mt-5 xl:mt-0 pt-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row gap-5 justify-between items-center">
        <h1 className="figtree text-[35px] font-[700]">
          Ticket Booking Payment
        </h1>
      </div>

      {server_error && (
        <div className="w-full rounded-[10px] border border-[#FF0000] bg-[#FF00000D] px-5 py-4 text-[14px] font-[600] text-[#FF0000]">
          {server_error}
        </div>
      )}

      {/* mini 3 cards */}
      <div className="flex flex-col md:flex-row gap-5 w-full">
        {/* card 1 */}
        <div
          className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
          style={{ boxShadow: "4px 4px 4px #0000001A" }}
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
                {formatCurrency(stats?.total_revenue)}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
            <div className="w-[81px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
              <img src={upArrow} className="size-[19px]" alt="up" />
              <h1>Paid</h1>
            </div>
            <h1 className="text-[#7B7B7A]">all-time paid revenue</h1>
          </div>
        </div>

        {/* card 2 */}
        <div
          className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
          style={{ boxShadow: "4px 4px 4px #0000001A" }}
        >
          <div className="flex flex-row gap-5 justify-center items-center">
            <div className="size-[40px] xl:size-[50px] bg-[#D8E4F2] rounded-full flex justify-center items-center">
              <img src={income} alt="income" />
            </div>
            <div>
              <h1 className="text-[14px] font-[500] text-[#7B7B7A]">
                Paid Bookings
              </h1>
              <h1 className="text-[20px] font-[700]">
                {stats?.paid_count ?? 0}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
            <div className="w-[100px] h-[26px] bg-[#D8E4F2] rounded-[5px] flex flex-row justify-center items-center">
              <h1>{stats?.paid_count ?? 0} Payments</h1>
            </div>
            <h1 className="text-[#7B7B7A]">paid transactions</h1>
          </div>
        </div>

        {/* card 3 */}
        <div
          className="w-full xl:min-h-[91px] bg-[#FFFFFF] rounded-[8px] flex justify-between items-center gap-2 px-5 py-2"
          style={{ boxShadow: "4px 4px 4px #0000001A" }}
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
                {formatCurrency(stats?.total_pending)}
              </h1>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end text-[12px] font-[500]">
            <div className="w-[100px] h-[26px] bg-[#FF888880] rounded-[5px] flex flex-row justify-center items-center">
              <h1>{stats?.pending_count ?? 0} Payments</h1>
            </div>
            <h1 className="text-[#7B7B7A]">awaiting payment</h1>
          </div>
        </div>
      </div>

      <div
        className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-5 lg:px-10 py-10"
        style={{
          boxShadow: "4px 4px 4px #0000001A",
        }}
      >
        {/* card header */}
        <div className="flex flex-col lg:flex-row justify-between gap-5">
          <h1 className="text-[24px] font-[700]">Recent Transactions</h1>
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
              <img src={miniSearchIcon} alt="Search" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                placeholder="Search client name, unit, route..."
              />
            </div>
            <div className="w-full lg:w-[150px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row items-center justify-between py-2 px-5">
              <img src={filterIcon} className="size-[12px]" alt="Filter" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none text-[14px]"
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
              <img src={miniDownArrow} alt="Dropdown" />
            </div>
            <button
              onClick={downloadTableAsPDF}
              className="w-full lg:w-[125px] h-[35px] bg-[#0955AC] text-[14px] rounded-[6px] text-[#FFFFFF] font-[700] flex justify-center items-center gap-3"
            >
              <img src={downloadLogo} alt="Download" />
              <h1>Download</h1>
            </button>
          </div>
        </div>
        {/* end header */}

        {/* DESKTOP/TABLET TABLE */}
        <div className="hidden md:block overflow-x-auto">
          {/* table headings */}
          <div className="figtree grid grid-cols-8 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-5 lg:px-10 mt-10 min-w-[1000px]">
            <div className="flex flex-row gap-3 items-center">
              <input
                type="checkbox"
                className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                checked={
                  selectedRows.size === currentTransactions.length &&
                  currentTransactions.length > 0
                }
                onChange={handleSelectAll}
              />
              <h1>Invoice Id</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Client Name</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Unit</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Route</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Travel Date</h1>
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
              <h1>Status</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
            <div className="flex flex-row gap-2 items-center">
              <h1>Payment</h1>
              <div className="flex flex-col justify-center items-center">
                <img src={miniUp} className="w-[6px] h-[4px]" alt="Up" />
                <img src={miniDown} className="w-[6px] h-[4px]" alt="Down" />
              </div>
            </div>
          </div>

          {currentTransactions.map((txn, idx) => {
            const paymentStyle = getPaymentStatusStyle(txn.paymentStatus);
            return (
              <div
                key={txn.rawId ? `${txn.bookingType}-${txn.rawId}` : startIdx + idx}
                className="grid grid-cols-8 h-[100px] justify-center items-center text-[14px] font-[500] px-5 lg:px-10 border-b-[1.5px] border-[#00000033] min-w-[1000px]"
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
                  <div className="flex flex-col">
                    <h1>{txn.id}</h1>
                    <span className="text-[11px] text-[#7B7B7A] capitalize">
                      {txn.bookingType}
                    </span>
                  </div>
                </div>
                <div className="truncate">{txn.clientName}</div>
                <div className="flex flex-col">
                  <span className="truncate">{txn.unitName}</span>
                  <span className="text-[11px] text-[#7B7B7A]">{txn.unitNumber}</span>
                </div>
                <div className="truncate">{txn.route}</div>
                <div>{formatDate(txn.travelDate)}</div>
                <div>{formatCurrency(txn.amount)}</div>
                <div className="text-[13px]">{txn.status}</div>
                <div>
                  <div
                    className="w-[72px] h-[20px] text-[10px] font-[700] rounded-[4px] flex justify-center items-center"
                    style={{
                      border: `1px solid ${paymentStyle.color}`,
                      background: paymentStyle.bg,
                      color: paymentStyle.color,
                    }}
                  >
                    {txn.paymentStatus}
                  </div>
                </div>
              </div>
            );
          })}

          {currentTransactions.length === 0 && (
            <div className="flex justify-center items-center py-16 text-[#00000080] text-[14px] font-[600]">
              No transactions found.
            </div>
          )}
        </div>

        {/* MOBILE VIEW – cards, no horizontal scroll */}
        <div className="md:hidden mt-6 space-y-4">
          {currentTransactions.map((txn, idx) => {
            const globalIndex = startIdx + idx;
            const isSelected = selectedRows.has(globalIndex);
            const paymentStyle = getPaymentStatusStyle(txn.paymentStatus);

            return (
              <div
                key={txn.rawId ? `${txn.bookingType}-${txn.rawId}-mobile` : globalIndex}
                className="w-full rounded-[10px] border border-[#00000026] bg-white p-4"
                style={{
                  backgroundColor: isSelected ? "#CCCCCC4F" : "white",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-[20px] rounded-[4px] bg-[#CCCCCC73]"
                      checked={isSelected}
                      onChange={() => handleRowSelection(idx)}
                    />
                    <div>
                      <span className="block text-[12px] font-[600] text-[#00000080]">
                        Invoice Id
                      </span>
                      <span className="text-[14px] font-[600]">
                        {txn.id}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#7B7B7A] capitalize">
                    {txn.bookingType}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Client Name
                  </span>
                  <span className="text-[13px]">{txn.clientName}</span>
                </div>

                <div className="mb-2">
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Unit
                  </span>
                  <span className="text-[13px]">{txn.unitName} ({txn.unitNumber})</span>
                </div>

                <div className="mb-2">
                  <span className="block text-[12px] font-[600] text-[#00000080]">
                    Route
                  </span>
                  <span className="text-[13px]">{txn.route}</span>
                </div>

                <div className="flex justify-between gap-4 mb-2">
                  <div>
                    <span className="block text-[12px] font-[600] text-[#00000080]">
                      Amount
                    </span>
                    <span className="text-[13px]">{formatCurrency(txn.amount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[12px] font-[600] text-[#00000080]">
                      Travel Date
                    </span>
                    <span className="text-[13px]">{formatDate(txn.travelDate)}</span>
                  </div>
                </div>

                <div className="flex justify-between gap-4">
                  <div>
                    <span className="block text-[12px] font-[600] text-[#00000080] mb-1">
                      Status
                    </span>
                    <span className="text-[13px]">{txn.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[12px] font-[600] text-[#00000080] mb-1">
                      Payment
                    </span>
                    <div
                      className="inline-flex px-2 py-[2px] rounded-[4px] text-[11px] font-[700]"
                      style={{
                        border: `1px solid ${paymentStyle.color}`,
                        background: paymentStyle.bg,
                        color: paymentStyle.color,
                      }}
                    >
                      {txn.paymentStatus}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {currentTransactions.length === 0 && (
            <div className="flex justify-center items-center py-10 text-[#00000080] text-[14px] font-[600]">
              No transactions found.
            </div>
          )}
        </div>

        {/* Pagination Controls and Results per page inline */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-2 mt-20">
          {/* Left: Results per page */}
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
          {/* Right: Pagination */}
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
              <span className="text-lg">&gt;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentContent;
