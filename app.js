const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593996219444";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let todosLosProductosGenerales = [];
let productosMostradosCount = 8; 
let carrito = JSON.parse(localStorage.getItem('bebe_carrito')) || [];
let currentSlide = 0;
let selectedCategory = 'todos';
let indiceSliderOfertas = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetchProductosTienda();
  initSlider();
  loadFrontendBlog();
  cargarSeccionesSidebarDirecto();
  updateCartUI();
  verificarSesionAdminInicial();
});

// ------------------- SLIDER PRINCIPAL -------------------
function initSlider() {
  setInterval(() => {
    currentSlide = (currentSlide + 1) % 3;
    updateSliderUI();
  }, 4000);
}

function setSlide(index) {
  currentSlide = index;
  updateSliderUI();
}

function updateSliderUI() {
  const track = document.getElementById("slider-track");
  const dots = document.querySelectorAll(".dot");
  if (track) track.style.transform = `translateX(-${currentSlide * (100 / 3)}%)`;
  dots.forEach((dot, index) => dot.classList.toggle("active", index === currentSlide));
}

// ------------------- PRODUCTOS Y FILTROS -------------------
async function fetchProductosTienda() {
  try {
    const { data, error } = await supabaseClient.from("productos").select("*").order("id", { ascending: false });
    if (error) { console.error("Error al obtener productos:", error); return; }
    if (!data) return;

    todosLosProductos = data;
    todosLosProductosGenerales = data.filter(p => (p.categoria || "").toLowerCase().trim() !== "ofertas");
    renderizarSeccionesGenerales();
  } catch (err) { console.error("Excepción cargando tienda:", err); }
}

function renderizarSeccionesGenerales() {
  let productosAFiltrar = todosLosProductosGenerales;
  if (selectedCategory !== 'todos') {
    productosAFiltrar = todosLosProductosGenerales.filter(p => (p.categoria || "").toLowerCase().trim() === selectedCategory.toLowerCase().trim());
  }

  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  const productosNuevos = productosAFiltrar.slice(0, 3);
  
  if (loNuevoContainer) {
    loNuevoContainer.innerHTML = productosNuevos.length === 0 ? "<p>No hay novedades disponibles.</p>" : productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
  }

  renderizarNuestrosProductosFiltrados(productosAFiltrar.slice(3));
}

function renderizarNuestrosProductosFiltrados(listaRestantes) {
  const container = document.getElementById("nuestros-productos-grid");
  const btnVerMas = document.getElementById("btn-ver-mas");
  if (!container) return;

  const productosSlice = listaRestantes.slice(0, productosMostradosCount);
  if (productosSlice.length === 0) {
    container.innerHTML = "<p>No hay más productos disponibles.</p>";
    if (btnVerMas) btnVerMas.style.display = "none";
    return;
  }

  container.innerHTML = productosSlice.map(prod => generarTarjetaProducto(prod)).join('');
  if (btnVerMas) btnVerMas.style.display = productosMostradosCount >= listaRestantes.length ? "none" : "inline-block";
}

function filterByCategory(cat, btnElement) {
  selectedCategory = cat;
  productosMostradosCount = 8; 
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  renderizarSeccionesGenerales();
}

function filterProducts() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  let baseList = todosLosProductosGenerales;
  if (selectedCategory !== 'todos') {
    baseList = baseList.filter(p => (p.categoria || "").toLowerCase().trim() === selectedCategory.toLowerCase().trim());
  }

  const filtered = baseList.filter(p => (p.nombre && p.nombre.toLowerCase().includes(query)) || (p.descripcion && p.descripcion.toLowerCase().includes(query)));
  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  if (loNuevoContainer) {
    loNuevoContainer.innerHTML = filtered.slice(0, 3).map(prod => generarTarjetaProducto(prod)).join('') || "<p>No se encontraron novedades.</p>";
  }
  renderizarNuestrosProductosFiltrados(filtered.slice(3));
}

function cargarMasProductos() {
  productosMostradosCount += 8;
  renderizarSeccionesGenerales();
}

function generarTarjetaProducto(prod) {
  const imagen = prod.imagen_url || prod.imagen || 'logo.PNG';
  const badgeOferta = prod.en_oferta ? '<span style="position: absolute; top: 10px; left: 10px; background: #e84393; color: white; padding: 3px 8px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; z-index: 10;">🔥 OFERTA</span>' : '';
  const nombreLimpio = prod.nombre.replace(/'/g, "\\'");

  return `
    <div class="product-card" style="position: relative;">
      ${badgeOferta}
      <img src="${imagen}" alt="${prod.nombre}" onclick="abrirLightbox('${imagen}', '${nombreLimpio}', ${prod.id})" style="cursor: pointer;">
      <div>
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion || ''}</p>
      </div>
      <div>
        <p class="price">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick="addToCart(${prod.id}, '${nombreLimpio}', ${prod.precio})">Agregar al Carrito</button>
      </div>
    </div>
  `;
}

// ------------------- CARRITO CON CANTIDADES Y ELIMINACIÓN -------------------
function addToCart(id, nombre, precio) {
  const itemExistente = carrito.find((item) => item.id === id);
  if (itemExistente) {
    itemExistente.cantidad++;
  } else {
    carrito.push({ id, nombre, precio, cantidad: 1 });
  }
  guardarCarritoStorage();
  updateCartUI();
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    carrito = carrito.filter(i => i.id !== id);
  }
  guardarCarritoStorage();
  updateCartUI();
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarCarritoStorage();
  updateCartUI();
}

function vaciarCarrito() {
  if (confirm("¿Estás segura de que deseas vaciar el carrito?")) {
    carrito = [];
    guardarCarritoStorage();
    updateCartUI();
  }
}

function guardarCarritoStorage() {
  localStorage.setItem('bebe_carrito', JSON.stringify(carrito));
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
    itemsContainer.innerHTML = "<p style='text-align: center; color: #666; padding: 1rem;'>El carrito está vacío.</p>";
    return;
  }

  itemsContainer.innerHTML = "";
  carrito.forEach((item) => {
    const div = document.createElement("div");
    div.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; background: #f8f9fa; padding: 8px; border-radius: 6px;";
    div.innerHTML = `
      <div style="flex-grow: 1;">
        <span style="font-size: 0.9rem; font-weight: bold; display: block; color: #333;">${item.nombre}</span>
        <span style="font-size: 0.8rem; color: #fb5c74; font-weight: bold;">$${(item.precio * item.cantidad).toFixed(2)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <button onclick="cambiarCantidad(${item.id}, -1)" style="background: #ddd; border: none; width: 22px; height: 22px; font-weight: bold; cursor: pointer; border-radius: 3px;">-</button>
        <span style="font-size: 0.9rem; font-weight: bold; width: 20px; text-align: center;">${item.cantidad}</span>
        <button onclick="cambiarCantidad(${item.id}, 1)" style="background: #ddd; border: none; width: 22px; height: 22px; font-weight: bold; cursor: pointer; border-radius: 3px;">+</button>
        <button onclick="eliminarDelCarrito(${item.id})" title="Eliminar producto" style="background: none; border: none; color: #ff4757; cursor: pointer; font-size: 1rem; margin-left: 5px;">🗑️</button>
      </div>
    `;
    itemsContainer.appendChild(div);
  });
}

// ------------------- AUTENTICACIÓN ADMIN SEGURA -------------------
function toggleAdminModal() {
  document.getElementById("admin-modal").classList.toggle("hidden");
}

async function verificarSesionAdminInicial() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    mostrarDashboardAdmin(session.user.email);
  }
}

async function loginAdmin() {
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-pass").value.trim();

  if (!email || !password) {
    alert("Por favor ingresa tu correo y contraseña.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert("Error de autenticación: " + error.message);
    return;
  }

  mostrarDashboardAdmin(data.user.email);
  alert("¡Inicio de sesión exitoso!");
}

async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  document.getElementById("admin-auth-view").style.display = "block";
  document.getElementById("admin-dashboard-view").style.display = "none";
  document.getElementById("admin-email").value = "";
  document.getElementById("admin-pass").value = "";
}

function mostrarDashboardAdmin(email) {
  document.getElementById("admin-auth-view").style.display = "none";
  document.getElementById("admin-dashboard-view").style.display = "block";
  document.getElementById("admin-user-email-display").textContent = `Conectado como: ${email}`;
}

// ------------------- CHECKOUT Y OTROS -------------------
function toggleCart() {
  document.getElementById("cart-modal").classList.toggle("hidden");
}

async function checkout() {
  if (carrito.length === 0) return alert("El carrito está vacío.");
  const nombre = document.getElementById("cli-nombre").value.trim();
  const telefono = document.getElementById("cli-telefono").value.trim();

  if (!nombre || !telefono) return alert("Por favor, completa tu Nombre y Teléfono de contacto.");

  let mensaje = "¡Hola *Bebé en camino*! 👶🛒\nTengo un nuevo pedido:\n\n";
  mensaje += `👤 *Cliente:* ${nombre}\n📞 *Contacto:* ${telefono}\n\n*Detalle del pedido:*\n`;

  let total = 0;
  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    mensaje += `${index + 1}. *${item.nombre}* (x${item.cantidad}) - $${subtotal.toFixed(2)}\n`;
  });

  mensaje += `\n---------------------------\n*Total a pagar: $${total.toFixed(2)}*\n\n¡Gracias!`;

  window.open(`https://wa.me/${TELEFONO_TIENDA}?text=${encodeURIComponent(mensaje)}`, "_blank");
  
  carrito = [];
  guardarCarritoStorage();
  updateCartUI();
  toggleCart();
}

// Lightbox y Blog (igual que antes)
function abrirLightbox(url, nombre, id) {
  const lightbox = document.getElementById("product-lightbox");
  const img = document.getElementById("lightbox-img");
  if (lightbox && img) {
    img.src = url;
    lightbox.classList.add("active");
    history.pushState(null, null, `#producto-${id}`);
  }
}
function cerrarLightbox() {
  document.getElementById("product-lightbox")?.classList.remove("active");
  history.pushState("", document.title, window.location.pathname);
}

async function loadFrontendBlog() {
  const container = document.getElementById("blog-container");
  if (!container) return;
  const { data: articulos } = await supabaseClient.from("blog").select("*").order("id", { ascending: false });
  if (!articulos || articulos.length === 0) { container.innerHTML = "<p style='font-size:0.85rem; color:#666;'>Pronto más tips.</p>"; return; }
  container.innerHTML = articulos.slice(0, 2).map(a => `
    <div style="margin-bottom: 0.8rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
      <h4 style="font-size: 0.9rem; color: #333; margin-bottom: 3px;">${a.titulo}</h4>
      <p style="font-size: 0.75rem; color: #666;">${a.resumen}</p>
    </div>
  `).join('');
}

async function cargarSeccionesSidebarDirecto() {
  const { data: ofertas } = await supabaseClient.from("productos").select("*").eq("categoria", "ofertas");
  const ofertasContainer = document.getElementById("ofertas-slider");
  if (ofertasContainer && ofertas && ofertas.length > 0) {
    ofertasContainer.innerHTML = `
      <div style="text-align: center;">
        <img src="${ofertas[0].imagen_url || ofertas[0].imagen || 'logo.PNG'}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 4px;">
        <h4 style="font-size: 0.9rem; margin: 5px 0;">${ofertas[0].nombre}</h4>
        <p style="color: #fb5c74; font-weight: bold; font-size: 0.85rem;">$${parseFloat(ofertas[0].precio).toFixed(2)}</p>
        <button onclick="addToCart(${ofertas[0].id}, '${ofertas[0].nombre}', ${ofertas[0].precio})" style="background: #fb5c74; color: white; border: none; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Aprovechar</button>
      </div>
    `;
  }
}
