import { apiRequest } from "./api";

/**
 * 기존 함수명 유지용 호환 레이어
 * 채팅/결제모달 로직은 그대로 두고,
 * 내부만 현재 에스크로 API 구조에 맞춤
 */

// 결제 카드/모달에 표시할 요약
export async function getPaymentSummary(orderId) {
  const [statusRes, balanceRes] = await Promise.allSettled([
    apiRequest(`/bilyeoit/v1/escrow/status/${orderId}`),
    apiRequest(`/bilyeoit/v1/escrow/balance/${orderId}`),
  ]);

  const statusData =
    statusRes.status === "fulfilled" ? statusRes.value : null;
  const balanceData =
    balanceRes.status === "fulfilled" ? balanceRes.value : null;

  /**
   * 여기서 중요한 포인트:
   * 현재 summary 전용 API가 없으니까
   * 실제 카드에 필요한 상품명/날짜/금액은
   * "채팅 PAYMENT 메시지 payload" 또는
   * "대여요청에서 받은 정보"를 우선 사용해야 함.
   *
   * 그래서 이 함수는 최소한의 상태값만 보강하는 용도라고 생각하면 됨.
   */
  return {
    orderId,
    isPaid: statusData?.isPaid || false,
    balance: balanceData?.balance || statusData?.balance || 0,
    depositAmount: statusData?.depositAmount || 0,
    rentalAmount: statusData?.rentalAmount || 0,
    status: statusData?.isPaid ? "PAID" : "ACCEPTED",
  };
}

// 결제 준비
export async function preparePayment(orderId) {
  /**
   * 예전 구조 유지용 더미 반환
   * 기존 프론트가 preparePayment를 호출하더라도 안 깨지게 함
   */
  return {
    orderId,
    transactionId: `escrow-${orderId}-${Date.now()}`,
    paymentKey: `escrow-${orderId}-${Date.now()}`,
  };
}

// 결제 승인 완료
export async function confirmPayment(orderId, payload = {}) {
  /**
   * 실제 결제는 에스크로 hold 호출로 대체
   * 기존 confirmPayment 호출 구조 유지
   */
  return apiRequest(`/bilyeoit/v1/escrow/hold`, {
    method: "POST",
    body: JSON.stringify({
      orderId,
      method: "CARD",
      ...payload,
    }),
  });
}