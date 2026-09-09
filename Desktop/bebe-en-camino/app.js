const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593999999999"; // Reemplaza por tu número real de WhatsApp

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let carrito = [];
let currentSlide = 0;
let selectedCategory = 'todos';

document.addEventListener("DOMContentLoaded", () => {
  fetchProductos();
  fetchBlogArticles();
  initSlider();
});

// ------------------- SLIDER AUTOMÁTICO -------------------
function initSlider() {
  setInterval(() => {
    currentSlide = (currentSlide + 1) % 3;
    updateSliderUI();
  }, 4000); // Transición cada 4 segundos
}

function setSlide(index) {
  currentSlide = index;
  updateSliderUI();
}

function updateSliderUI() {
  const track = document.getElementById("slider-track");
  const dots = document.querySelectorAll(".dot");
  
  if (track) {
    track.style.transform = `translateX(-${currentSlide * (100 / 3)}%)`;
  }
  
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });
}

// ------------------- CARGA Y FILTRADO DE PRODUCTOS -------------------
async function fetchProductos() {
  const container = document.getElementById("products-container");
  if (!container) return;

  const { data: productos, error } = await supabaseClient
    .from("productos")
    .select("*");

  if (error) {
    console.error("Error al cargar productos:", error.message);
    container.innerHTML = "<p>Error al cargar los productos.</p>";
    return;
  }

  todosLosProductos = productos || [];
  renderProducts(todosLosProductos);
}

function renderProducts(productos) {
  const container = document.getElementById("products-container");
  if (!container) return;

  if (productos.length === 0) {
    container.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  container.innerHTML = "";
  productos.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.imagen_url}" alt="${p.nombre}">
      <div>
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
      </div>
      <div>
        <p class="price">$${parseFloat(p.precio).toFixed(2)}</p>
        <button onclick="addToCart(${p.id}, '${p.nombre}', ${p.precio})">Agregar al Carrito</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterProducts() {
  const searchTerm = document.getElementById("search-bar").value.toLowerCase();

  const productosFiltrados = todosLosProductos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(searchTerm) || 
                             p.descripcion.toLowerCase().includes(searchTerm);
    const coincideCategoria = selectedCategory === 'todos' || 
                              (p.categoria && p.categoria.toLowerCase() === selectedCategory);
    
    return coincideBusqueda && coincideCategoria;
  });

  renderProducts(productosFiltrados);
}

function filterByCategory(categoria, buttonEl) {
  selectedCategory = categoria;
  
  document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
  if (buttonEl) buttonEl.classList.add("active");

  filterProducts();
}

// ------------------- BLOG & CARRITO -------------------
async function fetchBlogArticles() {
  const container = document.querySelector(".blog-posts");
  if (!container) return;

  try {
    const { data: articulos, error } = await supabaseClient
      .from("blog")
      .select("*")
      .order("id", { ascending: false });

    if (error || !articulos || articulos.length === 0) return;

    container.innerHTML = "";
    articulos.forEach((art) => {
      const card = document.createElement("article");
      card.className = "blog-card";
      card.innerHTML = `
        <span class="blog-tag">${art.categoria}</span>
        <h4>${art.titulo}</h4>
        <p>${art.resumen}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error al cargar blog:", err);
  }
}

function addToCart(id, nombre, precio) {
  const itemExistente = carrito.find((item) => item.id === id);
  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    carrito.push({ id, nombre, precio, cantidad: 1 });
  }
  updateCartUI();
}

function updateCartUI() {
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");
  const itemsContainer = document.getElementById("cart-items");

  const totalCount = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const totalPrecio = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  if (countEl) countEl.textContent = totalCount;
  if (totalEl) totalEl.textContent = totalPrecio.toFixed(2);

  if (!itemsContainer) return;

  if (carrito.length === 0) {
    itemsContainer.innerHTML = "<p>El carrito está vacío.</p>";
    return;
  }

  itemsContainer.innerHTML = "";
  carrito.forEach((item) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.marginBottom = "0.5rem";
    div.innerHTML = `
      <span>${item.nombre} (x${item.cantidad})</span>
      <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
    `;
    itemsContainer.appendChild(div);
  });
}

function toggleCart() {
  document.getElementById("cart-modal").classList.toggle("hidden");
}

async function checkout() {
  if (carrito.length === 0) return alert("El carrito está vacío.");

  const nombre = document.getElementById("cli-nombre").value.trim();
  const telefono = document.getElementById("cli-telefono").value.trim();
  const email = document.getElementById("cli-email").value.trim();

  if (!nombre || !telefono) {
    return alert("Por favor, completa tu Nombre y Teléfono.");
  }

  try {
    await supabaseClient.from("clientes").insert([{ nombre, telefono, email }]);
  } catch (err) {
    console.error("Error al guardar cliente:", err);
  }

  let mensaje = "¡Hola *Bebé en camino*! 👶🛒\n";
  mensaje += "Tengo un nuevo pedido:\n\n";
  mensaje += `👤 *Cliente:* ${nombre}\n`;
  mensaje += `📞 *Contacto:* ${telefono}\n`;
  if (email) mensaje += `✉️ *Correo:* ${email}\n`;
  mensaje += "\n*Detalle del pedido:*\n";

  let total = 0;
  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    mensaje += `${index + 1}. *${item.nombre}* (x${item.cantidad}) - $${subtotal.toFixed(2)}\n`;
  });

  mensaje += `\n---------------------------\n`;
  mensaje += `*Total a pagar: $${total.toFixed(2)}*\n\n`;
  mensaje += "Quedo a la espera de sus datos de cuenta para el pago. ¡Gracias!";

  const url = `https://wa.me/${TELEFONO_TIENDA}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");

  carrito = [];
  document.getElementById("cli-nombre").value = "";
  document.getElementById("cli-telefono").value = "";
  document.getElementById("cli-email").value = "";
  updateCartUI();
  toggleCart();
}