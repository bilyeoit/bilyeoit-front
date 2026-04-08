"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getChatRooms,
  getChatMessages,
  sendChatMessage,
  markChatAsRead,
  createChatRoom,
} from "@/services/chat";
import { getPaymentSummary } from "@/services/payment";
import {
  createChatSocket,
  sendChatMessageViaSocket,
} from "@/services/chatSocket";
import PaymentSummaryCard from "@/components/chat/PaymentSummaryCard";
import PaymentModal from "@/components/chat/PaymentModal";
import RentalRequestModal from "@/components/RentalRequestModal";
import styles from "./page.module.css";

function formatPrice(value) {
  return `₩${Number(value || 0).toLocaleString("ko-KR")}`;
}

function formatMessageTime(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function formatDateDivider(value) {
  if (!value) return "";
  try {
    return new Date(value)
      .toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\s/g, "");
  } catch {
    return "";
  }
}

function getRoomTitle(room) {
  return room?.itemTitle || room?.title || `상품 #${room?.itemId || ""}`;
}

function getRoomNickname(room) {
  return room?.ownerNickname || "user";
}

function getRoomArea(room) {
  return room?.areaName || "지역 정보 없음";
}

function getRoomStatusLabel(room) {
  const status = room?.orderStatus || room?.status;

  switch (status) {
    case "PAID":
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "완료";
    default:
      return "대여가능";
  }
}

function getFilterKeyFromRoom(room) {
  const status = room?.orderStatus || room?.status;

  if (status === "PAID" || status === "IN_PROGRESS") return "progress";
  if (status === "COMPLETED") return "done";
  return "waiting";
}

function isMineMessage(message, myUserId) {
  if (message?.isMine === true) return true;
  if (myUserId == null) return false;
  return Number(message?.senderId) === Number(myUserId);
}

function buildPaymentCardData(message, fallbackOrderStatus = "") {
  const payload = message?.payload || {};

  // 날짜 추출
  const startDate =
    message?.startDate ||
    payload?.startDate ||
    payload?.rentalStartDate ||
    null;

  const endDate =
    message?.endDate ||
    payload?.endDate ||
    payload?.rentalEndDate ||
    null;

  // 날짜 포맷 (2026.04.08.)
  function formatDateText(date) {
    if (!date) return "-";
    try {
      return date.replaceAll("-", ".") + ".";
    } catch {
      return "-";
    }
  }

  // 대여일수 계산
  function calcDays(start, end) {
    if (!start || !end) return 0;

    const s = new Date(start);
    const e = new Date(end);

    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;

    const diff = e - s;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days > 0 ? days : 0;
  }

  const days = calcDays(startDate, endDate);

  // 가격 계산
  const pricePerDay =
    payload?.pricePerDay ||
    message?.pricePerDay ||
    0;

  const rentalAmount =
    message?.rentalAmount ||
    payload?.rentalAmount ||
    payload?.totalRentalAmount ||
    payload?.pricePerDayTotal ||
    (pricePerDay * days) ||
    0;

  const depositAmount =
    message?.depositAmount ||
    payload?.depositAmount ||
    0;

  return {
    orderId: message?.orderId || payload?.orderId || null,

    itemTitle:
      message?.itemTitle ||
      message?.title ||
      payload?.itemTitle ||
      payload?.title ||
      "상품명",

    thumbnailUrl:
      message?.thumbnailUrl ||
      message?.imageUrl ||
      payload?.thumbnailUrl ||
      payload?.imageUrl ||
      "",

    // 기존 값 유지
    startDate: startDate || "-",
    endDate: endDate || "-",

    // 🔥 추가 (PaymentSummaryCard에서 쓰는 핵심)
    pickupText: formatDateText(startDate),
    returnText: formatDateText(endDate),

    rentalAmount,
    depositAmount,

    status:
      message?.status ||
      payload?.status ||
      fallbackOrderStatus ||
      "ACCEPTED",
  };
}

function parseJwt(token) {
  try {
    const base64Payload = token.split(".")[1];
    const normalized = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = atob(normalized);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getStoredUserId() {
  if (typeof window === "undefined") return null;

  const storedUserId =
    localStorage.getItem("userId") ||
    sessionStorage.getItem("userId");

  if (storedUserId) {
    return Number(storedUserId);
  }

  const storedToken =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  if (!storedToken) return null;

  const payload = parseJwt(storedToken);
  return payload?.sub ? Number(payload.sub) : null;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const socketRef = useRef(null);
  const connectedRoomIdRef = useRef(null);
  const bottomRef = useRef(null);

  const roomIdParam = searchParams.get("roomId");
  const itemIdParam = searchParams.get("itemId");
  const targetUserIdParam = searchParams.get("targetUserId");

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(roomIdParam || null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentOrderId, setSelectedPaymentOrderId] = useState(null);
  const [selectedPaymentCard, setSelectedPaymentCard] = useState(null);
  const [paymentSummaryMap, setPaymentSummaryMap] = useState({});

  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const [myUserId] = useState(() => getStoredUserId());

  const selectedRoom = useMemo(() => {
    return (
      rooms.find(
        (room) => String(room.roomId || room.id) === String(selectedRoomId)
      ) || null
    );
  }, [rooms, selectedRoomId]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const title = getRoomTitle(room);
      const lastMessage = room?.lastMessage || "";

      const matchedSearch =
        !searchText.trim() ||
        title.includes(searchText) ||
        lastMessage.includes(searchText);

      if (!matchedSearch) return false;
      if (filter === "all") return true;
      return getFilterKeyFromRoom(room) === filter;
    });
  }, [rooms, searchText, filter]);

  useEffect(() => {
    async function bootstrapChat() {
      try {
        setLoadingRooms(true);

        let nextSelectedRoomId = roomIdParam || null;
        let roomList = await getChatRooms();

        if ((!nextSelectedRoomId || nextSelectedRoomId === "null") && itemIdParam) {
          const matched = Array.isArray(roomList)
            ? roomList.find((room) => {
                const roomItemId = room?.itemId;
                const roomTargetUserId =
                  room?.renterUserId || room?.targetUserId || null;

                if (targetUserIdParam) {
                  return (
                    String(roomItemId) === String(itemIdParam) &&
                    String(roomTargetUserId) === String(targetUserIdParam)
                  );
                }

                return String(roomItemId) === String(itemIdParam);
              })
            : null;

          const createdOrFound =
            matched ||
            (await createChatRoom(
              Number(itemIdParam),
              targetUserIdParam ? Number(targetUserIdParam) : undefined
            ));

          nextSelectedRoomId =
            createdOrFound?.roomId || createdOrFound?.id || null;

          if (nextSelectedRoomId) {
            router.replace(
              `/chat?roomId=${nextSelectedRoomId}&itemId=${itemIdParam}${
                targetUserIdParam ? `&targetUserId=${targetUserIdParam}` : ""
              }`
            );
          }

          roomList = await getChatRooms();
        }

        const nextRooms = Array.isArray(roomList) ? roomList : [];
        setRooms(nextRooms);

        if (nextSelectedRoomId) {
          setSelectedRoomId(nextSelectedRoomId);
        } else if (nextRooms.length > 0) {
          setSelectedRoomId(nextRooms[0].roomId || nextRooms[0].id);
        }
      } catch (error) {
        console.error(error);
        alert(error.message || "채팅방을 불러오지 못했어요.");
      } finally {
        setLoadingRooms(false);
      }
    }

    bootstrapChat();
  }, [roomIdParam, itemIdParam, targetUserIdParam, router]);

  useEffect(() => {
    if (!selectedRoomId) return;

    async function fetchMessages() {
      try {
        setLoadingMessages(true);

        const data = await getChatMessages(selectedRoomId);
        const nextMessages = Array.isArray(data?.messages) ? data.messages : [];
        setMessages(nextMessages);

        try {
          await markChatAsRead(selectedRoomId);
        } catch (e) {
          console.error("읽음 처리 실패", e);
        }
      } catch (error) {
        console.error(error);
        alert(error.message || "메시지를 불러오지 못했어요.");
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [selectedRoomId]);

  useEffect(() => {
    async function enrichPaymentSummaries() {
      const paymentMessages = messages.filter(
        (msg) => msg?.messageType === "PAYMENT"
      );
      if (paymentMessages.length === 0) return;

      const orderIds = [
        ...new Set(
          paymentMessages
            .map((msg) =>
              buildPaymentCardData(msg, selectedRoom?.orderStatus).orderId
            )
            .filter(Boolean)
        ),
      ];

      if (orderIds.length === 0) return;

      const missingOrderIds = orderIds.filter(
        (orderId) => !paymentSummaryMap[orderId]
      );
      if (missingOrderIds.length === 0) return;

      const results = await Promise.allSettled(
        missingOrderIds.map((orderId) => getPaymentSummary(orderId))
      );

      setPaymentSummaryMap((prev) => {
        const next = { ...prev };

        results.forEach((result, index) => {
          const orderId = missingOrderIds[index];
          if (result.status === "fulfilled") {
            next[orderId] = result.value;
          }
        });

        return next;
      });
    }

    enrichPaymentSummaries();
  }, [messages, selectedRoom, paymentSummaryMap]);

  useEffect(() => {
    if (!selectedRoomId) return;

    if (
      connectedRoomIdRef.current === String(selectedRoomId) &&
      socketRef.current
    ) {
      return;
    }

    if (socketRef.current) {
      try {
        socketRef.current.deactivate();
      } catch (e) {
        console.error("기존 소켓 종료 실패", e);
      }
      socketRef.current = null;
      connectedRoomIdRef.current = null;
    }

    const socket = createChatSocket({
      roomId: selectedRoomId,
      onMessage: (payload) => {
        setMessages((prev) => {
          const exists = prev.some(
            (msg) => msg.messageId === payload.messageId
          );
          if (exists) return prev;
          return [...prev, payload];
        });

        setRooms((prev) =>
          prev.map((room) =>
            String(room.roomId || room.id) === String(selectedRoomId)
              ? {
                  ...room,
                  lastMessage: payload?.message || room.lastMessage,
                  lastMessageType:
                    payload?.messageType || room.lastMessageType,
                  lastMessageAt: payload?.createdAt || room.lastMessageAt,
                }
              : room
          )
        );
      },
      onRead: () => {},
      onEdit: () => {},
      onDelete: () => {},
      onFraudAlert: (payload) => {
        const warningText =
          payload?.message ||
          payload?.warningMessage ||
          payload?.content ||
          "주의가 필요한 거래 감지 알림이 도착했어요.";

        alert(warningText);
      },
      onError: (e) => {
        console.error("채팅 소켓 오류 상세", {
          headers: e?.headers,
          body: e?.body,
          command: e?.command,
          message: e?.message,
          raw: e,
        });
      },
    });

    socketRef.current = socket;
    connectedRoomIdRef.current = String(selectedRoomId);

    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.deactivate();
        } catch (e) {
          console.error("소켓 종료 실패", e);
        }
        socketRef.current = null;
        connectedRoomIdRef.current = null;
      }
    };
  }, [selectedRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedRoomId) return;

    const payload = {
      roomId: selectedRoomId,
      messageType: "TEXT",
      message: chatInput.trim(),
      imageUrl: null,
    };

    try {
      if (socketRef.current?.connected) {
        sendChatMessageViaSocket(socketRef.current, payload);
      } else {
        await sendChatMessage(payload);
      }

      setChatInput("");
    } catch (socketError) {
      console.error("소켓 전송 실패 → REST fallback", socketError);

      try {
        await sendChatMessage(payload);
        setChatInput("");
      } catch (restError) {
        console.error(restError);
        alert(restError.message || "메시지 전송에 실패했어요.");
      }
    }
  };

  const handleOpenPaymentModal = (cardData) => {
    if (!cardData?.orderId) {
      alert("주문 정보가 없어 결제를 진행할 수 없어요.");
      return;
    }

    setSelectedPaymentOrderId(cardData.orderId);
    setSelectedPaymentCard(cardData);
    setPaymentModalOpen(true);
  };

  const handlePaid = async () => {
    setPaymentModalOpen(false);
    setSelectedPaymentOrderId(null);
    setSelectedPaymentCard(null);

    try {
      const roomList = await getChatRooms();
      const nextRooms = Array.isArray(roomList) ? roomList : [];
      setRooms(nextRooms);

      const msgData = await getChatMessages(selectedRoomId);
      setMessages(Array.isArray(msgData?.messages) ? msgData.messages : []);

      const updatedRoom = nextRooms.find(
        (r) => String(r.roomId || r.id) === String(selectedRoomId)
      );

      if (updatedRoom) {
        setSelectedRoomId(updatedRoom.roomId || updatedRoom.id);
      }

      window.dispatchEvent(new Event("RENT_STATUS_CHANGED"));
    } catch (error) {
      console.error(error);
    }
  };

  const renderMessage = (message, index) => {
  const previous = messages[index - 1];

  const showDateDivider =
    !previous ||
    formatDateDivider(previous?.createdAt) !==
      formatDateDivider(message?.createdAt);

  const mine = isMineMessage(message, myUserId);
  const previousMine = previous ? isMineMessage(previous, myUserId) : false;

  const showSender =
    !mine &&
    (!previous ||
      previousMine ||
      Number(previous?.senderId) !== Number(message?.senderId));

  if (message?.messageType === "PAYMENT") {
    const cardData = buildPaymentCardData(message, selectedRoom?.orderStatus);
    const summaryState = paymentSummaryMap[cardData.orderId];

    const mergedCardData = {
      ...cardData,
      isPaid: summaryState?.isPaid ?? (cardData.status === "PAID"),
      balance: summaryState?.balance ?? 0,
      status: summaryState?.status || cardData.status,
    };

    return (
      <div key={message?.messageId || `${message?.createdAt}-${index}`}>
        {showDateDivider && (
          <div className={styles.dateDivider}>
            {formatDateDivider(message?.createdAt)}
          </div>
        )}

        <div className={styles.summaryWrap}>
          <PaymentSummaryCard
            summary={mergedCardData}
            orderStatus={mergedCardData?.status}
            onClickPay={() => handleOpenPaymentModal(mergedCardData)}
          />
        </div>
      </div>
    );
  }

  return (
    <div key={message?.messageId || `${message?.createdAt}-${index}`}>
      {showDateDivider && (
        <div className={styles.dateDivider}>
          {formatDateDivider(message?.createdAt)}
        </div>
      )}

      <div className={`${styles.messageRow} ${mine ? styles.mine : styles.other}`}>
        {mine ? (
          <div className={`${styles.bubble} ${styles.bubbleMine}`}>
            <p>{message?.message || ""}</p>
            <div className={styles.metaLine}>
              <span>{formatMessageTime(message?.createdAt)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.otherMessageGroup}>
            {showSender && (
              <div className={styles.senderWrap}>
                <div className={styles.senderAvatar}></div>
                <span className={styles.senderName}>
                  {getRoomNickname(selectedRoom)}
                </span>
              </div>
            )}

            <div className={`${styles.bubble} ${styles.bubbleOther}`}>
              <p>{message?.message || ""}</p>
              <div className={styles.metaLine}>
                <span>{formatMessageTime(message?.createdAt)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

  return (
    <>
      <main className={styles.chatPage}>
        <div className={styles.inner}>
          <section className={styles.leftPanel}>
            <div className={styles.leftHead}>
              <h2>대화 목록</h2>
              <p>채팅 + 대여요청 + 결제카드 + 사기피해방지 알림 버전</p>
            </div>

            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="대화/물건/아이디로 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className={styles.filterRow}>
              <button
                type="button"
                className={`${styles.filterBtn} ${
                  filter === "all" ? styles.filterBtnActive : ""
                }`}
                onClick={() => setFilter("all")}
              >
                전체
              </button>

              <button
                type="button"
                className={`${styles.filterBtn} ${
                  filter === "waiting" ? styles.filterBtnActive : ""
                }`}
                onClick={() => setFilter("waiting")}
              >
                대여가능
              </button>

              <button
                type="button"
                className={`${styles.filterBtn} ${
                  filter === "progress" ? styles.filterBtnActive : ""
                }`}
                onClick={() => setFilter("progress")}
              >
                진행중
              </button>

              <button
                type="button"
                className={`${styles.filterBtn} ${
                  filter === "done" ? styles.filterBtnActive : ""
                }`}
                onClick={() => setFilter("done")}
              >
                완료
              </button>
            </div>

            <div className={styles.roomList}>
              {loadingRooms ? (
                <p className={styles.emptyText}>대화 목록을 불러오는 중...</p>
              ) : filteredRooms.length === 0 ? (
                <p className={styles.emptyText}>표시할 대화가 없어요.</p>
              ) : (
                filteredRooms.map((room) => {
                  const roomId = room?.roomId || room?.id;
                  const selected = String(roomId) === String(selectedRoomId);

                  const thumbnail =
                    room?.thumbnailUrl ||
                    room?.imageUrl ||
                    room?.itemImageUrl ||
                    "";

                  console.log("thumbnail:", thumbnail);

                  return (
                    <button
                      type="button"
                      key={roomId}
                      className={`${styles.roomCard} ${
                        selected ? styles.roomCardActive : ""
                      }`}
                      onClick={() => setSelectedRoomId(roomId)}
                    >
                      <div className={styles.roomThumb}>
                        {thumbnail ? (
                          <img src={thumbnail} alt={getRoomTitle(room)} />
                        ) : null}
                      </div>

                      <div className={styles.roomInfo}>
                        <div className={styles.roomTop}>
                          <strong>{getRoomTitle(room)}</strong>
                          <span className={styles.roomBadge}>
                            {getRoomStatusLabel(room)}
                          </span>
                        </div>

                        <p className={styles.roomMeta}>
                          @{getRoomNickname(room)} · {getRoomArea(room)}
                        </p>

                        <p className={styles.roomPrice}>
                          {formatPrice(room?.pricePerDay || 0)} / 하루
                        </p>

                        <p className={styles.roomSnippet}>
                          마지막 메시지: "
                          {room?.lastMessage || "아직 메시지가 없어요."}"
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className={styles.rightPanel}>
            {!selectedRoom ? (
              <div className={styles.emptyPanel}>
                <div className={styles.emptyHero}></div>
                <h3>대화 내용을 여기에서 확인해요</h3>
                <p>대여요청과 결제카드까지 포함된 채팅 화면이에요.</p>
              </div>
            ) : (
              <>
                <div className={styles.chatHead}>
                  <div className={styles.chatItemInfo}>
                    <div className={styles.chatHeadThumb}>
                      {(selectedRoom?.thumbnailUrl ||
                        selectedRoom?.imageUrl ||
                        selectedRoom?.itemImageUrl) ? (
                        <img
                          src={
                            selectedRoom?.thumbnailUrl ||
                            selectedRoom?.imageUrl ||
                            selectedRoom?.itemImageUrl
                          }
                          alt={getRoomTitle(selectedRoom)}
                        />
                      ) : null}
                    </div>
                    <div>
                      <strong>{getRoomTitle(selectedRoom)}</strong>
                      <p>
                        @{getRoomNickname(selectedRoom)} ·{" "}
                        {getRoomArea(selectedRoom)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.chatHeadBtns}>
                    <button
                      type="button"
                      className={styles.darkBtn}
                      onClick={() => setRequestModalOpen(true)}
                    >
                      예약/일정
                    </button>
                  </div>
                </div>

                <div className={styles.messageArea}>
                  {loadingMessages ? (
                    <p className={styles.emptyText}>
                      대화 내용을 불러오는 중...
                    </p>
                  ) : messages.length === 0 ? (
                    <p className={styles.emptyText}>아직 대화가 없어요.</p>
                  ) : (
                    messages.map(renderMessage)
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className={styles.inputRow}>
                  <input
                    type="text"
                    placeholder="메시지를 입력하세요..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendMessage();
                    }}
                  />

                  <button type="button" className={styles.plusBtn}>
                    +
                  </button>

                  <button
                    type="button"
                    className={styles.sendBtn}
                    onClick={handleSendMessage}
                  >
                    전송
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      <RentalRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        mode="create"
        product={{
          itemId: selectedRoom?.itemId || Number(itemIdParam) || null,
          title: getRoomTitle(selectedRoom),
          pricePerDay: selectedRoom?.pricePerDay || 0,
          areaName: selectedRoom?.areaName || "",
          ownerNickname: getRoomNickname(selectedRoom),
          thumbnailUrl:
            selectedRoom?.thumbnailUrl ||
            selectedRoom?.imageUrl ||
            selectedRoom?.itemImageUrl ||
            "",
        }}
        shopInfo={{
          nickname: getRoomNickname(selectedRoom),
        }}
        targetUserId={targetUserIdParam ? Number(targetUserIdParam) : undefined}
        onCompleted={async () => {
          setRequestModalOpen(false);

          try {
            const roomList = await getChatRooms();
            const nextRooms = Array.isArray(roomList) ? roomList : [];
            setRooms(nextRooms);

            const msgData = await getChatMessages(selectedRoomId);
            setMessages(Array.isArray(msgData?.messages) ? msgData.messages : []);

            window.dispatchEvent(new Event("RENT_STATUS_CHANGED"));
          } catch (error) {
            console.error(error);
          }
        }}
      />

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedPaymentOrderId(null);
          setSelectedPaymentCard(null);
        }}
        orderId={selectedPaymentOrderId || selectedRoom?.orderId || null}
        summaryData={selectedPaymentCard}
        onPaid={handlePaid}
      />
    </>
  );
}