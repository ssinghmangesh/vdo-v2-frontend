# VideoCall - Next.js Video Calling App

A modern, responsive video calling application built with Next.js, TypeScript, WebRTC, and Socket.io.

## Features

- 🎥 **High-Quality Video Calls** - HD video and crystal clear audio
- 👥 **Multi-Participant Support** - Support for up to 100 participants
- 🔒 **Secure** - End-to-end encrypted peer-to-peer connections
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🖥️ **Screen Sharing** - Share your screen with other participants
- 💬 **Chat** - Text chat during video calls
- 🎨 **Modern UI** - Clean, intuitive interface built with Tailwind CSS
- ⚡ **Real-time** - Instant connection using WebRTC and Socket.io
- 🚀 **Performance** - Optimized for speed and reliability

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide React Icons
- **State Management**: Zustand
- **WebRTC**: Simple Peer
- **Real-time Communication**: Socket.io Client
- **Deployment**: Vercel/Netlify Ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A modern web browser with WebRTC support

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd vdo-v2-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
# Create .env.local file with the following variables:

NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_NAME=VideoCall
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_PARTICIPANTS=50
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Signaling Server

This frontend requires a Socket.io signaling server for WebRTC connection establishment. You can create a simple Node.js server:

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { participants: [] });
    }
    
    const room = rooms.get(roomId);
    room.participants.push(user);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', user);
    
    // Send room update
    io.to(roomId).emit('room-update', {
      id: roomId,
      participants: room.participants,
    });
  });

  socket.on('call-signal', ({ to, signal, user }) => {
    io.to(to).emit('receive-call', { signal, from: socket.id, user });
  });

  socket.on('accept-call', ({ to, signal }) => {
    io.to(to).emit('call-accepted', { signal, from: socket.id });
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── room/[roomId]/     # Dynamic room pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── video-call.tsx     # Main video call interface
│   ├── local-video.tsx    # Local user video
│   ├── remote-video.tsx   # Remote participant video
│   ├── call-controls.tsx  # Call control buttons
│   ├── auth-form.tsx      # Authentication form
│   └── create-room-form.tsx # Room creation form
├── hooks/                 # Custom React hooks
│   ├── use-media.ts       # Media stream management
│   ├── use-peer.ts        # WebRTC peer connections
│   └── use-room.ts        # Room management
├── lib/                   # Library configurations
│   └── socket.ts          # Socket.io client setup
├── store/                 # Zustand state stores
│   ├── auth-store.ts      # Authentication state
│   ├── call-store.ts      # Call state management
│   └── room-store.ts      # Room state management
├── types/                 # TypeScript type definitions
│   └── index.ts           # Shared types
└── utils/                 # Utility functions
    ├── common.ts          # Common utilities
    ├── media.ts           # Media handling utilities
    └── webrtc.ts          # WebRTC utilities
```

## Usage

### Creating a Room

1. Sign in or sign up for an account
2. Click "Create Room" on the dashboard
3. Enter a room name and configure settings
4. Share the room link with participants

### Joining a Room

1. Sign in to your account
2. Enter a room ID in the "Join Room" section, or
3. Click on a shared room link

### During a Call

- **Mute/Unmute**: Click the microphone button
- **Camera On/Off**: Click the camera button
- **Screen Share**: Click the monitor button to share your screen
- **Participants**: View and manage call participants
- **Chat**: Send messages during the call
- **Settings**: Configure audio/video settings

## Browser Compatibility

- Chrome 60+
- Firefox 60+
- Safari 11+
- Edge 79+

## Production Deployment

### Environment Variables

For production, set these environment variables:

```bash
NEXT_PUBLIC_SOCKET_URL=wss://your-signaling-server.com
NEXT_PUBLIC_API_URL=https://your-api-server.com/api
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### TURN Servers

For production use, configure TURN servers in `src/utils/webrtc.ts`:

```javascript
export const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password'
    }
  ]
};
```

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add some feature'`
5. Push to the branch: `git push origin feature/my-feature`
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please create an issue in the repository or contact the development team.

## Roadmap

- [ ] Recording functionality
- [ ] Breakout rooms
- [ ] Virtual backgrounds
- [ ] Mobile app versions
- [ ] Advanced chat features
- [ ] File sharing
- [ ] Whiteboard integration
- [ ] Calendar integration