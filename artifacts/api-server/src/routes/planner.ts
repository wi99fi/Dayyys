import { getAuth } from "@clerk/express";
import { SavePlannerEventsBody, SavePlannerShoppingBody, SavePlannerTasksBody } from "@workspace/api-zod";
import { db, plannerCollections } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";

const router: IRouter = Router();
const collectionNames = ["events", "tasks", "shopping"] as const;
type CollectionName = (typeof collectionNames)[number];

const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.locals.userId = userId;
  next();
};

router.use(requireAuth);

router.get("/planner", async (req, res) => {
  const userId = String(res.locals.userId);
  try {
    const rows = await db
      .select()
      .from(plannerCollections)
      .where(eq(plannerCollections.userId, userId));
    const collections = new Map(rows.map((row) => [row.collection, row.items]));
    res.json({
      events: collections.get("events") ?? [],
      tasks: collections.get("tasks") ?? [],
      shopping: collections.get("shopping") ?? [],
    });
  } catch (error) {
    req.log.error({ err: error }, "Unable to load planner data");
    res.status(500).json({ error: "Unable to load planner data" });
  }
});

async function saveCollection(
  userId: string,
  collection: CollectionName,
  items: unknown[],
) {
  await db
    .insert(plannerCollections)
    .values({ userId, collection, items, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [plannerCollections.userId, plannerCollections.collection],
      set: { items, updatedAt: new Date() },
    });
}

router.put("/planner/events", async (req, res) => {
  const parsed = SavePlannerEventsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid appointment data" });
    return;
  }
  try {
    const userId = String(res.locals.userId);
    await saveCollection(userId, "events", req.body.items);
    res.json({ items: req.body.items });
  } catch (error) {
    req.log.error({ err: error }, "Unable to save appointments");
    res.status(500).json({ error: "Unable to save appointments" });
  }
});

router.put("/planner/tasks", async (req, res) => {
  const parsed = SavePlannerTasksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid task data" });
    return;
  }
  try {
    const userId = String(res.locals.userId);
    await saveCollection(userId, "tasks", req.body.items);
    res.json({ items: req.body.items });
  } catch (error) {
    req.log.error({ err: error }, "Unable to save tasks");
    res.status(500).json({ error: "Unable to save tasks" });
  }
});

router.put("/planner/shopping", async (req, res) => {
  const parsed = SavePlannerShoppingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid shopping data" });
    return;
  }
  try {
    const userId = String(res.locals.userId);
    await saveCollection(userId, "shopping", req.body.items);
    res.json({ items: req.body.items });
  } catch (error) {
    req.log.error({ err: error }, "Unable to save shopping list");
    res.status(500).json({ error: "Unable to save shopping list" });
  }
});

export default router;