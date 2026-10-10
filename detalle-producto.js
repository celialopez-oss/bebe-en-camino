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

    document.getElementById("det-imagen").src = producto.imagen_url || producto.imagen || "logo.PNG";
    document.getElementById("det-nombre").textContent = producto.nombre;
    document.getElementById("det-precio").textContent = `$${parseFloat(producto.precio).toFixed(2)}`;
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

  const shareData = {
    title: productoActual.nombre,
    text: `¡Mira este producto de Bebé en Camino: ${productoActual.nombre} a solo $${parseFloat(productoActual.precio).toFixed(2)}!`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      mostrarNotificacionSuave("¡Enlace copiado al portapapeles!");
    }
  } catch (err) {
    console.error("Error al compartir:", err);
  }
}