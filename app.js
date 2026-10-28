const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const TELEFONO_TIENDA = "593939669413"; // Número de WhatsApp

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let todosLosProductos = [];
let productosMostradosCount = 6; // Cantidad para "Nuestros Productos"
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
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
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener productos:", error);
      return;
    }

    if (!data) return;

    todosLosProductos = data;
    renderizarSeccionesGenerales();
    cargarSeccionesSidebarDirecto();

  } catch (err) {
    console.error("Excepción cargando tienda:", err);
  }
}

function renderizarSeccionesGenerales() {
  let productosBase = todosLosProductos.filter(p => {
    const dest = p.destino ? p.destino.toLowerCase().trim() : "catalogo";
    return dest === "catalogo";
  });

  if (selectedCategory !== 'todos') {
    productosBase = productosBase.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
      return cat === selectedCategory.toLowerCase().trim();
    });
  }

  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  if (loNuevoContainer) {
    const productosNuevos = productosBase.slice(0, 3);
    if (productosNuevos.length === 0) {
      loNuevoContainer.innerHTML = "<p>No hay novedades disponibles en esta categoría.</p>";
    } else {
      loNuevoContainer.innerHTML = productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
    }
  }

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
  productosMostradosCount = 6;

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
  const imagen = prod.imagen_url || prod.imagen || prod.url_imagen || 'logo.PNG';
  const prodJson = JSON.stringify(prod).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
  
  return `
    <div class="product-card" style="position: relative; cursor: pointer;">
      <div onclick="window.location.href='producto.html?id=${prod.id}'">
        <img src="${imagen}" alt="${prod.nombre}" onerror="this.onerror=null; this.src='logo.PNG';" style="width: 100%; height: 180px; object-fit: cover; border-radius: 4px;">
        <h3 style="margin: 8px 0 4px; font-size: 1rem;">${prod.nombre}</h3>
        <div style="font-size: 0.8rem; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${prod.descripcion || ''}</div>
      </div>
      <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
        <p class="price" style="margin: 0; font-weight: bold; color: #e84393;">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick="event.stopPropagation(); abrirModalCantidad(${prodJson})" style="background: #ff85a1; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Agregar</button>
      </div>
    </div>
  `;
}

// ------------------- BLOG & TIPS (IMÁGENES CORREGIDAS) -------------------
async function fetchBlogArticles() {
  const container = document.getElementById("sidebar-blog-container");
  if (!container) return;

  try {
    const { data: articulos, error } = await supabaseClient
      .from("blog")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener el blog:", error);
      container.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No se pudieron cargar los artículos.</p>";
      return;
    }

    if (!articulos || articulos.length === 0) {
      container.innerHTML = "<p style='font-size: 0.85rem; color: #666;'>No hay consejos publicados.</p>";
      return;
    }

    listaArticulosBlogGlobal = articulos;
    renderizarBlogParcial(3);

  } catch (err) {
    console.error("Error al cargar blog en tienda:", err);
  }
}

function renderizarBlogParcial(limite = 3) {
  const container = document.getElementById("sidebar-blog-container");
  if (!container) return;

  const articulosSlice = listaArticulosBlogGlobal.slice(0, limite);
  container.innerHTML = "";

  articulosSlice.forEach((art) => {
    const imgArticulo = art.imagen_url || art.imagen || art.url_imagen || art.foto || 'logo.PNG';

    const imagenHtml = `
      <img src="${imgArticulo}" 
           alt="${sanitizarTexto(art.titulo)}" 
           onerror="this.onerror=null; this.src='logo.PNG';" 
           style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 6px;">
    `;

    const card = document.createElement("div");
    card.style.cssText = "background: #fff; padding: 10px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); margin-bottom: 12px; cursor: pointer; transition: transform 0.2s;";
    
    card.innerHTML = `
      ${imagenHtml}
      <span style="background: #fff0f5; color: #e84393; padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 4px;">${sanitizarTexto(art.categoria || 'Tips')}</span>
      <h4 style="font-size: 0.9rem; margin-bottom: 4px; color: #2f2f2f;">${sanitizarTexto(art.titulo)}</h4>
      <p style="font-size: 0.8rem; color: #666; margin-bottom: 6px;">${sanitizarTexto(art.resumen || '')}</p>
      <span style="font-size: 0.75rem; color: #fb5c74; font-weight: bold;">Leer artículo completo →</span>
    `;

    card.onclick = () => abrirModalBlog(art);
    container.appendChild(card);
  });

  const btnVerMasBlog = document.getElementById("ver-mas-blog-btn");
  if (btnVerMasBlog) {
    if (listaArticulosBlogGlobal.length > 3) {
      btnVerMasBlog.style.display = "inline-block";
      
      // Ajustado para decir "Ver más artículos" o "Ver menos"
      if (limite === 3) {
        btnVerMasBlog.innerText = "Ver más artículos";
      } else {
        btnVerMasBlog.innerText = "Ver menos";
      }

      btnVerMasBlog.onclick = () => {
        if (limite === 3) {
          renderizarBlogParcial(listaArticulosBlogGlobal.length);
        } else {
          renderizarBlogParcial(3);
        }
      };
    } else {
      btnVerMasBlog.style.display = "none";
    }
  }
}

function abrirModalBlog(articulo) {
  let modal = document.getElementById("modal-blog-lector");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal-blog-lector";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 3000;";
    modal.innerHTML = `
      <div style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto; position: relative;">
        <span onclick="document.getElementById('modal-blog-lector').style.display='none'" style="position: absolute; top: 15px; right: 20px; font-size: 24px; cursor: pointer; color: #333; font-weight: bold;">&times;</span>
        <h2 id="lector-titulo" style="color: #3d2354; margin-bottom: 10px; font-size: 1.3rem;"></h2>
        <p id="lector-categoria" style="font-size: 0.8rem; color: #e84393; font-weight: bold; margin-bottom: 15px;"></p>
        
        <!-- AQUI AGREGAMOS white-space: pre-line; PARA QUE RESPETE TUS SALTOS DE LÍNEA -->
        <div id="lector-contenido" style="font-size: 0.95rem; color: #444; line-height: 1.6; white-space: pre-line;"></div>
        
        <div style="text-align: center; margin-top: 15px;">
          <button id="btn-ver-mas-modal" style="background: #fb5c74; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: none;" onclick="alternarTextoModal()">Ver más</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("lector-titulo").textContent = articulo.titulo;
  document.getElementById("lector-categoria").textContent = `Categoría: ${articulo.categoria || 'General'}`;
  
  const contenidoDiv = document.getElementById("lector-contenido");
  const contenidoTexto = articulo.contenido || articulo.texto || articulo.resumen || "Contenido no disponible.";
  
  // Usamos textContent para que respete los espacios y saltos de línea del admin de forma segura
  contenidoDiv.textContent = contenidoTexto;

  const btnVerMasModal = document.getElementById("btn-ver-mas-modal");
  if (contenidoTexto.length > 350) {
    contenidoDiv.style.maxHeight = "200px";
    contenidoDiv.style.overflow = "hidden";
    btnVerMasModal.style.display = "inline-block";
    btnVerMasModal.innerText = "Ver más";
  } else {
    contenidoDiv.style.maxHeight = "none";
    contenidoDiv.style.overflow = "visible";
    btnVerMasModal.style.display = "none";
  }
  
  modal.style.display = "flex";
}

// Función auxiliar para expandir o contraer el texto largo en el modal
function alternarTextoModal() {
  const contenidoDiv = document.getElementById("lector-contenido");
  const btn = document.getElementById("btn-ver-mas-modal");
  if (contenidoDiv.style.maxHeight === "200px") {
    contenidoDiv.style.maxHeight = "none";
    contenidoDiv.style.overflow = "visible";
    btn.innerText = "Ver menos";
  } else {
    contenidoDiv.style.maxHeight = "200px";
    contenidoDiv.style.overflow = "hidden";
    btn.innerText = "Ver más";
  }
}

// ------------------- CARRITO DE COMPRAS Y MODAL DE CANTIDAD -------------------
let productoParaAgregar = null;

function abrirModalCantidad(producto) {
  console.log("¡Función abrirModalCantidad ejecutada con éxito para:", producto.nombre);
  productoParaAgregar = producto;
  
  const nombreEl = document.getElementById('modal-producto-nombre');
  if (nombreEl) nombreEl.textContent = producto.nombre;
  
  const inputCantidad = document.getElementById('input-cantidad');
  if (inputCantidad) inputCantidad.value = 1;

  const modal = document.getElementById('modal-cantidad');
  if (modal) {
    modal.style.display = 'flex'; // Forzamos que se muestre correctamente
    modal.classList.remove('hidden');
  } else {
    console.error("No se encontró el elemento #modal-cantidad en el HTML.");
    alert("Atención: El HTML no tiene el contenedor del modal de cantidad.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-cantidad');
  const inputCantidad = document.getElementById('input-cantidad');
  
  const btnMenos = document.getElementById('btn-menos');
  if (btnMenos) {
    btnMenos.addEventListener('click', () => {
      let cant = parseInt(inputCantidad.value) || 1;
      if (cant > 1) inputCantidad.value = cant - 1; // Corregido el error tipográfico anterior (cant1)
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
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
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
      if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
      }
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
  localStorage.setItem('carrito', JSON.stringify(carrito));

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

  const resumenPedido = carrito.map(item => `${item.nombre} (x${item.cantidad}) - $${(item.precio * item.cantidad).toFixed(2)}`).join(" | ");

  try {
    const { error } = await supabaseClient.from("clientes").insert([{ 
      nombre, 
      telefono, 
      email,
      pedido_detalle: resumenPedido
    }]);

    if (error) {
      console.error("Error al guardar en Supabase:", error);
    }
  } catch (err) {
    console.error("Error inesperado:", err);
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

window.addEventListener('beforeunload', (event) => {
  if (carrito.length > 0) {
    event.preventDefault();
    event.returnValue = 'Tienes productos en tu carrito. ¿Seguro que deseas salir?';
  }
});

// ------------------- SLIDERS LATERALES (OFERTAS Y TEMPORADA) -------------------
async function cargarSeccionesSidebarDirecto() {
  try {
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
          const imgOferta = prod.imagen_url || prod.imagen || prod.url_imagen || 'logo.PNG';
          return `
            <div class="oferta-slide" style="display: ${index === 0 ? 'block' : 'none'}; text-align: center;">
              <img src="${imgOferta}" alt="${prod.nombre}" onerror="this.onerror=null; this.src='logo.PNG';" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
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
          const imgTemp = prod.imagen_url || prod.imagen || prod.url_imagen || 'logo.PNG';
          return `
            <div class="temporada-slide" style="display: ${index === 0 ? 'block' : 'none'}; text-align: center;">
              <img src="${imgTemp}" alt="${prod.nombre}" onerror="this.onerror=null; this.src='logo.PNG';" style="width: 100%; height: 140px; object-fit: cover; border-radius: 4px;">
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

window.addEventListener('pageshow', (event) => {
  carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  updateCartUI();
});