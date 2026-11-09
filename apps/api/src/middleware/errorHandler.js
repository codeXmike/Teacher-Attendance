export const errorHandler = (error, _req, res, _next) => {
  const status = error.status || (error.name === "ValidationError" || error.name === "CastError" ? 400 : error.code === 11000 ? 409 : 500);
  const message = status === 500 ? "Internal server error" : error.code === 11000 ? "A record with those unique details already exists" : error.message;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ message });
};
