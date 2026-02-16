## Prism
> Built in 5 hours and selected as a finalist at Cursor’s DC Hackathon. View the Devpost [here](https://devpost.com/software/prism-3g7c6b).

**Prism** is a GitHub App that automatically spins up live preview environments for pull requests using Daytona sandboxes.

When a PR is opened:

1. A sandbox is created with the PR branch.
2. A preview URL is posted as a PR comment.
3. Reviewers get a live app with React-Grab enabled.
4. They click any element, describe a change (e.g., "make this button blue"), and hit **Apply**.
5. OpenCode edits the source, commits to the PR branch, and pushes.
6. The preview updates instantly via HMR.
7. The new commit appears on the PR, all without leaving the browser.

---

## Architecture & Features

### GitHub App (Probot + Octokit)

- Listens for:
  - `pull_request.opened`
  - `pull_request.synchronize`
- Calls the Daytona API to create a workspace
- Posts the preview URL as a PR comment
- Stores workspace ID per PR for cleanup on close/merge

---

### Daytona Sandbox

Workspace configuration:

- Clones the PR branch
- Runs `npm install`
- Starts the dev server
- Exposes:
  - **Port 3000** → App preview
  - **Port 4000** → API bridge
- Runs OpenCode inside the sandbox

---

### React-Grab (DEV-only)

Integrated into the Next.js app in development mode:

- Floating panel UI
- Displays:
  - Selected element
  - Source file + line number
  - Change input field
- **Apply** sends the edit request to the OpenCode bridge

---

### OpenCode Bridge (`/api/opencode`, DEV-only)

Next.js API route that:

1. Receives:

   ```json
   { "file": "...", "line": 42, "change": "..." }
   ```

2. Calls the OpenCode TypeScript SDK to edit the file  
3. Stages and commits with:

   ```
   [PR Preview] {description}
   ```

4. Pushes to the PR branch  
5. Returns success + commit SHA to the UI  

---

## End Result

- Live preview environments per PR  
- In-browser UI-driven code edits  
- Automatic commits to the PR branch  
- Real-time feedback via HMR  
