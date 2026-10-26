import React, { useEffect, useRef, useState } from "react";

const DEFAULT_INPUT =
  "mt-1 w-full h-[49px] border border-[#0000004D] rounded-[5px] px-3 focus:outline-none placeholder:text-[12px] placeholder:font-[500] placeholder:text-[#808080]";
const LABEL = "text-[10px]/[24px] font-[600]";
const ERROR = "text-[10px] text-red-600 mt-1";

/** Sri Lankan NIC: old format 9 digits + V/X, new format 12 digits. */
export const NIC_PATTERN = /^(\d{9}[VvXx]|\d{12})$/;

export const validateNic = (value, { required = true } = {}) => {
  const v = String(value || "").trim();
  if (!v) return required ? "NIC number is required." : null;
  return NIC_PATTERN.test(v) ? null : "Enter a valid NIC (9 digits + V/X, or 12 digits).";
};

export const maxBirthday = (minAge = 18) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return d.toISOString().slice(0, 10);
};

export const validateBirthday = (value, { minAge = 18, required = true } = {}) => {
  if (!value) return required ? "Birthday is required." : null;
  if (Number.isNaN(Date.parse(value))) return "Enter a valid date.";
  return value <= maxBirthday(minAge) ? null : `You must be at least ${minAge} years old.`;
};

export const NicField = ({ value, onChange, error, label = "NIC Number :", inputClass = DEFAULT_INPUT, name = "nic_number" }) => (
  <div>
    <label className={LABEL}>{label}</label>
    <input
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, ""))}
      maxLength={12}
      className={inputClass}
      placeholder="199012345678"
      autoComplete="off"
    />
    {error && <p className={ERROR}>{error}</p>}
  </div>
);

export const BirthdayField = ({ value, onChange, error, minAge = 18, label = "Birthday :", inputClass = DEFAULT_INPUT }) => (
  <div>
    <label className={LABEL}>{label}</label>
    <input
      type="date"
      name="date_of_birth"
      value={value || ""}
      max={maxBirthday(minAge)}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
    {error && <p className={ERROR}>{error}</p>}
  </div>
);

/**
 * City type-ahead + zip. Typing 2+ letters lists matching Sri Lankan cities;
 * picking one fills the city and its postcode. The zip stays editable.
 */
export const CityZipFields = ({ city, zip, onCity, onZip, cityError, zipError, inputClass = DEFAULT_INPUT }) => {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return undefined;
    }
    const q = String(city || "").trim();
    if (q.length < 2) {
      setOptions([]);
      return undefined;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location/city-search?q=${encodeURIComponent(q)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        setOptions(json.data || []);
        setOpen(true);
      } catch (_) {
        /* aborted / offline: the user can still type the zip by hand */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [city]);

  useEffect(() => {
    const close = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (o) => {
    skipNext.current = true;
    onCity(o.name);
    onZip(String(o.postcode || "").slice(0, 5));
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <label className={LABEL}>City :</label>
        <input
          value={city}
          onChange={(e) => onCity(e.target.value)}
          onFocus={() => options.length && setOpen(true)}
          className={inputClass}
          placeholder="Start typing, e.g. Colombo"
          autoComplete="off"
        />
        {open && options.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-[8px] border border-[#0000001A] bg-white shadow-lg">
            {options.map((o) => (
              <li key={`${o.name}-${o.postcode}`}>
                <button
                  type="button"
                  onClick={() => pick(o)}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#EAF1FE] flex justify-between gap-2"
                >
                  <span>{o.subName ? `${o.name} - ${o.subName}` : o.name}</span>
                  <span className="text-[#64748B]">{o.postcode}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {cityError && <p className={ERROR}>{cityError}</p>}
      </div>
      <div>
        <label className={LABEL}>Zip Code :</label>
        <input
          value={zip}
          onChange={(e) => onZip(e.target.value)}
          maxLength={5}
          inputMode="numeric"
          className={inputClass}
          placeholder="Auto-filled from city"
        />
        {zipError && <p className={ERROR}>{zipError}</p>}
      </div>
    </>
  );
};

export const LicenseFields = ({ number, expiry, onNumber, onExpiry, numberError, expiryError, inputClass = DEFAULT_INPUT }) => (
  <>
    <div>
      <label className={LABEL}>Driving Licence No. :</label>
      <input value={number} onChange={(e) => onNumber(e.target.value)} maxLength={50} className={inputClass} placeholder="B1234567" />
      {numberError && <p className={ERROR}>{numberError}</p>}
    </div>
    <div>
      <label className={LABEL}>Licence Expiry Date :</label>
      <input type="date" value={expiry || ""} onChange={(e) => onExpiry(e.target.value)} className={inputClass} />
      {expiryError && <p className={ERROR}>{expiryError}</p>}
    </div>
  </>
);
