<?php

namespace App\Http\Controllers\BjmpOfficer;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\CellScheduleTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CellScheduleTemplateController extends Controller
{
   
    public function index(Request $request): Response
    {
        $cells = Cell::with(['scheduleTemplates'])
            ->orderBy('cell_number')
            ->get();

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
                'schedules' => $schedules,
            ];
        });

        $dayNames = [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
        ];

        return Inertia::render('BjmpOfficer/CellScheduleTemplate', [
            'cells' => $formattedCells,
            'dayNames' => $dayNames,
        ]);
    }

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
