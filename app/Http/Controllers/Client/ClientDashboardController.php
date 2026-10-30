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
                'land' => $this->section(\App\Models\Booking::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard'),
                'air' => $this->section(\App\Models\AirVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard'),
                'sea' => $this->section(\App\Models\SeaVehicleBookings::class, 'client_id', $userId, 'total_amount', '/clientVehicleDashboard'),
            ],
            'tickets' => [
                'bus' => $this->section(\App\Models\BusBooking::class, 'user_id', $userId, 'total_price', '/clientTicketBookingDashboard'),
                'train' => $this->section(\App\Models\TrainBooking::class, 'user_id', $userId, 'total_amount', '/clientTicketBookingDashboard'),
                'flight' => $this->section(\App\Models\FlightBooking::class, 'user_id', $userId, null, '/clientTicketBookingDashboard'),
                'sea' => $this->section(\App\Models\SeaTicketRequest::class, 'user_id', $userId, null, '/clientTicketBookingDashboard'),
            ],
            'courier' => $this->section(\App\Models\Courier\CourierShipment::class, 'requested_by_user_id', $userId, null, '/courierBookingDashboard', 'reference'),
            'warehouse' => $this->section(\App\Models\Warehouse\WarehouseBooking::class, 'user_id', $userId, 'total_amount', '/warehouseBookingDashboard'),
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

        return [
            'sections' => $sections,
            'wallet' => $wallet,
            'recent' => $recent->sortByDesc('created_at')->take(8)->values()->all(),
        ];
    }

    /**
     * Counts by status bucket for one booking table. A missing table/column must not
     * take the whole dashboard down, so any failure returns an empty section.
     */
    private function section(string $model, string $ownerColumn, int $userId, ?string $amountColumn, string $url, string $referenceColumn = 'booking_reference'): array
    {
        $empty = ['total' => 0, 'pending' => 0, 'active' => 0, 'completed' => 0, 'cancelled' => 0, 'spent' => 0.0, 'url' => $url, 'recent' => []];

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
                    ->whereNotIn(DB::raw('LOWER(status)'), self::STATUS_BUCKETS['cancelled'])
                    ->sum($amountColumn);
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
}
