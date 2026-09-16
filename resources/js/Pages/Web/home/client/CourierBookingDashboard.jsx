import React, { useEffect, useMemo, useState } from 'react'
import { useForm, usePage, Link, router } from '@inertiajs/react';
import Header from "./ClientHeader";
import HeroEnhanced from "../../components/client/courierBooking/HeroEnhanced";

const FAVORITES_PAGE_SIZE = 2;

const LOCAL_SENDER_FAVORITES_KEY = "courier.localFavorites.sender";
const LOCAL_RECIPIENT_FAVORITES_KEY = "courier.localFavorites.recipient";

const readLocalFavorites = (storageKey) => {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocalFavorites = (storageKey, contacts) => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.isArray(contacts) ? contacts : []));
    } catch {
        // ignore
    }
};

const CourierBookingDashboard = () => {
    const { shipments, statistics, monthlyData, favoriteRecipients = [], favoriteSenders = [], countries = [] } = usePage().props;
    const [showAddModal, setShowAddModal] = useState(false);
    const [favoritesPage, setFavoritesPage] = useState(1);
    const [activeTab, setActiveTab] = useState('senders'); // 'recipients' | 'senders'
    const [activeFlow, setActiveFlow] = useState('domestic'); // 'domestic' | 'international'

    const [localRecipients, setLocalRecipients] = useState([]);
    const [localSenders, setLocalSenders] = useState([]);

    useEffect(() => {
        const serverRecipients = Array.isArray(favoriteRecipients) ? favoriteRecipients : [];
        const localItems = readLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY).filter(r => String(r?.id).startsWith('local-'));
        const merged = [...serverRecipients, ...localItems];
        setLocalRecipients(merged);
        writeLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY, merged);
    }, [favoriteRecipients]);

    useEffect(() => {
        const serverSenders = Array.isArray(favoriteSenders) ? favoriteSenders : [];
        const localItems = readLocalFavorites(LOCAL_SENDER_FAVORITES_KEY).filter(s => String(s?.id).startsWith('local-'));
        const merged = [...serverSenders, ...localItems];
        setLocalSenders(merged);
        writeLocalFavorites(LOCAL_SENDER_FAVORITES_KEY, merged);
    }, [favoriteSenders]);

    const defaultCountry = countries[0] || 'US';
    const buildFavoriteForm = (role = 'recipient') => {
        const base = {
            name: '',
            email: '',
            phone: '',
            company: '',
            address: {
                line1: '',
                line2: '',
                instructions: '',
            },
        };
        return {
            role,
            [role]: base,
        };
    };

    const {
        data,
        setData,
        post,
        processing,
        errors,
        clearErrors,
    } = useForm(buildFavoriteForm('recipient'));

    const formatFavoriteAddress = (address) => {
        if (!address) {
            return '';
        }

        const street = [address.line1, address.line2].filter(Boolean).join(', ');
        const instructions = address.instructions;

        return [street, instructions].filter(Boolean).join(', ');
    };

    const handleRemoveFavorite = (contactId) => {
        if (!contactId) {
            return;
        }

        if (String(contactId).startsWith('local-')) {
            if (activeTab === 'recipients') {
                const updated = localRecipients.filter(r => r.id !== contactId);
                setLocalRecipients(updated);
                writeLocalFavorites(LOCAL_RECIPIENT_FAVORITES_KEY, updated);
            } else {
                const updated = localSenders.filter(s => s.id !== contactId);
                setLocalSenders(updated);
                writeLocalFavorites(LOCAL_SENDER_FAVORITES_KEY, updated);
            }
            return;
        }

        router.delete(`/couriers/favorites/${contactId}`, {
            preserveScroll: true,
        });
    };

    const currentFavoritesList = activeTab === 'recipients' ? localRecipients : localSenders;

    const filteredFavoritesList = useMemo(() => {
        return currentFavoritesList.filter((contact) => {
            const favoriteCountry = String(contact?.address?.country || '').trim().toUpperCase();
            if (!favoriteCountry) {
                return true;
            }

            const isDomestic = favoriteCountry === defaultCountry || favoriteCountry === 'LK';
            return activeFlow === 'domestic' ? isDomestic : !isDomestic;
        });
    }, [currentFavoritesList, activeFlow, defaultCountry]);

    const favoriteTotalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredFavoritesList.length / FAVORITES_PAGE_SIZE));
    }, [filteredFavoritesList.length]);

    useEffect(() => {
        setFavoritesPage((prev) => Math.min(Math.max(1, prev), favoriteTotalPages));
    }, [favoriteTotalPages, activeTab, activeFlow]);

    const paginatedFavorites = useMemo(() => {
        const start = (favoritesPage - 1) * FAVORITES_PAGE_SIZE;
        return filteredFavoritesList.slice(start, start + FAVORITES_PAGE_SIZE);
    }, [filteredFavoritesList, favoritesPage]);

    const handleOpenAddModal = () => {
        clearErrors();
        setData(buildFavoriteForm(activeTab === 'recipients' ? 'recipient' : 'sender'));
        setShowAddModal(true);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
    };

    const updateFavoriteField = (path, value) => {
        setData((previous) => {
            const next = { ...previous };
            const keys = path.split('.');
            let cursor = next;

            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    cursor[key] = value;
                    return;
                }

                const current = cursor[key];
                cursor[key] = current ? { ...current } : {};
                cursor = cursor[key];
            });

            return next;
        });
    };

    const handleSaveFavorite = () => {
        post('/couriers/favorites', {
            preserveScroll: true,
            onSuccess: () => {
                setShowAddModal(false);
                setData(buildFavoriteForm(activeTab === 'recipients' ? 'recipient' : 'sender'));
            },
        });
    };

    const currentRole = data.role || 'recipient';

    const favoriteErrorFor = (field) => {
        return errors[`${currentRole}.${field}`] || errors[field];
    };

    const favoritesSection = (
        <div className="w-full max-w-[870px]">
            <div className="rounded-2xl border border-[#DDE7F5] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4">
                    {/* Top Level: Flow selection & Add button */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-fit rounded-lg bg-[#F1F5F9] p-1">
                            <button
                                className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-all ${activeFlow === 'domestic' ? 'bg-white text-[#0955AC] shadow-sm' : 'text-[#5B6887] hover:text-[#0B1739]'}`}
                                onClick={() => { setActiveFlow('domestic'); setFavoritesPage(1); }}
                            >
                                Domestic
                            </button>
                            <button
                                className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-all ${activeFlow === 'international' ? 'bg-white text-[#0955AC] shadow-sm' : 'text-[#5B6887] hover:text-[#0B1739]'}`}
                                onClick={() => { setActiveFlow('international'); setFavoritesPage(1); }}
                            >
                                International
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="inline-flex items-center justify-center rounded-[10px] border border-[#0955AC] bg-[#0955AC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0a4b93]"
                        >
                            + Add {activeTab === 'senders' ? 'Sender' : 'Recipient'}
                        </button>
                    </div>

                    {/* Second Level: Sub-tabs for Recipient/Sender */}
                    <div>
                        <div className="flex space-x-6 border-b border-[#E3EAF5]">
                            <button
                                className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'senders' ? 'border-b-2 border-[#0955AC] text-[#0B1739]' : 'border-b-2 border-transparent text-[#5B6887] hover:text-[#0B1739]'}`}
                                onClick={() => { setActiveTab('senders'); setFavoritesPage(1); }}
                            >
                                Saved Senders
                            </button>
                            <button
                                className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'recipients' ? 'border-b-2 border-[#0955AC] text-[#0B1739]' : 'border-b-2 border-transparent text-[#5B6887] hover:text-[#0B1739]'}`}
                                onClick={() => { setActiveTab('recipients'); setFavoritesPage(1); }}
                            >
                                Saved Recipients
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    {filteredFavoritesList.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#DDE7F5] bg-[#F9FBFF] py-8 text-center text-[12px] text-[#5B6887]">
                            No saved {activeTab === 'recipients' ? 'recipients' : 'senders'} found for {activeFlow === 'domestic' ? 'domestic' : 'international'} deliveries.
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {paginatedFavorites.map((contact) => (
                                    <div
                                        key={`favorite-contact-${contact.id}`}
                                        className="rounded-xl border border-[#E3EAF5] bg-[#F9FBFF] p-4 text-[11px] text-[#0B1739] transition-colors hover:border-[#D6DEEB] hover:bg-[#F4F7FC]"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-[#0B1739]">{contact.name || (activeTab === 'recipients' ? 'Recipient' : 'Sender')}</p>
                                                {contact.company && (
                                                    <p className="mt-0.5 text-xs text-[#5B6887]">{contact.company}</p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFavorite(contact.id)}
                                                className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <div className="mt-3 space-y-1.5 text-xs text-[#5B6887]">
                                            {contact.email && <p className="flex items-center gap-1.5"><span className="font-medium text-[#0B1739]">Email:</span> {contact.email}</p>}
                                            {contact.phone && <p className="flex items-center gap-1.5"><span className="font-medium text-[#0B1739]">Phone:</span> {contact.phone}</p>}
                                            {contact.address && (
                                                <p className="flex items-start gap-1.5"><span className="font-medium text-[#0B1739]">Address:</span> <span>{formatFavoriteAddress(contact.address)}</span></p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {filteredFavoritesList.length > FAVORITES_PAGE_SIZE && (
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3EAF5] pt-4 text-xs text-[#5B6887]">
                                    <button
                                        type="button"
                                        onClick={() => setFavoritesPage((prev) => Math.max(1, prev - 1))}
                                        disabled={favoritesPage <= 1}
                                        className={`rounded-md border px-3 py-1.5 font-semibold transition-colors ${favoritesPage <= 1 ? 'cursor-not-allowed border-[#E3EAF5] text-[#A0AEC0] bg-[#F9FBFF]' : 'border-[#D6DEEB] text-[#0B1739] bg-white hover:border-[#0955AC] hover:text-[#0955AC]'}`}
                                    >
                                        Previous
                                    </button>
                                    <span className="font-medium">Page {favoritesPage} of {favoriteTotalPages}</span>
                                    <button
                                        type="button"
                                        onClick={() => setFavoritesPage((prev) => Math.min(favoriteTotalPages, prev + 1))}
                                        disabled={favoritesPage >= favoriteTotalPages}
                                        className={`rounded-md border px-3 py-1.5 font-semibold transition-colors ${favoritesPage >= favoriteTotalPages ? 'cursor-not-allowed border-[#E3EAF5] text-[#A0AEC0] bg-[#F9FBFF]' : 'border-[#D6DEEB] text-[#0B1739] bg-white hover:border-[#0955AC] hover:text-[#0955AC]'}`}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-[#F4F6F9] min-h-screen">
            <Header />

            {/* Back Button */}
            <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
                <div className="py-3">
                    <Link
                        href="/clientAllBookings"
                        className="inline-flex items-center text-[#0955AC] hover:text-[#0744a0] font-medium text-[13.5px] transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Main Dashboard
                    </Link>
                </div>
            </div>

            <HeroEnhanced
                shipments={shipments || []}
                statistics={statistics || {}}
                monthlyData={monthlyData || []}
                leftColumnSlot={favoritesSection}
            />

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-[#0B1739]">Add favorite {currentRole}</h3>
                                <p className="text-xs text-[#5B6887]">Enter {currentRole} details to save for later.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseAddModal}
                                className="rounded-[5px] border border-[#D6DEEB] px-3 py-1 text-xs font-semibold text-[#0B1739] hover:border-[#0955AC]"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Name *</label>
                                    <input
                                        type="text"
                                        value={data[currentRole].name}
                                        onChange={(event) => updateFavoriteField(`${currentRole}.name`, event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                        placeholder="Michael Brown"
                                        required
                                    />
                                    {favoriteErrorFor('name') && (
                                        <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('name')}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Phone</label>
                                    <input
                                        type="text"
                                        value={data[currentRole].phone}
                                        onChange={(event) => updateFavoriteField(`${currentRole}.phone`, event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                        placeholder="+44 20 7946 0958"
                                    />
                                    {favoriteErrorFor('phone') && (
                                        <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('phone')}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Email</label>
                                    <input
                                        type="email"
                                        value={data[currentRole].email}
                                        onChange={(event) => updateFavoriteField(`${currentRole}.email`, event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                        placeholder="michael@example.com"
                                    />
                                    {favoriteErrorFor('email') && (
                                        <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('email')}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium">Company</label>
                                    <input
                                        type="text"
                                        value={data[currentRole].company}
                                        onChange={(event) => updateFavoriteField(`${currentRole}.company`, event.target.value)}
                                        className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                        placeholder="Company Inc."
                                    />
                                    {favoriteErrorFor('company') && (
                                        <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('company')}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Address line 1 *</label>
                                <input
                                    type="text"
                                    value={data[currentRole].address.line1}
                                    onChange={(event) => updateFavoriteField(`${currentRole}.address.line1`, event.target.value)}
                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    placeholder="45 Oxford Street"
                                    required
                                />
                                {favoriteErrorFor('address.line1') && (
                                    <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('address.line1')}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Address line 2</label>
                                <input
                                    type="text"
                                    value={data[currentRole].address.line2}
                                    onChange={(event) => updateFavoriteField(`${currentRole}.address.line2`, event.target.value)}
                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    placeholder="Floor 2"
                                />
                                {favoriteErrorFor('address.line2') && (
                                    <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('address.line2')}</p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium">Instructions</label>
                                <textarea
                                    rows="2"
                                    value={data[currentRole].address.instructions}
                                    onChange={(event) => updateFavoriteField(`${currentRole}.address.instructions`, event.target.value)}
                                    className="w-full rounded-lg border border-[#D6DEEB] px-3 py-2 text-sm focus:border-[#0955AC] focus:outline-none"
                                    placeholder="Leave with reception, call on arrival, etc."
                                />
                                {favoriteErrorFor('address.instructions') && (
                                    <p className="mt-1 text-xs text-red-500">{favoriteErrorFor('address.instructions')}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 flex flex-col justify-end gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={handleCloseAddModal}
                                className="rounded-lg border border-[#D6DEEB] px-4 py-2 text-xs font-semibold text-[#0B1739] hover:border-[#0955AC]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveFavorite}
                                disabled={processing}
                                className={`rounded-lg bg-[#0955AC] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0a4b93] ${processing ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                {processing ? 'Saving...' : `Save ${currentRole}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CourierBookingDashboard;