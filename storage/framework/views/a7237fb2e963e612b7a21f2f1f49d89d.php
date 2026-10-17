<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMS Service Unavailable</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
        <!-- Icon with animation -->
        <div class="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"></path>
            </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-3">SMS Service Temporarily Unavailable</h1>
        
        <p class="text-gray-600 mb-6">
            We're unable to send SMS messages at the moment due to insufficient account balance.
        </p>
        
        <!-- Alert box with instructions -->
        <div class="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 text-left">
            <div class="flex items-start">
                <svg class="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                    <p class="text-sm font-semibold text-red-900 mb-2">Action Required:</p>
                    <p class="text-sm text-red-800 leading-relaxed">
                        Please add funds to your Semaphore SMS account to continue sending messages. 
                        Once credited, the service will be restored automatically.
                    </p>
                </div>
            </div>
        </div>
        
        <!-- Action buttons -->
        <div class="space-y-3 mb-6">
            <button 
                onclick="window.history.back()"
                class="w-full inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
                ← Go Back
            </button>
            
            <button 
                onclick="window.location.href='/'"
                class="w-full inline-flex items-center justify-center px-6 py-3.5 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
            >
                🏠 Return to Homepage
            </button>
        </div>
        
        <!-- Support info -->
        <div class="pt-6 border-t border-gray-200">
            <p class="text-sm text-gray-600 mb-2">
                Need assistance? Contact support for help with account funding.
            </p>
            <p class="text-xs text-gray-400">
                Error: SMS_INSUFFICIENT_BALANCE (503)
            </p>
        </div>
    </div>
</body>
</html>
<?php /**PATH C:\Users\panal\Documents\Projects\edalaw (defective)\resources\views/errors/sms-insufficient-balance.blade.php ENDPATH**/ ?>