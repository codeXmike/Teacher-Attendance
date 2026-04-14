import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

const STORAGE_KEY = "lecturer-selected-course";

export const useLecturerWorkspace = (token) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setSelectedCourseId = (value) => {
    setSelectedCourseIdState(value);
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/courses", { token });
      setCourses(data);
      if (data.length === 0) {
        setSelectedCourseId("");
      } else if (!data.some((course) => course._id === selectedCourseId)) {
        setSelectedCourseId(data[0]._id);
      }
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [token]);

  return {
    courses,
    selectedCourseId,
    setSelectedCourseId,
    loading,
    error,
    setError,
    setCourses,
    reloadCourses: loadCourses
  };
};
