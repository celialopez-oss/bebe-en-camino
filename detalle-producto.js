const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productoActual = null;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const productoId = params.get("id");

  const loadingEl = document.getElementById("loading-detalle");
  const detalleContainer = document.getElementById("detalle-container");

  if (!productoId) {
    loadingEl.innerHTML = "<p style='color: red;'>No se especificó un producto válido.</p>";
    return;
  }

  try {
    const { data: producto, error } = await supabaseClient
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single();

    if (error || !producto) {
      loadingEl.innerHTML = "<p style='color: red;'>El producto no existe o fue eliminado.</p>";
      return;
    }

    productoActual = producto;

    // --- 📍 ACTUALIZACIÓN DINÁMICA DE METAETIQUETAS OPEN GRAPH ---
    const imgUrl = producto.imagen_url || producto.imagen || "https://bebe-en-camino.vercel.app/logo.png";
    const precioFormateado = parseFloat(producto.precio).toFixed(2);

    document.title = `${producto.nombre} - Bebé en Camino`;

    const metaTitle = document.getElementById("meta-title");
    const metaDesc = document.getElementById("meta-desc");
    const metaImage = document.getElementById("meta-image");
    const metaUrl = document.getElementById("meta-url");

    if (metaTitle) metaTitle.setAttribute("content", `${producto.nombre} - Bebé en Camino`);
    if (metaDesc) metaDesc.setAttribute("content", `¡Mira este producto! ${producto.nombre} a solo $${precioFormateado} en Bebé en camino.`);
    if (metaImage) metaImage.setAttribute("content", imgUrl);
    if (metaUrl) metaUrl.setAttribute("content", window.location.href);
    // ------------------------------------------------------------------

    document.getElementById("det-imagen").src = imgUrl;
    document.getElementById("det-nombre").textContent = producto.nombre;
    document.getElementById("det-precio").textContent = `$${precioFormateado}`;
    document.getElementById("det-categoria").textContent = producto.categoria || "General";
    document.getElementById("det-descripcion").textContent = producto.descripcion || "Sin descripción detallada.";

    const btnAgregar = document.getElementById("det-btn-agregar");
    btnAgregar.onclick = () => {
      const inputCant = document.getElementById("input-det-cantidad");
      const cantidad = parseInt(inputCant ? inputCant.value : 1) || 1;
      agregarAlCarritoDesdeDetalle(producto, cantidad);
    };

    loadingEl.style.display = "none";
    detalleContainer.classList.remove("hidden");

  } catch (err) {
    console.error("Excepción al cargar detalles:", err);
    loadingEl.innerHTML = "<p style='color: red;'>Ocurrió un error al cargar la información.</p>";
  }
});

function cambiarCantidadDetalle(cambio) {
  const inputCant = document.getElementById("input-det-cantidad");
  if (!inputCant) return;
  let val = parseInt(inputCant.value) || 1;
  val += cambio;
  if (val < 1) val = 1;
  if (val > 99) val = 99;
  inputCant.value = val;
}

function agregarAlCarritoDesdeDetalle(prod, cantidad) {
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  
  const itemExistente = carrito.find((item) => item.id === prod.id);
  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    carrito.push({ ...prod, cantidad });
  }

  localStorage.setItem('carrito', JSON.stringify(carrito));

  mostrarNotificacionSuave(`¡Se agregaron ${cantidad} unidad(es) de "${prod.nombre}" al carrito! 🛒`);
}

function mostrarNotificacionSuave(mensaje) {
  const existingNotification = document.getElementById('toast-notificacion');
  if (existingNotification) existingNotification.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notificacion';
  toast.textContent = mensaje;
  toast.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 25px;
    background: #48bb78;
    color: white;
    padding: 12px 22px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    z-index: 1000;
    font-size: 0.9rem;
    font-weight: 600;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

async function compartirProducto() {
  if (!productoActual) return;

  const urlProducto = window.location.href;
  const precioFormateado = parseFloat(productoActual.precio).toFixed(2);
  const textoCompartir = `¡Hola! Me interesa este producto de Bebé en Camino: *${productoActual.nombre}* a solo *$${precioFormateado}*. Aquí puedes verlo: ${urlProducto}`;
  
  const textoCodificado = encodeURIComponent(textoCompartir);
  const linkWhatsApp = `https://api.whatsapp.com/send?text=${textoCodificado}`;

  // Eliminar modal anterior si ya existía para evitar duplicados
  const modalAnterior = document.getElementById('modal-compartir-redes');
  if (modalAnterior) modalAnterior.remove();

  // Crear el contenedor del modal flotante
  const modalDiv = document.createElement('div');
  modalDiv.id = 'modal-compartir-redes';
  modalDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;

  // Contenido de la ventana enfocado en WhatsApp
  modalDiv.innerHTML = `
    <div style="background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 350px; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.2); position: relative;">
      <h3 style="margin-top: 0; margin-bottom: 10px; color: #3d2354; font-size: 1.2rem;">Compartir Producto 🛍️</h3>
      <p style="font-size: 0.85rem; color: #666; margin-bottom: 20px;">Envía los detalles de este artículo por WhatsApp:</p>
      
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Botón WhatsApp -->
        <a href="${linkWhatsApp}" target="_blank" style="background: #25d366; color: white; padding: 12px 15px; border-radius: 8px; text-decoration: none; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 1rem;">
          <i class="fa-brands fa-whatsapp" style="font-size: 1.3rem;"></i> Enviar por WhatsApp
        </a>

        <!-- Botón Copiar Enlace -->
        <button id="btn-copiar-link" style="background: #edf2f7; color: #4a5568; border: none; padding: 10px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.9rem;">
          <i class="fa-solid fa-copy" style="font-size: 1.1rem;"></i> Copiar Enlace
        </button>
      </div>

      <!-- Botón Cerrar -->
      <button id="btn-cerrar-compartir" style="background: transparent; border: none; color: #a0aec0; margin-top: 15px; cursor: pointer; font-size: 0.9rem; font-weight: 600;">
        Cancelar
      </button>
    </div>
  `;

  document.body.appendChild(modalDiv);

  // Evento para el botón de copiar enlace
  document.getElementById('btn-copiar-link').onclick = async () => {
    try {
      await navigator.clipboard.writeText(urlProducto);
      modalDiv.remove();
      mostrarNotificacionSuave("¡Enlace copiado al portapapeles! 📋");
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  // Evento para cerrar el modal
  document.getElementById('btn-cerrar-compartir').onclick = () => {
    modalDiv.remove();
  };

  // Cerrar si hacen clic fuera de la cajita blanca
  modalDiv.onclick = (e) => {
    if (e.target === modalDiv) {
      modalDiv.remove();
    }
  };
}