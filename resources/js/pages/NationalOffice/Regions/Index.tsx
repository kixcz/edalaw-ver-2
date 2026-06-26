import { Columns4 } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Region' },
    {
        key: 'status',
        label: 'Status',
        render: (row: RecordRow) => <StatusBadge value={row.status} />,
    },
    { key: 'branches_count', label: 'Branches', align: 'right' },
    { key: 'jails_count', label: 'Jails', align: 'right' },
    { key: 'officers_count', label: 'Officers', align: 'right' },
    { key: 'pdls_count', label: 'PDLs', align: 'right' },
];

const fields = [
    { name: 'code', label: 'Region Code', required: true },
    { name: 'name', label: 'Region Name', required: true },
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
    { name: 'description', label: 'Description', type: 'textarea' as const },
];

export default function RegionsIndex(props: any) {
    return (
        <ModulePage
            title="Regions Management"
            description="Create and maintain national regional offices, monitor assigned branches, and review regional analytics. Regional supervisor accounts can be created in Officer Management and tagged to a region."
            entityName="Region"
            routeBase="/national-office/regions"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Columns4}
        />
    );
}
