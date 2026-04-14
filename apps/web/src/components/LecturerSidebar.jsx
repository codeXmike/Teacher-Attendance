export const LecturerSidebar = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  createCourseForm,
  setCreateCourseForm,
  onCreateCourse,
  user,
  onLogout
}) => (
  <aside className="sidebar">
    <div className="brand-block card">
      <div>
        <p className="eyebrow">Lecturer Console</p>
        <h2>Attendance HQ</h2>
      </div>
      <p className="muted">Manage courses, rotate QR sessions, and monitor live check-ins.</p>
    </div>

    <div className="card sidebar-card">
      <div className="section-head">
        <span>Workspace</span>
      </div>
      <div className="sidebar__identity">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
      <button className="ghost-button" onClick={onLogout}>
        Logout
      </button>
    </div>

    <div className="card sidebar-card">
      <div className="section-head">
        <span>Courses</span>
        <span className="pill">{courses.length}</span>
      </div>
      <div className="course-list course-list--cards">
        {courses.map((course) => (
          <button
            key={course._id}
            className={`course-tile ${selectedCourseId === course._id ? "is-selected" : ""}`}
            onClick={() => onSelectCourse(course._id)}
          >
            <strong>{course.courseCode}</strong>
            <small>{course.courseTitle}</small>
          </button>
        ))}
        {courses.length === 0 ? <span className="muted">No courses yet.</span> : null}
      </div>
    </div>

    <form className="card sidebar-card" onSubmit={onCreateCourse}>
      <div className="section-head">
        <span>New Course</span>
      </div>
      <label>
        <span>Code</span>
        <input
          value={createCourseForm.courseCode}
          onChange={(event) =>
            setCreateCourseForm((current) => ({ ...current, courseCode: event.target.value }))
          }
          placeholder="CSC401"
        />
      </label>
      <label>
        <span>Title</span>
        <input
          value={createCourseForm.courseTitle}
          onChange={(event) =>
            setCreateCourseForm((current) => ({ ...current, courseTitle: event.target.value }))
          }
          placeholder="Distributed Systems"
        />
      </label>
      <button type="submit">Add Course</button>
    </form>
  </aside>
);
