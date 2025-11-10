# Twitter API Viewer

A modern React application for fetching and displaying Twitter user tweets using the [twitterapi.io](https://twitterapi.io) API. Built with React, TypeScript, and Vite.

## Features

- 🔍 **Fetch User Tweets** - Retrieve tweets by username or user ID
- 🎨 **Modern UI** - Beautiful, responsive interface with dark theme
- 📊 **Tweet Display** - View tweets with author info, media, and engagement metrics
- 🔧 **Advanced Options** - Configure pagination, include replies, and more
- 🐛 **Debug Mode** - View raw API requests and responses
- ⚡ **Fast & Lightweight** - Built with Vite for optimal performance

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling (via inline classes)
- **twitterapi.io API** - Twitter data source

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- A [twitterapi.io](https://twitterapi.io) API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jph112233/twiterapi.io-test.git
cd twiterapi.io-test
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## Usage

1. **Enter your API Key** - Get your API key from [twitterapi.io](https://twitterapi.io) and paste it into the API Key field
2. **Enter a Username** - Type a Twitter username (e.g., `gregisenberg`) or user ID
3. **Configure Options** (Optional) - Click "Advanced Options" to:
   - Set a pagination cursor
   - Toggle including replies
   - Use user ID instead of username
4. **Fetch Tweets** - Click the "Fetch Tweets" button to retrieve and display tweets

## API Configuration

This application uses the twitterapi.io API endpoint:
- **Endpoint**: `https://api.twitterapi.io/twitter/user/last_tweets`
- **Method**: GET
- **Authentication**: X-API-Key header
- **Parameters**:
  - `userName` (optional) - Twitter username
  - `userId` (optional) - Twitter user ID
  - `cursor` (optional) - Pagination cursor
  - `includeReplies` (optional) - Boolean to include replies

## Project Structure

```
twiterapi.io-test/
├── App.tsx                 # Main application component
├── index.tsx               # Application entry point
├── index.html             # HTML template
├── services/
│   ├── twitterService.ts  # Twitter API integration
│   └── geminiService.ts   # Legacy service (unused)
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Notes

- The application uses a CORS proxy in development mode to handle API requests
- For production deployment, you may need to configure a backend proxy or ensure the API supports CORS
- API keys are stored in the browser's memory and are not persisted

## License

This project is private and not licensed for public use.

## Repository

GitHub: [https://github.com/jph112233/twiterapi.io-test](https://github.com/jph112233/twiterapi.io-test)
