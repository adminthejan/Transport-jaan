import React from 'react'
import { Head } from '@inertiajs/react';
import Header from '../client/ClientHeader';
import HeroDetailsTwo from '../../components/ticketBooking/HeroDetailsTwo';
import Footer from '../../layouts/Footer';

const BusTicketBookingDetails = ({ stations, schedules, returnSchedules, route, nearbyDates, searchParams }) => {
  return (
    <div className="bg-[#F6F7F9] min-h-screen">
     <Head title="Bus Tickets - Transport Jaan" />
     <Header />
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