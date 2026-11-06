// resources/js/Pages/Web/components/vendors/units/UnitContent.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { router, usePage, Link } from "@inertiajs/react";

/* ────────────────────────────────── ICONS & ASSETS ────────────────────────────────── */
import bell from "../../../assets/vendors/dashboard/bell.svg";
import proPic from "../../../assets/vendors/dashboard/proPic.svg";
import logOutLogo from "../../../assets/vendors/dashboard/logOutLogo.svg"; // ← Logout icon

import filterIcon from "../../../assets/vendors/dashboard/icons/filterIcon.svg";
import miniSearchIcon from "../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";

import car1 from "../../../assets/vendors/dashboard/icons/car1.svg";
import availableIcon from "../../../assets/vendors/units/availableIcon.svg";

import icon1 from "../../../assets/vendors/units/icons/icon1.svg"; // mileage
import icon2 from "../../../assets/vendors/units/icons/icon2.svg"; // transmission
import icon3 from "../../../assets/vendors/units/icons/icon3.svg"; // capacity
import icon4 from "../../../assets/vendors/units/icons/icon4.svg"; // fuel

import editIcon from "../../../assets/vendors/units/edit.svg";
import deleteIcon from "../../../assets/vendors/units/delete.svg";

import { ChevronDown } from "lucide-react";

import UserDropdown from "../../../components/vendors/UserDropdown.jsx";

/* ────────────────────────────── HELPERS & CONSTANTS ────────────────────────────── */
const nbsp = (s) => (typeof s === "string" ? s.replace(/ /g, "\u00A0") : s);

const ROUTES = {
    overlaps: (id, start, end) =>
        `/vendor/vehicles/${id}/bookings/overlaps?${new URLSearchParams({
            start,
            end,
        }).toString()}`,
    maintenanceCreate: (id) => `/vendor/vehicles/${id}/maintenance`,
    maintenanceNotify: () => `/vendor/vehicles/maintenance/notify`,
};

const getCsrf = () =>
    document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") ||
    window.Laravel?.csrfToken ||
    "";

/* ────────────────────────────────── UI COMPONENTS ────────────────────────────────── */
const ViewButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="figtree w-[140px] h-[40px] bg-[#0A55AC] hover:bg-[#0a4b97] rounded-[6px] text-[16px] text-white font-[700] flex items-center justify-center shrink-0"
    >
        View
    </button>
);

const ActionButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="figtree h-[40px] px-3 bg-white border border-[#0A55AC] text-[#0A55AC] hover:bg-[#0a4b970D] rounded-[6px] text-[16px] font-[700] flex items-center gap-2 shrink-0"
        title="Actions"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
        >
            <path
                d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" strokeWidth="2" />
        </svg>
        Action
    </button>
);

const Spec = ({ icon, label, alt }) => (
    <div className="flex flex-col items-center justify-center w-[100px] sm:w-[120px] min-w-[80px] text-center gap-1.5">
        <img src={icon} className="w-[22px] h-[22px]" alt={alt || "spec"} />
        <span className="text-[13px] font-[600] leading-tight whitespace-nowrap">
            {label ?? "-"}
        </span>
    </div>
);

/* ────────────────────────────── MAINTENANCE MODAL ────────────────────────────── */
const MaintenanceActionModal = ({
    open,
    unit,
    onClose,
    onMaintenanceSaved,
}) => {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("Scheduled maintenance");
    const [checking, setChecking] = useState(false);
    const [creating, setCreating] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [overlaps, setOverlaps] = useState([]);
    const [error, setError] = useState("");
    const [okMsg, setOkMsg] = useState("");

    useEffect(() => {
        if (!open) return;
        setStartDate("");
        setEndDate("");
        setReason("Scheduled maintenance");
        setOverlaps([]);
        setError("");
        setOkMsg("");
        // Ensure scrolling is disabled on body when modal is open
        document.documentElement.classList.add("overflow-hidden");
        document.body.classList.add("overflow-hidden");
        return () => {
            document.documentElement.classList.remove("overflow-hidden");
            document.body.classList.remove("overflow-hidden");
        };
    }, [open]);

    const today = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    if (!open || !unit) return null;

    const validate = () => {
        if (!startDate || !endDate)
            return "Please select both start and end dates.";
        if (endDate < startDate) return "End date cannot be before start date.";
        return "";
    };

    const doCheckOverlaps = async () => {
        setError("");
        setOkMsg("");
        const v = validate();
        if (v) {
            setError(v);
            return;
        }
        setChecking(true);
        try {
            const res = await fetch(
                ROUTES.overlaps(unit.id, startDate, endDate),
                { credentials: "same-origin" }
            );
            if (!res.ok) throw new Error(`Overlap check failed: ${res.status}`);
            const json = await res.json();
            setOverlaps(Array.isArray(json) ? json : json.data || []);
            setOkMsg("Checked availability.");
        } catch (e) {
            setError(e.message || "Failed to check bookings.");
        } finally {
            setChecking(false);
        }
    };

    const doCreateMaintenance = async () => {
        setError("");
        setOkMsg("");
        const v = validate();
        if (v) {
            setError(v);
            return;
        }
        setCreating(true);
        try {
            const csrf = getCsrf();
            const res = await fetch(ROUTES.maintenanceCreate(unit.id), {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    start_date: startDate,
                    end_date: endDate,
                    reason,
                }),
            });
            if (!res.ok) throw new Error(`Save failed: ${res.status}`);
            setOkMsg("Maintenance window saved.");
            onMaintenanceSaved?.();
        } catch (e) {
            setError(e.message || "Failed to save maintenance window.");
        } finally {
            setCreating(false);
        }
    };

    const doNotifyClients = async () => {
        setError("");
        setOkMsg("");
        if (!overlaps.length) {
            setError("There are no overlapping bookings to notify.");
            return;
        }
        setNotifying(true);
        try {
            const csrf = getCsrf();
            const bookingIds = overlaps.map((b) => b.id).filter(Boolean);
            const res = await fetch(ROUTES.maintenanceNotify(), {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vehicle_id: unit.id,
                    start_date: startDate,
                    end_date: endDate,
                    reason,
                    booking_ids: bookingIds,
                }),
            });
            if (!res.ok) throw new Error(`Email send failed: ${res.status}`);
            setOkMsg("Email sent to affected client(s).");
        } catch (e) {
            setError(e.message || "Failed to send email notifications.");
        } finally {
            setNotifying(false);
        }
    };

    return (
        // Added p-4 for padding on small viewports
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            {/* Removed mx-4 since p-4 is in parent, max-w-2xl handles width */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        Action – Maintenance for{" "}
                        <span className="text-[#0955AC]">
                            {unit.brand} {unit.model}
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100"
                        title="Close"
                        aria-label="Close"
                    >
                        X
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Responsive Grid: 1 column on mobile, 3 columns on medium screens and up */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start date
                            </label>
                            <input
                                type="date"
                                min={today}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End date
                            </label>
                            <input
                                type="date"
                                min={startDate || today}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Scheduled maintenance"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Action Buttons: Used flex-wrap for responsiveness */}
                    <div className="flex flex-wrap gap-3 pt-1">
                        <button
                            onClick={doCheckOverlaps}
                            disabled={checking}
                            className={`px-4 py-2 rounded-lg border border-gray-300 font-semibold ${
                                checking
                                    ? "opacity-70 cursor-not-allowed"
                                    : "hover:bg-gray-50"
                            }`}
                        >
                            {checking ? "Checking…" : "Check Bookings"}
                        </button>
                        <button
                            onClick={doCreateMaintenance}
                            disabled={creating}
                            className={`px-4 py-2 rounded-lg bg-[#0955AC] text-white font-semibold ${
                                creating
                                    ? "opacity-70 cursor-not-allowed"
                                    : "hover:bg-[#0a4b97]"
                            }`}
                        >
                            {creating ? "Saving…" : "Save Maintenance"}
                        </button>
                        <button
                            onClick={doNotifyClients}
                            disabled={notifying || !overlaps.length}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                                overlaps.length
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-200 text-gray-600 cursor-not-allowed"
                            }`}
                            title={
                                overlaps.length
                                    ? "Send email to affected client(s)"
                                    : "No overlapping bookings"
                            }
                        >
                            {notifying
                                ? "Sending Emails…"
                                : `Notify Client${
                                      overlaps.length > 1 ? "s" : ""
                                  } (${overlaps.length})`}
                        </button>
                    </div>

                    {(error || okMsg) && (
                        <div
                            className={`${
                                error
                                    ? "text-red-700 bg-red-50 border-red-200"
                                    : "text-green-700 bg-green-50 border-green-200"
                            } border rounded-lg px-3 py-2 text-sm`}
                        >
                            {error || okMsg}
                        </div>
                    )}

                    <div className="mt-2">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">
                            Overlapping bookings
                        </h3>
                        {overlaps.length === 0 ? (
                            <p className="text-sm text-gray-600">
                                None detected for the selected dates.
                            </p>
                        ) : (
                            // Key Responsive Fix: Added overflow-x-auto to contain the table on small screens
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left text-gray-700">
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                Booking #
                                            </th>
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                Client
                                            </th>
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                Email
                                            </th>
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                Phone
                                            </th>
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                From
                                            </th>
                                            <th className="px-3 py-2 font-semibold whitespace-nowrap">
                                                To
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overlaps.map((b) => (
                                            <tr
                                                key={b.id}
                                                className="border-t border-gray-200"
                                            >
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.reference || b.id}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.client?.name || "-"}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.client?.email || "-"}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.client?.phone || "-"}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.start_date}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {b.end_date}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ────────────────────────────────── MAIN COMPONENT ────────────────────────────────── */
const UnitContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const perPageOptions = [5, 10, 20, 50];

    const [loading, setLoading] = useState(false);
    const [unitsPage, setUnitsPage] = useState({
        data: [],
        current_page: 1,
        last_page: 1,
        links: [],
        total: 0,
    });

    // Delete Confirm
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    // Action Modal
    const [actionUnit, setActionUnit] = useState(null);

    // USER DROPDOWN (Bookings-style) - Logic is kept but not used here, assuming UserDropdown handles it
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setShowUserDropdown(false);
            }
        };
        const handleEsc = (e) => {
            if (e.key === "Escape") setShowUserDropdown(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, []);

    /* ────────────── FETCH UNITS ────────────── */
    const fetchUnits = async (url = null) => {
        setLoading(true);
        try {
            const endpoint =
                url ??
                `/vendor/vehicles/list?${new URLSearchParams({
                    search: searchTerm || "",
                    status: status || "",
                    category: category || "",
                    per_page: String(itemsPerPage || 10),
                    page: String(unitsPage.current_page || 1),
                }).toString()}`;

            const res = await fetch(endpoint, { credentials: "same-origin" });
            if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
            const json = await res.json();

            setUnitsPage({
                data: json.data ?? [],
                current_page: json.current_page ?? json.meta?.current_page ?? 1,
                last_page: json.last_page ?? json.meta?.last_page ?? 1,
                links: json.links ?? [],
                total: json.total ?? json.meta?.total ?? json.data?.length ?? 0,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search term update might be beneficial here for performance
        const timeoutId = setTimeout(() => {
            fetchUnits();
        }, 300); // Wait 300ms after search term stops changing
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, status, category, itemsPerPage, unitsPage.current_page]);

    const handleAddUnitClick = () => router.visit('/vendors/addUnit');

    const goToLink = (link) => {
        if (link?.url && !link.active) {
            fetchUnits(link.url);
            try {
                const u = new URL(link.url, window.location.origin);
                const p = Number(u.searchParams.get("page") || "1");
                setUnitsPage((prev) => ({ ...prev, current_page: p }));
            } catch {}
        }
    };

    const goPrev = () => {
        if (unitsPage.current_page > 1)
            setUnitsPage((p) => ({ ...p, current_page: p.current_page - 1 }));
    };
    const goNext = () => {
        if (unitsPage.current_page < unitsPage.last_page)
            setUnitsPage((p) => ({ ...p, current_page: p.current_page + 1 }));
    };

    const onPerPageChange = (n) => {
        setItemsPerPage(n);
        setUnitsPage((p) => ({ ...p, current_page: 1 }));
    };
    const onStatusChange = (val) => {
        setStatus(val);
        setUnitsPage((p) => ({ ...p, current_page: 1 }));
    };
    const onCategoryChange = (val) => {
        setCategory(val);
        setUnitsPage((p) => ({ ...p, current_page: 1 }));
    };
    const onSearchEnter = (e) => {
        if (e.key === "Enter") {
            setUnitsPage((p) => ({ ...p, current_page: 1 }));
            fetchUnits();
        }
    };

    /* ────────────── DELETE FLOW ────────────── */
    const requestDelete = (id) => {
        setPendingDeleteId(id);
        setConfirmOpen(true);
    };
    const confirmDelete = () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setConfirmOpen(false);
        setPendingDeleteId(null);

        setUnitsPage((prev) => ({
            ...prev,
            data: prev.data.filter((u) => u.id !== id),
            total: Math.max(0, (prev.total || 1) - 1),
        }));

        const csrf = getCsrf();
        router.delete(`/vendor/vehicles/${id}`, {
            preserveScroll: true,
            headers: csrf ? { "X-CSRF-TOKEN": csrf } : {},
            onError: (errors) => {
                console.error("Delete failed", errors);
                fetchUnits();
                alert("Failed to delete the unit.");
            },
        });
    };
    const cancelDelete = () => {
        setConfirmOpen(false);
        setPendingDeleteId(null);
    };

    const viewDetails = (unit) =>
        router.visit(`/vendors/unitDetails/${unit.id}`);
    const editUnit = (unit) => router.visit(`/vendors/addUnit/${unit.id}`);

    return (
        <div className="flex flex-col gap-6 w-full h-auto px-4 sm:px-6 lg:px-8 xl:pr-8 xl:pl-6 pt-6 pb-12">
            {/* ==================== HEADER WITH DROPDOWN (Fully Responsive) ==================== */}
            <div className="flex flex-col md:flex-row justify-between lg:items-start items-center gap-4 sm:gap-6 mb-2">
                {/* Title */}
                <h1 className="figtree text-[28px] leading-tight sm:text-[35px] font-[700] text-gray-900">
                    Vehicle Rental Units
                </h1>

            </div>

            {/* ==================== SEARCH / FILTERS (Responsive Layout) ==================== */}
            <div className="mt-2 mb-2">
                <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-full min-w-40 sm:w-[240px] h-[34px] bg-[#F3F3F3] rounded-[6px] flex items-center py-1 px-3">
                            <img
                                src={miniSearchIcon}
                                alt="Search"
                                className="mr-2"
                            />
                            <input
                                type="text"
                                className="w-full bg-transparent text-[13px] placeholder:text-[#7B7BACC] border-0 outline-none ring-0 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none"
                                placeholder="Search brand, model…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={onSearchEnter}
                            />
                        </div>

                        {/* Category Select */}
                        <div className="w-[170px] h-[34px] bg-[#F3F3F3] rounded-[6px] flex items-center py-1 px-2 shrink-0">
                            <img
                                src={filterIcon}
                                className="size-[12px] mr-2"
                                alt="Filter"
                            />
                            <select
                                className="w-full bg-transparent text-[13px] font-[500] text-[#7B7BACC] appearance-none border-0 outline-none ring-0 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none"
                                value={category}
                                onChange={(e) =>
                                    onCategoryChange(e.target.value)
                                }
                            >
                                <option value="">Category</option>
                                <option value="Land">Land</option>
                                <option value="Air">Air</option>
                                <option value="Sea">Sea</option>
                            </select>
                        </div>

                        {/* Status Select */}
                        <div className="w-[170px] h-[34px] bg-[#F3F3F3] rounded-[6px] flex items-center py-1 px-2 shrink-0">
                            <img
                                src={filterIcon}
                                className="size-[12px] mr-2"
                                alt="Filter"
                            />
                            <select
                                className="w-full bg-transparent text-[13px] font-[500] text-[#7B7BACC] appearance-none border-0 outline-none ring-0 focus:border-transparent focus:outline-none focus:ring-0 focus-visible:outline-none"
                                value={status}
                                onChange={(e) => onStatusChange(e.target.value)}
                            >
                                <option value="">Status</option>
                                <option value="Available">Available</option>
                                <option value="Pending">Pending</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="w-[120px] h-[34px] bg-[#0955AC] text-[13px] rounded-[6px] text-white font-[700] shrink-0"
                        onClick={handleAddUnitClick}
                    >
                        Add Unit
                    </button>
                </div>
            </div>

            {/* ==================== BODY ==================== */}
            <>
                    {loading && (
                        <div className="text-sm text-gray-600 my-3">
                            Loading units…
                        </div>
                    )}
                    {!loading && unitsPage.data.length === 0 && (
                        <div className="text-sm text-gray-600 my-3">
                            No units found. Try adjusting your filters.
                        </div>
                    )}

                    {unitsPage.data.map((unit) => (
                        <div
                            key={unit.id}
                            className="relative w-full bg-white rounded-[10px] my-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden"
                        >
                            <div className="flex flex-col lg:flex-row items-stretch">
                                {/* Image container */}
                                <div className="shrink-0 w-full h-[190px] lg:w-[250px] lg:h-[190px] self-stretch bg-[#F3F3F3]">
                                    <img
                                        src={unit.image || car1}
                                        alt="Vehicle"
                                        className="block w-full h-full object-contain"
                                        loading="lazy"
                                        onError={(e) => {
                                            if (e.currentTarget.src !== car1) {
                                                e.currentTarget.src = car1;
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex-1 px-4 sm:px-6 py-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="bebas-neue text-[28px] leading-7">
                                                <span className="truncate block">
                                                    {unit.brand}{" "}
                                                    <span className="text-[#0955AC]">
                                                        {unit.model}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="bebas-neue text-[24px] leading-6">
                                                $
                                                {Number(
                                                    unit.price ?? 0
                                                ).toFixed(0)}
                                                <span className="figtree text-[#00000080] text-[14px] font-[600]">
                                                    /day
                                                </span>
                                            </div>
                                            <div className="poppins flex items-center gap-2 mt-1 text-[13px] font-[600]">
                                                <img
                                                    src={availableIcon}
                                                    className="w-[16px] h-[16px]"
                                                    alt="Status"
                                                />
                                                <span
                                                    className={
                                                        unit.status ===
                                                        "Available"
                                                            ? "text-[#3C9A34]"
                                                            : unit.status ===
                                                              "Pending"
                                                            ? "text-[#D97706]"
                                                            : "text-[#6B7280]"
                                                    }
                                                >
                                                    {unit.status || "—"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <ViewButton
                                                onClick={() =>
                                                    viewDetails(unit)
                                                }
                                            />
                                            <ActionButton
                                                onClick={() =>
                                                    setActionUnit(unit)
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-start items-center gap-x-6 gap-y-3">
                                        <Spec
                                            icon={icon1}
                                            alt="Mileage"
                                            label={unit.mileage ?? "-"}
                                        />
                                        <Spec
                                            icon={icon2}
                                            alt="Transmission"
                                            label={unit.transmission ?? "-"}
                                        />
                                        <Spec
                                            icon={icon3}
                                            alt="Capacity"
                                            label={
                                                unit.capacity
                                                    ? nbsp(unit.capacity)
                                                    : "-"
                                            }
                                        />
                                        <Spec
                                            icon={icon4}
                                            alt="Fuel"
                                            label={
                                                unit.fuel_type ??
                                                unit.fuelType ??
                                                "-"
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="w-full lg:w-[130px] bg-[#D8E4F2] py-4 px-6 lg:px-0 flex flex-row lg:flex-col justify-center items-center gap-4">
                                    <button
                                        type="button"
                                        className="size-[40px] border-[1.5px] border-[#0955AC] bg-[#D8E4F2] rounded-[6px] flex justify-center items-center"
                                        onClick={() => editUnit(unit)}
                                        aria-label="Edit"
                                    >
                                        <img
                                            src={editIcon}
                                            className="size-[22px]"
                                            alt=""
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        className="size-[40px] border-[1.5px] border-[#FF0000] bg-[#D8E4F2] rounded-[6px] flex justify-center items-center"
                                        onClick={() => requestDelete(unit.id)}
                                        aria-label="Delete"
                                    >
                                        <img
                                            src={deleteIcon}
                                            className="size-[22px]"
                                            alt=""
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex flex-wrap justify-between items-center gap-4 mt-12">
                        <div className="flex items-center">
                            <span className="mr-3 text-[#00000080] text-[14px] whitespace-nowrap">
                                Results per page
                            </span>
                            <select
                                className="rounded px-3 py-1 font-[600] text-[15px] bg-[#F4F3F3] outline-none border-0 ring-0 focus:outline-none focus:ring-0"
                                value={itemsPerPage}
                                onChange={(e) =>
                                    onPerPageChange(Number(e.target.value))
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
                                onClick={goPrev}
                                disabled={unitsPage.current_page <= 1}
                            >
                                <span className="text-lg">&lt;</span>
                            </button>

                            {unitsPage.links
                                ?.filter(
                                    (l) =>
                                        ![
                                            "&laquo; Previous",
                                            "Next &raquo;",
                                        ].includes(l.label)
                                )
                                .map((l, idx) => (
                                    <button
                                        key={idx}
                                        className={`px-3 py-1 text-[15px] font-[600] rounded-[4px] size-[40px] bg-[#F4F3F3] ${
                                            l.active
                                                ? "text-[#0955AC] border-[2px] border-[#0955AC]"
                                                : ""
                                        }`}
                                        onClick={() => goToLink(l)}
                                        disabled={!l.url}
                                        dangerouslySetInnerHTML={{
                                            __html: l.label,
                                        }}
                                    />
                                ))}

                            <button
                                className="px-3 py-1 size-[40px] rounded-[4px] bg-[#F4F3F3] disabled:opacity-50"
                                onClick={goNext}
                                disabled={
                                    unitsPage.current_page >=
                                    unitsPage.last_page
                                }
                            >
                                <span className="text-lg">&gt;</span>
                            </button>
                        </div>
                    </div>
                </>

            {/* Action Modal */}
            <MaintenanceActionModal
                open={!!actionUnit}
                unit={actionUnit}
                onClose={() => setActionUnit(null)}
                onMaintenanceSaved={() => {
                    // Refresh data after successful maintenance save
                    fetchUnits();
                    setActionUnit(null);
                }}
            />
        </div>
    );
};

export default UnitContent;
