import React from "react";
import { router } from "@inertiajs/react";
import recom1 from "../../assets/flight/recom1.svg";
import recom2 from "../../assets/flight/recom2.svg";
import recom3 from "../../assets/flight/recom3.svg";
import heart from "../../assets/flight/heart.svg";
import yellowStar from "../../assets/flight/yellowStar.svg";
import clock from "../../assets/flight/clock.svg";
import person from "../../assets/flight/person.svg";

const routes = [
    {
        image: recom1,
        badge: "Top Rated",
        badgeColor: "#F09814",
        title: "Colombo → Kandy",
        subtitle: "Scenic hill-country train route",
        duration: "2h 30m",
        capacity: "Up to 6 seats",
        price: "1,200",
        rating: "4.9",
        reviews: "412",
        type: "train",
    },
    {
        image: recom2,
        badge: "Best Sale",
        badgeColor: "#3DC262",
        title: "Colombo → Negombo",
        subtitle: "Fast express coach, daily departures",
        duration: "1h 15m",
        capacity: "Up to 8 seats",
        price: "450",
        rating: "4.8",
        reviews: "298",
        type: "bus",
    },
    {
        image: recom3,
        badge: "25% Off",
        badgeColor: "#F09814",
        title: "Colombo → Jaffna",
        subtitle: "Domestic flight, non-stop",
        duration: "1h 05m",
        capacity: "Up to 4 bags",
        price: "18,500",
        rating: "4.9",
        reviews: "156",
        type: "flight",
    },
    {
        image: recom1,
        badge: "Top Rated",
        badgeColor: "#F09814",
        title: "Colombo → Galle",
        subtitle: "Coastal express, ocean views",
        duration: "2h 00m",
        capacity: "Up to 6 seats",
        price: "900",
        rating: "4.7",
        reviews: "331",
        type: "train",
    },
    {
        image: recom2,
        badge: "25% Off",
        badgeColor: "#F09814",
        title: "Colombo → Anuradhapura",
        subtitle: "Overnight express bus",
        duration: "4h 30m",
        capacity: "Up to 8 seats",
        price: "1,100",
        rating: "4.6",
        reviews: "204",
        type: "bus",
    },
    {
        image: recom3,
        badge: "Best Sale",
        badgeColor: "#3DC262",
        title: "Colombo → Trincomalee",
        subtitle: "Domestic flight, non-stop",
        duration: "0h 45m",
        capacity: "Up to 4 bags",
        price: "22,000",
        rating: "4.8",
        reviews: "97",
        type: "flight",
    },
];

const RouteCard = ({ route }) => (
    <div className="relative w-full lg:max-w-[390px]">
        <img src={route.image} className="relative rounded-t-[30px] -mb-[40px] z-0 w-full" alt={route.title} />
        <div
            className="absolute top-5 left-5 w-[90px] sm:w-[111px] h-7 sm:h-8 bg-[#FFFFFF] rounded-[50px] font-[700] flex justify-center items-center z-20 cursor-pointer text-[12px] sm:text-[14px]"
            style={{ color: route.badgeColor, boxShadow: "0px 2px 2px 0px rgba(0, 0, 0, 0.25)" }}
        >
            {route.badge}
        </div>
        <button
            type="button"
            aria-label="Save route"
            className="absolute top-5 right-5 w-8 h-8 sm:w-[32px] sm:h-[32px] bg-[#FFFFFFD1] rounded-full flex justify-center items-center cursor-pointer"
            style={{ boxShadow: "0px 2px 2px 0px rgba(0, 0, 0, 0.25)" }}
        >
            <img src={heart} alt="" />
        </button>

        <div
            className="relative w-full xl:h-[259px] bg-[#FFFFFF] rounded-[30px] z-10 p-6 sm:p-8 lg:p-10 mx-auto"
            style={{ boxShadow: "0px 2px 2px 0px rgba(0, 0, 0, 0.25)" }}
        >
            <div
                className="absolute -top-4 right-4 sm:right-10 w-[120px] sm:w-[169px] h-7 sm:h-8 bg-[#FFFFFF] rounded-[50px] text-[#000000] flex flex-row justify-center items-center gap-2 text-[12px] sm:text-[14px] font-[700]"
                style={{ boxShadow: "0px 2px 2px 0px rgba(0, 0, 0, 0.25)" }}
            >
                <img src={yellowStar} alt="" />
                <h1>
                    {route.rating}{" "}
                    <span className="font-[500] text-[#737373]">({route.reviews} reviews)</span>
                </h1>
            </div>

            <h1 className="text-[18px] sm:text-[20px] md:text-[24px] font-[800]">{route.title}</h1>
            <p className="text-[13px] sm:text-[14px] text-[#737373] font-[500] mt-1">{route.subtitle}</p>

            <div className="flex flex-row justify-start items-center gap-5 text-[14px] sm:text-[16px] font-[500] text-[#737373] my-3">
                <div className="flex flex-row justify-center items-center gap-2">
                    <img src={clock} alt="" />
                    <h1>{route.duration}</h1>
                </div>
                <div className="flex flex-row justify-center items-center gap-2">
                    <img src={person} alt="" />
                    <h1>{route.capacity}</h1>
                </div>
            </div>

            <div className="my-4 sm:my-6 flex flex-row justify-between items-center">
                <h1 className="text-[16px] sm:text-[18px] md:text-[24px] font-[800]">
                    LKR {route.price} <span className="text-[#737373] font-[500]"> / person</span>
                </h1>
                <button
                    type="button"
                    onClick={() => router.get("/ticketBooking", { type: route.type })}
                    className="w-[96px] sm:w-[104px] h-[36px] sm:h-[40px] bg-[#0955AC] hover:bg-[#073E82] transition-colors text-white rounded-[50px] font-[700] text-[13px] sm:text-[14px] flex justify-center items-center cursor-pointer"
                >
                    Book Now
                </button>
            </div>
        </div>
    </div>
);

const Recommended = () => {
    return (
        <div className="flex flex-col justify-center items-center px-6 sm:px-10 py-10 bg-[#DCDCDC]">
            <h1 className="bebas-neue text-[28px] sm:text-[36px] md:text-[52px] font-[400] text-center">
                Popular Routes Right Now
            </h1>
            <p className="text-[#737373] font-[500] text-[14px] sm:text-[18px] md:text-[20px] text-center max-w-[900px]">
                Real routes, real fares — the best booking platform you can trust
            </p>

            <div className="flex flex-col gap-10 py-10">
                <div className="flex flex-col xl:flex-row gap-10">
                    {routes.slice(0, 3).map((route) => (
                        <RouteCard key={route.title} route={route} />
                    ))}
                </div>
                <div className="flex flex-col xl:flex-row gap-10">
                    {routes.slice(3, 6).map((route) => (
                        <RouteCard key={route.title} route={route} />
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={() => router.get("/ticketBooking")}
                className="w-[150px] h-[45px] bg-[#0955AC] hover:bg-[#073E82] transition-colors border-[1px] border-[#0955AC] rounded-[9px] text-[16px] text-[#FFFFFF] font-[700] flex justify-center items-center cursor-pointer"
            >
                VIEW MORE
            </button>
        </div>
    );
};

export default Recommended;
