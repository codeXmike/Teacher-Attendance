import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../api/client";

const resources = {
  students: { label: "Students", fields: [{ key: "name", label: "Full name" }, { key: "matricNo", label: "Registration number" }, { key: "deviceId", label: "Device ID", optional: true }, { key: "password", label: "Password", type: "password", secret: true }], columns: ["name", "matricNo", "deviceId"] },
  lecturers: { label: "Lecturers", fields: [{ key: "name", label: "Full name" }, { key: "email", label: "Email", type: "email" }, { key: "password", label: "Password", type: "password", secret: true }], columns: ["name", "email"] },
  courses: { label: "Courses", fields: [{ key: "courseCode", label: "Course code" }, { key: "courseTitle", label: "Course title" }, { key: "lecturerId", label: "Lecturer", relation: true }], columns: ["courseCode", "courseTitle", "lecturerId"] },
  sessions: { label: "Sessions", fields: [{ key: "courseId", label: "Course", relation: true }, { key: "lecturerId", label: "Lecturer", relation: true }, { key: "rotationIntervalSeconds", label: "QR rotation (seconds)", type: "number" }, { key: "studentLimit", label: "Student limit (0 = unlimited)", type: "number" }, { key: "isActive", label: "Active", type: "boolean" }, { key: "expiresAt", label: "Expires at", type: "datetime-local", optional: true }], columns: ["courseId", "lecturerId", "isActive", "expiresAt"] },
  attendance: { label: "Attendance", fields: [{ key: "studentId", label: "Student", relation: true }, { key: "sessionId", label: "Session", relation: true }, { key: "lecturerId", label: "Lecturer", relation: true }, { key: "timestamp", label: "Recorded at", type: "datetime-local" }], columns: ["studentId", "sessionId", "lecturerId", "timestamp"] },
  admins: { label: "Administrators", fields: [{ key: "name", label: "Full name" }, { key: "email", label: "Email", type: "email" }, { key: "password", label: "Password", type: "password", secret: true }], columns: ["name", "email"] }
};
const title = (key) => key.replace(/Id$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase());
const display = (value) => {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "object") return value.label || value.name || value.courseCode || value._id || JSON.stringify(value);
  const date = new Date(value);
  if (typeof value === "string" && !Number.isNaN(date.valueOf()) && /^\d{4}-\d\d-\d\d/.test(value)) return date.toLocaleString();
  return String(value);
};
const blank = (fields) => Object.fromEntries(fields.map(({ key }) => [key, ""]));

export const ManagementPage = () => {
  const { token, user, logout } = useAuth();
  const [resource, setResource] = useState("students");
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const config = resources[resource];

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [data, relationData] = await Promise.all([
        apiRequest(`/admin/${resource}?page=${page}&limit=25&search=${encodeURIComponent(search)}`, { token }),
        apiRequest(`/admin/${resource}/options`, { token })
      ]);
      setRecords(data.rows); setMeta({ total: data.total, pages: Math.max(1, data.pages) }); setOptions(relationData);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [resource, page, search, token]);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => { setEditing(null); setForm(blank(config.fields)); setError(""); };
  const startEdit = (row) => {
    const values = blank(config.fields);
    config.fields.forEach(({ key }) => {
      if (key === "password") return;
      const value = row[key];
      values[key] = value && typeof value === "object" ? value._id || "" : value ?? "";
      if (["expiresAt", "timestamp"].includes(key) && value) values[key] = new Date(value).toISOString().slice(0, 16);
    });
    setEditing(row); setForm(values); setError("");
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    const body = { ...form };
    config.fields.forEach(({ key, type, secret }) => {
      if (secret && !body[key]) delete body[key];
      if (type === "number" && body[key] !== "") body[key] = Number(body[key]);
      if (type === "boolean") body[key] = body[key] === true || body[key] === "true";
      if (type === "datetime-local" && body[key]) body[key] = new Date(body[key]).toISOString();
      if (body[key] === "" && key !== "password") body[key] = null;
    });
    try {
      await apiRequest(editing ? `/admin/${resource}/${editing._id}` : `/admin/${resource}`, { token, method: editing ? "PATCH" : "POST", body });
      setForm(null); setNotice(`${config.label.slice(0, -1)} ${editing ? "updated" : "created"}.`); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete this ${config.label.slice(0, -1).toLowerCase()}? Related records may also be deleted.`)) return;
    setError(""); setNotice("");
    try { await apiRequest(`/admin/${resource}/${row._id}`, { token, method: "DELETE" }); setNotice("Record deleted."); await load(); }
    catch (err) { setError(err.message); }
  };
  const cellValue = (key, row) => {
    if (["lecturerId", "courseId", "studentId", "sessionId"].includes(key)) {
      const related = (options[key] || []).find((option) => String(option.value) === String(row[key]));
      if (related) return related.label;
    }
    return display(row[key]);
  };
  const headings = config.columns;

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-brand"><span className="admin-brand__mark">AH</span><div><strong>Attendance HQ</strong><small>Platform administration</small></div></div>
      <nav className="admin-nav" aria-label="Management resources">{Object.entries(resources).map(([key, item]) => <button key={key} className={resource === key ? "is-active" : ""} onClick={() => { setResource(key); setPage(1); setForm(null); setNotice(""); }}>{item.label}<span>{key === resource ? meta.total : ""}</span></button>)}</nav>
      <div className="admin-account"><span className="admin-avatar">{(user?.name || "A").slice(0, 1).toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
      <button className="admin-logout" onClick={logout}>Sign out</button>
    </aside>
    <main className="admin-main">
      <header className="admin-header"><div><p className="admin-kicker">SYSTEM CONTROL</p><h1>Management</h1><p>Manage accounts, courses, live sessions, and attendance records.</p></div><button className="admin-primary" onClick={startCreate}>＋ Add {config.label.slice(0, -1)}</button></header>
      <section className="admin-content">
        <div className="admin-section-head"><div><h2>{config.label}</h2><span>{meta.total} total records</span></div><label className="admin-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={`Search ${config.label.toLowerCase()}…`} /></label></div>
        {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {error && !form && <div className="admin-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{headings.map((key) => <th key={key}>{title(key)}</th>)}<th className="admin-actions-head">Actions</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={headings.length + 1} className="admin-empty">Loading records…</td></tr> : records.length ? records.map((row) => <tr key={row._id}>{headings.map((key) => <td key={key}>{key === "isActive" ? <span className={`admin-status ${row[key] ? "is-on" : "is-off"}`}>{display(row[key])}</span> : <span title={cellValue(key, row)}>{cellValue(key, row)}</span>}</td>)}<td className="admin-actions"><button onClick={() => startEdit(row)}>Edit</button><button className="is-delete" onClick={() => remove(row)} disabled={resource === "admins" && row._id === user?.id}>Delete</button></td></tr>) : <tr><td colSpan={headings.length + 1} className="admin-empty">No {config.label.toLowerCase()} found.</td></tr>}
        </tbody></table></div>
        <div className="admin-pagination"><span>Page {page} of {meta.pages}</span><div><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={page >= meta.pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
      </section>
      {form && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setForm(null); }}><form className="admin-modal" onSubmit={save}>
        <header><div><p className="admin-kicker">{editing ? "UPDATE RECORD" : "NEW RECORD"}</p><h2>{editing ? `Edit ${config.label.slice(0, -1)}` : `Add ${config.label.slice(0, -1)}`}</h2></div><button type="button" className="admin-close" onClick={() => setForm(null)} aria-label="Close">×</button></header>
        <div className="admin-form-grid">{config.fields.map(({ key, label, type = "text", relation, optional, secret }) => <label key={key} className={key === "courseTitle" ? "span-two" : ""}>{label}{relation ? <select required={!optional} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option value="">Select {label.toLowerCase()}</option>{(options[key] || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : type === "boolean" ? <select value={String(form[key] === true || form[key] === "true")} onChange={(e) => setForm({ ...form, [key]: e.target.value })}><option value="true">Active</option><option value="false">Inactive</option></select> : <input type={type} min={type === "number" ? 0 : undefined} required={!optional && !(secret && editing)} value={form[key] ?? ""} placeholder={secret && editing ? "Leave blank to keep current password" : ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>)}</div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <footer><button type="button" className="admin-cancel" onClick={() => setForm(null)}>Cancel</button><button className="admin-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create record"}</button></footer>
      </form></div>}
    </main>
  </div>;
};
