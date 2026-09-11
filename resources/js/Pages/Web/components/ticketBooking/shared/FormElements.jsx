import React, { useState } from "react";

// Shared visual shell for every field in the ticket-search cards: a soft
// grey fill with an icon in a tinted circle, brightening to white with a
// focus ring when active — one consistent, modern language instead of each
// card inventing its own bordered-box-plus-icon treatment.
export const FieldShell = ({ icon: Icon, iconBg = "bg-[#EAF1FE]", iconColor = "text-[#0955AC]", error, focused, children }) => (
  <div
    className={`flex items-center gap-3 h-[56px] rounded-[14px] border px-4 transition-all duration-200 ${
      error
        ? "bg-red-50/60 border-red-300"
        : focused
        ? "bg-white border-[#0955AC]/40 shadow-[0_0_0_4px_rgba(9,85,172,0.10)]"
        : "bg-[#F8FAFC] border-transparent hover:bg-[#F1F5F9]"
    }`}
  >
    {Icon && (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${error ? "bg-red-100" : iconBg}`}>
        <Icon className={`w-4 h-4 ${error ? "text-red-500" : iconColor}`} />
      </div>
    )}
    {children}
  </div>
);

export const FieldLabel = ({ children }) => (
  <label className="block text-[11px] font-[700] text-[#64748B] tracking-widest mb-2">{children}</label>
);

export const FieldError = ({ children }) =>
  children ? <p className="text-red-500 text-[11px] mt-1.5 font-[600]">{children}</p> : null;

/**
 * Generic search-as-you-type field. `options` can be plain strings or
 * objects — pass `getSearchText`/`getKey`/`getValue`/`renderOption` to
 * control matching, keys, the committed value, and how each row renders.
 */
export const AutoCompleteField = ({
  label,
  id,
  value,
  onChange,
  placeholder,
  error,
  icon,
  iconBg,
  iconColor,
  options,
  getSearchText = (o) => String(o),
  getKey = (o) => String(o),
  getValue = (o) => String(o),
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [focused, setFocused] = useState(false);

  const runFilter = (term) => options.filter((o) => getSearchText(o).toLowerCase().includes(term.toLowerCase()));

  const handleChange = (e) => {
    const term = e.target.value;
    onChange(term);
    setFiltered(term.length > 0 ? runFilter(term) : options);
    setIsOpen(true);
  };

  const handleSelect = (option) => {
    onChange(getValue(option));
    setIsOpen(false);
  };

  const handleFocus = () => {
    setFocused(true);
    setFiltered(value ? runFilter(value) : options);
    setIsOpen(true);
  };

  const handleBlur = () => {
    setFocused(false);
    // Delay so the option's onClick still registers before the list unmounts.
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div className="relative">
      {label && <FieldLabel>{label}</FieldLabel>}
      <FieldShell icon={icon} iconBg={iconBg} iconColor={iconColor} error={error} focused={focused}>
        <input
          type="text"
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none text-[14px] font-[600] text-[#0B1B34] placeholder:text-[#94A3B8] placeholder:font-[500]"
        />
      </FieldShell>
      <FieldError>{error}</FieldError>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-black/5 rounded-[14px] shadow-[0_16px_40px_rgba(11,27,52,0.16)] max-h-64 overflow-y-auto mt-2 py-1.5">
          {filtered.slice(0, 10).map((option) => (
            <div
              key={getKey(option)}
              onClick={() => handleSelect(option)}
              className="px-4 py-2.5 hover:bg-[#0955AC]/5 cursor-pointer transition-colors"
            >
              {renderOption ? renderOption(option) : (
                <span className="text-[13.5px] font-[600] text-[#0F172A]">{getSearchText(option)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DateField = ({ label, id, value, onChange, error, icon, iconBg, iconColor, min }) => (
  <div>
    {label && <FieldLabel>{label}</FieldLabel>}
    <FieldShell icon={icon} iconBg={iconBg} iconColor={iconColor} error={error}>
      <input
        type="date"
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        className="flex-1 min-w-0 bg-transparent outline-none text-[14px] font-[600] text-[#0B1B34] [color-scheme:light]"
      />
    </FieldShell>
    <FieldError>{error}</FieldError>
  </div>
);

// Shared "Search" / "Continue" submit button — gradient fill with a subtle
// lift-and-brighten on hover instead of a flat single-color button.
// `iconPosition="left"` for a search icon, "right" (default) for a
// continue/next arrow that slides on hover.
export const SubmitButton = ({ children, icon: Icon, iconPosition = "right" }) => (
  <button
    type="submit"
    className="group w-full h-[54px] bg-gradient-to-r from-[#0955AC] to-[#073E82] hover:from-[#0B63C4] hover:to-[#0955AC] text-white font-[700] text-[15px] rounded-[14px] transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(9,85,172,0.30)] hover:shadow-[0_14px_34px_rgba(9,85,172,0.38)] hover:-translate-y-0.5 cursor-pointer"
  >
    {Icon && iconPosition === "left" && <Icon className="w-[18px] h-[18px]" />}
    {children}
    {Icon && iconPosition === "right" && (
      <Icon className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" />
    )}
  </button>
);

// Trip-type segmented control (One way / Round Trip), shared visual style.
export const SegmentedControl = ({ options, value, onChange }) => (
  <div className="inline-flex bg-[#F1F5F9] rounded-full p-1 mb-6">
    {options.map((opt) => (
      <button
        type="button"
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`px-6 py-2 rounded-full text-[13px] font-[700] transition-all cursor-pointer ${
          value === opt.value ? "bg-[#0955AC] text-white shadow-sm" : "text-[#475569] hover:text-[#0955AC]"
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// Swap button centered on the seam between two fields.
export const SwapButton = ({ onClick, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    title="Swap"
    className="hidden md:flex absolute left-1/2 top-[38px] -translate-x-1/2 w-10 h-10 rounded-full bg-white border-2 border-[#0955AC] text-[#0955AC] items-center justify-center shadow-[0_4px_14px_rgba(9,85,172,0.18)] hover:bg-[#0955AC] hover:text-white hover:rotate-180 transition-all duration-300 z-10 cursor-pointer"
  >
    <Icon className="w-4 h-4" />
  </button>
);
