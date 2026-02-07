import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

export default function MyPostingsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const userId = localStorage.getItem("free99_user_id") || "";

  const load = async () => {
    try {
      const data = await apiFetch("/listings/mine", { userId });
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const messageClaimant = async (claimantId) => {
    try {
      await apiFetch(`/messages/threads?participant_id=${claimantId}`, {
        method: "POST",
        userId,
      });
      setError("Thread created/opened. Go to Messages page.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>My Postings</h2>
      <p className="muted">Claimants are sorted by most recently claimed first.</p>
      {error && <p className="error">{error}</p>}
      <div className="stack gap-lg">
        {items.map((listing) => (
          <article key={listing.id} className="card">
            <h3>{listing.title}</h3>
            <p>{listing.description}</p>
            <div className="chips">
              <span className="chip">Claims: {listing.claim_count}</span>
              {listing.claimed && <span className="chip claimed">Claimed</span>}
            </div>
            <h4>Claimants</h4>
            <div className="stack gap-sm">
              {listing.claimants.length === 0 && <p className="muted">No claims yet.</p>}
              {listing.claimants.map((c) => (
                <div key={`${listing.id}-${c.user_id}-${c.claimed_at}`} className="row between claimant-row">
                  <div>
                    <strong>{c.full_name}</strong>
                    <div className="chips">
                      <span className="chip">Hall: {c.residence_hall}</span>
                      <span className="chip">Pickup: {c.pickup_preference}</span>
                    </div>
                  </div>
                  <button onClick={() => messageClaimant(c.user_id)}>Message</button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

