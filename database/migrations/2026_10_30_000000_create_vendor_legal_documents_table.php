<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per vendor owner and document type (terms | privacy). A document is
        // either free text (content) or an uploaded PDF (file_path), or both.
        Schema::create('vendor_legal_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 16);
            $table->longText('content')->nullable();
            $table->string('file_path')->nullable();
            $table->string('original_name')->nullable();
            $table->string('disk', 32)->default('public');
            $table->timestamps();

            $table->unique(['vendor_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_legal_documents');
    }
};
