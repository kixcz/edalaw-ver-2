<?php

namespace App\Exports;

use App\Models\Cell;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PdlTemplateExport implements WithHeadings, WithEvents
{
    protected $cells;

    public function __construct(array $cells = [])
    {
        $this->cells = $cells;
    }

    public function headings(): array
    {
        return [
            'First Name',
            'Last Name',
            'Middle Name',
            'Cell Number',
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $cells = $this->cells;
                
                if (empty($cells)) {
                    $cells = ['No cells found'];
                }
                
                $cellCount = count($cells);
                
                $sheet = $event->sheet->getDelegate();
                
                // Add cell list in another sheet
                $sheet->getParent()->createSheet(1);
                $listsSheet = $sheet->getParent()->getSheet(1);
                $listsSheet->setTitle('DataLists');
                
                foreach ($cells as $index => $cellNum) {
                    $row = $index + 1;
                    $listsSheet->setCellValue("A{$row}", $cellNum);
                }
                
                // Hide the DataLists sheet
                $sheet->getParent()->getSheet(1)->setSheetState(Worksheet::SHEETSTATE_HIDDEN);
                
                // Configure Data Validation for Cell Number column (Column D)
                $validation = $sheet->getCell('D2')->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST);
                $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
                $validation->setAllowBlank(false);
                $validation->setShowInputMessage(true);
                $validation->setShowErrorMessage(true);
                $validation->setShowDropDown(true);
                $validation->setErrorTitle('Invalid Cell');
                $validation->setError('Please pick a cell number from the list.');
                $validation->setPromptTitle('Select Cell');
                $validation->setPrompt('Choose a valid cell number.');
                
                // Reference the hidden sheet
                $validation->setFormula1('DataLists!$A$1:$A$' . $cellCount);
                
                // Clone validation to rows 2 to 1000
                for ($i = 2; $i <= 1000; $i++) {
                    $sheet->getCell("D{$i}")->setDataValidation(clone $validation);
                }
                
                // Sample row data
                $sheet->setCellValue('A2', 'Juan');
                $sheet->setCellValue('B2', 'Dela Cruz');
                $sheet->setCellValue('C2', 'Santos');
                if (isset($cells[0]) && $cells[0] !== 'No cells found') {
                    $sheet->setCellValue('D2', $cells[0]);
                }
                
                // Style headings
                $sheet->getStyle('A1:D1')->getFont()->setBold(true);
                // Set widths
                $sheet->getColumnDimension('A')->setWidth(15);
                $sheet->getColumnDimension('B')->setWidth(15);
                $sheet->getColumnDimension('C')->setWidth(15);
                $sheet->getColumnDimension('D')->setWidth(15);
            },
        ];
    }
}
