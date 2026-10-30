import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
  ArrowRight,
  Bus as BusIcon,
  CalendarDays,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Moon,
  Search,
  Sun,
  Sunrise,
  Sunset,
  TrainFront as TrainIcon,
  Wifi,
  Zap,
  ArrowLeftRight,
} from "lucide-react";

import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import PassengerSelector from "../../components/ticketBooking/PassengerSelector";
import { AutoCompleteField, DateField } from "../../components/ticketBooking/shared/FormElements";
import Footer from "../../layouts/Footer";
import { useLocale } from "../../context/LocaleContext";

const SORTS = [
  { key: "cheapest", label: "Cheapest" },
  { key: "fastest", label: "Fastest" },
  { key: "earliest", label: "Earliest" },
  { key: "latest", label: "Latest" },
];

const TIME_BUCKETS = [
  { key: "night", label: "Nighttime", hint: "Before 6am", icon: Moon, test: (m) => m < 6 * 60 },
  { key: "early", label: "Early", hint: "6am - 11am", icon: Sunrise, test: (m) => m >= 6 * 60 && m < 11 * 60 },
  { key: "midday", label: "Midday", hint: "11am - 5pm", icon: Sun, test: (m) => m >= 11 * 60 && m < 17 * 60 },
  { key: "late", label: "Late", hint: "After 5pm", icon: Sunset, test: (m) => m >= 17 * 60 },
];

const MODE_META = {
  bus: { label: "Bus", icon: BusIcon, tint: "text-[#0955AC]", bg: "bg-[#EAF1FE]" },
  train: { label: "Train", icon: TrainIcon, tint: "text-emerald-600", bg: "bg-emerald-50" },
};

const durationLabel = (min) => {
  if (!Number.isFinite(min)) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}H${m ? ` ${String(m).padStart(2, "0")}M` : ""}` : `${m}M`;
};

const Section = ({ title, children }) => (
  <div className="border-t border-[#E7EAF0] pt-5 mt-5 first:border-0 first:pt-0 first:mt-0">
    <h3 className="poppins text-[13px] font-[700] text-[#0B1B34] mb-3">{title}</h3>
    {children}
  </div>
);

const Check = ({ checked, onChange, children, count }) => (
  <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer text-[13px] text-[#334155]">
    <span className="flex items-center gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-[#CBD5E1] text-[#0955AC] focus:ring-[#0955AC]/30"
      />
      {children}
    </span>
    {count !== undefined && <span className="text-[11px] text-[#94A3B8]">{count}</span>}
  </label>
);

const ResultCard = ({ r, formatPrice }) => {
  const meta = MODE_META[r.mode];
  const Icon = meta.icon;
  const body = (
    <div className={`bg-white rounded-[16px] border border-[#E7EAF0] p-4 sm:p-5 transition-shadow ${r.soldOut ? "opacity-60" : "hover:shadow-[0_10px_28px_rgba(9,85,172,0.12)]"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="sm:w-[150px] shrink-0">
          <p className="poppins text-[15px] font-[800] text-[#0B1B34] leading-tight">{r.operator}</p>
          {r.vehicle && <p className="text-[11px] text-[#64748B] mt-0.5">{r.vehicle}</p>}
        </div>

        <div className="flex-1 flex items-start gap-3 sm:gap-5 min-w-0">
          <div className="min-w-0">
            <p className="poppins text-[20px] sm:text-[22px] font-[700] text-[#0B1B34] leading-none">{r.depart}</p>
            <p className="text-[12px] text-[#475569] mt-1 truncate">{r.departureStation}</p>
          </div>
          <div className="flex flex-col items-center pt-1 shrink-0">
            <ArrowRight className="w-5 h-5 text-[#94A3B8]" />
            <span className="text-[11px] text-[#64748B] mt-1">{r.duration}</span>
          </div>
          <div className="min-w-0">
            <p className="poppins text-[20px] sm:text-[22px] font-[700] text-[#0B1B34] leading-none">{r.arrive}</p>
            <p className="text-[12px] text-[#475569] mt-1 truncate">{r.arrivalStation}</p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-[12px] text-[#64748B]">
            <span className={`inline-flex items-center gap-1.5 ${meta.tint}`}>
              <Icon className="w-4 h-4" /> {meta.label}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {r.duration}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 h-10 px-4 rounded-full font-[800] text-[15px] text-white ${
              r.soldOut ? "bg-[#94A3B8]" : "bg-[#0A7BEA]"
            }`}
          >
            {r.soldOut ? "Sold out" : formatPrice(r.price)}
            {!r.soldOut && <ChevronRight className="w-4 h-4" />}
          </span>
        </div>
      </div>
      {(r.facilities?.length > 0 || r.seatsAvailable <= 10) && !r.soldOut && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9] text-[11px] text-[#64748B]">
          {r.facilities?.slice(0, 4).map((f) => (
            <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9]">
              {/wi-?fi/i.test(f) && <Wifi className="w-3 h-3" />} {f}
            </span>
          ))}
          {r.seatsAvailable <= 10 && <span className="text-red-500 font-[600]">Only {r.seatsAvailable} seats left</span>}
        </div>
      )}
    </div>
  );

  return r.soldOut ? <div>{body}</div> : <Link href={r.bookUrl} className="block">{body}</Link>;
};

const LandTicketBooking = ({ cities = [], results = [], nearbyDates = [], searched = false, searchParams = {} }) => {
  const { props } = usePage();
  const { formatPrice } = useLocale();

  /* ---------- search form ---------- */
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(searchParams.from || "");
  const [to, setTo] = useState(searchParams.to || "");
  const [date, setDate] = useState(searchParams.date || "");
  const [passengers, setPassengers] = useState({
    adults: searchParams.adults ?? 1,
    youth: searchParams.youth ?? 0,
    seniors: searchParams.seniors ?? 0,
    student: !!searchParams.student,
    wheelchair: !!searchParams.wheelchair,
    wheelchairPassengers: String(searchParams.wheelchairPassengers || "").split(",").filter(Boolean),
  });
  const [errors, setErrors] = useState({});

  const goSearch = (overrides = {}) => {
    const next = { from, to, date, ...overrides };
    const e = {};
    if (!next.from) e.from = "Required";
    if (!next.to) e.to = "Required";
    if (!next.date) e.date = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;
    router.get("/landTicketBooking", {
      from: next.from,
      to: next.to,
      date: next.date,
      adults: passengers.adults,
      youth: passengers.youth,
      seniors: passengers.seniors,
      student: passengers.student ? 1 : undefined,
      wheelchair: passengers.wheelchair ? 1 : undefined,
      wheelchairPassengers: passengers.wheelchair ? passengers.wheelchairPassengers.join(",") : undefined,
    });
  };

  /* ---------- filters / sort ---------- */
  const [mode, setMode] = useState(searchParams.mode || "all");
  const [sort, setSort] = useState("earliest");
  const [directOnly, setDirectOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [timeBuckets, setTimeBuckets] = useState([]);
  const [operators, setOperators] = useState([]);

  const modeStats = useMemo(() => {
    const stat = (list) =>
      list.length
        ? { count: list.length, price: Math.min(...list.map((r) => r.price)), minutes: Math.min(...list.map((r) => r.durationMinutes)) }
        : null;
    return { bus: stat(results.filter((r) => r.mode === "bus")), train: stat(results.filter((r) => r.mode === "train")) };
  }, [results]);

  const operatorCounts = useMemo(() => {
    const m = new Map();
    results.forEach((r) => m.set(r.operator, (m.get(r.operator) || 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  const bucketOf = (r) => TIME_BUCKETS.find((b) => b.test(r.departMinutes))?.key;

  const visible = useMemo(() => {
    let list = results.filter((r) => {
      if (mode !== "all" && r.mode !== mode) return false;
      if (directOnly && !r.direct) return false;
      if (availableOnly && r.soldOut) return false;
      if (timeBuckets.length && !timeBuckets.includes(bucketOf(r))) return false;
      if (operators.length && !operators.includes(r.operator)) return false;
      return true;
    });
    const by = {
      cheapest: (a, b) => a.price - b.price,
      fastest: (a, b) => a.durationMinutes - b.durationMinutes,
      earliest: (a, b) => a.departMinutes - b.departMinutes,
      latest: (a, b) => b.departMinutes - a.departMinutes,
    }[sort];
    return [...list].sort(by);
  }, [results, mode, directOnly, availableOnly, timeBuckets, operators, sort]);

  const toggle = (setter) => (value, on) => setter((prev) => (on ? [...prev, value] : prev.filter((v) => v !== value)));
  const clearFilters = () => {
    setMode("all");
    setDirectOnly(false);
    setAvailableOnly(false);
    setTimeBuckets([]);
    setOperators([]);
  };
  const anyFilter = mode !== "all" || directOnly || availableOnly || timeBuckets.length || operators.length;

  const cheapestAll = results.length ? Math.min(...results.map((r) => r.price)) : null;
  const fastestAll = results.length ? Math.min(...results.map((r) => r.durationMinutes)) : null;

  return (
    <div className="land-ticket-page bg-[#F6F7F9] min-h-screen">
      <Head title="Land Tickets - Compare Bus & Train | Transport Jaan" />
      <Header />

      <section className="bg-gradient-to-b from-[#E6F1FD] to-[#F6F7F9]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-14">
          <div className="flex flex-col items-center mb-5">
            <ModuleTabs active="ticket" />
            <div className="mt-2.5 sm:mt-3">
              <TicketSubTabs active="land" />
            </div>
          </div>
          <p className="poppins text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] uppercase mb-1">Ticket Booking · Land</p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34]">
            COMPARE <span className="text-[#0955AC]">BUS &amp; TRAIN</span> IN ONE SEARCH
          </h1>
        </div>
      </section>

      {/* Search card */}
      <div className="relative z-50 -mt-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
          className="figtree bg-white p-4 sm:p-5 rounded-[20px] border border-black/5 shadow-[0_12px_32px_rgba(9,85,172,0.10)]"
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-2.5 sm:gap-3">
            <div className="flex-1 min-w-0">
              <AutoCompleteField
                label="ORIGIN"
                id="landFrom"
                value={from}
                onChange={setFrom}
                placeholder="Departure city"
                error={errors.from}
                icon={MapPin}
                variant="outline"
                options={cities}
              />
            </div>
            <div className="hidden lg:flex items-center justify-center pt-5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFrom(to);
                  setTo(from);
                }}
                title="Swap origin and destination"
                className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-[#EAF1FE] text-[#0955AC] flex items-center justify-center shadow-sm cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <AutoCompleteField
                label="DESTINATION"
                id="landTo"
                value={to}
                onChange={setTo}
                placeholder="Arrival city"
                error={errors.to}
                icon={MapPin}
                iconBg="bg-[#FDEDEA]"
                iconColor="text-[#EF3826]"
                variant="outline"
                options={cities}
              />
            </div>
            <div className="w-full lg:w-[180px] shrink-0">
              <DateField
                label="DATE"
                id="landDate"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={errors.date}
                icon={CalendarDays}
                variant="outline"
                min={today}
              />
            </div>
            <div className="w-full lg:w-[190px] shrink-0">
              <PassengerSelector value={passengers} onChange={setPassengers} />
            </div>
            <div className="w-full lg:w-auto shrink-0 flex flex-col justify-end pt-5 lg:pt-0">
              <div className="hidden lg:block h-[18px]" />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-[#0955AC] text-white font-[700] h-[46px] sm:h-[48px] px-6 rounded-[10px] hover:bg-[#074494] transition-colors shadow-[0_8px_18px_rgba(9,85,172,0.25)] cursor-pointer"
              >
                <Search className="w-5 h-5" /> Update
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Day strip with cheapest fare per day */}
      {searched && nearbyDates.length > 0 && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {nearbyDates.map((d) => (
              <button
                key={d.date}
                type="button"
                disabled={d.price == null}
                onClick={() => {
                  setDate(d.date);
                  goSearch({ date: d.date });
                }}
                className={`flex-1 min-w-[84px] rounded-[12px] px-3 py-2.5 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  d.selected ? "bg-white shadow-[0_6px_18px_rgba(9,85,172,0.12)] border border-[#0955AC]/30" : "bg-white/60 hover:bg-white border border-transparent"
                }`}
              >
                <span className="block text-[13px] text-[#334155]">
                  {d.dayNumber} <span className="font-[600]">{d.dayName}</span>
                </span>
                <span className={`block text-[12px] font-[700] ${d.price == null ? "text-[#94A3B8]" : d.price === cheapestAll ? "text-emerald-600" : "text-[#0955AC]"}`}>
                  {d.price == null ? "—" : formatPrice(d.price)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!searched ? (
          <div className="bg-white rounded-[16px] border border-[#E7EAF0] p-10 text-center">
            <Layers className="w-10 h-10 text-[#0955AC] mx-auto mb-3" />
            <p className="poppins text-[16px] font-[700] text-[#0B1B34]">Where are you heading?</p>
            <p className="text-[13px] text-[#64748B] mt-1">
              Enter an origin, destination and date to compare bus and train options side by side.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] font-[700] tracking-widest text-[#64748B]">SELECT YOUR TRIP</p>
                <p className="poppins text-[18px] font-[800] text-[#0B1B34]">
                  {visible.length} result{visible.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-[700] tracking-widest text-[#64748B] mr-2">SORT BY</span>
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-[600] transition-colors cursor-pointer ${
                      sort === s.key ? "bg-[#DCEBFB] text-[#0955AC]" : "text-[#334155] hover:bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
              {/* Filters */}
              <aside className="bg-white rounded-[16px] border border-[#E7EAF0] p-5">
                <Section title="Modes of transportation">
                  <div className="grid grid-cols-3 gap-2 rounded-[14px] bg-[#EAF3FD] p-1.5">
                    {[
                      { key: "all", label: "All modes", icon: Layers, stat: null },
                      { key: "bus", label: "Bus", icon: BusIcon, stat: modeStats.bus },
                      { key: "train", label: "Train", icon: TrainIcon, stat: modeStats.train },
                    ].map((m) => {
                      const Icon = m.icon;
                      const disabled = m.key !== "all" && !m.stat;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => setMode(m.key)}
                          className={`rounded-[10px] px-1 py-2.5 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                            mode === m.key ? "bg-white shadow-sm" : "hover:bg-white/60"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1 ${m.key === "train" ? "text-emerald-600" : "text-[#0955AC]"}`} />
                          {m.stat ? (
                            <>
                              <span className="block text-[12px] font-[700] text-[#0B1B34]">{formatPrice(m.stat.price)}</span>
                              <span className="block text-[10px] text-[#64748B]">{durationLabel(m.stat.minutes)}</span>
                            </>
                          ) : (
                            <span className="block text-[11px] font-[600] text-[#0B1B34]">{m.key === "all" ? m.label : "None"}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {cheapestAll != null && modeStats.bus && modeStats.train && (
                    <p className="text-[11px] text-[#64748B] mt-2.5 leading-relaxed">
                      {modeStats.bus.price === modeStats.train.price
                        ? "Bus and train are priced the same."
                        : `${modeStats.bus.price < modeStats.train.price ? "Bus" : "Train"} is cheaper`}
                      {modeStats.bus.minutes !== modeStats.train.minutes &&
                        ` · ${modeStats.bus.minutes < modeStats.train.minutes ? "Bus" : "Train"} is faster`}
                      .
                    </p>
                  )}
                </Section>

                <Section title="Quick filters">
                  <Check checked={directOnly} onChange={setDirectOnly} count={results.filter((r) => r.direct).length}>
                    <Zap className="w-4 h-4 text-amber-500" /> Direct only
                  </Check>
                  <Check checked={availableOnly} onChange={setAvailableOnly} count={results.filter((r) => !r.soldOut).length}>
                    Seats available
                  </Check>
                </Section>

                <Section title="Departure time">
                  {TIME_BUCKETS.map((b) => {
                    const Icon = b.icon;
                    return (
                      <label key={b.key} className="flex items-center justify-between gap-2 py-1.5 cursor-pointer text-[13px] text-[#334155]">
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={timeBuckets.includes(b.key)}
                            onChange={(e) => toggle(setTimeBuckets)(b.key, e.target.checked)}
                            className="w-4 h-4 rounded border-[#CBD5E1] text-[#0955AC] focus:ring-[#0955AC]/30"
                          />
                          <Icon className="w-4 h-4 text-[#0955AC]" />
                          {b.label} ({results.filter((r) => b.test(r.departMinutes)).length})
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">{b.hint}</span>
                      </label>
                    );
                  })}
                </Section>

                {operatorCounts.length > 0 && (
                  <Section title="Operators">
                    {operatorCounts.map(([name, count]) => (
                      <Check key={name} checked={operators.includes(name)} onChange={(on) => toggle(setOperators)(name, on)} count={count}>
                        {name}
                      </Check>
                    ))}
                  </Section>
                )}

                {anyFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 w-full h-10 rounded-[10px] border border-[#0955AC] text-[#0955AC] text-[13px] font-[700] hover:bg-[#0955AC]/5 cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </aside>

              {/* List */}
              <div className="space-y-4 min-w-0">
                {visible.length === 0 ? (
                  <div className="bg-white rounded-[16px] border border-[#E7EAF0] p-10 text-center">
                    <p className="poppins text-[16px] font-[700] text-[#0B1B34]">
                      {results.length === 0 ? "No buses or trains found for this route and date." : "No trips match your filters."}
                    </p>
                    <p className="text-[13px] text-[#64748B] mt-1">
                      {results.length === 0 ? "Try another date from the strip above." : "Clear a filter to see more options."}
                    </p>
                  </div>
                ) : (
                  visible.map((r) => {
                    const tags = [];
                    if (r.price === cheapestAll) tags.push("Cheapest");
                    if (r.durationMinutes === fastestAll) tags.push("Fastest");
                    return (
                      <div key={r.key} className="relative">
                        {tags.length > 0 && (
                          <div className="flex gap-1.5 mb-1.5 ml-1">
                            {tags.map((t) => (
                              <span key={t} className="text-[10px] font-[800] tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <ResultCard r={r} formatPrice={formatPrice} />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default LandTicketBooking;
