/**
 * In-memory storage for workspace-to-PR mapping
 * In production, this should be replaced with a database (Redis, PostgreSQL, etc.)
 */

import type { WorkspaceInfo } from '../types/index.js';

interface WorkspaceStorage {
  workspaces: Map<string, WorkspaceInfo>;
  prToWorkspace: Map<string, string>; // "owner/repo:prNumber" -> workspaceId
}

class WorkspaceStorageService {
  private storage: WorkspaceStorage;

  constructor() {
    this.storage = {
      workspaces: new Map(),
      prToWorkspace: new Map(),
    };
  }

  /**
   * Generate a unique key for PR identification
   */
  private getPRKey(repoFullName: string, prNumber: number): string {
    return `${repoFullName}:${prNumber}`;
  }

  /**
   * Create a new workspace entry
   */
  createWorkspace(
    id: string,
    repoFullName: string,
    prNumber: number,
    branch: string
  ): WorkspaceInfo {
    const workspace: WorkspaceInfo = {
      id,
      prNumber,
      repoFullName,
      branch,
      status: 'creating',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.storage.workspaces.set(id, workspace);
    this.storage.prToWorkspace.set(this.getPRKey(repoFullName, prNumber), id);

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  getWorkspaceById(id: string): WorkspaceInfo | undefined {
    return this.storage.workspaces.get(id);
  }

  /**
   * Get workspace by PR
   */
  getWorkspaceByPR(repoFullName: string, prNumber: number): WorkspaceInfo | undefined {
    const prKey = this.getPRKey(repoFullName, prNumber);
    const workspaceId = this.storage.prToWorkspace.get(prKey);

    if (workspaceId) {
      return this.storage.workspaces.get(workspaceId);
    }
    return undefined;
  }

  /**
   * Update workspace information
   */
  updateWorkspace(
    id: string,
    updates: Partial<Omit<WorkspaceInfo, 'id' | 'prNumber' | 'repoFullName' | 'branch' | 'createdAt'>>
  ): WorkspaceInfo | undefined {
    const workspace = this.storage.workspaces.get(id);

    if (workspace) {
      const updated: WorkspaceInfo = {
        ...workspace,
        ...updates,
        updatedAt: new Date(),
      };
      this.storage.workspaces.set(id, updated);
      return updated;
    }
    return undefined;
  }

  /**
   * Mark workspace as ready with preview URL
   */
  markWorkspaceReady(id: string, previewUrl: string): WorkspaceInfo | undefined {
    return this.updateWorkspace(id, {
      status: 'ready',
      previewUrl,
    });
  }

  /**
   * Mark workspace as error
   */
  markWorkspaceError(id: string, error?: string): WorkspaceInfo | undefined {
    return this.updateWorkspace(id, {
      status: 'error',
    });
  }

  /**
   * Delete workspace (cleanup)
   */
  deleteWorkspace(id: string): boolean {
    const workspace = this.storage.workspaces.get(id);

    if (workspace) {
      const prKey = this.getPRKey(workspace.repoFullName, workspace.prNumber);
      this.storage.prToWorkspace.delete(prKey);
      this.storage.workspaces.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Delete workspace by PR (cleanup on close/merge)
   */
  deleteWorkspaceByPR(repoFullName: string, prNumber: number): boolean {
    const workspace = this.getWorkspaceByPR(repoFullName, prNumber);

    if (workspace) {
      return this.deleteWorkspace(workspace.id);
    }
    return false;
  }

  /**
   * Get all active workspaces
   */
  getAllWorkspaces(): WorkspaceInfo[] {
    return Array.from(this.storage.workspaces.values());
  }

  /**
   * Get workspaces by status
   */
  getWorkspacesByStatus(status: WorkspaceInfo['status']): WorkspaceInfo[] {
    return Array.from(this.storage.workspaces.values()).filter(
      (ws) => ws.status === status
    );
  }

  /**
   * Clear all workspaces (for testing)
   */
  clear(): void {
    this.storage.workspaces.clear();
    this.storage.prToWorkspace.clear();
  }
}

// Export singleton instance
export const workspaceStorage = new WorkspaceStorageService();
