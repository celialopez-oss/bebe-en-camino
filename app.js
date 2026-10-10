const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593996219444"; // Número de WhatsApp

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let productosMostradosCount = 6; // Cantidad para "Nuestros Productos"
let carrito = [];
let currentSlide = 0;
let selectedCategory = 'todos';
let indiceSliderOfertas = 0;
let indiceSliderTemporada = 0;
let listaArticulosBlogGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
  fetchProductosTienda();
  fetchBlogArticles();
  initSlider();
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
    renderizarSeccionesGenerales();
    
    // Cargamos los sliders del sidebar una vez que los datos estén descargados
    cargarSeccionesSidebarDirecto();

  } catch (err) {
    console.error("Excepción cargando tienda:", err);
  }
}

function renderizarSeccionesGenerales() {
  // Tomamos solo los productos cuyo destino principal sea el catálogo general
  let productosBase = todosLosProductos.filter(p => {
    const dest = p.destino ? p.destino.toLowerCase().trim() : "catalogo";
    return dest === "catalogo";
  });

  // Filtrar por categoría seleccionada si no es "todos"
  if (selectedCategory !== 'todos') {
    productosBase = productosBase.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
      return cat === selectedCategory.toLowerCase().trim();
    });
  }

  // 1. RENDERIZAR "LO NUEVO" (Estrictamente los primeros 3)
  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  if (loNuevoContainer) {
    const productosNuevos = productosBase.slice(0, 3);
    if (productosNuevos.length === 0) {
      loNuevoContainer.innerHTML = "<p>No hay novedades disponibles en esta categoría.</p>";
    } else {
      loNuevoContainer.innerHTML = productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
    }
  }

  // 2. RENDERIZAR "NUESTROS PRODUCTOS" (Los siguientes a partir del índice 3)
  const nuestrosProductosRestantes = productosBase.slice(3);
  renderizarNuestrosProductosFiltrados(nuestrosProductosRestantes);
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

// Cambiar de categoría desde la barra de herramientas
function filterByCategory(cat, btnElement) {
  selectedCategory = cat;
  productosMostradosCount = 6; // Resetear el contador de "Ver más" al cambiar categoría

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  renderizarSeccionesGenerales();
}

// Búsqueda en tiempo real por texto
function filterProducts() {
  const query = sanitizarTexto(document.getElementById("search-bar").value).toLowerCase().trim();
  
  let baseList = todosLosProductos.filter(p => {
    const dest = p.destino ? p.destino.toLowerCase().trim() : "catalogo";
    return dest === "catalogo";
  });

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

  renderizarNuestrosProductosFiltrados(filtered.slice(3));
}

// Botón "Ver más" de productos
function cargarMasProductos() {
  productosMostradosCount += 6;
  renderizarSeccionesGenerales();
}

function generarTarjetaProducto(prod) {
  const imagen = prod.imagen_url || prod.imagen || 'logo.PNG';
  const prodJson = JSON.stringify(prod).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
  
  return `
    <div class="product-card" style="position: relative;">
      <img src="${imagen}" alt="${prod.nombre}">
      <div>
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion || ''}</p>
      </div>
      <div>
        <p class="price">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick='abrirModalCantidad(${prodJson})'>Agregar al Carrito</button>
      </div>
    </div>
  `;
}

// ------------------- BLOG & TIPS (MÁXIMO 3 + VER MÁS) -------------------
async function fetchBlogArticles() {
  const container = document.getElementById("sidebar-blog-container") || document.querySelector(".blog-posts");
  if (!container) return;

  try {
    const { data: articulos, error } = await supabaseClient
      .from("blog")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener el blog:", error);
      return;
    }

    if (!articulos || articulos.length === 0) {
      container.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay consejos publicados.</p>";
      return;
    }

    listaArticulosBlogGlobal = articulos;
    renderizarBlogParcial(3); // Mostrar inicialmente solo los 3 últimos

  } catch (err) {
    console.error("Error al cargar blog en tienda:", err);
  }
}

function renderizarBlogParcial(limite) {
  const container = document.getElementById("sidebar-blog-container") || document.querySelector(".blog-posts");
  if (!container) return;

  const articulosSlice = listaArticulosBlogGlobal.slice(0, limite);
  container.innerHTML = "";

  articulosSlice.forEach((art) => {
    const imgArticulo = art.imagen_url || art.imagen;
    const imagenHtml = imgArticulo 
      ? `<img src="${imgArticulo}" alt="${art.titulo}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 6px;">` 
      : '';

    const card = document.createElement("div");
    card.style.cssText = "background: #fff; padding: 10px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); margin-bottom: 12px;";
    
    card.innerHTML = `
      ${imagenHtml}
      <span style="background: #fff0f5; color: #e84393; padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 4px;">${art.categoria}</span>
      <h4 style="font-size: 0.9rem; margin-bottom: 4px; color: #2f2f2f;">${art.titulo}</h4>
      <p style="font-size: 0.8rem; color: #666; margin-bottom: 0;">${art.resumen || ''}</p>
    `;
    container.appendChild(card);
  });

  const btnVerMasBlog = document.getElementById("ver-mas-blog-btn");
  if (btnVerMasBlog) {
    if (listaArticulosBlogGlobal.length > limite) {
      btnVerMasBlog.style.display = "inline-block";
      btnVerMasBlog.onclick = () => {
        renderizarBlogParcial(listaArticulosBlogGlobal.length); // Muestra todos
        btnVerMasBlog.style.display = "none";
      };
    } else {
      btnVerMasBlog.style.display = "none";
    }
  }
}

// ------------------- CARRITO DE COMPRAS Y MODAL DE CANTIDAD -------------------
let productoParaAgregar = null;

function abrirModalCantidad(producto) {
  productoParaAgregar = producto;
  const nombreEl = document.getElementById('modal-producto-nombre');
  if (nombreEl) nombreEl.textContent = producto.nombre;
  
  const inputCantidad = document.getElementById('input-cantidad');
  if (inputCantidad) inputCantidad.value = 1;

  const modal = document.getElementById('modal-cantidad');
  if (modal) modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-cantidad');
  const inputCantidad = document.getElementById('input-cantidad');
  
  const btnMenos = document.getElementById('btn-menos');
  if (btnMenos) {
    btnMenos.addEventListener('click', () => {
      let cant = parseInt(inputCantidad.value) || 1;
      if (cant > 1) inputCantidad.value = cant - 1;
    });
  }

  const btnMas = document.getElementById('btn-mas');
  if (btnMas) {
    btnMas.addEventListener('click', () => {
      let cant = parseInt(inputCantidad.value) || 1;
      if (cant < 99) inputCantidad.value = cant + 1;
    });
  }

  const btnCancelarModal = document.getElementById('btn-cancelar-modal');
  if (btnCancelarModal) {
    btnCancelarModal.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
      productoParaAgregar = null;
    });
  }

  const btnAceptarModal = document.getElementById('btn-aceptar-modal');
  if (btnAceptarModal) {
    btnAceptarModal.addEventListener('click', () => {
      if (productoParaAgregar && inputCantidad) {
        const cantidad = parseInt(inputCantidad.value) || 1;
        agregarAlCarritoConfirmado(productoParaAgregar, cantidad);
      }
      if (modal) modal.classList.add('hidden');
      productoParaAgregar = null;
    });
  }
});

function agregarAlCarritoConfirmado(producto, cantidad) {
  const itemExistente = carrito.find((item) => item.id === producto.id);
  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    carrito.push({ ...producto, cantidad });
  }
  updateCartUI();
}

function modificarCantidadCarrito(id, nuevaCantidad) {
  if (nuevaCantidad <= 0) {
    eliminarDelCarrito(id);
    return;
  }
  const item = carrito.find(p => p.id === id);
  if (item) {
    item.cantidad = parseInt(nuevaCantidad);
    updateCartUI();
  }
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(p => p.id !== id);
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
    div.style.alignItems = "center";
    div.style.marginBottom = "0.5rem";
    div.style.borderBottom = "1px solid #eee";
    div.style.paddingBottom = "5px";

    div.innerHTML = `
      <div style="flex: 1;">
        <span style="font-size: 0.9rem; font-weight: 500;">${item.nombre}</span><br>
        <span style="font-size: 0.8rem; color: #666;">$${parseFloat(item.precio).toFixed(2)} c/u</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <input type="number" value="${item.cantidad}" min="1" style="width: 45px; text-align: center;" onchange="modificarCantidadCarrito(${item.id}, this.value)">
        <button onclick="eliminarDelCarrito(${item.id})" style="background: #ff4d4d; color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
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

  const nombreInput = document.getElementById("cli-nombre");
  const telefonoInput = document.getElementById("cli-telefono");
  const emailInput = document.getElementById("cli-email");

  const nombre = nombreInput ? nombreInput.value.trim() : "";
  const telefono = telefonoInput ? telefonoInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";

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
  if (nombreInput) nombreInput.value = "";
  if (telefonoInput) telefonoInput.value = "";
  if (emailInput) emailInput.value = "";
  updateCartUI();
  toggleCart();
}

// Alerta de carrito abandonado al intentar salir o cerrar la página
window.addEventListener('beforeunload', (event) => {
  if (carrito.length > 0) {
    event.preventDefault();
    event.returnValue = 'Tienes productos en tu carrito. ¿Seguro que deseas salir?';
  }
});

// ------------------- SLIDERS LATERALES (OFERTAS Y TEMPORADA) -------------------
async function cargarSeccionesSidebarDirecto() {
  try {
    // 1. OFERTAS (Slider)
    const ofertas = todosLosProductos.filter(p => {
      const dest = p.destino ? p.destino.toLowerCase().trim() : "";
      return dest === "ofertas";
    });

    const ofertasContainer = document.getElementById("ofertas-slider");
    if (ofertasContainer) {
      if (!ofertas || ofertas.length === 0) {
        ofertasContainer.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay ofertas activas</p>";
      } else {
        ofertasContainer.innerHTML = ofertas.map((prod, index) => {
          const prodJson = JSON.stringify(prod).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
          return `
            <div class="oferta-slide" style="display: ${index === 0 ? 'block' : 'none'}; text-align: center;">
              <img src="${prod.imagen_url || prod.imagen || 'logo.PNG'}" alt="${prod.nombre}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
              <h4 style="font-size: 0.95rem; margin: 6px 0 3px; color: #2f2f2f;">${prod.nombre}</h4>
              <p style="color: #fb5c74; font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
              <button onclick='abrirModalCantidad(${prodJson})' style="background: #fb5c74; color: white; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">¡Aprovechar Oferta!</button>
            </div>
          `;
        }).join('');

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

    // 2. POR TEMPORADA (Slider automático)
    const temporada = todosLosProductos.filter(p => {
      const dest = p.destino ? p.destino.toLowerCase().trim() : "";
      return dest === "temporada";
    });

    const temporadaContainer = document.getElementById("temporada-container");
    if (temporadaContainer) {
      if (!temporada || temporada.length === 0) {
        temporadaContainer.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay productos de temporada</p>";
      } else {
        temporadaContainer.innerHTML = temporada.map((prod, index) => {
          const prodJson = JSON.stringify(prod).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
          return `
            <div class="temporada-slide" style="display: ${index === 0 ? 'block' : 'none'}; text-align: center;">
              <img src="${prod.imagen_url || prod.imagen || 'logo.PNG'}" alt="${prod.nombre}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
              <h4 style="font-size: 0.95rem; margin: 6px 0 3px; color: #2f2f2f;">${prod.nombre}</h4>
              <p style="color: #19efee; filter: brightness(0.7); font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">$${parseFloat(prod.precio).toFixed(2)}</p>
              <button onclick='abrirModalCantidad(${prodJson})' style="background: #19efee; color: #2f2f2f; border: none; padding: 5px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold;">Comprar</button>
            </div>
          `;
        }).join('');

        if (temporada.length > 1 && !window.temporadaIntervalo) {
          window.temporadaIntervalo = setInterval(() => {
            const slidesTemp = document.querySelectorAll('.temporada-slide');
            if (slidesTemp.length === 0) return;
            
            slidesTemp[indiceSliderTemporada].style.display = 'none';
            indiceSliderTemporada = (indiceSliderTemporada + 1) % slidesTemp.length;
            slidesTemp[indiceSliderTemporada].style.display = 'block';
          }, 4000);
        }
      }
    }

  } catch (err) {
    console.error("Error cargando secciones laterales:", err);
  }
}

// Función para sanitizar textos y prevenir XSS
function sanitizarTexto(texto) {
    if (!texto) return "";
    const mapa = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    const reg = /[&<>"'/]/g;
    return texto.replace(reg, (match) => mapa[match]);
}