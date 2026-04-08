export function filterRequestItems(items = []) {
  return items.filter((item) =>
    ["PENDING", "ACCEPTED"].includes(item.status)
  );
}

export function filterRentalItems(items = []) {
  return items.filter((item) =>
    ["PAID", "COMPLETED", "SETTLED"].includes(item.status)
  );
}

export function mapRequestItems(items = []) {
  return items.map((item) => ({
    ...item,
    displayStatus:
      item.status === "PENDING"
        ? "승인 대기중"
        : item.status === "ACCEPTED"
        ? "결제 대기중"
        : "",
  }));
}

export function mapRentalItems(items = []) {
  return items.map((item) => ({
    ...item,
    displayStatus:
      item.status === "PAID"
        ? "대여중"
        : item.status === "COMPLETED"
        ? "반납 완료"
        : item.status === "SETTLED"
        ? "거래 완료"
        : "",
  }));
}

export function mapOwnerItems(items = []) {
  return items.map((item) => {
    const currentStatus = item.rentalStatus || item.orderStatus || item.status;

    return {
      ...item,
      displayStatus:
        currentStatus === "PAID"
          ? "대여중"
          : currentStatus === "COMPLETED"
          ? "반납 완료"
          : currentStatus === "SETTLED"
          ? "거래 완료"
          : "대여 가능",
    };
  });
}