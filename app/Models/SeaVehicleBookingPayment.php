<?php

namespace App\Models;

use App\Models\Concerns\HasGatewayPaymentLifecycle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeaVehicleBookingPayment extends Model
{
    use HasGatewayPaymentLifecycle;

    protected $table = 'sea_vehicle_booking_payments';

    protected $fillable = [
        'sea_vehicle_booking_id',
        'method',
        'option',
        'amount_paid',
        'status',
        'slip_number',
        'slip_path',
        'tx_reference',
        'meta',
        'provider', 'gateway_order_id', 'gateway_payment_id', 'gateway_status',
        'initiated_at', 'paid_at', 'failed_at', 'last_notified_at',
        'failure_reason', 'gateway_payload', 'callback_payload',
    ];

    protected $casts = [
        'meta' => 'array',
        'amount_paid' => 'float',
        'initiated_at' => 'datetime',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'last_notified_at' => 'datetime',
        'gateway_payload' => 'array',
        'callback_payload' => 'array',
    ];

    public function booking(): BelongsTo
    {
        return $this->belongsTo(SeaVehicleBookings::class, 'sea_vehicle_booking_id');
    }
}
