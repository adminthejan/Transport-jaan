// Deterministic dummy flight generator for Skyscanner flight search results.
// Seeded off the route and date, guaranteeing stable results across page refreshes
// and downstream review/payment flows.

const AIRLINES = [
  { name: "SriLankan Airlines", code: "UL", logoBg: "#0955AC" },
  { name: "Emirates", code: "EK", logoBg: "#D71921" },
  { name: "Qatar Airways", code: "QR", logoBg: "#5C0632" },
  { name: "Singapore Airlines", code: "SQ", logoBg: "#00266B" },
  { name: "Flydubai", code: "FZ", logoBg: "#F26522" },
  { name: "Etihad Airways", code: "EY", logoBg: "#C59B27" },
  { name: "FitsAir", code: "8D", logoBg: "#1E3A8A" },
  { name: "Cinnamon Air", code: "C7", logoBg: "#B45309" },
];

const INTERNATIONAL_LAYOVERS = [
  { city: "Doha (DOH)", duration: "1h 45m" },
  { city: "Dubai (DXB)", duration: "2h 10m" },
  { city: "Abu Dhabi (AUH)", duration: "1h 30m" },
  { city: "Singapore (SIN)", duration: "1h 55m" },
  { city: "Kuala Lumpur (KUL)", duration: "2h 20m" },
];

const DOMESTIC_LAYOVERS = [
  { city: "Jaffna (JAF)", duration: "45m" },
  { city: "Trincomalee (TRR)", duration: "35m" },
  { city: "Anuradhapura (ACJ)", duration: "40m" },
  { city: "Batticaloa (BTC)", duration: "30m" },
];

const AIRCRAFT_TYPES = [
  "Boeing 777-300ER",
  "Airbus A350-900",
  "Airbus A330-300",
  "Boeing 787-9 Dreamliner",
  "Airbus A321neo",
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash || 1;
}

// mulberry32 — seedable pseudo-random algorithm
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad2 = (n) => String(n).padStart(2, "0");

const formatTime = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
};

export const formatDuration = (mins) => `${Math.floor(mins / 60)}h ${pad2(mins % 60).replace(/^0/, "") || "00"}m`;

/**
 * @param {{from: string, to: string, date: string}} params
 * @returns {Array} ~9 deterministic dummy flight objects
 */
export function generateFlights({ from = "", to = "", date = "" }) {
  const seedKey = `${from}|${to}|${date}`;
  const rand = mulberry32(hashString(seedKey));
  const isDomestic = from.toLowerCase().includes("hatton") || to.toLowerCase().includes("jaffna") || from.toLowerCase().includes("waters edge");
  const count = 9;
  const flights = [];

  for (let i = 0; i < count; i++) {
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
    const roll = rand();
    const stops = roll < 0.55 ? 0 : roll < 0.85 ? 1 : 2;

    const departTotal = (5 + Math.floor(rand() * 18)) * 60 + Math.floor(rand() * 4) * 15; // 05:00–22:45
    const flightDuration = isDomestic ? 35 + Math.floor(rand() * 45) : 180 + Math.floor(rand() * 240);
    const layoversList = isDomestic ? DOMESTIC_LAYOVERS : INTERNATIONAL_LAYOVERS;
    const pickedLayover = stops > 0 ? layoversList[Math.floor(rand() * layoversList.length)] : null;
    const layoverMinutes = stops > 0 ? stops * (60 + Math.floor(rand() * 50)) : 0;
    const durationMinutes = flightDuration + layoverMinutes;
    const arriveTotal = departTotal + durationMinutes;

    const basePrice = isDomestic ? 65 + Math.floor(rand() * 120) : 180 + Math.floor(rand() * 280);
    const price = basePrice + stops * 30;

    const co2Percent = 8 + Math.floor(rand() * 22) + (stops === 0 ? 10 : 0);
    const dealsCount = 2 + Math.floor(rand() * 7);
    const aircraft = AIRCRAFT_TYPES[Math.floor(rand() * AIRCRAFT_TYPES.length)];

    flights.push({
      id: `${seedKey}-${i}`,
      airline: airline.name,
      airlineCode: airline.code,
      logoBg: airline.logoBg,
      flightNumber: `${airline.code} ${100 + Math.floor(rand() * 800)}`,
      departAirport: from || "Colombo (CMB)",
      arriveAirport: to || "Dubai (DXB)",
      departTerminal: `Terminal ${1 + Math.floor(rand() * 2)}`,
      arriveTerminal: `Terminal ${1 + Math.floor(rand() * 3)}`,
      departTime: formatTime(departTotal),
      arriveTime: formatTime(arriveTotal),
      nextDayArrival: Math.floor(arriveTotal / 60) >= 24,
      durationMinutes,
      stops,
      layoverCity: pickedLayover ? pickedLayover.city : null,
      layoverDuration: pickedLayover ? pickedLayover.duration : null,
      aircraft,
      baggage: "30 kg Check-in · 7 kg Cabin bag included",
      meal: "Complimentary hot meals & beverages",
      wifi: "In-flight Wi-Fi & USB power",
      seatPitch: "32\" standard seat pitch",
      price,
      currency: "USD",
      co2Percent,
      dealsCount,
    });
  }

  return flights;
}

export function findFlight(searchParams, flightId) {
  return generateFlights(searchParams).find((f) => f.id === flightId) || null;
}
