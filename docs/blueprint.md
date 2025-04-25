# **App Name**: SciJournal Digest

## Core Features:

- RSS Feed Fetcher: Fetches RSS feeds from the specified scientific journals.
- RSS Feed Parser: Parses the RSS feeds and extracts relevant information (title, description, publication date, link).
- Article Filter: Filters articles published within the last 7 days.
- Article Grouping: Groups articles by journal name for organized display.
- Article Display: Displays articles in a clean, responsive UI, showing title, publication date, brief description, and a link to the full article.

## Style Guidelines:

- Primary color: Clean white or light grey for readability.
- Secondary color: Muted blue or green for accents and interactive elements.
- Accent: Teal (#008080) for focus elements.
- Clear and readable sans-serif font for body text.
- Card-based layout for each article to provide a clear visual structure.
- Use of whitespace to create a clean and uncluttered interface.
- Simple icons to represent journal categories or article types.
- Group related subjects in a circle

## Original User Request:
Project Overview

    Objective: Build a web application that fetches articles from 10 scientific journals' RSS feeds, filters articles from the past week, groups them by journal, and displays them in a user-friendly interface.
    Tech Stack:
        Frontend: React.js with Tailwind CSS for styling.
        Backend: Firebase Functions (Node.js) to fetch and parse RSS feeds (to handle CORS and server-side processing).
        Hosting: Firebase Hosting for the frontend.
        Dependencies: rss-parser for RSS feed parsing, axios for HTTP requests.
    Features:
        Fetch RSS feeds from 10 journals (listed below).
        Filter articles published in the last 7 days.
        Group articles by journal name.
        Display articles with title, publication date, description, and a link to the full article.
        Responsive, clean UI with Tailwind CSS.
        Weekly automatic updates (handled via Firebase Scheduled Functions).

Journal List and RSS Feeds

The application will track the following journals and their RSS feeds:

    IEEE Transactions on Engineering Management: https://ieeexplore.ieee.org/rss/TOC17.XML
    International Journal of Technology Management: https://www.inderscienceonline.com/action/showFeed?type=etoc&feed=rss&jc=ijtm
    International Journal of Innovation Management: https://www.worldscientific.com/action/showFeed?type=etoc&feed=rss&jc=ijim
    Computers in Industry: https://rss.sciencedirect.com/publication/science/01663615
    Technovation: https://rss.sciencedirect.com/publication/science/01664972
    Computers & Industrial Engineering: https://rss.sciencedirect.com/publication/science/03608352
    Advanced Engineering Informatics: https://rss.sciencedirect.com/publication/science/14740346
    Technological Forecasting and Social Change: https://rss.sciencedirect.com/publication/science/00401625
    Technology in Society: https://rss.sciencedirect.com/publication/science/0160791X
    World Patent Information: https://rss.sciencedirect.com/publication/science/01722190
  