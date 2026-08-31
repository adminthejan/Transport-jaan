<?php

namespace App\Services;

use RuntimeException;

class InsufficientWalletBalanceException extends RuntimeException
{
    public float $balance;
    public float $requested;

    public function __construct(string $message, float $balance, float $requested)
    {
        parent::__construct($message);
        $this->balance = $balance;
        $this->requested = $requested;
    }
}
