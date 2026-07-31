import { Shield } from 'lucide-react';
import {
    ActiveStatusBadge,
    StatusBadge,
    type Column,
    type RecordRow,
} from '../../NationalOffice/Components/DataTable';
import { ModulePage } from '../../NationalOffice/Components/ModulePage';

const columns: Column[] = [
    { key: 'name', label: 'Warden' },
    { key: 'email', label: 'Email' },
    { key: 'contact_number', label: 'Contact' },
    { key: 'branch.name', label: 'Branch' },
    {
        key: 'active_status',
        label: 'Status',
        render: (row: RecordRow) => <ActiveStatusBadge value={row.active_status} />,
    },
    {
        key: 'approval_status',
        label: 'Approval',
        render: (row: RecordRow) => <StatusBadge value={row.approval_status} />,
    },
];

export default function JailWardenIndex(props: any) {
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
            name: 'branch_id',
            label: 'Branch',
            type: 'select' as const,
            required: true,
            options: (props.branches ?? []).map((branch: any) => ({
                value: branch.id,
                label: `${branch.name} (${branch.code})`,
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
            title="Jail Warden Management"
            description="Create and manage jail warden accounts assigned to branches within your region."
            entityName="Jail Warden"
            routeBase="/regional-supervisor/wardens"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Shield}
        />
    );
}