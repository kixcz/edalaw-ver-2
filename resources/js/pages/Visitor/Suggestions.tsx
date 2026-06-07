import { Head, router, useForm } from '@inertiajs/react';
import { MessageSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/layouts/app-layout';
import visitor from '@/routes/visitor/index';
import type { BreadcrumbItem } from '@/types';

type Suggestion = {
    id: number;
    type: 'suggestion' | 'complaint';
    subject: string;
    message: string;
    status: 'pending' | 'reviewed' | 'in_progress' | 'resolved' | 'dismissed';
    admin_response: string | null;
    reviewed_at: string | null;
    created_at: string;
};

type Props = {
    suggestions: Suggestion[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Suggestions & Complaints',
        href: '/visitor/suggestions',
    },
];

function getStatusBadge(status: string) {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
        pending: {
            variant: 'secondary',
            className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
            label: 'Pending',
        },
        reviewed: {
            variant: 'default',
            className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            label: 'Reviewed',
        },
        in_progress: {
            variant: 'default',
            className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            label: 'In Progress',
        },
        resolved: {
            variant: 'default',
            className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            label: 'Resolved',
        },
        dismissed: {
            variant: 'outline',
            className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
            label: 'Dismissed',
        },
    };

    const config = badges[status] || badges.pending;
    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}

export default function Suggestions({ suggestions }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    useToast();

    const form = useForm({
        type: '',
        subject: '',
        message: '',
        privacy_acknowledged: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(visitor.suggestions.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setIsModalOpen(false);
            },
            onError: () => {
                toast.error('Failed to submit feedback. Please check the form and try again.');
            },
        });
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        form.reset();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Suggestions & Complaints" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Suggestions & Complaints</h1>
                        <p className="text-muted-foreground">
                            Share your experience, suggestions, or file a complaint
                        </p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Submit Feedback
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>My Submissions</CardTitle>
                        <CardDescription>
                            View all your submitted suggestions and complaints
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {suggestions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MessageSquare className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No suggestions or complaints submitted yet.</p>
                                <p className="text-sm mt-2">Click "Submit Feedback" to share your experience.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {suggestions.map((suggestion) => (
                                    <Card key={suggestion.id} className="border-l-4 border-l-primary">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <CardTitle className="text-lg">
                                                            {suggestion.subject}
                                                        </CardTitle>
                                                        <Badge variant="outline" className="capitalize">
                                                            {suggestion.type}
                                                        </Badge>
                                                        {getStatusBadge(suggestion.status)}
                                                    </div>
                                                    <CardDescription>
                                                        Submitted: {new Date(suggestion.created_at).toLocaleString()}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-semibold">Message:</Label>
                                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                                    {suggestion.message}
                                                </p>
                                            </div>
                                            {suggestion.admin_response && (
                                                <div className="rounded-lg bg-muted p-4 border-l-4 border-l-primary">
                                                    <Label className="text-sm font-semibold">Admin Response:</Label>
                                                    <p className="text-sm mt-1 whitespace-pre-wrap">
                                                        {suggestion.admin_response}
                                                    </p>
                                                    {suggestion.reviewed_at && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Reviewed: {new Date(suggestion.reviewed_at).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Submit Feedback Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Submit Feedback</DialogTitle>
                            <DialogDescription>
                                Share your experience, suggestions for improvement, or file a complaint
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="type">
                                        Type <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.type}
                                        onValueChange={(value) => form.setData('type', value)}
                                    >
                                        <SelectTrigger id="type">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="suggestion">Suggestion</SelectItem>
                                            <SelectItem value="complaint">Complaint</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.type} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="subject">
                                        Subject <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="subject"
                                        type="text"
                                        required
                                        value={form.data.subject}
                                        onChange={(e) => form.setData('subject', e.target.value)}
                                        placeholder="Brief summary of your feedback"
                                    />
                                    <InputError message={form.errors.subject} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="message">
                                        Message <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        id="message"
                                        required
                                        rows={6}
                                        value={form.data.message}
                                        onChange={(e) => form.setData('message', e.target.value)}
                                        placeholder="Please provide detailed feedback about your experience, suggestions for improvement, or details about your complaint..."
                                    />
                                    <InputError message={form.errors.message} />
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 20 characters, maximum 5000 characters
                                    </p>
                                </div>

                                {/* Feedback/Complaint Privacy Notice */}
                                <div className="rounded-lg border-l-4 border-l-teal-500 bg-teal-500/10 p-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="feedback-privacy-acknowledged"
                                            checked={form.data.privacy_acknowledged}
                                            onChange={(e) => form.setData('privacy_acknowledged', e.target.checked)}
                                            required
                                            className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label
                                            htmlFor="feedback-privacy-acknowledged"
                                            className="text-sm font-normal leading-relaxed cursor-pointer text-muted-foreground"
                                        >
                                                                                        Information submitted through this form will be used solely for service evaluation, complaint investigation, issue resolution, quality improvement, and administrative review. Personal information shall be processed only by authorized personnel in accordance with Republic Act No. 10173 and applicable privacy policies.
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={handleModalClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing || !form.data.privacy_acknowledged}>
                                    {form.processing ? 'Submitting...' : 'Submit Feedback'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

