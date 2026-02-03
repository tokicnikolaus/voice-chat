import { useAuthStore } from '@/application/stores/authStore';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (username: string, password: string) => {
    clearError();
    await login(username, password);
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <h1 className="title">Voice Chat</h1>
        <p className="subtitle">Sign in to join the conversation</p>

        <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
      </div>

      <style>{`
        .login-page {
          width: 100%;
          max-width: 400px;
          padding: 20px;
        }

        .login-card {
          text-align: center;
          padding: 40px 32px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 20px;
          margin-bottom: 24px;
          color: white;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--text-secondary);
          margin-bottom: 32px;
        }
      `}</style>
    </div>
  );
}
