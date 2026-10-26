// Ticket Booking categories and sub-categories (client amendment, 07 Oct).
// Air and Sea are request-based (a team member confirms price and availability),
// so the chosen category / sub-category is stored with the request.

export const AIR_TICKET_CATEGORIES = [
  { name: "Scheduled Flights", subs: ["Domestic Flights", "International Flights", "Regional Flights", "Connecting Flights"] },
  { name: "Charter Flights", subs: ["Shared Charter", "Private Charter", "Group Charter"] },
  { name: "Seaplane", subs: ["Scheduled Seaplane", "Seaplane Transfer", "Seaplane Tours"] },
  { name: "Helicopter", subs: ["Scheduled Helicopter", "Helicopter Transfer", "Helicopter Tours", "Helicopter Sightseeing"] },
  { name: "Other Air Passenger Services", subs: ["Scenic Flights", "Sightseeing Flights", "Air Tour"] },
];

export const SEA_TICKET_CATEGORIES = [
  {
    name: "Ferry",
    subs: [
      { name: "Passenger", note: "Passenger only" },
      { name: "High-Speed", note: "Fast passenger / vehicle services" },
      { name: "Vehicle", note: "Passengers + cars / trucks / other vehicles" },
      { name: "International", note: "Cross-border ferry routes" },
    ],
  },
  {
    name: "Cruise",
    subs: [
      { name: "Ocean", note: "Ocean voyages" },
      { name: "Coastal", note: "Coastal sightseeing" },
      { name: "River", note: "River sightseeing" },
      { name: "Luxury", note: "Luxury travel" },
      { name: "Dinner/Sunset", note: "Dinner & dining / sunset sightseeing" },
      { name: "Expedition", note: "Adventure & exploration" },
    ],
  },
  {
    name: "Boat & Water Transfer",
    subs: [
      { name: "Passenger Boat", note: "Passenger transport" },
      { name: "Water Taxi", note: "Short-distance water transport" },
      { name: "Island Transfer", note: "Transfers between islands" },
      { name: "Coastal Transfer", note: "Transfers along coastal areas" },
    ],
  },
  {
    name: "Yacht & Experiences",
    subs: [
      { name: "Yacht", note: "Private yacht trips" },
      { name: "Catamaran", note: "Catamaran cruises" },
      { name: "Sailing", note: "Sailing trips" },
      { name: "Sightseeing", note: "Scenic boat tours" },
      { name: "Whale Watching", note: "Whale watching tours" },
      { name: "Diving", note: "Diving trips" },
      { name: "Fishing", note: "Fishing trips" },
    ],
  },
];

/** Plain-string list of sub-category names for a category (air subs are strings, sea subs are objects). */
export const subNames = (category) => (category?.subs || []).map((s) => (typeof s === "string" ? s : s.name));
