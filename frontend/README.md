# MathMentor Frontend

Production-ready Next.js frontend for the MathMentor AI tutoring platform.

## Features

- 🎯 **Chat Interface** - Ask math questions and get AI-powered explanations
- 📚 **Concept Explorer** - Browse and explore math concepts by topic
- 📊 **Progress Dashboard** - Track your learning progress
- ✨ **LaTeX Rendering** - Beautiful math equation rendering
- 🎨 **Modern UI** - Built with Tailwind CSS and Lucide icons

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development

- **Run dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Start production server:** `npm start`
- **Lint code:** `npm run lint`

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ChatInterface.tsx  # Main chat UI
│   ├── ConceptExplorer.tsx # Concept browser
│   ├── ProgressDashboard.tsx # Progress tracking
│   └── MarkdownRenderer.tsx # LaTeX/markdown renderer
├── lib/                   # Utilities
│   └── api.ts            # API client
└── package.json          # Dependencies
```

## API Integration

The frontend connects to the FastAPI backend at `NEXT_PUBLIC_API_URL`. Make sure your backend is running before using the frontend.

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Markdown** - Markdown rendering
- **KaTeX** - LaTeX math rendering
- **Lucide React** - Icons
