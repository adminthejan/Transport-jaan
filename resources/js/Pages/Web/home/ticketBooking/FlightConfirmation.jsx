import React, { useMemo, useState } from "react";
import { Head, usePage, Link } from "@inertiajs/react";
import { CheckCircle2, Mail, User, Home, Search } from "lucide-react";
import Header from "../client/ClientHeader";
import Footer from "../../layouts/Footer";
import FlightResultCard from "../../components/ticketBooking/flightResults/FlightResultCard";
import { findFlight } from "../../components/ticketBooking/flightResults/generateDummyFlights";

const generateReference = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return `FLT-${ref}`;
};

const FlightConfirmation = () => {
  const { url } = usePage();
  const [reference] = useState(generateReference);

  const search = useMemo(() => {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      flightId: sp.get("flight_id") || "",
      from: sp.get("departure_airport") || "",
      to: sp.get("arriving_airport") || "",
      date: sp.get("departure_date") || "",
      travellers: sp.get("travellers_summary") || "",
      name: sp.get("name") || "",
      email: sp.get("email") || "",
    };
  }, [url]);

  const flight = useMemo(
    () => findFlight({ from: search.from, to: search.to, date: search.date }, search.flightId),
    [search.from, search.to, search.date, search.flightId]
  );

  return (
    <div className="bg-[#F6F7F9] min-h-screen">
      <Head title="Booking Confirmed | Transport Jaan" />
      <Header />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="bebas-neue text-[30px] sm:text-[38px] text-[#0B1B34] mb-2">BOOKING CONFIRMED</h1>
        <p className="text-[14px] text-[#64748B] mb-1">
          Your booking reference is
        </p>
        <p className="text-[22px] font-[800] text-[#0955AC] tracking-wider mb-8">{reference}</p>

        {flight && (
          <div className="text-left mb-6">
            <FlightResultCard flight={flight} compact />
          </div>
        )}

        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5 sm:p-6 text-left mb-8">
          <h3 className="text-[12px] font-[700] text-[#64748B] tracking-widest mb-3">SENT TO</h3>
          {search.name && (
            <div className="flex items-center gap-2.5 mb-2">
              <User className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
              <span className="text-[13.5px] font-[600] text-[#0F172A]">{search.name}</span>
            </div>
          )}
          {search.email && (
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#0955AC] flex-shrink-0" />
              <span className="text-[13.5px] font-[600] text-[#0F172A]">{search.email}</span>
            </div>
          )}
          {search.travellers && <p className="text-[12px] text-[#94A3B8] mt-3">{search.travellers}</p>}
          <p className="text-[11.5px] text-[#94A3B8] mt-4 pt-3 border-t border-black/[0.06]">
            This is a demo confirmation for illustrative purposes — no real ticket was issued and no payment was taken.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/ticketBooking?type=flight"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0955AC] hover:bg-[#073E82] text-white text-[13.5px] font-[700] py-3 px-6 rounded-[12px] transition-colors"
          >
            <Search className="w-4 h-4" />
            Search More Flights
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-black/10 hover:border-[#0955AC]/40 text-[#0B1B34] text-[13.5px] font-[700] py-3 px-6 rounded-[12px] transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FlightConfirmation;
