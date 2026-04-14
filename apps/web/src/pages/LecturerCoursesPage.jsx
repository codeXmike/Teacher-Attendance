import { useMemo, useState } from "react";
import { apiRequest } from "../api/client";
import { LecturerShell } from "../components/LecturerShell";
import { useAuth } from "../context/AuthContext";
import { useLecturerWorkspace } from "../hooks/useLecturerWorkspace";

export const LecturerCoursesPage = () => {
  const { token, user, logout } = useAuth();
  const { courses, selectedCourseId, setSelectedCourseId, error, setError, setCourses } = useLecturerWorkspace(token);
  const [form, setForm] = useState({ courseCode: "", courseTitle: "" });
  const [saving, setSaving] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((c) => c._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const createCourse = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const course = await apiRequest("/courses", { method: "POST", token, body: form });
      setCourses((curr) => [...curr, course].sort((a, b) => a.courseCode.localeCompare(b.courseCode)));
      setSelectedCourseId(course._id);
      setForm({ courseCode: "", courseTitle: "" });
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LecturerShell user={user} onLogout={logout} title="Courses">
      {error && <div className="shell-banner shell-banner--error">{error}</div>}

      <div className="page-courses">
        <div className="pane pane--list">
          <div className="pane__head">
            <span className="pane__title">All courses</span>
            <span className="badge">{courses.length}</span>
          </div>
          <div className="course-list">
            {courses.length === 0 && <p className="empty-hint">No courses yet. Add one →</p>}
            {courses.map((course) => (
              <button
                key={course._id}
                className={`course-row ${selectedCourseId === course._id ? "course-row--active" : ""}`}
                onClick={() => setSelectedCourseId(course._id)}
              >
                <span className="course-row__code">{course.courseCode}</span>
                <span className="course-row__title">{course.courseTitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pane-stack">
          <div className="pane">
            <div className="pane__head">
              <span className="pane__title">New course</span>
            </div>
            <form className="form-block" onSubmit={createCourse}>
              <div className="field">
                <label className="field__label">Course code</label>
                <input
                  className="field__input"
                  value={form.courseCode}
                  onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value }))}
                  placeholder="CSC 401"
                />
              </div>
              <div className="field">
                <label className="field__label">Course title</label>
                <input
                  className="field__input"
                  value={form.courseTitle}
                  onChange={(e) => setForm((f) => ({ ...f, courseTitle: e.target.value }))}
                  placeholder="Distributed Systems"
                />
              </div>
              <button className="btn btn--primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save course"}
              </button>
            </form>
          </div>

          {selectedCourse && (
            <div className="pane">
              <div className="pane__head">
                <span className="pane__title">Selected</span>
              </div>
              <div className="course-detail">
                <span className="course-detail__code">{selectedCourse.courseCode}</span>
                <span className="course-detail__title">{selectedCourse.courseTitle}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </LecturerShell>
  );
};