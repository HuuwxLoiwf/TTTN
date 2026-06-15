import { Router } from 'express';
import { getFiles, uploadFile, deleteFile, reviewFile, upload } from '../controllers/fileController.js';
import { requireAuth } from '../middleware/authz.js';

const router = Router();

router.get('/', requireAuth, getFiles);
router.post('/upload', requireAuth, upload.single('file'), uploadFile);
router.put('/:id/review', requireAuth, reviewFile);
router.delete('/:id', requireAuth, deleteFile);

export default router;
