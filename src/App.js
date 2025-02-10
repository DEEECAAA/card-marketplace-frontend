import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/UserProfile";
import CreatePage from "./pages/CreatePage";
import CartPage from "./pages/CartPage";
import FavoritePage from "./pages/FavoritePage";
import Navbar from "./components/Navbar";
import CardPage from "./pages/CardPage";
import DeckPage from "./pages/DeckPage";
import TransactionsPage from "./pages/TransactionsPage";
import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
  const { instance } = useMsal();
  const [cartCount, setCartCount] = useState(JSON.parse(sessionStorage.getItem("cart"))?.length || 0);

  const updateCartCount = (count) => {
    setCartCount(count);
    const currentCart = JSON.parse(sessionStorage.getItem("cart")) || [];
    sessionStorage.setItem("cart", JSON.stringify(currentCart));
};

  useEffect(() => {
    const accounts = instance.getAllAccounts();
    
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    } else {
      console.warn("Nessun account attivo trovato. Riprovo...");
      instance.handleRedirectPromise().then(() => {
        const newAccounts = instance.getAllAccounts();
        if (newAccounts.length > 0) {
          instance.setActiveAccount(newAccounts[0]);
        }
      }).catch(error => console.error("Errore nel gestire il reindirizzamento:", error));
    }
  }, [instance]);

  return (
    <MsalProvider instance={msalInstance}>
      <Router>
        <Navbar cartCount={cartCount}/>
        <div className="content">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage updateCartCount={updateCartCount} />} />
            <Route path="/card/:cardId" element={<CardPage updateCartCount={updateCartCount} />} />
            <Route path="/deck/:deckId" element={<DeckPage updateCartCount={updateCartCount} />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
            <Route path="/favorite" element={<ProtectedRoute><FavoritePage updateCartCount={updateCartCount}/></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><CartPage updateCartCount={updateCartCount}/></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionsPage/></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </MsalProvider>
  );
};

export default App;