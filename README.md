# TanStack AI Assistant

Full-stack AI assistant platform built with TanStack Start, TanStack Router, and TanStack AI. Features streaming chat, a tool-calling system, PostgreSQL persistence, a Telegram gateway, and a cronjob automation system.

# Getting Started

## Prerequisites

This app requires a PostgreSQL database and Elasticsearch. Start both with Docker:

```bash
docker compose up -d
```

## Database Setup

Push the schema to your database:

```bash
pnpm db:push
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required:**

- `OPENAI_API_KEY` — OpenAI API key for LLM calls
- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://postgres:password@localhost:5432/tanstack_ai`)
- `SESSION_SECRET` — Random string ≥ 32 chars for session encryption. Generate: `openssl rand -base64 32`
- `ENCRYPTION_KEY` — 64-char hex string (AES-256-GCM key) for encrypting sensitive PAT fields. Generate: `openssl rand -hex 32`

**Database (Docker):**

- `POSTGRES_DB` — Database name (default: `tanstack_ai`)
- `POSTGRES_USER` — Database user (default: `postgres`)
- `POSTGRES_PASSWORD` — Database password (default: `password`)
- `POSTGRES_PORT` — Host port to expose PostgreSQL on (default: `5432`)

**Optional (features activate when set):**

- `APP_URL` — Base URL of the web app (default: `http://localhost:3000`), used by gateway/cron workers
- `ELASTICSEARCH_URL` — Elasticsearch URL (default: `http://localhost:9200`)
- `OPENAI_ANALYSIS_MODEL` — Model for knowledge base document analysis (default: `gpt-4o-mini`)
- `OPEN_WEATHER_API` — OpenWeatherMap API key for the weather tool
- `NEWS_API_TOKEN` — [NewsAPI](https://newsapi.org/account) token for the news tool
- `CHROME_EXECUTABLE_PATH` — Chrome path for PDF resume generation (defaults to macOS path)
- `DISABLE_TOOLS` — Comma-separated tool groups to disable: `zapier`, `cronjob`, `news`, `ui`, `file`, `cmd`, `memory`, `knowledge_base`, `jira`, `notifications`
- `DISABLE_SECTIONS` — Comma-separated UI sections to hide: `ai`, `jobs`, `mail`, `knowledge-base`, `cronjobs`, `notifications`

**Zapier MCP:**

- `ZAPIER_MCP_URL` — Zapier MCP server URL (required when `zapier` tool group is enabled)
- `ZAPIER_MCP_TOKEN` — Zapier MCP bearer token (required when `zapier` tool group is enabled)

**Telegram Gateway:**

- `TELEGRAM_BOT_TOKEN` — Bot token from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_BOT_USERNAME` — Bot username without the leading `@`
- `TELEGRAM_ADMIN_CHAT_ID` — (optional) Chat ID to receive bot startup notifications

**Embeddable Chat Widget:**

- `WIDGET_API_KEY` — Shared secret for the embeddable chat widget; enables `WebWidgetProvider` in the gateway when set
- `WIDGET_GATEWAY_URL` — Internal URL of the gateway's widget HTTP server (default: `http://localhost:3001`)
- `WIDGET_INTERNAL_PORT` — Port the gateway's widget HTTP server listens on (default: `3001`)

**Jira (bug/feature reporting):**

- `JIRA_BASE_URL` — Jira instance base URL (e.g. `https://yourorg.atlassian.net`)
- `JIRA_EMAIL` — Atlassian account email for the system PAT
- `JIRA_PAT` — Jira Personal Access Token
- `JIRA_DEFAULT_PROJECT` — Default project key for new tickets (e.g. `KAN`)

**Yahoo Mail IMAP:**

- `YAHOO_IMAP_USER` — Full Yahoo email address (e.g. `you@yahoo.com`)
- `YAHOO_IMAP_PASSWORD` — App password from myaccount.yahoo.com → Security → App passwords (not your login password)
- `YAHOO_MAIL_FOLDERS` — Comma-separated folders to poll (default: `INBOX`)
- `YAHOO_MAIL_MAX_EMAILS` — Maximum emails to fetch per ingestion call (default: `50`)

**AWS Bedrock:**

- `AWS_REGION` — AWS region where Bedrock is enabled (e.g. `us-east-1`)
- `AWS_ACCESS_KEY_ID` — AWS access key ID with Bedrock permissions
- `AWS_SECRET_ACCESS_KEY` — AWS secret access key
- `AWS_SESSION_TOKEN` — (optional) Temporary session token for STS / assumed roles
- `BEDROCK_MODEL` — (optional) Bedrock model ID (default: `amazon.nova-pro-v1:0`)

## Run the app

```bash
pnpm install
pnpm dev
```

To run the app with the background job worker:

```bash
pnpm dev:all
```

## Workers

The platform includes background workers that run as separate processes:

| Worker | Command | Description |
|--------|---------|-------------|
| Jobs | `pnpm jobs:dev` | Polls for new job listings, processes them, and generates resumes |
| Cron | `pnpm cron:dev` | Runs scheduled tasks (cronjobs) by calling `/api/chat-sync` on a timer |
| Gateway | `pnpm gateway:dev` | Connects external chat platforms (Telegram) to the AI assistant |

## Communication Gateway

The gateway connects external chat platforms (Telegram, etc.) to the AI assistant. It polls platforms for messages and forwards them to the web app via `/api/chat-sync`.

### Setup (Telegram)

1. Create a bot with [@BotFather](https://t.me/BotFather) and add to your `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your-token
   TELEGRAM_BOT_USERNAME=yourbotname
   ```
2. Add the bot to your Telegram channel as an administrator.

### Start the gateway

```bash
# development (restarts on file changes)
pnpm gateway:dev

# production
pnpm gateway
```

Run alongside the web app:

```bash
pnpm dev          # terminal 1
pnpm gateway:dev  # terminal 2
```

### Docker

```bash
docker compose up gateway --build
```

See [`docs/gateway.md`](docs/gateway.md) for full documentation including how to add new providers.

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `pnpm add @tailwindcss/vite tailwindcss --dev`

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from '@tanstack/react-router';
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
});
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start';

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString();
});

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('');

  useEffect(() => {
    getServerTime().then(setTime);
  }, []);

  return <div>Server time: {time}</div>;
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { json } from '@tanstack/react-start';

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
});
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people');
    return response.json();
  },
  component: PeopleComponent,
});

function PeopleComponent() {
  const data = Route.useLoaderData();
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  );
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
