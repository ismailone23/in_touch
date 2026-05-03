"use client";

import { useRef, useEffect, useState } from "react";
import { Button, Input } from "@/components/ui";
import { Send } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export default function MessagesPanel() {
  const {
    messages,
    selectedFriend,
    selectedGroup,
    sendMessage,
    wsReady,
    userId,
  } = useDashboard();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    if (!wsReady) {
      alert("WebSocket not ready. Please wait...");
      return;
    }

    sendMessage(localContent);
    setLocalContent("");
  };

  if (!selectedFriend && !selectedGroup) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/80">
        <div className="max-w-sm rounded-2xl border bg-card/80 px-6 py-5 text-center shadow-sm backdrop-blur">
          <p className="text-sm font-medium text-foreground">
            Pick a conversation to begin
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a friend or group to start messaging
          </p>
        </div>
      </div>
    );
  }

  const conversationName = selectedFriend
    ? selectedFriend.friendName
    : selectedGroup?.name;

  return (
    <div className="flex-1 flex flex-col bg-background/70">
      {/* Header */}
      <div className="border-b bg-card/60 p-4 backdrop-blur">
        <h2 className="text-lg font-semibold tracking-tight">
          {conversationName}
        </h2>
        <p className="text-sm text-muted-foreground">
          {selectedFriend
            ? selectedFriend.friendEmail
            : selectedGroup?.description || "Group conversation"}
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="rounded-2xl border bg-card/80 px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Send the first message to start the thread
              </p>
            </div>
          </div>
        ) : (
          visibleMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.data?.senderId === userId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 ${
                  message.data?.senderId === userId
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">
                  {message.data?.content}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  {message.data?.createdAt
                    ? new Date(message.data.createdAt).toLocaleTimeString()
                    : ""}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-card/70 p-4 backdrop-blur">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message..."
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!wsReady}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!wsReady || !localContent.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {!wsReady && (
          <p className="text-xs text-muted-foreground mt-2">
            Connecting to chat...
          </p>
        )}
      </div>
    </div>
  );
}
