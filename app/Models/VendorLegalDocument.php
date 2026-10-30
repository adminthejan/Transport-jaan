<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class VendorLegalDocument extends Model
{
    public const TYPES = ['terms', 'privacy'];

    protected $fillable = ['vendor_id', 'type', 'content', 'file_path', 'original_name', 'disk'];

    public function vendor()
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? Storage::disk($this->disk ?: 'public')->url($this->file_path)
            : null;
    }

    public function toPayload(): array
    {
        return [
            'type' => $this->type,
            'content' => $this->content,
            'file_url' => $this->file_url,
            'original_name' => $this->original_name,
            'updated_at' => optional($this->updated_at)->toIso8601String(),
        ];
    }
}
