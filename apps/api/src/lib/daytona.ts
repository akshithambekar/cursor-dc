import { Daytona, Sandbox } from "@daytonaio/sdk";

export interface OpenCodeConfig {
  repoUrl: string;
  branch?: string;
  name?: string;
  public?: boolean;
  autoStopInterval?: number;
}

export interface OpenCodeResult {
  sandboxId: string;
  previewUrl: string;
}

const OPENCODE_PORT = 3001;

let currentSandbox: Sandbox | null = null;
let daytona: Daytona | null = null;

function getDaytona(): Daytona {
  if (!daytona) {
    daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
  }
  return daytona;
}

/**
 * Creates the Daytona-aware agent configuration for OpenCode.
 * This prompt instructs the agent on how to use Daytona sandbox paths and preview links.
 */
function createOpenCodeAgentConfig(previewUrlPattern: string): string {
  const config = {
    $schema: "https://opencode.ai/config.json",
    default_agent: "daytona",
    agent: {
      daytona: {
        description: "Daytona sandbox-aware coding agent for cursor-dc monorepo",
        mode: "primary",
        prompt: `You are running in a Daytona sandbox with the cursor-dc monorepo structure.

Working Directory Guidelines:
- Your project code is in: /home/daytona/workspace/repo
- Use relative paths from /home/daytona/workspace/repo for file operations

Preview URL Pattern:
- When running services on localhost, access them at: ${previewUrlPattern}
- Replace {PORT} with the actual port number
`,
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

export async function createOpenCodeSession(
  config: OpenCodeConfig
): Promise<OpenCodeResult> {
  const branch = config.branch || "main";
  const path = "workspace/repo";

  console.log("Creating sandbox...");
  const sandbox = await getDaytona().create({
    name: config.name || `opencode-${Date.now()}`,
    public: config.public ?? true,
    autoStopInterval: config.autoStopInterval ?? 120,
    envVars: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    },
  });

  currentSandbox = sandbox;
  console.log("Sandbox created:", sandbox.id);

  // Generate preview link for OpenCode port
  const opencodePreviewLink = await sandbox.getPreviewLink(OPENCODE_PORT);
  const previewUrlPattern = opencodePreviewLink.url.replace(
    `:${OPENCODE_PORT}`,
    ":{PORT}"
  );

  // Create Daytona-aware agent configuration
  const agentConfig = createOpenCodeAgentConfig(previewUrlPattern);

  // Check npm version
  console.log("Checking npm version...");
  const npmVersion = await sandbox.process.executeCommand("npm -v");
  console.log("npm version:", npmVersion.result);

  // Install OpenCode
  console.log("Installing OpenCode...");
  const installResult = await sandbox.process.executeCommand(
    "curl -fsSL https://opencode.ai/install | bash"
  );
  console.log("Install output:", installResult.result);

  // Start OpenCode server with agent configuration
  console.log("Starting OpenCode server...");
  const envVar = `OPENCODE_CONFIG_CONTENT='${agentConfig.replace(
    /'/g,
    "'\\''"
  )}'`;


  const sessionId = crypto.randomUUID();
  const session = await sandbox.process.createSession(sessionId);

  const openCodeServe = await sandbox.process.executeSessionCommand(sessionId, {
    command: `opencode serve --port 3001 "/home/daytona/workspace/repo"`,
    runAsync: true,
  });
  
  console.log(openCodeServe)



  console.log("OpenCode server started on port", OPENCODE_PORT);

  // Clone repository
  console.log(`Cloning ${config.repoUrl} branch ${branch}...`);
  const cloneResult = await sandbox.git.clone(config.repoUrl, path, branch);
  console.log("Clone result:", cloneResult);

  const lsResult = await sandbox.process.executeCommand(`cd ${path} && ls -a`);
  console.log("ls result:", lsResult.result);

  // Install dependencies
  console.log("Installing dependencies...");
  const installDepsResult = await sandbox.process.executeCommand(
    `cd ${path} && npm install`
  );
  console.log("Dependencies installed:", installDepsResult.result);

  // Start dev server
  console.log("Starting dev server on port 3000...");
  const nextSessionId = "next-dev-server"
  const nextSession = await sandbox.process.createSession(nextSessionId);
  await sandbox.process.executeSessionCommand(nextSessionId, {
    command: `cd ${path} && PORT=3000 npm run dev`,
    runAsync: true,
  });
  console.log("Dev server started on port 3000");

  // Wait for server to start
  console.log("Waiting for server to start...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // Create preview URL
  console.log("Creating preview URL...");
  const preview = await sandbox.getPreviewLink(3000);

  console.log("Preview URL:", preview.url);

  return {
    sandboxId: sandbox.id,
    previewUrl: preview.url,
  };
}

export async function destroySandbox(): Promise<void> {
  if (!currentSandbox) {
    return;
  }

  await currentSandbox.delete();
  currentSandbox = null;
}

export function getSandboxId(): string | null {
  return currentSandbox?.id || null;
}
