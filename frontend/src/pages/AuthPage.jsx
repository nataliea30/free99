import { useState } from "react";
import { apiFetch } from "../api/client";

export default function AuthPage() {
  const [register, setRegister] = useState({
    full_name: "",
    email: "",
    residence_hall: "",
    pickup_preference: "Can pickup",
  });
  const [verify, setVerify] = useState({ email: "", code: "123456" });
  const [loginEmail, setLoginEmail] = useState("");
  const [message, setMessage] = useState("");

  const onRegister = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/auth/register", { method: "POST", body: register });
      localStorage.setItem("free99_user_id", data.user_id);
      setMessage(`Registered. user_id=${data.user_id}. Verify email with code 123456.`);
      setVerify((v) => ({ ...v, email: register.email }));
      setLoginEmail(register.email);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/auth/verify-email", { method: "POST", body: verify });
      setMessage("Email verified. You can now log in.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const onLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: { email: loginEmail } });
      localStorage.setItem("free99_user_id", data.user_id);
      setMessage(`Logged in as ${data.user_id}. Verified=${data.verified}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="stack gap-lg">
      <h2>Student Auth</h2>
      <p className="muted">Uses .edu domain check and mock email code flow.</p>

      <form onSubmit={onRegister} className="card form">
        <h3>Create account</h3>
        <input placeholder="Full name" value={register.full_name} onChange={(e) => setRegister({ ...register, full_name: e.target.value })} />
        <input placeholder="Student email (.edu)" value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} />
        <input placeholder="Residence hall" value={register.residence_hall} onChange={(e) => setRegister({ ...register, residence_hall: e.target.value })} />
        <input placeholder="Pickup preference" value={register.pickup_preference} onChange={(e) => setRegister({ ...register, pickup_preference: e.target.value })} />
        <button type="submit">Register</button>
      </form>

      <form onSubmit={onVerify} className="card form">
        <h3>Verify student email</h3>
        <input placeholder="Email" value={verify.email} onChange={(e) => setVerify({ ...verify, email: e.target.value })} />
        <input placeholder="Verification code" value={verify.code} onChange={(e) => setVerify({ ...verify, code: e.target.value })} />
        <button type="submit">Verify</button>
      </form>

      <form onSubmit={onLogin} className="card form">
        <h3>Login</h3>
        <input placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
        <button type="submit">Login</button>
      </form>

      {message && <p className="muted">{message}</p>}
    </section>
  );
}

