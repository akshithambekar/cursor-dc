/**
 * Type definitions for GitHub App
 */

export interface PullRequestEvent {
  action: 'opened' | 'synchronize' | 'closed' | 'reopened' | 'edited';
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: 'open' | 'closed';
    head: {
      ref: string;
      sha: string;
      repo: {
        full_name: string;
        clone_url: string;
        html_url: string;
      };
    };
    base: {
      ref: string;
      sha: string;
    };
    html_url: string;
    user: {
      login: string;
      id: number;
    };
  };
  repository: {
    id: number;
    full_name: string;
    name: string;
    html_url: string;
    private: boolean;
  };
  sender: {
    login: string;
    id: number;
    type: 'User' | 'Bot';
  };
}

export interface WorkspaceInfo {
  id: string;
  prNumber: number;
  repoFullName: string;
  branch: string;
  previewUrl?: string;
  status: 'creating' | 'running' | 'ready' | 'error' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
}

export interface DaytonaCreateWorkspaceRequest {
  repoUrl: string;
  branch: string;
  template?: string;
  envVars?: Record<string, string>;
}

export interface DaytonaWorkspaceResponse {
  id: string;
  workspaceUrl: string;
  previewUrl?: string;
  status: string;
}

export interface PRComment {
  id: number;
  body: string;
  user: {
    login: string;
  };
  created_at: string;
}

export interface WebhookContext {
  name: string;
  id: number;
  payload: Record<string, unknown>;
  repository: {
    owner: string;
    repo: string;
  };
  pullRequest?: PullRequestEvent['pull_request'];
}
