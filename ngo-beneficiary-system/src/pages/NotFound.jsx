import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="page-content not-found-page">
      <div className="empty-state-card">
        <h2>Page not found</h2>
        <p>The page you were looking for does not exist.</p>
        <Link to="/" className="button-primary">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
