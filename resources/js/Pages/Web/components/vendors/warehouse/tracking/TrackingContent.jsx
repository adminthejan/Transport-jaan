import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";

import miniSearchIcon from "../../../../assets/vendors/dashboard/icons/miniSearchIcon.svg";
import { Warehouse, Boxes, Package, CalendarClock, Mail, Phone } from "lucide-react";

import UserDropdown from "../../UserDropdown";

const TrackingContent = () => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [units, setUnits] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [summary, setSummary] = useState({ total_units: 0, occupied_units: 0, available_units: 0 });
    const [search, setSearch] = useState("");
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    useEffect(() => {
        const fetchTracking = async () => {
            setLoading(true);
            try {
                const response = await fetch("/vendors/warehouse/api/tracking");
                const json = await response.json();
                if (json.success) {
                    setUnits(json.data.units || []);
                    setUpcoming(json.data.upcoming || []);
                    setSummary(json.data.summary || { total_units: 0, occupied_units: 0, available_units: 0 });
                    setSelectedUnitId((prev) => prev ?? json.data.units?.[0]?.id ?? null);
                } else {
                    setError(json.message || "Failed to load tracking data.");
                }
            } catch (e) {
                setError("Failed to load tracking data.");
            } finally {
                setLoading(false);
            }
        };

        fetchTracking();
    }, []);

    const filteredUnits = units.filter((u) =>
        [u.name, u.type, u.booking?.client].filter(Boolean).some((v) =>
            v.toLowerCase().includes(search.toLowerCase())
        )
    );

    const selectedUnit = units.find((u) => u.id === selectedUnitId) || filteredUnits[0];

    return (
        <div className="w-full h-auto pt-6 pb-12 lg:pl-5 lg:pr-5">
            {/* Header */}
            <div className="flex flex-col xl:flex-row gap-5 lg:pl-5 lg:pr-5 justify-between items-center">
                <h1 className="figtree text-[24px] md:text-[35px] font-[700]">Warehouse Tracking</h1>
                <div className="hidden xl:flex items-center gap-3">
                    <UserDropdown settingsRoute={route("warehouse.settingsPage")} />
                </div>
            </div>

            {/* Summary cards */}
            <div className="flex flex-col md:flex-row gap-4 w-full py-6">
                {[
                    { label: "Total Units", value: summary.total_units },
                    { label: "Occupied", value: summary.occupied_units },
                    { label: "Available", value: summary.available_units },
                ].map((c) => (
                    <div
                        key={c.label}
                        className="w-full min-h-[80px] bg-[#FFFFFF] rounded-[10px] flex flex-col justify-center px-6"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                    >
                        <span className="text-[13px] text-[#7B7B7A] font-[500]">{c.label}</span>
                        <span className="text-[26px] font-[700]">{c.value}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-[300px]">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0955AC] border-r-transparent" />
                </div>
            ) : error ? (
                <div className="text-center text-red-600 py-10">{error}</div>
            ) : units.length === 0 ? (
                <div className="text-center text-[#7B7B7A] py-10">
                    You don't have any warehouse units yet. Add a unit to start tracking occupancy.
                </div>
            ) : (
                <div className="flex flex-col md:flex-row gap-4 w-full">
                    {/* Units list */}
                    <div
                        className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-4 md:px-10 py-10"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                    >
                        <h1 className="text-[24px] font-[700]">Storage Units</h1>
                        <div className="w-full h-[35px] bg-[#F3F3F3] rounded-[6px] flex flex-row justify-center items-center py-2 px-5 my-5">
                            <img src={miniSearchIcon} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full outline-none bg-transparent shadow-none focus:ring-0 border-none placeholder:text-[#7B7B7ACC]"
                                placeholder="Search unit, type, or client..."
                            />
                        </div>
                        <div className="flex flex-col">
                            {filteredUnits.map((unit) => (
                                <button
                                    type="button"
                                    key={unit.id}
                                    onClick={() => setSelectedUnitId(unit.id)}
                                    className={`text-left w-full min-h-[104px] border-[1px] rounded-[9px] mt-5 p-3 transition-colors ${
                                        selectedUnit?.id === unit.id
                                            ? "border-[#0955AC] bg-[#0955AC0D]"
                                            : "border-[#0000004D]"
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <Warehouse className="h-12 w-12 sm:h-16 sm:w-16 xl:size-[90px] text-[#2E4683] shrink-0" />
                                        <div className="flex flex-col flex-1 w-full">
                                            <h1 className="text-[18px] font-[700]">{unit.name}</h1>
                                            <div className="flex flex-row justify-start items-start text-[16px] font-[500] text-[#00000080] gap-3">
                                                <Boxes className="h-5 w-5 text-[#7B7B7A]" />
                                                <h1 className="capitalize">{unit.type || "Storage unit"}</h1>
                                                {unit.capacity && (
                                                    <span>
                                                        · {unit.capacity} {unit.capacity_unit || ""}
                                                    </span>
                                                )}
                                            </div>
                                            {unit.occupied && (
                                                <p className="text-[13px] text-[#7B7B7A] mt-1">
                                                    {unit.booking.client}
                                                </p>
                                            )}
                                        </div>
                                        <div
                                            className={`w-[101px] h-[33px] rounded-[5px] border-[1.5px] text-[16px] font-[700] flex justify-center items-center shrink-0 ${
                                                unit.occupied
                                                    ? "bg-[#50AE3140] border-[#50AE31] text-[#50AE31]"
                                                    : unit.is_active
                                                    ? "bg-[#F0BB0D40] border-[#F0BB0D] text-[#F0BB0D]"
                                                    : "bg-[#7B7B7A40] border-[#7B7B7A] text-[#7B7B7A]"
                                            }`}
                                        >
                                            {unit.occupied ? "In Use" : unit.is_active ? "Available" : "Inactive"}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected unit detail + upcoming */}
                    <div className="w-full h-auto flex flex-col gap-4">
                        {selectedUnit && (
                            <div
                                className="w-full bg-[#FFFFFF] rounded-[10px] px-5 py-5"
                                style={{ boxShadow: "4px 4px 4px #0000001A" }}
                            >
                                <div className="flex flex-row items-center gap-5">
                                    <Package className="size-[50px] 2xl:size-[70px] text-[#39CEF3] shrink-0" />
                                    <div className="text-[13px] font-[500] w-full">
                                        <h1 className="text-[18px] font-[700]">{selectedUnit.name}</h1>
                                        <div className="flex flex-row gap-3">
                                            <h1 className="text-[#00000080]">Type</h1>
                                            <h1 className="capitalize">{selectedUnit.type || "N/A"}</h1>
                                        </div>
                                        <div className="flex flex-row gap-3">
                                            <h1 className="text-[#00000080]">Total area</h1>
                                            <h1>{selectedUnit.total_area ? `${selectedUnit.total_area} sqft` : "N/A"}</h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div
                            className="w-full min-h-[200px] h-auto bg-[#FFFFFF] rounded-[10px] px-5 py-5"
                            style={{ boxShadow: "4px 4px 4px #0000001A" }}
                        >
                            <h1 className="text-[24px] font-[700]">Current Occupant</h1>
                            {selectedUnit?.occupied ? (
                                <div className="flex flex-col gap-3 py-5 text-[14px] font-[500]">
                                    <div className="flex flex-row justify-between">
                                        <span className="text-[#00000080]">Client</span>
                                        <span className="font-[700]">{selectedUnit.booking.client}</span>
                                    </div>
                                    {selectedUnit.booking.client_email && (
                                        <div className="flex flex-row justify-between items-center">
                                            <span className="text-[#00000080] flex items-center gap-1">
                                                <Mail className="w-4 h-4" /> Email
                                            </span>
                                            <span>{selectedUnit.booking.client_email}</span>
                                        </div>
                                    )}
                                    {selectedUnit.booking.client_phone && (
                                        <div className="flex flex-row justify-between items-center">
                                            <span className="text-[#00000080] flex items-center gap-1">
                                                <Phone className="w-4 h-4" /> Phone
                                            </span>
                                            <span>{selectedUnit.booking.client_phone}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-row justify-between">
                                        <span className="text-[#00000080]">Start date</span>
                                        <span>{selectedUnit.booking.start_date}</span>
                                    </div>
                                    <div className="flex flex-row justify-between">
                                        <span className="text-[#00000080]">End date</span>
                                        <span>{selectedUnit.booking.end_date}</span>
                                    </div>
                                    {selectedUnit.booking.goods_type && (
                                        <div className="flex flex-row justify-between">
                                            <span className="text-[#00000080]">Goods type</span>
                                            <span>{selectedUnit.booking.goods_type}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[#7B7B7A] py-5">
                                    This unit is currently {selectedUnit?.is_active ? "available" : "inactive"} — no active booking.
                                </p>
                            )}
                        </div>

                        <div
                            className="w-full h-auto bg-[#FFFFFF] rounded-[10px] px-5 py-5"
                            style={{ boxShadow: "4px 4px 4px #0000001A" }}
                        >
                            <h1 className="text-[24px] font-[700] flex items-center gap-2">
                                <CalendarClock className="w-5 h-5" /> Upcoming Move-ins
                            </h1>
                            {upcoming.length === 0 ? (
                                <p className="text-[#7B7B7A] py-5">No upcoming bookings scheduled.</p>
                            ) : (
                                <div className="flex flex-col divide-y divide-gray-100 mt-3">
                                    {upcoming.map((b) => (
                                        <div key={b.reference} className="py-3 flex flex-row justify-between text-[13px]">
                                            <div>
                                                <p className="font-[700]">{b.client}</p>
                                                <p className="text-[#7B7B7A]">{b.unit}</p>
                                            </div>
                                            <div className="text-right">
                                                <p>{b.start_date}</p>
                                                <p className="text-[#7B7B7A]">to {b.end_date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrackingContent;
