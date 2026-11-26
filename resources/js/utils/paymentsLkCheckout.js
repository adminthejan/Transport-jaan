// Payments.lk uses a hosted checkout page: the server creates the session and the
// browser simply navigates to the returned URL. No SDK or form post is involved.
export const redirectToCheckout = (checkout) => {
    const url = String(checkout?.checkoutUrl || "");
    if (!url) {
        throw new Error(checkout?.reason || "Checkout session is unavailable.");
    }

    window.location.assign(url);
};
