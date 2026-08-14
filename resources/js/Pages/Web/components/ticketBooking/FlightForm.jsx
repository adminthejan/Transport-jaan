import React, { useEffect, useState } from "react";
import { useForm } from "@inertiajs/react";

const FlightForm = () => {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        special_requests: '',
        trip_type: '',
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

    return (
        <div className="px-4 sm:px-6 md:px-20 py-6">
            <form
                onSubmit={handleSubmit}
                className="figtree flex flex-col justify-center items-center bg-white p-4 sm:p-6 rounded-[15px] w-full h-auto text-[#286BB6] text-[13px] font-[400]"
                style={{ boxShadow: "0px 4px 4px 0px rgba(0, 0, 0, 0.25)" }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-4">
                    <div>
                        <label className="block mb-1">Your Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={data.name}
                            onChange={handleInputChange}
                            placeholder="Enter your name"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-1">Your Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={data.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-4">
                    <div>
                        <label className="block mb-1">Phone Number *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={data.phone}
                            onChange={handleInputChange}
                            placeholder="Enter your phone number"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.phone ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-1">Subject *</label>
                        <input
                            type="text"
                            name="subject"
                            value={data.subject}
                            onChange={handleInputChange}
                            placeholder="Enter subject"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.subject ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.subject && (
                            <p className="text-red-500 text-xs mt-1">{errors.subject}</p>
                        )}
                    </div>
                </div>

                <div className="w-full mb-4">
                    <label className="block mb-1">Special Requests</label>
                    <textarea
                        name="special_requests"
                        value={data.special_requests}
                        onChange={handleInputChange}
                        placeholder="Any special requests"
                        className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                            errors.special_requests ? 'border-red-500' : 'border-gray-300'
                        }`}
                        rows="3"
                    ></textarea>
                    {errors.special_requests && (
                        <p className="text-red-500 text-xs mt-1">{errors.special_requests}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-4">
                    <div>
                        <label className="block mb-1">One way / Return *</label>
                        <select
                            name="trip_type"
                            value={data.trip_type}
                            onChange={handleInputChange}
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.trip_type ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        >
                            <option value="">Select option</option>
                            <option value="oneway">One way</option>
                            <option value="return">Return</option>
                        </select>
                        {errors.trip_type && (
                            <p className="text-red-500 text-xs mt-1">{errors.trip_type}</p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-1">Departure Date *</label>
                        <input
                            type="date"
                            name="departure_date"
                            value={data.departure_date}
                            onChange={handleInputChange}
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.departure_date ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.departure_date && (
                            <p className="text-red-500 text-xs mt-1">{errors.departure_date}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-4">
                    <div>
                        <label className="block mb-1">
                            Departure Airport *
                        </label>
                        <input
                            type="text"
                            name="departure_airport"
                            value={data.departure_airport}
                            onChange={handleInputChange}
                            placeholder="Enter departure airport"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.departure_airport ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.departure_airport && (
                            <p className="text-red-500 text-xs mt-1">{errors.departure_airport}</p>
                        )}
                    </div>
                    <div>
                        <label className="block mb-1">Arriving Airport *</label>
                        <input
                            type="text"
                            name="arriving_airport"
                            value={data.arriving_airport}
                            onChange={handleInputChange}
                            placeholder="Enter arriving airport"
                            className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                                errors.arriving_airport ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                        />
                        {errors.arriving_airport && (
                            <p className="text-red-500 text-xs mt-1">{errors.arriving_airport}</p>
                        )}
                    </div>
                </div>

                <div className="w-full mb-6">
                    <label className="block mb-1">
                        Return Date {data.trip_type === 'return' && '*'}
                    </label>
                    <input
                        type="date"
                        name="return_date"
                        value={data.return_date}
                        onChange={handleInputChange}
                        className={`w-full border rounded-[8px] p-3 sm:p-4 ${
                            errors.return_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required={data.trip_type === 'return'}
                    />
                    {errors.return_date && (
                        <p className="text-red-500 text-xs mt-1">{errors.return_date}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className={`bg-[#0955AC] text-white font-bold h-[56px] w-full rounded-[8px] hover:bg-[#07448a] transition-colors ${
                        processing ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                >
                    {processing ? 'Processing...' : 'Submit Booking Request'}
                </button>
            </form>
        </div>
    );
};

export default FlightForm;
