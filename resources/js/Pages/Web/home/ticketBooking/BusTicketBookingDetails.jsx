import React from 'react'
import Header from '../client/ClientHeader';
import HeroDetailsTwo from '../../components/ticketBooking/HeroDetailsTwo';
import Footer from '../../layouts/Footer';

const BusTicketBookingDetails = ({ stations, schedules, returnSchedules, searchParams }) => {
  return (
    <div>
     <Header />
     <HeroDetailsTwo
       stations={stations}
       schedules={schedules}
       returnSchedules={returnSchedules}
       searchParams={searchParams}
     />
     <Footer />
    </div>
  )
}

export default BusTicketBookingDetails;