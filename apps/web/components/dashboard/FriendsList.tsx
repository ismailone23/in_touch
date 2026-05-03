"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui";
import { UserPlus, Check, X, Trash2, Mail, Loader2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export default function FriendsList() {
  const {
    friends,
    requests,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
  } = useDashboard();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAddFriend = async () => {
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const result = await sendFriendRequest(email);
      if (result.success) {
        setEmail("");
        setDialogOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (requesterId: string) => {
    setAcceptingId(requesterId);
    try {
      await acceptRequest(requesterId);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (requesterId: string) => {
    setRemovingId(requesterId);
    try {
      await removeFriend(requesterId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = async (friendId: string) => {
    if (!confirm("Remove this friend?")) return;
    setRemovingId(friendId);
    try {
      await removeFriend(friendId);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Friend */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md bg-[hsl(139,47%,44%)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[hsl(139,47%,38%)]">
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </DialogTrigger>
        <DialogContent className="border-[hsl(228,6%,24%)] bg-[hsl(228,6%,17%)] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5" />
              Add Friend
            </DialogTitle>
            <DialogDescription className="text-[hsl(215,9%,55%)]">
              You can add friends with their email address.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddFriend();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label
                htmlFor="friend-email"
                className="text-xs font-semibold uppercase tracking-wide text-[hsl(215,9%,55%)]"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,9%,45%)]" />
                <input
                  id="friend-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-[hsl(228,6%,13%)] bg-[hsl(228,6%,13%)] py-2.5 pl-10 pr-3 text-sm text-white placeholder-[hsl(215,9%,45%)] outline-none focus:border-[hsl(235,86%,65%)]"
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[hsl(235,86%,65%)] py-2.5 text-sm font-medium text-white transition hover:bg-[hsl(235,86%,55%)] disabled:opacity-50"
              disabled={submitting || !email.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Friend Request"
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(215,9%,50%)]">
            Pending — {requests.length}
          </p>
          <div className="space-y-0.5">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[hsl(228,6%,22%)]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(38,96%,54%)] text-xs font-bold text-white">
                  {request.requesterName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {request.requesterName}
                  </p>
                  <p className="truncate text-[11px] text-[hsl(215,9%,50%)]">
                    Incoming Friend Request
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleAccept(request.userId)}
                    disabled={acceptingId === request.userId}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(228,6%,30%)] bg-[hsl(228,6%,20%)] text-[hsl(215,9%,55%)] transition hover:border-[hsl(139,47%,44%)] hover:text-[hsl(139,47%,44%)]"
                    title="Accept"
                  >
                    {acceptingId === request.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(request.userId)}
                    disabled={removingId === request.userId}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(228,6%,30%)] bg-[hsl(228,6%,20%)] text-[hsl(215,9%,55%)] transition hover:border-red-500 hover:text-red-500"
                    title="Reject"
                  >
                    {removingId === request.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[hsl(215,9%,50%)]">
            All Friends — {friends.length}
          </p>
          <div className="space-y-0.5">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="group flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[hsl(228,6%,22%)]"
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(235,86%,65%)] text-xs font-bold text-white">
                  {friend.friendName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {friend.friendName}
                  </p>
                  <p className="truncate text-[11px] text-[hsl(215,9%,50%)]">
                    {friend.friendEmail}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(friend.friendId)}
                  disabled={removingId === friend.friendId}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(228,6%,30%)] bg-[hsl(228,6%,20%)] text-[hsl(215,9%,55%)] opacity-0 transition group-hover:opacity-100 hover:border-red-500 hover:text-red-500"
                  title="Remove friend"
                >
                  {removingId === friend.friendId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && requests.length === 0 && (
        <div className="py-6 text-center">
          <UserPlus className="mx-auto mb-2 h-8 w-8 text-[hsl(215,9%,35%)]" />
          <p className="text-sm text-[hsl(215,9%,50%)]">No friends yet</p>
          <p className="mt-0.5 text-xs text-[hsl(215,9%,40%)]">
            Add friends by their email
          </p>
        </div>
      )}
    </div>
  );
}
