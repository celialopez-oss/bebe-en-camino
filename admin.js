const SUPABASE_URL = "https://bwkohmeobwplthvjihtd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo";
const supabaseClient = supabase.createClient(https://bwkohmeobwplthvjihtd.supabase.co, sb_publishable_MfylsjMrOCQIK2fGwmPEdg_gXB-zhRo);

document.addEventListener("DOMContentLoaded", () => {
    verificarSesion();
    cargarProductosAdmin();
    cargarTipsAdmin();
});

async function verificarSesion() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        const emailSpan = document.getElementById('user-email');
        if(emailSpan) emailSpan.innerText = `Conectado: ${session.user.email}`;
    }
}

async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

function cambiarPestana(pestana) {
    const secProd = document.getElementById('seccion-productos');
    const secTips = document.getElementById('seccion-tips');
    const btnProd = document.getElementById('btn-tab-productos');
    const btnTips = document.getElementById('btn-tab-tips');

    if (pestana === 'productos') {
        secProd.style.display = 'block';
        secTips.style.display = 'none';
        btnProd.style.background = '#e63946';
        btnProd.style.color = 'white';
        btnTips.style.background = '#ddd';
        btnTips.style.color = '#333';
    } else {
        secProd.style.display = 'none';
        secTips.style.display = 'block';
        btnTips.style.background = '#e63946';
        btnTips.style.color = 'white';
        btnProd.style.background = '#ddd';
        btnProd.style.color = '#333';
    }
}

async function subirArchivo(file, bucket) {
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: publicURL } = supabaseClient.storage.from(bucket).getPublicUrl(fileName);
    return publicURL.publicUrl;
}

// --- GESTIÓN DE COLORES ---
function agregarCampoColor(nombreColor = '', urlImagen = '') {
    const contenedor = document.getElementById('contenedor-colores');
    const div = document.createElement('div');
    div.style.cssText = "display: flex; gap: 5px; align-items: center; background: white; padding: 5px; border-radius: 3px;";
    div.innerHTML = `
        <input type="text" placeholder="Nombre (ej. Rosa)" value="${nombreColor}" class="input-nombre-color" style="padding: 4px; font-size: 0.8rem; border:1px solid #ccc; border-radius:3px; width:35%;">
        <input type="file" accept="image/*" class="input-file-color" style="font-size: 0.75rem; width: 50%;">
        ${urlImagen ? `<input type="hidden" class="input-url-color" value="${urlImagen}">` : ''}
        <button type="button" onclick="this.parentElement.remove()" style="background:#e63946; color:white; border:none; padding:3px 6px; border-radius:3px; font-size:0.75rem; cursor:pointer;">X</button>
    `;
    contenedor.appendChild(div);
}

// --- PRODUCTOS ---
async function guardarProducto(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-categoria').value;
    const descripcion = document.getElementById('prod-descripcion').value;
    const en_oferta = document.getElementById('prod-oferta').checked;
    const es_temporada = document.getElementById('prod-temporada').checked;
    const fileInput = document.getElementById('prod-imagen-file');

    let imagen_url = document.getElementById('prod-id').getAttribute('data-img-actual') || '';

    try {
        if (fileInput.files.length > 0) {
            imagen_url = await subirArchivo(fileInput.files[0], 'productos');
        }

        if (!imagen_url && !id) {
            alert('Debes subir una imagen principal.');
            return;
        }

        const productoData = { nombre, precio, categoria, descripcion, imagen_url, en_oferta, es_temporada };
        let productoId = id;

        if (id) {
            const { error } = await supabaseClient.from('productos').update(productoData).eq('id', id);
            if (error) throw error;
        } else {
            const { data, error } = await supabaseClient.from('productos').insert([productoData]).select();
            if (error) throw error;
            productoId = data[0].id;
        }

        // Guardar colores dinámicos
        const filasColores = document.querySelectorAll('#contenedor-colores > div');
        for (let fila of filasColores) {
            const nombreColor = fila.querySelector('.input-nombre-color').value;
            const fileColorInput = fila.querySelector('.input-file-color');
            let urlColor = fila.querySelector('.input-url-color') ? fila.querySelector('.input-url-color').value : '';

            if (fileColorInput.files.length > 0) {
                urlColor = await subirArchivo(fileColorInput.files[0], 'productos');
            }

            if (nombreColor && urlColor) {
                await supabaseClient.from('colores_producto').insert([{
                    producto_id: productoId,
                    nombre_color: nombreColor,
                    imagen_color: urlColor
                }]);
            }
        }

        alert('¡Producto guardado exitosamente!');
        limpiarFormProducto();
        cargarProductosAdmin();
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    }
}

async function cargarProductosAdmin() {
    const { data, error } = await supabaseClient.from('productos').select('*').order('id', { ascending: false });
    const contenedor = document.getElementById('lista-productos');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (error || !data) return;

    data.forEach(prod => {
        contenedor.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${prod.imagen_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px;">
                    <div>
                        <h4 style="font-size: 0.9rem;">${prod.nombre}</h4>
                        <span style="font-size: 0.75rem; color: #666;">$${prod.precio}</span>
                    </div>
                </div>
                <div>
                    <button onclick="editarProducto(${prod.id})" style="background: #3a86ff; color: white; border: none; padding: 5px 10px; font-size: 0.75rem; border-radius: 3px; cursor:pointer;">Editar</button>
                    <button onclick="eliminarProducto(${prod.id})" style="background: #e63946; color: white; border: none; padding: 5px 10px; font-size: 0.75rem; border-radius: 3px; cursor:pointer;">Eliminar</button>
                </div>
            </div>
        `;
    });
}

async function editarProducto(id) {
    const { data, error } = await supabaseClient.from('productos').select('*').eq('id', id).single();
    if (error) return alert('No se pudo cargar el producto');

    document.getElementById('prod-id').value = data.id;
    document.getElementById('prod-id').setAttribute('data-img-actual', data.imagen_url);
    document.getElementById('prod-nombre').value = data.nombre;
    document.getElementById('prod-precio').value = data.precio;
    document.getElementById('prod-categoria').value = data.categoria || '';
    document.getElementById('prod-descripcion').value = data.descripcion || '';
    document.getElementById('prod-oferta').checked = data.en_oferta;
    document.getElementById('prod-temporada').checked = data.es_temporada;

    document.getElementById('form-titulo-prod').innerText = "Editar Producto";
    document.getElementById('btn-submit-prod').innerText = "Actualizar Producto";
    document.getElementById('btn-cancelar-prod').style.display = 'inline-block';

    const { data: colores } = await supabaseClient.from('colores_producto').select('*').eq('producto_id', id);
    document.getElementById('contenedor-colores').innerHTML = '';
    if (colores) {
        colores.forEach(c => agregarCampoColor(c.nombre_color, c.imagen_color));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormProducto() {
    document.getElementById('form-producto').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-id').removeAttribute('data-img-actual');
    document.getElementById('contenedor-colores').innerHTML = '';
    document.getElementById('form-titulo-prod').innerText = "Agregar Nuevo Producto";
    document.getElementById('btn-submit-prod').innerText = "Guardar Producto";
    document.getElementById('btn-cancelar-prod').style.display = 'none';
}

async function eliminarProducto(id) {
    if (confirm('¿Eliminar producto?')) {
        await supabaseClient.from('productos').delete().eq('id', id);
        cargarProductosAdmin();
    }
}

// --- TIPS PARA MAMÁ ---
async function guardarTip(e) {
    e.preventDefault();
    const id = document.getElementById('tip-id').value;
    const titulo = document.getElementById('tip-titulo').value;
    const breve_mensaje = document.getElementById('tip-breve').value;
    const descripcion = document.getElementById('tip-descripcion').value;
    const fileInput = document.getElementById('tip-imagen-file');

    let imagen_url = document.getElementById('tip-id').getAttribute('data-img-actual') || '';

    try {
        if (fileInput.files.length > 0) {
            imagen_url = await subirArchivo(fileInput.files[0], 'tips');
        }

        if (!imagen_url && !id) {
            alert('Debes subir una imagen.');
            return;
        }

        const tipData = { titulo, breve_mensaje, descripcion, imagen_url };

        if (id) {
            const { error } = await supabaseClient.from('tips_mamas').update(tipData).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('tips_mamas').insert([tipData]);
            if (error) throw error;
        }

        alert('¡Tip guardado exitosamente!');
        limpiarFormTip();
        cargarTipsAdmin();
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    }
}

async function cargarTipsAdmin() {
    const { data, error } = await supabaseClient.from('tips_mamas').select('*').order('id', { ascending: false });
    const contenedor = document.getElementById('lista-tips');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (error || !data) return;

    data.forEach(tip => {
        contenedor.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #eee; padding: 10px; border-radius: 4px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${tip.imagen_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 3px;">
                    <div>
                        <h4 style="font-size: 0.9rem;">${tip.titulo}</h4>
                        <span style="font-size: 0.75rem; color: #666;">${tip.breve_mensaje}</span>
                    </div>
                </div>
                <div>
                    <button onclick="editarTip(${tip.id})" style="background: #3a86ff; color: white; border: none; padding: 5px 10px; font-size: 0.75rem; border-radius: 3px; cursor:pointer;">Editar</button>
                    <button onclick="eliminarTip(${tip.id})" style="background: #e63946; color: white; border: none; padding: 5px 10px; font-size: 0.75rem; border-radius: 3px; cursor:pointer;">Eliminar</button>
                </div>
            </div>
        `;
    });
}

async function editarTip(id) {
    const { data, error } = await supabaseClient.from('tips_mamas').select('*').eq('id', id).single();
    if (error) return alert('No se pudo cargar el tip');

    document.getElementById('tip-id').value = data.id;
    document.getElementById('tip-id').setAttribute('data-img-actual', data.imagen_url);
    document.getElementById('tip-titulo').value = data.titulo;
    document.getElementById('tip-breve').value = data.breve_mensaje;
    document.getElementById('tip-descripcion').value = data.descripcion;

    document.getElementById('form-titulo-tip').innerText = "Editar Tip";
    document.getElementById('btn-submit-tip').innerText = "Actualizar Tip";
    document.getElementById('btn-cancelar-tip').style.display = 'inline-block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormTip() {
    document.getElementById('form-tip').reset();
    document.getElementById('tip-id').value = '';
    document.getElementById('tip-id').removeAttribute('data-img-actual');
    document.getElementById('form-titulo-tip').innerText = "Publicar Nuevo Tip para Mamá";
    document.getElementById('btn-submit-tip').innerText = "Publicar Tip";
    document.getElementById('btn-cancelar-tip').style.display = 'none';
}

async function eliminarTip(id) {
    if (confirm('¿Eliminar este tip?')) {
        await supabaseClient.from('tips_mamas').delete().eq('id', id);
        cargarTipsAdmin();
    }
}
