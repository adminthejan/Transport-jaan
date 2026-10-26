<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFlightBookingRequest;
use App\Mail\FlightBookingConfirmation;
use App\Models\FlightBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Services\CancellationPolicyService;

class FlightBookingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $bookings = FlightBooking::latest()->paginate(10);
        return response()->json($bookings);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        // This would return the flight booking form view
        // For API, this might not be needed
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreFlightBookingRequest $request)
    {
        // Check if the user is logged in
        if (!Auth::check()) {
            return redirect()->route('signin.signin')->with('message', 'Please log in to make a booking.');
        }

        try {
            // Use database transaction for data consistency
            $flightBooking = DB::transaction(function () use ($request) {
                // Associate the booking with the authenticated user
                $data = $request->validated();
                $data['user_id'] = Auth::id();
                \App\Support\ProfileIdentity::remember(Auth::user(), $data);

                $flightBooking = FlightBooking::create($data);

                Log::info('Flight booking created successfully', [
                    'booking_id' => $flightBooking->id,
                    'user_id' => Auth::id()
                ]);

                return $flightBooking;
            });

            // Send confirmation email (outside transaction to avoid blocking)
            try {
                Mail::to($flightBooking->email)->send(new FlightBookingConfirmation($flightBooking));
            } catch (\Exception $e) {
                Log::warning('Failed to send flight booking confirmation email: ' . $e->getMessage());
            }

            return back()->with('success', 'Your flight booking request has been submitted successfully! We will contact you shortly.');

        } catch (\Exception $e) {
            Log::error('Flight Booking Submission Error: ' . $e->getMessage());

            return back()->with('error', 'There was an error submitting your flight booking. Please try again or contact support.')
                ->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(FlightBooking $flightBooking)
    {
        return response()->json($flightBooking);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(FlightBooking $flightBooking)
    {
        return response()->json($flightBooking);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, FlightBooking $flightBooking)
    {
        $validatedData = $request->validate([
            'status' => 'required|in:pending,confirmed,cancelled',
        ]);

        $flightBooking->update($validatedData);

        return response()->json([
            'message' => 'Flight booking updated successfully.',
            'data' => $flightBooking
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FlightBooking $flightBooking)
    {
        $flightBooking->delete();

        return response()->json([
            'message' => 'Flight booking deleted successfully.'
        ]);
    }

    /**
     * Get cancellation policy for a flight booking
     */
    public function getCancellationPolicy($reference)
    {
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to view cancellation policy.');
        }

        // Flight bookings might use 'id' as reference since they don't have booking_reference field
        $booking = FlightBooking::where('id', $reference)
            ->orWhere('email', Auth::user()->email)
            ->firstOrFail();

        // Verify ownership - check by user_id if exists, otherwise by email
        $isOwner = (isset($booking->user_id) && $booking->user_id === Auth::id()) || 
                   ($booking->email === Auth::user()->email);
        
        if (!$isOwner) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            if (!$cancellationService->canCancel('flight', $booking)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This booking cannot be cancelled.',
                    'can_cancel' => false
                ]);
            }

            $refundDetails = $cancellationService->calculateRefund('flight', $booking);

            return response()->json([
                'success' => true,
                'can_cancel' => true,
                'refund_details' => $refundDetails
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to get cancellation policy', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve cancellation policy.'
            ], 500);
        }
    }

    /**
     * Cancel a flight booking
     */
    public function cancelBooking(Request $request, $reference)
    {
        if (!Auth::check()) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Please log in.'], 401);
            }
            return redirect()->route('signin')->with('message', 'Please log in to cancel your booking.');
        }

        // Flight bookings might use 'id' as reference since they don't have booking_reference field
        $booking = FlightBooking::where('id', $reference)
            ->orWhere('email', Auth::user()->email)
            ->firstOrFail();

        // Verify ownership
        $isOwner = (isset($booking->user_id) && $booking->user_id === Auth::id()) || 
                   ($booking->email === Auth::user()->email);
        
        if (!$isOwner) {
            if (request()->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }
            abort(403, 'Unauthorized access.');
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        try {
            $cancellationService = app(CancellationPolicyService::class);
            
            $result = $cancellationService->cancelBooking(
                'flight',
                $reference,
                Auth::id(),
                $validated['reason'] ?? null
            );

            if ($result['success']) {
                Log::info('Flight booking cancelled successfully', [
                    'reference' => $reference,
                    'user_id' => Auth::id()
                ]);

                if (request()->expectsJson()) {
                    return response()->json($result);
                }

                return redirect()->route('dashboard')
                    ->with('success', $result['message']);
            } else {
                if (request()->expectsJson()) {
                    return response()->json($result, 400);
                }

                return back()->withErrors(['error' => $result['message']]);
            }

        } catch (\Exception $e) {
            Log::error('Flight booking cancellation failed', [
                'reference' => $reference,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if (request()->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to cancel booking. Please try again.'
                ], 500);
            }

            return back()->withErrors(['error' => 'Failed to cancel booking. Please try again.']);
        }
    }
}
