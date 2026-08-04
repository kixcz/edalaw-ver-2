<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo e($title ?? 'Session Not Available'); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2"><?php echo e($title ?? 'Waiting for Session'); ?></h1>
        
        <?php if(isset($schedule_window)): ?>
            <p class="text-gray-600 mb-2">Scheduled time: <?php echo e($schedule_window); ?></p>
        <?php endif; ?>
        
        <div id="countdown-container" class="mb-6">
            <?php if(isset($time_until_active)): ?>
                <p class="text-sm text-gray-500 mb-2">
                    Session starts in:
                </p>
                <div id="countdown" class="text-3xl font-bold text-orange-600">
                    <?php echo e($time_until_active); ?>

                </div>
            <?php endif; ?>
        </div>
        
        <div id="waiting-message" class="mb-6">
            <p class="text-gray-600">
                You're in the waiting room. The session will start automatically.
            </p>
            <p class="text-xs text-gray-500 mt-2">
                No need to refresh - you'll be redirected automatically.
            </p>
        </div>
        
        <div id="loading-spinner" class="hidden mb-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p class="text-sm text-gray-600 mt-2">Redirecting to session...</p>
        </div>
        
        <div id="error-message" class="hidden mb-6">
            <p class="text-sm text-red-600">Unable to join session. Please try again.</p>
        </div>
        
        <button 
            onclick="handleRetry()"
            id="retry-button"
            class="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
            Try Joining Again
        </button>
    </div>
    
    <script>
        const sessionId = '<?php echo e($session_id ?? ""); ?>';
        const tunnelToken = '<?php echo e($tunnel_token ?? ""); ?>'; // Get the tunnel token from the view data
        const checkInterval = 30000; // Check every 30 seconds
        let countdownInterval;
        let isLoading = false;
        
        // Handle retry button click
        async function handleRetry() {
            if (isLoading) return;
            isLoading = true;
            
            const button = document.getElementById('retry-button');
            const errorMessage = document.getElementById('error-message');
            const spinner = document.getElementById('loading-spinner');
            
            button.disabled = true;
            button.classList.add('opacity-50');
            button.textContent = 'Checking...';
            errorMessage.classList.add('hidden');
            spinner.classList.remove('hidden');
            
            try {
                // Check session status first
                const response = await fetch(`/visit-session/${sessionId}/status`);
                const data = await response.json();
                
                if (data.ready) {
                    // Session is ready - reload current page instead of redirecting to tunnel URL
                    // This avoids the "already used" error since we're in the same request context
                    window.location.reload();
                } else {
                    // Session not ready yet - continue waiting
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            } catch (error) {
                console.error('Error checking session status:', error);
                errorMessage.textContent = 'Unable to connect to session. Please check your connection and try again.';
                errorMessage.classList.remove('hidden');
                button.disabled = false;
                button.classList.remove('opacity-50');
                button.textContent = 'Try Joining Again';
                spinner.classList.add('hidden');
                isLoading = false;
            }
        }
        
        // Function to check if session is ready
        async function checkSessionStatus() {
            try {
                const response = await fetch(`/visit-session/${sessionId}/status`);
                const data = await response.json();
                
                if (data.ready) {
                    // Session is ready - reload the page to proceed to video room
                    // Don't use tunnel token redirect as it will show "already used" error
                    document.getElementById('loading-spinner').classList.remove('hidden');
                    document.getElementById('waiting-message').classList.add('hidden');
                    document.getElementById('countdown-container').classList.add('hidden');
                    
                    setTimeout(() => {
                        // Reload the current page - the backend will now show video room since schedule check passes
                        window.location.reload();
                    }, 1000);
                }
            } catch (error) {
                console.error('Error checking session status:', error);
            }
        }
        
        // Countdown timer
        function startCountdown() {
            const scheduledStart = <?php echo json_encode($session?->scheduled_start?->toIso8601String(), 15, 512) ?>;
            if (!scheduledStart) return;
            
            const startTime = new Date(scheduledStart).getTime();
            
            countdownInterval = setInterval(() => {
                const now = new Date().getTime();
                const distance = startTime - now;
                
                if (distance < 0) {
                    // Time has come - check session status
                    clearInterval(countdownInterval);
                    checkSessionStatus();
                    return;
                }
                
                // Calculate time remaining
                const hours = Math.floor(distance / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                // Display result
                let display = '';
                if (hours > 0) {
                    display += `${hours}h `;
                }
                if (minutes > 0 || hours > 0) {
                    display += `${minutes}m `;
                }
                display += `${seconds}s`;
                
                document.getElementById('countdown').textContent = display;
            }, 1000);
        }
        
        // Start countdown on page load
        startCountdown();
        
        // Check session status periodically
        checkSessionStatus();
        setInterval(checkSessionStatus, checkInterval);
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
        });
    </script>
</body>
</html>
<?php /**PATH C:\Users\panal\Documents\projects\edalaw (defective)\resources\views/visitor/video-room-not-started.blade.php ENDPATH**/ ?>