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
    async (friendId: string): Promise<boolean> => {
      beginRequest();
      setError(null);
      try {
        const res = await request("/friends/request", {
          method: "POST",
          body: JSON.stringify({ friendId }),
        });

        if (!res.ok) throw new Error("Failed to send friend request");
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(message);
        console.error("Failed to send request:", err);
        return false;
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

        if (!res.ok) throw new Error("Failed to accept request");
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

  return {
    loading,
    error,
    fetchFriends,
    fetchRequests,
    fetchGroups,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
  };
}
