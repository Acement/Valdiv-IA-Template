import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { saveMessageController, getHistoryController, saveFeedbackController } from '../controllers/history.controller.js';

const router = Router();

router.post('/chats', authenticateToken, saveMessageController);
router.get('/chats', authenticateToken, getHistoryController);
router.put('/messages/:id/feedback', authenticateToken, saveFeedbackController);

export default router;