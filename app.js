const STORAGE_KEY = "tableAndThyme.v1";
const TABLE_COUNT = 8;
const menu = [
  { id: "m1", name: "Roasted tomato soup", price: 8.5 },
  { id: "m2", name: "Garden herb salad", price: 11 },
  { id: "m3", name: "Mushroom risotto", price: 18 },
  { id: "m4", name: "Grilled chicken plate", price: 21.5 },
  { id: "m5", name: "Seared salmon", price: 24 },
  { id: "m6", name: "Lemon olive cake", price: 9 }
];
const seedOrders = [
  { id: "1048", table: 3, guests: 2, items: [{ name: "Mushroom risotto", qty: 1, price: 18 }, { name: "Garden herb salad", qty: 1, price: 11 }], note: "Dressing on the side", status: "preparing", createdAt: Date.now() - 7 * 60000 },
  { id: "1047", table: 6, guests: 4, items: [{ name: "Seared salmon", qty: 2, price: 24 }, { name: "Lemon olive cake", qty: 1, price: 9 }], note: "", status: "ready", createdAt: Date.now() - 13 * 60000 },
  { id: "1046", table: 1, guests: 2, items: [{ name: "Grilled chicken plate", qty: 2, price: 21.5 }], note: "", status: "served", createdAt: Date.now() - 31 * 60000 },
  { id: "1045", table: 4, guests: 3, items: [{ name: "Roasted tomato soup", qty: 2, price: 8.5 }, { name: "Garden herb salad", qty: 1, price: 11 }], note: "", status: "preparing", createdAt: Date.now() - 19 * 60000 }
];
const $ = (selector) => document.querySelector(selector);
const orderList = $("#orderList");
const tableGrid = $("#tableGrid");
const modal = $("#orderModal");
const itemRows = $("#itemRows");
let activeFilter = "all";
let toastTimer;
let orders = loadOrders();

// Read saved tickets from this browser; use sample data on the first visit.
function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedOrders;
  } catch {
    return seedOrders;
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

// Escape user-entered notes before inserting them into the order board markup.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}
function timeAgo(timestamp) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}
function shortTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Rebuild the order list from current data and apply the selected filter/search.
function renderOrders() {
  const query = $("#orderSearch").value.trim().toLowerCase();
  const filtered = [...orders]
    .filter((order) => activeFilter === "all" || order.status === activeFilter)
    .filter((order) => !query || String(order.table).includes(query) || order.id.toLowerCase().includes(query))
    .sort((a, b) => b.createdAt - a.createdAt);
  $("#allCount").textContent = orders.length;
  $("#navOrderCount").textContent = orders.filter((order) => order.status !== "served").length;
  if (filtered.length === 0) {
    orderList.innerHTML = '<div class="empty-state">No orders match. Try another filter or start a new order.</div>';
    return;
  }
  orderList.innerHTML = filtered.map((order) => {
    const itemText = order.items.map((item) => `${item.qty} × ${escapeHTML(item.name)}`).join(", ");
    const note = order.note ? `<small>Note: ${escapeHTML(order.note)}</small>` : "";
    const action = order.status === "served"
      ? '<span class="status-pill status-served">Complete</span>'
      : `<button class="status-button" data-action="advance" data-id="${escapeHTML(order.id)}">${order.status === "preparing" ? "Mark ready →" : "Mark served →"}</button>`;
    return `<article class="order-card">
      <div class="order-main"><div class="order-badge">T${escapeHTML(order.table)}</div><div class="order-title"><strong>Order #${escapeHTML(order.id)}</strong><small>${order.guests} guests · Table ${escapeHTML(order.table)}</small></div></div>
      <div class="order-items">${itemText}${note}</div><div class="order-total">${money(orderTotal(order))}</div>
      <div class="order-time">${timeAgo(order.createdAt)}<br/>${shortTime(order.createdAt)}</div>
      <span class="status-pill status-${escapeHTML(order.status)}">${statusLabel(order.status)}</span><div class="order-actions">${action}</div>
    </article>`;
  }).join("");
}

// Calculate the dashboard totals and mark tables with unfinished orders as occupied.
function renderStats() {
  const active = orders.filter((order) => order.status !== "served");
  const served = orders.filter((order) => order.status === "served");
  const occupied = new Set(active.map((order) => order.table));
  const sales = served.reduce((sum, order) => sum + orderTotal(order), 0);
  $("#salesValue").textContent = money(sales);
  $("#openOrdersValue").textContent = active.length;
  $("#occupiedValue").textContent = occupied.size;
  $("#servedValue").textContent = served.length;
}
function renderTables() {
  const activeTables = new Set(orders.filter((order) => order.status !== "served").map((order) => Number(order.table)));
  tableGrid.innerHTML = Array.from({ length: TABLE_COUNT }, (_, index) => {
    const number = index + 1;
    const occupied = activeTables.has(number);
    return `<button class="table-tile ${occupied ? "occupied" : ""}" ${occupied ? "disabled" : `data-table="${number}"`} aria-label="Table ${number}, ${occupied ? "occupied" : "available"}">
      <span class="table-number">${String(number).padStart(2, "0")}</span><span class="table-state">${occupied ? "Occupied" : "Available"}</span></button>`;
  }).join("");
}
function render() {
  renderOrders();
  renderStats();
  renderTables();
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// Add a menu/quantity row and keep the displayed price total in sync.
function addItemRow() {
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `<select aria-label="Menu item" required>${menu.map((item) => `<option value="${item.id}">${escapeHTML(item.name)} · ${money(item.price)}</option>`).join("")}</select>
    <input type="number" aria-label="Quantity" min="1" max="20" value="1" required /><button type="button" class="remove-line" aria-label="Remove item">×</button>`;
  itemRows.append(row);
  row.addEventListener("change", updateOrderTotal);
  row.addEventListener("input", updateOrderTotal);
  row.querySelector(".remove-line").addEventListener("click", () => {
    if (itemRows.children.length > 1) row.remove();
    updateOrderTotal();
  });
  updateOrderTotal();
}
function updateOrderTotal() {
  let total = 0;
  itemRows.querySelectorAll(".item-row").forEach((row) => {
    const selected = menu.find((item) => item.id === row.querySelector("select").value);
    const quantity = Number(row.querySelector("input").value) || 0;
    if (selected) total += selected.price * quantity;
  });
  $("#orderTotal").textContent = money(total);
}

// When an order is opened, only show tables that do not currently have an active ticket.
function openModal(tableNumber = "") {
  const tableSelect = $("#tableSelect");
  const occupied = new Set(orders.filter((order) => order.status !== "served").map((order) => Number(order.table)));
  tableSelect.innerHTML = Array.from({ length: TABLE_COUNT }, (_, index) => index + 1)
    .map((number) => `<option value="${number}" ${occupied.has(number) ? "disabled" : ""} ${Number(tableNumber) === number ? "selected" : ""}>Table ${number}${occupied.has(number) ? " · occupied" : ""}</option>`).join("");
  itemRows.innerHTML = "";
  addItemRow();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  tableSelect.focus();
}
function closeModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  $("#newOrderButton").focus();
}

$("#todayLabel").textContent = new Intl.DateTimeFormat([], { weekday: "short", month: "short", day: "numeric" }).format(new Date());
$("#addItemButton").addEventListener("click", addItemRow);
$("#newOrderButton").addEventListener("click", () => openModal());
$("#closeModalButton").addEventListener("click", closeModal);
$("#cancelModalButton").addEventListener("click", closeModal);
$("#refreshButton").addEventListener("click", () => { render(); showToast("Order board is up to date."); });
$("#orderSearch").addEventListener("input", renderOrders);

document.querySelector(".filter-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.toggle("selected", tab === button));
  renderOrders();
});

// Event delegation keeps status buttons working as cards are re-rendered.
orderList.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="advance"]');
  if (!button) return;
  const order = orders.find((entry) => entry.id === button.dataset.id);
  if (!order) return;
  order.status = order.status === "preparing" ? "ready" : "served";
  saveOrders();
  render();
  showToast(`Order #${order.id} marked ${order.status}.`);
});
tableGrid.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-table]");
  if (tile) openModal(tile.dataset.table);
});

// Validate the ticket form, create a new order, persist it, then refresh the dashboard.
$("#orderForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const items = [];
  itemRows.querySelectorAll(".item-row").forEach((row) => {
    const menuItem = menu.find((item) => item.id === row.querySelector("select").value);
    const qty = Number(row.querySelector("input").value);
    if (menuItem && qty > 0) items.push({ name: menuItem.name, price: menuItem.price, qty });
  });
  if (items.length === 0) return;
  const id = String(Math.max(1000, ...orders.map((order) => Number(order.id) || 0)) + 1);
  orders.unshift({ id, table: Number(form.get("table")), guests: Number(form.get("guests")), items, note: String(form.get("note") || "").trim(), status: "preparing", createdAt: Date.now() });
  saveOrders();
  closeModal();
  event.currentTarget.reset();
  render();
  showToast(`Order #${id} sent to the kitchen.`);
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});
render();
