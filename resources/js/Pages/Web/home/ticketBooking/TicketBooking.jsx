import React, { useState, useMemo } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import {
  ShieldCheck,
  Ticket,
  Wallet,
  Clock,
  MapPin,
  ArrowRight,
  Bus as BusIcon,
  TrainFront as TrainIcon,
  Plane as PlaneIcon,
  Ship as ShipIcon,
  Car as CarIcon,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Search,
} from "lucide-react";

import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import BusCard from "../../components/ticketBooking/BusCard";
import TrainCard from "../../components/ticketBooking/TrainCard";
import FlightCard from "../../components/ticketBooking/FlightCard";
import Categories from "../../components/rentAVehicle/Categories";
import WhyChooseUs from "../../components/rentAVehicle/WhyChooseUs";
import HowItWorks from "../../components/rentAVehicle/HowItWorks";
import Testimonials from "../../components/rentAVehicle/Testimonials";
import ContactStrip from "../../components/rentAVehicle/ContactStrip";
import Footer from "../../layouts/Footer";

import heroImg from "../../assets/ticketBooking/hero-bus-train-flight.jpg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Verified Operators" },
  { icon: Ticket, label: "Instant E-Tickets" },
  { icon: Wallet, label: "0% Hidden Fees" },
  { icon: Clock, label: "24/7 Live Support" },
];

const TICKET_CATEGORIES = [
  { id: "bus", label: "Express & Highway Buses", icon: BusIcon },
  { id: "train", label: "Scenic & Intercity Trains", icon: TrainIcon },
  { id: "flight", label: "Domestic & Regional Air", icon: PlaneIcon },
  { id: "sleeper", label: "Luxury Sleeper Coaches", icon: BusIcon },
  { id: "shuttle", label: "Airport Direct Shuttles", icon: CarIcon },
  { id: "ferry", label: "Island & Coastal Ferries", icon: ShipIcon },
];

const TICKET_WHY_POINTS = [
  {
    icon: ShieldCheck,
    title: "100% Verified Operators",
    desc: "Every bus, train, and flight carrier is licensed, insured, and verified for safe travel.",
  },
  {
    icon: Ticket,
    title: "Instant Digital E-Tickets",
    desc: "Receive your QR boarding pass instantly via SMS, email, and inside your personal dashboard.",
  },
  {
    icon: Wallet,
    title: "Zero Hidden Booking Fees",
    desc: "Guaranteed transparent pricing with live seat selection and no unexpected checkout add-ons.",
  },
  {
    icon: Clock,
    title: "24/7 Live Journey Support",
    desc: "Dedicated support agents ready to help with rescheduling, cancellations, and travel inquiries.",
  },
];

const POPULAR_ROUTES = [
  {
    id: 1,
    type: "bus",
    category: "Bus Express",
    badge: "Super Luxury AC",
    operator: "National Transport Commission",
    from: "Colombo Fort",
    to: "Kandy",
    departureTime: "06:30 AM",
    arrivalTime: "09:45 AM",
    duration: "3h 15m",
    price: "LKR 1,850",
    amenities: ["A/C", "Wi-Fi", "Reclining Seats"],
    dailyTrips: 18,
    routeParam: { from: "Colombo Central Bus Stand", to: "Kandy Bus Terminal" },
  },
  {
    id: 2,
    type: "bus",
    category: "Expressway",
    badge: "Southern Highway",
    operator: "SLTB Luxury Express",
    from: "Makumbura (Kottawa)",
    to: "Galle",
    departureTime: "07:15 AM",
    arrivalTime: "08:45 AM",
    duration: "1h 30m",
    price: "LKR 1,450",
    amenities: ["A/C", "Expressway", "USB Ports"],
    dailyTrips: 24,
    routeParam: { from: "Colombo Central Bus Stand", to: "Galle Bus Station" },
  },
  {
    id: 3,
    type: "train",
    category: "Scenic Rail",
    badge: "Observation Saloon",
    operator: "Sri Lanka Railways",
    from: "Colombo Fort",
    to: "Ella",
    departureTime: "05:55 AM",
    arrivalTime: "03:15 PM",
    duration: "9h 20m",
    price: "LKR 3,500",
    amenities: ["Panoramic View", "Reserved Seat", "Cafeteria"],
    dailyTrips: 4,
    routeParam: { from: "Colombo Fort Railway Station", to: "Ella Railway Station" },
  },
  {
    id: 4,
    type: "train",
    category: "Intercity Express",
    badge: "Udarata Menike",
    operator: "Sri Lanka Railways",
    from: "Colombo Fort",
    to: "Kandy",
    departureTime: "07:00 AM",
    arrivalTime: "09:35 AM",
    duration: "2h 35m",
    price: "LKR 2,200",
    amenities: ["1st & 2nd Class", "A/C Saloon", "Scenic"],
    dailyTrips: 8,
    routeParam: { from: "Colombo Fort Railway Station", to: "Kandy Railway Station" },
  },
  {
    id: 5,
    type: "bus",
    category: "Overnight Sleeper",
    badge: "Semi-Sleeper AC",
    operator: "Northern Super Line",
    from: "Colombo (Bastian Mw)",
    to: "Jaffna",
    departureTime: "09:30 PM",
    arrivalTime: "05:30 AM",
    duration: "8h 00m",
    price: "LKR 2,800",
    amenities: ["A/C", "Blanket", "USB Charging", "Water Bottle"],
    dailyTrips: 12,
    routeParam: { from: "Colombo Central Bus Stand", to: "Jaffna Bus Station" },
  },
  {
    id: 6,
    type: "flight",
    category: "Domestic Air",
    badge: "Scenic Express",
    operator: "Cinnamon Air",
    from: "Colombo (Waters Edge)",
    to: "Castlereagh (Hatton)",
    departureTime: "10:00 AM",
    arrivalTime: "10:30 AM",
    duration: "30m",
    price: "USD 180",
    amenities: ["Seaplane", "Luggage 20kg", "VIP Lounge"],
    dailyTrips: 2,
    routeParam: { from: "Bandaranaike International Airport", to: "Anuradhapura Airport" },
  },
];

const TicketBooking = () => {
  const { url } = usePage();

  // Extract initial type from query param (?type=bus | train | flight)
  const initialType = useMemo(() => {
    if (typeof url === "string" && url.includes("?")) {
      const params = new URLSearchParams(url.split("?")[1]);
      const type = params.get("type");
      if (type === "bus" || type === "train" || type === "flight") {
        return type;
      }
    }
    return "bus";
  }, [url]);

  const [activeType, setActiveType] = useState(initialType);
  const [filterMode, setFilterMode] = useState("all");

  const filteredRoutes = useMemo(() => {
    if (filterMode === "all") return POPULAR_ROUTES;
    return POPULAR_ROUTES.filter((r) => r.type === filterMode);
  }, [filterMode]);

  const handleRouteBook = (route) => {
    const today = new Date().toISOString().split("T")[0];
    if (route.type === "bus") {
      router.get("/busTicketBookingDetails", {
        from: route.routeParam.from,
        to: route.routeParam.to,
        date: today,
        tripType: "oneway",
        passengers: 1,
      });
    } else if (route.type === "train") {
      router.get("/trainTicketBookingDetails", {
        from: route.routeParam.from,
        to: route.routeParam.to,
        departureDate: today,
        tripType: "oneway",
      });
    } else {
      setActiveType("flight");
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  const handleCategorySelect = (catId) => {
    if (catId === "bus" || catId === "sleeper") {
      setActiveType("bus");
      setFilterMode("bus");
    } else if (catId === "train") {
      setActiveType("train");
      setFilterMode("train");
    } else if (catId === "flight") {
      setActiveType("flight");
      setFilterMode("flight");
    }
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  return (
    <div className="ticket-booking-page bg-[#F6F7F9] min-h-screen">
      <Head title="Ticket Booking - Bus, Train & Flight Tickets | Transport Jaan" />
      <Header />

      {/* Full-bleed hero with 75% visible image */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[65%_45%] opacity-75 transition-all duration-700"
          />
          {/* Gentle protective gradient ensuring text readability while keeping image ~75% visible */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.30) 30%, rgba(255,255,255,0.05) 55%, transparent 75%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, #F6F7F9 0%, rgba(246,247,249,0.20) 10%, transparent 25%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 sm:pt-8 md:pt-10 pb-14 sm:pb-16 md:pb-20">
          <p className="poppins text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] uppercase mb-2">
            Ticket Booking · Bus, Train & Flight
          </p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34] mb-4">
            BOOK YOUR <span className="text-[#0955AC]">JOURNEY TICKETS</span>
          </h1>

          <div className="flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-2.5 mb-6 max-w-[620px]">
            {HERO_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EAF1FE] flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-[#0955AC]" />
                </div>
                <span className="poppins text-[12.5px] font-[600] text-[#0B1B34]">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center mt-3 sm:mt-4">
            <ModuleTabs active="ticket" />
            <div className="mt-2.5 sm:mt-3">
              <TicketSubTabs active={activeType} onSelect={(type) => setActiveType(type)} />
            </div>
          </div>
        </div>
      </section>

      {/* Floating search form card, positioned smoothly over hero's bottom edge */}
      <div className="relative z-20 -mt-6 sm:-mt-8 md:-mt-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mb-10 sm:mb-12">
        <div className="w-full">
          {activeType === "bus" && <BusCard />}
          {activeType === "train" && <TrainCard />}
          {activeType === "flight" && <FlightCard />}
        </div>
      </div>

      {/* Popular Routes / Featured Offers Section */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 pb-12 sm:pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#0955AC]" />
              <span className="poppins text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] uppercase">
                Featured Departures
              </span>
            </div>
            <h2 className="bebas-neue text-[26px] sm:text-[32px] md:text-[38px] text-[#0B1B34] leading-tight">
              POPULAR TRAVEL <span className="text-[#0955AC]">ROUTES & DEALS</span>
            </h2>
          </div>

          {/* Mode switch pills */}
          <div className="inline-flex bg-white p-1 rounded-full border border-black/5 shadow-sm self-start sm:self-auto">
            {[
              { id: "all", label: "All Routes" },
              { id: "bus", label: "Bus Express" },
              { id: "train", label: "Scenic Train" },
              { id: "flight", label: "Domestic Flight" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-[600] poppins transition-all ${
                  filterMode === tab.id
                    ? "bg-[#0955AC] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0955AC]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-[20px] border border-[#E2E8F0] p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#0955AC]/30 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Badges & Price */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-[#EAF1FE] text-[#0955AC] text-[11px] font-[700] px-3 py-1 rounded-full">
                    {route.type === "bus" && <BusIcon className="w-3.5 h-3.5" />}
                    {route.type === "train" && <TrainIcon className="w-3.5 h-3.5" />}
                    {route.type === "flight" && <PlaneIcon className="w-3.5 h-3.5" />}
                    {route.badge}
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] font-[600] block uppercase">From</span>
                    <span className="text-[17px] sm:text-[19px] font-[800] text-[#0B1B34]">{route.price}</span>
                  </div>
                </div>

                {/* Operator info */}
                <p className="poppins text-[12px] font-[600] text-[#64748B] mb-2">{route.operator}</p>

                {/* Route: Origin -> Destination */}
                <div className="flex items-center justify-between gap-3 py-3 border-y border-[#F1F5F9] my-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-[700] block">Origin</span>
                    <h3 className="figtree text-[15px] font-[700] text-[#0B1B34] truncate">{route.from}</h3>
                    <span className="text-[11px] text-[#64748B] font-[600]">{route.departureTime}</span>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0 px-2">
                    <span className="text-[10px] font-[600] text-[#94A3B8]">{route.duration}</span>
                    <div className="w-16 sm:w-20 h-[1.5px] bg-[#CBD5E1] my-1 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#0955AC]" />
                    </div>
                    <span className="text-[9.5px] font-[600] text-emerald-600">Direct</span>
                  </div>

                  <div className="min-w-0 text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-[700] block">Destination</span>
                    <h3 className="figtree text-[15px] font-[700] text-[#0B1B34] truncate">{route.to}</h3>
                    <span className="text-[11px] text-[#64748B] font-[600]">{route.arrivalTime}</span>
                  </div>
                </div>

                {/* Amenities pills */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {route.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1 text-[10.5px] font-[600] text-[#475569] bg-[#F8FAFC] border border-black/5 px-2 py-0.5 rounded-md"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={() => handleRouteBook(route)}
                className="w-full h-[44px] bg-[#0955AC] hover:bg-[#073E82] text-white text-[13px] font-[700] rounded-[12px] transition-colors flex items-center justify-center gap-2 shadow-sm group-hover:shadow"
              >
                <span>Book This Journey</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Ticket Categories (matching vehicleList bottom sections) */}
      <Categories
        basePath="/ticketBooking"
        categories={TICKET_CATEGORIES}
        badge="Travel Modes"
        title="EXPLORE BY"
        highlight="TICKET CATEGORY"
        onCategoryClick={handleCategorySelect}
      />

      {/* Why Choose Us */}
      <WhyChooseUs
        points={TICKET_WHY_POINTS}
        badge="Why Book With Us"
        title="SEAMLESS TICKETING FOR EVERY"
        highlight="TRAVELER"
      />

      {/* How It Works */}
      <HowItWorks
        badge="Quick Booking Guide"
        title="BOOKING YOUR TICKET IS"
        highlight="EFFORTLESS"
      />

      {/* Testimonials */}
      <Testimonials />

      {/* Contact Strip */}
      <ContactStrip />

      {/* Platform Footer */}
      <Footer />
    </div>
  );
};

export default TicketBooking;
