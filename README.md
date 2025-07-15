# SciJournal Digest

A modern web application that aggregates and displays scientific journal articles in an organized, user-friendly interface.

Live at https://scijournal.alperyz.com/ 

## Features

- **Journal Organization**: Articles are grouped by journal name in expandable accordion sections
- **Responsive Design**: Optimized for mobile, tablet, and desktop viewing
- **Pagination**: Browse through multiple articles for each journal
- **Modern UI**: Clean interface with gradient accents and subtle animations
- **Error Handling**: Graceful handling of loading states and fetch errors

## Technologies Used

- React
- TypeScript
- Next.js
- Tailwind CSS
- Shadcn UI Components

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/scijournal-digest.git
cd scijournal-digest

# Install dependencies
npm install
# or
yarn install

# Start the development server
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`.

## Usage

- Browse through different journals by clicking on their names in the accordion
- Navigate between pages of articles using the pagination controls
- Click "Read Full Article" to view the complete article on its original site

## Project Structure

```
scijournal-digest/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # Reusable UI components
│   └── styles/       # Global styles
├── public/           # Static assets
├── package.json      # Project dependencies
└── README.md         # Project documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
