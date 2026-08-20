import React, { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import {
    User,
    Mail,
    Phone,
    MessageSquare,
    PlaneTakeoff,
    PlaneLanding,
    CalendarDays,
    Send,
} from "lucide-react";

const FlightForm = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        special_requests: '',
        trip_type: 'oneway',
        departure_date: '',
        return_date: '',
        departure_airport: '',
        arriving_airport: '',
    });

    // Pre-fill from the quick "Scheduled Flight" search on the Air rental
    // page, so picking a route/date there doesn't have to be re-typed here.
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search || "");
            const patch = {};
            ['trip_type', 'departure_date', 'return_date', 'departure_airport', 'arriving_airport'].forEach((key) => {
                const value = sp.get(key);
                if (value) patch[key] = value;
            });
            if (Object.keys(patch).length > 0) {
                setData((prev) => ({ ...prev, ...patch }));
            }
        } catch (e) {
            // ignore
        }
        // run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('flight-bookings.store'), {
            onSuccess: () => {
                reset();
                // The success message will be handled by the backend's session flash
            },
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setData(name, value);
    };

    const fieldClass = (hasError) =>
        `w-full h-[52px] rounded-[12px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
            hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
        }`;

    const textareaClass = (hasError) =>
        `w-full rounded-[12px] border p-4 text-[14px] font-[500] text-[#0F172A] bg-white outline-none transition-colors resize-none ${
            hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
        }`;

    const labelClass = "block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5";

    return (
        <div className="bg-white rounded-[20px] shadow-[0_10px_30px_rgba(9,85,172,0.10)] border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0955AC] to-[#073E82] px-6 py-5 text-center">
                <span className="text-yellow-400 font-bold text-[18px] tracking-wide">
                    Request a Charter Quote
                </span>
                <p className="text-white/80 text-[12px] mt-1">
                    Tell us your route and travel dates — our team will get back to you with pricing and availability.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                {/* Trip type segmented control */}
                <div className="inline-flex bg-[#F1F5F9] rounded-full p-1 mb-6">
                    {[
                        { value: "oneway", label: "One way" },
                        { value: "return", label: "Return" },
                    ].map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setData("trip_type", opt.value)}
                            className={`px-6 py-2 rounded-full text-[13px] font-[700] transition-all ${
                                data.trip_type === opt.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                {errors.trip_type && <p className="text-red-500 text-xs -mt-4 mb-4">{errors.trip_type}</p>}

                {/* Trip details */}
                <h3 className="text-[13px] font-[700] text-[#0F172A] mb-3">Trip Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>DEPARTURE AIRPORT</label>
                        <div className="relative">
                            <PlaneTakeoff className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="text"
                                name="departure_airport"
                                value={data.departure_airport}
                                onChange={handleInputChange}
                                placeholder="e.g. Bandaranaike International (CMB)"
                                className={fieldClass(errors.departure_airport)}
                            />
                        </div>
                        {errors.departure_airport && <p className="text-red-500 text-xs mt-1">{errors.departure_airport}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>ARRIVING AIRPORT</label>
                        <div className="relative">
                            <PlaneLanding className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826] pointer-events-none" />
                            <input
                                type="text"
                                name="arriving_airport"
                                value={data.arriving_airport}
                                onChange={handleInputChange}
                                placeholder="Destination airport"
                                className={fieldClass(errors.arriving_airport)}
                            />
                        </div>
                        {errors.arriving_airport && <p className="text-red-500 text-xs mt-1">{errors.arriving_airport}</p>}
                    </div>
                </div>

                <div className={`grid gap-4 mb-6 ${data.trip_type === 'return' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <div>
                        <label className={labelClass}>DEPARTURE DATE</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="date"
                                name="departure_date"
                                value={data.departure_date}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                                className={fieldClass(errors.departure_date)}
                            />
                        </div>
                        {errors.departure_date && <p className="text-red-500 text-xs mt-1">{errors.departure_date}</p>}
                    </div>

                    {data.trip_type === 'return' && (
                        <div>
                            <label className={labelClass}>RETURN DATE</label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#EF3826] pointer-events-none" />
                                <input
                                    type="date"
                                    name="return_date"
                                    value={data.return_date}
                                    onChange={handleInputChange}
                                    min={data.departure_date || new Date().toISOString().split('T')[0]}
                                    className={fieldClass(errors.return_date)}
                                />
                            </div>
                            {errors.return_date && <p className="text-red-500 text-xs mt-1">{errors.return_date}</p>}
                        </div>
                    )}
                </div>

                {/* Contact details */}
                <h3 className="text-[13px] font-[700] text-[#0F172A] mb-3">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>YOUR NAME</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="text"
                                name="name"
                                value={data.name}
                                onChange={handleInputChange}
                                placeholder="Enter your name"
                                className={fieldClass(errors.name)}
                            />
                        </div>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>YOUR EMAIL</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="email"
                                name="email"
                                value={data.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                className={fieldClass(errors.email)}
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className={labelClass}>PHONE NUMBER</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="tel"
                                name="phone"
                                value={data.phone}
                                onChange={handleInputChange}
                                placeholder="Enter your phone number"
                                className={fieldClass(errors.phone)}
                            />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>SUBJECT</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC] pointer-events-none" />
                            <input
                                type="text"
                                name="subject"
                                value={data.subject}
                                onChange={handleInputChange}
                                placeholder="e.g. Charter for 6 passengers"
                                className={fieldClass(errors.subject)}
                            />
                        </div>
                        {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
                    </div>
                </div>

                <div className="mb-6">
                    <label className={labelClass}>SPECIAL REQUESTS (OPTIONAL)</label>
                    <textarea
                        name="special_requests"
                        value={data.special_requests}
                        onChange={handleInputChange}
                        placeholder="Passenger count, preferred aircraft type, luggage needs, etc."
                        rows="3"
                        className={textareaClass(errors.special_requests)}
                    ></textarea>
                    {errors.special_requests && <p className="text-red-500 text-xs mt-1">{errors.special_requests}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className={`w-full h-[52px] bg-[#0955AC] hover:bg-[#073E82] text-white font-[700] text-[15px] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(9,85,172,0.25)] ${
                        processing ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                    <Send className="w-[18px] h-[18px]" />
                    {processing ? 'Sending Request...' : 'Get a Charter Quote'}
                </button>
                <p className="text-center text-[12px] text-[#94A3B8] mt-3">
                    This is a quote request, not an instant booking — a member of our team will confirm pricing and availability by email or phone.
                </p>
            </form>
        </div>
    );
};

export default FlightForm;
