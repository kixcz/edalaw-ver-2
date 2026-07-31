import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
        <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Confirm {softDeleteLabel}</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to {softDeleteLabel} this{' '}
                        {entityName}? The system will block the action if
                        dependent records exist.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={confirm}>
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
