<?php

namespace App\Models\Warehouse;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarehouseExpense extends Model
{
    use HasFactory;

    public const CATEGORIES = [
        'Rent',
        'Utilities',
        'Maintenance',
        'Inventory Supplies',
        'Insurance',
        'Compliance',
        'Services',
        'Software',
        'Other',
    ];

    protected $fillable = [
        'user_id',
        'warehouse_unit_id',
        'name',
        'category',
        'quantity',
        'amount',
        'expense_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'quantity' => 'integer',
        'expense_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function warehouseUnit()
    {
        return $this->belongsTo(WarehouseUnit::class);
    }
}
