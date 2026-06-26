import { Warehouse } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'name', label: 'Annex' },
    { key: 'jail.name', label: 'Jail' },
    { key: 'branch.name', label: 'Branch' },
    { key: 'region.name', label: 'Region' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
    { key: 'dormitories_count', label: 'Dormitories', align: 'right' },
    { key: 'cells_count', label: 'Cells', align: 'right' },
];

export default function AnnexesIndex(props: any) {
    const fields = [
        {
            name: 'jail_id',
            label: 'Jail',
            type: 'select' as const,
            required: true,
            options: (props.jails ?? []).map((jail: any) => ({
                value: jail.id,
                label: jail.label ?? jail.name,
            })),
        },
        { name: 'name', label: 'Annex Name', required: true },
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
            title="Annexes Management"
            description="Create and maintain annexes under jails, with branch and region visibility for National Office oversight."
            entityName="Annex"
            routeBase="/national-office/annexes"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Warehouse}
        />
    );
}
