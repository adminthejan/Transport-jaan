import React from "react";
import { router, usePage } from "@inertiajs/react";
import { Plus, Snowflake, ArrowUpFromLine, Navigation, ShieldCheck } from "lucide-react";
import CourierFeedbackModal from "../common/CourierFeedbackModal";
import useCourierActionModal from "../common/useCourierActionModal";

const statusBadge = (status) => {
    switch (status) {
        case "Available":
            return "bg-[#DCFCE7] text-[#166534]";
        case "In Service":
            return "bg-[#DBEAFE] text-[#1D4ED8]";
        case "Maintenance":
            return "bg-[#FEF3C7] text-[#92400E]";
        default:
            return "bg-[#F3F4F6] text-[#374151]";
    }
};

const formatMoney = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : null;
};

const VehicleContent = () => {
    const props = usePage().props;
    const vehicles = Array.isArray(props.vehicles) ? props.vehicles : [];
    const flash = props.flash || {};
    const { feedback, closeFeedback, confirmState, openConfirm, closeConfirm, runConfirm } = useCourierActionModal(flash);

    const deleteVehicle = (vehicle) => {
        openConfirm({
            title: "Remove Vehicle",
            message: `Remove ${vehicle.brand || ""} ${vehicle.model || "this vehicle"} from your fleet? This cannot be undone.`,
            onConfirm: () => {
                router.delete(`/courierService/vehicles/${vehicle.id}`, { preserveScroll: true });
            },
        });
    };

    return (
        <div className="w-full h-auto lg:pl-4 lg:pr-5 pt-6 pb-12">
            <CourierFeedbackModal
                open={Boolean(feedback)}
                type={feedback?.type || "info"}
                message={feedback?.message || ""}
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
                    <h1 className="figtree text-[34px] font-[700]">My Vehicles</h1>
                    <p className="text-[14px] text-[#6B7280] mt-1">
                        Delivery vehicles registered to your courier fleet.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => router.visit("/courierService/addUnit")}
                    className="h-[42px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700] flex items-center gap-2 self-start"
                >
                    <Plus size={16} />
                    Add Vehicle
                </button>
            </div>

            {vehicles.length === 0 ? (
                <div className="bg-white rounded-[10px] p-10 mt-6 text-center" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    <p className="text-[15px] text-[#374151] font-[600]">No vehicles registered yet.</p>
                    <p className="text-[13px] text-[#6B7280] mt-1">
                        Add a delivery vehicle to start accepting courier assignments for it.
                    </p>
                    <button
                        type="button"
                        onClick={() => router.visit("/courierService/addUnit")}
                        className="mt-4 h-[38px] px-4 rounded-[8px] bg-[#0955AC] text-white text-[13px] font-[700]"
                    >
                        Add Your First Vehicle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
                    {vehicles.map((vehicle) => {
                        const pricePerKm = formatMoney(vehicle.price_per_km);
                        const baseFee = formatMoney(vehicle.base_fee);
                        return (
                            <div
                                key={vehicle.id}
                                className="bg-white rounded-[10px] p-4"
                                style={{ boxShadow: "4px 4px 4px #0000001A" }}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-[17px] font-[700]">
                                            {vehicle.brand || "Unnamed"} {vehicle.model || ""}
                                        </h2>
                                        <p className="text-[12px] text-[#6B7280]">
                                            {vehicle.vehicle_type || "Vehicle"} • {vehicle.registration_number || "No plate number"}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-[700] ${statusBadge(vehicle.status)}`}>
                                        {vehicle.status || "Available"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-3 text-[12px] text-[#374151]">
                                    <p><span className="text-[#6B7280]">Base:</span> {vehicle.base_location || "-"}</p>
                                    <p><span className="text-[#6B7280]">Areas:</span> {vehicle.service_areas || "-"}</p>
                                    <p><span className="text-[#6B7280]">Capacity:</span> {vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : "-"}</p>
                                    <p><span className="text-[#6B7280]">Volume:</span> {vehicle.volume_cbm ? `${vehicle.volume_cbm} m³` : "-"}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-3">
                                    {vehicle.refrigerated && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#E0F2FE] text-[#075985] text-[11px] font-[600]">
                                            <Snowflake size={12} /> Refrigerated
                                        </span>
                                    )}
                                    {vehicle.tail_lift && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EEF2FF] text-[#3730A3] text-[11px] font-[600]">
                                            <ArrowUpFromLine size={12} /> Tail Lift
                                        </span>
                                    )}
                                    {vehicle.gps && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F0FDF4] text-[#166534] text-[11px] font-[600]">
                                            <Navigation size={12} /> GPS
                                        </span>
                                    )}
                                    {vehicle.fragile_support && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-[600]">
                                            <ShieldCheck size={12} /> Fragile Support
                                        </span>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                                    <p className="text-[13px] font-[700] text-[#0955AC]">
                                        {pricePerKm ? `LKR ${pricePerKm}/km` : "No per-km rate set"}
                                        {baseFee ? ` + ${baseFee} base` : ""}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => deleteVehicle(vehicle)}
                                        className="text-[12px] font-[700] text-[#B91C1C] hover:underline"
                                    >
                                        Remove
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

export default VehicleContent;
