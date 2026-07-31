import { Building2 } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../../NationalOffice/Components/DataTable';
import { ModulePage } from '../../NationalOffice/Components/ModulePage';

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
    { key: 'dormitories_count', label: 'Dorms', align: 'right' },
    { key: 'cells_count', label: 'Cells', align: 'right' },
    { key: 'pdls_count', label: 'PDLs', align: 'right' },
];

export default function BranchManagementIndex(props: any) {
    const fields = [
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
            title="Branch Management"
            description="Create and manage BJMP branches within your region. Branches you create are automatically scoped to your region."
            entityName="Branch"
            routeBase="/regional-supervisor/branches"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Building2}
        />
    );
}