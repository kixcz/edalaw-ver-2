import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import type { RecordRow } from './DataTable';

type DeleteConfirmDialogProps = {
    open: boolean;
    routeBase: string;
    record: RecordRow | null;
    entityName: string;
    softDeleteLabel?: string;
    onClose: () => void;
};

export function DeleteConfirmDialog({
    open,
    routeBase,
    record,
    entityName,
    softDeleteLabel = 'delete',
    onClose,
}: DeleteConfirmDialogProps) {
    if (!open || !record) {
        return null;
    }

    const confirm = () => {
        router.delete(`${routeBase}/${record.id}`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-lg">
                <div>
                    <h2 className="text-lg font-semibold">
                        Confirm {softDeleteLabel}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Are you sure you want to {softDeleteLabel} this{' '}
                        {entityName}? The system will block the action if
                        dependent records exist.
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirm}>
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}
