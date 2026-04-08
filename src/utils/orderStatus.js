export function getRequestStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "승인 대기중";
    case "ACCEPTED":
      return "결제 대기중";
    default:
      return "";
  }
}

export function getRentalStatusLabel(status) {
  switch (status) {
    case "PAID":
      return "대여중";
    case "COMPLETED":
      return "반납 완료";
    case "SETTLED":
      return "거래 완료";
    default:
      return "";
  }
}

export function getOwnerItemStatusLabel(status) {
  switch (status) {
    case "PAID":
      return "대여중";
    case "COMPLETED":
      return "반납 완료";
    case "SETTLED":
      return "거래 완료";
    default:
      return "대여 가능";
  }
}