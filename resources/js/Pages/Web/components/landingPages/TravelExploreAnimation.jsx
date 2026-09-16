import React, { useEffect, useState } from "react";

import { motion } from "framer-motion";
import CompanyLogo from "../CompanyLogo";

import img1 from "../../assets/landingPages/hero/landvehiclerental.jpg";
import img2 from "../../assets/landingPages/hero/seavehiclebooking.jpg";
import img3 from "../../assets/landingPages/hero/airvehiclerental.jpg";
import img4 from "../../assets/landingPages/hero/warehouse.jpg";
import img5 from "../../assets/landingPages/hero/freight.jpg";
import img6 from "../../assets/landingPages/hero/multimodel.jpg";
import img7 from "../../assets/landingPages/hero/ticketbooking.jpg";
import img8 from "../../assets/courierService/courier.jpg";
import bg from "../../assets/landingPages/indexbg.png";

import burgerIcon from "../../assets/landingPages/burgerIcon.svg";
import { Link } from "@inertiajs/react";

const IMAGES = [
    {
        statusLabel: "AVAILABLE",
        title: "Courier",
        subtitle: "Fast & Reliable Delivery",
        description:
            "Send packages, documents, and parcels through domestic or international routes with our trusted courier network. Real-time tracking and secure delivery options.",
        ctaLabel: "Book Courier",
        href: "/couriers/create",
        url: img8,
        tags: ["Courier", "Delivery", "Tracking"],
    },
    {
        statusLabel: "AVAILABLE",
        title: "Vehicle Rental",
        subtitle: "Cars, vans, boats and aircraft",
        description:
            "Rent vehicles across land, sea, and air for personal and business travel needs.",
        ctaLabel: "Book Vehicle",
        href: "/multiModel/plan-journey?tab=rental",
        url: img1,
        tags: ["Vehicle", "Rental", "Transport"],
    },
    {
        statusLabel: "AVAILABLE",
        title: "Ticket Booking",
        subtitle: "Bus, train and flight tickets",
        description:
            "Book tickets across land and air routes with reliable schedules and easy reservation flow.",
        ctaLabel: "Book Ticket",
        href: "/multiModel/plan-journey?tab=ticket",
        url: img7,
        tags: ["Train", "Bus", "Flight"],
    },
    {
        statusLabel: "AVAILABLE",
        title: "Warehousing",
        subtitle: "Storage & Fulfillment",
        description:
            "Find warehousing solutions for goods storage, inventory management, and distribution. Flexible space and integrated logistics support.",
        ctaLabel: "Find Warehouses",
        href: "/warehouseList",
        url: img4,
        tags: ["Warehouse", "Storage", "Fulfillment"],
    },
    {
        statusLabel: "AVAILABLE",
        title: "Freight",
        subtitle: "Bulk Cargo Movement",
        description:
            "Arrange freight shipping for large or bulk goods via road, sea, or air. Track shipments and optimize your supply chain.",
        ctaLabel: "Ship Freight",
        href: "/ffreight",
        url: img5,
        tags: ["Freight", "Shipping", "Logistics"],
    },
];

const SERVICES = [
    { statusLabel: "AVAILABLE", title: "Courier Booking", subtitle: "Local & international parcels", href: "/couriers/create", img: img8 },
    {
        statusLabel: "AVAILABLE",
        title: "Vehicle Rental",
        subtitle: "Cars, vans & trucks",
        img: img1,
        sub: [
            { title: "Land Vehicle", subtitle: "Cars, buses & trucks", href: "/vehicleList", img: img1 },
            { title: "Sea Vehicle", subtitle: "Boats & ships", href: "/seaVehicleList", img: img2 },
            { title: "Air Vehicle", subtitle: "Helicopters & planes", href: "/airVehicleList", img: img3 },
        ],
    },
    {
        statusLabel: "AVAILABLE",
        title: "Ticket Booking",
        subtitle: "Land, air & sea tickets",
        img: img7,
        sub: [
            { title: "Bus Ticket", subtitle: "Book bus tickets", href: "/busTicketBookingDetails", img: img1 },
            { title: "Train Ticket", subtitle: "Book train tickets", href: "/trainTicketBookingDetails", img: img2 },
            { title: "Flight Ticket", subtitle: "Book air tickets", href: "/ticketBooking?type=flight", img: img3 },
        ],
    },
    { statusLabel: "AVAILABLE", title: "Multimodal", subtitle: "Combined transport", href: "/multiModel/plan-journey?tab=multimodal", img: img6 },
    { statusLabel: "AVAILABLE", title: "Warehouse Booking", subtitle: "Storage & fulfillment", href: "/warehouseList", img: img4 },
    { statusLabel: "AVAILABLE", title: "Freight", subtitle: "Bulk cargo shipments", href: "/freight-home", img: img5 },
];

const TravelExploreAnimation = ({ auth }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [hoveredCard, setHoveredCard] = useState(null);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
    const [hoveredService, setHoveredService] = useState(null);
    const [mobileSubService, setMobileSubService] = useState(null);
    const [isMobileViewport, setIsMobileViewport] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 1279px)");
        const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

        updateViewport();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", updateViewport);
            return () => mediaQuery.removeEventListener("change", updateViewport);
        }

        mediaQuery.addListener(updateViewport);
        return () => mediaQuery.removeListener(updateViewport);
    }, []);

    useEffect(() => {
        if (!isMobileViewport && menuOpen) {
            setMenuOpen(false);
        }
    }, [isMobileViewport, menuOpen]);

    const user = auth?.user;
    const userRole = user?.role;
    const userStatus =
        typeof user?.status === "string" ? user.status.toLowerCase() : "";
    const isVendor = userRole === "vendor";
    const isVendorVerified = isVendor && userStatus === "verified";
    const isClient = userRole === "client";
    const isSuperAdmin = userRole === "SuperAdmin";

    const handleScroll = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
            setMenuOpen(false);
        }
    };

    const desktopNavItemClass = "relative h-8 flex items-center justify-center cursor-pointer px-1 opacity-90 hover:opacity-100 transition-opacity after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-white after:scale-x-0 hover:after:scale-x-100 after:origin-center after:transition-transform after:duration-200";

    return (
        <div className="bg-gray-900">
            <div className="relative min-h-screen w-full flex flex-col justify-center items-center">
                {/* Dynamic Background */}
                <div className="absolute inset-0">
                    <img
                        src={bg}
                        alt="Default background"
                        className="w-full h-full object-cover"
                    />
                    {IMAGES.map((item, i) => (
                        <motion.div
                            key={i}
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: hoveredCard === i ? 1 : 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <img
                                src={item.url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                    ))}
                </div>
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
                {/* Dropdown blur overlay */}
                <div
                    className="absolute inset-0 z-[50] pointer-events-none transition-all duration-300"
                    style={{
                        backdropFilter: servicesOpen ? "blur(1px)" : "blur(0px)",
                        WebkitBackdropFilter: servicesOpen ? "blur(1px)" : "blur(0px)",
                        backgroundColor: servicesOpen ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
                    }}
                />

                {/* NAVBAR */}
                <div className="absolute inset-x-0 top-0 xl:left-0 z-[60] pointer-events-none">
                    <div className="pointer-events-auto">
                        <div className="bg-transparent">
                            {/* Desktop */}
                            <div className="hidden xl:grid grid-cols-[1fr_auto_1fr] items-center px-10 py-5 gap-4">
                                <div className="pb-[40px]">
                                    <CompanyLogo className="h-[50px] lg:h-[60px] xl:h-[80px] object-contain" />
                                </div>
                                <div className="uppercase leading-tight flex flex-row gap-5 xl:text-[17px] text-[10px] font-[400] text-white justify-self-center">
                                    <div
                                        className={desktopNavItemClass}
                                        onClick={() => handleScroll("home")}
                                    >
                                        Home
                                    </div>
                                    <div
                                        className={desktopNavItemClass}
                                        onClick={() => handleScroll("about")}
                                    >
                                        About Us
                                    </div>
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setServicesOpen(true)}
                                        onMouseLeave={() => setServicesOpen(false)}
                                    >
                                        <div
                                            className={desktopNavItemClass}
                                            onTouchStart={(e) => { e.preventDefault(); setServicesOpen(prev => !prev); }}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                Services
                                                <svg
                                                    className={`w-3 h-3 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </span>
                                        </div>

                                        {/* Dropdown */}
                                        {servicesOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute left-1/2 top-full -translate-x-1/2 w-64 z-[70] pt-3"
                                            >
                                                <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl">
                                                    {SERVICES.map((service, i) => (
                                                        <div
                                                            key={i}
                                                            className="relative"
                                                            onMouseEnter={() => setHoveredService(i)}
                                                            onMouseLeave={() => setHoveredService(null)}
                                                        >
                                                            {(() => {
                                                                const isServiceAvailable = service.statusLabel === "AVAILABLE";

                                                                return (
                                                                    <a
                                                                        href={!isServiceAvailable || service.sub ? undefined : service.href}
                                                                        onClick={(!isServiceAvailable || service.sub) ? (e) => e.preventDefault() : undefined}
                                                                        className={`relative overflow-hidden flex items-center gap-3 px-4 py-3 text-white transition-all duration-200 border-b border-white/10 last:border-0 ${isServiceAvailable ? "hover:bg-white/20 cursor-pointer" : "cursor-not-allowed"}`}
                                                                    >
                                                                        <img
                                                                            src={service.img}
                                                                            alt={service.title}
                                                                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <p className="text-sm font-semibold leading-tight">{service.title}</p>
                                                                                {service.statusLabel === "COMING SOON" && (
                                                                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] border border-white/25 bg-black/60 text-white/85">
                                                                                        {service.statusLabel}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-white/70 leading-tight mt-0.5">{service.subtitle}</p>
                                                                        </div>
                                                                        {service.sub && (
                                                                            <svg className="w-3 h-3 text-white/70 flex-shrink-0 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                            </svg>
                                                                        )}
                                                                        {!isServiceAvailable && (
                                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                                <span className="px-3 py-1 rounded-full border border-white/30 bg-black/70 text-white text-[10px] font-semibold tracking-[0.16em]">
                                                                                    COMING SOON
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </a>
                                                                );
                                                            })()}
                                                            {/* Sub-dropdown flyout */}
                                                            {service.sub && hoveredService === i && service.statusLabel === "AVAILABLE" && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, x: -6 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="absolute left-full top-0 w-56 pl-2 z-[80]"
                                                                >
                                                                    <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
                                                                        {service.sub.map((sub, j) => (
                                                                            <a
                                                                                key={j}
                                                                                href={sub.href}
                                                                                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/20 transition-all duration-200 border-b border-white/10 last:border-0"
                                                                            >
                                                                                <img
                                                                                    src={sub.img}
                                                                                    alt={sub.title}
                                                                                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                                                                />
                                                                                <div>
                                                                                    <p className="text-sm font-semibold leading-tight">{sub.title}</p>
                                                                                    <p className="text-xs text-white/70 leading-tight mt-0.5">{sub.subtitle}</p>
                                                                                </div>
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                    <div
                                        className={desktopNavItemClass}
                                        onClick={() => handleScroll("blog")}
                                    >
                                        Blog
                                    </div>
                                    <div
                                        className={desktopNavItemClass}
                                        onClick={() => handleScroll("contact")}
                                    >
                                        Contact Us
                                    </div>
                                </div>

                                <div className="flex flex-row gap-5 xl:text-[17px] text-[10px] font-[700] justify-self-end">
                                    {user ? (
                                        <>
                                            {isVendor &&
                                                (isVendorVerified ? (
                                                    <Link
                                                        href="/vendorAllBookings"
                                                        className="h-[44px] px-6 rounded-[100px] bg-[#FF7003] hover:bg-[#ff7e1f] flex items-center text-white text-[16px] font-semibold"
                                                    >
                                                        Dashboard
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        href="/approval-pending"
                                                        className="h-[44px] px-6 rounded-[100px] bg-[#FF7003] hover:bg-[#ff7e1f] flex items-center text-white text-[16px] font-semibold"
                                                    >
                                                        Dashboard
                                                    </Link>
                                                ))}
                                            {isClient && (
                                                <Link
                                                    href="/clientAllBookings"
                                                    className="h-[44px] px-6 rounded-[100px] bg-[#FF7003] hover:bg-[#ff7e1f] flex items-center text-white text-[16px] font-semibold"
                                                >
                                                    Dashboard
                                                </Link>
                                            )}
                                            {isSuperAdmin && (
                                                <Link
                                                    href="/superadmin/dashboard"
                                                    className="h-[44px] px-6 rounded-[100px] bg-[#FF7003] hover:bg-[#ff7e1f] flex items-center text-white text-[16px] font-semibold"
                                                >
                                                    Dashboard
                                                </Link>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="min-w-[150px] h-[44px] bg-[#FF7003] border border-[#FF7003] rounded-[100px] flex justify-center items-center px-6 cursor-pointer text-white"
                                                onClick={() =>
                                                (window.location.href =
                                                    "/signin")
                                                }
                                            >
                                                Login
                                            </div>
                                            <div
                                                className="min-w-[170px] h-[44px] text-[#FF7003] border border-[#FF7003] rounded-[100px] flex justify-center items-center cursor-pointer bg-black/20 px-6"
                                                onClick={() =>
                                                (window.location.href =
                                                    "/signup")
                                                }
                                            >
                                                Register
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Mobile */}
                            {isMobileViewport && (
                                <div className="xl:hidden px-4 py-3 flex justify-between items-center">
                                    <div className="text-white text-base order-2 uppercase font-[700]">
                                        <CompanyLogo className="h-[40px] sm:h-[50px] object-contain" fallbackClassName="text-white text-base uppercase font-[700]" />
                                    </div>
                                    <div
                                        className="size-[30px] flex justify-center items-center cursor-pointer order-1"
                                        onClick={() => setMenuOpen(true)}
                                    >
                                        <span className="text-white text-2xl">
                                            ☰
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Sidebar */}
                        {isMobileViewport && menuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 bg-black bg-opacity-40 z-40"
                                    onClick={() => setMenuOpen(false)}
                                />
                                <div className="fixed top-0 left-0 h-full w-64 bg-[#000000] z-50 shadow-lg flex flex-col p-6 overflow-y-auto">
                                    <div className="flex justify-end mb-6">
                                        <button
                                            className="text-white text-2xl"
                                            onClick={() => setMenuOpen(false)}
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-4 text-white text-[17px] font-[400]">
                                        <div
                                            className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                                            onClick={() => handleScroll("home")}
                                        >
                                            Home
                                        </div>
                                        <div
                                            className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                                            onClick={() =>
                                                handleScroll("about")
                                            }
                                        >
                                            About Us
                                        </div>
                                        <div className="border-b border-[#FFFFFF91]">
                                            <div
                                                className="py-2 cursor-pointer flex justify-between items-center"
                                                onClick={() => setMobileServicesOpen(prev => !prev)}
                                            >
                                                <span>Services</span>
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${mobileServicesOpen ? "rotate-180" : ""}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {mobileServicesOpen && (
                                                <div className="pb-2 flex flex-col gap-0.5">
                                                    {SERVICES.map((service, i) => (
                                                        <div key={i}>
                                                            {service.sub ? (
                                                                <>
                                                                    <div
                                                                        className={`flex justify-between items-center px-3 py-2 rounded-xl transition-all duration-200 ${service.statusLabel === "AVAILABLE" ? "hover:bg-white/10 active:bg-white/20 cursor-pointer" : "cursor-not-allowed opacity-75"}`}
                                                                        onClick={() => service.statusLabel === "AVAILABLE" && setMobileSubService(mobileSubService === i ? null : i)}
                                                                    >
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-semibold leading-tight">{service.title}</p>
                                                                                {service.statusLabel === "COMING SOON" && (
                                                                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] border border-white/25 bg-black/60 text-white/85">
                                                                                        {service.statusLabel}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-white/60 leading-tight mt-0.5">{service.subtitle}</p>
                                                                        </div>
                                                                        <svg
                                                                            className={`w-3.5 h-3.5 text-white/70 flex-shrink-0 transition-transform duration-200 ${mobileSubService === i ? "rotate-180" : ""}`}
                                                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                                        >
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                    </div>
                                                                    {mobileSubService === i && service.statusLabel === "AVAILABLE" && (
                                                                        <div className="ml-4 mb-1 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                                                                            {service.sub.map((sub, j) => (
                                                                                <a
                                                                                    key={j}
                                                                                    href={sub.href}
                                                                                    className="flex flex-col py-1.5 hover:text-white/80 transition-colors duration-200"
                                                                                >
                                                                                    <p className="text-sm font-medium leading-tight">{sub.title}</p>
                                                                                    <p className="text-xs text-white/50 leading-tight mt-0.5">{sub.subtitle}</p>
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <a
                                                                    href={service.statusLabel === "AVAILABLE" ? service.href : undefined}
                                                                    onClick={service.statusLabel !== "AVAILABLE" ? (e) => e.preventDefault() : undefined}
                                                                    className={`flex flex-col px-3 py-2 rounded-xl transition-all duration-200 ${service.statusLabel === "AVAILABLE" ? "hover:bg-white/10 active:bg-white/20" : "cursor-not-allowed opacity-75"}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-semibold leading-tight">{service.title}</p>
                                                                        {service.statusLabel === "COMING SOON" && (
                                                                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] border border-white/25 bg-black/60 text-white/85">
                                                                                {service.statusLabel}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-white/60 leading-tight mt-0.5">{service.subtitle}</p>
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                                            onClick={() => handleScroll("blog")}
                                        >
                                            Blog
                                        </div>
                                        <div
                                            className="border-b border-[#FFFFFF91] py-2 cursor-pointer"
                                            onClick={() =>
                                                handleScroll("contact")
                                            }
                                        >
                                            Contact Us
                                        </div>
                                    </div>
                                    <div className="mt-6 flex flex-row gap-3">
                                        {user ? (
                                            <>
                                                {isVendor &&
                                                    (isVendorVerified ? (
                                                        <Link
                                                            href="/vendorAllBookings"
                                                            className="bg-yellow-600 px-3 py-2 rounded text-white text-[12px] font-medium"
                                                        >
                                                            Dashboard
                                                        </Link>
                                                    ) : (
                                                        <Link
                                                            href="/approval-pending"
                                                            className="bg-orange-600 px-3 py-2 rounded text-white text-[12px] font-medium"
                                                        >
                                                            Dashboard
                                                        </Link>
                                                    ))}
                                                {isClient && (
                                                    <Link
                                                        href="/clientAllBookings"
                                                        className="bg-yellow-600 px-3 py-2 rounded text-white text-[12px] font-medium"
                                                    >
                                                        Dashboard
                                                    </Link>
                                                )}
                                                {isSuperAdmin && (
                                                    <Link
                                                        href="/superadmin/dashboard"
                                                        className="bg-yellow-600 px-3 py-2 rounded text-white text-[12px] font-medium"
                                                    >
                                                        Dashboard
                                                    </Link>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    className="bg-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer text-white"
                                                    onClick={() =>
                                                    (window.location.href =
                                                        "/signin")
                                                    }
                                                >
                                                    Login
                                                </div>
                                                <div
                                                    className="text-[#FF7003] border-[1.2px] border-[#FF7003] rounded-[100px] flex justify-center items-center px-4 py-2 cursor-pointer"
                                                    onClick={() =>
                                                    (window.location.href =
                                                        "/signup")
                                                    }
                                                >
                                                    Register
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative z-20 mt-20 sm:mt-[150px] text-center px-4">
                    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <span className="h-px w-10 sm:w-16 bg-white" />
                        <div className="text-white text-[8px] sm:text-[15px] tracking-[0.5em] uppercase leading-none">
                            Land. Sea. Air.
                        </div>
                        <span className="h-px w-10 sm:w-16 bg-white" />
                    </div>
                    <h1 className="uppercase leading-[0.95] font-extrabold text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl drop-shadow-[0_0_14px_rgba(255,112,3,2)]">
                        BEYOND
                        <span className="text-[#FF7003] mt-1 drop-shadow-[0_0_14px_rgba(255,112,3,0.1)]"> EVERYTHING</span>
                    </h1>
                </div>

                {/* Services Cards Grid */}
                <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 sm:pt-8 sm:pb-24 md:pt-10 md:pb-32 mt-6 sm:mt-8 md:mt-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        {IMAGES.map((item, i) => {
                            const isAvailable = item.statusLabel === "AVAILABLE";

                            return (
                                <motion.a
                                    key={i}
                                    href={isAvailable ? item.href : undefined}
                                    aria-disabled={!isAvailable}
                                    onClick={!isAvailable ? (e) => e.preventDefault() : undefined}
                                    className={`group relative w-full max-w-[270px] mx-auto rounded-2xl overflow-hidden shadow-2xl ${isAvailable
                                        ? "cursor-pointer"
                                        : "cursor-not-allowed pointer-events-none"
                                        }`}
                                    whileHover={isAvailable ? { scale: 1.08 } : undefined}
                                    whileTap={isAvailable ? { scale: 1.05 } : undefined}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20,
                                    }}
                                    onMouseEnter={() => isAvailable && setHoveredCard(i)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onTouchStart={() => isAvailable && setHoveredCard(i)}
                                    onTouchEnd={() => setTimeout(() => setHoveredCard(0), 300)}
                                >
                                    <div className="relative h-[320px] sm:h-[340px] md:h-[360px] w-full bg-[#0b0d10]">
                                        <img
                                            src={item.url}
                                            alt={item.title}
                                            className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable
                                                ? "group-hover:scale-110"
                                                : "brightness-[0.65] saturate-[0.7]"
                                                }`}
                                            draggable={false}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                        {!isAvailable && (
                                            <div className="absolute inset-0 " />
                                        )}

                                        <div className="absolute left-3 top-3 z-10">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${item.statusLabel === "AVAILABLE"
                                                    ? "border border-[#FF7003]/70 bg-[#FF7003] text-white"
                                                    : "border border-white/25 bg-black/70 text-white/90"
                                                    }`}
                                            >
                                                {item.statusLabel}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-4">
                                            <div
                                                className={`rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 ${isAvailable
                                                    ? "bg-white/20 backdrop-blur-lg border-white/30 group-hover:bg-white/30 group-hover:border-white/50"
                                                    : "bg-black/55 border-white/20"
                                                    }`}
                                            >
                                                <h3 className="text-white font-bold text-base sm:text-lg mb-1 sm:mb-1.5 uppercase tracking-wide">
                                                    {item.title}
                                                </h3>
                                                <p className="text-white/90 text-xs mb-2 sm:mb-2.5">
                                                    {item.subtitle}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.tags.slice(0, 3).map((tag, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white border border-white/50"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TravelExploreAnimation;
