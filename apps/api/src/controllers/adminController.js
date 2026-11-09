import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Admin } from "../models/Admin.js";
import { Attendance } from "../models/Attendance.js";
import { Course } from "../models/Course.js";
import { Lecturer } from "../models/Lecturer.js";
import { Session } from "../models/Session.js";
import { Student } from "../models/Student.js";
import { HttpError } from "../utils/errors.js";
import { generateSecureToken, hashToken } from "../utils/crypto.js";

const entities = {
  students: { model: Student, fields: ["name", "matricNo", "deviceId", "password"], search: ["name", "matricNo"] },
  lecturers: { model: Lecturer, fields: ["name", "email", "password"], search: ["name", "email"] },
  courses: { model: Course, fields: ["lecturerId", "courseCode", "courseTitle"], search: ["courseCode", "courseTitle"] },
  sessions: { model: Session, fields: ["courseId", "lecturerId", "rotationIntervalSeconds", "studentLimit", "isActive", "expiresAt"], search: [] },
  attendance: { model: Attendance, fields: ["lecturerId", "studentId", "sessionId", "timestamp"], search: [] },
  admins: { model: Admin, fields: ["name", "email", "password"], search: ["name", "email"] }
};

const relations = {
  students: [], lecturers: [],
  courses: [{ path: "lecturerId", model: Lecturer, label: "name" }],
  sessions: [{ path: "courseId", model: Course, label: "courseCode" }, { path: "lecturerId", model: Lecturer, label: "name" }],
  attendance: [{ path: "lecturerId", model: Lecturer, label: "name" }, { path: "studentId", model: Student, label: "name" }, { path: "sessionId", model: Session, label: "_id" }],
  admins: []
};
const hidden = { students: ["passwordHash"], lecturers: ["passwordHash"], admins: ["passwordHash"], sessions: ["tokenHash", "tokenValue"] };
const getEntity = (key) => {
  const entity = entities[key];
  if (!entity) throw new HttpError(404, "Unknown management resource");
  return entity;
};
const clean = (doc, entity) => {
  const value = doc.toObject ? doc.toObject() : doc;
  for (const key of hidden[entity] || []) delete value[key];
  return value;
};
const safePayload = (body, entity, creating) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "A record payload is required");
  const config = getEntity(entity);
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "password") {
      if (value) {
        if (typeof value !== "string" || value.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
        result.passwordHash = bcrypt.hashSync(value, 10);
      } else if (creating && ["students", "lecturers", "admins"].includes(entity)) throw new HttpError(400, "Password is required");
      continue;
    }
    if (!config.fields.includes(key)) throw new HttpError(400, `Field '${key}' cannot be changed`);
    if (["name", "matricNo", "courseCode", "courseTitle", "email"].includes(key) && typeof value === "string") {
      const trimmed = value.trim();
      result[key] = key === "email" ? trimmed.toLowerCase() : key === "courseCode" ? trimmed.toUpperCase() : trimmed;
    } else result[key] = value === "" ? null : value;
  }
  if (entity === "sessions" && creating) {
    const token = generateSecureToken();
    result.tokenHash = hashToken(token);
    result.isActive ??= true;
  }
  
  if (result.name !== undefined && (!result.name || result.name.length > 100)) throw new HttpError(400, "Name is required and must be 100 characters or fewer");
  if (result.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new HttpError(400, "A valid email address is required");
  if (result.matricNo !== undefined && !result.matricNo) throw new HttpError(400, "Registration number is required");
  if (result.courseCode !== undefined && !result.courseCode) throw new HttpError(400, "Course code is required");
  if (result.courseTitle !== undefined && !result.courseTitle) throw new HttpError(400, "Course title is required");
  if (result.rotationIntervalSeconds !== undefined && (!Number.isInteger(Number(result.rotationIntervalSeconds)) || Number(result.rotationIntervalSeconds) < 1)) throw new HttpError(400, "QR rotation must be a positive whole number");
  if (result.studentLimit !== undefined && (!Number.isInteger(Number(result.studentLimit)) || Number(result.studentLimit) < 0)) throw new HttpError(400, "Student limit must be a non-negative whole number");
  return result;
};
const validateRelations = async (entity, payload) => {
  for (const relation of relations[entity] || []) {
    if (payload[relation.path] == null) continue;
    if (!mongoose.isValidObjectId(payload[relation.path]) || !(await relation.model.exists({ _id: payload[relation.path] }))) {
      throw new HttpError(400, `A valid ${relation.path} is required`);
    }
  }
  if (entity === "sessions" && payload.courseId && payload.lecturerId) {
    if (!(await Course.exists({ _id: payload.courseId, lecturerId: payload.lecturerId }))) throw new HttpError(400, "The selected course does not belong to the selected lecturer");
  }
  if (entity === "attendance" && payload.sessionId && payload.studentId) {
    const session = await Session.findById(payload.sessionId).select("lecturerId").lean();
    if (!session) throw new HttpError(400, "A valid sessionId is required");
    if (payload.lecturerId && String(payload.lecturerId) !== String(session.lecturerId)) throw new HttpError(400, "The selected lecturer does not own the selected session");
    const student = await Student.findById(payload.studentId).select("_id").lean();
    if (!student) throw new HttpError(400, "A valid studentId is required");
    payload.lecturerId = session.lecturerId;
  }
};

export const listRecords = async (req, res) => {
  const config = getEntity(req.params.entity);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const search = String(req.query.search || "").trim().slice(0, 100);
  const query = search && config.search.length ? { $or: config.search.map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })) } : {};
  const [rows, total] = await Promise.all([
    config.model.find(query).select((hidden[req.params.entity] || []).map((field) => `-${field}`).join(" ")).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    config.model.countDocuments(query)
  ]);
  res.json({ rows: rows.map((row) => clean(row, req.params.entity)), page, limit, total, pages: Math.ceil(total / limit) });
};

export const relationOptions = async (req, res) => {
  getEntity(req.params.entity);
  const options = {};
  for (const relation of relations[req.params.entity] || []) {
    const docs = await relation.model.find().select(`${relation.label} ${relation.label === "_id" ? "" : "_id"}`).sort({ createdAt: -1 }).limit(500).lean();
    options[relation.path] = docs.map((doc) => ({ value: doc._id, label: relation.label === "_id" ? String(doc._id) : `${doc[relation.label]} · ${doc._id}` }));
  }
  res.json(options);
};

export const createRecord = async (req, res) => {
  const payload = safePayload(req.body, req.params.entity, true);
  await validateRelations(req.params.entity, payload);
  try {
    const created = await getEntity(req.params.entity).model.create(payload);
    res.status(201).json(clean(created, req.params.entity));
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "A record with those unique details already exists");
    throw error;
  }
};

export const updateRecord = async (req, res) => {
  const { entity, id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid record ID");
  const payload = safePayload(req.body, entity, false);
  if (!Object.keys(payload).length) throw new HttpError(400, "No changes provided");
  const config = getEntity(entity);
  const current = await config.model.findById(id).lean();
  if (!current) throw new HttpError(404, "Record not found");
  await validateRelations(entity, { ...current, ...payload });
  try {
    if (entity === "admins" && id === req.auth.id && payload.email && payload.email.toLowerCase() !== req.auth.email) throw new HttpError(400, "You cannot change your own email while signed in");
    const updated = await config.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true, context: "query" });
    if (!updated) throw new HttpError(404, "Record not found");
    res.json(clean(updated, entity));
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "A record with those unique details already exists");
    throw error;
  }
};

const cascadeDelete = async (entity, id) => {
  if (entity === "students") await Attendance.deleteMany({ studentId: id });
  if (entity === "admins") {
    if (await Admin.countDocuments() <= 1) throw new HttpError(409, "The last administrator cannot be deleted");
  }
  if (entity === "attendance") return Attendance.findByIdAndDelete(id);
  if (entity === "sessions") { await Attendance.deleteMany({ sessionId: id }); return Session.findByIdAndDelete(id); }
  if (entity === "courses") {
    const sessions = await Session.find({ courseId: id }).select("_id");
    const sessionIds = sessions.map((session) => session._id);
    await Attendance.deleteMany({ sessionId: { $in: sessionIds } });
    await Session.deleteMany({ courseId: id });
    return Course.findByIdAndDelete(id);
  }
  if (entity === "lecturers") {
    const courses = await Course.find({ lecturerId: id }).select("_id");
    const sessions = await Session.find({ lecturerId: id }).select("_id");
    const courseIds = courses.map((course) => course._id);
    const sessionIds = sessions.map((session) => session._id);
    await Attendance.deleteMany({ $or: [{ lecturerId: id }, { sessionId: { $in: sessionIds } }] });
    await Session.deleteMany({ $or: [{ lecturerId: id }, { courseId: { $in: courseIds } }] });
    await Course.deleteMany({ lecturerId: id });
    return Lecturer.findByIdAndDelete(id);
  }
  return getEntity(entity).model.findByIdAndDelete(id);
};

export const deleteRecord = async (req, res) => {
  const { entity, id } = req.params;
  getEntity(entity);
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "Invalid record ID");
  if (entity === "admins" && id === req.auth.id) throw new HttpError(400, "You cannot delete your own administrator account");
  const deleted = await cascadeDelete(entity, id);
  if (!deleted) throw new HttpError(404, "Record not found");
  res.json({ success: true });
};
