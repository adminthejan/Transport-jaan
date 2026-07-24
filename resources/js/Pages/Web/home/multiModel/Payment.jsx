import React from 'react'
import Header from "../client/ClientHeader";
import Hero from '../../components/multiModel/payment/Hero.jsx';

const Payment = ({ cart, pricing, journey, personal_info }) => {
  return (
    <div>
     <Header />
     <Hero cart={cart} pricing={pricing} journey={journey} personalInfo={personal_info} />
    </div>
  )
}

export default Payment