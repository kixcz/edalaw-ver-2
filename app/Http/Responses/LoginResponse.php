<?php

namespace App\Http\Responses;

use App\ApprovalStatus;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     * Visitors: redirect to pending or rejected page by status; others to intended dashboard.
     * Uses Inertia::location() for Inertia requests so the client does a full page navigation,
     * ensuring the session cookie is sent on the next request (avoids "reload and prompt login again").
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $user = $request->user();

        // Ensure role is loaded for visitor check (session may have refetched user without relations)
        $user?->loadMissing('role');

        if ($user && strtolower((string) $user->role?->slug) === 'visitor') {
            if ($user->approval_status === ApprovalStatus::Pending) {
                $url = route('account-pending');

                return $this->redirectResponse($request, $url);
            }

            if ($user->approval_status === ApprovalStatus::Rejected) {
                $url = route('account-rejected');

                return $this->redirectResponse($request, $url);
            }
        }

        // Redirect to role-specific dashboard (ignore intended URL to avoid 403 from wrong role routes)
        $url = $this->getDashboardUrl($user);

        return $this->redirectResponse($request, $url);
    }

    /**
     * Get the appropriate dashboard URL based on user role.
     */
    private function getDashboardUrl($user): string
    {
        $role = $user->role?->slug;

        return match ($role) {
            'jail_warden' => route('dashboard.jail-warden'),
            'jail_officer' => route('dashboard.jail-officer'),
            'regional_supervisor' => route('dashboard.regional-supervisor'),
            'national' => route('dashboard.national-office'),
            'visitor' => route('dashboard.visitor'),
            default => route('dashboard'),
        };
    }

    /**
     * Return a response that Inertia will follow. For Inertia requests we use Inertia::location()
     * so the client performs a full page navigation (window.location), ensuring the next request
     * sends the session cookie and the user stays logged in.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse|\Illuminate\Http\JsonResponse|\Symfony\Component\HttpFoundation\Response
     */
    private function redirectResponse($request, string $url)
    {
        if ($request->header('X-Inertia')) {
            return Inertia::location($url);
        }

        return $request->wantsJson()
            ? response()->json(['two_factor' => false, 'redirect' => $url])
            : redirect()->to($url, 303);
    }
}
