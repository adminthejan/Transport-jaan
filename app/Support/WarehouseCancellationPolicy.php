<?php

namespace App\Support;

use App\Models\CancellationSetting;

/**
 * Human-readable description of the warehouse cancellation/refund rules.
 *
 * Mirrors WarehouseBookingCancellationController::calculateRefund(): cancelling
 * at least N days before the booking starts refunds 100%, later than that 50%,
 * and once the start date has passed there is no refund.
 */
class WarehouseCancellationPolicy
{
    public static function describe(): array
    {
        $days = CancellationSetting::getDaysForContext('warehouse');

        $rules = $days === 0
            ? [
                'Cancel any time before the start date for a full (100%) refund.',
                'No refund once the booking start date has passed.',
            ]
            : [
                "Cancel {$days} or more days before the start date for a full (100%) refund.",
                "Cancel less than {$days} days before the start date for a 50% refund.",
                'No refund once the booking start date has passed.',
            ];

        return [
            'days' => $days,
            'fullRefundPercent' => 100,
            'partialRefundPercent' => 50,
            'rules' => $rules,
            'text' => implode(' ', $rules),
        ];
    }
}
