import React, { useMemo, useState } from "react";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { CreditCard, User, Lock, AlertTriangle, ShieldCheck } from "lucide-react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import CardHeader from "../../components/ticketBooking/shared/CardHeader";
import { TextField, SubmitButton } from "../../components/ticketBooking/shared/FormElements";
import FlightResultCard from "../../components/ticketBooking/flightResults/FlightResultCard";
import { findFlight } from "../../components/ticketBooking/flightResults/generateDummyFlights";

const TAXES_AND_FEES = 25;

const formatCardNumber = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const formatExpiry = (v) => {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const FlightPayment = () => {
  const { url } = usePage();

  const search = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      flightId: sp.get("flight_id") || "",
      from: sp.get("departure_airport") || "",
      to: sp.get("arriving_airport") || "",
      date: sp.get("departure_date") || "",
      returnDate: sp.get("return_date") || "",
      tripType: sp.get("trip_type") || "oneway",
      travellers: sp.get("travellers_summary") || "",
      name: sp.get("name") || "",
      email: sp.get("email") || "",
      phone: sp.get("phone") || "",
    };
  }, [url]);

  const flight = useMemo(
    () => findFlight({ from: search.from, to: search.to, date: search.date }, search.flightId),
    [search.from, search.to, search.date, search.flightId]
  );

  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);

  const handleChange = (field, value) => {
    setCard((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePay = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (card.number.replace(/\s/g, "").length < 16) newErrors.number = "Enter a valid 16-digit card number";
    if (!card.name.trim()) newErrors.name = "Name on card is required";
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) newErrors.expiry = "Use MM/YY format";
    if (!/^\d{3,4}$/.test(card.cvv)) newErrors.cvv = "Enter a valid CVV";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Demo flow only — no real payment gateway is called.
    setProcessing(true);
    setTimeout(() => {
      router.get("/flightConfirmation", {
        flight_id: search.flightId,
        departure_airport: search.from,
        arriving_airport: search.to,
        departure_date: search.date,
        return_date: search.returnDate,
        travellers_summary: search.travellers,
        name: search.name,
        email: search.email,
      });
    }, 1400);
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen">
      <Head title="Payment | Transport Jaan" />
      <Header />

      <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
        <ModuleTabs active="ticket" />
        <div className="mt-4 sm:mt-6">
          <TicketSubTabs active="flight" />
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {!flight ? (
          <div className="bg-white rounded-[20px] border border-black/5 shadow-sm p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="text-[15px] font-[700] text-[#0F172A] mb-1">We couldn't find that flight</p>
            <p className="text-[13px] text-[#64748B] mb-5">It may have expired — please search again.</p>
            <Link href="/ticketBooking?type=flight" className="text-[#0955AC] font-[700] text-[13px] hover:underline">
              Back to Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
              <CardHeader icon={CreditCard} title="Payment Details" subtitle="This is a demo — no real card is charged." />

              <form onSubmit={handlePay} className="p-6 sm:p-8">
                <div className="mb-4">
                  <TextField
                    label="CARD NUMBER"
                    id="cardNumber"
                    value={card.number}
                    onChange={(v) => handleChange("number", formatCardNumber(v))}
                    placeholder="1234 5678 9012 3456"
                    error={errors.number}
                    icon={CreditCard}
                  />
                </div>
                <div className="mb-4">
                  <TextField
                    label="NAME ON CARD"
                    id="cardName"
                    value={card.name}
                    onChange={(v) => handleChange("name", v)}
                    placeholder="As shown on card"
                    error={errors.name}
                    icon={User}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <TextField
                    label="EXPIRY (MM/YY)"
                    id="expiry"
                    value={card.expiry}
                    onChange={(v) => handleChange("expiry", formatExpiry(v))}
                    placeholder="MM/YY"
                    error={errors.expiry}
                    icon={CreditCard}
                  />
                  <TextField
                    label="CVV"
                    id="cvv"
                    type="password"
                    value={card.cvv}
                    onChange={(v) => handleChange("cvv", v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="•••"
                    error={errors.cvv}
                    icon={Lock}
                  />
                </div>

                <SubmitButton icon={ShieldCheck} iconPosition="left" disabled={processing}>
                  {processing ? "Processing…" : `Pay $${flight.price + TAXES_AND_FEES} & Confirm`}
                </SubmitButton>
                <p className="text-center text-[11.5px] text-[#94A3B8] mt-3 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" /> Demo checkout — no real transaction occurs.
                </p>
              </form>
            </div>

            {/* Order summary */}
            <div className="space-y-4">
              <FlightResultCard flight={flight} compact />
              <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5">
                <h3 className="text-[12px] font-[700] text-[#64748B] tracking-widest mb-3">ORDER SUMMARY</h3>
                <div className="flex items-center justify-between text-[13px] text-[#334155] mb-2">
                  <span>Base fare</span>
                  <span className="font-[600]">${flight.price}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] text-[#334155] mb-3">
                  <span>Taxes &amp; fees</span>
                  <span className="font-[600]">${TAXES_AND_FEES}</span>
                </div>
                <div className="flex items-center justify-between text-[16px] font-[800] text-[#0B1B34] pt-3 border-t border-black/[0.06]">
                  <span>Total</span>
                  <span className="text-[#0955AC]">${flight.price + TAXES_AND_FEES}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FlightPayment;
