<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WalletController extends Controller
{
    public function __construct(protected WalletService $wallets)
    {
    }

    /**
     * Wallet dashboard: balance + top-up form + transaction history.
     */
    public function dashboard(Request $request)
    {
        $user = Auth::user();
        $wallet = $this->wallets->walletFor($user);

        $transactions = $wallet->transactions()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Web/home/client/WalletDashboard', [
            'wallet' => [
                'balance' => (float) $wallet->balance,
                'currency' => $wallet->currency,
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * JSON summary used by the header widget (balance + currency only).
     */
    public function summary(Request $request)
    {
        $user = Auth::user();
        $wallet = $this->wallets->walletFor($user);

        return response()->json([
            'balance' => (float) $wallet->balance,
            'currency' => $wallet->currency,
        ]);
    }

    /**
     * Top up the wallet.
     *
     * NOTE: This codebase has no real payment gateway integrated (no Stripe/PayHere/etc.
     * in composer.json), and the existing vehicle-booking payment flow itself is a manual
     * simulation (payment method is just recorded, e.g. bank-slip upload for "Bank Transfer",
     * with no gateway callback). Consistent with that existing pattern, top-up is simulated:
     * the amount is credited to the wallet immediately as a `completed` transaction. Swapping
     * in a real gateway later only requires changing this method to create a `pending`
     * transaction and complete it from a gateway webhook/callback instead.
     */
    public function topup(Request $request)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
        ]);

        $user = Auth::user();

        $this->wallets->credit(
            $user,
            round((float) $validated['amount'], 2),
            'topup',
            'Wallet top-up'
        );

        return redirect()->route('client.wallet.dashboard')->with('success', 'Wallet topped up successfully.');
    }
}
