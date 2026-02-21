import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppSignature from '@/components/AppSignature';
import AccessGuard from '@/components/AccessGuard';

// Interview Portal Pages
import LandingPage from './pages/interview/LandingPage';
import CriteriaSelection from './pages/interview/CriteriaSelection';
import SetSelection from './pages/interview/SetSelection';
import ExamSetup from './pages/interview/ExamSetup';
import ExamRules from './pages/interview/ExamRules';
import QuizInterface from './pages/interview/QuizInterface';
import ThankYou from './pages/interview/ThankYou';

// Admin Portal Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UploadQuestions from './pages/admin/UploadQuestions';
import ManageQuestions from './pages/admin/ManageQuestions';
import AdminResults from './pages/admin/AdminResults';
import ManageCriteria from './pages/admin/ManageCriteria';
import ManageAccess from './pages/admin/ManageAccess';

// Results Dashboard
import HRDashboard from './pages/dashboard/HRDashboard';

import { ThemeProvider } from './context/ThemeContext';

function App() {
    return (
        <ThemeProvider>
            <Toaster position="top-right" />
            <Router>
                <div className="h-full w-full flex flex-col overflow-auto">
                    <AppSignature />
                    <Routes>
                        {/* Interview Portal Routes (Protected by AccessGuard) */}
                        <Route element={<AccessGuard />}>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/criteria-selection" element={<CriteriaSelection />} />
                            <Route path="/set-selection" element={<SetSelection />} />
                            <Route path="/exam-rules" element={<ExamRules />} />
                            <Route path="/exam-setup" element={<ExamSetup />} />
                            <Route path="/quiz" element={<QuizInterface />} />
                            <Route path="/thank-you" element={<ThankYou />} />
                        </Route>

                        {/* Admin Portal Routes (New Simple Version) */}
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/upload" element={<UploadQuestions />} />
                        <Route path="/admin/questions" element={<ManageQuestions />} />
                        <Route path="/admin/criteria" element={<ManageCriteria />} />
                        <Route path="/admin/access" element={<ManageAccess />} />
                        <Route path="/admin/results" element={<AdminResults />} />

                        {/* Results Dashboard Route */}
                        {/* HR Dashboard Route (Public/Read-Only) */}
                        <Route path="/dashboard" element={<HRDashboard />} />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
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
