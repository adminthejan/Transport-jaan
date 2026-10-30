<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VendorLegalDocument;
use App\Models\VendorUserMembership;
use App\Models\Warehouse\WarehouseUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VendorLegalDocumentController extends Controller
{
    /** GET /vendor/legal-documents — the signed-in vendor's own documents. */
    public function index(Request $request): JsonResponse
    {
        $vendorId = $this->ownerId($request);

        $docs = VendorLegalDocument::where('vendor_id', $vendorId)->get()->keyBy('type');

        return response()->json([
            'terms' => optional($docs->get('terms'))->toPayload(),
            'privacy' => optional($docs->get('privacy'))->toPayload(),
        ]);
    }

    /** POST /vendor/legal-documents/{type} — save text and/or upload a PDF. */
    public function store(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, VendorLegalDocument::TYPES, true), 404);
        $vendorId = $this->ownerId($request);

        $data = $request->validate([
            'content' => ['nullable', 'string', 'max:200000'],
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:20480'],
            'remove_pdf' => ['nullable', 'boolean'],
        ]);

        $doc = VendorLegalDocument::firstOrNew(['vendor_id' => $vendorId, 'type' => $type]);

        if ($request->hasFile('pdf')) {
            $this->deleteFile($doc);
            $file = $request->file('pdf');
            $doc->file_path = $file->store("vendors/{$vendorId}/legal", ['disk' => 'public']);
            $doc->original_name = $file->getClientOriginalName();
            $doc->disk = 'public';
        } elseif ($request->boolean('remove_pdf')) {
            $this->deleteFile($doc);
            $doc->file_path = null;
            $doc->original_name = null;
        }

        if (array_key_exists('content', $data)) {
            $doc->content = $data['content'] !== null && trim($data['content']) !== '' ? $data['content'] : null;
        }

        if (! $doc->content && ! $doc->file_path) {
            if ($doc->exists) {
                $doc->delete();
            }

            return response()->json(['message' => 'Removed', 'document' => null]);
        }

        $doc->save();

        return response()->json(['message' => 'Saved', 'document' => $doc->toPayload()]);
    }

    /** DELETE /vendor/legal-documents/{type} */
    public function destroy(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, VendorLegalDocument::TYPES, true), 404);

        $doc = VendorLegalDocument::where('vendor_id', $this->ownerId($request))->where('type', $type)->first();
        if ($doc) {
            $this->deleteFile($doc);
            $doc->delete();
        }

        return response()->json(['message' => 'Removed']);
    }

    /**
     * GET /legal-documents/{type}?vehicle_id=|warehouse_id=|vendor_id=
     * Public: the document of the vendor that owns the item the client is booking.
     */
    public function show(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, VendorLegalDocument::TYPES, true), 404);

        $vendorId = null;
        if ($request->filled('vehicle_id')) {
            $vendorId = Vehicle::whereKey($request->integer('vehicle_id'))->value('provider_id');
        } elseif ($request->filled('warehouse_id')) {
            $vendorId = WarehouseUnit::whereKey($request->integer('warehouse_id'))->value('user_id');
        } elseif ($request->filled('vendor_id')) {
            $vendorId = $request->integer('vendor_id');
        }

        $doc = $vendorId
            ? VendorLegalDocument::where('vendor_id', $vendorId)->where('type', $type)->first()
            : null;

        return response()->json(['document' => $doc ? $doc->toPayload() : null]);
    }

    private function ownerId(Request $request): int
    {
        $user = $request->user();
        abort_unless($user, 401);

        if ($user->role === 'vendor') {
            return (int) $user->id;
        }

        $membership = VendorUserMembership::query()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();
        abort_unless($membership, 403, 'Only vendors can manage legal documents.');

        return (int) $membership->vendor_user_id;
    }

    private function deleteFile(VendorLegalDocument $doc): void
    {
        if ($doc->file_path && Storage::disk($doc->disk ?: 'public')->exists($doc->file_path)) {
            Storage::disk($doc->disk ?: 'public')->delete($doc->file_path);
        }
    }
}
