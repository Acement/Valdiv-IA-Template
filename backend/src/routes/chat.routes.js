import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatWebController, chatWspController } from '../controllers/chat.controller.js';
// Importa controladores de historial si es necesario

const router = Router();

// Rutas de Chat
router.post('/chat', authenticateToken, chatWebController);
router.post('/chat_wsp', chatWspController);

export default router;