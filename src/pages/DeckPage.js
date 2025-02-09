import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { useNavigate, useParams} from "react-router-dom";
import "../styles/DeckPage.css";

const DeckPage = ({ updateCartCount }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const { deckId } = useParams();
    const [deck, setDeck] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cart, setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const [token, setToken] = useState("");
    const [allCards, setAllCards] = useState([]);
    const [favorites, setFavorites] = useState([]);

    const fetchDeckDetails = useCallback(async (accessToken) => {
        setLoading(true);
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get(`https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetDeck?=${deckId}`, { headers });
            setDeck(response.data);
        } catch (error) {
            console.error("Errore nel recupero del deck:", error);
            setError("Errore durante il recupero del deck.");
        } finally {
            setLoading(false);
        }
    }, [deckId]);

    const fetchAllCards = async (accessToken) => {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetAllCards?", { headers });
            setAllCards(response.data);
        } catch (error) {
            console.error("Errore nel recupero delle carte:", error);
        }
    };

    const fetchFavorites = async (accessToken) => {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetFavorites?", { headers });
            setFavorites(response.data.favoriteDecks.map(d => d.DeckId));
        } catch (error) {
            console.error("Errore nel recupero dei preferiti:", error);
        }
    };

    const toggleCart = () => {
        if (!token) {
            navigate("/login");
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find(i => i.id === deck.DeckId);
            let updatedCart;

            if (existingItem) {
                updatedCart = prevCart.filter(i => i.id !== deck.DeckId);
            } else {
                updatedCart = [...prevCart, {
                    id: deck.DeckId,
                    deckId: deck.DeckId,
                    name: deck.Name,
                    price: deck.TotalPrice,
                    imageUrl: deck.ImageUrl,
                    type: "deck"
                }];
            }

            sessionStorage.setItem("cart", JSON.stringify(updatedCart));
            updateCartCount(updatedCart.length);
            return updatedCart;
        });
    };

    const toggleFavorite = async () => {
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/ToggleFavorite?", { deckId: deck.DeckId }, { headers });

            setFavorites((prevFavorites) => {
                return prevFavorites.includes(deck.DeckId)
                    ? prevFavorites.filter(id => id !== deck.DeckId)
                    : [...prevFavorites, deck.DeckId];
            });
        } catch (error) {
            console.error("Errore nella modifica dei preferiti:", error);
        }
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
                    fetchDeckDetails(response.accessToken);
                    fetchAllCards(response.accessToken);
                    fetchFavorites(response.accessToken);
                })
                .catch((error) => {
                    instance.acquireTokenPopup({
                        scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"]
                    }).then(response => {
                        setToken(response.accessToken);
                        fetchDeckDetails(response.accessToken);
                        fetchAllCards(response.accessToken);
                        fetchFavorites(response.accessToken);
                    }).catch(err => console.error("Errore nel login manuale:", err));
                });
        } else {
            fetchDeckDetails(null);
            fetchAllCards(null);
        }
    }, [accounts, instance, deckId, fetchDeckDetails]);

    if (loading) return <p>Caricamento in corso...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!deck) return <p>Il mazzo non è disponibile.</p>;

    return (
        <div className="single-deck-page">
            <div className="deck-header">
                <h2 className="deck-title">{deck.Name}</h2>
                <img src={deck.ImageUrl} alt={deck.Name} className="deck-image" />
            </div>
    
            <div className="deck-info">
                <p><strong>📖 Descrizione:</strong> {deck.Description}</p>
                <p><strong>💰 Prezzo Totale:</strong> <span className="price-tag">{deck.TotalPrice} €</span></p>
    
                <button className="favorite-button" onClick={toggleFavorite}>
                    {favorites.includes(deck.DeckId) ? "❌ Rimuovi dai preferiti" : "⭐ Aggiungi ai preferiti"}
                </button>
            </div>
    
            <h3 className="deck-cards-title">🃏 Carte Incluse:</h3>
            <div className="deck-cards-container">
                {deck.cards.map(card => {
                    const cardOutsideDeck = allCards.find(c => c.CardId === card.CardId);
                    const isClickable = cardOutsideDeck && cardOutsideDeck.Quantity > 0;

                    return (
                        <div key={card.CardId} className="deck-card">
                            <img src={card.ImageUrl} alt={card.Name} className="deck-card-img" />
                            <p className="deck-card-name">{card.Name}</p>
                            <p className="deck-card-quantity"><strong>Quantità:</strong> {card.Quantity}</p>

                            {isClickable ? (
                                <button onClick={() => navigate(`/card/${card.CardId}`)} className="details-button">
                                    🔍 Vedi dettagli
                                </button>
                            ) : (
                                <p className="unavailable-text">(Non disponibile fuori dal deck)</p>
                            )}
                        </div>
                    );
                })}
            </div>
    
            <div className="deck-actions">
                <button className="cart-button" onClick={toggleCart}>
                    {cart.some(i => i.id === deck.DeckId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                </button>
                <button className="back-button" onClick={() => navigate("/")}>⬅ Torna alla Homepage</button>
            </div>
        </div>
    );
};

export default DeckPage;