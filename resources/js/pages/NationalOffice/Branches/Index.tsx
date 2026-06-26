import { Building2 } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Branch' },
    { key: 'region.name', label: 'Region' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
    { key: 'jails_count', label: 'Jails', align: 'right' },
    { key: 'annexes_count', label: 'Annexes', align: 'right' },
    { key: 'cells_count', label: 'Cells', align: 'right' },
    { key: 'pdls_count', label: 'PDLs', align: 'right' },
];

export default function BranchesIndex(props: any) {
    const fields = [
        {
            name: 'region_id',
            label: 'Region',
            type: 'select' as const,
            required: true,
            options: (props.regions ?? []).map((region: any) => ({
                value: region.id,
                label: `${region.name} (${region.code})`,
            })),
        },
        { name: 'code', label: 'Branch Code', required: true },
        { name: 'name', label: 'Branch Name', required: true },
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
            title="Branches Management"
            description="Create and maintain BJMP branches, tag every branch to a region, and review branch-level facility analytics."
            entityName="Branch"
            routeBase="/national-office/branches"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Building2}
        />
    );
}
