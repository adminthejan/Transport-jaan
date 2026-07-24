<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Rules\PasswordStrength;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class VendorSettingsController extends Controller
{
    /**
     * Display the vendor settings page.
     */
    public function show(): Response
    {
        return Inertia::render('Web/home/vendors/SettingsPage', [
            'user' => $this->profileProps(),
        ]);
    }

    /**
     * Display the warehouse-vertical settings page (same data/update
     * endpoint as show(), just a different page shell/branding).
     */
    public function showWarehouse(): Response
    {
        return Inertia::render('Web/home/vendors/warehouse/SettingsPage', [
            'user' => $this->profileProps(),
        ]);
    }

    /**
     * Shared profile props used by every vendor-vertical settings page.
     */
    private function profileProps(): array
    {
        $user = Auth::user();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'country' => $user->country,
            'date_of_birth' => $user->date_of_birth,
            'image' => $user->image_url,
            'role' => $user->role,
            'vendor_type' => $user->vendor_type,
            'status' => $user->status,
            'notify_email' => $user->notify_email ?? true,
            'notify_sms' => $user->notify_sms ?? false,
            'notify_push' => $user->notify_push ?? true,
        ];
    }

    /**
     * Update the vendor profile.
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'country' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:3072'], // 3MB max
            'current_password' => ['nullable', 'required_with:new_password', 'current_password'],
            'new_password' => ['nullable', 'confirmed', Password::defaults(), new PasswordStrength()],
            'notify_email' => ['nullable', 'boolean'],
            'notify_sms' => ['nullable', 'boolean'],
            'notify_push' => ['nullable', 'boolean'],
        ]);

        // Boolean toggles arrive from the form even when unchanged; default any
        // missing key to false rather than leaving it unset.
        $validated['notify_email'] = $request->boolean('notify_email');
        $validated['notify_sms'] = $request->boolean('notify_sms');
        $validated['notify_push'] = $request->boolean('notify_push');

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($user->image) {
                Storage::disk('public')->delete($user->image);
            }

            // Store new image
            $imagePath = $request->file('image')->store('profile-images', 'public');
            $validated['image'] = $imagePath;
        }

        // Handle password update
        if ($validated['new_password']) {
            $validated['password'] = Hash::make($validated['new_password']);
        }

        // Remove password fields from the update data
        unset($validated['current_password'], $validated['new_password'], $validated['new_password_confirmation']);

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

        if ($user->image) {
            Storage::disk('public')->delete($user->image);
            $user->update(['image' => null]);
        }

        return redirect()->back()->with('success', 'Profile image removed successfully!');
    }
}
