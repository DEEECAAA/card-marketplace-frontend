import React, { useEffect, useState } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const HomePage = ({ updateCartCount }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [cards, setCards] = useState([]);
    const [decks, setDecks] = useState([]);
    const [favorites, setFavorites] = useState({ cards: [], decks: [] });
    const [cart, setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [tokenRequested, setTokenRequested] = useState(false);

    const fetchCards = async (accessToken) => {
        setLoading(true);
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetAllCards?", { headers });
            setCards(response.data);
        } catch (error) {
            console.error("Errore nel recupero delle carte:", error);
            toast.error("Errore nel recupero delle carte!");
            setError("Errore durante il recupero delle carte.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDecks = async (accessToken) => {
        setLoading(true);
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetAllDecks?", { headers });
            setDecks(response.data);
        } catch (error) {
            console.error("Errore nel recupero dei deck:", error);
            toast.error("Errore nel recupero dei deck!");
            setError("Errore durante il recupero dei deck.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFavorites = async (accessToken) => {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetFavorites?", { headers });
            setFavorites({
                cards: response.data.favoriteCards.map(c => c.CardId),
                decks: response.data.favoriteDecks.map(d => d.DeckId),
            });
        } catch (error) {
            console.error("Errore nel recupero dei preferiti:", error);
            toast.error("Errore nel recupero dei preferiti!");
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
    
            setFavorites((prevFavorites) => {
                if (type === "card") {
                    return {
                        ...prevFavorites,
                        cards: prevFavorites.cards.includes(itemId)
                            ? prevFavorites.cards.filter(id => id !== itemId)
                            : [...prevFavorites.cards, itemId]
                    };
                } else {
                    return {
                        ...prevFavorites,
                        decks: prevFavorites.decks.includes(itemId)
                            ? prevFavorites.decks.filter(id => id !== itemId)
                            : [...prevFavorites.decks, itemId]
                    };
                }
            });
        } catch (error) {
            console.error("Errore nella modifica dei preferiti:", error);
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
                toast.warn("Rimosso dal carrello 🛒❌");
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
                toast.success("Aggiunto al carrello! 🛒✅");
            }
    
            sessionStorage.setItem("cart", JSON.stringify(updatedCart));
            updateCartCount(updatedCart.length);
            return updatedCart;
        });
    };

    const filteredCards = cards.filter(card => 
      card.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      card.Description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    const filteredDecks = decks.filter(deck => 
      deck.Name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      deck.Description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        sessionStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    }, [cart, updateCartCount]);

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
                    fetchCards(response.accessToken);
                    fetchDecks(response.accessToken);
                    fetchFavorites(response.accessToken);
                })
                .catch((error) => {
                    instance.acquireTokenPopup({
                        scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"]
                    }).then(response => {
                        setToken(response.accessToken);
                        fetchCards(response.accessToken);
                        fetchDecks(response.accessToken);
                        fetchFavorites(response.accessToken);
                    }).catch(err => console.error("Errore nel login manuale:", err));
                });
        } else if (!tokenRequested) {
            setTokenRequested(true);
            fetchCards(null);
            fetchDecks(null);
        }
    }, [accounts, instance, tokenRequested]);

    return (
        <div className="homepage">
          <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
          <header className="header">
            <h2>Marketplace di Carte e Mazzi</h2>
            <button onClick={() => navigate("/create")} className="add-button">
              ➕ Aggiungi Carta/Deck
            </button>
          </header>
    
          <input
            type="text"
            placeholder="🔍 Cerca una carta o un mazzo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
    
          {loading ? (
            <p className="loading-text">Caricamento in corso...</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <>
              <h3 className="section-title">🃏 Carte disponibili</h3>
                <div className="card-list">
                    {filteredCards.length > 0 ? (
                        filteredCards.map((card) => (
                            <div key={card.CardId} className="card">
                                <img src={card.ImageUrl} alt={card.Name} className="card-image" />
                                <div className="card-content">
                                    <h3>{card.Name}</h3>
                                    <p>{card.Description}</p>
                                    <p className="price">💰 {card.Price} €</p>
                                    <p className="quantity">📦 Quantità: {card.Quantity}</p>
                                    <div className="card-buttons">
                                        <button onClick={() => navigate(`/card/${card.CardId}`)} className="details-button">
                                            🔍 Vedi dettagli
                                        </button>
                                        <button className="favorite-button" onClick={() => toggleFavorite(card.CardId, "card")}>
                                            {favorites.cards.includes(card.CardId) ? "❌ Rimuovi dai preferiti" : "⭐ Aggiungi ai preferiti"}
                                        </button>
                                        <button className="cart-button" onClick={() => toggleCart(card, "card")}>
                                            {cart.some(i => i.id === card.CardId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-text">Nessuna carta corrispondente alla ricerca.</p>
                    )}
                </div>
            </>
          )}
    
          {loading ? (
            <p className="loading-text">Caricamento in corso...</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : (
            <>
              <h3 className="section-title">🎴 Mazzi disponibili</h3>
              <div className="deck-list">
                  {filteredDecks.length > 0 ? (
                      filteredDecks.map((deck) => (
                          <div key={deck.DeckId} className="deck">
                              <img src={deck.ImageUrl} alt={deck.Name} className="deck-image" />
                              <div className="deck-content">
                                  <h3>{deck.Name}</h3>
                                  <p>{deck.Description}</p>
                                  <p className="price">💰 Prezzo Totale: {deck.TotalPrice} €</p>
                                  <p className="date">📅 Creato il: {new Date(deck.CreatedAt).toLocaleDateString()}</p>
                                  <div className="deck-buttons">
                                      <button onClick={() => navigate(`/deck/${deck.DeckId}`)} className="details-button">
                                          🔍 Vedi dettagli
                                      </button>
                                      <button className="favorite-button" onClick={() => toggleFavorite(deck.DeckId, "deck")}>
                                          {favorites.decks.includes(deck.DeckId) ? "❌ Rimuovi dai preferiti" : "⭐ Aggiungi ai preferiti"}
                                      </button>
                                      <button className="cart-button" onClick={() => toggleCart(deck, "deck")}>
                                          {cart.some(i => i.id === deck.DeckId) ? "❌ Rimuovi dal carrello" : "🛒 Aggiungi al carrello"}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))
                  ) : (
                      <p className="empty-text">Nessun mazzo corrispondente alla ricerca.</p>
                  )}
              </div>
            </>
          )}
        </div>
      );
};

export default HomePage;