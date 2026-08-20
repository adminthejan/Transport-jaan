import React from "react";
import Header from "../client/ClientHeader";
import HeroDetails from "../../components/ticketBooking/HeroDetails";
import Footer from "../../layouts/Footer";

const TicketBookingDetails = ({
  outboundSchedules,
  returnSchedules,
  route,
  nearbyDates,
  searchParams,
  fromStationName,
  toStationName,
  hasActiveFilters,
  isShowingAllTrains,
}) => {
  return (
    <div className="bg-[#F6F7F9] min-h-screen">
      <Header />
      <HeroDetails
        outboundSchedules={outboundSchedules}
        returnSchedules={returnSchedules}
        route={route}
        nearbyDates={nearbyDates}
        searchParams={searchParams}
        fromStationName={fromStationName}
        toStationName={toStationName}
        hasActiveFilters={hasActiveFilters}
        isShowingAllTrains={isShowingAllTrains}
      />
      <Footer />
    </div>
  );
};

export default TicketBookingDetails;