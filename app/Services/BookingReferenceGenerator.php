<?php

namespace App\Services;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class BookingReferenceGenerator
{
    /**
     * Generate a secure, unique booking reference
     * 
     * Format: PREFIX-XXXXXX-YY
     * Where:
     * - PREFIX: Vehicle type (BUS, TRN, FLT, etc.)
     * - XXXXXX: 6 random alphanumeric characters (uppercase)
     * - YY: 2-digit checksum for validation
     * 
     * @param string $prefix Booking type prefix (BUS, TRN, FLT, etc.)
     * @param string $table Database table name to check uniqueness
     * @param int $maxAttempts Maximum attempts to generate unique reference
     * @return string Secure booking reference
     * @throws \RuntimeException If unable to generate unique reference
     */
    public static function generate(string $prefix, string $table, int $maxAttempts = 10): string
    {
        $attempts = 0;

        while ($attempts < $maxAttempts) {
            // Generate cryptographically secure random string
            // Using 6 characters from base 36 (0-9, A-Z) = 36^6 = 2.1 billion combinations
            $randomPart = self::generateSecureCode(6);
            
            // Generate checksum for the random part
            $checksum = self::calculateChecksum($randomPart);
            
            // Construct full reference: PREFIX-RANDOM-CHECKSUM
            $reference = "{$prefix}-{$randomPart}-{$checksum}";
            
            // Check uniqueness in database
            if (!self::exists($reference, $table)) {
                return $reference;
            }
            
            $attempts++;
        }
        
        throw new \RuntimeException("Unable to generate unique booking reference after {$maxAttempts} attempts");
    }

    /**
     * Generate cryptographically secure random alphanumeric code
     * 
     * @param int $length Length of the code
     * @return string Uppercase alphanumeric code
     */
    private static function generateSecureCode(int $length): string
    {
        // Use cryptographically secure random bytes
        // Convert to base36 (0-9A-Z) for readability
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $charactersLength = strlen($characters);
        $randomString = '';
        
        // Generate random bytes and convert to base36
        $bytes = random_bytes($length * 2); // Extra bytes for better randomness
        
        for ($i = 0; $i < $length; $i++) {
            $randomIndex = ord($bytes[$i]) % $charactersLength;
            $randomString .= $characters[$randomIndex];
        }
        
        return $randomString;
    }

    /**
     * Calculate checksum for validation
     * Uses a simple but effective algorithm to detect typos
     * 
     * @param string $input Input string to calculate checksum for
     * @return string Two-digit checksum
     */
    private static function calculateChecksum(string $input): string
    {
        // Use Luhn-like algorithm for checksum calculation
        $sum = 0;
        $length = strlen($input);
        
        for ($i = 0; $i < $length; $i++) {
            $char = $input[$i];
            // Convert character to number (0-9 = 0-9, A-Z = 10-35)
            $value = is_numeric($char) ? (int)$char : (ord($char) - ord('A') + 10);
            
            // Multiply every other digit by 2
            if ($i % 2 === 0) {
                $value *= 2;
            }
            
            $sum += $value;
        }
        
        // Return two-digit checksum (modulo 100)
        return str_pad($sum % 100, 2, '0', STR_PAD_LEFT);
    }

    /**
     * Validate booking reference format and checksum
     * 
     * @param string $reference Booking reference to validate
     * @return bool True if valid format and checksum
     */
    public static function validate(string $reference): bool
    {
        // Expected format: PREFIX-XXXXXX-YY
        if (!preg_match('/^[A-Z]{3,4}-[A-Z0-9]{6}-[0-9]{2}$/', $reference)) {
            return false;
        }
        
        // Split into parts
        $parts = explode('-', $reference);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        [$prefix, $code, $providedChecksum] = $parts;
        
        // Recalculate checksum
        $calculatedChecksum = self::calculateChecksum($code);
        
        // Validate checksum matches
        return $providedChecksum === $calculatedChecksum;
    }

    /**
     * Check if booking reference already exists in database
     * 
     * @param string $reference Booking reference to check
     * @param string $table Table name to check in
     * @return bool True if exists, false otherwise
     */
    private static function exists(string $reference, string $table): bool
    {
        try {
            return DB::table($table)
                ->where('booking_reference', $reference)
                ->exists();
        } catch (\Exception $e) {
            // If column doesn't exist (e.g., flight_bookings), skip uniqueness check
            // This allows the generator to work even if some tables don't have the column yet
            return false;
        }
    }

    /**
     * Generate reference for bus bookings
     * 
     * @return string Unique bus booking reference
     */
    public static function forBus(): string
    {
        return self::generate('BUS', 'bus_bookings');
    }

    /**
     * Generate reference for train bookings
     * 
     * @return string Unique train booking reference
     */
    public static function forTrain(): string
    {
        return self::generate('TRN', 'train_bookings');
    }

    /**
     * Generate reference for flight bookings
     * 
     * @return string Unique flight booking reference
     */
    public static function forFlight(): string
    {
        return self::generate('FLT', 'flight_bookings');
    }

    /**
     * Generate reference for land vehicle bookings
     *
     * @return string Unique land vehicle booking reference
     */
    public static function forVehicle(): string
    {
        return self::generate('VEH', 'bookings');
    }

    /**
     * Generate reference for air vehicle bookings
     *
     * @return string Unique air vehicle booking reference
     */
    public static function forAirVehicle(): string
    {
        return self::generate('AIR', 'air_vehicle_bookings');
    }

    /**
     * Generate reference for sea vehicle bookings
     * 
     * @return string Unique sea vehicle booking reference
     */
    public static function forSeaVehicle(): string
    {
        return self::generate('SEA', 'sea_vehicle_bookings');
    }

    /**
     * Extract prefix from booking reference
     * 
     * @param string $reference Booking reference
     * @return string|null Prefix or null if invalid format
     */
    public static function getPrefix(string $reference): ?string
    {
        if (preg_match('/^([A-Z]{3,4})-/', $reference, $matches)) {
            return $matches[1];
        }
        
        return null;
    }

    /**
     * Determine booking type from reference
     * 
     * @param string $reference Booking reference
     * @return string|null Booking type or null if unknown
     */
    public static function getBookingType(string $reference): ?string
    {
        $prefix = self::getPrefix($reference);
        
        return match($prefix) {
            'BUS' => 'bus',
            'TRN' => 'train',
            'FLT' => 'flight',
            'VEH' => 'vehicle',
            'AIR' => 'air_vehicle',
            'SEA' => 'sea_vehicle',
            default => null
        };
    }
}
