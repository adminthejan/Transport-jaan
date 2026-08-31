import React, { useState, useEffect, useCallback } from "react";
import { Link } from "@inertiajs/react";
import axios from "axios";
import { Bus as BusIcon, Car as CarIcon, Plane as PlaneIcon, Route as RouteIcon, Ship as ShipIcon, Ticket as TicketIcon, TrainFront as TrainIcon } from "lucide-react";
import car from "../../../assets/multiModel/planJourney/car-icon.svg";
import bus from "../../../assets/multiModel/planJourney/bus-icon.svg";
import ship from "../../../assets/multiModel/planJourney/ship-icon.svg";
import plane from "../../../assets/multiModel/planJourney/plane-icon.svg";
import tram from "../../../assets/multiModel/planJourney/tram-icon.svg";

import badgeCheck from "../../../assets/multiModel/planJourney/badgeCheck.svg";

import JourneyPlanner from "./JourneyPlanner";
import MapComponent from "./MapComponent";
import AvailableVehicles from "./AvailableVehicles";
import FilterSidebar from "../../vehicleList/FilterSidebar";
import BackButton from "../../BackBtn";
import VehicleListContent from "../../vehicleList/VehicleListContent";
import SearchForm from "../../vehicleList/SearchForm";
import SeaFilterSidebar from "../../seaVehicleList/FilterSidebar";
import SeaVehicleListContent from "../../seaVehicleList/SeaVehicleListContent";
import SeaSearchForm from "../../seaVehicleList/SearchForm";
import AirFilterSidebar from "../../airVehicleList/FilterSidebar";
import AirVehicleListContent from "../../airVehicleList/AirVehicleListContent";
import AirSearchForm from "../../airVehicleList/SearchForm";
import HeroDetailsTwo from "../../ticketBooking/HeroDetailsTwo";
import HeroDetails from "../../ticketBooking/HeroDetails";
import FlightForm from "../../ticketBooking/FlightForm";

const Hero = () => {
    // Active tab state: 'rental', 'ticket', or 'multimodal'
    const getInitialTab = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        return ['rental', 'ticket', 'multimodal'].includes(tab) ? tab : 'rental';
    };
    const [activeTab, setActiveTab] = useState(getInitialTab);

    // Vehicle Rental inline view state
    const getInitialRentalSubTab = () => {
        const params = new URLSearchParams(window.location.search);
        const subTab = params.get('subTab');
        return ['land', 'sea', 'air'].includes(subTab) ? subTab : 'land';
    };
    const [rentalSubTab, setRentalSubTab] = useState(getInitialRentalSubTab);
    const [vehicleListData, setVehicleListData] = useState(null);
    const [isLoadingRental, setIsLoadingRental] = useState(false);
    const [seaVehicleData, setSeaVehicleData] = useState(null);
    const [isLoadingSea, setIsLoadingSea] = useState(false);
    const [airVehicleData, setAirVehicleData] = useState(null);
    const [isLoadingAir, setIsLoadingAir] = useState(false);
    const [rentalFormData, setRentalFormData] = useState({
        pickupLocation: "", pickupDate: "", dropoffLocation: "", dropoffDate: "", brand: "", bodyType: "",
    });
    const [seaFormData, setSeaFormData] = useState({
        pickupLocation: "", pickupDate: "", dropoffLocation: "", dropoffDate: "", brand: "", bodyType: "",
    });
    const [airFormData, setAirFormData] = useState({
        pickupLocation: "", pickupDate: "", dropoffLocation: "", dropoffDate: "", brand: "", bodyType: "",
    });

    // Auto-fetch data on mount based on initial tab/subTab from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const subTab = params.get('subTab');

        if (tab === 'ticket') {
            if (subTab === 'train') {
                fetchTrainData();
            } else if (subTab === 'flight') {
                // flight tab uses FlightForm, no fetch needed
            } else {
                fetchBusData(); // default bus
            }
        } else if (tab === 'rental') {
            if (subTab === 'sea') {
                fetchSeaVehicles();
            } else if (subTab === 'air') {
                fetchAirVehicles();
            } else {
                fetchLandVehicles(); // default land
            }
        } else {
            fetchLandVehicles(); // default fallback
        }
    }, []);

    // Ticket Booking inline view state
    const [ticketSubTab, setTicketSubTab] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const subTab = params.get('subTab');
        return ['bus', 'train', 'flight'].includes(subTab) ? subTab : 'bus';
    });
    const [ticketData, setTicketData] = useState(null);
    const [isLoadingTicket, setIsLoadingTicket] = useState(false);
    const [trainData, setTrainData] = useState(null);
    const [isLoadingTrain, setIsLoadingTrain] = useState(false);

    // Keep the URL's tab/subTab query params in sync with the active tab so
    // that navigating away (e.g. into a bus/train preview page) and then
    // hitting browser "back" restores this exact tab instead of always
    // falling back to 'rental' (getInitialTab()'s default when tab= is absent).
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', activeTab);
        if (activeTab === 'rental') {
            params.set('subTab', rentalSubTab);
        } else if (activeTab === 'ticket') {
            params.set('subTab', ticketSubTab);
        } else {
            params.delete('subTab');
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
    }, [activeTab, rentalSubTab, ticketSubTab]);

    const handleVehicleRentalClick = async (e) => {
        e.preventDefault();
        setActiveTab('rental');
        if (rentalSubTab === 'land') {
            await fetchLandVehicles();
        } else if (rentalSubTab === 'sea') {
            await fetchSeaVehicles();
        } else if (rentalSubTab === 'air') {
            await fetchAirVehicles();
        }
    };

    // A truthy `params` forces a fresh fetch even if data is already loaded
    // (used when a filter changes) — without params this only fetches once
    // and caches, matching the original "load on tab open" behaviour.
    const buildQueryString = (params) => {
        if (!params) return '';
        const usp = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            usp.set(key, Array.isArray(value) ? value.join(',') : value);
        });
        const qs = usp.toString();
        return qs ? `?${qs}` : '';
    };

    const fetchLandVehicles = async (params = null) => {
        if (vehicleListData && !params) return;
        setIsLoadingRental(true);
        try {
            const res = await fetch(`/vehicleList/json${buildQueryString(params)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setVehicleListData(data);
        } catch (err) {
            console.error('Failed to load vehicle list:', err);
            alert('Failed to load vehicle list. Please try again.');
        } finally {
            setIsLoadingRental(false);
        }
    };

    const fetchSeaVehicles = async (params = null) => {
        if (seaVehicleData && !params) return;
        setIsLoadingSea(true);
        try {
            const res = await fetch(`/seaVehicleList/json${buildQueryString(params)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSeaVehicleData(data);
        } catch (err) {
            console.error('Failed to load sea vehicle list:', err);
            alert('Failed to load sea vehicles. Please try again.');
        } finally {
            setIsLoadingSea(false);
        }
    };

    const fetchAirVehicles = async (params = null) => {
        if (airVehicleData && !params) return;
        setIsLoadingAir(true);
        try {
            const res = await fetch(`/airVehicleList/json${buildQueryString(params)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAirVehicleData(data);
        } catch (err) {
            console.error('Failed to load air vehicle list:', err);
            alert('Failed to load air vehicles. Please try again.');
        } finally {
            setIsLoadingAir(false);
        }
    };

    // Filter sidebars call this instead of navigating away to the standalone
    // /vehicleList page (which was the actual bug — selecting a filter while
    // inside the Journey Planner sent you to a whole different page, and the
    // Vehicle Rental/Ticket Booking/Multimodal + Land/Sea/Air tabs live only
    // on this page, so they appeared to "disappear").
    const handleRentalFilterSearch = (nextParams) => {
        setRentalFormData(nextParams);
        fetchLandVehicles(nextParams);
    };

    const handleSeaFilterSearch = (nextParams) => {
        setSeaFormData(nextParams);
        fetchSeaVehicles(nextParams);
    };

    const handleAirFilterSearch = (nextParams) => {
        setAirFormData(nextParams);
        fetchAirVehicles(nextParams);
    };

    const handleRentalSubTabClick = async (subTab) => {
        setRentalSubTab(subTab);
        if (subTab === 'land') {
            await fetchLandVehicles();
        } else if (subTab === 'sea') {
            await fetchSeaVehicles();
        } else if (subTab === 'air') {
            await fetchAirVehicles();
        }
    };

    const handleTicketBookingClick = async (e) => {
        e.preventDefault();
        setActiveTab('ticket');
        // Load the currently selected sub-tab data
        if (ticketSubTab === 'bus') {
            await fetchBusData();
        } else if (ticketSubTab === 'train') {
            await fetchTrainData();
        }
    };

    const fetchBusData = async () => {
        if (ticketData) return;
        setIsLoadingTicket(true);
        try {
            const res = await fetch('/busTicketBookingDetails/json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTicketData(data);
        } catch (err) {
            console.error('Failed to load bus ticket data:', err);
            alert('Failed to load bus ticket booking. Please try again.');
        } finally {
            setIsLoadingTicket(false);
        }
    };

    const fetchTrainData = async () => {
        if (trainData) return;
        setIsLoadingTrain(true);
        try {
            const res = await fetch('/trainTicketBookingDetails/json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setTrainData(data);
        } catch (err) {
            console.error('Failed to load train ticket data:', err);
            alert('Failed to load train ticket booking. Please try again.');
        } finally {
            setIsLoadingTrain(false);
        }
    };

    const handleTicketSubTabClick = async (subTab) => {
        setTicketSubTab(subTab);
        if (subTab === 'bus') {
            await fetchBusData();
        } else if (subTab === 'train') {
            await fetchTrainData();
        }
    };

    const [startJourney, setStartJourney] = useState({ location: "", startDate: "", startTime: "", coordinates: null });
    const [addedStops, setAddedStops] = useState([]);
    const [endJourney, setEndJourney] = useState({ location: "", returnDate: "", returnTime: "", coordinates: null });
    const [trips, setTrips] = useState([
        {
            id: Date.now(),
            startJourney: { location: "", startDate: "", startTime: "", coordinates: null },
            endJourney: { location: "", returnDate: "", returnTime: "", coordinates: null },
            stops: []
        }
    ]);
    const [currentTripIndex, setCurrentTripIndex] = useState(0);
    const [mapInstance, setMapInstance] = useState(null);
    const [routePreference, setRoutePreference] = useState('balanced');
    const [showAlternatives, setShowAlternatives] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [routeDuration, setRouteDuration] = useState(0);
    const [segmentDurations, setSegmentDurations] = useState([]);
    const [showVehicles, setShowVehicles] = useState(false);
    const [availableCars, setAvailableCars] = useState([]);
    const [availableYachts, setAvailableYachts] = useState([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
    const [hasSelectedVehicles, setHasSelectedVehicles] = useState(false);

    // Check cart status on component mount and when returning to page
    useEffect(() => {
        checkCartStatus();
    }, []);

    const checkCartStatus = async () => {
        try {
            const response = await axios.get('/multiModel/cart');
            if (response.data.success) {
                const hasVehicles = response.data.cart?.selections?.length > 0;
                setHasSelectedVehicles(hasVehicles);
            }
        } catch (error) {
            console.log('Cart check:', error.response?.data?.message || 'No vehicles selected yet');
            setHasSelectedVehicles(false);
        }
    };

    useEffect(() => {
        const savedStart = localStorage.getItem("journeyStart");
        if (savedStart) {
            setStartJourney(JSON.parse(savedStart));
        }
        const savedStops = localStorage.getItem("journeyStops");
        if (savedStops) {
            setAddedStops(JSON.parse(savedStops));
        }
        const savedEnd = localStorage.getItem("journeyEnd");
        if (savedEnd) {
            setEndJourney(JSON.parse(savedEnd));
        }
        const savedTrips = localStorage.getItem("journeyTrips");
        if (savedTrips) {
            setTrips(JSON.parse(savedTrips));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("journeyStart", JSON.stringify(startJourney));
    }, [startJourney]);

    useEffect(() => {
        localStorage.setItem("journeyStops", JSON.stringify(addedStops));
    }, [addedStops]);

    useEffect(() => {
        localStorage.setItem("journeyEnd", JSON.stringify(endJourney));
    }, [endJourney]);

    useEffect(() => {
        localStorage.setItem("journeyTrips", JSON.stringify(trips));
    }, [trips]);

    const handleMapReady = useCallback((map) => {
        if (!mapInstance) {
            setMapInstance(map);
        }
    }, [mapInstance]);

    const handleLocationUpdate = (waypointIndex, locationData) => {
        const currentTrip = trips[currentTripIndex];
        const newTrips = [...trips];

        if (waypointIndex === 0) {
            newTrips[currentTripIndex] = {
                ...currentTrip,
                startJourney: {
                    ...currentTrip.startJourney,
                    location: locationData.name,
                    coordinates: locationData.coordinates
                }
            };
        } else if (waypointIndex === (currentTrip.stops.length + 1)) {
            newTrips[currentTripIndex] = {
                ...currentTrip,
                endJourney: {
                    ...currentTrip.endJourney,
                    location: locationData.name,
                    coordinates: locationData.coordinates
                }
            };
        } else {
            const newStops = [...currentTrip.stops];
            newStops[waypointIndex - 1] = {
                ...newStops[waypointIndex - 1],
                destination: locationData.name,
                coordinates: locationData.coordinates
            };
            newTrips[currentTripIndex] = {
                ...currentTrip,
                stops: newStops
            };
        }

        setTrips(newTrips);
    };

    const handleRouteCalculated = (duration, segments) => {
        setRouteDuration(duration);
        if (segments && segments.length > 0) {
            setSegmentDurations(segments);
        }
    };

    const storeJourneyInSession = async () => {
        // Build legs array from ALL trips
        const legs = [];

        // Process all trips, not just current one
        for (let tripIndex = 0; tripIndex < trips.length; tripIndex++) {
            const trip = trips[tripIndex];

            // Validate minimum requirements for each trip
            if (!trip.startJourney.location || !trip.startJourney.startDate || !trip.startJourney.startTime) {
                alert(`Please fill in start location, date, and time for Trip ${tripIndex + 1}.`);
                return false;
            }

            if (!trip.endJourney.location || !trip.endJourney.returnDate || !trip.endJourney.returnTime) {
                alert(`Please fill in end location, date, and time for Trip ${tripIndex + 1}.`);
                return false;
            }

            // Create first leg: start → first stop (or end if no stops)
            if (trip.stops && trip.stops.length > 0) {
                // First leg: start → first stop
                legs.push({
                    from_location: trip.startJourney.location,
                    to_location: trip.stops[0].destination || trip.endJourney.location,
                    start_date: trip.startJourney.startDate,
                    start_time: trip.startJourney.startTime,
                    end_date: trip.stops[0].departureDate || trip.endJourney.returnDate,
                    end_time: trip.stops[0].departureTime || trip.endJourney.returnTime,
                    vehicle_type: 'land', // Default, can be made dynamic later
                    trip_id: tripIndex // Add trip identifier
                });

                // Middle legs: stop to stop
                for (let i = 0; i < trip.stops.length - 1; i++) {
                    legs.push({
                        from_location: trip.stops[i].destination,
                        to_location: trip.stops[i + 1].destination,
                        start_date: trip.stops[i].departureDate || trip.stops[i].returnDate,
                        start_time: trip.stops[i].departureTime || trip.stops[i].returnTime,
                        end_date: trip.stops[i + 1].departureDate || trip.stops[i + 1].returnDate,
                        end_time: trip.stops[i + 1].departureTime || trip.stops[i + 1].returnTime,
                        vehicle_type: 'land',
                        trip_id: tripIndex // Add trip identifier
                    });
                }

                // Last leg: last stop → end
                const lastStop = trip.stops[trip.stops.length - 1];
                legs.push({
                    from_location: lastStop.destination,
                    to_location: trip.endJourney.location,
                    start_date: lastStop.returnDate || lastStop.departureDate,
                    start_time: lastStop.returnTime || lastStop.departureTime,
                    end_date: trip.endJourney.returnDate,
                    end_time: trip.endJourney.returnTime,
                    vehicle_type: 'land',
                    trip_id: tripIndex // Add trip identifier
                });
            } else {
                // Single leg: start → end (no stops)
                legs.push({
                    from_location: trip.startJourney.location,
                    to_location: trip.endJourney.location,
                    start_date: trip.startJourney.startDate,
                    start_time: trip.startJourney.startTime,
                    end_date: trip.endJourney.returnDate,
                    end_time: trip.endJourney.returnTime,
                    vehicle_type: 'land',
                    trip_id: tripIndex // Add trip identifier
                });
            }
        } // End of trip loop

        try {
            const response = await fetch('/multiModel/journey/store', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({ legs })
            });

            const data = await response.json();
            if (data.success) {
                console.log('✅ Journey stored in session successfully');
                return true;
            } else {
                console.error('❌ Failed to store journey:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Error storing journey:', error);
            return false;
        }
    };

    const fetchAvailableVehicles = async () => {
        setIsLoadingVehicles(true);

        // FIRST: Store ALL trips in session
        const stored = await storeJourneyInSession();
        if (!stored) {
            alert('Failed to store journey. Please check your journey details and try again.');
            setIsLoadingVehicles(false);
            return;
        }

        // Get current trip data
        const currentTrip = trips[currentTripIndex];
        console.log('Fetching vehicles for Trip', currentTripIndex + 1, 'of', trips.length);

        // Determine the date range for fetching vehicles (first leg)
        const startDate = currentTrip.startJourney.startDate;
        const startTime = currentTrip.startJourney.startTime;
        let endDate = currentTrip.endJourney.returnDate;
        let endTime = currentTrip.endJourney.returnTime;

        // If there are stops, use the first stop's date/time as the end of first leg
        if (currentTrip.stops && currentTrip.stops.length > 0) {
            endDate = currentTrip.stops[0].departureDate || currentTrip.endJourney.returnDate;
            endTime = currentTrip.stops[0].departureTime || currentTrip.endJourney.returnTime;
        }

        try {
            // Fetch land vehicles (cars)
            const carsResponse = await fetch('/multiModel/fetch-available-vehicles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    vehicleType: 'land'
                })
            });

            const carsData = await carsResponse.json();
            if (carsData.success) {
                setAvailableCars(carsData.vehicles);
            }

            // Fetch sea vehicles (yachts)
            const yachtsResponse = await fetch('/multiModel/fetch-available-vehicles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    startDate,
                    startTime,
                    endDate,
                    endTime,
                    vehicleType: 'sea'
                })
            });

            const yachtsData = await yachtsResponse.json();
            if (yachtsData.success) {
                setAvailableYachts(yachtsData.vehicles);
            }

            setShowVehicles(true);
        } catch (error) {
            console.error('Error fetching vehicles:', error);
            alert('Failed to fetch available vehicles. Please try again.');
        } finally {
            setIsLoadingVehicles(false);
        }
    };

    const handlePrintJourney = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Journey Plan - ${startJourney.location} to ${endJourney.location}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    h1 { color: #0955AC; }
                    .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                    .location { font-weight: bold; color: #333; }
                    .details { color: #666; margin-top: 5px; }
                    .stops { margin: 20px 0; }
                    .stop { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
                </style>
            </head>
            <body>
                <h1>🗺️ Multi-Model Journey Plan</h1>
                <div class="section">
                    <h2>🟢 Start Location</h2>
                    <div class="location">${startJourney.location || 'Not set'}</div>
                    <div class="details">Date: ${startJourney.startDate || 'Not set'} | Time: ${startJourney.startTime || 'Not set'}</div>
                </div>
                ${addedStops.length > 0 ? `
                    <div class="stops">
                        <h2>🔵 Stops</h2>
                        ${addedStops.map((stop, i) => `
                            <div class="stop">
                                <div class="location">Stop ${i + 1}: ${stop.destination || 'Not set'}</div>
                                <div class="details">Departure: ${stop.departureDate || 'Not set'} at ${stop.departureTime || 'Not set'}</div>
                                <div class="details">Return: ${stop.returnDate || 'Not set'} at ${stop.returnTime || 'Not set'}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="section">
                    <h2>🔴 End Location</h2>
                    <div class="location">${endJourney.location || 'Not set'}</div>
                    <div class="details">Date: ${endJourney.returnDate || 'Not set'} | Time: ${endJourney.returnTime || 'Not set'}</div>
                </div>
                <div style="margin-top: 30px; color: #666; font-size: 12px;">
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Transport Jaan - Multi-Model Journey Planner</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleShareJourney = () => {
        const journeyData = {
            start: startJourney,
            stops: addedStops,
            end: endJourney
        };
        const encodedData = btoa(JSON.stringify(journeyData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?journey=${encodedData}`;

        if (navigator.share) {
            navigator.share({
                title: 'My Journey Plan',
                text: `From ${startJourney.location} to ${endJourney.location}`,
                url: shareUrl
            }).catch(err => console.log('Share failed', err));
        } else {
            navigator.clipboard.writeText(shareUrl);
            alert('Journey link copied to clipboard!');
        }
    };

    const handleExportJSON = () => {
        const journeyData = {
            start: startJourney,
            stops: addedStops,
            end: endJourney,
            exportDate: new Date().toISOString()
        };
        const dataStr = JSON.stringify(journeyData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journey_${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="bg-[#F6F7F9] min-h-screen">

            <div className="relative flex items-center pt-6 sm:pt-8 px-5 md:px-10 max-w-[1800px] mx-auto">
                {/* Back Button - left corner */}
                <div className="absolute left-5 md:left-[70px]">
                    <BackButton to="/" />
                </div>

                {/* Top Navigation Buttons - centered */}
                <div className="flex justify-center w-full">
                    <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1.5 rounded-full bg-[#F1F5F9] shadow-inner">
                        <button
                            onClick={handleVehicleRentalClick}
                            className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-[600] text-[11px] sm:text-[14px] poppins transition-all ${activeTab === 'rental'
                                ? 'bg-[#0955AC] text-white shadow-md'
                                : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                }`}
                        >
                            <CarIcon className="w-4 h-4 shrink-0" />
                            Vehicle Rental
                        </button>
                        <button
                            onClick={handleTicketBookingClick}
                            className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-[600] text-[11px] sm:text-[14px] poppins transition-all ${activeTab === 'ticket'
                                ? 'bg-[#0955AC] text-white shadow-md'
                                : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                }`}
                        >
                            <TicketIcon className="w-4 h-4 shrink-0" />
                            Ticket Booking
                        </button>
                        <button
                            onClick={() => setActiveTab('multimodal')}
                            className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full font-[600] text-[11px] sm:text-[14px] poppins transition-all ${activeTab === 'multimodal'
                                ? 'bg-[#0955AC] text-white shadow-md'
                                : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                }`}
                        >
                            <RouteIcon className="w-4 h-4 shrink-0" />
                            Multimodal
                        </button>
                    </div>
                </div>

            </div>

            {/* Vehicle Rental Inline View */}
            {activeTab === 'rental' && (
                <div className="px-5 md:px-10 py-6 max-w-[1800px] mx-auto">
                    {/* Sub-tab buttons: Land, Sea, Air */}
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-[#F1F5F9] shadow-inner">
                            <button
                                onClick={() => handleRentalSubTabClick('land')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${rentalSubTab === 'land'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <CarIcon className="w-3.5 h-3.5 shrink-0" />
                                Land
                            </button>
                            <button
                                onClick={() => handleRentalSubTabClick('sea')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${rentalSubTab === 'sea'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <ShipIcon className="w-3.5 h-3.5 shrink-0" />
                                Sea
                            </button>
                            <button
                                onClick={() => handleRentalSubTabClick('air')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${rentalSubTab === 'air'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <PlaneIcon className="w-3.5 h-3.5 shrink-0" />
                                Air
                            </button>
                        </div>
                    </div>

                    {/* Land Sub-tab Content */}
                    {rentalSubTab === 'land' && (
                        <>
                            {isLoadingRental ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0955AC]"></div>
                                </div>
                            ) : vehicleListData ? (
                                <div className="flex gap-6">
                                    <FilterSidebar searchParams={rentalFormData} onSearch={handleRentalFilterSearch} />
                                    <div className="flex-1 min-w-0">
                                        <div className="max-w-[1200px] mb-6">
                                            <SearchForm
                                                formData={rentalFormData}
                                                onFormChange={setRentalFormData}
                                                onSearch={handleRentalFilterSearch}
                                            />
                                        </div>
                                        <VehicleListContent
                                            vehicles={vehicleListData.vehicles}
                                            authUser={vehicleListData.auth?.user}
                                            likedVehicleIds={vehicleListData.likedVehicleIds}
                                            searchParams={{
                                                pickupLocation: rentalFormData.pickupLocation,
                                                pickupDate: rentalFormData.pickupDate,
                                                dropoffLocation: rentalFormData.dropoffLocation,
                                                dropoffDate: rentalFormData.dropoffDate,
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* Sea Sub-tab Content */}
                    {rentalSubTab === 'sea' && (
                        <>
                            {isLoadingSea ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0955AC]"></div>
                                </div>
                            ) : seaVehicleData ? (
                                <div className="flex gap-6">
                                    <SeaFilterSidebar searchParams={seaFormData} onSearch={handleSeaFilterSearch} />
                                    <div className="flex-1 min-w-0">
                                        <div className="max-w-[1200px] mb-6">
                                            <SeaSearchForm formData={seaFormData} onFormChange={setSeaFormData} onSearch={handleSeaFilterSearch} />
                                        </div>
                                        <SeaVehicleListContent
                                            vehicles={seaVehicleData.vehicles}
                                            authUser={seaVehicleData.auth?.user}
                                            likedVehicleIds={seaVehicleData.likedVehicleIds}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {/* Air Sub-tab Content */}
                    {rentalSubTab === 'air' && (
                        <>
                            {isLoadingAir ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0955AC]"></div>
                                </div>
                            ) : airVehicleData ? (
                                <div className="flex gap-6">
                                    <AirFilterSidebar searchParams={airFormData} onSearch={handleAirFilterSearch} />
                                    <div className="flex-1 min-w-0">
                                        <div className="max-w-[1200px] mb-6">
                                            <AirSearchForm formData={airFormData} onFormChange={setAirFormData} onSearch={handleAirFilterSearch} />
                                        </div>
                                        <AirVehicleListContent
                                            vehicles={airVehicleData.vehicles}
                                            authUser={airVehicleData.auth?.user}
                                            likedVehicleIds={airVehicleData.likedVehicleIds}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            )}

            {/* Ticket Booking Inline View */}
            {activeTab === 'ticket' && (
                <div className="px-5 md:px-10 py-6 max-w-[1800px] mx-auto">
                    {/* Sub-tab buttons: Bus, Train, Flight */}
                    <div className="flex justify-center mb-4 sm:mb-6">
                        <div className="inline-flex flex-wrap justify-center items-center gap-1 p-1 rounded-full bg-[#F1F5F9] shadow-inner">
                            <button
                                onClick={() => handleTicketSubTabClick('bus')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${ticketSubTab === 'bus'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <BusIcon className="w-3.5 h-3.5 shrink-0" />
                                Bus
                            </button>
                            <button
                                onClick={() => handleTicketSubTabClick('train')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${ticketSubTab === 'train'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <TrainIcon className="w-3.5 h-3.5 shrink-0" />
                                Train
                            </button>
                            <button
                                onClick={() => handleTicketSubTabClick('flight')}
                                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-[600] text-[11px] sm:text-[13px] poppins transition-all ${ticketSubTab === 'flight'
                                    ? 'bg-[#0955AC] text-white shadow-sm'
                                    : 'text-[#475569] hover:text-[#0955AC] hover:bg-white/70'
                                    }`}
                            >
                                <PlaneIcon className="w-3.5 h-3.5 shrink-0" />
                                Flight
                            </button>
                        </div>
                    </div>

                    {/* Bus Sub-tab Content */}
                    {ticketSubTab === 'bus' && (
                        <>
                            {isLoadingTicket ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0955AC]"></div>
                                </div>
                            ) : ticketData ? (
                                <HeroDetailsTwo
                                    stations={ticketData.stations}
                                    schedules={ticketData.schedules}
                                    returnSchedules={ticketData.returnSchedules}
                                    route={ticketData.route}
                                    nearbyDates={ticketData.nearbyDates}
                                    searchParams={ticketData.searchParams}
                                />
                            ) : null}
                        </>
                    )}

                    {/* Train Sub-tab Content */}
                    {ticketSubTab === 'train' && (
                        <>
                            {isLoadingTrain ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0955AC]"></div>
                                </div>
                            ) : trainData ? (
                                <HeroDetails
                                    outboundSchedules={trainData.outboundSchedules}
                                    returnSchedules={trainData.returnSchedules}
                                    searchParams={trainData.searchParams}
                                    fromStationName={trainData.fromStationName}
                                    toStationName={trainData.toStationName}
                                    hasActiveFilters={trainData.hasActiveFilters}
                                    isShowingAllTrains={trainData.isShowingAllTrains}
                                    inline={true}
                                />
                            ) : null}
                        </>
                    )}

                    {/* Flight Sub-tab Content */}
                    {ticketSubTab === 'flight' && (
                        <FlightForm />
                    )}
                </div>
            )}

            {/* Multimodal Journey Planner View */}
            {activeTab === 'multimodal' && <div className="grid grid-cols-1 xl:grid-cols-3 px-5 md:px-10 py-10 gap-10">
                <div className="xl:col-span-2 flex flex-col gap-10">
                    <JourneyPlanner
                        startJourney={startJourney}
                        setStartJourney={setStartJourney}
                        addedStops={addedStops}
                        setAddedStops={setAddedStops}
                        endJourney={endJourney}
                        setEndJourney={setEndJourney}
                        trips={trips}
                        setTrips={setTrips}
                        currentTripIndex={currentTripIndex}
                        setCurrentTripIndex={setCurrentTripIndex}
                        routeDuration={routeDuration}
                        segmentDurations={segmentDurations}
                        onFindVehicles={fetchAvailableVehicles}
                        isLoadingVehicles={isLoadingVehicles}
                    />

                    <div className="flex flex-row items-center text-[#6F6F6F] text-[10px] font-[500] latto mb-16">
                        <div className="relative flex flex-col items-center justify-center">
                            <div className="size-[20px] border-[1px] border-[#C6C6C6] rounded-full"></div>
                            <h3 className="absolute top-6">From</h3>
                            {trips[currentTripIndex]?.startJourney.location && <h4 className="absolute top-10 text-[8px] text-center w-24">{trips[currentTripIndex].startJourney.location}</h4>}
                        </div>

                        {trips[currentTripIndex]?.stops.length > 0 ? trips[currentTripIndex].stops.map((stop, index) => (
                            <div key={stop.id} className="relative flex flex-col justify-center w-full h-[1px] bg-[#C6C6C6]">
                                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col justify-center items-center gap-1">
                                    <div className=" size-[16px] bg-[#C6C6C6] rounded-full" />
                                    <h3 className="absolute top-6 text-nowrap">Stop {index + 1}</h3>
                                    {stop.destination && <h4 className="absolute top-10 text-[8px] text-center w-24">{stop.destination}</h4>}
                                </div>
                            </div>
                        )) : (
                            <div className="relative flex flex-col justify-center w-full h-[1px] bg-[#C6C6C6]"></div>
                        )}

                        <div className="relative flex flex-col items-center justify-center">
                            <div className="size-[20px] border-[1px] border-[#C6C6C6] rounded-full"></div>
                            <h3 className="absolute top-6">To</h3>
                            {trips[currentTripIndex]?.endJourney.location && <h4 className="absolute top-10 text-[8px] text-center w-24">{trips[currentTripIndex].endJourney.location}</h4>}
                        </div>
                    </div>

                    {/* Review Journey Button */}
                    <div className="flex justify-center items-center mt-5">
                        {hasSelectedVehicles ? (
                            <Link
                                href="/multiModel/reviewJourney"
                                className="w-full max-w-[400px] h-[50px] bg-[#0955AC] hover:bg-[#073d80] rounded-[10px] flex justify-center items-center text-[16px] font-[700] text-[#FFFFFF] transition-colors shadow-lg"
                            >
                                📋 Review Journey & Proceed to Checkout
                            </Link>
                        ) : (
                            <div
                                className="w-full max-w-[400px] h-[50px] bg-gray-400 rounded-[10px] flex justify-center items-center text-[16px] font-[700] text-[#FFFFFF] cursor-not-allowed opacity-60"
                                title="Please select at least one vehicle first"
                            >
                                📋 Review Journey & Proceed to Checkout
                            </div>
                        )}
                    </div>

                    {!showVehicles ? (
                        // Available Vehicles Card
                        <div className="relative w-full md:h-[400px] shadow-lg bg-[#F4F3F3] rounded-[20px] pb-20 md:pb-0 p-5 md:p-10 poppins flex flex-col gap-5">
                            <div>
                                <h1 className="bebas-neue text-[50px]/[100%]">
                                    Available Vehicles
                                </h1>
                                <h3 className="text-[14px] font-[500] text-[#00000080]">
                                    Add Journey → Click Find Vehicles → Go!
                                </h3>
                            </div>

                            <div className="text-[18px] text-[#0955AC] font-[700] figtree mt-5 flex flex-col md:flex-row justify-between gap-5 items-center w-full">
                                <Link href="/multiModel/available-vehicles" className="w-full">
                                    <div className="relative w-full md:w-[108px] md:h-[118px] bg-[#0955AC1A] rounded-[10px] flex flex-col justify-center items-center px-4 py-2">
                                        <img src={car} alt="car icon" />
                                        <h1>Car</h1>
                                        <div className="absolute top-[-10px] right-[-10px] w-[45px] h-[25px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[700] flex justify-center items-center p-1">
                                            145
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/multiModel/available-vehicles" className="w-full">
                                    <div className="relative w-full md:w-[108px] md:h-[118px] bg-[#0955AC1A] rounded-[10px] flex flex-col justify-center items-center px-4 py-2">
                                        <img src={bus} alt="bus icon" />
                                        <h1>Bus</h1>
                                        <div className="absolute top-[-10px] right-[-10px] w-[45px] h-[25px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[700] flex justify-center items-center p-1">
                                            10
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/multiModel/available-vehicles" className="w-full">
                                    <div className="relative w-full md:w-[108px] md:h-[118px] bg-[#0955AC1A] rounded-[10px] flex flex-col justify-center items-center px-4 py-2">
                                        <img src={tram} alt="tram icon" />
                                        <h1>Train</h1>
                                        <div className="absolute top-[-10px] right-[-10px] w-[45px] h-[25px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[700] flex justify-center items-center p-1">
                                            3
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/multiModel/available-vehicles" className="w-full">
                                    <div className="relative w-full md:w-[108px] md:h-[118px] bg-[#0955AC1A] rounded-[10px] flex flex-col justify-center items-center px-4 py-2">
                                        <img src={plane} alt="plane icon" />
                                        <h1>Plane</h1>
                                        <div className="absolute top-[-10px] right-[-10px] w-[45px] h-[25px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[700] flex justify-center items-center p-1">
                                            1
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/multiModel/available-vehicles" className="w-full">
                                    <div className="relative w-full md:w-[108px] md:h-[118px] bg-[#0955AC1A] rounded-[10px] flex flex-col justify-center items-center px-4 py-2">
                                        <img src={ship} alt="ship icon" />
                                        <h1>Yatch</h1>
                                        <div className="absolute top-[-10px] right-[-10px] w-[45px] h-[25px] bg-[#0955AC] rounded-[5px] text-[#FFFFFF] font-[700] flex justify-center items-center p-1">
                                            1
                                        </div>
                                    </div>
                                </Link>
                            </div>
                            <div className="absolute md:bottom-5 bottom-2 right-5 flex flex-row gap-2 text-[15px] font-[500] text-[#000000] items-center">
                                <img src={badgeCheck} alt="badge check icon" />
                                <h1>
                                    All the{" "}
                                    <span className="text-[#0955AC]">vehicles</span>{" "}
                                    are{" "}
                                    <span className="text-[#0955AC]">verified</span>{" "}
                                </h1>
                            </div>
                        </div>
                    ) : (
                        <AvailableVehicles
                            onBackToJourney={() => setShowVehicles(false)}
                            currentTripIndex={currentTripIndex}
                            trips={trips}
                            onVehicleSelect={(vehicleData) => {
                                console.log("Selected vehicle:", vehicleData);
                                // Handle vehicle selection here
                            }}
                            availableCars={availableCars}
                            availableYachts={availableYachts}
                        />
                    )}
                </div>

                {/* Sticky map side panel */}
                <div className="xl:col-span-1">
                    <div className="xl:sticky xl:top-6 w-full h-[320px] xl:h-[calc(100vh-3rem)] xl:max-h-[820px] bg-[#F4F3F3] shadow-lg rounded-[20px] overflow-hidden mt-10 xl:mt-0">
                        {/* OpenStreetMap Component */}
                        <MapComponent
                            startLocation={trips[currentTripIndex]?.startJourney.coordinates ? {
                                name: trips[currentTripIndex].startJourney.location,
                                coordinates: trips[currentTripIndex].startJourney.coordinates
                            } : null}
                            endLocation={trips[currentTripIndex]?.endJourney.coordinates ? {
                                name: trips[currentTripIndex].endJourney.location,
                                coordinates: trips[currentTripIndex].endJourney.coordinates
                            } : null}
                            stops={trips[currentTripIndex]?.stops || []}
                            onMapReady={handleMapReady}
                            onLocationUpdate={handleLocationUpdate}
                            onRouteCalculated={handleRouteCalculated}
                            showAlternatives={showAlternatives}
                            routePreference={routePreference}
                        />
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default Hero;
