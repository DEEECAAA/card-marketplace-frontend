import React, { useState, useEffect } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import "../styles/CreatePage.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CreatePage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [token, setToken] = useState("");
    const [formType, setFormType] = useState("card"); 
    const [userCards, setUserCards] = useState([]);
    const [loading, setLoading] = useState(false);

    const [cardData, setCardData] = useState({
        name: "",
        description: "",
        price: "",
        quantity: "",
        image: null,
    });

    const [deckData, setDeckData] = useState({
        deckName: "",
        deckDescription: "",
        deckImage: null,
        selectedCards: [],
    });

    const fetchUserCards = async (accessToken) => {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
            const response = await axios.get("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetUserCards?", { headers });
            setUserCards(response.data || []);
        } catch (error) {
            toast.error("Errore nel recupero delle carte dell'utente:", error);
            console.error("Errore nel recupero delle carte dell'utente:", error);
        }
    };

    const handleImageUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                if (type === "card") {
                    setCardData((prevData) => ({ ...prevData, image: reader.result.split(",")[1] }));
                } else if (type === "deck") {
                    setDeckData((prevData) => ({ ...prevData, deckImage: reader.result.split(",")[1] }));
                }
            };
        }
    };

    const handleCardSelection = (cardId, maxQuantity) => {
        setDeckData((prevData) => {
            const isAlreadySelected = prevData.selectedCards.some(card => card.cardId === cardId);
    
            const updatedCards = isAlreadySelected
                ? prevData.selectedCards.filter(card => card.cardId !== cardId)
                : [...prevData.selectedCards, { cardId, quantity: 1, maxQuantity }];
    
            return { ...prevData, selectedCards: updatedCards };
        });
    };

    const updateCardQuantity = (cardId, quantity, maxQuantity) => {
        setDeckData((prevData) => {
            const updatedCards = prevData.selectedCards.map(card =>
                card.cardId === cardId 
                    ? { ...card, quantity: Math.min(quantity, maxQuantity) } 
                    : card
            );
            return { ...prevData, selectedCards: updatedCards };
        });
    };

    const handleSubmitCard = async (e) => {
        e.preventDefault();
    
        if (!cardData.name || !cardData.price || !cardData.quantity) {
            toast.warn("Compila tutti i campi richiesti prima di continuare.");
            return;
        }
    
        const cardPayload = { 
            name: cardData.name,
            description: cardData.description || "",
            price: cardData.price,
            quantity: cardData.quantity,
        };
    
        if (cardData.image) {
            cardPayload.image = cardData.image;
        }
    
        try {
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/AddCard?", cardPayload, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
    
            toast.success("🎉 Carta creata con successo!");
            navigate("/");
        } catch (error) {
            toast.error(`❌ Errore nella creazione: ${error.response?.data?.error || "Errore sconosciuto"}`);
        }
    };

    const handleSubmitDeck = async (e) => {
        e.preventDefault();
        setLoading(true);
    
        if (!deckData.deckName || deckData.selectedCards.length === 0) {
            toast.warn("⚠️ Inserisci il nome del mazzo e seleziona almeno una carta.");
            setLoading(false);
            return;
        }
    
        const deckPayload = {
            name: deckData.deckName,
            description: deckData.deckDescription || "",
            cards: deckData.selectedCards.map(card => ({
                cardId: card.cardId,
                quantity: card.quantity
            }))
        };
    
        if (deckData.deckImage) {
            deckPayload.imageUrl = deckData.deckImage;
        }
    
        try {
            await axios.post("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/CreateDeck?", deckPayload, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            toast.success("🎉 Mazzo creato con successo!");
            navigate("/");
        } catch (error) {
            toast.error(`❌ Errore nella creazione: ${error.response?.data?.error || "Errore sconosciuto"}`);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        if (accounts.length > 0) {
            instance
                .acquireTokenSilent({
                    scopes: ["api://661de9a1-571c-40a6-bb6b-6ecd545baad4/access_as_user"],
                    account: accounts[0],
                })
                .then((response) => {
                    setToken(response.accessToken);
                    fetchUserCards(response.accessToken);
                })
                .catch((error) => console.error("Errore nel recupero del token:", error));
        }
    }, [accounts, instance]);

    if (loading) {
        return <p>Caricamento in corso...</p>;
    }

    return (
        <div className="create-page">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
            <h2 className="page-title">{formType === "card" ? "🃏 Crea una nuova Carta" : "📦 Crea un nuovo Mazzo"}</h2>
    
            <div className="form-toggle">
                <button onClick={() => setFormType("card")} className={formType === "card" ? "active" : ""}>
                    🃏 Crea Carta
                </button>
                <button onClick={() => setFormType("deck")} className={formType === "deck" ? "active" : ""}>
                    📦 Crea Mazzo
                </button>
            </div>
    
            {formType === "card" ? (
                <form onSubmit={handleSubmitCard} className="form-container">
                    <input 
                        type="text" 
                        name="name" 
                        placeholder="Nome della carta" 
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })} 
                        required 
                    />
                    <textarea 
                        name="description" 
                        placeholder="Descrizione" 
                        onChange={(e) => setCardData({ ...cardData, description: e.target.value })} 
                    />
                    <input 
                        type="text" 
                        name="price" 
                        placeholder="Prezzo (€)" 
                        onChange={(e) => {
                            let value = e.target.value.replace(",", ".");
                            if (!isNaN(value) && value !== "") {
                                setCardData({ ...cardData, price: parseFloat(value) });
                            }
                        }} 
                        required 
                    />
                    <input 
                        type="number" 
                        name="quantity" 
                        placeholder="Quantità" 
                        onChange={(e) => setCardData({ ...cardData, quantity: e.target.value })} 
                        required 
                    />
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, "card")} 
                    />
                    <button type="submit" className="submit-button">➕ Crea Carta</button>
                </form>
            ) : (
                <form onSubmit={handleSubmitDeck} className="form-container">
                    <input 
                        type="text" 
                        name="deckName" 
                        placeholder="Nome del mazzo" 
                        onChange={(e) => setDeckData({ ...deckData, deckName: e.target.value })} 
                        required 
                    />
                    <textarea 
                        name="deckDescription" 
                        placeholder="Descrizione" 
                        onChange={(e) => setDeckData({ ...deckData, deckDescription: e.target.value })} 
                    />
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, "deck")} 
                    />
    
                    <h3 className="deck-selection-title">Seleziona le carte per il mazzo</h3>
                    <div className="card-selection">
                        {userCards.length > 0 ? userCards.map((card) => (
                            <div key={card.CardId} className="card-item">
                                <img src={card.ImageUrl} alt={card.Name} className="card-preview" />
                                <label>
                                    <input 
                                        type="checkbox" 
                                        onChange={() => handleCardSelection(card.CardId, card.Quantity)} 
                                        checked={deckData.selectedCards.some(c => c.cardId === card.CardId)} 
                                    />
                                    {card.Name} - {card.Description} ({card.Price}€)
                                </label>
                                {deckData.selectedCards.some(c => c.cardId === card.CardId) && (
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={card.Quantity} 
                                        value={deckData.selectedCards.find(c => c.cardId === card.CardId)?.quantity || 1} 
                                        onChange={(e) => updateCardQuantity(card.CardId, parseInt(e.target.value), card.Quantity)} 
                                    />
                                )}
                            </div>
                        )) : <p className="no-cards-message">⚠ Non hai carte disponibili.</p>}
                    </div>
                    <button type="submit" className="submit-button">➕ Crea Mazzo</button>
                </form>
            )}
        </div>
    );
};

export default CreatePage;