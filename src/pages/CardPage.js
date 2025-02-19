import React, { useEffect, useState } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/CardPage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CardPage = ({ updateCartCount }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const { cardId } = useParams();
    const [card, setCard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [cart, setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const [token, setToken] = useState("");

    const fetchCardDetails = useCallback(async (accessToken) => {
        setLoading(true);
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get(`https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetCard?=${cardId}`, { headers });
            setCard(response.data);
        } catch (error) {
            console.error("Errore nel recupero della carta:", error);
            toast.error("Errore durante il recupero della carta.");
            setError("Errore durante il recupero della carta.");
        } finally {
            setLoading(false);
        }
    }, [cardId]);

    const fetchFavorites = async (accessToken) => {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetFavorites?", { headers });
            setFavorites(response.data.favoriteCards.map(c => c.CardId));
        } catch (error) {
            console.error("Errore nel recupero dei preferiti:", error);
        }
    };

    const toggleFavorite = async () => {
        if (!token) {
            navigate("/login");
            return;
        }
    
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/ToggleFavorite?", { cardId }, { headers });
    
            fetchFavorites(token);
            fetchCardDetails(token);

            if (favorites.includes(cardId)) {
                toast.info("❌ Rimosso dai preferiti", { theme: "colored" });
            } else {
                toast.success("⭐ Aggiunto ai preferiti", { theme: "colored" });
            }
        } catch (error) {
            console.error("Errore nella modifica dei preferiti:", error);
            toast.error("Errore durante l'operazione!", { theme: "colored" });
        }
    };

    const toggleCart = () => {
        if (!token) {
            navigate("/login");
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find(i => i.id === card.CardId);
            let updatedCart;

            if (existingItem) {
                updatedCart = prevCart.filter(i => i.id !== card.CardId);
                toast.info("❌ Rimosso dal carrello", { theme: "colored" });
            } else {
                updatedCart = [...prevCart, {
                    id: card.CardId,
                    cardId: card.CardId,
                    name: card.Name,
                    price: card.Price,
                    quantity: 1,
                    imageUrl: card.ImageUrl,
                    type: "card"
                }];
                toast.success("🛒 Aggiunto al carrello", { theme: "colored" });
            }

            sessionStorage.setItem("cart", JSON.stringify(updatedCart));
            updateCartCount(updatedCart.length);
            return updatedCart;
        });
    };
    
    useEffect(() => {
        if (accounts.length > 0) {
            instance.setActiveAccount(accounts[0]);
            instance
                .acquireTokenSilent({
                    scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                    account: accounts[0]
                })
                .then((response) => {
                    setToken(response.accessToken);
                    fetchCardDetails(response.accessToken);
                    fetchFavorites(response.accessToken);
                })
                .catch((error) => {
                    instance.acquireTokenPopup({
                        scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"]
                    }).then(response => {
                        setToken(response.accessToken);
                        fetchCardDetails(response.accessToken);
                        fetchFavorites(response.accessToken);
                    }).catch(err => console.error("Errore nel login manuale:", err));
                });
        } else {
            fetchCardDetails(null);
        }
    }, [accounts, instance, cardId, fetchCardDetails]);

    if (loading) return <p>Caricamento in corso...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!card) return <p>La carta non è disponibile.</p>;

    return (
        <div className="single-card-page">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
          <div className="card-container">
            <img src={card.ImageUrl} alt={card.Name} className="card-image" />
            <div className="card-details">
              <h2 className="card-title">{card.Name}</h2>
              <p className="card-description"><strong>Descrizione:</strong> {card.Description}</p>
              <p className="card-price"><strong>Prezzo:</strong> 💰 {card.Price} €</p>
              <p className="card-quantity"><strong>Quantità disponibile:</strong> {card.Quantity}</p>
    
              <div className="button-group">
                <button className="favorite-button" onClick={toggleFavorite}>
                  {favorites.includes(card.CardId) ? "❌ Rimuovi dai preferiti" : "⭐ Aggiungi ai preferiti"}
                </button>
                <button className="cart-button" onClick={toggleCart}>
                  {cart.some(i => i.id === card.CardId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                </button>
                <button className="back-button" onClick={() => navigate("/")}>
                  ⬅ Torna alla Homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      );
};

export default CardPage;