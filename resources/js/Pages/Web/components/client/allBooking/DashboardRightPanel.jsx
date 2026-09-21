import React from "react";
import { Link } from "@inertiajs/react";
import { route } from "ziggy-js";
import {
    Car,
    Plane,
    Package,
    Warehouse,
    Truck,
    Wallet,
    Bell,
    PhoneCall,
    Mail,
    MessageCircle,
    ArrowUpRight,
} from "lucide-react";

/**
 * Right-hand rail on the client dashboard: quick shortcuts, a compact
 * notifications feed, and a "need help" contact card — mirrors the
 * reference dashboard's 3-panel sidebar.
 */
const DashboardRightPanel = ({ notifications = [] }) => {
    const shortcuts = [
        { href: route("vehicle.list"), icon: Car, label: "Rent a Vehicle" },
        { href: route("clientTicketBookingDashboard"), icon: Plane, label: "Book a Ticket" },
        { href: route("courierBookingDashboard"), icon: Package, label: "Send a Courier" },
        { href: route("warehouseBookingDashboard"), icon: Warehouse, label: "Book Warehouse" },
        { href: route("freightBookingDashboard"), icon: Truck, label: "Get Freight Quote" },
    ];

    return (
        <div className="space-y-5">
            {/* Quick shortcuts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-[14px] font-[700] text-slate-800 mb-3.5">Quick Shortcuts</h3>
                <div className="space-y-1.5">
                    {shortcuts.map((s) => (
                        <Link
                            key={s.label}
                            href={s.href}
                            className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-[600] text-slate-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors group"
                        >
                            <span className="w-8 h-8 rounded-lg bg-[#EAF1FE] flex items-center justify-center shrink-0">
                                <s.icon className="w-4 h-4 text-[#0955AC]" />
                            </span>
                            <span className="flex-1 truncate">{s.label}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0955AC] transition-colors" />
                        </Link>
                    ))}
                    <Link
                        href={route("client.wallet.dashboard")}
                        className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13px] font-[600] text-slate-600 hover:bg-[#EEF3FA] hover:text-[#0955AC] transition-colors group"
                    >
                        <span className="w-8 h-8 rounded-lg bg-[#EAF1FE] flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4 text-[#0955AC]" />
                        </span>
                        <span className="flex-1 truncate">My Wallet</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0955AC] transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[14px] font-[700] text-slate-800">Notifications</h3>
                    <span className="w-6 h-6 rounded-full bg-[#EAF1FE] flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5 text-[#0955AC]" />
                    </span>
                </div>
                {notifications.length === 0 ? (
                    <p className="text-[12.5px] text-slate-400 text-center py-6">You're all caught up — no pending actions.</p>
                ) : (
                    <div className="space-y-3">
                        {notifications.slice(0, 5).map((n, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-[600] text-slate-700 truncate">{n.title}</p>
                                    <p className="text-[11.5px] text-slate-400 truncate">{n.subtitle}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Need help */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0955AC] to-[#073E82] p-5 text-white">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center mb-3">
                    <PhoneCall className="w-[18px] h-[18px]" />
                </div>
                <h3 className="text-[15px] font-[700] mb-1">Need Help?</h3>
                <p className="text-[12px] text-white/75 leading-snug mb-4">
                    Our support team is available around the clock for anything booking-related.
                </p>
                <div className="space-y-2">
                    <a
                        href="tel:+94112345678"
                        className="flex items-center gap-2 text-[12.5px] font-[600] bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors"
                    >
                        <PhoneCall className="w-3.5 h-3.5" /> +94 11 234 5678
                    </a>
                    <a
                        href="mailto:support@transport-jaan.com"
                        className="flex items-center gap-2 text-[12.5px] font-[600] bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 transition-colors"
                    >
                        <Mail className="w-3.5 h-3.5" /> support@transport-jaan.com
                    </a>
                    <a
                        href="mailto:support@transport-jaan.com"
                        className="flex items-center gap-2 text-[12.5px] font-[600] bg-white text-[#0955AC] hover:bg-white/90 rounded-lg px-3 py-2 transition-colors"
                    >
                        <MessageCircle className="w-3.5 h-3.5" /> Start Live Chat
                    </a>
                </div>
            </div>
        </div>
    );
};

export default DashboardRightPanel;
