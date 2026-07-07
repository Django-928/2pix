import { Router, type Request, type Response } from 'express';
import { getActivePlans } from '../services/membershipPlanService.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    void req;
    const data = getActivePlans();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get active membership plans error:', error);
    res.status(500).json({ success: false, error: '获取套餐失败' });
  }
});

export default router;
