"use client";

import { DashboardProvider } from "@/contexts/DashboardContext";
import { useDashboardState } from "@/hooks/useDashboardState";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import MessagesPanel from "@/components/dashboard/MessagesPanel";

/**
 * Inner component that uses the dashboard state hook
 * This is wrapped by the provider pattern below
 */
function DashboardContent() {
  const dashboardState = useDashboardState();

  return (
    <DashboardProvider value={dashboardState}>
      <div className="h-screen flex bg-background">
        <DashboardSidebar />
        <MessagesPanel />
      </div>
    </DashboardProvider>
  );
}

/**
 * Dashboard page component
 *
 * Architecture Overview:
 * =====================
 *
 * State Management:
 * - useDashboardState() hook: Centralized state management
 *   - Auth: token, userId
 *   - UI: activeTab, selectedFriend/Group
 *   - Data: friends, requests, groups, messages
 *   - WebSocket: connection, messaging
 *
 * Context:
 * - DashboardContext: Provides all state and actions to children
 *   - Prevents prop drilling
 *   - Allows any component to access dashboard state
 *
 * Component Tree:
 * - DashboardSidebar
 *   - DashboardSidebar.tsx: Main sidebar with tab navigation
 *   - MessagesList.tsx: List of friends and groups for messaging
 *   - FriendsList.tsx: Add friends, manage friend requests
 *   - GroupsList.tsx: Create groups, view existing groups
 *
 * - MessagesPanel
 *   - MessagesPanel.tsx: Display messages and input area
 *
 * WebSocket Architecture:
 * - useWebSocket hook: Encapsulates all WebSocket logic
 *   - Connection management
 *   - Auto-reconnect with exponential backoff (1s → 30s)
 *   - Message event handling
 *   - Proper cleanup on disconnect
 *
 * Data Fetching:
 * - useDashboardApi hook: All API calls
 *   - fetchFriends, fetchRequests, fetchGroups
 *   - sendFriendRequest, acceptRequest, removeFriend
 *   - Error handling and loading states
 *
 * Message Flow:
 * 1. User types message and hits Enter or clicks Send
 * 2. sendMessage() called via MessagesPanel
 * 3. WebSocket send via wsSend() from useWebSocket
 * 4. Server receives message, broadcasts to recipient
 * 5. WebSocket onMessage fires, calls callback
 * 6. Message added to state via addMessage()
 * 7. UI re-renders with new message
 */
export default function Dashboard() {
  return <DashboardContent />;
}
