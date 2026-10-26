<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFlightBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'passenger_nic' => ['required', 'regex:/^(\d{9}[VvXx]|\d{12})$/'],
            'service_category' => 'required|string|max:80',
            'service_sub_category' => 'required|string|max:80',
            'subject' => 'required|string|max:255',
            'special_requests' => 'nullable|string|max:1000',
            'trip_type' => 'required|in:oneway,return',
            'departure_date' => 'required|date|after_or_equal:today',
            'return_date' => 'nullable|date|after:departure_date',
            'departure_airport' => 'required|string|max:255',
            'arriving_airport' => 'required|string|max:255',
        ];
    }

    /**
     * Get custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Your name is required.',
            'email.required' => 'Your email address is required.',
            'email.email' => 'Please provide a valid email address.',
            'phone.required' => 'Your phone number is required.',
            'passenger_nic.required' => 'Your NIC number is required.',
            'passenger_nic.regex' => 'Enter a valid NIC (9 digits + V/X, or 12 digits).',
            'service_category.required' => 'Please choose a category.',
            'service_sub_category.required' => 'Please choose a sub-category.',
            'subject.required' => 'Subject is required.',
            'trip_type.required' => 'Please select trip type (One way or Return).',
            'trip_type.in' => 'Trip type must be either One way or Return.',
            'departure_date.required' => 'Departure date is required.',
            'departure_date.after_or_equal' => 'Departure date cannot be in the past.',
            'return_date.after' => 'Return date must be after departure date.',
            'departure_airport.required' => 'Departure airport is required.',
            'arriving_airport.required' => 'Arriving airport is required.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Ensure return_date is required when trip_type is 'return'
        if ($this->trip_type === 'return') {
            $this->merge([
                'return_date' => $this->return_date,
            ]);
        }
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->trip_type === 'return' && !$this->return_date) {
                $validator->errors()->add('return_date', 'Return date is required for return trips.');
            }
        });
    }
}
