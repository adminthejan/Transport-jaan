import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import VendorShellLayout from "../../../../../Components/vendors/VendorShellLayout";

const FACILITY_OPTIONS = ["A/C", "WiFi", "USB", "TV", "Recline", "Toilet", "CCTV"];
const CLASS_TYPE_OPTIONS = ["1st Class", "2nd Class", "3rd Class", "Luxury (A/C)", "Semi Luxury (NL)"];
const BUS_TYPE_SUGGESTIONS = ["Luxury (A/C)", "Semi Luxury", "Normal", "Normal (Non-AC)", "Super Luxury"];
const STATUS_OPTIONS = ["active", "inactive", "maintenance"];

const emptyForm = {
    type: "bus",
    name: "",
    bus_number: "",
    train_number: "",
    bus_type: "",
    class_type: "",
    route_number: "",
    facilities: [],
    capacity: "",
    operator: "",
    status: "active",
};

const AddUnit = () => {
    const { editing } = usePage().props;
    const isEdit = Boolean(editing);

    const [form, setForm] = useState(() =>
        isEdit
            ? {
                  type: editing.type,
                  name: editing.name || "",
                  bus_number: editing.type === "bus" ? editing.number || "" : "",
                  train_number: editing.type === "train" ? editing.number || "" : "",
                  bus_type: editing.type === "bus" ? editing.subType || "" : "",
                  class_type: editing.type === "train" ? editing.subType || "" : "",
                  route_number: editing.routeNumber || "",
                  facilities: editing.facilities || [],
                  capacity: editing.capacity || "",
                  operator: editing.operator || "",
                  status: editing.status || "active",
              }
            : emptyForm
    );
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleFacility = (facility) => {
        setForm((prev) => ({
            ...prev,
            facilities: prev.facilities.includes(facility)
                ? prev.facilities.filter((f) => f !== facility)
                : [...prev.facilities, facility],
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const payload = useMemo(() => {
        const base = {
            name: form.name,
            route_number: form.route_number,
            facilities: form.facilities,
            capacity: form.capacity,
            operator: form.operator,
            status: form.status,
        };

        if (form.type === "bus") {
            return { ...base, type: "bus", bus_number: form.bus_number, bus_type: form.bus_type };
        }

        return { ...base, type: "train", train_number: form.train_number, class_type: form.class_type };
    }, [form]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const options = {
            preserveScroll: true,
            onError: (errs) => {
                setErrors(errs);
                setIsSubmitting(false);
            },
            onSuccess: () => {
                router.visit(route("ticketBooking.units"));
            },
            onFinish: () => setIsSubmitting(false),
        };

        if (isEdit) {
            router.put(route("ticketBooking.units.update", { type: editing.type, id: editing.id }), payload, options);
        } else {
            router.post(route("ticketBooking.units.store"), payload, options);
        }
    };

    return (
        <VendorShellLayout activeService="Ticket Booking">
            <div className="flex flex-col gap-8 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16">
                <h1 className="text-[22px] md:text-[32px] font-[700]">
                    {isEdit ? `Edit ${editing.type === "bus" ? "Bus" : "Train"}` : "Add Bus / Train"}
                </h1>

                <form onSubmit={handleSubmit} className="bg-white rounded-[10px] shadow-sm p-6 md:p-10 space-y-8 max-w-[820px]">
                    {!isEdit && (
                        <div>
                            <label className="block text-[14px] font-[600] mb-2">Unit Type</label>
                            <div className="flex gap-4">
                                {["bus", "train"].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, type: t }))}
                                        className={`px-6 py-2 rounded-[6px] border font-[600] text-[14px] capitalize ${
                                            form.type === t
                                                ? "bg-[#0955AC] text-white border-[#0955AC]"
                                                : "bg-[#F3F3F3] text-[#333] border-transparent"
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[13px] font-[500] mb-1">Name</label>
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                placeholder={form.type === "bus" ? "e.g. Laksiri Express" : "e.g. Udarata Menike"}
                            />
                            {errors.name && <p className="text-red-500 text-[12px] mt-1">{errors.name}</p>}
                        </div>

                        {form.type === "bus" ? (
                            <>
                                <div>
                                    <label className="block text-[13px] font-[500] mb-1">Bus Number</label>
                                    <input
                                        name="bus_number"
                                        value={form.bus_number}
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                        placeholder="e.g. NC-4521"
                                    />
                                    {errors.bus_number && <p className="text-red-500 text-[12px] mt-1">{errors.bus_number}</p>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-[500] mb-1">Bus Type</label>
                                    <input
                                        name="bus_type"
                                        list="bus-type-suggestions"
                                        value={form.bus_type}
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                        placeholder="e.g. Luxury (A/C)"
                                    />
                                    <datalist id="bus-type-suggestions">
                                        {BUS_TYPE_SUGGESTIONS.map((o) => (
                                            <option key={o} value={o} />
                                        ))}
                                    </datalist>
                                    {errors.bus_type && <p className="text-red-500 text-[12px] mt-1">{errors.bus_type}</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-[13px] font-[500] mb-1">Train Number</label>
                                    <input
                                        name="train_number"
                                        value={form.train_number}
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                        placeholder="e.g. TR-1042"
                                    />
                                    {errors.train_number && <p className="text-red-500 text-[12px] mt-1">{errors.train_number}</p>}
                                </div>
                                <div>
                                    <label className="block text-[13px] font-[500] mb-1">Class Type</label>
                                    <select
                                        name="class_type"
                                        value={form.class_type}
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                    >
                                        <option value="">Select class</option>
                                        {CLASS_TYPE_OPTIONS.map((o) => (
                                            <option key={o} value={o}>
                                                {o}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.class_type && <p className="text-red-500 text-[12px] mt-1">{errors.class_type}</p>}
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-[13px] font-[500] mb-1">Route Number</label>
                            <input
                                name="route_number"
                                value={form.route_number}
                                onChange={handleChange}
                                className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                placeholder="e.g. 01, 02, Main Line"
                            />
                            {errors.route_number && <p className="text-red-500 text-[12px] mt-1">{errors.route_number}</p>}
                        </div>

                        <div>
                            <label className="block text-[13px] font-[500] mb-1">Capacity (seats)</label>
                            <input
                                type="number"
                                min="1"
                                name="capacity"
                                value={form.capacity}
                                onChange={handleChange}
                                className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                            />
                            {errors.capacity && <p className="text-red-500 text-[12px] mt-1">{errors.capacity}</p>}
                        </div>

                        <div>
                            <label className="block text-[13px] font-[500] mb-1">Operator / Display Name</label>
                            <input
                                name="operator"
                                value={form.operator}
                                onChange={handleChange}
                                className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                                placeholder="Shown to customers, defaults to your name"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-[500] mb-1">Status</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px] capitalize"
                            >
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-[500] mb-2">Facilities</label>
                        <div className="flex flex-wrap gap-3">
                            {FACILITY_OPTIONS.map((facility) => (
                                <label
                                    key={facility}
                                    className={`px-4 py-2 rounded-[6px] text-[13px] font-[500] cursor-pointer border ${
                                        form.facilities.includes(facility)
                                            ? "bg-[#0955AC] text-white border-[#0955AC]"
                                            : "bg-[#F3F3F3] text-[#333] border-transparent"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={form.facilities.includes(facility)}
                                        onChange={() => toggleFacility(facility)}
                                    />
                                    {facility}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => router.visit(route("ticketBooking.units"))}
                            className="px-5 py-2.5 rounded-[6px] bg-gray-100 text-[14px] font-[600]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-[6px] bg-[#0955AC] text-white text-[14px] font-[600] disabled:opacity-60"
                        >
                            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Add Unit"}
                        </button>
                    </div>
                </form>
            </div>
        </VendorShellLayout>
    );
};

export default AddUnit;
