import React, { useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import { BusFront, TrainFront, Plus, Pencil, Trash2, X } from "lucide-react";

const emptySchedule = {
    departure_station_id: "",
    arrival_station_id: "",
    departure_time: "",
    arrival_time: "",
    duration_minutes: "",
    date: "",
    price: "",
    available_seats: "",
    is_expressway: false,
    status: "active",
};

const ScheduleModal = ({ unit, stations, schedule, onClose }) => {
    const isEdit = Boolean(schedule?.id);
    const [form, setForm] = useState(() =>
        isEdit
            ? {
                  departure_station_id: schedule.departureStationId,
                  arrival_station_id: schedule.arrivalStationId,
                  departure_time: schedule.departureTime,
                  arrival_time: schedule.arrivalTime,
                  duration_minutes: schedule.durationMinutes,
                  date: schedule.date,
                  price: schedule.price,
                  available_seats: schedule.availableSeats,
                  is_expressway: schedule.isExpressway,
                  status: schedule.status,
              }
            : emptySchedule
    );
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        const options = {
            preserveScroll: true,
            onError: (errs) => {
                setErrors(errs);
                setSubmitting(false);
            },
            onSuccess: () => onClose(true),
            onFinish: () => setSubmitting(false),
        };

        if (isEdit) {
            router.put(
                route("ticketBooking.schedules.update", { type: unit.type, id: unit.id, scheduleId: schedule.id }),
                form,
                options
            );
        } else {
            router.post(route("ticketBooking.schedules.store", { type: unit.type, id: unit.id }), form, options);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-[10px] w-full max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-[18px] font-[700]">{isEdit ? "Edit Schedule" : "Add Schedule"}</h2>
                    <button onClick={() => onClose(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Departure Station</label>
                        <select
                            name="departure_station_id"
                            value={form.departure_station_id}
                            onChange={handleChange}
                            className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                        >
                            <option value="">Select</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        {errors.departure_station_id && <p className="text-red-500 text-[12px] mt-1">{errors.departure_station_id}</p>}
                    </div>
                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Arrival Station</label>
                        <select
                            name="arrival_station_id"
                            value={form.arrival_station_id}
                            onChange={handleChange}
                            className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]"
                        >
                            <option value="">Select</option>
                            {stations.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        {errors.arrival_station_id && <p className="text-red-500 text-[12px] mt-1">{errors.arrival_station_id}</p>}
                    </div>

                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Date</label>
                        <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.date && <p className="text-red-500 text-[12px] mt-1">{errors.date}</p>}
                    </div>
                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Status</label>
                        <select name="status" value={form.status} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px] capitalize">
                            {(unit.type === "bus" ? ["active", "cancelled", "completed"] : ["active", "cancelled", "delayed"]).map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Departure Time</label>
                        <input type="time" name="departure_time" value={form.departure_time} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.departure_time && <p className="text-red-500 text-[12px] mt-1">{errors.departure_time}</p>}
                    </div>
                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Arrival Time</label>
                        <input type="time" name="arrival_time" value={form.arrival_time} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.arrival_time && <p className="text-red-500 text-[12px] mt-1">{errors.arrival_time}</p>}
                    </div>

                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Duration (minutes)</label>
                        <input type="number" min="1" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.duration_minutes && <p className="text-red-500 text-[12px] mt-1">{errors.duration_minutes}</p>}
                    </div>
                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Price</label>
                        <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.price && <p className="text-red-500 text-[12px] mt-1">{errors.price}</p>}
                    </div>

                    <div>
                        <label className="block text-[13px] font-[500] mb-1">Available Seats (max {unit.capacity})</label>
                        <input type="number" min="0" max={unit.capacity} name="available_seats" value={form.available_seats} onChange={handleChange} className="w-full p-2.5 bg-[#F7F7F7] rounded-[6px] outline-none text-[14px]" />
                        {errors.available_seats && <p className="text-red-500 text-[12px] mt-1">{errors.available_seats}</p>}
                    </div>

                    {unit.type === "bus" && (
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-[13px] font-[500]">
                                <input type="checkbox" name="is_expressway" checked={form.is_expressway} onChange={handleChange} />
                                Expressway route
                            </label>
                        </div>
                    )}

                    <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => onClose(false)} className="px-5 py-2 rounded-[6px] bg-gray-100 text-[14px] font-[600]">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 rounded-[6px] bg-[#0955AC] text-white text-[14px] font-[600] disabled:opacity-60">
                            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Schedule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UnitDetailsContent = () => {
    const { unit, busStations = [], trainStations = [] } = usePage().props;
    const stations = unit.type === "bus" ? busStations : trainStations;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);

    const openAdd = () => {
        setEditingSchedule(null);
        setModalOpen(true);
    };

    const openEdit = (schedule) => {
        setEditingSchedule(schedule);
        setModalOpen(true);
    };

    const closeModal = () => {
        // The store/update requests already redirect back to this page with
        // fresh props (Laravel's back() + Inertia following the redirect), so
        // no extra reload is needed here.
        setModalOpen(false);
        setEditingSchedule(null);
    };

    const handleDeleteSchedule = (schedule) => {
        if (!window.confirm(`Remove the ${schedule.date} ${schedule.departureTime} schedule?`)) return;
        router.delete(
            route("ticketBooking.schedules.destroy", { type: unit.type, id: unit.id, scheduleId: schedule.id }),
            { preserveScroll: true }
        );
    };

    return (
        <div className="flex flex-col gap-8 w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16">
            <div className="flex items-center gap-2 text-[13px] text-[#7B7B7A]">
                <Link href={route("ticketBooking.units")} className="hover:underline">
                    My Fleet
                </Link>
                <span>/</span>
                <span className="text-[#000]">{unit.name}</span>
            </div>

            <div className="bg-white rounded-[10px] p-6 flex flex-col md:flex-row justify-between gap-4" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                <div className="flex items-center gap-4">
                    <div className="size-[56px] rounded-full bg-[#D8E4F2] flex items-center justify-center">
                        {unit.type === "bus" ? <BusFront className="w-6 h-6 text-[#0955AC]" /> : <TrainFront className="w-6 h-6 text-[#0955AC]" />}
                    </div>
                    <div>
                        <h1 className="text-[20px] font-[700]">{unit.name}</h1>
                        <p className="text-[13px] text-[#7B7B7A]">
                            {unit.number} · {unit.subType} · Route {unit.routeNumber} · {unit.capacity} seats
                        </p>
                    </div>
                </div>
                <Link href={route("ticketBooking.addUnit", { type: unit.type, id: unit.id })} className="self-start px-4 py-2 rounded-[6px] bg-gray-100 text-[13px] font-[600] flex items-center gap-2">
                    <Pencil className="w-4 h-4" /> Edit Details
                </Link>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-[18px] font-[700]">Schedules ({unit.schedules?.length || 0})</h2>
                <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-[6px] bg-[#0955AC] text-white text-[14px] font-[600]">
                    <Plus className="w-4 h-4" /> Add Schedule
                </button>
            </div>

            {!unit.schedules?.length ? (
                <div className="bg-white rounded-[10px] p-16 text-center text-[#7B7B7A]" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    No schedules yet. Add one so customers can search and book this {unit.type}.
                </div>
            ) : (
                <div className="bg-white rounded-[10px] overflow-x-auto" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="bg-[#D8E4F2] text-[13px] font-[600]">
                                <th className="text-left px-4 py-3">Route</th>
                                <th className="text-left px-4 py-3">Date</th>
                                <th className="text-left px-4 py-3">Time</th>
                                <th className="text-left px-4 py-3">Price</th>
                                <th className="text-left px-4 py-3">Seats</th>
                                <th className="text-left px-4 py-3">Bookings</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unit.schedules.map((s) => (
                                <tr key={s.id} className="border-b border-gray-100">
                                    <td className="px-4 py-3">
                                        {s.departureStation} → {s.arrivalStation}
                                        {s.isExpressway && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[#0955AC1A] text-[#0955AC] rounded">Expressway</span>}
                                    </td>
                                    <td className="px-4 py-3">{s.date}</td>
                                    <td className="px-4 py-3">
                                        {s.departureTime} - {s.arrivalTime}
                                    </td>
                                    <td className="px-4 py-3">${Number(s.price).toFixed(2)}</td>
                                    <td className="px-4 py-3">{s.availableSeats}</td>
                                    <td className="px-4 py-3">{s.bookingsCount}</td>
                                    <td className="px-4 py-3 capitalize">{s.status}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => openEdit(s)} className="p-1.5 rounded bg-gray-100">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleDeleteSchedule(s)} className="p-1.5 rounded bg-red-50 text-red-600">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && <ScheduleModal unit={unit} stations={stations} schedule={editingSchedule} onClose={closeModal} />}
        </div>
    );
};

export default UnitDetailsContent;
