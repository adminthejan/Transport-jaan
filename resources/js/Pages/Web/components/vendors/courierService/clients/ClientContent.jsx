import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { ChevronDown, Search } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";

const EMPTY = {
    summary: {
        totalActiveClients: 0,
        watchlistClients: 0,
        criticalRiskClients: 0,
        clientsWithOpenExceptions: 0,
        enterpriseClients: 0,
        avgSlaPerformance: 0,
    },
    rows: [],
    filters: {
        q: "",
        category: "",
        tier: "",
        risk: "",
        watchlist: "",
        perPage: 10,
        page: 1,
    },
    pagination: {
        page: 1,
        perPage: 10,
        total: 0,
        totalPages: 1,
    },
    filterOptions: {
        tiers: [],
        risks: [],
        categories: [],
        perPageOptions: [10, 20, 50],
    },
};

const riskBadge = (risk) => {
    switch (risk) {
        case "critical":
            return "bg-[#FEE2E2] text-[#991B1B]";
        case "at_risk":
            return "bg-[#FEF3C7] text-[#92400E]";
        default:
            return "bg-[#DCFCE7] text-[#166534]";
    }
};

const priorityBadge = (tag) => {
    switch (tag) {
        case "vip":
            return "bg-[#EDE9FE] text-[#5B21B6]";
        case "watchlist":
            return "bg-[#FEE2E2] text-[#991B1B]";
        default:
            return "bg-[#E0F2FE] text-[#075985]";
    }
};

const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const ClientContent = () => {
    const props = usePage().props;
    const clients = props.courierClients || EMPTY;
    const flash = props.flash || {};

    const [filters, setFilters] = useState({
        q: clients.filters.q || "",
        category: clients.filters.category || "",
        tier: clients.filters.tier || "",
        risk: clients.filters.risk || "",
        watchlist: clients.filters.watchlist || "",
        perPage: clients.filters.perPage || 10,
    });

    const [selectedClient, setSelectedClient] = useState(null);
    const [noteInput, setNoteInput] = useState("");
    const {
        feedback,
        closeFeedback,
        confirmState,
        openConfirm,
        closeConfirm,
        runConfirm,
    } = useCourierActionModal(flash);

    const submitFilters = (page = 1, overrides = {}) => {
        router.get(
            route("courierService.clients"),
            {
                ...filters,
                ...overrides,
                page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const updateProfile = (clientId, payload) => {
        const execute = () => {
            router.post(route("courierService.clients.profile", clientId), payload, {
                preserveScroll: true,
                onSuccess: () => setNoteInput(""),
            });
        };

        const action = payload?.action;
        const needsConfirm = action === "toggle_watchlist" || (action === "set_priority" && payload?.priorityTag === "watchlist");

        if (needsConfirm) {
            openConfirm({
                title: "Confirm Client Action",
                message: `Are you sure you want to ${titleCase(action)} for this client profile?`,
                onConfirm: execute,
            });
            return;
        }

        execute();
    };

    const summaryCards = useMemo(
        () => [
            { key: "totalActiveClients", label: "Total Active Clients", value: clients.summary.totalActiveClients },
            { key: "watchlistClients", label: "Watchlist Clients", value: clients.summary.watchlistClients },
            { key: "criticalRiskClients", label: "Critical Risk", value: clients.summary.criticalRiskClients },
            { key: "clientsWithOpenExceptions", label: "Open Exceptions", value: clients.summary.clientsWithOpenExceptions },
            { key: "enterpriseClients", label: "Enterprise Clients", value: clients.summary.enterpriseClients },
            { key: "avgSlaPerformance", label: "Avg SLA %", value: `${clients.summary.avgSlaPerformance}%` },
        ],
        [clients.summary],
    );

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <CourierFeedbackModal
                open={Boolean(feedback)}
                type={feedback?.type || "info"}
                message={feedback?.message || ""}
                passwordChangeRequired={Boolean(feedback?.passwordChangeRequired)}
                passwordChangeTargetUrl={feedback?.passwordChangeTargetUrl || ""}
                onClose={closeFeedback}
            />

            <CourierFeedbackModal
                open={confirmState.open}
                type={confirmState.type || "warning"}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText || "Confirm"}
                showCancel={true}
                onConfirm={runConfirm}
                onClose={closeConfirm}
            />

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="figtree text-[34px] font-[700]">Courier Clients</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Client portfolio, risk intelligence, and relationship operations for assigned shipments.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">
                {summaryCards.map((card) => (
                    <div key={card.key} className="bg-white rounded-[10px] px-4 py-3" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                        <p className="text-[12px] text-[#6B7280] font-[600]">{card.label}</p>
                        <p className="text-[26px] leading-tight font-[700] mt-1">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[10px] p-4 mt-6" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-2 mb-4">
                    <div className="xl:col-span-2 h-[38px] rounded-[8px] bg-[#F3F4F6] px-3 flex items-center gap-2">
                        <Search size={16} className="text-[#6B7280]" />
                        <input
                            type="text"
                            value={filters.q}
                            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                            placeholder="Search name, company, email, phone"
                            className="w-full border-none bg-transparent outline-none focus:ring-0"
                        />
                    </div>

                    <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Category Mix</option>
                        {clients.filterOptions.categories.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>

                    <select value={filters.tier} onChange={(e) => setFilters((prev) => ({ ...prev, tier: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Client Tier</option>
                        {clients.filterOptions.tiers.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>

                    <select value={filters.risk} onChange={(e) => setFilters((prev) => ({ ...prev, risk: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Risk Level</option>
                        {clients.filterOptions.risks.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>

                    <select value={filters.watchlist} onChange={(e) => setFilters((prev) => ({ ...prev, watchlist: e.target.value }))} className="h-[38px] rounded-[8px] border border-[#E5E7EB] px-3 text-[13px]">
                        <option value="">Watchlist</option>
                        <option value="only">Watchlist Only</option>
                    </select>

                    <button type="button" onClick={() => submitFilters(1)} className="h-[38px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]">
                        Apply
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-max min-w-full text-left text-[13px] whitespace-nowrap">
                        <thead className="bg-[#D8E4F2]">
                            <tr>
                                <th className="px-3 py-3 font-[700]">Client</th>
                                <th className="px-3 py-3 font-[700]">Tier</th>
                                <th className="px-3 py-3 font-[700]">Category Mix</th>
                                <th className="px-3 py-3 font-[700]">Shipments</th>
                                <th className="px-3 py-3 font-[700]">Delivered %</th>
                                <th className="px-3 py-3 font-[700]">Exceptions %</th>
                                <th className="px-3 py-3 font-[700]">SLA %</th>
                                <th className="px-3 py-3 font-[700]">Risk</th>
                                <th className="px-3 py-3 font-[700]">Priority</th>
                                <th className="px-3 py-3 font-[700]">Owner</th>
                                <th className="px-3 py-3 font-[700]">Last Shipment</th>
                                <th className="px-3 py-3 font-[700]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.rows.length > 0 ? (
                                clients.rows.map((row) => (
                                    <tr key={row.id} className="border-b border-[#E5E7EB] cursor-pointer" onClick={() => setSelectedClient(row)}>
                                        <td className="px-3 py-3">
                                            <div className="font-[700]">{row.name || "Unknown"}</div>
                                            <div className="text-[11px] text-[#6B7280]">{row.company || row.email || "-"}</div>
                                        </td>
                                        <td className="px-3 py-3">{titleCase(row.clientTier)}</td>
                                        <td className="px-3 py-3">{row.categoryMix}</td>
                                        <td className="px-3 py-3">{row.totalShipments} ({row.activeShipments} active)</td>
                                        <td className="px-3 py-3">{row.deliveredRate}%</td>
                                        <td className="px-3 py-3">{row.exceptionRate}%</td>
                                        <td className="px-3 py-3">{row.slaPerformance}%</td>
                                        <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-[700] ${riskBadge(row.riskLevel)}`}>{titleCase(row.riskLevel)}</span></td>
                                        <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-[700] ${priorityBadge(row.priorityTag)}`}>{titleCase(row.priorityTag)}</span></td>
                                        <td className="px-3 py-3">{row.accountOwner || "-"}</td>
                                        <td className="px-3 py-3">{row.lastShipmentDate || "-"}</td>
                                        <td className="px-3 py-3">
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => updateProfile(row.id, { action: "toggle_watchlist" })} className="px-2 py-1 rounded-[5px] bg-[#F3F4F6] text-[11px] font-[700]">{row.watchlist ? "Unwatch" : "Watch"}</button>
                                                <button type="button" onClick={() => updateProfile(row.id, { action: "set_priority", priorityTag: "vip" })} className="px-2 py-1 rounded-[5px] bg-[#F3F4F6] text-[11px] font-[700]">VIP</button>
                                                <button type="button" onClick={() => updateProfile(row.id, { action: "set_priority", priorityTag: "watchlist" })} className="px-2 py-1 rounded-[5px] bg-[#F3F4F6] text-[11px] font-[700]">Escalate</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={12} className="px-3 py-10 text-center text-[#6B7280]">No clients found for current filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mt-5">
                    <div className="flex items-center gap-2 text-[13px]">
                        <span>Rows per page</span>
                        <div className="relative">
                            <select
                                value={filters.perPage}
                                onChange={(e) => {
                                    const nextPerPage = Number(e.target.value);
                                    setFilters((prev) => ({ ...prev, perPage: nextPerPage }));
                                    submitFilters(1, { perPage: nextPerPage });
                                }}
                                className="h-[34px] rounded-[6px] border border-[#D1D5DB] px-3 pr-7 text-[13px]"
                            >
                                {clients.filterOptions.perPageOptions.map((count) => (
                                    <option key={count} value={count}>{count}</option>
                                ))}
                            </select>
                            <ChevronDown className="size-[14px] text-[#6B7280] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <p className="text-[13px] text-[#6B7280]">Page {clients.pagination.page} / {clients.pagination.totalPages} ({clients.pagination.total} records)</p>

                    <div className="flex gap-2">
                        <button type="button" disabled={clients.pagination.page <= 1} onClick={() => submitFilters(clients.pagination.page - 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Previous</button>
                        <button type="button" disabled={clients.pagination.page >= clients.pagination.totalPages} onClick={() => submitFilters(clients.pagination.page + 1)} className="h-[34px] px-3 rounded-[6px] border border-[#D1D5DB] text-[13px] disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {selectedClient && (
                <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedClient(null)}>
                    <div className="absolute right-0 top-0 h-full w-full max-w-[430px] bg-white p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-[24px] font-[700] mb-4">Client 360</h2>
                        <div className="space-y-3 text-[14px]">
                            <p><span className="font-[700]">Name:</span> {selectedClient.name || "-"}</p>
                            <p><span className="font-[700]">Company:</span> {selectedClient.company || "-"}</p>
                            <p><span className="font-[700]">Email:</span> {selectedClient.email || "-"}</p>
                            <p><span className="font-[700]">Phone:</span> {selectedClient.phone || "-"}</p>
                            <p><span className="font-[700]">Tier:</span> {titleCase(selectedClient.clientTier)}</p>
                            <p><span className="font-[700]">Category Mix:</span> {selectedClient.categoryMix}</p>
                            <p><span className="font-[700]">Risk:</span> {titleCase(selectedClient.riskLevel)}</p>
                            <p><span className="font-[700]">Priority:</span> {titleCase(selectedClient.priorityTag)}</p>
                            <p><span className="font-[700]">Total Shipments:</span> {selectedClient.totalShipments}</p>
                            <p><span className="font-[700]">Active Shipments:</span> {selectedClient.activeShipments}</p>
                            <p><span className="font-[700]">Open Exceptions:</span> {selectedClient.openExceptions}</p>
                            <p><span className="font-[700]">Delivered %:</span> {selectedClient.deliveredRate}%</p>
                            <p><span className="font-[700]">Exception %:</span> {selectedClient.exceptionRate}%</p>
                            <p><span className="font-[700]">SLA %:</span> {selectedClient.slaPerformance}%</p>
                            <p><span className="font-[700]">Account Owner:</span> {selectedClient.accountOwner || "-"}</p>
                            <p><span className="font-[700]">Internal Notes:</span></p>
                            <div className="rounded-[8px] bg-[#F9FAFB] border border-[#E5E7EB] p-3 text-[12px] whitespace-pre-wrap">{selectedClient.internalNotes || "No notes added yet."}</div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add internal note" className="w-full h-[38px] rounded-[8px] border border-[#D1D5DB] px-3 text-[13px]" />
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => updateProfile(selectedClient.id, { action: "set_owner", accountOwner: "Ops Team A" })} className="h-[36px] rounded-[8px] bg-[#F3F4F6] text-[12px] font-[700]">Assign Owner</button>
                                <button type="button" onClick={() => updateProfile(selectedClient.id, { action: "set_tier", clientTier: "enterprise" })} className="h-[36px] rounded-[8px] bg-[#F3F4F6] text-[12px] font-[700]">Set Enterprise</button>
                                <button type="button" onClick={() => updateProfile(selectedClient.id, { action: "set_priority", priorityTag: "vip" })} className="h-[36px] rounded-[8px] bg-[#F3F4F6] text-[12px] font-[700]">Mark VIP</button>
                                <button type="button" onClick={() => updateProfile(selectedClient.id, { action: "toggle_watchlist" })} className="h-[36px] rounded-[8px] bg-[#F3F4F6] text-[12px] font-[700]">Toggle Watchlist</button>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (noteInput.trim() === "") return;
                                    updateProfile(selectedClient.id, { action: "add_note", note: noteInput });
                                }}
                                className="w-full h-[38px] rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]"
                            >
                                Save Note
                            </button>
                        </div>

                        <button type="button" className="mt-4 w-full h-[40px] rounded-[8px] bg-[#111827] text-white font-[700]" onClick={() => setSelectedClient(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientContent;
