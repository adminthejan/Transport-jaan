<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\PaymentsLkGatewayService;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
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
     * Start a real top-up: creates a 'pending' WalletTransaction (no balance
     * change yet) and sends the customer to the Payments.lk checkout page. The
     * wallet is only actually credited once handleNotify()/handleReturn()
     * confirm the charge — see WalletService::completeTopup().
     */
    public function topup(Request $request)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:1000000'],
        ]);

        $user = Auth::user();
        $orderId = $this->generateOrderId();

        $transaction = $this->wallets->initiateTopup($user, round((float) $validated['amount'], 2), $orderId);

        return redirect()->route('client.wallet.checkout', ['transaction' => $transaction->id]);
    }

    public function checkout(Request $request, int $transaction)
    {
        $user = Auth::user();
        $tx = WalletTransaction::whereHas('wallet', fn ($q) => $q->where('user_id', $user->id))
            ->findOrFail($transaction);

        $gateway = app(PaymentsLkGatewayService::class);
        $checkout = $tx->status === 'pending'
            ? $this->buildCheckout($gateway, $tx, $user)
            : ['isReady' => false, 'reason' => null, 'checkoutUrl' => null, 'checkoutId' => null, 'method' => 'GET', 'fields' => []];

        $payload = [
            'transaction' => $this->serializeTransaction($tx),
            'checkout' => $checkout,
            'pollingUrl' => route('client.wallet.checkout.status', ['transaction' => $tx->id]),
            'walletDashboardUrl' => route('client.wallet.dashboard'),
        ];

        if ($request->expectsJson()) {
            return response()->json($payload);
        }

        return Inertia::render('Web/home/client/WalletTopupCheckout', $payload);
    }

    public function status(Request $request, int $transaction)
    {
        $user = Auth::user();
        $tx = WalletTransaction::whereHas('wallet', fn ($q) => $q->where('user_id', $user->id))
            ->findOrFail($transaction);

        return response()->json(['transaction' => $this->serializeTransaction($tx)]);
    }

    /**
     * Browser return from Payments.lk. The redirect itself proves nothing, so
     * if the webhook hasn't landed yet the checkout is re-read from the API
     * and resolved here; either way the customer ends up on the checkout page
     * that reflects the current state.
     */
    public function handleReturn(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $tx = WalletTransaction::where('gateway_order_id', $orderId)->first();

        if (!$tx) {
            return redirect()->route('client.wallet.dashboard')->with('error', 'We could not find that top-up.');
        }

        if ($tx->status === 'pending') {
            $result = app(PaymentsLkGatewayService::class)->fetchResult($tx);
            if ($result !== null) {
                $this->applyResolvedStatus($tx, $result);
            }
        }

        return redirect()->route('client.wallet.checkout', ['transaction' => $tx->id]);
    }

    public function handleCancel(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $tx = WalletTransaction::where('gateway_order_id', $orderId)->first();

        if ($tx && $tx->status === 'pending') {
            $this->wallets->failTopup($tx, 'Cancelled by customer at Payments.lk.');
        }

        return redirect()->route('client.wallet.dashboard')->with('error', 'Top-up cancelled.');
    }

    /** Called by PaymentsLkWebhookController for WTP-* references. */
    public function applyPaymentsLkResult(array $result): void
    {
        $tx = WalletTransaction::where('gateway_order_id', $result['orderId'])->first();
        if (!$tx) {
            Log::warning('Payments.lk wallet webhook: unknown order', ['order_id' => $result['orderId']]);

            return;
        }

        $this->applyResolvedStatus($tx, $result);
    }

    private function applyResolvedStatus(WalletTransaction $tx, array $result): void
    {
        $gateway = app(PaymentsLkGatewayService::class);

        DB::transaction(function () use ($gateway, $tx, $result) {
            $locked = WalletTransaction::where('id', $tx->id)->lockForUpdate()->first();
            if (!$locked || $locked->status === 'completed') {
                return; // idempotent — already applied
            }

            $callbackLog = is_array($locked->callback_payload) ? $locked->callback_payload : [];
            $callbackLog[] = ['at' => now()->toIso8601String(), 'result' => $result];
            $locked->update(['callback_payload' => $callbackLog, 'last_notified_at' => now()]);

            $validation = $gateway->validateAgainstExpected($result, [
                'orderId' => (string) $locked->gateway_order_id,
                'amount' => (float) $locked->amount,
                'currency' => 'LKR',
            ]);

            if (!$validation['isValid']) {
                Log::error('Payments.lk: wallet top-up result rejected', ['order_id' => $locked->gateway_order_id, 'reason' => $validation['reason']]);
                $this->wallets->failTopup($locked, 'Payment result mismatch: ' . $validation['reason']);
                return;
            }

            if ($result['status'] === PaymentsLkGatewayService::STATUS_PAID) {
                $this->wallets->completeTopup($locked, $result['paymentId'] ?: null, $result['status']);
            } elseif (in_array($result['status'], [PaymentsLkGatewayService::STATUS_FAILED, PaymentsLkGatewayService::STATUS_EXPIRED], true)) {
                $this->wallets->failTopup(
                    $locked,
                    $result['message'] !== '' ? $result['message'] : "Payments.lk status: {$result['status']}",
                    $result['status']
                );
            }
            // pending: nothing to do yet.
        });
    }

    private function buildCheckout(PaymentsLkGatewayService $gateway, WalletTransaction $tx, User $user): array
    {
        return $gateway->checkoutFor($tx, [
            'orderId' => (string) $tx->gateway_order_id,
            'amount' => (float) $tx->amount,
            'currency' => 'LKR',
            'description' => 'Wallet top-up',
            'successUrl' => route('client.wallet.payhere.return', ['order_id' => $tx->gateway_order_id]),
            'cancelUrl' => route('client.wallet.payhere.cancel', ['order_id' => $tx->gateway_order_id]),
            'customerName' => (string) ($user->name ?? 'Wallet Customer'),
            'customerEmail' => (string) ($user->email ?? ''),
            'customerPhone' => (string) ($user->phone ?? ''),
        ]);
    }

    private function serializeTransaction(WalletTransaction $tx): array
    {
        return [
            'id' => $tx->id,
            'amount' => (float) $tx->amount,
            'status' => (string) $tx->status,
            'orderId' => (string) ($tx->gateway_order_id ?? ''),
            'gatewayStatus' => (string) ($tx->gateway_status ?? ''),
            'failureReason' => (string) ($tx->failure_reason ?? ''),
            'balanceAfter' => (float) $tx->balance_after,
        ];
    }

    private function generateOrderId(): string
    {
        return 'WTP-' . now()->format('ymd') . '-' . strtoupper(Str::random(8));
    }
}
