import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/UserProfile.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UserProfile = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [cards, setCards] = useState([]);
    const [decks, setDecks] = useState([]);
    const [userCards, setUserCards] = useState([]);
    const [token, setToken] = useState("");
    const [editItem, setEditItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deckCardsLoaded, setDeckCardsLoaded] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");

    const fetchUserProfile = async (accessToken) => {
        try {
            const headers = { Authorization: `Bearer ${accessToken}` };
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetUserProfile?", { headers });

            setUser(response.data.user);
            setCards(response.data.cards);
            setDecks(response.data.decks);
            setUserCards(response.data.cards);
        } catch (error) {
            toast.error("Errore nel recupero del profilo utente.")
            console.error("Errore nel recupero del profilo utente:", error);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setDeckCardsLoaded(false);
    };

    const fetchDeckCards = async (deckId) => {
        try {
            const response = await axios.get(`https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetDeckCards?=${deckId}`);
            return response.data || [];
        } catch (error) {
            console.error("Errore nel recupero delle carte del mazzo:", error);
            return [];
        }
    };

    const handleRemove = async (itemId, type) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo elemento?")) return;

        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/DeleteItem?", 
                type === "card" ? { cardId: itemId } : { deckId: itemId }, 
                { headers });

            toast.success(`${type === "card" ? "Carta" : "Mazzo"} eliminato con successo!`);
            fetchUserProfile(token);
        } catch (error) {
            toast.error(`Errore nella rimozione: ${error.response?.data?.error || "Errore sconosciuto"}`);
            alert(`Errore nella rimozione: ${error.response?.data?.error || "Errore sconosciuto"}`);
        }
    };

    const handleEdit = async (item, type) => {
        if (!item) return;
    
        if (type === "deck") {
            setDeckCardsLoaded(false);
    
            try {
                const deckCards = await fetchDeckCards(item.DeckId);
                const allCards = userCards.map(card => {
                    const existingCard = deckCards.find(c => c.CardId === card.CardId);
                    return {
                        cardId: card.CardId,
                        name: card.Name,
                        quantity: existingCard ? existingCard.Quantity : 0,
                        maxQuantity: card.Quantity
                    };
                });
    
                setEditItem({ ...item, type, selectedCards: allCards });
                setDeckCardsLoaded(true);
            } catch (error) {
                toast.error("Errore nel recupero delle carte del mazzo.")
                console.error("Errore nel recupero delle carte del mazzo:", error);
            }
        } else {
            setEditItem({ ...item, type });
        }
    
        setIsModalOpen(true);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setEditItem(prev => ({ ...prev, image: reader.result.split(",")[1] }));
            };
        }
    };

    const handleUpdate = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const updateEndpoint = editItem.type === "card" ? "UpdateCard" : "UpdateDeck";

            const payload = editItem.type === "card" 
                ? { 
                    cardId: editItem.CardId, 
                    name: editItem.Name, 
                    description: editItem.Description, 
                    price: editItem.Price, 
                    quantity: editItem.Quantity, 
                    image: editItem.image || null 
                }
                : { 
                    deckId: editItem.DeckId, 
                    name: editItem.Name, 
                    description: editItem.Description, 
                    image: editItem.image || null,
                    cards: editItem.selectedCards 
                };

            await axios.post(`https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/${updateEndpoint}`, payload, { headers });

            toast.success(`${editItem.type === "card" ? "Carta" : "Mazzo"} aggiornato con successo!`);
            fetchUserProfile(token);
            closeModal();
        } catch (error) {
            toast.error(`Errore nell'aggiornamento: ${error.response?.data?.error || "Errore sconosciuto"}`);
        }
    };

    const handleUsernameUpdate = async () => {
        if (!newUsername.trim()) {
            toast.info("L'username non può essere vuoto!");
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/UpdateUserProfile?", {
                userId: user.UserId,
                username: newUsername
            }, { headers });

            toast.success("Username aggiornato con successo!");
            setIsEditingUsername(false);
            fetchUserProfile(token);
        } catch (error) {
            toast.error(`Errore nell'aggiornamento dell'username: ${error.response?.data?.error || "Errore sconosciuto"}`);
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
                    setToken(response.accessToken);
                    fetchUserProfile(response.accessToken);
                })
                .catch(error => console.error("Errore nel login:", error));
        }
    }, [accounts, instance]);

    useEffect(() => {
        if (isModalOpen && editItem?.type === "deck") {
            setDeckCardsLoaded(false);
            
            fetchDeckCards(editItem.DeckId).then(deckCards => {
                const allCards = userCards.map(card => {
                    const existingCard = deckCards.find(c => c.CardId === card.CardId);
                    return {
                        cardId: card.CardId,
                        name: card.Name,
                        quantity: existingCard ? existingCard.Quantity : 0,
                        maxQuantity: card.Quantity
                    };
                });
    
                setEditItem(prev => ({
                    ...prev,
                    selectedCards: allCards
                }));
    
                setDeckCardsLoaded(true);
            });
        }
    }, [isModalOpen, editItem?.DeckId, editItem?.type, userCards]);

    useEffect(() => {
        if (deckCardsLoaded) {
            console.log("Le carte del mazzo sono state caricate correttamente.");
        }
    }, [deckCardsLoaded]);

    return (
        <div className="profile-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            {loading ? (
            <p>Caricamento in corso...</p>
        ) : (
        <>
            <h2 className="profile-title">👤 Profilo Utente</h2>
            
            {user && (
                <div className="user-info">
                    <p><strong>📛 Nome:</strong> {user.Name}</p>
                    <p><strong>📧 Email:</strong> {user.Email}</p>
                    <p><strong>📅 Data Creazione:</strong> {new Date(user.CreatedAt).toLocaleDateString()}</p>
    
                    {isEditingUsername ? (
                        <div className="username-edit">
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="✏️ Nuovo Username"
                            />
                            <button onClick={handleUsernameUpdate}>💾 Salva</button>
                            <button onClick={() => setIsEditingUsername(false)}>❌ Annulla</button>
                        </div>
                    ) : (
                        <p>
                            <strong>🔖 Username:</strong> {user.Username || "Non impostato"}
                            <button onClick={() => setIsEditingUsername(true)}>✏️ Modifica</button>
                        </p>
                    )}
    
                    <button className="transactions-button" onClick={() => navigate("/transactions")}>
                        📜 Le tue transazioni
                    </button>
                </div>
            )}

            <h3 className="section-title">🎴 Le Tue Carte</h3>
            {cards.length === 0 ? (
                <p className="no-cards-message">Nessuna carta disponibile</p>
            ) : (
                <div className="card-list">
                    {cards.map(card => (
                        <div key={card.CardId} className="card">
                            <h4>{card.Name}</h4>
                            <p>{card.Description}</p>
                            <p>💰 Prezzo: {card.Price} €</p>
                            <p>📦 Quantità: {card.Quantity}</p>
                            <img src={card.ImageUrl} alt={card.Name} className="card-img" />
                            <button className="edit-button" onClick={() => handleEdit(card, "card")}>✏️ Modifica</button>
                            <button className="delete-button" onClick={() => handleRemove(card.CardId, "card")}>🗑️ Rimuovi</button>
                        </div>
                    ))}
                </div>
            )}

            <h3 className="section-title">🃏 I Tuoi Mazzi</h3>
            {decks.length === 0 ? (
                <p className="no-cards-message">Nessun deck disponibile</p>
            ) : (
            <div className="deck-list">
                {decks.map(deck => (
                    <div key={deck.DeckId} className="deck">
                        <h4>{deck.Name}</h4>
                        <p>{deck.Description}</p>
                        <p>💰 Prezzo Totale: {deck.TotalPrice} €</p>
                        <img src={deck.ImageUrl} alt={deck.Name} className="deck-img" />
                        <button className="edit-button" onClick={() => handleEdit(deck, "deck")}>✏️ Modifica</button>
                        <button className="delete-button" onClick={() => handleRemove(deck.DeckId, "deck")}>🗑️ Rimuovi</button>
                    </div>
                ))}
            </div>
            )}
    
            {isModalOpen && editItem && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>✏️ Modifica {editItem.type === "card" ? "Carta" : "Mazzo"}</h3>
    
                        <label>📛 Nome:</label>
                        <input 
                            type="text" 
                            value={editItem.Name || ""} 
                            onChange={(e) => setEditItem({ ...editItem, Name: e.target.value })} 
                        />
    
                        <label>📝 Descrizione:</label>
                        <textarea 
                            value={editItem.Description || ""} 
                            onChange={(e) => setEditItem({ ...editItem, Description: e.target.value })} 
                        />
    
                        <label>🖼️ Immagine:</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} />
                        {editItem.image && <img src={editItem.image} alt="Anteprima" className="preview-img" />}
    
                        {editItem.type === "card" && (
                            <>
                                <label>💰 Prezzo:</label>
                                <input 
                                    type="number" 
                                    value={editItem.Price || ""} 
                                    onChange={(e) => setEditItem({ ...editItem, Price: e.target.value })} 
                                />
    
                                <label>📦 Quantità:</label>
                                <input 
                                    type="number" 
                                    value={editItem.Quantity || ""} 
                                    onChange={(e) => setEditItem({ ...editItem, Quantity: e.target.value })} 
                                />
                            </>
                        )}

                        {editItem.type === "deck" && deckCardsLoaded && (
                            <>
                                <h3 className="deck-selection-title">Seleziona le carte per il mazzo</h3>
                                <div className="card-selection">
                                    {userCards.length > 0 ? (
                                        userCards.map((card) => {
                                            const isSelected = editItem.selectedCards.some((c) => c.cardId === card.CardId);
                                            const selectedCard = editItem.selectedCards.find((c) => c.cardId === card.CardId);

                                            return (
                                                <div key={card.CardId} className="card-item">
                                                    <img src={card.ImageUrl} alt={card.Name} className="card-preview" />
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            onChange={() => {
                                                                setEditItem((prev) => {
                                                                    const updatedCards = isSelected
                                                                        ? prev.selectedCards.filter((c) => c.cardId !== card.CardId)
                                                                        : [...prev.selectedCards, { cardId: card.CardId, quantity: 1, maxQuantity: card.Quantity }];
                                                                    return { ...prev, selectedCards: updatedCards };
                                                                });
                                                            }}
                                                            checked={isSelected}
                                                        />
                                                        {card.Name} - {card.Description} ({card.Price}€)
                                                    </label>

                                                    {isSelected && (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={card.Quantity}
                                                            value={selectedCard?.quantity || 1}
                                                            onChange={(e) => {
                                                                setEditItem((prev) => {
                                                                    const updatedCards = prev.selectedCards.map((c) =>
                                                                        c.cardId === card.CardId
                                                                            ? { ...c, quantity: Math.min(parseInt(e.target.value, 10), c.maxQuantity) }
                                                                            : c
                                                                    );
                                                                    return { ...prev, selectedCards: updatedCards };
                                                                });
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="no-cards-message">⚠ Non hai carte disponibili.</p>
                                    )}
                                </div>
                            </>
                        )}
    
                        <button onClick={handleUpdate} className="save-button">💾 Salva Modifiche</button>
                        <button onClick={() => closeModal()} className="close-button">❌ Chiudi</button>
                    </div>
                </div>
            )}
            </>
        )}
        </div>
    );
};

export default UserProfile;