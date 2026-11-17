import React, { useState, useEffect, useMemo } from "react";
import { Headset, Search } from "lucide-react";
import useChatUnread from "@/Components/chat/useChatUnread";
import { AnimatePresence } from "framer-motion";
import CompanyLogo from "../../CompanyLogo";
import ActionModalTemplate from "../Common/ActionModalTemplate";
import DashboardSearchModal from "@/Components/search/DashboardSearchModal";
import { buildSuperAdminDashboardSearchEntries } from "@/search/dashboardSearchCatalog";
import homepng from "../../../assets/superAdmin/HomeB.svg";
import homepngW from "../../../assets/superAdmin/HomeW.svg";
import drop from "../../../assets/superAdmin/Chevron Down.png";
import dropl from "../../../assets/superAdmin/Chevron Right.png";
import features from "../../../assets/superAdmin/Features Icon.png";
import featuresW from "../../../assets/superAdmin/Features IconW.svg";
import users from "../../../assets/superAdmin/Users Icon.png";
import usersW from "../../../assets/superAdmin/Users IconW.svg";
import pricing from "../../../assets/superAdmin/Pricing Icon.png";
import integrations from "../../../assets/superAdmin/Integrations Icon.png";
import settings from "../../../assets/superAdmin/Settings Icon.png";
import webi from "../../../assets/superAdmin/Webflow Icon.png";
import person from "../../../assets/superAdmin/person.png";
import LogoutB from '../../../assets/superAdmin/logoutB.png';
import LogoutR from '../../../assets/superAdmin/logoutR.png';
import arrow_r from "../../../assets/superAdmin/Arrow Right.png";

import { Link, router, usePage } from "@inertiajs/react";

const SideMenu = () => {
    const { url, props } = usePage();
    const supportUnread = useChatUnread(true);
    const initialSidebarState = getSidebarStateFromPath(url);
    const [activeSubsection, setActiveSubsection] = useState(initialSidebarState.activeSubsection);
    const [isDashboardOpen, setIsDashboardOpen] = useState(initialSidebarState.isDashboardOpen);
    const [isReportsOpen, setIsReportsOpen] = useState(initialSidebarState.isReportsOpen);
    const [isServiceReportsOpen, setIsServiceReportsOpen] = useState(initialSidebarState.isServiceReportsOpen);
    const [isUserReportsOpen, setIsUserReportsOpen] = useState(initialSidebarState.isUserReportsOpen);
    const [isCourierManagementOpen, setIsCourierManagementOpen] = useState(initialSidebarState.isCourierManagementOpen);
    const [isModelsOpen, setIsModelsOpen] = useState(initialSidebarState.isModelsOpen);
    const [isUsersOpen, setIsUsersOpen] = useState(initialSidebarState.isUsersOpen);
    const [isSettingsOpen, setIsSettingsOpen] = useState(initialSidebarState.isSettingsOpen);
    const [isFinanceOpen, setIsFinanceOpen] = useState(initialSidebarState.isFinanceOpen);
    const [isAccountOpen, setIsAccountOpen] = useState(initialSidebarState.isAccountOpen);
    const [hoveredSection, setHoveredSection] = useState(null); // Track hovered section
    const [actionModalState, setActionModalState] = useState({ isOpen: false, action: null });
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const authUser = props?.auth?.user ?? null;
    const superAdminCourierPermissions = Array.isArray(authUser?.superadmin_courier_permissions)
        ? authUser.superadmin_courier_permissions
        : [];
    const hasExplicitSuperAdminCourierPermissions = Boolean(authUser?.has_explicit_superadmin_courier_permissions);
    const hasSuperAdminCourierPermission = (permission) => {
        if (!hasExplicitSuperAdminCourierPermissions) {
            return true;
        }

        return superAdminCourierPermissions.includes(permission);
    };

    const canViewReports = hasSuperAdminCourierPermission("superadmin.courier.reports.view");
    const canViewCodSettlement = hasSuperAdminCourierPermission("superadmin.courier.cod.settings.view");
    const canViewPayments = hasSuperAdminCourierPermission("superadmin.courier.payments.view");
    const canViewCourierOperations = hasSuperAdminCourierPermission("superadmin.courier.operations.view");
    const canViewPricingGovernance = hasSuperAdminCourierPermission("superadmin.courier.pricing.governance.view");
    const canViewCourierManagement = canViewReports || canViewCodSettlement || canViewPayments || canViewCourierOperations || canViewPricingGovernance;

    const superAdminSearchItems = useMemo(
        () =>
            buildSuperAdminDashboardSearchEntries({
                canViewReports,
                canViewCodSettlement,
                canViewPayments,
                canViewCourierOperations,
                canViewPricingGovernance,
            }),
        [
            canViewReports,
            canViewCodSettlement,
            canViewPayments,
            canViewCourierOperations,
            canViewPricingGovernance,
        ]
    );

    function normalizeLegacySuperadminPath(pathname) {
        if (!pathname) {
            return pathname;
        }

        let normalizedPath = String(pathname);

        if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
            try {
                normalizedPath = new URL(normalizedPath).pathname;
            } catch (_error) {
                // Keep original value if URL parsing fails.
            }
        }

        normalizedPath = normalizedPath.split("?")[0].split("#")[0];

        if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
            normalizedPath = normalizedPath.slice(0, -1);
        }

        normalizedPath = normalizedPath.startsWith("/SuperAdmin")
            ? normalizedPath.replace("/SuperAdmin", "/superadmin")
            : normalizedPath;

        const pathAliases = {
            "/superadmin/Analytics": "/superadmin/analytics",
            "/superadmin/Dashboard": "/superadmin/dashboard",
            "/superadmin/Users": "/superadmin/users",
            "/superadmin/Vehicles": "/superadmin/vehicles",
            "/superadmin/Warehouse": "/superadmin/warehouse",
            "/superadmin/Vender": "/superadmin/vendors",
            "/superadmin/AddUser": "/superadmin/users/create",
            "/superadmin/LandVehicleDetails": "/superadmin/land-vehicle-details",
            "/superadmin/SeaVehicleDetails": "/superadmin/sea-vehicle-details",
            "/superadmin/AirVehicleDetails": "/superadmin/air-vehicle-details",
            "/superadmin/AccountSettings": "/superadmin/account-settings",
            "/superadmin/Models": "/superadmin/models",
            "/superadmin/Models/Courier": "/superadmin/models/courier",
            "/superadmin/Models/Freight": "/superadmin/models/freight",
            "/superadmin/Models/TicketBooking": "/superadmin/models/ticketbooking",
            "/superadmin/Models/Multimodel": "/superadmin/models/multimodel",
            "/superadmin/CourierOperations": "/superadmin/courier-operations",
            "/superadmin/PricingGovernance": "/superadmin/pricing-governance",
        };

        return pathAliases[normalizedPath] || normalizedPath;
    }

    function getSidebarStateFromPath(pathname) {
        const resolvedPath = pathname || (typeof window !== "undefined" ? window.location.pathname : "");
        const normalizedPath = normalizeLegacySuperadminPath(resolvedPath);

        const nextState = {
            activeSubsection: "",
            isDashboardOpen: false,
            isReportsOpen: false,
            isServiceReportsOpen: false,
            isUserReportsOpen: false,
            isCourierManagementOpen: false,
            isModelsOpen: false,
            isUsersOpen: false,
            isSettingsOpen: false,
            isFinanceOpen: false,
            isAccountOpen: false,
        };

        if (normalizedPath === "/superadmin/dashboard" || normalizedPath === "/superadmin/analytics") {
            nextState.activeSubsection = "Dashboard";
            nextState.isDashboardOpen = false;
        } else if (normalizedPath === "/superadmin/users" || normalizedPath === "/superadmin/users/create") {
            nextState.activeSubsection = "Users";
            nextState.isUsersOpen = true;
        } else if (normalizedPath === "/superadmin/users/clients" || normalizedPath.startsWith("/superadmin/users/clients/")) {
            nextState.activeSubsection = "Clients";
            nextState.isUsersOpen = true;
        } else if (normalizedPath === "/superadmin/users/service-providers" || normalizedPath.startsWith("/superadmin/users/service-providers/")) {
            nextState.activeSubsection = "ServiceProviders";
            nextState.isUsersOpen = true;
        } else if (normalizedPath === "/superadmin/users/drivers" || normalizedPath.startsWith("/superadmin/users/drivers/")) {
            nextState.activeSubsection = "Drivers";
            nextState.isUsersOpen = true;
        } else if (normalizedPath.startsWith("/superadmin/users/")) {
            nextState.activeSubsection = "Users";
            nextState.isUsersOpen = true;
        } else if (normalizedPath === "/superadmin/reports/vehicles") {
            nextState.activeSubsection = "VehicleReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/tickets") {
            nextState.activeSubsection = "TicketReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/warehouse") {
            nextState.activeSubsection = "WarehouseReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/multimodal") {
            nextState.activeSubsection = "MultimodalReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/courier") {
            nextState.activeSubsection = "CourierReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
            nextState.isModelsOpen = true;
            nextState.isCourierManagementOpen = true;
        } else if (normalizedPath === "/superadmin/reports/freight") {
            nextState.activeSubsection = "FreightReports";
            nextState.isReportsOpen = true;
            nextState.isServiceReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/users/clients") {
            nextState.activeSubsection = "ClientReports";
            nextState.isReportsOpen = true;
            nextState.isUserReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/users/service-providers") {
            nextState.activeSubsection = "ServiceProviderReports";
            nextState.isReportsOpen = true;
            nextState.isUserReportsOpen = true;
        } else if (normalizedPath === "/superadmin/reports/users/drivers") {
            nextState.activeSubsection = "DriversReports";
            nextState.isReportsOpen = true;
            nextState.isUserReportsOpen = true;
        } else if (normalizedPath === "/superadmin/models") {
            nextState.activeSubsection = "Models";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/vehicles") {
            nextState.activeSubsection = "Vehicles";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/warehouse") {
            nextState.activeSubsection = "Warehouse";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/models/courier") {
            nextState.activeSubsection = "Courier";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/models/freight") {
            nextState.activeSubsection = "Freight";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/models/ticketbooking") {
            nextState.activeSubsection = "TicketBooking";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/models/multimodel") {
            nextState.activeSubsection = "Multimodel";
            nextState.isModelsOpen = true;
        } else if (normalizedPath === "/superadmin/vendors") {
            nextState.activeSubsection = "Vender";
        } else if (normalizedPath === "/superadmin/account-settings") {
            nextState.activeSubsection = "AccountSettings";
            nextState.isAccountOpen = true;
        } else if (normalizedPath === "/superadmin/support") {
            nextState.activeSubsection = "Support";
        } else if (normalizedPath === "/superadmin/profile") {
            nextState.activeSubsection = "Profile";
            nextState.isAccountOpen = true;
        } else if (normalizedPath === "/superadmin/settings/cancellation") {
            nextState.activeSubsection = "CancellationSettings";
            nextState.isSettingsOpen = true;
        } else if (normalizedPath === "/superadmin/settings/commission") {
            nextState.activeSubsection = "CommissionSettings";
            nextState.isFinanceOpen = true;
        } else if (normalizedPath === "/superadmin/settings/website") {
            nextState.activeSubsection = "WebsiteSettings";
            nextState.isSettingsOpen = true;
        } else if (normalizedPath === "/superadmin/settings/cod-settlement") {
            nextState.activeSubsection = "CodSettlementSettings";
            nextState.isFinanceOpen = true;
            nextState.isModelsOpen = true;
            nextState.isCourierManagementOpen = true;
        } else if (normalizedPath === "/superadmin/payments") {
            nextState.activeSubsection = "Payments";
            nextState.isFinanceOpen = true;
            nextState.isModelsOpen = true;
            nextState.isCourierManagementOpen = true;
        } else if (normalizedPath === "/superadmin/courier-operations" || normalizedPath.startsWith("/superadmin/courier-operations/")) {
            nextState.activeSubsection = "CourierOperations";
            nextState.isModelsOpen = true;
            nextState.isCourierManagementOpen = true;
        } else if (normalizedPath === "/superadmin/pricing-governance" || normalizedPath.startsWith("/superadmin/pricing-governance/")) {
            nextState.activeSubsection = "CourierPricingGovernance";
            nextState.isModelsOpen = true;
            nextState.isCourierManagementOpen = true;
        }

        return nextState;
    }

    const updateSidebarState = (pathname) => {
        const nextSidebarState = getSidebarStateFromPath(pathname);

        setActiveSubsection(nextSidebarState.activeSubsection);
        setIsDashboardOpen(nextSidebarState.isDashboardOpen);
        setIsReportsOpen(nextSidebarState.isReportsOpen);
        setIsServiceReportsOpen(nextSidebarState.isServiceReportsOpen);
        setIsUserReportsOpen(nextSidebarState.isUserReportsOpen);
        setIsCourierManagementOpen(nextSidebarState.isCourierManagementOpen);
        setIsModelsOpen(nextSidebarState.isModelsOpen);
        setIsUsersOpen(nextSidebarState.isUsersOpen);
        setIsSettingsOpen(nextSidebarState.isSettingsOpen);
        setIsFinanceOpen(nextSidebarState.isFinanceOpen);
        setIsAccountOpen(nextSidebarState.isAccountOpen);
    };


    // Update sidebar state on mount and when URL changes
    useEffect(() => {
        updateSidebarState(url);
    }, [url]);

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

    const handleMenuClick = (menu) => {
        setActiveSubsection(menu);

        if (menu === "Dashboard") {
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsUsersOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "Reports") {
            setIsReportsOpen((prev) => !prev); // toggle open/close
            setIsServiceReportsOpen(false);
            setIsUserReportsOpen(false);
            setIsDashboardOpen(false);
            setIsUsersOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "CourierManagement") {
            setIsCourierManagementOpen((prev) => !prev);
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsServiceReportsOpen(false);
            setIsUserReportsOpen(false);
            setIsModelsOpen(true);
            setIsUsersOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "Models") {
            setIsModelsOpen((prev) => !prev); // toggle open/close
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsUsersOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "Users") {
            setIsUsersOpen((prev) => !prev); // toggle open/close
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "Settings") {
            setIsSettingsOpen((prev) => !prev); // toggle open/close
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsUsersOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "Finance") {
            setIsFinanceOpen((prev) => !prev);
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsUsersOpen(false);
            setIsSettingsOpen(false);
            setIsAccountOpen(false);
        } else if (menu === "AccountSettings") {
            setIsAccountOpen((prev) => !prev); // toggle open/close
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsUsersOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
        } else {
            setIsDashboardOpen(false);
            setIsReportsOpen(false);
            setIsCourierManagementOpen(false);
            setIsModelsOpen(false);
            setIsUsersOpen(false);
            setIsSettingsOpen(false);
            setIsFinanceOpen(false);
            setIsAccountOpen(false);
        }
    };

    const actionModalConfig = {
        logout: {
            title: 'Confirm Logout',
            description: 'Are you sure you want to logout? You will need to sign in again to access your dashboard.',
            confirmText: 'Logout',
            confirmClassName: 'bg-red-600 hover:bg-red-700',
        },
    };

    const handleLogout = () => {
        setActionModalState({ isOpen: true, action: 'logout' });
    };

    const handleActionConfirm = () => {
        if (actionModalState.action === 'logout') {
            localStorage.removeItem('adminDashboardLoaded');
            router.post(route('logout'));
        }
        setActionModalState({ isOpen: false, action: null });
    };

    const handleActionCancel = () => {
        setActionModalState({ isOpen: false, action: null });
    };

    return (
        <div className="superadmin-nav-pane w-[300px] min-h-screen sm:w-[250px] md:w-[300px] lg:w-[300px]">
            <div className="flex flex-col gap-0 px-[28px] py-[32px] shadow-lg shadow-[#0105114D] sm:px-4 md:px-[28px] lg:px-[28px]">
                <Link
                    href="/"
                    className="cursor-pointer"
                    onClick={() => handleMenuClick("Dashboard")}
                >
                    <CompanyLogo enableLink={false} className='pb-[20px] h-[120px] object-contain' fallbackClassName='text-white text-[25px] font-bold poppins sm:text-[20px] md:text-[25px] lg:text-[25px]' />
                </Link>

                <button
                    onClick={() => setIsSearchOpen(true)}
                    className="w-[244px] h-[44px] rounded-md px-4 mb-4 bg-[#101A3A] hover:bg-[#182650] transition flex items-center gap-3 sm:w-[200px] md:w-[244px] lg:w-[244px]"
                    title="Search dashboard (Cmd+K)"
                    aria-label="Search super admin dashboard"
                >
                    <Search size={16} className="text-[#6EA8FF]" />
                    <span className="text-[14px] font-[600] text-white">Search Dashboard</span>
                    <span className="ml-auto text-[10px] font-[600] text-[#7D92C6]">Cmd+K</span>
                </button>

                {/* Main Menu */}
                <div className="w-[244px] flex flex-col gap-2 mt-2 sm:w-[200px] md:w-[244px] lg:w-[244px]">
                    {/* Dashboard */}
                    <Link
                        href="/superadmin/dashboard"
                        className={`w-[244px] h-[42px] flex flex-row justify-between items-center gap-5 cursor-pointer rounded-md px-4 sm:w-[200px] md:w-[244px] lg:w-[244px] ${activeSubsection === "Dashboard"
                            ? "bg-[#181A2A]"
                            : "hover:bg-[#181A2A]"
                            }`}
                        onClick={() => handleMenuClick("Dashboard")}
                        onMouseEnter={() => setHoveredSection("Dashboard")}
                        onMouseLeave={() => setHoveredSection(null)}
                        preserveState
                        preserveScroll
                    >
                        <div className="flex flex-row items-center gap-2">
                            <img
                                src={
                                    hoveredSection === "Dashboard" ||
                                        activeSubsection === "Dashboard"
                                        ? homepngW
                                        : homepng
                                }
                                className="size-[14px]"
                            />
                            <h1
                                className={`font-[500] text-[18px] ${activeSubsection === "Dashboard" ||
                                    hoveredSection === "Dashboard"
                                    ? "text-white"
                                    : "text-[#AEB9E1]"
                                    }`}
                            >
                                Dashboard
                            </h1>
                        </div>
                    </Link>

                    {canViewReports && (
                        <>
                            {/* Reports */}
                            <div
                                className={`w-[244px] h-[42px] flex flex-row justify-between items-center gap-5 cursor-pointer rounded-md px-4 sm:w-[200px] md:w-[244px] lg:w-[244px] ${activeSubsection === "Reports" || isReportsOpen
                                    ? "bg-[#181A2A]"
                                    : "hover:bg-[#181A2A]"
                                    }`}
                                onClick={() => handleMenuClick("Reports")}
                                onMouseEnter={() => setHoveredSection("Reports")}
                                onMouseLeave={() => setHoveredSection(null)}
                            >
                                <div className="flex flex-row items-center gap-2">
                                    <img
                                        src={
                                            hoveredSection === "Reports" ||
                                                activeSubsection === "Reports" || isReportsOpen
                                                ? featuresW
                                                : features
                                        }
                                        className="size-[14px]"
                                    />
                                    <h1
                                        className={`font-[500] text-[18px] ${activeSubsection === "Reports" ||
                                            hoveredSection === "Reports" || isReportsOpen
                                            ? "text-white"
                                            : "text-[#AEB9E1]"
                                            }`}
                                    >
                                        Reports
                                    </h1>
                                </div>
                                <img
                                    src={isReportsOpen ? drop : dropl}
                                    className="size-[12px] transition-transform duration-300"
                                    alt={isReportsOpen ? "Collapse" : "Expand"}
                                />
                            </div>

                            {/* Reports Dropdown */}
                            <div
                                className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isReportsOpen
                                    ? "max-h-[900px] opacity-100 py-4"
                                    : "max-h-0 opacity-0 py-0"
                                    }`}
                            >
                                <div
                                    className="flex items-center justify-between cursor-pointer rounded-md px-4 py-2 hover:bg-[#181A2A]"
                                    onClick={() => setIsServiceReportsOpen((prev) => !prev)}
                                >
                                    <div className="text-[12px] font-[600] uppercase tracking-[0.08em] text-[#6E7A9A]">
                                        Service Reports
                                    </div>
                                    <img
                                        src={isServiceReportsOpen ? drop : dropl}
                                        className="size-[12px] transition-transform duration-300"
                                        alt={isServiceReportsOpen ? "Collapse" : "Expand"}
                                    />
                                </div>
                                <div
                                    className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isServiceReportsOpen ? "max-h-[520px] opacity-100 pb-2" : "max-h-0 opacity-0"
                                        }`}
                                >
                                    <Link
                                        href="/superadmin/reports/vehicles"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "VehicleReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "VehicleReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("VehicleReports")}
                                        onMouseEnter={() => setHoveredSection("VehicleReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Vehicle Rental Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/tickets"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "TicketReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "TicketReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("TicketReports")}
                                        onMouseEnter={() => setHoveredSection("TicketReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Ticket Booking Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/warehouse"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "WarehouseReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "WarehouseReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("WarehouseReports")}
                                        onMouseEnter={() => setHoveredSection("WarehouseReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Warehousing Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/multimodal"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "MultimodalReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "MultimodalReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("MultimodalReports")}
                                        onMouseEnter={() => setHoveredSection("MultimodalReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Multimodal Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/courier"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "CourierReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "CourierReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("CourierReports")}
                                        onMouseEnter={() => setHoveredSection("CourierReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Courier Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/freight"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "FreightReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "FreightReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("FreightReports")}
                                        onMouseEnter={() => setHoveredSection("FreightReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Freight Report
                                    </Link>
                                </div>

                                <div
                                    className="mt-2 flex items-center justify-between cursor-pointer rounded-md px-4 py-2 hover:bg-[#181A2A]"
                                    onClick={() => setIsUserReportsOpen((prev) => !prev)}
                                >
                                    <div className="text-[12px] font-[600] uppercase tracking-[0.08em] text-[#6E7A9A]">
                                        User Reports
                                    </div>
                                    <img
                                        src={isUserReportsOpen ? drop : dropl}
                                        className="size-[12px] transition-transform duration-300"
                                        alt={isUserReportsOpen ? "Collapse" : "Expand"}
                                    />
                                </div>
                                <div
                                    className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isUserReportsOpen ? "max-h-[180px] opacity-100 pb-2" : "max-h-0 opacity-0"
                                        }`}
                                >
                                    <Link
                                        href="/superadmin/reports/users/clients"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "ClientReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "ClientReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("ClientReports")}
                                        onMouseEnter={() => setHoveredSection("ClientReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Client Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/users/service-providers"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "ServiceProviderReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "ServiceProviderReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("ServiceProviderReports")}
                                        onMouseEnter={() => setHoveredSection("ServiceProviderReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Service Provider Report
                                    </Link>
                                    <Link
                                        href="/superadmin/reports/users/drivers"
                                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "DriversReports"
                                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                            : hoveredSection === "DriversReports"
                                                ? "text-white bg-[#181A2A] border-l-transparent"
                                                : "text-[#AEB9E1] border-l-transparent"
                                            }`}
                                        onClick={() => setActiveSubsection("DriversReports")}
                                        onMouseEnter={() => setHoveredSection("DriversReports")}
                                        onMouseLeave={() => setHoveredSection(null)}
                                        preserveState
                                        preserveScroll
                                    >
                                        Drivers Report
                                    </Link>
                                </div>
                            </div>

                        </>
                    )}

                    {/* Models */}
                    <div
                        className={`w-[244px] h-[42px] flex flex-row justify-between items-center gap-5 cursor-pointer rounded-md px-4 ${isModelsOpen || isCourierManagementOpen || activeSubsection === "Vehicles" || activeSubsection === "Warehouse" || activeSubsection === "Courier" || activeSubsection === "Freight" || activeSubsection === "TicketBooking" || activeSubsection === "Multimodel" || activeSubsection === "CourierReports" || activeSubsection === "CourierOperations" || activeSubsection === "CourierPricingGovernance" || activeSubsection === "CodSettlementSettings" || activeSubsection === "Payments"
                            ? "bg-[#181A2A]"
                            : "hover:bg-[#181A2A]"
                            }`}
                        onClick={() => handleMenuClick("Models")}
                        onMouseEnter={() => setHoveredSection("Models")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <div className="flex flex-row items-center gap-2">
                            <img
                                src={
                                    hoveredSection === "Models" ||
                                        isModelsOpen ||
                                        isCourierManagementOpen ||
                                        activeSubsection === "Vehicles" ||
                                        activeSubsection === "Warehouse" ||
                                        activeSubsection === "Courier" ||
                                        activeSubsection === "Freight" ||
                                        activeSubsection === "TicketBooking" ||
                                        activeSubsection === "Multimodel" ||
                                        activeSubsection === "CourierReports" ||
                                        activeSubsection === "CourierOperations" ||
                                        activeSubsection === "CourierPricingGovernance" ||
                                        activeSubsection === "CodSettlementSettings" ||
                                        activeSubsection === "Payments"
                                        ? featuresW
                                        : features
                                }
                                className="size-[14px]"
                            />
                            <h1
                                className={`font-[500] text-[18px] ${isModelsOpen ||
                                    isCourierManagementOpen ||
                                    hoveredSection === "Models" ||
                                    activeSubsection === "Vehicles" ||
                                    activeSubsection === "Warehouse" ||
                                    activeSubsection === "Courier" ||
                                    activeSubsection === "Freight" ||
                                    activeSubsection === "TicketBooking" ||
                                    activeSubsection === "Multimodel" ||
                                    activeSubsection === "CourierReports" ||
                                    activeSubsection === "CourierOperations" ||
                                    activeSubsection === "CourierPricingGovernance" ||
                                    activeSubsection === "CodSettlementSettings" ||
                                    activeSubsection === "Payments"
                                    ? "text-white"
                                    : "text-[#AEB9E1]"
                                    }`}
                            >
                                Services
                            </h1>
                        </div>
                        <img
                            src={isModelsOpen ? drop : dropl}
                            className="size-[12px] transition-transform duration-300"
                            alt={isModelsOpen ? "Collapse" : "Expand"}
                        />
                    </div>

                    {/* Models Dropdown */}
                    <div
                        className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isModelsOpen
                            ? "max-h-[760px] opacity-100 py-4"
                            : "max-h-0 opacity-0 py-0"
                            }`}
                    >
                        <Link
                            href="/superadmin/vehicles"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "Vehicles"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "Vehicles"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("Vehicles")}
                            onMouseEnter={() => setHoveredSection("Vehicles")}
                            onMouseLeave={() => setHoveredSection(null)}
                            preserveState
                            preserveScroll
                        >
                            Vehicles
                        </Link>
                        <Link
                            href="/superadmin/warehouse"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "Warehouse"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "Warehouse"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("Warehouse")}
                            onMouseEnter={() => setHoveredSection("Warehouse")}
                            onMouseLeave={() => setHoveredSection(null)}
                            preserveState
                            preserveScroll
                        >
                            Warehouse
                        </Link>

                        {canViewCourierManagement && (
                            <>
                                <div
                                    className={`mt-1 flex items-center justify-between cursor-pointer rounded-md px-4 py-2 border-l-[3px] ${isCourierManagementOpen || activeSubsection === "CourierReports" || activeSubsection === "CodSettlementSettings" || activeSubsection === "Payments" || activeSubsection === "CourierOperations" || activeSubsection === "CourierPricingGovernance"
                                        ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                        : hoveredSection === "CourierManagement"
                                            ? "text-white bg-[#181A2A] border-l-transparent"
                                            : "text-[#AEB9E1] border-l-transparent"
                                        }`}
                                    onClick={() => handleMenuClick("CourierManagement")}
                                    onMouseEnter={() => setHoveredSection("CourierManagement")}
                                    onMouseLeave={() => setHoveredSection(null)}
                                >
                                    <div className="text-[14px] font-[500]">
                                        Courier Management
                                    </div>
                                    <img
                                        src={isCourierManagementOpen ? drop : dropl}
                                        className="size-[12px] transition-transform duration-300"
                                        alt={isCourierManagementOpen ? "Collapse" : "Expand"}
                                    />
                                </div>

                                <div
                                    className={`flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isCourierManagementOpen
                                        ? "max-h-[240px] opacity-100 pb-2"
                                        : "max-h-0 opacity-0"
                                        }`}
                                >
                                    {/* {canViewReports && (
                                        <Link
                                            href="/superadmin/reports/courier"
                                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "CourierReports"
                                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                                : hoveredSection === "CourierReports"
                                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                                    : "text-[#AEB9E1] border-l-transparent"
                                                }`}
                                            onClick={() => setActiveSubsection("CourierReports")}
                                            onMouseEnter={() => setHoveredSection("CourierReports")}
                                            onMouseLeave={() => setHoveredSection(null)}
                                            preserveState
                                            preserveScroll
                                        >
                                            Courier Reports
                                        </Link>
                                    )} */}

                                    {canViewCourierOperations && (
                                        <Link
                                            href="/superadmin/courier-operations"
                                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "CourierOperations"
                                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                                : hoveredSection === "CourierOperations"
                                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                                    : "text-[#AEB9E1] border-l-transparent"
                                                }`}
                                            onClick={() => setActiveSubsection("CourierOperations")}
                                            onMouseEnter={() => setHoveredSection("CourierOperations")}
                                            onMouseLeave={() => setHoveredSection(null)}
                                            preserveState
                                            preserveScroll
                                        >
                                            Operations Control
                                        </Link>
                                    )}

                                    {canViewPricingGovernance && (
                                        <Link
                                            href="/superadmin/pricing-governance"
                                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "CourierPricingGovernance"
                                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                                : hoveredSection === "CourierPricingGovernance"
                                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                                    : "text-[#AEB9E1] border-l-transparent"
                                                }`}
                                            onClick={() => setActiveSubsection("CourierPricingGovernance")}
                                            onMouseEnter={() => setHoveredSection("CourierPricingGovernance")}
                                            onMouseLeave={() => setHoveredSection(null)}
                                            preserveState
                                            preserveScroll
                                        >
                                            Pricing Governance
                                        </Link>
                                    )}

                                    {canViewCodSettlement && (
                                        <Link
                                            href="/superadmin/settings/cod-settlement"
                                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "CodSettlementSettings"
                                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                                : hoveredSection === "CodSettlementSettings"
                                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                                    : "text-[#AEB9E1] border-l-transparent"
                                                }`}
                                            onClick={() => setActiveSubsection("CodSettlementSettings")}
                                            onMouseEnter={() => setHoveredSection("CodSettlementSettings")}
                                            onMouseLeave={() => setHoveredSection(null)}
                                            preserveState
                                            preserveScroll
                                        >
                                            COD Settlement
                                        </Link>
                                    )}

                                    {/* {canViewPayments && (
                                        <Link
                                            href="/superadmin/payments"
                                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "Payments"
                                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                                : hoveredSection === "Payments"
                                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                                    : "text-[#AEB9E1] border-l-transparent"
                                                }`}
                                            onClick={() => setActiveSubsection("Payments")}
                                            onMouseEnter={() => setHoveredSection("Payments")}
                                            onMouseLeave={() => setHoveredSection(null)}
                                        >
                                            Payments
                                        </Link>
                                    )} */}
                                </div>
                            </>
                        )}

                        {/* ❌ COURIER - Hidden by user request
                        <Link
                            href="/SuperAdmin/Models/Courier"
                            className={`text-[14px] font-[500] px-4 py-2 ${
                                activeSubsection === "Courier"
                                    ? "text-white bg-[#181A2A]"
                                    : hoveredSection === "Courier"
                                    ? "text-white bg-[#181A2A]"
                                    : "text-[#AEB9E1]"
                            }`}
                            onClick={() => setActiveSubsection("Courier")}
                            onMouseEnter={() => setHoveredSection("Courier")}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            Courier
                        </Link>
                        */}
                        {/* ❌ FREIGHT - Hidden by user request
                        <Link
                            href="/SuperAdmin/Models/Freight"
                            className={`text-[14px] font-[500] px-4 py-2 ${
                                activeSubsection === "Freight"
                                    ? "text-white bg-[#181A2A]"
                                    : hoveredSection === "Freight"
                                    ? "text-white bg-[#181A2A]"
                                    : "text-[#AEB9E1]"
                            }`}
                            onClick={() => setActiveSubsection("Freight")}
                            onMouseEnter={() => setHoveredSection("Freight")}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            Freight
                        </Link>
                        */}
                        {/* ❌ TICKET BOOKING - Hidden by user request
                        <Link
                            href="/SuperAdmin/Models/TicketBooking"
                            className={`text-[14px] font-[500] px-4 py-2 ${
                                activeSubsection === "TicketBooking"
                                    ? "text-white bg-[#181A2A]"
                                    : hoveredSection === "TicketBooking"
                                    ? "text-white bg-[#181A2A]"
                                    : "text-[#AEB9E1]"
                            }`}
                            onClick={() => setActiveSubsection("TicketBooking")}
                            onMouseEnter={() => setHoveredSection("TicketBooking")}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            Ticket booking
                        </Link>
                        */}
                        {/* ❌ MULTIMODEL - Hidden by user request
                        <Link
                            href="/SuperAdmin/Models/Multimodel"
                            className={`text-[14px] font-[500] px-4 py-2 ${
                                activeSubsection === "Multimodel"
                                    ? "text-white bg-[#181A2A]"
                                    : hoveredSection === "Multimodel"
                                    ? "text-white bg-[#181A2A]"
                                    : "text-[#AEB9E1]"
                            }`}
                            onClick={() => setActiveSubsection("Multimodel")}
                            onMouseEnter={() => setHoveredSection("Multimodel")}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            Multimodel
                        </Link>
                        */}
                    </div>

                    {/* Finance */}
                    <div
                        className={`w-[244px] h-[42px] flex flex-row justify-between items-center gap-5 cursor-pointer rounded-md px-4 sm:w-[200px] md:w-[244px] lg:w-[244px] ${activeSubsection === "Finance"
                            || activeSubsection === "CodSettlementSettings"
                            || activeSubsection === "Payments"
                            || activeSubsection === "CommissionSettings"
                            ? "bg-[#181A2A]"
                            : "hover:bg-[#181A2A]"
                            }`}
                        onClick={() => handleMenuClick("Finance")}
                        onMouseEnter={() => setHoveredSection("Finance")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <div className="flex flex-row items-center gap-2">
                            <img
                                src={pricing}
                                className={`size-[14px] ${hoveredSection === "Finance"
                                    || activeSubsection === "Finance"
                                    || activeSubsection === "CodSettlementSettings"
                                    || activeSubsection === "Payments"
                                    || activeSubsection === "CommissionSettings"
                                    ? "filter brightness-0 invert"
                                    : ""
                                    }`}
                            />
                            <h1
                                className={`font-[500] text-[18px] ${activeSubsection === "Finance"
                                    || hoveredSection === "Finance"
                                    || activeSubsection === "CodSettlementSettings"
                                    || activeSubsection === "Payments"
                                    || activeSubsection === "CommissionSettings"
                                    ? "text-white"
                                    : "text-[#AEB9E1]"
                                    }`}
                            >
                                Finance
                            </h1>
                        </div>
                        <img
                            src={isFinanceOpen ? drop : dropl}
                            className="size-[12px] transition-transform duration-300"
                            alt={isFinanceOpen ? "Collapse" : "Expand"}
                        />
                    </div>

                    {/* Finance Dropdown */}
                    <div
                        className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isFinanceOpen ? "max-h-[260px] opacity-100 py-4" : "max-h-0 opacity-0 py-0"
                            }`}
                    >
                        {canViewCodSettlement && (
                            <Link
                                href="/superadmin/settings/cod-settlement"
                                className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer rounded-md ${activeSubsection === "CodSettlementSettings"
                                    ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                    : hoveredSection === "CodSettlementSettings"
                                        ? "text-white bg-[#181A2A] border-l-transparent"
                                        : "text-[#AEB9E1] border-l-transparent"
                                    }`}
                                onClick={() => setActiveSubsection("CodSettlementSettings")}
                                onMouseEnter={() => setHoveredSection("CodSettlementSettings")}
                                onMouseLeave={() => setHoveredSection(null)}
                            >
                                COD Settlement
                            </Link>
                        )}

                        {canViewPayments && (
                            <Link
                                href="/superadmin/payments"
                                className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer rounded-md ${activeSubsection === "Payments"
                                    ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                    : hoveredSection === "Payments"
                                        ? "text-white bg-[#181A2A] border-l-transparent"
                                        : "text-[#AEB9E1] border-l-transparent"
                                    }`}
                                onClick={() => setActiveSubsection("Payments")}
                                onMouseEnter={() => setHoveredSection("Payments")}
                                onMouseLeave={() => setHoveredSection(null)}
                            >
                                Payments
                            </Link>
                        )}

                        <Link
                            href="/superadmin/settings/commission"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer rounded-md ${activeSubsection === "CommissionSettings"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "CommissionSettings"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("CommissionSettings")}
                            onMouseEnter={() => setHoveredSection("CommissionSettings")}
                            onMouseLeave={() => setHoveredSection(null)}
                        >
                            Commission Settings
                        </Link>
                    </div>

                    {/* Users */}
                    <div
                        className={`w-[244px] h-[42px] flex flex-row justify-between items-center gap-5 cursor-pointer rounded-md px-4 sm:w-[200px] md:w-[244px] lg:w-[244px] ${activeSubsection === "Users" || isUsersOpen
                            ? "bg-[#181A2A]"
                            : "hover:bg-[#181A2A]"
                            }`}
                        onClick={() => handleMenuClick("Users")}
                        onMouseEnter={() => setHoveredSection("Users")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <div className="flex flex-row items-center gap-2">
                            <img
                                src={
                                    hoveredSection === "Users" ||
                                        activeSubsection === "Users" || isUsersOpen
                                        ? usersW
                                        : users
                                }
                                className="size-[14px]"
                            />
                            <h1
                                className={`font-[500] text-[18px] ${activeSubsection === "Users" ||
                                    hoveredSection === "Users" || isUsersOpen
                                    ? "text-white"
                                    : "text-[#AEB9E1]"
                                    }`}
                            >
                                Users
                            </h1>
                        </div>
                        <img
                            src={isUsersOpen ? drop : dropl}
                            className="size-[12px] transition-transform duration-300"
                            alt={isUsersOpen ? "Collapse" : "Expand"}
                        />
                    </div>

                    {/* Users Dropdown */}
                    <div
                        className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isUsersOpen
                            ? "max-h-[200px] opacity-100 py-4"
                            : "max-h-0 opacity-0 py-0"
                            }`}
                    >
                        <Link
                            href="/superadmin/users/clients"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "Clients"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "Clients"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("Clients")}
                            onMouseEnter={() => setHoveredSection("Clients")}
                            onMouseLeave={() => setHoveredSection(null)}
                            preserveState
                            preserveScroll
                        >
                            Clients
                        </Link>
                        <Link
                            href="/superadmin/users/service-providers"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "ServiceProviders"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "ServiceProviders"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("ServiceProviders")}
                            onMouseEnter={() => setHoveredSection("ServiceProviders")}
                            onMouseLeave={() => setHoveredSection(null)}
                            preserveState
                            preserveScroll
                        >
                            Service Providers
                        </Link>
                        <Link
                            href="/superadmin/users/drivers"
                            className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer ${activeSubsection === "Drivers"
                                ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                                : hoveredSection === "Drivers"
                                    ? "text-white bg-[#181A2A] border-l-transparent"
                                    : "text-[#AEB9E1] border-l-transparent"
                                }`}
                            onClick={() => setActiveSubsection("Drivers")}
                            onMouseEnter={() => setHoveredSection("Drivers")}
                            onMouseLeave={() => setHoveredSection(null)}
                            preserveState
                            preserveScroll
                        >
                            Drivers
                        </Link>
                    </div>

                    {/* Vender */}
                    {/* <Link
                        href="/superadmin/Vender"
                        className={`w-[244px] h-[42px] flex flex-row justify-between items-center cursor-pointer px-4 ${
                            activeSubsection === "Vender"
                                ? "bg-[#181A2A] rounded-[10px]"
                                : "hover:bg-[#181A2A] hover:rounded-[10px]"
                        }`}
                        onClick={() => handleMenuClick("Vender")}
                        onMouseEnter={() => setHoveredSection("Vender")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <div className="flex flex-row items-center gap-2">
                            <img
                                src={
                                    hoveredSection === "Vender" ||
                                    activeSubsection === "Vender"
                                        ? usersW
                                        : users
                                }
                                className="size-[14px]"
                            />
                            <h1
                                className={`font-[500] text-[18px] ${
                                    activeSubsection === "Vender" ||
                                    hoveredSection === "Vender"
                                        ? "text-white"
                                        : "text-[#AEB9E1]"
                                }`}
                            >
                                Vender
                            </h1>
                        </div> */}
                    {/* <img src={dropl} className="size-[12px]" /> */}
                    {/* </Link> */}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="h-[1px] w-full bg-white/20"></div>
            <div className="px-[28px] sm:px-4 md:px-[28px] lg:px-[28px]">
                {/* Support Inbox: client and vendor threads addressed to the platform team */}
                <Link
                    href="/superadmin/support"
                    className={`w-full h-[42px] flex flex-row justify-between items-center px-4 mt-[15px] cursor-pointer rounded-md ${
                        activeSubsection === "Support" ? "bg-[#181A2A]" : "hover:bg-[#181A2A]"
                    }`}
                    onClick={() => setActiveSubsection("Support")}
                    onMouseEnter={() => setHoveredSection("Support")}
                    onMouseLeave={() => setHoveredSection(null)}
                >
                    <div className="flex flex-row items-center gap-2">
                        <Headset
                            className={`size-[16px] ${
                                activeSubsection === "Support" || hoveredSection === "Support" ? "text-white" : "text-[#AEB9E1]"
                            }`}
                        />
                        <h1
                            className={`font-[500] text-[18px] ${
                                activeSubsection === "Support" || hoveredSection === "Support" ? "text-white" : "text-[#AEB9E1]"
                            }`}
                        >
                            Support Inbox
                        </h1>
                    </div>
                    {supportUnread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#0E43FB] text-white text-[11px] font-[700] flex items-center justify-center">
                            {supportUnread > 99 ? "99+" : supportUnread}
                        </span>
                    )}
                </Link>

                {/* Settings */}
                <div
                    className={`w-full h-[42px] flex flex-row justify-between items-center px-4 my-[15px] cursor-pointer rounded-md ${activeSubsection === "Settings"
                        || activeSubsection === "CancellationSettings"
                        || activeSubsection === "WebsiteSettings"
                        ? "bg-[#181A2A]"
                        : "hover:bg-[#181A2A]"
                        }`}
                    onClick={() => handleMenuClick("Settings")}
                    onMouseEnter={() => setHoveredSection("Settings")}
                    onMouseLeave={() => setHoveredSection(null)}
                >
                    <div className="flex flex-row items-center gap-2">
                        <img
                            src={settings}
                            className={`size-[14px] ${hoveredSection === "Settings"
                                || activeSubsection === "Settings"
                                || activeSubsection === "CancellationSettings"
                                || activeSubsection === "WebsiteSettings"
                                ? "filter brightness-0 invert"
                                : ""
                                }`}
                        />
                        <h1
                            className={`font-[500] text-[18px] ${activeSubsection === "Settings"
                                || hoveredSection === "Settings"
                                || activeSubsection === "CancellationSettings"
                                || activeSubsection === "WebsiteSettings"
                                ? "text-white"
                                : "text-[#AEB9E1]"
                                }`}
                        >
                            Settings
                        </h1>
                    </div>
                    <img
                        src={isSettingsOpen ? drop : dropl}
                        className="size-[12px] transition-transform duration-300"
                        alt={isSettingsOpen ? "Collapse" : "Expand"}
                    />
                </div>

                {/* Settings Dropdown */}
                <div
                    className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isSettingsOpen ? "max-h-[220px] opacity-100 py-4" : "max-h-0 opacity-0 py-0"
                        }`}
                >
                    <Link
                        href="/superadmin/settings/cancellation"
                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer rounded-md ${activeSubsection === "CancellationSettings"
                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                            : hoveredSection === "CancellationSettings"
                                ? "text-white bg-[#181A2A] border-l-transparent"
                                : "text-[#AEB9E1] border-l-transparent"
                            }`}
                        onClick={() => setActiveSubsection("CancellationSettings")}
                        onMouseEnter={() => setHoveredSection("CancellationSettings")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        Cancellation Settings
                    </Link>

                    <Link
                        href="/superadmin/settings/website"
                        className={`text-[14px] font-[500] px-4 py-2 border-l-[3px] cursor-pointer rounded-md ${activeSubsection === "WebsiteSettings"
                            ? "text-white border-l-[#0955AC] bg-[#181A2A] border border-[#0A1330]"
                            : hoveredSection === "WebsiteSettings"
                                ? "text-white bg-[#181A2A] border-l-transparent"
                                : "text-[#AEB9E1] border-l-transparent"
                            }`}
                        onClick={() => setActiveSubsection("WebsiteSettings")}
                        onMouseEnter={() => setHoveredSection("WebsiteSettings")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        Website Settings
                    </Link>
                </div>

                {/* Account Settings */}
                <div
                    className={`w-full h-[42px] flex flex-row justify-between items-center px-4 my-[15px] cursor-pointer rounded-md ${activeSubsection === "AccountSettings" ? "bg-[#181A2A]" : "hover:bg-[#181A2A]"
                        }`}
                    onClick={() => handleMenuClick("AccountSettings")}
                    onMouseEnter={() => setHoveredSection("AccountSettings")}
                    onMouseLeave={() => setHoveredSection(null)}
                >
                    <div className="flex flex-row items-center gap-2">
                        <img src={person} className="size-[30px]" alt="User Avatar" />
                        <h1
                            className={`flex flex-col text-[18px] font-[500] ${activeSubsection === "AccountSettings" || hoveredSection === "AccountSettings"
                                ? "text-white"
                                : "text-[#AEB9E1]"
                                }`}
                        >
                            Jhone Carter
                            {/* <span
                                className={`text-[10px] ${
                                    activeSubsection === "AccountSettings" || hoveredSection === "AccountSettings"
                                        ? "text-white"
                                        : "text-[#AEB9E1]"
                                }`}
                            >
                                Account Settings
                            </span> */}
                        </h1>
                    </div>
                    <img
                        src={isAccountOpen ? drop : dropl}
                        className="size-[12px] transition-transform duration-300"
                        alt={isAccountOpen ? "Collapse" : "Expand"}
                    />
                </div>

                {/* Account Settings Dropdown */}
                <div
                    className={`flex flex-col gap-2 px-[8px] transition-all duration-300 ease-in-out overflow-hidden ${isAccountOpen ? "max-h-[200px] opacity-100 py-4" : "max-h-0 opacity-0 py-0"
                        }`}
                >
                    {/* Profile Link */}
                    <Link
                        href="/superadmin/profile"
                        className={`text-[14px] font-[500] px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 ${activeSubsection === "Profile"
                            ? "text-white bg-[#181A2A]"
                            : hoveredSection === "Profile"
                                ? "text-white bg-[#181A2A]"
                                : "text-[#AEB9E1]"
                            }`}
                        onMouseEnter={() => setHoveredSection("Profile")}
                        onMouseLeave={() => setHoveredSection(null)}
                        preserveState
                        preserveScroll
                    >
                        <img
                            src={person}
                            className="size-[12px]"
                            alt="Profile Icon"
                        />
                        <span>Profile</span>
                    </Link>

                    {/* Logout Link */}
                    <div
                        className={`text-[14px] font-[500] px-4 py-2 rounded-md cursor-pointer flex items-center gap-2 ${hoveredSection === "Logout"
                            ? "text-red-600 bg-[#181A2A]"
                            : "text-[#AEB9E1]"
                            }`}
                        onClick={handleLogout}
                        onMouseEnter={() => setHoveredSection("Logout")}
                        onMouseLeave={() => setHoveredSection(null)}
                    >
                        <img
                            src={hoveredSection === "Logout" ? LogoutR : LogoutB}
                            className="size-[12px]"
                            alt="Logout Icon"
                        />
                        <span>Logout</span>
                    </div>
                </div>
            </div>

            <DashboardSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                items={superAdminSearchItems}
                title="Search Super Admin Dashboard"
                placeholder="Search reports, finance, services, users, and settings"
                emptyStateMessage="No super admin dashboard destination matched your query."
            />

            {/* Action Modal Template */}
            <AnimatePresence>
                {actionModalState.isOpen && (
                    <ActionModalTemplate
                        title={actionModalConfig[actionModalState.action]?.title}
                        description={actionModalConfig[actionModalState.action]?.description}
                        confirmText={actionModalConfig[actionModalState.action]?.confirmText}
                        confirmClassName={actionModalConfig[actionModalState.action]?.confirmClassName}
                        onConfirm={handleActionConfirm}
                        onClose={handleActionCancel}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SideMenu;
