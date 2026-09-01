import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { prisma, isDummyDbUrl } from './prisma';
import { Role, UserStatus } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';

const supabase = createClient(supabaseUrl, supabaseKey);

export const authOptions: NextAuthOptions = {
  debug: false,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username or Email', type: 'text' },
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const rawIdentifier = credentials?.username || credentials?.email;
        if (!rawIdentifier || !credentials?.password) {
          throw new Error('Please enter both your username (or email) and password.');
        }

        const cleanIdentifier = rawIdentifier.toLowerCase().trim();
        let user: any = null;

        // 1. Try fetching via Prisma ORM if DATABASE_URL is properly configured
        if (!isDummyDbUrl) {
          try {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { username: cleanIdentifier },
                  { email: cleanIdentifier },
                ],
              },
            });
          } catch (err) {
            console.warn('[NextAuth] Prisma query error, using Supabase REST API fallback...', err);
          }
        }

        // 2. Query Supabase REST API if Prisma didn't return a user
        if (!user && supabaseUrl && supabaseKey) {
          try {
            // Check username match first
            const { data: userByUsername } = await supabase
              .from('User')
              .select('*')
              .eq('username', cleanIdentifier)
              .maybeSingle();

            if (userByUsername) {
              user = userByUsername;
            } else {
              // Check email match
              const { data: userByEmail } = await supabase
                .from('User')
                .select('*')
                .eq('email', cleanIdentifier)
                .maybeSingle();

              if (userByEmail) {
                user = userByEmail;
              }
            }
          } catch (sbErr) {
            console.error('[NextAuth] Supabase REST API fetch error:', sbErr);
          }
        }

        if (!user) {
          throw new Error('No user found with this username or email address.');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid username/email or password.');
        }

        if (user.status === UserStatus.PENDING_REVIEW || user.status === 'PENDING_REVIEW') {
          throw new Error('ACCOUNT_PENDING: Your account is currently pending review and activation by the Account Manager.');
        }

        if (user.status === UserStatus.DEACTIVATED || user.status === 'DEACTIVATED') {
          throw new Error('ACCOUNT_DEACTIVATED: Your account has been deactivated. Please contact the administrator.');
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username || null,
          email: user.email,
          role: user.role,
          status: user.status,
          section: user.section,
          position: user.position || null,
          birthday: user.birthday || null,
          address: user.address || null,
          phoneNumber: user.phoneNumber,
          image: user.image || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        token.username = u.username || null;
        token.role = u.role as Role;
        token.status = u.status as UserStatus;
        token.section = u.section;
        token.position = u.position || null;
        token.birthday = u.birthday || null;
        token.address = u.address || null;
        token.phoneNumber = u.phoneNumber;
        token.picture = u.image || null;
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.username) token.username = session.username;
        if (session.email) token.email = session.email;
        if (session.phoneNumber) token.phoneNumber = session.phoneNumber;
        if (session.image !== undefined) token.picture = session.image;
        if (session.section) token.section = session.section;
        if (session.position) token.position = session.position;
        if (session.birthday) token.birthday = session.birthday;
        if (session.address) token.address = session.address;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as any;
        u.id = token.id;
        u.username = token.username;
        u.role = token.role;
        u.status = token.status;
        u.section = token.section;
        u.position = token.position;
        u.birthday = token.birthday;
        u.address = token.address;
        u.phoneNumber = token.phoneNumber;
        u.image = token.picture;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'taps-secret-key-denr-penro-capstone',
};
