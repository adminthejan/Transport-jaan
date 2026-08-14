import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { Clock } from "lucide-react";
import car from "../../assets/vehicleCheckout/car.svg";
import icon1 from "../../assets/vehicleCheckout/icon1.svg";
import icon2 from "../../assets/vehicleCheckout/icon2.svg";
import icon3 from "../../assets/vehicleCheckout/icon3.svg";
import icon4 from "../../assets/vehicleCheckout/icon4.svg";
import VehicleLocationMap from "./VehicleLocationMap";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const money = (v) => Number(v ?? 0).toFixed(2);

const VehicleCheckoutContent = () => {
  const { props } = usePage();
  const vehicle = props?.vehicle || null;
  const serverQuery = props?.query || {};
  const serverExtras = Array.isArray(props?.extras) ? props.extras : [];
  const user = props?.user || null;

  const urlQuery = useMemo(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const o = {};
    sp.forEach((val, key) => (o[key] = val));
    return o;
  }, []);
  const q = Object.keys(serverQuery).length ? serverQuery : urlQuery;
  const needsDriver = q.needs_driver === true || q.needs_driver === "true" || q.needs_driver === "1";

  /* ---------------- Personal info ---------------- */
  const [firstName, setFirstName] = useState(user?.name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [countryCode, setCountryCode] = useState((user?.country_code || "lk").toLowerCase());
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [age, setAge] = useState(user?.age || "");
  const [city, setCity] = useState(q.city || "");
  const [zip, setZip] = useState(q.zip_code || "");
  const [notes, setNotes] = useState(q.notes || "");
  const [errors, setErrors] = useState({});

  /* ---------------- Extras: available + selected ---------------- */
  const allExtras = useMemo(() => {
    return serverExtras
      .map((e) => ({
        name: e?.name ?? e?.additional_feature_name ?? "",
        price: Number(e?.price ?? e?.additional_feature_price ?? 0),
      }))
      .filter((x) => x.name);
  }, [serverExtras]);

  const initialAddons = useMemo(() => {
    const raw = q.addons;
    const arr = !raw
      ? []
      : Array.isArray(raw)
      ? raw
      : (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        })();
    return (arr || [])
      .map((a) => ({ name: a?.name ?? "", qty: Number(a?.qty ?? 1) || 1 }))
      .filter((a) => a.name);
  }, [q.addons]);

  const [addons, setAddons] = useState(initialAddons);
  useEffect(() => {
    setAddons(initialAddons);
  }, [initialAddons]);

  const isSelected = (name) => addons.some((a) => a.name === name);
  const toggleAddon = (name) =>
    setAddons((prev) => {
      const exists = prev.find((a) => a.name === name);
      return exists ? prev.filter((a) => a.name !== name) : [...prev, { name, qty: 1 }];
    });

  /* ---------------- Live Quote ---------------- */
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  const [pickupTime, setPickupTime] = useState(q.pickup_time || "");
  const [dropoffTime, setDropoffTime] = useState(q.dropoff_time || "");
  const [showPickupTimePicker, setShowPickupTimePicker] = useState(false);
  const [showDropoffTimePicker, setShowDropoffTimePicker] = useState(false);

  useEffect(() => {
    if (!vehicle?.id || !q.pickup_date || !pickupTime || !q.dropoff_date || !dropoffTime) {
      setQuote(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setQuoting(true);
        const params = new URLSearchParams({
          vehicle_id: String(vehicle.id),
          pickup_date: String(q.pickup_date),
          pickup_time: String(pickupTime),
          dropoff_date: String(q.dropoff_date),
          dropoff_time: String(dropoffTime),
        });
        if (q.exclude_booking_id) {
          params.append("exclude_booking_id", String(q.exclude_booking_id));
        }
        params.append("needs_driver", needsDriver ? "1" : "0");
        addons.forEach((a, i) => {
          params.append(`addons[${i}][name]`, a.name);
          params.append(`addons[${i}][qty]`, String(a.qty || 1));
        });

        const res = await fetch(`${route("client.bookings.quote")}?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) throw new Error("Quote failed");
        setQuote(await res.json());
      } catch {
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [vehicle?.id, q.pickup_date, pickupTime, q.dropoff_date, dropoffTime, q.exclude_booking_id, addons, needsDriver]);

  useEffect(() => {
    setFirstName(user?.name || "");
    setLastName(user?.last_name || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setAddress(user?.address || "");
    setAge(user?.age || "");
    setCity(user?.city || "");
    setZip(user?.zip_code || "");
  }, [user]);

  /* ---------------- Submit / validation ---------------- */
  const validate = () => {
    const e = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    const cleanedPhone = String(phone).replace(/[^\d+]/g, "");
    const phoneOk = /^\+?\d{7,15}$/.test(cleanedPhone);
    const ageNum = Number(age);
    const zipOk = /^\d{5}$/.test(zip);
    const cityOk = /^[A-Za-z\s]+$/.test(city.trim());
    const addressTrimmed = address.trim();
    const addressOk = /^[A-Za-z0-9\s,.\-#/]+$/.test(addressTrimmed) && /[A-Za-z]/.test(addressTrimmed);
    const nameRegex = /^[A-Za-z\s]+$/;

    if (!firstName.trim()) e.firstName = "First name is required.";
    else if (!nameRegex.test(firstName.trim())) e.firstName = "First name can only contain letters and spaces.";

    if (!lastName.trim()) e.lastName = "Last name is required.";
    else if (!nameRegex.test(lastName.trim())) e.lastName = "Last name can only contain letters and spaces.";

    if (!email.trim() || !emailOk) e.email = "Enter a valid email.";
    if (!phoneOk) e.phone = "Enter a valid phone number (7–15 digits, optional +).";
    if (!address.trim()) e.address = "Address is required.";
    if (!zip.trim() || !zipOk) e.zip = "Zip code must be exactly 5 digits.";
    if (city.trim() && !cityOk) e.city = "City can only contain letters and spaces.";
    if (!age.trim()) {
      e.age = "Age is required.";
    } else if (Number.isNaN(ageNum) || ageNum < 21 || !Number.isInteger(ageNum)) {
      e.age = "Age must be a whole number ≥ 21.";
    }
    if (!addressTrimmed) {
      e.address = "Address is required.";
    } else if (!addressOk) {
      e.address = "Address must include letters and can contain numbers or , . - # / symbols.";
    } else if (addressTrimmed.length > 70) {
      e.address = "Address exceeds the maximum allowed length of 70 characters.";
    }

    setErrors(e);
    return { ok: Object.keys(e).length === 0, cleanedPhone };
  };

  const handlePaymentBooking = () => {
    if (!vehicle?.id) return alert("Vehicle is missing. Please select a vehicle.");
    if (!q.pickup_date || !pickupTime || !q.dropoff_date || !dropoffTime) {
      return alert("Missing pickup/dropoff dates or times.");
    }
    const { ok, cleanedPhone } = validate();
    if (!ok) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.post(
      route("client.bookings.store"),
      {
        vehicle_id: vehicle.id,
        pickup_location: q.pickup_location || "",
        dropoff_location: q.dropoff_location || "",
        pickup_date: q.pickup_date,
        pickup_time: pickupTime,
        dropoff_date: q.dropoff_date,
        dropoff_time: dropoffTime,
        addons,
        needs_driver: needsDriver,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: cleanedPhone,
        country_code: (countryCode || "lk").toLowerCase(),
        address,
        age,
        city,
        zip_code: zip,
        notes,
      },
      { preserveScroll: true }
    );
  };

  const handleConfirmBooking = () =>
    router.visit(route("client.bookings.checkout"), { method: "get", preserveScroll: true });

  const handleVehicleList = () =>
    router.visit(route("client.vehicle.list"), { method: "get", preserveScroll: true });

  /* ---------------- Derived values ---------------- */
  const currency = quote?.currency || vehicle?.currency || "$";
  const rentalDays = quote?.rental_days ?? 0;
  const pricePerDay = quote?.price_per_day ?? 0;
  const rentalLineTotal = pricePerDay * rentalDays || 0;
  const addonsLines = quote?.addons_lines || [];
  const addonsTotal = quote?.addons_total || 0;
  const deposit = quote?.deposit_amount || 0;
  const advance = quote?.advance_amount || 0;
  const grandTotal = quote?.total || 0;

  return (
    <div>
      <div className="flex flex-col xl:flex-row justify-center items-center xl:items-start px-5 sm:px-10 py-10 gap-10">
        <div className="flex flex-col gap-10 w-full xl:w-auto">
          {/* Progress Header */}
          <div className="flex flex-row items-start justify-center pb-10 overflow-x-auto pt-[12px]">
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-8 whitespace-nowrap">
              <div
                className="flex flex-col justify-center items-center gap-3 cursor-pointer"
                onClick={handleVehicleList}
              >
                <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
                <h1 className="figtree text-[14px] sm:text-[16px] font-[700] text-[#0955AC]">Select Car</h1>
              </div>
              <div className="hidden md:block w-[50px] sm:w-[136px] h-[2px] bg-[#0955AC] mt-3" />
              <div className="flex flex-col justify-center items-center gap-3">
                <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
                <h1 className="figtree text-[14px] sm:text-[16px] font-[700] text-[#0955AC]">Booking Info</h1>
              </div>
              <div className="hidden md:block w-[50px] sm:w-[136px] h-[2px] bg-[#0955AC] mt-3" />
              <div
                className="flex flex-col justify-center items-center gap-3 cursor-pointer"
                onClick={handlePaymentBooking}
              >
                <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
                <h1 className="figtree text-[14px] sm:text-[16px] font-[700] text-[#0955AC]">Payments</h1>
              </div>
              <div className="hidden md:block w-[50px] sm:w-[136px] h-[2px] bg-[#0955AC] mt-3" />
              <div
                className="hidden md:flex flex-col justify-center items-center cursor-pointer"
                onClick={handleConfirmBooking}
              >
                <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
                <h1 className="figtree text-[14px] sm:text-[16px] font-[700] text-[#0955AC]">Confirmation</h1>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div
            className="border rounded-[10px] w-full bg-[#FFFFFF] p-5 sm:p-10"
            style={{ boxShadow: "4px 4px 4px #0000001A", borderWidth: "0.2px" }}
          >
            <h1 className="text-[20px] font-[700] mb-5">Personal Information</h1>

            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">First Name :</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && <p className="text-[10px] text-red-600 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Last Name :</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && <p className="text-[10px] text-red-600 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Email Address :</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="Enter your email"
                  />
                  {errors.email && <p className="text-[10px] text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Phone Number :</label>
                  <div className="flex gap-2 mt-1">
                    <div className="w-[69px] h-[49px]">
                      <PhoneInput
                        country={countryCode}
                        value={""}
                        onChange={(value, data) => setCountryCode((data?.countryCode || "lk").toLowerCase())}
                        inputStyle={{ display: "none" }}
                        buttonStyle={{ border: "1px solid #0000004D", borderRadius: "5px", width: "100%", height: "100%" }}
                        containerStyle={{ width: "100%", height: "100%" }}
                        dropdownStyle={{ zIndex: 1000 }}
                        enableSearch={true}
                      />
                    </div>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="712345678"
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="text-[10px]/[24px] font-[600]">Address :</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                  placeholder="Street, apartment, etc."
                />
                {errors.address && <p className="text-[10px] text-red-600 mt-1">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Age :</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      const val = e.target.value;
                      const whole = val.includes(".") ? val.split(".")[0] : val;
                      setAge(whole);
                    }}
                    min={21}
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="21"
                  />
                  {errors.age && <p className="text-[10px] text-red-600 mt-1">{errors.age}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">City :</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="Colombo"
                  />
                  {errors.city && <p className="text-[10px] text-red-600 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Zip Code :</label>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={5}
                    inputMode="numeric"
                    className="mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                    placeholder="03330"
                  />
                  {errors.zip && <p className="text-[10px] text-red-600 mt-1">{errors.zip}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div
            className="border rounded-[10px] w-full bg-[#FFFFFF] p-5 sm:p-10"
            style={{ boxShadow: "4px 4px 4px #0000001A", borderWidth: "0.2px" }}
          >
            <h1 className="text-[20px] font-[700] mb-3">Additional Information</h1>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-[87px] border border-[#0000004D] rounded-[5px] p-3 focus:outline-none resize-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
              placeholder="Add if you have any extra requests"
            />
          </div>

          <button
            onClick={handlePaymentBooking}
            className="w-full h-[50px] bg-[#0955AC] text-white font-[700] text-[14px] rounded-[5px] hover:bg-[#074a8f] transition-colors"
          >
            Next
          </button>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-10 w-full xl:w-auto">
          {/* Vehicle + Schedule */}
          <div
            className="w-full md:w-[459px] bg-[#F4F3F3] rounded-[10px] p-5"
            style={{ boxShadow: "4px 4px 4px #0000001A" }}
          >
            <div className="flex flex-col md:flex-row gap-3 items-center border-b border-[#00000026] pb-5">
              <img src={car} alt="Vehicle" className="w-32 h-20 object-contain" />
              <div className="flex flex-col gap-2 text-center md:text-left">
                <h1 className="figtree text-[18px] sm:text-[20px] font-[700]">
                  {vehicle?.manufacturer || "—"} {vehicle?.model || ""}{" "}
                  {vehicle?.manufacture_year ? `(${vehicle.manufacture_year})` : ""}
                </h1>
                <div className="poppins flex flex-wrap justify-center md:justify-start gap-3 sm:gap-5 text-[9px] text-[#000000B2] font-[500]">
                  <div className="flex flex-col items-center gap-1">
                    <img src={icon1} className="w-4 h-4" alt="" />
                    <span>{vehicle?.mileage_km ?? "—"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <img src={icon2} className="w-4 h-4" alt="" />
                    <span>{vehicle?.landSpec?.transmission_type ?? "—"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <img src={icon3} className="w-4 h-4" alt="" />
                    <span>{vehicle?.passenger_capacity ? `${vehicle.passenger_capacity} Person` : "—"}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <img src={icon4} className="w-4 h-4" alt="" />
                    <span>{vehicle?.landSpec?.fuel_type ?? "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-6 px-4 sm:px-10">
              <div className="flex gap-5 items-start">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-4 h-4 bg-[#0955AC] rounded-full" />
                  <div className="h-20 w-0.5 bg-[#0955AC]" />
                  <div className="w-4 h-4 bg-[#0955AC] rounded-full" />
                </div>
                <div className="flex-1 space-y-8 text-[14px] font-[500] text-[#00000080]">
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Pick up: {q.pickup_location || "—"}</h1>
                    <p>Pick-up Date: {q.pickup_date || "—"}</p>
                    <div className="flex items-center gap-2">
                      <p>Pick-up Time: {pickupTime || "—"}</p>
                      <button
                        type="button"
                        onClick={() => setShowPickupTimePicker((s) => !s)}
                        className="p-1 rounded hover:bg-white/40"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                    {showPickupTimePicker && (
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="mt-1 px-2 py-1 text-[12px] rounded border border-[#00000026] bg-white w-full"
                      />
                    )}
                  </div>
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Drop off: {q.dropoff_location || "—"}</h1>
                    <p>Drop-off Date: {q.dropoff_date || "—"}</p>
                    <div className="flex items-center gap-2">
                      <p>Drop-off Time: {dropoffTime || "—"}</p>
                      <button
                        type="button"
                        onClick={() => setShowDropoffTimePicker((s) => !s)}
                        className="p-1 rounded hover:bg-white/40"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                    {showDropoffTimePicker && (
                      <input
                        type="time"
                        value={dropoffTime}
                        onChange={(e) => setDropoffTime(e.target.value)}
                        className="mt-1 px-2 py-1 text-[12px] rounded border border-[#00000026] bg-white w-full"
                      />
                    )}
                  </div>
                </div>
              </div>

              {(q.pickup_location || "").trim() && (
                <div className="mt-6">
                  <VehicleLocationMap
                    pickupLocation={q.pickup_location}
                    dropoffLocation={q.dropoff_location}
                    className="h-[220px]"
                  />
                </div>
              )}

              <div className="mt-6">
                <h2 className="text-[14px] font-[700] text-[#0955AC]">Selected Extras</h2>
                <div className="mt-2 space-y-2">
                  {allExtras.length === 0 && <p className="text-[12px] text-[#00000080]">No extras available.</p>}
                  {allExtras.map((ex) => (
                    <label key={ex.name} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 border border-[#0955AC] rounded"
                          checked={isSelected(ex.name)}
                          onChange={() => toggleAddon(ex.name)}
                        />
                        <span>• {ex.name}</span>
                      </span>
                      <span className="text-[#00000080] whitespace-nowrap">
                        {currency}
                        {money(ex.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details - FIXED OVERFLOW */}
          <div
            className="w-full md:w-[459px] bg-[#F4F3F3] rounded-[10px] p-5 md:p-10"
            style={{ boxShadow: "4px 4px 4px #0000001A" }}
          >
            <h1 className="font-[600] text-[20px] mb-5">Payment Details</h1>

            <div className="bg-[#0955AC0D] rounded-[5px] p-4 sm:p-6 md:p-10 overflow-hidden text-[12px] poppins">
              <h1 className="font-[600] mb-4 text-[#000000D9]">
                Pricing Breakdown {quoting ? "(updating…)" : ""}
              </h1>
              <div className="w-full h-px bg-[#CDD0D4]" />

              {/* Rental */}
              <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-4 font-[500] gap-2">
                <div className="break-words max-w-[200px] md:max-w-none">
                  <p className="text-[#000000CC]">Rental Price</p>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-[#00000061] text-[11px] sm:text-[12px]">
                    <span className="whitespace-nowrap">
                      {currency}
                      {money(pricePerDay)}/day
                    </span>
                    <span className="text-[#0955AC] whitespace-nowrap">(×{Math.floor(rentalDays)} {Math.floor(rentalDays) === 1 ? 'day' : 'days'})</span>
                  </div>
                </div>
                <div className="text-[#000000CC] whitespace-nowrap">
                  {currency}
                  {money(rentalLineTotal)}
                </div>
              </div>

              {/* Driver */}
              {needsDriver && Number(quote?.driver_fee_total) > 0 && (
                <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-4 font-[500] gap-2 border-t border-[#CDD0D4]">
                  <div className="break-words max-w-[200px] md:max-w-none">
                    <p className="text-[#000000CC]">Driver / Chauffeur</p>
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-[#00000061] text-[11px] sm:text-[12px]">
                      <span className="whitespace-nowrap">
                        {currency}
                        {money(quote?.driver_fee_per_day)}/day
                      </span>
                      <span className="text-[#0955AC] whitespace-nowrap">(×{Math.floor(rentalDays)} {Math.floor(rentalDays) === 1 ? 'day' : 'days'})</span>
                    </div>
                  </div>
                  <div className="text-[#000000CC] whitespace-nowrap">
                    {currency}
                    {money(quote?.driver_fee_total)}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {addonsLines.length > 0 && (
                <>
                  <div className="w-full h-px bg-[#CDD0D4]" />
                  <h1 className="font-[600] mt-4 text-[#000000D9]">Add Extras</h1>
                  <div className="mt-3 space-y-1">
                    {addonsLines.map((l, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-1 gap-2">
                        <div className="break-words max-w-[200px] md:max-w-none">
                          {l.name}
                          {l.qty > 1 ? ` × ${l.qty}` : ""}
                        </div>
                        <div className="whitespace-nowrap">
                          {currency}
                          {money(l.line_total)}
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-1 font-[600] gap-2">
                      <div className="break-words">Total Add-ons</div>
                      <div className="whitespace-nowrap">
                        {currency}
                        {money(addonsTotal)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Deposit */}
              {Number(deposit) > 0 && (
                <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-4 font-[500] gap-2">
                  <div className="break-words max-w-[200px] md:max-w-none">
                    <p className="text-[#000000CC]">Refundable deposit</p>
                    <p className="text-[#00000061] text-[11px]">Refunded after return</p>
                  </div>
                  <div className="text-[#000000CC] whitespace-nowrap">
                    -{currency}
                    {money(deposit)}
                  </div>
                </div>
              )}

              <div className="w-full h-px bg-[#CDD0D4]" />

              {/* Advance */}
              {Number(advance) > 0 && (
                <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-4 font-[500] gap-2">
                  <div className="break-words max-w-[200px] md:max-w-none">
                    <p className="text-[#000000CC]">Advance Payment</p>
                    <p className="text-[#00000061] text-[11px]">First payment</p>
                  </div>
                  <div className="text-[#000000CC] whitespace-nowrap">
                    {currency}
                    {money(advance)}
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex flex-col md:flex-row justify-between px-3 sm:px-5 py-4 font-[500] gap-2">
                <div className="break-words">
                  <p className="text-[#000000CC]">Total Price Due</p>
                </div>
                <div className="text-[#000000CC] text-[16px] font-[700] whitespace-nowrap">
                  {currency}
                  {money(grandTotal)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCheckoutContent;