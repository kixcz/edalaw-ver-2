import { Head, Link } from '@inertiajs/react';
import { FileText, Upload, Eye, Calendar, Folder, X } from 'lucide-react';
import { useState, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Visitor',
        href: '/dashboard/visitor',
    },
    {
        title: 'Files Uploaded',
        href: '/visitor/files-uploaded',
    },
];

type Props = {
    files: Array<{
        type: string;
        subtype: string;
        path: string;
        uploaded_at: string;
        related_to: string;
        status: string;
    }>;
    stats: {
        total_files: number;
        visit_documents: number;
        eburol_documents: number;
        registration_documents: number;
    };
};

const ITEMS_PER_PAGE = 10;

function getStatusBadge(status: string) {
    switch (status) {
        case 'approved':
            return (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    Approved
                </Badge>
            );
        case 'rejected':
            return (
                <Badge variant="destructive">Rejected</Badge>
            );
        default:
            return (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                    Pending
                </Badge>
            );
    }
}

function getFileTypeIcon(type: string) {
    if (type.includes('Visit')) {
        return <Calendar className="h-5 w-5 text-blue-600" />;
    }
    if (type.includes('E-Burol')) {
        return <Folder className="h-5 w-5 text-purple-600" />;
    }
    return <FileText className="h-5 w-5 text-orange-600" />;
}

export default function FilesUploaded({ files, stats }: Props) {
    const [filterType, setFilterType] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingFile, setViewingFile] = useState<{ path: string; subtype: string; type: string } | null>(null);

    // Filter files based on selected type
    const filteredFiles = useMemo(() => {
        if (filterType === 'all') return files;
        return files.filter(file => file.type === filterType);
    }, [files, filterType]);

    // Pagination
    const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
    const paginatedFiles = filteredFiles.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filter changes
    const handleFilterChange = (value: string) => {
        setFilterType(value);
        setCurrentPage(1);
    };

    const getFileTypeIcon = (type: string) => {
        if (type.includes('Visit')) {
            return <Calendar className="h-5 w-5 text-blue-600" />;
        }
        if (type.includes('E-Burol')) {
            return <Folder className="h-5 w-5 text-purple-600" />;
        }
        return <FileText className="h-5 w-5 text-orange-600" />;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Files Uploaded" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Files Uploaded</h1>
                        <p className="text-muted-foreground">
                            View all documents you have uploaded across all applications
                        </p>
                    </div>
                    <Link
                        href="/dashboard/visitor"
                        className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Statistics Cards */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Files
                            </CardTitle>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_files}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                All uploaded documents
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Visit Documents
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.visit_documents}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Visit application files
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                E-Burol Documents
                            </CardTitle>
                            <Folder className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.eburol_documents}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                E-Burol application files
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Registration Documents
                            </CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.registration_documents}</div>
                            <p className="text-xs text-muted-foreground mt-2">
                                ID and registration files
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Files Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>All Uploaded Files</CardTitle>
                                <CardDescription>
                                    {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
                                </CardDescription>
                            </div>
                            <Select value={filterType} onValueChange={handleFilterChange}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Documents</SelectItem>
                                    <SelectItem value="Visit Document">Visit Documents</SelectItem>
                                    <SelectItem value="E-Burol Document">E-Burol Documents</SelectItem>
                                    <SelectItem value="Registration Document">Registration Documents</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {paginatedFiles.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Upload className="size-12 mx-auto mb-4 opacity-50" />
                                <p>No files uploaded yet.</p>
                                <div className="mt-4 flex gap-2 justify-center">
                                    <Link
                                        href="/visitor/schedule"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <Calendar className="size-4" />
                                        Apply for Visit
                                    </Link>
                                    <span className="text-muted-foreground">•</span>
                                    <Link
                                        href="/visitor/eburol"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <Folder className="size-4" />
                                        Apply for E-Burol
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {paginatedFiles.map((file, index) => (
                                    <div
                                        key={`${file.path}-${index}`}
                                        className="rounded-lg border p-4 space-y-3"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                {getFileTypeIcon(file.type)}
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{file.subtype}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {file.type}
                                                        </Badge>
                                                        {getStatusBadge(file.status)}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Related to: {file.related_to}
                                                    </p>
                                                    <div className="text-xs text-muted-foreground">
                                                        Uploaded: {new Date(file.uploaded_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setViewingFile({ path: file.path, subtype: file.subtype, type: file.type })}
                                            >
                                                <Eye className="h-3 w-3 mr-1" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t pt-4 mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length} files
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setCurrentPage(page)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {page}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* File View Modal */}
                <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-lg font-semibold">
                                    {viewingFile?.subtype}
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {viewingFile?.type}
                            </p>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                            {viewingFile && (
                                <div className="w-full h-full flex items-center justify-center">
                                    {viewingFile.path.match(/\.(pdf)$/i) ? (
                                        <iframe
                                            src={`/documents/visitor/${viewingFile.path}`}
                                            className="w-full h-[70vh] border rounded"
                                            title="Document Preview"
                                            onError={() => {
                                                console.error('Failed to load PDF:', viewingFile.path);
                                            }}
                                        />
                                    ) : viewingFile.path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img
                                            src={`/documents/visitor/${viewingFile.path}`}
                                            alt={viewingFile.subtype}
                                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                                            onError={(e) => {
                                                console.error('Failed to load image:', viewingFile.path);
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    ) : viewingFile.path.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i) ? (
                                        <div className="flex flex-col items-center justify-center gap-4 py-12">
                                            <div className="text-center space-y-4">
                                                <FileText className="h-32 w-32 text-blue-500 mx-auto" />
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-semibold">{viewingFile.subtype}</h3>
                                                    <p className="text-sm text-muted-foreground">{viewingFile.type}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Office documents cannot be previewed in the browser
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="default"
                                                    size="lg"
                                                    asChild
                                                >
                                                    <a
                                                        href={`/documents/visitor/${viewingFile.path}`}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Download {viewingFile.path.split('.').pop()?.toUpperCase()}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-4 py-12">
                                            <FileText className="h-24 w-24 text-muted-foreground" />
                                            <p className="text-muted-foreground">Preview not available for this file type</p>
                                            <Button
                                                variant="outline"
                                                asChild
                                            >
                                                <a
                                                    href={`/documents/visitor/${viewingFile.path}`}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Download File
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-muted/30">
                            <Button
                                variant="outline"
                                onClick={() => setViewingFile(null)}
                            >
                                Close
                            </Button>
                            {viewingFile && (
                                <Button
                                    variant="default"
                                    asChild
                                >
                                    <a
                                        href={`/documents/visitor/${viewingFile.path}`}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Download
                                    </a>
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
