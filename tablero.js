// ==========================================================================
// CONFIGURACIÓN Y CONEXIÓN DE FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// REEMPLAZA ESTO CON TUS CREDENCIALES REALES DE FIREBASE (Las mismas de tu aula.js)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables de estado global de la página
let listaAlumnosGlobal = []; 
let datosDocente = null;

// ==========================================================================
// SEGURIDAD: CONTROL DE ACCESO (SOLO DOCENTES)
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // Si no está logueado, afuera
    return;
  }

  try {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().rol === "docente") {
      datosDocente = docSnap.data();
      document.getElementById("docente-nombre").innerText = datosDocente.nombre || "Profesor";
      
      // Si es docente, inicializamos los motores del tablero
      inicializarSeguimientoAlumnos();
      inicializarBuscador();
    } else {
      // Si está logueado pero es un alumno infiltrado, lo mandamos de vuelta a su aula
      alert("Acceso denegado. Este panel es exclusivo para instructores.");
      window.location.href = "aula.html";
    }
  } catch (error) {
    console.error("Error validando rol de docente:", error);
  }
});

// Botón Cerrar Sesión
document.getElementById("btn-cerrar-sesion").onclick = () => {
  signOut(auth).then(() => window.location.href = "index.html");
};

// ==========================================================================
// MOTOR 1: SEGUIMIENTO EN TIEMPO REAL Y SEMÁFOROS
// ==========================================================================
function inicializarSeguimientoAlumnos() {
  // Traemos los usuarios ordenados alfabéticamente por nombre
  const qAlumnos = query(collection(db, "usuarios"), orderBy("nombre", "asc"));
  
  onSnapshot(qAlumnos, (snapshot) => {
    listaAlumnosGlobal = [];
    
    snapshot.forEach((docSnap) => {
      const usuario = docSnap.data();
      // Filtramos para no meter al propio docente en la lista de alumnos
      if (usuario.rol !== "docente") {
        listaAlumnosGlobal.push({ id: docSnap.id, ...usuario });
      }
    });

    // Renderizar la tabla con los datos frescos o filtrados
    renderizarTabla(listaAlumnosGlobal);
  });
}

// Función encargada de dibujar las filas y aplicar tus reglas de color del semáforo
function renderizarTabla(alumnos) {
  const tbody = document.getElementById("tabla-alumnos-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (alumnos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="txt-centered">No se encontraron alumnos registrados.</td></tr>`;
    return;
  }

  alumnos.forEach((alumno) => {
    const tr = document.createElement("tr");

    // Formatear la fecha del último login
    let ultimoLogin = "Nunca";
    if (alumno.ultimoLogin) {
      const d = new Date(alumno.ultimoLogin);
      ultimoLogin = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    // Estructuramos la fila e inyectamos el componente visual de semáforos para cada TP
    tr.innerHTML = `
      <td><strong>${alumno.nombre || 'Sin Nombre'}</strong><br><small class="txt-muted">${alumno.email}</small></td>
      <td>${ultimoLogin}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp1)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp2)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp3)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp4)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Lógica de traducción de tus estados a clases CSS específicas (Tus 4 colores elegidos)
function obtenerBadgeStatus(status) {
  // Limpiamos el texto por si viene con espacios o mayúsculas desordenadas
  const st = (status || "rojo").toLowerCase().trim();

  if (st === "aprobado" || st === "verde") {
    return `<span class="status-badge status-verde">Aprobado</span>`;
  } else if (st === "esperando revision docente" || st === "amarillo") {
    return `<span class="status-badge status-amarillo">Esperando Corrección</span>`;
  } else if (st === "esperando correcciones alumno" || st === "naranja") {
    return `<span class="status-badge status-naranja">Reentrega Alumno</span>`;
  } else {
    // Estado por defecto si no entregó nada o está en "rojo"
    return `<span class="status-badge status-rojo">No Entregado</span>`;
  }
}

// ==========================================================================
// MOTOR 2: BUSCADOR EN TIEMPO REAL (Filtro Dinámico)
// ==========================================================================
function inicializarBuscador() {
  const buscador = document.getElementById("buscador-alumnos");
  buscador.oninput = (e) => {
    const termino = e.target.value.toLowerCase().trim();
    
    const alumnosFiltrados = listaAlumnosGlobal.filter(alumno => {
      const nombreCompleto = (alumno.nombre || "").toLowerCase();
      const emailCompleto = (alumno.email || "").toLowerCase();
      return nombreCompleto.includes(termino) || emailCompleto.includes(termino);
    });

    renderizarTabla(alumnosFiltrados);
  };
}

// ==========================================================================
// MOTOR 3: EXPORTADOR NATIVO A EXCEL / GOOGLE SHEETS (.CSV)
// ==========================================================================
document.getElementById("btn-exportar-csv").onclick = () => {
  if (listaAlumnosGlobal.length === 0) return alert("No hay datos disponibles para exportar.");

  // Cabecera del archivo CSV
  let contenidoCSV = "Alumno,Email,Ultimo Login,Status TP1,Status TP2,Status TP3,Status TP4\n";

  // Recorremos la lista global y limpiamos las comas para no romper las columnas del CSV
  listaAlumnosGlobal.forEach((al) => {
    const nombre = (al.nombre || "Sin Nombre").replace(/,/g, " ");
    const email = (al.email || "").replace(/,/g, " ");
    const login = al.ultimoLogin ? new Date(al.ultimoLogin).toLocaleString() : "Nunca";
    const tp1 = al.status_tp1 || "No Entregado";
    const tp2 = al.status_tp2 || "No Entregado";
    const tp3 = al.status_tp3 || "No Entregado";
    const tp4 = al.status_tp4 || "No Entregado";

    contenidoCSV += `"${nombre}","${email}","${login}","${tp1}","${tp2}","${tp3}","${tp4}"\n`;
  });

  // Generamos el archivo para descarga directa del navegador
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), contenidoCSV], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `Seguimiento_Alumnos_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==========================================================================
// MOTOR 4: CENTRO DE COMUNICACIONES MASIVAS (EMAILJS)
// ==========================================================================

// IDs generales de tu panel de EmailJS
const SERVICE_ID = 'TU_SERVICE_ID'; // Ej: 'service_default'

window.despacharMensajeMasivo = async function(tipoPlantilla) {
  if (listaAlumnosGlobal.length === 0) return alert("No hay alumnos cargados para notificar.");
  
  const confirmacion = confirm(`¿Estás seguro de que deseas enviar la notificación masiva de [${tipoPlantilla.toUpperCase()}] a todos los alumnos registrados?`);
  if (!confirmacion) return;

  // Mapeamos el tipo de botón con el Template ID correspondiente que creaste en EmailJS
  let templateID = "";
  if (tipoPlantilla === 'bienvenida') templateID = 'TEMPLATE_ID_BIENVENIDA';
  if (tipoPlantilla === 'unidad2')    templateID = 'TEMPLATE_ID_U2';
  if (tipoPlantilla === 'unidad3')    templateID = 'TEMPLATE_ID_U3';
  if (tipoPlantilla === 'unidad4')    templateID = 'TEMPLATE_ID_U4';
  if (tipoPlantilla === 'fin_curso')  templateID = 'TEMPLATE_ID_CIERRE';

  let enviados = 0;
  let errores = 0;

  // Hacemos un barrido y mandamos un mail personalizado a cada alumno en paralelo
  for (const alumno of listaAlumnosGlobal) {
    const parametrosTemplate = {
      to_email: alumno.email,
      to_name: alumno.nombre || "Alumno",
      profesor_name: datosDocente.nombre || "Tu Profesor",
      link_aula: window.location.href.replace("tablero.html", "aula.html") // Link dinámico al aula
    };

    try {
      await emailjs.send(SERVICE_ID, templateID, parametrosTemplate);
      enviados++;
    } catch (err) {
      console.error(`Error enviando mail a ${alumno.email}:`, err);
      errores++;
    }
  }

  alert(`📢 Despacho Finalizado.\nEmails enviados con éxito: ${enviados}\nErrores en envíos: ${errores}`);
};

// ==========================================================================
// MOTOR EXTRA: ALERTAS PARA ALUMNOS REZAGADOS
// ==========================================================================
document.getElementById("btn-alerta-rezagados").onclick = async () => {
  // Filtramos en caliente quiénes tienen al menos un TP sin entregar o desaprobado
  const rezagados = listaAlumnosGlobal.filter(al => {
    return (al.status_tp1 || "rojo") === "rojo" || 
           (al.status_tp2 || "rojo") === "rojo" || 
           (al.status_tp3 || "rojo") === "rojo" || 
           (al.status_tp4 || "rojo") === "rojo" ||
           (al.status_tp1 || "").toLowerCase().includes("naranja") ||
           (al.status_tp2 || "").toLowerCase().includes("naranja") ||
           (al.status_tp3 || "").toLowerCase().includes("naranja") ||
           (al.status_tp4 || "").toLowerCase().includes("naranja");
  });

  if (rezagados.length === 0) {
    return alert("🎉 ¡Excelente noticia! Todos tus alumnos están al día con sus entregas.");
  }

  const proceder = confirm(`Se detectaron ${rezagados.length} alumnos con entregas pendientes o reentregas asignadas. ¿Deseas enviarles un correo automático de aviso?`);
  if (!proceder) return;

  const TEMPLATE_REZAGADOS_ID = 'TEMPLATE_ID_REZAGADOS'; 
  let contadorFuegosApagados = 0;

  for (const al of rezagados) {
    // Evaluamos dinámicamente qué le falta para ponérselo directo en el mail
    let pendientesTexto = [];
    if (!al.status_tp1 || al.status_tp1 === "rojo" || al.status_tp1.includes("naranja")) pendientesTexto.push("Trabajo Práctico 1");
    if (!al.status_tp2 || al.status_tp2 === "rojo" || al.status_tp2.includes("naranja")) pendientesTexto.push("Trabajo Práctico 2");
    if (!al.status_tp3 || al.status_tp3 === "rojo" || al.status_tp3.includes("naranja")) pendientesTexto.push("Trabajo Práctico 3");
    if (!al.status_tp4 || al.status_tp4 === "rojo" || al.status_tp4.includes("naranja")) pendientesTexto.push("Trabajo Práctico 4");

    const parametrosTemplate = {
      to_email: al.email,
      to_name: al.nombre || "Alumno",
      lista_pendientes: pendientesTexto.join(", "),
      link_aula: window.location.href.replace("tablero.html", "aula.html")
    };

    try {
      await emailjs.send(SERVICE_ID, TEMPLATE_REZAGADOS_ID, parametrosTemplate);
      contadorFuegosApagados++;
    } catch (e) { console.error(e); }
  }

  alert(`🚀 Campaña de alertas finalizada. Se notificó a ${contadorFuegosApagados} alumnos rezagados.`);
};
