import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Friend,
  FriendRequest,
  Group,
  Message,
  TabType,
  DashboardContextType,
} from "@/contexts/DashboardContext";
import { useWebSocket } from "./useWebSocket";
import { useDashboardApi } from "./useDashboardApi";

export function useDashboardState(): DashboardContextType {
  const router = useRouter();

  // Auth state
  const [userId, setUserId] = useState("");
  const [authToken, setAuthToken] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("messages");

  // Data state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // WebSocket state
  const [wsReady, setWsReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // API hooks
  const {
    loading: apiLoading,
    fetchFriends: apiFetchFriends,
    fetchRequests: apiFetchRequests,
    fetchGroups: apiFetchGroups,
    sendFriendRequest: apiSendFriendRequest,
    acceptRequest: apiAcceptRequest,
    removeFriend: apiRemoveFriend,
  } = useDashboardApi();

  // WebSocket hook
  const {
    connect: connectWs,
    send: wsSend,
    disconnect: disconnectWs,
    isReady,
  } = useWebSocket<Message>({
    authToken,
    onMessage: (data) => {
      if (data.type !== "message" && data.type !== "group_message") {
        return;
      }

      setMessages((prev) => [...prev, data]);
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  const refreshData = useCallback(async () => {
    const [friendsData, requestsData, groupsData] = await Promise.all([
      apiFetchFriends(),
      apiFetchRequests(),
      apiFetchGroups(),
    ]);

    setFriends(friendsData);
    setRequests(requestsData);
    setGroups(groupsData);
  }, [apiFetchFriends, apiFetchRequests, apiFetchGroups]);

  // Initialize on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push("/login");
          }
          return;
        }

        const data = await res.json();

        if (cancelled) {
          return;
        }

        const currentUserId = data?.user?.userId;
        const token = data?.token;

        if (!currentUserId) {
          router.push("/login");
          return;
        }

        setUserId(currentUserId);
        if (typeof token === "string" && token) {
          setAuthToken(token);
        }
        await refreshData();
        connectWs(typeof token === "string" ? token : undefined);
      } catch (err) {
        console.error("Init failed:", err);
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      disconnectWs();
    };
  }, [connectWs, disconnectWs, refreshData, router]);
  // Update wsReady state when isReady changes
  useEffect(() => {
    setWsReady(isReady);
  }, [isReady]);

  // Send message
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      if (selectedFriend && isReady) {
        wsSend({
          type: "message",
          to: selectedFriend.friendId,
          content,
        });
      } else if (selectedGroup && isReady) {
        wsSend({
          type: "group_message",
          groupId: selectedGroup.id,
          content,
        });
      }
    },
    [selectedFriend, selectedGroup, isReady, wsSend],
  );

  // Wrapped API calls
  const fetchFriends = useCallback(async () => {
    const data = await apiFetchFriends();
    setFriends(data);
  }, [apiFetchFriends]);

  const fetchRequests = useCallback(async () => {
    const data = await apiFetchRequests();
    setRequests(data);
  }, [apiFetchRequests]);

  const fetchGroups = useCallback(async () => {
    const data = await apiFetchGroups();
    setGroups(data);
  }, [apiFetchGroups]);

  const sendFriendRequest = useCallback(
    async (email: string) => {
      await apiSendFriendRequest(email);
      await fetchFriends();
    },
    [apiSendFriendRequest, fetchFriends],
  );

  const acceptRequest = useCallback(
    async (requesterId: string) => {
      await apiAcceptRequest(requesterId);
      await fetchFriends();
      await fetchRequests();
    },
    [apiAcceptRequest, fetchFriends, fetchRequests],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      await apiRemoveFriend(friendId);
      await fetchFriends();
    },
    [apiRemoveFriend, fetchFriends],
  );

  const handleLogout = useCallback(() => {
    fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(console.error);

    disconnectWs();
    router.push("/login");
  }, [disconnectWs, router]);

  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    userId,

    // UI State
    activeTab,
    setActiveTab,

    // Data
    friends,
    requests,
    groups,
    messages,
    selectedFriend,
    selectedGroup,

    // Setters
    setSelectedFriend,
    setSelectedGroup,
    addMessage,

    // Loading state
    loading: apiLoading || bootstrapping,

    // WebSocket
    wsReady,
    sendMessage,

    // API Actions
    fetchFriends,
    fetchRequests,
    fetchGroups,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
    handleLogout,
  };
}
