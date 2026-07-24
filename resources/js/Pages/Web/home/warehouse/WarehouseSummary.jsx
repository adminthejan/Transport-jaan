import React from 'react'
import Header from "../client/ClientHeader"
import BookingSummary from '../../components/warehouseBooking/bookingSummary'

const WarehouseSummary = ({ booking }) => {
  return (
    <div>
      <BookingSummary booking={booking} />
    </div>
  )
}

export default WarehouseSummary;