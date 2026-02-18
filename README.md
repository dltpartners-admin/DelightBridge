# 🌉 Delight Bridge

> Your AI-powered email assistant for seamless communication

**Delight Bridge** helps you draft, translate, and manage emails effortlessly—because you deserve a better morning.

---

## ✨ Features

### 📝 Draft With AI
Emails that actually sound like you.
- Your tone and voice perfectly captured
- Context-aware responses based on conversation history
- Intelligent document integration

### 🔍 Search That Actually Works
Ask questions, get answers.
- No more digging through endless threads
- Semantic search across all your conversations
- Smart categorization and filtering

### 🌐 Real-Time Translation
Break language barriers instantly.
- Translate emails and drafts on the fly
- Support for multiple languages
- Maintain your original tone across languages

### 🗂️ Smart Document Management
Keep everything organized.
- Service-based categorization
- Document version control
- Quick access to relevant context

### 💬 Conversation History
Never lose track of important exchanges.
- Full thread view with translations
- Smart conversation grouping
- Easy navigation through past communications

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/dltpartners-admin/delight-bridge.git
cd delight-bridge

# Install dependencies
pnpm install

# Set up environment variables
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env.local

# Start development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

---

## 🛠️ Available Commands

```bash
pnpm dev          # Start development server
pnpm build        # Create production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

---

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API
- **State Management**: React Context (no external dependencies)

---

## 📁 Project Structure

```
delight-bridge/
├── src/
│   ├── app/              # Next.js app router pages & API routes
│   ├── components/       # React components
│   ├── lib/             # Utilities, types, and mock data
│   └── ...
├── PLAN.md              # Architecture and design specs
├── AGENTS.md            # Development guidelines
└── README.md            # You are here
```

---

## 🔒 Security & Privacy

- Bank-grade encryption for all communications
- Your data stays yours—no unauthorized access
- Secure API key management
- Privacy-first architecture

---

## 📋 Environment Variables

Create a `.env.local` file in the root directory:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🎯 Roadmap

- [ ] Multi-account support
- [ ] Custom AI model selection
- [ ] Advanced search filters
- [ ] Email scheduling
- [ ] Mobile app

---

## 📖 Documentation

For detailed architecture and design decisions, see:
- [PLAN.md](./PLAN.md) - Project overview and architecture
- [AGENTS.md](./AGENTS.md) - Development guidelines and conventions

---

## 🤝 Contributing

Contributions are welcome! Please follow the guidelines in [AGENTS.md](./AGENTS.md) for commit discipline and code style.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 💬 Support

Have questions or feedback? Open an issue or reach out to [admin@dlt-partners.com](mailto:admin@dlt-partners.com)

---

<div align="center">

**You deserve a better morning ☕**

[Privacy Policy](#) • [Terms & Conditions](#)

Made with ❤️ by DLT Partners

</div>
