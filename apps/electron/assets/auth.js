// ─── Shared auth/session helper ───────────────────────────────────────────────
const API_URL = "http://localhost:3000"; // ← update to your backend URL

function getUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}
function getToken() {
  return localStorage.getItem("token") || null;
}
function saveAuth(payload) {
  localStorage.setItem("token", payload.token);
  localStorage.setItem("user", JSON.stringify(payload.user || payload));
}
function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
function requireAuth(role) {
  const user = getUser();
  if (!user) { window.location.href = role === "lecturer" ? "/pages/lecturer-auth.html" : "/pages/student-auth.html"; return null; }
  if (user.role !== role) { window.location.href = "/index.html"; return null; }
  return user;
}

async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─── Sidebar renderer (shared across lecturer pages) ──────────────────────────
function renderSidebar(activePage) {
  const user = getUser();
  const pages = [
    { id: "scan",    label: "Live Session",  href: "lecturer-dashboard.html" },
    { id: "courses", label: "Courses",        href: "lecturer-courses.html" },
    { id: "records", label: "Records",        href: "lecturer-records.html" },
    { id: "summary", label: "Summary",        href: "lecturer-summary.html" },
  ];

  return `
    <aside class="lecturer-shell__sidebar">
      <div class="brand-block">
        <div class="eyebrow">AttendEase</div>
        <div style="font-size:0.8rem;color:var(--gray-500)">Lecturer Portal</div>
      </div>
      <nav class="nav-stack">
        ${pages.map(p => `
          <a href="${p.href}" class="nav-link ${activePage === p.id ? "is-active" : ""}">${p.label}</a>
        `).join("")}
      </nav>
      <div class="workspace-card" style="margin-top:auto">
        <strong>${user?.name || "—"}</strong>
        <div style="font-size:0.8rem;color:var(--gray-500);margin-bottom:0.75rem">${user?.email || ""}</div>
        <button class="btn-secondary" style="width:100%;justify-content:center" onclick="logout()">Logout</button>
      </div>
    </aside>
  `;
}

function logout() {
  clearAuth();
  window.location.href = "/pages/lecturer-auth.html";
}

// Banner helper
function showBanner(msg, type = "error") {
  let el = document.getElementById("banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "banner";
    document.querySelector(".page-body")?.prepend(el);
  }
  el.className = type === "error" ? "shell-banner shell-banner--error" : "";
  el.textContent = msg;
  el.style.display = msg ? "block" : "none";
}
