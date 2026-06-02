import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// 🆕 Agregamos las importaciones necesarias de Firestore para leer y actualizar el rol
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app); // 🆕 Inicializamos la base de datos

// ==========================================
// ESCUCHA DEL FORMULARIO DE ACCESO BASE
// ==========================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const contrasena = document.getElementById("loginPassword").value;
    const txtError = document.getElementById("errorMessage");

    try {
      if (txtError) txtError.style.display = "none";
      await signInWithEmailAndPassword(auth, email, contrasena);
    } catch (error) {
      console.error("Error al autenticar:", error);
      if (txtError) {
        txtError.textContent = "Credenciales incorrectas o usuario no registrado.";
        txtError.style.display = "block";
      }
    }
  });
}

// ==========================================
// 🔐 DETECTOR INTELLIGENT DE PRIMER LOGIN
// ==========================================
onAuthStateChanged(auth, async (user) => {
  const loginBox = document.querySelector('.login-box');
  
  if (user) {
    console.log("🟢 RASTREO LOGIN: Verificando estado de usuario:", user.email);
    if (loginBox) loginBox.style.display = "none"; // Ocultamos el login clásico

    try {
      // Leemos el documento del usuario en Firestore para ver su configuración
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const datosUsuario = userDocSnap.data();

        // 🚨 CASO CRÍTICO: Es estudiante y es su primer ingreso
        if (datosUsuario.rol === "estudiante" && (datosUsuario.primerLogin === true || datosUsuario.primerLogin === undefined)) {
          const modalPrimerLogin = document.getElementById("pantalla-primer-login");
          if (modalPrimerLogin) {
            modalPrimerLogin.style.display = "flex"; // Abrimos el cartel oscuro flotante
            configurarFormularioCambioClave(user, userDocRef, datosUsuario.nombre || user.email);
          }
          return; // 🛑 Frenamos acá. No dejamos que ejecute la redirección a aula.html
        }
      }

      // Si no requiere cambio de contraseña (Docente o Alumno antiguo), pasa directo al aula
      console.log("➡️ Todo en orden. Redirigiendo a aula.html");
      window.location.href = "aula.html";

    } catch (error) {
      console.error("❌ Error leyendo datos de validación inicial:", error);
      window.location.href = "aula.html"; // Por seguridad ante caídas, intentamos el paso
    }
  } else {
    if (loginBox) loginBox.style.display = "block";
  }
});

// ==========================================
// 🛠️ FUNCIÓN PARA PROCESAR EL CAMBIO OBLIGATORIO
// ==========================================
function configurarFormularioCambioClave(userAuth, userDocRef, nombreMostrar) {
  const form = document.getElementById("form-cambio-obligatorio");
  const txtError = document.getElementById("error-cambio-clave");

  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (txtError) txtError.style.display = "none";

    const nuevaClave = document.getElementById("nueva-clave").value;
    const confirmarClave = document.getElementById("confirmar-clave").value;

    if (nuevaClave.length < 6) {
      if (txtError) {
        txtError.innerText = "❌ La contraseña debe tener al menos 6 caracteres.";
        txtError.style.display = "block";
      }
      return;
    }

    if (nuevaClave !== confirmarClave) {
      if (txtError) {
        txtError.innerText = "❌ Las contraseñas no coinciden.";
        txtError.style.display = "block";
      }
      return;
    }

    try {
      // 1. Cambiamos la clave en Firebase Authentication
      await updatePassword(userAuth, nuevaClave);
      
      // 2. Apagamos el flag en Firestore para que no se le vuelva a bloquear la pantalla
      await updateDoc(userDocRef, { primerLogin: false }).catch(async () => {
        await setDoc(userDocRef, { nombre: nombreMostrar, rol: "estudiante", primerLogin: false }, { merge: true });
      });

      alert("¡Contraseña actualizada con éxito! Bienvenido al curso.");
      
      // 3. Una vez guardado el cambio en la BD, lo dejamos pasar de forma limpia al aula
      window.location.href = "aula.html";

    } catch (error) {
      console.error("Error al actualizar contraseña:", error);
      if (txtError) {
        if (error.code === "auth/requires-recent-login") {
          txtError.innerText = "❌ Por seguridad, reingresa a tu cuenta e intenta el cambio nuevamente.";
        } else {
          txtError.innerText = `❌ Error: ${error.message}`;
        }
        txtError.style.display = "block";
      }
    }
  };
}
