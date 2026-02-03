import { useEffect, useState } from 'react';
import { useRoomStore } from '@/application/stores/roomStore';
import { useAuthStore } from '@/application/stores/authStore';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { LoginPage } from '@/presentation/components/Login';
import { Lobby } from '@/presentation/components/Lobby';
import { VoiceRoom } from '@/presentation/components/VoiceRoom/VoiceRoom';
import { ConnectionStatus } from '@/presentation/components/common/ConnectionStatus';
import { ErrorBanner } from '@/presentation/components/common/ErrorBanner';
import '@/presentation/styles/global.css';

export function App() {
  const { connectionState, currentRoom, error, setError } = useRoomStore();
  const { isAuthenticated, restoreSession } = useAuthStore();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  useWebSocket();

  // Restore session on app load
  useEffect(() => {
    restoreSession().finally(() => {
      setIsRestoringSession(false);
    });
  }, [restoreSession]);

  // Show loading while restoring session
  if (isRestoringSession) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading...</p>
        </div>

        <style>{`
          .app {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .loading-screen {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: var(--text-secondary);
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--border-color);
            border-top-color: var(--accent-primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        <main className="main-content">
          <LoginPage />
        </main>

        <style>{`
          .app {
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .main-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            min-height: 0;
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  // Determine which view to show based on current room
  const isInLobby = !currentRoom || currentRoom.name === 'Lobby';

  return (
    <div className="app">
      <ConnectionStatus state={connectionState} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <main className="main-content">
        {isInLobby ? <Lobby /> : <VoiceRoom />}
      </main>

      <style>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .main-content {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          min-height: 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;
