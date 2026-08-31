<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Scout\Searchable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, Searchable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'must_change_password',
        'password_changed_at',
        'role',
        'vendor_type',
        'status',
        'phone',
        'address',
        'country',
        'image',
        'avatar',
        // Extended profile fields
        'first_name',
        'last_name',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        // Notification preferences
        'notify_email',
        'notify_sms',
        'notify_push',
        // Payment info (tokenized)
        'cardholder_name',
        'card_last4',
        'card_brand',
        'expiry_month',
        'expiry_year',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'password_changed_at' => 'datetime',
        ];
    }

    public function vehicleLikes()
    {
        return $this->hasMany(VehicleLike::class);
    }

    public function vehicleReviews()
    {
        return $this->hasMany(VehicleReview::class);
    }

    public function vendorProfile()
    {
        return $this->hasOne(VendorProfile::class);
    }

    public function serviceRegistrations()
    {
        return $this->hasMany(VendorServiceRegistration::class);
    }

    public function vendorMembership()
    {
        return $this->hasOne(VendorUserMembership::class, 'user_id');
    }

    public function teamMembers()
    {
        return $this->hasMany(VendorUserMembership::class, 'vendor_user_id');
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Get approved service category slugs for this vendor.
     */
    public function getApprovedServiceSlugs(): array
    {
        return $this->serviceRegistrations()
            ->where('status', 'approved')
            ->with('serviceCategory')
            ->get()
            ->pluck('serviceCategory.slug')
            ->unique()
            ->values()
            ->toArray();
    }

    /**
     * Get the user's profile image URL.
     */
    public function getImageUrlAttribute()
    {
        return $this->image ? asset('storage/' . $this->image) : null;
    }

    /**
     * Get the user's avatar URL.
     */
    public function getAvatarUrlAttribute()
    {
        return $this->avatar ? asset('storage/' . $this->avatar) : null;
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'name' => (string) ($this->name ?? ''),
            'email' => (string) ($this->email ?? ''),
            'phone' => (string) ($this->phone ?? ''),
            'role' => (string) ($this->role ?? ''),
            'vendor_type' => (string) ($this->vendor_type ?? ''),
            'status' => (string) ($this->status ?? ''),
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
