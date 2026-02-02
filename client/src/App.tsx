import { useRoomStore } from '@/application/stores/roomStore';
import { useWebSocket } from '@/application/hooks/useWebSocket';
import { JoinRoom } from '@/presentation/components/JoinRoom/JoinRoom';
import { VoiceRoom } from '@/presentation/components/VoiceRoom/VoiceRoom';
import { ConnectionStatus } from '@/presentation/components/common/ConnectionStatus';
import { ErrorBanner } from '@/presentation/components/common/ErrorBanner';
import '@/presentation/styles/global.css';

export function App() {
  const { connectionState, currentRoom, error, setError } = useRoomStore();
  useWebSocket();

  return (
    <div className="app">
      <ConnectionStatus state={connectionState} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <main className="main-content">
        {currentRoom ? <VoiceRoom /> : <JoinRoom />}
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
