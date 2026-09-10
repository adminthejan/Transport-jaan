import React from "react";
import { Link } from "@inertiajs/react";
import {
    Car as CarIcon,
    Route as RouteIcon,
    Ticket as TicketIcon,
    Ship as ShipIcon,
    Plane as PlaneIcon,
    Bus as BusIcon,
    TrainFront as TrainIcon,
} from "lucide-react";

const TOP_TABS = [
    { key: "rental", label: "Vehicle Rental", href: "/vehicleList", icon: CarIcon },
    { key: "ticket", label: "Ticket Booking", href: "/busTicketBookingDetails", icon: TicketIcon },
    { key: "multimodal", label: "Multimodal", href: "/multiModel/plan-journey", icon: RouteIcon },
];

const RENTAL_SUB_TABS = [
    { key: "land", label: "Land", href: "/vehicleList", icon: CarIcon },
    { key: "sea", label: "Sea", href: "/seaVehicleList", icon: ShipIcon },
    { key: "air", label: "Air", href: "/airVehicleList", icon: PlaneIcon },
];

const TICKET_SUB_TABS = [
    { key: "bus", label: "Bus", href: "/busTicketBookingDetails", icon: BusIcon },
    { key: "train", label: "Train", href: "/trainTicketBookingDetails", icon: TrainIcon },
    { key: "flight", label: "Flight", href: "/flightBooking", icon: PlaneIcon },
];

const Pill = ({ active, label, href, icon: Icon, large }) => (
    <Link
        href={href}
        className={`flex items-center justify-center gap-1.5 ${large ? "px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-[14px] gap-2" : "px-3 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-[13px]"} rounded-full font-[600] poppins transition-all ${
            active
                ? "bg-[#0955AC] text-white shadow-md"
                : "text-[#475569] hover:text-[#0955AC] hover:bg-white/70"
        }`}
    >
        <Icon className={large ? "w-4 h-4 shrink-0" : "w-3.5 h-3.5 shrink-0"} />
        {label}
    </Link>
);

export const ModuleTabs = ({ active }) => (
    <div className="flex justify-center w-full">
        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1.5 rounded-full bg-[#F1F5F9] shadow-inner">
            {TOP_TABS.map((tab) => (
                <Pill key={tab.key} large active={active === tab.key} {...tab} />
            ))}
        </div>
    </div>
);

export const RentalSubTabs = ({ active }) => (
    <div className="flex justify-center mb-4 sm:mb-6">
        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-[#F1F5F9] shadow-inner">
            {RENTAL_SUB_TABS.map((tab) => (
                <Pill key={tab.key} active={active === tab.key} {...tab} />
            ))}
        </div>
    </div>
);

export const TicketSubTabs = ({ active }) => (
    <div className="flex justify-center mb-4 sm:mb-6">
        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-[#F1F5F9] shadow-inner">
            {TICKET_SUB_TABS.map((tab) => (
                <Pill key={tab.key} active={active === tab.key} {...tab} />
            ))}
        </div>
    </div>
);

export default ModuleTabs;
