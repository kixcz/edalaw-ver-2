<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-4">You Seem Lost!</h1>
        
        <p class="text-gray-600 mb-6">
            Oops! It seems like you've stumbled upon a page that doesn't exist or has been moved.
        </p>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p class="text-sm text-blue-800">
                <strong>What happened?</strong><br>
                The page you're looking for might have been removed, renamed, or is temporarily unavailable.
            </p>
        </div>
        
        <div class="space-y-3">
            <button 
                onclick="window.history.back()"
                class="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                ← Go Back
            </button>
            
            <button 
                onclick="window.location.href='/'"
                class="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                🏠 Go to Homepage
            </button>
        </div>
        
        <div class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-xs text-gray-500 mb-2">
                If you believe this is a mistake, please contact the administrator.
            </p>
            <p class="text-xs text-gray-400">
                Error Code: 404 - Page Not Found
            </p>
        </div>
    </div>
</body>
</html>
<?php /**PATH C:\Sandbox\web app\eDalaw\edalaw-ver-2\resources\views/errors/404.blade.php ENDPATH**/ ?>