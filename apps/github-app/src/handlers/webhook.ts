/**
 * Webhook Handlers for PR Events
 */

import type { PullRequestEvent, WorkspaceInfo } from '../types/index.js';
import { workspaceStorage } from '../services/storage.js';
import { createDaytonaService } from '../services/daytona.js';
import { createGitHubService } from '../services/github.js';

interface HandlerContext {
  daytonaService: ReturnType<typeof createDaytonaService>;
  githubService: ReturnType<typeof createGitHubService>;
}

export class PRWebhookHandler {
  private context: HandlerContext;

  constructor() {
    this.context = {
      daytonaService: createDaytonaService(),
      githubService: createGitHubService(),
    };
  }

  /**
   * Handle PR opened event
   */
  async handlePROpened(event: PullRequestEvent): Promise<void> {
    const { pull_request, repository } = event;
    const { owner, name: repo } = repository;
    const prNumber = pull_request.number;

    console.log(`[Webhook] PR #${prNumber} opened in ${repository.full_name}`);

    // Check if workspace already exists
    const existingWorkspace = workspaceStorage.getWorkspaceByPR(
      repository.full_name,
      prNumber
    );

    if (existingWorkspace) {
      console.log(`[Webhook] Workspace already exists for PR #${prNumber}, skipping...`);
      return;
    }

    // Get repository clone URL
    const cloneUrl = pull_request.head.repo.clone_url;

    // Create Daytona workspace
    try {
      const workspace = await this.context.daytonaService.createWorkspace(
        cloneUrl,
        pull_request.head.ref,
        prNumber,
        repository.full_name
      );

      console.log(`[Webhook] Created workspace ${workspace.id} for PR #${prNumber}`);

      // Wait for workspace to be ready
      const readyWorkspace = await this.context.daytonaService.waitForReady(
        workspace.id
      );

      if (readyWorkspace && readyWorkspace.previewUrl) {
        // Post preview URL comment
        await this.context.githubService.postPreviewComment(
          owner.login,
          repo,
          prNumber,
          readyWorkspace.previewUrl,
          workspace.id
        );

        console.log(`[Webhook] Posted preview URL for PR #${prNumber}`);
      } else {
        console.error(`[Webhook] Failed to get preview URL for PR #${prNumber}`);
      }
    } catch (error) {
      console.error(`[Webhook] Failed to handle PR #${prNumber} opened:`, error);
      throw error;
    }
  }

  /**
   * Handle PR synchronize (new commits) event
   */
  async handlePRSynchronize(event: PullRequestEvent): Promise<void> {
    const { pull_request, repository } = event;
    const { owner, name: repo } = repository;
    const prNumber = pull_request.number;

    console.log(`[Webhook] PR #${prNumber} synchronized in ${repository.full_name}`);

    // Check for existing workspace
    const existingWorkspace = workspaceStorage.getWorkspaceByPR(
      repository.full_name,
      prNumber
    );

    if (!existingWorkspace) {
      console.log(`[Webhook] No existing workspace for PR #${prNumber}, creating new one...`);
      return this.handlePROpened(event);
    }

    // Delete old workspace
    console.log(`[Webhook] Deleting old workspace ${existingWorkspace.id}`);
    await this.context.daytonaService.deleteWorkspace(existingWorkspace.id);

    // Create new workspace with updated code
    try {
      const cloneUrl = pull_request.head.repo.clone_url;

      const workspace = await this.context.daytonaService.createWorkspace(
        cloneUrl,
        pull_request.head.ref,
        prNumber,
        repository.full_name
      );

      console.log(`[Webhook] Created new workspace ${workspace.id} for PR #${prNumber}`);

      // Wait for workspace to be ready
      const readyWorkspace = await this.context.daytonaService.waitForReady(
        workspace.id
      );

      if (readyWorkspace && readyWorkspace.previewUrl) {
        // Find and update existing comment, or create new one
        const botLogin = await this.context.githubService.getBotLogin();
        const existingComment = await this.context.githubService.findExistingPreviewComment(
          owner.login,
          repo,
          prNumber,
          botLogin
        );

        if (existingComment) {
          await this.context.githubService.updatePreviewComment(
            owner.login,
            repo,
            existingComment.id,
            readyWorkspace.previewUrl,
            workspace.id
          );
        } else {
          await this.context.githubService.postPreviewComment(
            owner.login,
            repo,
            prNumber,
            readyWorkspace.previewUrl,
            workspace.id
          );
        }

        console.log(`[Webhook] Updated preview URL for PR #${prNumber}`);
      }
    } catch (error) {
      console.error(`[Webhook] Failed to handle PR #${prNumber} synchronize:`, error);
      throw error;
    }
  }

  /**
   * Handle PR closed/merged event
   */
  async handlePRClosed(event: PullRequestEvent): Promise<void> {
    const { pull_request, repository } = event;
    const { owner, name: repo } = repository;
    const prNumber = pull_request.number;

    console.log(`[Webhook] PR #${prNumber} closed in ${repository.full_name}`);

    // Check for existing workspace
    const workspace = workspaceStorage.getWorkspaceByPR(
      repository.full_name,
      prNumber
    );

    if (!workspace) {
      console.log(`[Webhook] No workspace to clean up for PR #${prNumber}`);
      return;
    }

    // Delete Daytona workspace
    await this.context.daytonaService.deleteWorkspace(workspace.id);

    // Post cleanup comment
    await this.context.githubService.postCleanupComment(
      owner.login,
      repo,
      prNumber,
      workspace.id
    );

    console.log(`[Webhook] Cleaned up workspace for PR #${prNumber}`);
  }

  /**
   * Handle PR reopened event
   */
  async handlePRReopened(event: PullRequestEvent): Promise<void> {
    console.log(`[Webhook] PR #${event.pull_request.number} reopened`);
    // Re-create workspace as if it was newly opened
    await this.handlePROpened(event);
  }

  /**
   * Dispatch handler based on event action
   */
  async handleEvent(event: PullRequestEvent): Promise<void> {
    const { action } = event;

    console.log(`[Webhook] Received pull_request event: ${action}`);

    switch (action) {
      case 'opened':
        await this.handlePROpened(event);
        break;

      case 'synchronize':
        await this.handlePRSynchronize(event);
        break;

      case 'closed':
        await this.handlePRClosed(event);
        break;

      case 'reopened':
        await this.handlePRReopened(event);
        break;

      default:
        console.log(`[Webhook] Ignoring pull_request action: ${action}`);
    }
  }
}

// Export singleton instance
export const prWebhookHandler = new PRWebhookHandler();
