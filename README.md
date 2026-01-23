
# Baker's Assistant 🥐

Baker's Assistant is a specialized web application designed for sourdough bakers who need precision and flexibility. Unlike generic recipe managers, it provides precise hydration calculations that account for complex ingredients like enrichments (milk, butter), starters, and scalds.

## ✨ Features

- **Advanced Hydration Logic**: Automatically accounts for the water content in milk (87%), butter (16%), and the specific hydration of your sourdough starter.
- **Smart Scaling**: Scale your recipe by yield (portions), target serving weight (e.g., "I want 2 loaves of 500g each"), or total batch weight.
- **Multi-Stage Doughs**: Organize your ingredients into logical stages like "Levain", "Autolyse", or "Main Dough".
- **Offline-First Vault**: Your recipes are saved locally in your browser using IndexedDB (via Dexie), ensuring you can access your formulas anywhere.
- **Real-time Synchronization**: Powered by PartyKit, sync your recipe vault across multiple devices using a simple sync key.
- **AI Baking Assistant**: An integrated Gemini-powered chat to help with fermentation timing, troubleshooting, or recipe substitutions.
- **Shareable Recipes**: Generate base64-encoded share links to send your formulas to other bakers instantly.
- **Cooking Mode**: A focused view to check off ingredients as you weigh them out.
- **Real-time Analysis**: Interactive dashboard showing hydration, total weights, and ingredient percentages as you type.
- **PWA Ready**: Installable on your phone or desktop for quick access and offline use.

## 🛠️ Technical Choices

- **Framework**: [Svelte 5](https://svelte.dev/) utilizing the new **Runes** reactivity model for fine-grained state management.
- **Build Tool**: [Vite](https://vitejs.dev/) and [Bun](https://bun.sh/) for a high-performance development workflow.
- **Language**: TypeScript for robust type safety across complex calculation logic.
- **Styling**: TailwindCSS with a focus on "Premium Utility" (heavy use of micro-interactions and semantic color coding).
- **Persistence**: `dexie.js` for reliable client-side storage via IndexedDB.
- **Sync Server**: [PartyKit](https://partykit.io) for low-latency state synchronization.
- **AI Engine**: Google Generative AI SDK (Gemini) for intelligent baking advice.
- **Testing**: Vitest for unit testing the core hydration and scaling logic.

## 🚀 Deployment

View the app live at: [https://dldx.org/bakers-assistant](https://dldx.org/bakers-assistant)

### Run Locally

**Prerequisites:** Node.js or Bun.

1. Install dependencies:
   ```bash
   bun install
   ```
3. Run the app:
   ```bash
   bun run dev
   ```

## 📦 Deployment

### 1. Deploy the Sync Server (PartyKit)
The vault synchronization uses [PartyKit](https://partykit.io). You need to deploy the server-side logic once:

```bash
bunx partykit deploy
```

After deploying, update the `PUBLIC_PARTYKIT_HOST` in `.env.local` with your new PartyKit URL.

### 2. Deploy the Frontend
This app uses `@sveltejs/adapter-static`, making it compatible with GitHub Pages, Vercel, or Netlify.

1. Build the project:
   ```bash
   bun run build
   ```
2. The production-ready files will be in the `build/` directory.
3. Upload the contents of `build/` to your favorite static hosting provider.

*Note: For GitHub Pages, ensure you set the `BASE_PATH` environment variable if hosting on a subpath.*
