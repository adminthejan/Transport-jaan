import React, { useMemo } from "react";
import { usePage } from "@inertiajs/react";
import Header from "../client/ClientHeader";
import WarehouseImages from "../../components/warehouseDetails/WarehouseImages";
import WarehouseSearch from "../../components/warehouseDetails/WarehouseSearch";
import WarehouseInfo from "../../components/warehouseDetails/WarehouseInfo";

const WarehouseDetails = () => {
    const { props } = usePage();
    const { warehouse } = props;

    const memoizedWarehouse = useMemo(() => {
        if (!warehouse) return null;
        return {
            ...warehouse,
            name: warehouse.name,
            price: warehouse.monthly_rate || warehouse.price,
            monthly_rate: warehouse.monthly_rate,
            final_amount: warehouse.final_amount,
            image: warehouse.image,
        };
    }, [warehouse]);

    if (!memoizedWarehouse) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-xl">No warehouse selected</p>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <div className="main-content flex justify-center items-center">
                <div className="py-10 md:px-10 flex flex-col xl:flex-row justify-between w-full gap-10">
                    <div className="flex flex-col gap-10 justify-start items-center w-full">
                        <WarehouseImages />
                        <WarehouseInfo />
                    </div>
                    <div className="flex flex-col justify-start items-center gap-10">
                        <WarehouseSearch />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehouseDetails;