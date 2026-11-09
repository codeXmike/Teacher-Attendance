import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createRecord, deleteRecord, listRecords, relationOptions, updateRecord } from "../controllers/adminController.js";

export const adminRoutes = Router();
adminRoutes.use(authenticate(["admin"]));
adminRoutes.get("/:entity/options", asyncHandler(relationOptions));
adminRoutes.get("/:entity", asyncHandler(listRecords));
adminRoutes.post("/:entity", asyncHandler(createRecord));
adminRoutes.patch("/:entity/:id", asyncHandler(updateRecord));
adminRoutes.delete("/:entity/:id", asyncHandler(deleteRecord));
