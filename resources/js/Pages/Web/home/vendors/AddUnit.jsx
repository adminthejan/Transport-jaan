// resources/js/Pages/vendors/units/AddUnit.jsx
import React, { useEffect, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import VendorShellLayout from "../../../../Components/vendors/VendorShellLayout";

/* helpers */
const Req = () => <span className="text-red-600 ml-0.5">*</span>;
const req = (msg = "This field is required.") => ({
  required: true,
  onInvalid: (e) => e.target.setCustomValidity(msg),
  onInput: (e) => e.target.setCustomValidity(""),
});

/* toast */
const Toast = ({ show, title, message, onClose }) =>
  !show ? null : (
    <div className="fixed z-[11000] right-6 bottom-6 w-full max-w-sm shadow-lg rounded-lg overflow-hidden bg-white border border-green-200">
      <div className="p-4 flex items-start gap-3">
        <div className="shrink-0">
          <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293A1 1 0 103.293 10.707l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {message ? <p className="mt-1 text-sm text-gray-600">{message}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="Close" title="Close">✕</button>
      </div>
    </div>
  );

/* center success modal */
const CenterModal = ({ open, title, message, onClose, onPrimary }) =>
  !open ? null : (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-gray-200 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293A1 1 0 103.293 10.707l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">{title}</h3>
        {message && <p className="mt-2 text-center text-sm text-gray-600">{message}</p>}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={onPrimary} className="px-4 py-2 rounded-lg bg-[#0955AC] text-white font-semibold">Go to Units</button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold">Add Another</button>
        </div>
      </div>
    </div>
  );

/* modal shell with blurred backdrop — now accepts zIndexClass */
const EditModalShell = ({ open, title, onClose, children, zIndexClass = "z-[10000]" }) =>
  !open ? null : (
    <div className={`fixed inset-0 ${zIndexClass}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative h-full w-full flex items-start justify-center p-4 sm:p-6">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-200">
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur rounded-t-2xl border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Close" title="Close">✕</button>
            </div>
          </div>
          <div className="max-h-[85vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );

/* constants */
const initialState = {
  category: "", vehicleType: "", model: "", manufacture: "", manufactureYear: "", registerYear: "", number: "", colour: "",
  condition: "", ownershipType: "", passengerCapacity: "", description: "", insuranceProvider: "",
  images: [], insuranceDocs: [],
  mileage: "", bodyType: "", industryCategory: "", fuelType: "", transmissionType: "", gears: "", seats: "", doors: "", luggageCapacity: "", fuelTankCapacity: "",
  aircraft_type: "", icao_type_designator: "", base_airport_iata: "", base_airport_icao: "", crew_required: "", range_km: "", mtow_kg: "", cruising_speed_kts: "", air_fuel_type: "", flight_hours_total: "",
  vessel_type: "", hull_material: "", length_m: "", beam_m: "", draft_m: "", engine_type: "", engine_power_hp: "", sea_fuel_type: "", cabins: "", berths: "", toilets: "", fuel_tank_l: "", water_tank_l: "",
  rentalPricePerDay: "", totalRentalPrice: "", deposit: "", advancePayment: "",
  gps: false, childSeat: false, wifi: false, insuranceCoverage: false, extra: "",
  gpsPrice: "", childSeatPrice: "", wifiPrice: "", insuranceCoveragePrice: "", addDriver: false, addDriverPrice: "",
  extraFeatures: [],
};
const bodyTypeOptions = ["Sedan", "SUV", "Hatchback", "Truck", "Van", "Bus", "Coupe", "Convertible", "Wagon", "Other", "crossover", "Limousine", "Family MBP", "Sport Coupe", "Compact", "MPV / Minivan", "Motorcycle", "Three-Wheeler", "Special Purpose Vehicle"];
const INDUSTRY_CATEGORY_OPTIONS = [
  { value: "cars_suvs", label: "Cars & SUVs" },
  { value: "vans_minibuses", label: "Vans & Minibuses" },
  { value: "buses", label: "Buses" },
  { value: "trucks", label: "Trucks" },
  { value: "prime_movers_trailers", label: "Prime Movers & Trailers" },
  { value: "construction_equipment", label: "Construction & Equipment" },
];
const fuelTypeOptions = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG", "Other"];
const transmissionOptions = ["Manual", "Automatic", "Semi-Automatic", "CVT", "Other"];
const conditionOptions = ["New", "Excellent", "Good", "Fair", "Needs Repair"];
const ownershipTypeOptions = ["Owned", "Financed", "Leased", "Rented"];
const categoryOptions = ["Land", "Air", "Sea"];
const aircraftTypeOptions = ["private_jet", "commercial_airliner", "helicopter", "charter_aircraft", "light_aircraft", "business_jet", "turboprop_aircraft", "glider", "seaplane", "cargo_aircraft", "hot_air_balloon", "other"];
const airFuelTypeOptions = ["jet_a1", "avgas", "electric", "other"];
const vesselTypeOptions = ["speedboat", "yacht", "catamaran", "sailboat", "fishing_boat", "cruise_ship", "ferry", "houseboat", "jet_ski", "tugboat", "cargo_vessel", "other"];
const hullMaterialOptions = ["Fiberglass", "Aluminum", "Steel", "Wood", "Composite", "Other"];
const engineTypeOptions = ["inboard", "outboard", "sail", "hybrid", "electric", "other"];
const seaFuelTypeOptions = ["diesel", "petrol", "electric", "other"];

/* — NEW: category-specific examples for Vehicle Type — */
const VEHICLE_TYPE_EXAMPLES = {
  Land: ["SUV", "Sedan", "Truck", "Van"],
  Air: ["Helicopter", "Fixed-wing", "Glider"],
  Sea: ["Yacht", "Boat", "Catamaran", "Ferry"],
};
const getVehicleTypePlaceholder = (cat) => {
  const arr = VEHICLE_TYPE_EXAMPLES[cat];
  if (!arr) return "e.g., SUV (select a category)";
  return `e.g., ${arr.slice(0, 3).join(", ")}`;
};

const norm = (s) => String(s || "").replace(/[\s_\-]+/g, "").toLowerCase();
const fromOptions = (val, opts) => { const v = norm(val); if (!v) return ""; const hit = opts.find((o) => norm(o) === v); return hit || ""; };
const isGearsIrrelevant = (tt) => ["automatic", "cvt"].includes(String(tt || "").toLowerCase());
const mapConditionToUI = (v) => { v = String(v || "").toLowerCase(); if (v === "new") return "New"; if (v === "refurbished" || v === "excellent") return "Excellent"; if (v === "good" || v === "used") return "Good"; if (v === "fair") return "Fair"; if (v === "needs repair" || v === "needs_repair") return "Needs Repair"; return ""; };
const mapOwnershipToUI = (v) => { v = String(v || "").toLowerCase(); if (v === "company_owned" || v === "owned") return "Owned"; if (v === "financed") return "Financed"; if (v === "leased") return "Leased"; if (v === "partner_owned" || v === "rented") return "Rented"; return ""; };
const mapTransmissionToUI = (v) => { v = String(v || ""); if (!v) return ""; if (/^amt$/i.test(v) || /semi[-_\s]?automatic/i.test(v)) return "Semi-Automatic"; if (/cvt/i.test(v)) return "CVT"; if (/automatic/i.test(v)) return "Automatic"; if (/manual/i.test(v)) return "Manual"; if (/other/i.test(v)) return "Other"; return ""; };
const mapYesNo = (b) => !!b;
const toEnum = (s) => String(s || "").trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/_+/g, "_");
// The land_vehicle_specs.body_type/transmission_type DB columns are ENUMs whose
// values don't all follow the generic "lowercase_with_underscores" convention
// toEnum() produces (e.g. `familyMBP`, `sportcoupe`, `amt`) — map those explicitly
// so a mismatched value never reaches the DB and blows up as a raw SQL error.
const BODY_TYPE_ENUM_OVERRIDES = {
  family_mbp: "familyMBP",
  sport_coupe: "sportcoupe",
  "mpv_/_minivan": "mpv",
  special_purpose_vehicle: "special_purpose",
};
const TRANSMISSION_ENUM_OVERRIDES = { semi_automatic: "amt" };
const ALLOWED_TRANSMISSIONS = ["manual", "automatic", "amt", "cvt", "dct"];
const extractMediaEntries = (maybe) => { if (!maybe) return []; const arr = Array.isArray(maybe) ? maybe : []; const out = []; arr.forEach((it) => { if (typeof it === "string") out.push({ id: null, url: it }); else if (it && typeof it === "object") { const id = it.id ?? it.media_id ?? it.uuid ?? it.file_id ?? null; const url = it.url || it.src || it.path || it.preview_url || it.original_url || it.full_url || (it.attributes && (it.attributes.url || it.attributes.src)) || it.file_path; if (url) out.push({ id, url }); } }); return out; };
const extractFromSpatieMedia = (media, names) => { if (!Array.isArray(media)) return []; const set = new Set(names.map((n) => String(n || "").toLowerCase())); return media.filter((m) => set.has(String(m.collection_name || "").toLowerCase())).map((m) => ({ id: m.id ?? null, url: m.original_url || m.url || m.preview_url || "" })).filter((x) => x.url); };
const extractInsuranceFromDocuments = (docs) => { if (!Array.isArray(docs)) return []; const looks = (s = "") => /insurance/i.test(String(s)); const pick = (d) => d.original_url || d.full_url || d.preview_url || d.url || d.path || d.file_path || d.image || d.src; return docs.filter((d) => looks(d?.type) || looks(d?.doc_type) || looks(d?.document_type) || looks(d?.category) || looks(d?.label) || looks(d?.title) || looks(d?.name) || looks(d?.collection_name)).map((d) => ({ id: d.id ?? d.media_id ?? null, url: pick(d) })).filter((x) => x.url && /\.(png|jpe?g|webp|gif)$/i.test(x.url)); };
const dedupeByUrl = (arr) => { const seen = new Set(); return (arr || []).filter(({ url }) => url && !seen.has(url) ? (seen.add(url), true) : false); };
const parseExtraFeatures = (raw, fallbackText = "") => { if (!raw && !fallbackText) return []; const fromObj = (obj) => Object.entries(obj || {}).map(([k, v]) => ({ name: String(k || "").trim(), price: String(v ?? "").trim() })).filter((it) => it.name); let data = raw; try { if (typeof raw === "string") { const t = raw.trim(); if (t.startsWith("[") || t.startsWith("{")) data = JSON.parse(t); else if (t) { const parts = t.split(/[|,]/); return parts.map((seg) => { const [name, price] = seg.split(":"); return { name: (name || "").trim(), price: (price || "").trim() }; }).filter((it) => it.name); } } } catch (_) { } if (Array.isArray(data)) { return data.map((it) => { if (typeof it === "string") { const [name, price] = it.split(":"); return { name: (name || "").trim(), price: (price || "").trim() }; } if (it && typeof it === "object") { if ("name" in it || "price" in it) return { name: (it.name || "").trim(), price: String(it.price ?? "").trim() }; return fromObj(it)[0] || null; } return null; }).filter(Boolean); } if (data && typeof data === "object") { if (Array.isArray(data.items)) return parseExtraFeatures(data.items); return fromObj(data); } if (fallbackText && typeof fallbackText === "string") { const parts = fallbackText.split(/[|,]/); return parts.map((seg) => ({ name: seg.trim(), price: "" })).filter((it) => it.name); } return []; };
const MAX_IMAGES = 16, MAX_INSURANCE_IMAGES = 5;

const AddUnit = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [imageFiles, setImageFiles] = useState([]), [imagePreviews, setImagePreviews] = useState([]);
  const [insuranceFiles, setInsuranceFiles] = useState([]), [insurancePreviews, setInsurancePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]), [existingInsurance, setExistingInsurance] = useState([]);
  const [removedExistingImages, setRemovedExistingImages] = useState(new Set());
  const [removedExistingInsurance, setRemovedExistingInsurance] = useState(new Set());
  const imagesInputRef = useRef(null), insuranceInputRef = useRef(null), formRef = useRef(null);

  const { props } = usePage();
  const isEdit = (props?.mode === "edit") && !!props?.vehicle?.id;
  const vehicle = props?.vehicle || null;

  const [editModalOpen, setEditModalOpen] = useState(false);

  /* ---------- Driver picker state & helpers ---------- */
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverQuery, setDriverQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null); // {id, full_name, phone, vehicle_type, vehicle_no}

  const getJson = async (url) => {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const fetchDrivers = async () => {
    setDriverLoading(true);
    try {
      const u = new URL("/vendor/drivers", window.location.origin);
      u.searchParams.set("per_page", "50");
      u.searchParams.set("sort", "full_name");
      u.searchParams.set("dir", "asc");
      u.searchParams.set("status", "Active"); // Filter by Active status
      const q = driverQuery?.trim();
      if (q) {
        u.searchParams.set("q", q); // Search query separate from status
      }
      const data = await getJson(u.toString());
      setDrivers(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setDriverLoading(false);
    }
  };
  /* --------------------------------------------------- */

  useEffect(() => { const msg = props?.flash?.success; if (msg && !showCenterModal) { setSuccessMsg(msg); setShowSuccess(true); const t = setTimeout(() => setShowSuccess(false), 2500); return () => clearTimeout(t); } }, [props?.flash?.success, showCenterModal]);

  useEffect(() => { setEditModalOpen(!!isEdit); }, [isEdit]);

  /* unified scroll lock: locks when either modal is open */
  useEffect(() => {
    const lock = editModalOpen || driverModalOpen;
    if (lock) {
      document.documentElement.classList.add("overflow-hidden");
      document.body.classList.add("overflow-hidden");
    } else {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    };
  }, [editModalOpen, driverModalOpen]);

  useEffect(() => {
    if (!isEdit || !vehicle) return;
    const bodyTypeVal = fromOptions(vehicle.bodyType ?? vehicle.body_type, bodyTypeOptions);
    const fuelTypeVal = fromOptions(vehicle.fuelType ?? vehicle.fuel_type, fuelTypeOptions);
    const transmissionVal = fromOptions(mapTransmissionToUI(vehicle.transmissionType ?? vehicle.transmission_type), transmissionOptions);
    const conditionVal = fromOptions(mapConditionToUI(vehicle.condition), conditionOptions);
    const ownershipVal = fromOptions(mapOwnershipToUI(vehicle.ownershipType ?? vehicle.ownership_type), ownershipTypeOptions);

    const gps = vehicle.gps ?? vehicle.gps_navigation ?? vehicle.has_gps ?? false;
    const childSeat = vehicle.childSeat ?? vehicle.child_seat ?? vehicle.child_seat_available ?? false;
    const wifi = vehicle.wifi ?? vehicle.has_wifi ?? vehicle.wifi_available ?? false;
    const insuranceCoverage = vehicle.insuranceCoverage ?? vehicle.insurance_coverage ?? vehicle.insurance_included ?? false;
    const addDriver = vehicle.addDriver ?? vehicle.add_driver ?? vehicle.driver_available ?? false;

    const gpsPrice = vehicle.gpsPrice ?? vehicle.gps_price ?? "";
    const childSeatPrice = vehicle.childSeatPrice ?? vehicle.child_seat_price ?? "";
    const wifiPrice = vehicle.wifiPrice ?? vehicle.wifi_price ?? "";
    const insuranceCoveragePrice = vehicle.insuranceCoveragePrice ?? vehicle.insurance_coverage_price ?? "";
    const addDriverPrice = vehicle.addDriverPrice ?? vehicle.add_driver_price ?? "";

    const extrasRaw = vehicle.additionalFeatures ?? vehicle.additional_features ?? vehicle.extraFeatures ?? vehicle.extra_features ?? vehicle.more_features ?? vehicle.features ?? vehicle.features_list ?? vehicle.options ?? vehicle.extra_features_json ?? null;

    const next = {
      category: vehicle.category || "",
      vehicleType: vehicle.vehicleType || vehicle.vehicle_type || "",
      model: vehicle.model || "",
      manufacture: vehicle.manufacture || vehicle.manufacturer || "",
      manufactureYear: vehicle.manufactureYear ?? vehicle.manufacture_year ?? "",
      registerYear: vehicle.registerYear ?? vehicle.register_year ?? "",
      number: vehicle.number || vehicle.registration || "",
      colour: vehicle.colour || vehicle.color || "",
      condition: conditionVal, ownershipType: ownershipVal,
      passengerCapacity: vehicle.passengerCapacity ?? vehicle.passenger_capacity ?? "",
      description: vehicle.description || "",
      insuranceProvider: vehicle.insuranceProvider || vehicle.insurance_provider || "",
      gps: mapYesNo(gps), childSeat: mapYesNo(childSeat), wifi: mapYesNo(wifi), insuranceCoverage: mapYesNo(insuranceCoverage),
      extra: vehicle.extra || "",
      mileage: vehicle.mileage ?? "",
      bodyType: bodyTypeVal, industryCategory: vehicle.industryCategory ?? vehicle.industry_category ?? "", fuelType: fuelTypeVal, transmissionType: transmissionVal,
      gears: vehicle.gears ?? "", seats: vehicle.seats ?? "", doors: vehicle.doors ?? "",
      luggageCapacity: vehicle.luggageCapacity ?? vehicle.luggage_capacity ?? "",
      fuelTankCapacity: vehicle.fuelTankCapacity ?? vehicle.fuel_tank_capacity ?? "",
      aircraft_type: vehicle.aircraft_type || "", icao_type_designator: vehicle.icao_type_designator || "", base_airport_iata: vehicle.base_airport_iata || "", base_airport_icao: vehicle.base_airport_icao || "",
      crew_required: vehicle.crew_required ?? "", range_km: vehicle.range_km ?? "", mtow_kg: vehicle.mtow_kg ?? "", cruising_speed_kts: vehicle.cruising_speed_kts ?? "", air_fuel_type: vehicle.air_fuel_type || "", flight_hours_total: vehicle.flight_hours_total ?? "",
      vessel_type: vehicle.vessel_type || "", hull_material: vehicle.hull_material || "", length_m: vehicle.length_m ?? "", beam_m: vehicle.beam_m ?? "", draft_m: vehicle.draft_m ?? "", engine_type: vehicle.engine_type || "", engine_power_hp: vehicle.engine_power_hp ?? "", sea_fuel_type: vehicle.sea_fuel_type || "",
      cabins: vehicle.cabins ?? "", berths: vehicle.berths ?? "", toilets: vehicle.toilets ?? "", fuel_tank_l: vehicle.fuel_tank_l ?? "", water_tank_l: vehicle.water_tank_l ?? "",
      rentalPricePerDay: vehicle.rentalPricePerDay ?? vehicle.rental_price_per_day ?? "", totalRentalPrice: vehicle.totalRentalPrice ?? vehicle.total_rental_price ?? "", deposit: vehicle.deposit ?? "", advancePayment: vehicle.advancePayment ?? vehicle.advance_payment ?? "",
      gpsPrice, childSeatPrice, wifiPrice, insuranceCoveragePrice, addDriver: mapYesNo(addDriver), addDriverPrice, extraFeatures: []
    };
    next.extraFeatures = parseExtraFeatures(extrasRaw, vehicle.extra || "");
    setForm((prev) => ({ ...prev, ...next }));

    // Pre-fill driver if present
    const maybeId = vehicle.driver_id || vehicle.driverId;
    const maybeName = vehicle.driver_name || vehicle.driverName;
    if (maybeId) {
      setSelectedDriver({
        id: maybeId,
        full_name: maybeName || "Assigned driver",
        phone: vehicle.driver_phone || "",
        vehicle_type: vehicle.driver_vehicle_type || "",
        vehicle_no: vehicle.driver_vehicle_no || "",
      });
    }

    let existingVehicleImgs = [];
    if (Array.isArray(vehicle.media)) existingVehicleImgs = extractFromSpatieMedia(vehicle.media, ["images", "vehicle_images", "vehicles", "vehicle-photos"]);
    if (!existingVehicleImgs.length) existingVehicleImgs = extractMediaEntries(vehicle.images) || extractMediaEntries(vehicle.image_urls) || extractMediaEntries(vehicle.photos) || [];

    let existingInsuranceImgs = [];
    if (Array.isArray(vehicle.media)) existingInsuranceImgs = extractFromSpatieMedia(vehicle.media, ["insurance", "insurance_docs", "insurance_photos", "vehicle-insurance"]);
    if (!existingInsuranceImgs.length) existingInsuranceImgs = extractMediaEntries(vehicle.insuranceDocs) || extractMediaEntries(vehicle.insurance_docs) || extractMediaEntries(vehicle.insurancePhotos) || extractMediaEntries(vehicle.insurance_photos) || [];
    if (!existingInsuranceImgs.length) {
      const docs = vehicle.documents || vehicle.docs || vehicle.vehicle_documents || vehicle.mediaDocuments || [];
      existingInsuranceImgs = extractInsuranceFromDocuments(docs);
    }
    if (!existingInsuranceImgs.length) {
      existingInsuranceImgs = extractMediaEntries([vehicle.insurance_image, vehicle.insurance_photo, vehicle.insurance, vehicle.insurancePath, vehicle.insurance_path].filter(Boolean));
    }
    existingInsuranceImgs = dedupeByUrl(existingInsuranceImgs);

    setExistingImages(existingVehicleImgs);
    setExistingInsurance(existingInsuranceImgs);
    setRemovedExistingImages(new Set()); setRemovedExistingInsurance(new Set());
    setImageFiles([]); setImagePreviews([]); setInsuranceFiles([]); setInsurancePreviews([]);
    if (imagesInputRef.current) imagesInputRef.current.value = ""; if (insuranceInputRef.current) insuranceInputRef.current.value = "";
    setErrors({}); setServerError("");
  }, [props?.mode, vehicle?.id]);

  useEffect(() => () => { imagePreviews.forEach((u) => URL.revokeObjectURL(u)); insurancePreviews.forEach((u) => URL.revokeObjectURL(u)); }, [imagePreviews, insurancePreviews]);

  const inputClasses = (name) => `w-full rounded-lg px-4 py-2.5 transition ${errors[name] ? 'border border-red-500 focus:ring-red-500 focus:border-red-500' : 'border border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`;
  const selectClasses = inputClasses;

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target; setServerError("");
    if (type === "file") {
      setForm((p) => ({ ...p, [name]: files }));
      if (name === "images") {
        const incoming = Array.from(files || []); if (incoming.length) { const remaining = Math.max(0, MAX_IMAGES - imageFiles.length); const toAdd = incoming.slice(0, remaining); setImageFiles((p) => [...p, ...toAdd]); setImagePreviews((p) => [...p, ...toAdd.map((f) => URL.createObjectURL(f))]); }
      }
      if (name === "insuranceDocs") {
        const incoming = Array.from(files || []); if (incoming.length) { const remaining = Math.max(0, MAX_INSURANCE_IMAGES - insuranceFiles.length); const toAdd = incoming.slice(0, remaining); setInsuranceFiles((p) => [...p, ...toAdd]); setInsurancePreviews((p) => [...p, ...toAdd.map((f) => URL.createObjectURL(f))]); }
      }
      return;
    }
    if (type === "checkbox") { setForm((p) => ({ ...p, [name]: checked })); return; }
    if (name === "transmissionType") {
      const nextVal = value;
      setForm((p) => ({ ...p, transmissionType: nextVal, gears: isGearsIrrelevant(nextVal) ? "" : p.gears }));
      setErrors((p) => ({ ...p, transmissionType: undefined, ...(isGearsIrrelevant(value) ? { gears: undefined } : {}) }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value })); setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const removePreviewAt = (i) => { const url = imagePreviews[i]; if (url) URL.revokeObjectURL(url); setImagePreviews((p) => p.filter((_, x) => x !== i)); setImageFiles((p) => p.filter((_, x) => x !== i)); };
  const removeInsuranceAt = (i) => { const url = insurancePreviews[i]; if (url) URL.revokeObjectURL(url); setInsurancePreviews((p) => p.filter((_, x) => x !== i)); setInsuranceFiles((p) => p.filter((_, x) => x !== i)); };
  const removeExistingImageAt = (i) => { setExistingImages((p) => { const entry = p[i]; if (!entry) return p; const key = entry.id != null ? `id:${entry.id}` : `url:${entry.url}`; setRemovedExistingImages((s) => new Set([...s, key])); const next = [...p]; next.splice(i, 1); return next; }); };
  const removeExistingInsuranceAt = (i) => { setExistingInsurance((p) => { const entry = p[i]; if (!entry) return p; const key = entry.id != null ? `id:${entry.id}` : `url:${entry.url}`; setRemovedExistingInsurance((s) => new Set([...s, key])); const next = [...p]; next.splice(i, 1); return next; }); };

  const appendIfPresent = (fd, key, val) => { if (val !== null && val !== undefined) fd.append(key, val); };
  const appendRemovalPayloads = (fd) => {
    const collect = (set) => { const ids = [], urls = []; set.forEach((t) => { if (t.startsWith("id:")) ids.push(t.slice(3)); else if (t.startsWith("url:")) urls.push(t.slice(4)); }); return { ids, urls }; };
    const img = collect(removedExistingImages), ins = collect(removedExistingInsurance);
    img.ids.forEach((v) => fd.append("remove_existing_images[]", v));
    img.urls.forEach((v) => fd.append("remove_existing_images_by_url[]", v));
    img.ids.forEach((v) => fd.append("remove_images[]", v));
    img.ids.forEach((v) => fd.append("delete_images[]", v));
    img.ids.forEach((v) => fd.append("delete_existing_images[]", v));
    img.urls.forEach((v) => fd.append("remove_images_by_url[]", v));
    ins.ids.forEach((v) => fd.append("remove_existing_insurance[]", v));
    ins.urls.forEach((v) => fd.append("remove_existing_insurance_by_url[]", v));
    ins.ids.forEach((v) => fd.append("remove_insurance[]", v));
    ins.ids.forEach((v) => fd.append("delete_insurance[]", v));
    ins.ids.forEach((v) => fd.append("delete_existing_insurance[]", v));
    ins.urls.forEach((v) => fd.append("remove_insurance_by_url[]", v));
    fd.append("remove_payload_json", JSON.stringify({ images: { ids: img.ids, urls: img.urls }, insurance: { ids: ins.ids, urls: ins.urls } }));
  };

  const validate = () => {
    const e = {}, must = ["category", "model", "manufacture", "manufactureYear", "registerYear", "number", "colour", "condition", "ownershipType", "passengerCapacity", "rentalPricePerDay", "deposit", "advancePayment"];
    must.forEach((k) => { if (!String(form[k] || "").trim()) e[k] = "This field is required."; });
    if (form.category === "Land") {
      ["mileage", "bodyType", "fuelType", "transmissionType", "seats", "doors", "fuelTankCapacity"].forEach((k) => { if (!String(form[k] || "").trim()) e[k] = "This field is required."; });
      if (!isGearsIrrelevant(form.transmissionType) && !String(form.gears || "").trim()) e.gears = "This field is required.";
    }
    if (form.category === "Air") { ["aircraft_type", "crew_required", "air_fuel_type"].forEach((k) => { if (!String(form[k] || "").trim()) e[k] = "This field is required."; }); }
    if (form.category === "Sea") { ["vessel_type", "hull_material", "length_m", "beam_m", "draft_m", "engine_type", "engine_power_hp", "sea_fuel_type"].forEach((k) => { if (!String(form[k] || "").trim()) e[k] = "This field is required."; }); }
    // If Add Driver checked but none selected:
    if (form.addDriver && !selectedDriver?.id) e.addDriver = "Please select a driver.";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault(); setServerError("");
    const v = validate(); if (Object.keys(v).length) { setErrors(v); formRef.current?.reportValidity?.(); return; }
    setIsSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "images" || key === "insuranceDocs") {
        if (key === "images" && imageFiles.length) imageFiles.forEach((f) => data.append("images[]", f));
        else if (key === "insuranceDocs" && insuranceFiles.length) insuranceFiles.forEach((f) => data.append("insuranceDocs[]", f));
        else if (value && value.length) { for (let i = 0; i < value.length; i++) data.append(`${key}[]`, value[i]); }
      } else if (key === "extraFeatures") {
        const safe = Array.isArray(value) ? value.filter((it) => (it?.name || "").trim() !== "") : [];
        data.append("extraFeatures", JSON.stringify(safe));
        data.append("extra_features_json", JSON.stringify(safe));
      } else if (typeof value === "boolean") { data.append(key, value ? "true" : "false"); }
      else appendIfPresent(data, key, value);
    });
    appendRemovalPayloads(data);

    if (form.category === "Land") {
      const bodyTypeRaw = toEnum(form.bodyType);
      const body_type = BODY_TYPE_ENUM_OVERRIDES[bodyTypeRaw] || bodyTypeRaw;
      const fuel_type = toEnum(form.fuelType);
      const wanted = toEnum(form.transmissionType);
      const transmission_type = TRANSMISSION_ENUM_OVERRIDES[wanted] || (ALLOWED_TRANSMISSIONS.includes(wanted) ? wanted : "manual");
      if (isGearsIrrelevant(transmission_type)) data.set("gears", "");
      data.set("bodyType", body_type); data.set("fuelType", fuel_type); data.set("transmissionType", transmission_type);
      data.set("body_type", body_type); data.set("fuel_type", fuel_type); data.set("transmission_type", transmission_type);
      if (form.fuelTankCapacity !== undefined) data.set("fuel_tank_capacity_l", String(form.fuelTankCapacity));
    }

    // include selected driver if Add Driver is checked
    if (form.addDriver && selectedDriver?.id) {
      data.append("driver_id", String(selectedDriver.id));
    }

    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || (window.Laravel?.csrfToken ?? "");
    const options = {
      forceFormData: true, preserveState: true, withCredentials: true, headers: csrf ? { "X-CSRF-TOKEN": csrf } : {},
      onBefore: () => { setErrors({}); setServerError(""); },
      onSuccess: () => { setSuccessMsg(props?.flash?.success || (isEdit ? "Unit updated successfully." : "Unit saved successfully.")); setShowCenterModal(true); setShowSuccess(false); },
      onError: (err) => { setErrors(err || {}); const sv = (err && (err.server || err.message)) || ""; if (sv) setServerError(String(sv)); },
      onFinish: () => setIsSubmitting(false),
    };
    if (isEdit && vehicle?.id) { data.append("_method", "PUT"); router.post(`/vendor/vehicles/${vehicle.id}`, data, options); }
    else router.post("/vendor/vehicles/store", data, options);
  };

  const handleAddAnother = () => {
    imagePreviews.forEach((u) => URL.revokeObjectURL(u));
    insurancePreviews.forEach((u) => URL.revokeObjectURL(u));
    setForm(initialState); setExistingImages([]); setExistingInsurance([]);
    setRemovedExistingImages(new Set()); setRemovedExistingInsurance(new Set());
    setImageFiles([]); setImagePreviews([]); setInsuranceFiles([]); setInsurancePreviews([]);
    setSelectedDriver(null);
    setErrors({}); setServerError(""); if (imagesInputRef.current) imagesInputRef.current.value = ""; if (insuranceInputRef.current) insuranceInputRef.current.value = "";
    setShowCenterModal(false);
  };

  const addExtraFeature = () => setForm((p) => ({ ...p, extraFeatures: [...(p.extraFeatures || []), { name: "", price: "" }] }));
  const updateExtraFeature = (idx, field, val) => setForm((p) => { const next = [...(p.extraFeatures || [])]; next[idx] = { ...next[idx], [field]: val }; return { ...p, extraFeatures: next }; });
  const removeExtraFeature = (idx) => setForm((p) => { const next = [...(p.extraFeatures || [])]; next.splice(idx, 1); return { ...p, extraFeatures: next }; });

  const imagesUsed = imageFiles.length, canAddMoreImages = imagesUsed < MAX_IMAGES;
  const insuranceUsed = insuranceFiles.length, canAddMoreInsurance = insuranceUsed < MAX_INSURANCE_IMAGES;

  const DriverPickerModal = (
    <EditModalShell
      open={driverModalOpen}
      title="Choose Driver"
      onClose={() => setDriverModalOpen(false)}
      /* higher z-index so it sits ABOVE the edit modal */
      zIndexClass="z-[11500]"
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:max-w-md">
            <input
              value={driverQuery}
              onChange={(e) => setDriverQuery(e.target.value)}
              placeholder="Search drivers by name, phone, license…"
              className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-[#0955AC]"
            />
            <button
              type="button"
              onClick={fetchDrivers}
              className="h-[40px] px-4 rounded-[10px] bg-[#F3F3F3] text-[#0955AC] font-[700]"
            >
              Search
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setDriverQuery(""); fetchDrivers(); }}
            className="h-[40px] px-4 rounded-[10px] border border-[#E5E5E5] bg-white hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        {/* Results */}
        <div className="mt-5">
          {driverLoading ? (
            <div className="w-full py-10 text-center text-gray-500">Loading drivers…</div>
          ) : drivers.length === 0 ? (
            <div className="w-full py-10 text-center text-gray-500">No drivers found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-[10px] border border-[#E5E5E5] p-4 flex flex-col gap-2"
                  style={{ boxShadow: "4px 4px 4px #0000001A" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[16px] font-[700] text-[#000000CC]">
                      {d.full_name}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-[6px] text-xs ${d.status === "Active"
                          ? "bg-[#C5E6F9] text-[#0955AC]"
                          : "bg-[#FFDBDF] text-[#7B7B7A]"
                        }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="text-[14px] text-[#00000080]">
                    {d.phone || "-"}
                  </div>
                  <div className="text-[14px] text-[#00000080]">
                    {d.vehicle_type || "—"} • {d.vehicle_no || "—"}
                  </div>
                  <div className="text-[12px] text-[#7B7B7A]">
                    License: {d.license_no || "—"} {d.license_expiry ? `• Exp: ${d.license_expiry}` : ""}
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriver({
                          id: d.id,
                          full_name: d.full_name,
                          phone: d.phone,
                          vehicle_type: d.vehicle_type,
                          vehicle_no: d.vehicle_no,
                        });
                        setDriverModalOpen(false);
                      }}
                      className="h-[35px] px-4 rounded-[6px] bg-[#0955AC] text-white font-[700]"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EditModalShell>
  );

  const FormMarkup = (
    <div className="px-4 sm:px-6 lg:px-8 py-6 figtree">
      <CenterModal open={showCenterModal} title="Done" message={successMsg} onClose={handleAddAnother} onPrimary={() => router.visit("/vendors/units", { preserveScroll: true })} />
      <Toast show={showSuccess && !showCenterModal} title="Done" message={successMsg} onClose={() => setShowSuccess(false)} />

      <div>
        <form ref={formRef} onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-8 bebas-neue font-[400]">
          {serverError ? <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 p-3 text-sm">{serverError}</div> : null}

          {/* Category */}
          <section className="bg-white p-6 rounded-lg mb-8">
            <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Category</h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label htmlFor="category" className="block text-[14px] font-medium text-gray-700">Select Category <Req /></label>
                <select id="category" name="category" className={selectClasses("category")} value={form.category} onChange={handleChange} {...req("Please select a category.")}>
                  <option value="">Select category</option>{categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <div className="text-red-500 text-xs mt-1">{errors.category}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="vehicleType" className="block text-[14px] font-medium text-gray-700">Vehicle Type</label>
                <input
                  id="vehicleType"
                  name="vehicleType"
                  className={inputClasses("vehicleType")}
                  value={form.vehicleType}
                  onChange={handleChange}
                  placeholder={getVehicleTypePlaceholder(form.category)}
                />
                {errors.vehicleType && <div className="text-red-500 text-xs mt-1">{errors.vehicleType}</div>}
              </div>
            </div>
          </section>

          {/* Basic Information */}
          <section className="bg-white p-6 rounded-lg">
            <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="model" className="block text-[14px] font-medium text-gray-700">Model <Req /></label>
                <input id="model" name="model" className={inputClasses("model")} value={form.model} onChange={handleChange} placeholder="Enter model" {...req("Please enter the model.")} />
                {errors.model && <div className="text-red-500 text-xs mt-1">{errors.model}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="manufacture" className="block text-[14px] font-medium text-gray-700">Manufacturer <Req /></label>
                <input id="manufacture" name="manufacture" className={inputClasses("manufacture")} value={form.manufacture} onChange={handleChange} placeholder="Enter manufacturer" {...req("Please enter the manufacturer.")} />
                {errors.manufacture && <div className="text-red-500 text-xs mt-1">{errors.manufacture}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="manufactureYear" className="block text-[14px] font-medium text-gray-700">Manufacture Year <Req /></label>
                <input id="manufactureYear" type="number" name="manufactureYear" className={inputClasses("manufactureYear")} value={form.manufactureYear} onChange={handleChange} min="1900" max="2100" placeholder="YYYY" {...req("Please enter the manufacture year.")} />
                {errors.manufactureYear && <div className="text-red-500 text-xs mt-1">{errors.manufactureYear}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="registerYear" className="block text-[14px] font-medium text-gray-700">Register Year <Req /></label>
                <input id="registerYear" type="number" name="registerYear" className={inputClasses("registerYear")} value={form.registerYear} onChange={handleChange} min="1900" max="2100" placeholder="YYYY" {...req("Please enter the registration year.")} />
                {errors.registerYear && <div className="text-red-500 text-xs mt-1">{errors.registerYear}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="number" className="block text-[14px] font-medium text-gray-700">{form.category === "Air" ? "Aircraft Registration" : form.category === "Sea" ? "Vessel IMO Number" : "Vehicle Number"} <Req /></label>
                <input id="number" name="number" className={inputClasses("number")} value={form.number} onChange={handleChange} placeholder={form.category === "Air" ? "Enter aircraft registration" : form.category === "Sea" ? "Enter IMO number" : "Enter vehicle number"} {...req("Please enter the registration/number.")} />
                {errors.number && <div className="text-red-500 text-xs mt-1">{errors.number}</div>}
              </div>
              <div className="space-y-2">
                <label htmlFor="colour" className="block text-[14px] font-medium text-gray-700">Colour <Req /></label>
                <input id="colour" name="colour" className={inputClasses("colour")} value={form.colour} onChange={handleChange} placeholder="Enter colour" {...req("Please enter the colour.")} />
                {errors.colour && <div className="text-red-500 text-xs mt-1">{errors.colour}</div>}
              </div>
            </div>
          </section>

          {/* Details & Documentation */}
          <section className="bg-white p-6 rounded-lg">
            <h2 className="text-[18px] font-[400] text-gray-800 mb-6">{form.category === "Air" ? "Aircraft" : form.category === "Sea" ? "Vessel" : "Vehicle"} Details & Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* existing images */}
                {isEdit && existingImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-[14px] font-medium text-gray-700">Current Images</span>
                      <span className="text-xs text-gray-500">{existingImages.length}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {existingImages.map((entry, i) => (
                        <div key={`old-img-${entry.id ?? i}`} className="relative rounded-md overflow-hidden border border-gray-200">
                          <img src={entry.url} alt={`existing-${i}`} className="h-20 w-full object-cover" />
                          <button type="button" onClick={() => removeExistingImageAt(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80" title="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* upload new images */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[14px] font-medium text-gray-700">{form.category === "Air" ? "Upload Aircraft Images" : form.category === "Sea" ? "Upload Vessel Images" : "Upload Vehicle Images"}</label>
                    <span className="text-xs text-gray-500">{imageFiles.length}/{MAX_IMAGES}</span>
                  </div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="images" className={`relative bg-white rounded-md font-medium ${canAddMoreImages ? 'cursor-pointer text-blue-600 hover:text-blue-500' : 'opacity-50 cursor-not-allowed text-gray-400'}`}>
                          <span>{canAddMoreImages ? 'Upload images' : 'Max reached'}</span>
                          <input ref={imagesInputRef} id="images" name="images" type="file" multiple accept="image/*" onChange={handleChange} className="sr-only" disabled={!canAddMoreImages} />
                        </label>
                        <p className="pl-1">{canAddMoreImages ? "or drag and drop" : ""}</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP up to 10MB</p>
                    </div>
                  </div>
                  {errors.images && <div className="text-red-500 text-xs mt-1">{errors.images}</div>}

                  {imagePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {imagePreviews.map((src, i) => (
                        <div key={i} className="relative group rounded-md overflow-hidden border border-gray-200">
                          <img src={src} alt={`preview-${i}`} className="h-20 w-full object-cover" />
                          <button type="button" onClick={() => removePreviewAt(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Land-specific left */}
                {form.category === "Land" && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="industryCategory" className="block text-[14px] font-medium text-gray-700">Use / Industry Category</label>
                      <select id="industryCategory" name="industryCategory" className={selectClasses("industryCategory")} value={form.industryCategory} onChange={handleChange}>
                        <option value="">Select category</option>
                        {INDUSTRY_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      {errors.industryCategory && <div className="text-red-500 text-xs mt-1">{errors.industryCategory}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="bodyType" className="block text-[14px] font-medium text-gray-700">Body Type <Req /></label>
                      <select id="bodyType" name="bodyType" className={selectClasses("bodyType")} value={form.bodyType} onChange={handleChange} {...req("Please select a body type.")}>
                        <option value="">Select body type</option>{bodyTypeOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>{errors.bodyType && <div className="text-red-500 text-xs mt-1">{errors.bodyType}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="fuelType" className="block text-[14px] font-medium text-gray-700">Fuel Type <Req /></label>
                      <select id="fuelType" name="fuelType" className={selectClasses("fuelType")} value={form.fuelType} onChange={handleChange} {...req("Please select a fuel type.")}>
                        <option value="">Select fuel type</option>{fuelTypeOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>{errors.fuelType && <div className="text-red-500 text-xs mt-1">{errors.fuelType}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="transmissionType" className="block text-[14px] font-medium text-gray-700">Transmission Type <Req /></label>
                      <select id="transmissionType" name="transmissionType" className={selectClasses("transmissionType")} value={form.transmissionType} onChange={handleChange} {...req("Please select a transmission type.")}>
                        <option value="">Select transmission type</option>{transmissionOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>{errors.transmissionType && <div className="text-red-500 text-xs mt-1">{errors.transmissionType}</div>}
                    </div>

                    {!isGearsIrrelevant(form.transmissionType) && (
                      <div className="space-y-2">
                        <label htmlFor="gears" className="block text-[14px] font-medium text-gray-700">Number of Gears <Req /></label>
                        <input id="gears" type="number" name="gears" min="1" className={inputClasses("gears")} value={form.gears} onChange={handleChange} placeholder="Enter number of gears" {...req("Please enter number of gears.")} />
                        {errors.gears && <div className="text-red-500 text-xs mt-1">{errors.gears}</div>}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="seats" className="block text-[14px] font-medium text-gray-700">Number of Seats <Req /></label>
                      <input id="seats" type="number" name="seats" min="1" className={inputClasses("seats")} value={form.seats} onChange={handleChange} placeholder="Enter number of seats" {...req("Please enter number of seats.")} />
                      {errors.seats && <div className="text-red-500 text-xs mt-1">{errors.seats}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="doors" className="block text-[14px] font-medium text-gray-700">Number of Doors <Req /></label>
                      <input id="doors" type="number" name="doors" min="1" className={inputClasses("doors")} value={form.doors} onChange={handleChange} placeholder="Enter number of doors" {...req("Please enter number of doors.")} />
                      {errors.doors && <div className="text-red-500 text-xs mt-1">{errors.doors}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="luggageCapacity" className="block text-[14px] font-medium text-gray-700">Luggage Capacity (bags)</label>
                      <input id="luggageCapacity" type="number" name="luggageCapacity" min="0" className={inputClasses("luggageCapacity")} value={form.luggageCapacity} onChange={handleChange} placeholder="Enter luggage capacity" />
                      {errors.luggageCapacity && <div className="text-red-500 text-xs mt-1">{errors.luggageCapacity}</div>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="fuelTankCapacity" className="block text-[14px] font-medium text-gray-700">Fuel Tank Capacity (liters) <Req /></label>
                      <input id="fuelTankCapacity" type="number" name="fuelTankCapacity" min="0" step="0.1" className={inputClasses("fuelTankCapacity")} value={form.fuelTankCapacity} onChange={handleChange} placeholder="Enter fuel tank capacity" {...req("Please enter fuel tank capacity.")} />
                      {errors.fuelTankCapacity && <div className="text-red-500 text-xs mt-1">{errors.fuelTankCapacity}</div>}
                    </div>
                  </>
                )}

                {/* Air (left column) */}
                {form.category === "Air" && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="aircraft_type" className="block text-[14px] font-medium text-gray-700">Aircraft Type <Req /></label>
                      <select id="aircraft_type" name="aircraft_type" className={selectClasses("aircraft_type")} value={form.aircraft_type} onChange={handleChange} {...req("Please select an aircraft type.")}>
                        <option value="">Select aircraft type</option>{aircraftTypeOptions.map((a) => <option key={a} value={a}>{a.replace("_", " ").toUpperCase()}</option>)}
                      </select>{errors.aircraft_type && <div className="text-red-500 text-xs mt-1">{errors.aircraft_type}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="icao_type_designator" className="block text-[14px] font-medium text-gray-700">ICAO Type Designator</label>
                      <input id="icao_type_designator" name="icao_type_designator" maxLength="8" className={inputClasses("icao_type_designator")} value={form.icao_type_designator} onChange={handleChange} placeholder="Enter ICAO type designator" />
                      {errors.icao_type_designator && <div className="text-red-500 text-xs mt-1">{errors.icao_type_designator}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="base_airport_iata" className="block text-[14px] font-medium text-gray-700">Base Airport IATA</label>
                      <input id="base_airport_iata" name="base_airport_iata" maxLength="3" className={inputClasses("base_airport_iata")} value={form.base_airport_iata} onChange={handleChange} placeholder="Enter IATA code" />
                      {errors.base_airport_iata && <div className="text-red-500 text-xs mt-1">{errors.base_airport_iata}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="base_airport_icao" className="block text-[14px] font-medium text-gray-700">Base Airport ICAO</label>
                      <input id="base_airport_icao" name="base_airport_icao" maxLength="4" className={inputClasses("base_airport_icao")} value={form.base_airport_icao} onChange={handleChange} placeholder="Enter ICAO code" />
                      {errors.base_airport_icao && <div className="text-red-500 text-xs mt-1">{errors.base_airport_icao}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="air_fuel_type" className="block text-[14px] font-medium text-gray-700">Fuel Type <Req /></label>
                      <select id="air_fuel_type" name="air_fuel_type" className={selectClasses("air_fuel_type")} value={form.air_fuel_type} onChange={handleChange} {...req("Please select a fuel type.")}>
                        <option value="">Select fuel type</option>{airFuelTypeOptions.map((f) => <option key={f} value={f}>{f.replace("_", " ").toUpperCase()}</option>)}
                      </select>{errors.air_fuel_type && <div className="text-red-500 text-xs mt-1">{errors.air_fuel_type}</div>}
                    </div>
                  </>
                )}

                {/* Sea (left) */}
                {form.category === "Sea" && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="vessel_type" className="block text-[14px] font-medium text-gray-700">Vessel Type <Req /></label>
                      <select id="vessel_type" name="vessel_type" className={selectClasses("vessel_type")} value={form.vessel_type} onChange={handleChange} {...req("Please select a vessel type.")}>
                        <option value="">Select vessel type</option>{vesselTypeOptions.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                      </select>{errors.vessel_type && <div className="text-red-500 text-xs mt-1">{errors.vessel_type}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="hull_material" className="block text-[14px] font-medium text-gray-700">Hull Material <Req /></label>
                      <select id="hull_material" name="hull_material" className={selectClasses("hull_material")} value={form.hull_material} onChange={handleChange} {...req("Please select a hull material.")}>
                        <option value="">Select hull material</option>{hullMaterialOptions.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>{errors.hull_material && <div className="text-red-500 text-xs mt-1">{errors.hull_material}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="length_m" className="block text-[14px] font-medium text-gray-700">Length (m) <Req /></label>
                      <input id="length_m" type="number" name="length_m" min="0" step="0.01" max="999999.99" className={inputClasses("length_m")} value={form.length_m} onChange={handleChange} placeholder="Enter length in meters" {...req("Please enter length.")} />
                      {errors.length_m && <div className="text-red-500 text-xs mt-1">{errors.length_m}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="beam_m" className="block text-[14px] font-medium text-gray-700">Beam (m) <Req /></label>
                      <input id="beam_m" type="number" name="beam_m" min="0" step="0.01" max="999999.99" className={inputClasses("beam_m")} value={form.beam_m} onChange={handleChange} placeholder="Enter beam in meters" {...req("Please enter beam.")} />
                      {errors.beam_m && <div className="text-red-500 text-xs mt-1">{errors.beam_m}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="draft_m" className="block text-[14px] font-medium text-gray-700">Draft (m) <Req /></label>
                      <input id="draft_m" type="number" name="draft_m" min="0" step="0.01" max="999999.99" className={inputClasses("draft_m")} value={form.draft_m} onChange={handleChange} placeholder="Enter draft in meters" {...req("Please enter draft.")} />
                      {errors.draft_m && <div className="text-red-500 text-xs mt-1">{errors.draft_m}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="engine_type" className="block text-[14px] font-medium text-gray-700">Engine Type <Req /></label>
                      <select id="engine_type" name="engine_type" className={selectClasses("engine_type")} value={form.engine_type} onChange={handleChange} {...req("Please select an engine type.")}>
                        <option value="">Select engine type</option>{engineTypeOptions.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                      </select>{errors.engine_type && <div className="text-red-500 text-xs mt-1">{errors.engine_type}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="engine_power_hp" className="block text-[14px] font-medium text-gray-700">Engine Power (hp) <Req /></label>
                      <input id="engine_power_hp" type="number" name="engine_power_hp" min="0" className={inputClasses("engine_power_hp")} value={form.engine_power_hp} onChange={handleChange} placeholder="Enter engine power in hp" {...req("Please enter engine power.")} />
                      {errors.engine_power_hp && <div className="text-red-500 text-xs mt-1">{errors.engine_power_hp}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="sea_fuel_type" className="block text-[14px] font-medium text-gray-700">Fuel Type <Req /></label>
                      <select id="sea_fuel_type" name="sea_fuel_type" className={selectClasses("sea_fuel_type")} value={form.sea_fuel_type} onChange={handleChange} {...req("Please select a fuel type.")}>
                        <option value="">Select fuel type</option>{seaFuelTypeOptions.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                      </select>{errors.sea_fuel_type && <div className="text-red-500 text-xs mt-1">{errors.sea_fuel_type}</div>}
                    </div>
                  </>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-[14px] font-medium text-gray-700">Description</label>
                  <textarea id="description" name="description" rows="4" className={inputClasses("description")} value={form.description} onChange={handleChange} placeholder="Enter description" />
                  {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
                </div>
              </div>

              <div className="space-y-6">
                {/* condition / ownership / capacity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="condition" className="block text-[14px] font-medium text-gray-700">Condition <Req /></label>
                    <select id="condition" name="condition" className={selectClasses("condition")} value={form.condition} onChange={handleChange} {...req("Please select a condition.")}>
                      <option value="">Select condition</option>{conditionOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>{errors.condition && <div className="text-red-500 text-xs mt-1">{errors.condition}</div>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="ownershipType" className="block text-[14px] font-medium text-gray-700">Ownership Type <Req /></label>
                    <select id="ownershipType" name="ownershipType" className={selectClasses("ownershipType")} value={form.ownershipType} onChange={handleChange} {...req("Please select an ownership type.")}>
                      <option value="">Select ownership type</option>{ownershipTypeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>{errors.ownershipType && <div className="text-red-500 text-xs mt-1">{errors.ownershipType}</div>}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="passengerCapacity" className="block text-[14px] font-medium text-gray-700">Passenger Capacity <Req /></label>
                    <input id="passengerCapacity" type="number" name="passengerCapacity" min="0" max="255" className={inputClasses("passengerCapacity")} value={form.passengerCapacity} onChange={handleChange} placeholder="Enter passenger capacity" {...req("Please enter passenger capacity.")} />
                    {errors.passengerCapacity && <div className="text-red-500 text-xs mt-1">{errors.passengerCapacity}</div>}
                  </div>
                </div>

                {/* land mileage */}
                {form.category === "Land" && (
                  <div className="space-y-2">
                    <label htmlFor="mileage" className="block text-[14px] font-medium text-gray-700">Mileage (km) <Req /></label>
                    <input id="mileage" type="number" name="mileage" min="0" className={inputClasses("mileage")} value={form.mileage} onChange={handleChange} placeholder="Enter mileage" {...req("Please enter mileage.")} />
                    {errors.mileage && <div className="text-red-500 text-xs mt-1">{errors.mileage}</div>}
                  </div>
                )}

                {/* Air (right) */}
                {form.category === "Air" && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="crew_required" className="block text-[14px] font-medium text-gray-700">Crew Required <Req /></label>
                      <input id="crew_required" type="number" name="crew_required" min="0" max="255" className={inputClasses("crew_required")} value={form.crew_required} onChange={handleChange} placeholder="Enter number of crew required" {...req("Please enter crew required.")} />
                      {errors.crew_required && <div className="text-red-500 text-xs mt-1">{errors.crew_required}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="range_km" className="block text-[14px] font-medium text-gray-700">Range (km)</label>
                      <input id="range_km" type="number" name="range_km" min="0" className={inputClasses("range_km")} value={form.range_km} onChange={handleChange} placeholder="Enter range in km" />
                      {errors.range_km && <div className="text-red-500 text-xs mt-1">{errors.range_km}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mtow_kg" className="block text-[14px] font-medium text-gray-700">MTOW (kg)</label>
                      <input id="mtow_kg" type="number" name="mtow_kg" min="0" className={inputClasses("mtow_kg")} value={form.mtow_kg} onChange={handleChange} placeholder="Enter MTOW in kg" />
                      {errors.mtow_kg && <div className="text-red-500 text-xs mt-1">{errors.mtow_kg}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="cruising_speed_kts" className="block text-[14px] font-medium text-gray-700">Cruising Speed (kts)</label>
                      <input id="cruising_speed_kts" type="number" name="cruising_speed_kts" min="0" className={inputClasses("cruising_speed_kts")} value={form.cruising_speed_kts} onChange={handleChange} placeholder="Enter cruising speed" />
                      {errors.cruising_speed_kts && <div className="text-red-500 text-xs mt-1">{errors.cruising_speed_kts}</div>}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="flight_hours_total" className="block text-[14px] font-medium text-gray-700">Total Flight Hours</label>
                      <input id="flight_hours_total" type="number" name="flight_hours_total" min="0" className={inputClasses("flight_hours_total")} value={form.flight_hours_total} onChange={handleChange} placeholder="Enter total flight hours" />
                      {errors.flight_hours_total && <div className="text-red-500 text-xs mt-1">{errors.flight_hours_total}</div>}
                    </div>
                  </>
                )}

                {/* insurance quick field */}
                <div className="space-y-2">
                  <label htmlFor="insuranceProvider" className="block text-[14px] font-medium text-gray-700">Insurance Provider</label>
                  <input id="insuranceProvider" name="insuranceProvider" className={inputClasses("insuranceProvider")} value={form.insuranceProvider} onChange={handleChange} placeholder="Enter insurance provider name" />
                  {errors.insuranceProvider && <div className="text-red-500 text-xs mt-1">{errors.insuranceProvider}</div>}
                </div>

                {/* upload insurance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[14px] font-medium text-gray-700">Upload Insurance Photos</label>
                    <span className="text-xs text-gray-500">{insuranceFiles.length}/{MAX_INSURANCE_IMAGES}</span>
                  </div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="insuranceDocs" className={`relative bg-white rounded-md font-medium ${canAddMoreInsurance ? 'cursor-pointer text-blue-600 hover:text-blue-500' : 'opacity-50 cursor-not-allowed text-gray-400'}`}>
                          <span>{canAddMoreInsurance ? 'Upload photos' : 'Max reached'}</span>
                          <input ref={insuranceInputRef} id="insuranceDocs" name="insuranceDocs" type="file" multiple accept="image/*" onChange={handleChange} className="sr-only" disabled={!canAddMoreInsurance} />
                        </label>
                        <p className="pl-1">{canAddMoreInsurance ? "or drag and drop" : ""}</p>
                      </div>
                      <p className="text-xs text-gray-500">Images only (PNG, JPG, JPEG, WEBP), up to 5 photos</p>
                    </div>
                  </div>
                  {errors.insuranceDocs && <div className="text-red-500 text-xs mt-1">{errors.insuranceDocs}</div>}
                  {insurancePreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {insurancePreviews.map((src, i) => (
                        <div key={i} className="relative group rounded-md overflow-hidden border border-gray-200">
                          <img src={src} alt={`insurance-${i}`} className="h-20 w-full object-cover" />
                          <button type="button" onClick={() => removeInsuranceAt(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100" title="Remove">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* current insurance images */}
                {isEdit && existingInsurance.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-[14px] font-medium text-gray-700">Current Insurance Photos</span>
                      <span className="text-xs text-gray-500">{existingInsurance.length}</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {existingInsurance.map((entry, i) => (
                        <div key={`old-ins-${entry.id ?? i}`} className="relative rounded-md overflow-hidden border border-gray-200">
                          <img src={entry.url} alt={`ins-${i}`} className="h-20 w-full object-cover" />
                          <button type="button" onClick={() => removeExistingInsuranceAt(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80" title="Remove insurance image">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Features & Pricing */}
          <section className="bg-white p-6 rounded-lg">
            <h2 className="text-[18px] font-[400] text-gray-800 mb-6">Features & Pricing</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="rentalPricePerDay" className="block text-[14px] font-medium text-gray-700">Daily Rental Price ($) <Req /></label>
                  <input id="rentalPricePerDay" type="number" name="rentalPricePerDay" min="0" step="0.01" className={inputClasses("rentalPricePerDay")} value={form.rentalPricePerDay} onChange={handleChange} placeholder="0.00" {...req("Please enter daily rental price.")} />
                  {errors.rentalPricePerDay && <div className="text-red-500 text-xs mt-1">{errors.rentalPricePerDay}</div>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="deposit" className="block text-[14px] font-medium text-gray-700">Deposit Amount ($) <Req /></label>
                  <input id="deposit" type="number" name="deposit" min="0" step="0.01" className={inputClasses("deposit")} value={form.deposit} onChange={handleChange} placeholder="0.00" {...req("Please enter the deposit amount.")} />
                  {errors.deposit && <div className="text-red-500 text-xs mt-1">{errors.deposit}</div>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="advancePayment" className="block text-[14px] font-medium text-gray-700">Advance Payment ($) <Req /></label>
                  <input id="advancePayment" type="number" name="advancePayment" min="0" step="0.01" className={inputClasses("advancePayment")} value={form.advancePayment} onChange={handleChange} placeholder="0.00" {...req("Please enter the advance payment.")} />
                  {errors.advancePayment && <div className="text-red-500 text-xs mt-1">{errors.advancePayment}</div>}
                </div>
              </div>

              {/* additional features */}
              <div className="space-y-4">
                <label className="block text-[14px] font-medium text-gray-700">Additional Features <span className="text-gray-400 text-xs">(optional)</span></label>

                {/* gps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" name="gps" checked={form.gps} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">GPS Navigation</span>
                  </label>
                  <div className="md:col-span-2">
                    <input type="number" min="0" step="0.01" name="gpsPrice" value={form.gpsPrice} onChange={handleChange} placeholder="GPS price per day (0.00)" className={inputClasses("gpsPrice")} disabled={!form.gps} {...(form.gps ? req("Enter GPS price.") : {})} />
                    {errors.gpsPrice && <div className="text-red-500 text-xs mt-1">{errors.gpsPrice}</div>}
                  </div>
                </div>

                {/* child seat (land only) */}
                {form.category === "Land" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" name="childSeat" checked={form.childSeat} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                      <span className="ml-2 text-sm text-gray-700">Child Seat</span>
                    </label>
                    <div className="md:col-span-2">
                      <input type="number" min="0" step="0.01" name="childSeatPrice" value={form.childSeatPrice} onChange={handleChange} placeholder="Child seat price per day (0.00)" className={inputClasses("childSeatPrice")} disabled={!form.childSeat} {...(form.childSeat ? req("Enter child seat price.") : {})} />
                      {errors.childSeatPrice && <div className="text-red-500 text-xs mt-1">{errors.childSeatPrice}</div>}
                    </div>
                  </div>
                )}

                {/* wifi */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" name="wifi" checked={form.wifi} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Wi-Fi</span>
                  </label>
                  <div className="md:col-span-2">
                    <input type="number" min="0" step="0.01" name="wifiPrice" value={form.wifiPrice} onChange={handleChange} placeholder="Wi-Fi price per day (0.00)" className={inputClasses("wifiPrice")} disabled={!form.wifi} {...(form.wifi ? req("Enter Wi-Fi price.") : {})} />
                    {errors.wifiPrice && <div className="text-red-500 text-xs mt-1">{errors.wifiPrice}</div>}
                  </div>
                </div>

                {/* insurance coverage */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" name="insuranceCoverage" checked={form.insuranceCoverage} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Insurance Coverage</span>
                  </label>
                  <div className="md:col-span-2">
                    <input type="number" min="0" step="0.01" name="insuranceCoveragePrice" value={form.insuranceCoveragePrice} onChange={handleChange} placeholder="Insurance coverage price per day (0.00)" className={inputClasses("insuranceCoveragePrice")} disabled={!form.insuranceCoverage} {...(form.insuranceCoverage ? req("Enter insurance coverage price.") : {})} />
                    {errors.insuranceCoveragePrice && <div className="text-red-500 text-xs mt-1">{errors.insuranceCoveragePrice}</div>}
                  </div>
                </div>

                {/* more features */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[14px] font-medium text-gray-700">More Features (name + price) <span className="text-gray-400 text-xs">(optional)</span></label>
                    <button type="button" onClick={addExtraFeature} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200" title="Add feature">
                      <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Add
                    </button>
                  </div>
                  {(form.extraFeatures?.length ? form.extraFeatures : []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6">
                        <input type="text" placeholder="Feature name (e.g., Baby Stroller)" className={inputClasses(`extraFeatures_name_${idx}`)} value={item?.name ?? ""} onChange={(e) => updateExtraFeature(idx, "name", e.target.value)} />
                      </div>
                      <div className="md:col-span-4">
                        <input type="number" min="0" step="0.01" placeholder="0.00" className={inputClasses(`extraFeatures_price_${idx}`)} value={item?.price ?? ""} onChange={(e) => updateExtraFeature(idx, "price", e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <button type="button" onClick={() => removeExtraFeature(idx)} className="w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* add driver */}
                <div className="pt-2 border-t border-gray-200" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" name="addDriver" checked={form.addDriver} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">Add Driver</span>
                  </label>
                  <div className="md:col-span-2">
                    <input type="number" min="0" step="0.01" name="addDriverPrice" value={form.addDriverPrice} onChange={handleChange} placeholder="Driver price per day (0.00)" className={inputClasses("addDriverPrice")} disabled={!form.addDriver} {...(form.addDriver ? req("Enter driver price.") : {})} />
                    {errors.addDriverPrice && <div className="text-red-500 text-xs mt-1">{errors.addDriverPrice}</div>}
                  </div>
                </div>

                {/* selected / pick driver */}
                {form.addDriver && (
                  <div className="mt-4">
                    {selectedDriver ? (
                      <div
                        className="w-full bg-[#FFFFFF] rounded-[10px] border border-[#E5E5E5] px-4 py-4 flex items-center justify-between"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                      >
                        <div className="flex flex-col">
                          <span className="text-[16px] font-[700] text-[#000000CC]">
                            {selectedDriver.full_name}
                          </span>
                          <span className="text-[14px] text-[#00000080]">
                            {selectedDriver.phone || "-"} • {selectedDriver.vehicle_type || "—"} • {selectedDriver.vehicle_no || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setDriverModalOpen(true); fetchDrivers(); }}
                            className="h-[35px] px-4 rounded-[6px] bg-[#F3F3F3] text-[#0955AC] font-[700]"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDriver(null)}
                            className="h-[35px] px-4 rounded-[6px] bg-[#FFDBDF] text-[#7B7B7A] font-[700]"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-full bg-[#FFFFFF] rounded-[10px] border border-dashed border-[#E5E5E5] px-4 py-6 flex items-center justify-between"
                        style={{ boxShadow: "4px 4px 4px #0000001A" }}
                      >
                        <div className="text-[14px] text-[#00000080]">
                          No driver selected.
                        </div>
                        <button
                          type="button"
                          onClick={() => { setDriverModalOpen(true); fetchDrivers(); }}
                          className="h-[35px] px-4 rounded-[6px] bg-[#0955AC] text-white font-[700]"
                        >
                          Select Driver
                        </button>
                      </div>
                    )}
                    {/* Hidden field for backend fallback */}
                    <input type="hidden" name="driver_id" value={selectedDriver?.id || ""} />
                    {errors.addDriver && <div className="text-red-500 text-xs mt-2">{errors.addDriver}</div>}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button type="button" className="px-6 py-2.5 border border-gray-300 text-gray-700 font-[700] figtree rounded-lg" onClick={() => {
              if (isEdit) { setEditModalOpen(false); router.visit("/vendors/units", { preserveScroll: true, replace: true }); }
              else { router.visit("/vendors/units", { preserveScroll: true, replace: true }); }
            }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={`inline-flex items-center px-6 py-2.5 border border-transparent font-[700] figtree rounded-lg text-white bg-[#0955AC] ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  {isEdit ? "Update Unit" : `Save ${form.category || "Unit"}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <VendorShellLayout activeService="Vehicle Rental">
      <main className="flex-1">
        {!isEdit && (
          <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Add Unit</h2>
            </div>
          </header>
        )}

        {/* Driver picker modal (global to page, higher z-index) */}
        {DriverPickerModal}

        {!isEdit ? (
          FormMarkup
        ) : (
          <EditModalShell
            open={editModalOpen}
            title="Edit Unit"
            onClose={() => { setEditModalOpen(false); router.visit("/vendors/units", { preserveScroll: true, replace: true }); }}
          >
            {FormMarkup}
          </EditModalShell>
        )}
      </main>
    </VendorShellLayout>
  );
};

export default AddUnit;
