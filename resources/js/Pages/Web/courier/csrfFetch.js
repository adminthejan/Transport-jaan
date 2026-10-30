// Security tokens (CSRF) expire when a booking page stays open for a long time. Customers should
// never have to know about that, so these helpers fetch a fresh token in the background and retry
// the request once instead of surfacing an error.

const readToken = () => {
    if (typeof document === "undefined") {
        return "";
    }

    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
};

/** Fetches a fresh token from the server and stores it in the page. Returns true on success. */
export const refreshCsrfToken = async () => {
    try {
        const response = await fetch("/csrf-token", {
            method: "GET",
            credentials: "same-origin",
            headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
            cache: "no-store",
        });

        if (!response.ok) {
            return false;
        }

        const payload = await response.json();
        if (!payload?.token) {
            return false;
        }

        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute("content", payload.token);
        }

        return true;
    } catch (error) {
        return false;
    }
};

/**
 * fetch() for same-origin POSTs that need a CSRF token. Adds the token header and, if the server
 * answers 419 (token expired), refreshes the token and retries exactly once.
 */
export const fetchWithCsrf = async (url, options = {}) => {
    const send = () => fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
            ...(options.headers || {}),
            "X-CSRF-TOKEN": readToken(),
            "X-Requested-With": "XMLHttpRequest",
        },
    });

    if (!readToken()) {
        await refreshCsrfToken();
    }

    let response = await send();

    if (response.status === 419 && (await refreshCsrfToken())) {
        response = await send();
    }

    return response;
};

/** True when the server says the customer is not (or no longer) signed in. */
export const isAuthFailure = (status) => status === 401 || status === 419;

const DRAFT_PREFIX = "courierBookingDraft:";

/**
 * Keeps the customer's in-progress booking in this browser tab, then sends them to the sign-in
 * page. After signing in they land back on the current page and the draft is restored.
 */
export const redirectToSignIn = (draftKey, draft) => {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.sessionStorage.setItem(DRAFT_PREFIX + draftKey, JSON.stringify(draft));
    } catch (error) {
        // storage unavailable: the customer just starts the form again after signing in
    }

    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/signin?redirect=${encodeURIComponent(returnTo)}`);
};

/** Returns (and removes) the draft saved before sign-in, or null when there is none. */
export const takeSavedDraft = (draftKey) => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(DRAFT_PREFIX + draftKey);
        if (!raw) {
            return null;
        }

        window.sessionStorage.removeItem(DRAFT_PREFIX + draftKey);
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
};

/** Plain-language messages for failed booking requests (no technical terms or status codes). */
export const friendlyFailureMessage = (status) => {
    if (isAuthFailure(status)) {
        return "Please sign in to continue. Redirecting you to the sign-in page...";
    }

    if (status === 403) {
        return "You do not have permission to continue with this booking.";
    }

    if (status === 429) {
        return "Too many attempts. Please wait a moment and try again.";
    }

    return "We could not complete this step right now. Please try again in a moment.";
};
