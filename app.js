const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593996219444"; // Número de WhatsApp

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let todosLosProductosGenerales = [];
let productosMostradosCount = 8; // Empieza mostrando 8 productos en la sección principal
let carrito = [];
let currentSlide = 0;
let selectedCategory = 'todos';
let indiceSliderOfertas = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetchProductosTienda();
  fetchBlogArticles();
  initSlider();
  
  // Cargamos las secciones especiales de la barra lateral de inmediato
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
      .order("id", { ascending: false }); // Los más recientes primero

    if (error) {
      console.error("Error al obtener productos:", error);
      return;
    }

    if (!data) return;

    todosLosProductos = data;
    
    // Filtramos los productos generales (excluyendo ofertas y temporada que van en el sidebar)
    todosLosProductosGenerales = data.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase() : "";
      return cat !== "ofertas" && cat !== "temporada";
    });

    // 1. RENDERIZAR "LO NUEVO" (Exactamente los primeros 4)
    const loNuevoContainer = document.getElementById("lo-nuevo-grid");
    if (loNuevoContainer) {
      const productosNuevos = todosLosProductosGenerales.slice(0, 4);
      if (productosNuevos.length === 0) {
        loNuevoContainer.innerHTML = "<p>No hay novedades disponibles.</p>";
      } else {
        loNuevoContainer.innerHTML = productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
      }
    }

    // 2. RENDERIZAR "NUESTROS PRODUCTOS" (Primeros 8)
    renderizarNuestrosProductos();

  } catch (err) {
    console.error("Excepción cargando tienda:", err);
  }
}

function renderizarNuestrosProductos() {
  const container = document.getElementById("nuestros-productos-grid");
  const btnVerMas = document.getElementById("btn-ver-mas");
  if (!container) return;

  const productosSlice = todosLosProductosGenerales.slice(0, productosMostradosCount);

  if (productosSlice.length === 0) {
    container.innerHTML = "<p>No hay productos disponibles en este momento.</p>";
    if (btnVerMas) btnVerMas.style.display = "none";
    return;
  }

  container.innerHTML = productosSlice.map(prod => generarTarjetaProducto(prod)).join('');

  if (btnVerMas) {
    if (productosMostradosCount >= todosLosProductosGenerales.length) {
      btnVerMas.style.display = "none";
    } else {
      btnVerMas.style.display = "inline-block";
    }
  }
}

// Función que se ejecuta al hacer clic en el botón "Ver más"
function cargarMasProductos() {
  productosMostradosCount += 8;
  renderizarNuestrosProductos();
}

function generarTarjetaProducto(prod) {
  const imagen = prod.imagen_url || prod.imagen || 'logo.PNG';
  return `
    <div style="background: white; border-radius: 8px; padding: 0.8rem; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: space-between; text-align: center;">
      <img src="${imagen}" alt="${prod.nombre}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 6px;">
      <div>
        <h4 style="font-size: 1rem; margin: 8px 0 4px; color: #333;">${prod.nombre}</h4>
        <p style="font-size: 0.85rem; color: #666; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${prod.descripcion || ''}</p>
      </div>
      <div>
        <p style="color: #e84393; font-weight: bold; font-size: 1rem; margin-bottom: 8px;">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})" style="background: #e84393; color: white; border: none; padding: 6px 12px; font-size: 0.85rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Agregar al Carrito</button>
      </div>
    </div>
  `;
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

// ------------------- SLIDER DE OFERTAS Y TEMPORADA (SIDEBAR) -------------------
async function cargarSeccionesSidebarDirecto() {
  try {
    // Consulta veloz y directa a Supabase para las ofertas
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
          <div class="oferta-slide" style="display: ${index === 0 ? 'block' : 'none'};">
            <img src="${prod.imagen_url || prod.imagen || 'logo.PNG'}" alt="${prod.nombre}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
            <h4 style="font-size: 0.95rem; margin: 6px 0 3px;">${prod.nombre}</h4>
            <p style="color: #d81b60; font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
            <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})" style="background: #ff69b4; color: white; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%;">¡Aprovechar Oferta!</button>
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

    // Consulta veloz y directa a Supabase para la temporada
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
            <h4 style="font-size: 0.95rem; margin: 6px 0 3px;">${prod.nombre}</h4>
            <p style="color: #4a148c; font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
            <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})" style="background: #9c27b0; color: white; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%;">Comprar</button>
          </div>
        `).join('');
      }
    }

  } catch (err) {
    console.error("Error cargando secciones laterales:", err);
  }
}
