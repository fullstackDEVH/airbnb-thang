import express from "express";

import userRouter from "./user.route.js";
import storeRouter from "./store.route.js";
import reviewRouter from "./reivew.route.js";

const router = express.Router();

router.use("/api/users", userRouter);
router.use("/api/stores", storeRouter);
router.use("/api/reviews", reviewRouter);

export default router;
