const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showPanel();
  }
});

// Autenticación de Administrador
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("login-error");

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.textContent = "Error: Credenciales incorrectas.";
  } else {
    errorMsg.textContent = "";
    showPanel();
  }
});

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  
  document.getElementById(tabId).classList.remove("hidden");
  event.currentTarget.classList.add("active");
}

async function showPanel() {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("admin-panel").classList.remove("hidden");
  await loadAdminProducts();
  await loadAdminBlog();
}

// Función auxiliar para subir imágenes a Supabase Storage
async function uploadImageToStorage(fileInput) {
  const file = fileInput.files[0];
  if (!file) return null;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from('productos')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error("Error al subir imagen: " + uploadError.message);
  }

  const { data: publicUrlData } = supabaseClient
    .storage
    .from('productos')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// ------------------- GESTIÓN DE PRODUCTOS -------------------

async function loadAdminProducts() {
  const listEl = document.getElementById("product-list");
  if (!listEl) return;

  const { data: productos, error } = await supabaseClient.from("productos").select("*").order("id", { ascending: false });

  if (error) return console.error(error);

  listEl.innerHTML = "";
  productos.forEach(p => {
    const tr = document.createElement("tr");
    const pJson = JSON.stringify(p).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
    
    tr.innerHTML = `
      <td><img src="${p.imagen_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
      <td>${p.nombre} ${p.en_oferta ? '<span style="color:red; font-weight:bold; font-size:0.8rem;">(OFERTA)</span>' : ''}</td>
      <td>$${parseFloat(p.precio).toFixed(2)}</td>
      <td>${p.categoria}</td>
      <td>
        <button class="edit-btn" onclick='openEditModal(${pJson})'>Editar</button>
        <button class="delete-btn" onclick="deleteProduct(${p.id})">Eliminar</button>
      </td>
    `;
    listEl.appendChild(tr);
  });
}

// Guardar Nuevo Producto
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("product-msg");
  const saveBtn = document.getElementById("btn-save-prod");

  saveBtn.disabled = true;
  saveBtn.textContent = "Subiendo imagen y guardando...";
  msg.textContent = "";

  try {
    const fileInput = document.getElementById("p-imagen-file");
    const imagenUrl = await uploadImageToStorage(fileInput);

    if (!imagenUrl) {
      alert("Por favor selecciona una imagen JPG/PNG válida.");
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar Producto";
      return;
    }

    // Captura si la casilla de oferta está marcada
    const enOfertaCheckbox = document.getElementById("p-en-oferta");
    const enOferta = enOfertaCheckbox ? enOfertaCheckbox.checked : false;

    const nuevoProducto = {
      nombre: document.getElementById("p-nombre").value,
      descripcion: document.getElementById("p-descripcion").value,
      precio: parseFloat(document.getElementById("p-precio").value),
      categoria: document.getElementById("p-categoria").value,
      imagen_url: imagenUrl,
      en_oferta: enOferta
    };

    const { error } = await supabaseClient.from("productos").insert([nuevoProducto]);

    if (error) {
      msg.style.color = "red";
      msg.textContent = "Error al guardar: " + error.message;
    } else {
      msg.style.color = "green";
      msg.textContent = "¡Producto guardado exitosamente!";
      document.getElementById("product-form").reset();
      loadAdminProducts();
    }
  } catch (err) {
    msg.style.color = "red";
    msg.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Guardar Producto";
  }
});

// Modal de Edición
function openEditModal(producto) {
  document.getElementById("edit-p-id").value = producto.id;
  document.getElementById("edit-p-nombre").value = producto.nombre;
  document.getElementById("edit-p-descripcion").value = producto.descripcion;
  document.getElementById("edit-p-precio").value = producto.precio;
  document.getElementById("edit-p-categoria").value = producto.categoria;
  document.getElementById("edit-p-imagen-actual").value = producto.imagen_url;
  
  // Marcar o desmarcar la casilla de oferta según el producto
  const editOfertaCheckbox = document.getElementById("edit-p-en-oferta");
  if (editOfertaCheckbox) {
    editOfertaCheckbox.checked = producto.en_oferta === true;
  }

  document.getElementById("edit-modal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.add("hidden");
  document.getElementById("edit-p-imagen-file").value = "";
}

// Actualizar Producto Editado
document.getElementById("edit-product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const updateBtn = document.getElementById("btn-update-prod");
  updateBtn.disabled = true;
  updateBtn.textContent = "Guardando cambios...";

  const id = document.getElementById("edit-p-id").value;
  const imagenActual = document.getElementById("edit-p-imagen-actual").value;
  const fileInput = document.getElementById("edit-p-imagen-file");

  try {
    let imagenUrl = imagenActual;

    // Si seleccionó una nueva foto, la subimos
    if (fileInput.files.length > 0) {
      const nuevaUrl = await uploadImageToStorage(fileInput);
      if (nuevaUrl) imagenUrl = nuevaUrl;
    }

    const editOfertaCheckbox = document.getElementById("edit-p-en-oferta");
    const enOferta = editOfertaCheckbox ? editOfertaCheckbox.checked : false;

    const productoActualizado = {
      nombre: document.getElementById("edit-p-nombre").value,
      descripcion: document.getElementById("edit-p-descripcion").value,
      precio: parseFloat(document.getElementById("edit-p-precio").value),
      categoria: document.getElementById("edit-p-categoria").value,
      imagen_url: imagenUrl,
      en_oferta: enOferta
    };

    const { error } = await supabaseClient
      .from("productos")
      .update(productoActualizado)
      .eq("id", id);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      closeEditModal();
      loadAdminProducts();
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Actualizar";
  }
});

// Eliminar Producto
async function deleteProduct(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

  const { error } = await supabaseClient.from("productos").delete().eq("id", id);
  if (error) {
    alert("Error al eliminar el producto: " + error.message);
  } else {
    loadAdminProducts();
  }
}

// ------------------- GESTIÓN DEL BLOG -------------------

async function loadAdminBlog() {
  const listEl = document.getElementById("blog-list");
  if (!listEl) return;

  const { data: articulos, error } = await supabaseClient.from("blog").select("*").order("id", { ascending: false });

  if (error) return console.error(error);

  listEl.innerHTML = "";
  articulos.forEach(a => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.titulo}</td>
      <td>${a.categoria}</td>
      <td><button class="delete-btn" onclick="deleteBlogArticle(${a.id})">Eliminar</button></td>
    `;
    listEl.appendChild(tr);
  });
}

document.getElementById("blog-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("blog-msg");

  const nuevoArticulo = {
    titulo: document.getElementById("b-titulo").value,
    categoria: document.getElementById("b-categoria").value,
    resumen: document.getElementById("b-resumen").value,
    contenido: document.getElementById("b-contenido").value
  };

  const { error } = await supabaseClient.from("blog").insert([nuevoArticulo]);

  if (error) {
    msg.style.color = "red";
    msg.textContent = "Error: " + error.message;
  } else {
    msg.style.color = "green";
    msg.textContent = "¡Artículo publicado con éxito!";
    document.getElementById("blog-form").reset();
    loadAdminBlog();
  }
});

async function deleteBlogArticle(id) {
  if (!confirm("¿Seguro que deseas eliminar este artículo?")) return;

  const { error } = await supabaseClient.from("blog").delete().eq("id", id);
  if (error) {
    alert("Error al eliminar el artículo: " + error.message);
  } else {
    loadAdminBlog();
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

Appjs
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
    
    // Filtramos los productos generales (excluyendo la categoría fija de "ofertas" que va en el sidebar)
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
  // Filtrar por categoría seleccionada si no es "todos"
  let productosAFiltrar = todosLosProductosGenerales;
  if (selectedCategory !== 'todos') {
    productosAFiltrar = todosLosProductosGenerales.filter(p => {
      const cat = p.categoria ? p.categoria.toLowerCase().trim() : "";
      return cat === selectedCategory.toLowerCase().trim();
    });
  }

  // 1. RENDERIZAR "LO NUEVO" (Exactamente los primeros 4)
  const loNuevoContainer = document.getElementById("lo-nuevo-grid");
  if (loNuevoContainer) {
    const productosNuevos = productosAFiltrar.slice(0, 4);
    if (productosNuevos.length === 0) {
      loNuevoContainer.innerHTML = "<p>No hay novedades disponibles en esta categoría.</p>";
    } else {
      loNuevoContainer.innerHTML = productosNuevos.map(prod => generarTarjetaProducto(prod)).join('');
    }
  }

  // 2. RENDERIZAR "NUESTROS PRODUCTOS"
  renderizarNuestrosProductosFiltrados(productosAFiltrar);
}

function renderizarNuestrosProductosFiltrados(listaProductos) {
  const container = document.getElementById("nuestros-productos-grid");
  const btnVerMas = document.getElementById("btn-ver-mas");
  if (!container) return;

  const productosSlice = listaProductos.slice(0, productosMostradosCount);

  if (productosSlice.length === 0) {
    container.innerHTML = "<p>No hay productos disponibles en este momento.</p>";
    if (btnVerMas) btnVerMas.style.display = "none";
    return;
  }

  container.innerHTML = productosSlice.map(prod => generarTarjetaProducto(prod)).join('');

  if (btnVerMas) {
    if (productosMostradosCount >= listaProductos.length) {
      btnVerMas.style.display = "none";
    } else {
      btnVerMas.style.display = "inline-block";
    }
  }
}

// Función para cambiar de categoría desde los botones de la barra de herramientas
function filterByCategory(cat, btnElement) {
  selectedCategory = cat;
  productosMostradosCount = 8; // Resetear conteo al cambiar de categoría

  // Actualizar clases activas de los botones
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  renderizarSeccionesGenerales();
}

// Búsqueda en tiempo real por texto
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
    loNuevoContainer.innerHTML = filtered.slice(0, 4).map(prod => generarTarjetaProducto(prod)).join('') || "<p>No se encontraron novedades.</p>";
  }

  renderizarNuestrosProductosFiltrados(filtered);
}

// Función que se ejecuta al hacer clic en el botón "Ver más"
function cargarMasProductos() {
  productosMostradosCount += 8;
  renderizarSeccionesGenerales();
}

function generarTarjetaProducto(prod) {
  const imagen = prod.imagen_url || prod.imagen || 'logo.PNG';
  // Etiqueta visual flotante si el producto tiene marcada la casilla de oferta en el admin
  const badgeOferta = prod.en_oferta ? '<span style="position: absolute; top: 10px; left: 10px; background: #e84393; color: white; padding: 3px 8px; font-size: 0.75rem; font-weight: bold; border-radius: 4px; z-index: 10;">🔥 OFERTA</span>' : '';
  
  return `
    <div class="product-card" style="position: relative;">
      ${badgeOferta}
      <img src="${imagen}" alt="${prod.nombre}">
      <div>
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion || ''}</p>
      </div>
      <div>
        <p class="price">$${parseFloat(prod.precio).toFixed(2)}</p>
        <button onclick="addToCart(${prod.id}, '${prod.nombre}', ${prod.precio})">Agregar al Carrito</button>
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
    // Ofertas
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

    // Temporada
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
