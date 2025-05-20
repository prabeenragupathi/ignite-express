import mongoose from "mongoose";

export const useTransaction = (fn) => async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    await fn(req, res, next, session);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    await session.endSession();
  }
};
