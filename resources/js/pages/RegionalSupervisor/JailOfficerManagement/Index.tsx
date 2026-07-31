import { Users } from 'lucide-react';
import {
    ActiveStatusBadge,
    StatusBadge,
    type Column,
    type RecordRow,
} from '../../NationalOffice/Components/DataTable';
import { ModulePage } from '../../NationalOffice/Components/ModulePage';

const columns: Column[] = [
    { key: 'name', label: 'Officer' },
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
    {
        key: 'scopes',
        label: 'Scopes',
        render: (row: RecordRow) => {
            const scopes = Array.isArray(row.scopes) ? row.scopes : [];
            if (scopes.length === 0) {
                return <span className="text-xs text-muted-foreground">No scopes</span>;
            }
            return (
                <div className="text-xs">
                    {scopes.slice(0, 3).map((scope: any) => (
                        <div key={scope.id}>
                            <span className="font-medium">{scope.scope_type}:</span> {scope.description}
                        </div>
                    ))}
                    {scopes.length > 3 && (
                        <div className="text-muted-foreground">+{scopes.length - 3} more</div>
                    )}
                </div>
            );
        },
    },
];

export default function JailOfficerIndex(props: any) {
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
            title="Jail Officer Management"
            description="Create and manage jail officer accounts assigned to branches within your region. Facility scopes can be assigned via the Jail Warden module after creation."
            entityName="Jail Officer"
            routeBase="/regional-supervisor/officers"
            records={props.records}
            columns={columns}
            fields={fields}
            analytics={props.analytics}
            filters={props.filters}
            icon={Users}
        />
    );
}