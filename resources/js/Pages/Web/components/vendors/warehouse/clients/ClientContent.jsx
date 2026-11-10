import React, { useState, useMemo } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Search,
    Plus,
    RotateCcw,
    Filter,
    CalendarDays,
    Building2,
    Mail,
    Phone,
    MapPin,
    CheckCircle2,
    Clock,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";

const INITIAL_WAREHOUSE_CLIENTS = [
    {
        id: "CL-001",
        companyName: "ABC Logistics (Pvt) Ltd",
        contactPerson: "Nimal Perera",
        contactNo: "+94 77 123 4567",
        email: "info@abclogistics.lk",
        address: "No. 12, Galle Road, Colombo 03",
        assignedUnit: "WH-A-001",
        commodityType: "Agri Produce",
        capacityUsage: "200 Pallets (100%)",
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
        duration: "5 months",
        totalSpent: "LKR 450,000",
    },
    {
        id: "CL-002",
        companyName: "Global Trade (Pvt) Ltd",
        contactPerson: "Samantha Jayawardena",
        contactNo: "+94 71 890 1234",
        email: "contact@globaltrade.lk",
        address: "No. 45, Biyagama Rd, Kelaniya",
        assignedUnit: "WH-A-002",
        commodityType: "Dry Food",
        capacityUsage: "150 Pallets (85%)",
        bookingStatus: "Confirmed",
        paymentStatus: "Pending",
        duration: "3 months",
        totalSpent: "LKR 320,000",
    },
    {
        id: "CL-003",
        companyName: "Sunrise Foods (Pvt) Ltd",
        contactPerson: "Kavinda Wickramasinghe",
        contactNo: "+94 76 543 2198",
        email: "orders@sunrisefoods.lk",
        address: "No. 88, Kandy Rd, Peliyagoda",
        assignedUnit: "WH-B-001",
        commodityType: "Food & Beverage",
        capacityUsage: "300 Pallets (100%)",
        bookingStatus: "Active",
        paymentStatus: "Overdue",
        duration: "1 year",
        totalSpent: "LKR 950,000",
    },
    {
        id: "CL-004",
        companyName: "Medicare Supplies Ltd",
        contactPerson: "Dr. Robert Brown",
        contactNo: "+94 11 234 5678",
        email: "logistics@medicaresupplies.com",
        address: "No. 15, Hospital Lane, Nugegoda",
        assignedUnit: "WH-C-001",
        commodityType: "Pharmaceuticals",
        capacityUsage: "90 Pallets (90%)",
        bookingStatus: "Pending",
        paymentStatus: "Pending",
        duration: "2 months",
        totalSpent: "LKR 180,000",
    },
    {
        id: "CL-005",
        companyName: "Oceanic Traders (Pvt) Ltd",
        contactPerson: "Dinesh Silva",
        contactNo: "+94 77 901 2345",
        email: "dinesh@oceanic.lk",
        address: "No. 7, Port Access Rd, Colombo 13",
        assignedUnit: "WH-B-002",
        commodityType: "Chemicals",
        capacityUsage: "140 Pallets (100%)",
        bookingStatus: "Completed",
        paymentStatus: "Paid",
        duration: "6 months",
        totalSpent: "LKR 780,000",
    },
    {
        id: "CL-006",
        companyName: "Bright Fashion PLC",
        contactPerson: "Shalini Fernando",
        contactNo: "+94 72 123 4567",
        email: "supply@brightfashion.lk",
        address: "No. 19, Gampaha Rd, Yakkala",
        assignedUnit: "WH-A-003",
        commodityType: "Apparel",
        capacityUsage: "250 Pallets (80%)",
        bookingStatus: "Active",
        paymentStatus: "Partially Paid",
        duration: "4 months",
        totalSpent: "LKR 540,000",
    },
    {
        id: "CL-007",
        companyName: "ChemTrade Lanka Ltd",
        contactPerson: "Anura Wijesinghe",
        contactNo: "+94 75 432 1098",
        email: "anura@chemtrade.lk",
        address: "No. 33, Baseline Rd, Dematagoda",
        assignedUnit: "WH-B-003",
        commodityType: "Raw Material",
        capacityUsage: "110 Pallets (95%)",
        bookingStatus: "Active",
        paymentStatus: "Paid",
        duration: "1 month",
        totalSpent: "LKR 230,000",
    },
    {
        id: "CL-008",
        companyName: "TechWave Solutions",
        contactPerson: "Mahesh Cooray",
        contactNo: "+94 70 112 2334",
        email: "tech@techwave.lk",
        address: "No. 202, High Level Rd, Maharagama",
        assignedUnit: "WH-C-002",
        commodityType: "IT Electronics",
        capacityUsage: "60 Pallets (60%)",
        bookingStatus: "Inbound",
        paymentStatus: "Paid",
        duration: "1 month",
        totalSpent: "LKR 120,000",
    },
];

const ClientContent = () => {
    const [clients, setClients] = useState(INITIAL_WAREHOUSE_CLIENTS);
    const [searchName, setSearchName] = useState("");
    const [searchId, setSearchId] = useState("");
    const [assignedUnitFilter, setAssignedUnitFilter] = useState("all");
    const [commodityFilter, setCommodityFilter] = useState("all");
    const [storageTypeFilter, setStorageTypeFilter] = useState("all");
    const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState("");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedClientForDetails, setSelectedClientForDetails] = useState(null);

    // New Client form state
    const [newClient, setNewClient] = useState({
        companyName: "",
        contactPerson: "",
        contactNo: "",
        email: "",
        address: "",
        assignedUnit: "WH-A-001",
        commodityType: "Agri Produce",
        capacityUsage: "100 Pallets",
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
        totalSpent: "LKR 250,000",
    });

    const filteredClients = useMemo(() => {
        return clients.filter((c) => {
            if (searchName && !c.companyName.toLowerCase().includes(searchName.toLowerCase()) && !c.contactPerson.toLowerCase().includes(searchName.toLowerCase())) return false;
            if (searchId && !c.id.toLowerCase().includes(searchId.toLowerCase())) return false;
            if (assignedUnitFilter !== "all" && c.assignedUnit !== assignedUnitFilter) return false;
            if (commodityFilter !== "all" && !c.commodityType.toLowerCase().includes(commodityFilter.toLowerCase())) return false;
            if (bookingStatusFilter !== "all" && c.bookingStatus.toLowerCase() !== bookingStatusFilter.toLowerCase()) return false;
            if (paymentStatusFilter !== "all" && c.paymentStatus.toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
            return true;
        });
    }, [clients, searchName, searchId, assignedUnitFilter, commodityFilter, bookingStatusFilter, paymentStatusFilter]);

    const handleReset = () => {
        setSearchName("");
        setSearchId("");
        setAssignedUnitFilter("all");
        setCommodityFilter("all");
        setStorageTypeFilter("all");
        setBookingStatusFilter("all");
        setPaymentStatusFilter("all");
        setDateRange("");
    };

    const handleCreateClient = (e) => {
        e.preventDefault();
        const created = {
            id: `CL-00${clients.length + 1}`,
            ...newClient,
            duration: "3 months",
        };
        setClients([created, ...clients]);
        setIsAddModalOpen(false);
        setNewClient({
            companyName: "",
            contactPerson: "",
            contactNo: "",
            email: "",
            address: "",
            assignedUnit: "WH-A-001",
            commodityType: "Agri Produce",
            capacityUsage: "100 Pallets",
            bookingStatus: "Confirmed",
            paymentStatus: "Paid",
            totalSpent: "LKR 250,000",
        });
    };

    return (
        <div className="w-full h-auto px-4 lg:px-8 pt-6 pb-16 font-sans">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="figtree text-[28px] md:text-[34px] font-[700] text-[#111827]">
                        Warehouse Clients
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        Manage your warehouse clients, their bookings, capacity usage and payment status.
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

            {/* Filter Row */}
            <div className="bg-white rounded-[12px] p-5 border border-[#E5E7EB] shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                    {/* Client Name / Company */}
                    <div className="lg:col-span-2">
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Client Name / Company
                        </label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            placeholder="Search client or company"
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* Client ID */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Client ID
                        </label>
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder="e.g. CL-001"
                            className="w-full h-[36px] px-3 rounded-[6px] border border-[#D1D5DB] text-[12px] focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        />
                    </div>

                    {/* Assigned Unit */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Assigned Unit
                        </label>
                        <select
                            value={assignedUnitFilter}
                            onChange={(e) => setAssignedUnitFilter(e.target.value)}
                            className="w-full h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Units</option>
                            <option value="WH-A-001">WH-A-001</option>
                            <option value="WH-A-002">WH-A-002</option>
                            <option value="WH-B-001">WH-B-001</option>
                            <option value="WH-B-002">WH-B-002</option>
                        </select>
                    </div>

                    {/* Commodity Type */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Commodity Type
                        </label>
                        <select
                            value={commodityFilter}
                            onChange={(e) => setCommodityFilter(e.target.value)}
                            className="w-full h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Types</option>
                            <option value="agri">Agri Produce</option>
                            <option value="food">Food & Beverage</option>
                            <option value="pharma">Pharmaceuticals</option>
                            <option value="chemical">Chemicals</option>
                        </select>
                    </div>

                    {/* Storage Type */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Storage Type
                        </label>
                        <select
                            value={storageTypeFilter}
                            onChange={(e) => setStorageTypeFilter(e.target.value)}
                            className="w-full h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Types</option>
                            <option value="cold">Cold Storage</option>
                            <option value="dry">Dry Storage</option>
                            <option value="bonded">Bonded Storage</option>
                        </select>
                    </div>

                    {/* Booking Status */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Booking Status
                        </label>
                        <select
                            value={bookingStatusFilter}
                            onChange={(e) => setBookingStatusFilter(e.target.value)}
                            className="w-full h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Status</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <label className="block text-[11px] font-[700] text-[#4B5563] uppercase tracking-wider mb-1">
                            Payment Status
                        </label>
                        <select
                            value={paymentStatusFilter}
                            onChange={(e) => setPaymentStatusFilter(e.target.value)}
                            className="w-full h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[12px] bg-white focus:outline-none focus:ring-1 focus:ring-[#0955AC]"
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-end gap-1.5">
                        <button
                            type="button"
                            className="flex-1 h-[36px] rounded-[6px] bg-[#0955AC] text-white text-[12px] font-[600] hover:bg-[#0744a0]"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-[36px] px-2.5 rounded-[6px] border border-[#D1D5DB] text-[#4B5563] text-[12px] hover:bg-gray-50"
                            title="Reset filters"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Warehouse Clients Table */}
            <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB] text-[#4B5563] font-[700]">
                            <tr>
                                <th className="px-4 py-3.5">Client ID</th>
                                <th className="px-4 py-3.5">Company Name</th>
                                <th className="px-4 py-3.5">Contact No</th>
                                <th className="px-4 py-3.5">Email</th>
                                <th className="px-4 py-3.5">Address</th>
                                <th className="px-4 py-3.5">Assigned Unit</th>
                                <th className="px-4 py-3.5">Commodity Type</th>
                                <th className="px-4 py-3.5">Capacity Usage</th>
                                <th className="px-4 py-3.5">Booking Status</th>
                                <th className="px-4 py-3.5">Payment Status</th>
                                <th className="px-4 py-3.5">Total Spent</th>
                                <th className="px-4 py-3.5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {filteredClients.map((client) => (
                                <tr
                                    key={client.id}
                                    onClick={() => setSelectedClientForDetails(client)}
                                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3.5 font-[700] text-[#0955AC]">
                                        {client.id}
                                    </td>
                                    <td className="px-4 py-3.5 font-[600] text-[#111827]">
                                        {client.companyName}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#4B5563]">
                                        {client.contactNo}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#4B5563]">
                                        {client.email}
                                    </td>
                                    <td className="px-4 py-3.5 text-[#6B7280] max-w-[200px] truncate" title={client.address}>
                                        {client.address}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span className="px-2 py-0.5 rounded text-[11px] font-[700] bg-blue-50 text-blue-700 border border-blue-200">
                                            {client.assignedUnit}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-[#374151]">
                                        {client.commodityType}
                                    </td>
                                    <td className="px-4 py-3.5 font-[600] text-[#111827]">
                                        {client.capacityUsage}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${
                                                client.bookingStatus === "Confirmed"
                                                    ? "bg-[#DCFCE7] text-[#166534]"
                                                    : client.bookingStatus === "Active"
                                                    ? "bg-[#DBEAFE] text-[#1E40AF]"
                                                    : "bg-[#FEF3C7] text-[#92400E]"
                                            }`}
                                        >
                                            {client.bookingStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${
                                                client.paymentStatus === "Paid"
                                                    ? "bg-[#DCFCE7] text-[#166534]"
                                                    : client.paymentStatus === "Pending"
                                                    ? "bg-[#FEF3C7] text-[#92400E]"
                                                    : "bg-[#FEE2E2] text-[#991B1B]"
                                            }`}
                                        >
                                            {client.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3.5 font-[700] text-[#111827]">
                                        {client.totalSpent}
                                    </td>
                                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedClientForDetails(client)}
                                            className="p-1 rounded hover:bg-gray-200 text-gray-500"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Table footer / Pagination */}
                <div className="px-5 py-4 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-[#6B7280]">
                    <p>Showing 1–{filteredClients.length} of {filteredClients.length} clients</p>
                    <div className="flex items-center gap-1.5">
                        <button type="button" disabled className="px-3 py-1.5 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
                            Previous
                        </button>
                        <button type="button" className="px-3 py-1.5 rounded bg-[#0955AC] text-white font-[700]">
                            1
                        </button>
                        <button type="button" disabled className="px-3 py-1.5 rounded border border-[#E5E7EB] opacity-50 cursor-not-allowed">
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
                        className="bg-white rounded-[12px] p-6 max-w-lg w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="text-[18px] font-[700] text-[#111827]">Add Warehouse Client</h3>
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
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.companyName}
                                    onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="e.g. Lanka Exports PLC"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Contact Person *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newClient.contactPerson}
                                        onChange={(e) => setNewClient({ ...newClient, contactPerson: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="Full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Contact Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newClient.contactNo}
                                        onChange={(e) => setNewClient({ ...newClient, contactNo: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="+94 77 000 0000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={newClient.email}
                                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="client@domain.lk"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Assigned Unit</label>
                                    <select
                                        value={newClient.assignedUnit}
                                        onChange={(e) => setNewClient({ ...newClient, assignedUnit: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px] bg-white"
                                    >
                                        <option value="WH-A-001">WH-A-001 (Cold Storage)</option>
                                        <option value="WH-A-002">WH-A-002 (Dry Storage)</option>
                                        <option value="WH-B-001">WH-B-001 (Bonded Storage)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[12px] font-[600] text-gray-700 mb-1">Address *</label>
                                <input
                                    type="text"
                                    required
                                    value={newClient.address}
                                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                    className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                    placeholder="Street, City, Postal Code"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Commodity Type</label>
                                    <input
                                        type="text"
                                        value={newClient.commodityType}
                                        onChange={(e) => setNewClient({ ...newClient, commodityType: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="e.g. Agri Produce"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-[600] text-gray-700 mb-1">Capacity Usage</label>
                                    <input
                                        type="text"
                                        value={newClient.capacityUsage}
                                        onChange={(e) => setNewClient({ ...newClient, capacityUsage: e.target.value })}
                                        className="w-full h-[38px] px-3 rounded-[6px] border border-gray-300 text-[13px]"
                                        placeholder="120 Pallets"
                                    />
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

            {/* Modal / Drawer for Client Details */}
            {selectedClientForDetails && (
                <div
                    className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedClientForDetails(null)}
                >
                    <div
                        className="bg-white rounded-[12px] p-6 max-w-md w-full shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <div>
                                <h3 className="text-[18px] font-[700] text-[#111827]">{selectedClientForDetails.companyName}</h3>
                                <p className="text-[12px] text-[#6B7280]">Client ID: {selectedClientForDetails.id}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedClientForDetails(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-[13px]">
                            <p><span className="font-[600] text-[#6B7280]">Contact Person:</span> {selectedClientForDetails.contactPerson}</p>
                            <p><span className="font-[600] text-[#6B7280]">Contact No:</span> {selectedClientForDetails.contactNo}</p>
                            <p><span className="font-[600] text-[#6B7280]">Email:</span> {selectedClientForDetails.email}</p>
                            <p><span className="font-[600] text-[#6B7280]">Address:</span> {selectedClientForDetails.address}</p>
                            <p><span className="font-[600] text-[#6B7280]">Assigned Unit:</span> {selectedClientForDetails.assignedUnit}</p>
                            <p><span className="font-[600] text-[#6B7280]">Commodity:</span> {selectedClientForDetails.commodityType}</p>
                            <p><span className="font-[600] text-[#6B7280]">Capacity Usage:</span> {selectedClientForDetails.capacityUsage}</p>
                            <p><span className="font-[600] text-[#6B7280]">Booking Status:</span> {selectedClientForDetails.bookingStatus}</p>
                            <p><span className="font-[600] text-[#6B7280]">Payment Status:</span> {selectedClientForDetails.paymentStatus}</p>
                            <p><span className="font-[600] text-[#6B7280]">Total Revenue Spent:</span> {selectedClientForDetails.totalSpent}</p>
                        </div>

                        <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setSelectedClientForDetails(null)}
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
