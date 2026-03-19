import { HistoryService } from '../services/history.service.js';

const historyService = new HistoryService();

export const saveMessageController = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const messageData = req.body;
    const savedMsg = await historyService.addMessage(userId, messageData);
    
    res.status(201).json({ message: 'Mensaje guardado', data: savedMsg });
  } catch (err) {
    next(err);
  }
};

export const getHistoryController = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { session_id, limit, skip } = req.query;

    if (session_id) {
      const data = await historyService.getSessionDetails(userId, session_id, limit, skip);
      return res.json(data);
    }

    const conversations = await historyService.getUserSessions(userId, limit, skip);
    res.json({ conversations });

  } catch (err) {
    next(err);
  }
};

export const saveFeedbackController = async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { rating, reason, comment } = req.body; // Extraemos todo

    // Pasamos los detalles como tercer argumento
    const result = await historyService.addFeedback(id, rating, { reason, comment });
    
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};