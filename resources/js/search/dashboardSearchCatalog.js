const slugify = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

export const createSearchEntry = ({
    id,
    title,
    path,
    manualPath,
    group,
    description,
    keywords = [],
}) => ({
    id,
    title,
    path,
    manualPath,
    group,
    description: description || "",
    keywords,
});

const VENDOR_NAV_META = {
    dashboard: {
        label: "Dashboard",
        description: "Open service-level KPIs and activity overview.",
        keywords: ["overview", "summary"],
    },
    bookings: {
        label: "Bookings",
        description: "Review and manage booking workflow items.",
        keywords: ["orders", "requests", "reservations"],
    },
    units: {
        label: "Units",
        description: "Manage units, assets, or shipment objects.",
        keywords: ["inventory", "fleet", "shipments"],
    },
    tracking: {
        label: "Tracking",
        description: "Monitor shipment and movement status.",
        keywords: ["map", "status"],
    },
    calendar: {
        label: "Calendar",
        description: "Check calendar planning and schedule allocations.",
        keywords: ["schedule", "timeline"],
    },
    clients: {
        label: "Clients",
        description: "Browse and manage client records.",
        keywords: ["customers", "accounts"],
    },
    team: {
        label: "Team",
        description: "Manage team access and collaboration.",
        keywords: ["members", "staff"],
    },
    payment: {
        label: "Payment",
        description: "Review settlement and payment activity.",
        keywords: ["finance", "invoices"],
    },
    expenses: {
        label: "Expenses",
        description: "Track operational expense records.",
        keywords: ["costs", "spending"],
    },
    settings: {
        label: "Settings",
        description: "Configure module-level operational settings.",
        keywords: ["configuration", "preferences"],
    },
    profile: {
        label: "Profile",
        description: "Open service profile and business details.",
        keywords: ["account", "business"],
    },
};

const COURIER_PERMISSION_BY_NAV_KEY = {
    dashboard: "courier.dashboard.view",
    bookings: "courier.bookings.view",
    units: "courier.shipments.view",
    tracking: "courier.tracking.view",
    calendar: "courier.calendar.view",
    clients: "courier.clients.view",
    team: "courier.team.view",
    payment: "courier.finance.view",
    expenses: "courier.finance.view",
    settings: "courier.settings.view",
    profile: "courier.profile.view",
};

const wordsFromKey = (value) =>
    String(value || "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const VENDOR_NAV_KEYS = [
    "dashboard",
    "bookings",
    "units",
    "tracking",
    "calendar",
    "clients",
    "team",
    "payment",
    "expenses",
    "settings",
    "profile",
];

export const buildVendorDashboardSearchEntries = ({
    serviceTabs = [],
    serviceConfig = {},
    isVerified = false,
    canAccessService,
    hasCourierPermission,
    routePathResolver,
}) => {
    if (typeof canAccessService !== "function" || typeof routePathResolver !== "function") {
        return [];
    }

    const canAccessCourierPermission =
        typeof hasCourierPermission === "function" ? hasCourierPermission : () => true;

    const entries = [];
    const dedupeKeys = new Set();

    const pushEntry = (entry) => {
        if (!entry?.path || !entry?.title) {
            return;
        }

        const dedupeKey = `${entry.path}::${entry.title}`;

        if (dedupeKeys.has(dedupeKey)) {
            return;
        }

        dedupeKeys.add(dedupeKey);
        entries.push(entry);
    };

    serviceTabs.forEach((tab) => {
        if (!tab?.name) {
            return;
        }

        if (!isVerified || !canAccessService(tab.name)) {
            return;
        }

        const serviceName = tab.name;
        const cfg = serviceConfig[serviceName];

        if (!cfg) {
            return;
        }

        VENDOR_NAV_KEYS.forEach((navKey) => {
            const routeFn = cfg[navKey];

            if (typeof routeFn !== "function") {
                return;
            }

            if (serviceName === "Courier Service") {
                const permission = COURIER_PERMISSION_BY_NAV_KEY[navKey];

                if (permission && !canAccessCourierPermission(permission)) {
                    return;
                }
            }

            const path = routePathResolver(routeFn);

            if (!path) {
                return;
            }

            const meta = VENDOR_NAV_META[navKey] || {
                label: navKey,
                description: "Open this dashboard section.",
                keywords: [],
            };

            const navLabel =
                navKey === "bookings"
                    ? cfg.bookingsLabel || meta.label
                    : navKey === "units"
                        ? cfg.unitsLabel || meta.label
                        : meta.label;

            pushEntry(
                createSearchEntry({
                    id: `vendor-${slugify(serviceName)}-${slugify(navKey)}-${slugify(path)}`,
                    title: `${serviceName} ${navLabel}`,
                    path,
                    manualPath: `${serviceName} > ${navLabel}`,
                    group: serviceName,
                    description: meta.description,
                    keywords: [serviceName, navLabel, ...(meta.keywords || [])],
                })
            );
        });

        const canSeeSettingsModules =
            serviceName !== "Courier Service" || canAccessCourierPermission("courier.settings.view");

        if (!canSeeSettingsModules || !Array.isArray(cfg.settingsModules)) {
            return;
        }

        cfg.settingsModules.forEach((moduleItem) => {
            const path = routePathResolver(moduleItem?.route);

            if (!path || !moduleItem?.label) {
                return;
            }

            pushEntry(
                createSearchEntry({
                    id: `vendor-${slugify(serviceName)}-settings-${slugify(moduleItem.key || moduleItem.label)}-${slugify(path)}`,
                    title: `${serviceName} Settings ${moduleItem.label}`,
                    path,
                    manualPath: `${serviceName} > Settings > ${moduleItem.label}`,
                    group: serviceName,
                    description: "Open a focused settings module.",
                    keywords: [
                        serviceName,
                        "settings",
                        moduleItem.label,
                        "configuration",
                        wordsFromKey(moduleItem.key || ""),
                        ...path
                            .split("/")
                            .filter(Boolean)
                            .map((segment) => wordsFromKey(segment)),
                    ],
                })
            );
        });

        if (serviceName === "Courier Service") {
            const courierDeepSections = [
                {
                    key: "currency-formula",
                    label: "Currency and Formula",
                    path: "/courierService/settingsPage/pricing/currency-formula/domestic",
                    description: "Configure localized currency display and formula controls.",
                    keywords: ["currency", "formula", "pricing", "domestic", "international"],
                },
                {
                    key: "policy-modules",
                    label: "Policy Modules",
                    path: "/courierService/settingsPage/pricing/policy-modules/domestic",
                    description: "Define policy modules applied to courier pricing calculations.",
                    keywords: ["policy modules", "policies", "pricing", "domestic", "international"],
                },
                {
                    key: "contracts",
                    label: "Customer Contracts",
                    path: "/courierService/settingsPage/pricing/contracts/domestic",
                    description: "Manage contract-specific price rules and agreements.",
                    keywords: ["contracts", "customer contracts", "pricing", "domestic", "international"],
                },
                {
                    key: "service-catalog",
                    label: "Service Catalog",
                    path: "/courierService/settingsPage/pricing/service-catalog/domestic",
                    description: "Configure explicit service-level policies and SLA options.",
                    keywords: ["service catalog", "service levels", "sla", "pricing", "domestic", "international"],
                },
                {
                    key: "governance",
                    label: "Pricing Governance",
                    path: "/courierService/settingsPage/pricing/governance/domestic",
                    description: "Review pricing governance controls and approval checkpoints.",
                    keywords: ["pricing governance", "governance", "pricing", "domestic", "international"],
                },
                {
                    key: "rate-cards",
                    label: "Rate Cards",
                    path: "/courierService/settingsPage/pricing/rate-cards/domestic",
                    description: "Manage domestic courier rate cards and SLA pricing rows.",
                    keywords: ["rate cards", "pricing", "domestic", "sla"],
                },
                {
                    key: "zone-master",
                    label: "Zone Master",
                    path: "/courierService/settingsPage/pricing/zone-master/domestic",
                    description: "Maintain courier zone definitions used by pricing logic.",
                    keywords: ["zone master", "zones", "pricing"],
                },
                {
                    key: "lane-matrix",
                    label: "Lane Matrix",
                    path: "/courierService/settingsPage/pricing/lane-matrix/domestic",
                    description: "Configure lane matrix mapping for route-based calculations.",
                    keywords: ["lane matrix", "routes", "pricing"],
                },
                {
                    key: "preview",
                    label: "Formula Preview",
                    path: "/courierService/settingsPage/pricing/preview/domestic",
                    description: "Preview pricing formula outcomes before publishing.",
                    keywords: ["formula", "preview", "pricing"],
                },
            ];

            courierDeepSections.forEach((section) => {
                pushEntry(
                    createSearchEntry({
                        id: `vendor-courier-section-${section.key}`,
                        title: `Courier Service ${section.label}`,
                        path: section.path,
                        manualPath: `Courier Service > Settings > Pricing > ${section.label}`,
                        group: "Courier Service",
                        description: section.description,
                        keywords: ["courier service", "settings", ...(section.keywords || [])],
                    })
                );
            });
        }
    });

    return entries;
};



export const buildClientDashboardSearchEntries = () => [
    createSearchEntry({
        id: "client-track-order",
        title: "Track Any Order",
        path: "/track",
        manualPath: "Client Dashboard > Track Any Order",
        group: "Client",
        description: "Track a courier shipment, vehicle rental, or bus/train ticket by reference.",
        keywords: ["track", "tracking", "reference", "shipment", "booking", "pin"],
    }),
    createSearchEntry({
        id: "client-all-bookings",
        title: "All Bookings Dashboard",
        path: "/clientAllBookings",
        manualPath: "Client Dashboard > All Bookings",
        group: "Client",
        description: "View all bookings across every service channel.",
        keywords: ["bookings", "overview", "dashboard"],
    }),
    createSearchEntry({
        id: "client-vehicle-dashboard",
        title: "Vehicle Rental Dashboard",
        path: "/clientVehicleDashboard",
        manualPath: "Client Dashboard > Vehicle Rental",
        group: "Client",
        description: "Open vehicle rental bookings and related actions.",
        keywords: ["vehicle", "rental", "cars", "dashboard"],
    }),
    createSearchEntry({
        id: "client-ticket-dashboard",
        title: "Ticket Booking Dashboard",
        path: "/clientTicketBookingDashboard",
        manualPath: "Client Dashboard > Ticket Booking",
        group: "Client",
        description: "Track train, bus, and flight ticket bookings.",
        keywords: ["ticket", "flight", "train", "bus"],
    }),
    createSearchEntry({
        id: "client-courier-dashboard",
        title: "Courier Dashboard",
        path: "/courierBookingDashboard",
        manualPath: "Client Dashboard > Courier Booking",
        group: "Client",
        description: "Manage client courier shipments and status.",
        keywords: ["courier", "shipment", "delivery"],
    }),
    createSearchEntry({
        id: "client-warehouse-dashboard",
        title: "Warehouse Dashboard",
        path: "/warehouseBookingDashboard",
        manualPath: "Client Dashboard > Warehouse Booking",
        group: "Client",
        description: "Review warehousing reservations and updates.",
        keywords: ["warehouse", "storage", "reservation"],
    }),
    createSearchEntry({
        id: "client-freight-dashboard",
        title: "Freight Dashboard",
        path: "/freightBookingDashboard",
        manualPath: "Client Dashboard > Freight Booking",
        group: "Client",
        description: "Open freight booking and transport records.",
        keywords: ["freight", "cargo", "logistics"],
    }),
    createSearchEntry({
        id: "client-dashboard-settings",
        title: "Client Dashboard Settings",
        path: "/clientDashboardSettings",
        manualPath: "Client Dashboard > Settings",
        group: "Client",
        description: "Manage account preferences and profile settings.",
        keywords: ["settings", "profile", "preferences"],
    }),
    createSearchEntry({
        id: "client-create-courier",
        title: "Create Courier Shipment",
        path: "/couriers/create",
        manualPath: "Client Dashboard > Courier Booking > Create",
        group: "Client",
        description: "Start a new courier shipment request.",
        keywords: ["courier", "new shipment", "create"],
    }),
    createSearchEntry({
        id: "client-multimodel-plan",
        title: "Plan Journey",
        path: "/multiModel/plan-journey",
        manualPath: "Client Dashboard > Journey Planner",
        group: "Client",
        description: "Plan multimodal journeys and discover transport options.",
        keywords: ["journey", "plan", "multimodal", "travel"],
    }),
];

export const buildSuperAdminDashboardSearchEntries = ({
    canViewReports = true,
    canViewCodSettlement = true,
    canViewPayments = true,
    canViewCourierOperations = true,
    canViewPricingGovernance = true,
}) => {
    const entries = [
        createSearchEntry({
            id: "superadmin-dashboard",
            title: "Dashboard",
            path: "/superadmin/dashboard",
            manualPath: "Super Admin > Dashboard",
            group: "Super Admin",
            description: "Open the super admin operational dashboard.",
            keywords: ["overview", "analytics", "home"],
        }),
        createSearchEntry({
            id: "superadmin-analytics",
            title: "Analytics",
            path: "/superadmin/analytics",
            manualPath: "Super Admin > Dashboard > Analytics",
            group: "Super Admin",
            description: "Review platform-wide analytics and trends.",
            keywords: ["metrics", "insights", "charts"],
        }),
        createSearchEntry({
            id: "superadmin-vehicles",
            title: "Vehicles Service",
            path: "/superadmin/vehicles",
            manualPath: "Super Admin > Services > Vehicles",
            group: "Services",
            description: "Manage vehicle rental providers and fleet assets.",
            keywords: ["vehicle", "rental", "fleet"],
        }),
        createSearchEntry({
            id: "superadmin-warehouse",
            title: "Warehouse Service",
            path: "/superadmin/warehouse",
            manualPath: "Super Admin > Services > Warehouse",
            group: "Services",
            description: "Manage warehousing providers and operations.",
            keywords: ["warehouse", "storage"],
        }),
        createSearchEntry({
            id: "superadmin-users-clients",
            title: "Clients",
            path: "/superadmin/users/clients",
            manualPath: "Super Admin > Users > Clients",
            group: "Users",
            description: "Browse and audit platform client accounts.",
            keywords: ["users", "customers", "accounts"],
        }),
        createSearchEntry({
            id: "superadmin-users-providers",
            title: "Service Providers",
            path: "/superadmin/users/service-providers",
            manualPath: "Super Admin > Users > Service Providers",
            group: "Users",
            description: "Manage and review provider account statuses.",
            keywords: ["vendors", "providers", "approvals"],
        }),
        createSearchEntry({
            id: "superadmin-users-drivers",
            title: "Drivers",
            path: "/superadmin/users/drivers",
            manualPath: "Super Admin > Users > Drivers",
            group: "Users",
            description: "Open driver user management tools.",
            keywords: ["driver", "operators"],
        }),
        createSearchEntry({
            id: "superadmin-cancellation-settings",
            title: "Cancellation Settings",
            path: "/superadmin/settings/cancellation",
            manualPath: "Super Admin > Settings > Cancellation Settings",
            group: "Settings",
            description: "Configure system cancellation behavior and policies.",
            keywords: ["policy", "cancellation"],
        }),
        createSearchEntry({
            id: "superadmin-website-settings",
            title: "Website Settings",
            path: "/superadmin/settings/website",
            manualPath: "Super Admin > Settings > Website Settings",
            group: "Settings",
            description: "Update global website configuration.",
            keywords: ["website", "content", "branding"],
        }),
        createSearchEntry({
            id: "superadmin-commission-settings",
            title: "Commission Settings",
            path: "/superadmin/settings/commission",
            manualPath: "Super Admin > Finance > Commission Settings",
            group: "Finance",
            description: "Set and adjust commission logic and rates.",
            keywords: ["commission", "revenue", "finance"],
        }),
        createSearchEntry({
            id: "superadmin-profile",
            title: "Profile",
            path: "/superadmin/profile",
            manualPath: "Super Admin > Account Settings > Profile",
            group: "Account",
            description: "Open super admin profile and account details.",
            keywords: ["profile", "account"],
        }),
        createSearchEntry({
            id: "superadmin-cod-capability-requests",
            title: "COD Capability Requests",
            path: "/superadmin/settings/cod-settlement#vendor-cod-capability-requests",
            manualPath: "Super Admin > COD Settlement > COD Capability Requests",
            group: "Courier Management",
            description: "Review and process vendor COD capability approval requests.",
            keywords: ["cod", "capability", "requests", "vendor", "settlement"],
        }),
    ];

    if (canViewReports) {
        entries.push(
            createSearchEntry({
                id: "superadmin-report-vehicles",
                title: "Vehicle Rental Report",
                path: "/superadmin/reports/vehicles",
                manualPath: "Super Admin > Reports > Service Reports > Vehicle Rental",
                group: "Reports",
                description: "Analyze vehicle booking report metrics.",
                keywords: ["report", "vehicle", "bookings"],
            }),
            createSearchEntry({
                id: "superadmin-report-tickets",
                title: "Ticket Booking Report",
                path: "/superadmin/reports/tickets",
                manualPath: "Super Admin > Reports > Service Reports > Ticket Booking",
                group: "Reports",
                description: "Analyze ticket booking report metrics.",
                keywords: ["report", "ticket", "flight", "train", "bus"],
            }),
            createSearchEntry({
                id: "superadmin-report-warehouse",
                title: "Warehousing Report",
                path: "/superadmin/reports/warehouse",
                manualPath: "Super Admin > Reports > Service Reports > Warehousing",
                group: "Reports",
                description: "Analyze warehouse performance and demand.",
                keywords: ["report", "warehouse"],
            }),
            createSearchEntry({
                id: "superadmin-report-multimodal",
                title: "Multimodal Report",
                path: "/superadmin/reports/multimodal",
                manualPath: "Super Admin > Reports > Service Reports > Multimodal",
                group: "Reports",
                description: "Review cross-service multimodal reporting.",
                keywords: ["report", "multimodal"],
            }),
            createSearchEntry({
                id: "superadmin-report-courier",
                title: "Courier Report",
                path: "/superadmin/reports/courier",
                manualPath: "Super Admin > Reports > Service Reports > Courier",
                group: "Reports",
                description: "Inspect courier shipment and SLA reports.",
                keywords: ["report", "courier", "shipments"],
            }),
            createSearchEntry({
                id: "superadmin-report-freight",
                title: "Freight Report",
                path: "/superadmin/reports/freight",
                manualPath: "Super Admin > Reports > Service Reports > Freight",
                group: "Reports",
                description: "Inspect freight booking and logistics reports.",
                keywords: ["report", "freight", "cargo"],
            }),
            createSearchEntry({
                id: "superadmin-report-users-clients",
                title: "Client Report",
                path: "/superadmin/reports/users/clients",
                manualPath: "Super Admin > Reports > User Reports > Clients",
                group: "Reports",
                description: "Review client activity and behavior reporting.",
                keywords: ["report", "clients", "users"],
            }),
            createSearchEntry({
                id: "superadmin-report-users-providers",
                title: "Service Provider Report",
                path: "/superadmin/reports/users/service-providers",
                manualPath: "Super Admin > Reports > User Reports > Service Providers",
                group: "Reports",
                description: "Track provider performance and compliance.",
                keywords: ["report", "service providers", "vendors"],
            }),
            createSearchEntry({
                id: "superadmin-report-users-drivers",
                title: "Drivers Report",
                path: "/superadmin/reports/users/drivers",
                manualPath: "Super Admin > Reports > User Reports > Drivers",
                group: "Reports",
                description: "Track driver activity and service quality.",
                keywords: ["report", "drivers"],
            })
        );
    }

    if (canViewCourierOperations) {
        entries.push(
            createSearchEntry({
                id: "superadmin-courier-operations",
                title: "Courier Operations Control",
                path: "/superadmin/courier-operations",
                manualPath: "Super Admin > Services > Courier Management > Operations Control",
                group: "Courier Management",
                description: "Monitor and operate courier execution controls.",
                keywords: ["courier", "operations", "control"],
            })
        );
    }

    if (canViewPricingGovernance) {
        entries.push(
            createSearchEntry({
                id: "superadmin-courier-pricing-governance",
                title: "Courier Pricing Governance",
                path: "/superadmin/pricing-governance",
                manualPath: "Super Admin > Services > Courier Management > Pricing Governance",
                group: "Courier Management",
                description: "Govern courier pricing policies and lifecycle.",
                keywords: ["pricing", "governance", "courier"],
            })
        );
    }

    if (canViewCodSettlement) {
        entries.push(
            createSearchEntry({
                id: "superadmin-cod-settlement",
                title: "COD Settlement",
                path: "/superadmin/settings/cod-settlement",
                manualPath: "Super Admin > Finance > COD Settlement",
                group: "Finance",
                description: "Open COD settlement operations and controls.",
                keywords: ["cod", "settlement", "finance", "courier"],
            })
        );
    }

    if (canViewPayments) {
        entries.push(
            createSearchEntry({
                id: "superadmin-payments",
                title: "Payments",
                path: "/superadmin/payments",
                manualPath: "Super Admin > Finance > Payments",
                group: "Finance",
                description: "Review payment operations and transaction summaries.",
                keywords: ["payments", "transactions", "finance"],
            })
        );
    }

    return entries;
};
