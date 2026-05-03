"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  UserPlus,
  LogOut,
  Hash,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useDashboard, TabType } from "@/contexts/DashboardContext";
import FriendsList from "./FriendsList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui";

/** Thin icon rail on the far-left */
function IconRail({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { activeTab, setActiveTab, handleLogout, requests } = useDashboard();

  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-[hsl(228,6%,13%)] py-3">
      {/* DMs */}
      <button
        onClick={() => setActiveTab("dm")}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:rounded-xl ${
          activeTab === "dm"
            ? "rounded-xl bg-[hsl(235,86%,65%)] text-white"
            : "bg-[hsl(228,6%,23%)] text-[hsl(215,9%,58%)] hover:bg-[hsl(235,86%,65%)] hover:text-white"
        }`}
        title="Direct Messages"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div className="mx-auto h-[2px] w-8 rounded-full bg-[hsl(228,6%,24%)]" />

      {/* Groups */}
      <button
        onClick={() => setActiveTab("groups")}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:rounded-xl ${
          activeTab === "groups"
            ? "rounded-xl bg-[hsl(235,86%,65%)] text-white"
            : "bg-[hsl(228,6%,23%)] text-[hsl(215,9%,58%)] hover:bg-[hsl(235,86%,65%)] hover:text-white"
        }`}
        title="Groups"
      >
        <Hash className="w-6 h-6" />
      </button>

      {/* Friends */}
      <div className="relative">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:rounded-xl ${
            activeTab === "friends"
              ? "rounded-xl bg-[hsl(139,47%,44%)] text-white"
              : "bg-[hsl(228,6%,23%)] text-[hsl(215,9%,58%)] hover:bg-[hsl(139,47%,44%)] hover:text-white"
          }`}
          title="Friends"
        >
          <Users className="w-6 h-6" />
        </button>
        {requests.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {requests.length}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Toggle sidebar — mobile helper */}
      <button
        onClick={onToggle}
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-[hsl(215,9%,58%)] transition hover:text-white md:hidden"
        title="Toggle sidebar"
      >
        {collapsed ? (
          <PanelLeftOpen className="w-5 h-5" />
        ) : (
          <PanelLeftClose className="w-5 h-5" />
        )}
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(228,6%,23%)] text-[hsl(215,9%,58%)] transition-all duration-200 hover:rounded-xl hover:bg-red-500 hover:text-white"
        title="Sign Out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}

/** DM list panel */
function DMList() {
  const {
    friends,
    selectedFriend,
    setSelectedFriend,
    setSelectedGroup,
    onlineUsers,
  } = useDashboard();

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-12 items-center border-b border-[hsl(228,6%,20%)] px-3">
        <input
          type="text"
          placeholder="Find or start a conversation"
          className="w-full rounded-md bg-[hsl(228,6%,13%)] px-2.5 py-1.5 text-xs text-[hsl(210,17%,98%)] placeholder-[hsl(215,9%,50%)] outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[hsl(215,9%,50%)]">
          Direct Messages
        </p>

        {friends.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[hsl(215,9%,45%)]">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {friends.map((friend) => {
              const isOnline = onlineUsers.has(friend.friendId);
              return (
                <button
                  key={friend.id}
                  onClick={() => {
                    setSelectedFriend(friend);
                    setSelectedGroup(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors ${
                    selectedFriend?.id === friend.id
                      ? "bg-[hsl(228,6%,26%)] text-white"
                      : "text-[hsl(215,9%,65%)] hover:bg-[hsl(228,6%,22%)] hover:text-[hsl(215,9%,85%)]"
                  }`}
                >
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(235,86%,65%)] text-xs font-semibold text-white">
                    {friend.friendName?.charAt(0)?.toUpperCase() || "?"}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(228,6%,17%)] ${
                        isOnline
                          ? "bg-[hsl(139,47%,44%)]"
                          : "bg-[hsl(215,9%,40%)]"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {friend.friendName}
                    </p>
                    <p className="truncate text-[10px] text-[hsl(215,9%,45%)]">
                      {isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <UserPanel />
    </div>
  );
}

/** Groups list panel */
function GroupList() {
  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    setSelectedFriend,
    createGroup,
  } = useDashboard();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const ok = await createGroup(groupName, groupDesc);
      if (ok) {
        setGroupName("");
        setGroupDesc("");
        setDialogOpen(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-12 items-center justify-between border-b border-[hsl(228,6%,20%)] px-4">
        <h2 className="text-sm font-semibold text-white">Groups</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="flex h-6 w-6 items-center justify-center rounded text-[hsl(215,9%,55%)] transition hover:text-white"
              title="Create Group"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="border-[hsl(228,6%,24%)] bg-[hsl(228,6%,17%)] text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Create Group</DialogTitle>
              <DialogDescription className="text-[hsl(215,9%,55%)]">
                Create a new group channel for your team.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(215,9%,55%)]">
                  Group Name
                </label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="my-awesome-group"
                  className="w-full rounded-md border border-[hsl(228,6%,13%)] bg-[hsl(228,6%,13%)] py-2.5 px-3 text-sm text-white placeholder-[hsl(215,9%,45%)] outline-none focus:border-[hsl(235,86%,65%)]"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(215,9%,55%)]">
                  Description (optional)
                </label>
                <input
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="What's this group about?"
                  className="w-full rounded-md border border-[hsl(228,6%,13%)] bg-[hsl(228,6%,13%)] py-2.5 px-3 text-sm text-white placeholder-[hsl(215,9%,45%)] outline-none focus:border-[hsl(235,86%,65%)]"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-[hsl(235,86%,65%)] py-2.5 text-sm font-medium text-white transition hover:bg-[hsl(235,86%,55%)] disabled:opacity-50"
                disabled={creating || !groupName.trim()}
              >
                {creating ? "Creating..." : "Create Group"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[hsl(215,9%,50%)]">
          Channels — {groups.length}
        </p>

        {groups.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[hsl(215,9%,45%)]">
            No groups yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  setSelectedFriend(null);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  selectedGroup?.id === group.id
                    ? "bg-[hsl(228,6%,26%)] text-white"
                    : "text-[hsl(215,9%,65%)] hover:bg-[hsl(228,6%,22%)] hover:text-[hsl(215,9%,85%)]"
                }`}
              >
                <Hash className="h-5 w-5 shrink-0 text-[hsl(215,9%,50%)]" />
                <span className="truncate text-sm">{group.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <UserPanel />
    </div>
  );
}

/** Friends management panel */
function FriendsPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-12 items-center border-b border-[hsl(228,6%,20%)] px-4">
        <h2 className="text-sm font-semibold text-white">Friends</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <FriendsList />
      </div>
      <UserPanel />
    </div>
  );
}

/** User panel at the bottom */
function UserPanel() {
  const { onlineUsers, userId } = useDashboard();
  const isOnline = onlineUsers.has(userId) || true; // current user always online

  return (
    <div className="flex items-center gap-2 border-t border-[hsl(228,6%,20%)] bg-[hsl(228,6%,14%)] px-2 py-2">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(235,86%,65%)] text-xs font-bold text-white">
        U
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(228,6%,14%)] ${
            isOnline ? "bg-[hsl(139,47%,44%)]" : "bg-[hsl(215,9%,40%)]"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">You</p>
        <p className="truncate text-[10px] text-[hsl(139,47%,44%)]">Online</p>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const { activeTab, selectedFriend, selectedGroup } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);

  const hasSelection = !!selectedFriend || !!selectedGroup;

  return (
    <div className={`flex h-full shrink-0 ${hasSelection ? "hidden md:flex" : "flex w-full md:w-auto"}`}>
      {/* Icon rail — always visible (except on mobile when chat is open) */}
      <IconRail collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Channel panel — collapses on mobile */}
      <div
        className={`flex flex-col bg-[hsl(228,6%,17%)] transition-all duration-200 ${
          collapsed ? "hidden" : "w-full md:w-60"
        } max-md:flex-1 md:static`}
      >
        {activeTab === "dm" && <DMList />}
        {activeTab === "groups" && <GroupList />}
        {activeTab === "friends" && <FriendsPanel />}
      </div>
    </div>
  );
}
