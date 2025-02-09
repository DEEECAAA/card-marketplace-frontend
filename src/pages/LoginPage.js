import React, { useEffect, useState, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

const LoginPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [tokenSent, setTokenSent] = useState(false);

    const sendTokenToBackend = useCallback(async (token) => {
        setTokenSent(true);
    
        localStorage.setItem("token", token);
        sessionStorage.setItem("token", token);
    
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
            instance.setActiveAccount(accounts[0]);
        }
    
        const response = await fetch("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/UserLogin?", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
    
        if (response.ok) navigate("/");
    }, [instance, navigate]);

    const acquireToken = useCallback(async (account) => {
        if (tokenSent) return;
        try {
            const tokenResponse = await instance.acquireTokenSilent({
                scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                account: account
            });
            if (tokenResponse && tokenResponse.accessToken) {
                setTokenSent(true);
                sendTokenToBackend(tokenResponse.accessToken);
                return;
            }
        } catch (error) {
            if (error.name === "InteractionRequiredAuthError") {
                try {
                    const tokenResponse = await instance.acquireTokenPopup({
                        scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                        account: account
                    });
                    if (tokenResponse && tokenResponse.accessToken) {
                        setTokenSent(true);
                        sendTokenToBackend(tokenResponse.accessToken);
                    }
                } catch (popupError) {
                    console.error("acquireTokenPopup ha fallito:", popupError);
                }
            }
        }
    }, [instance, tokenSent, sendTokenToBackend]);

    const handleLogin = async () => {
        try {
            const loginResponse = await instance.loginPopup({
                scopes: ["User.Read"]
            });
            if (loginResponse && loginResponse.account) acquireToken(loginResponse.account);
        } catch (error) {
            console.error("Errore durante il login:", error);
        }
    };

    useEffect(() => {
        if (accounts.length > 0 && !tokenSent) {
            acquireToken(accounts[0]);
        }
    }, [accounts, tokenSent, acquireToken]);

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Benvenuto su <span className="highlight">CardMarketplace</span></h2>
                <p>Accedi per gestire le tue carte collezionabili</p>
                <button className="login-button" onClick={handleLogin}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="ms-logo" />
                    Accedi con Microsoft
                </button>
            </div>
        </div>
    );
};

export default LoginPage;