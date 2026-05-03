"use client";

import { createContext, useContext, ReactNode } from "react";

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  status: string;
}

export interface FriendRequest {
  id: string;
  userId: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
}

export interface Message {
  type: string;
  data?: {
    senderId: string;
    receiverId?: string;
    groupId?: string;
    content: string;
    createdAt: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export type TabType = "messages" | "friends" | "groups";

export interface DashboardContextType {
  userId: string;

  // UI State
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Data
  friends: Friend[];
  requests: FriendRequest[];
  groups: Group[];
  messages: Message[];
  selectedFriend: Friend | null;
  selectedGroup: Group | null;

  // Setters
  setSelectedFriend: (friend: Friend | null) => void;
  setSelectedGroup: (group: Group | null) => void;
  addMessage: (message: Message) => void;

  // Loading state
  loading: boolean;

  // WebSocket
  wsReady: boolean;
  sendMessage: (content: string) => void;

  // API Actions
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  sendFriendRequest: (email: string) => Promise<void>;
  acceptRequest: (requesterId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  handleLogout: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}

export function DashboardProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DashboardContextType;
}) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
