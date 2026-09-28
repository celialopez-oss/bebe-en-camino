const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593996219444"; // Número de WhatsApp

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let todosLosProductosGenerales = [];
let productosMostradosCount = 8; 
let carrito = [];
let currentSlide = 0;
let selectedCategory = 'todos';
let indiceSliderOfertas = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetchProductosTienda();
  initSlider();
  loadFrontendBlog();
  cargarSeccionesSidebarDirecto();
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
  
  if (track) {
    track.style.transform = `translateX(-${currentSlide * (100 / 3)}%)`;
  }
  
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });
}

// ------------------- CARGA Y FILTRADO DE PRODUCTOS -------------------
async function fetchProductosTienda() {
  try {
    const { data, error } = await supabaseClient
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener productos:", error);
      return;
    }

    if (!data) return;

    todosLosProductos = data;
    
    todosLosProductosGenerales = data.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
      return cat !== "ofertas";
    });

    renderizarSeccionesGenerales();

  } catch (err) {
    console.error("Excepción cargando tienda:", err);
  }
}

function renderizarSeccionesGenerales() {
  let productosAFiltrar = todosLosProductosGenerales;
  if (selectedCategory !== 'todos') {
    productosAFiltrar = todosLosProductosGenerales.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
      return cat === selectedCategory.toLowerCase().trim();
    });
  }

  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  const productosNuevos = productosAFiltrar.slice(0, 3);
  
  if (loNuevoContainer) {
    if (productosNuevos.length === 0) {
      loNuevoContainer.innerHTML = "<p>No hay novedades disponibles en esta categoría.</p>";
    } else {
      loNuevoContainer.innerHTML = productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
    }
  }

  const productosRestantes = productosAFiltrar.slice(3);
  renderizarNuestrosProductosFiltrados(productosRestantes);
}

function renderizarNuestrosProductosFiltrados(listaRestantes) {
  const container = document.getElementById("nuestros-productos-grid");
  const btnVerMas = document.getElementById("btn-ver-mas");
  if (!container) return;

  const productosSlice = listaRestantes.slice(0, productosMostradosCount);

  if (productosSlice.length === 0) {
    container.innerHTML = "<p>No hay más productos disponibles en este momento.</p>";
    if (btnVerMas) btnVerMas.style.display = "none";
    return;
  }

  container.innerHTML = productosSlice.map(prod => generarTarjetaProducto(prod)).join('');

  if (btnVerMas) {
    if (productosMostradosCount >= listaRestantes.length) {
      btnVerMas.style.display = "none";
    } else {
      btnVerMas.style.display = "inline-block";
    }
  }
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

  const filtered = baseList.filter(p => 
    (p.nombre && p.nombre.toLowerCase().includes(query)) || 
    (p.descripcion && p.descripcion.toLowerCase().includes(query))
  );

  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  if (loNuevoContainer) {
    loNuevoContainer.innerHTML = filtered.slice(0, 3).map(prod => generarTarjetaProducto(prod)).join('') || "<p>No se encontraron novedades.</p>";
  }

  const restoFiltrado = filtered.slice(3);
  renderizarNuestrosProductosFiltrados(restoFiltrado);
}

function cargarMasProductos() {
  productosMostradosCount += 8;
  renderizarSeccionesGenerales();
}

function generarTarjetaProducto(prod) {
  const imagen = prod.imagen_url || prod.imagen || 'logo.PNG';
  const badgeOferta = prod.en_oferta ? '<span style="position: absolute; top: 10px; left: 10px; background: #e84393; color: white; padding: 3px 8px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; z-index: 10;">🔥 OFERTA</span>' : '';
  
  // Limpiamos comillas del nombre para evitar errores en llamadas JS desde HTML
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

// ------------------- VISOR DE IMAGEN (LIGHTBOX) -------------------
function abrirLightbox(imagenUrl, nombreProducto, id) {
  const lightbox = document.getElementById("product-lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  if (lightbox && lightboxImg) {
    lightboxImg.src = imagenUrl;
    lightboxImg.alt = nombreProducto;
    lightbox.classList.add("active");
    // Actualiza la URL del navegador con el identificador del producto
    history.pushState(null, null, `#producto-${id}`);
  }
}

function cerrarLightbox() {
  const lightbox = document.getElementById("product-lightbox");
  if (lightbox) {
    lightbox.classList.remove("active");
    // Restablece la URL original quitando el hash
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

// ------------------- CARRITO -------------------
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

// ------------------- BLOG & TIPS -------------------
async function loadFrontendBlog() {
  const container = document.getElementById("blog-container");
  const btnVerMas = document.getElementById("ver-mas-blog-btn");
  if (!container) return;

  const { data: articulos, error } = await supabaseClient
    .from("blog")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error al cargar el blog:", error);
    return;
  }

  if (!articulos || articulos.length === 0) {
    container.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>Pronto subiremos nuevos tips.</p>";
    return;
  }

  const limiteInicial = 2; 
  const articulosAEmpezar = articulos.slice(0, limiteInicial);

  function renderizar(lista) {
    container.innerHTML = "";
    lista.forEach(a => {
      const img = a.imagen_url || "logo.PNG";
      const card = document.createElement("div");
      card.className = "blog-card-sidebar";
      card.style.cssText = "background: #fff; border-radius: 6px; overflow: hidden; border: 1px solid #eee; margin-bottom: 0.8rem;";
      
      card.innerHTML = `
        <img src="${img}" alt="${a.titulo}" style="width: 100%; height: 110px; object-fit: cover;">
        <div style="padding: 0.7rem;">
          <span style="font-size: 0.7rem; color: #e84393; font-weight: bold; text-transform: uppercase;">${a.categoria}</span>
          <h4 style="font-size: 0.95rem; margin: 0.3rem 0; color: #333;">${a.titulo}</h4>
          <p id="resumen-${a.id}" style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">${a.resumen}</p>
          <div id="contenido-completo-${a.id}" style="display: none; font-size: 0.8rem; color: #444; margin-bottom: 0.5rem; line-height: 1.4;">
            ${a.contenido || a.resumen}
          </div>
          <button onclick="toggleLeerMas(${a.id})" id="btn-leer-${a.id}" style="background: none; border: none; color: #e84393; font-weight: bold; font-size: 0.8rem; cursor: pointer; padding: 0;">Leer más &rarr;</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderizar(articulosAEmpezar);

  if (articulos.length > limiteInicial && btnVerMas) {
    btnVerMas.style.display = "inline-block";
    btnVerMas.onclick = () => {
      renderizar(articulos);
      btnVerMas.style.display = "none";
    };
  }
}

function toggleLeerMas(id) {
  const contenidoDiv = document.getElementById(`contenido-completo-${id}`);
  const resumenP = document.getElementById(`resumen-${id}`);
  const btn = document.getElementById(`btn-leer-${id}`);

  if (contenidoDiv.style.display === "none") {
    contenidoDiv.style.display = "block";
    resumenP.style.display = "none";
    btn.innerHTML = "&larr; Leer menos";
  } else {
    contenidoDiv.style.display = "none";
    resumenP.style.display = "block";
    btn.innerHTML = "Leer más &rarr;";
  }
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

// ------------------- SIDEBAR: OFERTAS Y TEMPORADA -------------------
async function cargarSeccionesSidebarDirecto() {
  try {
    const { data: ofertas, error: errOfertas } = await supabaseClient
      .from("productos")
      .select("*")
      .eq("categoria", "ofertas");

    const ofertasContainer = document.getElementById("ofertas-slider");
    if (ofertasContainer && !errOfertas) {
      if (!ofertas || ofertas.length === 0) {
        ofertasContainer.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay ofertas activas</p>";
      } else {
        ofertasContainer.innerHTML = ofertas.map((prod, index) => `
          <div class="oferta-slide" style="display: ${index === 0 ? 'block' : 'none'}; text-align: center;">
            <img src="${prod.imagen_url || prod.imagen || 'logo.PNG'}" alt="${prod.nombre}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
            <h4 style="font-size: 0.95rem; margin: 6px 0 3px; color: #2f2f2f;">${prod.nombre}</h4>
            <p style="color: #fb5c74; font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
            <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})" style="background: #fb5c74; color: white; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">¡Aprovechar Oferta!</button>
          </div>
        `).join('');

        if (ofertas.length > 1 && !window.ofertasIntervalo) {
          window.ofertasIntervalo = setInterval(() => {
            const slides = document.querySelectorAll('.oferta-slide');
            if (slides.length === 0) return;
            
            slides[indiceSliderOfertas].style.display = 'none';
            indiceSliderOfertas = (indiceSliderOfertas + 1) % slides.length;
            slides[indiceSliderOfertas].style.display = 'block';
          }, 3500);
        }
      }
    }

    const { data: temporada, error: errTemporada } = await supabaseClient
      .from("productos")
      .select("*")
      .eq("categoria", "temporada");

    const temporadaContainer = document.getElementById("temporada-container");
    if (temporadaContainer && !errTemporada) {
      if (!temporada || temporada.length === 0) {
        temporadaContainer.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay productos de temporada</p>";
      } else {
        temporadaContainer.innerHTML = temporada.map(prod => `
          <div style="background: white; border-radius: 6px; padding: 0.5rem; margin-bottom: 0.8rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <img src="${prod.imagen_url || prod.imagen || 'logo.PNG'}" alt="${prod.nombre}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            <h4 style="font-size: 0.95rem; margin: 6px 0 3px; color: #2f2f2f;">${prod.nombre}</h4>
            <p style="color: #19efee; filter: brightness(0.6); font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
            <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})" style="background: #19efee; color: #2f2f2f; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Comprar</button>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    console.error("Error cargando secciones laterales:", err);
  }
}
