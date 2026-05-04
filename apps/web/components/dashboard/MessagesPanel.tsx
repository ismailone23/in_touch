"use client";

import { useRef, useEffect, useState } from "react";
import { Plus, Smile, SendHorizontal, Hash, ArrowLeft, UserPlus, Phone, PhoneOff, PhoneCall } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui";

const EMOJI_LIST = [
  "😀", "😂", "😍", "🥺", "😎", "🤔", "👍", "👎",
  "❤️", "🔥", "🎉", "💯", "😢", "😡", "🥳", "😴",
  "👋", "🙏", "💪", "🤝", "✨", "⚡", "🌟", "💀",
  "🫡", "🤡", "😈", "👀", "💬", "✅", "❌", "⭐",
];

export default function MessagesPanel() {
  const {
    messages,
    selectedFriend,
    selectedGroup,
    sendMessage,
    wsReady,
    userId,
    onlineUsers,
    setSelectedFriend,
    setSelectedGroup,
    friends,
    addMemberToGroup,
    callState,
    startCall,
    acceptCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
  } = useDashboard();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localContent, setLocalContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedFriendToAdd, setSelectedFriendToAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-emoji-picker]")) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const visibleMessages = messages.filter((message) => {
    if (selectedFriend) {
      return (
        message.type === "message" &&
        ((message.data?.senderId === userId &&
          message.data?.receiverId === selectedFriend.friendId) ||
          (message.data?.senderId === selectedFriend.friendId &&
            message.data?.receiverId === userId))
      );
    }

    if (selectedGroup) {
      return (
        message.type === "group_message" &&
        message.data?.groupId === selectedGroup.id
      );
    }

    return false;
  });

  const handleSend = () => {
    if (!localContent.trim()) return;
    if (!wsReady) return;

    sendMessage(localContent);
    setLocalContent("");
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setLocalContent((prev) => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !selectedFriendToAdd) return;
    setAddingMember(true);
    try {
      const ok = await addMemberToGroup(selectedGroup.id, selectedFriendToAdd);
      if (ok) {
        setAddMemberOpen(false);
        setSelectedFriendToAdd("");
      }
    } finally {
      setAddingMember(false);
    }
  };

  // Empty state
  if (!selectedFriend && !selectedGroup) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[hsl(228,6%,20%)]">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(228,6%,25%)]">
            <SendHorizontal className="h-8 w-8 text-[hsl(215,9%,50%)]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Select a conversation
            </h2>
            <p className="mt-1 text-sm text-[hsl(215,9%,50%)]">
              Choose a friend or group from the sidebar to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  const conversationName = selectedFriend
    ? selectedFriend.friendName
    : selectedGroup?.name;

  const isGroup = !!selectedGroup;
  const friendOnline = selectedFriend
    ? onlineUsers.has(selectedFriend.friendId)
    : false;

  return (
    <div className="flex flex-1 flex-col bg-[hsl(228,6%,20%)] min-w-0">
      {/* Chat Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[hsl(228,6%,17%)] px-3 shadow-sm md:px-4">
        {/* Back button on mobile */}
        <button
          onClick={() => {
            setSelectedFriend(null);
            setSelectedGroup(null);
          }}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded text-[hsl(215,9%,55%)] transition hover:text-white md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {isGroup ? (
          <Hash className="h-5 w-5 shrink-0 text-[hsl(215,9%,50%)]" />
        ) : (
          <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(235,86%,65%)] text-[10px] font-bold text-white">
            {conversationName?.charAt(0)?.toUpperCase() || "?"}
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-[hsl(228,6%,20%)] ${
                friendOnline
                  ? "bg-[hsl(139,47%,44%)]"
                  : "bg-[hsl(215,9%,40%)]"
              }`}
            />
          </div>
        )}
        <h2 className="text-sm font-semibold text-white truncate">
          {conversationName}
        </h2>
        {selectedFriend && (
          <span className="hidden text-xs text-[hsl(215,9%,50%)] sm:inline">
            {friendOnline ? "Online" : "Offline"}
          </span>
        )}
        
        {/* Spacer to push group actions to the right */}
        <div className="flex-1" />

        {/* Group Actions */}
        {isGroup && (
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded text-[hsl(215,9%,55%)] transition hover:text-white"
                title="Add Member"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="border-[hsl(228,6%,24%)] bg-[hsl(228,6%,17%)] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Add Member to #{conversationName}</DialogTitle>
                <DialogDescription className="text-[hsl(215,9%,55%)]">
                  Select a friend to add them to this group channel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[hsl(215,9%,55%)]">
                    Select Friend
                  </label>
                  <select
                    value={selectedFriendToAdd}
                    onChange={(e) => setSelectedFriendToAdd(e.target.value)}
                    className="w-full rounded-md border border-[hsl(228,6%,13%)] bg-[hsl(228,6%,13%)] px-3 py-2.5 text-sm text-white outline-none focus:border-[hsl(235,86%,65%)]"
                  >
                    <option value="" disabled>Choose a friend...</option>
                    {friends.map((f) => (
                      <option key={f.id} value={f.friendId}>
                        {f.friendName} ({f.friendEmail})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedFriendToAdd || addingMember}
                  className="w-full rounded-md bg-[hsl(235,86%,65%)] py-2.5 text-sm font-medium text-white transition hover:bg-[hsl(235,86%,55%)] disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* P2P Call Button (DMs only) */}
        {!isGroup && selectedFriend && (
          <button
            onClick={() => startCall(selectedFriend.friendId, selectedFriend.friendName)}
            disabled={!friendOnline || callState.status !== "idle"}
            className="flex h-8 w-8 items-center justify-center rounded text-[hsl(215,9%,55%)] transition hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            title={friendOnline ? "Start Voice/Video Call" : "User is offline"}
          >
            <Phone className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Incoming Call Overlay */}
      {callState.status === "incoming" && (
        <div className="absolute top-16 right-4 z-50 w-72 rounded-lg border border-[hsl(228,6%,30%)] bg-[hsl(228,6%,15%)] p-4 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(235,86%,65%)]">
              <PhoneCall className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Incoming Call...</h3>
              <p className="text-xs text-[hsl(215,9%,65%)]">{callState.peerName} is calling you.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={endCall}
              className="flex-1 rounded bg-[hsl(0,60%,50%)] py-2 text-sm font-medium text-white transition hover:bg-[hsl(0,60%,60%)]"
            >
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 rounded bg-[hsl(139,47%,44%)] py-2 text-sm font-medium text-white transition hover:bg-[hsl(139,47%,54%)]"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Active Call UI */}
      {(callState.status === "calling" || callState.status === "connected") && (
        <div className="absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              
              {/* Local Video Picture-in-Picture */}
              <div className="absolute bottom-4 right-4 h-32 w-48 overflow-hidden rounded-lg border-2 border-[hsl(228,6%,30%)] bg-black shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>

              {callState.status === "calling" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                  <Phone className="mb-4 h-12 w-12 animate-pulse text-white" />
                  <h2 className="text-2xl font-bold text-white">Calling {callState.peerName}...</h2>
                </div>
              )}
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex shrink-0 items-center justify-center gap-4 bg-[hsl(228,6%,10%)] p-6">
            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(0,60%,50%)] transition hover:bg-[hsl(0,60%,60%)] hover:scale-105"
              title="Hang Up"
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-4">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(235,86%,65%)]">
              {isGroup ? (
                <Hash className="h-8 w-8 text-white" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {conversationName?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-xl font-bold text-white">
              {conversationName}
            </h3>
            <p className="max-w-sm text-center text-sm text-[hsl(215,9%,50%)]">
              {isGroup
                ? `This is the start of the #${conversationName} group.`
                : `This is the beginning of your direct message history with ${conversationName}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {visibleMessages.map((message, index) => {
              const isMine = message.data?.senderId === userId;
              const showAvatar =
                index === 0 ||
                visibleMessages[index - 1]?.data?.senderId !==
                  message.data?.senderId;

              return (
                <div
                  key={index}
                  className={`group flex gap-4 rounded px-2 py-0.5 transition-colors hover:bg-[hsl(228,6%,22%)] ${
                    showAvatar ? "mt-4 pt-0.5" : ""
                  }`}
                >
                  {/* Avatar column */}
                  <div className="w-10 shrink-0">
                    {showAvatar && (
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
                          isMine
                            ? "bg-[hsl(235,86%,65%)]"
                            : "bg-[hsl(38,96%,54%)]"
                        }`}
                      >
                        {isMine
                          ? "U"
                          : conversationName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="min-w-0 flex-1">
                    {showAvatar && (
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            isMine
                              ? "text-[hsl(235,86%,75%)]"
                              : "text-[hsl(38,96%,65%)]"
                          }`}
                        >
                          {isMine ? "You" : conversationName}
                        </span>
                        <span className="text-[10px] text-[hsl(215,9%,45%)]">
                          {message.data?.createdAt
                            ? new Date(
                                message.data.createdAt,
                              ).toLocaleString(undefined, {
                                month: "numeric",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-[hsl(210,9%,87%)] break-words">
                      {message.data?.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0 px-3 pb-4 pt-1 md:px-4 md:pb-6">
        <div className="relative flex items-center gap-0 rounded-lg bg-[hsl(228,6%,25%)]">
          <button className="flex h-11 w-11 shrink-0 items-center justify-center text-[hsl(215,9%,55%)] transition hover:text-[hsl(215,9%,80%)]">
            <Plus className="h-5 w-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder={`Message ${isGroup ? "#" : ""}${conversationName}`}
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!wsReady}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[hsl(210,17%,98%)] placeholder-[hsl(215,9%,50%)] outline-none"
          />
          <div className="flex shrink-0 items-center gap-0.5 pr-1">
            {/* Emoji picker */}
            <div className="relative" data-emoji-picker>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmoji(!showEmoji);
                }}
                className="flex h-9 w-9 items-center justify-center rounded text-[hsl(215,9%,55%)] transition hover:text-[hsl(215,9%,80%)]"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-[hsl(228,6%,24%)] bg-[hsl(228,6%,15%)] p-3 shadow-xl">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[hsl(215,9%,50%)]">
                    Emoji
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded text-lg transition hover:bg-[hsl(228,6%,25%)]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!wsReady || !localContent.trim()}
              className={`flex h-9 w-9 items-center justify-center rounded transition ${
                localContent.trim() && wsReady
                  ? "text-[hsl(235,86%,65%)] hover:text-[hsl(235,86%,75%)]"
                  : "text-[hsl(215,9%,35%)]"
              }`}
              title="Send Message"
            >
              <SendHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
        {!wsReady && (
          <p className="mt-1.5 text-xs text-[hsl(40,100%,60%)]">
            ⚡ Connecting to chat...
          </p>
        )}
      </div>
    </div>
  );
}
