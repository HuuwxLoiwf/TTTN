import { Router } from 'express';
import { getFiles, uploadFile, deleteFile, upload } from '../controllers/fileController.js';

const router = Router();

router.get('/', getFiles);
router.post('/upload', upload.single('file'), uploadFile);
router.delete('/:id', deleteFile);

export default router;
