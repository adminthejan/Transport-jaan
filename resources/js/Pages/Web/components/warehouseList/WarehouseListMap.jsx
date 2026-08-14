import React, { useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBWjVf-wK6rdmSON8eOXJCgxq2MI10QasE"; // fallback only; prefer env

/**
 * Shows every warehouse in the current result set as a pin on one map, so
 * clients can see where listings actually are relative to each other before
 * opening any of them.
 */
const WarehouseListMap = ({ warehouses: rawWarehouses }) => {
    const mapRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [error, setError] = useState(false);

    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : (rawWarehouses?.data || []);
    const pins = warehouses.filter(
        (w) => Number.isFinite(Number(w?.latitude)) && Number.isFinite(Number(w?.longitude)) && (w.latitude || w.longitude)
    );

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
        if (!mapLoaded || !mapRef.current || pins.length === 0) return;

        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 7.8731, lng: 80.7718 }, // Sri Lanka
                zoom: 8,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
            });

            const bounds = new window.google.maps.LatLngBounds();
            const infoWindow = new window.google.maps.InfoWindow();

            pins.forEach((w) => {
                const position = { lat: Number(w.latitude), lng: Number(w.longitude) };
                bounds.extend(position);

                const marker = new window.google.maps.Marker({
                    position,
                    map,
                    title: w.name || "Warehouse",
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 9,
                        fillColor: "#0955AC",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    },
                });

                marker.addListener("click", () => {
                    const price = Number(w.monthly_rate || w.price || 0).toLocaleString();
                    infoWindow.setContent(`
                        <div style="font-family:inherit;min-width:160px">
                            <strong>${w.name || "Warehouse"}</strong><br/>
                            <span style="color:#555">${w.address || ""}</span><br/>
                            <span style="color:#0955AC;font-weight:600">${price} /${w.pricing_model || "month"}</span>
                        </div>
                    `);
                    infoWindow.open(map, marker);
                    marker.addListener("dblclick", () => router.visit("/warehouseDetails", {
                        method: "get",
                        data: { warehouse: w },
                    }));
                });
            });

            window.google.maps.event.addListenerOnce(map, "idle", () => {
                if (pins.length > 1) {
                    map.fitBounds(bounds, 40);
                } else {
                    map.setCenter(bounds.getCenter());
                    map.setZoom(13);
                }
            });
        } catch (e) {
            console.error("WarehouseListMap init error:", e);
            setError(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapLoaded, pins.length]);

    if (pins.length === 0) {
        return null;
    }

    if (error) {
        return (
            <div className="flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 text-sm h-[280px] mb-8">
                Map unavailable
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 h-[280px] mb-8">
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: 280 }} />
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                    Loading map…
                </div>
            )}
        </div>
    );
};

export default WarehouseListMap;
