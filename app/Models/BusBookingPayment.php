<?php

namespace App\Models;

use App\Models\Concerns\HasGatewayPaymentLifecycle;
use Illuminate\Database\Eloquent\Model;

class BusBookingPayment extends Model
{
    use HasGatewayPaymentLifecycle;

    protected $fillable = [
        'bus_booking_id', 'method', 'option', 'amount_paid', 'status', 'tx_reference',
        'provider', 'gateway_order_id', 'gateway_payment_id', 'gateway_status',
        'initiated_at', 'paid_at', 'failed_at', 'last_notified_at',
        'failure_reason', 'gateway_payload', 'callback_payload',
    ];

    protected $casts = [
        'amount_paid' => 'float',
        'initiated_at' => 'datetime',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'last_notified_at' => 'datetime',
        'gateway_payload' => 'array',
        'callback_payload' => 'array',
    ];

    public function busBooking()
    {
        return $this->belongsTo(BusBooking::class);
    }
}
