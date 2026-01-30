import { Hono } from "hono";
import { Webhooks } from "@octokit/webhooks";

const app = new Hono();

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

const webhooks = new Webhooks({
  secret: webhookSecret,
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/hello", (c) => {
  return c.json({
    ok: true,
    message: "Hello Hono!",
  });
});

app.post("/api/webhooks", async (c) => {
  const event = c.req.header("x-github-event");
  const deliveryId = c.req.header("x-github-delivery");
  const signature = c.req.header("x-hub-signature-256");
  const body = await c.req.text();

  if (!event || !signature || !body) {
    return c.json({ error: "Missing required headers or body" }, 400);
  }

  try {
    await webhooks.verify(body, signature);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return c.json({ error: "Invalid signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    console.error("Failed to parse webhook payload:", error);
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  console.log(`Received GitHub webhook: ${event} (delivery: ${deliveryId})`);

  if (event === "pull_request") {
    const action = payload.action;
    const prNumber = payload.pull_request?.number;
    const title = payload.pull_request?.title;
    const author = payload.pull_request?.user?.login;

    console.log(`Pull request #${prNumber}: ${title} (${action}) by ${author}`);

    switch (action) {
      case "opened":
        console.log(`New pull request #${prNumber} opened by ${author}`);
        break;
      case "closed":
        const merged = payload.pull_request?.merged;
        console.log(`Pull request #${prNumber} closed (merged: ${merged})`);
        break;
      case "reopened":
        console.log(`Pull request #${prNumber} reopened`);
        break;
      case "synchronize":
        console.log(`Pull request #${prNumber} updated with new commits`);
        break;
      default:
        console.log(`Pull request #${prNumber} action: ${action}`);
    }
  }

  return c.json({ ok: true, event, deliveryId });
});

export default {
  port: 3001,
  fetch: app.fetch,
};
