const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
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

export async function getProducts() {
  return request("/bilyeoit/v1/products", {
    method: "GET",
  });
}

export async function getLocations() {
  return request("/bilyeoit/v1/locations", {
    method: "GET",
  });
}