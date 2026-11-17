import React, { useEffect, useMemo, useState } from "react";
import { router, usePage, Link } from "@inertiajs/react";
import {
  BirthdayField,
  NicField,
  CityZipFields,
  LicenseFields,
  validateBirthday,
  validateNic,
} from "../../../../Components/forms/IdentityFields";
import { route } from "ziggy-js";
import usePersistentState, { hasDraft } from "../../../../Components/forms/usePersistentState";
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  Car,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  User,
  Mail,
  Phone,
  Home,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import VehicleLocationMap from "./VehicleLocationMap";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import placeholderImg from "@/assets/placeholder.jpg";

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

  const draftPrefix = `booking-draft:land:${vehicle?.id ?? "x"}`;

  const [firstName, setFirstName] = usePersistentState(draftPrefix, "firstName", user?.name || "");
  const [lastName, setLastName] = usePersistentState(draftPrefix, "lastName", user?.last_name || "");
  const [email, setEmail] = usePersistentState(draftPrefix, "email", user?.email || "");
  const [countryCode, setCountryCode] = usePersistentState(
    draftPrefix,
    "countryCode",
    (user?.country_code || "lk").toLowerCase()
  );
  const [phone, setPhone] = usePersistentState(draftPrefix, "phone", user?.phone || "");
  const [address, setAddress] = usePersistentState(draftPrefix, "address", user?.address || "");
  const [age, setAge] = useState(user?.age || "");
  const [dob, setDob] = usePersistentState(draftPrefix, "dob", user?.date_of_birth || "");
  const [nic, setNic] = usePersistentState(draftPrefix, "nic", user?.nic_number || "");
  const [licenseNo, setLicenseNo] = usePersistentState(draftPrefix, "licenseNo", "");
  const [licenseExp, setLicenseExp] = usePersistentState(draftPrefix, "licenseExp", "");
  const [city, setCity] = usePersistentState(draftPrefix, "city", q.city || "");
  const [zip, setZip] = usePersistentState(draftPrefix, "zip", q.zip_code || "");
  const [notes, setNotes] = usePersistentState(draftPrefix, "notes", q.notes || "");
  const [errors, setErrors] = useState({});

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

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  const [pickupTime, setPickupTime] = usePersistentState(draftPrefix, "pickupTime", q.pickup_time || "10:00");
  const [dropoffTime, setDropoffTime] = usePersistentState(draftPrefix, "dropoffTime", q.dropoff_time || "10:00");
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
        if (q.exclude_booking_id) params.set("exclude_booking_id", String(q.exclude_booking_id));
        if (needsDriver) params.set("needs_driver", "1");
        if (addons.length) params.set("addons", JSON.stringify(addons));

        const res = await fetch(`${route("client.bookings.quote")}?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        console.error(err);
      } finally {
        setQuoting(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [vehicle?.id, q.pickup_date, pickupTime, q.dropoff_date, dropoffTime, needsDriver, addons, q.exclude_booking_id]);

  const clearAllFields = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setAge("");
    setDob("");
    setNic("");
    setLicenseNo("");
    setLicenseExp("");
    setCity("");
    setZip("");
    setNotes("");
    setErrors({});
  };

  const validate = () => {
    const e = {};
    const addressTrimmed = address.trim();
    const addressOk = /^[a-zA-Z0-9\s,.\-#/]+$/.test(addressTrimmed) && /[a-zA-Z]/.test(addressTrimmed);

    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email address.";

    const cleanedPhone = (phone || "").replace(/\D+/g, "");
    if (!cleanedPhone) e.phone = "Phone number is required.";
    else if (cleanedPhone.length < 7 || cleanedPhone.length > 15) e.phone = "Please enter a valid phone number.";

    const bdayErr = validateBirthday(dob);
    if (bdayErr) e.dob = bdayErr;
    const nicErr = validateNic(nic);
    if (nicErr) e.nic = nicErr;

    if (!needsDriver) {
      if (!licenseNo.trim()) e.licenseNo = "Driving licence number is required for self-drive.";
      if (!licenseExp) e.licenseExp = "Licence expiry date is required.";
      else if (licenseExp <= new Date().toISOString().slice(0, 10))
        e.licenseExp = "Licence must not be expired.";
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
        date_of_birth: dob,
        nic_number: nic,
        license_number: licenseNo,
        license_expiry_date: licenseExp,
        city,
        zip_code: zip,
        notes,
      },
      { preserveScroll: true }
    );
  };

  const currency = quote?.currency || vehicle?.currency || "LKR";
  const rentalDays = quote?.rental_days ?? 0;
  const pricePerDay = quote?.price_per_day ?? 0;
  const rentalLineTotal = pricePerDay * rentalDays || 0;
  const addonsLines = quote?.addons_lines || [];
  const grandTotal = quote?.total || 0;

  const STEPS = [
    { num: 1, label: "Select Vehicle", done: true, href: "/vehicleList" },
    { num: 2, label: "Renter Info", current: true },
    { num: 3, label: "Secure Payment" },
    { num: 4, label: "Confirmation" },
  ];

  const vehicleImg = vehicle?.primary_image_url || vehicle?.primaryImage?.url || placeholderImg;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Step Indicator Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    s.done
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : s.current
                      ? "bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-lg shadow-blue-600/30"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : s.num}
                </div>
                <span
                  className={`text-xs font-bold mt-2 ${
                    s.current ? "text-blue-600" : s.done ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 mt-[-20px] transition-colors ${
                    s.done ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main 2-Column Checkout Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Personal Information Form Card */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_4px_25px_-5px_rgba(15,23,42,0.06)] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Primary Renter Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Information must match your official identification documents
                </p>
              </div>

              <button
                type="button"
                onClick={clearAllFields}
                className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Nushan"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
                />
                {errors.firstName && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Perera"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
                />
                {errors.lastName && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.lastName}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nushan@example.com"
                  className="w-full h-11 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
                />
                {errors.email && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.email}</p>}
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Contact Number <span className="text-rose-500">*</span>
                </label>
                <div className="phone-input-wrapper">
                  <PhoneInput
                    country={countryCode || "lk"}
                    value={phone}
                    onChange={(p, data) => {
                      setPhone(p);
                      if (data?.countryCode) setCountryCode(data.countryCode);
                    }}
                    inputClass="!w-full !h-11 !rounded-xl !border-slate-200 !text-xs !font-semibold !text-slate-800"
                    containerClass="!w-full"
                    buttonClass="!rounded-l-xl !border-slate-200"
                  />
                </div>
                {errors.phone && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Residential Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="No. 12, Galle Road, Colombo 03"
                className="w-full h-11 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
              />
              {errors.address && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.address}</p>}
            </div>

            {/* City & Zip */}
            <CityZipFields
              city={city}
              zip={zip}
              onCity={setCity}
              onZip={setZip}
              cityError={errors.city}
              zipError={errors.zip}
            />

            {/* Identity & Licensing */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Identification & Driver Verification
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BirthdayField value={dob} onChange={setDob} error={errors.dob} />
                <NicField value={nic} onChange={setNic} error={errors.nic} />
              </div>

              {!needsDriver && (
                <div className="pt-2">
                  <LicenseFields
                    number={licenseNo}
                    expiry={licenseExp}
                    onNumber={setLicenseNo}
                    onExpiry={setLicenseExp}
                    numberError={errors.licenseNo}
                    expiryError={errors.licenseExp}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="pt-4 border-t border-slate-100 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Special Trip Requests or Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Airport flight number, baby seat request, or preferred meetup point…"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Link
              href={`/vehicleDetails/${vehicle?.id}`}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Return to vehicle overview
            </Link>

            <button
              type="button"
              onClick={handlePaymentBooking}
              className="w-full sm:w-auto px-8 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue to Secure Payment</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Column: Sticky Trip Summary */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-8">
          {/* Vehicle & Trip Summary Card */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08)] p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
              Reservation Summary
            </h3>

            {/* Vehicle preview */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={vehicleImg} alt="Vehicle" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                  {vehicle?.manufacturer || "Fleet"}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {vehicle?.manufacturer} {vehicle?.model}
                </h4>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  {currency} {money(pricePerDay)} <span className="font-normal text-slate-400">/day</span>
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {needsDriver ? "With Chauffeur" : "Self-Drive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule Timeline */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Pick-up
                  </span>
                  <p className="font-bold text-slate-800">{q.pickup_location || "Standard Service Hub"}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {q.pickup_date} at {pickupTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Drop-off
                  </span>
                  <p className="font-bold text-slate-800">{q.dropoff_location || "Standard Service Hub"}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {q.dropoff_date} at {dropoffTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            {(q.pickup_location || "").trim() && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <VehicleLocationMap
                  pickupLocation={q.pickup_location}
                  dropoffLocation={q.dropoff_location}
                  className="h-[150px]"
                />
              </div>
            )}

            {/* Extras toggles */}
            {allExtras.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Included Extras
                </span>
                <div className="divide-y divide-slate-100 text-xs">
                  {allExtras.map((ex) => (
                    <label key={ex.name} className="flex items-center justify-between py-2 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected(ex.name)}
                          onChange={() => toggleAddon(ex.name)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-slate-700 font-medium">{ex.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        +{currency} {money(ex.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>
                  Base Rental ({rentalDays} {rentalDays === 1 ? "day" : "days"})
                </span>
                <span className="font-semibold text-slate-800">
                  {currency} {money(rentalLineTotal)}
                </span>
              </div>

              {needsDriver && Number(quote?.driver_fee_total) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Chauffeur Service</span>
                  <span className="font-semibold text-slate-800">
                    {currency} {money(quote?.driver_fee_total)}
                  </span>
                </div>
              )}

              {addonsLines.length > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Add-ons & Extras</span>
                  <span className="font-semibold text-slate-800">
                    {currency} {money(quote?.addons_total)}
                  </span>
                </div>
              )}

              {Number(quote?.deposit_amount) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Refundable Deposit</span>
                  <span className="font-semibold">
                    {currency} {money(quote?.deposit_amount)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm">
                <span className="text-slate-900">Total Due</span>
                <span className="text-lg font-black text-blue-600">
                  {currency} {money(grandTotal)}
                </span>
              </div>
            </div>

            {/* Security Guarantee Strip */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>256-Bit SSL Encrypted & Protected Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCheckoutContent;
