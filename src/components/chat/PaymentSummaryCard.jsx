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
      return "결제 완료";
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "완료";
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

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <p className={styles.title}>대여 요약</p>

        <div className={styles.lines}>
          <p>
            픽업: <strong>{summary.pickupText || "-"}</strong>
          </p>
          <p>
            반납: <strong>{summary.returnText || "-"}</strong>
          </p>
          <p>
            총액:{" "}
            <strong>
              {formatCurrency(summary.rentalAmount)} + 보증금{" "}
              {formatCurrency(summary.depositAmount)}
            </strong>
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
          disabled={
            orderStatus === "PAID" ||
            orderStatus === "IN_PROGRESS" ||
            orderStatus === "COMPLETED"
          }
        >
          {orderStatus === "PAID" ||
          orderStatus === "IN_PROGRESS" ||
          orderStatus === "COMPLETED"
            ? "결제완료"
            : "결제하기"}
        </button>
      </div>
    </div>
  );
}