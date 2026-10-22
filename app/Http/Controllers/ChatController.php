<?php

namespace App\Http\Controllers;

use App\Models\ChatConversation;
use App\Models\BusSchedule;
use App\Models\ChatMessage;
use App\Models\Courier\CourierShipment;
use App\Models\TrainSchedule;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VendorUserMembership;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Client <-> vendor messaging, shared by every service.
 *
 * A thread is one client talking to one vendor account. Vendor team members
 * act on behalf of the vendor owner, so they see and answer the same threads.
 * All endpoints are JSON except page(); the UI polls (no websocket server).
 */
class ChatController extends Controller
{
    private const PAGE_SIZE = 50;

    public function page(Request $request)
    {
        [$side] = $this->actor($request);

        return Inertia::render('Web/home/chat/MessagesPage', [
            'side' => $side,
            'conversationId' => $request->integer('conversation') ?: null,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        [$side, $ownerId] = $this->actor($request);
        $col = $side === 'client' ? 'client_id' : 'vendor_id';

        $conversations = ChatConversation::query()
            ->where($col, $ownerId)
            ->whereNotNull('last_message_at')
            ->with($side === 'client' ? ['vendor.vendorProfile'] : ['client'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_side', '!=', $side)
                ->whereNull('read_at')])
            ->orderByDesc('last_message_at')
            ->limit(100)
            ->get();

        $lastIds = ChatMessage::query()
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->selectRaw('MAX(id) as id')
            ->groupBy('conversation_id')
            ->pluck('id');
        $lastByConversation = ChatMessage::whereIn('id', $lastIds)->get()->keyBy('conversation_id');

        return response()->json([
            'conversations' => $conversations->map(fn ($c) => $this->transformConversation(
                $c,
                $side,
                $lastByConversation->get($c->id)
            ))->values(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        [$side, $ownerId] = $this->actor($request);

        $count = ChatMessage::query()
            ->where('sender_side', '!=', $side)
            ->whereNull('read_at')
            ->whereHas('conversation', fn ($q) => $q->where($side === 'client' ? 'client_id' : 'vendor_id', $ownerId))
            ->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Client opens (or re-opens) a thread with a vendor. The vendor is resolved
     * server-side from the item being viewed; a bare vendor_id is accepted only
     * if it belongs to a real vendor account.
     */
    public function start(Request $request): JsonResponse
    {
        [$side, $clientId] = $this->actor($request);
        abort_unless($side === 'client', 403, 'Only clients can start a conversation.');

        $data = $request->validate([
            'vendor_id' => ['nullable', 'integer'],
            'context_type' => ['nullable', Rule::in(['vehicle', 'warehouse', 'bus', 'train', 'courier'])],
            'context_id' => ['nullable', 'integer'],
        ]);

        $label = null;
        $vendorId = null;
        $hasContext = ! empty($data['context_type']) && ! empty($data['context_id']);

        if ($hasContext) {
            $id = (int) $data['context_id'];
            switch ($data['context_type']) {
                case 'vehicle':
                    $item = Vehicle::find($id);
                    $vendorId = $item?->provider_id;
                    $label = $item ? trim(($item->manufacturer ?? '') . ' ' . ($item->model ?? '')) : null;
                    break;
                case 'warehouse':
                    $item = WarehouseUnit::find($id);
                    $vendorId = $item?->user_id;
                    $label = $item?->name;
                    break;
                case 'bus':
                    // context_id is the schedule the client is looking at
                    $bus = BusSchedule::with('bus')->find($id)?->bus;
                    $vendorId = $bus?->vendor_id;
                    $label = $bus ? trim(($bus->operator ?? 'Bus') . ' ' . ($bus->route_number ?? '')) : null;
                    break;
                case 'train':
                    $train = TrainSchedule::with('train')->find($id)?->train;
                    $vendorId = $train?->vendor_id;
                    $label = $train ? trim(($train->name ?? 'Train') . ' ' . ($train->train_number ?? '')) : null;
                    break;
                case 'courier':
                    // Only the client who booked the shipment may open a thread about it.
                    $shipment = CourierShipment::where('id', $id)
                        ->where('requested_by_user_id', $clientId)
                        ->first();
                    abort_unless($shipment, 404, 'Shipment not found.');
                    $vendorId = $shipment->assigned_vendor_user_id;
                    $label = 'Shipment ' . $shipment->reference;
                    abort_unless($vendorId, 422, 'A courier vendor has not been assigned to this shipment yet.');
                    break;
            }
            abort_unless($vendorId, 422, 'This item has no vendor to chat with.');
        } elseif (! empty($data['vendor_id'])) {
            $vendorId = (int) $data['vendor_id'];
        }

        abort_unless($vendorId, 422, 'A vendor is required.');

        $vendor = User::query()->where('id', $vendorId)->where('role', 'vendor')->first();
        abort_unless($vendor, 404, 'Vendor not found.');
        abort_if(in_array($vendor->status, ['suspended', 'blocked'], true), 422, 'This vendor is not available for chat.');

        $conversation = ChatConversation::firstOrCreate([
            'client_id' => $clientId,
            'vendor_id' => $vendor->id,
        ]);

        if ($hasContext) {
            $conversation->update([
                'context_type' => $data['context_type'],
                'context_id' => $data['context_id'],
                'context_label' => $label ? mb_substr($label, 0, 255) : null,
            ]);
        }

        $conversation->load('vendor.vendorProfile');

        return response()->json([
            'conversation' => $this->transformConversation($conversation, 'client', null),
        ]);
    }

    public function messages(Request $request, ChatConversation $conversation): JsonResponse
    {
        [$side] = $this->authorizeConversation($request, $conversation);

        $request->validate([
            'after_id' => ['nullable', 'integer', 'min:0'],
            'before_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $conversation->messages()->with('sender:id,name');
        $afterId = $request->integer('after_id');
        $beforeId = $request->integer('before_id');
        $hasMore = false;

        if ($afterId > 0) {
            $messages = $query->where('id', '>', $afterId)->orderBy('id')->limit(200)->get();
        } else {
            if ($beforeId > 0) {
                $query->where('id', '<', $beforeId);
            }
            $messages = $query->orderByDesc('id')->limit(self::PAGE_SIZE + 1)->get();
            $hasMore = $messages->count() > self::PAGE_SIZE;
            $messages = $messages->take(self::PAGE_SIZE)->reverse()->values();
        }

        return response()->json([
            'messages' => $messages->map(fn ($m) => $this->transformMessage($m, $side))->values(),
            'has_more' => $hasMore,
        ]);
    }

    public function send(Request $request, ChatConversation $conversation): JsonResponse
    {
        [$side] = $this->authorizeConversation($request, $conversation);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($data['body']);
        abort_if($body === '', 422, 'Message cannot be empty.');

        $message = DB::transaction(function () use ($request, $conversation, $side, $body) {
            $message = $conversation->messages()->create([
                'sender_id' => $request->user()->id,
                'sender_side' => $side,
                'body' => $body,
            ]);
            $conversation->forceFill(['last_message_at' => $message->created_at])->save();

            return $message;
        });

        $message->load('sender:id,name');

        return response()->json(['message' => $this->transformMessage($message, $side)], 201);
    }

    public function markRead(Request $request, ChatConversation $conversation): JsonResponse
    {
        [$side] = $this->authorizeConversation($request, $conversation);

        $updated = $conversation->messages()
            ->where('sender_side', '!=', $side)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['marked' => $updated]);
    }

    /**
     * @return array{0: string, 1: int} [side, owner user id] — the owner is the client
     *                                  themselves, or the vendor account a team member works for.
     */
    private function actor(Request $request): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        if ($user->role === 'vendor') {
            return ['vendor', (int) $user->id];
        }

        // Vendor team members are created with role "client", so membership must be
        // checked before the role or they would be mistaken for customers.
        $membership = VendorUserMembership::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($membership) {
            return ['vendor', (int) $membership->vendor_user_id];
        }

        abort_unless($user->role === 'client', 403, 'Chat is only available to clients and vendors.');

        return ['client', (int) $user->id];
    }

    private function authorizeConversation(Request $request, ChatConversation $conversation): array
    {
        [$side, $ownerId] = $this->actor($request);
        $participantId = $side === 'client' ? $conversation->client_id : $conversation->vendor_id;
        abort_unless((int) $participantId === $ownerId, 404);

        return [$side, $ownerId];
    }

    private function transformConversation(ChatConversation $c, string $side, ?ChatMessage $last): array
    {
        $party = $side === 'client' ? $c->vendor : $c->client;
        $name = $side === 'client'
            ? ($c->vendor?->vendorProfile?->company_name ?: $c->vendor?->name)
            : $c->client?->name;

        return [
            'id' => $c->id,
            'other_party' => [
                'id' => $party?->id,
                'name' => $name ?: 'User',
                'image' => $party?->image ? asset('storage/' . $party->image) : null,
            ],
            'context_label' => $c->context_label,
            'last_message' => $last ? [
                'body' => mb_strimwidth($last->body, 0, 120, '…'),
                'mine' => $last->sender_side === $side,
                'created_at' => $last->created_at?->toIso8601String(),
            ] : null,
            'last_message_at' => $c->last_message_at?->toIso8601String(),
            'unread_count' => (int) ($c->unread_count ?? 0),
        ];
    }

    private function transformMessage(ChatMessage $m, string $side): array
    {
        return [
            'id' => $m->id,
            'body' => $m->body,
            'mine' => $m->sender_side === $side,
            'sender_name' => $m->sender?->name,
            'read' => $m->read_at !== null,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
