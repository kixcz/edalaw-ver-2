import { Head, useForm, router, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, Shield, User, X, Check, Trash2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Scope {
    id?: number;
    scope_type: string;
    building_id?: number | null;
    dormitory_id?: number | null;
    cell_id?: number | null;
    description?: string;
    is_active: boolean;
}

interface Officer {
    id: number;
    name: string;
    email: string;
    scopes: Scope[];
}

interface Props {
    auth: { user: any };
    officer: Officer;
    facilities: {
        annexes: { id: number; name: string }[];
        dormitories: { id: number; name: string }[];
        cells: { id: number; cell_number: string; annex_name: string; dormitory_name: string }[];
    };
}

export default function JailOfficerShow({ auth, officer, facilities }: Props) {
    const [scopes, setScopes] = useState<Scope[]>(officer.scopes || []);
    const form = useForm({ scopes: officer.scopes || [] });

    const addScope = () => {
        const newScopes = [...scopes, { scope_type: 'annex', is_active: true, building_id: null, dormitory_id: null, cell_id: null }];
        setScopes(newScopes);
        form.setData('scopes', newScopes as any);
    };

    const updateScope = (index: number, field: string, value: any) => {
        const updatedScopes = [...scopes];
        (updatedScopes[index] as any)[field] = value;

        // Reset IDs if scope_type changes
        if (field === 'scope_type') {
            updatedScopes[index].building_id = null;
            updatedScopes[index].dormitory_id = null;
            updatedScopes[index].cell_id = null;
        }

        setScopes(updatedScopes);
        form.setData('scopes', updatedScopes as any);
    };

    const removeScope = (index: number) => {
        const updatedScopes = scopes.filter((_, i) => i !== index);
        setScopes(updatedScopes);
        form.setData('scopes', updatedScopes as any);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(`/jail-warden/officers/${officer.id}/scopes`);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/jail-warden/dashboard' },
                { title: 'Jail Officer Management', href: '/jail-warden/officers' },
                { title: officer.name, isActive: true },
            ]}
        >
            <Head title={`${officer.name} - Assigned Scopes`} />

            <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/jail-warden/officers">
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="p-2 bg-violet-600 rounded-xl">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground leading-none">{officer.name}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{officer.email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-violet-600" />
                                    Officer Profile
                                </CardTitle>
                                <CardDescription>Basic information and assignment stats</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                                    <p className="text-2xl font-bold">{scopes.length}</p>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-border">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Active:</span>
                                        <span className="font-medium text-emerald-600">{scopes.filter(s => s.is_active).length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Inactive:</span>
                                        <span className="font-medium text-muted-foreground">{scopes.filter(s => !s.is_active).length}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Assigned Scopes (Permissions)</CardTitle>
                                    <CardDescription>
                                        Configure which annexes, dormitories, or cells this officer can manage.
                                    </CardDescription>
                                </div>
                                <Button onClick={addScope} variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" /> Add Scope
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submit} className="space-y-6">
                                    {scopes.length === 0 ? (
                                        <div className="text-center py-10 border border-dashed rounded-lg bg-muted/30">
                                            <Shield className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                                            <p className="text-sm font-medium text-muted-foreground">No scopes assigned.</p>
                                            <p className="text-xs text-muted-foreground mt-1">This officer will not have access to manage any facilities.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {scopes.map((scope, index) => (
                                                <div key={index} className="grid gap-4 sm:grid-cols-12 items-end p-4 border rounded-lg bg-card shadow-sm">
                                                    <div className="sm:col-span-3 space-y-2">
                                                        <Label>Scope Type</Label>
                                                        <Select
                                                            value={scope.scope_type}
                                                            onValueChange={(val) => updateScope(index, 'scope_type', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="annex">Annex (Building)</SelectItem>
                                                                <SelectItem value="dormitory">Dormitory</SelectItem>
                                                                <SelectItem value="cell">Cell</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="sm:col-span-6 space-y-2">
                                                        <Label>Target Facility</Label>
                                                        {scope.scope_type === 'annex' && (
                                                            <Select
                                                                value={scope.building_id?.toString() || ''}
                                                                onValueChange={(val) => updateScope(index, 'building_id', parseInt(val))}
                                                            >
                                                                <SelectTrigger><SelectValue placeholder="Select Annex" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {facilities.annexes.map(a => (
                                                                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                        {scope.scope_type === 'dormitory' && (
                                                            <Select
                                                                value={scope.dormitory_id?.toString() || ''}
                                                                onValueChange={(val) => updateScope(index, 'dormitory_id', parseInt(val))}
                                                            >
                                                                <SelectTrigger><SelectValue placeholder="Select Dormitory" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {facilities.dormitories.map(d => (
                                                                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                        {scope.scope_type === 'cell' && (
                                                            <Select
                                                                value={scope.cell_id?.toString() || ''}
                                                                onValueChange={(val) => updateScope(index, 'cell_id', parseInt(val))}
                                                            >
                                                                <SelectTrigger><SelectValue placeholder="Select Cell" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {facilities.cells.map(c => (
                                                                        <SelectItem key={c.id} value={c.id.toString()}>
                                                                            {c.cell_number} ({c.dormitory_name})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2 space-y-2">
                                                        <Label>Status</Label>
                                                        <Select
                                                            value={scope.is_active ? '1' : '0'}
                                                            onValueChange={(val) => updateScope(index, 'is_active', val === '1')}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1">Active</SelectItem>
                                                                <SelectItem value="0">Inactive</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="sm:col-span-1">
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => removeScope(index)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4 border-t border-border">
                                        <Button 
                                            type="submit" 
                                            disabled={form.processing} 
                                            className="bg-violet-600 hover:bg-violet-700 text-white min-w-32"
                                        >
                                            {form.processing ? 'Saving...' : 'Save Assignments'}
                                            {!form.processing && <Check className="ml-2 w-4 h-4" />}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
