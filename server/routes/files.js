import { Router } from 'express';
import { getFiles, uploadFile, deleteFile, reviewFile, upload } from '../controllers/fileController.js';
import { requireAuth } from '../middleware/authz.js';

const router = Router();

// Bọc multer để bắt lỗi (loại file sai / quá lớn) trả về 400 thay vì crash
const uploadSingle = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Tải lên thất bại' });
        next();
    });
};

router.get('/', requireAuth, getFiles);
router.post('/upload', requireAuth, uploadSingle, uploadFile);
router.put('/:id/review', requireAuth, reviewFile);
router.delete('/:id', requireAuth, deleteFile);

export default router;
