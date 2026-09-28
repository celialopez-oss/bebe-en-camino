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
let colorSeleccionadoActual = "Único";
let productoActualLightbox = null;

document.addEventListener("DOMContentLoaded", () => {
  fetchProductosTienda();
  initSlider();
  loadFrontendBlog();
  cargarSeccionesSidebarDirecto();
  updateCartUI();

  // Si el usuario entra por URL con hash de producto
  if (window.location.hash.startsWith('#producto-')) {
    const idProd = window.location.hash.replace('#producto-', '');
    setTimeout(() => abrirLightboxPorId(idProd), 800);
  }
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
      <img src="${imagen}" alt="${prod.nombre}" onclick="abrirLightboxPorId(${prod.id})" style="cursor: pointer;" title="Ver características y colores">
      <div>
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion || ''}</p>
      </div>
      <div>
        <p class="price">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick="abrirLightboxPorId(${prod.id})">Ver Opciones & Comprar</button>
      </div>
    </div>
  `;
}

// ------------------- LIGHTBOX DETALLADO CON COLORES -------------------
async function abrirLightboxPorId(id) {
  let prod = todosLosProductos.find(p => p.id == id);
  if (!prod) {
    const { data } = await supabaseClient.from("productos").select("*").eq("id", id).single();
    if (data) prod = data;
    else return;
  }

  productoActualLightbox = prod;
  const lightbox = document.getElementById("product-lightbox");
  const imgEl = document.getElementById("lightbox-img");
  const titleEl = document.getElementById("lightbox-title");
  const priceEl = document.getElementById("lightbox-price");
  const descEl = document.getElementById("lightbox-desc");
  const colorsListEl = document.getElementById("lightbox-colors-list");
  const addBtn = document.getElementById("lightbox-add-btn");
  const inputCant = document.getElementById("lightbox-cantidad");

  imgEl.src = prod.imagen_url || prod.imagen || 'logo.PNG';
  titleEl.textContent = prod.nombre;
  priceEl.textContent = `$${parseFloat(prod.precio).toFixed(2)}`;
  descEl.textContent = prod.descripcion || 'Sin descripción detallada.';
  inputCant.value = 1;
  colorSeleccionadoActual = "Único";

  // Cargar colores disponibles desde Supabase para este producto
  const { data: colores } = await supabaseClient.from("colores_producto").select("*").eq("producto_id", prod.id);
  
  if (colores && colores.length > 0) {
    document.getElementById("lightbox-colors-section").style.display = "block";
    colorsListEl.innerHTML = colores.map((c, idx) => `
      <div onclick="seleccionarColorVariante('${c.nombre_color}', '${c.imagen_color || prod.imagen_url}', this)" title="${c.nombre_color}" style="cursor: pointer; border: 2px solid ${idx === 0 ? '#fb5c74' : '#ddd'}; border-radius: 6px; padding: 3px; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; background: #fff;">
        <img src="${c.imagen_color || prod.imagen_url}" alt="${c.nombre_color}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
      </div>
    `).join('');
    colorSeleccionadoActual = colores[0].nombre_color;
  } else {
    document.getElementById("lightbox-colors-section").style.display = "none";
  }

  addBtn.onclick = () => {
    const cantidad = parseInt(inputCant.value) || 1;
    addToCart(prod.id, prod.nombre, prod.precio, colorSeleccionadoActual, cantidad);
    cerrarLightbox();
    toggleCart();
  };

  lightbox.style.display = "flex";
  history.pushState(null, null, `#producto-${prod.id}`);
}

function seleccionarColorVariante(nombreColor, imagenUrl, elementoHtml) {
  colorSeleccionadoActual = nombreColor;
  document.getElementById("lightbox-img").src = imagenUrl;
  document.querySelectorAll('#lightbox-colors-list > div').forEach(el => el.style.border = '2px solid #ddd');
  elementoHtml.style.border = '2px solid #fb5c74';
}

function cerrarLightbox() {
  document.getElementById("product-lightbox").style.display = "none";
  history.pushState("", document.title, window.location.pathname);
}

// ------------------- CARRITO CON CANTIDADES, COLOR Y VACIAR -------------------
function addToCart(id, nombre, precio, color = "Único", cantidadAgregada = 1) {
  const itemExistente = carrito.find((item) => item.id === id && item.color === color);
  if (itemExistente) {
    itemExistente.cantidad += cantidadAgregada;
  } else {
    carrito.push({ id, nombre, precio, color, cantidad: cantidadAgregada });
  }
  guardarCarritoStorage();
  updateCartUI();
}

function cambiarCantidad(id, color, cambio) {
  const item = carrito.find(i => i.id === id && i.color === color);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    carrito = carrito.filter(i => !(i.id === id && i.color === color));
  }
  guardarCarritoStorage();
  updateCartUI();
}

function eliminarDelCarrito(id, color) {
  carrito = carrito.filter(item => !(item.id === id && item.color === color));
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
        <span style="font-size: 0.75rem; color: #666; display: block;">Color: <strong>${item.color}</strong></span>
        <span style="font-size: 0.8rem; color: #fb5c74; font-weight: bold;">$${(item.precio * item.cantidad).toFixed(2)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <button onclick="cambiarCantidad(${item.id}, '${item.color}', -1)" style="background: #ddd; border: none; width: 22px; height: 22px; font-weight: bold; cursor: pointer; border-radius: 3px;">-</button>
        <span style="font-size: 0.9rem; font-weight: bold; width: 20px; text-align: center;">${item.cantidad}</span>
        <button onclick="cambiarCantidad(${item.id}, '${item.color}', 1)" style="background: #ddd; border: none; width: 22px; height: 22px; font-weight: bold; cursor: pointer; border-radius: 3px;">+</button>
        <button onclick="eliminarDelCarrito(${item.id}, '${item.color}')" title="Eliminar producto" style="background: none; border: none; color: #ff4757; cursor: pointer; font-size: 1rem; margin-left: 5px;">🗑️</button>
      </div>
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

  if (!nombre || !telefono) return alert("Por favor, completa tu Nombre y Teléfono de contacto.");

  let mensaje = "¡Hola *Bebé en camino*! 👶🛒\nTengo un nuevo pedido:\n\n";
  mensaje += `👤 *Cliente:* ${nombre}\n📞 *Contacto:* ${telefono}\n\n*Detalle del pedido:*\n`;

  let total = 0;
  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    mensaje += `${index + 1}. *${item.nombre}* (${item.color}) - (x${item.cantidad}) - $${subtotal.toFixed(2)}\n`;
  });

  mensaje += `\n---------------------------\n*Total a pagar: $${total.toFixed(2)}*\n\n¡Gracias!`;

  window.open(`https://wa.me/${TELEFONO_TIENDA}?text=${encodeURIComponent(mensaje)}`, "_blank");
  
  carrito = [];
  guardarCarritoStorage();
  updateCartUI();
  toggleCart();
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
        <button onclick="abrirLightboxPorId(${ofertas[0].id})" style="background: #fb5c74; color: white; border: none; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Aprovechar</button>
      </div>
    `;
  }
}
