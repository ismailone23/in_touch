import { useState, useEffect, useCallback, useRef } from "react";
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
import { useWebRTC } from "./useWebRTC";

export function useDashboardState(): DashboardContextType {
  const router = useRouter();

  // Auth state
  const [userId, setUserId] = useState("");
  const userIdRef = useRef("");
  const [authToken, setAuthToken] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("dm");

  // Data state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Toast / notification state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

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
    createGroup: apiCreateGroup,
    addMemberToGroup: apiAddMemberToGroup,
    fetchDirectMessages,
    fetchGroupMessages,
  } = useDashboardApi();

  // Show toast helper
  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      if (!message) {
        setToast(null);
        return;
      }
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const handleMessageRef = useRef<(data: Message) => void>(() => {});

  const handleWsError = useCallback((error: Event) => {
    console.error("WebSocket error:", error);
  }, []);

  const {
    connect: connectWs,
    send: wsSend,
    disconnect: disconnectWs,
    isReady,
  } = useWebSocket<Message>({
    authToken,
    onMessage: (data) => handleMessageRef.current(data),
    onError: handleWsError,
  });

  const {
    callState,
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    endCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  } = useWebRTC({
    userId: userIdRef.current,
    wsSend,
  });

  // WebSocket hook — handle all WS message types
  const handleMessage = useCallback(
    (data: Message) => {
      // Chat messages
      if (data.type === "message" || data.type === "group_message") {
        setMessages((prev) => [...prev, data]);
        if (data.data?.senderId && data.data.senderId !== userIdRef.current) {
          const preview = data.data.content?.slice(0, 50) || "New message";
          showToast(
            data.type === "group_message"
              ? `Group message: ${preview}`
              : `New message: ${preview}`,
            "success",
          );
        }
        return;
      }

      // WebRTC Signaling
      if (data.type === "call_offer" && data.data) {
        const fromId = (data.data as any).from;
        const offer = (data.data as any).offer;
        handleOffer(fromId, offer);
        return;
      }
      if (data.type === "call_answer" && data.data) {
        handleAnswer((data.data as any).answer);
        return;
      }
      if (data.type === "ice_candidate" && data.data) {
        handleIceCandidate((data.data as any).candidate);
        return;
      }

      // Presence list (initial)
      if (data.type === "presence_list" && (data as any).data?.onlineUsers) {
        const users = (data as any).data.onlineUsers as string[];
        setOnlineUsers(new Set(users));
        return;
      }

      // Presence update (single user)
      if (data.type === "presence_update" && (data as any).data) {
        const { userId: uid, status } = (data as any).data as {
          userId: string;
          status: "online" | "offline";
        };
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (status === "online") {
            next.add(uid);
          } else {
            next.delete(uid);
          }
          return next;
        });
        return;
      }

      // Real-time friend request received
      if (data.type === "friend_request" && data.data) {
        const reqData = data.data as unknown as FriendRequest;
        setRequests((prev) => {
          if (prev.some((r) => r.id === reqData.id)) return prev;
          return [...prev, reqData];
        });
        showToast(
          `New friend request from ${reqData.requesterName}`,
          "success",
        );
        return;
      }

      // Friend request accepted
      if (data.type === "friend_accepted" && data.data) {
        const acceptedData = data.data as unknown as Friend;
        setFriends((prev) => {
          if (prev.some((f) => f.id === acceptedData.id)) return prev;
          return [...prev, acceptedData];
        });
        showToast(
          `${acceptedData.friendName} accepted your friend request!`,
          "success",
        );
        return;
      }

      // Friend removed
      if (data.type === "friend_removed" && data.data) {
        const removedData = data.data as unknown as { userId: string };
        setFriends((prev) =>
          prev.filter((f) => f.friendId !== removedData.userId),
        );
        return;
      }
    },
    [showToast, handleOffer, handleAnswer, handleIceCandidate],
  );

  // Keep the ref updated with the latest handleMessage that has fresh dependencies
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  const refreshData = useCallback(async () => {
    const [friendsData, requestsData, groupsData] = await Promise.all([
      apiFetchFriends(),
      apiFetchRequests(),
      apiFetchGroups(),
    ]);

    setFriends(friendsData);
    setRequests(requestsData);
    setGroups(groupsData);

    // Check URL params for initial selection
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const dmId = params.get("dm");
      const groupId = params.get("group");

      if (dmId) {
        const friend = friendsData.find((f) => f.friendId === dmId);
        if (friend) {
          setSelectedFriend(friend);
          setActiveTab("dm");
        }
      } else if (groupId) {
        const group = groupsData.find((g) => g.id === groupId);
        if (group) {
          setSelectedGroup(group);
          setActiveTab("groups");
        }
      }
    }
  }, [apiFetchFriends, apiFetchRequests, apiFetchGroups]);

  // Initialize on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push("/login");
          }
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        const currentUserId = data?.user?.userId;
        const token = data?.token;

        if (!currentUserId) {
          router.push("/login");
          return;
        }

        setUserId(currentUserId);
        userIdRef.current = currentUserId;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    setWsReady(isReady);
  }, [isReady]);

  // Sync URL and fetch messages when conversation changes
  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      setMessages([]); // Clear previous messages immediately
      
      if (selectedFriend) {
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", `/dashboard?dm=${selectedFriend.friendId}`);
        }
        const msgs = await fetchDirectMessages(selectedFriend.friendId);
        if (!cancelled) {
          setMessages(msgs);
        }
      } else if (selectedGroup) {
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", `/dashboard?group=${selectedGroup.id}`);
        }
        const msgs = await fetchGroupMessages(selectedGroup.id);
        if (!cancelled) {
          setMessages(msgs);
        }
      } else if (!bootstrapping) {
        // Only clear the URL if we are fully loaded and actively cleared the selection
        if (typeof window !== "undefined" && window.location.search) {
          window.history.pushState({}, "", `/dashboard`);
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriend, selectedGroup, bootstrapping]);

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
      const result = await apiSendFriendRequest(email);
      if (result.success) {
        showToast("Friend request sent!", "success");
      } else {
        showToast(result.error || "Failed to send request", "error");
      }
      return result;
    },
    [apiSendFriendRequest, showToast],
  );

  const acceptRequest = useCallback(
    async (requesterId: string) => {
      const ok = await apiAcceptRequest(requesterId);
      if (ok) {
        setRequests((prev) => prev.filter((r) => r.userId !== requesterId));
        await fetchFriends();
        showToast("Friend request accepted!", "success");
      } else {
        showToast("Failed to accept request", "error");
      }
    },
    [apiAcceptRequest, fetchFriends, showToast],
  );

  const removeFriend = useCallback(
    async (friendId: string) => {
      const ok = await apiRemoveFriend(friendId);
      if (ok) {
        setFriends((prev) => prev.filter((f) => f.friendId !== friendId));
        showToast("Friend removed", "success");
      } else {
        showToast("Failed to remove friend", "error");
      }
    },
    [apiRemoveFriend, showToast],
  );

  const createGroup = useCallback(
    async (name: string, description?: string) => {
      const ok = await apiCreateGroup(name, description);
      if (ok) {
        await fetchGroups();
        showToast("Group created!", "success");
      } else {
        showToast("Failed to create group", "error");
      }
      return ok;
    },
    [apiCreateGroup, fetchGroups, showToast],
  );

  const addMemberToGroup = useCallback(
    async (groupId: string, memberId: string) => {
      const ok = await apiAddMemberToGroup(groupId, memberId);
      if (ok) {
        showToast("Member added to group!", "success");
      } else {
        showToast("Failed to add member", "error");
      }
      return ok;
    },
    [apiAddMemberToGroup, showToast],
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
    onlineUsers,

    // Setters
    setSelectedFriend,
    setSelectedGroup,
    addMessage,

    // Loading state
    loading: apiLoading || bootstrapping,

    // WebSocket
    wsReady,
    sendMessage,

    // Toast
    toast,
    showToast,

    // API Actions
    fetchFriends,
    fetchRequests,
    fetchGroups,
    sendFriendRequest,
    acceptRequest,
    removeFriend,
    createGroup,
    addMemberToGroup,
    handleLogout,

    // WebRTC
    callState,
    startCall,
    acceptCall,
    endCall,
    localVideoRef,
    remoteVideoRef,
  };
}
