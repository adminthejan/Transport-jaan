import React, { useState } from 'react'
import { usePage, router } from '@inertiajs/react';
import Card from "./Card";
import { logVendorButtonClick } from '../../../../../utils/vendorActivityLogger';

const CardDashboard = () => {
  const { auth } = usePage().props;
  const approvedSlugs = auth?.user?.approved_service_slugs || [];
  const [showModal, setShowModal] = useState(false);
  const [blockedService, setBlockedService] = useState('');

  const showAccessMessage = (serviceName) => {
    logVendorButtonClick('open_service_access_modal', {
      screen: 'vendor_main_dashboard',
      serviceName,
      description: `Vendor attempted to open ${serviceName} without access.`,
    });

    setBlockedService(serviceName);
    setShowModal(true);
  };

  const getServiceSlug = (serviceName) => {
    const serviceMap = {
      'Vehicle Rental': 'vehicle-rental',
      'Ticket Booking': 'aviation-service',
      'Courier Service': 'courier-services',
      'Warehousing': 'warehousing',
      'Freight': 'waterborne-transport',
      'Multimodal': 'multimodal',
    };
    return serviceMap[serviceName] || '';
  };

  const handleRegister = () => {
    const serviceSlug = getServiceSlug(blockedService);
    logVendorButtonClick('register_blocked_service', {
      screen: 'vendor_main_dashboard',
      serviceName: blockedService,
      metadata: { service_slug: serviceSlug },
      description: `Vendor clicked Register Service for ${blockedService}.`,
    });

    setShowModal(false);
    router.visit(route('vendor.profile.step2', { service: serviceSlug }));
  };

  const handleCancel = () => {
    logVendorButtonClick('cancel_blocked_service_modal', {
      screen: 'vendor_main_dashboard',
      serviceName: blockedService,
      description: `Vendor cancelled blocked-service modal for ${blockedService}.`,
    });

    setShowModal(false);
    setBlockedService('');
  };

  const canAccessService = (serviceKey) => {
    switch (serviceKey) {
      case 'vehicle':
        return approvedSlugs.includes('vehicle-rental');
      case 'ticket':
        return approvedSlugs.includes('aviation-service') || approvedSlugs.includes('railway-service');
      case 'courier':
        return approvedSlugs.includes('courier-services');
      case 'warehouse':
        return approvedSlugs.includes('warehousing');
      case 'freight':
        return approvedSlugs.includes('waterborne-transport');
      case 'multimodal':
        return approvedSlugs.includes('vehicle-rental')
          || approvedSlugs.includes('aviation-service')
          || approvedSlugs.includes('railway-service')
          || approvedSlugs.includes('waterborne-transport');
      default:
        return false;
    }
  };

  const services = [
    { 
      key: 'vehicle',
      title: 'Vehicle Rental', 
      description: 'Rent vehicles for your transportation needs.',
      // subOptions: ['Land', 'Air', 'Sea']   //  Added sub options
    },
    { key: 'ticket', title: 'Ticket Booking', description: 'Book tickets for travel and events.' },
    { key: 'courier', title: 'Courier Service', description: 'Send and track packages efficiently.' },
    { key: 'warehouse', title: 'Warehousing', description: 'Rent warehouse space for storage.' },
    { key: 'freight', title: 'Freight', description: 'Manage freight shipments and logistics.' },
    { key: 'multimodal', title: 'Multimodal', description: 'Handle multimodal transportation solutions.' },
  ];

  return (
    <div className='flex flex-col items-center px-4 py-8 sm:px-6 lg:px-8 xl:py-10 relative h-full'>
      {/* Access Denied Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Not Registered</h3>
            <p className="text-gray-600 mb-6">
              To access <span className="font-semibold text-[#0955AC]">{blockedService}</span>, please register this service and wait for admin verification.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRegister}
                className="px-4 py-2 bg-[#0955AC] text-white rounded-lg hover:bg-[#074291] font-medium transition"
              >
                Register Service
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-[1280px] mb-8">
        <p className="poppins text-[13px] font-[700] uppercase tracking-wide text-[#0955AC]">Vendor dashboard</p>
        <h1 className="poppins mt-1 text-[30px] font-[700] leading-tight text-slate-900 sm:text-[34px]">
          Hello, {String(auth?.user?.name || "there").split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">Pick a service to manage your bookings, units and earnings.</p>
      </div>
      <div className="grid w-full max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => (
          <Card
            key={service.key}
            index={index + 1}
            title={service.title}
            description={service.description}
            canAccess={canAccessService(service.key)}
            onAccessDenied={showAccessMessage}
            subOptions={service.subOptions}   //  Pass subOptions
          />
        ))}
      </div>
    </div>
  );
};

export default CardDashboard;