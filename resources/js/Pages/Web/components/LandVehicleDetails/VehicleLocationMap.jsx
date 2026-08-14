import React, { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBWjVf-wK6rdmSON8eOXJCgxq2MI10QasE"; // fallback only; prefer env

/**
 * Shows the pick-up (and, if provided, drop-off) location typed into the
 * vehicle rental booking form. Vehicle bookings only store free-text
 * addresses (no station catalog like Bus/Train), so this geocodes the
 * strings client-side via the Directions/Geocoding services instead of
 * relying on pre-stored coordinates.
 */
const VehicleLocationMap = ({ pickupLocation, dropoffLocation, className = "" }) => {
    const mapRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const apiKey = (import.meta?.env?.VITE_GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY || "").trim();

        if (!apiKey) {
            setError(true);
            return;
        }

        if (window.google && window.google.maps) {
            setMapLoaded(true);
            return;
        }

        const existingScript = document.getElementById("google-maps-script");
        if (existingScript) {
            existingScript.addEventListener("load", () => setMapLoaded(true));
            existingScript.addEventListener("error", () => setError(true));
            return;
        }

        const script = document.createElement("script");
        script.id = "google-maps-script";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapLoaded(true);
        script.onerror = () => setError(true);
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!mapLoaded || !mapRef.current) return;
        const pickup = (pickupLocation || "").trim();
        const dropoff = (dropoffLocation || "").trim();
        if (!pickup) return;

        setNotFound(false);

        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 7.8731, lng: 80.7718 },
                zoom: 8,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
            });

            window.google.maps.event.addListenerOnce(map, "idle", () => {
                if (dropoff && dropoff !== pickup) {
                    const directionsService = new window.google.maps.DirectionsService();
                    const directionsRenderer = new window.google.maps.DirectionsRenderer({
                        polylineOptions: {
                            strokeColor: "#0955AC",
                            strokeOpacity: 0.85,
                            strokeWeight: 5,
                        },
                    });
                    directionsRenderer.setMap(map);

                    directionsService.route(
                        { origin: pickup, destination: dropoff, travelMode: window.google.maps.TravelMode.DRIVING },
                        (result, status) => {
                            if (status === "OK") {
                                directionsRenderer.setDirections(result);
                            } else {
                                setNotFound(true);
                            }
                        }
                    );
                } else {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode({ address: pickup }, (results, status) => {
                        if (status === "OK" && results[0]) {
                            map.setCenter(results[0].geometry.location);
                            map.setZoom(14);
                            new window.google.maps.Marker({ position: results[0].geometry.location, map, title: pickup });
                        } else {
                            setNotFound(true);
                        }
                    });
                }
            });
        } catch (e) {
            console.error("VehicleLocationMap init error:", e);
            setError(true);
        }
    }, [mapLoaded, pickupLocation, dropoffLocation]);

    if (!(pickupLocation || "").trim()) {
        return null;
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 text-sm ${className}`} style={{ minHeight: 220 }}>
                Map unavailable
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-xl border border-gray-200 ${className}`} style={{ minHeight: 220 }}>
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: 220 }} />
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                    Loading map…
                </div>
            )}
            {mapLoaded && notFound && (
                <div className="absolute top-2 left-2 right-2 bg-white/95 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-amber-700 shadow">
                    Couldn't locate that address on the map yet — keep typing a more specific location.
                </div>
            )}
        </div>
    );
};

export default VehicleLocationMap;
