<?php

namespace App\Imports;

use App\Models\Inmate;
use App\Models\Cell;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class PdlImport implements ToCollection, WithHeadingRow
{
    public $successCount = 0;
    public $errors = [];

    public function collection(Collection $rows)
    {
        $rowNumber = 2; // Starts after header
        
        foreach ($rows as $row) {
            // Depending on header string manipulation by Excel plugin, it usually slugifies it to 'first_name'
            // We'll check both variants just in case
            $firstName = $row['first_name'] ?? $row['firstname'] ?? $row[0] ?? null;
            $lastName = $row['last_name'] ?? $row['lastname'] ?? $row[1] ?? null;
            $middleName = $row['middle_name'] ?? $row['middlename'] ?? $row[2] ?? null;
            $cellNumber = $row['cell_number'] ?? $row['cellnumber'] ?? $row[3] ?? null;
            
            if (empty($firstName) && empty($lastName) && empty($cellNumber)) {
                // Skip empty rows
                $rowNumber++;
                continue;
            }

            if (empty($firstName) || empty($lastName) || empty($cellNumber)) {
                $this->errors[] = "Row $rowNumber: First Name, Last Name, and Cell Number are required.";
                $rowNumber++;
                continue;
            }

            $cell = Cell::where('cell_number', $cellNumber)->first();
            
            if (!$cell) {
                $this->errors[] = "Row $rowNumber: Cell '$cellNumber' not found.";
                $rowNumber++;
                continue;
            }

            if (!$cell->hasAvailableCapacity()) {
                $this->errors[] = "Row $rowNumber: Cell '$cellNumber' is full.";
                $rowNumber++;
                continue;
            }

            Inmate::create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'middle_name' => $middleName ?: null,
                'cell_id' => $cell->id,
                'status' => 'active',
            ]);

            $this->successCount++;
            $rowNumber++;
        }
    }
}
