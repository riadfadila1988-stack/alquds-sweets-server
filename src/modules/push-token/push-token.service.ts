import PushToken from './push-token.model';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo();

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

      // Create the messages
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
      }));

      // Send in chunks (Expo has a limit of 100 per request)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Check for errors in tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error('Push notification error:', ticket.message);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            // Remove invalid tokens
            // Note: You'd need to extract the token from the error to remove it
            console.log('Device not registered, should remove token');
          }
        }
      }

      return { success: true, sent: tickets.length };
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

