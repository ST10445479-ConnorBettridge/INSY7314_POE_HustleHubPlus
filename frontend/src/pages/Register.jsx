import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('client');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next = {};
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
    if (password.length < 8) next.password = 'At least 8 characters';
    else {
      if (!/[A-Z]/.test(password)) next.password = 'Needs an uppercase letter';
      else if (!/[a-z]/.test(password)) next.password = 'Needs a lowercase letter';
      else if (!/\d/.test(password)) next.password = 'Needs a number';
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) next.password = 'Needs a special character';
    }
    if (confirm !== password) next.confirm = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setFormError('');
    try {
      const user = await register({ name, email, password, role });
      navigate(user.role === 'freelancer' ? '/dashboard/gigs' : '/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card auth-card-wide">
        <h1>Create your account</h1>
        <p className="muted">Join HustleHub+ as a client or a freelancer.</p>
        {formError && <Alert>{formError}</Alert>}
        <form onSubmit={handleSubmit} noValidate>
          <Field label="I want to join as" error={errors.role}>
            <div className="role-picker">
              <button
                type="button"
                className={`role-option ${role === 'client' ? 'role-active' : ''}`}
                onClick={() => setRole('client')}
              >
                <strong>Client</strong>
                <span>I want to hire freelancers</span>
              </button>
              <button
                type="button"
                className={`role-option ${role === 'freelancer' ? 'role-active' : ''}`}
                onClick={() => setRole('freelancer')}
              >
                <strong>Freelancer</strong>
                <span>I want to sell my services</span>
              </button>
            </div>
          </Field>
          <Field label="Full name" error={errors.name}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field label="Password" error={errors.password} hint="8+ chars with upper, lower, number and symbol">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p className="auth-alt">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}