import { Hono } from "hono";
import { Webhooks } from "@octokit/webhooks";
import { createAppAuth } from "@octokit/auth-app";
import {Octokit} from "octokit"
import { Context } from "hono/jsx";

export async function createReviewComment(c: any, owner: string, repo: string, pullNumber: number, body: string) {
  console.log(owner, repo, pullNumber, body);


  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;
  const installationId = process.env.GITHUB_INSTALLATION_ID;

  if (!appId || !privateKey) {
    return c.json({
      error: "Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY environment variables",
    }, 500);
  }

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: parseInt(appId, 10),
      privateKey: privateKey,
      ...(installationId && { installationId: parseInt(installationId, 10) }),
    },
  });

  try {
    const authentication = await octokit.auth({
      type: installationId ? "installation" : "app",
    }) as {
      type: string;
      appId?: number;
      installationId?: number;
    };

    console.log("Authenticated successfully:", authentication.type);

    const { data: appData } = await octokit.request("GET /app");

    if (!appData) {
      return c.json({
        error: "Failed to retrieve app data",
      }, 500);
    }

    console.log(`Authenticated as GitHub App: ${appData.slug}`);

    const { data: comment } = await octokit.rest.issues.createComment({
      owner: owner,
      repo: repo,
      issue_number: pullNumber,
      body: body,
      // commit_id: "", // Optional for general comments
      // path: "", // Optional for general comments
    });

    console.log(`Created review comment on PR #${pullNumber}: ${comment.id}`);

    return c.json({
      ok: true,
      message: "Review comment created successfully",
      commentId: comment.id,
      commentUrl: comment.html_url,
    });
  } catch (error) {
    console.error("Error creating review comment:", error);
    return c.json({
      error: "Failed to create review comment",
    }, 500);
  }
}

