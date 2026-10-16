import { Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth } from './auth/guards';
import { AppShell } from './layout/AppShell';
import { VisitorShell } from './layout/VisitorShell';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ConfirmEmailPage } from './pages/auth/ConfirmEmailPage';
import { ConfirmEmailChangePage } from './pages/auth/ConfirmEmailChangePage';
import { PricingPage } from './pages/public/PricingPage';
import { PrivacyPage, TermsPage } from './pages/public/LegalPages';
import { SecurityPage } from './pages/public/SecurityPage';
import { AffiliatesPage } from './pages/public/AffiliatesPage';
import { WelcomePage } from './features/setup/WelcomePage';
import { DemoPage } from './features/demo/DemoPage';
import { ToolsPage } from './features/tools/ToolsPage';
import { PlanPage } from './features/plan/PlanPage';
import { DebtPage } from './features/debt/DebtPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { InvestPage } from './features/invest/InvestPage';
import { ScenariosPage } from './features/scenarios/ScenariosPage';
import { ProfilePage } from './pages/ProfilePage';
import { NumbersPage } from './features/numbers/NumbersPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { HomeRoute } from './features/home/HomeRoute';
import { HelpPage } from './features/help/HelpPage';
import { HelpArticlePage } from './features/help/HelpArticlePage';
import { BlogPage } from './features/blog/BlogPage';
import { BlogPostPage } from './features/blog/BlogPostPage';

export default function App() {
  return (
    <Routes>
      {/* Signed-out pages */}
      <Route element={<PublicOnly />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Links from emails work whether or not you're signed in */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/confirm-email" element={<ConfirmEmailPage />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChangePage />} />

      {/* Open to everyone */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/affiliates" element={<AffiliatesPage />} />

      {/* Open to everyone, in the app frame when signed in and the public frame when not */}
      <Route element={<VisitorShell />}>
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/help/:slug" element={<HelpArticlePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Route>

      {/* The home page for visitors, the dashboard once signed in */}
      <Route index element={<HomeRoute />} />

      {/* The app */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/debt" element={<DebtPage />} />
          <Route path="/invest" element={<InvestPage />} />
          <Route path="/what-if" element={<ScenariosPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/numbers" element={<NumbersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
