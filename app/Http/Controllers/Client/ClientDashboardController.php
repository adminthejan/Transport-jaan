<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
        $sections = [
            'vehicle' => [
                'land' => $this->section(\App\Models\Booking::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at'),
                'air' => $this->section(\App\Models\AirVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at'),
                'sea' => $this->section(\App\Models\SeaVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard', 'booking_reference', 'schedule.pickup_at'),
            ],
            'tickets' => [
                'bus' => $this->section(\App\Models\BusBooking::class, 'user_id', $userId, 'total_price', '/clientTicketBookingDashboard', 'booking_reference', 'booking_date'),
                'train' => $this->section(\App\Models\TrainBooking::class, 'user_id', $userId, 'total_amount', '/clientTicketBookingDashboard'),
                'flight' => $this->section(\App\Models\FlightBooking::class, 'user_id', $userId, null, '/clientTicketBookingDashboard', 'booking_reference', 'departure_date'),
                'sea' => $this->section(\App\Models\SeaTicketRequest::class, 'user_id', $userId, null, '/clientTicketBookingDashboard', 'booking_reference', 'travel_date'),
            ],
            'courier' => $this->section(\App\Models\Courier\CourierShipment::class, 'requested_by_user_id', $userId, null, '/courierBookingDashboard', 'reference', 'pickup_date'),
            'warehouse' => $this->section(\App\Models\Warehouse\WarehouseBooking::class, 'user_id', $userId, 'total_amount', '/warehouseBookingDashboard', 'booking_reference', 'start_date'),
            'multimodal' => $this->section(\App\Models\MultiModel\MultiModelBooking::class, 'user_id', $userId, 'total_amount', '/clientAllBookings'),
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
        $collect($sections['multimodal'], 'Multimodal', '/clientAllBookings');

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

        return [
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
    private function section(string $model, string $ownerColumn, int $userId, ?string $amountColumn, string $url, string $referenceColumn = 'booking_reference', ?string $dateColumn = null): array
    {
        $empty = ['total' => 0, 'pending' => 0, 'active' => 0, 'completed' => 0, 'cancelled' => 0, 'spent' => 0.0, 'pending_amount' => 0.0, 'refunded' => 0.0, 'url' => $url, 'recent' => [], 'upcoming' => [], 'attention' => [], 'monthly' => []];

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

            if ($amountColumn) {
                $out['pending_amount'] = (float) (clone $base)
                    ->whereIn(DB::raw('LOWER(status)'), self::STATUS_BUCKETS['pending'])
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
}
