import React from "react";
import { Head } from "@inertiajs/react";
import {
  ShieldCheck,
  Ticket,
  Wallet,
  Clock,
  TrainFront as TrainIcon,
  Bus as BusIcon,
  Plane as PlaneIcon,
  Ship as ShipIcon,
  Car as CarIcon,
} from "lucide-react";

import Header from "../client/ClientHeader";
import { ModuleTabs, TicketSubTabs } from "../../components/ModuleTabs";
import TrainCard from "../../components/ticketBooking/TrainCard";
import HeroDetails from "../../components/ticketBooking/HeroDetails";
import Categories from "../../components/rentAVehicle/Categories";
import WhyChooseUs from "../../components/rentAVehicle/WhyChooseUs";
import HowItWorks from "../../components/rentAVehicle/HowItWorks";
import Testimonials from "../../components/rentAVehicle/Testimonials";
import ContactStrip from "../../components/rentAVehicle/ContactStrip";
import Footer from "../../layouts/Footer";

import trainHero from "../../assets/ticketBooking/hero-bus-train-flight.jpg";

const HERO_FEATURES = [
  { icon: ShieldCheck, label: "Sri Lanka Railways" },
  { icon: Ticket, label: "Reserved Seat Allocation" },
  { icon: Wallet, label: "Government Approved Fares" },
  { icon: Clock, label: "Real-Time Schedule Status" },
];

const TICKET_CATEGORIES = [
  { id: "scenic_train", label: "Scenic Hill Country Trains", icon: TrainIcon },
  { id: "intercity_train", label: "Intercity Express Lines", icon: TrainIcon },
  { id: "coastal_line", label: "Southern Coastal Railway", icon: TrainIcon },
  { id: "express_bus", label: "Express Highway Buses", icon: BusIcon },
  { id: "domestic_flight", label: "Domestic Flights", icon: PlaneIcon },
  { id: "airport_shuttle", label: "Airport Direct Transfers", icon: CarIcon },
];

const TICKET_WHY_POINTS = [
  {
    icon: ShieldCheck,
    title: "Official Railway Schedules",
    desc: "Direct integration with train timings, observation saloons, and class reservation data.",
  },
  {
    icon: Ticket,
    title: "Instant Digital E-Tickets",
    desc: "Receive your QR boarding pass instantly on SMS and email for hassle-free boarding.",
  },
  {
    icon: Wallet,
    title: "Zero Hidden Booking Fees",
    desc: "Guaranteed transparent pricing with live seat class selection and no surprise checkout add-ons.",
  },
  {
    icon: Clock,
    title: "24/7 Live Travel Support",
    desc: "Dedicated support team ready to assist with timetable updates, connections, and inquiries.",
  },
];

const TrainTicketBookingDetails = ({
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
    <div className="train-ticket-booking-page bg-[#F6F7F9] min-h-screen">
      <Head title="Train Ticket Booking - Schedules, Fares & Seats | Transport Jaan" />
      <Header />

      {/* Full-bleed hero with 75% visible image */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={trainHero}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[65%_45%] opacity-75"
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
            Ticket Booking · Train
          </p>
          <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[44px] leading-none text-[#0B1B34] mb-4">
            BOOK YOUR <span className="text-[#0955AC]">TRAIN TICKETS</span>
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
              <TicketSubTabs active="train" />
            </div>
          </div>
        </div>
      </section>

      {/* Floating search form card over hero bottom edge */}
      <div className="relative z-20 -mt-6 sm:-mt-8 md:-mt-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <TrainCard />
      </div>

      {/* Results */}
      <HeroDetails
        inline={true}
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

      {/* Categories */}
      <Categories
        basePath="/trainTicketBookingDetails"
        categories={TICKET_CATEGORIES}
        badge="Browse Railway Lines"
        title="EXPLORE BY"
        highlight="TRAIN CATEGORY"
      />

      {/* Why Choose Us */}
      <WhyChooseUs
        points={TICKET_WHY_POINTS}
        badge="Why Book With Us"
        title="TRAVEL EFFORTLESSLY BY"
        highlight="RAIL"
      />

      {/* How It Works */}
      <HowItWorks
        badge="Quick Booking Guide"
        title="BOOKING TRAIN TICKETS IS"
        highlight="SIMPLE"
      />

      {/* Testimonials */}
      <Testimonials />

      {/* Contact Strip */}
      <ContactStrip />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default TrainTicketBookingDetails;