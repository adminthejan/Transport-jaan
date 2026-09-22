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
     * Start a real (gateway-backed) top-up: records a 'pending' transaction
     * with the PayHere order id, but does NOT touch the wallet balance yet
     * — that only happens in completeTopup(), once the webhook confirms the
     * charge actually went through. Unlike credit(), which is used for
     * instant/trusted credits (refunds, admin adjustments).
     */
    public function initiateTopup(User $user, float $amount, string $orderId): WalletTransaction
    {
        if ($amount <= 0) {
            throw new RuntimeException('Top-up amount must be greater than zero.');
        }

        $wallet = $this->walletFor($user);

        return WalletTransaction::create([
            'wallet_id' => $wallet->id,
            'type' => 'topup',
            'amount' => $amount,
            'balance_after' => $wallet->balance, // unchanged until completed
            'status' => 'pending',
            'description' => 'Wallet top-up via PayHere',
            'provider' => 'payhere',
            'gateway_order_id' => $orderId,
            'initiated_at' => now(),
        ]);
    }

    /**
     * Confirm a pending top-up once PayHere's webhook/return verifies the
     * charge — credits the wallet and completes the transaction. Idempotent:
     * safe to call more than once for the same transaction (e.g. both the
     * browser return and the async webhook resolve it).
     */
    public function completeTopup(
        WalletTransaction $transaction,
        ?string $gatewayPaymentId = null,
        ?string $gatewayStatus = null
    ): WalletTransaction {
        return DB::transaction(function () use ($transaction, $gatewayPaymentId, $gatewayStatus) {
            /** @var WalletTransaction $locked */
            $locked = WalletTransaction::where('id', $transaction->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === 'completed') {
                return $locked; // already applied — don't double-credit
            }

            /** @var Wallet $wallet */
            $wallet = Wallet::where('id', $locked->wallet_id)->lockForUpdate()->firstOrFail();
            $newBalance = round((float) $wallet->balance + (float) $locked->amount, 2);
            $wallet->update(['balance' => $newBalance]);

            $locked->update([
                'status' => 'completed',
                'balance_after' => $newBalance,
                'gateway_payment_id' => $gatewayPaymentId ?: $locked->gateway_payment_id,
                'gateway_status' => $gatewayStatus ?: $locked->gateway_status,
            ]);

            return $locked->fresh();
        });
    }

    public function failTopup(WalletTransaction $transaction, string $reason = '', ?string $gatewayStatus = null): WalletTransaction
    {
        if ($transaction->status === 'completed') {
            return $transaction; // never downgrade a completed credit
        }

        $transaction->update([
            'status' => 'failed',
            'failure_reason' => $reason !== '' ? $reason : $transaction->failure_reason,
            'gateway_status' => $gatewayStatus ?: $transaction->gateway_status,
            'failed_at' => now(),
        ]);

        return $transaction->fresh();
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
