<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1EHoWXL0yQvZpGZ_fOGfMOFJVjCoi5GUZ

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment

### 1. Deploy the Sync Server (PartyKit)
The vault synchronization uses [PartyKit](https://partykit.io). You need to deploy the server-side logic once:

```bash
npx partykit deploy
```

After deploying, update the `PUBLIC_PARTYKIT_HOST` in `.env.local` with your new PartyKit URL.

### 2. Deploy the Frontend
This app uses `@sveltejs/adapter-static`, making it compatible with GitHub Pages, Vercel, or Netlify.

1. Build the project:
   ```bash
   npm run build
   ```
2. The production-ready files will be in the `build/` directory.
3. Upload the contents of `build/` to your favorite static hosting provider.

*Note: For GitHub Pages, ensure you set the `BASE_PATH` environment variable if hosting on a subpath.*
