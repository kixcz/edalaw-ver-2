import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreVertical, Eye, Edit, Trash2, RefreshCw, Circle, X, Check, LogOut, FileText } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/data-table';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'User Management',
        href: '/admin/users',
    },
];

type User = {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    dob: string | null;
    gender: string | null;
    street: string | null;
    brgy: string | null;
    municipality: string | null;
    province: string | null;
    postal_code: string | null;
    email: string;
    contact_number: string | null;
    role: string | null;
    role_name: string | null;
    approval_status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null;
    email_verified_at: string | null;
    created_at: string;
    is_active: boolean;
    id_document_1_path: string | null;
    id_document_2_path: string | null;
};

type Role = {
    id: number;
    name: string;
    slug: string;
};

type Props = {
    users: User[];
    roles: Role[];
};

function getStatusBadge(status: string) {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        pending: {
            variant: 'secondary',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            label: 'Pending',
        },
        approved: {
            variant: 'default',
            className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            label: 'Approved',
        },
        rejected: {
            variant: 'destructive',
            className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            label: 'Rejected',
        },
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

function getRoleBadge(role: string | null) {
    if (!role) {
        return <Badge variant="outline">No Role</Badge>;
    }

    const roleColors: Record<string, string> = {
        super_admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        bjmp_officer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        visitor: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
        monitoring_officer: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    };

    const className = roleColors[role] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';

    return (
        <Badge variant="secondary" className={className}>
            {role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </Badge>
    );
}

export default function UserManagement({ users = [], roles: rolesProp = [] }: Props) {
    const roles = rolesProp;
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLogoutUserModalOpen, setIsLogoutUserModalOpen] = useState(false);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [duplicateErrorModal, setDuplicateErrorModal] = useState<{ open: boolean; message: string }>({
        open: false,
        message: '',
    });

    const updateStatusForm = useForm({
        approval_status: 'pending' as 'pending' | 'approved' | 'rejected',
        rejection_reason: '',
    });

    const rejectForm = useForm({
        rejection_reason: '',
    });

    const createForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        dob: '',
        gender: '',
        street: '',
        brgy: '',
        municipality: '',
        province: '',
        postal_code: '',
        email: '',
        contact_number: '',
        password: '',
        password_confirmation: '',
        role_id: '',
    });

    const editForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        dob: '',
        gender: '',
        street: '',
        brgy: '',
        municipality: '',
        province: '',
        postal_code: '',
        email: '',
        contact_number: '',
        role_id: '',
    });

    const filteredUsers = useMemo(() => {
        if (!users || !Array.isArray(users)) {
            return [];
        }

        return users.filter((user) => {
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'all' || user.approval_status === statusFilter;
            return matchesRole && matchesStatus;
        });
    }, [users, roleFilter, statusFilter]);

    const handleView = useCallback((user: User) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    }, []);

    const handleEdit = useCallback((user: User) => {
        setSelectedUser(user);
        editForm.setData({
            first_name: user.first_name || '',
            middle_name: user.middle_name || '',
            last_name: user.last_name || '',
            dob: user.dob || '',
            gender: user.gender || '',
            street: user.street || '',
            brgy: user.brgy || '',
            municipality: user.municipality || '',
            province: user.province || '',
            postal_code: user.postal_code || '',
            email: user.email || '',
            contact_number: user.contact_number || '',
            role_id: roles.find((r) => r.slug === user.role)?.id.toString() || '',
        });
        setIsEditModalOpen(true);
    }, [editForm, roles]);

    const handleUpdateStatus = useCallback((user: User) => {
        setSelectedUser(user);
        updateStatusForm.setData({
            approval_status: user.approval_status,
            rejection_reason: user.rejection_reason || '',
        });
        setIsUpdateStatusDialogOpen(true);
    }, [updateStatusForm]);

    const handleReject = useCallback((user: User) => {
        setSelectedUser(user);
        rejectForm.setData('rejection_reason', '');
        setIsRejectDialogOpen(true);
    }, [rejectForm]);

    const handleApprove = useCallback((user: User) => {
        router.post(`/admin/users/${user.id}/approve`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User approved successfully');
            },
            onError: () => {
                toast.error('Failed to approve user');
            },
        });
    }, []);

    const handleDelete = useCallback((user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    }, []);

    const handleLogoutUser = useCallback((user: User) => {
        setSelectedUser(user);
        setIsLogoutUserModalOpen(true);
    }, []);

    const submitUpdateStatus = () => {
        if (!selectedUser) {
            return;
        }

        const data: { approval_status: string; rejection_reason?: string } = {
            approval_status: updateStatusForm.data.approval_status,
        };

        if (updateStatusForm.data.approval_status === 'rejected') {
            if (!updateStatusForm.data.rejection_reason || updateStatusForm.data.rejection_reason.trim().length < 10) {
                toast.error('Rejection reason is required (minimum 10 characters)');
                return;
            }
            data.rejection_reason = updateStatusForm.data.rejection_reason;
        }

        updateStatusForm.post(`/admin/users/${selectedUser.id}/update-status`, {
            preserveScroll: true,
            data,
            onSuccess: () => {
                toast.success('User status updated successfully');
                setIsUpdateStatusDialogOpen(false);
                setSelectedUser(null);
                updateStatusForm.reset();
            },
            onError: (errors) => {
                toast.error('Failed to update user status');
                console.error(errors);
            },
        });
    };

    const submitReject = () => {
        if (!selectedUser) {
            return;
        }

        if (!rejectForm.data.rejection_reason || rejectForm.data.rejection_reason.trim().length < 10) {
            toast.error('Rejection reason is required (minimum 10 characters)');
            return;
        }

        rejectForm.post(`/admin/users/${selectedUser.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User rejected successfully');
                setIsRejectDialogOpen(false);
                setSelectedUser(null);
                rejectForm.reset();
            },
            onError: (errors) => {
                toast.error('Failed to reject user');
                console.error(errors);
            },
        });
    };

    const submitEdit = () => {
        if (!selectedUser) {
            return;
        }

        editForm.put(`/admin/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User updated successfully');
                setIsEditModalOpen(false);
                setSelectedUser(null);
                editForm.reset();
            },
            onError: (errors) => {
                const emailErr = errors?.email;
                const contactErr = errors?.contact_number;
                if (emailErr || contactErr) {
                    setDuplicateErrorModal({
                        open: true,
                        message: [emailErr, contactErr].filter(Boolean).join(' '),
                    });
                } else {
                    toast.error('Failed to update user');
                }
            },
        });
    };

    const submitDelete = () => {
        if (!selectedUser) {
            return;
        }

        router.delete(`/admin/users/${selectedUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User deleted successfully');
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
            },
            onError: () => {
                toast.error('Failed to delete user');
            },
        });
    };

    const submitLogoutUser = () => {
        if (!selectedUser) {
            return;
        }

        router.post(`/admin/sessions/user/${selectedUser.id}/revoke-all`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User logged out from all devices');
                setIsLogoutUserModalOpen(false);
                setSelectedUser(null);
            },
            onError: () => {
                toast.error('Failed to log out user');
            },
        });
    };

    const submitCreate = () => {
        createForm.post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('User created successfully');
                setIsAddUserDialogOpen(false);
                createForm.reset();
            },
            onError: (errors) => {
                const emailErr = errors?.email;
                const contactErr = errors?.contact_number;
                if (emailErr || contactErr) {
                    setDuplicateErrorModal({
                        open: true,
                        message: [emailErr, contactErr].filter(Boolean).join(' '),
                    });
                } else {
                    toast.error('Failed to create user');
                }
            },
        });
    };

    const columns: ColumnDef<User>[] = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                cell: ({ row }) => <div className="font-medium">{row.original.id}</div>,
            },
            {
                accessorKey: 'first_name',
                header: 'First Name',
                cell: ({ row }) => <div className="font-medium">{row.original.first_name || 'N/A'}</div>,
            },
            {
                accessorKey: 'middle_name',
                header: 'Middle Name',
                cell: ({ row }) => <div>{row.original.middle_name || 'N/A'}</div>,
            },
            {
                accessorKey: 'last_name',
                header: 'Last Name',
                cell: ({ row }) => <div className="font-medium">{row.original.last_name || 'N/A'}</div>,
            },
            {
                accessorKey: 'dob',
                header: 'Date of Birth',
                cell: ({ row }) => (
                    <div>{row.original.dob ? new Date(row.original.dob).toLocaleDateString() : 'N/A'}</div>
                ),
            },
            {
                accessorKey: 'role',
                header: 'Role',
                cell: ({ row }) => getRoleBadge(row.original.role),
            },
            {
                accessorKey: 'approval_status',
                header: 'Approval Status',
                cell: ({ row }) => getStatusBadge(row.original.approval_status),
            },
            {
                accessorKey: 'is_active',
                header: 'Active',
                cell: ({ row }) => {
                    const isActive = row.original.is_active;
                    return (
                        <div className="flex items-center gap-2">
                            <Circle
                                className={`h-3 w-3 ${isActive ? 'text-green-600 dark:text-green-400 fill-current' : 'text-gray-400'}`}
                            />
                            <span className={isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'gender',
                header: 'Gender',
                cell: ({ row }) => <div>{row.original.gender || 'N/A'}</div>,
            },
            {
                accessorKey: 'street',
                header: 'Street',
                cell: ({ row }) => <div className="max-w-[150px] truncate">{row.original.street || 'N/A'}</div>,
            },
            {
                accessorKey: 'brgy',
                header: 'Barangay',
                cell: ({ row }) => <div>{row.original.brgy || 'N/A'}</div>,
            },
            {
                accessorKey: 'municipality',
                header: 'Municipality',
                cell: ({ row }) => <div>{row.original.municipality || 'N/A'}</div>,
            },
            {
                accessorKey: 'province',
                header: 'Province',
                cell: ({ row }) => <div>{row.original.province || 'N/A'}</div>,
            },
            {
                accessorKey: 'postal_code',
                header: 'Postal Code',
                cell: ({ row }) => <div>{row.original.postal_code || 'N/A'}</div>,
            },
            {
                id: 'documents',
                header: 'ID Documents',
                cell: ({ row }) => {
                    const user = row.original;
                    const hasDoc1 = !!user.id_document_1_path;
                    const hasDoc2 = !!user.id_document_2_path;
                    
                    if (!hasDoc1 && !hasDoc2) {
                        return <span className="text-sm text-muted-foreground">—</span>;
                    }
                    
                    return (
                        <div className="flex gap-2">
                            {hasDoc1 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    title="View Proof of Identity 1"
                                >
                                    <a
                                        href={`/documents/user/${user.id_document_1_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1"
                                    >
                                        <FileText className="h-3 w-3" />
                                        <span className="hidden lg:inline">Proof 1</span>
                                    </a>
                                </Button>
                            )}
                            {hasDoc2 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    title="View Proof of Identity 2"
                                >
                                    <a
                                        href={`/documents/user/${user.id_document_2_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1"
                                    >
                                        <FileText className="h-3 w-3" />
                                        <span className="hidden lg:inline">Proof 2</span>
                                    </a>
                                </Button>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'email',
                header: 'Email',
                cell: ({ row }) => <div className="font-medium">{row.original.email}</div>,
            },
            {
                accessorKey: 'contact_number',
                header: 'Contact Number',
                cell: ({ row }) => <div>{row.original.contact_number || 'N/A'}</div>,
            },
           
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const user = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleView(user)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Update
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateStatus(user)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Edit Status
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLogoutUser(user)}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out user (all devices)
                                </DropdownMenuItem>
                                {user.approval_status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleApprove(user)}>
                                        <Check className="mr-2 h-4 w-4" />
                                        Quick approve
                                    </DropdownMenuItem>
                                )}
                                {user.approval_status === 'pending' && (
                                    <DropdownMenuItem
                                        onClick={() => handleReject(user)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Quick reject
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDelete(user)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [handleView, handleEdit, handleUpdateStatus, handleDelete, handleLogoutUser, handleApprove, handleReject],
    );

    const headerActions = useMemo(
        () => (
            <div className="flex items-center gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roles.map((role) => (
                            <SelectItem key={role.id} value={role.slug}>
                                {role.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>

                <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New User
                </Button>
            </div>
        ),
        [roleFilter, statusFilter, roles, setIsAddUserDialogOpen],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />

            <div className="space-y-6 p-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">
                        Oversee all users registered in the system
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                        <CardDescription>
                            {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={filteredUsers}
                            enableGlobalFilter={true}
                            searchKey="search"
                            searchPlaceholder="Search by name, email, contact number..."
                            headerActions={headerActions}
                            globalFilterFn={(row, _columnId, filterValue) => {
                                if (!filterValue || !filterValue.trim()) return true;
                                const term = String(filterValue).toLowerCase().trim();
                                const u = row.original as User;
                                const fullName = [u.first_name, u.middle_name, u.last_name]
                                    .filter(Boolean)
                                    .join(' ')
                                    .toLowerCase();
                                const email = (u.email ?? '').toLowerCase();
                                const contact = (u.contact_number ?? '').toLowerCase();
                                const roleName = (u.role_name ?? '').toLowerCase();
                                return (
                                    fullName.includes(term) ||
                                    email.includes(term) ||
                                    contact.includes(term) ||
                                    roleName.includes(term)
                                );
                            }}
                        />
                    </CardContent>
                </Card>

                {/* View User Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>
                                View complete information about this user
                            </DialogDescription>
                        </DialogHeader>
                        {selectedUser && (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="view_first_name">First Name</Label>
                                    <Input id="view_first_name" readOnly value={selectedUser.first_name || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_middle_name">Middle Name</Label>
                                    <Input id="view_middle_name" readOnly value={selectedUser.middle_name || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_last_name">Last Name</Label>
                                    <Input id="view_last_name" readOnly value={selectedUser.last_name || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_dob">Date of Birth</Label>
                                    <Input
                                        id="view_dob"
                                        readOnly
                                        value={selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'N/A'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_gender">Gender</Label>
                                    <Input id="view_gender" readOnly value={selectedUser.gender || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_email">Email</Label>
                                    <Input id="view_email" readOnly value={selectedUser.email || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_contact_number">Contact Number</Label>
                                    <Input id="view_contact_number" readOnly value={selectedUser.contact_number || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_role">Role</Label>
                                    <Input id="view_role" readOnly value={selectedUser.role_name || selectedUser.role || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_approval_status">Approval Status</Label>
                                    <Input
                                        id="view_approval_status"
                                        readOnly
                                        value={selectedUser.approval_status ? selectedUser.approval_status.toUpperCase() : 'N/A'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_active">Active Status</Label>
                                    <Input id="view_active" readOnly value={selectedUser.is_active ? 'Active' : 'Inactive'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_street">Street</Label>
                                    <Input id="view_street" readOnly value={selectedUser.street || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_brgy">Barangay</Label>
                                    <Input id="view_brgy" readOnly value={selectedUser.brgy || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_municipality">Municipality</Label>
                                    <Input id="view_municipality" readOnly value={selectedUser.municipality || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_province">Province</Label>
                                    <Input id="view_province" readOnly value={selectedUser.province || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_postal_code">Postal Code</Label>
                                    <Input id="view_postal_code" readOnly value={selectedUser.postal_code || 'N/A'} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_created_at">Created At</Label>
                                    <Input id="view_created_at" readOnly value={new Date(selectedUser.created_at).toLocaleString()} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="view_email_verified_at">Email Verified At</Label>
                                    <Input
                                        id="view_email_verified_at"
                                        readOnly
                                        value={selectedUser.email_verified_at ? new Date(selectedUser.email_verified_at).toLocaleString() : 'N/A'}
                                    />
                                </div>
                                
                                {/* ID Documents Section */}
                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="font-semibold text-base">Uploaded ID Documents</h4>
                                    
                                    {selectedUser.id_document_1_path && (
                                        <div className="space-y-2">
                                            <Label>Proof of Identity 1</Label>
                                            <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">Document 1</p>
                                                    <p className="text-xs text-muted-foreground">Click to view or download</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <a
                                                        href={`/documents/user/${selectedUser.id_document_1_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {selectedUser.id_document_2_path && (
                                        <div className="space-y-2">
                                            <Label>Proof of Identity 2</Label>
                                            <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">Document 2</p>
                                                    <p className="text-xs text-muted-foreground">Click to view or download</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    asChild
                                                >
                                                    <a
                                                        href={`/documents/user/${selectedUser.id_document_2_path}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!selectedUser.id_document_1_path && !selectedUser.id_document_2_path && (
                                        <p className="text-sm text-muted-foreground">No documents uploaded</p>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit User Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Update User</DialogTitle>
                            <DialogDescription>
                                Update user information.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        id="first_name"
                                        value={editForm.data.first_name}
                                        onChange={(e) => editForm.setData('first_name', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.first_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input
                                        id="middle_name"
                                        value={editForm.data.middle_name}
                                        onChange={(e) => editForm.setData('middle_name', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.middle_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        id="last_name"
                                        value={editForm.data.last_name}
                                        onChange={(e) => editForm.setData('last_name', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.last_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={editForm.data.dob}
                                        onChange={(e) => editForm.setData('dob', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.dob} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select
                                        value={editForm.data.gender}
                                        onValueChange={(value) => editForm.setData('gender', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editForm.errors.gender} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={editForm.data.email}
                                        onChange={(e) => editForm.setData('email', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.email} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_number">Contact Number</Label>
                                    <Input
                                        id="contact_number"
                                        value={editForm.data.contact_number}
                                        onChange={(e) => editForm.setData('contact_number', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.contact_number} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role_id">Role</Label>
                                    <Select
                                        value={editForm.data.role_id}
                                        onValueChange={(value) => editForm.setData('role_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={editForm.errors.role_id} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="street">Street</Label>
                                    <Input
                                        id="street"
                                        value={editForm.data.street}
                                        onChange={(e) => editForm.setData('street', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.street} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brgy">Barangay</Label>
                                    <Input
                                        id="brgy"
                                        value={editForm.data.brgy}
                                        onChange={(e) => editForm.setData('brgy', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.brgy} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="municipality">Municipality</Label>
                                    <Input
                                        id="municipality"
                                        value={editForm.data.municipality}
                                        onChange={(e) => editForm.setData('municipality', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.municipality} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="province">Province</Label>
                                    <Input
                                        id="province"
                                        value={editForm.data.province}
                                        onChange={(e) => editForm.setData('province', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.province} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postal_code">Postal Code</Label>
                                    <Input
                                        id="postal_code"
                                        value={editForm.data.postal_code}
                                        onChange={(e) => editForm.setData('postal_code', e.target.value)}
                                    />
                                    <InputError message={editForm.errors.postal_code} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={submitEdit} disabled={editForm.processing} className="bg-primary hover:bg-primary/90 text-white">
                                {editForm.processing ? 'Updating...' : 'Update User'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Duplicate email/contact number error modal */}
                <Dialog
                    open={duplicateErrorModal.open}
                    onOpenChange={(open) => setDuplicateErrorModal((prev) => ({ ...prev, open }))}
                >
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Cannot save user</DialogTitle>
                            <DialogDescription>{duplicateErrorModal.message}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={() => setDuplicateErrorModal({ open: false, message: '' })}>
                                OK
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Update Status Dialog */}
                <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Update User Status</DialogTitle>
                            <DialogDescription>
                                Update the approval status for {selectedUser?.first_name} {selectedUser?.last_name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="approval_status">Approval Status</Label>
                                <Select
                                    value={updateStatusForm.data.approval_status}
                                    onValueChange={(value) =>
                                        updateStatusForm.setData('approval_status', value as 'pending' | 'approved' | 'rejected')
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {updateStatusForm.data.approval_status === 'rejected' && (
                                <div className="space-y-2">
                                    <Label htmlFor="rejection_reason">
                                        Rejection Reason <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="rejection_reason"
                                        rows={4}
                                        placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                                        value={updateStatusForm.data.rejection_reason}
                                        onChange={(e) => updateStatusForm.setData('rejection_reason', e.target.value)}
                                        minLength={10}
                                        maxLength={1000}
                                    />
                                    <InputError message={updateStatusForm.errors.rejection_reason} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 10 characters, maximum 1000 characters.
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsUpdateStatusDialogOpen(false);
                                    setSelectedUser(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={submitUpdateStatus} disabled={updateStatusForm.processing} className="bg-primary hover:bg-primary/90 text-white">
                                {updateStatusForm.processing ? 'Updating...' : 'Update Status'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reject User Dialog */}
                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Reject User Account</DialogTitle>
                            <DialogDescription>
                                Reject the account for {selectedUser?.first_name} {selectedUser?.last_name}. Please provide a reason for rejection.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); submitReject(); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reject_rejection_reason">
                                    Rejection Reason <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="reject_rejection_reason"
                                    rows={5}
                                    placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                                    value={rejectForm.data.rejection_reason}
                                    onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                />
                                <InputError message={rejectForm.errors.rejection_reason} />
                                <p className="text-xs text-muted-foreground">
                                    Minimum 10 characters, maximum 1000 characters. This reason will be visible to the user.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsRejectDialogOpen(false);
                                        setSelectedUser(null);
                                        rejectForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={rejectForm.processing}>
                                    {rejectForm.processing ? 'Rejecting...' : 'Reject User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Log out user (all devices) Modal */}
                <Dialog open={isLogoutUserModalOpen} onOpenChange={setIsLogoutUserModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Log out user from all devices</DialogTitle>
                            <DialogDescription>
                                This will end all login sessions for {selectedUser?.first_name} {selectedUser?.last_name} ({selectedUser?.email}). They will need to sign in again on any device.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsLogoutUserModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="secondary" onClick={submitLogoutUser}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out user
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete User Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete {selectedUser?.first_name} {selectedUser?.last_name}? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={submitDelete}>
                                Delete User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add User Dialog */}
                <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                                Create a new user account. The user will be automatically approved.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create_first_name">First Name</Label>
                                    <Input
                                        id="create_first_name"
                                        value={createForm.data.first_name}
                                        onChange={(e) => createForm.setData('first_name', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.first_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_middle_name">Middle Name</Label>
                                    <Input
                                        id="create_middle_name"
                                        value={createForm.data.middle_name}
                                        onChange={(e) => createForm.setData('middle_name', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.middle_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_last_name">Last Name</Label>
                                    <Input
                                        id="create_last_name"
                                        value={createForm.data.last_name}
                                        onChange={(e) => createForm.setData('last_name', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.last_name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_dob">Date of Birth</Label>
                                    <Input
                                        id="create_dob"
                                        type="date"
                                        value={createForm.data.dob}
                                        onChange={(e) => createForm.setData('dob', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.dob} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_gender">Gender</Label>
                                    <Select
                                        value={createForm.data.gender}
                                        onValueChange={(value) => createForm.setData('gender', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={createForm.errors.gender} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_email">Email</Label>
                                    <Input
                                        id="create_email"
                                        type="email"
                                        value={createForm.data.email}
                                        onChange={(e) => createForm.setData('email', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.email} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_contact_number">Contact Number</Label>
                                    <Input
                                        id="create_contact_number"
                                        value={createForm.data.contact_number}
                                        onChange={(e) => createForm.setData('contact_number', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.contact_number} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_role_id">Role</Label>
                                    <Select
                                        value={createForm.data.role_id}
                                        onValueChange={(value) => createForm.setData('role_id', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={role.id.toString()}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={createForm.errors.role_id} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_password">Password</Label>
                                    <Input
                                        id="create_password"
                                        type="password"
                                        value={createForm.data.password}
                                        onChange={(e) => createForm.setData('password', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.password} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_password_confirmation">Confirm Password</Label>
                                    <Input
                                        id="create_password_confirmation"
                                        type="password"
                                        value={createForm.data.password_confirmation}
                                        onChange={(e) => createForm.setData('password_confirmation', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.password_confirmation} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="create_street">Street</Label>
                                    <Input
                                        id="create_street"
                                        value={createForm.data.street}
                                        onChange={(e) => createForm.setData('street', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.street} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_brgy">Barangay</Label>
                                    <Input
                                        id="create_brgy"
                                        value={createForm.data.brgy}
                                        onChange={(e) => createForm.setData('brgy', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.brgy} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_municipality">Municipality</Label>
                                    <Input
                                        id="create_municipality"
                                        value={createForm.data.municipality}
                                        onChange={(e) => createForm.setData('municipality', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.municipality} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_province">Province</Label>
                                    <Input
                                        id="create_province"
                                        value={createForm.data.province}
                                        onChange={(e) => createForm.setData('province', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.province} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create_postal_code">Postal Code</Label>
                                    <Input
                                        id="create_postal_code"
                                        value={createForm.data.postal_code}
                                        onChange={(e) => createForm.setData('postal_code', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.postal_code} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsAddUserDialogOpen(false);
                                    createForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={submitCreate} disabled={createForm.processing} className="bg-primary hover:bg-primary/90 text-white">
                                {createForm.processing ? 'Creating...' : 'Create User'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
