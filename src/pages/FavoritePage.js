import React, { useEffect, useState } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import "../styles/FavoritePage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FavoritesPage = ({ updateCartCount }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [favorites, setFavorites] = useState({ cards: [], decks: [] });
    const [cart, setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tokenRequested, setTokenRequested] = useState(false);

    const fetchFavorites = async (accessToken) => {
        setLoading(true);
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetFavorites?", { headers });
            setFavorites({
                cards: response.data.favoriteCards,
                decks: response.data.favoriteDecks,
            });
        } catch (error) {
            toast.error("Errore nel recupero dei preferiti.");
            console.error("Errore nel recupero dei preferiti:", error);
            setError("Errore durante il recupero dei preferiti.");
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (itemId, type) => {
        if (!token) {
            navigate("/login");
            return;
        }
    
        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/ToggleFavorite?", { 
                cardId: type === "card" ? itemId : null,
                deckId: type === "deck" ? itemId : null
            }, { headers });
    
            fetchFavorites(token);
            toast.success(type === "card" ? "Carta aggiornata nei preferiti!" : "Mazzo aggiornato nei preferiti!");
        } catch (error) {
            console.error("Errore nella modifica dei preferiti:", error);
            toast.error("Errore nella modifica dei preferiti.");
        }
    };

    const toggleCart = (item, type) => {
        if (!token) {
            navigate("/login");
            return;
        }
    
        setCart((prevCart) => {
            const existingItem = prevCart.find(i => i.id === (item.CardId || item.DeckId));
            let updatedCart;
    
            if (existingItem) {
                updatedCart = prevCart.filter(i => i.id !== (item.CardId || item.DeckId));
                toast.info(`${item.Name} rimosso dal carrello.`);
            } else {
                updatedCart = [...prevCart, {
                    id: item.CardId || item.DeckId,
                    cardId: item.CardId || null,
                    deckId: item.DeckId || null,
                    name: item.Name,
                    price: item.Price || item.TotalPrice,
                    quantity: 1,
                    imageUrl: item.ImageUrl,
                    type: type
                }];
                toast.success(`${item.Name} aggiunto al carrello!`);
            }
    
            sessionStorage.setItem("cart", JSON.stringify(updatedCart));
            updateCartCount(updatedCart.length);
            return updatedCart;
        });
    };

    useEffect(() => {
        if (accounts.length > 0 && !tokenRequested) {
            setTokenRequested(true);
            instance.setActiveAccount(accounts[0]);
            instance
                .acquireTokenSilent({
                    scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                    account: accounts[0]
                })
                .then((response) => {
                    setToken(response.accessToken);
                    fetchFavorites(response.accessToken);
                })
                .catch((error) => {
                    instance.acquireTokenPopup({
                        scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"]
                    }).then(response => {
                        setToken(response.accessToken);
                        fetchFavorites(response.accessToken);
                    }).catch(err => console.error("Errore nel login manuale:", err));
                });
        }
    }, [accounts, instance, tokenRequested]);

    useEffect(() => {
        sessionStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    }, [cart, updateCartCount, tokenRequested]);

    return (
        <div className="favorites-page">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
            <h2 className="favorites-title">⭐ I tuoi Preferiti</h2>
    
            {loading ? (
                <p className="loading-message">Caricamento in corso...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : (
                <>
                    <h3 className="section-title">🃏 Carte Preferite</h3>
                    <div className="favorites-list">
                        {favorites.cards.length > 0 ? favorites.cards.map((card) => (
                            <div key={card.CardId} className="favorite-card">
                                <img src={card.ImageUrl} alt={card.Name} className="favorite-img" />
                                <div className="favorite-info">
                                    <h3>{card.Name}</h3>
                                    <p>{card.Description}</p>
                                    <p><strong>💰 Prezzo:</strong> {card.Price} €</p>
                                    <p><strong>📦 Quantità:</strong> {card.Quantity}</p>
                                    <div className="favorite-buttons">
                                        <button onClick={() => navigate(`/card/${card.CardId}`)} className="details-button">
                                                🔍 Vedi dettagli
                                            </button>
                                        <button 
                                            className="remove-favorite"
                                            onClick={() => toggleFavorite(card.CardId, "card")}
                                        >
                                            ❌ Rimuovi
                                        </button>
                                        <button 
                                            className="cart-button"
                                            onClick={() => toggleCart(card, "card")}
                                        >
                                            {cart.some(i => i.id === card.CardId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="empty-message">Non hai carte nei preferiti.</p>}
                    </div>
    
                    <h3 className="section-title">🃏 Mazzi Preferiti</h3>
                    <div className="favorites-list">
                        {favorites.decks.length > 0 ? favorites.decks.map((deck) => (
                            <div key={deck.DeckId} className="favorite-deck">
                                <img src={deck.ImageUrl} alt={deck.Name} className="favorite-img" />
                                <div className="favorite-info">
                                    <h3>{deck.Name}</h3>
                                    <p>{deck.Description}</p>
                                    <p><strong>💰 Prezzo Totale:</strong> {deck.TotalPrice} €</p>
                                    <p><strong>📅 Creato il:</strong> {new Date(deck.CreatedAt).toLocaleDateString()}</p>
                                    <div className="favorite-buttons">
                                        <button onClick={() => navigate(`/deck/${deck.DeckId}`)} className="details-button">
                                                🔍 Vedi dettagli
                                            </button>
                                        <button 
                                            className="remove-favorite"
                                            onClick={() => toggleFavorite(deck.DeckId, "deck")}
                                        >
                                            ❌ Rimuovi
                                        </button>
                                        <button 
                                            className="cart-button"
                                            onClick={() => toggleCart(deck, "deck")}
                                        >
                                            {cart.some(i => i.id === deck.DeckId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="empty-message">Non hai mazzi nei preferiti.</p>}
                    </div>
                </>
            )}
        </div>
    );
};

export default FavoritesPage;