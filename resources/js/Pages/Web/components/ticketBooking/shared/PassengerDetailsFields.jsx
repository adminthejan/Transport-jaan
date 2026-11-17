import React from "react";
import { User, Mail, Phone, ShieldCheck } from "lucide-react";
import { validateNic } from "../../../../../Components/forms/IdentityFields";

// One passenger-details block shared by the bus and train booking pages so both
// ask for the same fields, in the same order, with the same labels and rules:
// Full Name, NIC Number, Mobile Number, Email Address (all required).

const labelClass = "block text-[11px] font-[700] text-[#64748B] tracking-widest mb-1.5";
const inputClass = (hasError) =>
  `w-full h-[48px] rounded-[10px] border pl-11 pr-4 text-[14px] font-[600] text-[#0F172A] bg-white outline-none transition-colors ${
    hasError ? "border-red-400 ring-1 ring-red-200" : "border-[#E2E8F0] focus:border-[#0955AC] focus:ring-2 focus:ring-[#0955AC]/15"
  }`;

const Field = ({ id, label, icon: Icon, error, children }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label} *
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#0955AC]" />
      {children}
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

/** True when every standard passenger field is filled in and valid. */
export const isPassengerDetailsValid = ({ name, nic, phone, email }) =>
  String(name || "").trim().length > 2 &&
  !validateNic(nic) &&
  String(phone || "").trim().length >= 9 &&
  /^\S+@\S+\.\S+$/.test(String(email || "").trim());

const PassengerDetailsFields = ({ values, onChange, errors = {} }) => {
  const nicError = values.nic ? validateNic(values.nic) : null;

  return (
    <>
      <Field id="passenger_name" label="FULL NAME" icon={User} error={errors.passenger_name}>
        <input
          type="text"
          id="passenger_name"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter full name"
          className={inputClass(errors.passenger_name)}
          required
        />
      </Field>

      <Field id="passenger_nic" label="NIC NUMBER" icon={ShieldCheck} error={errors.passenger_nic || nicError}>
        <input
          type="text"
          id="passenger_nic"
          value={values.nic}
          onChange={(e) => onChange("nic", e.target.value.toUpperCase().replace(/\s/g, ""))}
          maxLength={12}
          placeholder="199012345678"
          className={inputClass(errors.passenger_nic || nicError)}
          required
        />
      </Field>

      <Field id="passenger_phone" label="MOBILE NUMBER" icon={Phone} error={errors.passenger_phone}>
        <input
          type="tel"
          id="passenger_phone"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="071 234 5678"
          className={inputClass(errors.passenger_phone)}
          required
        />
      </Field>

      <Field id="passenger_email" label="EMAIL ADDRESS" icon={Mail} error={errors.passenger_email}>
        <input
          type="email"
          id="passenger_email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="user@domain.com"
          className={inputClass(errors.passenger_email)}
          required
        />
      </Field>
    </>
  );
};

export default PassengerDetailsFields;
