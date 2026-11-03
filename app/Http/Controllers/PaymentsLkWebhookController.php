<?php

namespace App\Http\Controllers;

use App\Services\PaymentsLkGatewayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use PaymentsLk\Exception\SignatureVerificationException;

/**
 * The single Payments.lk webhook endpoint (POST /webhooks/payments-lk).
 *
 * Verifies the signature against the raw body, normalizes the event, and
 * hands it to the module that owns the order — chosen by the order-id prefix
 * (see config/services.php paymentslk.handlers). Deliveries can repeat, so
 * every handler is idempotent. Any 2xx acknowledges the delivery; only a bad
 * signature or a handler crash returns an error so the event is retried.
 */
class PaymentsLkWebhookController extends Controller
{
    public function handle(Request $request, PaymentsLkGatewayService $gateway)
    {
        try {
            $event = $gateway->constructEvent(
                $request->getContent(),
                $request->header('Payments-Signature')
            );
        } catch (SignatureVerificationException $e) {
            Log::warning('Payments.lk webhook: signature verification failed', ['error' => $e->getMessage()]);

            return response('Invalid signature', 400);
        }

        $result = $gateway->resultFromEvent($event);
        if ($result === null) {
            // test.ping and event types we don't act on.
            return response('OK', 200);
        }

        $prefix = strtoupper(explode('-', $result['orderId'])[0] ?? '');
        $handler = config("services.paymentslk.handlers.{$prefix}");
        if (!is_array($handler)) {
            Log::warning('Payments.lk webhook: no handler for reference', ['reference' => $result['orderId'], 'event' => $event['id'] ?? null]);

            return response('OK', 200);
        }

        [$class, $method] = $handler;

        try {
            app($class)->{$method}($result);
        } catch (\Throwable $e) {
            Log::error('Payments.lk webhook: handler failed', [
                'reference' => $result['orderId'],
                'event' => $event['id'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return response('Handler error', 500);
        }

        return response('OK', 200);
    }
}
