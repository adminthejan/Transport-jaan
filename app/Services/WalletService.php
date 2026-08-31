<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    /**
     * Fetch (or lazily create) the wallet for a user.
     */
    public function walletFor(User $user): Wallet
    {
        return Wallet::firstOrCreate(
            ['user_id' => $user->id],
            ['balance' => 0, 'currency' => 'LKR']
        );
    }

    /**
     * Current balance for a user (creates the wallet if needed).
     */
    public function getBalance(User $user): float
    {
        return (float) $this->walletFor($user)->balance;
    }

    /**
     * Credit (add funds to) a user's wallet. Used for top-ups and refunds.
     */
    public function credit(
        User $user,
        float $amount,
        string $type = 'topup',
        ?string $description = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        string $status = 'completed'
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new RuntimeException('Credit amount must be greater than zero.');
        }

        return DB::transaction(function () use ($user, $amount, $type, $description, $referenceType, $referenceId, $status) {
            // Ensure the wallet row exists before we try to lock it.
            $this->walletFor($user);

            /** @var Wallet $wallet */
            $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            $newBalance = round((float) $wallet->balance + $amount, 2);
            $wallet->update(['balance' => $newBalance]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'status' => $status,
                'description' => $description,
            ]);
        });
    }

    /**
     * Debit (remove funds from) a user's wallet. Used for payments.
     *
     * Throws a RuntimeException if the wallet does not have sufficient balance,
     * so callers can surface a clean "insufficient balance" error.
     */
    public function debit(
        User $user,
        float $amount,
        string $type = 'payment',
        ?string $description = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): WalletTransaction {
        if ($amount <= 0) {
            throw new RuntimeException('Debit amount must be greater than zero.');
        }

        return DB::transaction(function () use ($user, $amount, $type, $description, $referenceType, $referenceId) {
            $this->walletFor($user);

            /** @var Wallet $wallet */
            $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->firstOrFail();

            if ((float) $wallet->balance < $amount) {
                throw new InsufficientWalletBalanceException(
                    'Insufficient wallet balance.',
                    (float) $wallet->balance,
                    $amount
                );
            }

            $newBalance = round((float) $wallet->balance - $amount, 2);
            $wallet->update(['balance' => $newBalance]);

            return WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $newBalance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'status' => 'completed',
                'description' => $description,
            ]);
        });
    }
}
