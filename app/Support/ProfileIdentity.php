<?php

namespace App\Support;

use App\Models\User;

/**
 * Saves a customer's NIC / birthday on their profile the first time they give it
 * on a booking form, so later forms are pre-filled. Never overwrites a value the
 * profile already has.
 */
class ProfileIdentity
{
    public static function remember(?User $user, array $data): void
    {
        if (!$user) {
            return;
        }

        $updates = [];
        foreach (['nic_number' => 'nic_number', 'passenger_nic' => 'nic_number', 'date_of_birth' => 'date_of_birth'] as $from => $to) {
            if (!empty($data[$from]) && empty($user->{$to})) {
                $updates[$to] = $data[$from];
            }
        }

        if ($updates) {
            $user->forceFill($updates)->save();
        }
    }
}
