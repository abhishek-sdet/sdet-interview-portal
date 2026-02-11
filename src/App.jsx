import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppSignature from '@/components/AppSignature';

// Interview Portal Pages
import LandingPage from './pages/interview/LandingPage';
import CriteriaSelection from './pages/interview/CriteriaSelection';
import SetSelection from './pages/interview/SetSelection';
import ExamSetup from './pages/interview/ExamSetup';
import QuizInterface from './pages/interview/QuizInterface';
import ThankYou from './pages/interview/ThankYou';

// Admin Portal Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSchedule from './pages/admin/AdminSchedule';
import AdminCriteria from './pages/admin/AdminCriteria';
import AdminQuestions from './pages/admin/AdminQuestions';
import ProtectedRoute from './components/ProtectedRoute';

// Results Dashboard
import AdminResults from './pages/admin/AdminResults';
import HRDashboard from './pages/dashboard/HRDashboard';

function App() {
    return (
        <>
            <Toaster position="top-right" />
            <Router>
                <AppSignature />
                <Routes>
                    {/* Interview Portal Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/criteria-selection" element={<CriteriaSelection />} />
                    <Route path="/set-selection" element={<SetSelection />} />
                    <Route path="/exam-setup" element={<ExamSetup />} />
                    <Route path="/quiz" element={<QuizInterface />} />
                    <Route path="/thank-you" element={<ThankYou />} />

                    {/* Admin Portal Routes */}
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="schedule" element={<AdminSchedule />} />
                            <Route path="criteria" element={<AdminCriteria />} />
                            <Route path="questions" element={<AdminQuestions />} />
                            <Route path="results" element={<AdminResults />} />
                        </Route>
                    </Route>

                    {/* Results Dashboard Route */}
                    {/* HR Dashboard Route (Public/Read-Only) */}
                    <Route path="/dashboard" element={<HRDashboard />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </>
    );
}

// Placeholder component for unimplemented admin pages
function PlaceholderPage({ title }) {
    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">{title}</h2>
            <p className="text-slate-400">This page is under construction. Core functionality is implemented in the database schema.</p>
            <p className="text-slate-500 text-sm mt-4">
                You can manage criteria and questions directly in Supabase for now.
            </p>
        </div>
    );
}

export default App;
