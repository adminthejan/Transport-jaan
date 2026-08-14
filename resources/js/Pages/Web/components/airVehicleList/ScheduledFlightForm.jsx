import React, { useState } from "react";
import { router } from "@inertiajs/react";
import calendarBlue from "../../assets/vehicleList/calendarBlue.png"

/**
 * Quick search for booking a seat on an already-scheduled flight — distinct
 * from chartering a whole aircraft (the SearchForm/AirVehicleListContent
 * flow next to this one). Submits into the existing flight quote-request
 * form (FlightForm.jsx) with these fields pre-filled, rather than
 * duplicating that flow here.
 */
const ScheduledFlightForm = () => {
  const [tripType, setTripType] = useState("oneway");
  const [guests, setGuests] = useState(1);
  const [departingFrom, setDepartingFrom] = useState("");
  const [travellingTo, setTravellingTo] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [errors, setErrors] = useState({});

  const handleBookNow = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!departingFrom.trim()) newErrors.departingFrom = true;
    if (!travellingTo.trim()) newErrors.travellingTo = true;
    if (!departureDate) newErrors.departureDate = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    router.visit('/flightBooking', {
      method: 'get',
      data: {
        trip_type: tripType,
        departure_airport: departingFrom,
        arriving_airport: travellingTo,
        departure_date: departureDate,
        guests,
        promo_code: promoCode || undefined,
      },
    });
  };

  const fieldClass = (hasError) =>
    `shadow-sm w-full border-[1px] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline placeholder:text-[#286BB6] ${
      hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#0000001A]"
    }`;

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <form onSubmit={handleBookNow} className="figtree bg-white p-4 sm:p-6 rounded-[15px] shadow-2xl shadow-[#00000040] w-full max-w-[1110px] text-[#286BB6] text-[13px] font-[400]">
        {/* Trip type + Guests */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="w-full sm:w-[200px]">
            <label className="block mb-1">Trip Type</label>
            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              className="shadow-sm w-full border-[1px] border-[#0000001A] rounded-[8px] p-[16px] leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="oneway">One Way</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div className="w-full sm:w-[160px]">
            <label className="block mb-1">Guests</label>
            <div className="flex items-center border-[1px] border-[#0000001A] rounded-[8px] h-[56px]">
              <button
                type="button"
                className="px-4 h-full text-[#286BB6] hover:bg-blue-50 rounded-l-[8px]"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
              >
                −
              </button>
              <span className="flex-1 text-center font-[700] text-[#0F172A]">{guests} Guest{guests > 1 ? "s" : ""}</span>
              <button
                type="button"
                className="px-4 h-full text-[#286BB6] hover:bg-blue-50 rounded-r-[8px]"
                onClick={() => setGuests((g) => g + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Route + date + promo + submit */}
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex flex-col sm:flex-row flex-grow gap-4 w-full">
            <div className="w-full sm:flex-1">
              <label className="block mb-1">Departing From</label>
              <input
                type="text"
                value={departingFrom}
                onChange={(e) => setDepartingFrom(e.target.value)}
                placeholder="e.g., Colombo - Bandaranaike International"
                className={fieldClass(errors.departingFrom)}
              />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block mb-1">Travelling To</label>
              <input
                type="text"
                value={travellingTo}
                onChange={(e) => setTravellingTo(e.target.value)}
                placeholder="Destination airport"
                className={fieldClass(errors.travellingTo)}
              />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block mb-1">Departure Date</label>
              <div className="relative flex items-center">
                <input
                  type="date"
                  id="scheduledFlightDate"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`${fieldClass(errors.departureDate)} pr-12`}
                />
                <img
                  src={calendarBlue}
                  className="absolute inset-y-5 right-0 flex items-center pr-3 cursor-pointer"
                  alt="calendar"
                  onClick={() => document.getElementById('scheduledFlightDate')?.showPicker?.()}
                />
              </div>
            </div>
            <div className="w-full sm:flex-1">
              <label className="block mb-1">Promo Code</label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Optional"
                className={fieldClass(false)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="bg-[#0955AC] text-white font-bold h-[56px] w-full sm:w-auto sm:px-8 flex items-center justify-center rounded-[8px] focus:outline-none focus:shadow-outline cursor-pointer mt-4 sm:mt-0 hover:bg-[#074494] transition-colors"
          >
            Book Now
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduledFlightForm;
