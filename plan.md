# Product Requirements Document
## PR Preview Studio

| Field | Value |
|-------|-------|
| **Project Name** | PR Preview Studio |
| **Team Size** | 4 developers (full-stack) |
| **Time Budget** | 4 hours |
| **Tech Stack** | Daytona.io, React-Grab, OpenCode.ai, GitHub App, Next.js |

---

## Executive Summary

A GitHub App that automatically spins up live preview environments for pull requests using Daytona sandboxes. Reviewers can click any element in the preview, make visual changes using React-Grab, and have those changes automatically committed back to the PR branch via OpenCode.ai.

---

## Problem Statement

Code review is disconnected from the actual user experience. Reviewers must either run code locally, wait for CI deployments, or rely on screenshots. Even when previews exist, suggesting UI changes requires context-switching to an IDE, making precise file edits, and creating new commits manually.

---

## Solution Overview

### Core User Flow

1. Developer opens a PR on a repository with the GitHub App installed
2. GitHub App webhook triggers Daytona to spin up a sandbox with the PR branch code
3. Daytona exposes a preview URL (e.g., the Next.js dev server on port 3000)
4. Preview URL is posted as a comment on the PR
5. Reviewer clicks preview link, sees live app with React-Grab overlay enabled
6. Reviewer clicks an element, makes a change request (e.g., "make this button blue")
7. Clicking **"Apply"** sends the request to OpenCode, which edits the source file and commits to the PR branch

### Technical Architecture

- **GitHub App:** Receives PR webhooks, orchestrates sandbox lifecycle, posts preview URLs
- **Daytona Sandbox:** Runs the PR code with dev server + OpenCode instance
- **React-Grab Integration:** Injected into the preview, enables element selection and change input
- **OpenCode Bridge:** DEV-only Next.js API route that receives React-Grab requests, calls OpenCode SDK to make edits, then commits via git

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GITHUB                                         │
│  ┌──────────┐     Webhook      ┌─────────────────────────────────────────┐ │
│  │   PR     │ ───────────────► │           GitHub App Server             │ │
│  │ Created  │                  │  - Receives webhook                     │ │
│  └──────────┘                  │  - Calls Daytona API                    │ │
│       ▲                        │  - Posts preview URL comment            │ │
│       │                        └───────────────┬─────────────────────────┘ │
│       │ Commit                                 │                           │
│       │                                        ▼                           │
└───────┼────────────────────────────────────────┼───────────────────────────┘
        │                                        │                            
        │                                        │ Create Workspace           
        │                                        ▼                            
┌───────┴────────────────────────────────────────────────────────────────────┐
│                         DAYTONA SANDBOX                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         PR Branch Code                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐ │
│  │   Next.js Dev    │    │  OpenCode Agent  │    │  API Route Bridge    │ │
│  │   Server :3000   │◄──►│   (Running)      │◄──►│  /api/opencode       │ │
│  │   + React-Grab   │    │                  │    │  (DEV only)          │ │
│  └────────┬─────────┘    └──────────────────┘    └──────────┬───────────┘ │
│           │                                                  │             │
│           │ Daytona Preview URL (public)                     │             │
│           ▼                                                  │             │
└───────────┼──────────────────────────────────────────────────┼─────────────┘
            │                                                  │              
            ▼                                                  │              
┌───────────────────────────────────────────────────────────────┼─────────────┐
│                         REVIEWER BROWSER                      │             │
│                                                               │             │
│  ┌─────────────────────────────────────────────────────────┐  │             │
│  │              Live Preview with React-Grab               │  │             │
│  │                                                         │  │             │
│  │   [Click element] ──► [Enter change] ──► [Apply] ───────┼──┘             │
│  │                                                         │                │
│  └─────────────────────────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Team Task Breakdown (4 Hours)

### Task 1: GitHub App + Webhook Handler

| | |
|---|---|
| **Owner** | Developer 1 |
| **Time** | 4 hours |
| **Description** | Build the GitHub App that listens for PR events and orchestrates the preview flow. |

**Deliverables:**
- GitHub App registered with correct permissions (`pull_requests: read`, `contents: write`, `issues: write`)
- Webhook endpoint that handles `pull_request.opened` and `pull_request.synchronize` events
- Integration with Daytona API to create workspace (receives preview URL from Task 2)
- Posts PR comment with preview URL once sandbox is ready
- Cleanup handler for PR close/merge events

**Technical Notes:**
- Use Probot or Octokit for GitHub App scaffolding
- Deploy webhook handler to Vercel/Railway for quick iteration
- Store workspace ID mapped to PR number for cleanup

---

### Task 2: Daytona Sandbox Setup + Preview URLs

| | |
|---|---|
| **Owner** | Developer 2 |
| **Time** | 4 hours |
| **Description** | Configure Daytona workspace templates and expose preview URLs for the dev server. |

**Deliverables:**
- Daytona workspace configuration (devcontainer.json or similar) that clones PR branch
- Automatic `npm install` and dev server startup on workspace creation
- Preview URL exposure for port 3000 using Daytona preview feature
- OpenCode agent running in sandbox (installed via workspace config)
- API endpoint or callback to return preview URL to GitHub App

**Technical Notes:**
- Reference: https://www.daytona.io/docs/preview for preview URL setup
- Workspace should expose both port 3000 (app) and port 4000 (API bridge from Task 4)
- Consider polling for workspace ready state before returning URL

---

### Task 3: React-Grab Integration + UI Overlay

| | |
|---|---|
| **Owner** | Developer 3 |
| **Time** | 4 hours |
| **Description** | Integrate React-Grab into the preview app with a UI for selecting elements and submitting changes. |

**Deliverables:**
- React-Grab installed and configured in the Next.js app (DEV mode only)
- Floating panel UI that shows: selected element info, source file/line, change input field
- **"Apply" button** that sends change request to API bridge (Task 4)
- Loading state while OpenCode processes the change
- Success/error feedback with HMR auto-reload confirmation

**Technical Notes:**
- Reference: https://github.com/aidenybai/react-grab
- React-Grab provides element → source mapping out of the box
- Wrap entire app in React-Grab provider, conditionally in development only
- UI should be draggable/collapsible to not obstruct the preview

---

### Task 4: OpenCode Bridge API + Git Commit Flow

| | |
|---|---|
| **Owner** | Developer 4 |
| **Time** | 4 hours |
| **Description** | Build the API route that receives change requests, invokes OpenCode, and commits the result to the PR branch. |

**Deliverables:**
- Next.js API route `/api/opencode` (DEV only, returns 404 in production)
- Integration with OpenCode TypeScript SDK to send edit commands
- Prompt construction: file path, current code context, requested change
- Git operations: stage changed files, commit with message, push to PR branch
- Return success response with commit SHA for UI feedback

**Technical Notes:**
- OpenCode SDK: use opencode.ai TypeScript client
- Git auth: Daytona workspace should have GitHub credentials from PR clone
- Commit message format: `[PR Preview] {change description}`
- Consider rate limiting / debouncing rapid successive changes

---

## Integration Points & Handoffs

| From | To | Interface |
|------|-----|-----------|
| Task 1 (GitHub App) | Task 2 (Daytona) | Daytona API: `createWorkspace(repoUrl, branch)` |
| Task 2 (Daytona) | Task 1 (GitHub App) | Callback/webhook with preview URL |
| Task 3 (React-Grab) | Task 4 (OpenCode Bridge) | `POST /api/opencode { file, line, change }` |
| Task 4 (OpenCode Bridge) | Task 3 (React-Grab) | Response `{ success, commitSha, error }` |

---

## 4-Hour Sprint Schedule

| Time | Milestone |
|------|-----------|
| 0:00 | Kickoff: Confirm task ownership, set up shared repo, agree on API contracts |
| 0:30 | Individual work begins. Slack channel for blockers. |
| 1:30 | **Check-in #1:** Task 1 has webhook receiving, Task 2 has workspace spinning up |
| 2:30 | **Check-in #2:** Task 3 has React-Grab selecting elements, Task 4 has API route scaffolded |
| 3:00 | Integration begins: Connect all four components end-to-end |
| 3:30 | Full flow test: PR → preview → click element → apply change → see commit |
| 3:45 | Bug fixes and polish |
| 4:00 | **Demo ready** |

---

## MVP Scope for Demo

**In Scope:**
- Single repo support (hardcoded or configurable)
- Next.js apps only
- Text/style changes (button text, colors, spacing)
- Single-element changes per apply action

**Out of Scope (Post-Hackathon):**
- Multi-repo support
- Non-Next.js frameworks
- Complex refactors (moving components, adding new files)
- Auth / multi-user sandbox isolation
- Change preview before commit (undo/redo)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Daytona workspace startup time too slow | Pre-warm a workspace; show "spinning up" status in PR comment |
| OpenCode edits are inaccurate | Use very specific prompts with exact file/line context; accept "good enough" for demo |
| React-Grab doesn't map to correct source | Test with simple components first; fall back to manual file input |
| Git push fails (permissions) | Use GitHub App installation token; test auth flow early |

---

## Demo Success Criteria

- [ ] Open a PR and see a preview URL comment appear within 2 minutes
- [ ] Click the preview URL and see the running app
- [ ] Click an element, type a change, click **Apply**
- [ ] See the preview update in real-time via HMR
- [ ] See a new commit appear on the PR with the applied change

---

## Quick Reference Links

- Daytona Preview URLs: https://www.daytona.io/docs/preview
- React-Grab: https://github.com/aidenybai/react-grab
- OpenCode.ai: https://opencode.ai
- GitHub Apps Guide: https://docs.github.com/en/apps

---

*Good luck at the hackathon! 🚀*