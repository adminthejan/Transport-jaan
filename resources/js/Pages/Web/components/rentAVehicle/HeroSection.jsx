import React, { useState } from "react";
import carImage from "../../assets/rentAVehicle/car.jpg";
import flightImage from "../../assets/rentAVehicle/flight.jpg";
import shipsImage from "../../assets/rentAVehicle/ships.jpg";
import heroBg from "../../assets/rentAVehicle/hero/land-sea-air.jpg";

import { router } from "@inertiajs/react";
import { route } from "ziggy-js";
import { MapPin, CalendarDays, ArrowRight, Star } from "lucide-react";

const getInitialImageOrder = () => {
    if (typeof window === "undefined") {
        return ["land", "sea", "air"];
    }

    const params = new URLSearchParams(window.location.search);
    const urlType = params.get("type");

    let activeType;
    // Map URL type to one of our internal keys
    switch (urlType) {
        case "sea":
        case "water":
            activeType = "sea";
            break;
        case "air":
            activeType = "air";
            break;
        case "land":
        default:
            activeType = "land";
            break;
    }

    const baseOrder = ["land", "sea", "air"];
    return [activeType, ...baseOrder.filter((t) => t !== activeType)];
};

const HeroSection = ({ formData, onFormChange, onVehicleTypeChange }) => {
    const [imageOrder, setImageOrder] = useState(getInitialImageOrder);

    const imageData = {
        land: {
            src: carImage,
            alt: "Land Vehicle",
            label: "LAND VEHICLE",
            tab: "Land",
        },
        sea: {
            src: shipsImage,
            alt: "Water Vehicle",
            label: "WATER VEHICLE",
            tab: "Sea",
        },
        air: {
            src: flightImage,
            alt: "Air Vehicle",
            label: "AIR VEHICLE",
            tab: "Air",
        },
    };

    const handleImageClick = (imageType) => {
        setImageOrder((prevOrder) => {
            // Create new array with clicked type moved to the front
            const newOrder = prevOrder.filter((type) => type !== imageType);
            newOrder.unshift(imageType);

            // Notify parent about vehicle type change
            if (onVehicleTypeChange) {
                const typeMap = {
                    land: "land",
                    sea: "sea", // change to "water" here if your backend uses "water"
                    air: "air",
                };
                onVehicleTypeChange(typeMap[imageType]);
            }

            return newOrder;
        });
    };

    const handleFindVehicleClick = (e) => {
        e.preventDefault();

        if (
            !formData.pickupLocation ||
            !formData.pickupDate ||
            !formData.dropoffLocation ||
            !formData.dropoffDate
        ) {
            alert("Please fill in all fields before proceeding.");
            return;
        }

        // Determine selected vehicle type from the image order (first item)
        const selectedType = (imageOrder && imageOrder[0]) || "land";

        // Map our internal type to a list path. Adjust paths if your routes differ.
        const listPathMap = {
            air: "/airVehicleList",
            land: "/vehicleList",
            sea: "/seaVehicleList",
        };

        // Build query params
        const params = {
            pickupLocation: formData.pickupLocation,
            pickupDate: formData.pickupDate,
            dropoffLocation: formData.dropoffLocation,
            dropoffDate: formData.dropoffDate,
            type: selectedType,
        };

        const qs = new URLSearchParams(params).toString();

        // Navigate to the appropriate list page (full URL like http://127.0.0.1:8000/airVehicleList?type=air)
        const base = typeof window !== "undefined" ? window.location.origin : "";
        const path = listPathMap[selectedType] || "/vehicleList";
        const target = `${base}${path}?${qs}`;

        // Use a full redirect to ensure the correct page loads
        if (typeof window !== "undefined") {
            window.location.href = target;
        } else {
            // Fallback to Inertia if running on server (unlikely in browser UI)
            router.get(route("vehicle.list"), params);
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        onFormChange({
            ...formData,
            [id]: value,
        });
    };

    const stats = [
        { value: "500+", label: "Vehicles Listed" },
        { value: "4.8★", label: "Average Rating" },
        { value: "24/7", label: "Customer Support" },
        { value: "100%", label: "Verified Vendors" },
    ];

    const activeType = imageOrder[0];

    return (
        <div className="relative z-10 flex flex-col overflow-hidden">
            {/* Ambient background: land + sea + air lifestyle photo, ~75% visible */}
            <div className="absolute inset-0 z-0">
                <img
                    src={heroBg}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover object-[65%_45%] opacity-90"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.40) 35%, rgba(255,255,255,0.08) 65%, transparent 85%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(0deg, #FFFFFF 0%, rgba(255,255,255,0.15) 15%, transparent 35%, transparent 80%, rgba(255,255,255,0.20) 100%)",
                    }}
                />
            </div>
            {/* Soft decorative glow for the non-image (mobile) background */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#0955AC]/10 blur-3xl z-0"
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between min-h-[85vh] px-4 md:px-16 gap-8 pb-10">
                {/* Left: Text + Form */}
                <div className="text-black md:order-1 order-2 text-left p-8 md:p-0 w-full md:max-w-4xl md:w-1/3 flex-shrink-0 mt-8">
                    <div className="w-[50px] h-[5px] bg-[#000000] mb-6 rounded-sm"></div>
                    <h1 className="bebas-neue text-[32px] sm:text-[38px] md:text-[45px]/[58px] font-[400] mb-4">
                        FROM <span className="text-[#0955AC]">ROADS </span>TO{" "}
                        <span className="text-[#0955AC]">SKIES</span> TO{" "}
                        <span className="text-[#0955AC]">SEAS</span> -{" "}
                        <br className="hidden sm:block" />
                        RENT WITH EASE.
                    </h1>
                    <p className="poppins text-[10px]/[20px] md:text-[15px] font-[400] text-[#00000099] text-justify mb-8 md:mb-10">
                        We bring together the world's most diverse vehicle rentals{" "}
                        <br className="hidden sm:block" /> on one platform from
                        daily car hires and charter flights{" "}
                        <br className="hidden sm:block" /> to private boat journeys.
                    </p>

                    {/* Land / Sea / Air switcher */}
                    <div className="poppins inline-flex bg-white border border-black/10 rounded-full p-1.5 gap-1 shadow-sm mb-6">
                        {imageOrder
                            .slice()
                            .sort((a, b) =>
                                ["land", "sea", "air"].indexOf(a) -
                                ["land", "sea", "air"].indexOf(b)
                            )
                            .map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleImageClick(type)}
                                    className={`px-5 py-2 rounded-full text-[13px] font-[600] transition-colors cursor-pointer ${
                                        activeType === type
                                            ? "bg-[#0955AC] text-white shadow"
                                            : "text-[#0F0F0F99] hover:text-[#0955AC]"
                                    }`}
                                >
                                    {imageData[type].tab}
                                </button>
                            ))}
                    </div>

                    {/* Search Form */}
                    <form
                        onSubmit={handleFindVehicleClick}
                        className="figtree bg-white p-4 sm:p-6 rounded-[20px] w-full 2xl:w-[505px] h-auto text-[#286BB6] text-[13px] font-[400] border border-black/5"
                        style={{ boxShadow: "0px 16px 40px rgba(9, 85, 172, 0.14)" }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Pick-up Location */}
                            <div>
                                <label
                                    htmlFor="pickupLocation"
                                    className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]"
                                >
                                    Pick-up Location
                                </label>
                                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors">
                                    <MapPin className="w-[16px] h-[16px] text-[#0955AC] flex-shrink-0" />
                                    <input
                                        type="text"
                                        id="pickupLocation"
                                        value={formData.pickupLocation}
                                        onChange={handleInputChange}
                                        placeholder="Search a location"
                                        className="appearance-none w-full py-[14px] leading-tight focus:outline-none placeholder:text-[#286BB6] bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Pick-up Date */}
                            <div>
                                <label htmlFor="pickupDate" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                                    Pick-up Date
                                </label>
                                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors">
                                    <CalendarDays className="w-[16px] h-[16px] text-[#0955AC] flex-shrink-0" />
                                    <input
                                        type="date"
                                        id="pickupDate"
                                        value={formData.pickupDate}
                                        onChange={handleInputChange}
                                        className="w-full py-[14px] leading-tight focus:outline-none text-[#286BB6] bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Drop-off Location */}
                            <div>
                                <label
                                    htmlFor="dropoffLocation"
                                    className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]"
                                >
                                    Drop-off Location
                                </label>
                                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors">
                                    <MapPin className="w-[16px] h-[16px] text-[#0955AC] flex-shrink-0" />
                                    <input
                                        type="text"
                                        id="dropoffLocation"
                                        value={formData.dropoffLocation}
                                        onChange={handleInputChange}
                                        placeholder="Search a location"
                                        className="w-full py-[14px] leading-tight focus:outline-none placeholder:text-[#286BB6] bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Drop-off Date */}
                            <div>
                                <label htmlFor="dropoffDate" className="block mb-1.5 text-[#0F0F0F] font-[600] text-[12px]">
                                    Drop-off Date
                                </label>
                                <div className="flex items-center gap-2 border-[1px] border-[#0000001A] rounded-[10px] px-3 focus-within:border-[#0955AC] transition-colors">
                                    <CalendarDays className="w-[16px] h-[16px] text-[#0955AC] flex-shrink-0" />
                                    <input
                                        type="date"
                                        id="dropoffDate"
                                        value={formData.dropoffDate}
                                        onChange={handleInputChange}
                                        className="w-full py-[14px] leading-tight focus:outline-none text-[#286BB6] bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Find a Vehicle Button */}
                        <button
                            type="submit"
                            className="group bg-[#0955AC] text-white font-bold h-[56px] w-full max-w-[459px] rounded-[10px] focus:outline-none cursor-pointer hover:bg-[#07448a] transition-colors flex items-center justify-center gap-2"
                        >
                            Find a Vehicle
                            <ArrowRight className="w-[16px] h-[16px] transition-transform group-hover:translate-x-1" />
                        </button>
                    </form>
                </div>

                {/* Images Section (Desktop + Mobile responsive) */}
                <div className="order-1 md:order-2 mt-20 md:mt-0 w-full md:w-2/3 flex-shrink-0 relative">
                    <div className="bebas-neue flex flex-row items-stretch h-[200px] md:h-[500px] lg:h-[640px] gap-3 md:gap-4 drop-shadow-[0_30px_45px_rgba(11,27,52,0.22)]">
                        {imageOrder.map((type, idx) => (
                            <div
                                key={type}
                                onClick={() => handleImageClick(type)}
                                className={`relative h-full overflow-hidden rounded-[14px] md:rounded-[28px] transition-all duration-300 ease-in-out cursor-pointer flex-shrink-0 ${
                                    idx === 0
                                        ? "w-[180px] sm:w-[220px] md:w-[350px] xl:w-[559px]"
                                        : "w-[60px] sm:w-[80px] md:w-[150px] lg:w-[220px]"
                                }`}
                            >
                                <img
                                    src={imageData[type].src}
                                    alt={imageData[type].alt}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span
                                        className={`text-white text-[14px] sm:text-[18px] md:text-[24px] lg:text-[32px] font-[400] rotate-[270deg] ${
                                            idx === 0 ? "hidden" : ""
                                        }`}
                                    >
                                        {imageData[type].label}
                                    </span>
                                </div>
                                {idx === 0 && (
                                    <span className="poppins absolute bottom-4 left-4 bg-white/90 backdrop-blur text-[#0955AC] text-[11px] font-[700] tracking-wide px-3 py-1.5 rounded-full">
                                        {imageData[type].label}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Floating rating badge */}
                    <div className="poppins hidden sm:flex absolute -bottom-6 left-4 md:left-8 items-center gap-3 bg-white rounded-2xl shadow-[0_16px_32px_rgba(11,27,52,0.16)] px-4 py-3 border border-black/5">
                        <div className="w-10 h-10 rounded-full bg-[#FFF6E0] flex items-center justify-center flex-shrink-0">
                            <Star className="w-[18px] h-[18px] text-[#F0BB0D] fill-[#F0BB0D]" />
                        </div>
                        <div>
                            <p className="text-[15px] font-[800] text-[#0B1B34] leading-none mb-1">
                                {stats[1].value}
                            </p>
                            <p className="text-[11px] text-[#00000080] leading-none">
                                {stats[1].label}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trust / stats bar */}
            <div className="relative z-10 w-full px-4 md:px-16 pb-14 mt-10 sm:mt-0">
                <div className="poppins bg-white rounded-[20px] shadow-[0_16px_40px_rgba(11,27,52,0.10)] border border-black/5 grid grid-cols-2 sm:grid-cols-4 divide-x divide-black/5">
                    {stats.map((s) => (
                        <div key={s.label} className="flex flex-col items-center justify-center py-6 px-2 text-center">
                            <span className="text-[24px] sm:text-[30px] font-[800] text-[#0955AC]">{s.value}</span>
                            <span className="text-[11px] sm:text-[12px] font-[600] text-[#00000080] mt-1">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
