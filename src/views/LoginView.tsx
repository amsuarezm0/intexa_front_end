import { Eye,EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect,useState } from 'react';
import type { LoggedInUser } from '../App';
import { BrandLogo } from '../components/BrandLogo';
import { setToken } from '../lib/api';
import { friendlyAuthError } from '../lib/authErrors';
import { authService } from '../services';

// Curated Intexa photos for the login background slideshow (served from /public).
const BG_IMAGES = [
  '/login/login-01.jpg',
  '/login/login-02.jpg',
  '/login/login-03.jpg',
  '/login/login-04.jpg',
  '/login/login-05.jpg',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface LoginViewProps {
  onLogin: (user: LoggedInUser) => void;
  /** Error from a failed Microsoft redirect login, shown on mount. */
  initialError?: string;
}

export function LoginView({ onLogin, initialError }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  // Background slideshow — randomised order per visit, gentle crossfade.
  // Frozen on a single image when the user prefers reduced motion.
  const [slides] = useState(() => shuffle(BG_IMAGES));
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide(i => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  const handleMicrosoftLogin = async () => {
    if (msLoading) return; // evita disparar el redirect dos veces con doble clic
    setError('');
    setMsLoading(true);
    try {
      // Redirige a Microsoft; el login se completa al volver, en App.tsx.
      await authService.loginWithMicrosoft();
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
      setMsLoading(false);
    }
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      setToken(res.token);
      onLogin(res.user);
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-brand-bg flex flex-col relative overflow-hidden">
      {/* Background photo slideshow — gentle crossfade through curated Intexa photos */}
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out pointer-events-none ${i === slide ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Readability scrim — keeps the brand aesthetic and legible text while the photo shows through */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-white/65 pointer-events-none" />

      <header className="px-6 sm:px-8 py-4 [@media(max-height:680px)]:py-3 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-9" />
        </div>
        <nav className="flex items-center gap-8 [text-shadow:0_1px_3px_rgba(255,255,255,0.7)]">
          <a href={import.meta.env.VITE_COMPANY_DOMAIN} className="text-sm font-bold text-slate-900 hover:text-brand-accent transition-colors">Empresa</a>
          <a href={`${import.meta.env.VITE_COMPANY_DOMAIN}/servicios`} className="text-sm font-bold text-slate-900 hover:text-brand-accent transition-colors">Soluciones</a>
          <button className="text-sm font-black text-brand-accent px-4 py-2">Ingresar</button>
        </nav>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 relative z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] border border-white shadow-2xl w-full max-w-md text-center space-y-4 sm:space-y-5 [@media(max-height:680px)]:space-y-3"
        >
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight [@media(max-height:680px)]:hidden">Acceda a su panel de control financiero</p>
          </div>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            {msLoading ? 'Conectando con Microsoft...' : 'Continuar con Microsoft'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-slate-300">
              <span className="bg-white px-4">o ingresa con tu correo</span>
            </div>
          </div>

          <form className="space-y-4 [@media(max-height:680px)]:space-y-3 text-left" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">CORREO ELECTRÓNICO</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">CONTRASEÑA</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-brand-primary text-white py-3 rounded-2xl font-bold text-base hover:bg-brand-accent shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

        </motion.div>
      </main>

      <footer className="px-6 sm:px-8 py-4 [@media(max-height:680px)]:py-2 flex items-center justify-center text-[11px] font-bold text-slate-800 relative z-10 shrink-0 [text-shadow:0_1px_3px_rgba(255,255,255,0.7)]">
        <p>© 2026 Intexa ArCa. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
