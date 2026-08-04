<?php $__env->startSection('content'); ?>
<div class="container-fluid" style="height: 100vh; overflow: hidden;">
    <!-- Video Container -->
    <div id="video-container" style="height: 100vh; background: #000;"></div>
    
    <!-- Floating Action Button for Chat -->
    <button id="chat-fab" type="button" onclick="toggleChatModal()" 
        style="position:fixed;bottom:30px;right:30px;width:60px;height:60px;border-radius:50%;background:#ea580c;color:white;border:none;box-shadow:0 4px 12px rgba(234,88,12,0.4);cursor:pointer;z-index:9998;font-size:24px;display:flex;align-items:center;justify-content:center;">
        💬
    </button>
    
    <!-- Chat Modal (Hidden by default) -->
    <div id="chat-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;" onclick="closeChatModal(event)">
        <div style="position:absolute;bottom:100px;right:30px;width:400px;max-height:600px;background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);display:flex;flex-direction:column;" onclick="event.stopPropagation()">
            <!-- Modal Header -->
            <div style="padding:16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="margin:0;font-size:16px;font-weight:600;color:#1f2937;">💬 Session Chat</h3>
                <button onclick="closeChatModalDirect()" style="background:none;border:none;font-size:24px;color:#6b7280;cursor:pointer;">&times;</button>
            </div>
            
            <!-- Messages Area -->
            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;min-height:300px;"></div>
            
            <!-- Input Area -->
            <div style="padding:16px;border-top:1px solid #e5e7eb;">
                <form id="chat-form">
                    <textarea id="chat-message-input" placeholder="Type your message..." rows="3" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;resize:none;font-family:inherit;font-size:14px;" maxlength="1000"></textarea>
                    <button type="button" id="send-button" style="width:100%;margin-top:8px;padding:12px;background:#ea580c;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">📤 Send Message</button>
                </form>
            </div>
        </div>
    </div>
    
    <!-- Session Timer Display (Bottom Left - Always Visible Outside Modal) -->
    <div id="session-timer" style="position: fixed; bottom: 30px; left: 30px; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; padding: 16px 24px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); z-index: 10000; display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">⏰</span>
        <div style="display: flex; flex-direction: column;">
            <span id="timer-display" style="line-height: 1.2;">--:--</span>
            <span id="timer-label" style="font-size: 11px; font-weight: normal; opacity: 0.9; text-align: center;">remaining</span>
        </div>
    </div>
    
    <!-- Media Action Notice Banner (Hidden by default) -->
    <div id="media-notice-banner" style="display:none; position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); z-index: 10001; text-align: center; max-width: 90%;">
        <span id="media-notice-icon" style="font-size: 20px; margin-right: 8px;"></span>
        <span id="media-notice-text"></span>
    </div>
</div>

<script src="https://sdk.videosdk.live/rtc-js-prebuilt/0.3.43/rtc-js-prebuilt.js"></script>

<script>
// Global variables for chat
let chatModalOpen = false;
const CURRENT_USER_ID = <?php echo json_encode(auth()->id(), 15, 512) ?>;
const CURRENT_USER_NAME = <?php echo json_encode($participant_name ?? 'Guest', 15, 512) ?>;
const CURRENT_USER_ROLE = <?php echo json_encode(auth()->user()->role->slug ?? 'visitor', 15, 512) ?>;
const IS_OBSERVER = <?php echo e($is_observer ? 'true' : 'false'); ?>;
const ROOM_ID = <?php echo json_encode($room_id, 15, 512) ?>;

// Helper function to check if current user is a jail officer
function isJailOfficer() {
    return CURRENT_USER_ROLE === 'jail_officer' || IS_OBSERVER === true;
}

// Video SDK variables
const meetingId = '<?php echo e($room_id); ?>';
const apiKey = '<?php echo e(config('services.videosdk.api_key')); ?>'; // Use server API key, not JWT
const participantName = '<?php echo e($participant_name); ?>';
const participantId = '<?php echo e($participant_id); ?>';
const isObserver = <?php echo e($is_observer ? 'true' : 'false'); ?>;
const scheduledEnd = '<?php echo e($scheduled_end ?? ""); ?>';

console.log("💬 [CHAT] Initialized - User:", CURRENT_USER_ID, "Room:", ROOM_ID);
console.log("📹 [VIDEO] Meeting:", meetingId, "Participant:", participantName, "Observer:", isObserver);

// Poll for media control commands from jail officer
let mediaCommandPollInterval = null;
let lastProcessedCommandId = 0;

// Show a temporary banner notification for media commands
function showMediaNotice(icon, text) {
    const banner = document.getElementById('media-notice-banner');
    const iconSpan = document.getElementById('media-notice-icon');
    const textSpan = document.getElementById('media-notice-text');
    
    if (banner && iconSpan && textSpan) {
        iconSpan.textContent = icon;
        textSpan.textContent = text;
        banner.style.display = 'block';
        
        // Auto hide after 8 seconds
        setTimeout(() => {
            banner.style.display = 'none';
        }, 8000);
    }
}

// Send postMessage commands to the VideoSDK iframe to attempt automatic toggle
function sendIframeCommand(action) {
    const iframe = document.getElementById('videosdk-frame');
    if (!iframe || !iframe.contentWindow) {
        console.warn('⚠️ [MEDIA] VideoSDK iframe not found or not ready');
        return;
    }
    
    console.log('📨 [MEDIA] Dispatching postMessage commands to iframe for action:', action);
    
    if (action === 'mute_audio') {
        iframe.contentWindow.postMessage({ type: 'toggle-mic' }, '*');
    } 
    else if (action === 'unmute_audio') {
        iframe.contentWindow.postMessage({ type: 'toggle-mic' }, '*');
    }
    else if (action === 'disable_camera') {
        iframe.contentWindow.postMessage({ type: 'toggle-camera' }, '*');
    }
    else if (action === 'enable_camera') {
        iframe.contentWindow.postMessage({ type: 'toggle-camera' }, '*');
    }
}

function startMediaCommandPolling() {
    console.log('🔄 [MEDIA] Starting media command polling for room:', ROOM_ID);
    
    mediaCommandPollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/video/media-commands/${ROOM_ID}`);
            const data = await response.json();
            
            if (data.success && data.commands && data.commands.length > 0) {
                console.log('📨 [MEDIA] Received', data.commands.length, 'pending commands');
                
                for (const cmd of data.commands) {
                    // Skip already processed commands
                    if (cmd.id <= lastProcessedCommandId) continue;
                    
                    console.log('🎯 [MEDIA] Processing command:', cmd.command, 'ID:', cmd.id);
                    
                    try {
                        // Attempt automatic mute/unmute via iframe postMessage
                        sendIframeCommand(cmd.command);
                        
                        if (cmd.command === 'mute_audio') {
                            try {
                                if (window.videoMeetingInstance && typeof window.videoMeetingInstance.muteMic === 'function') {
                                    window.videoMeetingInstance.muteMic();
                                    console.log('🎤 [MEDIA] Microphone muted via SDK');
                                } else {
                                    showMediaNotice('🎤', 'The Jail Officer has muted your microphone.');
                                }
                            } catch (e) {
                                showMediaNotice('🎤', 'The Jail Officer has muted your microphone.');
                            }
                        }
                        else if (cmd.command === 'unmute_audio') {
                            try {
                                if (window.videoMeetingInstance && typeof window.videoMeetingInstance.unmuteMic === 'function') {
                                    window.videoMeetingInstance.unmuteMic();
                                    console.log('🎤 [MEDIA] Microphone unmuted via SDK');
                                } else {
                                    showMediaNotice('🎤', 'The Jail Officer has unmuted your microphone. Please click the Mic button to talk.');
                                }
                            } catch (e) {
                                showMediaNotice('🎤', 'The Jail Officer has unmuted your microphone. Please click the Mic button to talk.');
                            }
                        }
                        else if (cmd.command === 'disable_camera') {
                            try {
                                if (window.videoMeetingInstance && typeof window.videoMeetingInstance.disableWebcam === 'function') {
                                    window.videoMeetingInstance.disableWebcam();
                                    console.log('📹 [MEDIA] Camera disabled via SDK');
                                } else {
                                    showMediaNotice('📹', 'The Jail Officer has disabled your camera.');
                                }
                            } catch (e) {
                                showMediaNotice('📹', 'The Jail Officer has disabled your camera.');
                            }
                        }
                        else if (cmd.command === 'enable_camera') {
                            try {
                                if (window.videoMeetingInstance && typeof window.videoMeetingInstance.enableWebcam === 'function') {
                                    window.videoMeetingInstance.enableWebcam();
                                    console.log('📹 [MEDIA] Camera enabled via SDK');
                                } else {
                                    showMediaNotice('📹', 'The Jail Officer has enabled your camera. Please click the Camera button to turn it on.');
                                }
                            } catch (e) {
                                showMediaNotice('📹', 'The Jail Officer has enabled your camera. Please click the Camera button to turn it on.');
                            }
                        }
                        
                        // Mark command as executed
                        await fetch(`/video/media-commands/${cmd.id}/executed`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            },
                        });
                        
                        lastProcessedCommandId = cmd.id;
                        console.log('✅ [MEDIA] Command', cmd.id, 'executed and marked');
                        
                    } catch (err) {
                        console.error('❌ [MEDIA] Failed to execute command:', err);
                    }
                }
            }
        } catch (err) {
            console.error('❌ [MEDIA] Polling error:', err);
        }
    }, 2000); // Poll every 2 seconds
}

// Start polling when video meeting is ready
function onVideoMeetingReady() {
    console.log('✅ [VIDEO] Meeting ready, starting media command polling');
    startMediaCommandPolling();
}

// Stop polling when leaving
window.addEventListener('beforeunload', () => {
    if (mediaCommandPollInterval) {
        clearInterval(mediaCommandPollInterval);
    }
});

// Toggle chat modal
function toggleChatModal() {
    const modal = document.getElementById('chat-modal');
    if (chatModalOpen) {
        modal.style.display = 'none';
        chatModalOpen = false;
    } else {
        modal.style.display = 'block';
        chatModalOpen = true;
        loadChatHistory();
        setTimeout(() => scrollToBottom(), 100);
    }
}

// Close modal functions
function closeChatModal(event) {
    if (event.target === document.getElementById('chat-modal')) {
        toggleChatModal();
    }
}

function closeChatModalDirect() {
    toggleChatModal();
}

// Load chat history
async function loadChatHistory() {
    try {
        console.log("📥 Loading chat history for room:", ROOM_ID);
        const response = await fetch(`/video/chat/history/${ROOM_ID}`);
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Loaded", result.messages?.length || 0, "messages");
            displayMessages(result.messages);
        } else {
            console.error("❌ Failed to load:", result.error);
        }
    } catch (err) {
        console.error("❌ Load error:", err);
    }
}

// Display messages
function displayMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#9ca3af;margin-top:40px;font-size:14px;">No messages yet.<br>Start the conversation!</div>';
        return;
    }
    
    container.innerHTML = '';
    messages.forEach(msg => appendMessage(msg));
}

// Append single message
function appendMessage(message) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const isOwn = message.sender_id == CURRENT_USER_ID;
    const isJailOfficerSender = message.sender === 'monitor'; // Check if sender is jail officer
    
    console.log('📬 Appending message:', message);
    console.log('👤 Current user role:', CURRENT_USER_ROLE);
    console.log('👁️ Is observer?', IS_OBSERVER);
    console.log('🔐 Is jail officer (helper)?', isJailOfficer());
    
    const div = document.createElement('div');
    div.setAttribute('data-message-id', message.id);
    div.className = 'message-container';
    div.style.cssText = `margin-bottom:12px;padding:10px 14px;border-radius:8px;${isOwn?'background:#dbeafe;margin-left:20%;':'background:#f3f4f6;margin-right:20%;'}`;
    div.style.position = 'relative';
    div.style.cursor = isJailOfficer() ? 'pointer' : 'default';
    
    const name = document.createElement('div');
    name.style.cssText = 'font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;';
    name.textContent = message.sender;
    
    const text = document.createElement('div');
    text.style.cssText = 'font-size:14px;color:#1f2937;word-wrap:break-word;line-height:1.4;';
    text.textContent = message.message;
    
    const time = document.createElement('div');
    time.style.cssText = 'font-size:10px;color:#9ca3af;margin-top:6px;text-align:right;';
    time.textContent = new Date(message.sent_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    
    div.appendChild(name);
    div.appendChild(text);
    div.appendChild(time);
    
    // Add click handler for jail officers to show actions menu
    if (isJailOfficer()) {
        console.log('✅ Attaching click handler to message (user is jail officer)');
        div.onclick = (e) => {
            e.stopPropagation();
            console.log('🖱️ Message clicked!');
            showMessageActionsMenu(message, div, e);
        };
    } else {
        console.log('⚠️ Not a jail officer, skipping click handler');
    }
    
    // Show flagged indicator
    if (message.flagged) {
        const flaggedBadge = document.createElement('div');
        flaggedBadge.textContent = '🚩 Flagged: ' + (message.flag_reason || 'Inappropriate content');
        flaggedBadge.style.cssText = 'font-size:10px;color:#dc2626;background:#fee2e2;margin-top:6px;padding:4px 8px;border-radius:4px;border-left:3px solid #dc2626;';
        div.appendChild(flaggedBadge);
    }
    
    container.appendChild(div);
}

// Show actions menu on message click
function showMessageActionsMenu(message, messageDiv, event) {
    console.log('🖱️ Message clicked - Is Jail Officer:', isJailOfficer());
    console.log('📦 Message data:', message);
    
    // Remove any existing menus first
    const existingMenus = document.querySelectorAll('.message-actions-menu');
    existingMenus.forEach(menu => menu.remove());
    
    // Don't show menu if already flagged
    if (message.flagged) {
        console.log('⚠️ Message already flagged, skipping menu');
        return;
    }
    
    const menu = document.createElement('div');
    menu.className = 'message-actions-menu';
    
    // Calculate position relative to the clicked message
    const rect = messageDiv.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 50;
    
    // Position menu above and to the right of the message bubble
    let top = rect.top - menuHeight - 10;
    let left = rect.right - menuWidth;
    
    // Ensure menu doesn't go off screen
    if (top < 10) top = rect.bottom + 10;
    if (left < 10) left = rect.left;
    
    menu.style.cssText = `
        position: fixed;
        top: ${top}px;
        left: ${left}px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 100000;
        min-width: ${menuWidth}px;
        overflow: hidden;
    `;
    
    menu.innerHTML = `
        <button onclick="showFlagModal('${message.id}', event.target.closest('.message-container'))" 
                style="width: 100%; padding: 12px 16px; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; color: #dc2626; display: flex; align-items: center; gap: 8px; transition: background 0.2s;"
                onmouseover="this.style.background='#fef2f2'"
                onmouseout="this.style.background='none'">
            <span style="font-size: 16px;">⚑</span>
            <span>Flag Message</span>
        </button>
    `;
    
    console.log('📋 Creating menu, appending to body');
    document.body.appendChild(menu);
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 100);
}

function showFlagModal(messageId, messageDiv) {
    const existingMenus = document.querySelectorAll('.message-actions-menu');
    existingMenus.forEach(menu => menu.remove());
    
    const reasons = [
        'Inappropriate language',
        'Threatening behavior',
        'Sharing prohibited information',
        'Harassment',
        'Other security violation'
    ];
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const modal = document.createElement('div');
    
    modal.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    modal.innerHTML = `
        <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">Flag Message</h3>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Select a reason for flagging this message:</p>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
            ${reasons.map(reason => `
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s;" 
                       onmouseover="this.style.background='#f3f4f6'" 
                       onmouseout="this.style.background='transparent'">
                    <input type="radio" name="flag_reason" value="${reason}" style="width: 16px; height: 16px;">
                    <span style="font-size: 14px;">${reason}</span>
                </label>
            `).join('')}
        </div>
        <textarea id="custom_flag_reason" placeholder="Or enter custom reason..." 
                  style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 14px; margin-bottom: 20px;" 
                  rows="3"></textarea>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="this.closest('div[style*=fixed]').remove()" 
                    style="padding: 10px 20px; background: #f3f4f6; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Cancel
            </button>
            <button id="confirm_flag_btn" 
                    style="padding: 10px 20px; background: #dc2626; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Flag Message
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    document.getElementById('confirm_flag_btn').onclick = () => {
        const selectedReason = document.querySelector('input[name="flag_reason"]:checked')?.value;
        const customReason = document.getElementById('custom_flag_reason').value.trim();
        const reason = selectedReason || customReason;
        
        if (!reason) {
            alert('Please select or enter a reason for flagging.');
            return;
        }
        
        flagMessage(messageId, reason, messageDiv);
        overlay.remove();
    };
}

// Flag message function
async function flagMessage(messageId, reason, messageDiv) {
    console.log('🚩 Attempting to flag message:', messageId);
    console.log('📝 Reason:', reason);
    console.log('🔑 SESSION_ID:', SESSION_ID);
    
    if (!SESSION_ID) {
        console.error('❌ SESSION_ID is not defined!');
        alert('Error: Session ID not available. Please refresh the page.');
        return;
    }
    
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        console.log('🎫 CSRF Token present?', !!csrfToken);
        
        const url = `/video/chat/${SESSION_ID}/messages/${messageId}/flag`;
        console.log('📍 Request URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        console.log('📥 Response status:', response.status);
        
        // Try to parse response
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            console.error('Response text:', await response.text());
            throw new Error('Server returned invalid response');
        }
        
        console.log('📥 Response data:', result);
        
        if (result.success) {
            console.log('✅ Message flagged successfully');
            // Update UI to show flagged status
            const flaggedBadge = document.createElement('div');
            flaggedBadge.textContent = '🚩 Flagged: ' + reason;
            flaggedBadge.style.cssText = 'font-size:10px;color:#dc2626;background:#fee2e2;margin-top:6px;padding:4px 8px;border-radius:4px;border-left:3px solid #dc2626;';
            messageDiv.appendChild(flaggedBadge);
            
            // Remove or disable the flag button
            const flagBtn = messageDiv.querySelector('button');
            if (flagBtn) {
                flagBtn.remove();
            }
        } else {
            console.error('❌ Failed to flag:', result.error);
            alert('Failed to flag message: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('💥 Error flagging message:', err);
        console.error('Stack trace:', err.stack);
        alert('Failed to flag message. Error: ' + err.message + '. Check console for details.');
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendMessage() {
    console.log("🔵 Sending message...");
    
    const input = document.getElementById('chat-message-input');
    const messageText = input.value.trim();
    
    if (!messageText) {
        alert('Please enter a message');
        return;
    }
    
    if (!ROOM_ID) {
        alert('Room ID not available');
        return;
    }
    
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        console.log("🔐 CSRF Token:", csrfToken ? 'Present' : 'Missing');
        
        const payload = {
            room_id: ROOM_ID,
            sender_id: CURRENT_USER_ID,
            sender_name: CURRENT_USER_NAME,
            message: messageText
        };
        
        console.log("📤 Sending payload:", payload);
        
        const response = await fetch('/video/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log("📥 Response status:", response.status);
        const result = await response.json();
        console.log("📥 Response data:", result);
        
        if (result.success) {
            console.log("✅ Message sent! ID:", result.data?.id);
            input.value = '';
            
            // Add to UI immediately
            if (chatModalOpen) {
                appendMessage(result.data);
                scrollToBottom();
            }
        } else {
            console.error("❌ Failed:", result.error);
            alert('Failed to send: ' + result.error);
        }
    } catch (err) {
        console.error("❌ Error:", err);
        alert('Error sending message: ' + err.message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("✅ DOM loaded - initializing chat");
    
    // Attach send button listener
    const btn = document.getElementById('send-button');
    if (btn) {
        btn.addEventListener('click', sendMessage);
        console.log("✅ Send button attached");
    }
    
    // Enter key to send
    const textarea = document.getElementById('chat-message-input');
    if (textarea) {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Auto-load chat when modal opens first time
    const fab = document.getElementById('chat-fab');
    if (fab) {
        fab.addEventListener('click', function() {
            if (!chatModalOpen) {
                loadChatHistory();
                setTimeout(() => scrollToBottom(), 200);
            }
        });
    }
});

// Session timer countdown - always visible in bottom left
function updateTimer() {
    const scheduledEnd = <?php echo json_encode($scheduled_end ?? null, 15, 512) ?>;
    
    if (!scheduledEnd) {
        return; // No end time set
    }
    
    const endTime = new Date(scheduledEnd).getTime();
    const now = Date.now();
    const diff = endTime - now;
    
    const timerDisplay = document.getElementById('timer-display');
    const timerLabel = document.getElementById('timer-label');
    
    if (diff <= 0) {
        // Time's up!
        timerDisplay.textContent = '00:00';
        timerLabel.textContent = 'ended';
        
        // Prevent multiple executions
        if (window.sessionAlreadyEnded) {
            return;
        }
        window.sessionAlreadyEnded = true;
        
        console.log('⏰ Session time ended - exiting call');
        
        // Try to exit video call if instance exists
        if (typeof window.videoMeetingInstance !== 'undefined' && window.videoMeetingInstance) {
            try {
                window.videoMeetingInstance.leave();
                console.log('✅ Left video meeting');
            } catch (err) {
                console.error('❌ Error leaving meeting:', err);
            }
        }
        
        // Notify server that session ended due to time
        const sessionId = <?php echo json_encode($session->id ?? null, 15, 512) ?>;
        if (sessionId) {
            fetch(`/visit/session/${sessionId}/time-ended`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json'
                }
            }).catch(err => console.error('Failed to notify server:', err));
        }
        
        // Show non-blocking message instead of alert
        showSessionEndedMessage();
        
        return;
    }
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    const minsStr = minutes.toString().padStart(2, '0');
    const secsStr = seconds.toString().padStart(2, '0');
    
    timerDisplay.textContent = `${minsStr}:${secsStr}`;
    timerLabel.textContent = 'remaining';
}

// Show session ended message with auto-redirect
function showSessionEndedMessage() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create message box
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
        color: white;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        max-width: 500px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;
    
    messageBox.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px;">⏰</div>
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">Session Time Ended</h2>
        <p style="font-size: 16px; margin-bottom: 24px; opacity: 0.9;">Your allocated time for this video call has expired.</p>
        <p style="font-size: 14px; opacity: 0.8;">Redirecting you in <span id="countdown">5</span> seconds...</p>
    `;
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
    
    // Countdown and redirect
    let secondsLeft = 5;
    const countdownEl = document.getElementById('countdown');
    
    const countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0 && countdownEl) {
            countdownEl.textContent = secondsLeft;
        } else {
            clearInterval(countdownInterval);
            // Close window or redirect
            attemptCloseOrRedirect();
        }
    }, 1000);
}

// Attempt to close window or redirect
function attemptCloseOrRedirect() {
    // Try to close the window
    window.close();
    
    // If still open, redirect to dashboard
    setTimeout(() => {
        // For visitor role
        window.location.href = '/dashboard/visitor';
    }, 100);
    
    // Final fallback - replace entire history
    setTimeout(() => {
        window.location.replace('/dashboard/visitor');
    }, 500);
}

// Update timer every second and show it immediately
updateTimer();
setInterval(updateTimer, 1000);

// Poll for new messages every 5 seconds
setInterval(function() {
    if (chatModalOpen) {
        loadChatHistory();
    }
}, 5000);

</script>

<script>
// VideoSDK initialization
const MEETING_ID = <?php echo json_encode($room_id, 15, 512) ?>;
const API_KEY = <?php echo json_encode(env('VIDEOSDK_API_KEY'), 15, 512) ?>;
const TOKEN = <?php echo json_encode($token ?? null, 15, 512) ?>;
const USER_NAME = <?php echo json_encode($participant_name ?? 'Guest', 15, 512) ?>;
const SESSION_ID = <?php echo json_encode($session->id ?? null, 15, 512) ?>;
const PARTICIPANT_ID = <?php echo json_encode($participant_id ?? null, 15, 512) ?>;
const TUNNEL_TOKEN = <?php echo json_encode($tunnel?->tunnel_token ?? null, 15, 512) ?>; 

function initVideoCall() {
    if (typeof VideoSDKMeeting !== 'function') {
        console.error("❌ VideoSDK not available!");
        alert("VideoSDK library failed to load!");
        return;
    }
    
    const config = {
        name: USER_NAME,
        meetingId: MEETING_ID,
        apiKey: API_KEY,
        containerId: "video-container",
        chatEnabled: false, // Disabled - using custom chat
        micEnabled: false,  // Disable microphone by default
        webcamEnabled: true, // Enable camera by default
        permissions: {
            toggleParticipantMic: isObserver,
            toggleParticipantWebcam: isObserver,
            removeParticipant: isObserver,
            endMeeting: isObserver
        }
    };
    
    if (TOKEN) {
        config.token = TOKEN;
    }
    
    try {
        const instance = new VideoSDKMeeting();
        window.videoMeetingInstance = instance; 
   
        instance.init(config);
        console.log("✅ VideoSDK initialized");
        
        // Start polling for media commands after a short delay
        setTimeout(() => {
            onVideoMeetingReady();
        }, 3000);

        if (SESSION_ID && PARTICIPANT_ID) {
            fetch(`/visit/session/${SESSION_ID}/participant-joined`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ participant_id: PARTICIPANT_ID })
            }).catch(err => console.error('Failed to notify participant joined:', err));
        }
       
        if (TUNNEL_TOKEN) {
            fetch(`/inmate/tunnel/${TUNNEL_TOKEN}/token`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.token) {
                    console.log('✅ Inmate tunnel marked as used and token received');
                }
            })
            .catch(err => console.error('Failed to get inmate token:', err));
        }
        
        window.addEventListener('beforeunload', function() {
            if (SESSION_ID) {
                navigator.sendBeacon(`/visit/session/${SESSION_ID}/participant-left`, JSON.stringify({
                    participant_id: PARTICIPANT_ID,
                    left_at: new Date().toISOString()
                }));
            }
        });
        
    } catch (err) {
        console.error("VideoSDK init failed:", err);
    }
}

window.addEventListener('load', initVideoCall);
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.visitor', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH C:\Users\panal\Documents\projects\edalaw (defective)\resources\views/visitor/video-room.blade.php ENDPATH**/ ?>