import { apiRequest } from "./api";

// 마이페이지 메인 정보
export function getMyPageMainInfo() {
  return apiRequest("/bilyeoit/v1/mypage/maininfo");
}

// 내 상품
export function getMyItems() {
  return apiRequest("/bilyeoit/v1/mypage/items");
}

// 내가 대여한 상품
export function getRentals() {
  return apiRequest("/bilyeoit/v1/mypage/rentals");
}

// 예약 대시보드
export function getReservations() {
  return apiRequest("/bilyeoit/v1/mypage/reservations");
}

// 찜 목록
export function getFavorites() {
  return apiRequest("/bilyeoit/v1/mypage/likeitem");
}

// 리뷰 목록
export function getReviews() {
  return apiRequest("/bilyeoit/v1/mypage/reviews");
}