import { lazy } from 'react';

// Lazy load heavy components to improve initial bundle size
export const CRM = lazy(() => import('@/pages/CRM'));
export const Admin = lazy(() => import('@/pages/Admin'));
export const AdminSchedule = lazy(() => import('@/pages/AdminSchedule'));
export const AdminFAQ = lazy(() => import('@/pages/AdminFAQ'));

// Lazy load branch pages
export const Kotelniki = lazy(() => import('@/pages/branches/Kotelniki'));
export const Lyubertsy1 = lazy(() => import('@/pages/branches/Lyubertsy1'));
export const Lyubertsy2 = lazy(() => import('@/pages/branches/Lyubertsy2'));
export const Mytishchi = lazy(() => import('@/pages/branches/Mytishchi'));
export const Novokosino = lazy(() => import('@/pages/branches/Novokosino'));
export const Okskaya = lazy(() => import('@/pages/branches/Okskaya'));
export const Online = lazy(() => import('@/pages/branches/Online'));
export const Solntsevo = lazy(() => import('@/pages/branches/Solntsevo'));
export const Stakhanovskaya = lazy(() => import('@/pages/branches/Stakhanovskaya'));

// Lazy load program pages
export const Empower = lazy(() => import('@/pages/programs/Empower'));
export const KidsBox = lazy(() => import('@/pages/programs/KidsBox'));
export const MiniSadik = lazy(() => import('@/pages/programs/MiniSadik'));
export const Prepare = lazy(() => import('@/pages/programs/Prepare'));
export const SpeakingClub = lazy(() => import('@/pages/programs/SpeakingClub'));
export const SuperSafari = lazy(() => import('@/pages/programs/SuperSafari'));
export const Workshop = lazy(() => import('@/pages/programs/Workshop'));