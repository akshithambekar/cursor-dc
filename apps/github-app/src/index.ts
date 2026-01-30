/**
 * PR Preview Studio - GitHub App
 *
 * A GitHub App that automatically spins up live preview environments
 * for pull requests using Daytona sandboxes.
 */

import { Probot } from 'probot';
import dotenv from 'dotenv';
import { prWebhookHandler } from './handlers/webhook.js';

// Load environment variables
dotenv.config();

interface AppConfig {
  appId: number;
  privateKey: string;
  webhookSecret: string;
  port: number;
  env: string;
}

function getConfig(): AppConfig {
  return {
    appId: parseInt(process.env.GITHUB_APP_ID || '0', 10),
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    port: parseInt(process.env.PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  };
}

async function run(): Promise<void> {
  const config = getConfig();

  // Validate required configuration
  if (!config.appId || !config.privateKey || !config.webhookSecret) {
    console.error('Error: Missing required environment variables');
    console.error('Required: GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET');
    process.exit(1);
  }

  console.log('Starting PR Preview Studio GitHub App...');
  console.log(`Environment: ${config.env}`);
  console.log(`App ID: ${config.appId}`);

  // Create Probot app
  const probot = new Probot({
    appId: config.appId,
    privateKey: config.privateKey,
    secret: config.webhookSecret,
  });

  // Load the app - register event handlers
  probot.load((app) => {
    // PR opened event
    app.on('pull_request.opened', async (context) => {
      console.log('Received pull_request.opened event');
      await prWebhookHandler.handleEvent(context.payload as any);
    });

    // PR synchronize (new commits) event
    app.on('pull_request.synchronize', async (context) => {
      console.log('Received pull_request.synchronize event');
      await prWebhookHandler.handleEvent(context.payload as any);
    });

    // PR closed event
    app.on('pull_request.closed', async (context) => {
      console.log('Received pull_request.closed event');
      await prWebhookHandler.handleEvent(context.payload as any);
    });

    // PR reopened event
    app.on('pull_request.reopened', async (context) => {
      console.log('Received pull_request.reopened event');
      await prWebhookHandler.handleEvent(context.payload as any);
    });

    // Generic pull_request event handler for any action
    app.on('pull_request', async (context) => {
      console.log(`Received pull_request event: ${context.payload.action}`);
    });
  });

  console.log('GitHub App is ready to receive events!');
  console.log(`Webhook endpoint: POST /api/github/webhook`);
}

// Run the application
run().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
