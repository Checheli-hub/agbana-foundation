import SummaryCard from "../components/SummaryCard.jsx";

export default function Dashboard({ beneficiaries }) {
  const totalBeneficiaries = beneficiaries.length;
  const totalCalled = beneficiaries.filter((item) => item.called).length;
  const totalNew = beneficiaries.filter(
    (item) => item.category === "New Beneficiary",
  ).length;
  const totalPast = beneficiaries.filter(
    (item) => item.category === "Past Beneficiary",
  ).length;
  const calledRatio = totalBeneficiaries
    ? Math.round((totalCalled / totalBeneficiaries) * 100)
    : 0;

  const categoryCounts = [
    { label: "New", count: totalNew, color: "blue" },
    { label: "Past", count: totalPast, color: "purple" },
    { label: "Called", count: totalCalled, color: "green" },
  ];

  return (
    <section className="page-content">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Beneficiary overview</h1>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard
          title="Total beneficiaries"
          value={totalBeneficiaries}
          details="All registered people"
          accent="accent-blue"
        />
        <SummaryCard
          title="New beneficiaries"
          value={totalNew}
          details="Newly added people"
          accent="accent-purple"
        />
        <SummaryCard
          title="Past beneficiaries"
          value={totalPast}
          details="Previously served candidates"
          accent="accent-teal"
        />
        <SummaryCard
          title="Called beneficiaries"
          value={totalCalled}
          details="Beneficiaries with follow-up call"
          accent="accent-green"
        />
      </div>

      <div className="panel card-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Insights</p>
            <h2>Call performance</h2>
          </div>
          <span className="stat-pill">{calledRatio}% called</span>
        </div>
        {totalBeneficiaries ? (
          <div className="chart-grid">
            {categoryCounts.map((item) => (
              <div key={item.label} className="chart-item">
                <div className="chart-title">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="chart-bar-background">
                  <div
                    className={`chart-bar ${item.color}`}
                    style={{
                      width: `${totalBeneficiaries ? (item.count / totalBeneficiaries) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <p>
              No beneficiaries available yet. Add community members from the
              Beneficiaries page.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
