import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import ListingCard from "../components/ListingCard";

export default function ClaimedItemsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const userId = localStorage.getItem("free99_user_id") || "";

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch("/listings/claimed/me", { userId });
        setItems(data);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [userId]);

  return (
    <section>
      <h2>My Claimed Items</h2>
      {error && <p className="error">{error}</p>}
      <div className="scroll-list">
        {items.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

