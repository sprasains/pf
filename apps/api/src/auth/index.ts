import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { localStrategy } from './localStrategy';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        org: true,
        tenant: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Use local strategy
passport.use(localStrategy);

// Use Google strategy if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email: profile.emails?.[0].value },
            include: {
              org: true,
              tenant: true,
            },
          });

          if (!user) {
            // Create new user if doesn't exist
            user = await prisma.user.create({
              data: {
                email: profile.emails?.[0].value || '',
                name: profile.displayName,
                role: 'USER',
                org: {
                  connect: {
                    id: 'org-1', // Default org ID
                  },
                },
                tenant: {
                  connect: {
                    id: 'tenant-1', // Default tenant ID
                  },
                },
              },
              include: {
                org: true,
                tenant: true,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export default passport; 