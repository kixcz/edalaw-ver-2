<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UploadedFile extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'file_type',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
    ];

    /**
     * Get the user that owns this file.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
