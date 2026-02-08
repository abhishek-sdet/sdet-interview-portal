# Fresher Interview System

A complete 3-app system for managing fresher interviews with dynamic criteria, questions, and real-time results.

## 🎯 System Overview

This system consists of three interconnected applications:

1. **Interview Portal** (`/`) - Candidate-facing quiz interface
2. **Admin Portal** (`/admin/*`) - Management dashboard for admins
3. **Results Dashboard** (`/dashboard`) - Public read-only analytics

All three apps share the same **Supabase** backend and database.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Netlify account (for deployment)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema in Supabase SQL Editor:
   ```bash
   # Copy contents of supabase-schema.sql and execute in Supabase
   ```
3. Create an admin user in Supabase Auth dashboard

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📊 Database Schema

### Tables

- **`criteria`** - Interview categories (e.g., "0-2 years fresher")
- **`questions`** - Questions linked to criteria
- **`candidates`** - Candidate information
- **`interviews`** - Interview sessions
- **`answers`** - Candidate responses
- **`results`** (view) - Aggregated results for dashboards

### Row Level Security (RLS)

- **Admins** (authenticated users): Full access to all tables
- **Public** (candidates): Can create candidates, interviews, and submit answers
- **Public**: Read-only access to active criteria and questions

See `supabase-schema.sql` for complete schema and policies.

---

## 🎨 Application Features

### Interview Portal (`/`)

- **Landing Page**: Candidate registration (name, email, phone)
- **Criteria Selection**: Dynamic loading from database
- **Quiz Interface**: 
  - Question navigation
  - Progress tracking
  - Optional timer
  - Auto-submit on completion
- **Thank You Page**: Results display with pass/fail status

### Admin Portal (`/admin/*`)

- **Secure Login**: Email/password authentication
- **Dashboard**: Real-time stats and recent results
- **Criteria Management**: CRUD operations (placeholder)
- **Question Management**: Bulk upload and editing (placeholder)
- **Results View**: Detailed candidate analytics (placeholder)

### Results Dashboard (`/dashboard`)

- **Real-time Updates**: Auto-refresh every 30 seconds
- **Search & Filter**: By name, email, or criteria
- **Theme Toggle**: Light/Dark mode
- **Responsive Design**: Mobile-friendly

---

## 🛠️ Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime)
- **Routing**: React Router v6
- **Deployment**: Netlify

---

## 📦 Deployment

### Netlify Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repo to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

3. **Configure Redirects**:
   - The `public/_redirects` file is already configured for SPA routing

### Environment Variables (Netlify)

Add these in Netlify dashboard → Site settings → Environment variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🔐 Security

- Admin routes are protected with Supabase Auth
- RLS policies ensure data isolation
- Environment variables are never exposed to client
- CORS configured in Supabase

---

## 📝 Usage

### For Candidates

1. Visit the landing page
2. Enter your name (email/phone optional)
3. Select your interview criteria
4. Complete the quiz
5. View your results

### For Admins

1. Login at `/admin`
2. View dashboard stats
3. Manage criteria and questions (via Supabase for now)
4. Review candidate results

### For Public Viewing

1. Visit `/dashboard`
2. Search and filter results
3. Toggle theme as needed

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Candidate can register and select criteria
- [ ] Quiz loads questions correctly
- [ ] Scoring calculates accurately
- [ ] Results appear in dashboard
- [ ] Admin can login and view stats
- [ ] Real-time updates work in dashboard

---

## 🎯 Future Enhancements

- [ ] Implement full CRUD UI for criteria/questions in admin
- [ ] Add bulk question import (CSV/Excel)
- [ ] Export results to PDF/CSV
- [ ] Email notifications for candidates
- [ ] Advanced analytics and charts
- [ ] Multi-language support
- [ ] Interview timer per criteria
- [ ] Question randomization

---

## 📄 License

Proprietary - SDET Tech

---

## 👨‍💻 Developer

Created by **AJ** for SDET Fresher Drive 2026

---

## 🆘 Support

For issues or questions, contact the development team.
