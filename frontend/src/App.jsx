import { Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import AuthPage from "./pages/AuthPage";
import ClaimedItemsPage from "./pages/ClaimedItemsPage";
import CreateListingPage from "./pages/CreateListingPage";
import ListingsPage from "./pages/ListingsPage";
import MessagesPage from "./pages/MessagesPage";
import MyPostingsPage from "./pages/MyPostingsPage";

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/create" element={<CreateListingPage />} />
          <Route path="/claimed" element={<ClaimedItemsPage />} />
          <Route path="/my-postings" element={<MyPostingsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  );
}

