export default function ListingCard({ item, onClaim, onMessagePoster }) {
  return (
    <article className="card listing-card">
      <img className="listing-image" src={item.image_url} alt={item.title} />
      <div className="listing-content">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        <p className="muted">Posted by: {item.posted_by}</p>
        <p className="muted">
          Posted: {new Date(item.created_at).toLocaleString()} · Claims: {item.claim_count}
        </p>
        <div className="chips">
          {item.tags?.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
          <span className="chip">Hall: {item.residence_hall}</span>
          <span className="chip">Condition: {item.condition}</span>
          <span className="chip">{item.pickup_only ? "Pickup only" : "Pickup/Meet"}</span>
          {item.delivery_available && <span className="chip">Delivery available</span>}
          {item.claimed && <span className="chip claimed">Already claimed</span>}
        </div>
        <div className="row gap">
          <button disabled={item.claimed} onClick={() => onClaim?.(item.id)}>
            {item.claimed ? "Claimed" : "Claim item"}
          </button>
          <button className="secondary" onClick={() => onMessagePoster?.(item.poster_id)}>
            Message poster
          </button>
        </div>
      </div>
    </article>
  );
}

