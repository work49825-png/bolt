export const FULLSTACK_SAAS_TEMPLATE_NAME = 'Fullstack SaaS';

export const fullstackSaasTemplateFiles: { path: string; content: string }[] = [
  {
    path: 'package.json',
    content: JSON.stringify(
      {
        name: 'fullstack-saas-starter',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc -b && vite build',
          preview: 'vite preview',
        },
        dependencies: {
          '@supabase/supabase-js': '^2.49.1',
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          'react-router-dom': '^6.28.0',
        },
        devDependencies: {
          '@types/react': '^18.3.12',
          '@types/react-dom': '^18.3.1',
          '@vitejs/plugin-react': '^4.3.4',
          autoprefixer: '^10.4.20',
          postcss: '^8.4.49',
          tailwindcss: '^3.4.16',
          typescript: '^5.6.3',
          vite: '^5.4.11',
        },
      },
      null,
      2,
    ),
  },
  {
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
  },
  {
    path: 'index.html',
    content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  },
  {
    path: 'tsconfig.json',
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
`,
  },
  {
    path: 'postcss.config.js',
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
  },
  {
    path: 'tailwind.config.js',
    content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
`,
  },
  {
    path: 'src/index.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-950 text-slate-100 min-h-screen;
}
`,
  },
  {
    path: 'src/main.tsx',
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
`,
  },
  {
    path: 'src/App.tsx',
    content: `import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
`,
  },
  {
    path: 'src/lib/supabase.ts',
    content: `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Auth and database calls will be disabled until you configure them in .env.',
  );
}

// Use placeholder values so createClient does not throw at import time when the
// project is opened in preview without configured credentials. Calls will fail
// at runtime with clear errors instead of crashing the module graph.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
    },
  },
);
`,
  },
  {
    path: 'src/contexts/AuthContext.tsx',
    content: `import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase isn't configured, don't block the UI on a network call that will fail.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.warn('[auth] getSession failed:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
`,
  },
  {
    path: 'src/components/ProtectedRoute.tsx',
    content: `import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // When Supabase isn't configured we render the protected view directly so the
  // preview is never blank. The user can wire up auth later via .env.
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
`,
  },
  {
    path: 'src/pages/Login.tsx',
    content: `import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const successMessage = (location.state as { message?: string } | null)?.message;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {successMessage && <p className="text-sm text-green-400">{successMessage}</p>}
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Password</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="text-sm text-slate-400">
          No account? <Link className="text-indigo-400 hover:underline" to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
`,
  },
  {
    path: 'src/pages/Signup.tsx',
    content: `import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      navigate('/dashboard', { replace: true });
      return;
    }

    navigate('/login', {
      replace: true,
      state: { message: 'Account created. Sign in to continue.' },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="text-2xl font-semibold">Create account</h1>
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Password</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Confirm password</span>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
        <p className="text-sm text-slate-400">
          Have an account? <Link className="text-indigo-400 hover:underline" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
`,
  },
  {
    path: 'src/pages/Dashboard.tsx',
    content: `import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Dashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400">
            {user ? \`Signed in as \${user.email}\` : 'Welcome — Supabase auth is not configured yet.'}
          </p>
        </div>
        {user && (
          <button onClick={() => signOut()} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
            Sign out
          </button>
        )}
      </header>
      <main className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3">
        <p>Extend this dashboard with your app features.</p>
        {!isSupabaseConfigured && (
          <p className="text-sm text-amber-300">
            Heads up: <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are empty in <code>.env</code>.
            Set them to enable real authentication.
          </p>
        )}
      </main>
    </div>
  );
}
`,
  },
  {
    path: '.env',
    content: `VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
`,
  },
];

export function getFullstackSaasTemplateFiles(credentials?: {
  supabaseUrl?: string;
  anonKey?: string;
}): { path: string; content: string }[] {
  if (!credentials?.supabaseUrl || !credentials?.anonKey) {
    return fullstackSaasTemplateFiles;
  }

  return fullstackSaasTemplateFiles.map((file) =>
    file.path === '.env'
      ? {
          path: '.env',
          content: `VITE_SUPABASE_URL=${credentials.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${credentials.anonKey}\n`,
        }
      : file,
  );
}
