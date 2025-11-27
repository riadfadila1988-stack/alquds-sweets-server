import { Router, Request, Response } from 'express';
import PushTokenService from './push-token.service';
import { authenticateJWT } from '../../core/middlewares/authJwt';

const router = Router();

/**
 * Register a push token for the authenticated user
 */
router.post('/push-tokens', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { token, platform = 'android' } = req.body;
    const userId = (req as any).user.userId;

    if (!token) {
      res.status(400).json({ error: 'Push token is required' });
      return;
    }

    await PushTokenService.registerToken(userId, token, platform);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error: any) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: error.message || 'Failed to register push token' });
  }
});

/**
 * Unregister a push token
 */
router.delete('/push-tokens', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Push token is required' });
      return;
    }

    await PushTokenService.unregisterToken(token);
    res.json({ success: true, message: 'Push token unregistered successfully' });
  } catch (error: any) {
    console.error('Error unregistering push token:', error);
    res.status(500).json({ error: error.message || 'Failed to unregister push token' });
  }
});

/**
 * Send a test notification (admin only)
 */
router.post('/push-tokens/test', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { title, body, userId } = req.body;
    const currentUser = (req as any).user;

    // Only admins can send test notifications
    if (currentUser.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    const targetUserId = userId || currentUser.userId;
    const result = await PushTokenService.sendToUser(targetUserId, title, body);

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send test notification' });
  }
});

export default router;

