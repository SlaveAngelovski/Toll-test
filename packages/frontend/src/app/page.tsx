"use client";

export default function HomePage() {
  return (
    <main className="section">
      <div className="container">
        <div className="mb-5">
          <h1 className="title">Toll Passage Manager</h1>
          <p className="subtitle">
            Track daily toll fees, stay under the 120 DKK cap, and review which
            passages were actually charged.
          </p>
        </div>

        {/* Add Passage Form */}
        <div className="box mb-5">
          <h2 className="subtitle is-5">Add Passage</h2>
          <form onSubmit={handleSubmit}>
            <div className="field is-grouped is-flex-wrap-wrap">
              <div className="control">
                <label className="label">Vehicle ID</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. ABC-123"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                />
              </div>
              <div className="control">
                <label className="label">Vehicle Type</label>
                <div className="select">
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    required
                  >
                    {vehicleTypes.map((vt) => (
                      <option key={vt.vehicleType} value={vt.vehicleType}>
                        {vt.vehicleType}
                        {vt.tollFree ? " (toll-free)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="control">
                <label className="label">Date &amp; Time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                />
              </div>
              <div className="control" style={{ alignSelf: "flex-end" }}>
                <button
                  className={`button is-primary${submitting ? " is-loading" : ""}`}
                  type="submit"
                  disabled={submitting}
                >
                  Add Passage
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Passages Table */}
        <div className="box">
          <h2 className="subtitle is-5">Passages</h2>
          {loadingPassages ? (
            <span className="loader" />
          ) : passages.length === 0 ? (
            <p className="has-text-grey">No passages recorded yet.</p>
          ) : (
            <div className="table-container">
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Vehicle Type</th>
                    <th>Timestamp</th>
                    <th>Base Fee (DKK)</th>
                    <th>Charged Fee (DKK)</th>
                    <th>Daily Total (DKK)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {passages.map((passage) => (
                    <tr key={passage.id}>
                      <td>{passage.vehicleId}</td>
                      <td>{passage.vehicleType}</td>
                      <td>{new Date(passage.timestamp).toLocaleString()}</td>
                      <td>{passage.baseFee}</td>
                      <td>{passage.chargedFee}</td>
                      <td>{passage.dailyTotal}</td>
                      <td>
                        <button
                          className="button is-danger is-small"
                          onClick={() => handleDelete(passage.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
