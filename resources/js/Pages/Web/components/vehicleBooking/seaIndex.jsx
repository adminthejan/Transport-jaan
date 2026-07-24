import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Car, Calendar, Palette, Users, Gauge, Shield, Settings, Wrench, ChevronLeft, ChevronRight
} from 'lucide-react';
import Header from '../../home/client/ClientHeader';
import Footer from '../../layouts/Footer';
import { Link } from '@inertiajs/react';

export default function seaIndex({ vehicles = [], seaVehicleDetails = [], vehicleImages = [] }) {
  const hasData = vehicles.length > 0 && seaVehicleDetails.length > 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const VehicleCard = ({ vehicle, seaDetails }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imagesForVehicle = vehicleImages.filter(img => img.vehicle_id === vehicle.id);

    const allImages = imagesForVehicle.map(img => ({
      id: img.id,
      image: img.image || '/images/placeholder-vehicle.jpg',
      alt: `${vehicle.model} - Image ${img.id}`
    }));

    // const allImages = imagesForVehicle.map(img => ({
    //     id: img.id,
    //     image: img.image ? `/storage/vehicle_images/${img.image}` : '/images/placeholder-vehicle.jpg',
    //     alt: `${vehicle.model} - Image ${img.id}`
    // }));


    if (allImages.length === 0) {
      allImages.push({
        id: 'placeholder',
        image: '/images/placeholder-vehicle.jpg',
        alt: `${vehicle.model} - No Image Available`
      });
    }

    const nextImage = () => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    };

    const prevImage = () => {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    };

    const goToImage = (index) => {
      setCurrentImageIndex(index);
    };

    return (
      <motion.div
        variants={cardVariants}
        whileHover={{
          y: -8,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }}
        className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
      >
        <div className="relative h-56 overflow-hidden">
          <img
            src={allImages[currentImageIndex]?.image}
            alt={allImages[currentImageIndex]?.alt || vehicle.model}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-gray-800">
            {vehicle.condition}
          </div>

          {allImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                {currentImageIndex + 1} / {allImages.length}
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'bg-white scale-125'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {allImages.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => goToImage(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    index === currentImageIndex
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img.image}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition">
              {vehicle.model}
            </h3>
            <div className="flex items-center gap-2 text-gray-600">
              <Car className="w-4 h-4" />
              <span className="font-medium">{vehicle.brand?.name}</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm">{vehicle.vehicle_no}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">{vehicle.manufracture_year}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">{vehicle.passenger_capacity} seats</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="w-4 h-4 text-orange-500" />
              <span className="text-gray-600">{vehicle.currect_milage} km</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Palette className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600">{vehicle.color}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            {/* <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Engine</span>
              </div>
              <span className="font-medium text-gray-900">{seaDetails.engine_type}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Transmission</span>
              </div>
              <span className="font-medium text-gray-900">{seaDetails.transmission}</span>
            </div> */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Insurance</span>
              </div>
              <span className="font-medium text-gray-900">{vehicle.insuarance_provider_name}</span>
            </div>
          </div>

          {vehicle.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {vehicle.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800">
              {vehicle.ownership_type}
            </span>
            {allImages.length > 1 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800">
                {allImages.length} Photos
              </span>
            )}
          </div>

          <Link href={`/vehicle-bookings/bookings/sea/${vehicle.id}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-r from-green-500 via-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Book Now
            </motion.button>
          </Link>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
        <Link href="/vehicle-bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition duration-300">
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Bookings</span>
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-16 px-4 text-white rounded-3xl mb-12 overflow-hidden"
      >
        <div className="max-w-4xl mx-auto text-center z-10 relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Explore Our Sea Vehicles</h1>
          <p className="text-lg md:text-xl text-blue-100">Discover premium sea vehicles for your travel needs — stylish, powerful, and ready to roll.</p>
        </div>
        <div className="absolute inset-0 opacity-10 bg-[url('/images/road-bg.jpg')] bg-cover bg-center pointer-events-none" />
      </motion.section>

      <main className="max-w-7xl mx-auto px-4 pb-20">
        {!hasData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Vehicles Available
              </h3>
              <p className="text-gray-600">
                We're currently updating our fleet. Please check back soon for available vehicles.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            {seaVehicleDetails.map((sea) => {
              const vehicle = vehicles.find(v => v.id === sea.vehicle_id);
              if (!vehicle) return null;

              return (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  seaDetails={sea}
                />
              );
            })}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
