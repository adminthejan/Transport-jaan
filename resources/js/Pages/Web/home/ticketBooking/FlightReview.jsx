import React, { useMemo, useState } from "react";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { User, Mail, Phone, ArrowRight, ClipboardList, AlertTriangle } from "lucide-react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import CardHeader from "../../components/ticketBooking/shared/CardHeader";
import { TextField, SubmitButton } from "../../components/ticketBooking/shared/FormElements";
import FlightResultCard from "../../components/ticketBooking/flightResults/FlightResultCard";
import { findFlight } from "../../components/ticketBooking/flightResults/generateDummyFlights";

const TAXES_AND_FEES = 25;

const FlightReview = () => {
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
      travellers: sp.get("travellers_summary") || "1 adult · Economy class",
    };
  }, [url]);

  const flight = useMemo(
    () => findFlight({ from: search.from, to: search.to, date: search.date }, search.flightId),
    [search.from, search.to, search.date, search.flightId]
  );

  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setContact((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleContinue = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!contact.name.trim()) newErrors.name = "Name is required";
    if (!contact.email.trim()) newErrors.email = "Email is required";
    if (!contact.phone.trim()) newErrors.phone = "Phone number is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    router.get("/flightPayment", {
      flight_id: search.flightId,
      departure_airport: search.from,
      arriving_airport: search.to,
      departure_date: search.date,
      return_date: search.returnDate,
      trip_type: search.tripType,
      travellers_summary: search.travellers,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
    });
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen">
      <Head title="Review Your Flight | Transport Jaan" />
      <Header />

      <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
        <ModuleTabs active="ticket" />
        <div className="mt-4 sm:mt-6">
          <TicketSubTabs active="flight" />
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
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
          <>
            <h1 className="bebas-neue text-[26px] sm:text-[32px] text-[#0B1B34] mb-5">
              REVIEW YOUR <span className="text-[#0955AC]">FLIGHT</span>
            </h1>

            <div className="mb-6">
              <FlightResultCard flight={flight} compact />
            </div>

            <div className="bg-white rounded-[22px] shadow-[0_20px_60px_rgba(9,85,172,0.14)] border border-black/5">
              <CardHeader icon={ClipboardList} title="Passenger Details" subtitle="Who should we send the itinerary and confirmation to?" />

              <form onSubmit={handleContinue} className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <TextField
                        label="FULL NAME"
                        id="name"
                        value={contact.name}
                        onChange={(v) => handleChange("name", v)}
                        placeholder="Enter your full name"
                        error={errors.name}
                        icon={User}
                    />
                    <TextField
                        label="EMAIL ADDRESS"
                        id="email"
                        type="email"
                        value={contact.email}
                        onChange={(v) => handleChange("email", v)}
                        placeholder="you@example.com"
                        error={errors.email}
                        icon={Mail}
                    />
                </div>
                <div className="mb-6 md:w-1/2">
                    <TextField
                        label="PHONE NUMBER"
                        id="phone"
                        type="tel"
                        value={contact.phone}
                        onChange={(v) => handleChange("phone", v)}
                        placeholder="+94 7X XXX XXXX"
                        error={errors.phone}
                        icon={Phone}
                    />
                </div>

                {/* Fare breakdown */}
                <div className="bg-[#F8FAFC] rounded-[14px] p-5 mb-6">
                  <h3 className="text-[12px] font-[700] text-[#64748B] tracking-widest mb-3">FARE SUMMARY</h3>
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

                <SubmitButton icon={ArrowRight}>Continue to Payment</SubmitButton>
                <p className="text-center text-[11.5px] text-[#94A3B8] mt-3">
                  This is a demo flow with illustrative flights and pricing — no payment is actually processed.
                </p>
              </form>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FlightReview;
