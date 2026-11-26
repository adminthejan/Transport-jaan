<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class ClientDashboardController extends Controller
{
    /** Raw booking statuses grouped into the four buckets the dashboard shows. */
    private const STATUS_BUCKETS = [
        'pending' => ['pending', 'pending_payment', 'awaiting_payment', 'awaiting_approval', 'quoted', 'requested', 'processing', 'draft'],
        'active' => ['confirmed', 'paid', 'active', 'approved', 'in_progress', 'in_transit', 'picked_up', 'out_for_delivery', 'ongoing', 'booked', 'reserved', 'checked_in'],
        'completed' => ['completed', 'delivered', 'returned', 'finished', 'checked_out'],
        'cancelled' => ['cancelled', 'canceled', 'rejected', 'refunded', 'expired', 'failed', 'declined'],
    ];

    public function dashboard(Request $request)
    {
        // Ensure user is authenticated
        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to access the dashboard.');
        }

        // Refresh session to prevent expiration during use
        $request->session()->regenerate(false);

        $user = Auth::user();

        // Check if user is verified by admin
        if ($user->status !== 'verified') {
            return redirect()->route('approval.pending');
        }

        // User is verified, show the dashboard with fresh CSRF token
        return Inertia::render('Web/home/client/ClientMainDashboard', [
            'user' => $user,
            'csrf_token' => csrf_token(),
            'overview' => $this->overview($user->id),
        ]);
    }

    /** Per-section booking counts, wallet balance and the latest activity across every service. */
    private function overview(int $userId): array
    {
        $land = $this->gatewayPay('client.bookings.paymentslk.checkout', 'booking', 'client.bookings.paymentslk.retry');
        $air = $this->gatewayPay('client.airBookings.paymentslk.checkout', 'airVehicleBooking', 'client.airBookings.paymentslk.retry');
        $sea = $this->gatewayPay('client.seaBookings.paymentslk.checkout', 'seaVehicleBooking', 'client.seaBookings.paymentslk.retry');
        $bus = $this->gatewayPay('bus-bookings.paymentslk.checkout', 'booking', 'bus-bookings.paymentslk.retry', cardOnly: true, holds: true);
        $train = $this->gatewayPay('train-bookings.paymentslk.checkout', 'booking', 'train-bookings.paymentslk.retry', cardOnly: true, holds: true);

        $sections = [
            'vehicle' => [
                'land' => $this->section(\App\Models\Booking::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at', $land),
                'air' => $this->section(\App\Models\AirVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at', $air),
                'sea' => $this->section(\App\Models\SeaVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at', $sea),
            ],
            'tickets' => [
                'bus' => $this->section(\App\Models\BusBooking::class, 'user_id', $userId, 'total_price', '/clientTicketBookingDashboard', 'booking_reference', 'booking_date', $bus),
                'train' => $this->section(\App\Models\TrainBooking::class, 'user_id', $userId, 'total_amount', '/clientTicketBookingDashboard', 'booking_reference', null, $train),
                'flight' => $this->section(\App\Models\FlightBooking::class, 'user_id', $userId, null, '/clientTicketBookingDashboard', 'booking_reference', 'departure_date'),
                'sea' => $this->section(\App\Models\SeaTicketRequest::class, 'user_id', $userId, null, '/clientTicketBookingDashboard', 'booking_reference', 'travel_date'),
            ],
            'courier' => $this->section(\App\Models\Courier\CourierShipment::class, 'requested_by_user_id', $userId, null, '/courierBookingDashboard', 'reference', 'pickup_date', $this->courierPay()),
            'warehouse' => $this->section(\App\Models\Warehouse\WarehouseBooking::class, 'user_id', $userId, 'total_amount', '/warehouseBookingDashboard', 'booking_reference', 'start_date', $this->warehousePay()),
            'multimodal' => $this->section(\App\Models\MultiModel\MultiModelBooking::class, 'user_id', $userId, 'total_amount', '/client/dashboard'),
        ];

        $recent = collect();
        $collect = function (array $section, string $label, string $url) use (&$recent) {
            foreach ($section['recent'] ?? [] as $row) {
                $recent->push($row + ['type' => $label, 'url' => $url]);
            }
        };
        foreach (['land' => 'Land vehicle', 'air' => 'Air vehicle', 'sea' => 'Sea vehicle'] as $k => $label) {
            $collect($sections['vehicle'][$k], $label, '/clientVehicleDashboard');
        }
        foreach (['bus' => 'Bus ticket', 'train' => 'Train ticket', 'flight' => 'Flight ticket', 'sea' => 'Sea ticket'] as $k => $label) {
            $collect($sections['tickets'][$k], $label, '/clientTicketBookingDashboard');
        }
        $collect($sections['courier'], 'Courier', '/courierBookingDashboard');
        $collect($sections['warehouse'], 'Warehouse', '/warehouseBookingDashboard');
        $collect($sections['multimodal'], 'Multimodal', '/client/dashboard');

        $wallet = null;
        try {
            $w = \App\Models\Wallet::where('user_id', $userId)->first();
            $wallet = $w ? ['balance' => (float) $w->balance, 'currency' => $w->currency] : ['balance' => 0.0, 'currency' => null];
        } catch (\Throwable $e) {
            Log::warning('Client dashboard wallet lookup failed', ['error' => $e->getMessage()]);
        }

        $flat = [];
        foreach ([
            ['Land vehicle', $sections['vehicle']['land']], ['Air vehicle', $sections['vehicle']['air']], ['Sea vehicle', $sections['vehicle']['sea']],
            ['Bus ticket', $sections['tickets']['bus']], ['Train ticket', $sections['tickets']['train']],
            ['Flight ticket', $sections['tickets']['flight']], ['Sea ticket', $sections['tickets']['sea']],
            ['Courier', $sections['courier']], ['Warehouse', $sections['warehouse']], ['Multimodal', $sections['multimodal']],
        ] as [$label, $sec]) {
            $flat[] = [$label, $sec];
        }

        $upcoming = collect();
        $attention = collect();
        foreach ($flat as [$label, $sec]) {
            foreach ($sec['upcoming'] as $row) {
                $upcoming->push($row + ['type' => $label, 'url' => $sec['url']]);
            }
            foreach ($sec['attention'] as $row) {
                $attention->push($row + ['type' => $label, 'url' => $sec['url']]);
            }
        }

        $payments = [
            'paid' => array_sum(array_map(fn ($f) => $f[1]['spent'], $flat)),
            'pending' => array_sum(array_map(fn ($f) => $f[1]['pending_amount'], $flat)),
            'refunds' => array_sum(array_map(fn ($f) => $f[1]['refunded'], $flat)),
        ];

        // Last six months of bookings per service group, oldest first.
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $months[] = now()->startOfMonth()->subMonths($i)->format('Y-m');
        }
        $groups = [
            'vehicle' => ['land', 'air', 'sea'],
            'tickets' => ['bus', 'train', 'flight', 'sea'],
        ];
        $trendOf = function (array $secs) use ($months) {
            return array_map(fn ($m) => array_sum(array_map(fn ($s) => $s['monthly'][$m] ?? 0, $secs)), $months);
        };
        $trends = [
            'months' => array_map(fn ($m) => \Carbon\Carbon::createFromFormat('Y-m', $m)->format('M'), $months),
            'series' => [
                'vehicle' => $trendOf(array_map(fn ($k) => $sections['vehicle'][$k], $groups['vehicle'])),
                'tickets' => $trendOf(array_map(fn ($k) => $sections['tickets'][$k], $groups['tickets'])),
                'courier' => $trendOf([$sections['courier']]),
                'warehouse' => $trendOf([$sections['warehouse']]),
                'multimodal' => $trendOf([$sections['multimodal']]),
            ],
        ];

        $labelled = [];
        foreach ($flat as [$label, $sec]) {
            foreach ($sec['items'] as $it) {
                $labelled[] = $it + ['type' => $label];
            }
        }
        $bookings = collect($labelled)->sortByDesc('created_at')->take(15)->values()->all();
        $actions = $this->actions($labelled, $wallet, $payments['pending']);

        return [
            'bookings' => $bookings,
            'actions' => $actions,
            'sections' => $sections,
            'wallet' => $wallet,
            'recent' => $recent->sortByDesc('created_at')->take(8)->values()->all(),
            'upcoming' => $upcoming->sortBy('date')->take(5)->values()->all(),
            'attention' => $attention->take(5)->values()->all(),
            'payments' => $payments,
            'trends' => $trends,
        ];
    }

    /**
     * Counts by status bucket for one booking table. A missing table/column must not
     * take the whole dashboard down, so any failure returns an empty section.
     */
    private function section(string $model, string $ownerColumn, int $userId, ?string $amountColumn, string $url, string $referenceColumn = 'booking_reference', ?string $dateColumn = null, ?\Closure $pay = null): array
    {
        $empty = ['total' => 0, 'pending' => 0, 'active' => 0, 'completed' => 0, 'cancelled' => 0, 'spent' => 0.0, 'pending_amount' => 0.0, 'refunded' => 0.0, 'url' => $url, 'recent' => [], 'upcoming' => [], 'attention' => [], 'monthly' => [], 'items' => []];

        try {
            /** @var Builder $base */
            $base = $model::query()->where($ownerColumn, $userId);

            $byStatus = (clone $base)->selectRaw('LOWER(status) as s, COUNT(*) as c')->groupBy('s')->pluck('c', 's');

            $out = $empty;
            foreach ($byStatus as $status => $count) {
                $bucket = 'pending';
                foreach (self::STATUS_BUCKETS as $name => $statuses) {
                    if (in_array($status, $statuses, true)) {
                        $bucket = $name;
                        break;
                    }
                }
                $out[$bucket] += (int) $count;
                $out['total'] += (int) $count;
            }

            if ($amountColumn) {
                $out['spent'] = (float) (clone $base)
                    ->whereNotIn(DB::raw('LOWER(status)'), array_merge(self::STATUS_BUCKETS['cancelled'], self::STATUS_BUCKETS['pending']))
                    ->sum($amountColumn);
            }

            try {
                $out['refunded'] = (float) (clone $base)->sum('refund_amount');
            } catch (\Throwable $e) {
                // not every booking table tracks refunds
            }

            $row = fn ($r, $date = null) => [
                'id' => $r->getKey(),
                'reference' => (string) ($r->{$referenceColumn} ?? ('#' . $r->getKey())),
                'status' => (string) ($r->status ?? ''),
                'amount' => $amountColumn ? (float) ($r->{$amountColumn} ?? 0) : null,
                'date' => $date,
            ];

            $out['attention'] = (clone $base)
                ->whereIn(DB::raw('LOWER(status)'), self::STATUS_BUCKETS['pending'])
                ->latest()->limit(3)->get()->map(fn ($r) => $row($r))->all();

            if ($dateColumn) {
                $up = (clone $base)->whereIn(DB::raw('LOWER(status)'), array_merge(self::STATUS_BUCKETS['active'], self::STATUS_BUCKETS['pending']));
                if (str_contains($dateColumn, '.')) {
                    [$rel, $col] = explode('.', $dateColumn, 2);
                    $up->whereHas($rel, fn ($q) => $q->where($col, '>=', now()->startOfDay()))
                        ->with($rel)
                        ->get()
                        ->each(fn ($r) => $out['upcoming'][] = $row($r, ($v = optional($r->{$rel})->{$col}) ? \Carbon\Carbon::parse($v)->toIso8601String() : null));
                } else {
                    $up->where($dateColumn, '>=', now()->startOfDay())->orderBy($dateColumn)->limit(5)->get()
                        ->each(fn ($r) => $out['upcoming'][] = $row($r, ($r->{$dateColumn} ? \Carbon\Carbon::parse($r->{$dateColumn})->toIso8601String() : null)));
                }
                usort($out['upcoming'], fn ($a, $b) => strcmp((string) $a['date'], (string) $b['date']));
                $out['upcoming'] = array_slice($out['upcoming'], 0, 5);
            }

            (clone $base)->where('created_at', '>=', now()->startOfMonth()->subMonths(5))->pluck('created_at')
                ->each(function ($d) use (&$out) {
                    $k = \Carbon\Carbon::parse($d)->format('Y-m');
                    $out['monthly'][$k] = ($out['monthly'][$k] ?? 0) + 1;
                });

            $hasExpiry = Schema::hasColumn((new $model)->getTable(), 'expires_at');
            $inactiveStatuses = array_merge(self::STATUS_BUCKETS['cancelled'], self::STATUS_BUCKETS['completed']);

            $mapItem = function ($r) use ($referenceColumn, $amountColumn, $dateColumn, $pay, $hasExpiry, $url, $inactiveStatuses) {
                $status = strtolower((string) ($r->status ?? ''));
                $payable = null;
                if ($pay && !in_array($status, $inactiveStatuses, true)) {
                    try {
                        $payable = $pay($r);
                    } catch (\Throwable $e) {
                        Log::warning('Client dashboard pay resolver failed', ['model' => get_class($r), 'id' => $r->getKey(), 'error' => $e->getMessage()]);
                    }
                }
                $date = null;
                if ($dateColumn && !str_contains($dateColumn, '.') && $r->{$dateColumn}) {
                    $date = \Carbon\Carbon::parse($r->{$dateColumn})->toIso8601String();
                } elseif ($dateColumn && str_contains($dateColumn, '.')) {
                    [$rel, $col] = explode('.', $dateColumn, 2);
                    $v = optional($r->{$rel})->{$col};
                    $date = $v ? \Carbon\Carbon::parse($v)->toIso8601String() : null;
                }
                $amount = $amountColumn ? (float) ($r->{$amountColumn} ?? 0) : null;

                return [
                    'id' => $r->getKey(),
                    'reference' => (string) ($r->{$referenceColumn} ?? ('#' . $r->getKey())),
                    'status' => $status,
                    // pending | failed | expired | awaiting_vendor — null when nothing is owed online
                    'pay_state' => $payable['state'] ?? null,
                    'unpaid' => in_array($payable['state'] ?? null, ['pending', 'failed'], true),
                    'pay_url' => $payable['url'] ?? null,
                    'retry_url' => $payable['retry_url'] ?? null,
                    // What the checkout will actually charge (e.g. round-trip total, advance) beats the booking total.
                    'amount' => ($payable['amount'] ?? 0) ?: $amount,
                    'date' => $date,
                    'expires_at' => $hasExpiry && $r->expires_at ? $r->expires_at->toIso8601String() : null,
                    'view_url' => $url,
                    'created_at' => optional($r->created_at)->toIso8601String(),
                ];
            };

            // One pass over the client's most recent bookings: feeds the table, the
            // Action Required list and the outstanding-payment total.
            $scanned = (clone $base)->latest()->limit(60)->get()->map($mapItem)->values();
            $out['items'] = $scanned->take(12)
                ->concat($scanned->slice(12)->filter(fn ($i) => $i['pay_state'] !== null))
                ->all();
            if ($pay) {
                $out['pending_amount'] = (float) $scanned->where('unpaid', true)->sum('amount');
            }

            $out['recent'] = (clone $base)->latest()->limit(4)->get()->map(fn ($row) => [
                'id' => $row->getKey(),
                'reference' => (string) ($row->{$referenceColumn} ?? ('#' . $row->getKey())),
                'status' => (string) ($row->status ?? ''),
                'amount' => $amountColumn ? (float) ($row->{$amountColumn} ?? 0) : null,
                'created_at' => optional($row->created_at)->toIso8601String(),
            ])->all();

            return $out;
        } catch (\Throwable $e) {
            Log::warning('Client dashboard section failed', ['model' => $model, 'error' => $e->getMessage()]);

            return $empty;
        }
    }

    /**
     * Builds a resolver for bookings paid through the Payments.lk hosted checkout
     * (vehicle land/air/sea, bus, train). It reads the booking's latest payment row,
     * so a "Pay now" link only exists when that module's own checkout route will
     * accept it — otherwise those routes 404 or bounce back.
     *
     * @return \Closure(\Illuminate\Database\Eloquent\Model): ?array
     */
    private function gatewayPay(string $checkoutRoute, string $param, string $retryRoute, bool $cardOnly = false, bool $holds = false): \Closure
    {
        return function ($r) use ($checkoutRoute, $param, $retryRoute, $cardOnly, $holds) {
            $payment = $r->payments()->when($cardOnly, fn ($q) => $q->where('method', 'Card'))->latest('id')->first();
            if (!$payment) {
                return null;
            }
            // Vehicle checkouts require provider=paymentslk; bus/train only a Card row.
            if (!$cardOnly && strtolower((string) $payment->provider) !== 'paymentslk') {
                return null;
            }

            $st = strtolower((string) $payment->status);
            if (!in_array($st, ['pending', 'failed', 'cancelled', 'expired'], true)) {
                return null;
            }

            // Bus/train seats are only held for a short window; once it lapses the
            // booking can't be paid any more and must be made again.
            if ($holds && method_exists($r, 'isExpired') && $r->isExpired()) {
                return ['state' => 'expired', 'url' => null, 'retry_url' => null, 'amount' => (float) $payment->amount_paid];
            }

            $params = [$param => $r->getKey()];

            return [
                'state' => $st === 'pending' ? 'pending' : 'failed',
                'url' => route($checkoutRoute, $params, false),
                'retry_url' => $st === 'pending' ? null : route($retryRoute, $params, false),
                'amount' => (float) $payment->amount_paid,
            ];
        };
    }

    /** Courier: card payment on the latest payment row, unless the vendor hasn't approved yet. */
    private function courierPay(): \Closure
    {
        return function ($r) {
            $payment = $r->latestPayment;
            if (!$payment || !in_array(strtolower((string) $payment->provider), \App\Models\Courier\CourierShipmentPayment::CARD_PROVIDERS, true)
                || strtolower((string) $payment->payment_method) !== \App\Models\Courier\CourierShipmentPayment::PAYMENT_METHOD_CARD) {
                return null;
            }
            $st = strtolower((string) $payment->status);
            if (!in_array($st, ['pending', 'failed', 'cancelled', 'expired'], true)) {
                return null;
            }
            if ($r->isVendorApprovalBlocking()) {
                return ['state' => 'awaiting_vendor', 'url' => null, 'retry_url' => null, 'amount' => (float) $payment->amount];
            }

            $params = ['shipment' => $r->getKey()];

            return [
                'state' => $st === 'pending' ? 'pending' : 'failed',
                'url' => route('couriers.payments.checkout', $params, false),
                'retry_url' => $st === 'pending' ? null : route('couriers.payments.retry', $params, false),
                'amount' => (float) $payment->amount,
            ];
        };
    }

    /** Warehouse: only bookings created with the Card method have a checkout page. */
    private function warehousePay(): \Closure
    {
        return function ($r) {
            if ($r->payment_method !== 'Card') {
                return null;
            }
            $st = strtolower((string) $r->payment_status);
            if (!in_array($st, ['pending', 'failed'], true)) {
                return null;
            }
            $params = ['booking' => $r->getKey()];

            return [
                'state' => $st,
                'url' => route('warehouse-bookings.paymentslk.checkout', $params, false),
                'retry_url' => $st === 'failed' ? route('warehouse-bookings.paymentslk.retry', $params, false) : null,
                'amount' => (float) $r->total_amount,
            ];
        };
    }

    /**
     * Turn raw bookings into things the client can actually do something about,
     * most urgent first. Every action has a primary button (label + href, optionally
     * a POST for one-click retries).
     */
    private function actions(array $items, ?array $wallet, float $pendingTotal): array
    {
        $out = [];
        $now = now();

        foreach ($items as $it) {
            $ref = $it['reference'];
            $type = $it['type'];
            $amount = $it['amount'];
            $expires = $it['expires_at'] ? \Carbon\Carbon::parse($it['expires_at']) : null;
            $date = $it['date'] ? \Carbon\Carbon::parse($it['date']) : null;
            $isActive = in_array($it['status'], self::STATUS_BUCKETS['active'], true);
            $state = $it['pay_state'];

            if ($state === 'pending') {
                $urgent = $expires && $expires->lte($now->copy()->addHours(6));
                $out[] = [
                    'kind' => 'payment_due',
                    'severity' => $urgent ? 'high' : 'medium',
                    'title' => "Payment pending — {$type}",
                    'detail' => trim($ref . ($expires ? ' · Hold ends ' . $expires->diffForHumans() : '')),
                    'amount' => $amount,
                    'cta' => ['label' => 'Pay now', 'href' => $it['pay_url'], 'method' => 'get'],
                    'sort' => $urgent ? 0 : 1,
                ];
            } elseif ($state === 'failed') {
                $out[] = [
                    'kind' => 'payment_failed',
                    'severity' => 'high',
                    'title' => "Payment failed — {$type}",
                    'detail' => $ref . ' · Your card was not charged for this attempt',
                    'amount' => $amount,
                    // POST retry mints a fresh gateway order and redirects straight to checkout.
                    'cta' => ['label' => 'Retry payment', 'href' => $it['retry_url'] ?: $it['pay_url'], 'method' => $it['retry_url'] ? 'post' : 'get'],
                    'sort' => 0,
                ];
            } elseif ($state === 'expired') {
                $out[] = [
                    'kind' => 'hold_expired',
                    'severity' => 'medium',
                    'title' => "Reservation expired — {$type}",
                    'detail' => "{$ref} · The seat hold ended before payment",
                    'amount' => $amount,
                    'cta' => ['label' => 'Book again', 'href' => '/landTicketBooking', 'method' => 'get'],
                    'sort' => 2,
                ];
            } elseif ($state === 'awaiting_vendor') {
                $out[] = [
                    'kind' => 'review',
                    'severity' => 'low',
                    'title' => "Waiting for vendor approval — {$type}",
                    'detail' => "{$ref} · You can pay once the vendor approves",
                    'amount' => $amount,
                    'cta' => ['label' => 'View status', 'href' => $it['view_url'], 'method' => 'get'],
                    'sort' => 3,
                ];
            } elseif (in_array($it['status'], ['awaiting_approval', 'quoted', 'requested'], true)) {
                $out[] = [
                    'kind' => 'review',
                    'severity' => 'low',
                    'title' => $it['status'] === 'quoted' ? "Quote ready — {$type}" : "Waiting for confirmation — {$type}",
                    'detail' => $ref,
                    'amount' => $amount,
                    'cta' => ['label' => $it['status'] === 'quoted' ? 'Review quote' : 'View status', 'href' => $it['view_url'], 'method' => 'get'],
                    'sort' => 3,
                ];
            } elseif ($isActive && $date && $date->between($now, $now->copy()->addHours(48))) {
                $out[] = [
                    'kind' => 'upcoming',
                    'severity' => 'info',
                    'title' => "{$type} starts " . $date->diffForHumans(),
                    'detail' => "{$ref} · " . $date->format('d M, H:i'),
                    'amount' => null,
                    'cta' => ['label' => 'View details', 'href' => $it['view_url'], 'method' => 'get'],
                    'sort' => 2,
                ];
            }
        }

        if ($pendingTotal > 0 && $wallet && $wallet['balance'] < $pendingTotal) {
            $out[] = [
                'kind' => 'low_wallet',
                'severity' => 'low',
                'title' => 'Wallet balance is lower than your pending payments',
                'detail' => 'Top up so you can settle bookings in one tap.',
                'amount' => max(0, $pendingTotal - $wallet['balance']),
                'cta' => ['label' => 'Top up wallet', 'href' => '/client/wallet', 'method' => 'get'],
                'sort' => 4,
            ];
        }

        usort($out, fn ($a, $b) => $a['sort'] <=> $b['sort']);

        return array_slice($out, 0, 6);
    }
}
