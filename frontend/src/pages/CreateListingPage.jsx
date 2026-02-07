import { useState } from "react";
import { apiFetch } from "../api/client";

const initialForm = {
  title: "",
  description: "",
  image_url: "https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?w=900",
  tags: "pickup only,dorm room",
  residence_hall: "",
  condition: "Good",
  delivery_available: false,
  pickup_only: true,
};

export default function CreateListingPage() {
  const [form, setForm] = useState(initialForm);
  const [msg, setMsg] = useState("");
  const userId = localStorage.getItem("free99_user_id") || "";

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      await apiFetch("/listings", { method: "POST", body: payload, userId });
      setMsg("Listing created.");
      setForm(initialForm);
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <section>
      <h2>Create Listing</h2>
      <p className="muted">Post free items with tags, location, and condition.</p>
      <form className="card form" onSubmit={submit}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <input placeholder="Residence hall" value={form.residence_hall} onChange={(e) => setForm({ ...form, residence_hall: e.target.value })} />
        <input placeholder="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
        <label>
          <input type="checkbox" checked={form.pickup_only} onChange={(e) => setForm({ ...form, pickup_only: e.target.checked })} />
          Pickup only
        </label>
        <label>
          <input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} />
          Delivery available
        </label>
        <button type="submit">Create</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
    </section>
  );
}

