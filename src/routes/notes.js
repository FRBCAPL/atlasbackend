import express from 'express';
import * as noteController from '../controllers/noteController.js';

const router = express.Router();

router.get('/', noteController.getAll);
router.post('/', noteController.create);
router.delete('/:id', noteController.deleteNote);

export default router; 