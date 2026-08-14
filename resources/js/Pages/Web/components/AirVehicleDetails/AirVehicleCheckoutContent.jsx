import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { route } from "ziggy-js";
import { Clock } from "lucide-react";
import VehicleLocationMap from "../LandVehicleDetails/VehicleLocationMap";
import car from "../../assets/vehicleCheckout/car.svg";
import icon1 from "../../assets/vehicleCheckout/icon1.svg";
import icon2 from "../../assets/vehicleCheckout/icon2.svg";
import icon3 from "../../assets/vehicleCheckout/icon3.svg";
import icon4 from "../../assets/vehicleCheckout/icon4.svg";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const money = (v) => Number(v ?? 0).toFixed(2);

const AirVehicleCheckoutContent = () => {
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
  const [firstName, setFirstName] = useState(user?.name || '');
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

  // Local editable time state (so user can pick times via clock button)
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

        // ✅ use prefixed route name
        const res = await fetch(`${route("client.airBookings.quote")}?${params.toString()}`, {
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
  setFirstName(user?.name || '');
  setLastName(user?.last_name || '');
  setEmail(user?.email || '');
  setPhone(user?.phone || '');
  setAddress(user?.address || '');
  setAge(user?.age || '');
  setCity(user?.city || '');
  setZip(user?.zip_code || '');
}, [user]);

  /* ---------------- Submit / validation ---------------- */
  const validate = () => {
    const e = {};
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    const cleanedPhone = String(phone).replace(/[^\d+]/g, "");
    const phoneOk = /^\+?\d{7,15}$/.test(cleanedPhone);
    const ageNum =  Number(age);
    const zipOk = /^\d{5}$/.test(zip);
    const cityOk = /^[A-Za-z\s]+$/.test(city.trim());
    const addressTrimmed = address.trim();
    const addressOk = /^[A-Za-z0-9\s,.\-#/]+$/.test(addressTrimmed) && /[A-Za-z]/.test(addressTrimmed);
    const nameRegex = /^[A-Za-z\s]+$/;



    if (!firstName.trim()) {
      e.firstName = "First name is required.";
    } else if (!nameRegex.test(firstName.trim())) {
      e.firstName = "First name can only contain letters and spaces.";
    }

    if (!lastName.trim()) {
      e.lastName = "Last name is required.";
    } else if (!nameRegex.test(lastName.trim())) {
      e.lastName = "Last name can only contain letters and spaces.";
    }
    
    if (!email.trim() || !emailOk) e.email = "Enter a valid email.";
    if (!phoneOk) e.phone = "Enter a valid phone number (7–15 digits, optional +).";
    if (!address.trim()) e.address = "Address is required.";
     if (!zip.trim() || !zipOk) e.zip = "Zip code must be exactly 5 digits.";
    if (city.trim() && !cityOk) e.city = "City can only contain letters and spaces.";
   if (!age.trim()) {e.age = "Age is required.";} else if (Number.isNaN(ageNum) || ageNum < 21 || !Number.isInteger(ageNum)) {
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
      route("client.airBookings.store"),
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

  // ✅ use named, prefixed routes for navigation too
  const handleConfirmBooking = () =>
    router.visit(route("client.airBookings.checkout"), { method: "get", preserveScroll: true });

  const handleVehicleList = () =>
    router.visit(route("client.airVehicles.list"), { method: "get", preserveScroll: true });

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
      <div className="flex flex-col xl:flex-row justify-center items-center xl:items-start px-10 py-10 gap-10">
        <div className="flex flex-col gap-10">
          {/* progress header */}
          <div className="flex flex-row items-start justify-center pb-10">
            <div
              className="md:flex flex-col hidden justify-center items-center gap-3 cursor-pointer"
              onClick={handleVehicleList}
            >
              <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Select Plane</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div className="md:flex flex-col hidden justify-center items-center gap-3">
              <div className="w-[18px] h-[18px] rounded-full bg-[#1565c0]" style={{ boxShadow: "0 0 10px 8px #1565c088" }} />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Booking Info</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div
              className="flex flex-col justify-center items-center gap-3 cursor-pointer"
              onClick={handlePaymentBooking}
            >
              <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Payments</h1>
            </div>
            <div className="lg:w-[136px] w-[50px] md:block hidden h-[2px] bg-[#0955AC] mt-3" />
            <div
              className="md:flex flex-col justify-center hidden items-center cursor-pointer"
              onClick={handleConfirmBooking}
            >
              <div className="w-[22px] h-[22px] rounded-full border-[2px] border-[#1565c0]" />
              <h1 className="figtree text-[16px] font-[700] text-[#0955AC]">Booking Confirmation</h1>
            </div>
          </div>

          {/* Personal Information */}
          <div
            className="border-l-[0.2px] rounded-[10px] xl:w-[874px] xl:h-auto bg-[#FFFFFF] px-10 py-10"
            style={{ boxShadow: "4px 4px 4px #0000001A", borderLeftWidth: "0.2px", borderTopWidth: "0.2px" }}
          >
            <h1 className="text-[20px] font-[700]">Personal Information</h1>

            <div className="flex flex-col justify-center gap-5">
              <div className="flex flex-col lg:flex-row justify-between mt-3">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">First Name :</label>
                  <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.firstName && <p className="text-[10px] text-red-600 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Last Name :</label>
                  <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Enter your last name"
                    />
                  </div>
                  {errors.lastName && <p className="text-[10px] text-red-600 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row justify-between">
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Email Address :</label>
                  <div className="md:w-[374px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Enter your email"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-600 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-[10px]/[24px] font-[600]">Phone Number :</label>
                  <div className="flex flex-row gap-3">
                    <div className="w-[69px] h-[49px] border-[1px] border-[#0000004D] rounded-[5px] flex items-center justify-center">
                      <PhoneInput
                        country={countryCode}
                        value={""}
                        onChange={(value, data) => setCountryCode((data?.countryCode || "us").toLowerCase())}
                        inputStyle={{ display: "none" }}
                        buttonStyle={{ border: "none", borderRadius: "5px", width: "100%", height: "47px" }}
                        containerStyle={{ width: "100%", height: "100%" }}
                        dropdownStyle={{ zIndex: 1000 }}
                        disableCountryCode={false}
                        disableDropdown={false}
                        countryCodeEditable={true}
                        enableSearch={true}
                      />
                    </div>
                    <div className="md:w-[293px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                      <input
                        value={user.phone}
                        onChange={(e) => setPhone(e.target.value)}
                        inputMode="tel"
                        autoComplete="tel"
                        pattern="^\\+?\\d{7,15}$"
                        title="Phone number must be 7–15 digits, optional leading +"
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-600 mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Address */}
              <div className="flex flex-col lg:flex-row justify-between">
                <div className="lg:w-full">
                  <label className="text-[10px]/[24px] font-[600]">Address :</label>
                  <div className="w-full h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={user.address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Street, apartment, etc."
                    />
                  </div>
                  {errors.address && <p className="text-[10px] text-red-600 mt-1">{errors.address}</p>}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row justify-between">
                <div>
                    <label className="text-[10px]/[24px] font-[600]">Age :</label>
                    <div className="md:w-[240px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                      <input
                        type="number"
                        value={user.age}
                        onChange={(e) => {
                          const val = e.target.value;
                          // remove decimals if entered
                          const whole = val.includes('.') ? val.split('.')[0] : val;
                          setAge(whole);
                        }}
                        min={21}
                        step={1} // allows only whole numbers
                        className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                        placeholder="21"
                      />
                    </div>
                    {errors.age && <p className="text-[10px] text-red-600 mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label className="text-[10px]/[24px] font-[600]">City :</label>
                  <div className="md:w-[240px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={user.city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="Colombo 03"
                    />
                  </div>
                  {errors.city && <p className="text-[10px] text-red-600 mt-1">{errors.city}</p>}
                </div>
               <div>
                  <label className="text-[10px]/[24px] font-[600]">Zip Code :</label>
                  <div className="md:w-[240px] w-auto h-[49px] border-[1px] border-[#0000004D] rounded-[5px]">
                    <input
                      value={user.zip_code}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full h-full rounded-[5px] focus:outline-none focus:ring-0 border-transparent placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]"
                      placeholder="03330"
                      maxLength={5} // optional, prevent typing >5 digits
                      inputMode="numeric"
                    />
                  </div>
                  {errors.zip && <p className="text-[10px] text-red-600 mt-1">{errors.zip}</p>}
                </div>


              </div>
            </div>
          </div>

          {/* Additional info */}
          <div
            className="border-l-[0.2px] rounded-[10px] lg:w-[874px] h-auto bg-[#FFFFFF] px-10 py-10"
            style={{ borderLeftWidth: "0.2px", borderTopWidth: "0.2px", boxShadow: "4px 4px 4px #0000001A" }}
          >
            <h1 className="text-[20px] font-[700]">Additional Information</h1>
            <div>
              <label className="text-[10px]/[24px] font-[600]">Special Requests :</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-[87px] border-[1px] border-[#0000004D] rounded-[5px] focus:outline-none focus:ring-0 placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080] focus:border-[#0000004D]"
                placeholder="Add if you have any extra requests"
              />
            </div>
          </div>

          <div
            onClick={handlePaymentBooking}
            className="rounded-[5px] flex justify-center items-center text-[#FFFFFF] font-[700] text-[12px] lg:w-[874px] h-[50px] bg-[#0955AC] px-5 py-5 cursor-pointer hover:bg-[#074a8f] transition-colors"
          >
            Next
          </div>
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="flex flex-col gap-10">
          {/* Vehicle + schedule card */}
          <div className="md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-5" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
            <div className="flex flex-col md:flex-row gap-3 items-center border-b-[1px] pb-5 border-[#00000026]">
              <img src={car} alt="" />
              <div className="flex flex-col gap-3">
                <h1 className="figtree text-[20px] font-[700] ">
                  {vehicle?.manufacturer || "—"} {vehicle?.model || ""} {vehicle?.manufacture_year ? `(${vehicle.manufacture_year})` : ""}
                </h1>
                <div className="poppins flex flex-row gap-5 text-[9px] text-[#000000B2] font-[500]">
                  <div className="flex flex-col gap-2 justify-center items-center"><img src={icon1} className="size-[17px]" alt="" /><h1>{vehicle?.mileage_km ?? "—"}</h1></div>
                  <div className="flex flex-col gap-2 justify-center items-center"><img src={icon2} className="size-[17px]" alt="" /><h1>{vehicle?.landSpec?.transmission_type ?? "—"}</h1></div>
                  <div className="flex flex-col gap-2 justify-center items-center"><img src={icon3} className="size-[17px]" alt="" /><h1>{vehicle?.passenger_capacity ? `${vehicle.passenger_capacity} Person` : "—"}</h1></div>
                  <div className="flex flex-col gap-2 justify-center items-center"><img src={icon4} className="size-[17px]" alt="" /><h1>{vehicle?.landSpec?.fuel_type ?? "—"}</h1></div>
                </div>
              </div>
            </div>

            {/* timeline + editable extras */}
            <div className="py-10 px-20">
              <div className="flex flex-row gap-5 justify-center items-start">
                <div className="flex flex-col items-center mt-2">
                  <div className="size-[17px] bg-[#0955AC] rounded-full" />
                  <div className="h-[77px] w-[1.5px] bg-[#0955AC]" />
                  <div className="size-[17px] bg-[#0955AC] rounded-full" />
                </div>
                <div className="figtree flex flex-col gap-10 text-[14px] font-[500] text-[#00000080]">
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Pick up: {q.pickup_location || "—"}</h1>
                    <h1>Pick-up Date : {q.pickup_date || "—"}</h1>
                    <div className="flex items-center gap-2">
                      <h1>Pick-up Time : {pickupTime || "—"}</h1>
                      <button
                        type="button"
                        onClick={() => setShowPickupTimePicker((s) => !s)}
                        className="p-1 rounded hover:bg-white/40"
                        title="Select pick-up time"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                    {showPickupTimePicker && (
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="mt-2 px-2 py-1 text-[12px] rounded border border-[#00000026] bg-white"
                      />
                    )}
                  </div>
                  <div>
                    <h1 className="text-[16px] font-[700] text-[#000000]">Drop off: {q.dropoff_location || "—"}</h1>
                    <h1>Drop-off Date : {q.dropoff_date || "—"}</h1>
                    <div className="flex items-center gap-2">
                      <h1>Drop-off Time : {dropoffTime || "—"}</h1>
                      <button
                        type="button"
                        onClick={() => setShowDropoffTimePicker((s) => !s)}
                        className="p-1 rounded hover:bg-white/40"
                        title="Select drop-off time"
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                    {showDropoffTimePicker && (
                      <input
                        type="time"
                        value={dropoffTime}
                        onChange={(e) => setDropoffTime(e.target.value)}
                        className="mt-2 px-2 py-1 text-[12px] rounded border border-[#00000026] bg-white"
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

              {/* Selected Extras (editable) */}
              <div className="mt-6">
                <h2 className="text-[14px] font-[700] text-[#0955AC]">Selected Extras</h2>
                <div className="mt-2 space-y-2">
                  {allExtras.length === 0 && (
                    <div className="text-[12px] text-[#00000080]">No extras available.</div>
                  )}
                  {allExtras.map((ex) => (
                    <label key={ex.name} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="size-[15px] border-[1px] border-[#0955AC] rounded-[2.8px]"
                          checked={isSelected(ex.name)}
                          onChange={() => toggleAddon(ex.name)}
                        />
                        <span>• {ex.name}</span>
                      </span>
                      <span className="text-[#00000080]">
                        {currency}
                        {money(ex.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="poppins md:w-[459px] h-auto bg-[#F4F3F3] rounded-[10px] px-10 py-10" style={{ boxShadow: "4px 4px 4px #0000001A" }}>
            <h1 className="font-[600] text-[20px]">Payment Details</h1>

            <div className="md:px-10 py-5">
              <div className="poppins text-[12px] w-full h-auto bg-[#0955AC0D] rounded-[5px] flex flex-col py-10 px-10">
                <h1 className="font-[600] mb-5 text-[#000000D9]">Pricing Breakdown {quoting ? "(updating…)" : ""}</h1>
                <div className="w-full h-[1px] bg-[#CDD0D4]" />

                {/* Rental */}
                <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">Rental Price</h1>
                    <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                      <h1>
                        {currency}
                        {money(pricePerDay)}/day
                      </h1>
                      <h1 className="text-[#0955AC]">(×{rentalDays} days)</h1>
                    </div>
                  </div>
                  <div className="text-[#000000CC]">
                    {currency}
                    {money(rentalLineTotal)}
                  </div>
                </div>

                {/* Driver */}
                {needsDriver && Number(quote?.driver_fee_total) > 0 && (
                  <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500] border-t border-[#CDD0D4]">
                    <div>
                      <h1 className="text-[#000000CC]">Driver / Chauffeur</h1>
                      <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                        <h1>
                          {currency}
                          {money(quote?.driver_fee_per_day)}/day
                        </h1>
                        <h1 className="text-[#0955AC]">(×{rentalDays} days)</h1>
                      </div>
                    </div>
                    <div className="text-[#000000CC]">
                      {currency}
                      {money(quote?.driver_fee_total)}
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                {addonsLines.length > 0 && (
                  <>
                    <div className="w-full h-[1px] bg-[#CDD0D4]" />
                    <h1 className="font-[600] mt-5 text-[#000000D9]">Add Extras</h1>
                    <div className="flex flex-col justify-center text-[12px] font-[500] mt-5">
                      {addonsLines.map((l, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row justify-between w-full px-5 py-1">
                          <div className="flex flex-row items-center gap-4">
                            <h1>
                              {l.name}
                              {l.qty > 1 ? ` × ${l.qty}` : ""}
                            </h1>
                          </div>
                          <h1>
                            {currency}
                            {money(l.line_total)}
                          </h1>
                        </div>
                      ))}
                      <div className="flex flex-col md:flex-row justify-between w-full px-5 py-1 font-[600]">
                        <div>Total Add-ons</div>
                        <div>
                          {currency}
                          {money(addonsTotal)}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Deposit */}
                {Number(deposit) > 0 && (
                  <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                    <div>
                      <h1 className="text-[#000000CC]">Refundable deposit</h1>
                      <div className="flex flex-col md:flex-row gap-3 text-[#00000061]">
                        <h1>Refunded after return</h1>
                      </div>
                    </div>
                    <div className="text-[#000000CC]">
                      -{currency}
                      {money(deposit)}
                    </div>
                  </div>
                )}

                <div className="w-full h-[1px] bg-[#CDD0D4]" />

                {/* Advance & Total */}
                {Number(advance) > 0 && (
                  <div className="flex flex-col md:flex-row justify-between w-full px-5 py-5 font-[500]">
                    <div>
                      <h1 className="text-[#000000CC]">Advance Payment</h1>
                      <div className="flex flex-col md:flex-row gap-3 text-[#00000061] mt-3">
                        <h1>First payment</h1>
                      </div>
                    </div>
                    <div className="text-[#000000CC] text-[12px] font-[500]">
                      {currency}
                      {money(advance)}
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between w-full px-5 pb-5 font-[500]">
                  <div>
                    <h1 className="text-[#000000CC]">Total Price Due</h1>
                  </div>
                  <div className="text-[#000000CC] text-[16px] font-[700]">
                    {currency}
                    {money(grandTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Payment Details */}
        </div>
      </div>
    </div>
  );
};

export default AirVehicleCheckoutContent;
