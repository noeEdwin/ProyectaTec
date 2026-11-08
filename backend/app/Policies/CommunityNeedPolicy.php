<?php

namespace App\Policies;

use App\Models\CommunityNeed;
use App\Models\User;

class CommunityNeedPolicy
{
    public function update(User $user, CommunityNeed $communityNeed): bool
    {
        return (int) $communityNeed->created_by === (int) $user->id;
    }
}
