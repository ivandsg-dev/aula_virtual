// ==========================================
// 1. IMPORTACIONES OFICIALES DE FIREBASE 10.8.0
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 2. CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBfSWaVPdbqtkxX7pLpCSWVehSVtK-olNY", 
  authDomain: "aula-virtual-data-studio.firebaseapp.com",
  projectId: "aula-virtual-data-studio",
  storageBucket: "aula-virtual-data-studio.firebasestorage.app",
  messagingSenderId: "1014108490203",
  appId: "1:1014108490203:web:0a23139f68d8aa9c54bffe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let editandoCronograma = false;
let datosCronogramaLocal = [];
let alumnoDatosEnvio = { nombre: "", uid: "" };

// ==========================================
// 3. CONTROL DE INTERFAZ DINÁMICA
// ==========================================
function mostrarInterfazDocente() {
  console.log("-> Ejecutando mostrarInterfazDocente...");
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'block');
  
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'none';

  cargarEntregasParaDocente();
  inicializarCronograma(true); 
  inicializarVisibilidadElementosAvanzado(true);
}

function mostrarInterfazEstudiante(nombreCompleto, uid) {
  console.log("-> Ejecutando mostrarInterfazEstudiante...");
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'none');

  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'block';

  // Inicializa los 4 formularios de entrega de forma independiente
  for (let i = 1; i <= 4; i++) {
    inicializarFormularioEntregaEspecifico(nombreCompleto, uid, i);
  }
  
  escucharTodasLasEntregasAlumno(uid); 
  inicializarCronograma(false); 
  inicializarVisibilidadElementosAvanzado(false);
}

// ==========================================
// 4. GESTIÓN DEL CRONOGRAMA CON COLUMNA CLASE ONLINE
// ==========================================
function inicializarCronograma(esDocente) {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');
  if (!contenedor) return;

  if (esDocente && btnEditar) {
    btnEditar.style.display = 'inline-block';
    btnEditar.onclick = () => alternarEdicionCronograma();
  }

  onSnapshot(doc(db, "configuracion", "cronograma"), (docSnap) => {
    if (!editandoCronograma) {
      if (docSnap.exists()) {
        datosCronogramaLocal = docSnap.data().clases || [];
      } else {
        datosCronogramaLocal = [
          { clase: "Clase 1", fecha: "Semana 1", tema: "Fundamentos de Datos y Looker Studio", link: "https://meet.google.com/abc-defg-hij" },
          { clase: "Clase 2", fecha: "Semana 2", tema: "Modelado e introducción a la visualización", link: "https://meet.google.com/abc-defg-hij" }
        ];
      }
      renderizarCronogramaAmodoVista();
    }
  });
}

function renderizarCronogramaAmodoVista() {
  const contenedor = document.getElementById('contenedor-cronograma');
  let html = `
    <table class="tabla-cronograma">
      <thead>
        <tr>
          <th>Sesión</th>
          <th>Fecha</th>
          <th>Eje Temático</th>
          <th>Acceso Clase</th>
        </tr>
      </thead>
      <tbody>
  `;
  datosCronogramaLocal.forEach(c => {
    const linkTexto = c.link ? `<a href="${c.link}" target="_blank" class="btn-link">🔗 Entrar a clase</a>` : `<span class="txt-muted">No asignado</span>`;
    html += `
      <tr>
        <td class="txt-bold">${c.clase}</td>
        <td class="txt-muted">${c.fecha}</td>
        <td>${c.tema}</td>
        <td>${linkTexto}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  if (contenedor) contenedor.innerHTML = html;
}

function alternarEdicionCronograma() {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');

  if (!editandoCronograma) {
    editandoCronograma = true;
    btnEditar.innerText = "💾 Guardar Cambios";
    btnEditar.style.backgroundColor = "#2563eb";

    let html = `<table class="tabla-cronograma">
                  <thead>
                    <tr>
                      <th>Sesión</th>
                      <th>Fecha</th>
                      <th>Eje Temático</th>
                      <th>URL Clase Online</th>
                    </tr>
                  </thead>
                <tbody>`;
    datosCronogramaLocal.forEach((c, index) => {
      html += `
        <tr>
          <td><input type="text" id="edit-clase-${index}" value="${c.clase}" class="input-inline"></td>
          <td><input type="text" id="edit-fecha-${index}" value="${c.fecha}" class="input-inline"></td>
          <td><input type="text" id="edit-tema-${index}" value="${c.tema}" class="input-inline"></td>
          <td><input type="url" id="edit-link-${index}" value="${c.link || ''}" class="input-inline" placeholder="https://..."></td>
        </tr>
      `;
    });
    html += `</tbody></table>
    <button onclick="agregarFilaCronograma()" class="btn-secundario" style="margin-top: 10px;">➕ Añadir Fila</button>`;
    if (contenedor) contenedor.innerHTML = html;
  } else {
    const nuevasClases = [];
    datosCronogramaLocal.forEach((_, index) => {
      const claseVal = document.getElementById(`edit-clase-${index}`).value;
      const fechaVal = document.getElementById(`edit-fecha-${index}`).value;
      const temaVal = document.getElementById(`edit-tema-${index}`).value;
      const linkVal = document.getElementById(`edit-link-${index}`).value;
      if (claseVal || fechaVal || temaVal) {
        nuevasClases.push({ clase: claseVal, fecha: fechaVal, tema: temaVal, link: linkVal });
      }
    });

    setDoc(doc(db, "configuracion", "cronograma"), { clases: nuevasClases })
      .then(() => {
        editandoCronograma = false;
        btnEditar.innerText = "📝 Editar cronograma";
        btnEditar.style.backgroundColor = "#10b981";
        alert("¡Cronograma actualizado!");
      })
      .catch(err => alert("Error al salvar cronograma."));
  }
}

window.agregarFilaCronograma = function() {
  datosCronogramaLocal.forEach((_, index) => {
    const claseInput = document.getElementById(`edit-clase-${index}`);
    const fechaInput = document.getElementById(`edit-fecha-${index}`);
    const temaInput = document.getElementById(`edit-tema-${index}`);
    const linkInput = document.getElementById(`edit-link-${index}`);
    if (claseInput) datosCronogramaLocal[index].clase = claseInput.value;
    if (fechaInput) datosCronogramaLocal[index].fecha = fechaInput.value;
    if (temaInput) datosCronogramaLocal[index].tema = temaInput.value;
    if (linkInput) datosCronogramaLocal[index].link = linkInput.value;
  });
  datosCronogramaLocal.push({ clase: "Nueva Clase", fecha: "Fecha", tema: "Descripción", link: "" });
  editandoCronograma = false; 
  alternarEdicionCronograma();
};

// ==========================================
// 5. VISIBILIDAD FILTRADA E INDEPENDIENTE (MATERIAL vs ENTREGAS)
// ==========================================
const clavesElementos = [
  "u1_materiales", "u1_entrega",
  "u2_materiales", "u2_entrega",
  "u3_materiales", "u3_entrega",
  "u4_materiales", "u4_entrega"
];

function inicializarVisibilidadElementosAvanzado(esDocente) {
  onSnapshot(doc(db, "configuracion", "visibilidad_avanzada"), (docSnap) => {
    const estados = docSnap.exists() ? docSnap.data() : {};
    clavesElementos.forEach(key => {
      const valorVisible = estados[key] !== undefined ? estados[key] : true; // Por defecto visible
      gestionarFiltroElementoEspecifico(key, valorVisible, esDocente);
    });
  });
}

function gestionarFiltroElementoEspecifico(key, estaVisible, esDocente) {
  const contenido = document.getElementById(`contenido-${key}`);
  const bloqueo = document.getElementById(`bloqueo-${key}`);
  
  // Mapeo dinámico para identificar los botones dinámicos en la tabla de control docente
  let idBotonDocente = "";
  if (key === "u1_materiales") idBotonDocente = "btn-visibilidad-m1";
  if (key === "u1_entrega") idBotonDocente = "btn-visibilidad-t1";
  if (key === "u2_materiales") idBotonDocente = "btn-visibilidad-m2";
  if (key === "u2_entrega") idBotonDocente = "btn-visibilidad-t2";
  if (key === "u3_materiales") idBotonDocente = "btn-visibilidad-m3";
  if (key === "u3_entrega") idBotonDocente = "btn-visibilidad-t3";
  if (key === "u4_materiales") idBotonDocente = "btn-visibilidad-m4";
  if (key === "u4_entrega") idBotonDocente = "btn-visibilidad-t4";

  const botonVisibilidad = document.getElementById(idBotonDocente);

  if (esDocente) {
    if (contenido) contenido.style.display = "block";
    if (bloqueo) bloqueo.style.display = "none";
    if (botonVisibilidad) {
      botonVisibilidad.innerText = estaVisible ? "👁️ Habilitado" : "🔒 Deshabilitado";
      botonVisibilidad.style.backgroundColor = estaVisible ? "#10b981" : "#ef4444";
    }
  } else {
    if (estaVisible) {
      if (contenido) contenido.style.display = "block";
      if (bloqueo) bloqueo.style.display = "none";
    } else {
      if (contenido) contenido.style.display = "none";
      if (bloqueo) bloqueo.style.display = "block";
    }
  }
}

window.cambiarVisibilidadElemento = async function(keyElemento) {
  const docRef = doc(db, "configuracion", "visibilidad_avanzada");
  try {
    const docSnap = await getDoc(docRef);
    let estadosActuales = docSnap.exists() ? docSnap.data() : {};
    const valorActual = estadosActuales[keyElemento] !== undefined ? estadosActuales[keyElemento] : true;
    await setDoc(docRef, { ...estadosActuales, [keyElemento]: !valorActual }, { merge: true });
  } catch (error) {
    console.error("Error al procesar visibilidad avanzada:", error);
  }
};

// ==========================================
// 6. ENVIAR Y LEER ENTREGAS MULTI-UNIDAD
// ==========================================
function inicializarFormularioEntregaEspecifico(nombreEstudiante, userId, numUnidad) {
  const formEntrega = document.getElementById(`form-entrega-u${numUnidad}`);
  if (!formEntrega) return;
  
  alumnoDatosEnvio.nombre = nombreEstudiante;
  alumnoDatosEnvio.uid = userId;

  formEntrega.onsubmit = async (e) => {
    e.preventDefault();
    const urlProyecto = document.getElementById(`url-proyecto-u${numUnidad}`).value;
    const comentarios = document.getElementById(`comentarios-proyecto-u${numUnidad}`).value;

    try {
      // Guardamos la entrega indexando por el ID compuesto "UID_unidadX"
      await setDoc(doc(db, "entregas", `${userId}_unidad${numUnidad}`), {
        nombreAlumno: nombreEstudiante,
        alumnoId: userId,
        unidad: numUnidad,
        linkLookerStudio: urlProyecto,
        comentariosAlumno: comentarios,
        fecha: new Date().toISOString(),
        estado: "Pendiente", 
        feedbackDocente: ""  
      });
      alert(`¡Proyecto de la Unidad ${numUnidad} enviado con éxito!`);
    } catch (error) {
      console.error("Error al subir entrega:", error);
    }
  };
}

function escucharTodasLasEntregasAlumno(userId) {
  for (let i = 1; i <= 4; i++) {
    const num = i;
    onSnapshot(doc(db, "entregas", `${userId}_unidad${num}`), (docSnap) => {
      const form = document.getElementById(`form-entrega-u${num}`);
      const leyendaUrl = document.getElementById(`leyenda-url-u${num}`);
      const divPendiente = document.getElementById(`estado-pendiente-u${num}`);
      const divAprobado = document.getElementById(`estado-aprobado-u${num}`);
      const divRevisar = document.getElementById(`estado-revisar-u${num}`);
      const txtAprobado = document.getElementById(`feedback-aprobado-u${num}`);
      const txtRevisar = document.getElementById(`feedback-revisar-u${num}`);

      if (form) form.style.display = 'block';
      if (leyendaUrl) leyendaUrl.style.display = 'block'; 
      if (divPendiente) divPendiente.style.display = 'none';
      if (divAprobado) divAprobado.style.display = 'none';
      if (divRevisar) divRevisar.style.display = 'none';

      if (docSnap.exists()) {
        const entrega = docSnap.data();
        const estado = entrega.estado;
        const feedback = entrega.feedbackDocente || "Sin observaciones adicionales.";

        if (estado === "Pendiente") {
          if (form) form.style.display = 'none';
          if (leyendaUrl) leyendaUrl.style.display = 'none'; 
          if (divPendiente) divPendiente.style.display = 'block';
        } else if (estado === "Aprobado") {
          if (form) form.style.display = 'none';
          if (leyendaUrl) leyendaUrl.style.display = 'none'; 
          if (divAprobado) {
            divAprobado.style.display = 'block';
            txtAprobado.innerText = feedback;
          }
        } else if (estado === "revisar") {
          if (form) form.style.display = 'none';
          if (leyendaUrl) leyendaUrl.style.display = 'none'; 
          if (divRevisar) {
            divRevisar.style.display = 'block';
            txtRevisar.innerText = feedback;
          }
        }
      }
    });
  }
}

window.reabrirFormularioEntrega = function(numUnidad) {
  const form = document.getElementById(`form-entrega-u${numUnidad}`);
  const divRevisar = document.getElementById(`estado-revisar-u${numUnidad}`);
  const leyendaUrl = document.getElementById(`leyenda-url-u${numUnidad}`);
  if (form) form.style.display = 'block';
  if (leyendaUrl) leyendaUrl.style.display = 'block';
  if (divRevisar) divRevisar.style.display = 'none';
};

function cargarEntregasParaDocente() {
  const tablaU1 = document.getElementById('lista-entregas-u1');
  if (!tablaU1) return;

  onSnapshot(collection(db, "entregas"), (snapshot) => {
    tablaU1.innerHTML = "";
    if (snapshot.empty) {
      tablaU1.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay entregas registradas aún.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const entrega = docSnap.data();
      const idEntrega = docSnap.id;
      let nombreIdentificado = entrega.nombreAlumno || "Cargando...";
      let unidadMarcada = entrega.unidad ? `(Unidad ${entrega.unidad})` : "";

      let fechaFormateada = "Sin fecha";
      if (entrega.fecha) {
        const d = new Date(entrega.fecha);
        fechaFormateada = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      }

      let claseBadge = "badge-pendiente"; 
      if (entrega.estado === "Aprobado") claseBadge = "badge-aprobado";
      else if (entrega.estado === "revisar") claseBadge = "badge-revisar";

      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>
          <strong>${nombreIdentificado}</strong> <span style="color:#2563eb; font-weight:bold;">${unidadMarcada}</span><br>
          <small class="txt-muted">${entrega.comentariosAlumno || 'Sin comentarios'}</small>
        </td>
        <td class="txt-muted font-sm">${fechaFormateada}</td>
        <td><a href="${entrega.linkLookerStudio}" target="_blank" class="btn-link">🔗 Ver Reporte</a></td>
        <td class="text-center"><span class="badge ${claseBadge}">${entrega.estado.toUpperCase()}</span></td>
        <td class="text-center"><button class="btn-evaluar" onclick="corregirEntrega('${idEntrega}')">Evaluar</button></td>
      `;
      tablaU1.appendChild(fila);
    });
  });
}

window.corregirEntrega = async function(id) {
  const seleccion = prompt("Dictamen:\nEscribe 'Aprobado' o 'revisar'");
  if (!seleccion) return; 
  const estadoFinal = seleccion.trim();
  if (estadoFinal !== "Aprobado" && estadoFinal !== "revisar") return alert("Opción inválida.");

  const feedback = prompt("Introduce el feedback:");
  if (feedback === null) return;

  try {
    await updateDoc(doc(db, "entregas", id), { estado: estadoFinal, feedbackDocente: feedback.trim() });
    alert("Evaluación guardada.");
  } catch (error) { console.error(error); }
};

// ==========================================
// 7. FLUJO PRINCIPAL DE ROL
// ==========================================
onAuthStateChanged(auth, async (user) => {
  const txtSaludo = document.getElementById('saludo-usuario');
  if (user) {
    try {
      const userDocSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (userDocSnap.exists()) {
        const datos = userDocSnap.data();
        const nombre = datos.nombre || user.email;
        
        if (datos.rol === "docente") {
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🏫 <strong>Docente:</strong> ${nombre}`;
          mostrarInterfazDocente();
        } else {
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🎓 <strong>Alumno:</strong> ${nombre}`;
          mostrarInterfazEstudiante(nombre, user.uid);
        }
      }
    } catch (e) { console.error("Error cargando perfil:", e); }
  } else {
    window.location.href = "index.html";
  }
});

const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
  });
}
