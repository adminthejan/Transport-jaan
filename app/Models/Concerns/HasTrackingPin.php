<?php

namespace App\Models\Concerns;

trait HasTrackingPin
{
    /**
     * A 6-digit PIN a customer must provide (alongside their email) to
     * unlock the public tracking page for this booking — a reference number
     * alone is guessable/shareable, so it isn't enough on its own.
     */
    public static function generateTrackingPin(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
