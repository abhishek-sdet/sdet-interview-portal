import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppSignature from '@/components/AppSignature';
import AccessGuard from '@/components/AccessGuard';
import AdminGuard from '@/components/admin/AdminGuard';

// Interview Portal Pages — loaded eagerly since candidates hit these immediately
import LandingPage from './pages/interview/LandingPage';
import CriteriaSelection from './pages/interview/CriteriaSelection';
import SetSelection from './pages/interview/SetSelection';
import ExamSetup from './pages/interview/ExamSetup';
import ExamRules from './pages/interview/ExamRules';
import QuizInterface from './pages/interview/QuizInterface';
import ThankYou from './pages/interview/ThankYou';

// Admin Portal Pages — lazy-loaded so their heavy deps (xlsx, mammoth, chart.js,
// react-syntax-highlighter) don't bloat the bundle candidates have to download
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UploadQuestions = lazy(() => import('./pages/admin/UploadQuestions'));
const ManageQuestions = lazy(() => import('./pages/admin/ManageQuestions'));
const AdminResults = lazy(() => import('./pages/admin/AdminResults'));
const ManageCriteria = lazy(() => import('./pages/admin/ManageCriteria'));
const ManageAccess = lazy(() => import('./pages/admin/ManageAccess'));
const ManageDrives = lazy(() => import('./pages/admin/ManageDrives'));
const StorageManager = lazy(() => import('./pages/admin/StorageManager'));

// Results Dashboard
const HRDashboard = lazy(() => import('./pages/dashboard/HRDashboard'));

import { ThemeProvider } from './context/ThemeContext';

const AdminLoadingFallback = () => (
    <div className="h-screen w-full bg-[#080c14] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
    </div>
);

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
                        <Route path="/admin/login" element={
                            <Suspense fallback={<AdminLoadingFallback />}><AdminLogin /></Suspense>
                        } />
                        <Route element={<AdminGuard />}>
                            <Route path="/admin" element={
                                <Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>
                            } />
                            <Route path="/admin/upload" element={
                                <Suspense fallback={<AdminLoadingFallback />}><UploadQuestions /></Suspense>
                            } />
                            <Route path="/admin/questions" element={
                                <Suspense fallback={<AdminLoadingFallback />}><ManageQuestions /></Suspense>
                            } />
                            <Route path="/admin/criteria" element={
                                <Suspense fallback={<AdminLoadingFallback />}><ManageCriteria /></Suspense>
                            } />
                            <Route path="/admin/access" element={
                                <Suspense fallback={<AdminLoadingFallback />}><ManageAccess /></Suspense>
                            } />
                            <Route path="/admin/drives" element={
                                <Suspense fallback={<AdminLoadingFallback />}><ManageDrives /></Suspense>
                            } />
                            <Route path="/admin/results" element={
                                <Suspense fallback={<AdminLoadingFallback />}><AdminResults /></Suspense>
                            } />
                            <Route path="/admin/storage" element={
                                <Suspense fallback={<AdminLoadingFallback />}><StorageManager /></Suspense>
                            } />

                            {/* HR Dashboard Route — now requires admin login (was previously public) */}
                            <Route path="/dashboard" element={
                                <Suspense fallback={<AdminLoadingFallback />}><HRDashboard /></Suspense>
                            } />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;
