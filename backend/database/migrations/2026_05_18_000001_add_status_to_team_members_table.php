<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('user_id');
            $table->unique(['team_id', 'user_id']);
        });

        DB::table('team_members')->update(['status' => 'approved']);
    }

    public function down(): void
    {
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropUnique(['team_id', 'user_id']);
            $table->dropColumn('status');
        });
    }
};
