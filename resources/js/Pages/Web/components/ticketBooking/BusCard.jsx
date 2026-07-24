import React, { useState } from "react";
import { router } from "@inertiajs/react";
import { MapPin, ArrowLeftRight, CalendarDays, Search } from "lucide-react";

const BusCard = () => {
    const [tripType, setTripType] = useState("oneway");
    const [busFrom, setBusFrom] = useState("");
    const [busTo, setBusTo] = useState("");
    const [busDate, setBusDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [errors, setErrors] = useState({});

    const stationOptions = [
        "Colombo Central Bus Stand",
        "Pettah Bus Station",
        "Kandy Bus Terminal",
        "Galle Bus Station",
        "Matara Bus Station",
        "Anuradhapura Bus Station",
        "Kurunegala Bus Station",
        "Ratnapura Bus Station",
        "Badulla Bus Station",
        "Jaffna Bus Station",
        "Negombo Bus Station",
        "Gampaha Bus Station",
        "Kalutara Bus Station",
        "Hambantota Bus Station",
        "Trincomalee Bus Station",
        "Batticaloa Bus Station",
        "Polonnaruwa Bus Station",
        "Nuwara Eliya Bus Station",
        "Bandarawela Bus Station",
        "Chilaw Bus Station"
    ];

    const swapStations = () => {
        setBusFrom(busTo);
        setBusTo(busFrom);
    };

    const onSubmitBus = (e) => {
        e.preventDefault();

        const newErrors = {};
        if (!busFrom) newErrors.busFrom = true;
        if (!busTo) newErrors.busTo = true;
        if (!busDate) newErrors.busDate = true;
        if (tripType === 'roundtrip' && !returnDate) newErrors.returnDate = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        router.get('/busTicketBookingDetails', {
            from: busFrom,
            to: busTo,
            date: busDate,
            tripType,
            returnDate: tripType === 'roundtrip' ? returnDate : undefined,
        });
    };

    const fieldClass = (hasError) =>
        `w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white appearance-none outline-none transition-colors ${
            hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
        }`;

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(9,85,172,0.10)] border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5 text-center">
                <span className="text-yellow-400 font-bold text-[18px] tracking-wide">Find Your Buses</span>
            </div>

            <form onSubmit={onSubmitBus} className="p-6 sm:p-8">
                {/* Trip Type segmented control */}
                <div className="inline-flex bg-[#F1F5F9] rounded-full p-1 mb-6">
                    {[
                        { value: "oneway", label: "One way" },
                        { value: "roundtrip", label: "Round Trip" },
                    ].map((t) => (
                        <button
                            type="button"
                            key={t.value}
                            onClick={() => setTripType(t.value)}
                            className={`px-6 py-2 rounded-full text-[13px] font-[700] transition-all ${
                                tripType === t.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* From / To with swap button */}
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">FROM</label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
                            <select value={busFrom} onChange={(e) => setBusFrom(e.target.value)} className={fieldClass(errors.busFrom)}>
                                <option value="" disabled></option>
                                {stationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">TO</label>
                        <div className="relative">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826]" />
                            <select value={busTo} onChange={(e) => setBusTo(e.target.value)} className={fieldClass(errors.busTo)}>
                                <option value="" disabled></option>
                                {stationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Swap button, centered on the seam between the two fields */}
                    <button
                        type="button"
                        onClick={swapStations}
                        title="Swap stations"
                        className="hidden md:flex absolute left-1/2 top-[34px] -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-[#0955AC] text-[#0955AC] items-center justify-center shadow-sm hover:bg-[#0955AC] hover:text-white transition-colors z-10"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Dates */}
                <div className={`grid gap-4 mb-6 ${tripType === 'roundtrip' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                        <label className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">JOURNEY DATE</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="date"
                                value={busDate}
                                onChange={(e) => setBusDate(e.target.value)}
                                className={fieldClass(errors.busDate)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>

                    {tripType === 'roundtrip' && (
                        <div>
                            <label className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5">RETURN DATE</label>
                            <div className="relative">
                                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826] pointer-events-none" />
                                <input
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className={fieldClass(errors.returnDate)}
                                    min={busDate || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[15px] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)]"
                >
                    <Search className="w-[18px] h-[18px]" />
                    Search Buses
                </button>
            </form>
        </div>
    );
};

export default BusCard;
