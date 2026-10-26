// Air and sea vehicle type lists (client amendment, 07 Oct).
// Mirror of config/vehicle_types.php - keep the two in step.
// Types that older vehicles may still carry (cruise_ship, glider, ...) are still
// accepted by the server but are no longer offered as choices.

export const AIR_VEHICLE_TYPES = [
  { id: "private_jet", label: "Private Jets" },
  { id: "business_aircraft", label: "Business Aircraft" },
  { id: "helicopter", label: "Helicopters" },
  { id: "charter_aircraft", label: "Charter Aircraft" },
  { id: "light_aircraft", label: "Light Aircraft" },
  { id: "turboprop_aircraft", label: "Turboprop Aircraft" },
  { id: "seaplane", label: "Seaplanes" },
  { id: "vip_aircraft", label: "VIP Aircraft" },
  { id: "air_ambulance", label: "Air Ambulance" },
  { id: "tourism_adventure", label: "Tourism & Adventure" },
  { id: "special_purpose_aircraft", label: "Special-Purpose Aircraft" },
  { id: "recreational_aircraft", label: "Recreational Aircraft" },
  { id: "other_aircraft", label: "Other Aircraft" },
];

export const SEA_VEHICLE_TYPES = [
  { id: "boat", label: "Boats" },
  { id: "speedboat", label: "Speedboats" },
  { id: "yacht", label: "Yachts" },
  { id: "sailboat", label: "Sailboats" },
  { id: "catamaran", label: "Catamarans" },
  { id: "jet_ski", label: "Jet Skis" },
  { id: "houseboat", label: "Houseboats" },
  { id: "fishing_boat", label: "Fishing Boats" },
  { id: "diving_adventure_boat", label: "Diving / Adventure Boats" },
  { id: "passenger_boat", label: "Passenger Boats" },
  { id: "kayak_canoe", label: "Kayaks / Canoes" },
  { id: "pontoon", label: "Pontoons" },
  { id: "luxury_vip_boat", label: "Luxury / VIP Boats" },
  { id: "other_watercraft", label: "Other Watercraft" },
];

const labelOf = (list, id) => list.find((t) => t.id === id)?.label || String(id || "").replace(/_/g, " ");

export const airTypeLabel = (id) => labelOf(AIR_VEHICLE_TYPES, id);
export const seaTypeLabel = (id) => labelOf(SEA_VEHICLE_TYPES, id);
