import React, { useState } from "react";
import { router } from "@inertiajs/react";
import {
  Sparkles,
  Plane,
  ShieldCheck,
  BellRing,
  Globe2,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  TrendingDown,
  Compass,
  Luggage,
  Calendar,
} from "lucide-react";

// Featured destinations with high-appeal imagery and realistic prices from Colombo
const POPULAR_DESTINATIONS = [
  {
    id: "mle",
    city: "Male, Maldives",
    airport: "MLE",
    country: "Maldives",
    category: "direct",
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80",
    airline: "SriLankan Airlines",
    duration: "1h 25m",
    direct: true,
    priceLkr: "LKR 68,500",
    priceUsd: "$210",
    badge: "Cheapest Deal",
  },
  {
    id: "dxb",
    city: "Dubai",
    airport: "DXB",
    country: "United Arab Emirates",
    category: "international",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80",
    airline: "Emirates & Flydubai",
    duration: "4h 30m",
    direct: true,
    priceLkr: "LKR 125,000",
    priceUsd: "$380",
    badge: "Popular Deal",
  },
  {
    id: "sin",
    city: "Singapore",
    airport: "SIN",
    country: "Singapore",
    category: "direct",
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80",
    airline: "Singapore Airlines",
    duration: "4h 05m",
    direct: true,
    priceLkr: "LKR 115,000",
    priceUsd: "$350",
    badge: "Fastest Direct",
  },
  {
    id: "bkk",
    city: "Bangkok",
    airport: "BKK",
    country: "Thailand",
    category: "weekend",
    image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80",
    airline: "Thai Airways",
    duration: "3h 35m",
    direct: true,
    priceLkr: "LKR 88,000",
    priceUsd: "$270",
    badge: "Weekend Break",
  },
  {
    id: "kul",
    city: "Kuala Lumpur",
    airport: "KUL",
    country: "Malaysia",
    category: "weekend",
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80",
    airline: "Malaysia Airlines",
    duration: "3h 50m",
    direct: true,
    priceLkr: "LKR 92,000",
    priceUsd: "$280",
    badge: "Great Value",
  },
  {
    id: "lhr",
    city: "London Heathrow",
    airport: "LHR",
    country: "United Kingdom",
    category: "international",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
    airline: "SriLankan Airlines",
    duration: "10h 45m",
    direct: true,
    priceLkr: "LKR 245,000",
    priceUsd: "$750",
    badge: "Long Haul Direct",
  },
  {
    id: "hatton",
    city: "Castlereagh (Hatton)",
    airport: "CJS",
    country: "Sri Lanka",
    category: "domestic",
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
    airline: "Cinnamon Air",
    duration: "30m",
    direct: true,
    priceLkr: "LKR 58,000",
    priceUsd: "$180",
    badge: "Scenic Seaplane",
  },
  {
    id: "jaf",
    city: "Jaffna",
    airport: "JAF",
    country: "Sri Lanka",
    category: "domestic",
    image: "https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=800&q=80",
    airline: "FitsAir",
    duration: "55m",
    direct: true,
    priceLkr: "LKR 24,000",
    priceUsd: "$75",
    badge: "Domestic Express",
  },
];

const FEATURES = [
  {
    icon: Compass,
    title: "Explore 'Everywhere'",
    description: "Can't decide where to go? Search 'Everywhere' to reveal the lowest fares worldwide from your home airport.",
  },
  {
    icon: ShieldCheck,
    title: "No Hidden Fees",
    description: "All prices shown include mandatory airline taxes and airport surcharges. The price you see is what you pay.",
  },
  {
    icon: BellRing,
    title: "Smart Price Alerts",
    description: "Found a flight you like? Set instant price tracking alerts to book when airfares reach historic lows.",
  },
  {
    icon: Plane,
    title: "1,200+ Verified Partners",
    description: "Compare SriLankan Airlines, Emirates, Singapore Airlines, Qatar Airways, and boutique charters side-by-side.",
  },
];

const FAQS = [
  {
    question: "How do I find the cheapest flights on Transport Jaan?",
    answer:
      "Use our flexible date search, filter for direct flights or nearby airports, and take advantage of the 'Explore Everywhere' feature to find the lowest airfares across hundreds of airlines and travel agents.",
  },
  {
    question: "Can I book flexible flight tickets with free date changes?",
    answer:
      "Yes. In your flight search results, simply toggle the 'Flexible Ticket' filter to view flights that offer zero change fees or free date modifications within the airline's policy.",
  },
  {
    question: "How do Flight Price Alerts work?",
    answer:
      "When viewing search results, click 'Get Price Alerts' or 'Track prices'. Whenever fares on your selected route go down or up, you will be notified immediately so you can grab the lowest price.",
  },
  {
    question: "Are baggage allowances and meals included in the shown prices?",
    answer:
      "Most international scheduled flights (such as SriLankan Airlines, Emirates, Singapore Airlines) include checked baggage (25-30kg) and in-flight meals. Each flight card displays transparent baggage details before checkout.",
  },
  {
    question: "Can I book domestic flights and seaplanes in Sri Lanka?",
    answer:
      "Yes! We offer domestic scheduled flights and scenic seaplanes operated by partners like Cinnamon Air and FitsAir connecting Colombo to Jaffna, Trincomalee, Castlereagh, and Koggala.",
  },
];

const SkyscannerFlightContent = () => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [openFaq, setOpenFaq] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");

  const filteredDestinations = POPULAR_DESTINATIONS.filter((d) => {
    if (activeCategory === "all") return true;
    return d.category === activeCategory;
  });

  const handleBookFlight = (dest) => {
    const today = new Date().toISOString().split("T")[0];
    const params = new URLSearchParams({
      trip_type: "oneway",
      departure_airport: "Colombo (CMB)",
      arriving_airport: `${dest.city} (${dest.airport})`,
      departure_date: today,
      travellers_summary: "1 Adult, Economy",
      direct_only: dest.direct ? "1" : "0",
    });
    router.visit(`/flightResults?${params.toString()}`);
  };

  const handleAiSearch = (promptText) => {
    const query = promptText || aiPrompt;
    if (!query) return;
    // Map common AI prompts to destinations
    let target = "Dubai (DXB)";
    if (query.toLowerCase().includes("beach") || query.toLowerCase().includes("maldives")) {
      target = "Male (MLE)";
    } else if (query.toLowerCase().includes("singapore")) {
      target = "Singapore (SIN)";
    } else if (query.toLowerCase().includes("bangkok") || query.toLowerCase().includes("weekend")) {
      target = "Bangkok (BKK)";
    } else if (query.toLowerCase().includes("seaplane") || query.toLowerCase().includes("domestic")) {
      target = "Castlereagh (Hatton)";
    }

    const today = new Date().toISOString().split("T")[0];
    const params = new URLSearchParams({
      trip_type: "oneway",
      departure_airport: "Colombo (CMB)",
      arriving_airport: target,
      departure_date: today,
      travellers_summary: "1 Adult, Economy",
      direct_only: "1",
    });
    router.visit(`/flightResults?${params.toString()}`);
  };

  return (
    <div className="bg-[#F6F7F9] w-full">
      {/* 1. AI Flight Inspiration & Smart Prompts Bar */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20 mb-12">
        <div className="bg-gradient-to-r from-[#0B1B34] via-[#0D2447] to-[#0955AC] rounded-[18px] p-5 sm:p-7 shadow-[0_12px_36px_rgba(11,27,52,0.18)] border border-white/15 text-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 bg-[#EAF1FE]/20 text-[#38BDF8] text-[11px] font-[800] px-3 py-1 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Travel Assistant</span>
              </div>
              <h3 className="text-[20px] sm:text-[24px] font-[800] tracking-tight text-white">
                Find your dream getaway in seconds
              </h3>
              <p className="text-[13px] text-white/75">
                Explore tailored flight deals powered by real-time airline pricing.
              </p>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {[
                { label: "🏖️ Maldives under LKR 70k", prompt: "Maldives beach" },
                { label: "🏙️ Singapore weekend trip", prompt: "Singapore" },
                { label: "✨ Luxury Dubai shopping", prompt: "Dubai" },
                { label: "🌴 Ceylon Scenic Seaplanes", prompt: "domestic seaplane" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleAiSearch(pill.prompt)}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-[600] text-[12.5px] px-3.5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <span>{pill.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Flight Routes & Deals from Colombo */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Plane className="w-4 h-4 text-[#0955AC]" />
              <span className="text-[11.5px] font-[800] tracking-[0.14em] text-[#0955AC] uppercase">
                Trending Departures from Colombo (CMB)
              </span>
            </div>
            <h2 className="text-[26px] sm:text-[32px] md:text-[36px] font-[800] text-[#0B1B34] tracking-tight">
              Explore Flexible <span className="text-[#0955AC]">Flight Deals</span>
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="inline-flex bg-white p-1 rounded-full border border-black/10 shadow-sm self-start sm:self-auto">
            {[
              { id: "all", label: "All Deals" },
              { id: "direct", label: "Direct Flights" },
              { id: "weekend", label: "Weekend Escapes" },
              { id: "international", label: "International" },
              { id: "domestic", label: "Domestic Air" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-1.5 rounded-full text-[12.5px] font-[700] transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? "bg-[#0955AC] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0955AC]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-[18px] border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#0955AC]/40 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              onClick={() => handleBookFlight(dest)}
            >
              {/* Image with Badge */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                <img
                  src={dest.image}
                  alt={dest.city}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Top Badge */}
                <span className="absolute top-3 left-3 bg-[#0B1B34]/80 backdrop-blur-md text-white text-[11px] font-[700] px-2.5 py-1 rounded-full border border-white/20">
                  {dest.badge}
                </span>

                {/* Airport code pill */}
                <span className="absolute top-3 right-3 bg-white/90 text-[#0955AC] font-[800] text-[11.5px] px-2.5 py-1 rounded-md shadow-sm">
                  {dest.airport}
                </span>

                {/* City & Country on image */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-[800] text-[18px] leading-snug drop-shadow-sm">{dest.city}</h3>
                  <p className="text-[12px] text-white/80">{dest.country}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[12px] text-[#64748B]">
                    <span>{dest.airline}</span>
                    <span className="font-[600] text-[#0B1B34]">{dest.duration}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11.5px] text-emerald-600 font-[600]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{dest.direct ? "Direct Flight" : "1 Connection"}</span>
                  </div>
                </div>

                {/* Price & Action Row */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] font-[700] uppercase block">Direct from</span>
                    <span className="text-[18px] font-[800] text-[#0955AC] leading-none block">{dest.priceLkr}</span>
                    <span className="text-[11px] text-[#94A3B8]">{dest.priceUsd} per adult</span>
                  </div>

                  <button
                    type="button"
                    className="bg-[#0955AC] hover:bg-[#073E82] text-white p-2.5 rounded-full transition-colors cursor-pointer group-hover:scale-105"
                    title="Find Flights"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Skyscanner Advantage / Why Book With Us */}
      <section className="bg-white py-14 sm:py-18 border-y border-[#E2E8F0]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-[720px] mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 bg-[#EAF1FE] text-[#0955AC] text-[11.5px] font-[800] px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>The Skyscanner Advantage</span>
            </div>
            <h2 className="text-[28px] sm:text-[34px] font-[800] text-[#0B1B34] tracking-tight">
              Book with Total Confidence
            </h2>
            <p className="text-[14px] text-[#64748B] mt-2">
              We compare over a thousand airlines and travel providers so you always get the best price, free changes, and complete peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((item) => (
              <div
                key={item.title}
                className="bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-[20px] hover:shadow-lg hover:border-[#0955AC]/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#EAF1FE] flex items-center justify-center text-[#0955AC] mb-4 group-hover:bg-[#0955AC] group-hover:text-white transition-colors">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-[800] text-[17px] text-[#0B1B34] mb-2">{item.title}</h3>
                <p className="text-[13px] text-[#64748B] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Partner Airlines Strip */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-6">
          <p className="text-[11.5px] font-[800] uppercase tracking-widest text-[#94A3B8]">
            Compare Deals Across Premier Global Carriers
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
          {[
            "SriLankan Airlines",
            "Emirates",
            "Qatar Airways",
            "Singapore Airlines",
            "Etihad Airways",
            "Flydubai",
            "Cinnamon Air",
            "FitsAir",
            "Malaysia Airlines",
          ].map((airline) => (
            <span
              key={airline}
              className="bg-white border border-[#E2E8F0] px-4 py-2 rounded-full text-[13px] font-[700] text-[#0B1B34] shadow-sm hover:border-[#0955AC] hover:text-[#0955AC] transition-colors cursor-default"
            >
              {airline}
            </span>
          ))}
        </div>
      </section>

      {/* 5. FAQs Accordion */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-[26px] sm:text-[32px] font-[800] text-[#0B1B34] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-[13.5px] text-[#64748B] mt-1">
            Everything you need to know about booking flights with Transport Jaan
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div
              key={faq.question}
              className="bg-white rounded-[14px] border border-[#E2E8F0] overflow-hidden transition-all shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-[700] text-[15px] text-[#0B1B34] hover:text-[#0955AC] transition-colors cursor-pointer"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                    openFaq === idx ? "rotate-180 text-[#0955AC]" : ""
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-[13.5px] text-[#64748B] leading-relaxed border-t border-gray-100">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SkyscannerFlightContent;
