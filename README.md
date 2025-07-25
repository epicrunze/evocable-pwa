# Evocable PWA

A Progressive Web App for converting documents into audiobooks. Upload your PDF, EPUB, or TXT files and listen to them as high-quality audiobooks.

## Features

### Currently Working
- 🔐 **Authentication** - Secure login and session management
- 📚 **Library Management** - View and organize your audiobook collection
- 📄 **Document Upload** - Support for PDF, EPUB, and TXT files
- 🎵 **Audio Player** - Stream and play generated audiobooks
- 🔍 **Search & Filter** - Find books in your library
- 📱 **Progressive Web App** - Install and use offline
- 🌐 **API Integration** - Connects to audiobook generation service

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS
- **State Management**: TanStack Query, Zustand
- **Storage**: IndexedDB for offline support
- **PWA**: Service Worker with Workbox

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd evocable-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your API configuration:
```env
NEXT_PUBLIC_API_URL=https://your-api-server.com
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── common/            # Shared components (Layout, RouteGuard)
│   ├── features/          # Feature-specific components
│   │   ├── auth/         # Authentication components
│   │   ├── library/      # Book management
│   │   ├── upload/       # File upload
│   │   └── player/       # Audio player
│   └── ui/               # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and API client
└── types/                 # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Supported File Formats

- **PDF** - Portable Document Format
- **EPUB** - Electronic Publication format
- **TXT** - Plain text files

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API server URL | `http://localhost:8000` |
| `NODE_ENV` | Environment mode | `development` |


## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
