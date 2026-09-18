import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import GigDetail from './pages/GigDetail.jsx';
import NotFound from './pages/NotFound.jsx';
import DashboardLayout, { DashboardHome } from './pages/dashboard/DashboardLayout.jsx';
import FreelancerGigs from './pages/dashboard/FreelancerGigs.jsx';
import GigForm from './pages/dashboard/GigForm.jsx';
import BookingsList from './pages/dashboard/BookingsList.jsx';
import FreelancerIncome from './pages/dashboard/FreelancerIncome.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      <Route
        path="/login"
        element={
          <Layout>
            <Login />
          </Layout>
        }
      />
      <Route
        path="/register"
        element={
          <Layout>
            <Register />
          </Layout>
        }
      />
      <Route
        path="/gigs/:id"
        element={
          <Layout>
            <GigDetail />
          </Layout>
        }
      />

      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="gigs" element={<FreelancerGigs />} />
        <Route path="new-gig" element={<GigForm />} />
        <Route path="edit-gig/:id" element={<GigForm />} />
        <Route path="bookings" element={<BookingsList />} />
        <Route path="income" element={<FreelancerIncome />} />
      </Route>

      <Route
        path="*"
        element={
          <Layout>
            <NotFound />
          </Layout>
        }
      />
    </Routes>
  );
}