import { Link } from 'react-router-dom';

export default function GigCard({ gig }) {
  return (
    <article className="gig-card">
      <div className="gig-card-top">
        <span className="badge">{gig.category}</span>
        <span className="gig-price">${gig.price}</span>
      </div>
      <h3 className="gig-card-title">{gig.title}</h3>
      <p className="gig-card-desc">{gig.description}</p>
      <div className="gig-card-meta">
        <span>by {gig.ownerName || 'Freelancer'}</span>
        <span>{gig.deliveryDays} day delivery</span>
      </div>
      <Link to={`/gigs/${gig.id}`} className="btn btn-primary btn-block">
        View gig
      </Link>
    </article>
  );
}