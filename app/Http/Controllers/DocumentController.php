<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentController extends Controller
{
    /**
     * Serve user ID documents (for Super Admin only).
     */
    public function serveUserIdDocument(string $path): StreamedResponse
    {
        // Only allow super admins
        if (!Auth::check() || !Auth::user()->role || Auth::user()->role->slug !== 'super_admin') {
            abort(403, 'Unauthorized access to user documents.');
        }

        // Sanitize path to prevent directory traversal
        $path = str_replace(['..', '\\'], ['', '/'], $path);
        $path = trim($path, '/');
        
        // Ensure path is within users directory
        if (!str_starts_with($path, 'users/')) {
            abort(404, 'Document not found.');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($path)) {
            abort(404, 'Document not found.');
        }

        // Get file contents
        $file = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path);

        return response()->stream(function () use ($file) {
            echo $file;
        }, 200, [
            'Content-Type' => $mimeType ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ]);
    }

    /**
     * Serve visit supporting documents (for Jail Officers and BJMP Officers).
     */
    public function serveVisitDocument(string $path): StreamedResponse
    {
        $user = Auth::user();
        
        // Only allow jail officers and bjmp officers
        if (!$user || !$user->role || !in_array($user->role->slug, ['jail_officer', 'bjmp_officer'])) {
            abort(403, 'Unauthorized access to visit documents.');
        }

        // Sanitize path to prevent directory traversal
        $path = str_replace(['..', '\\'], ['', '/'], $path);
        $path = trim($path, '/');
        
        // Ensure path is within visits directory
        if (!str_starts_with($path, 'visits/')) {
            abort(404, 'Document not found.');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($path)) {
            abort(404, 'Document not found.');
        }

        // Get file contents
        $file = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path);

        return response()->stream(function () use ($file) {
            echo $file;
        }, 200, [
            'Content-Type' => $mimeType ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ]);
    }

    /**
     * Serve visitor's own uploaded documents.
     */
    public function serveVisitorDocument(string $path): StreamedResponse
    {
        $user = Auth::user();
        
        // Only allow visitors to view their own documents
        if (!$user || !$user->role || $user->role->slug !== 'visitor') {
            abort(403, 'Unauthorized access.');
        }

        // Sanitize path to prevent directory traversal
        $path = str_replace(['..', '\\'], ['', '/'], $path);
        $path = trim($path, '/');
        
        // Log for debugging
        \Log::debug('Visitor document access attempt', [
            'user_id' => $user->id,
            'path' => $path,
            'full_path_check' => Storage::disk('public')->path($path),
        ]);
        
        // Ensure path is within visits or eburols or registration_appeals directories
        // Note: eburols includes both 'eburols/' and 'eburols/death_certificates/'
        if (!str_starts_with($path, 'visits/') && 
            !str_starts_with($path, 'eburols/') && 
            !str_starts_with($path, 'registration_appeals/')) {
            \Log::error('Invalid document path', ['path' => $path]);
            abort(404, 'Document not found.');
        }

        // Verify the document belongs to this user
        $belongsToUser = false;
        
        // Check if it's a visit document
        if (str_starts_with($path, 'visits/')) {
            $belongsToUser = \App\Models\Visit::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'approved'])
                ->where(function ($query) use ($path) {
                    $query->where('relationship_proof_path', $path)
                          ->orWhere('additional_proof_path', $path);
                })
                ->exists();
            
            if (!$belongsToUser) {
                \Log::warning('Visit document does not belong to user', [
                    'user_id' => $user->id,
                    'path' => $path,
                ]);
            }
        }
        
        // Check if it's an eburol document (includes death certificates)
        if (!$belongsToUser && str_starts_with($path, 'eburols/')) {
            $belongsToUser = \App\Models\Eburol::where('user_id', $user->id)
                ->whereIn('status', ['pending', 'approved'])
                ->where(function ($query) use ($path) {
                    $query->where('relationship_proof_path', $path)
                          ->orWhere('death_certificate_path', $path);
                })
                ->exists();
                
            if (!$belongsToUser) {
                \Log::warning('Eburol document does not belong to user', [
                    'user_id' => $user->id,
                    'path' => $path,
                ]);
            }
        }
        
        // Check if it's a registration appeal document
        if (!$belongsToUser && str_starts_with($path, 'registration_appeals/')) {
            $belongsToUser = \App\Models\RegistrationAppeal::where('user_id', $user->id)
                ->where(function ($query) use ($path) {
                    $query->where('id_document_1_path', $path)
                          ->orWhere('id_document_2_path', $path);
                })
                ->exists();
                
            if (!$belongsToUser) {
                \Log::warning('Registration document does not belong to user', [
                    'user_id' => $user->id,
                    'path' => $path,
                ]);
            }
        }

        if (!$belongsToUser) {
            abort(403, 'You do not have permission to view this document.');
        }

        // Check if file exists
        if (!Storage::disk('public')->exists($path)) {
            \Log::error('Document file not found', [
                'path' => $path,
                'full_path' => Storage::disk('public')->path($path),
            ]);
            abort(404, 'Document not found.');
        }

        // Get file contents and MIME type
        $file = Storage::disk('public')->get($path);
        $mimeType = Storage::disk('public')->mimeType($path);
        
        \Log::debug('Serving document', [
            'path' => $path,
            'mime_type' => $mimeType,
            'size' => strlen($file),
        ]);

        return response()->stream(function () use ($file) {
            echo $file;
        }, 200, [
            'Content-Type' => $mimeType ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ]);
    }
}
