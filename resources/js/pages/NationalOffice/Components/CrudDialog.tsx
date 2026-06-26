import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
import type { RecordRow } from './DataTable';

export type FieldOption = {
    value: string | number;
    label: string;
};

export type FormField = {
    name: string;
    label: string;
    type?:
        | 'text'
        | 'email'
        | 'password'
        | 'number'
        | 'date'
        | 'select'
        | 'textarea';
    required?: boolean;
    options?: FieldOption[];
    placeholder?: string;
};

type CrudDialogProps = {
    open: boolean;
    title: string;
    routeBase: string;
    fields: FormField[];
    record: RecordRow | null;
    onClose: () => void;
};

function initialData(fields: FormField[], record: RecordRow | null) {
    return fields.reduce<Record<string, string>>((data, field) => {
        const value = record?.[field.name];
        data[field.name] =
            value === null || value === undefined ? '' : String(value);
        return data;
    }, {});
}

export function CrudDialog({
    open,
    title,
    routeBase,
    fields,
    record,
    onClose,
}: CrudDialogProps) {
    const form = useForm<Record<string, string>>(initialData(fields, record));

    useEffect(() => {
        form.setData(initialData(fields, record));
        form.clearErrors();
    }, [record, open]);

    if (!open) {
        return null;
    }

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (record) {
            form.put(`${routeBase}/${record.id}`, {
                preserveScroll: true,
                onSuccess: onClose,
            });
            return;
        }

        form.post(routeBase, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <form
                onSubmit={submit}
                className="w-full max-w-2xl space-y-5 rounded-xl border bg-card p-6 shadow-lg"
            >
                <div>
                    <h2 className="text-lg font-semibold">
                        {record ? `Edit ${title}` : `Add ${title}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Complete the required fields and save the record.
                    </p>
                </div>

                <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
                    {fields.map((field) => (
                        <div
                            key={field.name}
                            className={
                                field.type === 'textarea'
                                    ? 'space-y-2 md:col-span-2'
                                    : 'space-y-2'
                            }
                        >
                            <Label htmlFor={field.name}>{field.label}</Label>
                            {field.type === 'select' ? (
                                <select
                                    id={field.name}
                                    value={form.data[field.name] ?? ''}
                                    onChange={(event) =>
                                        form.setData(
                                            field.name,
                                            event.target.value,
                                        )
                                    }
                                    required={field.required}
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                                >
                                    <option value="">
                                        Select {field.label}
                                    </option>
                                    {(field.options ?? []).map((option) => (
                                        <option
                                            key={String(option.value)}
                                            value={String(option.value)}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : field.type === 'textarea' ? (
                                <Textarea
                                    id={field.name}
                                    value={form.data[field.name] ?? ''}
                                    onChange={(event) =>
                                        form.setData(
                                            field.name,
                                            event.target.value,
                                        )
                                    }
                                    placeholder={field.placeholder}
                                    required={field.required}
                                />
                            ) : (
                                <Input
                                    id={field.name}
                                    type={field.type ?? 'text'}
                                    value={form.data[field.name] ?? ''}
                                    onChange={(event) =>
                                        form.setData(
                                            field.name,
                                            event.target.value,
                                        )
                                    }
                                    placeholder={field.placeholder}
                                    required={field.required}
                                />
                            )}
                            {form.errors[field.name] ? (
                                <p className="text-sm text-destructive">
                                    {form.errors[field.name]}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={form.processing}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing}>
                        Save Record
                    </Button>
                </div>
            </form>
        </div>
    );
}
