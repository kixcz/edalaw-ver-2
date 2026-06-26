import { PersonStanding } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'inmate_number', label: 'PDL No.' },
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age', align: 'right' },
    { key: 'cell.cell_number', label: 'Cell' },
    { key: 'dormitory.name', label: 'Dormitory' },
    { key: 'branch.name', label: 'Branch' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
];

export default function PdlsIndex(props: any) {
    const fields = [
        {
            name: 'cell_id',
            label: 'Cell',
            type: 'select' as const,
            required: true,
            options: (props.cells ?? []).map((cell: any) => ({
                value: cell.id,
                label: cell.label ?? cell.cell_number,
            })),
        },
        { name: 'inmate_number', label: 'PDL Number', required: true },
        { name: 'first_name', label: 'First Name', required: true },
        { name: 'middle_name', label: 'Middle Name' },
        { name: 'last_name', label: 'Last Name', required: true },
        {
            name: 'date_of_birth',
            label: 'Date of Birth',
            type: 'date' as const,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select' as const,
            required: true,
            options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'transferred', label: 'Transferred' },
                { value: 'released', label: 'Released' },
            ],
        },
    ];

    return (
        <ModulePage
            title="PDL Management"
            description="Maintain the national PDL registry, cell assignment, transfer information, and status reporting."
            entityName="PDL"
            routeBase="/national-office/pdls"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={PersonStanding}
            softDeleteLabel="mark inactive"
        />
    );
}
