# Voice Group Chat for Gaming Cafe - Implementation Plan

## Overview
Build a self-hosted, browser-based voice chat system for 30+ PC gaming cafe with room-based communication.

---

## Core Requirements Summary

### Platform & Infrastructure
- **Platform**: Web browser (all modern browsers: Chrome, Firefox, Edge, Safari)
- **Hosting**: Self-hosted on local server in cafe (shared with other services)
- **Scale**: 30+ concurrent users
- **Offline**: Must work on LAN only (no internet dependency)
- **Reliability**: Auto-restart on crash, Docker-based deployment

### User Access
- **Access method**: Browser bookmark on each cafe PC
- **Audio setup**: Headsets required (echo cancellation still included)
- **User skill level**: Mixed audience (needs clear, guided UI)
- **Languages**: Multi-language ready (i18n architecture)

---

## Feature Specifications

### Room System

| Feature | Specification |
|---------|---------------|
| Room creation | Enter room name + username → creates or joins existing |
| Room discovery | Both public list + private (type name to join) |
| Room capacity | Default 10-15, configurable by admin per room |
| Empty room behavior | Keep for 5-10 minutes, then auto-delete |
| Duplicate usernames | Add funny random suffix (e.g., "John_banana") |
| Room naming | No restrictions on names |
| Preset rooms | Admin-created only (no user-created permanent rooms) |
| Room preview | Show participant list before joining |

### Voice Features

| Feature | Specification |
|---------|---------------|
| Default mode | User chooses PTT or VAD on join |
| Push-to-talk key | User configurable |
| PTT timeout | Warning notification after 30s of silence |
| Voice activity detection | Built-in with noise suppression |
| Audio quality | Standard 24kHz (~25kbps) |
| Volume controls | Master + per-user sliders |
| Sound effects | All events (join, leave, mute, unmute) |
| Keyboard shortcuts | Browser-focused only (global hotkeys later) |

### Visual Design

| Feature | Specification |
|---------|---------------|
| Theme | Dark gaming theme (customizable later) |
| Room layout | Grid of avatar cards |
| Speaking indicators | Glowing border + waveform + pulsing icon (all) |
| Avatars | Auto-generated from username |
| Connection quality | Always visible indicators |
| User status | Muted indicator only (no DND/away) |

### Join Flow
1. Enter room name + username
2. Choose voice mode (PTT or VAD)
3. Preview room (see participants)
4. Confirm to join
5. Microphone permission required (blocks entry if denied)

### Connection Handling

| Scenario | Behavior |
|----------|----------|
| Connection drop | Auto-reconnect silently |
| Server crash | Show error, manual refresh required |
| Mic permission denied | Block entry to room |

---

## Admin System

### Authentication
- Password + specific PC whitelist (IP-based)
- Must be on authorized PC AND know password

### Admin Capabilities
- **Mute users**: Force-mute disruptive users
- **Kick users**: Remove from room
- **Ban users**: Temporary block from rejoining
- **Close rooms**: Shut down any room
- **View all rooms**: Dashboard of active rooms
- **Stealth mode**: Listen to any room without appearing in participant list
- **Create preset rooms**: Admin-only room creation for permanent rooms

### Analytics & Logging
- Detailed logs: who joined what room, when, duration
- Active rooms count
- User count, peak times
- Admin dashboard for monitoring

---

## Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript | User interface |
| Signaling Server | Go + Gorilla WebSocket | Room management, user coordination |
| Media Server | LiveKit (SFU) | WebRTC audio routing |
| Audio | WebRTC + Web Audio API | Voice capture & playback |

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Gaming Cafe LAN                          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  PC #1   │  │  PC #2   │  │  PC #N   │                  │
│  │ (Browser)│  │ (Browser)│  │ (Browser)│                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│       └─────────────┼─────────────┘                         │
│                     │ WebSocket + WebRTC                    │
│                     ▼                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Local Server (Shared PC)                │  │
│  │  ┌─────────────────┐    ┌─────────────────────────┐  │  │
│  │  │   Go Server     │    │  LiveKit Server (SFU)   │  │  │
│  │  │  - Room mgmt    │◄──►│  - Audio routing        │  │  │
│  │  │  - Admin API    │    │  - WebRTC handling      │  │  │
│  │  │  - User auth    │    │  - Voice processing     │  │  │
│  │  │  - Logging      │    │  - Quality adaptation   │  │  │
│  │  └─────────────────┘    └─────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
voice-group-poc/
├── server/
│   ├── main.go                    # Entry point
│   ├── go.mod / go.sum
│   ├── config/
│   │   └── config.go              # Configuration management
│   ├── handlers/
│   │   ├── websocket.go           # WebSocket handlers
│   │   └── admin.go               # Admin API endpoints
│   ├── rooms/
│   │   └── manager.go             # Room state, capacity, cleanup
│   ├── users/
│   │   └── manager.go             # User sessions, funny suffixes
│   ├── livekit/
│   │   └── token.go               # Token generation
│   ├── admin/
│   │   ├── auth.go                # Password + IP verification
│   │   └── actions.go             # Mute, kick, ban, stealth
│   ├── logging/
│   │   └── analytics.go           # Usage tracking
│   └── Dockerfile
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── i18n/                  # Internationalization
│   │   │   ├── en.json
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── JoinRoom/
│   │   │   │   ├── RoomNameInput.tsx
│   │   │   │   ├── UsernameInput.tsx
│   │   │   │   ├── VoiceModeSelect.tsx
│   │   │   │   └── RoomPreview.tsx
│   │   │   ├── VoiceRoom/
│   │   │   │   ├── VoiceRoom.tsx
│   │   │   │   ├── ParticipantGrid.tsx
│   │   │   │   ├── ParticipantCard.tsx
│   │   │   │   ├── SpeakingIndicator.tsx
│   │   │   │   └── ConnectionQuality.tsx
│   │   │   ├── Controls/
│   │   │   │   ├── AudioControls.tsx
│   │   │   │   ├── VolumeSlider.tsx
│   │   │   │   ├── PTTButton.tsx
│   │   │   │   └── KeybindSettings.tsx
│   │   │   ├── Admin/
│   │   │   │   ├── AdminLogin.tsx
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── RoomList.tsx
│   │   │   │   └── UserActions.tsx
│   │   │   └── common/
│   │   │       ├── Avatar.tsx
│   │   │       └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   ├── useVoiceRoom.ts
│   │   │   ├── usePushToTalk.ts
│   │   │   ├── useVolumeControl.ts
│   │   │   ├── useConnectionQuality.ts
│   │   │   └── useSoundEffects.ts
│   │   ├── services/
│   │   │   ├── websocket.ts
│   │   │   ├── audio.ts
│   │   │   └── storage.ts         # Local settings persistence
│   │   ├── stores/
│   │   │   ├── roomStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── utils/
│   │   │   ├── avatarGenerator.ts
│   │   │   └── funnySuffixes.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── sounds/                # Join, leave, mute sounds
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── livekit.yaml
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Go server with WebSocket + room management
2. LiveKit server (Docker)
3. React app with Vite + TypeScript
4. Basic room create/join flow
5. User session with funny suffix generation

### Phase 2: Voice Communication
1. LiveKit client integration
2. PTT + VAD mode selection
3. Configurable PTT keybind
4. PTT timeout warning (30s)
5. Auto-generated avatars

### Phase 3: Room UI & Features
1. Participant grid layout
2. Speaking indicators (glow + wave + pulse)
3. Per-user volume sliders
4. Connection quality indicators
5. Room preview before joining
6. Sound effects (join/leave/mute)

### Phase 4: Admin System
1. Admin auth (password + IP whitelist)
2. Admin dashboard
3. Mute/kick/ban actions
4. Stealth listening mode
5. Room management (create preset, close)
6. Usage analytics & logging

### Phase 5: Polish & Production
1. i18n setup (multi-language ready)
2. Dark theme refinement
3. All browser testing
4. Auto-reconnect on disconnect
5. Docker compose for production
6. Auto-restart configuration

---

## Key Technical Details

### Funny Username Suffixes
```go
var funnySuffixes = []string{
    "banana", "ninja", "potato", "wizard", "dragon",
    "penguin", "taco", "rocket", "unicorn", "pirate",
    "cookie", "phoenix", "legend", "chaos", "turbo",
}

func generateUniqueName(baseName string, existing []string) string {
    if !contains(existing, baseName) {
        return baseName
    }
    suffix := funnySuffixes[rand.Intn(len(funnySuffixes))]
    return fmt.Sprintf("%s_%s", baseName, suffix)
}
```

### Auto-Generated Avatars
Using a deterministic algorithm based on username hash:
- Unique colors derived from name
- Simple geometric shapes or initials
- Consistent across sessions

### Room Capacity (Soft Limit)
```go
type Room struct {
    ID          string
    Name        string
    Capacity    int  // Default 15, admin configurable
    Participants map[string]*User
    IsPublic    bool
    CreatedBy   string // "admin" or "user"
    CreatedAt   time.Time
}

func (r *Room) CanJoin() bool {
    return len(r.Participants) < r.Capacity
}
```

### Admin Stealth Mode
```go
type AdminSession struct {
    UserID    string
    IP        string
    Stealth   bool  // If true, not shown in participant list
    Listening []string // Room IDs currently monitoring
}
```

### PTT Timeout Warning
```typescript
const PTT_TIMEOUT_MS = 30000;

useEffect(() => {
  let timeoutId: number;

  if (isPTTActive && !isSpeaking) {
    timeoutId = setTimeout(() => {
      showNotification("You're transmitting silence. Release PTT?");
    }, PTT_TIMEOUT_MS);
  }

  return () => clearTimeout(timeoutId);
}, [isPTTActive, isSpeaking]);
```

---

## Deployment Configuration

### docker-compose.yml
```yaml
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    restart: always
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml

  server:
    build: ./server
    restart: always
    ports:
      - "8080:8080"
    environment:
      - LIVEKIT_URL=ws://localhost:7880
      - LIVEKIT_API_KEY=devkey
      - LIVEKIT_API_SECRET=secret
      - ADMIN_PASSWORD=changeme
      - ADMIN_ALLOWED_IPS=192.168.1.100,192.168.1.101
    depends_on:
      - livekit
    volumes:
      - ./logs:/app/logs

  client:
    build: ./client
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - server
```

### livekit.yaml
```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
keys:
  devkey: secret
logging:
  level: info
```

---

## Future Integrations (Noted for Later)
- Cafe management system integration
- Game server auto-room creation
- Text chat within rooms
- Global hotkeys (desktop app/extension)

---

## Verification Checklist
1. [ ] LiveKit server running on LAN
2. [ ] Go server connects to LiveKit
3. [ ] React app loads in Chrome, Firefox, Edge, Safari
4. [ ] Room creation with funny suffix on duplicate names
5. [ ] PTT and VAD modes working
6. [ ] Speaking indicators visible
7. [ ] Per-user volume control
8. [ ] Admin login from whitelisted IP
9. [ ] Admin can mute/kick/ban
10. [ ] Stealth mode hides admin from participants
11. [ ] Auto-reconnect on brief disconnect
12. [ ] Works with no internet (LAN only)
13. [ ] Auto-restart after server crash

---

## Files to Create (Full List)

### Server (Go)
1. `server/go.mod`
2. `server/main.go`
3. `server/config/config.go`
4. `server/handlers/websocket.go`
5. `server/handlers/admin.go`
6. `server/rooms/manager.go`
7. `server/users/manager.go`
8. `server/livekit/token.go`
9. `server/admin/auth.go`
10. `server/admin/actions.go`
11. `server/logging/analytics.go`
12. `server/Dockerfile`

### Client (React)
13. `client/package.json`
14. `client/vite.config.ts`
15. `client/tsconfig.json`
16. `client/src/App.tsx`
17. `client/src/main.tsx`
18. `client/src/index.css`
19. `client/src/i18n/en.json`
20. `client/src/i18n/index.ts`
21. `client/src/components/JoinRoom/*.tsx` (4 files)
22. `client/src/components/VoiceRoom/*.tsx` (5 files)
23. `client/src/components/Controls/*.tsx` (4 files)
24. `client/src/components/Admin/*.tsx` (4 files)
25. `client/src/components/common/*.tsx` (2 files)
26. `client/src/hooks/*.ts` (5 files)
27. `client/src/services/*.ts` (3 files)
28. `client/src/stores/*.ts` (2 files)
29. `client/src/utils/*.ts` (2 files)
30. `client/src/types/index.ts`
31. `client/Dockerfile`

### Config
32. `docker-compose.yml`
33. `livekit.yaml`
