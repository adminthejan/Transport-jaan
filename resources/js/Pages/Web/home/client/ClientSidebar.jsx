import React from "react";
import { Link, usePage, router } from "@inertiajs/react";
import {
    LayoutDashboard,
    ClipboardList,
    Car,
    Ticket,
    Package,
    Warehouse,
    Truck,
    Wallet,
    CreditCard,
    PackageSearch,
    MessageCircle,
    Settings,
    LogOut,
    Plus,
} from "lucide-react";

// Every entry points at the service's own dashboard (not its public booking page).
const GROUPS = [
    {
        title: "Overview",
        items: [
            { icon: LayoutDashboard, label: "Dashboard", href: "/client/dashboard", match: ["/client/dashboard"] },
            { icon: ClipboardList, label: "My Bookings", href: "/client/dashboard#bookings", match: [] },
        ],
    },
    {
        title: "Services",
        items: [
            { icon: Car, label: "Vehicle Rental", href: "/clientVehicleDashboard", match: ["/clientVehicleDashboard"] },
            { icon: Ticket, label: "Ticket Booking", href: "/clientTicketBookingDashboard", match: ["/clientTicketBookingDashboard"] },
            { icon: Package, label: "Courier Booking", href: "/courierBookingDashboard", match: ["/courierBookingDashboard"] },
            { icon: Warehouse, label: "Warehouse", href: "/warehouseBookingDashboard", match: ["/warehouseBookingDashboard"] },
            { icon: Truck, label: "Freight", href: "/freightBookingDashboard", match: ["/freightBookingDashboard"] },
        ],
    },
    {
        title: "Payments",
        items: [
            { icon: Wallet, label: "Wallet", href: "/client/wallet", match: ["/client/wallet"] },
            { icon: CreditCard, label: "Pending Payments", href: "/client/dashboard#actions", match: [] },
        ],
    },
    {
        title: "Support",
        items: [
            { icon: PackageSearch, label: "Track an Order", href: "/track", match: ["/track"] },
            { icon: MessageCircle, label: "Messages & Help", href: "/chat", match: ["/chat"] },
        ],
    },
    {
        title: "Settings",
        items: [{ icon: Settings, label: "Settings", href: "/clientDashboardSettings", match: ["/clientDashboardSettings"] }],
    },
];

const ClientSidebar = () => {
    const { url } = usePage();
    const path = (url || "").split("?")[0].split("#")[0];

    return (
        <aside className="hidden w-[250px] shrink-0 lg:block">
            <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
                {GROUPS.map((g) => (
                    <div key={g.title} className="mb-3">
                        <p className="px-3 pb-1 pt-2 text-[10.5px] font-[700] uppercase tracking-[0.12em] text-slate-400">{g.title}</p>
                        {g.items.map((it) => {
                            const active = it.match.includes(path);
                            return (
                                <Link
                                    key={it.label}
                                    href={it.href}
                                    className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-[600] transition-colors ${
                                        active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                                    }`}
                                >
                                    <it.icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                                    <span className="truncate">{it.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}

                <div className="mb-3 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 p-4">
                    <p className="poppins text-[13px] font-[700] text-slate-800">Need to book something new?</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500">Book your next trip in a few clicks.</p>
                    <Link href="/landTicketBooking" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[12.5px] font-[700] text-white hover:bg-blue-700">
                        <Plus className="h-4 w-4" /> Book Now
                    </Link>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (window.confirm("Are you sure you want to logout?")) {
                            router.post("/logout");
                        }
                    }}
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-[600] text-rose-600 hover:bg-rose-50"
                >
                    <LogOut className="h-[17px] w-[17px]" /> Logout
                </button>
            </div>
        </aside>
    );
};

export default ClientSidebar;
