import { Schema, model, Document } from 'mongoose';

export interface IPushToken extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
  updatedAt: Date;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: 'android',
    },
  },
  {
    timestamps: true,
  }
);

export default model<IPushToken>('PushToken', pushTokenSchema);

