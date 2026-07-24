import React, { useEffect, useRef, useState } from "react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBWjVf-wK6rdmSON8eOXJCgxq2MI10QasE"; // fallback only; prefer env

/**
 * Small, self-contained route map for a single origin -> destination leg
 * (used on the Bus/Train ticket preview pages). Reuses the same Google Maps
 * JS API loading pattern as multiModel/planJourney/MapComponent.jsx so the
 * script tag is shared/de-duplicated if both ever render on one page.
 *
 * `route` shape: { origin: {lat,lng,label}, destination: {lat,lng,label} }
 */
const TripRouteMap = ({ route, className = "" }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [error, setError] = useState(false);

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
        if (!mapLoaded || !mapRef.current || !route?.origin || !route?.destination) return;

        try {
            const { origin, destination } = route;
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(origin);
            bounds.extend(destination);

            const map = new window.google.maps.Map(mapRef.current, {
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
            });
            map.fitBounds(bounds, 60);
            mapInstanceRef.current = map;

            const makeMarker = (position, label, color) =>
                new window.google.maps.Marker({
                    position,
                    map,
                    title: label,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    },
                });

            makeMarker(origin, origin.label, "#0955AC");
            makeMarker(destination, destination.label, "#EF3826");

            // Try a real driving route first; fall back to a straight line
            // between the two stations if directions can't be calculated
            // (e.g. no road path, over API quota).
            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                suppressMarkers: true,
                preserveViewport: true,
                polylineOptions: {
                    strokeColor: "#0955AC",
                    strokeOpacity: 0.85,
                    strokeWeight: 5,
                },
            });

            directionsService.route(
                {
                    origin,
                    destination,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === "OK") {
                        directionsRenderer.setMap(map);
                        directionsRenderer.setDirections(result);
                    } else {
                        new window.google.maps.Polyline({
                            path: [origin, destination],
                            strokeColor: "#0955AC",
                            strokeOpacity: 0.7,
                            strokeWeight: 4,
                            icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }],
                            map,
                        });
                    }
                }
            );
        } catch (e) {
            console.error("TripRouteMap init error:", e);
            setError(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, route?.origin?.lat, route?.origin?.lng, route?.destination?.lat, route?.destination?.lng]);

    if (!route?.origin || !route?.destination) {
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
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] font-semibold bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 shadow">
                <span className="flex items-center gap-1.5 text-[#0955AC]">
                    <span className="w-2 h-2 rounded-full bg-[#0955AC] inline-block" /> {route.origin.label}
                </span>
                <span className="text-gray-400">→</span>
                <span className="flex items-center gap-1.5 text-[#EF3826]">
                    <span className="w-2 h-2 rounded-full bg-[#EF3826] inline-block" /> {route.destination.label}
                </span>
            </div>
        </div>
    );
};

export default TripRouteMap;
