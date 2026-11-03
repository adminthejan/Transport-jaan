import React from "react";

// Extended warehouse unit details. Everything is stored together as one `specs`
// JSON object on the unit (see WarehouseUnitController::parseSpecs).

export const EMPTY_SPECS = {
    unit_code: "",
    storage_type: "",
    commodity_type: "",
    unit_status: "available",
    floor_level: "",

    usable_area_sqft: "",
    length: "",
    width: "",
    clear_height: "",
    pallet_capacity: "",
    cubic_capacity_cbm: "",
    max_load: "",
    max_load_unit: "kg",
    available_capacity: "",
    occupied_capacity: "",

    pricing_unit: "",
    daily_rate: "",
    weekly_rate: "",
    min_rental_period: "",
    handling_charges: "",
    loading_unloading_charges: "",
    additional_service_charges: "",

    storage_features: [],

    access_handling: [],
    forklift_capacity: "",
    access_hours: "",

    security_safety: [],

    available_from: "",
    availability_status: "available",
    booking_lead_time: "",
    max_rental_period: "",
    next_available_date: "",
    current_occupancy: "",
    auto_renewal: false,

    cancellation_policy: "",
    damage_loss_policy: "",
    late_payment_policy: "",
    prohibited_goods: "",
    insurance_requirements: "",
    access_rules: "",
};

const STORAGE_TYPES = ["Ambient", "Cold Storage", "Frozen", "Climate Controlled", "Bonded", "Hazardous", "Open Yard", "Container Yard"];
const UNIT_STATUSES = [
    { value: "available", label: "Available" },
    { value: "occupied", label: "Occupied" },
    { value: "reserved", label: "Reserved" },
    { value: "maintenance", label: "Under Maintenance" },
    { value: "inactive", label: "Inactive" },
];
const PRICING_UNITS = [
    { value: "per_sqft", label: "Per sq ft" },
    { value: "per_pallet", label: "Per pallet" },
    { value: "per_cbm", label: "Per CBM" },
    { value: "per_unit", label: "Per unit" },
];
const STORAGE_FEATURES = ["Pallet Racking", "Floor Storage", "Cold Storage", "Frozen Storage", "Bonded Storage", "Hazardous Material Storage", "Food Grade Storage", "Pharmaceutical Grade Storage", "Container Storage", "Open Yard"];
const ACCESS_HANDLING = ["Dock Leveler", "Pallet Jack", "Crane Availability", "Loading / Unloading Service", "Truck Access", "Container Access"];
const SECURITY_SAFETY = ["Security Guards", "Access Control", "Alarm System", "Fire Detection System", "Emergency Exit", "Insurance Availability"];
export const SPEC_DOCUMENTS = [
    { key: "floor_plan", label: "Warehouse Layout / Floor Plan" },
    { key: "unit_layout", label: "Unit Layout" },
    { key: "fire_safety_certificate", label: "Fire Safety Certificate" },
    { key: "insurance_certificate", label: "Insurance Certificate" },
    { key: "warehouse_license", label: "Warehouse License / Certification" },
];

const inputCls = "w-full border border-[#D1D5DB] rounded-[6px] px-4 py-3 focus:ring-2 focus:ring-[#0955AC] focus:border-[#0955AC] bg-white text-[14px]";
const labelCls = "block text-[14px] font-[600] text-[#000000]";

const Section = ({ title, children }) => (
    <section className="bg-white p-6 rounded-lg">
        <h2 className="text-[18px] font-[400] text-gray-800 mb-6">{title}</h2>
        {children}
    </section>
);

const Grid = ({ children }) => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>;

const WarehouseSpecsFields = ({ specs, onChange, documents = {}, onDocumentChange, existingDocuments = {} }) => {
    const value = { ...EMPTY_SPECS, ...(specs || {}) };
    const set = (key, v) => onChange({ ...value, [key]: v });

    const text = (key, label, props = {}) => (
        <div className="space-y-2" key={key}>
            <label htmlFor={`spec-${key}`} className={labelCls}>{label}</label>
            <input id={`spec-${key}`} className={inputCls} value={value[key] ?? ""} onChange={(e) => set(key, e.target.value)} {...props} />
        </div>
    );
    const number = (key, label, props = {}) => text(key, label, { type: "number", min: "0", step: "any", ...props });
    const date = (key, label) => text(key, label, { type: "date" });
    const area = (key, label, placeholder) => (
        <div className="space-y-2" key={key}>
            <label htmlFor={`spec-${key}`} className={labelCls}>{label}</label>
            <textarea id={`spec-${key}`} rows={3} className={inputCls} value={value[key] ?? ""} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
        </div>
    );
    const checks = (key, options) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {options.map((opt) => {
                const checked = (value[key] || []).includes(opt);
                return (
                    <label key={opt} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[14px] cursor-pointer ${checked ? "border-[#0955AC] bg-blue-50" : "border-[#D1D5DB] bg-white"}`}>
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => set(key, checked ? value[key].filter((o) => o !== opt) : [...(value[key] || []), opt])}
                        />
                        {opt}
                    </label>
                );
            })}
        </div>
    );

    return (
        <>
            <Section title="Unit Identity">
                <Grid>
                    {text("unit_code", "Unit ID / Unit Name", { placeholder: "e.g. WH-A-001" })}
                    <div className="space-y-2">
                        <label htmlFor="spec-storage_type" className={labelCls}>Storage Type</label>
                        <select id="spec-storage_type" className={inputCls} value={value.storage_type} onChange={(e) => set("storage_type", e.target.value)}>
                            <option value="">Select storage type</option>
                            {STORAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {text("commodity_type", "Commodity Type", { placeholder: "e.g. Food & Beverage, Electronics" })}
                    <div className="space-y-2">
                        <label htmlFor="spec-unit_status" className={labelCls}>Unit Status</label>
                        <select id="spec-unit_status" className={inputCls} value={value.unit_status} onChange={(e) => set("unit_status", e.target.value)}>
                            {UNIT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    {text("floor_level", "Floor / Level", { placeholder: "e.g. Ground, 1st floor" })}
                </Grid>
            </Section>

            <Section title="Capacity & Dimensions">
                <Grid>
                    {number("usable_area_sqft", "Usable Storage Area (sqft)")}
                    {number("length", "Length (ft)")}
                    {number("width", "Width (ft)")}
                    {number("clear_height", "Clear Height (ft)")}
                    {number("pallet_capacity", "Pallet Capacity")}
                    {number("cubic_capacity_cbm", "Cubic Capacity (CBM)")}
                    <div className="space-y-2">
                        <label htmlFor="spec-max_load" className={labelCls}>Maximum Load Capacity</label>
                        <div className="flex gap-2">
                            <input id="spec-max_load" type="number" min="0" step="any" className={inputCls} value={value.max_load} onChange={(e) => set("max_load", e.target.value)} />
                            <select aria-label="Load unit" className={`${inputCls} w-28`} value={value.max_load_unit} onChange={(e) => set("max_load_unit", e.target.value)}>
                                <option value="kg">kg</option>
                                <option value="ton">ton</option>
                            </select>
                        </div>
                    </div>
                    {number("available_capacity", "Available Capacity")}
                    {number("occupied_capacity", "Occupied Capacity")}
                </Grid>
            </Section>

            <Section title="Additional Pricing">
                <Grid>
                    <div className="space-y-2">
                        <label htmlFor="spec-pricing_unit" className={labelCls}>Pricing Unit</label>
                        <select id="spec-pricing_unit" className={inputCls} value={value.pricing_unit} onChange={(e) => set("pricing_unit", e.target.value)}>
                            <option value="">Select pricing unit</option>
                            {PRICING_UNITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>
                    {number("daily_rate", "Daily Rate")}
                    {number("weekly_rate", "Weekly Rate")}
                    {text("min_rental_period", "Minimum Rental Period", { placeholder: "e.g. 1 month" })}
                    {number("handling_charges", "Handling Charges")}
                    {number("loading_unloading_charges", "Loading / Unloading Charges")}
                    {number("additional_service_charges", "Additional Service Charges")}
                </Grid>
            </Section>

            <Section title="Storage Features">{checks("storage_features", STORAGE_FEATURES)}</Section>

            <Section title="Access & Handling">
                <div className="space-y-6">
                    {checks("access_handling", ACCESS_HANDLING)}
                    <Grid>
                        {text("forklift_capacity", "Forklift Capacity", { placeholder: "e.g. 3 ton" })}
                        {text("access_hours", "Access Hours", { placeholder: "e.g. 24/7 or 08:00 - 18:00" })}
                    </Grid>
                </div>
            </Section>

            <Section title="Security & Safety">{checks("security_safety", SECURITY_SAFETY)}</Section>

            <Section title="Availability">
                <Grid>
                    {date("available_from", "Available From")}
                    <div className="space-y-2">
                        <label htmlFor="spec-availability_status" className={labelCls}>Availability Status</label>
                        <select id="spec-availability_status" className={inputCls} value={value.availability_status} onChange={(e) => set("availability_status", e.target.value)}>
                            <option value="available">Available</option>
                            <option value="partially_available">Partially Available</option>
                            <option value="fully_booked">Fully Booked</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>
                    {text("booking_lead_time", "Booking Lead Time", { placeholder: "e.g. 2 days" })}
                    {text("max_rental_period", "Maximum Rental Period", { placeholder: "e.g. 12 months" })}
                    {date("next_available_date", "Next Available Date")}
                    {number("current_occupancy", "Current Occupancy (%)", { max: "100" })}
                </Grid>
                <label className="mt-6 flex items-center gap-2 text-[14px] font-[600]">
                    <input type="checkbox" checked={!!value.auto_renewal} onChange={(e) => set("auto_renewal", e.target.checked)} />
                    Auto Renewal Option
                </label>
            </Section>

            <Section title="Unit Documents">
                <Grid>
                    {SPEC_DOCUMENTS.map(({ key, label }) => {
                        const existing = existingDocuments?.[key];
                        return (
                            <div className="space-y-2" key={key}>
                                <label htmlFor={`spec-doc-${key}`} className={labelCls}>{label}</label>
                                <input
                                    id={`spec-doc-${key}`}
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={(e) => onDocumentChange?.(key, e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {documents[key] ? (
                                    <p className="text-xs text-gray-500 truncate">{documents[key].name}</p>
                                ) : existing ? (
                                    <a href={`/storage/${existing}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View current file</a>
                                ) : null}
                            </div>
                        );
                    })}
                </Grid>
            </Section>

            <Section title="Unit Policies">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {area("cancellation_policy", "Cancellation Policy")}
                    {area("damage_loss_policy", "Damage / Loss Policy")}
                    {area("late_payment_policy", "Late Payment Policy")}
                    {area("prohibited_goods", "Prohibited Goods")}
                    {area("insurance_requirements", "Insurance Requirements")}
                    {area("access_rules", "Access Rules")}
                </div>
            </Section>
        </>
    );
};

export default WarehouseSpecsFields;
