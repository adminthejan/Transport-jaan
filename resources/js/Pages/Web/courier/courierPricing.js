const dhlLogo =
    "https://1000logos.net/wp-content/uploads/2018/08/DHL-emblem.jpg";
const fedexLogo =
    "https://1000logos.net/wp-content/uploads/2021/04/Fedex-logo.png";
const upsLogo = "https://1000logos.net/wp-content/uploads/2017/06/UPS-logo.jpg";
const aramexLogo =
    "https://www.securitycargonetwork.com/wp-content/uploads/2024/09/aramex.jpg";
const sfLogo =
    "https://logowik.com/content/uploads/images/sf-express9821.logowik.com.webp";
const dpdLogo =
    "https://logos-world.net/wp-content/uploads/2021/02/DPD-Dynamic-Parcel-Distribution-Logo-2015-present.jpg";
const tntLogo =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/TNT_Express_Logo.svg/2560px-TNT_Express_Logo.svg.png";

export const COURIER_SERVICES = [
    // ── DOMESTIC SERVICES ──────────────────────────────────────────────────────
    // {
    //     id: "pronto",
    //     name: "Pronto Delivery",
    //     logo: null,
    //     category: "domestic",
    //     brandColor: "#0055A4",
    //     badgeColor: "#CCE5FF",
    //     rateMultiplier: 1.01,
    //     fuelSurcharge: 0.03,
    //     customsBuffer: 0,
    //     coverage: "Island-wide delivery",
    //     cutoff: "Pickup by 5:00 PM",
    //     badges: ["Same-day available", "Door-to-door"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 3,
    //             perKg: 0.4,
    //             eta: "2-3 business days",
    //             description: "Standard door-to-door domestic delivery.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 6,
    //             perKg: 0.7,
    //             eta: "Next-day delivery",
    //             description: "Next-day domestic courier service.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 10,
    //             perKg: 1.0,
    //             eta: "Same-day delivery",
    //             description: "Same-day priority pickup and delivery.",
    //         },
    //     ],
    // },
    // {
    //     id: "speedex",
    //     name: "Speedex Courier",
    //     logo: null,
    //     category: "domestic",
    //     brandColor: "#E84B1C",
    //     badgeColor: "#FFE8E0",
    //     rateMultiplier: 1.02,
    //     fuelSurcharge: 0.025,
    //     customsBuffer: 0,
    //     coverage: "Major cities & towns",
    //     cutoff: "Pickup by 4:00 PM",
    //     badges: ["Real-time tracking", "Signature on delivery"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 2.5,
    //             perKg: 0.35,
    //             eta: "3-4 business days",
    //             description: "Affordable island-wide parcel delivery.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 5,
    //             perKg: 0.65,
    //             eta: "Next-day delivery",
    //             description: "Reliable next-day delivery to major cities.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 9,
    //             perKg: 0.95,
    //             eta: "Same-day by 8 PM",
    //             description: "Priority same-day delivery with live tracking.",
    //         },
    //     ],
    // },
    // {
    //     id: "flashpost",
    //     name: "FlashPost Local",
    //     logo: null,
    //     category: "domestic",
    //     brandColor: "#7C3AED",
    //     badgeColor: "#EDE9FE",
    //     rateMultiplier: 1.015,
    //     fuelSurcharge: 0.028,
    //     customsBuffer: 0,
    //     coverage: "20+ districts served",
    //     cutoff: "Pickup by 3:30 PM",
    //     badges: ["Proof of delivery", "Fragile handling"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 2.8,
    //             perKg: 0.38,
    //             eta: "3-5 business days",
    //             description: "Budget-friendly domestic parcel service.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 5.5,
    //             perKg: 0.68,
    //             eta: "Next-day delivery",
    //             description: "Guaranteed next-day delivery with POD.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 9.5,
    //             perKg: 0.98,
    //             eta: "Same-day by 6 PM",
    //             description:
    //                 "Fastest domestic option with fragile-safe handling.",
    //         },
    //     ],
    // },
    // ── international SERVICES ─────────────────────────────────────────────────────
    // {
    //     id: "dhl",
    //     name: "DHL Express",
    //     logo: dhlLogo,
    //     category: "international",
    //     brandColor: "#FFB800",
    //     badgeColor: "#FFF4CC",
    //     rateMultiplier: 1.08,
    //     fuelSurcharge: 0.06,
    //     customsBuffer: 4.5,
    //     coverage: "220+ destinations",
    //     cutoff: "Pickup by 4:00 PM",
    //     badges: ["Paperless clearance", "Time-definite"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 18,
    //             perKg: 1.35,
    //             eta: "3-6 business days",
    //             description:
    //                 "Cost-effective door-to-door international delivery.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 32,
    //             perKg: 2.05,
    //             eta: "1-3 business days",
    //             description:
    //                 "Balanced speed for most time-sensitive shipments.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 58,
    //             perKg: 2.9,
    //             eta: "Next-day delivery",
    //             description: "Fastest global delivery with premium handling.",
    //         },
    //     ],
    // },
    // {
    //     id: "fedex",
    //     name: "FedEx international",
    //     logo: fedexLogo,
    //     category: "international",
    //     brandColor: "#4D148C",
    //     badgeColor: "#EFE6FB",
    //     rateMultiplier: 1.05,
    //     fuelSurcharge: 0.055,
    //     customsBuffer: 4,
    //     coverage: "200+ destinations",
    //     cutoff: "Pickup by 3:30 PM",
    //     badges: ["Door-to-door", "Signature included"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 17,
    //             perKg: 1.3,
    //             eta: "4-6 business days",
    //             description: "Reliable delivery with customs support.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 30,
    //             perKg: 1.9,
    //             eta: "1-3 business days",
    //             description: "Time-definite delivery to major hubs.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 55,
    //             perKg: 2.75,
    //             eta: "Next-business-day",
    //             description: "Premium customs clearance and early delivery.",
    //         },
    //     ],
    // },
    // {
    //     id: "ups",
    //     name: "UPS Worldwide",
    //     logo: upsLogo,
    //     category: "international",
    //     brandColor: "#3B2419",
    //     badgeColor: "#F4EDE5",
    //     rateMultiplier: 1.04,
    //     fuelSurcharge: 0.05,
    //     customsBuffer: 3.75,
    //     coverage: "215+ destinations",
    //     cutoff: "Pickup by 5:00 PM",
    //     badges: ["Brokerage ready", "Detailed tracking"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 16,
    //             perKg: 1.25,
    //             eta: "4-7 business days",
    //             description: "Best-value option for non-urgent freight.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 29,
    //             perKg: 1.85,
    //             eta: "2-4 business days",
    //             description: "Faster transit with customs pre-clearance.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 52,
    //             perKg: 2.6,
    //             eta: "Next-business-day",
    //             description: "Priority boarding plus premium handling.",
    //         },
    //     ],
    // },
    // {
    //     id: "aramex",
    //     name: "Aramex international",
    //     logo: aramexLogo,
    //     category: "international",
    //     brandColor: "#E7002A",
    //     badgeColor: "#FFE0E6",
    //     rateMultiplier: 1.02,
    //     fuelSurcharge: 0.045,
    //     customsBuffer: 3.5,
    //     coverage: "Middle East & Asia focus",
    //     cutoff: "Pickup by 3:00 PM",
    //     badges: ["Customs assistance", "Flexible delivery"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 15,
    //             perKg: 1.1,
    //             eta: "4-8 business days",
    //             description: "Budget-friendly cross-border parcels.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 27,
    //             perKg: 1.7,
    //             eta: "2-4 business days",
    //             description: "Balanced transit across major trade lanes.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 49,
    //             perKg: 2.4,
    //             eta: "1-2 business days",
    //             description: "Expedited service with bonded clearance.",
    //         },
    //     ],
    // },
    // {
    //     id: "sf",
    //     name: "SF Express Global",
    //     logo: sfLogo,
    //     category: "international",
    //     brandColor: "#111",
    //     badgeColor: "#E9E9E9",
    //     rateMultiplier: 1.03,
    //     fuelSurcharge: 0.048,
    //     customsBuffer: 3.25,
    //     coverage: "Asia-Pacific specialists",
    //     cutoff: "Pickup by 2:30 PM",
    //     badges: ["Warehouse integration", "Cross-border eCommerce"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 14,
    //             perKg: 1.05,
    //             eta: "4-8 business days",
    //             description: "Affordable forwarding to Asian markets.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 26,
    //             perKg: 1.6,
    //             eta: "2-4 business days",
    //             description: "Faster service with export declarations handled.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 45,
    //             perKg: 2.3,
    //             eta: "1-2 business days",
    //             description: "Premium routing with last-mile tracking.",
    //         },
    //     ],
    // },
    // {
    //     id: "dpd",
    //     name: "DPDgroup international",
    //     logo: dpdLogo,
    //     category: "international",
    //     brandColor: "#D70926",
    //     badgeColor: "#FFE5EA",
    //     rateMultiplier: 1.01,
    //     fuelSurcharge: 0.042,
    //     customsBuffer: 3,
    //     coverage: "Europe & UK specialists",
    //     cutoff: "Pickup by 4:30 PM",
    //     badges: ["Predict delivery", "In-flight options"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 13,
    //             perKg: 1,
    //             eta: "3-6 business days",
    //             description: "Economical delivery across Europe.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 24,
    //             perKg: 1.5,
    //             eta: "1-3 business days",
    //             description: "Express road and air combination service.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 43,
    //             perKg: 2.2,
    //             eta: "Next-business-day",
    //             description: "Priority customs channel with dedicated support.",
    //         },
    //     ],
    // },
    // {
    //     id: "tnt",
    //     name: "TNT Express",
    //     logo: tntLogo,
    //     category: "international",
    //     brandColor: "#FF6600",
    //     badgeColor: "#FFE3CC",
    //     rateMultiplier: 1.04,
    //     fuelSurcharge: 0.052,
    //     customsBuffer: 3.4,
    //     coverage: "Road & air freight network",
    //     cutoff: "Pickup by 3:45 PM",
    //     badges: ["Freight ready", "Time-critical"],
    //     tiers: [
    //         {
    //             id: "economy",
    //             label: "Economy",
    //             base: 15,
    //             perKg: 1.2,
    //             eta: "4-7 business days",
    //             description: "Reliable deferred option for heavier cargo.",
    //         },
    //         {
    //             id: "express",
    //             label: "Express",
    //             base: 28,
    //             perKg: 1.8,
    //             eta: "2-4 business days",
    //             description: "Balanced service with proactive updates.",
    //         },
    //         {
    //             id: "priority",
    //             label: "Priority",
    //             base: 47,
    //             perKg: 2.5,
    //             eta: "1-2 business days",
    //             description: "Time-critical movements with dedicated handling.",
    //         },
    //     ],
    // },
];

const VOLUMETRIC_DIVISOR = 5000;

const DEFAULT_PROVIDER_RATES = {
    domestic: {
        rateMultiplier: 1.015,
        fuelSurcharge: 0.03,
        customsBuffer: 0,
    },
    international: {
        rateMultiplier: 1.05,
        fuelSurcharge: 0.05,
        customsBuffer: 3.5,
    },
};

const DEFAULT_TIER_BLUEPRINTS = {
    domestic: {
        economy: {
            label: "Economy",
            base: 2.9,
            perKg: 0.38,
            eta: "2-4 business days",
            description: "Affordable island-wide domestic delivery.",
        },
        express: {
            label: "Express",
            base: 5.8,
            perKg: 0.68,
            eta: "Next-day delivery",
            description: "Fast domestic service with dependable tracking.",
        },
        priority: {
            label: "Priority",
            base: 9.7,
            perKg: 0.98,
            eta: "Same-day delivery",
            description: "Rapid same-day pickup and door-to-door fulfillment.",
        },
    },
    international: {
        economy: {
            label: "Economy",
            base: 16,
            perKg: 1.2,
            eta: "4-7 business days",
            description: "Economical cross-border courier service.",
        },
        express: {
            label: "Express",
            base: 29,
            perKg: 1.85,
            eta: "2-4 business days",
            description: "Faster global shipping with customs assistance.",
        },
        priority: {
            label: "Priority",
            base: 52,
            perKg: 2.6,
            eta: "1-2 business days",
            description: "Priority international shipping for urgent cargo.",
        },
    },
};

const toNumberOr = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProviderCategory = (category) => {
    const normalized = String(category || "")
        .trim()
        .toLowerCase();
    return normalized === "international" ? "international" : "domestic";
};

const normalizeProviderTiers = (provider, category) => {
    const defaults =
        DEFAULT_TIER_BLUEPRINTS[category] || DEFAULT_TIER_BLUEPRINTS.domestic;
    const providedTiers = Array.isArray(provider?.tiers) ? provider.tiers : [];
    const providedById = new Map(
        providedTiers.map((tier) => [
            String(tier?.id || "")
                .trim()
                .toLowerCase(),
            tier,
        ]),
    );

    return Object.entries(defaults).map(([tierId, fallback]) => {
        const candidate = providedById.get(tierId) || {};

        return {
            id: tierId,
            label: String(candidate?.label || fallback.label),
            base: Math.max(0, toNumberOr(candidate?.base, fallback.base)),
            perKg: Math.max(0, toNumberOr(candidate?.perKg, fallback.perKg)),
            eta: String(candidate?.eta || fallback.eta),
            description: String(candidate?.description || fallback.description),
            flatMarkup: Math.max(0, toNumberOr(candidate?.flatMarkup, 0)),
        };
    });
};

const normalizeProviderService = (provider, index) => {
    if (!provider || typeof provider !== "object") {
        return null;
    }

    const category = normalizeProviderCategory(provider.category);
    const defaults = DEFAULT_PROVIDER_RATES[category];
    const name = String(provider.name || "").trim();
    const id =
        String(provider.id || "").trim() || `provider-${category}-${index + 1}`;

    return {
        id,
        name: name || `Courier Provider ${index + 1}`,
        logo:
            typeof provider.logo === "string" && provider.logo.trim() !== ""
                ? provider.logo
                : null,
        category,
        brandColor:
            typeof provider.brandColor === "string" &&
            provider.brandColor.trim() !== ""
                ? provider.brandColor
                : "#0955AC",
        badgeColor:
            typeof provider.badgeColor === "string" &&
            provider.badgeColor.trim() !== ""
                ? provider.badgeColor
                : "#E8F0FE",
        rateMultiplier: Math.max(
            0.6,
            toNumberOr(provider.rateMultiplier, defaults.rateMultiplier),
        ),
        fuelSurcharge: Math.max(
            0,
            toNumberOr(provider.fuelSurcharge, defaults.fuelSurcharge),
        ),
        customsBuffer: Math.max(
            0,
            toNumberOr(provider.customsBuffer, defaults.customsBuffer),
        ),
        coverage: String(
            provider.coverage ||
                (category === "international"
                    ? "Cross-border international delivery support"
                    : "Island-wide domestic delivery"),
        ),
        cutoff: String(
            provider.cutoff ||
                (category === "international"
                    ? "Pickup by 3:30 PM"
                    : "Pickup by 5:00 PM"),
        ),
        badges: Array.isArray(provider.badges)
            ? provider.badges
                  .map((badge) => String(badge).trim())
                  .filter(Boolean)
                  .slice(0, 4)
            : [],
        tiers: normalizeProviderTiers(provider, category),
    };
};

const resolveQuoteServices = (services) => {
    const providedServices = Array.isArray(services) ? services : [];
    const normalizedServices = providedServices
        .map((provider, index) => normalizeProviderService(provider, index))
        .filter(Boolean);

    return normalizedServices.length > 0
        ? normalizedServices
        : COURIER_SERVICES;
};

// Volumetric weight (kg) = L(cm) x W(cm) x H(cm) / divisor
export const computeVolumetricWeightKg = (length, width, height, divisor = VOLUMETRIC_DIVISOR) => {
    const l = Number(length) || 0;
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    if (l <= 0 || w <= 0 || h <= 0) return 0;
    return (l * w * h) / divisor;
};

// Weights are always expressed in kg (e.g. 200 g -> "0.2 kg").
export const formatWeightKg = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return `${parseFloat(n.toFixed(3))} kg`;
};

export const computePackageMetrics = (packages = []) => {
    if (!Array.isArray(packages) || packages.length === 0) {
        return {
            totalWeight: 0,
            volumetricWeight: 0,
            totalPackages: 0,
            readyForQuote: false,
            billableWeight: 0,
            requiresSpecialHandling: false,
        };
    }

    let totalWeight = 0;
    let volumetricWeight = 0;
    let totalPackages = 0;
    let readyForQuote = true;
    let requiresSpecialHandling = false;

    packages.forEach((pkg) => {
        const quantity = Number(pkg?.quantity) || 0;
        const weight = Number(pkg?.weightKg) || 0;
        const length = Number(pkg?.lengthCm) || 0;
        const width = Number(pkg?.widthCm) || 0;
        const height = Number(pkg?.heightCm) || 0;

        if (!quantity || quantity <= 0 || !weight || weight <= 0) {
            readyForQuote = false;
        }

        totalPackages += quantity;

        if (quantity > 0 && weight > 0) {
            totalWeight += weight * quantity;
        }

        if (length > 0 && width > 0 && height > 0 && quantity > 0) {
            volumetricWeight +=
                ((length * width * height) / VOLUMETRIC_DIVISOR) * quantity;
        }

        if (
            pkg?.packageType === "temperature_controlled" ||
            pkg?.packageType === "freight"
        ) {
            requiresSpecialHandling = true;
        }
    });

    const billableWeight = Math.max(totalWeight, volumetricWeight);

    return {
        totalWeight,
        volumetricWeight,
        totalPackages,
        readyForQuote: readyForQuote && totalWeight > 0,
        billableWeight,
        requiresSpecialHandling,
    };
};

export const buildQuoteMatrix = (packages = [], options = {}) => {
    const services = resolveQuoteServices(options.services);
    const metrics = options.metrics || computePackageMetrics(packages);

    if (!metrics.readyForQuote) {
        return [];
    }

    return packages
        .map((pkg, packageIndex) => {
            const quantity = Number(pkg?.quantity) || 0;
            const weight = Number(pkg?.weightKg) || 0;
            const length = Number(pkg?.lengthCm) || 0;
            const width = Number(pkg?.widthCm) || 0;
            const height = Number(pkg?.heightCm) || 0;

            if (quantity <= 0 || weight <= 0) {
                return { packageIndex, providers: [] };
            }

            const packageWeight = weight * quantity;
            const volumetricWeight =
                length > 0 && width > 0 && height > 0
                    ? ((length * width * height) / VOLUMETRIC_DIVISOR) *
                      quantity
                    : 0;
            const billableWeight = Math.max(packageWeight, volumetricWeight);
            const oversizedSurcharge =
                billableWeight > 25 ? (billableWeight - 25) * 0.75 : 0;
            const specialHandlingFee =
                pkg?.packageType === "temperature_controlled" ||
                pkg?.packageType === "freight"
                    ? 12
                    : 0;

            const packageServices =
                typeof options.servicesForPackage === "function"
                    ? resolveQuoteServices(options.servicesForPackage(pkg, packageIndex))
                    : services;

            const providers = packageServices.map((provider) => {
                const tiers = (provider.tiers || []).map((tier) => {
                    const baseComponent = tier.base;
                    const weightComponent = billableWeight * tier.perKg;
                    const adjustmentsComponent =
                        oversizedSurcharge +
                        specialHandlingFee +
                        (tier.flatMarkup || 0);
                    const subtotal =
                        baseComponent + weightComponent + adjustmentsComponent;
                    const providerPremium =
                        subtotal * ((provider.rateMultiplier || 1) - 1);
                    const fuelComponent =
                        subtotal * (provider.fuelSurcharge || 0);
                    const customsComponent = provider.customsBuffer || 0;
                    const total =
                        subtotal +
                        providerPremium +
                        fuelComponent +
                        customsComponent;

                    return {
                        ...tier,
                        price: Number(total.toFixed(2)),
                        breakdown: {
                            base: Number(baseComponent.toFixed(2)),
                            weight: Number(weightComponent.toFixed(2)),
                            adjustments: Number(
                                (
                                    adjustmentsComponent +
                                    providerPremium +
                                    fuelComponent +
                                    customsComponent
                                ).toFixed(2),
                            ),
                        },
                    };
                });

                return {
                    ...provider,
                    tiers,
                };
            });

            return {
                packageIndex,
                packageInfo: {
                    label: pkg?.label || `Package ${packageIndex + 1}`,
                    weight: packageWeight,
                    billableWeight,
                },
                providers,
            };
        })
        .filter(
            (item) =>
                Array.isArray(item.providers) && item.providers.length > 0,
        );
};

export const resolveDetailedQuotes = (packages = [], quoteMatrix = []) => {
    if (!Array.isArray(packages) || !Array.isArray(quoteMatrix)) {
        return [];
    }

    return packages
        .map((pkg, index) => {
            if (!pkg?.courierProvider || !pkg?.serviceLevel) {
                return null;
            }

            const packageQuotes = quoteMatrix.find(
                (item) => item.packageIndex === index,
            );
            if (!packageQuotes) {
                return null;
            }

            const provider = (packageQuotes.providers || []).find(
                (p) => p.id === pkg.courierProvider,
            );
            if (!provider) {
                return null;
            }

            const tier = (provider.tiers || []).find(
                (t) => t.id === pkg.serviceLevel,
            );
            if (!tier) {
                return null;
            }

            return {
                packageIndex: index,
                packageInfo: packageQuotes.packageInfo,
                provider,
                tier,
            };
        })
        .filter(Boolean);
};

export const summarizeDetailedQuotes = (detailedQuotes = []) => {
    return detailedQuotes.map((quote, index) => {
        const label =
            quote?.packageInfo?.label ||
            `Package ${quote?.packageIndex + 1 || index + 1}`;
        const weight = quote?.packageInfo?.weight;
        const billableWeight = quote?.packageInfo?.billableWeight;
        const provider = quote?.provider || {};
        const tier = quote?.tier || {};

        return {
            packageIndex:
                typeof quote?.packageIndex === "number"
                    ? quote.packageIndex
                    : index,
            label,
            weight:
                weight !== undefined && weight !== null ? Number(weight) : null,
            billableWeight:
                billableWeight !== undefined && billableWeight !== null
                    ? Number(billableWeight)
                    : null,
            providerId: provider.id || null,
            providerName: provider.name || "",
            serviceLevel: tier.id || "",
            serviceLabel: tier.label || "",
            eta: tier.eta || "",
            description: tier.description || "",
            priceUSD: Number(tier.price || 0),
        };
    });
};

export const buildReviewContext = (
    detailedQuotes = [],
    displayCurrency = "LKR",
) => {
    const selectedQuotes = summarizeDetailedQuotes(detailedQuotes);
    const totalPriceUSD = selectedQuotes.reduce(
        (total, item) => total + (Number(item.priceUSD) || 0),
        0,
    );

    return {
        selectedQuotes,
        displayCurrency,
        totalPriceUSD,
    };
};
