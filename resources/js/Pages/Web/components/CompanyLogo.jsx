import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

const LOGO_CACHE_KEY = 'cachedCompanyLogoUrl';

const CompanyLogo = ({
    className = 'h-[40px] object-contain',
    fallbackClassName = 'text-white text-[25px] font-bold poppins',
    enableLink = true,
    href = '/'
}) => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(LOGO_CACHE_KEY) : null;
    const [currentLogo, setCurrentLogo] = useState(cached || null);
    const [fetchDone, setFetchDone] = useState(!!cached);
    const { auth } = usePage().props;

    const fetchCurrentLogo = async () => {
        try {
            const response = await fetch('/website/logo/current', {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.logo) {
                setCurrentLogo(result.logo);
                localStorage.setItem(LOGO_CACHE_KEY, result.logo);
            } else {
                setCurrentLogo(null);
                localStorage.removeItem(LOGO_CACHE_KEY);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.debug('Logo fetch failed (non-critical):', err.message);
            }
            // Keep existing logo on error — don't clear it
        } finally {
            setFetchDone(true);
        }
    };

    useEffect(() => {
        // If we already have a cached logo, skip the fetch on mount to prevent any flash.
        // The logo will refresh only when an explicit update event fires.
        if (!cached) {
            fetchCurrentLogo();
        }

        const handleLogoUpdate = () => fetchCurrentLogo();
        const handleStorageChange = (e) => {
            if (e.key === 'websiteLogoUpdated') fetchCurrentLogo();
        };

        window.addEventListener('logoUpdated', handleLogoUpdate);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('logoUpdated', handleLogoUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Still waiting for initial fetch (no cache, no result yet)
    if (!fetchDone) {
        return <div className={className} style={{ visibility: 'hidden' }} />;
    }

    if (currentLogo) {
        const content = (
            <img
                src={currentLogo}
                alt='Company Logo'
                className={`${className} ${enableLink ? 'cursor-pointer' : ''}`}
                onError={(e) => { e.target.style.visibility = 'hidden'; }}
            />
        );
        return enableLink ? <Link href={href}>{content}</Link> : content;
    }

    // Temporary placeholder mark shown until a real logo is uploaded via
    // the website branding settings (/website/logo/current).
    const content = (
        <div className={`flex items-center gap-[0.35em] ${fallbackClassName}`}>
            <span
                className="flex items-center justify-center w-[1.5em] h-[1.5em] rounded-[0.3em] bg-[#0955AC] text-white shrink-0"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.7em' }}
            >
                X
            </span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="tracking-wide">Xsarva</span>
        </div>
    );
    return enableLink ? <Link href={href} className="cursor-pointer">{content}</Link> : content;
};

export default CompanyLogo;

