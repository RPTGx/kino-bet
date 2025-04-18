# Slime Bet

A modern React implementation of the Slime Bet game, built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Interactive betting game with a slime character
- Multiple difficulty levels with different risk/reward profiles
- Real-time obstacle generation
- Animated UI using Framer Motion
- Responsive design with Tailwind CSS

## Project Structure

The project follows a clean, modular architecture:

```
/src
  /app - Next.js App Router pages
  /components
    /game - Game-specific components
    /layout - Layout components like navbar
    /ui - Reusable UI components
```

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Game Rules

- Place a bet and choose a difficulty level
- Click on lanes to move the slime forward
- Each lane has a multiplier that increases your potential winnings
- The further you go, the higher the multiplier
- There's a chance of collision on each move based on difficulty
- Cash out anytime to secure your winnings
- If you hit an obstacle, you lose your bet

## Technologies Used

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion for animations
