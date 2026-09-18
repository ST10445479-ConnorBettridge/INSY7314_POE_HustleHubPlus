import Navbar from './Navbar.jsx';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">{children}</main>
      <footer className="footer">
        HustleHub+ · Secure freelance marketplace demo · All payments are simulated
      </footer>
    </div>
  );
}