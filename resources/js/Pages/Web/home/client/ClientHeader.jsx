import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { router, usePage, Link } from "@inertiajs/react";
import { AnimatePresence } from "framer-motion";
import axios from "axios";
import { route } from "ziggy-js";
import ActionModalTemplate from "../../components/SuperAdmin/Common/ActionModalTemplate";
import proPic from "../../assets/header/profilePic.svg";
import bell from "../../assets/header/bell.svg";
import search from "../../assets/header/search.svg";
import {
    ArrowLeft,
    X,
    Search as SearchIcon,
    ChevronDown,
    Car,
    Ticket,
    Package,
    Warehouse,
    Truck,
    ClipboardList,
    Settings as SettingsIcon,
    Home,
    Info,
    LayoutGrid,
    Newspaper,
    Mail,
    LogOut,
    LogIn,
    UserPlus,
    Wallet,
    PackageSearch,
} from "lucide-react";
import CompanyLogo from "../../components/CompanyLogo";
import DashboardSearchModal from "@/Components/search/DashboardSearchModal";
import { buildClientDashboardSearchEntries } from "@/search/dashboardSearchCatalog";

const SidebarLink = ({ href, icon: Icon, label, active, onClick }) => (
    <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 h-11 px-3 rounded-[10px] text-[14px] font-[600] transition-colors ${
            active
                ? "bg-[#0955AC] text-white"
                : "text-gray-700 hover:bg-[#EEF3FA] hover:text-[#0955AC]"
        }`}
    >
        <Icon
            className={`w-[18px] h-[18px] shrink-0 ${
                active ? "text-white" : "text-[#0955AC]"
            }`}
        />
        <span className="truncate">{label}</span>
    </Link>
);

const SidebarAccordion = ({ icon: Icon, label, isOpen, onToggle, panelId, children }) => (
    <div>
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center gap-3 h-11 px-3 rounded-[10px] text-[14px] font-[600] transition-colors focus:outline-none ${
                isOpen
                    ? "bg-[#EEF3FA] text-[#0955AC]"
                    : "text-gray-700 hover:bg-[#EEF3FA] hover:text-[#0955AC]"
            }`}
            aria-expanded={isOpen}
            aria-controls={panelId}
        >
            <Icon className="w-[18px] h-[18px] shrink-0 text-[#0955AC]" />
            <span className="flex-1 text-left truncate">{label}</span>
            <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[#0955AC]" : ""
                }`}
            />
        </button>
        {isOpen && (
            <div
                id={panelId}
                className="mt-1 ml-[38px] pl-3 border-l-2 border-[#E3EBF5] flex flex-col gap-0.5 py-1"
            >
                {children}
            </div>
        )}
    </div>
);

const SidebarSubLink = ({ href, label, onClick }) => (
    <Link
        href={href}
        onClick={onClick}
        className="h-9 flex items-center px-2 rounded-[6px] text-[13px] font-[500] text-gray-600 hover:text-[#0955AC] hover:bg-[#F3F7FC] transition-colors"
    >
        {label}
    </Link>
);

const ClientHeader = () => {
    const { auth } = usePage().props;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [actionModalState, setActionModalState] = useState({ isOpen: false });
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [openDropdown, setOpenDropdown] = useState({
        vehicle: false,
        ticket: false,
        courier: false,
    });

    const clientSearchItems = useMemo(() => buildClientDashboardSearchEntries(), []);

    // ---------- Wallet balance ----------
    const [walletBalance, setWalletBalance] = useState(null);
    const [walletCurrency, setWalletCurrency] = useState("LKR");

    useEffect(() => {
        if (!auth?.user) return;
        let cancelled = false;
        axios
            .get(route("client.wallet.summary"))
            .then(({ data }) => {
                if (cancelled) return;
                setWalletBalance(Number(data?.balance ?? 0));
                setWalletCurrency(data?.currency || "LKR");
            })
            .catch(() => {
                if (!cancelled) setWalletBalance(null);
            });
        return () => {
            cancelled = true;
        };
    }, [auth?.user]);

    const toggleDropdown = (key) => {
        setOpenDropdown((prev) => ({
            vehicle: key === "vehicle" ? !prev.vehicle : false,
            ticket: key === "ticket" ? !prev.ticket : false,
            courier: key === "courier" ? !prev.courier : false,
        }));
    };

    // ---------- CSRF & Logout ----------
    const refreshCSRFToken = async () => {
        try {
            const response = await fetch("/csrf-token");
            const data = await response.json();
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) metaTag.setAttribute("content", data.token);
            return data.token;
        } catch (error) {
            console.error("Failed to refresh CSRF token:", error);
            return null;
        }
    };

    const handleOpenLogoutModal = (e) => {
        e.preventDefault();
        setIsProfileOpen(false);
        setIsMenuOpen(false);
        setActionModalState({ isOpen: true });
    };

    const closeActionModal = () => {
        setActionModalState({ isOpen: false });
    };

    const handleActionConfirm = () => {
        const attemptLogout = () => {
            router.post(
                route("logout"),
                {},
                {
                    onError: async (errors) => {
                        console.warn(
                            "POST logout failed, trying to refresh CSRF token...",
                            errors
                        );
                        if (
                            errors &&
                            (errors.message?.includes("CSRF") ||
                                errors.message?.includes("expired"))
                        ) {
                            const newToken = await refreshCSRFToken();
                            if (newToken) {
                                router.post(
                                    route("logout"),
                                    {},
                                    {
                                        onError: () =>
                                            (window.location.href =
                                                route("logout.alt")),
                                        onSuccess: () =>
                                            (window.location.href = "/"),
                                    }
                                );
                            } else {
                                window.location.href = route("logout.alt");
                            }
                        } else {
                            window.location.href = route("logout.alt");
                        }
                    },
                    onSuccess: () => (window.location.href = "/"),
                    onFinish: () => closeActionModal(),
                }
            );
        };
        attemptLogout();
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "";
    const isActivePath = (path) => currentPath === path;

    const initials = (auth?.user?.name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    // ---------- Smooth scroll ----------
    const handleScrollTo = (id) => {
        if (
            window.location.pathname === "/" ||
            window.location.pathname === "/home"
        ) {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: "smooth" });
                setIsMenuOpen(false);
            }
        } else {
            router.visit(`/#${id}`);
        }
    };

    // Auto-scroll when page loads with a hash
    useEffect(() => {
        const hash = window.location.hash.substring(1);
        if (
            hash &&
            ["home", "about", "services", "blog", "contact"].includes(hash)
        ) {
            setTimeout(() => {
                const el = document.getElementById(hash);
                if (el) el.scrollIntoView({ behavior: "smooth" });
            }, 300);
        }
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    return (
        <header className="relative z-50 w-full h-auto py-2 bg-white border-b border-black/[0.04]">
            <div className="poppins font-[500] px-4 sm:px-6 md:px-8 lg:px-10 min-h-[56px] sm:min-h-[68px] md:min-h-[80px] flex items-center justify-between">
                {/* Logo - cleanly aligned to the left */}
                <div
                    onClick={() => router.visit("/")}
                    className="flex items-center cursor-pointer transition-transform hover:scale-[1.02] shrink-0"
                >
                    <CompanyLogo className="h-[38px] sm:h-[48px] md:h-[60px] lg:h-[70px] object-contain" fallbackClassName="text-[18px] sm:text-[22px] md:text-[26px] font-[700] text-black" />
                </div>

                {/* Header Action Items */}
                <div className="flex items-center gap-2.5 sm:gap-3 md:gap-3.5 shrink-0">
                    {/* Search button */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="size-[34px] sm:size-[42px] md:size-[48px] rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] transition flex justify-center items-center"
                        title="Search dashboard (Cmd+K)"
                        aria-label="Search client dashboard"
                    >
                        <img
                            src={search}
                            className="size-[15px] sm:size-[18px] md:size-[20px]"
                            alt="Search"
                        />
                    </button>

                    {/* Hamburger menu */}
                    {!isMenuOpen && (
                        <button
                            onClick={toggleMenu}
                            className="size-[34px] sm:size-[42px] md:size-[48px] rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] text-[#000000] hover:text-[#0955AC] focus:outline-none flex justify-center items-center transition"
                            aria-label="Open menu"
                        >
                            <svg
                                className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Desktop-only action items */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            href="/track"
                            className="h-[48px] px-4 rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] transition flex items-center gap-2"
                            title="Track any order"
                        >
                            <PackageSearch className="w-[18px] h-[18px] text-[#0955AC]" />
                            <span className="text-[13px] font-[700] text-[#0955AC] whitespace-nowrap">Track</span>
                        </Link>
                        {auth?.user && (
                            <button
                                type="button"
                                onClick={() => router.visit(route("client.wallet.dashboard"))}
                                className="h-[48px] px-4 rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] transition flex items-center gap-2"
                                title="Wallet"
                                aria-label="Wallet balance"
                            >
                                <Wallet className="w-[18px] h-[18px] text-[#0955AC]" />
                                <span className="text-[13px] font-[700] text-[#0955AC] whitespace-nowrap">
                                    {walletBalance === null
                                        ? "Wallet"
                                        : `${walletCurrency} ${walletBalance.toLocaleString(undefined, {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                          })}`}
                                </span>
                            </button>
                        )}
                        <div className="size-[48px] rounded-full bg-[#E8EBEF] flex justify-center items-center">
                            <img
                                src={bell}
                                className="size-[20px]"
                                alt="Notifications"
                            />
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen((prev) => !prev)}
                                className="size-[48px] rounded-full overflow-hidden bg-[#E8EBEF] flex justify-center items-center focus:outline-none"
                            >
                                {auth?.user?.image ? (
                                    <img
                                        src={auth.user.image}
                                        className="size-[48px] object-cover"
                                        alt="Profile"
                                    />
                                ) : (
                                    <img
                                        src={proPic}
                                        className="size-[24px]"
                                        alt="Profile"
                                    />
                                )}
                            </button>

                            {isProfileOpen && (
                                <>
                                    {/* backdrop */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                                        {auth?.user && (
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{auth.user.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{auth.user.email}</p>
                                            </div>
                                        )}
                                        {window.location.pathname === "/clientDashboardSettings" ? (
                                            <Link
                                                href={route("clientAllBookings")}
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
                                            >
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                </svg>
                                                Dashboard
                                            </Link>
                                        ) : (
                                            <Link
                                                href="/clientDashboardSettings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                My Profile
                                            </Link>
                                        )}
                                        <button
                                            onClick={handleOpenLogoutModal}
                                            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Client dashboard sidebar */}
            {isMenuOpen && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] client-sidebar-backdrop"
                        onClick={toggleMenu}
                    />

                    <aside className="relative w-[340px] max-w-[88vw] h-full bg-white shadow-2xl flex flex-col client-sidebar-panel">
                        {/* Profile header */}
                        <div className="bg-gradient-to-br from-[#0955AC] to-[#073E82] px-6 pt-6 pb-8 relative shrink-0">
                            <div className="flex items-center justify-between mb-5">
                                <Link
                                    href={route("clientAllBookings")}
                                    onClick={toggleMenu}
                                    className="p-1.5 -ml-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                    title="Back to Dashboard"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Link>
                                <button
                                    onClick={toggleMenu}
                                    className="p-1.5 -mr-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                                    aria-label="Close menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center overflow-hidden shrink-0">
                                    {auth?.user?.image ? (
                                        <img
                                            src={auth.user.image}
                                            className="w-full h-full object-cover"
                                            alt="Profile"
                                        />
                                    ) : (
                                        <span className="text-white text-[17px] font-[700]">
                                            {initials}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-[700] text-[15px] truncate">
                                        {auth?.user?.name || "Guest"}
                                    </p>
                                    <p className="text-white/70 text-[12px] truncate">
                                        {auth?.user?.email || "Not signed in"}
                                    </p>
                                    {auth?.user && (
                                        <span className="inline-block mt-1.5 text-[10px] font-[700] uppercase tracking-wide bg-white/15 text-white px-2 py-[2px] rounded-full">
                                            Client Account
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Search pill, overlapping the header */}
                        <div className="px-5 -mt-4 relative z-10 shrink-0">
                            <button
                                onClick={() => {
                                    setIsSearchOpen(true);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full h-[46px] rounded-[12px] bg-white shadow-md border border-gray-100 px-4 flex items-center gap-3 text-[#5B6B83] hover:border-[#0955AC]/40 transition-colors"
                            >
                                <SearchIcon className="w-[17px] h-[17px] text-[#0955AC]" />
                                <span className="text-[13px] font-[600] flex-1 text-left">
                                    Search dashboard
                                </span>
                                <span className="text-[10px] font-[700] text-gray-400 bg-gray-100 px-1.5 py-[2px] rounded">
                                    ⌘K
                                </span>
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-5 pb-3 flex flex-col gap-1">
                            <SidebarLink
                                href="/track"
                                icon={SearchIcon}
                                label="Track Any Order"
                                onClick={toggleMenu}
                            />

                            <SidebarAccordion
                                icon={Car}
                                label="Vehicle Rental"
                                isOpen={openDropdown.vehicle}
                                onToggle={() => toggleDropdown("vehicle")}
                                panelId="vehicle-dropdown"
                            >
                                <SidebarSubLink href="/multiModel/plan-journey?tab=rental&subTab=land" label="Land" onClick={toggleMenu} />
                                <SidebarSubLink href="/multiModel/plan-journey?tab=rental&subTab=air" label="Air" onClick={toggleMenu} />
                                <SidebarSubLink href="/multiModel/plan-journey?tab=rental&subTab=sea" label="Sea" onClick={toggleMenu} />
                                <SidebarSubLink href="/track-vehicle-booking" label="Track Booking" onClick={toggleMenu} />
                            </SidebarAccordion>

                            <SidebarAccordion
                                icon={Ticket}
                                label="Ticket Booking"
                                isOpen={openDropdown.ticket}
                                onToggle={() => toggleDropdown("ticket")}
                                panelId="ticket-dropdown"
                            >
                                <SidebarSubLink href="/multiModel/plan-journey?tab=ticket&subTab=flight" label="Flight" onClick={toggleMenu} />
                                <SidebarSubLink href="/multiModel/plan-journey?tab=ticket&subTab=train" label="Train" onClick={toggleMenu} />
                                <SidebarSubLink href="/multiModel/plan-journey?tab=ticket&subTab=bus" label="Bus" onClick={toggleMenu} />
                                <SidebarSubLink href="/track-ticket-booking" label="Track Booking" onClick={toggleMenu} />
                            </SidebarAccordion>

                            <SidebarAccordion
                                icon={Package}
                                label="Courier Booking"
                                isOpen={openDropdown.courier}
                                onToggle={() => toggleDropdown("courier")}
                                panelId="courier-dropdown"
                            >
                                <SidebarSubLink href="/couriers/create" label="Domestic" onClick={toggleMenu} />
                                <SidebarSubLink href="/courierBookingDashboard" label="My Shipments" onClick={toggleMenu} />
                                <SidebarSubLink href="/track-shipment" label="Track Shipment" onClick={toggleMenu} />
                            </SidebarAccordion>

                            <SidebarLink
                                href="/warehouseList"
                                icon={Warehouse}
                                label="Warehouse Booking"
                                active={isActivePath("/warehouseList")}
                                onClick={toggleMenu}
                            />
                            <SidebarLink
                                href="/freightBookingDashboard"
                                icon={Truck}
                                label="Freight Booking"
                                active={isActivePath("/freightBookingDashboard")}
                                onClick={toggleMenu}
                            />
                            <SidebarLink
                                href={route("clientAllBookings")}
                                icon={ClipboardList}
                                label="My Bookings"
                                active={isActivePath("/clientAllBookings")}
                                onClick={toggleMenu}
                            />
                            <SidebarLink
                                href={route("client.wallet.dashboard")}
                                icon={Wallet}
                                label="Wallet"
                                active={isActivePath("/client/wallet")}
                                onClick={toggleMenu}
                            />
                            <SidebarLink
                                href="/clientDashboardSettings"
                                icon={SettingsIcon}
                                label="Settings"
                                active={isActivePath("/clientDashboardSettings")}
                                onClick={toggleMenu}
                            />

                            {/* ---------- Scroll-to-section links (Home, About Us, …) ---------- */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="px-3 mb-1 text-[11px] font-[700] text-gray-400 uppercase tracking-wide">
                                    Explore
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleScrollTo("home")}
                                    className="w-full flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-[600] text-gray-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors"
                                >
                                    <Home className="w-4 h-4 text-gray-400" />
                                    Home
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleScrollTo("about")}
                                    className="w-full flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-[600] text-gray-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors"
                                >
                                    <Info className="w-4 h-4 text-gray-400" />
                                    About Us
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleScrollTo("services")}
                                    className="w-full flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-[600] text-gray-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors"
                                >
                                    <LayoutGrid className="w-4 h-4 text-gray-400" />
                                    Our Services
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleScrollTo("blog")}
                                    className="w-full flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-[600] text-gray-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors"
                                >
                                    <Newspaper className="w-4 h-4 text-gray-400" />
                                    Blog
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleScrollTo("contact")}
                                    className="w-full flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-[600] text-gray-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors"
                                >
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    Contact Us
                                </button>
                            </div>
                        </nav>

                        {/* Auth footer */}
                        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60 shrink-0">
                            {auth?.user ? (
                                <button
                                    onClick={handleOpenLogoutModal}
                                    className="w-full h-[44px] rounded-[10px] border-2 border-red-500 text-red-600 font-[700] text-[13px] flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <Link
                                        href="/signin"
                                        className="flex-1 h-[44px] rounded-[10px] border-2 border-[#0955AC] text-[#0955AC] font-[700] text-[13px] flex items-center justify-center gap-2 hover:bg-[#0955AC] hover:text-white transition-colors"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        Login
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="flex-1 h-[44px] rounded-[10px] bg-[#0955AC] text-white font-[700] text-[13px] flex items-center justify-center gap-2 hover:bg-[#073E82] transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>,
                document.body
            )}

            {/* Logout Confirmation Modal */}
            <DashboardSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                items={clientSearchItems}
                title="Search Client Dashboard"
                placeholder="Search bookings, services, and settings"
                emptyStateMessage="No client dashboard matches were found for this query."
            />

            <AnimatePresence>
                {actionModalState.isOpen && (
                    <ActionModalTemplate
                        title="Confirm Logout"
                        description="Are you sure you want to logout from your account?"
                        confirmText="Logout"
                        confirmClassName="bg-red-600 hover:bg-red-700"
                        processingText="Logging out..."
                        onClose={closeActionModal}
                        onConfirm={handleActionConfirm}
                        theme="light"
                    />
                )}
            </AnimatePresence>
        </header>
    );
};

export default ClientHeader;
