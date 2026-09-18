import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client.js';
import Field from '../../components/Field.jsx';
import Alert from '../../components/Alert.jsx';
import Spinner from '../../components/Spinner.jsx';

const EMPTY = {
  title: '',
  description: '',
  category: '',
  price: '',
  deliveryDays: '1',
};

export default function GigForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    api
      .getGig(id)
      .then((data) => {
        if (!active) return;
        const g = data.data.gig;
        setForm({
          title: g.title,
          description: g.description,
          category: g.category,
          price: String(g.price),
          deliveryDays: String(g.deliveryDays),
        });
        setLoading(false);
      })
      .catch((err) => {
        if (active) {
          setFormError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Title must be at least 3 characters';
    if (form.description.trim().length < 10) next.description = 'Description must be at least 10 characters';
    if (form.category.trim().length < 2) next.category = 'Category is required';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 1) next.price = 'Enter a price of at least 1';
    const days = Number(form.deliveryDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) next.deliveryDays = 'Whole days between 1 and 365';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        deliveryDays: Number(form.deliveryDays),
      };
      if (isEdit) {
        await api.updateGig(id, payload);
      } else {
        await api.createGig(payload);
      }
      navigate('/dashboard/gigs');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="form-page">
      <Link to="/dashboard/gigs" className="back-link">
        &larr; Back to my gigs
      </Link>
      <h2>{isEdit ? 'Edit gig' : 'Create a new gig'}</h2>
      {formError && <Alert>{formError}</Alert>}
      <form onSubmit={handleSubmit} noValidate className="card form-card">
        <Field label="Title" error={errors.title}>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Professional logo design"
            aria-invalid={Boolean(errors.title)}
          />
        </Field>
        <Field label="Category" error={errors.category}>
          <input
            type="text"
            value={form.category}
            onChange={set('category')}
            placeholder="e.g. Design, Web Development, Marketing"
            aria-invalid={Boolean(errors.category)}
          />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows="6"
            maxLength="2000"
            placeholder="Describe the service, deliverables and what clients can expect..."
            aria-invalid={Boolean(errors.description)}
          />
        </Field>
        <div className="form-row">
          <Field label="Price (USD)" error={errors.price}>
            <input
              type="number"
              min="1"
              value={form.price}
              onChange={set('price')}
              placeholder="150"
              aria-invalid={Boolean(errors.price)}
            />
          </Field>
          <Field label="Delivery days" error={errors.deliveryDays}>
            <input
              type="number"
              min="1"
              max="365"
              value={form.deliveryDays}
              onChange={set('deliveryDays')}
              aria-invalid={Boolean(errors.deliveryDays)}
            />
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Create gig'}
          </button>
          <Link to="/dashboard/gigs" className="btn btn-outline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}