import React from "react";
import { Link } from "@inertiajs/react";
import {
    Car as CarIcon,
    Route as RouteIcon,
    Ticket as TicketIcon,
    Ship as ShipIcon,
    Plane as PlaneIcon,
    Bus as BusIcon,
} from "lucide-react";

const TOP_TABS = [
    { key: "rental", label: "Vehicle Rental", href: "/vehicleList", icon: CarIcon },
    { key: "ticket", label: "Ticket Booking", href: "/landTicketBooking", icon: TicketIcon },
    { key: "multimodal", label: "Multimodal", href: "/multiModel/plan-journey", icon: RouteIcon },
];

const RENTAL_SUB_TABS = [
    { key: "land", label: "Land Vehicles", href: "/vehicleList", icon: CarIcon },
    { key: "sea", label: "Sea & Water", href: "/seaVehicleList", icon: ShipIcon },
    { key: "air", label: "Air Charter", href: "/airVehicleList", icon: PlaneIcon },
];

const TICKET_SUB_TABS = [
    { key: "land", label: "Bus & Train", href: "/landTicketBooking", icon: BusIcon },
    { key: "air", label: "Flights", icon: PlaneIcon, href: "/ticketBooking?type=flight" },
    { key: "sea", label: "Ferries & Boats", icon: ShipIcon, href: "/seaTicketBooking" },
];

const Pill = ({ active, label, href, icon: Icon, large, onSelect, tabKey }) => {
    const className = `group relative inline-flex items-center justify-center gap-2 ${
        large
            ? "px-5 sm:px-7 py-2.5 sm:py-3 text-[13px] sm:text-[14px]"
            : "px-4 sm:px-5 py-2 text-[12px] sm:text-[13px]"
    } rounded-full font-semibold transition-all duration-300 cursor-pointer ${
        active
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-600/20"
            : "text-slate-600 hover:text-blue-600 hover:bg-white/80"
    }`;

    if (onSelect) {
        return (
            <button
                type="button"
                onClick={() => onSelect(tabKey)}
                className={className}
            >
                <Icon className={`${large ? "w-4 h-4" : "w-3.5 h-3.5"} transition-transform duration-200 group-hover:scale-110 ${active ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`} />
                <span>{label}</span>
            </button>
        );
    }

    return (
        <Link href={href} className={className}>
            <Icon className={`${large ? "w-4 h-4" : "w-3.5 h-3.5"} transition-transform duration-200 group-hover:scale-110 ${active ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`} />
            <span>{label}</span>
        </Link>
    );
};

export const ModuleTabs = ({ active, onSelect }) => (
    <div className="flex justify-center w-full">
        <div className="inline-flex flex-wrap justify-center items-center gap-1.5 p-1.5 rounded-full bg-slate-100/90 backdrop-blur-md border border-slate-200/60 shadow-sm">
            {TOP_TABS.map((tab) => (
                <Pill key={tab.key} tabKey={tab.key} large active={active === tab.key} onSelect={onSelect} {...tab} />
            ))}
        </div>
    </div>
);

export const RentalSubTabs = ({ active, onSelect }) => (
    <div className="flex justify-center mb-4 sm:mb-6">
        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-slate-100/90 backdrop-blur-md border border-slate-200/60 shadow-sm">
            {RENTAL_SUB_TABS.map((tab) => (
                <Pill key={tab.key} tabKey={tab.key} active={active === tab.key} onSelect={onSelect} {...tab} />
            ))}
        </div>
    </div>
);

export const TicketSubTabs = ({ active, onSelect }) => (
    <div className="flex justify-center mb-4 sm:mb-6">
        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-slate-100/90 backdrop-blur-md border border-slate-200/60 shadow-sm">
            {TICKET_SUB_TABS.map((tab) => (
                <Pill key={tab.key} tabKey={tab.key} active={active === tab.key} onSelect={onSelect} {...tab} />
            ))}
        </div>
    </div>
);

export default ModuleTabs;
