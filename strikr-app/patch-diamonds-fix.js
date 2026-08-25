// Corrige l'affichage des diamants qui pouvait rester bloqué à 200 juste
// apres une mise a jour OTA (ce que tu as vu ce matin). Tes vrais diamants
// n'ont jamais bouge sur le serveur (verifie : 10 423, pas 200) - c'etait
// un bug d'affichage local : le chargement du solde ne reessayait pas
// assez apres une mise a jour, et retombait definitivement sur 200 pour
// la session. Meme correctif (essais multiples) deja utilise avec succes
// pour le streak dans stats.tsx.
//
// Pas de nouvelle dependance, part par eas update, pas besoin de nouveau
// build.
//
// A appliquer depuis la racine du repo OU depuis strikr-app :
//   node patch-diamonds-fix.js
//   git add -A
//   git commit -m "Corrige l'affichage des diamants bloque a 200 apres une mise a jour"
//   git push -u origin main
//   cd strikr-app
//   eas update --branch production --platform ios
//   eas update --branch production --platform android

const fs = require('fs');
const path = require('path');

function resolveBase() {
  const candidates = [path.join(__dirname, 'strikr-app'), __dirname];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) && fs.existsSync(path.join(c, 'App.tsx'))) {
      return c;
    }
  }
  throw new Error(
    "Impossible de trouver le dossier strikr-app (avec package.json et App.tsx dedans). " +
    "Lance ce script depuis la racine du repo (a cote du dossier strikr-app) ou depuis l'interieur de strikr-app."
  );
}
const BASE = resolveBase();
console.log('dossier detecte :', BASE);

function write(rel, content) {
  const full = path.join(BASE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log('wrote', rel);
}

write("src/state/diamonds.tsx", "// Shared diamond wallet across STRIKR's mini-games (main game + daily challenge).\n// Backed by the signed-in user's Supabase profile row (login is mandatory,\n// so there's no local-only/guest fallback to maintain).\nimport React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';\nimport { supabase } from '../lib/supabase';\nimport { useAuth } from './auth';\n\nconst DEFAULT_BALANCE = 200;\n\ninterface DiamondsContextValue {\n  diamonds: number;\n  addDiamonds: (delta: number) => void;\n  // For deltas already applied server-side by some other RPC (e.g. redeeming\n  // a referral code) — updates the local display without a second increment.\n  syncLocalDelta: (delta: number) => void;\n  ready: boolean;\n}\n\nconst DiamondsContext = createContext<DiamondsContextValue | null>(null);\n\nexport function DiamondsProvider({ children }: { children: React.ReactNode }) {\n  const { user } = useAuth();\n  const [diamonds, setDiamonds] = useState(DEFAULT_BALANCE);\n  const [ready, setReady] = useState(false);\n  const loadedForUser = useRef<string | null>(null);\n\n  // Retries instead of a single short timeout: right after an OTA update,\n  // the first launch on the new bundle does extra cold-start work (bundle\n  // verification, a fresh Metro/Hermes warmup, re-establishing the\n  // Supabase session) on top of the network round trip, so a one-shot\n  // fetch used to lose that race often enough to permanently fall back to\n  // DEFAULT_BALANCE for the rest of the session — displaying 200 while the\n  // real server balance (never touched, addDiamonds always writes via an\n  // atomic RPC) stayed correct underneath. Same fix already applied to the\n  // streak/XP load in stats.tsx.\n  useEffect(() => {\n    if (!user) {\n      setReady(false);\n      loadedForUser.current = null;\n      return;\n    }\n    if (loadedForUser.current === user.id) return;\n    let cancelled = false;\n    let attempt = 0;\n    const MAX_ATTEMPTS = 5;\n\n    const tryLoad = () => {\n      attempt += 1;\n      supabase\n        .from('profiles')\n        .select('diamonds')\n        .eq('id', user.id)\n        .single()\n        .then(({ data, error }) => {\n          if (cancelled) return;\n          // A request can resolve without throwing (so .catch() below never\n          // fires) yet still carry an `error` — e.g. the Supabase session\n          // isn't fully re-established yet right after an OTA cold start.\n          // Treat that exactly like a network failure (retry) instead of\n          // silently accepting `data: undefined` as \"loaded successfully\".\n          if (error) throw error;\n          setDiamonds(data?.diamonds ?? DEFAULT_BALANCE);\n          loadedForUser.current = user.id;\n          setReady(true);\n        })\n        .catch(() => {\n          if (cancelled) return;\n          if (attempt < MAX_ATTEMPTS) {\n            setTimeout(tryLoad, 3000);\n            return;\n          }\n          // Genuinely can't reach the server after several tries — let the\n          // player use the app with the default for this session.\n          setDiamonds(DEFAULT_BALANCE);\n          loadedForUser.current = user.id;\n          setReady(true);\n        });\n    };\n    tryLoad();\n    return () => {\n      cancelled = true;\n    };\n  }, [user]);\n\n  const addDiamonds = useCallback(\n    (delta: number) => {\n      // Sent as an atomic server-side increment (not a read-then-absolute-write),\n      // so two rapid-fire spends/rewards can never race and clobber each other\n      // when their network responses arrive out of order.\n      if (user) {\n        supabase.rpc('increment_diamonds', { delta_arg: delta }).then(() => {});\n      }\n      setDiamonds((prev) => Math.max(0, prev + delta));\n    },\n    [user]\n  );\n\n  const syncLocalDelta = useCallback((delta: number) => {\n    setDiamonds((prev) => Math.max(0, prev + delta));\n  }, []);\n\n  return <DiamondsContext.Provider value={{ diamonds, addDiamonds, syncLocalDelta, ready }}>{children}</DiamondsContext.Provider>;\n}\n\nexport function useDiamonds() {\n  const ctx = useContext(DiamondsContext);\n  if (!ctx) throw new Error('useDiamonds must be used within DiamondsProvider');\n  return ctx;\n}\n");
