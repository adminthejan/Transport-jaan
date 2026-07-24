import React, { useState } from "react";

import flightImage from "../../assets/rentAVehicle/flight.svg";
import trainImage from "../../assets/ticketBooking/train.jpg";
import busImage from "../../assets/ticketBooking/bus2.jpg";

import TrainCard from "../ticketBooking/TrainCard";
import BusCard from "../ticketBooking/BusCard";
import FlightCard from "../ticketBooking/FlightCard";

const VALID_TYPES = ["flight", "train", "bus"];

const Hero = ({ initialType = "flight" }) => {
  const safeInitial =
    VALID_TYPES.includes(initialType) ? initialType : "flight";

  // initial state depends on initialType (only on first render)
  const [selectedType, setSelectedType] = useState(safeInitial);
  const [imageOrder, setImageOrder] = useState(() => {
    const others = VALID_TYPES.filter((t) => t !== safeInitial);
    return [safeInitial, ...others]; // selected becomes the big image
  });

  const imageData = {
    flight: {
      src: flightImage,
      alt: "Flight",
      label: "Flight",
    },
    train: {
      src: trainImage,
      alt: "Train",
      label: "Train",
    },
    bus: {
      src: busImage,
      alt: "Bus",
      label: "Bus",
    },
  };

  const handleImageClick = (type) => {
    setSelectedType(type);
    setImageOrder((prevOrder) => {
      const newOrder = prevOrder.filter((t) => t !== type);
      newOrder.unshift(type);
      return newOrder;
    });
  };

  const headline = {
    flight: (
      <>
        Fly anywhere. <span className="text-[#0955AC]">One</span> simple
        <span className="text-[#0955AC]"> search</span>.
      </>
    ),
    train: (
      <>
        Book train tickets. <span className="text-[#0955AC]">Fast</span>,
        <span className="text-[#0955AC]"> easy</span>, reliable.
      </>
    ),
    bus: (
      <>
        Every route. <span className="text-[#0955AC]">Every</span> operator.
        <span className="text-[#0955AC]"> One</span> ticket.
      </>
    ),
  };

  const subtext = {
    flight: "Compare fares across airlines, lock in your seat, and get instant e-tickets — no hidden fees, no waiting on hold.",
    train: "Search real-time train schedules across the island, pick your class, and confirm your journey in under a minute.",
    bus: "Search hundreds of scheduled departures, book your seat on the map, and travel with confidence — round trips included.",
  };

  const stats = [
    { value: "50K+", label: "Tickets Booked" },
    { value: "4.8★", label: "Average Rating" },
    { value: "24/7", label: "Live Support" },
    { value: "0 LKR", label: "Hidden Fees" },
  ];

  return (
    <div>
      {/* Content */}
      <div
        style={{ position: "relative", zIndex: 2 }}
        className="py-20 px-10 flex flex-col xl:flex-row gap-20 justify-center items-center overflow-hidden"
      >
        <div className="flex flex-col items-center max-w-[600px] xl:order-1 order-2">
          <div>
            <div className="w-[125px] h-[5px] bg-[#000000] mb-6 rounded-sm"></div>
            <h1 className="bebas-neue text-[44px]/[48px] sm:text-[56px]/[58px] xl:text-[64px]/[66px] font-[400] mb-4">
              {headline[selectedType]}
            </h1>
            <p className="poppins py-5 text-[13px]/[22px] md:text-[15px]/[26px] font-[400] text-[#00000099] mb-6">
              {subtext[selectedType]}
            </p>
          </div>

          {/* Card section – controlled by selectedType */}
          <div className="w-full">
            {selectedType === "flight" && <FlightCard />}
            {selectedType === "train" && <TrainCard />}
            {selectedType === "bus" && <BusCard />}
          </div>
        </div>

        {/* Images Section */}
        <div className="xl:order-2 order-1 bebas-neue hidden md:flex flex-row items-stretch h-[500px] xl:h-[680px] gap-4 w-full md:w-1/2 flex-shrink-0">
          {imageOrder.map((type, idx) => (
            <div
              key={type}
              className={`relative h-full overflow-hidden rounded-[25px] shadow-lg transition-all duration-300 ease-in-out cursor-pointer flex-shrink-0 ${
                idx === 0 ? "w-[459px]" : "w-[150px]"
              }`}
              onClick={() => handleImageClick(type)}
            >
              <img
                src={imageData[type].src}
                alt={imageData[type].alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#00000066]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-white text-[24px] lg:text-[32px] font-[400] rotate-[270deg] ${
                    idx === 0 ? "hidden" : ""
                  }`}
                >
                  {imageData[type].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust / stats bar */}
      <div className="relative z-10 w-full px-4 md:px-16 pb-14">
        <div className="poppins bg-white rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-black/5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-black/5">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center py-5 px-2 text-center">
              <span className="text-[22px] sm:text-[28px] font-[800] text-[#0955AC]">{s.value}</span>
              <span className="text-[11px] sm:text-[12px] font-[600] text-[#00000080] mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
