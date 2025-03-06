import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "../styles/CartPage.css";
import "react-toastify/dist/ReactToastify.css";

const CartPage = ({ updateCartCount }) => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(JSON.parse(sessionStorage.getItem("cart")) || []);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const isFetching = useRef(false); // Stato persistente tra i render

    // 🔹 Aggiorna la quantità nel carrello
    const updateQuantity = (itemId, newQuantity, maxQuantity) => {
        if (isNaN(newQuantity) || newQuantity <= 0) {
            removeFromCart(itemId);
        } else if (newQuantity > maxQuantity) {
            toast.error(`Quantità massima disponibile: ${maxQuantity}`);
            setCart(prevCart =>
                prevCart.map(item =>
                    item.id === itemId ? { ...item, quantity: maxQuantity } : item
                )
            );
        } else {
            setCart(prevCart => {
                const updatedCart = prevCart.map(item =>
                    item.id === itemId ? { ...item, quantity: newQuantity } : item
                );
                sessionStorage.setItem("cart", JSON.stringify(updatedCart));
                updateCartCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
                return updatedCart;
            });
            toast.success("Quantità aggiornata con successo!");
        }
    };

    // 🔹 Rimuove un prodotto dal carrello
    const removeFromCart = (itemId) => {
        const updatedCart = cart.filter(item => item.id !== itemId);
        setCart(updatedCart);
        sessionStorage.setItem("cart", JSON.stringify(updatedCart));
        updateCartCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
        toast.info("Prodotto rimosso dal carrello.");
    };

    // 🔹 Gestisce il checkout e la transazione
    const handleCheckout = async () => {
        let token = sessionStorage.getItem("token") || localStorage.getItem("token");

        if (!token || token === "null") {
            toast.error("Errore: Utente non autenticato. Effettua il login.");
            navigate("/login");
            return;
        }

        const transactionData = {
            items: cart.map(item => ({
                cardId: item.cardId || null,
                deckId: item.deckId || null,
                quantity: item.quantity,
                price: item.price
            })),
            totalAmount: totalPrice
        };

        try {
            const response = await fetch("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/AddTransaction?", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(transactionData)
            });

            if (response.ok) {
                toast.success("Transazione completata con successo!");
                sessionStorage.removeItem("cart");
                updateCartCount(0);
                setTimeout(() => navigate("/"), 1000);
            } else {
                const errorData = await response.json();
                toast.error(`Errore durante la transazione: ${errorData.error}`);
            }
        } catch (error) {
            toast.error(`Errore di connessione: ${error.message}`);
        }
    };

    // 🔹 Recupera le quantità disponibili delle carte
    useEffect(() => {
        const fetchCardQuantities = async () => {
            if (cart.length === 0 || isFetching.current) return;

            const cardIds = cart.map(item => item.cardId).filter(id => id != null && !isNaN(id));
            if (cardIds.length === 0) return;

            isFetching.current = true; // Evita richieste multiple simultanee
            setLoading(true);

            try {
                console.log("📌 Richiesta quantità per:", cardIds);

                const response = await fetch("https://cardmarketplacefunctions-gugkggfyftd8ffeg.northeurope-01.azurewebsites.net/api/GetCardQuantity?", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cardIds }),
                });

                console.log("📌 Risposta ricevuta:", response);

                if (response.ok) {
                    const data = await response.json();
                    console.log("✅ Quantità ricevute:", data);

                    setCart((prevCart) =>
                        prevCart.map(item =>
                            item.cardId ? { ...item, maxQuantity: data[item.cardId] || 0 } : item
                        )
                    );
                } else {
                    const errorData = await response.json();
                    console.error("❌ Errore nel recupero delle quantità:", errorData.error);
                }
            } catch (error) {
                console.error("❌ Errore di connessione:", error);
            } finally {
                isFetching.current = false; // Permette nuove richieste
                setLoading(false);
            }
        };

        fetchCardQuantities();

        // Cleanup per evitare memory leaks
        return () => {
            isFetching.current = false;
        };
    }, [cart]);

    // 🔹 Calcola il prezzo totale
    useEffect(() => {
        const calculateTotal = () => {
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            setTotalPrice(total.toFixed(2));
        };
        calculateTotal();
    }, [cart]);

    // 🔹 Recupera il carrello dal sessionStorage
    useEffect(() => {
        const savedCart = JSON.parse(sessionStorage.getItem("cart")) || [];
        setCart(savedCart);
    }, [updateCartCount, cart]);

return (
    <div className="cart-container">
        <ToastContainer position="top-right" autoClose={3000} />

        <h2 className="cart-title">🛒 Il tuo carrello</h2>

        {loading ? (
            <p className="loading-message">⏳ Caricamento delle disponibilità...</p>
        ) : cart.length > 0 ? (
            <div className="cart-list">
                {cart.map((item) => (
                    <div key={item.id} className="cart-item">
                        {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="cart-item-img" />}
                        <div className="cart-item-info">
                            <h3 className="cart-item-name">{item.name}</h3>
                            <p className="cart-item-price">
                                💰 Prezzo: <strong>{item.price} €</strong>
                            </p>
                            <p className="cart-item-availability">
                                📦 Disponibilità: <strong>{item.cardId ? item.maxQuantity : "Pezzo unico"}</strong>
                            </p>

                            {item.cardId ? (
                                <div className="quantity-container">
                                    <input
                                        type="number"
                                        min="1"
                                        max={item.maxQuantity}
                                        value={item.quantity}
                                        className="cart-quantity"
                                        onChange={(e) =>
                                            updateQuantity(item.id, parseInt(e.target.value), item.maxQuantity)
                                        }
                                    />
                                    <span className="max-quantity">/ {item.maxQuantity}</span>
                                </div>
                            ) : (
                                <p className="deck-info">🔹 Mazzo intero</p>
                            )}

                            <button className="cart-remove" onClick={() => removeFromCart(item.id)}>
                                ❌ Rimuovi
                            </button>
                        </div>
                    </div>
                ))}

                <div className="cart-summary">
                    <h3 className="total-price">
                        💰 Totale: <span>{totalPrice} €</span>
                    </h3>
                    <button onClick={handleCheckout} className="checkout-button">
                        🛒 Procedi al pagamento
                    </button>
                </div>
            </div>
        ) : (
            <p className="empty-cart">🛍️ Il carrello è vuoto.</p>
        )}
    </div>
);
};
export default CartPage;