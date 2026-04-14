const API_URL = import.meta.env.VITE_API_URL || "https://teacher-attendance-api.onrender.com";

export const getApiUrl = () => API_URL;

export const apiRequest = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
};
