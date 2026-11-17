<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A support thread is one client-or-vendor account talking to the platform
        // team (any SuperAdmin answers). The requester is stored in client_id and
        // vendor_id stays NULL, so existing client <-> vendor threads are untouched.
        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->string('type', 16)->default('vendor')->after('id');
            $table->dropForeign(['vendor_id']);
        });

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('vendor_id')->nullable()->change();
            $table->foreign('vendor_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['type', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->dropIndex(['type', 'last_message_at']);
        });

        \DB::table('chat_conversations')->where('type', 'support')->delete();

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
        });

        Schema::table('chat_conversations', function (Blueprint $table) {
            $table->unsignedBigInteger('vendor_id')->nullable(false)->change();
            $table->foreign('vendor_id')->references('id')->on('users')->cascadeOnDelete();
            $table->dropColumn('type');
        });
    }
};
