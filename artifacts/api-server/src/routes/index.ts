import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import botsRouter from "./bots.js";
import logsRouter from "./logs.js";
import creditsRouter from "./credits.js";
import domainsRouter, { domainOrdersRouter, adminDomainOrdersRouter } from "./domains.js";
import hostingRouter from "./hosting.js";
import adminRouter from "./admin.js";
import subscriptionRouter from "./subscription.js";
import supportRouter from "./support.js";
import keepaliveRouter from "./keepalive.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keepaliveRouter);
router.use("/auth", authRouter);
router.use("/bots", botsRouter);
router.use("/logs", logsRouter);
router.use("/credits", creditsRouter);
router.use("/domains", domainsRouter);
router.use("/domain-orders", domainOrdersRouter);
router.use("/admin/domain-orders", adminDomainOrdersRouter);
router.use("/hosting", hostingRouter);
router.use("/admin", adminRouter);
router.use("/subscription", subscriptionRouter);
router.use("/support", supportRouter);

export default router;
