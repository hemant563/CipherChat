import { Router } from 'express';
import * as groupController from '../controllers/group.controller.js';
import * as groupValidator from '../validators/group.validator.js';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/explore', groupController.exploreGroups);
router.get('/my-groups', groupController.getMyGroups);

router.post('/', validate(groupValidator.createGroup), groupController.createGroup);

router.route('/:groupId')
  .get(groupController.getGroupDetails)
  .patch(validate(groupValidator.updateGroup), groupController.updateGroup)
  .delete(groupController.deleteGroup);

router.post('/:groupId/join', validate(groupValidator.joinGroup), groupController.joinGroup);

router.route('/:groupId/members')
  .post(validate(groupValidator.addMembers), groupController.addMembers);

router.route('/:groupId/members/:userId')
  .delete(validate(groupValidator.removeMember), groupController.removeMember);

router.post('/:groupId/requests/:userId/accept', groupController.acceptJoinRequest);
router.post('/:groupId/requests/:userId/reject', groupController.rejectJoinRequest);

// Role change could also be added here with groupValidator.changeRole

export default router;
