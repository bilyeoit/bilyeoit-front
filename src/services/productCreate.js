const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function request(path, options = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken")
      : null;

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const error = new Error(data?.message || `요청 실패 (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function getCategories() {
  return request("/bilyeoit/v1/categories");
}

export async function getSubcategories(categoryId) {
  return request(`/bilyeoit/v1/categories/${categoryId}/subcategories`);
}

export async function analyzeProductImages(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  return request("/bilyeoit/v1/items/analyze-image", {
    method: "POST",
    body: formData,
  });
}

export async function createProduct(payload) {
  return request("/bilyeoit/v1/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteUploadedImages(keys = []) {
  if (!Array.isArray(keys) || keys.length === 0) return null;

  const params = new URLSearchParams();
  keys.forEach((key) => params.append("key", key));

  return request(`/bilyeoit/v1/items/image?${params.toString()}`, {
    method: "DELETE",
  });
}