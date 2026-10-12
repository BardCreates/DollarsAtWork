import { Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth } from './auth/guards';
import { AppShell } from './layout/AppShell';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ConfirmEmailPage } from './pages/auth/ConfirmEmailPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ToolsPage } from './features/tools/ToolsPage';
import { PlanPage } from './features/plan/PlanPage';
import { DebtPage } from './features/debt/DebtPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { InvestPage } from './features/invest/InvestPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

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

      {/* The app */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/debt" element={<DebtPage />} />
          <Route path="/invest" element={<InvestPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
