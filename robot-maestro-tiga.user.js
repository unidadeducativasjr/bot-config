// ==UserScript==
// @name         ROBOT MAESTRO - TIGA FULL PRO (TOTAL)
// @namespace    TIGA_INNOVACION_GESTION
// @version      24.0
// @description  Robot Unificado con persistencia de datos y nombres de botones simplificados.
// @author       TIGA
// @match        *://academico.educarecuador.gob.ec/*
// @include      /^https?://academico\.educarecuador\.gob\.ec/.*$/
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    // --- CONFIGURACIÓN E IDENTIDAD ---
    const EMPRESA = "TIGA: TENE INNOVACIÓN Y GESTIÓN ACADÉMICA";
    const timestamp = Date.now();
const URL_LOGO = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/WhatsApp%20Image%202026-05-09%20at%2006.51.35%20PM.jpeg?v=" + timestamp;
const JSON_URL = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/config.json?v=" + timestamp;

    let CONFIG = null, INSTITUCION = null, BASE_DATOS = {}, BASE_NOTAS_CUANTI = [];
    let PAGINA_CUANTI = 1, indiceAcompa = 0, filasProcesadasInicial = [], PROCESO_ACTIVO = false;

    const ESCALA_INICIAL = ["A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-"];
    const MAPA_ACOMPA = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };

    // --- 1. NÚCLEO DE INICIO Y PERSISTENCIA ---
    function iniciar() {
        // Recuperamos datos de sessionStorage para que sobrevivan a recargas de página
        const datosGuardados = sessionStorage.getItem("TIGA_DATA");
        if (datosGuardados) BASE_DATOS = JSON.parse(datosGuardados);
        
        const datosCuanti = sessionStorage.getItem("TIGA_CUANTI");
        if (datosCuanti) BASE_NOTAS_CUANTI = JSON.parse(datosCuanti);

        GM_xmlhttpRequest({
            method: "GET", 
            url: JSON_URL,
            onload: (r) => {
                try {
                    CONFIG = JSON.parse(r.responseText);
                    const intervalo = setInterval(() => {
                        const match = document.body.innerText.match(/\b\d{2}[A-Z]\d{5}\b/);
                        if (match) { 
                            clearInterval(intervalo); 
                            validarAcceso(match[0]); 
                        }
                    }, 2000);
                } catch(e) { console.error("Error en Config:", e); }
            }
        });
    }

    function validarAcceso(amie) {
        INSTITUCION = CONFIG.instituciones.find(inst => inst.amie === amie);
        if (!INSTITUCION) return;
        if (sessionStorage.getItem("auth_tigas")) { 
            mostrarBienvenida(); colocarLogoFijo(); pintarInterfaz(); 
        } else {
            const pass = prompt(`🔐 CLAVE - ${EMPRESA}:`);
            if (pass === (INSTITUCION.clave || "2026")) { 
                sessionStorage.setItem("auth_tigas", "true"); 
                mostrarBienvenida(); colocarLogoFijo(); pintarInterfaz(); 
            }
        }
    }

    // --- 2. INTERFAZ ---
    function pintarInterfaz() {
        if (document.getElementById("cont_sjr")) return;
        const cont = document.createElement("div"); 
        cont.id = "cont_sjr"; 
        document.body.appendChild(cont);
        
        // Nombres simplificados según tu solicitud
        crearBoton("🗑️ BORRAR", "#cc0000", "200px", () => iniciarEliminacion());
        crearBoton("📋 ACOMPAÑAMIENTO", "#8e44ad", "140px", () => capturarExcel("ACOMPA"));
        crearBoton("🧒 INICIAL", "#009933", "80px", () => capturarExcel("INICIAL"));
        crearBoton("🤖 NOTAS", "#0066ff", "20px", () => capturarExcel("CUANTI"));
    }

    function crearBoton(txt, col, bot, accion) {
        const b = document.createElement("button"); 
        b.innerText = txt;
        Object.assign(b.style, { position: "fixed", bottom: bot, right: "20px", zIndex: "99999", padding: "12px", width: "160px", background: col, color: "white", borderRadius: "10px", fontWeight: "bold", border: "none", cursor: "pointer", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" });
        b.onclick = accion; 
        document.getElementById("cont_sjr").appendChild(b);
    }

    // --- 3. PROCESAMIENTO DE EXCEL ---
    function capturarExcel(modo) {
        if (PROCESO_ACTIVO) return;
        let raw = prompt(`📊 PEGAR EXCEL PARA ${modo}:`); 
        if (!raw) return;
        PROCESO_ACTIVO = true;

        if (modo === "CUANTI") { 
            BASE_NOTAS_CUANTI = raw.split(/\n/).map(x => x.trim().replace(",", ".")).filter(x => x !== ""); 
            sessionStorage.setItem("TIGA_CUANTI", JSON.stringify(BASE_NOTAS_CUANTI));
            PAGINA_CUANTI = 1; 
            motorCuantitativo(); 
        } else {
            BASE_DATOS = {}; 
            raw.split(/\n/).forEach(f => { 
                const c = f.split(/\t/); 
                if (c.length > 1) BASE_DATOS[c[0].trim().toUpperCase()] = c.slice(1).map(n => n.trim().toUpperCase()); 
            });
            sessionStorage.setItem("TIGA_DATA", JSON.stringify(BASE_DATOS));
            
            if (modo === "ACOMPA") { indiceAcompa = 0; motorAcompanamiento(); } 
            else { filasProcesadasInicial = []; motorInicial(); }
        }
    }

   /* --- MOTOR DE ACOMPAÑAMIENTO TOTALMENTE AUTÓNOMO --- */
async function ejecutarAcompanamiento() {
    console.log("🚀 INICIANDO ACOMPAÑAMIENTO...");

    // 1. AUTO-SELECCIÓN SI ESTÁ EN LA TABLA
    const alumnoAbierto = document.querySelector('input[readonly], .form-control[disabled]');
    if (!alumnoAbierto) {
        // Busca el primer botón naranja "Seleccionar"
        const btnSeleccionar = document.querySelector('button.mat-raised-button.mat-primary');
        if (btnSeleccionar) {
            console.log("🖱️ Seleccionando alumno automáticamente...");
            btnSeleccionar.click();
            // Espera 2 segundos a que cargue la ficha antes de reintentar
            setTimeout(() => ejecutarAcompanamiento(), 2000);
            return;
        } else {
            console.warn("⚠️ No se encontró botón Seleccionar. ¿Estás en la página correcta?");
            return;
        }
    }

    // 2. VALIDACIÓN DE DATOS DESDE GITHUB
    if (!CONFIG || !CONFIG.acompanamiento_mapa) {
        alert("❌ Error: No hay 'acompanamiento_mapa' en config.json");
        return;
    }

    const nombreAlumno = alumnoAbierto.value.trim().toUpperCase();
    const notas = CONFIG.acompanamiento_mapa[nombreAlumno];

    if (!notas) {
        alert("❓ No encontré notas para: " + nombreAlumno);
        return;
    }

    // 3. LLENADO CON CLICS REALES (Para activar el botón Guardar)
    const mapa = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };
    const selects = Array.from(document.querySelectorAll('mat-select'));

    for (let i = 0; i < selects.length; i++) {
        const textoObjetivo = mapa[notas[i]];
        if (textoObjetivo) {
            selects[i].click(); // Abre el menú
            await new Promise(r => setTimeout(r, 500)); // Espera a que aparezcan las opciones
            
            const opciones = Array.from(document.querySelectorAll('mat-option'));
            const opcionCorrecta = opciones.find(opt => opt.innerText.trim() === textoObjetivo);
            
            if (opcionCorrecta) {
                opcionCorrecta.click(); // Selecciona
                console.log(`✅ ${nombreAlumno}: Nota ${i+1} puesta.`);
            }
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // 4. GUARDADO Y REGRESO AUTOMÁTICO
    setTimeout(() => {
        const btnGuardar = document.querySelector('button.btn-success, .btn-primary, button[type="submit"]');
        if (btnGuardar && !btnGuardar.disabled) {
            console.log("💾 Guardando calificación...");
            btnGuardar.click();
            
            // Espera a que guarde y presiona "Volver"
            setTimeout(() => {
                const btnVolver = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Volver"));
                if (btnVolver) {
                    btnVolver.click();
                    // Al volver a la tabla, procesa al siguiente alumno en 3 segundos
                    setTimeout(() => ejecutarAcompanamiento(), 3000);
                }
            }, 2500);
        }
    }, 1500);
}

// ESTO REPARA EL ERROR DE "NOT DEFINED" EN TU CONSOLA
window.motorAcompanamiento = ejecutarAcompanamiento;
    // --- 5. MOTOR INICIAL ---
    function motorInicial() {
        const filas = Array.from(document.querySelectorAll("tr")).filter(f => Array.from(f.querySelectorAll("button")).some(b => b.innerText.toUpperCase().includes("GUARDAR")));
        if (filas.length === 0) { PROCESO_ACTIVO = false; return; }
        procesarFilaInicial(filas, 0);
    }

    function procesarFilaInicial(filas, idx) {
        if (!filas[idx]) { saltarPagina("INICIAL"); return; }
        const fila = filas[idx], nombre = fila.innerText.split("\n")[0].trim().toUpperCase();
        if (filasProcesadasInicial.includes(nombre)) return procesarFilaInicial(filas, idx + 1);
        const notas = BASE_DATOS[nombre];
        if (notas) {
            fila.querySelectorAll("input").forEach((input, i) => {
                const nota = (notas[i] || "").trim();
                if (ESCALA_INICIAL.includes(nota)) {
                    input.click();
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    setter.call(input, nota);
                    ["input", "change", "blur"].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
                }
            });
            setTimeout(() => {
                const btnG = Array.from(fila.querySelectorAll("button")).find(b => b.innerText.toUpperCase().includes("GUARDAR"));
                if (btnG) { 
                    btnG.click(); 
                    filasProcesadasInicial.push(nombre); 
                    setTimeout(() => {
                        Array.from(document.querySelectorAll("button")).find(b => ["OK", "ACEPTAR", "SI", "SÍ"].includes(b.innerText.toUpperCase().trim()))?.click();
                        procesarFilaInicial(filas, idx + 1);
                    }, 2500);
                } else procesarFilaInicial(filas, idx + 1);
            }, 2000);
        } else procesarFilaInicial(filas, idx + 1);
    }

    // --- 6. MOTOR NOTAS CUANTITATIVAS ---
    function motorCuantitativo() {
        const filas = Array.from(document.querySelectorAll("tbody tr")), offset = (PAGINA_CUANTI - 1) * 5;
        function procesar(idx) {
            if (idx >= filas.length) { saltarPagina("CUANTI"); return; }
            const input = filas[idx].querySelector("input"), nota = BASE_NOTAS_CUANTI[offset + idx];
            if (input && nota) {
                input.focus(); 
                input.value = nota; 
                ["input", "change"].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
                setTimeout(() => { 
                    Array.from(filas[idx].querySelectorAll("button")).find(b => b.innerText.toUpperCase().includes("GUARDAR"))?.click(); 
                    setTimeout(() => procesar(idx + 1), 2500); 
                }, 1200);
            } else procesar(idx + 1);
        }
        procesar(0);
    }

    // --- 7. MÓDULO ELIMINAR ---
    function iniciarEliminacion() {
        if (!confirm("⚠️ ¿BORRAR TODAS LAS NOTAS DE ESTA VISTA?")) return;
        if (prompt("Escriba 'BORRAR' para confirmar:") !== "BORRAR") return;
        PROCESO_ACTIVO = true;
        const filas = Array.from(document.querySelectorAll("tr")).filter(f => f.querySelector("input, select"));
        function borrarAlumno(idx) {
            if (idx >= filas.length) { alert("✅ LIMPIEZA TERMINADA"); location.reload(); return; }
            const inputs = filas[idx].querySelectorAll("input, select");
            inputs.forEach(el => { el.value = ""; el.dispatchEvent(new Event('change', { bubbles: true })); });
            setTimeout(() => {
                const btnG = Array.from(filas[idx].querySelectorAll("button")).find(b => b.innerText.toUpperCase().includes("GUARDAR"));
                if (btnG) { btnG.click(); setTimeout(() => borrarAlumno(idx + 1), 2500); } 
                else borrarAlumno(idx + 1);
            }, 1000);
        }
        borrarAlumno(0);
    }

    // --- 8. NAVEGACIÓN ENTRE PÁGINAS ---
    function saltarPagina(modo) {
        const sig = Array.from(document.querySelectorAll("button, a")).find(b => b.innerText.toUpperCase().includes("SIGUIENTE") && !b.disabled);
        if (sig) { 
            sig.click(); 
            setTimeout(() => { 
                if (modo === "INICIAL") motorInicial(); 
                else if (modo === "ACOMPA") { indiceAcompa = 0; motorAcompanamiento(); } 
                else { PAGINA_CUANTI++; motorCuantitativo(); } 
            }, 6000); 
        } else { 
            PROCESO_ACTIVO = false; 
            sessionStorage.removeItem("TIGA_DATA");
            sessionStorage.removeItem("TIGA_CUANTI");
            alert("🏁 PROCESO FINALIZADO CON ÉXITO"); 
        }
    }

    // --- BIENVENIDA VISUAL ---
    function mostrarBienvenida() {
        if (document.getElementById("tiga_banner")) return;
        const banner = document.createElement("div");
        banner.id = "tiga_banner";
        banner.innerHTML = `<img src="${URL_LOGO}" style="height: 100px; margin-bottom: 15px; border-radius: 10px;"><div style="font-weight: bold; font-size: 18px;">${EMPRESA}</div>`;
        Object.assign(banner.style, { position: "fixed", top: "50px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#2c3e50", color: "white", padding: "25px 50px", borderRadius: "20px", zIndex: "1000000", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.7)", border: "2px solid #34495e" });
        document.body.appendChild(banner);
        setTimeout(() => { banner.style.opacity = "0"; setTimeout(() => banner.remove(), 600); }, 3500);
    }

    function colocarLogoFijo() {
        if (document.getElementById("tigas_logo_fijo")) return;
        const mini = document.createElement("img");
        mini.id = "tigas_logo_fijo"; mini.src = URL_LOGO;
        Object.assign(mini.style, { position: "fixed", bottom: "250px", right: "25px", width: "70px", zIndex: "99999", borderRadius: "8px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" });
        document.body.appendChild(mini);
    }

    iniciar();
    // --- FUNCIÓN QUE EL ERROR DICE QUE FALTA ---
    window.motorAcompanamiento = async function() {
        await ejecutarAcompanamiento();
    };

    async function ejecutarAcompanamiento() {
        const NOMBRE_IE = "SAN JOSE DE RARANGA";
        if (!document.body.innerText.includes(NOMBRE_IE)) {
            alert("❌ Acceso Denegado");
            return;
        }

        // Aquí usamos la lógica de tu código de éxito
        const inputNombre = document.querySelector('input[readonly], .form-control[disabled]');
        if (!inputNombre) { alert("❌ Selecciona un alumno primero."); return; }

        const nombrePantalla = inputNombre.value.trim().toUpperCase();
        
        // Buscamos en el mapa de GitHub
        if (!CONFIG || !CONFIG.acompanamiento_mapa) {
            alert("❌ Error: No hay datos de acompañamiento en GitHub (config.json)");
            return;
        }
        
        const misNotas = CONFIG.acompanamiento_mapa[nombrePantalla];
        if (!misNotas) {
            alert("❓ No encontré a '" + nombrePantalla + "' en la lista de GitHub.");
            return;
        }

        const mapaTexto = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };
        const selects = Array.from(document.querySelectorAll('select, mat-select'));

        for (let i = 0; i < selects.length; i++) {
            const sel = selects[i];
            const textoLargo = mapaTexto[misNotas[i]];

            if (textoLargo) {
                // CLIC REAL PARA QUE EL BOTÓN GUARDAR SE ACTIVE
                sel.click(); 
                await new Promise(r => setTimeout(r, 400));
                const opciones = document.querySelectorAll('mat-option');
                for (let opt of opciones) {
                    if (opt.innerText.trim() === textoLargo) {
                        opt.click(); // Esto activa el guardado en la web
                        break;
                    }
                }
            }
        }

        // GUARDADO AUTOMÁTICO
        setTimeout(() => {
            const btnGuardar = document.querySelector('button.btn-primary, .btn-success, button[type="submit"]');
            if (btnGuardar) {
                btnGuardar.click();
                console.log("✅ Guardado enviado.");
            }
        }, 1000);
    }
})();
