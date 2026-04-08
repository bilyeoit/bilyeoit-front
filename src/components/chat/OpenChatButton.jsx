"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createChatRoom, getChatRooms } from "@/services/chat";

export default function OpenChatButton({
  itemId,
  targetUserId,
  className = "",
  children = "채팅하기",
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleOpenChat = async () => {
    if (!itemId) {
      alert("상품 정보가 올바르지 않아요.");
      return;
    }

    try {
      setLoading(true);

      const rooms = await getChatRooms();
      const matched = Array.isArray(rooms)
        ? rooms.find((room) => {
            const roomItemId = room?.itemId;
            const roomTargetUserId =
              room?.renterUserId || room?.targetUserId || null;

            if (targetUserId) {
              return roomItemId === itemId && roomTargetUserId === targetUserId;
            }

            return roomItemId === itemId;
          })
        : null;

      const room = matched || (await createChatRoom(itemId, targetUserId));
      const roomId = room?.roomId || room?.id;

      if (!roomId) {
        throw new Error("채팅방 정보를 확인할 수 없어요.");
      }

      router.push(
        `/chat?roomId=${roomId}&itemId=${itemId}${
          targetUserId ? `&targetUserId=${targetUserId}` : ""
        }`
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "채팅방을 열지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleOpenChat} disabled={loading}>
      {loading ? "이동 중..." : children}
    </button>
  );
}