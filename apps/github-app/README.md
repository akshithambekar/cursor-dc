# PR Preview Studio - GitHub App

A GitHub App that automatically spins up live preview environments for pull requests using Daytona sandboxes.

## Features

- Automatically creates preview environments when PRs are opened
- Updates previews when new commits are pushed
- Posts preview URLs as PR comments
- Cleans up workspaces when PRs are closed or merged

## Prerequisites

- Node.js >= 20
- Bun or npm
- A GitHub App with the following permissions:
  - Pull requests: Read & write
  - Contents: Read & write
  - Issues: Read & write
- Daytona API access

## Setup

### 1. Create a GitHub App

1. Go to [GitHub Apps](https://github.com/settings/apps/new)
2. Fill in the required fields:
   - **GitHub App name**: `pr-preview-studio` (or your preferred name)
   - **Homepage URL**: Your app's homepage
   - **Webhook URL**: Your server's URL (e.g., `https://your-domain.com/api/github/webhook`)
   - **Webhook secret**: Generate a random string

3. Set the following permissions:
   - **Repository permissions**:
     - Pull requests: Read & write
     - Contents: Read & write
     - Issues: Read & write
   - **Subscribe to events**:
     - Pull request

4. Create the app and note the **App ID**
5. Download the **private key** (.pem file)

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `GITHUB_APP_ID`: Your GitHub App's App ID
- `GITHUB_PRIVATE_KEY`: Contents of your .pem file
- `GITHUB_WEBHOOK_SECRET`: Webhook secret you configured
- `DAYTONA_API_KEY`: Your Daytona API key

### 3. Install Dependencies

```bash
bun install
```

### 4. Start the Development Server

```bash
bun dev
```

The server will start on port 3001 by default.

### 5. Test Your App

1. Install the app on a test repository
2. Open a pull request
3. You should see a comment with the preview URL within a few minutes

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Add the environment variables in Vercel project settings
3. Deploy

### Railway

1. Create a new Railway project
2. Add environment variables
3. Deploy from your GitHub repository

### Other Platforms

The app can be deployed to any platform that supports Node.js:

```bash
# Build
bun build

# Start production server
bun start
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              GITHUB                                  │
│  ┌──────────┐     Webhook      ┌─────────────────────────────────┐ │
│  │   PR     │ ───────────────► │           GitHub App            │ │
│  │ Created  │                  │  - Receives webhook             │ │
│  └──────────┘                  │  - Calls Daytona API            │ │
│       ▲                        │  - Posts preview URL            │ │
│       │                        └───────────────┬─────────────────┘ │
│       │ Commit                                 │                   │
│       │                                        ▼                   │
└───────┼────────────────────────────────────────┼───────────────────┘
        │                                        │
        │ Create Workspace                       │
        │                                        ▼
┌───────┴────────────────────────────────────────────────────────────┐
│                         DAYTONA SANDBOX                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        PR Code + Dev Server                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Webhook Events Handled

| Event | Action | Description |
|-------|--------|-------------|
| `pull_request` | `opened` | Create new preview workspace |
| `pull_request` | `synchronize` | Update existing workspace |
| `pull_request` | `closed` | Clean up workspace |
| `pull_request` | `reopened` | Recreate workspace |

## API Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | Yes | GitHub App private key (.pem) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Webhook secret |
| `GITHUB_TOKEN` | No | Personal access token (fallback) |
| `DAYTONA_API_URL` | No | Daytona API URL (default: https://api.daytona.io) |
| `DAYTONA_API_KEY` | Yes | Daytona API key |
| `DAYTONA_WORKSPACE_TEMPLATE` | No | Daytona workspace template ID |
| `PORT` | No | Server port (default: 3001) |

## Development

### Running Tests

```bash
bun test
```

### Linting

```bash
bun lint
```

### Building

```bash
bun build
```

## Troubleshooting

### Webhook not receiving events

1. Verify webhook URL is publicly accessible
2. Check webhook secret matches in both places
3. Verify GitHub App is installed on the repository

### Preview URL not appearing

1. Check Daytona API credentials
2. Verify workspace template is configured
3. Check server logs for errors

### Permission denied errors

1. Verify GitHub App has required permissions
2. Check if app is installed on the repository
3. Ensure private key is correctly formatted

## License

MIT
