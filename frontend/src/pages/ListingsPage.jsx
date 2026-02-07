import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import ListingCard from "../components/ListingCard";

export default function ListingsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const userId = localStorage.getItem("free99_user_id") || "";

  const loadFeed = async () => {
    try {
      setError("");
      const data = await apiFetch("/listings");
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const claimItem = async (listingId) => {
    try {
      await apiFetch(`/listings/${listingId}/claim`, { method: "POST", userId });
      await loadFeed();
    } catch (err) {
      setError(err.message);
    }
  };

  const messagePoster = async (posterId) => {
    if (!userId) {
      setError("Login first from the Auth page.");
      return;
    }
    try {
      await apiFetch(`/messages/threads?participant_id=${posterId}`, {
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
      <h2>Listings Feed</h2>
      <p className="muted">Scrollable list of active giveaway items.</p>
      {error && <p className="error">{error}</p>}
      <div className="scroll-list">
        {items.map((item) => (
          <ListingCard key={item.id} item={item} onClaim={claimItem} onMessagePoster={messagePoster} />
        ))}
      </div>
    </section>
  );
}

