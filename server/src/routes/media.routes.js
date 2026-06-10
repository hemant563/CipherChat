import { Router } from 'express';
import * as mediaController from '../controllers/media.controller.js';
import * as mediaValidator from '../validators/media.validator.js';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.js';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), validate(mediaValidator.uploadMedia), mediaController.uploadMedia);

router.route('/:mediaId')
  .get(validate(mediaValidator.getMedia), mediaController.getMediaInfo)
  .delete(validate(mediaValidator.getMedia), mediaController.deleteMedia);

export default router;
