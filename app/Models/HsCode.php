<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HsCode extends Model
{
    protected $fillable = [
        'code',
        'description',
        'level',
        'parent',
        'section',
    ];
}
