# SciJournal Digest Blueprint

## Product Summary

SciJournal Digest is a personalized scientific journal reader. Users can sign in with Google or GitHub, complete profile setup, choose and order journals, upvote articles, and browse a highlighted feed.

## Current Core Features

- **Authentication**: Google and GitHub sign-in through NextAuth.
- **Onboarding**: Captures display name and the user’s preferred journal order.
- **Personalized Home**: Shows selected journals only, based on user preferences and admin visibility settings.
- **Highlighted Articles**: Aggregates upvoted articles across users.
- **Voting**: Stores votes relationally against `users._id` and `articles._id`.
- **Profile Management**: Edit display name, reorder journals, inspect upvoted articles, and unvote.
- **Account Deletion**: Protected by a short-lived captcha confirmation flow.
- **Admin Console**: Create, edit, delete, reorder, and hide/show journals from the home screen.
- **RSS Aggregation**: Fetches and parses RSS feeds server-side, caches results, and deduplicates articles.

## Data Model

- **users**: auth identity, role, onboarding state, display name, selected journals.
- **journals**: feed URL, type, order, and `homeVisible` flag.
- **articles**: journal name, title, link, description, publication date, vote count.
- **votes**: `userId`, `articleId`, created timestamp, optional legacy email fallback.

## Rendering and Behavior

- The home page uses a modern fixed header with search, theme toggle, and personalization button.
- Dark mode follows the user’s system preference by default and updates when the OS theme changes.
- Mobile header controls should remain visually subordinate to the title.
- Public RSS content should only include journals marked visible for the home screen.

## Implementation Notes

- RSS feeds are fetched on the server under `src/app/api/rss`.
- User profile and onboarding state live in `src/app/api/user/profile`.
- Highlighted and upvoted views are driven from vote records and user session state.
- Admin journal actions live in `src/app/api/admin/journals`.
- Authentication state is enriched in `src/lib/auth.ts` and exposed through `session.user.id`.

## Styling Guidelines

- Use a clean white or near-white surface in light mode.
- Use muted blue and teal accents for interactive elements.
- Keep typography readable and compact on mobile.
- Prefer card-based layouts with clear spacing and subtle gradients.
- Preserve a calm, editorial feel rather than a dense dashboard layout.

## Legacy Origin

The project began as a journal RSS aggregator for 10 scientific journals, but it has since evolved into a personalized, account-based digest with admin-managed visibility and user-specific preferences.
  