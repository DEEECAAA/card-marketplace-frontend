import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import "../styles/Navbar.css";

const Navbar = ({ cartCount }) => {
    const { instance, accounts } = useMsal();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem("token");
            setIsAuthenticated(!!token && accounts.length > 0);
        };

        checkAuth();

        const accountListener = () => {
            checkAuth();
        };

        instance.addEventCallback(accountListener);

        return () => {
            instance.removeEventCallback(accountListener);
        };
    }, [accounts, instance]);

    useEffect(() => {
        const updateCart = () => {
            setCart(JSON.parse(sessionStorage.getItem("cart")) || []);
        };

        window.addEventListener("storage", updateCart);
        return () => {
            window.removeEventListener("storage", updateCart);
        };
    }, [setCart]);

    const handleLogout = async () => {
        await instance.logoutPopup();
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        setIsAuthenticated(false);
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    <img src="https://cardmarketplaceblob.blob.core.windows.net/imagecontainer/WhatsApp Image 2025-02-08 at 12.54.57.jpeg" alt="Logo" className="logo-img" />
                    <span>CardMarketplace</span>
                </Link>

                <ul className="nav-menu">
                    <li className="nav-item">
                        <Link to="/" className="nav-link">🏠 Home</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/favorite" className="nav-link">⭐ Preferiti</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/profile" className="nav-link">👤 Profilo</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/cart" className="cart-link">
                            🛒 Carrello <span className="cart-count">{cartCount}</span>
                        </Link>
                    </li>
                    <li className="nav-item">
                        {isAuthenticated ? (
                            <button onClick={handleLogout} className="nav-button logout">🚪 Logout</button>
                        ) : (
                            <Link to="/login" className="nav-button login">🔑 Login</Link>
                        )}
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;