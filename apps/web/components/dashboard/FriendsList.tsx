"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@/components/ui";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";

export default function FriendsList() {
  const {
    friends,
    requests,
    loading,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
    fetchFriends,
    fetchRequests,
  } = useDashboard();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddFriend = async () => {
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await sendFriendRequest(email);
      setEmail("");
      await fetchFriends();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (requesterId: string) => {
    setSubmitting(true);
    try {
      await acceptRequest(requesterId);
      await fetchFriends();
      await fetchRequests();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (friendId: string) => {
    if (confirm("Are you sure you want to remove this friend?")) {
      setSubmitting(true);
      try {
        await removeFriend(friendId);
        await fetchFriends();
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Friend Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Friend Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="friend-email">Friend Email</Label>
              <Input
                id="friend-email"
                placeholder="Enter friend's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddFriend}
              disabled={submitting || !email.trim()}
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-sm">Friend Requests</h3>
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{request.requesterName}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.requesterEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAccept(request.id)}
                    disabled={submitting}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={submitting}>
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-sm">Your Friends</h3>
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{friend.friendName}</p>
                  <p className="text-xs text-muted-foreground">
                    {friend.friendEmail}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(friend.friendId)}
                  disabled={submitting}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && requests.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No friends yet. Start by adding one!
        </p>
      )}
    </div>
  );
}
