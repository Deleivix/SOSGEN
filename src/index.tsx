
function updateNotificationBadges(unreadMessages: boolean, pendingDrills: boolean) {
    // 1. Sidebar Trigger Badge (Generic Alert)
    const sidebarTrigger = document.getElementById('sidebar-trigger');
    const existingBadge = sidebarTrigger?.querySelector('.notification-badge');
    
    if (unreadMessages || pendingDrills) {
        if (!existingBadge && sidebarTrigger) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            sidebarTrigger.appendChild(badge);
        }
    } else {
        if (existingBadge) existingBadge.remove();
    }

    // 2. Sidebar Messages Button Badge
    const msgBtn = document.getElementById('sidebar-messages-btn');
    const msgBadge = msgBtn?.querySelector('.notification-badge');
    
    if (unreadMessages) {
        if (!msgBadge && msgBtn) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.style.top = '10px';
            badge.style.right = '10px';
            msgBtn.appendChild(badge);
        }
    } else {
        if (msgBadge) msgBadge.remove();
    }

    // 3. Drill Tab Badge
    const drillTab = document.querySelector('.nav-link[title="SIMULACRO"]');
    const drillBadge = drillTab?.querySelector('.notification-badge');
    
    if (pendingDrills) {
        if (!drillBadge && drillTab) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.style.backgroundColor = 'var(--warning-color)';
            badge.style.border = '1px solid #fff';
            drillTab.appendChild(badge);
        }
    } else {
        if (drillBadge) drillBadge.remove();
    }
}
