import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Warehouse, Calendar, MapPin, Users, Thermometer, Shield, Settings, Star, ChevronLeft, ChevronRight
} from 'lucide-react';
import Header from '../../home/client/ClientHeader';
import Footer from '../../layouts/Footer';
import { Link } from '@inertiajs/react';

export default function WarehouseIndex({ warehouses = [], warehouseDetails = [], warehouseImages = [] }) {
  const hasData = warehouses.length > 0 && warehouseDetails.length > 0;

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

  const WarehouseCard = ({ warehouse, details }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imagesForWarehouse = warehouseImages.filter(img => img.warehouse_id === warehouse.id);

    const allImages = imagesForWarehouse.map(img => ({
      id: img.id,
      url: `/storage/${img.image_path}`,
      alt: img.alt_text || warehouse.name
    }));

    const nextImage = () => {
      setCurrentImageIndex((prev) => 
        prev === allImages.length - 1 ? 0 : prev + 1
      );
    };

    const prevImage = () => {
      setCurrentImageIndex((prev) => 
        prev === 0 ? allImages.length - 1 : prev - 1
      );
    };

    const formatPrice = (price, pricingModel) => {
      const units = {
        hourly: '/hour',
        daily: '/day', 
        weekly: '/week',
        monthly: '/month'
      };
      return `$${price?.toLocaleString()}${units[pricingModel] || '/day'}`;
    };

    const formatArea = (area) => {
      return area ? `${area.toLocaleString()} sq ft` : 'Contact for details';
    };

    return (
      <motion.div
        variants={cardVariants}
        className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500"
      >
        <div className="relative h-64 bg-gray-200 overflow-hidden">
          {allImages.length > 0 ? (
            <>
              <img
                src={allImages[currentImageIndex]?.url}
                alt={allImages[currentImageIndex]?.alt}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
                    {currentImageIndex + 1}/{allImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <Warehouse className="w-16 h-16 text-gray-400" />
            </div>
          )}

          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="bg-white/90 backdrop-blur text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
              {details?.type?.replace('_', ' ') || warehouse.type?.replace('_', ' ') || 'Standard'}
            </span>
            {warehouse.featured && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                Featured
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">{warehouse.location || details?.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">{warehouse.rating || '4.5'}</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
            {warehouse.name}
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Warehouse className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">{formatArea(warehouse.total_area || details?.area)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">{warehouse.capacity || details?.capacity || 'Flexible'} units</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Thermometer className="w-4 h-4 text-purple-500" />
              <span className="text-gray-600">{details?.climate_controlled ? 'Climate Control' : 'Standard'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-gray-600">24/7 Security</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(warehouse.monthly_rate || warehouse.price || details?.price_per_day, warehouse.pricing_model || 'daily')}
              </span>
            </div>
            {allImages.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800">
                {allImages.length} Photos
              </span>
            )}
          </div>

          {/* Amenities */}
          {(warehouse.amenities || details?.amenities) && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {(warehouse.amenities || details?.amenities)?.slice(0, 3).map((amenity, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {amenity}
                  </span>
                ))}
                {(warehouse.amenities || details?.amenities)?.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    +{(warehouse.amenities || details?.amenities).length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          <Link href={`/warehouse-bookings/bookings/${warehouse.type}/${warehouse.id}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
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
        <Link href="/warehouse-bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition duration-300">
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Warehouse Categories</span>
        </Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-16 px-4 text-white rounded-3xl mb-12 overflow-hidden"
      >
        <div className="max-w-4xl mx-auto text-center z-10 relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight"
          >
            Premium Warehouse Solutions
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed"
          >
            Secure, flexible warehouse spaces for all your storage needs
          </motion.p>
        </div>
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
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
                <Warehouse className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Warehouses Available
              </h3>
              <p className="text-gray-600">
                We're currently updating our warehouse listings. Please check back soon for available spaces.
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Filters and Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search warehouses by location, type, or features..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>All Types</option>
                    <option>Cold Storage</option>
                    <option>Dry Storage</option>
                    <option>Bonded Warehouse</option>
                  </select>
                  <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option>Sort by Price</option>
                    <option>Price: Low to High</option>
                    <option>Price: High to Low</option>
                    <option>Size: Large to Small</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {warehouses.length} {warehouses.length === 1 ? 'Warehouse' : 'Warehouses'} Available
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Filters</span>
              </div>
            </div>

            {/* Warehouse Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {warehouses.map((warehouse) => {
                const details = warehouseDetails.find(detail => detail.warehouse_id === warehouse.id);
                return (
                  <WarehouseCard 
                    key={warehouse.id} 
                    warehouse={warehouse} 
                    details={details} 
                  />
                );
              })}
            </motion.div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}