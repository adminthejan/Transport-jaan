import React from "react";
import { router } from "@inertiajs/react";
import { Car, Bus, BusFront, Truck, Container, Construction } from "lucide-react";

// Mirrors the "USE / INDUSTRY CATEGORY" filter in FilterSidebar.jsx so a tap
// here lands the visitor on a pre-filtered results page instead of a
// disconnected marketing tile.
const CATEGORIES = [
  { id: "cars_suvs", label: "Cars & SUVs", icon: Car },
  { id: "vans_minibuses", label: "Vans & Minibuses", icon: Bus },
  { id: "buses", label: "Buses", icon: BusFront },
  { id: "trucks", label: "Trucks", icon: Truck },
  { id: "prime_movers_trailers", label: "Prime Movers & Trailers", icon: Container },
  { id: "construction_equipment", label: "Construction & Equipment", icon: Construction },
];

const Categories = ({
  basePath = "/vehicleList",
  categories: customCategories,
  title = "EXPLORE BY",
  highlight = "VEHICLE TYPE",
  badge = "Browse Categories",
  onCategoryClick,
}) => {
  const list = customCategories || CATEGORIES;

  const handleClick = (id) => {
    if (onCategoryClick) {
      onCategoryClick(id);
      return;
    }
    router.visit(basePath, { method: "get", data: { industryCategory: id } });
  };

  return (
    <div className="w-full py-8 md:py-10 bg-white border-y border-black/[0.04]">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="poppins text-[10px] sm:text-[11px] font-[700] tracking-[0.14em] text-[#0955AC] uppercase">
              {badge}
            </span>
            <h2 className="bebas-neue text-[22px] sm:text-[26px] text-[#0B1B34] tracking-wide">
              {title} <span className="text-[#0955AC]">{highlight}</span>
            </h2>
          </div>
        </div>
        <div className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {list.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleClick(cat.id)}
              className="group flex-shrink-0 min-w-[160px] sm:min-w-[180px] bg-[#F8FAFC] hover:bg-[#EAF1FE] border border-black/5 hover:border-[#0955AC]/20 rounded-[16px] p-4 sm:p-5 flex flex-col items-start gap-3.5 text-left transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
            >
              <div className="w-10 h-10 rounded-[10px] bg-white group-hover:bg-[#0955AC] flex items-center justify-center shadow-sm transition-colors duration-200">
                <cat.icon className="w-5 h-5 text-[#0955AC] group-hover:text-white transition-colors duration-200" />
              </div>
              <div className="figtree text-[13px] sm:text-[14px] font-[700] text-[#0B1B34]">{cat.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
