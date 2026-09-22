# PlayRates

PlayRates is a full-stack video game tracking website I am building, using React/TypeScript (frontend) and Node/Express (backend). Log and rate the games you've played, manage your backlog and wishlist, and interact with friends and the community. The app is live at [playrates.vercel.app](https://playrates.vercel.app).

## Installation and Setup

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine
- A [Supabase](https://supabase.com) project
- A [RAWG API key](https://rawg.io/apidocs), for the games catalogue

### Setup

```bash
## Clone the repository
git clone https://github.com/CallumB04/playrates.git

## Navigate to the project directory
cd playrates

## Install dependencies for all three workspaces
npm install

## Copy the environment files and fill in your keys
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

## Apply the database schema
npx supabase link --project-ref <your-project-ref>
npx supabase db push

## Pull in a starter catalogue of games
npm run seed:games -w backend

## Start the frontend and backend
npm run dev
```

> The application will be live at http://localhost:5173
