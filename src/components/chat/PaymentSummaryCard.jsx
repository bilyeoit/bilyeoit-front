"use client";

import styles from "./PaymentSummaryCard.module.css";

function formatCurrency(value) {
  return `₩${Number(value || 0).toLocaleString("ko-KR")}`;
}

function getStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "예약 요청 중";
    case "ACCEPTED":
      return "결제 대기중";
    case "PAID":
    case "IN_PROGRESS":
      return "반납 대기중";
    case "COMPLETED":
      return "대여종료";
    default:
      return "예약 요청 중";
  }
}

export default function PaymentSummaryCard({
  summary,
  orderStatus,
  onClickPay,
}) {
  if (!summary) return null;

  const pickupText = summary?.pickupText || "-";
  const returnText = summary?.returnText || "-";
  const rentalAmount = Number(summary?.rentalAmount || 0);
  const depositAmount = Number(summary?.depositAmount || 0);
  const totalAmount = rentalAmount + depositAmount;

  const isPaidOrProgress =
    orderStatus === "PAID" || orderStatus === "IN_PROGRESS";

  const isCompleted = orderStatus === "COMPLETED";

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <p className={styles.title}>대여 요약</p>

        <div className={styles.lines}>
          <p>
            픽업: <strong>{pickupText}</strong>
          </p>
          <p>
            반납: <strong>{returnText}</strong>
          </p>
          <p>
            대여비: <strong>{formatCurrency(rentalAmount)}</strong>
          </p>
          <p>
            보증금: <strong>{formatCurrency(depositAmount)}</strong>
          </p>
          <p>
            최종 결제금액: <strong>{formatCurrency(totalAmount)}</strong>
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <button type="button" className={styles.statusBtn} disabled>
          {getStatusLabel(orderStatus)}
        </button>

        <button
          type="button"
          className={styles.payBtn}
          onClick={onClickPay}
          disabled={isPaidOrProgress || isCompleted}
        >
          {isCompleted
            ? "대여종료"
            : isPaidOrProgress
            ? "결제완료"
            : "결제하기"}
        </button>
      </div>
    </div>
  );
}