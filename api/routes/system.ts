import { Router, type Request, type Response } from 'express';
import { getSystemConfig } from '../utils/systemConfig.js';

const router = Router();

router.get('/public', async (req: Request, res: Response): Promise<void> => {
  try {
    void req;
    const config = getSystemConfig();
    res.json({
      success: true,
      data: {
        platformName: config.platformName,
        logoUrl: config.logoUrl,
        maintenanceMode: config.maintenanceMode,
        announcement: config.announcement,
        heroTitleZh: config.heroTitleZh,
        heroTitleEn: config.heroTitleEn,
        heroEnglishTitleZh: config.heroEnglishTitleZh,
        heroEnglishTitleEn: config.heroEnglishTitleEn,
        heroSubtitleZh: config.heroSubtitleZh,
        heroSubtitleEn: config.heroSubtitleEn,
        heroCtaZh: config.heroCtaZh,
        heroCtaEn: config.heroCtaEn,
        footerCopyrightZh: config.footerCopyrightZh,
        footerCopyrightEn: config.footerCopyrightEn,
      },
    });
  } catch (error) {
    console.error('Get public system config error:', error);
    res.status(500).json({ success: false, error: '获取系统配置失败' });
  }
});

export default router;
