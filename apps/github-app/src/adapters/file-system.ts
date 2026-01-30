/**
 * Probot File System Adapter
 *
 * This adapter stores data in the local filesystem for development.
 * In production, use a proper database adapter.
 */

import { Write, Read } from '@probot/adapter-aws-lambda-serverless/node_modules/@octokit/next.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = process.env.DATA_DIR || '.probot-data';
const INSTALLATIONS_FILE = 'installations.json';
const APP_INSTALLATIONS_FILE = 'app_installations.json';

interface Installation {
  id: number;
  account: {
    login: string;
    type: string;
  };
  repositories: string[];
  created_at: string;
  updated_at: string;
}

interface AppInstallation {
  id: number;
  slug: string;
  name: string;
  description: string;
  externalUrl: string;
  hookPath: string;
  hookAttributes: {
    url: string;
    content_type: string;
  };
}

export function createAdapter() {
  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  function readJson<T>(filename: string, defaultValue: T): T {
    const filepath = join(DATA_DIR, filename);
    if (!existsSync(filepath)) {
      return defaultValue;
    }
    try {
      const content = readFileSync(filepath, 'utf8');
      return JSON.parse(content);
    } catch {
      return defaultValue;
    }
  }

  function writeJson<T>(filename: string, data: T): void {
    const filepath = join(DATA_DIR, filename);
    writeFileSync(filepath, JSON.stringify(data, null, 2));
  }

  return {
    getInstallation: async (installationId: number): Promise<Installation | null> => {
      const installations = readJson<Installation[]>(INSTALLATIONS_FILE, []);
      return installations.find((i) => i.id === installationId) || null;
    },

    getInstallationByHost: async (_owner: string, _repo: string, _host: string): Promise<Installation | null> => {
      // For development, return a mock installation
      return {
        id: 1,
        account: {
          login: 'test-owner',
          type: 'User',
        },
        repositories: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },

    getApp: async (): Promise<AppInstallation | null> => {
      const appInstallations = readJson<AppInstallation[]>(APP_INSTALLATIONS_FILE, []);
      return appInstallations[0] || null;
    },

    getApps: async (): Promise<AppInstallation[]> => {
      return readJson<AppInstallation[]>(APP_INSTALLATIONS_FILE, []);
    },

    saveInstallation: async (installation: Installation): Promise<void> => {
      const installations = readJson<Installation[]>(INSTALLATIONS_FILE, []);
      const index = installations.findIndex((i) => i.id === installation.id);

      if (index >= 0) {
        installations[index] = installation;
      } else {
        installations.push(installation);
      }

      writeJson(INSTALLATIONS_FILE, installations);
    },

    removeInstallation: async (installationId: number): Promise<void> => {
      const installations = readJson<Installation[]>(INSTALLATIONS_FILE, []);
      const filtered = installations.filter((i) => i.id !== installationId);
      writeJson(INSTALLATIONS_FILE, filtered);
    },
  } as Write;
}

// Export for use in index.ts
export { createAdapter as default };
