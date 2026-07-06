const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

let orders = [];

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOrder(input = {}) {
  const data = input.data || input;

  const customer = data.customer || {};
  const amounts = data.amounts || {};
  const status = data.status || {};
  const dateObject = data.date || {};

  const sales = toNumber(input.sales ?? amounts.total?.amount ?? data.total);
  const shipping = toNumber(input.shipping ?? amounts.shipping_cost?.amount);
  const subtotal = toNumber(input.subtotal ?? amounts.sub_total?.amount);

  const productCost = toNumber(input.product_cost);
  const packaging = toNumber(input.packaging);
  const paymentFees = toNumber(input.payment_fees);
  const discount = toNumber(input.discount);
  const tax = toNumber(input.tax);

  const netProfit =
    sales + shipping - discount - tax - productCost - packaging - paymentFees;

  const margin = sales ? (netProfit / sales) * 100 : 0;

  return {
    id: String(input.id || data.id || Date.now()),
    order_id: String(
      input.order_id || data.id || data.reference_id || `SALLA-${Date.now()}`
    ),
    reference_id: String(input.reference_id || data.reference_id || ""),
    order_date: String(
      input.date || input.order_date || dateObject.date || new Date().toISOString()
    ).slice(0, 10),

    customer: input.customer_name || customer.full_name || customer.name || "",
    phone: input.phone || customer.mobile || "",
    city: input.city || customer.city || "",

    status: input.status || status.slug || status.name || "",
    payment_method: input.payment_method || data.payment_method || "",

    sales,
    shipping,
    subtotal,
    product_cost: productCost,
    packaging,
    payment_fees: paymentFees,
    discount,
    tax,

    net_profit: netProfit,
    margin,
    raw: input,
    synced_at: new Date().toISOString()
  };
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "MARWAN PRO API",
    message: "API is running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString()
  });
});

app.post("/sync/order", (req, res) => {
  console.log("SALLA WEBHOOK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  const order = normalizeOrder(req.body);

  const index = orders.findIndex((item) => item.order_id === order.order_id);

  if (index >= 0) {
    orders[index] = { ...orders[index], ...order };
  } else {
    orders.unshift(order);
  }

  orders = orders.slice(0, 5000);

  res.json({
    ok: true,
    message: "Order received",
    order_id: order.order_id,
    customer: order.customer,
    city: order.city,
    sales: order.sales,
    net_profit: order.net_profit
  });
});

app.get("/orders", (req, res) => {
  res.json({
    ok: true,
    count: orders.length,
    orders
  });
});

app.listen(PORT, () => {
  console.log(`MARWAN PRO API running on port ${PORT}`);
});
