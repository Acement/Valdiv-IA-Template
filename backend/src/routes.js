import { Router } from 'express';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js'; // Contiene /chat y /chat_wsp
import historyRoutes from './routes/history.routes.js'; // CREA ESTE ARCHIVO
import audioRoutes from './adapters/audio/audio.js'; // Legacy, mantenlo si funciona
import adminRoutes  from './routes/admin.routes.js';

const router = Router();

// Rutas Públicas
router.use('/', authRoutes); // Expone /login y /create_user

router.use('/users_admin', adminRoutes );

// Rutas Protegidas y Funcionales
router.use('/', chatRoutes);     
router.use('/audio', audioRoutes);

// Rutas de Historial (Recomiendo agruparlas bajo /api/history o similar, pero mantendré tu estructura)
router.use('/', historyRoutes); 

export default router;