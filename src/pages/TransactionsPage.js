import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/TransactionsPage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TransactionsPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTransactions = async (accessToken) => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetTransaction?", { headers });
    
            setTransactions(response.data.transactions || []);
            toast.success("✅ Transazioni caricate con successo!");
        } catch (error) {
            console.error("Errore nel recupero delle transazioni:", error);
            setError("Errore durante il recupero delle transazioni.");
            toast.error("❌ Errore durante il recupero delle transazioni.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (accounts.length > 0) {
            instance.setActiveAccount(accounts[0]);
            instance
                .acquireTokenSilent({
                    scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                    account: accounts[0],
                })
                .then((response) => {
                    fetchTransactions(response.accessToken);
                })
                .catch(error => {
                    console.error("Errore nel login:", error);
                    setError("Errore nell'autenticazione.");
                });
        }
    }, [accounts, instance]);

    return (
        <div className="transactions-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            <h2 className="transactions-title">📜 Le tue Transazioni</h2>
            {loading ? (
                <p className="loading-message">Caricamento in corso...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : (
                <>
                    {transactions.length > 0 ? (
                        <div className="transaction-list">
                            {transactions.map((transaction) => (
                                <div key={transaction.TransactionId} className="transaction-card">
                                    <h3 className="transaction-id">🛒 Transazione #{transaction.TransactionId}</h3>
                                    <p className="transaction-date">📅 <strong>Data:</strong> {new Date(transaction.TransactionDate).toLocaleDateString()}</p>
                                    <p className="transaction-total">💰 <strong>Totale:</strong> {transaction.TotalAmount} €</p>
    
                                    <h4 className="transaction-items-title">📦 Oggetti Acquistati</h4>
                                    <ul className="transaction-items-list">
                                        {transaction.details.map((item, index) => (
                                            <li key={index} className="transaction-item">
                                                {item.ImageUrl && <img src={item.ImageUrl} alt={item.CardName || item.DeckName} className="transaction-item-img" />}
                                                <div className="transaction-item-info">
                                                    <span className="item-name">{item.CardName ? item.CardName : item.DeckName}</span>
                                                    <span className="item-price">💲 {item.CardPrice ? item.CardPrice : item.DeckPrice} €</span>
                                                    <span className="item-quantity">{item.CardQuantity ? `📦 x${item.CardQuantity}` : "📦 Pezzo unico"}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-transactions-message">❌ Non hai ancora effettuato transazioni.</p>
                    )}
                </>
            )}
    
            <button className="back-button" onClick={() => navigate("/profile")}>⬅ Torna al Profilo</button>
        </div>
    );
};

export default TransactionsPage;