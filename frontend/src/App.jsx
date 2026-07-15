import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Invoices from './pages/Invoices';
import Payroll from './pages/Payroll';
import SalaryStructures from './pages/SalaryStructures';
import SalarySlips from './pages/SalarySlips';
import Ledger from './pages/Ledger';
import Expenses from './pages/Expenses';
import VendorStatements from './pages/VendorStatements';
import Reports from './pages/Reports';
import TaxReports from './pages/TaxReports';
import Settings from './pages/Settings';
import StatementArchive from './pages/StatementArchive';
import PLAccount from './pages/PLAccount';
import Vouchers from './pages/Vouchers';
import BalanceSheet from './pages/BalanceSheet';
import BankReconciliation from './pages/BankReconciliation';
import RecurringInvoices from './pages/RecurringInvoices';
import DeveloperConsole from './pages/DeveloperConsole';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/developer" element={<DeveloperConsole />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/recurring-invoices" element={<RecurringInvoices />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/salary-structures" element={<SalaryStructures />} />
            <Route path="/salary-slips" element={<SalarySlips />} />
            <Route path="/ledger" element={<Ledger />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/vendor-statements" element={<VendorStatements />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tax-reports" element={<TaxReports />} />
            <Route path="/statements" element={<StatementArchive />} />
            <Route path="/pl-account" element={<PLAccount />} />
            <Route path="/vouchers" element={<Vouchers />} />
            <Route path="/balance-sheet" element={<BalanceSheet />} />
            <Route path="/bank-reconciliation" element={<BankReconciliation />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
