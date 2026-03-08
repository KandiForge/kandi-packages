/**
 * kandi-login: MongoDB / Mongoose schema for user collection with OAuth provider linking
 *
 * Usage:
 *   1. Copy this into your models directory
 *   2. Import and use with Mongoose
 *   3. Implement UserAdapter using Mongoose queries (see example below)
 *
 * MongoDB uses a flat document model with provider sub fields directly on the user.
 * Account linking works by matching on email across providers.
 */

/*
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name?: string;
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
  role: string;
  google_sub?: string;
  apple_sub?: string;
  facebook_sub?: string;
  hellocoop_sub?: string;
  test_sub?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>({
  email:          { type: String, required: true, unique: true },
  name:           { type: String },
  display_name:   { type: String },
  avatar_url:     { type: String },
  email_verified: { type: Boolean, default: false },
  role:           { type: String, default: 'user' },
  google_sub:     { type: String, unique: true, sparse: true },
  apple_sub:      { type: String, unique: true, sparse: true },
  facebook_sub:   { type: String, unique: true, sparse: true },
  hellocoop_sub:  { type: String, unique: true, sparse: true },
  test_sub:       { type: String, unique: true, sparse: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

export const User = mongoose.model<IUser>('User', UserSchema);
*/

// ---------------------------------------------------------------------------
// Example UserAdapter implementation for MongoDB/Mongoose
// ---------------------------------------------------------------------------

/*
import { User } from './models/User';
import type { UserAdapter, OAuthProfile } from 'kandi-login/server';

export const userAdapter: UserAdapter = {
  async findByProviderId(provider, providerUserId) {
    const field = `${provider}_sub`;
    const user = await User.findOne({ [field]: providerUserId }).lean();
    if (!user) return null;
    return { ...user, id: user._id.toString() };
  },

  async findByEmail(email) {
    const user = await User.findOne({ email }).lean();
    if (!user) return null;
    return { ...user, id: user._id.toString() };
  },

  async createUser(profile: OAuthProfile) {
    const user = await User.create({
      email: profile.email,
      name: profile.name,
      display_name: profile.name ?? profile.email.split('@')[0],
      avatar_url: profile.avatarUrl,
      role: (profile.raw?.role as string) ?? 'user',
      [`${profile.provider}_sub`]: profile.providerUserId,
    });
    return { ...user.toObject(), id: user._id.toString() };
  },

  async linkProvider(userId, provider, providerUserId) {
    await User.updateOne({ _id: userId }, { $set: { [`${provider}_sub`]: providerUserId } });
  },

  async getUserById(id) {
    const user = await User.findById(id).lean();
    if (!user) return null;
    return { ...user, id: user._id.toString() };
  },
};
*/
