const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let productoActual = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Leer el parámetro ?id= de la URL
  const params = new URLSearchParams(window.location.search);
  const productoId = params.get("id");

  const loadingEl = document.getElementById("loading-detalle");
  const detalleContainer = document.getElementById("detalle-container");

  if (!productoId) {
    loadingEl.innerHTML = "<p style='color: red;'>No se especificó un producto válido.</p>";
    return;
  }

  try {
    // 2. Consultar el producto específico a Supabase usando .single()
    const { data: producto, error } = await supabaseClient
      .from("productos")
      .select("*")
      .eq("id", productoId)
      .single();

    if (error || !producto) {
      console.error("Error al buscar producto:", error);
      loadingEl.innerHTML = "<p style='color: red;'>El producto no existe o fue eliminado.</p>";
      return;
    }

    productoActual = producto;

    // 3. Pintar los datos dinámicamente en el HTML
    document.getElementById("det-imagen").src = producto.imagen_url || producto.imagen || "logo.PNG";
    document.getElementById("det-nombre").textContent = producto.nombre;
    document.getElementById("det-precio").textContent = `$${parseFloat(producto.precio).toFixed(2)}`;
    document.getElementById("det-categoria").textContent = producto.categoria || "General";
    
    // Soporte nativo para saltos de línea en la descripción
    document.getElementById("det-descripcion").textContent = producto.descripcion || "Sin descripción detallada.";

    // Configurar acción del botón de agregar al carrito local
    const btnAgregar = document.getElementById("det-btn-agregar");
    btnAgregar.onclick = () => {
      agregarAlCarritoDirecto(producto);
    };

    // Ocultar loader y mostrar el contenedor de detalles
    loadingEl.style.display = "none";
    detalleContainer.classList.remove("hidden");

  } catch (err) {
    console.error("Excepción al cargar detalles:", err);
    loadingEl.innerHTML = "<p style='color: red;'>Ocurrió un error al cargar la información.</p>";
  }
});

// Función auxiliar para agregar al carrito desde la vista interna
function agregarAlCarritoDirecto(prod) {
  let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
  const itemExistente = carrito.find((item) => item.id === prod.id);
  
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({ ...prod, cantidad: 1 });
  }

  localStorage.setItem('carrito', JSON.stringify(carrito));
  alert(`¡${prod.nombre} se agregó al carrito exitosamente! 🛒`);
}

// 4. Función para compartir producto e imagen
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
      // Fallback si el navegador de escritorio no soporta Web Share API
      await navigator.clipboard.writeText(window.location.href);
      alert("¡Enlace del producto copiado al portapapeles para compartir!");
    }
  } catch (err) {
    console.error("Error al compartir:", err);
  }
}