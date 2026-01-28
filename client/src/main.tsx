import ReactDOM from 'react-dom/client';
import App from './App';

// Disabled StrictMode to prevent WebSocket connection issues
// StrictMode causes double renders in development which can close WebSocket connections
// You can re-enable it later if needed: <React.StrictMode><App /></React.StrictMode>
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
