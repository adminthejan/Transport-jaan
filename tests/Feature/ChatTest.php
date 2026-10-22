<?php

namespace Tests\Feature;

use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\VendorUserMembership;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use DatabaseTransactions;

    private function client(array $over = []): User
    {
        return User::factory()->create(array_merge(['role' => 'client', 'status' => 'verified'], $over));
    }

    private function vendor(array $over = []): User
    {
        return User::factory()->create(array_merge(['role' => 'vendor', 'vendor_type' => 'business', 'status' => 'verified'], $over));
    }

    private function thread(User $client, User $vendor): ChatConversation
    {
        return ChatConversation::create(['client_id' => $client->id, 'vendor_id' => $vendor->id]);
    }

    public function test_guests_cannot_use_chat(): void
    {
        $this->getJson('/chat/conversations')->assertUnauthorized();
        $this->getJson('/chat/unread-count')->assertUnauthorized();
        $this->postJson('/chat/conversations', ['vendor_id' => 1])->assertUnauthorized();
    }

    public function test_client_starts_conversation_with_vendor_and_it_is_idempotent(): void
    {
        $client = $this->client();
        $vendor = $this->vendor();

        $first = $this->actingAs($client)->postJson('/chat/conversations', ['vendor_id' => $vendor->id])
            ->assertOk()->json('conversation.id');
        $second = $this->actingAs($client)->postJson('/chat/conversations', ['vendor_id' => $vendor->id])
            ->assertOk()->json('conversation.id');

        $this->assertSame($first, $second);
        $this->assertSame(1, ChatConversation::where('client_id', $client->id)->count());
    }

    public function test_cannot_start_chat_with_non_vendor_or_missing_target(): void
    {
        $client = $this->client();
        $otherClient = $this->client();

        $this->actingAs($client)->postJson('/chat/conversations', ['vendor_id' => $otherClient->id])->assertNotFound();
        $this->actingAs($client)->postJson('/chat/conversations', ['vendor_id' => 99999999])->assertNotFound();
        $this->actingAs($client)->postJson('/chat/conversations', [])->assertStatus(422);
        $this->actingAs($client)->postJson('/chat/conversations', ['context_type' => 'bogus', 'context_id' => 1])->assertStatus(422);
    }

    public function test_cannot_chat_with_suspended_vendor(): void
    {
        $client = $this->client();
        $vendor = $this->vendor(['status' => 'suspended']);

        $this->actingAs($client)->postJson('/chat/conversations', ['vendor_id' => $vendor->id])->assertStatus(422);
    }

    public function test_vendor_cannot_start_a_conversation(): void
    {
        $vendor = $this->vendor();
        $other = $this->vendor();

        $this->actingAs($vendor)->postJson('/chat/conversations', ['vendor_id' => $other->id])->assertForbidden();
    }

    public function test_vendor_is_resolved_from_warehouse_context(): void
    {
        $client = $this->client();
        $vendor = $this->vendor();
        $unit = WarehouseUnit::create([
            'user_id' => $vendor->id, 'name' => 'Chat WH', 'address' => 'Colombo',
            'total_area' => 1000, 'capacity' => 1000, 'capacity_unit' => 'sq_ft',
            'type' => 'general_warehouse', 'pricing_model' => 'monthly',
            'base_price' => 1000, 'monthly_rate' => 1000, 'is_active' => true, 'is_available' => true,
        ]);

        $res = $this->actingAs($client)->postJson('/chat/conversations', [
            'context_type' => 'warehouse',
            'context_id' => $unit->id,
            // A spoofed vendor id must be ignored when a context is given.
            'vendor_id' => $this->vendor()->id,
        ])->assertOk();

        $this->assertSame('Chat WH', $res->json('conversation.context_label'));
        $this->assertSame(
            $vendor->id,
            ChatConversation::find($res->json('conversation.id'))->vendor_id
        );
    }

    public function test_vendor_is_resolved_from_bus_and_train_schedules(): void
    {
        $client = $this->client();
        $busVendor = $this->vendor();
        $trainVendor = $this->vendor();
        $now = now();

        $busStation = DB::table('bus_stations')->insertGetId(['name' => 'A', 'code' => 'CHB' . random_int(10, 99), 'city' => 'X', 'province' => 'Y', 'created_at' => $now, 'updated_at' => $now]);
        $busId = DB::table('buses')->insertGetId([
            'vendor_id' => $busVendor->id, 'name' => 'Express', 'bus_number' => 'CHT-' . random_int(1000, 9999),
            'bus_type' => 'Luxury', 'route_number' => '87', 'capacity' => 40, 'operator' => 'Mathu Express',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $busSchedule = DB::table('bus_schedules')->insertGetId([
            'bus_id' => $busId, 'departure_station_id' => $busStation, 'arrival_station_id' => $busStation,
            'departure_time' => '08:00:00', 'arrival_time' => '12:00:00', 'duration_minutes' => 240,
            'date' => $now->toDateString(), 'price' => 500, 'available_seats' => 10,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $trainStation = DB::table('train_stations')->insertGetId(['name' => 'A', 'code' => 'CHT' . random_int(10, 99), 'city' => 'X', 'province' => 'Y', 'created_at' => $now, 'updated_at' => $now]);
        $trainId = DB::table('trains')->insertGetId([
            'vendor_id' => $trainVendor->id, 'name' => 'Podi Menike', 'train_number' => 'CHT-' . random_int(1000, 9999),
            'class_type' => '1st Class', 'route_number' => '1', 'capacity' => 100, 'operator' => 'SL Railways',
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $trainSchedule = DB::table('train_schedules')->insertGetId([
            'train_id' => $trainId, 'departure_station_id' => $trainStation, 'arrival_station_id' => $trainStation,
            'departure_time' => '08:00:00', 'arrival_time' => '12:00:00', 'duration_minutes' => 240,
            'date' => $now->toDateString(), 'price' => 900, 'available_seats' => 10,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        $bus = $this->actingAs($client)->postJson('/chat/conversations', ['context_type' => 'bus', 'context_id' => $busSchedule])
            ->assertOk()->assertJsonPath('conversation.context_label', 'Mathu Express 87');
        $this->assertSame($busVendor->id, ChatConversation::find($bus->json('conversation.id'))->vendor_id);

        $train = $this->actingAs($client)->postJson('/chat/conversations', ['context_type' => 'train', 'context_id' => $trainSchedule])
            ->assertOk();
        $this->assertSame($trainVendor->id, ChatConversation::find($train->json('conversation.id'))->vendor_id);

        $this->actingAs($client)->postJson('/chat/conversations', ['context_type' => 'bus', 'context_id' => 99999999])->assertStatus(422);
    }

    public function test_courier_chat_requires_owning_the_shipment_and_an_assigned_vendor(): void
    {
        $owner = $this->client();
        $stranger = $this->client();
        $vendor = $this->vendor();
        $now = now();

        Schema::disableForeignKeyConstraints();
        $mk = fn (string $ref, ?int $vendorId) => DB::table('courier_shipments')->insertGetId([
            'reference' => $ref, 'requested_by_user_id' => $owner->id, 'assigned_vendor_user_id' => $vendorId,
            'sender_contact_id' => 1, 'recipient_contact_id' => 1, 'sender_address_id' => 1, 'recipient_address_id' => 1,
            'service_level' => 'standard', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $assigned = $mk('CHAT-' . random_int(10000, 99999), $vendor->id);
        $unassigned = $mk('CHAT-' . random_int(10000, 99999), null);
        Schema::enableForeignKeyConstraints();

        $res = $this->actingAs($owner)->postJson('/chat/conversations', ['context_type' => 'courier', 'context_id' => $assigned])->assertOk();
        $this->assertStringStartsWith('Shipment CHAT-', $res->json('conversation.context_label'));
        $this->assertSame($vendor->id, ChatConversation::find($res->json('conversation.id'))->vendor_id);

        // Someone else's shipment looks like it doesn't exist.
        $this->actingAs($stranger)->postJson('/chat/conversations', ['context_type' => 'courier', 'context_id' => $assigned])->assertNotFound();
        // No vendor assigned yet -> nothing to chat with.
        $this->actingAs($owner)->postJson('/chat/conversations', ['context_type' => 'courier', 'context_id' => $unassigned])->assertStatus(422);
    }

    public function test_both_sides_exchange_messages_and_unread_counts_track(): void
    {
        $client = $this->client();
        $vendor = $this->vendor();
        $c = $this->thread($client, $vendor);

        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => '  Is it available?  '])
            ->assertCreated()
            ->assertJsonPath('message.body', 'Is it available?')
            ->assertJsonPath('message.mine', true);

        $this->actingAs($vendor)->getJson('/chat/unread-count')->assertJson(['count' => 1]);
        $this->actingAs($client)->getJson('/chat/unread-count')->assertJson(['count' => 0]);

        $list = $this->actingAs($vendor)->getJson('/chat/conversations')->assertOk()->json('conversations');
        $this->assertCount(1, $list);
        $this->assertSame(1, $list[0]['unread_count']);
        $this->assertSame($client->name, $list[0]['other_party']['name']);
        $this->assertFalse($list[0]['last_message']['mine']);

        $msgs = $this->actingAs($vendor)->getJson("/chat/conversations/{$c->id}/messages")->json('messages');
        $this->assertFalse($msgs[0]['mine']);

        $this->actingAs($vendor)->postJson("/chat/conversations/{$c->id}/read")->assertJson(['marked' => 1]);
        $this->actingAs($vendor)->getJson('/chat/unread-count')->assertJson(['count' => 0]);

        // The sender's own messages are never marked read by themselves.
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/read")->assertJson(['marked' => 0]);

        $this->actingAs($vendor)->postJson("/chat/conversations/{$c->id}/messages", ['body' => 'Yes!'])->assertCreated();
        $this->actingAs($client)->getJson('/chat/unread-count')->assertJson(['count' => 1]);
    }

    public function test_outsiders_cannot_read_send_or_mark_read(): void
    {
        $c = $this->thread($this->client(), $this->vendor());
        $strangerClient = $this->client();
        $strangerVendor = $this->vendor();

        foreach ([$strangerClient, $strangerVendor] as $who) {
            $this->actingAs($who)->getJson("/chat/conversations/{$c->id}/messages")->assertNotFound();
            $this->actingAs($who)->postJson("/chat/conversations/{$c->id}/messages", ['body' => 'hi'])->assertNotFound();
            $this->actingAs($who)->postJson("/chat/conversations/{$c->id}/read")->assertNotFound();
            $this->actingAs($who)->getJson('/chat/conversations')->assertOk()->assertJson(['conversations' => []]);
        }
        $this->assertSame(0, ChatMessage::count() - ChatMessage::where('conversation_id', '!=', $c->id)->count());
    }

    public function test_other_roles_are_forbidden(): void
    {
        $admin = User::factory()->create(['role' => 'SuperAdmin', 'status' => 'verified']);
        $this->actingAs($admin)->getJson('/chat/conversations')->assertForbidden();
        $this->actingAs($admin)->getJson('/chat/unread-count')->assertForbidden();
    }

    public function test_message_validation(): void
    {
        $client = $this->client();
        $c = $this->thread($client, $this->vendor());

        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => ''])->assertStatus(422);
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => "   \n  "])->assertStatus(422);
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", [])->assertStatus(422);
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => str_repeat('a', 2001)])->assertStatus(422);
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => ['x']])->assertStatus(422);
        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => str_repeat('a', 2000)])->assertCreated();
        $this->assertSame(1, ChatMessage::where('conversation_id', $c->id)->count());
    }

    public function test_html_is_stored_verbatim_for_react_to_escape(): void
    {
        $client = $this->client();
        $c = $this->thread($client, $this->vendor());
        $payload = '<script>alert(1)</script>';

        $this->actingAs($client)->postJson("/chat/conversations/{$c->id}/messages", ['body' => $payload])
            ->assertCreated()->assertJsonPath('message.body', $payload);
    }

    public function test_message_pagination_and_polling(): void
    {
        $client = $this->client();
        $vendor = $this->vendor();
        $c = $this->thread($client, $vendor);
        for ($i = 1; $i <= 60; $i++) {
            ChatMessage::create([
                'conversation_id' => $c->id, 'sender_id' => $client->id,
                'sender_side' => 'client', 'body' => "m{$i}",
            ]);
        }

        $page1 = $this->actingAs($client)->getJson("/chat/conversations/{$c->id}/messages")->json();
        $this->assertCount(50, $page1['messages']);
        $this->assertTrue($page1['has_more']);
        $this->assertSame('m60', end($page1['messages'])['body']);
        $this->assertSame('m11', $page1['messages'][0]['body']);

        $firstId = $page1['messages'][0]['id'];
        $page2 = $this->actingAs($client)->getJson("/chat/conversations/{$c->id}/messages?before_id={$firstId}")->json();
        $this->assertCount(10, $page2['messages']);
        $this->assertFalse($page2['has_more']);
        $this->assertSame('m1', $page2['messages'][0]['body']);

        $lastId = end($page1['messages'])['id'];
        $this->actingAs($client)->getJson("/chat/conversations/{$c->id}/messages?after_id={$lastId}")
            ->assertJson(['messages' => []]);
        $this->actingAs($vendor)->postJson("/chat/conversations/{$c->id}/messages", ['body' => 'new'])->assertCreated();
        $this->actingAs($client)->getJson("/chat/conversations/{$c->id}/messages?after_id={$lastId}")
            ->assertJsonCount(1, 'messages')->assertJsonPath('messages.0.body', 'new');
    }

    public function test_vendor_team_member_shares_the_owner_inbox(): void
    {
        $client = $this->client();
        $owner = $this->vendor();
        $c = $this->thread($client, $owner);
        ChatMessage::create(['conversation_id' => $c->id, 'sender_id' => $client->id, 'sender_side' => 'client', 'body' => 'hello']);
        $c->update(['last_message_at' => now()]);

        // Team members are created with role "client" (see CourierTeamController).
        $member = User::factory()->create(['role' => 'client', 'status' => 'verified']);
        VendorUserMembership::create([
            'vendor_user_id' => $owner->id, 'user_id' => $member->id,
            'membership_role' => 'member', 'status' => 'active',
        ]);

        $this->actingAs($member)->getJson('/chat/conversations')->assertJsonCount(1, 'conversations');
        $this->actingAs($member)->postJson("/chat/conversations/{$c->id}/messages", ['body' => 'reply'])
            ->assertCreated()->assertJsonPath('message.mine', true);

        $stored = ChatMessage::latest('id')->first();
        $this->assertSame('vendor', $stored->sender_side);
        $this->assertSame($member->id, $stored->sender_id);
        $this->actingAs($client)->getJson('/chat/unread-count')->assertJson(['count' => 1]);

        // A team member can't start threads as a client...
        $this->actingAs($member)->postJson('/chat/conversations', ['vendor_id' => $owner->id])->assertForbidden();

        // ...and once suspended they fall back to being a plain client with no access to this thread.
        VendorUserMembership::where('user_id', $member->id)->update(['status' => 'suspended']);
        $this->actingAs($member)->getJson('/chat/conversations')->assertJson(['conversations' => []]);
        $this->actingAs($member)->getJson("/chat/conversations/{$c->id}/messages")->assertNotFound();
    }

    public function test_conversations_list_only_includes_threads_with_messages_sorted_recent_first(): void
    {
        $client = $this->client();
        $v1 = $this->vendor();
        $v2 = $this->vendor();
        $v3 = $this->vendor();
        $a = $this->thread($client, $v1);
        $b = $this->thread($client, $v2);
        $this->thread($client, $v3); // opened but never used -> hidden

        $this->actingAs($client)->postJson("/chat/conversations/{$a->id}/messages", ['body' => 'one']);
        $this->travel(1)->minutes();
        $this->actingAs($client)->postJson("/chat/conversations/{$b->id}/messages", ['body' => 'two']);

        $ids = collect($this->actingAs($client)->getJson('/chat/conversations')->json('conversations'))->pluck('id')->all();
        $this->assertSame([$b->id, $a->id], $ids);
    }

    public function test_page_renders_for_each_side(): void
    {
        $this->withoutVite();

        $this->actingAs($this->client())->get('/chat')->assertOk();
        $this->actingAs($this->vendor())->get('/chat')->assertOk();
        $this->actingAs(User::factory()->create(['role' => 'SuperAdmin', 'status' => 'verified']))->get('/chat')->assertForbidden();
    }
}
