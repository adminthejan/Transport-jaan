import React, { useMemo, useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import { BusFront, TrainFront, Search as SearchIcon, Pencil, Trash2, Plus, CalendarClock } from "lucide-react";

const statusStyles = {
    active: { color: "#3B8F31", bg: "#ACE199" },
    inactive: { color: "#7B7B7A", bg: "#E8E8EF" },
    maintenance: { color: "#F0BB0D", bg: "#FFCD294D" },
};

const UnitContent = () => {
    const { units = [], server_error } = usePage().props;
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const filtered = useMemo(() => {
        return units.filter((u) => {
            const matchesType = typeFilter === "all" || u.type === typeFilter;
            const q = search.toLowerCase();
            const matchesSearch =
                !q ||
                u.name?.toLowerCase().includes(q) ||
                u.number?.toLowerCase().includes(q) ||
                u.routeNumber?.toLowerCase().includes(q);
            return matchesType && matchesSearch;
        });
    }, [units, search, typeFilter]);

    const handleDelete = (unit) => {
        if (!window.confirm(`Remove ${unit.name} (${unit.number})? This also removes its schedules.`)) return;
        router.delete(route("ticketBooking.units.destroy", { type: unit.type, id: unit.id }), {
            preserveScroll: true,
        });
    };

    return (
        <div className="flex flex-col gap-8 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-[22px] md:text-[32px] font-[700]">My Fleet</h1>
                <Link
                    href={route("ticketBooking.addUnit")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-[#0955AC] text-white text-[14px] font-[600]"
                >
                    <Plus className="w-4 h-4" /> Add Bus / Train
                </Link>
            </div>

            {server_error && (
                <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-[8px] px-5 py-3 text-[14px]">
                    {server_error}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:gap-5">
                <div className="w-full md:w-[300px] h-[38px] bg-[#F3F3F3] rounded-[6px] flex items-center px-4 gap-2">
                    <SearchIcon className="w-4 h-4 text-[#7B7B7A]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name, number, route..."
                        className="w-full bg-transparent outline-none text-[14px]"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "bus", "train"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-4 h-[38px] rounded-[6px] text-[13px] font-[600] capitalize ${
                                typeFilter === t ? "bg-[#0955AC] text-white" : "bg-[#F3F3F3] text-[#333]"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-[10px] p-16 text-center text-[#7B7B7A]" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    No buses or trains yet. Click "Add Bus / Train" to add your first one.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((unit) => {
                        const style = statusStyles[unit.status] || statusStyles.active;
                        return (
                            <div
                                key={`${unit.type}-${unit.id}`}
                                className="bg-white rounded-[10px] p-5 flex flex-col gap-4"
                                style={{ boxShadow: "4px 4px 4px #0000001A" }}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="size-[44px] rounded-full bg-[#D8E4F2] flex items-center justify-center">
                                            {unit.type === "bus" ? <BusFront className="w-5 h-5 text-[#0955AC]" /> : <TrainFront className="w-5 h-5 text-[#0955AC]" />}
                                        </div>
                                        <div>
                                            <h2 className="text-[15px] font-[700]">{unit.name}</h2>
                                            <p className="text-[12px] text-[#7B7B7A]">{unit.number}</p>
                                        </div>
                                    </div>
                                    <div
                                        className="px-3 py-1 rounded-[4px] text-[11px] font-[700] capitalize"
                                        style={{ background: style.bg, color: style.color }}
                                    >
                                        {unit.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[13px]">
                                    <div>
                                        <span className="text-[#7B7B7A]">Type:</span> <span className="font-[600]">{unit.subType || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#7B7B7A]">Route:</span> <span className="font-[600]">{unit.routeNumber || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[#7B7B7A]">Capacity:</span> <span className="font-[600]">{unit.capacity} seats</span>
                                    </div>
                                    <div>
                                        <span className="text-[#7B7B7A]">Schedules:</span> <span className="font-[600]">{unit.schedulesCount}</span>
                                    </div>
                                </div>

                                {unit.facilities?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {unit.facilities.map((f) => (
                                            <span key={f} className="px-2 py-0.5 rounded-[4px] bg-[#F3F3F3] text-[11px] text-[#333]">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <Link
                                        href={route("ticketBooking.unitDetails", { type: unit.type, id: unit.id })}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[6px] bg-[#0955AC1A] text-[#0955AC] text-[13px] font-[600]"
                                    >
                                        <CalendarClock className="w-4 h-4" /> Schedules
                                    </Link>
                                    <Link
                                        href={route("ticketBooking.addUnit", { type: unit.type, id: unit.id })}
                                        className="p-2 rounded-[6px] bg-gray-100 text-[#333]"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(unit)}
                                        className="p-2 rounded-[6px] bg-red-50 text-red-600"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default UnitContent;
