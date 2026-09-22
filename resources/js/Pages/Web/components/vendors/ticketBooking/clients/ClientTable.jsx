import React, { useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import miniUp from "../../../../assets/vendors/dashboard/icons/miniUp.svg";
import miniDown from "../../../../assets/vendors/dashboard/icons/miniDown.svg";
import proPic from "../../../../assets/vendors/clients/proPic.svg";

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

const ClientTable = () => {
  const { clients: propsClients } = usePage().props;
  const clients = useMemo(() => propsClients || [], [propsClients]);

  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      return (
        (client.name || "").toLowerCase().includes(term) ||
        (client.email || "").toLowerCase().includes(term) ||
        (client.phone || "").toLowerCase().includes(term)
      );
    });
  }, [clients, searchTerm]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const perPageOptions = [5, 10, 20, 50];
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const currentClients = filteredClients.slice(startIdx, endIdx);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Helper for pagination numbers with ellipsis
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm]);

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-5">
        <div className="flex flex-row gap-5 justify-center items-center w-full lg:w-auto">
          <div className="w-full lg:w-[253px] h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5">
            <img src={miniSearchIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
              placeholder="Search client name, email or phone"
            />
          </div>
        </div>
        <div className="text-[14px] font-[600] text-[#00000080] w-full lg:w-auto text-center lg:text-right">
          {filteredClients.length} client{filteredClients.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* DESKTOP/TABLET TABLE */}
      <div className="hidden md:block overflow-x-auto">
        {/* table headings */}
        <div className="figtree grid grid-cols-6 bg-[#D8E4F2] h-[42px] justify-center items-center rounded-[8px] text-[14px] font-[600] px-5 lg:px-10 mt-10 min-w-[800px]">
          <div className="flex flex-row gap-2 items-center col-span-2">
            <h1>Client Name</h1>
            <div className="flex flex-col justify-center items-center">
              <img src={miniUp} className="w-[6px] h-[4px]" />
              <img src={miniDown} className="w-[6px] h-[4px]" />
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <h1>Contact No</h1>
            <div className="flex flex-col justify-center items-center">
              <img src={miniUp} className="w-[6px] h-[4px]" />
              <img src={miniDown} className="w-[6px] h-[4px]" />
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center justify-center">
            <h1>Bookings</h1>
            <div className="flex flex-col justify-center items-center">
              <img src={miniUp} className="w-[6px] h-[4px]" />
              <img src={miniDown} className="w-[6px] h-[4px]" />
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center justify-center">
            <h1>Total Spent</h1>
            <div className="flex flex-col justify-center items-center">
              <img src={miniUp} className="w-[6px] h-[4px]" />
              <img src={miniDown} className="w-[6px] h-[4px]" />
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center justify-center">
            <h1>Last Booking</h1>
            <div className="flex flex-col justify-center items-center">
              <img src={miniUp} className="w-[6px] h-[4px]" />
              <img src={miniDown} className="w-[6px] h-[4px]" />
            </div>
          </div>
        </div>

        {/* table rows */}
        {currentClients.map((client, idx) => (
          <div
            key={`${client.email || client.name}-${idx}`}
            className="figtree grid grid-cols-6 h-[100px] border-b-[1.5px] border-[#00000033] px-5 lg:px-10 items-center text-[14px] font-[500] min-w-[800px]"
          >
            <div className="flex flex-row col-span-2 items-center gap-3 truncate">
              <img src={proPic} className="size-[50px]" />
              <div className="flex flex-col gap-1">
                <h1 className="text-[15px]">{client.name || "—"}</h1>
                <h1 className="text-[#616161] text-[12px]">
                  {client.email || "—"}
                </h1>
              </div>
            </div>
            <div>{client.phone || "—"}</div>
            <div className="text-center">{client.bookings_count ?? 0}</div>
            <div className="text-center">{formatCurrency(client.total_spent)}</div>
            <div className="text-center">{formatDate(client.last_booking_date)}</div>
          </div>
        ))}

        {currentClients.length === 0 && (
          <div className="flex justify-center items-center py-16 text-[#00000080] text-[14px] font-[600]">
            No clients found.
          </div>
        )}
      </div>

      {/* MOBILE VIEW – cards, no horizontal scroll */}
      <div className="md:hidden mt-8 space-y-4">
        {currentClients.map((client, idx) => (
          <div
            key={`${client.email || client.name}-mobile-${idx}`}
            className="w-full rounded-[10px] border border-[#00000026] bg-white p-4 figtree"
          >
            {/* Top row: avatar + name/email */}
            <div className="flex items-center gap-3 mb-3">
              <img src={proPic} className="w-[48px] h-[48px]" />
              <div className="flex flex-col">
                <span className="text-[15px] font-[600]">{client.name || "—"}</span>
                <span className="text-[12px] text-[#616161] w-[160px] truncate">
                  {client.email || "—"}
                </span>
              </div>
            </div>

            <div className="mb-2">
              <span className="block text-[12px] font-[600] text-[#00000080]">
                Contact No
              </span>
              <span className="text-[13px]">{client.phone || "—"}</span>
            </div>

            <div className="flex justify-between gap-4 mb-2">
              <div>
                <span className="block text-[12px] font-[600] text-[#00000080]">
                  Bookings
                </span>
                <span className="text-[13px]">{client.bookings_count ?? 0}</span>
              </div>
              <div className="text-right">
                <span className="block text-[12px] font-[600] text-[#00000080]">
                  Total Spent
                </span>
                <span className="text-[13px]">{formatCurrency(client.total_spent)}</span>
              </div>
            </div>

            <div>
              <span className="block text-[12px] font-[600] text-[#00000080]">
                Last Booking
              </span>
              <span className="text-[13px]">{formatDate(client.last_booking_date)}</span>
            </div>
          </div>
        ))}

        {currentClients.length === 0 && (
          <div className="flex justify-center items-center py-10 text-[#00000080] text-[14px] font-[600]">
            No clients found.
          </div>
        )}
      </div>

      {/* Pagination Controls and Results per page */}
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
  );
};

export default ClientTable;
