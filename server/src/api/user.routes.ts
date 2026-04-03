import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUser,
  getAllDepartments,
  saveDepartment,
  deleteDepartment,
} from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const userRoutes = Router();

userRoutes.use(authenticate);
userRoutes.use(requireAdmin);
userRoutes.get('/', getAllUsers);
userRoutes.get('/:id', getUserById);
userRoutes.post('/', createUser);
userRoutes.put('/:id', updateUser);
userRoutes.delete('/:id', deleteUser);
userRoutes.post('/:id/toggle', toggleUser);

// Department routes
userRoutes.get('/departments', getAllDepartments);
userRoutes.post('/departments', saveDepartment);
userRoutes.delete('/departments/:id', deleteDepartment);
