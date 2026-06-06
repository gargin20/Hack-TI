import jwt from 'jsonwebtoken';
import { setNotificationSocket } from './notificationService.js';
import { createDeepgramStream } from './deepgramStreamService.js';

export async function initializeSocketServer(httpServer) {
  try {
    const { Server } = await import('socket.io');
    const io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
      },
    });

    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Missing token'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        return next();
      } catch {
        return next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      socket.join(String(socket.userId));
      const assistantStream = createDeepgramStream({ socket });
      let assistantAudioChunks = 0;

      const startVoice = () => {
        assistantStream.start();
      };

      const sendVoiceAudio = (chunk) => {
        assistantAudioChunks += 1;
        if (assistantAudioChunks === 1 || assistantAudioChunks % 200 === 0) {
          console.log(`[VOICE] Audio chunks received by server: ${assistantAudioChunks}`);
        }
        assistantStream.sendAudio(chunk);
      };

      const stopVoice = () => {
        assistantStream.stop();
      };

      socket.on('voice:start', startVoice);
      socket.on('voice:audio', sendVoiceAudio);
      socket.on('voice:stop', stopVoice);

      socket.on('assistant:start', startVoice);
      socket.on('assistant:audio', sendVoiceAudio);
      socket.on('assistant:stop', stopVoice);

      socket.on('disconnect', () => {
        assistantStream.stop();
      });
    });

    setNotificationSocket(io);
    console.log('Socket.IO notification server initialized');
  } catch (error) {
    console.warn('Socket.IO unavailable. Notifications will use polling fallback:', error.message);
  }
}
