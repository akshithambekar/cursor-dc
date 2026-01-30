/**
 * GitHub App Configuration
 *
 * Required permissions for the GitHub App:
 * - pull_requests: read - to detect PR events
 * - contents: write - to interact with repository contents if needed
 * - issues: write - to post comments on PRs (issues API)
 */

export interface GitHubAppConfig {
  appId: number;
  privateKey: string;
  webhookSecret: string;
  githubToken?: string;
}

export interface DaytonaConfig {
  apiUrl: string;
  apiKey: string;
  workspaceTemplate?: string;
}

export interface AppConfig {
  github: GitHubAppConfig;
  daytona: DaytonaConfig;
  port: number;
  webhookPath: string;
  env: 'development' | 'production';
}

export const getConfig = (): AppConfig => {
  return {
    appId: parseInt(process.env.GITHUB_APP_ID || '0', 10),
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    githubToken: process.env.GITHUB_TOKEN,
  };

  return {
    github: {
      appId: parseInt(process.env.GITHUB_APP_ID || '0', 10),
      privateKey: process.env.GITHUB_PRIVATE_KEY || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
      githubToken: process.env.GITHUB_TOKEN,
    },
    daytona: {
      apiUrl: process.env.DAYTONA_API_URL || 'https://api.daytona.io',
      apiKey: process.env.DAYTONA_API_KEY || '',
      workspaceTemplate: process.env.DAYTONA_WORKSPACE_TEMPLATE,
    },
    port: parseInt(process.env.PORT || '3001', 10),
    webhookPath: process.env.WEBHOOK_PATH || '/api/webhook',
    env: (process.env.NODE_ENV as 'development' | 'production') || 'development',
  };
};

export const validateConfig = (config: ReturnType<typeof getConfig>): void => {
  const errors: string[] = [];

  if (!config.github.appId) {
    errors.push('GITHUB_APP_ID is required');
  }
  if (!config.github.privateKey) {
    errors.push('GITHUB_PRIVATE_KEY is required');
  }
  if (!config.github.webhookSecret) {
    errors.push('GITHUB_WEBHOOK_SECRET is required');
  }
  if (!config.daytona.apiKey) {
    errors.push('DAYTONA_API_KEY is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};
