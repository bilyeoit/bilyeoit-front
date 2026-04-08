"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRentOrder,
  getRentOrderRequest,
  acceptRentOrder,
} from "@/services/rentOrder";
import {
  createChatRoom,
  getChatRooms,
  sendChatMessage,
} from "@/services/chat";
import styles from "./RentalRequestModal.module.css";

function formatPrice(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

const initialForm = {
  startDate: "",
  endDate: "",
  contactNumber: "",
  requestMessage: "",
  agreedToTerms: false,
};

export default function RentalRequestModal({
  open,
  onClose,
  product,
  shopInfo,
  mode = "create",
  orderId = null,
  targetUserId = null,
  onCompleted,
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);

  const isAcceptMode = mode === "accept";

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSubmitting(false);
      setLoadingRequest(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isAcceptMode || !orderId) return;

    let mounted = true;

    async function fetchRequestDetail() {
      try {
        setLoadingRequest(true);
        const data = await getRentOrderRequest(orderId);

        if (!mounted) return;

        setForm({
          startDate: data?.startDate || "",
          endDate: data?.endDate || "",
          contactNumber: data?.contactNumber || "",
          requestMessage: data?.requestMessage || "",
          agreedToTerms: true,
        });
      } catch (error) {
        console.error("대여 신청 내용 조회 실패:", error);
        alert(error.message || "대여 신청 정보를 불러오지 못했어요.");
      } finally {
        if (mounted) setLoadingRequest(false);
      }
    }

    fetchRequestDetail();

    return () => {
      mounted = false;
    };
  }, [open, isAcceptMode, orderId]);

  const thumbnailUrl = useMemo(() => {
    if (product?.images?.[0]?.imageUrl) return product.images[0].imageUrl;
    return (
      product?.thumbnailUrl ||
      product?.thumbnail_url ||
      product?.imageUrl ||
      product?.image_url ||
      ""
    );
  }, [product]);

  const sellerLocation =
    product?.areaName ||
    product?.locationAreaCode ||
    product?.location ||
    "";

    const locationDisplayText = sellerLocation || "정확한 장소는 채팅방에서 조율해요.";

  const ownerName =
    shopInfo?.nickname ||
    product?.ownerNickname ||
    product?.nickname ||
    "owner";

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.startDate) return "대여 시작일을 선택해주세요.";
    if (!form.endDate) return "대여 종료일을 선택해주세요.";
    if (form.endDate < form.startDate) {
      return "대여 종료일은 시작일보다 빠를 수 없어요.";
    }
    if (!form.requestMessage.trim()) return "요청 메시지를 입력해주세요.";
    if (!form.agreedToTerms) return "대여 약관 및 유의사항에 동의해주세요.";
    return "";
  };

  async function findOrCreateRoom() {
    try {
      const rooms = await getChatRooms();

      const matchedRoom = Array.isArray(rooms)
        ? rooms.find((room) => {
            const roomItemId = room?.itemId;
            const roomTargetUserId =
              room?.renterUserId || room?.targetUserId || null;

            if (targetUserId) {
              return roomItemId === product?.itemId && roomTargetUserId === targetUserId;
            }

            return roomItemId === product?.itemId;
          })
        : null;

      if (matchedRoom?.roomId || matchedRoom?.id) {
        return matchedRoom;
      }
    } catch (error) {
      console.error("채팅방 목록 조회 실패:", error);
    }

    return createChatRoom(product?.itemId, targetUserId || undefined);
  }

  const handleCreateSubmit = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      alert(errorMessage);
      return;
    }

    try {
      setSubmitting(true);

      await createRentOrder({
        itemId: product.itemId,
        startDate: form.startDate,
        endDate: form.endDate,
        receiveMethod: "DIRECT",
        contactNumber: form.contactNumber.trim() || null,
        requestMessage: form.requestMessage.trim(),
        agreedToTerms: form.agreedToTerms,
        });

      alert("대여 요청이 전송되었어요.");
      onClose();

      if (typeof onCompleted === "function") {
        onCompleted();
      } else {
        router.push("/mypage");
      }
    } catch (error) {
      alert(error.message || "대여 요청 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptSubmit = async () => {
    const errorMessage = validate();
    if (errorMessage) {
      alert(errorMessage);
      return;
    }

    if (!orderId) {
      alert("주문 정보가 없어 요청을 수락할 수 없어요.");
      return;
    }

    try {
      setSubmitting(true);

      await acceptRentOrder(orderId);

      const room = await findOrCreateRoom();
      const roomId = room?.roomId || room?.id;

    const startDate = form.startDate || "";
const endDate = form.endDate || "";

const start = startDate ? new Date(startDate) : null;
const end = endDate ? new Date(endDate) : null;

const diffTime =
  start && end ? end.getTime() - start.getTime() : 0;

const rentalDays =
  diffTime > 0
    ? Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    : 0;

const pricePerDay = Number(product?.pricePerDay || 0);
const depositAmount = Number(product?.depositAmount || 0);
const rentalAmount = pricePerDay * rentalDays;

await sendChatMessage({
  roomId,
  messageType: "PAYMENT",
  message: "대여 요청이 수락되었어요. 결제를 진행해주세요.",
  imageUrl: null,
  orderId,
  startDate,
  endDate,
  pricePerDay,
  rentalAmount,
  depositAmount,
  itemTitle: product?.title || "상품명",
  thumbnailUrl: thumbnailUrl || "",
  status: "ACCEPTED",
  payload: {
    orderId,
    itemTitle: product?.title || "상품명",
    thumbnailUrl: thumbnailUrl || "",
    startDate,
    endDate,
    rentalStartDate: startDate,
    rentalEndDate: endDate,
    pricePerDay,
    rentalAmount,
    totalRentalAmount: rentalAmount,
    depositAmount,
    status: "ACCEPTED",
  },
});

      alert("대여 요청을 수락했어요. 현재 상태는 결제 대기중입니다.");
      onClose();

      if (typeof onCompleted === "function") {
        onCompleted();
      } else if (roomId) {
        router.push(`/chat/${roomId}`);
      } else {
        router.push("/mypage");
      }
    } catch (error) {
      alert(error.message || "대여 수락 중 오류가 발생했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isAcceptMode) {
      handleAcceptSubmit();
      return;
    }

    console.log({
  itemId: product.itemId,
  startDate: form.startDate,
  endDate: form.endDate,
  receiveMethod: "DIRECT",
  contactNumber: form.contactNumber.trim() || null,
  requestMessage: form.requestMessage.trim(),
  agreedToTerms: form.agreedToTerms,
});

    handleCreateSubmit();
  };

  const submitLabel = submitting
    ? isAcceptMode
      ? "수락 중..."
      : "신청 중..."
    : isAcceptMode
    ? "요청 수락"
    : "신청 보내기";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isAcceptMode ? "대여 요청 수락" : "대여 신청"}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.itemCard}>
          <div className={styles.thumb}>
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={product?.title || "상품 썸네일"} />
            ) : (
              <div className={styles.thumbFallback}>이미지</div>
            )}
          </div>

          <div className={styles.itemText}>
            <strong>{product?.title || "상품명"}</strong>
            <p>@{ownerName} · {sellerLocation}</p>
          </div>

          <div className={styles.itemPrice}>
            <span className={styles.itemPriceValue}>
            ₩{formatPrice(displayPricePerDay)}
            </span>
            <span className={styles.itemPriceUnit}> / 하루</span>
          </div>
        </div>

        {loadingRequest ? (
          <div className={styles.loadingBox}>신청 정보를 불러오는 중이에요...</div>
        ) : (
          <>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>대여 시작</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  disabled={isAcceptMode}
                />
              </div>

              <div className={styles.field}>
                <label>대여 종료</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  disabled={isAcceptMode}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>거래 위치</label>

                <div className={styles.locationInputLike}>
                    <span className={styles.locationInputText}>{locationDisplayText}</span>
                </div>
              </div>

              <div className={styles.field}>
                <label>연락처(선택)</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={form.contactNumber}
                  onChange={(e) => handleChange("contactNumber", e.target.value)}
                  disabled={isAcceptMode}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>요청 메시지</label>
              <textarea
                rows={6}
                placeholder="원하시는 시간대, 거래 장소 세부 조율 내용, 사용 목적 등을 적어주세요"
                value={form.requestMessage}
                onChange={(e) => handleChange("requestMessage", e.target.value)}
                disabled={isAcceptMode}
              />
            </div>

            <label className={styles.agreeRow}>
              <input
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={(e) => handleChange("agreedToTerms", e.target.checked)}
                disabled={isAcceptMode}
              />
              <span>대여 약관 및 유의사항에 동의합니다.</span>
            </label>
          </>
        )}

        <div className={styles.buttonRow}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting || loadingRequest}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}