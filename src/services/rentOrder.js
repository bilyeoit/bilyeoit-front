import { apiRequest } from "./api";

export async function createRentOrder(payload) {
  return apiRequest("/bilyeoit/v1/rent-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRentOrderRequest(orderId) {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/request`);
}

export async function acceptRentOrder(orderId, memo = "") {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/accept`, {
    method: "POST",
    body: JSON.stringify(memo ? { memo } : {}),
  });
}

export async function rejectRentOrder(orderId, memo = "") {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/reject`, {
    method: "POST",
    body: JSON.stringify(memo ? { memo } : {}),
  });
}

export async function cancelRentOrder(orderId, memo = "") {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify(memo ? { memo } : {}),
  });
}

export async function startRentOrder(orderId, memo = "") {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/start`, {
    method: "POST",
    body: JSON.stringify(memo ? { memo } : {}),
  });
}

export async function completeRentOrder(orderId, memo = "") {
  return apiRequest(`/bilyeoit/v1/rent-orders/${orderId}/complete`, {
    method: "POST",
    body: JSON.stringify(memo ? { memo } : {}),
  });
}