import { apiRequest } from "./api";

export async function createChatRoom(itemId, targetUserId) {
  return apiRequest("/bilyeoit/v1/chat/rooms", {
    method: "POST",
    body: JSON.stringify(
      targetUserId ? { itemId, targetUserId } : { itemId }
    ),
  });
}

export async function getChatRooms() {
  return apiRequest("/bilyeoit/v1/chat/rooms");
}

export async function getChatMessages(roomId, before, size = 30) {
  const params = new URLSearchParams();

  if (before) params.append("before", before);
  if (size) params.append("size", String(size));

  const query = params.toString();

  return apiRequest(
    `/bilyeoit/v1/chat/rooms/${roomId}/messages${query ? `?${query}` : ""}`
  );
}

export async function sendChatMessage(payload) {
  return apiRequest("/bilyeoit/v1/chat/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function markChatAsRead(roomId) {
  return apiRequest(`/bilyeoit/v1/chat/rooms/${roomId}/read`, {
    method: "PATCH",
  });
}

export async function editChatMessage(messageId, message) {
  return apiRequest(`/bilyeoit/v1/chat/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ message }),
  });
}

export async function deleteChatMessage(messageId) {
  return apiRequest(`/bilyeoit/v1/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}