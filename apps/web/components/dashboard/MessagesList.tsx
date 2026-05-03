"use client";

import { useDashboard } from "@/contexts/DashboardContext";

export default function MessagesList() {
  const {
    friends,
    groups,
    selectedFriend,
    selectedGroup,
    setSelectedFriend,
    setSelectedGroup,
  } = useDashboard();

  return (
    <div className="space-y-5">
      {/* Friends Section */}
      {friends.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Friends
          </h2>
          <div className="space-y-2">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => {
                  setSelectedFriend(friend);
                  setSelectedGroup(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedFriend?.id === friend.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 hover:bg-accent"
                }`}
              >
                <p className="font-medium text-sm">{friend.friendName}</p>
                <p className="text-xs opacity-75">{friend.friendEmail}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Groups Section */}
      {groups.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Groups
          </h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  setSelectedFriend(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedGroup?.id === group.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/60 hover:bg-accent"
                }`}
              >
                <p className="font-medium text-sm">{group.name}</p>
                <p className="text-xs opacity-75">{group.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && groups.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No conversations yet
        </p>
      )}
    </div>
  );
}
