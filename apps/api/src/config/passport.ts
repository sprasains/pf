import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        if (!user.password_hash) {
          return done(null, false, { message: 'Please use social login' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        logger.error('Local strategy error:', error);
        return done(error);
      }
    }
  )
);

// Google Strategy - Only initialize if credentials exist
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findFirst({
            where: {
              provider: 'google',
              providerId: profile.id,
            },
          });

          if (!user) {
            // Check if user exists with same email
            const existingUser = await prisma.user.findUnique({
              where: { email: profile.emails![0].value },
            });

            if (existingUser) {
              // Link Google account to existing user
              user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  provider: 'google',
                  providerId: profile.id,
                },
              });
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email: profile.emails![0].value,
                  name: profile.displayName,
                  provider: 'google',
                  providerId: profile.id,
                  // Create default org and tenant for new users
                  org: {
                    create: {
                      name: `${profile.displayName}'s Organization`,
                      slug: profile.id,
                    },
                  },
                  tenant: {
                    create: {
                      name: 'Default Tenant',
                      slug: 'default',
                    },
                  },
                },
              });
            }
          }

          return done(null, user);
        } catch (error) {
          logger.error('Google strategy error:', error);
          return done(error);
        }
      }
    )
  );
}

// Facebook Strategy - Only initialize if credentials exist
if (process.env.FB_CLIENT_ID && process.env.FB_CLIENT_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FB_CLIENT_ID,
        clientSecret: process.env.FB_CLIENT_SECRET,
        callbackURL: '/api/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'displayName'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await prisma.user.findFirst({
            where: {
              provider: 'facebook',
              providerId: profile.id,
            },
          });

          if (!user) {
            // Check if user exists with same email
            const existingUser = await prisma.user.findUnique({
              where: { email: profile.emails![0].value },
            });

            if (existingUser) {
              // Link Facebook account to existing user
              user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  provider: 'facebook',
                  providerId: profile.id,
                },
              });
            } else {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email: profile.emails![0].value,
                  name: `${profile.name?.givenName} ${profile.name?.familyName}`,
                  provider: 'facebook',
                  providerId: profile.id,
                  // Create default org and tenant for new users
                  org: {
                    create: {
                      name: `${profile.name?.givenName}'s Organization`,
                      slug: profile.id,
                    },
                  },
                  tenant: {
                    create: {
                      name: 'Default Tenant',
                      slug: 'default',
                    },
                  },
                },
              });
            }
          }

          return done(null, user);
        } catch (error) {
          logger.error('Facebook strategy error:', error);
          return done(error);
        }
      }
    )
  );
}

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport; 