<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Driver extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'full_name',
        'phone',
        'email',
        'license_no',
        'license_expiry',
        'vehicle_type',
        'vehicle_no',
        'status',
        'address',
        'notes',
        'preferred_language',
        'daily_rate',
        'overtime_rate_per_hour',
        // files
        'license_photo_path',
        'nic_photo_path',
        // license renewal review
        'pending_license_no',
        'pending_license_expiry',
        'pending_license_photo_path',
        'license_review_status',
        // driver approval workflow
        'driver_approved_by',
        'driver_approved_at',
    ];

    // Format license_expiry as Y-m-d in JSON
    protected $casts = [
        'license_expiry'         => 'date:Y-m-d',
        'pending_license_expiry' => 'date:Y-m-d',
        'driver_approved_at'     => 'datetime',
    ];

    // Don’t leak raw storage paths in API responses
    protected $hidden = [
        'license_photo_path',
        'nic_photo_path',
    ];

    // Computed fields added to JSON
    protected $appends = [
        'license_photo_url',
        'nic_photo_url',
        'license_download_url',
        'nic_download_url',
    ];

    // ---- Relationships ----

    public function user()
    {
        return $this->belongsTo(User::class);   
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'driver_approved_by');
    }

    // ---- License-expiry helpers ----

    public function isLicenseExpired(): bool
    {
        return $this->license_expiry && $this->license_expiry->isPast();
    }

    /**
     * If the license is expired, mark this driver as Inactive and suspend
     * the linked user account. Returns true when a change was made.
     */
    public function suspendIfExpired(): bool
    {
        if (!$this->isLicenseExpired()) {
            return false;
        }

        if ($this->status !== 'Inactive') {
            $this->update(['status' => 'Inactive']);
        }

        return true;
    }

    // ---- Accessors (prefer controller routes; fallback to public URL) ----

    public function getLicensePhotoUrlAttribute(): ?string
    {
        if (!$this->license_photo_path) return null;

        // stream route (auth-aware; used by the modal preview)
        try {
            return route('vendor.drivers.license.stream', $this);
        } catch (\Throwable $e) {
            // fallback to public storage URL
            return Storage::disk('public')->url($this->license_photo_path);
        }
    }

    public function getNicPhotoUrlAttribute(): ?string
    {
        if (!$this->nic_photo_path) return null;

        try {
            return route('vendor.drivers.nic.stream', $this);
        } catch (\Throwable $e) {
            return Storage::disk('public')->url($this->nic_photo_path);
        }
    }

    public function getLicenseDownloadUrlAttribute(): ?string
    {
        if (!$this->license_photo_path) return null;

        try {
            return route('vendor.drivers.license.download', $this);
        } catch (\Throwable $e) {
            return Storage::disk('public')->url($this->license_photo_path);
        }
    }

    public function getNicDownloadUrlAttribute(): ?string
    {
        if (!$this->nic_photo_path) return null;

        try {
            return route('vendor.drivers.nic.download', $this);
        } catch (\Throwable $e) {
            return Storage::disk('public')->url($this->nic_photo_path);
        }
    }

    public function getPendingLicensePhotoUrlAttribute(): ?string
    {
        if (!$this->pending_license_photo_path) return null;

        return Storage::disk('public')->url($this->pending_license_photo_path);
    }
}
