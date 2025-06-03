import { Strategy as LocalStrategy } from 'passport-local';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
  },
  async (email, password, done) => {
    try {
      // Bypass for admin@pumpflix.com
      if (email === 'admin@pumpflix.com') {
        const adminUser = await prisma.user.findUnique({ where: { email } });
        if (adminUser) return done(null, adminUser);
        return done(null, false, { message: 'Admin user not found' });
      }

      // For other users, check the database
      const user = await prisma.user.findUnique({
        where: { email },
      }) as any;

      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }

      if (!user.password_hash) {
        return done(null, false, { message: 'No password set for this user.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
); 