import { Eye,EyeOff,LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { LoggedInUser } from '../App';
import { setToken } from '../lib/api';
import { authService } from '../services';

interface LoginViewProps {
  onLogin: (user: LoggedInUser) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const handleMicrosoftLogin = async () => {
    if (msLoading) return; // evita disparar el redirect dos veces con doble clic
    setError('');
    setMsLoading(true);
    try {
      // Redirige a Microsoft; el login se completa al volver, en App.tsx.
      await authService.loginWithMicrosoft();
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión con Microsoft');
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
      setError(err.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-primary rounded-full blur-[120px] -mr-96 -mt-96" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-success rounded-full blur-[100px] -ml-48 -mb-48 opacity-50" />
      </div>

      <header className="p-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
             <LayoutDashboard className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold text-brand-primary">Intexa ArCa</span>
        </div>
        <nav className="flex items-center gap-8">
          <a href={import.meta.env.VITE_COMPANY_DOMAIN} className="text-sm font-medium text-slate-500 hover:text-brand-primary transition-colors">Empresa</a>
          <a href={`${import.meta.env.VITE_COMPANY_DOMAIN}/servicios`} className="text-sm font-medium text-slate-500 hover:text-brand-primary transition-colors">Soluciones</a>
          <button className="text-sm font-bold text-brand-primary px-4 py-2">Ingresar</button>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl p-12 rounded-[40px] border border-white shadow-2xl w-full max-w-lg text-center space-y-8"
        >
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-slate-500 font-medium tracking-tight">Acceda a su panel de control financiero</p>
          </div>

          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

          <form className="space-y-6 text-left" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm font-semibold px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">CORREO ELECTRÓNICO</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="px-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">CONTRASEÑA</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all outline-none"
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
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-lg hover:bg-brand-accent shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

        </motion.div>
      </main>

      <footer className="p-8 flex flex-col md:flex-row items-center justify-between text-[11px] font-semibold text-slate-400 relative z-10">
        <p>© 2026 Intexa ArCa. Todos los derechos reservados.</p>
        <div className="flex gap-8 mt-4 md:mt-0">
          <a href="#" className="hover:text-brand-primary transition-colors">Soporte Técnico</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Política de Privacidad</a>
          <a href="#" className="hover:text-brand-primary transition-colors">Términos de Servicio</a>
        </div>
      </footer>
    </div>
  );
}
