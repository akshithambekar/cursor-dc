# Daytona Implementation Plan

## Overview

This document outlines a streamlined implementation plan for using Daytona to create sandboxes and clone repositories. The focus is on the essential workflow: setting up authentication and starting a sandbox with a cloned repository.

---

## Daytona Capabilities

### Core Features

**Sandbox Management**

Daytona enables programmatic creation of sandboxes with configurable parameters. Each sandbox is an isolated development environment with customizable CPU, GPU, memory, and disk allocations.

Default resources: 1 vCPU, 1GB RAM, 3GiB disk space  
Maximum resources: 4 vCPUs, 8GB RAM, 10GB disk space

**Git Operations**

The Daytona SDK provides comprehensive Git operations through the `git` module. All operations work relative to the sandbox working directory (WORKDIR from the Dockerfile, or the user's home directory).

Available operations include:
- Clone repositories with authentication and branch selection
- Check repository status (current branch, commits ahead/behind, modified files)
- List branches
- Create, switch, and delete branches
- Stage files and commit changes
- Push and pull from remote repositories

**Command Execution**

The process execution module runs shell commands within Daytona sandboxes for code compilation, test execution, package installation, and other development tasks.

**Preview URLs**

The preview link feature generates accessible preview URLs for web applications running in sandboxes, creating secure tunnels to expose local ports externally.

---

## Implementation Plan

### Step 1: Environment Setup

**Configure Environment Variables**

Set up the required environment variables for Daytona authentication:

```bash
export DAYTONA_API_KEY=your-api-key
export DAYTONA_API_URL=https://app.daytona.io/api
export DAYTONA_TARGET=us
```

---

### Step 2: Create Sandbox and Clone Repository

This step combines sandbox creation with repository cloning to ensure the sandbox is set up with the correct branch for PR previews.

**Function: Create Sandbox with PR Branch**

```typescript
interface PRSandboxConfig {
  repoUrl: string;
  branch: string;
  name?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  autoStopInterval?: number;
  public?: boolean;
  path?: string;
}

interface PRSandboxResult {
  sandboxId: string;
  path: string;
  branch: string;
}

async function createSandboxWithPRBranch(config: PRSandboxConfig): Promise<PRSandboxResult> {
  const path = config.path || 'workspace/repo';

  // Step 1: Create sandbox
  const sandbox = await daytona.createSandbox({
    cpu: 1,
    memory: 1,
    disk: 3,
    autoStopInterval: config.autoStopInterval || 60,
    public: config.public || false,
    target: 'us',
    name: config.name || `pr-preview-${Date.now()}`,
  });

  console.log('Sandbox created:', sandbox.id);

  // Step 2: Clone repository with the specific branch
  await daytona.gitClone({
    id: sandbox.id,
    url: config.repoUrl,
    path: path,
    branch: config.branch,
  });

  console.log(`Repository cloned to ${path} on branch: ${config.branch}`);

  return {
    sandboxId: sandbox.id,
    path: path,
    branch: config.branch,
  };
}
```

**Usage Example**

```typescript
// Create sandbox for a specific PR branch
const prSandbox = await createSandboxWithPRBranch({
  repoUrl: 'https://github.com/owner/repo.git',
  branch: 'feature/pr-123-add-button', // PR branch
  name: 'pr-123-preview',
  autoStopInterval: 120,
  public: true,
});

console.log('PR Sandbox ID:', prSandbox.sandboxId);
console.log('Repository path:', prSandbox.path);
console.log('Branch:', prSandbox.branch);
```

---

### Step 3: Git Operations

Daytona SDK provides a comprehensive `git` module for managing repositories in sandboxes. All operations work relative to the sandbox working directory.

#### Clone Repository

**Function: Clone Repository**

```typescript
interface CloneConfig {
  url: string;
  branch?: string;
  commitId?: string;
  path: string;
  username?: string;
  password?: string;
}

async function cloneRepository(
  sandboxId: string,
  url: string,
  path: string,
  branch?: string,
  username?: string,
  password?: string
) {
  return await daytona.gitClone({
    id: sandboxId,
    url: url,
    path: path,
    branch: branch,
    username: username,
    password: password,
  });
}
```

**Usage Examples**

```typescript
// Basic clone
await cloneRepository(
  sandbox.id,
  'https://github.com/owner/repo.git',
  'workspace/repo'
);

// Clone with authentication (personal access token)
await cloneRepository(
  sandbox.id,
  'https://github.com/owner/repo.git',
  'workspace/repo',
  undefined,
  'git',
  'personal_access_token'
);

// Clone specific branch
await cloneRepository(
  sandbox.id,
  'https://github.com/owner/repo.git',
  'workspace/repo',
  'develop'
);
```

---

#### Repository Status

**Function: Get Repository Status**

```typescript
interface GitStatus {
  currentBranch: string;
  ahead: number;
  behind: number;
  fileStatus: Array<{ name: string; status: string }>;
}

async function getGitStatus(sandboxId: string, path: string): Promise<GitStatus> {
  return await daytona.gitStatus({
    id: sandboxId,
    path: path,
  });
}
```

**Usage Example**

```typescript
const status = await getGitStatus(sandbox.id, 'workspace/repo');
console.log(`Current branch: ${status.currentBranch}`);
console.log(`Commits ahead: ${status.ahead}`);
console.log(`Commits behind: ${status.behind}`);
status.fileStatus.forEach(file => {
  console.log(`File: ${file.name} - ${file.status}`);
});
```

**Function: List Branches**

```typescript
async function listBranches(sandboxId: string, path: string): Promise<string[]> {
  const response = await daytona.gitBranches({
    id: sandboxId,
    path: path,
  });
  return response.branches;
}
```

**Usage Example**

```typescript
const branches = await listBranches(sandbox.id, 'workspace/repo');
branches.forEach(branch => {
  console.log(`Branch: ${branch}`);
});
```

---

#### Branch Operations

**Function: Create Branch**

```typescript
async function createBranch(sandboxId: string, path: string, branchName: string) {
  return await daytona.gitCreateBranch({
    id: sandboxId,
    path: path,
    branch: branchName,
  });
}
```

**Function: Switch Branch**

```typescript
async function checkoutBranch(sandboxId: string, path: string, branchName: string) {
  return await daytona.gitCheckoutBranch({
    id: sandboxId,
    path: path,
    branch: branchName,
  });
}
```

**Function: Delete Branch**

```typescript
async function deleteBranch(sandboxId: string, path: string, branchName: string) {
  return await daytona.gitDeleteBranch({
    id: sandboxId,
    path: path,
    branch: branchName,
  });
}
```

**Usage Examples**

```typescript
// Create new branch
await createBranch(sandbox.id, 'workspace/repo', 'feature/new-feature');

// Switch to branch
await checkoutBranch(sandbox.id, 'workspace/repo', 'feature/new-feature');

// Delete branch
await deleteBranch(sandbox.id, 'workspace/repo', 'feature/old-feature');
```

---

#### Staging and Committing

**Function: Stage Files**

```typescript
async function stageFiles(sandboxId: string, path: string, files: string[]) {
  return await daytona.gitAdd({
    id: sandboxId,
    path: path,
    files: files,
  });
}
```

**Function: Commit Changes**

```typescript
async function commitChanges(
  sandboxId: string,
  path: string,
  message: string,
  authorName: string,
  authorEmail: string
) {
  return await daytona.gitCommit({
    id: sandboxId,
    path: path,
    message: message,
    authorName: authorName,
    authorEmail: authorEmail,
  });
}
```

**Usage Examples**

```typescript
// Stage specific files
await stageFiles(sandbox.id, 'workspace/repo', ['file1.txt', 'file2.txt']);

// Stage all changes
await stageFiles(sandbox.id, 'workspace/repo', ['.']);

// Commit changes with message and author
await commitChanges(
  sandbox.id,
  'workspace/repo',
  'feat: add new feature',
  'John Doe',
  'john@example.com'
);
```

---

#### Remote Operations

**Function: Push Changes**

```typescript
async function pushChanges(sandboxId: string, path: string) {
  return await daytona.gitPush({
    id: sandboxId,
    path: path,
  });
}
```

**Function: Pull Changes**

```typescript
async function pullChanges(sandboxId: string, path: string) {
  return await daytona.gitPull({
    id: sandboxId,
    path: path,
  });
}
```

**Usage Examples**

```typescript
// Push changes to remote
await pushChanges(sandbox.id, 'workspace/repo');

// Pull changes from remote
await pullChanges(sandbox.id, 'workspace/repo');
```

---

### Step 3: Execute Commands

**Function: Run Command**

```typescript
async function runCommand(sandboxId: string, command: string) {
  return await daytona.executeCommand({
    id: sandboxId,
    command: command,
  });
}
```

**Usage Example: Install Dependencies and Start Dev Server**

```typescript
// Navigate to project directory
await runCommand(sandbox.id, 'cd /tmp/project && npm install');

// Start development server
await runCommand(sandbox.id, 'cd /tmp/project && npm run dev');
```

---

### Step 4: Generate Preview URL

**Function: Create Preview Link**

```typescript
interface PreviewConfig {
  port: number;
  description: string;
  checkServer: boolean;
}

async function createPreviewLink(sandboxId: string, config: PreviewConfig) {
  return await daytona.previewLink({
    id: sandboxId,
    port: config.port,
    description: config.description,
    checkServer: config.checkServer,
  });
}
```

**Usage Example**

```typescript
const preview = await createPreviewLink(sandbox.id, {
  port: 3000,
  description: 'Next.js Development Server',
  checkServer: true,
});

console.log('Preview URL:', preview.url);
```

---

### Step 5: Cleanup

**Function: Destroy Sandbox**

```typescript
async function destroySandbox(sandboxId: string) {
  return await daytona.destroySandbox({
    id: sandboxId,
  });
}
```

---

## Complete Workflow Example

```typescript
async function setupRepoPreview(
  repoUrl: string,
  branch: string = 'main',
  devPort: number = 3000
) {
  // Step 1: Create sandbox and clone repository with PR branch
  const prSandbox = await createSandboxWithPRBranch({
    repoUrl: repoUrl,
    branch: branch,
    name: `preview-${Date.now()}`,
    autoStopInterval: 60,
    public: true,
  });

  // Step 2: Install dependencies
  await runCommand(prSandbox.sandboxId, `cd ${prSandbox.path} && npm install`);

  // Step 3: Start dev server
  await runCommand(prSandbox.sandboxId, `cd ${prSandbox.path} && npm run dev`);

  // Step 4: Generate preview URL
  const preview = await createPreviewLink(prSandbox.sandboxId, {
    port: devPort,
    description: 'App Preview',
    checkServer: true,
  });

  return {
    sandboxId: prSandbox.sandboxId,
    path: prSandbox.path,
    branch: prSandbox.branch,
    previewUrl: preview.url,
  };
}
```

---

## Configuration Reference

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DAYTONA_API_KEY | Authentication key | Yes | None |
| DAYTONA_API_URL | API endpoint | No | https://app.daytona.io/api |
| DAYTONA_TARGET | Target region | No | Organization default |

### Sandbox Parameters

| Parameter | Default | Maximum | Description |
|-----------|---------|---------|-------------|
| cpu | 1 | 4 | CPU cores |
| memory | 1 | 8 | RAM in GB |
| disk | 3 | 10 | Disk in GB |
| autoStopInterval | 15 | N/A | Minutes (0 to disable) |
| public | false | N/A | Public preview URL |

---

## Best Practices

- Set appropriate auto-stop intervals to control costs
- Use descriptive names for sandbox identification
- Generate preview URLs only after confirming server is running
- Always destroy sandboxes when no longer needed

---

## OpenCode Server Integration

This section outlines the implementation for running the OpenCode coding agent as a server within a Daytona sandbox. Unlike the OpenCode web interface which provides a browser-based UI, the OpenCode server runs as an API service that can be integrated programmatically into your workflows.

### Overview

The OpenCode server provides API endpoints for interacting with the coding agent, enabling automation and integration with other systems. When running inside a Daytona sandbox, the server can develop web applications, write code in any language, install dependencies, and run scripts. The server supports over 75 different LLM providers and can host dev servers with preview links.

### Workflow

When you run the integration script, the following steps occur:

1. Create a Daytona sandbox with public preview URL enabled
2. Install OpenCode server globally via npm
3. Configure a custom Daytona-aware agent with specific system prompts
4. Start the OpenCode server on the configured port
5. Generate a public preview link for accessing the server
6. Handle cleanup when the session ends

The server runs in the background and can be interacted with through its API endpoints. When developing web applications, the agent automatically hosts them and generates preview links for live inspection.

---

### Step 1: Configure Sandbox for OpenCode Server

**Create Sandbox with Public Preview**

```typescript
interface OpenCodeSandboxConfig {
  name?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  autoStopInterval?: number;
  public?: boolean;
  env?: Record<string, string>;
}

const OPENCODE_PORT = 3000;

async function createOpenCodeSandbox(config: OpenCodeSandboxConfig) {
  return await daytona.createSandbox({
    cpu: 2, // OpenCode benefits from additional CPU
    memory: 2, // Increased memory for agent operations
    disk: 5, // Space for dependencies and projects
    autoStopInterval: 60,
    public: true, // Enable public access to preview URLs
    target: 'us',
    ...config,
  });
}
```

**Usage Example**

```typescript
const sandbox = await createOpenCodeSandbox({
  name: 'opencode-server',
  autoStopInterval: 120,
  env: {
    // Optional: Set LLM provider API keys here
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  },
});

console.log('OpenCode sandbox created:', sandbox.id);
```

---

### Step 2: Install OpenCode Server

**Install via npm**

```typescript
async function installOpenCode(sandboxId: string) {
  return await daytona.executeCommand({
    id: sandboxId,
    command: 'npm install -g opencode',
  });
}
```

**Installation with Verification**

```typescript
async function installOpenCodeServer(sandboxId: string) {
  const result = await daytona.executeCommand({
    id: sandboxId,
    command: 'npm install -g opencode && opencode --version',
  });

  if (result.exitCode !== 0) {
    throw new Error(`OpenCode installation failed: ${result.stderr}`);
  }

  console.log('OpenCode installed successfully:', result.stdout);
  return result;
}
```

---

### Step 3: Configure Daytona-Aware Agent

**Create Agent Configuration**

The OpenCode server can be configured with custom agents that understand Daytona-specific paths and preview link patterns. This configuration is passed as an environment variable to the server.

```typescript
interface AgentConfig {
  defaultAgent: string;
  agents: Record<string, {
    description: string;
    mode: string;
    prompt: string;
  }>;
}

function createDaytonaAgentConfig(previewUrlPattern: string): string {
  const config: AgentConfig = {
    $schema: 'https://opencode.ai/config.json',
    default_agent: 'daytona',
    agent: {
      daytona: {
        description: 'Daytona sandbox-aware coding agent',
        mode: 'primary',
        prompt: `You are running in a Daytona sandbox. 
          - Use the workspace/repo directory for file operations (relative to sandbox working directory).
          - When running services on localhost, they will be accessible at: ${previewUrlPattern}
          - When starting a server, always start it in the background with & so the command does not block further instructions.
          - When starting a server, inform the user about the preview URL for accessing it.
          - Install dependencies as needed for the project you're working on.`,
      },
    },
  };

  return JSON.stringify(config, null, 2);
}
```

**Upload Configuration to Sandbox**

```typescript
async function configureOpenCodeAgent(sandboxId: string, configContent: string) {
  // The configuration is passed as an environment variable when starting the server
  return {
    OPENCODE_CONFIG_CONTENT: configContent,
  };
}
```

---

### Step 4: Start OpenCode Server

**Run Server with Process Execution**

```typescript
async function startOpenCodeServer(
  sandboxId: string,
  port: number,
  envVars: Record<string, string>
) {
  const envVarString = Object.entries(envVars)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const command = `${envVarString} opencode server --port ${port}`;

  return await daytona.executeCommand({
    id: sandboxId,
    command: command,
    // runAsync keeps the process alive for ongoing interaction
  });
}
```

**Complete Server Startup**

```typescript
async function startOpenCodeServerSession(sandboxId: string, port: number = 3000) {
  // Generate preview URL pattern for agent configuration
  const previewLink = await daytona.previewLink({
    id: sandboxId,
    port: port,
    description: 'OpenCode Server',
    checkServer: false,
  });

  // Create URL pattern with {PORT} placeholder for agent prompts
  const previewUrlPattern = previewLink.url.replace(`:${port}`, ':{PORT}');

  // Configure agent with Daytona awareness
  const agentConfig = createDaytonaAgentConfig(previewUrlPattern);

  // Start the OpenCode server
  const session = await startOpenCodeServer(sandboxId, port, {
    OPENCODE_CONFIG_CONTENT: agentConfig,
  });

  return {
    session: session,
    previewUrl: previewLink.url,
  };
}
```

---

### Step 5: Generate Public Preview URL

**Create Public Preview Link**

```typescript
async function createPublicPreviewLink(
  sandboxId: string,
  port: number,
  description: string
) {
  return await daytona.previewLink({
    id: sandboxId,
    port: port,
    description: description,
    checkServer: true,
  });
}
```

**Usage Example**

```typescript
const preview = await createPublicPreviewLink(
  sandbox.id,
  3000,
  'OpenCode Server API'
);

console.log('Public Preview URL:', preview.url);
// Example: https://3000-1e0f775c-c01b-40e7-8c64-062fd3dadd75.proxy.daytona.works/
```

---

### Step 6: Cleanup

**Automatic Cleanup on Process Termination**

```typescript
function setupCleanupHandler(sandboxId: string) {
  process.once('SIGINT', async () => {
    console.log('\nCleaning up...');
    await daytona.destroySandbox({ id: sandboxId });
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    console.log('\nCleaning up...');
    await daytona.destroySandbox({ id: sandboxId });
    process.exit(0);
  });
}
```

**Manual Cleanup Function**

```typescript
async function cleanupSandbox(sandboxId: string) {
  console.log('Destroying sandbox:', sandboxId);
  await daytona.destroySandbox({ id: sandboxId });
  console.log('Sandbox destroyed successfully');
}
```

---

## Complete OpenCode Server Workflow

```typescript
async function setupOpenCodeServer(
  repoUrl?: string,
  branch: string = 'main',
  port: number = 3000
) {
  let sandbox = null;

  try {
    // Step 1: Create sandbox with public preview and clone PR branch
    console.log('Creating sandbox...');
    const prSandbox = await createSandboxWithPRBranch({
      repoUrl: repoUrl || 'https://github.com/owner/repo.git',
      branch: branch,
      name: `opencode-server-${Date.now()}`,
      autoStopInterval: 120,
      public: true,
      cpu: 2,
      memory: 2,
      disk: 5,
    });
    sandbox = { id: prSandbox.sandboxId };
    console.log('Sandbox created:', prSandbox.sandboxId);
    console.log('Repository cloned to', prSandbox.path, 'on branch:', prSandbox.branch);

    // Step 2: Install OpenCode server
    console.log('Installing OpenCode server...');
    await installOpenCodeServer(prSandbox.sandboxId);
    console.log('OpenCode installed successfully');

    // Step 3: Generate preview URL pattern for agent config
    const previewLink = await daytona.previewLink({
      id: prSandbox.sandboxId,
      port: port,
      description: 'OpenCode Server',
      checkServer: false,
    });
    const previewUrlPattern = previewLink.url.replace(`:${port}`, ':{PORT}');

    // Step 4: Configure Daytona-aware agent
    const agentConfig = createDaytonaAgentConfig(previewUrlPattern);

    // Step 5: Start OpenCode server
    console.log('Starting OpenCode server...');
    await daytona.executeCommand({
      id: prSandbox.sandboxId,
      command: `OPENCODE_CONFIG_CONTENT='${agentConfig}' opencode server --port ${port}`,
    });

    // Step 6: Generate public preview URL
    const serverPreview = await createPublicPreviewLink(
      prSandbox.sandboxId,
      port,
      'OpenCode Server'
    );
    console.log('OpenCode Server URL:', serverPreview.url);

    // Step 7: Setup cleanup handler
    setupCleanupHandler(prSandbox.sandboxId);

    return {
      sandboxId: prSandbox.sandboxId,
      path: prSandbox.path,
      branch: prSandbox.branch,
      serverUrl: serverPreview.url,
      previewUrlPattern: previewUrlPattern,
    };
  } catch (error) {
    console.error('Error setting up OpenCode server:', error);
    if (sandbox) {
      await cleanupSandbox(sandbox.id);
    }
    throw error;
  }
}
```

---

## OpenCode Server Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| OPENCODE_CONFIG_CONTENT | JSON configuration for custom agents | No |
| ANTHROPIC_API_KEY | Anthropic API key for Claude models | No |
| OPENAI_API_KEY | OpenAI API key for GPT models | No |
| OPENROUTER_API_KEY | OpenRouter API key | No |

### Sandbox Parameters for OpenCode

| Parameter | Value | Reason |
|-----------|-------|--------|
| cpu | 2 | OpenCode benefits from additional CPU for LLM inference |
| memory | 2 | Increased memory for agent operations and projects |
| disk | 5 | Space for dependencies and multiple projects |
| autoStopInterval | 120 | Longer interval for development sessions |
| public | true | Enable public preview URLs for external access |

---

## Best Practices for OpenCode Server

- Enable public preview URLs when external access is required
- Set longer auto-stop intervals for active development sessions
- Configure LLM provider API keys as environment variables for persistence
- Use descriptive sandbox names for identification
- Always setup cleanup handlers to prevent orphaned sandboxes
- The agent uses workspace/repo for file operations (relative to sandbox working directory)
- Start servers in the background using & to avoid blocking

---

## Troubleshooting

**Server startup failures**: Verify npm installation and check stderr output  
**Agent configuration errors**: Validate JSON syntax in OPENCODE_CONFIG_CONTENT  
**Preview URL issues**: Ensure the server is running on the specified port  
**LLM provider errors**: Verify API keys are correctly set in environment variables  
**Connection timeouts**: Increase auto-stop interval for longer sessions
