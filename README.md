# DelightBridge

> Your AI-powered email assistant for seamless communication

## What is DelightBridge?

DelightBridge helps you draft, translate, and manage emails effortlessly. With DelightBridge, you can handle multilingual communication with ease.

- **Draft With AI** - Emails that actually sound like you, with context-aware responses
- **Real-Time Translation** - Break language barriers instantly while maintaining your tone
- **Smart Document Management** - Keep everything organized with service-based categorization
- **Conversation History** - Never lose track of important exchanges with full thread views

## Installation

```bash
# Clone the repository
git clone https://github.com/dltpartners-admin/DelightBridge.git
cd delight-bridge

# Install dependencies
pnpm install

# Set up environment variables
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env.local

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Available Commands

```bash
pnpm dev          # Start development server
pnpm build        # Create production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API
- **State Management**: React Context

## Environment Variables

Create a `.env.local` file in the root directory:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

## Documentation

For detailed architecture and design decisions, see:
- [PLAN.md](./PLAN.md) - Project overview and architecture
- [AGENTS.md](./AGENTS.md) - Development guidelines and conventions
