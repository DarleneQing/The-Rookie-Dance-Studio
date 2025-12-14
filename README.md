# The Rookie Dance Studio

A mobile-first web application for managing dance group member check-ins, subscriptions, and profiles. Built with Next.js 14, TypeScript, and Supabase.

## Quick Start

Get the project running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/DarleneQing/The-Rookie-Dance-Studio.git
cd The-Rookie-Dance-Studio

# 2. Install dependencies
npm install

# 3. Set up environment variables (see Environment Variables section)
cp .env.example .env.local  # Create from template if available
# Or create .env.local manually with your Supabase credentials

# 4. Set up database (see Database Setup section)
# Run docs/schema.sql in your Supabase SQL editor

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher (check with `node --version`)
- **npm**, **yarn**, or **pnpm** (npm comes with Node.js)
- **Git** for version control
- **Supabase account** ([sign up here](https://supabase.com))

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/DarleneQing/The-Rookie-Dance-Studio.git
cd The-Rookie-Dance-Studio
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Step 3: Set Up Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project (or use an existing one)
3. Wait for the project to finish provisioning
4. Note your project URL and API keys (found in Settings > API)

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to **Settings** > **API**
- Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon/public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 5: Set Up Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `docs/schema.sql` from this repository
4. Copy the entire SQL script
5. Paste it into the SQL Editor
6. Click **Run** to execute the schema

This will create:
- User roles and member type enums
- `profiles` table for user data
- `subscriptions` table for subscription management
- `check_ins` table for attendance tracking
- `student_verifications` table for student status verification
- Required functions and triggers

### Step 6: Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Step 7: Verify Setup

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. You should see the landing page with "Log in" and "Sign Up" buttons
3. Try registering a new account to test the authentication flow
4. Check the browser console for any errors

## Environment Variables

The following environment variables are required:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | Supabase Dashboard > Settings > API > anon/public key |

**Security Note:** The `NEXT_PUBLIC_` prefix means these variables are exposed to the browser. This is safe for Supabase anonymous keys, which are designed to be public. Row-level security (RLS) policies in Supabase protect your data.

## Database Setup

The database schema is defined in `docs/schema.sql`. This file contains:

- **Enums**: User roles, member types, subscription types, verification statuses
- **Tables**: 
  - `profiles` - User profile information
  - `subscriptions` - Subscription records (Monthly, 5-Times, 10-Times cards)
  - `check_ins` - Attendance records
  - `student_verifications` - Student status verification requests
- **Functions**: Database triggers and helper functions
- **Constraints**: Data integrity rules and relationships

**To apply the schema:**

1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `docs/schema.sql`
3. Paste and execute in SQL Editor
4. Verify tables were created in Database > Tables

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and routes
│   ├── admin/             # Admin-only pages
│   │   ├── scanner/       # QR code scanner for check-ins
│   │   └── users/         # User management dashboard
│   ├── auth/              # Authentication routes
│   │   └── callback/      # OAuth callback handler
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── profile/           # User profile page
│   ├── verify-email/      # Email verification page
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home/landing page
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   │   ├── assign-subscription-dialog.tsx
│   │   ├── qr-scanner.tsx
│   │   └── users-table.tsx
│   ├── auth/             # Authentication UI components
│   │   ├── auth-form.tsx
│   │   ├── auth-input.tsx
│   │   ├── floating-elements.tsx
│   │   ├── orbital-ring.tsx
│   │   ├── register-form.tsx
│   │   └── sparkle.tsx
│   ├── profile/          # Profile-related components
│   │   └── qr-code-display.tsx
│   └── ui/               # Reusable UI components (Shadcn)
│       ├── avatar.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── table.tsx
│
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client configurations
│   │   ├── client.ts     # Browser client
│   │   ├── server.ts     # Server-side client
│   │   └── middleware.ts # Middleware session handler
│   └── utils.ts          # General utilities
│
├── middleware.ts          # Next.js middleware for auth
├── types/                 # TypeScript type definitions
│   └── auth.ts           # Authentication-related types
└── public/               # Static assets

docs/                      # Documentation
├── spec.md               # Detailed feature specifications
├── brandbook.md          # Design system and brand guidelines
└── schema.sql            # Database schema
```

## Development Workflow

### Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Run ESLint
npm run lint
```

### Development Server

The development server runs on `http://localhost:3000` by default. It features:
- **Hot Module Replacement (HMR)** - Changes reflect immediately
- **Fast Refresh** - React components update without losing state
- **TypeScript checking** - Type errors shown in terminal and browser

### Common Development Tasks

**Adding a new page:**
- Create a new folder in `src/app/` with a `page.tsx` file
- Example: `src/app/about/page.tsx` creates route `/about`

**Adding a new component:**
- Create component file in appropriate `src/components/` subdirectory
- Use TypeScript for type safety
- Follow existing component patterns

**Modifying database schema:**
- Update `docs/schema.sql` with your changes
- Run the SQL in Supabase SQL Editor
- Update TypeScript types if needed

**Working with Supabase:**
- Use `src/lib/supabase/client.ts` for client-side operations
- Use `src/lib/supabase/server.ts` for server-side operations
- Check Supabase dashboard for data inspection

## Key Concepts

### Authentication Flow

The app uses Supabase Auth for authentication:

1. **Registration**: User signs up → email verification → profile completion
2. **Login**: Email/password or Google OAuth
3. **Session Management**: Handled by Supabase with middleware refresh
4. **Protected Routes**: Middleware checks authentication status

**Key Files:**
- `src/middleware.ts` - Route protection
- `src/lib/supabase/` - Supabase client setup
- `src/app/auth/actions.ts` - Authentication server actions

### Role-Based Access Control

Three user roles:

- **Admin** (`role: 'admin'`): Full system access
  - User management
  - Subscription assignment
  - QR code scanning for check-ins
  - Student verification approval

- **Member - Adult** (`member_type: 'adult'`): Default member type
  - View and edit own profile
  - Generate QR code
  - View own subscription and check-in history

- **Member - Student** (`member_type: 'student'`): Verified student
  - Same permissions as Adult
  - Requires admin verification via student card upload

**Access Control:**
- Admin routes: `src/app/admin/*` (protected by middleware)
- Member routes: `src/app/profile/*` (accessible to all authenticated users)

### Subscription System

Three subscription types:

1. **Monthly Card**: 30-day validity from admin-selected start date
2. **5-Times Card**: 5 check-in sessions (no expiration date)
3. **10-Times Card**: 10 check-in sessions (no expiration date)

**Key Logic:**
- Only one active subscription per user
- New subscription assignment archives previous one
- Check-in validation happens in `src/app/admin/scanner/page.tsx`

### QR Code Check-in Flow

1. **Member**: Generates QR code on profile page (`src/app/profile/page.tsx`)
2. **Admin**: Scans QR code using scanner (`src/app/admin/scanner/page.tsx`)
3. **Validation**: System checks:
   - User exists
   - Active subscription exists
   - Subscription is valid (not expired/depleted)
4. **Recording**: Check-in recorded with timestamp and subscription details

**Key Components:**
- `src/components/profile/qr-code-display.tsx` - QR code generation
- `src/components/admin/qr-scanner.tsx` - QR code scanning

### File Structure Patterns

- **Pages**: Next.js App Router - folders with `page.tsx` files
- **Server Actions**: `actions.ts` files in route folders
- **Components**: Organized by feature domain
- **Types**: Centralized in `src/types/`
- **Utilities**: Reusable functions in `src/lib/`

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 14+ (App Router) | React framework with server-side rendering |
| **Language** | TypeScript | Type-safe JavaScript |
| **UI Library** | React 18 | Component library |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | Shadcn UI (Radix UI) | Accessible component primitives |
| **Backend** | Supabase | Authentication, database, and API |
| **Database** | PostgreSQL (via Supabase) | Relational database |
| **Forms** | React Hook Form + Zod | Form handling and validation |
| **QR Codes** | react-qr-code | QR code generation |
| **QR Scanner** | @yudiel/react-qr-scanner | QR code scanning |
| **Icons** | Lucide React | Icon library |
| **Notifications** | Sonner | Toast notifications |

## Troubleshooting

### Environment Variables Not Working

**Problem:** App can't connect to Supabase

**Solutions:**
- Ensure `.env.local` is in the root directory (not in `src/`)
- Restart the development server after adding/changing variables
- Check that variable names start with `NEXT_PUBLIC_`
- Verify values are correct (no extra spaces or quotes)

### Database Connection Errors

**Problem:** "Failed to fetch" or database errors

**Solutions:**
- Verify Supabase project is active (not paused)
- Check `NEXT_PUBLIC_SUPABASE_URL` matches your project URL
- Ensure database schema has been applied (`docs/schema.sql`)
- Check Supabase dashboard for any service issues

### TypeScript Errors

**Problem:** Type errors in IDE or build

**Solutions:**
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` paths are correct
- Restart TypeScript server in your IDE
- Ensure Node.js version is 18+ (check with `node --version`)

### Development Server Won't Start

**Problem:** `npm run dev` fails

**Solutions:**
- Check Node.js version: `node --version` (should be 18+)
- Delete `node_modules` and `.next` folders, then run `npm install`
- Check for port conflicts (3000 already in use)
- Review error message for specific issues

### QR Scanner Not Working

**Problem:** Camera access denied or scanner doesn't work

**Solutions:**
- Ensure you're using HTTPS or localhost (required for camera access)
- Grant camera permissions in browser settings
- Test on a physical device (some features don't work in emulators)
- Check browser console for specific errors

## Additional Resources

### Project Documentation

- **[Specification Document](docs/spec.md)** - Complete feature specifications and user flows
- **[Brandbook](docs/brandbook.md)** - Design system, colors, typography, and visual guidelines
- **[Database Schema](docs/schema.sql)** - Complete database structure and relationships

### External Documentation

- [Next.js Documentation](https://nextjs.org/docs) - Framework reference
- [Supabase Documentation](https://supabase.com/docs) - Backend and database guide
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Styling reference
- [Shadcn UI Documentation](https://ui.shadcn.com) - Component library
- [React Hook Form](https://react-hook-form.com) - Form handling
- [Zod](https://zod.dev) - Schema validation

### Getting Help

- Check the [Troubleshooting](#troubleshooting) section above
- Review the [Specification Document](docs/spec.md) for feature details
- Check Supabase dashboard for database issues
- Review browser console for client-side errors
- Check terminal output for server-side errors

---

**Happy coding! 🎉**
