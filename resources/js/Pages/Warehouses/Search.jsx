import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
// import AppLayout from '@/Layouts/AppLayout';
import Pagination from '@/Components/Pagination';

const WAREHOUSE_TYPES = [
    { value: '', label: 'All Types' },
    { value: '', label: 'All Types' },
    { value: 'general_warehouse', label: 'General Warehouse' },
    { value: 'bonded_warehouse', label: 'Bonded Warehouse' },
    { value: 'cold_storage', label: 'Cold Storage' },
    { value: 'distribution_center', label: 'Distribution Center' },
    { value: 'fulfillment_center', label: 'Fulfillment Center' },
    { value: 'smart_warehouse', label: 'Smart Warehouse' },
];

const AMENITIES = [
    'Forklift',
    '24/7 Access',
    'CCTV',
    'Security Guard',
    'Loading Dock',
    'Climate Control',
    'Fire Alarm',
    'Parking',
    'Office Space',
    'Restroom',
];

export default function Search({ auth, warehouses, filters }) {
    const { data, setData, get, processing } = useForm({
        location: filters.location || '',
        latitude: filters.latitude || '',
        longitude: filters.longitude || '',
        distance: filters.distance || 10,
        min_area: filters.min_area || '',
        max_area: filters.max_area || '',
        min_capacity: filters.min_capacity || '',
        min_price: filters.min_price || '',
        max_price: filters.max_price || '',
        type: filters.type || '',
        amenities: filters.amenities || [],
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
        sort_by: filters.sort_by || 'price',
        sort_order: filters.sort_order || 'asc'
    });

    const [useCurrentLocation, setUseCurrentLocation] = useState(false);

    useEffect(() => {
        if (useCurrentLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                setData({
                    ...data,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            });
        }
    }, [useCurrentLocation]);

    const handleSearch = (e) => {
        e.preventDefault();
        get(route('warehouses.search'), {
            preserveScroll: true,
        });
    };

    const toggleAmenity = (amenity) => {
        if (data.amenities.includes(amenity)) {
            setData('amenities', data.amenities.filter(a => a !== amenity));
        } else {
            setData('amenities', [...data.amenities, amenity]);
        }
    };

    const handleReset = () => {
        setData({
            location: '',
            latitude: '',
            longitude: '',
            distance: 10,
            min_area: '',
            max_area: '',
            min_capacity: '',
            min_price: '',
            max_price: '',
            type: '',
            amenities: [],
            start_date: '',
            end_date: '',
            sort_by: 'price',
            sort_order: 'asc'
        });
    };

    const formatPriceDisplay = (warehouse) => {
        const priceModel = {
            hourly: '/hour',
            daily: '/day',
            monthly: '/month'
        };
        const displayPrice = warehouse.monthly_rate || warehouse.base_price;
        return `$${displayPrice}${priceModel[warehouse.pricing_model]}`;
    };

    return (
        <AppLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Find Warehouses</h2>}
        >
            <Head title="Find Warehouses" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6 p-6">
                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                        placeholder="City, state or address"
                                        value={data.location}
                                        onChange={e => setData('location', e.target.value)}
                                    />
                                    <div className="mt-2">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                                checked={useCurrentLocation}
                                                onChange={() => setUseCurrentLocation(!useCurrentLocation)}
                                            />
                                            <span className="ml-2 text-sm text-gray-600">Use my current location</span>
                                        </label>
                                    </div>
                                </div>

                                {useCurrentLocation && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Distance (km)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            min="1"
                                            max="100"
                                            value={data.distance}
                                            onChange={e => setData('distance', e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Warehouse Type
                                    </label>
                                    <select
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                        value={data.type}
                                        onChange={e => setData('type', e.target.value)}
                                    >
                                        {WAREHOUSE_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Min Area (sq. ft.)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            min="0"
                                            value={data.min_area}
                                            onChange={e => setData('min_area', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Max Area (sq. ft.)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            min="0"
                                            value={data.max_area}
                                            onChange={e => setData('max_area', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Min Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            min="0"
                                            value={data.min_price}
                                            onChange={e => setData('min_price', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Max Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            min="0"
                                            value={data.max_price}
                                            onChange={e => setData('max_price', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            value={data.start_date}
                                            onChange={e => setData('start_date', e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                            value={data.end_date}
                                            onChange={e => setData('end_date', e.target.value)}
                                            min={data.start_date || new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium mb-2">Amenities</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {AMENITIES.map(amenity => (
                                        <label key={amenity} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-indigo-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                                                checked={data.amenities.includes(amenity)}
                                                onChange={() => toggleAmenity(amenity)}
                                            />
                                            <span className="ml-2 text-sm text-gray-600">{amenity}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4 flex justify-between items-center">
                                <div>
                                    <label className="text-sm font-medium mr-2">Sort by:</label>
                                    <select
                                        className="border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                        value={data.sort_by}
                                        onChange={e => setData('sort_by', e.target.value)}
                                    >
                                        <option value="price">Price</option>
                                        <option value="total_area">Size</option>
                                        <option value="created_at">Newest</option>
                                    </select>
                                    <select
                                        className="ml-2 border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                                        value={data.sort_order}
                                        onChange={e => setData('sort_order', e.target.value)}
                                    >
                                        <option value="asc">Low to High</option>
                                        <option value="desc">High to Low</option>
                                    </select>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="submit"
                                        className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        disabled={processing}
                                    >
                                        Search Warehouses
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {warehouses.total} {warehouses.total === 1 ? 'Warehouse' : 'Warehouses'} Found
                        </h2>

                        {warehouses.data.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {warehouses.data.map(warehouse => (
                                    <div key={warehouse.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <div className="h-48 overflow-hidden bg-gray-200">
                                            {warehouse.images && warehouse.images.length > 0 ? (
                                                <img
                                                    src={`/storage/${warehouse.images[0]}`}
                                                    alt={warehouse.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-500">
                                                    No Image Available
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg mb-1">{warehouse.name}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{warehouse.address}</p>

                                            <div className="flex justify-between items-center mb-3">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                                    {warehouse.type.replace('_', ' ')}
                                                </span>
                                                <span className="font-bold text-lg">
                                                    {formatPriceDisplay(warehouse)}
                                                </span>
                                            </div>

                                            <div className="mb-3">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Size:</span> {warehouse.total_area} sq. ft.
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Capacity:</span> {warehouse.capacity}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {warehouse.amenities.slice(0, 3).map(amenity => (
                                                        <span key={amenity} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                            {amenity}
                                                        </span>
                                                    ))}
                                                    {warehouse.amenities.length > 3 && (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                            +{warehouse.amenities.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <Link
                                                href={route('warehouses.show', {
                                                    warehouse: warehouse.id,
                                                    start_date: data.start_date,
                                                    end_date: data.end_date
                                                })}
                                                className="w-full block text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">No warehouses found</h3>
                                <p className="mt-1 text-sm text-gray-500">Try adjusting your search filters to find more results.</p>
                            </div>
                        )}

                        <div className="mt-6">
                            <Pagination links={warehouses.links} />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
