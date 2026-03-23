const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || `요청 실패 (${response.status})`);
  }

  return data;
}

export async function loginUser(payload) {
  return request("/bilyeoit/v1/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function signupUser(payload) {
  return request("/bilyeoit/v1/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refreshToken(payload) {
  return request("/bilyeoit/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}