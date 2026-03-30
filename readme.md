# RootFacts 🌿

An AI-powered Progressive Web App (PWA) that recognizes plants and root vegetables from images and delivers fun, educational facts about them — all running directly in the browser with no server-side inference required.

🌐 **Live Demo:** [rootfacts-dico.netlify.app](https://rootfacts-dico.netlify.app/)

---

## Features

- **AI-Powered Plant Recognition** — identifies plants and root vegetables from uploaded or captured images using on-device machine learning (TensorFlow.js + Hugging Face Transformers)
- **In-Browser Inference** — models run entirely client-side via WebGPU/WASM; no API keys or backend required for recognition
- **Fun Facts Engine** — surfaces interesting facts about identified plants and roots after each recognition
- **PWA Support** — installable to home screen on mobile and desktop; fully functional offline after first load
- **React 19 UI** — fast, component-driven interface with smooth interactions
- **Accessible & Responsive** — mobile-first design with accessibility baked in

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | [React](https://react.dev/) v19 |
| Build Tool | [Vite](https://vitejs.dev/) v6 |
| ML / Inference | [TensorFlow.js](https://www.tensorflow.org/js) v4 + [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) v3 |
| GPU Acceleration | TensorFlow.js WebGPU backend |
| Icons | [Lucide React](https://lucide.dev/) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) |
| Linting | ESLint (Dicoding Academy config) |
| Deployment | Netlify |

---

## Getting Started

### Prerequisites

- **Node.js v18+**
- **npm v9+**
- A modern browser with **WebGPU support** for best performance (Chrome 113+, Edge 113+). The app falls back gracefully to WASM on unsupported browsers.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Masykster/Root-Facts-Dico.git
cd Root-Facts-Dico

# 2. Install dependencies
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

> **First load note:** On first run, the Hugging Face model weights will be downloaded and cached by the browser. This may take a moment depending on your connection — subsequent loads are instant.

### Build & Preview

```bash
# Production build
npm run build

# Preview the production build locally
npm run preview
```

### Linting

```bash
npm run lint
```

---

## Project Structure

```
Root-Facts-Dico/
├── public/             # Static assets (icons, PWA manifest)
├── src/
│   ├── components/     # React UI components
│   ├── hooks/          # Custom React hooks (ML inference, etc.)
│   ├── utils/          # Helper utilities
│   └── main.jsx        # App entry point
├── index.html          # HTML entry point
├── vite.config.js      # Vite + PWA configuration
├── eslint.config.mjs   # ESLint configuration
└── package.json
```

---

## How It Works

1. **Upload or capture** a photo of a plant or root vegetable
2. **On-device AI** runs the image through a classification model (TensorFlow.js / Transformers.js) — no data leaves your device
3. **Results & facts** are displayed: the identified plant name along with curated fun facts

---

## PWA & Offline Support

RootFacts is installable as a PWA:

1. Open the app in Chrome or Edge (mobile or desktop)
2. Accept the **Install** prompt, or use the browser menu → *"Add to Home Screen"*
3. The app launches in standalone mode

Once installed and loaded at least once, the app shell and cached assets are available offline. On-device inference means recognition continues to work without an internet connection after the model is cached.

---

## Deployment

The project is deployed on Netlify. To deploy your own fork:

1. Push your fork to GitHub
2. Connect the repo to [Netlify](https://www.netlify.com/)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Update `APP_URL` in `STUDENT.txt` with your Netlify URL