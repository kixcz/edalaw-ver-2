import { Fence } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'cell_number', label: 'Cell' },
    { key: 'dormitory.name', label: 'Dormitory' },
    { key: 'annex.name', label: 'Annex' },
    { key: 'branch.name', label: 'Branch' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
    { key: 'capacity', label: 'Capacity', align: 'right' },
    { key: 'occupancy', label: 'Occupancy', align: 'right' },
    { key: 'available_capacity', label: 'Available', align: 'right' },
];

export default function CellsIndex(props: any) {
    const fields = [
        {
            name: 'dormitory_id',
            label: 'Dormitory',
            type: 'select' as const,
            required: true,
            options: (props.dormitories ?? []).map((dormitory: any) => ({
                value: dormitory.id,
                label: dormitory.label ?? dormitory.name,
            })),
        },
        { name: 'cell_number', label: 'Cell Number', required: true },
        {
            name: 'capacity',
            label: 'Capacity',
            type: 'number' as const,
            required: true,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select' as const,
            required: true,
            options: [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
            ],
        },
    ];

    return (
        <ModulePage
            title="Cells Management"
            description="Create and maintain cells under dormitories with occupancy, capacity, status, and hierarchy reporting."
            entityName="Cell"
            routeBase="/national-office/cells"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Fence}
        />
    );
}
