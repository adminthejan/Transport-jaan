import React from "react";
import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
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
      <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
        <ModuleTabs active="ticket" />
        <div className="mt-4 sm:mt-6">
          <TicketSubTabs active="train" />
        </div>
      </div>
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