"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPaymentSummary,
  preparePayment,
  confirmPayment,
} from "@/services/payment";
import styles from "./PaymentModal.module.css";

function formatCurrency(value) {
  return `₩${Number(value || 0).toLocaleString("ko-KR")}`;
}

const initialForm = {
  paymentMethod: "CARD",
  payerName: "",
  payerPhone: "",
  agreed: true,
};

export default function PaymentModal({
  open,
  onClose,
  orderId,
  summaryData,
  onPaid,
}) {
  const [summary, setSummary] = useState(summaryData || null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!open || !orderId) return;

    let mounted = true;

    async function fetchSummary() {
      try {
        setLoading(true);

        const data = await getPaymentSummary(orderId);
        if (!mounted) return;

        setSummary((prev) => ({
          ...(prev || {}),
          ...(summaryData || {}),
          ...(data || {}),
          orderId,
        }));
      } catch (error) {
        console.error(error);

        if (!summaryData && mounted) {
          alert(error.message || "결제 정보를 불러오지 못했어요.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setSummary(summaryData || null);
    fetchSummary();

    return () => {
      mounted = false;
    };
  }, [open, orderId, summaryData]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose]);

  const totalAmount = useMemo(() => {
    if (!summary) return 0;
    return Number(summary.rentalAmount || 0) + Number(summary.depositAmount || 0);
  }, [summary]);

  if (!open) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.payerName.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    if (!form.payerPhone.trim()) {
      alert("연락처를 입력해주세요.");
      return;
    }

    if (!form.agreed) {
      alert("결제 및 환불 규정에 동의해주세요.");
      return;
    }

    try {
      setPaying(true);

      const prepared = await preparePayment(orderId);

      const approvedPayload = {
        paymentMethod: form.paymentMethod,
        payerName: form.payerName,
        payerPhone: form.payerPhone,
        agreedToTerms: form.agreed,
        transactionId:
          prepared?.transactionId ||
          prepared?.paymentKey ||
          `manual-${Date.now()}`,
      };

      await confirmPayment(orderId, approvedPayload);

      alert("결제가 완료되었어요.");

      if (typeof onPaid === "function") {
        onPaid();
      } else {
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "결제 처리 중 오류가 발생했어요.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <span className={styles.badge}>BILLYIT RENT</span>
            <h2>결제하기</h2>
            <p>대여 정보를 확인한 뒤 결제를 진행해주세요.</p>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          {loading && !summary ? (
            <div className={styles.loadingBox}>결제 정보를 불러오는 중이에요...</div>
          ) : (
            <div className={styles.grid}>
              <section className={styles.infoCard}>
                <h3>대여 정보</h3>

                <div className={styles.productBox}>
                  <div className={styles.thumb}>
                    {summary?.thumbnailUrl ? (
                      <img src={summary.thumbnailUrl} alt={summary?.itemTitle || "상품 이미지"} />
                    ) : null}
                  </div>

                  <div className={styles.productText}>
                    <strong>{summary?.itemTitle || "상품명"}</strong>
                    <p>
                      {summary?.startDate || "-"} ~ {summary?.endDate || "-"}
                    </p>
                  </div>

                  <div className={styles.productPrice}>
                    {formatCurrency(summary?.rentalAmount)}
                  </div>
                </div>

                <div className={styles.priceRow}>
                  <span>대여 금액</span>
                  <strong>{formatCurrency(summary?.rentalAmount)}</strong>
                </div>

                <div className={styles.priceRow}>
                  <span>보증금</span>
                  <strong>{formatCurrency(summary?.depositAmount)}</strong>
                </div>

                <div className={`${styles.priceRow} ${styles.totalRow}`}>
                  <span>최종 결제 금액</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </section>

              <section className={styles.payCard}>
                <h3>결제 수단</h3>

                <div className={styles.methodGroup}>
                  <button
                    type="button"
                    className={`${styles.methodBtn} ${styles.methodBtnActive}`}
                  >
                    <span className={styles.radio}></span>
                    카드 결제
                  </button>
                </div>

                <div className={styles.field}>
                  <label>이름</label>
                  <input
                    type="text"
                    placeholder="이름을 입력해주세요"
                    value={form.payerName}
                    onChange={(e) => handleChange("payerName", e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label>연락처</label>
                  <input
                    type="text"
                    placeholder="010-0000-0000"
                    value={form.payerPhone}
                    onChange={(e) => handleChange("payerPhone", e.target.value)}
                  />
                </div>

                <label className={styles.agreeRow}>
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={(e) => handleChange("agreed", e.target.checked)}
                  />
                  <span>결제 및 환불 규정에 동의합니다.</span>
                </label>

                <div className={styles.btnRow}>
                  <button type="button" className={styles.cancelBtn} onClick={onClose}>
                    취소
                  </button>

                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={paying}
                  >
                    {paying ? "결제 중..." : `${formatCurrency(totalAmount)} 결제하기`}
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}