import React, { useEffect, useMemo, useState } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { ArrowLeft, MapPin, Menu, Search, UserCircle, Users } from "lucide-react";
import CompanyLogo from "../../Pages/Web/components/CompanyLogo";
import NotificationDropdown from "../../Pages/Web/components/vendors/NotificationDropdown";
import UserDropdown from "../../Pages/Web/components/vendors/UserDropdown";
import { installGlobalVendorButtonTracking, logVendorButtonClick } from "../../utils/vendorActivityLogger";
import DashboardSearchModal from "../search/DashboardSearchModal";
import { buildVendorDashboardSearchEntries } from "../../search/dashboardSearchCatalog";

import dashLogo from "../../Pages/Web/assets/vendors/dashboard/dashLogo.svg";
import bookLogo from "../../Pages/Web/assets/vendors/dashboard/bookLogo.svg";
import uniLogo from "../../Pages/Web/assets/vendors/dashboard/uniLogo.svg";
import calendarLogo from "../../Pages/Web/assets/vendors/dashboard/calendarLogo.svg";
import clientsLogo from "../../Pages/Web/assets/vendors/dashboard/clientsLogo.svg";
import driversLogo from "../../Pages/Web/assets/vendors/dashboard/driversLogo.svg";
import finLogo from "../../Pages/Web/assets/vendors/dashboard/finLogo.svg";
import settingsLogo from "../../Pages/Web/assets/vendors/dashboard/settings.svg";
import bellIcon from "../../Pages/Web/assets/vendors/dashboard/bell.svg";

const LIVE_REFRESH_INTERVAL_MS = 30000;

/**
 * Per-service sidebar menu configuration.
 * Each value is a plain object of named route-getter functions.
 * Keys that are null/undefined mean that item won't be rendered.
 */
const SERVICE_CONFIG = {
    "All Bookings": {
        dashboard: () => route("vendorAllBookings"),
        bookings: () => route("vendorAllBookingsPage"),
        units: null,
        calendar: () => route("vendorCalendar"),
        clients: () => route("vendorAllBookingsClients"),
        drivers: null,
        payment: () => route(""),
        expenses: () => route(""),
        settings: () => route(""),
        profile: () => route("vendor.profile.index"),
    },
    "Vehicle Rental": {
        dashboard: () => route("vendors.dashboard"),
        bookings: () => route("vendors.bookings"),
        units: () => route("vendors.units"),
        calendar: () => route("vendors.calendar"),
        clients: () => route("vendors.clients"),
        drivers: () => route("vendors.drivers"),
        payment: () => route("vendors.payment"),
        expenses: () => route("vendors.expenses"),
        earnings: () => route("vendors.earnings"),
        settings: () => route(""),
        profile: () => route(""),
    },
    "Ticket Booking": {
        dashboard: () => route("ticketBooking.dashboard"),
        bookings: () => route("ticketBooking.bookings"),
        units: () => route("ticketBooking.units"),
        calendar: () => route("ticketBooking.calendar"),
        clients: () => route("ticketBooking.clients"),
        drivers: null,
        payment: () => route("ticketBooking.payment"),
        expenses: () => route("ticketBooking.expenses"),
        settings: () => route(""),
        profile: () => route(""),
    },
    "Courier Service": {
        dashboard: () => route("courierService.dashboard"),
        bookings: () => route("courierService.bookings"),
        bookingsLabel: "Bookings",
        units: () => route("courierService.units"),
        unitsLabel: "Shipments",
        calendar: () => route("courierService.calendar"),
        tracking: () => route("courierService.tracking"),
        clients: () => route("courierService.clients"),
        team: () => route("courierService.team.index"),
        drivers: null,
        payment: () => route("courierService.payment"),
        expenses: () => route("courierService.expenses"),
        settings: () => route("courierService.settings.module", { module: "business" }),
        settingsModules: [
            { key: "business", label: "Business", route: () => route("courierService.settings.module", { module: "business" }) },
            { key: "operations", label: "Operations", route: () => route("courierService.settings.module", { module: "operations" }) },
            { key: "sla", label: "SLA", route: () => route("courierService.settings.module", { module: "sla" }) },
            { key: "tracking", label: "Tracking", route: () => route("courierService.settings.module", { module: "tracking" }) },
            { key: "notifications", label: "Notifications", route: () => route("courierService.settings.module", { module: "notifications" }) },
            { key: "integrations", label: "Integrations", route: () => route("courierService.settings.module", { module: "integrations" }) },
            { key: "services", label: "Services", route: () => route("courierService.settings.module", { module: "services" }) },
            { key: "labels", label: "Labels", route: () => route("courierService.settings.module", { module: "labels" }) },
            { key: "pricing", label: "Pricing", route: () => route("courierService.settings.module", { module: "pricing" }) },
            { key: "team", label: "Team Access", route: () => route("courierService.settings.team.topic", { topic: "policy-controls" }) },
        ],
        profile: () => route("courierService.profile"),
    },
    "Warehousing": {
        dashboard: () => route("vendors.warehouse.dashboard"),
        bookings: () => route("vendors.warehouse.reservations"),
        bookingsLabel: "Reservations",
        units: () => route("vendors.warehouse.units"),
        calendar: () => route("vendors.warehouse.calendar"),
        clients: () => route("vendors.warehouse.clients"),
        drivers: null,
        payment: () => route("vendors.warehouse.payment"),
        expenses: () => route("vendors.warehouse.expenses"),
        settings: () => route(""),
        profile: () => route(""),
    },
    "Freight": {
        dashboard: () => route("freight.dashboard"),
        bookings: () => route("freight.bookings"),
        units: () => route("freight.units"),
        calendar: () => route("freight.calendar"),
        clients: () => route("freight.clients"),
        drivers: null,
        payment: () => route("freight.payment"),
        expenses: () => route("freight.expenses"),
        settings: () => route(""),
        profile: () => route(""),
    },
};

/** Top navbar tabs – order matters */
const SERVICE_TABS = [
    { name: "All Bookings", routeKey: "vendorAllBookings" },
    { name: "Vehicle Rental", routeKey: "vendors.dashboard" },
    { name: "Ticket Booking", routeKey: "ticketBooking.dashboard" },
    { name: "Courier Service", routeKey: "courierService.dashboard" },
    { name: "Warehousing", routeKey: "vendors.warehouse.dashboard" },
    { name: "Freight", routeKey: "freight.dashboard" },
];

/** Safely extract the pathname from a Ziggy route URL */
const routePath = (routeFn) => {
    try {
        return new URL(routeFn()).pathname;
    } catch {
        return null;
    }
};

/**
 * Combined Sidebar + Service TopNav layout for all vendor portals.
 *
 * Props:
 *  - children      – page content
 *  - activeService – one of the SERVICE_CONFIG keys (default "Vehicle Rental")
 *  - isVerified    – whether the vendor is verified; gates service-tab navigation
 */
const VendorShellLayout = ({
    children,
    activeService = "Vehicle Rental",
    isVerified: isVerifiedProp,
}) => {
    const { auth, flash } = usePage().props;
    const user = auth?.user;
    const isVerified = isVerifiedProp !== undefined
        ? isVerifiedProp
        : (user?.status === "verified" || user?.status === "Verified");

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showFinancial, setShowFinancial] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [shellFlash, setShellFlash] = useState(null);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [blockedService, setBlockedService] = useState("");
    const [isUnverifiedModal, setIsUnverifiedModal] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        if (activeService) {
            localStorage.setItem("vendorActiveService", activeService);
        }
    }, [activeService]);

    useEffect(() => {
        const cleanup = installGlobalVendorButtonTracking({
            screen: "vendor_shell_layout",
        });

        return cleanup;
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

    useEffect(() => {
        if (flash?.error) {
            if (flash.error === "Please update your password before continuing.") {
                return;
            }
            setShellFlash({ type: "error", message: flash.error });
            return;
        }

        if (flash?.success) {
            setShellFlash({ type: "success", message: flash.success });
        }
    }, [flash?.error, flash?.success]);

    useEffect(() => {
        if (!shellFlash?.message) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            setShellFlash(null);
        }, 3600);

        return () => window.clearTimeout(timer);
    }, [shellFlash]);

    useEffect(() => {
        if (activeService !== "Courier Service") {
            return undefined;
        }

        const refreshNow = () => {
            router.reload({
                preserveScroll: true,
                preserveState: true,
            });
        };

        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                refreshNow();
            }
        }, LIVE_REFRESH_INTERVAL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                refreshNow();
            }
        };

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [activeService]);

    const approvedSlugs = user?.approved_service_slugs || [];
    const courierPermissions = Array.isArray(user?.courier_permissions) ? user.courier_permissions : [];
    const approvedSlugsSignature = approvedSlugs.join("|");
    const courierPermissionsSignature = courierPermissions.join("|");

    const hasCourierPermission = (permission) => {
        if (activeService !== "Courier Service") {
            return true;
        }

        if (user?.role === "vendor") {
            return true;
        }

        return courierPermissions.includes(permission);
    };

    const canAccessService = (serviceName) => {
        switch (serviceName) {
            case "All Bookings": return true;
            case "Vehicle Rental": return approvedSlugs.includes("vehicle-rental");
            case "Ticket Booking": return approvedSlugs.includes("aviation-service") || approvedSlugs.includes("railway-service");
            case "Courier Service": return approvedSlugs.includes("courier-services");
            case "Warehousing": return approvedSlugs.includes("warehousing");
            case "Freight": return approvedSlugs.includes("waterborne-transport");
            default: return false;
        }
    };

    const getServiceSlug = (serviceName) => {
        const serviceMap = {
            "Vehicle Rental": "vehicle-rental",
            "Ticket Booking": "aviation-service",
            "Courier Service": "courier-services",
            "Warehousing": "warehousing",
            "Freight": "waterborne-transport",
        };
        return serviceMap[serviceName] || "";
    };

    const handleNavbarClick = (serviceName, accountUnverified) => {
        logVendorButtonClick("blocked_shell_tab_click", {
            screen: "vendor_shell_layout",
            serviceName,
            metadata: { account_unverified: Boolean(accountUnverified) },
            description: `Vendor clicked blocked shell tab: ${serviceName}.`,
        });

        setBlockedService(serviceName);
        setIsUnverifiedModal(accountUnverified);
        setShowModal(true);
    };

    const handleRegister = () => {
        const slug = getServiceSlug(blockedService);
        logVendorButtonClick("register_from_shell_modal", {
            screen: "vendor_shell_layout",
            serviceName: blockedService,
            metadata: { service_slug: slug },
            description: `Vendor clicked Register Service from shell modal for ${blockedService}.`,
        });

        setShowModal(false);
        router.visit(route('vendor.profile.step2', { service: slug }));
    };

    const handleModalCancel = () => {
        logVendorButtonClick("cancel_shell_modal", {
            screen: "vendor_shell_layout",
            serviceName: blockedService,
            description: `Vendor cancelled shell blocked-service modal for ${blockedService}.`,
        });

        setShowModal(false);
        setBlockedService("");
    };

    const currentPath = window.location.pathname;
    const cfg = SERVICE_CONFIG[activeService] ?? SERVICE_CONFIG["Vehicle Rental"];

    // Resolve the settings route for this service
    const settingsRoute = cfg.settings ? cfg.settings() : null;

    /** True when the current URL matches a given route-getter */
    const isActive = (routeFn) => {
        if (!routeFn) return false;
        const p = routePath(routeFn);
        if (!p) return false;
        return currentPath === p || currentPath.startsWith(`${p}/`);
    };

    const settingsModuleActive = Array.isArray(cfg.settingsModules)
        ? cfg.settingsModules.some((moduleItem) => isActive(moduleItem.route))
        : false;

    useEffect(() => {
        if (settingsModuleActive) {
            setShowSettingsMenu(true);
        }
    }, [settingsModuleActive]);

    const menuCls = (active) =>
        `flex items-center gap-5 w-full rounded-lg px-3 py-1.5 cursor-pointer transition-colors ${active
            ? "bg-[#0955AC29] text-[#000000] font-[700]"
            : "text-[#00000066] hover:bg-gray-50"
        }`;

    const handleUnverified = (serviceName) => {
        if (!isVerified) {
            handleNavbarClick(serviceName, true);
        } else {
            handleNavbarClick(serviceName, false);
        }
    };

    const vendorSearchItems = useMemo(
        () =>
            buildVendorDashboardSearchEntries({
                serviceTabs: SERVICE_TABS,
                serviceConfig: SERVICE_CONFIG,
                isVerified,
                canAccessService,
                hasCourierPermission,
                routePathResolver: routePath,
            }),
        [
            activeService,
            isVerified,
            approvedSlugsSignature,
            courierPermissionsSignature,
            user?.role,
        ]
    );

    const navigate = (routeFn) => {
        const p = routePath(routeFn);
        if (!p) {
            logVendorButtonClick("open_coming_soon", {
                screen: "vendor_shell_layout",
                description: "Vendor clicked a sidebar item without an active route.",
            });
            setShowComingSoon(true);
            return;
        }

        logVendorButtonClick("sidebar_navigation_click", {
            screen: "vendor_shell_layout",
            metadata: { path: p },
            description: `Vendor clicked sidebar navigation to ${p}.`,
        });

        setIsSidebarOpen(false);
        window.location.href = p;
    };

    const tabLinkCls = (isActiveSvc) =>
        `flex-1 lg:flex-none px-6 py-4 lg:px-8 text-center font-[500] text-[14px] whitespace-nowrap border-b-4 transition-all rounded-t-lg ${isActiveSvc
            ? "border-[#0955AC] bg-[#0955AC29] text-[#0955AC] font-[600]"
            : "border-transparent text-[#666666] hover:bg-[#F3F3F3] hover:border-[#0955AC]"
        }`;

    const pillCls = (isActiveSvc) =>
        `px-3 py-1.5 text-[12px] font-[500] whitespace-nowrap rounded-full transition-all flex-shrink-0 ${isActiveSvc
            ? "bg-[#0955AC] text-white font-[600] shadow-sm"
            : "bg-gray-100 text-gray-600"
        }`;

    return (
        <div className="bg-[#E5E5E5] min-h-screen">
            <style>{`
                .sidebar-scroll::-webkit-scrollbar { width: 6px; }
                .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .sidebar-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
                .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
                .sidebar-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
                .pill-scroll::-webkit-scrollbar { display: none; }
                .pill-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <div className="flex flex-row h-screen overflow-hidden">

                {/* ── Mobile overlay ── */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* ════════════════════════════
                    SIDEBAR
                ════════════════════════════ */}
                <div
                    className={`fixed lg:static top-0 left-0 h-screen z-40 flex-shrink-0 transition-transform duration-300
                        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                        lg:translate-x-0`}
                >
                    <div className="poppins min-w-[250px] h-screen bg-white flex flex-col py-4 px-6 rounded-tr-[10px] rounded-br-[10px] shadow-lg overflow-hidden">

                        {/* Logo + back + close (mobile) */}
                        <div className="flex-shrink-0 mb-4 flex items-center justify-center relative">
                            <button
                                onClick={() => (window.location.href = "/")}
                                className="absolute left-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Go to home"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <CompanyLogo
                                className="h-[40px] object-contain"
                                fallbackClassName="text-[20px] font-[700] poppins uppercase"
                            />
                            {/* Close button — only on mobile */}
                            <button
                                className="lg:hidden absolute right-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Active service badge on mobile */}
                        <div className="lg:hidden mb-3 px-3 py-2 bg-[#0955AC0D] rounded-lg border border-[#0955AC29]">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-[500] mb-0.5">Current service</p>
                            <p className="text-[14px] text-[#0955AC] font-[700]">{activeService}</p>
                        </div>

                        {/* Scrollable menu */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full pr-2 sidebar-scroll pb-4">
                            <div className="figtree flex flex-col items-start gap-3 text-[18px] font-[500]">

                                {cfg.dashboard && hasCourierPermission("courier.dashboard.view") && (
                                    <div className={menuCls(isActive(cfg.dashboard))} onClick={() => navigate(cfg.dashboard)}>
                                        <img src={dashLogo} className="w-[22px]" alt="" />
                                        <span>Dashboard</span>
                                    </div>
                                )}

                                {cfg.bookings && hasCourierPermission("courier.bookings.view") && (
                                    <div className={menuCls(isActive(cfg.bookings))} onClick={() => navigate(cfg.bookings)}>
                                        <img src={bookLogo} className="w-[22px]" alt="" />
                                        <span>{cfg.bookingsLabel || "Bookings"}</span>
                                    </div>
                                )}

                                {cfg.units && hasCourierPermission("courier.shipments.view") && (
                                    <div className={menuCls(isActive(cfg.units))} onClick={() => navigate(cfg.units)}>
                                        <img src={uniLogo} className="w-[22px]" alt="" />
                                        <span>{cfg.unitsLabel || "Units"}</span>
                                    </div>
                                )}

                                {cfg.tracking && hasCourierPermission("courier.tracking.view") && (
                                    <div className={menuCls(isActive(cfg.tracking))} onClick={() => navigate(cfg.tracking)}>
                                        <MapPin className="w-[22px] h-[22px] text-[#666666]" />
                                        <span>Tracking</span>
                                    </div>
                                )}

                                {cfg.calendar && hasCourierPermission("courier.calendar.view") && (
                                    <div className={menuCls(isActive(cfg.calendar))} onClick={() => navigate(cfg.calendar)}>
                                        <img src={calendarLogo} className="w-[22px]" alt="" />
                                        <span>Calendar</span>
                                    </div>
                                )}

                                {cfg.clients && hasCourierPermission("courier.clients.view") && (
                                    <div className={menuCls(isActive(cfg.clients))} onClick={() => navigate(cfg.clients)}>
                                        <img src={clientsLogo} className="w-[22px]" alt="" />
                                        <span>Clients</span>
                                    </div>
                                )}

                                {cfg.team && hasCourierPermission("courier.team.view") && (
                                    <div className={menuCls(isActive(cfg.team))} onClick={() => navigate(cfg.team)}>
                                        <Users className="w-[22px] h-[22px] text-[#666666]" />
                                        <span>Team</span>
                                    </div>
                                )}

                                {cfg.drivers && (
                                    <div className={menuCls(isActive(cfg.drivers))} onClick={() => navigate(cfg.drivers)}>
                                        <img src={driversLogo} className="w-[22px]" alt="" />
                                        <span>Drivers</span>
                                    </div>
                                )}

                                {((cfg.payment && hasCourierPermission("courier.finance.view")) ||
                                    (cfg.expenses && hasCourierPermission("courier.finance.view"))) && (
                                    <>
                                        <div
                                            className={menuCls(
                                                (cfg.payment && isActive(cfg.payment)) ||
                                                (cfg.expenses && isActive(cfg.expenses))
                                            )}
                                            onClick={() => setShowFinancial((v) => !v)}
                                        >
                                            <img src={finLogo} className="w-[22px]" alt="" />
                                            <span>Financial</span>
                                            <svg
                                                className={`ml-auto w-4 h-4 text-gray-400 transition-transform ${showFinancial ? "rotate-180" : ""}`}
                                                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>

                                        {showFinancial && (
                                            <div className="ml-8 w-full flex flex-col gap-1 text-[16px] font-[500]">
                                                {cfg.payment && hasCourierPermission("courier.finance.view") && (
                                                    <div
                                                        className={`px-3 py-2 cursor-pointer rounded-lg ${isActive(cfg.payment)
                                                            ? "bg-[#0955AC29] text-[#000000] font-[700]"
                                                            : "text-[#00000066] hover:bg-gray-50"
                                                            }`}
                                                        onClick={() => navigate(cfg.payment)}
                                                    >
                                                        Payment
                                                    </div>
                                                )}
                                                {cfg.expenses && hasCourierPermission("courier.finance.view") && (
                                                    <div
                                                        className={`px-3 py-2 cursor-pointer rounded-lg ${isActive(cfg.expenses)
                                                            ? "bg-[#0955AC29] text-[#000000] font-[700]"
                                                            : "text-[#00000066] hover:bg-gray-50"
                                                            }`}
                                                        onClick={() => navigate(cfg.expenses)}
                                                    >
                                                        Expenses
                                                    </div>
                                                )}
                                                {cfg.earnings && hasCourierPermission("courier.finance.view") && (
                                                    <div
                                                        className={`px-3 py-2 cursor-pointer rounded-lg ${isActive(cfg.earnings)
                                                            ? "bg-[#0955AC29] text-[#000000] font-[700]"
                                                            : "text-[#00000066] hover:bg-gray-50"
                                                            }`}
                                                        onClick={() => navigate(cfg.earnings)}
                                                    >
                                                        Earnings
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {cfg.settings && hasCourierPermission("courier.settings.view") && (
                                    Array.isArray(cfg.settingsModules) && cfg.settingsModules.length > 0 ? (
                                        <>
                                            <div
                                                className={menuCls(isActive(cfg.settings) || settingsModuleActive)}
                                                onClick={() => setShowSettingsMenu((prev) => !prev)}
                                            >
                                                <img src={settingsLogo} className="w-[22px] opacity-60" alt="" />
                                                <span>Settings</span>
                                                <svg
                                                    className={`ml-auto w-4 h-4 text-gray-400 transition-transform ${showSettingsMenu ? "rotate-180" : ""}`}
                                                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>

                                            {showSettingsMenu && (
                                                <div className="ml-8 w-full flex flex-col gap-1 text-[16px] font-[500]">
                                                    {cfg.settingsModules.map((moduleItem) => (
                                                        <div
                                                            key={moduleItem.key}
                                                            className={`px-3 py-2 cursor-pointer rounded-lg ${isActive(moduleItem.route)
                                                                ? "bg-[#0955AC29] text-[#000000] font-[700]"
                                                                : "text-[#00000066] hover:bg-gray-50"
                                                                }`}
                                                            onClick={() => navigate(moduleItem.route)}
                                                        >
                                                            {moduleItem.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={menuCls(isActive(cfg.settings))} onClick={() => navigate(cfg.settings)}>
                                            <img src={settingsLogo} className="w-[22px] opacity-60" alt="" />
                                            <span>Settings</span>
                                        </div>
                                    )
                                )}

                                {cfg.profile && hasCourierPermission("courier.profile.view") && (
                                    <div className={menuCls(isActive(cfg.profile))} onClick={() => navigate(cfg.profile)}>
                                        <UserCircle className="w-[22px] h-[22px] text-gray-500" />
                                        <span>Profile</span>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════
                    MAIN CONTENT COLUMN
                ════════════════════════════ */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* ── MOBILE HEADER ── */}
                    <div className="lg:hidden flex-shrink-0 sticky top-0 z-30 bg-white" style={{ boxShadow: "0 2px 8px #0000001A" }}>
                        {/* Top row: hamburger + service name + actions */}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <button
                                onClick={() => setIsSidebarOpen((v) => !v)}
                                className="p-2 -ml-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                            >
                                <Menu size={22} className="text-gray-700" />
                            </button>
                            <span className="flex-1 font-[600] text-[15px] text-gray-800 truncate">{activeService}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="h-9 w-9 rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] transition flex items-center justify-center"
                                    aria-label="Search vendor dashboard"
                                    title="Search (Cmd+K)"
                                >
                                    <Search size={16} className="text-[#0955AC]" />
                                </button>
                                <NotificationDropdown bellIcon={bellIcon} />
                                {settingsRoute && <UserDropdown settingsRoute={settingsRoute} />}
                            </div>
                        </div>

                        {/* Service pill tabs strip */}
                        <div className="overflow-x-auto pill-scroll border-t border-gray-100">
                            <div className="flex gap-2 px-3 py-2 min-w-max">
                                {SERVICE_TABS.map((tab, idx) =>
                                    isVerified && canAccessService(tab.name) ? (
                                        <Link
                                            key={idx}
                                            href={route(tab.routeKey)}
                                            onClick={() => logVendorButtonClick("mobile_service_pill_click", {
                                                screen: "vendor_shell_layout",
                                                serviceName: tab.name,
                                                description: `Vendor clicked mobile service tab: ${tab.name}.`,
                                            })}
                                            className={pillCls(activeService === tab.name)}
                                        >
                                            {tab.name}
                                        </Link>
                                    ) : (
                                        <button key={idx} onClick={() => handleUnverified(tab.name)} className={`${pillCls(activeService === tab.name)} cursor-not-allowed opacity-60`}>
                                            {tab.name}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── DESKTOP TAB NAVBAR ── */}
                    <div className="hidden lg:flex flex-shrink-0 sticky top-0 z-30 bg-white items-center justify-between px-3" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                        <div className="flex flex-row gap-0 overflow-x-auto min-w-0 flex-1">
                            {SERVICE_TABS.map((tab, idx) =>
                                isVerified && canAccessService(tab.name) ? (
                                    <Link
                                        key={idx}
                                        href={route(tab.routeKey)}
                                        onClick={() => logVendorButtonClick("desktop_service_tab_click", {
                                            screen: "vendor_shell_layout",
                                            serviceName: tab.name,
                                            description: `Vendor clicked desktop service tab: ${tab.name}.`,
                                        })}
                                        className={tabLinkCls(activeService === tab.name)}
                                    >
                                        {tab.name}
                                    </Link>
                                ) : (
                                    <button key={idx} onClick={() => handleUnverified(tab.name)} className={`${tabLinkCls(activeService === tab.name)} cursor-not-allowed opacity-60`}>
                                        {tab.name}
                                    </button>
                                )
                            )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 ml-3 border-l border-gray-200 pl-3">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="h-10 w-10 rounded-full bg-[#E8EBEF] hover:bg-[#DDE2E8] transition flex items-center justify-center"
                                aria-label="Search vendor dashboard"
                                title="Search (Cmd+K)"
                            >
                                <Search size={18} className="text-[#0955AC]" />
                            </button>
                            <NotificationDropdown bellIcon={bellIcon} />
                            {settingsRoute && <UserDropdown settingsRoute={settingsRoute} />}
                        </div>
                    </div>

                    {/* ── Page content ── */}
                    <div className="flex-1 bg-[#E5E5E5] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>

            <DashboardSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                items={vendorSearchItems}
                title="Search Vendor Dashboard"
                placeholder="Search services, pages, settings, bookings, and tools"
                emptyStateMessage="No matching vendor pages were found for your available services."
            />

            {/* Access Denied Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                            {isUnverifiedModal ? "Account Not Verified" : "Service Not Registered"}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {isUnverifiedModal
                                ? "Please verify your account to access all dashboard features."
                                : `To access ${blockedService}, please register this service and wait for admin verification.`
                            }
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleModalCancel}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
                            >
                                Cancel
                            </button>
                            {!isUnverifiedModal && (
                                <button
                                    onClick={handleRegister}
                                    className="px-4 py-2 bg-[#0955AC] text-white rounded-lg hover:bg-[#074291] font-medium transition"
                                >
                                    Register Service
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {shellFlash?.message && (
                <div className="fixed top-5 right-5 z-[90] w-[92%] max-w-[420px]">
                    <div
                        className={`rounded-xl border shadow-xl backdrop-blur-sm px-4 py-3 flex items-start gap-3 ${shellFlash.type === "error"
                            ? "bg-[#FFEFF0] border-[#FCA5A5] text-[#7F1D1D]"
                            : "bg-[#ECFDF3] border-[#86EFAC] text-[#14532D]"
                            }`}
                    >
                        <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${shellFlash.type === "error" ? "bg-[#DC2626]" : "bg-[#16A34A]"}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-[700] uppercase tracking-wide opacity-80">
                                {shellFlash.type === "error" ? "Access Notice" : "Success"}
                            </p>
                            <p className="text-[14px] font-[500] leading-5 break-words">{shellFlash.message}</p>
                        </div>
                        <button
                            onClick={() => setShellFlash(null)}
                            className="text-[12px] font-[700] opacity-70 hover:opacity-100 transition"
                            aria-label="Close message"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Coming Soon modal */}
            {showComingSoon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
                    <div className="bg-white rounded-2xl shadow-2xl px-12 py-10 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
                        <span className="text-5xl">🚧</span>
                        <h2 className="text-[22px] font-[700] text-[#0955AC] poppins">Coming Soon</h2>
                        <p className="text-[15px] text-gray-500 text-center font-[400]">This feature is currently under construction and will be available soon.</p>
                        <button
                            onClick={() => setShowComingSoon(false)}
                            className="mt-2 px-8 py-2.5 bg-[#0955AC] text-white rounded-lg font-[600] text-[14px] hover:bg-[#0744a0] transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorShellLayout;
