// Mirrors WarehouseUnit::monthlyRateForSpace() on the server. The server
// recomputes every booking price, so this is for display only.
export const usesSqftRate = (warehouse) => Number(warehouse?.rate_per_sqft) > 0;

// Whole-unit monthly rate used by legacy (non per-sqft) listings.
export const baseMonthlyRateOf = (warehouse) =>
    parseFloat(warehouse?.monthly_rate || warehouse?.price || warehouse?.base_price || 0) || 0;

export const monthlyRateForSpace = (warehouse, requiredSpace) => {
    const space = Number(requiredSpace) || 0;
    if (usesSqftRate(warehouse)) {
        return Math.round(space * Number(warehouse.rate_per_sqft) * 100) / 100;
    }
    const totalArea = parseFloat(warehouse?.total_area || 0);
    const utilization = totalArea > 0 ? Math.min(space / totalArea, 1) : 1;
    return baseMonthlyRateOf(warehouse) * utilization;
};
