// src/services/paymentService.js

/**
 * Handles the mock local demo payment flow.
 * 
 * @param {Object} paymentInfo - { ticketId, amount, bookingCode, userEmail, userName }
 * @param {Object} callbacks - { onStateChange, onSuccess, onCancel, onFail }
 */
export async function processPayment(paymentInfo, callbacks = {}) {
  const {
    onStateChange = () => {},
    onSuccess = () => {},
    onCancel = () => {},
    onFail = () => {},
  } = callbacks;

  try {
    // 1. Request backend order creation
    onStateChange("Creating demo payment order...");
    const createRes = await fetch("http://localhost:5000/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: paymentInfo.ticketId }),
    });
    const orderData = await createRes.json();

    if (!orderData.success) {
      throw new Error(orderData.message || "Failed to create secure payment order.");
    }

    onStateChange("Awaiting payment selection...");

    // 2. Render a simple DOM modal overlay for local demo payment choice
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";
    overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";

    const container = document.createElement("div");
    container.style.backgroundColor = "#ffffff";
    container.style.padding = "24px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.2)";
    container.style.maxWidth = "400px";
    container.style.width = "90%";
    container.style.textAlign = "center";
    container.style.color = "#333333";

    const title = document.createElement("h3");
    title.innerText = "Local Demo Payment Gateway";
    title.style.margin = "0 0 12px 0";
    title.style.fontSize = "18px";
    title.style.fontWeight = "600";
    container.appendChild(title);

    const description = document.createElement("p");
    description.innerText = `Booking Code: ${orderData.bookingCode}\nAmount Due: ₹${(orderData.amount / 100).toFixed(2)}`;
    description.style.margin = "0 0 16px 0";
    description.style.fontSize = "14px";
    description.style.lineHeight = "1.5";
    description.style.whiteSpace = "pre-line";
    container.appendChild(description);

    const warning = document.createElement("p");
    warning.innerText = "This is a local demo payment flow for testing. No real money will be charged.";
    warning.style.margin = "0 0 20px 0";
    warning.style.fontSize = "12px";
    warning.style.color = "#ef4444";
    warning.style.fontWeight = "500";
    container.appendChild(warning);

    // Button container
    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.flexDirection = "column";
    btnContainer.style.gap = "8px";

    // Helper to create buttons
    const createBtn = (text, bg, fg) => {
      const btn = document.createElement("button");
      btn.innerText = text;
      btn.style.width = "100%";
      btn.style.padding = "10px 16px";
      btn.style.border = "none";
      btn.style.borderRadius = "4px";
      btn.style.fontWeight = "600";
      btn.style.cursor = "pointer";
      btn.style.backgroundColor = bg;
      btn.style.color = fg;
      btn.style.transition = "opacity 0.2s";
      btn.onmouseover = () => { btn.style.opacity = "0.9"; };
      btn.onmouseout = () => { btn.style.opacity = "1"; };
      return btn;
    };

    // 1. Success Button
    const successBtn = createBtn("Pay Successfully", "#10b981", "#ffffff");
    successBtn.onclick = async () => {
      document.body.removeChild(overlay);
      try {
        onStateChange("Verifying payment...");
        const verifyRes = await fetch("http://localhost:5000/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: orderData.ticketId,
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substr(2, 9),
            razorpay_signature: "mock_sig_" + Math.random().toString(36).substr(2, 9),
          }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          onStateChange("Generating ticket...");
          setTimeout(() => {
            onStateChange("Ticket ready.");
            onSuccess(verifyData);
          }, 800);
        } else {
          throw new Error(verifyData.message || "Payment verification failed.");
        }
      } catch (err) {
        console.error("❌ Payment verification failed:", err);
        onFail(err.message || "Verification failed");
      }
    };

    // 2. Failure Button
    const failBtn = createBtn("Simulate Failure", "#ef4444", "#ffffff");
    failBtn.onclick = async () => {
      document.body.removeChild(overlay);
      try {
        onStateChange("Processing failure...");
        await fetch("http://localhost:5000/api/payment/fail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: orderData.ticketId }),
        });
      } catch (err) {
        console.warn("Failed to notify failure:", err);
      }
      onFail("Payment failed");
    };

    // 3. Cancel Button
    const cancelBtn = createBtn("Cancel Payment", "#6b7280", "#ffffff");
    cancelBtn.onclick = async () => {
      document.body.removeChild(overlay);
      try {
        onStateChange("Cancelling payment...");
        await fetch("http://localhost:5000/api/payment/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: orderData.ticketId }),
        });
      } catch (err) {
        console.warn("Failed to notify cancellation:", err);
      }
      onCancel();
    };

    btnContainer.appendChild(successBtn);
    btnContainer.appendChild(failBtn);
    btnContainer.appendChild(cancelBtn);
    container.appendChild(btnContainer);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

  } catch (error) {
    console.error("❌ Payment process error:", error);
    onFail(error.message || "Failed to start payment");
  }
}
