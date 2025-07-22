# Project Structure

## Repository Organization

This is a monorepo containing both frontend and backend applications:

```
viktoria-wertheim/
├── frontend/                   # Next.js frontend application
├── backend/                    # Strapi CMS backend
├── package.json               # Monorepo workspace configuration
├── README.md                  # Project documentation
└── .env.example              # Environment variables template
```

## Frontend Structure (frontend/)
```
frontend/
├── src/
│   └── app/                     # Next.js App Router pages
├── public/                      # Static assets
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json                # Dependencies and scripts
```

## Backend Structure (backend/)
```
backend/
├── src/                        # Strapi application code
├── config/                     # Strapi configuration
├── database/                   # Database migrations and schema
├── public/                     # Public uploads
├── types/                      # TypeScript type definitions
└── package.json               # Dependencies and scripts
```

## Key Configuration Files

- **Frontend**: `next.config.js` (image optimization for Strapi), `tailwind.config.js` (custom colors/animations)
- **Backend**: `tsconfig.json` (TypeScript config), Strapi config files in `/config`

## Development Workflow

1. Start both services: `npm run dev` (from root)
2. Or individually:
   - Backend: `cd backend && npm run develop`
   - Frontend: `cd frontend && npm run dev`
3. Backend runs on port 1337, frontend on port 3000

## Content Models (Strapi)

Key content types include:
- News articles
- Teams/Mannschaften
- Players/Spieler
- Matches/Spiele
- Sponsors