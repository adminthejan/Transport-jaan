import React from "react";
import { router } from "@inertiajs/react";
import { Waves, Plane } from "lucide-react";

import toyota from "../../assets/rentAVehicle/brands/toyota.png";
import audi from "../../assets/rentAVehicle/brands/Audi.png";
import Hyundai from "../../assets/rentAVehicle/brands/Hyundai.png";
import kia from "../../assets/rentAVehicle/brands/Kia.png";
import Volkswagen from "../../assets/rentAVehicle/brands/Volkswagen.png";
import benz from "../../assets/rentAVehicle/brands/benz.png";
import bmw from "../../assets/rentAVehicle/brands/bmw.png";
import ford from "../../assets/rentAVehicle/brands/ford.png";
import honda from "../../assets/rentAVehicle/brands/honda.png";
import nissan from "../../assets/rentAVehicle/brands/nissan.png";
import tesla from "../../assets/rentAVehicle/brands/tesla.png";

const RentByBrands = ({ selectedType = "other" }) => {
    // Brand sets per category
    const BRAND_MAP = {
        // Land vehicles (showing images instead of initials)
        land: [
            { name: "Toyota", value: "toyota", img: toyota },
            { name: "Honda", value: "honda", img: honda },
            { name: "Nissan", value: "nissan", img: nissan },
            { name: "BMW", value: "bmw", img: bmw },
            { name: "Mercedes-Benz", value: "mercedes-benz", img: benz },
            { name: "Audi", value: "audi", img: audi },
            { name: "Ford", value: "ford", img: ford },
            { name: "Volkswagen", value: "volkswagen", img: Volkswagen },
            { name: "Tesla", value: "tesla", img: tesla },
            { name: "Hyundai", value: "jeep", img: Hyundai },
            { name: "Kia", value: "land-rover", img: kia },
        ],
        // Watercraft
        sea: [
            { name: "Yamaha Marine", value: "yamaha" },
            { name: "Sea-Doo", value: "sea-doo" },
            { name: "Bayliner", value: "bayliner" },
            { name: "Quicksilver", value: "quicksilver" },
            { name: "Beneteau", value: "beneteau" },
            { name: "Princess", value: "princess" },
            { name: "Sunseeker", value: "sunseeker" },
            { name: "Azimut Yachts", value: "azimut" },
            { name: "Ferretti", value: "ferretti" },
            { name: "MasterCraft", value: "mastercraft" },
        ],
        // Aircraft
        air: [
            { name: "Airbus", value: "airbus" },
            { name: "Boeing", value: "boeing" },
            { name: "Cessna", value: "cessna" },
            { name: "Bell", value: "bell" },
            { name: "Gulfstream", value: "gulfstream" },
            { name: "Embraer", value: "embraer" },
            { name: "Dassault Falcon", value: "dassault" },
            { name: "Bombardier", value: "bombardier" },
            { name: "ATR", value: "atr" },
            { name: "Pilatus", value: "pilatus" },
        ],
    };

    const brands = BRAND_MAP[selectedType] || [];

    const handleBrandClick = (brand) => {
        router.visit("/vehicleList", {
            method: "get",
            data: { brand: brand.value, type: selectedType },
        });
    };

    return (
        <div className="w-full py-16 md:py-20 bg-white">
            <div className="container mx-auto px-6 xl:px-20">
                <div className="text-center mb-10 md:mb-12">
                    <span className="poppins inline-block text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] bg-[#EAF1FE] px-3 py-1.5 rounded-full uppercase mb-4">
                        Trusted Manufacturers
                    </span>
                    <h2 className="bebas-neue text-[32px] md:text-[40px] font-[400]">
                        RENT BY <span className="text-[#0955AC]">BRAND</span>
                    </h2>
                </div>

                {brands.length === 0 && (
                    <div className="mt-6 text-center figtree text-[14px] text-[#0F0F0F99]">
                        Brands for this category are coming soon.
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 md:gap-6 cursor-pointer">
                    {brands.map((brand) => (
                        <div
                            key={brand.value}
                            className="group bg-white border border-black/5 p-4 rounded-[16px] shadow-[0_2px_10px_rgba(11,27,52,0.05)] flex flex-col items-center justify-center h-[130px] md:h-[150px] hover:shadow-[0_16px_28px_rgba(9,85,172,0.14)] hover:border-[#0955AC]/30 hover:-translate-y-1 transition-all duration-300"
                            onClick={() => handleBrandClick(brand)}
                        >
                            {brand.img ? (
                                <img
                                    src={brand.img}
                                    alt={`${brand.name} Logo`}
                                    className="h-[36px] md:h-[42px] object-contain mb-4 grayscale-[0.15] group-hover:grayscale-0 transition-all duration-300"
                                />
                            ) : (
                                <div className="w-[52px] h-[52px] rounded-full bg-[#EAF1FE] flex items-center justify-center mb-4 group-hover:bg-[#0955AC] transition-colors duration-300">
                                    {selectedType === "sea" ? (
                                        <Waves className="w-[24px] h-[24px] text-[#0955AC] group-hover:text-white transition-colors duration-300" />
                                    ) : selectedType === "air" ? (
                                        <Plane className="w-[24px] h-[24px] text-[#0955AC] group-hover:text-white transition-colors duration-300" />
                                    ) : null}
                                </div>
                            )}

                            <p className="figtree text-[#0B1B34] font-[600] text-[12px] md:text-[14px] text-center">
                                {brand.name}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RentByBrands;
