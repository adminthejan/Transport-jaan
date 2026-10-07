import React, { useEffect, useRef, useState } from "react";

const LocationSuggestInput = ({ id, value, onChange, placeholder, className, inputClassName }) => {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const fetchOptions = (q) => {
    window.clearTimeout(timer.current);
    if (!q || q.trim().length < 2) {
      setOptions([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/vehicles/locations/search?q=${encodeURIComponent(q.trim())}`, {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const data = await res.json();
        setOptions(Array.isArray(data?.locations) ? data.locations : []);
      } catch (e) {
        setOptions([]);
      }
    }, 250);
  };

  return (
    <div ref={wrapRef} className={`relative min-w-0 ${className || ""}`}>
      <input
        type="text"
        id={id}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange({ target: { id, value: e.target.value } });
          fetchOptions(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={inputClassName}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#D6DEEB] bg-white py-1 text-left shadow-lg">
          {options.map((o) => (
            <li key={o.label}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ target: { id, value: o.value } });
                  setOptions([]);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-[#0B1739] hover:bg-[#F0F7FF]"
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationSuggestInput;
