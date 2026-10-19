import React, { useMemo } from "react";
import { usePage } from "@inertiajs/react";

import size from "../../assets/rentAVehicle/collection/meter.png";
import location from "../../assets/rentAVehicle/collection/user.png";
import warehouseType from "../../assets/rentAVehicle/collection/gearbox.png";
import features from "../../assets/rentAVehicle/collection/gas.png";
import proPic from "../../assets/landVehicleDetails/proPic.svg";
import tag from "../../assets/landVehicleDetails/tag.svg";
import star from "../../assets/driverBooking/star.svg";

const fmtInt = (n) => (n ?? n === 0 ? Number(n).toLocaleString() : "—");
const fmtFloat = (n, d = 1) => (n ?? n === 0 ? Number(n).toFixed(d) : "—");
const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const SpecCard = ({ icon, label }) => (
  <div className="w-[187px] h-[81px] border-[1px] border-[#0000002B] bg-[#E7E6E6] rounded-[10px] flex flex-row justify-center items-center gap-5 px-5 py-5">
    <img src={icon} alt="" />
    <h1>{label}</h1>
  </div>
);

const WarehouseDetailsTab = ({ warehouse }) => {
  const platform = usePage().props?.platform || {};
  const specs = useMemo(() => {
    if (!warehouse) return {};
    
    return {
      totalArea: warehouse?.total_area ? `${fmtInt(warehouse.total_area)} sq ft` : "—",
      warehouseType: ucfirst(warehouse?.type || warehouse?.warehouse_type),
      location: warehouse?.address || warehouse?.city || warehouse?.location || "—",
      amenities: warehouse?.amenities?.length ? `${warehouse.amenities.length} amenities` : "No amenities",
      capacity: warehouse?.capacity ? `${fmtInt(warehouse.capacity)} ${warehouse?.capacity_unit || 'units'}` : "—",
      pricing: warehouse?.pricing_model ? ucfirst(warehouse.pricing_model) : "Monthly",
      description:
        warehouse?.description ||
        "No description provided for this warehouse facility.",
      owner: {
        name: warehouse?.owner?.name || warehouse?.provider?.name || warehouse?.contact_person || "—",
        phone: warehouse?.owner?.phone || warehouse?.contact_phone || "—",
        email: warehouse?.owner?.email || warehouse?.contact_email || "—",
        rating: warehouse?.rating_avg ? fmtFloat(warehouse.rating_avg, 1) : null,
        reviews: warehouse?.reviews_count ?? 0,
      },
      features: Array.isArray(warehouse?.amenities) ? warehouse.amenities : [],
      operatingHours: warehouse?.operating_hours || "24/7 Access",
      securityLevel: warehouse?.security_level || "Standard",
      contactInfo: {
        phone: warehouse?.contact_phone || warehouse?.vendor?.phone || warehouse?.owner?.phone || warehouse?.provider?.phone || "—",
        email: warehouse?.contact_email || warehouse?.vendor?.email || warehouse?.owner?.email || warehouse?.provider?.email || "—",
        person: warehouse?.contact_person || warehouse?.vendor?.name || warehouse?.owner?.name || warehouse?.provider?.name || "—",
        company: warehouse?.vendor?.company_name || warehouse?.provider?.company_name || warehouse?.company_name || "—",
        address: warehouse?.vendor?.address || warehouse?.provider?.address || warehouse?.address || "—"
      }
    };
  }, [warehouse]);

  if (!warehouse) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No warehouse data available</p>
      </div>
    );
  }

  return (
    <>
      {/* Description */}
      <div className="flex flex-col gap-5">
        <h1 className="text-[15px] font-[600]">Description</h1>
        <p className="text-[14px]/[33px] font-[400] text-justify px-5">
          {specs.description}
        </p>
      </div>

      {/* Warehouse Specifications */}
      <div className="py-10">
        <h1 className="text-[15px] font-[600]">Warehouse Specifications</h1>
        <div className="py-10 text-[12px] font-[700]">
          <div className="flex flex-col justify-center items-center gap-10">
            <div className="flex flex-col xl:flex-row gap-10 justify-center items-center">
              <SpecCard icon={size} label={specs.totalArea} />
              <SpecCard icon={warehouseType} label={specs.warehouseType} />
              <SpecCard icon={location} label={specs.location} />
              <SpecCard icon={features} label={specs.amenities} />
            </div>
            <div className="flex flex-col xl:flex-row justify-center items-center gap-10">
              <SpecCard 
                icon={size} 
                label={specs.capacity} 
              />
              <SpecCard 
                icon={warehouseType} 
                label={specs.pricing} 
              />
              <SpecCard 
                icon={location} 
                label={warehouse?.status ? ucfirst(warehouse.status) : "Available"} 
              />
              <SpecCard 
                icon={features} 
                label={warehouse?.security_level ? ucfirst(warehouse.security_level) : "Standard"} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features & Amenities */}
      {specs.features && specs.features.length > 0 && (
        <div className="poppins py-5">
          <h1 className="text-[20px] font-[600] mb-5">Available Amenities</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specs.features.map((feature, index) => (
              <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-[#0955AC] rounded-full flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-medium text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operating Information */}
      <div className="poppins py-5">
        <h1 className="text-[20px] font-[600] mb-5">Operating Information</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Operating Hours</h4>
            <p className="text-gray-600">{specs.operatingHours}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Security Level</h4>
            <p className="text-gray-600">{ucfirst(specs.securityLevel)}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="poppins py-5">
        <h1 className="text-[20px] font-[600] mb-5">Service Provider Contact Information</h1>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specs.contactInfo.company !== "—" && (
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Company Name</h4>
                <p className="text-gray-600">{specs.contactInfo.company}</p>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Contact Person</h4>
              <p className="text-gray-600">{specs.contactInfo.person}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Phone</h4>
              <p className="text-gray-600">
                {specs.contactInfo.phone !== "—" ? (
                  <a 
                    href={`tel:${specs.contactInfo.phone}`}
                    className="text-[#0955AC] hover:underline cursor-pointer"
                  >
                    {specs.contactInfo.phone}
                  </a>
                ) : (
                  specs.contactInfo.phone
                )}
              </p>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-semibold text-gray-700 mb-2">Email</h4>
              <p className="text-gray-600">
                {specs.contactInfo.email !== "—" ? (
                  <a 
                    href={`mailto:${specs.contactInfo.email}`}
                    className="text-[#0955AC] hover:underline cursor-pointer"
                  >
                    {specs.contactInfo.email}
                  </a>
                ) : (
                  specs.contactInfo.email
                )}
              </p>
            </div>
            {specs.contactInfo.address !== "—" && specs.contactInfo.address !== warehouse?.address && (
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Service Provider Address</h4>
                <p className="text-gray-600">{specs.contactInfo.address}</p>
              </div>
            )}
          </div>

          {/* Xsarva handles booking, payment and support for the provider */}
          <div className="mt-5 rounded-lg border border-[#0955AC33] bg-[#0955AC0D] p-4">
            <h4 className="font-semibold text-gray-800 mb-1">
              Booked through {platform.name || "Xsarva (Pvt) Ltd"}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Xsarva manages your booking, payment and support for this service provider.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-1">Company</h4>
                <p className="text-gray-600">{platform.name || "Xsarva (Pvt) Ltd"}</p>
              </div>
              {platform.phone && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Support Phone</h4>
                  <a href={`tel:${platform.phone}`} className="text-[#0955AC] hover:underline">{platform.phone}</a>
                </div>
              )}
              {platform.email && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Support Email</h4>
                  <a href={`mailto:${platform.email}`} className="text-[#0955AC] hover:underline">{platform.email}</a>
                </div>
              )}
              {platform.address && (
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-700 mb-1">Address</h4>
                  <p className="text-gray-600">{platform.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Details */}
      <div className="poppins py-5">
        <h1 className="text-[20px] font-[600] mb-5">Location Information</h1>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Full Address</h4>
          <p className="text-gray-600">{warehouse?.address || specs.location}</p>
          {(warehouse?.latitude && warehouse?.longitude) && (
            <p className="text-sm text-gray-500 mt-2">
              Coordinates: {warehouse.latitude}, {warehouse.longitude}
            </p>
          )}
        </div>
      </div>

      {/* Owner Info */}
      <div className="poppins w-full py-7">
        <h1 className="text-[20px] font-[600] mb-10">Owner Info</h1>
        <div className="flex flex-col md:flex-row justify-start items-center gap-20">
          <div className="flex flex-col md:flex-row justify-start items-center gap-5">
            <img src={proPic} alt="" />
            <div className="flex flex-col items-start justify-center">
              <div className="flex flex-row gap-2 justify-center items-center">
                <h1 className="text-[15px] font-[700]">
                  {specs.owner.name}
                </h1>
                <img src={tag} alt="" />
              </div>
              <div>
                <div className="flex flex-row gap-3 justify-center items-center">
                  <img src={star} className="w-[16px]" alt="" />
                  <h1 className="text-[14px] font-[400]">
                    {specs.owner.rating ?? "—"}
                  </h1>
                  <h1 className="text-[12px] font-[500] text-[#949699]">
                    {specs.owner.reviews
                      ? `(${fmtInt(specs.owner.reviews)} Reviews)`
                      : "(No reviews)"}
                  </h1>
                </div>
              </div>
            </div>
          </div>
          <div className="text-[9px] flex flex-col md:flex-row gap-4">
            {specs.owner.phone !== "—" && (
              <a 
                href={`tel:${specs.owner.phone}`}
                className="w-[123px] h-[29px] bg-[#0955AC] text-[#FFFFFF] font-[700] rounded-[5px] flex justify-center items-center cursor-pointer hover:bg-[#0744A0] transition-colors"
              >
                CONTACT NUMBER
              </a>
            )}
            {specs.owner.email !== "—" && (
              <a 
                href={`mailto:${specs.owner.email}`}
                className="w-[123px] h-[29px] border-[1.5px] border-[#0955AC] bg-[#E8EBEF] text-[#0955AC] font-[700] rounded-[5px] flex justify-center items-center cursor-pointer hover:bg-[#0955AC] hover:text-white transition-colors"
              >
                SEND EMAIL
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WarehouseDetailsTab;