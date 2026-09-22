const PAYHERE_SDK_SRC = "https://www.payhere.lk/lib/payhere.js";
const PAYHERE_SDK_SELECTOR = 'script[data-payhere-sdk="true"]';
const PAYHERE_UI_STYLE_ID = "payhere-onsite-ui-style";
const PAYHERE_BODY_ACTIVE_CLASS = "payhere-onsite-active";
const PAYHERE_BLUR_TARGET_CLASS = "payhere-onsite-blur-target";

let payHereSdkPromise = null;
let payHereUiLockCount = 0;

const ensurePayHereUiStyles = () => {
    if (typeof document === "undefined") {
        return;
    }

    if (document.getElementById(PAYHERE_UI_STYLE_ID)) {
        return;
    }

    const style = document.createElement("style");
    style.id = PAYHERE_UI_STYLE_ID;
    style.textContent = `
        body.${PAYHERE_BODY_ACTIVE_CLASS} {
            overflow: hidden !important;
        }

        body.${PAYHERE_BODY_ACTIVE_CLASS} .${PAYHERE_BLUR_TARGET_CLASS} {
            filter: blur(6px);
            pointer-events: none;
            user-select: none;
            transition: filter 0.18s ease;
        }
    `;

    document.head.appendChild(style);
};

const lockBackgroundForOnsiteCheckout = () => {
    if (typeof document === "undefined") {
        return;
    }

    ensurePayHereUiStyles();
    payHereUiLockCount += 1;

    const appRoot = document.getElementById("app");
    if (appRoot) {
        appRoot.classList.add(PAYHERE_BLUR_TARGET_CLASS);
    }

    document.body.classList.add(PAYHERE_BODY_ACTIVE_CLASS);
};

const unlockBackgroundForOnsiteCheckout = () => {
    if (typeof document === "undefined") {
        return;
    }

    payHereUiLockCount = Math.max(0, payHereUiLockCount - 1);
    if (payHereUiLockCount > 0) {
        return;
    }

    const appRoot = document.getElementById("app");
    if (appRoot) {
        appRoot.classList.remove(PAYHERE_BLUR_TARGET_CLASS);
    }

    document.body.classList.remove(PAYHERE_BODY_ACTIVE_CLASS);
};

const normalizeCheckoutPayload = (checkout) => {
    const fields = checkout?.fields && typeof checkout.fields === "object" ? checkout.fields : null;
    if (!fields) {
        throw new Error("Checkout payload is missing required fields.");
    }

    const payload = Object.entries(fields).reduce((accumulator, [key, value]) => {
        accumulator[key] = value === null || value === undefined ? "" : String(value);
        return accumulator;
    }, {});

    const checkoutUrl = String(checkout?.checkoutUrl || "").toLowerCase();
    if (checkoutUrl.includes("sandbox.payhere.lk") && payload.sandbox === undefined) {
        payload.sandbox = true;
    }

    return payload;
};

const isSandboxCheckout = (checkout, paymentPayload = null) => {
    const checkoutUrl = String(checkout?.checkoutUrl || "").toLowerCase();
    if (checkoutUrl.includes("sandbox.payhere.lk")) {
        return true;
    }

    if (paymentPayload && typeof paymentPayload.sandbox === "boolean") {
        return paymentPayload.sandbox;
    }

    return false;
};

const finalizeOnsiteSandboxPayment = async (checkout, paymentPayload, orderIdFromCallback) => {
    if (typeof window === "undefined") {
        return;
    }

    if (!isSandboxCheckout(checkout, paymentPayload)) {
        return;
    }

    const returnUrlRaw = paymentPayload?.return_url || checkout?.fields?.return_url;
    if (!returnUrlRaw) {
        return;
    }

    const returnUrl = new URL(String(returnUrlRaw), window.location.origin);
    if (orderIdFromCallback && !returnUrl.searchParams.get("order_id")) {
        returnUrl.searchParams.set("order_id", String(orderIdFromCallback));
    }

    await fetch(returnUrl.toString(), {
        method: "GET",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
        },
    });
};

export const launchPayHereRedirectCheckout = (checkout) => {
    if (!checkout?.checkoutUrl || !checkout?.fields) {
        throw new Error("Checkout session is unavailable.");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = String(checkout.checkoutUrl);

    Object.entries(checkout.fields || {}).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value === null || value === undefined ? "" : String(value);
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
};

export const preloadPayHereOnsiteSdk = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.reject(new Error("PayHere onsite checkout is only available in the browser."));
    }

    if (window.payhere && typeof window.payhere.startPayment === "function") {
        return Promise.resolve(window.payhere);
    }

    if (payHereSdkPromise) {
        return payHereSdkPromise;
    }

    payHereSdkPromise = new Promise((resolve, reject) => {
        const handleReady = () => {
            if (window.payhere && typeof window.payhere.startPayment === "function") {
                resolve(window.payhere);
                return;
            }

            reject(new Error("PayHere SDK loaded, but startPayment is unavailable."));
        };

        const existingScript = document.querySelector(PAYHERE_SDK_SELECTOR);
        if (existingScript) {
            if (window.payhere && typeof window.payhere.startPayment === "function") {
                resolve(window.payhere);
                return;
            }

            const loadedState = existingScript.dataset.loadedState;
            if (loadedState === "loaded" || loadedState === "error") {
                reject(new Error("PayHere SDK is not available on this page."));
                return;
            }

            existingScript.addEventListener("load", handleReady, { once: true });
            existingScript.addEventListener(
                "error",
                () => reject(new Error("Failed to load PayHere SDK.")),
                { once: true }
            );
            return;
        }

        const script = document.createElement("script");
        script.src = PAYHERE_SDK_SRC;
        script.async = true;
        script.dataset.payhereSdk = "true";
        script.addEventListener("load", () => {
            script.dataset.loadedState = "loaded";
            handleReady();
        }, { once: true });
        script.addEventListener(
            "error",
            () => {
                script.dataset.loadedState = "error";
                reject(new Error("Failed to load PayHere SDK."));
            },
            { once: true }
        );

        document.head.appendChild(script);
    }).catch((error) => {
        payHereSdkPromise = null;
        throw error;
    });

    return payHereSdkPromise;
};

export const launchPayHereOnsiteCheckout = async (checkout, callbacks = {}) => {
    const paymentPayload = normalizeCheckoutPayload(checkout);
    const payhere = await preloadPayHereOnsiteSdk();
    let released = false;

    const releaseUiLock = () => {
        if (released) {
            return;
        }

        released = true;
        unlockBackgroundForOnsiteCheckout();
    };

    payhere.onCompleted = (orderId) => {
        releaseUiLock();
        Promise.resolve(finalizeOnsiteSandboxPayment(checkout, paymentPayload, orderId))
            .catch((error) => {
                console.warn("[PayHereCheckout] Sandbox completion reconciliation failed.", error);
            })
            .finally(() => {
                if (typeof callbacks.onCompleted === "function") {
                    callbacks.onCompleted(orderId);
                }
            });
    };

    payhere.onDismissed = () => {
        releaseUiLock();
        if (typeof callbacks.onDismissed === "function") {
            callbacks.onDismissed();
        }
    };

    payhere.onError = (error) => {
        releaseUiLock();
        if (typeof callbacks.onError === "function") {
            callbacks.onError(error);
        }
    };

    lockBackgroundForOnsiteCheckout();

    try {
        payhere.startPayment(paymentPayload);
    } catch (error) {
        releaseUiLock();
        throw error;
    }
};
