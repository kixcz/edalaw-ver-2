<?php

namespace App\Console\Commands;

use App\Models\Visit;
use App\Models\JailOfficerScope;
use Illuminate\Console\Command;

class BackfillJailOfficerId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'visits:backfill-jail-officer';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill jail_officer_id for visits based on inmate cell and jail_officer_scopes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Finding visits with null jail_officer_id...');

        $visits = Visit::whereNull('jail_officer_id')
            ->with(['inmate.cell'])
            ->get();

        if ($visits->isEmpty()) {
            $this->info('✅ No visits need backfilling!');
            return Command::SUCCESS;
        }

        $this->info("Found {$visits->count()} visits to update.");

        $updated = 0;
        $skipped = 0;

        foreach ($visits as $visit) {
            if (!$visit->inmate || !$visit->inmate->cell) {
                $this->warn("⚠️ Visit #{$visit->id}: No inmate or cell found, skipping.");
                $skipped++;
                continue;
            }

            $cell = $visit->inmate->cell;

            // Find matching jail officer scope
            $matchingScope = JailOfficerScope::where('is_active', true)
                ->where(function($query) use ($cell) {
                    $query->where('scope_type', 'cell')
                          ->where('cell_id', $cell->id)
                          ->orWhere(function($q) use ($cell) {
                              $q->where('scope_type', 'dormitory')
                                ->where('dormitory_id', $cell->dormitory_id);
                          })
                          ->orWhere(function($q) use ($cell) {
                              $q->where('scope_type', 'annex')
                                ->where('annex_id', $cell->annex_id);
                          });
                })
                ->first();

            if ($matchingScope) {
                $visit->update(['jail_officer_id' => $matchingScope->jail_officer_id]);
                $this->info("✅ Visit #{$visit->id}: Assigned to Jail Officer #{$matchingScope->jail_officer_id}");
                $updated++;
            } else {
                $this->warn("⚠️ Visit #{$visit->id}: No matching jail officer scope found for cell {$cell->cell_number}");
                $skipped++;
            }
        }

        $this->info('');
        $this->info('═══════════════════════════════════════════');
        $this->info('✅ Backfill Complete!');
        $this->info("   Updated: {$updated}");
        $this->info("   Skipped: {$skipped}");
        $this->info('═══════════════════════════════════════════');

        return Command::SUCCESS;
    }
}
