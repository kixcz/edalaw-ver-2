<?php

namespace App\Http\Controllers\JailOfficer;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\CellScheduleTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CellScheduleTemplateController extends Controller
{
    /**
     * Display schedule templates for all cells.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        
        // Get JO's active scope IDs - use scope resolver service
        $authorizedCellIds = $user->getAuthorizedCellIds();
        
        // Query cells based on scope
        $cellsQuery = Cell::with(['scheduleTemplates', 'dormitory', 'building'])
            ->whereIn('id', $authorizedCellIds);
        
        // Apply additional filters if provided
        if ($request->filled('cell')) {
            $cellsQuery->where('id', $request->input('cell'));
        }
        
        if ($request->filled('dormitory')) {
            $cellsQuery->where('dormitory_id', $request->input('dormitory'));
        }
        
        if ($request->filled('annex')) {
            $cellsQuery->where('annex_id', $request->input('annex'))
                       ->orWhereHas('dormitory', function($q) use ($request) {
                           $q->where('annex_id', $request->input('annex'));
                       });
        }
        
        $cells = $cellsQuery->orderBy('cell_number')->get();

        // Format cells with their schedule data
        $formattedCells = $cells->map(function ($cell) {
            $schedules = [];
            foreach ($cell->scheduleTemplates as $template) {
                $schedules[$template->day_of_week] = [
                    'virtual_available' => $template->virtual_available,
                    'physical_available' => $template->physical_available,
                ];
            }

            return [
                'id' => $cell->id,
                'cell_number' => $cell->cell_number,
                'status' => $cell->status,
                'dormitory_name' => $cell->dormitory?->name,
                'annex_name' => $cell->annex?->name ?? $cell->dormitory?->annex?->name,
                'schedules' => $schedules,
            ];
        });

        // Day names for display
        $dayNames = [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
        ];

        return Inertia::render('JailOfficer/CellScheduleTemplate', [
            'cells' => $formattedCells,
            'dayNames' => $dayNames,
        ]);
    }

    /**
     * Update schedule templates for a cell.
     */
    public function update(Request $request, Cell $cell)
    {
        $validated = $request->validate([
            'schedules' => 'required|array',
            'schedules.*.day_of_week' => 'required|integer|between:0,6',
            'schedules.*.virtual_available' => 'required|boolean',
            'schedules.*.physical_available' => 'required|boolean',
        ]);

        foreach ($validated['schedules'] as $schedule) {
            CellScheduleTemplate::updateOrCreate(
                [
                    'cell_id' => $cell->id,
                    'day_of_week' => $schedule['day_of_week'],
                ],
                [
                    'virtual_available' => $schedule['virtual_available'],
                    'physical_available' => $schedule['physical_available'],
                ]
            );
        }

        return redirect()->back()->with('success', 'Schedule templates updated successfully for ' . $cell->cell_number);
    }

    /**
     * Get available days for a specific cell.
     */
    public function getAvailableDays(Cell $cell)
    {
        $templates = $cell->scheduleTemplates;

        $availableDays = [];
        foreach ($templates as $template) {
            $availableDays[$template->day_of_week] = [
                'virtual' => $template->virtual_available,
                'physical' => $template->physical_available,
            ];
        }

        return response()->json([
            'cell_id' => $cell->id,
            'cell_number' => $cell->cell_number,
            'available_days' => $availableDays,
        ]);
    }

    /**
     * Bulk update schedule templates for multiple cells.
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'cell_schedules' => 'required|array',
            'cell_schedules.*.cell_id' => 'required|exists:cells,id',
            'cell_schedules.*.schedules' => 'required|array',
            'cell_schedules.*.schedules.*.day_of_week' => 'required|integer|between:0,6',
            'cell_schedules.*.schedules.*.virtual_available' => 'required|boolean',
            'cell_schedules.*.schedules.*.physical_available' => 'required|boolean',
        ]);

        foreach ($validated['cell_schedules'] as $cellSchedule) {
            foreach ($cellSchedule['schedules'] as $schedule) {
                CellScheduleTemplate::updateOrCreate(
                    [
                        'cell_id' => $cellSchedule['cell_id'],
                        'day_of_week' => $schedule['day_of_week'],
                    ],
                    [
                        'virtual_available' => $schedule['virtual_available'],
                        'physical_available' => $schedule['physical_available'],
                    ]
                );
            }
        }

        return redirect()->back()->with('success', 'All schedule templates updated successfully.');
    }
}
