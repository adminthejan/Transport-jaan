<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\PayHereGatewayService;
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
     * change yet) and sends the customer to the PayHere checkout page. The
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

        $gateway = app(PayHereGatewayService::class);
        $checkout = $this->buildCheckout($gateway, $tx, $user);

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
     * PayHere's browser return URL. If the notify webhook already landed
     * first (common — PayHere often fires it before the browser redirect
     * completes), this just reflects the now-completed state. Otherwise it
     * verifies the signature itself so the customer isn't stuck looking
     * "pending" until the async webhook shows up.
     */
    public function handleReturn(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $tx = WalletTransaction::where('gateway_order_id', $orderId)->first();

        if (!$tx) {
            return redirect()->route('client.wallet.dashboard')->with('error', 'We could not find that top-up.');
        }

        if ($tx->status === 'pending') {
            $gateway = app(PayHereGatewayService::class);
            $payload = $request->query();

            if ($gateway->verifyNotifySignature($payload)) {
                $this->applyResolvedStatus($gateway, $tx, $payload);
            } elseif ($this->isSandbox() && $request->query('status_code') === null) {
                // Sandbox convenience: PayHere's sandbox return sometimes omits
                // status_code/signature entirely on a successful test payment.
                // Same workaround CourierPaymentController uses.
                $this->wallets->completeTopup($tx, null, 'sandbox-return');
            }
        }

        return redirect()->route('client.wallet.checkout', ['transaction' => $tx->id]);
    }

    public function handleCancel(Request $request)
    {
        $orderId = trim((string) $request->query('order_id', ''));
        $tx = WalletTransaction::where('gateway_order_id', $orderId)->first();

        if ($tx && $tx->status === 'pending') {
            $this->wallets->failTopup($tx, 'Cancelled by customer at PayHere.');
        }

        return redirect()->route('client.wallet.dashboard')->with('error', 'Top-up cancelled.');
    }

    /**
     * The actual webhook. PayHere expects a plain-text 200 response, not JSON.
     */
    public function handleNotify(Request $request)
    {
        $payload = $request->all();
        $orderId = trim((string) ($payload['order_id'] ?? ''));

        $tx = WalletTransaction::where('gateway_order_id', $orderId)->first();
        if (!$tx) {
            Log::warning('PayHere wallet notify: unknown order_id', ['order_id' => $orderId]);
            return response('order not found', 404);
        }

        $gateway = app(PayHereGatewayService::class);
        if (!$gateway->verifyNotifySignature($payload)) {
            Log::warning('PayHere wallet notify: signature mismatch', ['order_id' => $orderId]);
            return response('invalid signature', 400);
        }

        $this->applyResolvedStatus($gateway, $tx, $payload);

        return response('OK', 200);
    }

    private function applyResolvedStatus(PayHereGatewayService $gateway, WalletTransaction $tx, array $payload): void
    {
        DB::transaction(function () use ($gateway, $tx, $payload) {
            $locked = WalletTransaction::where('id', $tx->id)->lockForUpdate()->first();
            if (!$locked || $locked->status === 'completed') {
                return; // idempotent — already applied
            }

            $callbackLog = is_array($locked->callback_payload) ? $locked->callback_payload : [];
            $callbackLog[] = ['at' => now()->toIso8601String(), 'payload' => $payload];
            $locked->update(['callback_payload' => $callbackLog, 'last_notified_at' => now()]);

            $validation = $gateway->validateNotifyAgainstExpected($payload, [
                'orderId' => (string) $locked->gateway_order_id,
                'amount' => (float) $locked->amount,
                'currency' => 'LKR',
            ]);

            if (!$validation['isValid']) {
                $this->wallets->failTopup($locked, 'Notify payload mismatch: ' . $validation['reason']);
                return;
            }

            $status = $gateway->normalizeStatusFromNotify($payload);
            $gatewayPaymentId = (string) ($payload['payment_id'] ?? '');

            if ($status === 'paid') {
                $this->wallets->completeTopup($locked, $gatewayPaymentId ?: null, $status);
            } elseif (in_array($status, ['failed', 'cancelled'], true)) {
                $this->wallets->failTopup($locked, "PayHere status: {$status}", $status);
            }
            // 'pending' from PayHere just leaves it pending — nothing to do.
        });
    }

    private function buildCheckout(PayHereGatewayService $gateway, WalletTransaction $tx, User $user): array
    {
        [$firstName, $lastName] = $gateway->splitName((string) ($user->name ?? 'Wallet Customer'));

        return $gateway->buildCheckoutPayload([
            'orderId' => (string) $tx->gateway_order_id,
            'amount' => (float) $tx->amount,
            'currency' => 'LKR',
            'items' => 'Wallet top-up',
            'returnUrl' => route('client.wallet.payhere.return', ['order_id' => $tx->gateway_order_id]),
            'cancelUrl' => route('client.wallet.payhere.cancel', ['order_id' => $tx->gateway_order_id]),
            'notifyUrl' => route('client.wallet.payhere.notify'),
            'firstName' => $firstName,
            'lastName' => $lastName,
            'email' => (string) ($user->email ?? ''),
            'phone' => (string) ($user->phone ?? ''),
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

    private function isSandbox(): bool
    {
        return (bool) config('services.payhere.sandbox', true);
    }
}
