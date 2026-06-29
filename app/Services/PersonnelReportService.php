<?php

namespace App\Services;

use App\Http\Middleware\TrackUserActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Centralised analytics builder for the regional supervisor's
 * "Personnel" modules (Jail Wardens and Jail Officers).
 *
 * Returns a payload compatible with the shared ModulePage /
 * AnalyticsCards frontend, including pie charts, bar charts and
 * a histogram. Every metric is region-scoped via `user.region_id`.
 */
class PersonnelReportService
{
    public function build(int $regionId, string $roleSlug, string $entityName): array
    {
        $branchIds = DB::table('branches')->where('region_id', $regionId)->pluck('id');

        $base = User::query()
            ->whereHas('role', fn ($q) => $q->where('slug', $roleSlug))
            ->whereIn('branch_id', $branchIds);

        // Clone for each aggregate so query state isn't shared
        $total = (clone $base)->count();
        $approved = (clone $base)->where('approval_status', 'approved')->count();
        $pending = (clone $base)->where('approval_status', 'pending')->count();
        $branches = DB::table('branches')->where('region_id', $regionId)->count();

        return [
            'cards' => [
                ['label' => $entityName.'s', 'value' => $total, 'detail' => "Branch personnel in this region"],
                ['label' => 'Approved', 'value' => $approved, 'detail' => 'Active personnel'],
                ['label' => 'Pending', 'value' => $pending, 'detail' => 'Awaiting review'],
                ['label' => 'Branches', 'value' => $branches, 'detail' => 'Available assignment targets'],
            ],
            'charts' => [
                'approval_status' => $this->withType(
                    'pie',
                    $this->approvalStatus($base)
                ),
                'gender_distribution' => $this->withType(
                    'pie',
                    $this->genderDistribution($base)
                ),
                'age_distribution' => $this->withType(
                    'histogram',
                    $this->ageDistribution($base)
                ),
                'online_status' => $this->withType(
                    'bar',
                    $this->onlineStatus($base)
                ),
            ],
        ];
    }

    /**
     * Wrap a chart's data array with its render type so the frontend
     * can decide whether to render a bar, pie or histogram.
     */
    private function withType(string $type, array $data): array
    {
        return ['type' => $type, 'data' => $data];
    }

    private function approvalStatus($base): array
    {
        $rows = (clone $base)
            ->select('approval_status', DB::raw('COUNT(*) as count'))
            ->groupBy('approval_status')
            ->get();

        // Ensure consistent bucket ordering
        $order = ['approved', 'pending', 'rejected'];
        $byName = [];
        foreach ($rows as $row) {
            $raw = $row->approval_status;
            // The model's cast turns this into an ApprovalStatus enum;
            // accept either the enum (BackedEnum) or a plain string.
            if ($raw instanceof \BackedEnum) {
                $key = strtolower((string) $raw->value);
            } else {
                $key = strtolower((string) $raw);
            }
            $byName[$key] = (int) $row->count;
        }

        $out = [];
        foreach ($order as $key) {
            $out[] = [
                'name' => ucfirst($key),
                'count' => $byName[$key] ?? 0,
            ];
        }
        // Include any unrecognised statuses (e.g. legacy values)
        foreach ($byName as $key => $count) {
            if (! in_array($key, $order, true)) {
                $out[] = ['name' => ucfirst($key), 'count' => $count];
            }
        }

        return $out;
    }

    private function genderDistribution($base): array
    {
        $rows = (clone $base)
            ->select('gender', DB::raw('COUNT(*) as count'))
            ->whereNotNull('gender')
            ->groupBy('gender')
            ->get();

        $byName = [];
        foreach ($rows as $row) {
            $key = strtolower(trim((string) $row->gender));
            $byName[$key] = (int) $row->count;
        }

        $labelMap = [
            'male' => 'Male',
            'm' => 'Male',
            'female' => 'Female',
            'f' => 'Female',
            'other' => 'Other',
            'nonbinary' => 'Non-binary',
            'non-binary' => 'Non-binary',
            'prefer_not_to_say' => 'Prefer not to say',
        ];

        $out = [];
        foreach ($byName as $key => $count) {
            $out[] = [
                'name' => $labelMap[$key] ?? ucfirst($key),
                'count' => $count,
            ];
        }

        // Sort largest first for nicer pie slices
        usort($out, fn ($a, $b) => $b['count'] <=> $a['count']);

        return $out;
    }

    private function ageDistribution($base): array
    {
        // Five-year-ish buckets common in workforce reporting
        $buckets = [
            ['label' => '18-25', 'min' => 18, 'max' => 25],
            ['label' => '26-35', 'min' => 26, 'max' => 35],
            ['label' => '36-45', 'min' => 36, 'max' => 45],
            ['label' => '46-55', 'min' => 46, 'max' => 55],
            ['label' => '56+',   'min' => 56, 'max' => 200],
        ];

        $today = now();
        $out = [];

        foreach ($buckets as $bucket) {
            $minDob = $today->copy()->subYears($bucket['max'])->endOfDay()->toDateString();
            $maxDob = $today->copy()->subYears($bucket['min'])->startOfDay()->toDateString();

            $count = (clone $base)
                ->whereNotNull('dob')
                ->whereDate('dob', '>=', $minDob)
                ->whereDate('dob', '<=', $maxDob)
                ->count();

            $out[] = [
                'name' => $bucket['label'],
                'count' => $count,
                // expose numeric min/max so the frontend can render
                // a true histogram with continuous x-axis
                'min' => $bucket['min'],
                'max' => $bucket['max'] >= 200 ? null : $bucket['max'],
            ];
        }

        return $out;
    }

    private function onlineStatus($base): array
    {
        $cutoff = now()->subSeconds(TrackUserActivity::ONLINE_WINDOW_SECONDS);

        $online = (clone $base)
            ->whereNotNull('last_seen_at')
            ->where('last_seen_at', '>=', $cutoff)
            ->count();

        $total = (clone $base)->count();
        $offline = max($total - $online, 0);

        return [
            ['name' => 'Online', 'count' => $online],
            ['name' => 'Offline', 'count' => $offline],
        ];
    }
}
