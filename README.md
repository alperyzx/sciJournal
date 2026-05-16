# SciJournal Digest

SciJournal Digest is a personalized scientific journal reader built with Next.js. It aggregates journal RSS feeds, lets users choose which journals they want on the home screen, and supports article upvoting with a highlighted feed.

Live at https://scijournal.alperyz.com/

## Features

- **Self-serve sign up** with Google or GitHub.
- **Personalized onboarding** to set a display name and choose an ordered journal list.
- **Home screen curation** so admins can control which journals are visible on the public feed.
- **Upvotes and highlights** with per-user vote tracking and a highlighted article section.
- **Profile management** for updating display name, editing journal preferences, and viewing upvoted articles.
- **Secure account deletion** with a short-lived confirmation captcha.
- **Responsive UI** with a modern header, mobile-friendly layout, and theme toggle.
- **System-based dark mode** by default, with manual override available in the session.
- **Admin console** for creating, editing, deleting, reordering, and toggling journal visibility.

## Tech Stack

- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI
- next-auth
- MongoDB Node driver
- axios, fast-xml-parser, rss-parser, lucide-react

## Data Model

- **Users** store auth identity, display name, onboarding state, and selected journals.
- **Journals** store feed metadata, display order, and home visibility.
- **Articles** are deduplicated by journal, title, and publication date.
- **Votes** are stored relationally against `users._id` and `articles._id`.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

```bash
git clone https://github.com/your-username/scijournal-digest.git
cd scijournal-digest
npm install
npm run dev
```

The app runs at `http://localhost:9002` by default.

### Environment

Set the required auth and database environment variables for local development:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
mongo_scram=
ADMIN=
```

## Usage

- Sign in from the home page.
- Complete onboarding to set your display name and choose journals.
- Use the profile page to reorder journals, review upvoted articles, or delete your account.
- Use the admin page to manage journals and control what appears on the public home screen.

## Project Structure

```
src/
├── ai/          # Lightweight summarization helpers
├── app/         # Next.js app routes and pages
├── components/  # Shared UI and layout components
├── lib/         # Auth, repositories, feeds, utilities
├── services/    # RSS parsing helpers
└── types/       # NextAuth type augmentation
docs/
└── blueprint.md # Product and implementation blueprint
```

## Development

```bash
npm run typecheck
npm run build
```

## Contributing

Contributions are welcome. Please open a pull request with a clear description of the change.

## License

This project is licensed under the MIT License.
