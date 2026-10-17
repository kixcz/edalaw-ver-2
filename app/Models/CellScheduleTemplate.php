<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CellScheduleTemplate extends Model
{
    use HasFactory;

    /**
     * Day constants for better readability.
     */
    public const SUNDAY = 0;
    public const MONDAY = 1;
    public const TUESDAY = 2;
    public const WEDNESDAY = 3;
    public const THURSDAY = 4;
    public const FRIDAY = 5;
    public const SATURDAY = 6;

    /**
     * Day names mapping.
     */
    public static array $dayNames = [
        self::SUNDAY => 'Sunday',
        self::MONDAY => 'Monday',
        self::TUESDAY => 'Tuesday',
        self::WEDNESDAY => 'Wednesday',
        self::THURSDAY => 'Thursday',
        self::FRIDAY => 'Friday',
        self::SATURDAY => 'Saturday',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'cell_id',
        'day_of_week',
        'virtual_available',
        'physical_available',
        'virtual_start_time',
        'virtual_end_time',
        'physical_start_time',
        'physical_end_time',
        'time_slots',
        'start_time',
        'end_time',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'virtual_available' => 'boolean',
            'physical_available' => 'boolean',
            'time_slots' => 'array',
        ];
    }

    /**
     * Get the cell this schedule template belongs to.
     *
     * @return BelongsTo<Cell, CellScheduleTemplate>
     */
    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    /**
     * Get the day name.
     */
    public function getDayNameAttribute(): string
    {
        return self::$dayNames[$this->day_of_week] ?? 'Unknown';
    }

    /**
     * Check if a specific day is available for virtual visits for a cell.
     */
    public static function isDayAvailableForVirtual(int $cellId, int $dayOfWeek): bool
    {
        $template = self::where('cell_id', $cellId)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        return $template ? $template->virtual_available : false;
    }

    /**
     * Check if a specific day is available for physical visits for a cell.
     */
    public static function isDayAvailableForPhysical(int $cellId, int $dayOfWeek): bool
    {
        $template = self::where('cell_id', $cellId)
            ->where('day_of_week', $dayOfWeek)
            ->first();

        return $template ? $template->physical_available : false;
    }

    /**
     * Get all available days for a cell.
     *
     * @return array<int, array<string, bool>>
     */
    public static function getAvailableDaysForCell(int $cellId): array
    {
        $templates = self::where('cell_id', $cellId)->get();
        $days = [];

        foreach ($templates as $template) {
            $days[$template->day_of_week] = [
                'virtual' => $template->virtual_available,
                'physical' => $template->physical_available,
            ];
        }

        return $days;
    }

    /**
     * Initialize default schedule templates for a cell (all days unavailable).
     */
    public static function initializeForCell(int $cellId): void
    {
        foreach (array_keys(self::$dayNames) as $dayOfWeek) {
            self::firstOrCreate(
                [
                    'cell_id' => $cellId,
                    'day_of_week' => $dayOfWeek,
                ],
                [
                    'virtual_available' => false,
                    'physical_available' => false,
                    'time_slots' => null,
                ]
            );
        }
    }
}
