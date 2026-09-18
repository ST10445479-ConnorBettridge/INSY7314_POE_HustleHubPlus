const BASE = 'https://localhost:3443/api';
const TLS = { headers: { 'User-Agent': 'hh-e2e' } };
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let failures = 0;
let passes = 0;
const step = (name, ok, extra = '') => {
  if (ok) { passes++; console.log(`  PASS  ${name} ${extra ? ' - ' + extra : ''}`); }
  else { failures++; console.log(`  FAIL  ${name} ${extra ? ' - ' + extra : ''}`); }
};

const apiCall = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
};

(async () => {
  // 1. Health
  const health = await apiCall('/health');
  step('GET /api/health returns 200', health.status === 200);

  // 2. Public gig listing + category filter
  const gigs = await apiCall('/gigs');
  step('GET /api/gigs public', gigs.status === 200 && gigs.json.count === 4, `count=${gigs.json.count}`);
  const filtered = await apiCall('/gigs?category=Design');
  step('GET /api/gigs?category=Design', filtered.status === 200 && filtered.json.data.gigs.every((g) => g.category === 'Design'),
    `${filtered.json.count} design gigs`);

  // 3. Login client + freelancer
  const loginClient = await apiCall('/auth/login', { method: 'POST', body: { email: 'alex@hustlehub.demo', password: 'DemoPass1!' } });
  step('login alex (client)', loginClient.status === 200 && loginClient.json.data.token, 'client token received');
  const clientToken = loginClient.json.data.token;

  const loginFreelancer = await apiCall('/auth/login', { method: 'POST', body: { email: 'zane@hustlehub.demo', password: 'DemoPass1!' } });
  step('login zane (freelancer)', loginFreelancer.status === 200 && loginFreelancer.json.data.token, 'freelancer token received');
  const flToken = loginFreelancer.json.data.token;

  // 4. Profile
  const profile = await apiCall('/auth/profile', { token: clientToken });
  step('GET /api/auth/profile (client)', profile.status === 200 && profile.json.data.user.email === 'alex@hustlehub.demo');

  // 5. Wrong password rejected
  const badLogin = await apiCall('/auth/login', { method: 'POST', body: { email: 'alex@hustlehub.demo', password: 'wrongpass!' } });
  step('login rejected with wrong password', badLogin.status === 401);

  // 6. RBAC: client cannot list own gigs
  const myGigsClient = await apiCall('/gigs/mine', { token: clientToken });
  step('client blocked from GET /gigs/mine (403)', myGigsClient.status === 403, `status=${myGigsClient.status}`);

  // 7. Client cannot create a gig
  const createAsClient = await apiCall('/gigs', { method: 'POST', token: clientToken, body: { title: 'Hack', category: 'X', price: 1, deliveryDays: 1 } });
  step('client blocked from POST /gigs (403)', createAsClient.status === 403);

  // 8. No auth token
  const noAuth = await apiCall('/gigs/mine');
  step('GET /gigs/mine without token (401)', noAuth.status === 401);

  // 9. Freelancer creates a gig
  const gigData = { title: 'E2E Brand Package', description: 'E2E test gig: logo, palette and brand guide.', category: 'Design', price: 250, deliveryDays: 5 };
  const created = await apiCall('/gigs', { method: 'POST', token: flToken, body: gigData });
  step('freelancer creates gig', created.status === 201, `id=${created.json.data.gig.id}`);
  const gigId = created.json.data.gig.id;

  // 10. Gig detail
  const detail = await apiCall(`/gigs/${gigId}`);
  step('GET /gigs/:id public detail', detail.status === 200 && detail.json.data.gig.title === 'E2E Brand Package');

  // 11. Freelancer edits own gig
  const updated = await apiCall(`/gigs/${gigId}`, { method: 'PUT', token: flToken, body: { title: 'E2E Brand Package v2', description: 'Updated description for E2E.', category: 'Design', price: 300, deliveryDays: 6 } });
  step('freelancer edits own gig', updated.status === 200 && updated.json.data.gig.price === 300);

  // 12. Cross-user protection: alex cannot edit zane's gig
  const crossEdit = await apiCall(`/gigs/${gigId}`, { method: 'PUT', token: clientToken, body: { title: 'Hijack' } });
  step('client blocked from editing another user\'s gig (403)', crossEdit.status === 403);

  // 13. Client books the gig -> transaction created
  const booking = await apiCall('/bookings', { method: 'POST', token: clientToken, body: { gigId, note: 'Need it before Friday.' } });
  step('client books gig (booking + transaction)', booking.status === 201 && booking.json.data.transaction && booking.json.data.transaction.reference,
    `ref=${booking.json.data.transaction && booking.json.data.transaction.reference} status=${booking.json.data.booking.status}`);

  // 14. Client sees own bookings
  const myBookings = await apiCall('/bookings', { token: clientToken });
  step('client lists bookings', myBookings.status === 200 && myBookings.json.data.bookings.length >= 1);

  // 15. Freelancer sees bookings on own gigs
  const flBookings = await apiCall('/bookings', { token: flToken });
  step('freelancer lists bookings on own gigs', flBookings.status === 200 && flBookings.json.data.bookings.length >= 1);

  // 16. Freelancer income aggregation includes this transaction
  const income = await apiCall('/income', { token: flToken });
  step('freelancer income includes new txn', income.status === 200 && income.json.data.income.transactionCount >= 1 && income.json.data.income.totalIncome >= 300,
    `txns=${income.json.data.income.transactionCount} total=${income.json.data.income.totalIncome}`);

  // 17. Client blocked from aggregate income
  const incomeClient = await apiCall('/income', { token: clientToken });
  step('client blocked from GET /income (403)', incomeClient.status === 403);

  // 18. XSS sanitisation on input
  const xssGig = await apiCall('/gigs', { method: 'POST', token: flToken, body: { title: '<script>alert(1)</script>Safe Title', description: '<img src=x onerror=alert(1)> a long and perfectly legitimate description that stays long', category: 'Writing', price: 10, deliveryDays: 2 } });
  step('XSS stripped from created gig', xssGig.status === 201 && !xssGig.json.data.gig.title.includes('<script>') && !xssGig.json.data.gig.description.includes('<img'));

  // 19. NoSQL injection neutralised
  const injection = await apiCall('/auth/login', { method: 'POST', body: { email: { $gt: '' }, password: { $gt: '' } } });
  step('NoSQL $gt injection on login rejected', injection.status !== 200 || !injection.json.token);

  // 20. Security headers (CSP)
  const headersRes = await fetch('https://localhost:3443/login', { ...TLS });
  const csp = headersRes.headers.get('content-security-policy') || '';
  step('CSP header present on SPA', csp.includes("default-src 'self'"), 'CSP present');
  step('nosniff + x-powered-by hidden', (headersRes.headers.get('x-content-type-options') || '').toLowerCase() === 'nosniff');

  // 21. Freelancer deletes own gig
  const del = await apiCall(`/gigs/${gigId}`, { method: 'DELETE', token: flToken });
  step('freelancer deletes own gig', del.status === 200);
  const after = await apiCall(`/gigs/${gigId}`);
  step('deleted gig no longer listed (404)', after.status === 404);

  // 22. Booking on a deleted/nonexistent gig fails
  const ghostBooking = await apiCall('/bookings', { method: 'POST', token: clientToken, body: { gigId: '000000000000000000000000' } });
  step('booking on missing gig rejected (404/400)', ghostBooking.status === 404 || ghostBooking.status === 400, `status=${ghostBooking.status}`);

  console.log('');
  console.log(`E2E result: ${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})().catch((err) => { console.error('E2E crashed:', err); process.exit(1); });