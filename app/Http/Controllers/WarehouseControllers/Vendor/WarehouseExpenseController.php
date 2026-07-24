<?php

namespace App\Http\Controllers\WarehouseControllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\WarehouseBooking;
use App\Models\Warehouse\WarehouseExpense;
use App\Models\Warehouse\WarehouseUnit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class WarehouseExpenseController extends Controller
{
    /**
     * Paginated, filterable list of the vendor's expenses.
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();

            $query = WarehouseExpense::where('user_id', $user->id)
                ->with('warehouseUnit:id,name');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status')) {
                $query->where('status', strtolower($request->status));
            }

            if ($request->filled('date')) {
                $query->whereDate('expense_date', Carbon::parse($request->date));
            }

            $sortBy = in_array($request->get('sort_by'), ['name', 'category', 'amount', 'expense_date', 'quantity'])
                ? $request->get('sort_by')
                : 'expense_date';
            $sortOrder = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortOrder);

            $perPage = (int) $request->get('per_page', 10);
            $expenses = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $expenses->getCollection()->map(fn ($e) => $this->transform($e)),
                'pagination' => [
                    'current_page' => $expenses->currentPage(),
                    'last_page' => $expenses->lastPage(),
                    'per_page' => $expenses->perPage(),
                    'total' => $expenses->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching warehouse expenses: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error fetching expenses'], 500);
        }
    }

    /**
     * Summary cards + category breakdown + 12-month cashflow, computed from
     * real bookings (income) and real expenses (this table).
     */
    public function stats(Request $request)
    {
        try {
            $user = Auth::user();
            $warehouseUnitIds = WarehouseUnit::where('user_id', $user->id)->pluck('id');
            $oneWeekAgo = Carbon::now()->subWeek();
            $twelveMonthsAgo = Carbon::now()->subMonths(11)->startOfMonth();

            $incomeQuery = fn () => WarehouseBooking::whereIn('warehouse_unit_id', $warehouseUnitIds)
                ->whereIn('status', ['confirmed', 'completed', 'active']);

            $totalIncome = (float) $incomeQuery()->sum('final_amount');
            $totalExpenses = (float) WarehouseExpense::where('user_id', $user->id)->sum('amount');

            $lastWeekIncome = (float) $incomeQuery()->where('created_at', '<=', $oneWeekAgo)->sum('final_amount');
            $lastWeekExpenses = (float) WarehouseExpense::where('user_id', $user->id)
                ->where('expense_date', '<=', $oneWeekAgo)->sum('amount');

            $incomeGrowth = $lastWeekIncome > 0 ? round((($totalIncome - $lastWeekIncome) / $lastWeekIncome) * 100, 2) : 0;
            $expensesGrowth = $lastWeekExpenses > 0 ? round((($totalExpenses - $lastWeekExpenses) / $lastWeekExpenses) * 100, 2) : 0;

            $balance = $totalIncome - $totalExpenses;
            $lastWeekBalance = $lastWeekIncome - $lastWeekExpenses;
            $balanceGrowth = $lastWeekBalance > 0 ? round((($balance - $lastWeekBalance) / $lastWeekBalance) * 100, 2) : 0;

            // Category breakdown for the current month (pie chart).
            $categoryBreakdown = WarehouseExpense::where('user_id', $user->id)
                ->whereMonth('expense_date', Carbon::now()->month)
                ->whereYear('expense_date', Carbon::now()->year)
                ->get()
                ->groupBy('category')
                ->map(fn ($rows, $category) => [
                    'name' => $category,
                    'value' => (float) $rows->sum('amount'),
                ])
                ->values();

            // 12-month cashflow (income vs expenses), aggregated in PHP to
            // stay portable across DB drivers (sqlite/mysql).
            $incomeRows = $incomeQuery()->where('created_at', '>=', $twelveMonthsAgo)
                ->get(['created_at', 'final_amount']);
            $expenseRows = WarehouseExpense::where('user_id', $user->id)
                ->where('expense_date', '>=', $twelveMonthsAgo)
                ->get(['expense_date', 'amount']);

            $incomeByMonth = $incomeRows->groupBy(fn ($row) => $row->created_at->format('Y-n'))
                ->map(fn ($rows) => (float) $rows->sum('final_amount'));
            $expensesByMonth = $expenseRows->groupBy(fn ($row) => Carbon::parse($row->expense_date)->format('Y-n'))
                ->map(fn ($rows) => (float) $rows->sum('amount'));

            $cashflow = collect(range(11, 0))->map(function ($offset) use ($incomeByMonth, $expensesByMonth) {
                $month = Carbon::now()->subMonths($offset);
                $key = $month->format('Y-n');
                return [
                    'label' => $month->format('M'),
                    'income' => $incomeByMonth[$key] ?? 0,
                    'expenses' => $expensesByMonth[$key] ?? 0,
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'balance' => ['amount' => number_format($balance, 0), 'growth' => $balanceGrowth, 'isPositive' => $balanceGrowth >= 0],
                    'income' => ['amount' => number_format($totalIncome, 0), 'growth' => $incomeGrowth, 'isPositive' => $incomeGrowth >= 0],
                    'expenses' => ['amount' => number_format($totalExpenses, 0), 'growth' => $expensesGrowth, 'isPositive' => $expensesGrowth < 0],
                    'categoryBreakdown' => $categoryBreakdown,
                    'cashflow' => $cashflow,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching warehouse expense stats: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error fetching expense statistics'], 500);
        }
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'amount' => ['required', 'numeric', 'min:0'],
            'expense_date' => ['required', 'date'],
            'status' => ['nullable', 'in:completed,pending'],
            'warehouse_unit_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        // Only accept a unit id that actually belongs to this vendor.
        if (!empty($validated['warehouse_unit_id'])) {
            $ownsUnit = WarehouseUnit::where('id', $validated['warehouse_unit_id'])
                ->where('user_id', $user->id)
                ->exists();
            if (!$ownsUnit) {
                unset($validated['warehouse_unit_id']);
            }
        }

        $expense = WarehouseExpense::create(array_merge($validated, [
            'user_id' => $user->id,
            'quantity' => $validated['quantity'] ?? 1,
            'status' => $validated['status'] ?? 'completed',
        ]));

        return response()->json([
            'success' => true,
            'data' => $this->transform($expense->load('warehouseUnit:id,name')),
            'message' => 'Expense added successfully.',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $expense = WarehouseExpense::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'expense_date' => ['sometimes', 'required', 'date'],
            'status' => ['nullable', 'in:completed,pending'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $expense->update($validated);

        return response()->json([
            'success' => true,
            'data' => $this->transform($expense->fresh()->load('warehouseUnit:id,name')),
            'message' => 'Expense updated successfully.',
        ]);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $expense = WarehouseExpense::where('user_id', $user->id)->findOrFail($id);
        $expense->delete();

        return response()->json(['success' => true, 'message' => 'Expense deleted successfully.']);
    }

    private function transform(WarehouseExpense $expense): array
    {
        $statusInfo = $expense->status === 'pending'
            ? ['color' => '#F0BB0D', 'bg' => '#FFCD294D']
            : ['color' => '#50AE31', 'bg' => '#6DB4464D'];

        return [
            'id' => $expense->id,
            'name' => $expense->name,
            'category' => $expense->category,
            'quantity' => $expense->quantity,
            'amount' => (float) $expense->amount,
            'amount_formatted' => 'LKR ' . number_format((float) $expense->amount, 2),
            'expense_date' => optional($expense->expense_date)->format('Y-m-d'),
            'status' => ucfirst($expense->status),
            'status_color' => $statusInfo['color'],
            'status_bg' => $statusInfo['bg'],
            'warehouse_unit_id' => $expense->warehouse_unit_id,
            'warehouse_unit' => $expense->warehouseUnit->name ?? null,
            'notes' => $expense->notes,
        ];
    }
}
