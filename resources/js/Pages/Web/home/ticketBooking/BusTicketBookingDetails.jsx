import React from 'react'
import { Head } from '@inertiajs/react';
import Header from '../client/ClientHeader';
import { ModuleTabs, TicketSubTabs } from '../../components/ModuleTabs';
import HeroDetailsTwo from '../../components/ticketBooking/HeroDetailsTwo';
import Footer from '../../layouts/Footer';

const BusTicketBookingDetails = ({ stations, schedules, returnSchedules, route, nearbyDates, searchParams }) => {
  return (
    <div className="bg-[#F6F7F9] min-h-screen">
     <Head title="Bus Tickets - Transport Jaan" />
     <Header />
     <div className="pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
       <ModuleTabs active="ticket" />
       <div className="mt-4 sm:mt-6">
         <TicketSubTabs active="bus" />
       </div>
     </div>
     <HeroDetailsTwo
       stations={stations}
       schedules={schedules}
       returnSchedules={returnSchedules}
       route={route}
       nearbyDates={nearbyDates}
       searchParams={searchParams}
     />
     <Footer />
    </div>
  )
}

export default BusTicketBookingDetails;