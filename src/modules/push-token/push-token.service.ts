import PushToken from './push-token.model';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// Initialize Expo SDK with access token for production
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // Use FCM v1 API for better Android support
});

class PushTokenService {
  /**
   * Register a push token for a user
   */
  async registerToken(userId: string, token: string, platform: 'ios' | 'android' | 'web' = 'android') {
    try {
      // Check if token is valid for Expo push notifications
      if (!Expo.isExpoPushToken(token)) {
        throw new Error('Invalid Expo push token');
      }

      // Upsert the token (update if exists, create if not)
      await PushToken.findOneAndUpdate(
        { token },
        { userId, token, platform },
        { upsert: true, new: true }
      );

      return { success: true };
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string) {
    try {
      await PushToken.findOneAndDelete({ token });
      return { success: true };
    } catch (error) {
      console.error('Error unregistering push token:', error);
      throw error;
    }
  }

  /**
   * Get all tokens for a user
   */
  async getTokensForUser(userId: string) {
    try {
      const tokens = await PushToken.find({ userId });
      return tokens.map((t: any) => t.token);
    } catch (error) {
      console.error('Error getting tokens for user:', error);
      return [];
    }
  }

  /**
   * Get all tokens for multiple users
   */
  async getTokensForUsers(userIds: string[]) {
    try {
      const tokens = await PushToken.find({ userId: { $in: userIds } });
      return tokens.map((t: any) => t.token);
    } catch (error) {
      console.error('Error getting tokens for users:', error);
      return [];
    }
  }

  /**
   * Send push notification to specific tokens
   */
  async sendPushNotifications(tokens: string[], title: string, body: string, data?: any) {
    try {
      // Filter valid Expo push tokens
      const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

      if (validTokens.length === 0) {
        console.log('No valid push tokens to send to');
        return { success: true, sent: 0 };
      }

      console.log(`Sending push notification to ${validTokens.length} devices`);

      // Create the messages
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: 'default', // Android notification channel
      }));

      // Send in chunks (Expo has a limit of 100 per request)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log(`Sent chunk of ${chunk.length} notifications`);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
          errorCount += chunk.length;
        }
      }

      // Check for errors in tickets
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error') {
          errorCount++;
          console.error('Push notification error:', {
            message: ticket.message,
            details: ticket.details,
            token: validTokens[i]?.substring(0, 20) + '...',
          });

          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Remove invalid tokens
            const invalidToken = validTokens[i];
            if (invalidToken) {
              console.log('Removing unregistered device token:', invalidToken.substring(0, 20) + '...');
              await this.unregisterToken(invalidToken).catch(err =>
                console.error('Failed to remove invalid token:', err)
              );
            }
          }
        } else if (ticket.status === 'ok') {
          successCount++;
        }
      }

      console.log(`Push notification results: ${successCount} success, ${errorCount} errors`);
      return { success: true, sent: successCount, errors: errorCount };
    } catch (error) {
      console.error('Error sending push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, title: string, body: string, data?: any) {
    const tokens = await this.getTokensForUser(userId);
    return this.sendPushNotifications(tokens, title, body, data);
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], title: string, body: string, data?: any) {
    const tokens = await this.getTokensForUsers(userIds);
    return this.sendPushNotifications(tokens, title, body, data);
  }

  /**
   * Send push notification to all users with a specific role
   */
  async sendToRole(role: string, title: string, body: string, data?: any) {
    try {
      // Import User model to get users by role
      const User = (await import('../user/user.model')).default;
      const users = await User.find({ role });
      const userIds = users.map((u: any) => u._id.toString());
      return this.sendToUsers(userIds, title, body, data);
    } catch (error) {
      console.error('Error sending to role:', error);
      throw error;
    }
  }
}

export default new PushTokenService();

