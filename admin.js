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
    const imgMini = a.imagen_url || a.imagen;
    const tdImg = imgMini ? `<img src="${imgMini}" alt="Miniatura" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 'Sin foto';

    tr.innerHTML = `
      <td>${tdImg}</td>
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
  msg.style.color = "blue";
  msg.textContent = "Procesando artículo...";

  try {
    const fileInput = document.getElementById("b-imagen-file");
    let imagenUrlFinal = "";

    // 1. Si seleccionó un archivo, lo subimos
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `blog_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Nota: Si tu bucket en Supabase se llama distinto a 'productos', cámbialo aquí
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('productos') 
        .upload(filePath, file);

      if (uploadError) {
        alert("Error al subir la imagen: " + uploadError.message);
        msg.style.color = "red";
        msg.textContent = "Error al subir la imagen.";
        return;
      }

      const { data: publicUrlData } = supabaseClient.storage
        .from('productos')
        .getPublicUrl(filePath);

      imagenUrlFinal = publicUrlData.publicUrl;
    }

    // 2. Preparamos el objeto con los datos del artículo
    const nuevoArticulo = {
      titulo: document.getElementById("b-titulo").value,
      categoria: document.getElementById("b-categoria").value,
      resumen: document.getElementById("b-resumen").value,
      contenido: document.getElementById("b-contenido").value,
      imagen_url: imagenUrlFinal 
    };

    const { error } = await supabaseClient.from("blog").insert([nuevoArticulo]);

    if (error) {
      alert("Error al guardar en la base de datos: " + error.message);
      msg.style.color = "red";
      msg.textContent = "Error: " + error.message;
    } else {
      msg.style.color = "green";
      msg.textContent = "¡Artículo publicado con éxito!";
      document.getElementById("blog-form").reset();
      loadAdminBlog();
    }

  } catch (err) {
    alert("Ocurrió un error inesperado: " + err.message);
    console.error(err);
    msg.style.color = "red";
    msg.textContent = "Error crítico en el script.";
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
