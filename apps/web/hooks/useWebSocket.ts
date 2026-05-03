import { useEffect, useRef, useCallback, useState } from "react";
import { getWebSocketUrl } from "@/lib/api";

interface UseWebSocketOptions<TMessage> {
  onMessage: (data: TMessage) => void;
  onError?: (error: Event) => void;
  authToken?: string | null;
}

export function useWebSocket<TMessage = unknown, TOutgoing = unknown>({
  onMessage,
  onError,
  authToken,
}: UseWebSocketOptions<TMessage>) {
  const ws = useRef<WebSocket | null>(null);
  const authTokenRef = useRef<string | null | undefined>(authToken);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const connectRef = useRef<(tokenOverride?: string) => void>(() => {});
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(1000);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);
  const [isReady, setIsReady] = useState(false);

  // Keep refs in sync without triggering re-renders / dep changes
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const attemptReconnect = useCallback(() => {
    if (!shouldReconnect.current) {
      return;
    }

    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current += 1;
      console.log(
        `Reconnecting... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`,
      );

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      reconnectTimeout.current = setTimeout(() => {
        connectRef.current();
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      }, reconnectDelay.current);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }, []);

  const connect = useCallback(
    (tokenOverride?: string) => {
      try {
        shouldReconnect.current = true;

        if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
          ws.current.close();
        }

        const wsUrl = new URL(getWebSocketUrl("/messages/ws"));

        const token = tokenOverride ?? authTokenRef.current;
        console.log("WS connecting to:", wsUrl.toString());
        console.log("Token present:", !!token, "length:", token?.length);

        if (token) {
          wsUrl.searchParams.set("token", token);
        }

        ws.current = new WebSocket(wsUrl.toString());

        ws.current.onopen = () => {
          console.log("WebSocket connected");
          reconnectAttempts.current = 0;
          reconnectDelay.current = 1000;
          setIsReady(true);

          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
          }
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(String(event.data)) as TMessage;
            onMessageRef.current(data);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          onErrorRef.current?.(error);
        };

        ws.current.onclose = () => {
          console.log("WebSocket closed");
          setIsReady(false);
          attemptReconnect();
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    },
    [attemptReconnect],
  );

  connectRef.current = connect;

  const send = useCallback((data: TOutgoing) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not ready, message not sent");
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsReady(false);
  }, []);

  return { connect, send, disconnect, isReady, ws };
}
