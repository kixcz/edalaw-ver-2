import { Building } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'name', label: 'Dormitory' },
    { key: 'type', label: 'Type' },
    { key: 'annex.name', label: 'Annex' },
    { key: 'jail.name', label: 'Jail' },
    { key: 'branch.name', label: 'Branch' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
    { key: 'cells_count', label: 'Cells', align: 'right' },
    { key: 'pdls_count', label: 'PDLs', align: 'right' },
];

export default function DormitoriesIndex(props: any) {
    const fields = [
        {
            name: 'annex_id',
            label: 'Annex',
            type: 'select' as const,
            required: true,
            options: (props.annexes ?? []).map((annex: any) => ({
                value: annex.id,
                label: annex.label ?? annex.name,
            })),
        },
        { name: 'name', label: 'Dormitory Name', required: true },
        {
            name: 'type',
            label: 'Type',
            required: true,
            placeholder: 'Male, Female, Maximum Security...',
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
        {
            name: 'description',
            label: 'Description',
            type: 'textarea' as const,
        },
    ];

    return (
        <ModulePage
            title="Dormitories Management"
            description="Create and maintain dormitories under annexes, including type, status, cell totals, and PDL distribution."
            entityName="Dormitory"
            routeBase="/national-office/dormitories"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Building}
        />
    );
}
