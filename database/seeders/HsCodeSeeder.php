<?php

namespace Database\Seeders;

use App\Models\HsCode;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Full Harmonized System (HS) code list for the courier package "HS Code"
 * field's customs-classification search. Source: datasets/harmonized-system
 * on GitHub (data.world/UN Comtrade derived, ODC-PDDL public domain), which
 * mirrors the WCO nomenclature down to the internationally standard 6-digit
 * subheading level.
 */
class HsCodeSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/harmonized-system.csv');

        if (! is_readable($path)) {
            $this->command?->warn("HS code dataset not found at {$path}, skipping.");
            return;
        }

        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $columns = array_flip($header);

        HsCode::query()->truncate();

        $batch = [];
        $now = now();

        while (($row = fgetcsv($handle)) !== false) {
            $code = trim($row[$columns['hscode']] ?? '');

            if ($code === '') {
                continue;
            }

            $parent = trim($row[$columns['parent']] ?? '');

            $batch[] = [
                'code' => $code,
                'description' => trim($row[$columns['description']] ?? ''),
                'level' => (int) ($row[$columns['level']] ?? 0),
                'parent' => $parent === 'TOTAL' || $parent === '' ? null : $parent,
                'section' => trim($row[$columns['section']] ?? '') ?: null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= 500) {
                DB::table('hs_codes')->insert($batch);
                $batch = [];
            }
        }

        if (! empty($batch)) {
            DB::table('hs_codes')->insert($batch);
        }

        fclose($handle);
    }
}
