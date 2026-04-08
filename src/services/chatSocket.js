"use client";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function getAccessToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

function safeParse(body) {
  if (!body) return null;

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function createChatSocket({
  roomId,
  onMessage,
  onRead,
  onEdit,
  onDelete,
  onFraudAlert,
  onConnect,
  onError,
}) {
  const socketUrl = `${API_BASE_URL}/ws-chat`;
  const token = getAccessToken();

  const client = new Client({
    webSocketFactory: () => new SockJS(socketUrl),
    reconnectDelay: 5000,
    debug: () => {},
    connectHeaders: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},

    onConnect: () => {
      if (roomId) {
        client.subscribe(`/topic/chat/rooms/${roomId}`, (frame) => {
          try {
            const payload = safeParse(frame.body);
            onMessage?.(payload);
          } catch (e) {
            console.error("메시지 파싱 실패", e);
          }
        });

        client.subscribe(`/topic/chat/rooms/${roomId}/read`, (frame) => {
          try {
            const payload = safeParse(frame.body);
            onRead?.(payload);
          } catch (e) {
            console.error("읽음 알림 파싱 실패", e);
          }
        });

        client.subscribe(`/topic/chat/rooms/${roomId}/edit`, (frame) => {
          try {
            const payload = safeParse(frame.body);
            onEdit?.(payload);
          } catch (e) {
            console.error("수정 알림 파싱 실패", e);
          }
        });

        client.subscribe(`/topic/chat/rooms/${roomId}/delete`, (frame) => {
          try {
            const payload = safeParse(frame.body);
            onDelete?.(payload);
          } catch (e) {
            console.error("삭제 알림 파싱 실패", e);
          }
        });

        client.subscribe(`/topic/chat/rooms/${roomId}/fraud-alert`, (frame) => {
          try {
            const payload = safeParse(frame.body);
            onFraudAlert?.(payload);
          } catch (e) {
            console.error("사기 알림 파싱 실패", e);
          }
        });
      }

      onConnect?.(client);
    },

    onStompError: (frame) => {
      console.error("STOMP 오류", {
        headers: frame?.headers,
        body: frame?.body,
        command: frame?.command,
      });
      onError?.(frame);
    },

    onWebSocketError: (event) => {
      console.error("WebSocket 오류", event);
      onError?.(event);
    },
  });

  client.activate();
  return client;
}

export function sendChatMessageViaSocket(client, payload) {
  if (!client || !client.connected) {
    throw new Error("WebSocket이 연결되지 않았어요.");
  }

  client.publish({
    destination: "/chat/send",
    body: JSON.stringify(payload),
  });
}