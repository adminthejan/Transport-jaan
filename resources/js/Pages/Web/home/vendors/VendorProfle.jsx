import React, { useState } from 'react'
import Header from '../client/ClientHeader'
import BackButton from "../../components/BackBtn";
import InformationCard from '../../components/vendors/profile/InformationCard';
import Btns from '../../components/vendors/profile/Btns';
import ServiceContent from '../../components/vendors/profile/ServiceContent';

const VendorProfile = ({ vendor, vendorProfile, services, landVehicles, seaVehicles, airVehicles, warehouseUnits, courierServices, flightSchedules, trainSchedules, stats, authUser, likedVehicleIds = [], likedWarehouseIds = [] }) => {
    // Set initial service based on vendor's registered services
    const firstService = services.length > 0 ? services[0].category_name : 'Vehicle Rental'
    const [activeService, setActiveService] = useState(firstService);
    const [activeMode, setActiveMode] = useState('Land');

    return (
        <div className='min-h-screen'>
            <Header />
            <div className='flex flex-col sm:flex-row gap-4 sm:gap-8 items-start sm:items-center px-4 sm:px-6 xl:px-10 py-4 sm:py-6'>
                <div>
                    <BackButton />
                </div>
                <div className='figtree font-bold text-[26px] sm:text-[30px] lg:text-[35px] leading-tight'>
                    Profile Information
                </div>
            </div>

            <InformationCard
                vendor={vendor}
                vendorProfile={vendorProfile}
                stats={stats}
            />

            <Btns
                services={services}
                initialService={activeService}
                initialMode={activeMode}
                onServiceChange={setActiveService}
                onModeChange={setActiveMode}
            />

            <ServiceContent
                activeService={activeService}
                activeMode={activeMode}
                services={services}
                landVehicles={landVehicles}
                seaVehicles={seaVehicles}
                airVehicles={airVehicles}
                warehouseUnits={warehouseUnits}
                courierServices={courierServices}
                flightSchedules={flightSchedules}
                trainSchedules={trainSchedules}
                authUser={authUser}
                likedVehicleIds={likedVehicleIds}
                likedWarehouseIds={likedWarehouseIds}
            />
        </div>
    )
}

export default VendorProfile