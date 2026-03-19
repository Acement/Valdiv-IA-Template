import { ChatService } from '../services/chat.service.js';

const chatService = new ChatService();

export const chatWebController = async (req, res, next) => {
  try {
    const { message, history, categories, session_id } = req.body;
    const sessionId = session_id || "default";
    
    const response = await chatService.handleWebChat(req.user, sessionId, message, history, categories);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const chatWspController = async (req, res, next) => {
  try {
    const message = req.body?.message || '';
    const response = await chatService.handleWhatsappChat(message);
    res.json(response);
  } catch (err) {
    next(err);
  }
};