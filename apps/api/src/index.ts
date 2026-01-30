import { Hono } from "hono";
import { Webhooks } from "@octokit/webhooks";
import { createAppAuth } from "@octokit/auth-app";
import {Octokit} from "octokit"
import { createReviewComment } from "./lib/github.js";
import { createOpenCodeSession } from "./lib/daytona.js";

const app = new Hono();

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

const webhooks = new Webhooks({
  secret: webhookSecret,
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
      // case "opened":
      //   const user = payload.pull_request?.head?.repo?.owner?.login
      //   const repo = payload.pull_request?.head?.repo?.name

      //   await createReviewComment(c, user, repo, prNumber, "Generating preview...");

      //   const {previewUrl} = await createOpenCodeSession({
      //     "repoUrl": `https://github.com/${user}/${repo}.git`,
      //     "branch": payload.pull_request?.head?.ref,
      //     "name": `pr-${prNumber}`,
      //     "public": true,
      //     "autoStopInterval": 30,
      //   })

      //   await createReviewComment(c, user, repo, prNumber, "Preview generated successfully!: " + previewUrl);

      //   break;
      case "reopened":
        const user = payload.pull_request?.head?.repo?.owner?.login
        const repo = payload.pull_request?.head?.repo?.name

        await createReviewComment(c, user, repo, prNumber, "Generating preview...");

        const {previewUrl} = await createOpenCodeSession({
          "repoUrl": `https://github.com/${user}/${repo}.git`,
          "branch": payload.pull_request?.head?.ref,
          "name": `pr-${prNumber}`,
          "public": true,
          "autoStopInterval": 30,
        })

        await createReviewComment(c, user, repo, prNumber, "Preview generated successfully!: " + previewUrl);

        break;
    }
  }

  return c.json({ ok: true, event, deliveryId });
});

export default {
  port: 3001,
  fetch: app.fetch,
};
