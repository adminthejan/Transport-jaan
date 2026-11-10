import React, { useState, useMemo } from "react";
import { usePage } from "@inertiajs/react";
import {
    Search,
    Plus,
    Users,
    Crown,
    UserPlus,
    DollarSign,
    MoreVertical,
    Eye,
    TrendingUp,
    Phone,
    Mail,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
} from "lucide-react";

const INITIAL_CLIENTS = [
    {
        id: "CL-TB-01",
        name: "Nimal Perera",
        email: "nimal.perera@gmail.com",
        phone: "077 234 5612",
        bookings: 18,
        totalSpent: "Rs. 142,500",
        lastBooking: "22 Sep 2026",
        tier: "VIP",
        service: "Bus & Train",
    },
    {
        id: "CL-TB-02",
        name: "Shalini Fernando",
        email: "shalini.f@yahoo.com",
        phone: "071 908 4432",
        bookings: 4,
        totalSpent: "Rs. 28,900",
        lastBooking: "19 Sep 2026",
        tier: "Regular",
        service: "Bus",
    },
    {
        id: "CL-TB-03",
        name: "Roshan Jayasuriya",
        email: "roshan.jaya@outlook.com",
        phone: "076 552 1190",
        bookings: 1,
        totalSpent: "Rs. 6,200",
        lastBooking: "24 Sep 2026",
        tier: "New",
        service: "Train",
    },
    {
        id: "CL-TB-04",
        name: "Kumari Wickramasinghe",
        email: "kumari.w@gmail.com",
        phone: "077 889 0011",
        bookings: 12,
        totalSpent: "Rs. 98,400",
        lastBooking: "20 Sep 2026",
        tier: "VIP",
        service: "Bus",
    },
    {
        id: "CL-TB-05",
        name: "Dinesh Silva",
        email: "dinesh.silva@corp.lk",
        phone: "075 443 2211",
        bookings: 8,
        totalSpent: "Rs. 64,200",
        lastBooking: "15 Sep 2026",
        tier: "Regular",
        service: "Train",
    },
    {
        id: "CL-TB-06",
        name: "Kasun Jayawardena",
        email: "kasun.j@gmail.com",
        phone: "070 123 9876",
        bookings: 2,
        totalSpent: "Rs. 12,800",
        lastBooking: "23 Sep 2026",
        tier: "New",
        service: "Flight",
    },
];

const tierBadge = (tier) => {
    switch (tier) {
        case "VIP":
            return "bg-amber-100 text-amber-800 border border-amber-300";
        case "Regular":
            return "bg-blue-100 text-blue-800 border border-blue-300";
        case "New":
            return "bg-emerald-100 text-emerald-800 border border-emerald-300";
        default:
            return "bg-gray-100 text-gray-800 border border-gray-300";
    }
};

const ClientContent = () => {
    const [clientsList, setClientsList] = useState(INITIAL_CLIENTS);
    const [searchQuery, setSearchQuery] = useState("");
    const [serviceFilter, setServiceFilter] = useState("all");
    const [tierFilter, setTierFilter] = useState("all");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const [newClient, setNewClient] = useState({
        name: "",
        email: "",
        phone: "",
        service: "Bus",
        tier: "New",
    });

    const filteredClients = useMemo(() => {
        return clientsList.filter((c) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    c.name.toLowerCase().includes(q) ||
                    c.email.toLowerCase().includes(q) ||
                    c.phone.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (serviceFilter !== "all" && !c.service.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
            if (tierFilter !== "all" && c.tier.toLowerCase() !== tierFilter.toLowerCase()) return false;
            return true;
        });
    }, [clientsList, searchQuery, serviceFilter, tierFilter]);

    const handleCreateClient = (e) => {
        e.preventDefault();
        const created = {
            id: `CL-TB-0${clientsList.length + 1}`,
            name: newClient.name,
            email: newClient.email,
            phone: newClient.phone,
            bookings: 1,
            totalSpent: "Rs. 2,400",
            lastBooking: "Today",
            tier: newClient.tier,
            service: newClient.service,
        };
        setClientsList([created, ...clientsList]);
        setIsAddModalOpen(false);
        setNewClient({
            name: "",
            email: "",
            phone: "",
            service: "Bus",
            tier: "New",
        });
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Ticket Booking Clients
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        All customers who've booked bus, train or flight tickets through you.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0] shadow-sm transition-colors cursor-pointer"
                    >
                        <Plus size={16} /> Add Client
                    </button>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Total Clients */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[12px] font-[600] text-[#6B7280]">Total Clients</p>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0955AC] flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">248</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+12% vs last month</span>
                    </div>
                </div>

                {/* VIP Clients */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[12px] font-[600] text-[#6B7280]">VIP Clients</p>
                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Crown size={16} />
                        </div>
                    </div>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">32</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-amber-700">
                        <span>13% of total base</span>
                    </div>
                </div>

                {/* New This Month */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[12px] font-[600] text-[#6B7280]">New This Month</p>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <UserPlus size={16} />
                        </div>
                    </div>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">19</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+15% intake</span>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-white rounded-[10px] p-4 border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[12px] font-[600] text-[#6B7280]">Total Revenue</p>
                        <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <p className="text-[26px] font-[700] text-[#111827] mt-1">Rs 1.84M</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] font-[600] text-[#16A34A]">
                        <TrendingUp size={13} />
                        <span>+8.2% vs last month</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="w-full sm:w-[320px] h-[36px] bg-[#F9FAFB] rounded-[6px] border border-[#D1D5DB] flex items-center px-3 gap-2">
                        <Search size={15} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search client name, email or phone"
                            className="w-full bg-transparent border-none text-[12px] outline-none focus:ring-0 placeholder:text-[#9CA3AF]"
                        />
                    </div>

                    {/* All Services */}
                    <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Services</option>
                        <option value="bus">Bus</option>
                        <option value="train">Train</option>
                        <option value="flight">Flight</option>
                    </select>

                    {/* All Tiers */}
                    <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                        className="h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                    >
                        <option value="all">All Tiers</option>
                        <option value="vip">VIP</option>
                        <option value="regular">Regular</option>
                        <option value="new">New</option>
                    </select>

                    <p className="text-[12px] text-[#6B7280] ml-auto">
                        Showing {filteredClients.length} of 248 clients
                    </p>
                </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#4B5563] font-[700]">
                            <tr>
                                <th className="px-5 py-3.5">Client Name</th>
                                <th className="px-5 py-3.5">Contact No</th>
                                <th className="px-5 py-3.5">Bookings</th>
                                <th className="px-5 py-3.5">Total Spent</th>
                                <th className="px-5 py-3.5">Last Booking</th>
                                <th className="px-5 py-3.5">Tier</th>
                                <th className="px-5 py-3.5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {filteredClients.map((client) => {
                                const initials = client.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2);

                                return (
                                    <tr
                                        key={client.id}
                                        onClick={() => setSelectedClient(client)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#0955AC] text-white flex items-center justify-center font-[700] text-[12px]">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <p className="font-[600] text-[#111827]">{client.name}</p>
                                                    <p className="text-[11px] text-[#6B7280]">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 font-[500] text-[#374151]">
                                            {client.phone}
                                        </td>
                                        <td className="px-5 py-3.5 font-[700] text-[#111827]">
                                            {client.bookings}
                                        </td>
                                        <td className="px-5 py-3.5 font-[700] text-[#0955AC]">
                                            {client.totalSpent}
                                        </td>
                                        <td className="px-5 py-3.5 text-[#4B5563]">
                                            {client.lastBooking}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${tierBadge(client.tier)}`}>
                                                ★ {client.tier}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedClient(client)}
                                                className="p-1 rounded hover:bg-gray-200 text-[#0955AC]"
                                                title="View Client Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
                    <p>Showing 1–{filteredClients.length} of {filteredClients.length} clients</p>
                    <div className="flex items-center gap-1.5">
                        <button type="button" disabled className="px-3 py-1 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
                            Previous
                        </button>
                        <button type="button" className="px-3 py-1 rounded bg-[#0955AC] text-white font-[700]">
                            1
                        </button>
                        <button type="button" disabled className="px-3 py-1 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal: Add Client */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsAddModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-[12px] p-6 max-w-md w-full shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="text-[18px] font-[700] text-[#111827]">Add Ticket Booking Client</h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="e.g. Roshan Jayasuriya"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="client@gmail.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Contact Phone *</label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.phone}
                                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="077 123 4567"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Service</label>
                                    <select
                                        value={newClient.service}
                                        onChange={(e) => setNewClient({ ...newClient, service: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="Bus">Bus</option>
                                        <option value="Train">Train</option>
                                        <option value="Flight">Flight</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Tier</label>
                                    <select
                                        value={newClient.tier}
                                        onChange={(e) => setNewClient({ ...newClient, tier: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="VIP">VIP</option>
                                        <option value="Regular">Regular</option>
                                        <option value="New">New</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-[6px] border border-gray-300 text-[13px] font-[600]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-[6px] bg-[#0955AC] text-white text-[13px] font-[600] hover:bg-[#0744a0]"
                                >
                                    Save Client
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Client Profile / Details */}
            {selectedClient && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedClient(null)}
                >
                    <div
                        className="bg-white rounded-[12px] p-6 max-w-md w-full shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <div>
                                <h3 className="text-[18px] font-[700] text-[#111827]">{selectedClient.name}</h3>
                                <p className="text-[12px] text-[#6B7280]">Client ID: {selectedClient.id}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${tierBadge(selectedClient.tier)}`}>
                                ★ {selectedClient.tier}
                            </span>
                        </div>

                        <div className="space-y-3 text-[13px]">
                            <p><span className="font-[600] text-[#6B7280]">Email:</span> {selectedClient.email}</p>
                            <p><span className="font-[600] text-[#6B7280]">Phone:</span> {selectedClient.phone}</p>
                            <p><span className="font-[600] text-[#6B7280]">Primary Service:</span> {selectedClient.service}</p>
                            <p><span className="font-[600] text-[#6B7280]">Total Bookings:</span> {selectedClient.bookings} tickets</p>
                            <p><span className="font-[600] text-[#6B7280]">Total Revenue Spent:</span> {selectedClient.totalSpent}</p>
                            <p><span className="font-[600] text-[#6B7280]">Last Booking Date:</span> {selectedClient.lastBooking}</p>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setSelectedClient(null)}
                                className="px-4 py-2 rounded-[6px] bg-[#111827] text-white text-[13px] font-[600]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientContent;
