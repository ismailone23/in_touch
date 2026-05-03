import { useState, useCallback, useRef } from "react";
import { Friend, FriendRequest, Group } from "@/contexts/DashboardContext";
import { getApiBaseUrl } from "@/lib/api";

export function useDashboardApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequests = useRef(0);

  const apiUrl = getApiBaseUrl();

  const beginRequest = useCallback(() => {
    pendingRequests.current += 1;
    setLoading(true);
  }, []);

  const endRequest = useCallback(() => {
    pendingRequests.current = Math.max(0, pendingRequests.current - 1);
    if (pendingRequests.current === 0) {
      setLoading(false);
    }
  }, []);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);

      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      return fetch(`${apiUrl}${path}`, {
        credentials: "include",
        ...init,
        headers,
      });
    },
    [apiUrl],
  );

  const fetchFriends = useCallback(async (): Promise<Friend[]> => {
    beginRequest();
    setError(null);
    try {
      const res = await request("/friends/list");

      if (!res.ok) throw new Error("Failed to fetch friends");
      return await res.json();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      console.error("Failed to fetch friends:", err);
      return [];
    } finally {
      endRequest();
    }
  }, [beginRequest, endRequest, request]);

  const fetchRequests = useCallback(async (): Promise<FriendRequest[]> => {
    beginRequest();
    setError(null);
    try {
      const res = await request("/friends/requests");

      if (!res.ok) throw new Error("Failed to fetch requests");
      return await res.json();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      console.error("Failed to fetch requests:", err);
      return [];
    } finally {
      endRequest();
    }
  }, [beginRequest, endRequest, request]);

  const fetchGroups = useCallback(async (): Promise<Group[]> => {
    beginRequest();
    setError(null);
    try {
      const res = await request("/groups/list");

      if (!res.ok) throw new Error("Failed to fetch groups");
      return await res.json();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      console.error("Failed to fetch groups:", err);
      return [];
    } finally {
      endRequest();
    }
  }, [beginRequest, endRequest, request]);

  const sendFriendRequest = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/friends/request", {
          method: "POST",
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errorMsg =
            body?.error || "Failed to send friend request";
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to send request:", err);
        return { success: false, error: message };
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const acceptRequest = useCallback(
    async (requesterId: string): Promise<boolean> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/friends/accept", {
          method: "POST",
          body: JSON.stringify({ friendId: requesterId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to accept request");
        }
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to accept request:", err);
        return false;
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const removeFriend = useCallback(
    async (friendId: string): Promise<boolean> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/friends/remove", {
          method: "POST",
          body: JSON.stringify({ friendId }),
        });

        if (!res.ok) throw new Error("Failed to remove friend");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to remove friend:", err);
        return false;
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const createGroup = useCallback(
    async (name: string, description?: string): Promise<boolean> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/groups/create", {
          method: "POST",
          body: JSON.stringify({ name, description: description || "" }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to create group");
        }
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to create group:", err);
        return false;
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const addMemberToGroup = useCallback(
    async (groupId: string, memberId: string): Promise<boolean> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/groups/add-member", {
          method: "POST",
          body: JSON.stringify({ groupId, memberId }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Failed to add member");
        }
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to add member to group:", err);
        return false;
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const fetchDirectMessages = useCallback(
    async (friendId: string) => {
      beginRequest();
      setError(null);
      try {
        const res = await request(`/messages/p2p/${friendId}?limit=50`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const json = await res.json();
        // Return msgs from 'data' property and reverse them for chronological order
        return json.data.reverse().map((msg: any) => ({
          type: "message",
          data: msg,
        }));
      } catch (err) {
        console.error("Failed to fetch DM messages:", err);
        return [];
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  const fetchGroupMessages = useCallback(
    async (groupId: string) => {
      beginRequest();
      setError(null);
      try {
        const res = await request(`/messages/group/${groupId}`);
        if (!res.ok) throw new Error("Failed to fetch group messages");
        const json = await res.json();
        // Assuming groups return straight array
        const msgs = Array.isArray(json) ? json : [];
        return msgs.map((msg: any) => ({
          type: "group_message",
          data: msg,
        }));
      } catch (err) {
        console.error("Failed to fetch group messages:", err);
        return [];
      } finally {
        endRequest();
      }
    },
    [beginRequest, endRequest, request],
  );

  return {
    loading,
    error,
    fetchFriends,
    fetchRequests,
    fetchGroups,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
    createGroup,
    addMemberToGroup,
    fetchDirectMessages,
    fetchGroupMessages,
  };
}
