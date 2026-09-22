<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courier_shipments', function (Blueprint $table) {
            $table->string('shipment_type', 60)->nullable()->after('service_level');
            $table->string('shipment_type_description', 200)->nullable()->after('shipment_type');

            // Null = no approval required for this shipment (the common case).
            // 'pending'/'approved'/'rejected' track the vendor's decision on
            // shipments that do require review (currently: shipment_type "other").
            $table->string('vendor_approval_status', 20)->nullable()->after('assignment_status')->index();
            $table->timestamp('vendor_approval_requested_at')->nullable()->after('vendor_approval_status');
            $table->timestamp('vendor_approval_decided_at')->nullable()->after('vendor_approval_requested_at');
            $table->foreignId('vendor_approval_decided_by_user_id')
                ->nullable()
                ->after('vendor_approval_decided_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('vendor_approval_notes')->nullable()->after('vendor_approval_decided_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('courier_shipments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vendor_approval_decided_by_user_id');
            $table->dropColumn([
                'shipment_type',
                'shipment_type_description',
                'vendor_approval_status',
                'vendor_approval_requested_at',
                'vendor_approval_decided_at',
                'vendor_approval_notes',
            ]);
        });
    }
};
