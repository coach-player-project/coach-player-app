<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class AdminController extends Controller
{
    /**
     * Assign a specific role to a user.
     * Only accessible by admins.
     */
    public function assignRole(Request $request, string $id)
    {
        $validatedData = $request->validate([
            'role' => ['required', 'string', 'in:admin,coach,player']
        ]);

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Nie znaleziono użytkownika o podanym ID.'
            ], 404);
        }

        $user->role = $validatedData['role'];
        $user->save();

        return response()->json([
            'message' => 'Role została pomyślnie zmieniona.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ], 200);
    }
}
