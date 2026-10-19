// Shared option lists for the warehouse search bar and sidebar.

// Matches warehouse_units.rate_type
export const RATE_TYPES = [
  { value: "per_sqft", label: "Sq Ft", unit: "sq ft", placeholder: "e.g., 10000" },
  { value: "per_cbm", label: "CBM", unit: "CBM", placeholder: "e.g., 500" },
  { value: "flat_rate", label: "Flat Rate", unit: "", placeholder: "Not needed for flat rate" },
];

// What can be booked on top of storage (warehouse_units.services)
export const SERVICES = [
  { id: "storage", label: "Storage" },
  { id: "fulfillment", label: "Fulfillment" },
  { id: "distribution", label: "Distribution" },
  { id: "value_added_services", label: "Value Added Services" },
  { id: "customs_services", label: "Customs Services" },
  { id: "transportation", label: "Transportation" },
];

// Storage temperature presets (degrees Celsius). The backend matches a
// warehouse when its supported range covers the chosen temperature.
export const TEMPERATURE_PRESETS = [
  { value: "", label: "Any temperature" },
  { value: "25", label: "Ambient (15 to 30 C)" },
  { value: "5", label: "Chilled (2 to 8 C)" },
  { value: "-20", label: "Frozen (-18 C or below)" },
];

export const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};
