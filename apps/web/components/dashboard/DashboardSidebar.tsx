"use client";

import { Button } from "@/components/ui";
import { LogOut, MessageSquare, Users, Plus } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import MessagesList from "./MessagesList";
import FriendsList from "./FriendsList";
import GroupsList from "./GroupsList";

export function DashboardSidebar() {
  const { activeTab, setActiveTab, handleLogout } = useDashboard();

  return (
    <div className="flex w-80 flex-col border-r bg-card/95 p-4 backdrop-blur">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">In Touch</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Button
          variant={activeTab === "messages" ? "default" : "outline"}
          onClick={() => setActiveTab("messages")}
          className="text-xs sm:text-sm"
        >
          <MessageSquare className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Messages</span>
        </Button>
        <Button
          variant={activeTab === "friends" ? "default" : "outline"}
          onClick={() => setActiveTab("friends")}
          className="text-xs sm:text-sm"
        >
          <Users className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Friends</span>
        </Button>
        <Button
          variant={activeTab === "groups" ? "default" : "outline"}
          onClick={() => setActiveTab("groups")}
          className="text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Groups</span>
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === "messages" && <MessagesList />}
        {activeTab === "friends" && <FriendsList />}
        {activeTab === "groups" && <GroupsList />}
      </div>
    </div>
  );
}
