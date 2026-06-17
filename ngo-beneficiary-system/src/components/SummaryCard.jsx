export default function SummaryCard({ title, value, details, accent }) {
  return (
    <div className={`summary-card ${accent || ""}`}>
      <div className="summary-card-top">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <p>{details}</p>
    </div>
  );
}
