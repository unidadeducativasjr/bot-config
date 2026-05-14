// ==UserScript==
// @name         ROBOT MAESTRO - TIGA FULL PRO (TOTAL)
// @namespace    TIGA_INNOVACION_GESTION
// @version 25.4
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
// ======================================
// BLOQUEAR ERRORES VISUALES ANGULAR
// ======================================

window.addEventListener("error", function(e) {

    const msg = (
        e.message || ""
    ).toLowerCase();

    if (
        msg.includes("filter") ||
        msg.includes("undefined")
    ) {

        console.log(
            "⚠️ ERROR ANGULAR IGNORADO"
        );

        e.preventDefault();

        return true;
    }
});

window.addEventListener(
    "unhandledrejection",
    function(e) {

        const msg = String(
            e.reason || ""
        ).toLowerCase();

        if (
            msg.includes("filter") ||
            msg.includes("undefined")
        ) {

            console.log(
                "⚠️ PROMESA ANGULAR IGNORADA"
            );

            e.preventDefault();
        }
    }
);
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
// Función auxiliar para esperar a que los elementos carguen en el DOM
const esperarElemento = (selector, tiempoMax = 10000) => {
    return new Promise((resolve) => {
        const inicio = Date.now();
        const intervalo = setInterval(() => {
            const el = document.querySelectorAll(selector);
            if (el.length > 1 || (Date.now() - inicio) > tiempoMax) {
                clearInterval(intervalo);
                resolve(Array.from(el));
            }
        }, 500);
    });
};

async function ejecutarAcompanamiento() {
    console.log("🚀 MOTOR INICIADO - MODO PERSISTENTE Y ANTI-BLOQUEO");

    try {
        const alumnoAbierto = document.querySelector('input[readonly], .form-control[disabled]');

        // --- ESCENARIO A: LISTA DE ALUMNOS ---
        if (!alumnoAbierto) {
            console.log("📋 Buscando alumno pendiente...");
            const botones = Array.from(document.querySelectorAll("button")).filter(b => b.innerText.includes("Seleccionar"));
            for (let btn of botones) {
                const fila = btn.closest("tr");
                const nombre = fila ? fila.innerText.split("\n")[0].trim().toUpperCase() : "";
                if (nombre && typeof ALUMNOS_PROCESADOS !== 'undefined' && !ALUMNOS_PROCESADOS.includes(nombre)) {
                    btn.click();
                    return;
                }
            }
            return;
        }

        // --- ESCENARIO B: DENTRO DE LA FICHA ---
        const nombreAlumno = alumnoAbierto.value.trim().toUpperCase();
        const notas = BASE_DATOS[nombreAlumno];

        if (!notas) {
            console.error("❌ No hay notas para:", nombreAlumno);
            return;
        }

        // Espera necesaria para que Angular dibuje la tabla
        await new Promise(r => setTimeout(r, 2000));

        let selects = Array.from(document.querySelectorAll('mat-select')).filter(s => 
            !s.innerText.includes("TRIMESTRE") && !s.getAttribute('formcontrolname')?.includes('trimestre')
        );

        if (selects.length === 0) {
            console.log("⏳ Reintentando detectar cuadros...");
            setTimeout(ejecutarAcompanamiento, 2000);
            return;
        }

        const mapa = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };

        for (let i = 0; i < selects.length; i++) {
            const texto = mapa[notas[i]?.trim().toUpperCase()];
            if (texto && (selects[i].innerText.includes("Seleccione") || selects[i].innerText.trim() === "")) {
                selects[i].click();
                await new Promise(r => setTimeout(r, 700));
                const opciones = Array.from(document.querySelectorAll('mat-option'));
                const opt = opciones.find(o => o.innerText.trim().toUpperCase().includes(texto));
                if (opt) {
                    opt.click();
                    selects[i].dispatchEvent(new Event('change', { bubbles: true }));
                    selects[i].dispatchEvent(new Event('blur', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // --- EL CLIC EN EL BOTÓN AZUL DE CONFIRMACIÓN (Imagen cb6e40) ---
        console.log("💾 Guardando...");
        const btnGuardarVerde = document.querySelector('button.btn-success, .mat-success');
        if (btnGuardarVerde) {
            btnGuardarVerde.click();
            
            // Esperamos al cuadro azul "¿Desea Guardar?"
            await new Promise(r => setTimeout(r, 2000)); 

            const btnConfirmarAzul = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.toUpperCase().includes("GUARDAR") && 
                (b.classList.contains('btn-primary') || b.outerHTML.includes('blue') || b.classList.contains('swal2-confirm'))
            );

            if (btnConfirmarAzul) {
                console.log("🔵 Confirmando en el cuadro azul...");
                btnConfirmarAzul.click();
                await new Promise(r => setTimeout(r, 5000));

                // Registrar éxito (ajusta el nombre de tu variable de lista si es distinto)
                if (typeof ALUMNOS_PROCESADOS !== 'undefined') {
                    ALUMNOS_PROCESADOS.push(nombreAlumno);
                }

                // Cerrar popup final y volver
                const btnOk = Array.from(document.querySelectorAll('button')).find(b => 
                    ["OK", "ACEPTAR", "CERRAR"].includes(b.innerText.toUpperCase().trim())
                );
                if (btnOk) btnOk.click();

                const btnVolver = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Volver"));
                if (btnVolver) btnVolver.click();
            }
        }

    } catch (err) {
        console.log("🔄 Error detectado, reintentando...", err.message);
        setTimeout(ejecutarAcompanamiento, 3000);
    }
}
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

    /* --- INICIO Y CONEXIÓN FINAL --- */
iniciar(); 

// Conexión directa del botón morado con la función
window.motorAcompanamiento = ejecutarAcompanamiento; 

})(); // Cierre único del script
