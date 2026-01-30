/**
 * Daytona API Service
 * Handles integration with Daytona for creating and managing workspaces
 */

import axios, { AxiosInstance } from 'axios';
import type {
  DaytonaCreateWorkspaceRequest,
  DaytonaWorkspaceResponse,
  WorkspaceInfo,
} from '../types/index.js';
import { workspaceStorage } from './storage.js';

interface DaytonaConfig {
  apiUrl: string;
  apiKey: string;
  workspaceTemplate?: string;
}

export class DaytonaService {
  private client: AxiosInstance;
  private config: DaytonaConfig;

  constructor(config: DaytonaConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Create a new workspace for a PR
   */
  async createWorkspace(
    repoUrl: string,
    branch: string,
    prNumber: number,
    repoFullName: string
  ): Promise<WorkspaceInfo> {
    const workspaceId = `pr-preview-${repoFullName.replace('/', '-')}-${prNumber}-${Date.now()}`;

    // Create workspace entry in storage
    const workspace = workspaceStorage.createWorkspace(
      workspaceId,
      repoFullName,
      prNumber,
      branch
    );

    try {
      const request: DaytonaCreateWorkspaceRequest = {
        repoUrl,
        branch,
        template: this.config.workspaceTemplate,
        envVars: {
          PR_NUMBER: String(prNumber),
          REPO_FULL_NAME: repoFullName,
          BRANCH: branch,
        },
      };

      const response = await this.client.post<DaytonaWorkspaceResponse>(
        '/workspaces',
        request
      );

      const { id, previewUrl } = response.data;

      // Update workspace with Daytona ID and preview URL
      workspaceStorage.updateWorkspace(workspaceId, {
        status: previewUrl ? 'ready' : 'running',
        previewUrl,
      });

      console.log(`[Daytona] Workspace created: ${workspaceId}`);
      console.log(`[Daytona] Preview URL: ${previewUrl || 'pending'}`);

      return workspaceStorage.getWorkspaceById(workspaceId)!;
    } catch (error) {
      console.error('[Daytona] Failed to create workspace:', error);

      workspaceStorage.markWorkspaceError(workspaceId);

      throw new Error(`Failed to create Daytona workspace: ${error}`);
    }
  }

  /**
   * Get workspace status from Daytona
   */
  async getWorkspaceStatus(workspaceId: string): Promise<WorkspaceInfo | undefined> {
    try {
      const response = await this.client.get<DaytonaWorkspaceResponse>(
        `/workspaces/${workspaceId}`
      );

      const { previewUrl, status } = response.data;

      workspaceStorage.updateWorkspace(workspaceId, {
        status: status as WorkspaceInfo['status'],
        previewUrl,
      });

      return workspaceStorage.getWorkspaceById(workspaceId);
    } catch (error) {
      console.error(`[Daytona] Failed to get workspace status: ${workspaceId}`, error);
      return undefined;
    }
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      await this.client.delete(`/workspaces/${workspaceId}`);
      workspaceStorage.deleteWorkspace(workspaceId);
      console.log(`[Daytona] Workspace deleted: ${workspaceId}`);
      return true;
    } catch (error) {
      console.error(`[Daytona] Failed to delete workspace: ${workspaceId}`, error);
      return false;
    }
  }

  /**
   * Wait for workspace to be ready with preview URL
   */
  async waitForReady(
    workspaceId: string,
    maxAttempts: number = 30,
    intervalMs: number = 5000
  ): Promise<WorkspaceInfo | undefined> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const workspace = await this.getWorkspaceStatus(workspaceId);

      if (workspace) {
        if (workspace.status === 'ready' && workspace.previewUrl) {
          return workspace;
        }

        if (workspace.status === 'error') {
          console.error(`[Daytona] Workspace error: ${workspaceId}`);
          return undefined;
        }
      }

      console.log(`[Daytona] Waiting for workspace ready (attempt ${attempt + 1}/${maxAttempts})`);

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    console.error(`[Daytona] Timeout waiting for workspace ready: ${workspaceId}`);
    return undefined;
  }

  /**
   * Stop a workspace (preserve for potential reuse)
   */
  async stopWorkspace(workspaceId: string): Promise<boolean> {
    try {
      await this.client.post(`/workspaces/${workspaceId}/stop`);
      console.log(`[Daytona] Workspace stopped: ${workspaceId}`);
      return true;
    } catch (error) {
      console.error(`[Daytona] Failed to stop workspace: ${workspaceId}`, error);
      return false;
    }
  }

  /**
   * Start a stopped workspace
   */
  async startWorkspace(workspaceId: string): Promise<boolean> {
    try {
      await this.client.post(`/workspaces/${workspaceId}/start`);
      console.log(`[Daytona] Workspace started: ${workspaceId}`);
      return true;
    } catch (error) {
      console.error(`[Daytona] Failed to start workspace: ${workspaceId}`, error);
      return false;
    }
  }
}

// Export factory function for creating Daytona service instances
export function createDaytonaService(): DaytonaService {
  return new DaytonaService({
    apiUrl: process.env.DAYTONA_API_URL || 'https://api.daytona.io',
    apiKey: process.env.DAYTONA_API_KEY || '',
    workspaceTemplate: process.env.DAYTONA_WORKSPACE_TEMPLATE,
  });
}
