import React from "react";
import VendorShellLayout from "../../../../../Components/vendors/VendorShellLayout";
import QuotesContent from "../../../components/vendors/warehouse/quotes/QuotesContent";

const Quotes = () => {
    return (
        <VendorShellLayout activeService="Warehousing">
            <QuotesContent />
        </VendorShellLayout>
    );
};

export default Quotes;
