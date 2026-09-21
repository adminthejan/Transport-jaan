import React from "react";
import { Head, router } from "@inertiajs/react";

import Header from "../client/ClientHeader";
import SkyscannerFlightHero from "../../components/ticketBooking/SkyscannerFlightHero";
import SkyscannerFlightContent from "../../components/ticketBooking/SkyscannerFlightContent";
import SkyscannerFooter from "../../components/ticketBooking/shared/SkyscannerFooter";

// /ticketBooking is reserved for Flight only — Bus and Train each have their
// own dedicated page (/busTicketBookingDetails, /trainTicketBookingDetails),
// and the server redirects any stray ?type=bus/train link there before this
// component ever renders.
const TicketBooking = () => {
  const handleTicketTypeSelect = (type) => {
    if (type === "bus") {
      router.get("/busTicketBookingDetails");
    } else if (type === "train") {
      router.get("/trainTicketBookingDetails");
    }
  };

  return (
    <div className="ticket-booking-page min-h-screen bg-[#F6F7F9] flex flex-col justify-between">
      <Head title="Flights - Millions of cheap flights. One simple search. | Transport Jaan" />
      <Header />
      <SkyscannerFlightHero onSelectTab={handleTicketTypeSelect} />
      <SkyscannerFlightContent />
      <SkyscannerFooter />
    </div>
  );
};

export default TicketBooking;
