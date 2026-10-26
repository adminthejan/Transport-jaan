<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\PasswordStrength;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ClientSettingsController extends Controller
{
    /**
     * Display the client settings page.
     */
    public function show(): Response
    {
        $user = Auth::user();

        return Inertia::render('Web/home/client/ClientDashboardSettings', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $user->address,
                'address_line1' => $user->address_line1,
                'address_line2' => $user->address_line2,
                'city' => $user->city,
                'state' => $user->state,
                'postal_code' => $user->postal_code,
                'country' => $user->country,
                'date_of_birth' => $user->date_of_birth,
                'nic_number' => $user->nic_number,
                'image' => $user->image_url,
                'avatar_url' => $user->avatar_url ?? $user->image_url,
                'role' => $user->role,
                'status' => $user->status,
                'notify_email' => (bool)$user->notify_email,
                'notify_sms' => (bool)$user->notify_sms,
                'notify_push' => (bool)$user->notify_push,
                'language' => $user->language,
                'timezone' => $user->timezone,
                'cardholder_name' => $user->cardholder_name,
                'card_brand' => $user->card_brand,
                'card_last4' => $user->card_last4,
                'expiry_month' => $user->expiry_month,
                'expiry_year' => $user->expiry_year,
                'email_verified_at' => $user->email_verified_at,
            ]
        ]);
    }

    /**
     * Update the client profile.
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:20'],
            'address_line1' => ['nullable', 'string', 'max:500'],
            'address_line2' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'nic_number' => ['nullable', 'regex:/^(\d{9}[VvXx]|\d{12})$/'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:3072'], // 3MB max
            'current_password' => ['nullable', 'required_with:new_password', 'current_password'],
            'new_password' => ['nullable', 'required_with:current_password', 'same:confirm_password', Password::defaults(), new PasswordStrength()],
            'confirm_password' => ['nullable'],
            
            // Notifications & Preferences
            'notify_email' => ['nullable', 'boolean'],
            'notify_sms' => ['nullable', 'boolean'],
            'notify_push' => ['nullable', 'boolean'],
            'language' => ['nullable', 'string', 'max:10'],
            'timezone' => ['nullable', 'string', 'max:100'],
            
            // Payment info
            'cardholder_name' => ['nullable', 'string', 'max:255'],
            'card_brand' => ['nullable', 'string', 'max:50'],
            'card_last4' => ['nullable', 'string', 'max:4'],
            'expiry_month' => ['nullable', 'string', 'max:2'],
            'expiry_year' => ['nullable', 'string', 'max:4'],
        ]);

        // Merge first_name and last_name into name if provided
        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $firstName = $validated['first_name'] ?? $user->first_name;
            $lastName = $validated['last_name'] ?? $user->last_name;
            $validated['name'] = trim($firstName . ' ' . $lastName);
        }
        
        // Handle avatar/image upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            } elseif ($user->image) {
                Storage::disk('public')->delete($user->image);
            }

            // Store new avatar
            $avatarPath = $request->file('avatar')->store('profile-avatars', 'public');
            $validated['avatar'] = $avatarPath;
            $validated['image'] = $avatarPath; // Keep backwards compatibility
        }

        // Handle password update
        if (!empty($validated['new_password'])) {
            $validated['password'] = Hash::make($validated['new_password']);
        }

        // Remove password fields from the update data
        unset($validated['current_password'], $validated['new_password'], $validated['confirm_password']);

        // Update boolean types correctly
        if ($request->has('notify_email')) {
            $validated['notify_email'] = filter_var($request->input('notify_email'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('notify_sms')) {
            $validated['notify_sms'] = filter_var($request->input('notify_sms'), FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('notify_push')) {
            $validated['notify_push'] = filter_var($request->input('notify_push'), FILTER_VALIDATE_BOOLEAN);
        }

        // Update user
        $user->update($validated);

        return redirect()->back()->with('success', 'Profile updated successfully!');
    }

    /**
     * Remove profile image.
     */
    public function removeImage()
    {
        $user = Auth::user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->update(['avatar' => null]);
        }
        
        if ($user->image) {
            Storage::disk('public')->delete($user->image);
            $user->update(['image' => null]);
        }

        return redirect()->back()->with('success', 'Profile image removed successfully!');
    }
}
