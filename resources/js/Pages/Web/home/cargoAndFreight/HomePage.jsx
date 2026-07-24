import React from 'react'
import Header from "../client/ClientHeader"
import HeroSection from "../../components/cargoAndFreight/HeroSection"
import BrandSection from '../../components/cargoAndFreight/BrandSection'
import ContentSection from "../../components/cargoAndFreight/ContentSection"
import Footer from "../../layouts/Footer"

const HomePage = () => {
  return (
    <div>
      <Header />
      <HeroSection />
      <BrandSection />
      <ContentSection/>
      <Footer />
    </div>
  )
}

export default HomePage;