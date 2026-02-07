import { NavLink } from "react-router-dom";

const links = [
  ["/", "Listings"],
  ["/create", "Create Listing"],
  ["/claimed", "Claimed Items"],
  ["/my-postings", "My Postings"],
  ["/messages", "Messages"],
  ["/auth", "Auth"],
];

export default function NavBar() {
  return (
    <nav className="nav">
      <h1>Free99</h1>
      <div className="nav-links">
        {links.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? "link active" : "link")}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

