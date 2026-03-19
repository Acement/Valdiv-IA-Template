import { Router } from 'express';
import { loginController, registerController } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginController);
router.post('/create_user', registerController); // Podrías renombrarlo a /register para ser más RESTful

export default router;