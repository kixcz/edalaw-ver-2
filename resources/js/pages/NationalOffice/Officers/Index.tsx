import { Users } from 'lucide-react';
import {
    StatusBadge,
    type Column,
    type RecordRow,
} from '../Components/DataTable';
import { ModulePage } from '../Components/ModulePage';

const columns: Column[] = [
    { key: 'name', label: 'Officer' },
    { key: 'email', label: 'Email' },
    { key: 'role.name', label: 'Role' },
    { key: 'region.name', label: 'Region' },
    { key: 'branch.name', label: 'Branch' },
    {
        key: 'approval_status',
        label: 'Approval',
        render: (row: RecordRow) => <StatusBadge value={row.approval_status} />,
    },
];

export default function OfficersIndex(props: any) {
    const fields = [
        { name: 'first_name', label: 'First Name', required: true },
        { name: 'middle_name', label: 'Middle Name' },
        { name: 'last_name', label: 'Last Name', required: true },
        {
            name: 'email',
            label: 'Email',
            type: 'email' as const,
            required: true,
        },
        { name: 'contact_number', label: 'Contact Number' },
        {
            name: 'role_id',
            label: 'Role',
            type: 'select' as const,
            required: true,
            options: (props.roles ?? []).map((role: any) => ({
                value: role.id,
                label: role.name,
            })),
        },
        {
            name: 'region_id',
            label: 'Region',
            type: 'select' as const,
            options: (props.regions ?? []).map((region: any) => ({
                value: region.id,
                label: `${region.name} (${region.code})`,
            })),
        },
        {
            name: 'branch_id',
            label: 'Branch',
            type: 'select' as const,
            options: (props.branches ?? []).map((branch: any) => ({
                value: branch.id,
                label: branch.label ?? branch.name,
            })),
        },
        {
            name: 'approval_status',
            label: 'Approval Status',
            type: 'select' as const,
            required: true,
            options: [
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
            ],
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password' as const,
            placeholder: 'Required for new accounts; leave blank when editing',
        },
    ];

    return (
        <ModulePage
            title="Officer Management"
            description="List and manage regional supervisors, jail wardens, jail officers, and related operational officer accounts."
            entityName="Officer"
            routeBase="/national-office/officers"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Users}
        />
    );
}
