// ==UserScript==
// @name         ROBOT MAESTRO - TIGA FULL PRO
// @namespace    TIGA_INNOVACION_GESTION
// @version      23.6
// @description  Robot Unificado TIGA - Con Módulo de Eliminación y Guardado Seguro
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

    // --- IDENTIDAD TIGA TENE ---
    const EMPRESA = "TIGA: TENE INNOVACIÓN Y GESTIÓN ACADÉMICA";
    const timestamp = Date.now();
    const URL_LOGO = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/WhatsApp%20Image%202026-05-09%20at%2006.51.35%20PM.jpeg?v=" + timestamp;
    const JSON_URL = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/config.json?v=" + timestamp;

    let CONFIG = null, INSTITUCION = null, BASE_DATOS = {}, BASE_NOTAS_CUANTI = [];
    let PAGINA_CUANTI = 1, indiceAcompa = 0, filasProcesadasInicial = [], PROCESO_ACTIVO = false;

    const ESCALA_INICIAL = ["A+", "A-", "B+", "B-", "C+", "C-", "D+", "D-", "E+", "E-"];
    const MAPA_ACOMPA = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };

    console.log("🚀 %s iniciado con Módulo de Eliminación.", EMPRESA);

    // --- SEGURIDAD Y BIENVENIDA ---
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

    // --- NÚCLEO DE OPERACIÓN ---
    function iniciar() {
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
                } catch(e) { console.error("Error al cargar configuración:", e); }
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

    function pintarInterfaz() {
        if (document.getElementById("cont_sjr")) return;
        const cont = document.createElement("div"); 
        cont.id = "cont_sjr"; 
        document.body.appendChild(cont);
        
        // Botones Principales
        crearBoton("📋 ACOMPAÑAMIENTO", "#8e44ad", "140px", () => capturarExcel("ACOMPA"));
        crearBoton("🧒 ROBOT INICIAL", "#009933", "80px", () => capturarExcel("INICIAL"));
        crearBoton("🤖 NOTAS CUANTI", "#0066ff", "20px", () => capturarExcel("CUANTI"));
        
        // BOTÓN ELIMINAR (ROJO)
        crearBoton("🗑️ ELIMINAR TODO", "#cc0000", "200px", () => iniciarEliminacion());
    }

    function crearBoton(txt, col, bot, accion) {
        const b = document.createElement("button"); 
        b.innerText = txt;
        Object.assign(b.style, { position: "fixed", bottom: bot, right: "20px", zIndex: "99999", padding: "12px", background: col, color: "white", borderRadius: "10px", fontWeight: "bold", border: "none", cursor: "pointer", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" });
        b.onclick = accion; 
        document.getElementById("cont_sjr").appendChild(b);
    }

    // --- MÓDULO DE ELIMINACIÓN ---
    function iniciarEliminacion() {
        if (!confirm("⚠️ ¿ESTÁS SEGURO? Se borrarán TODAS las notas cargadas en esta vista.")) return;
        const dobleCheck = prompt("Escriba 'BORRAR' para confirmar:");
        if (dobleCheck !== "BORRAR") return;
        
        PROCESO_ACTIVO = true;
        const filas = Array.from(document.querySelectorAll("tr")).filter(f => f.querySelector("input, select"));
        
        function borrarAlumno(idx) {
            if (idx >= filas.length) { alert("✅ LIMPIEZA TERMINADA"); location.reload(); return; }
            
            const inputs = filas[idx].querySelectorAll("input, select");
            inputs.forEach(el => {
                el.value = "";
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            setTimeout(() => {
                const btnG = Array.from(filas[idx].querySelectorAll("button")).find(b => b.innerText.toUpperCase().includes("GUARDAR"));
                if (btnG) {
                    btnG.click();
                    setTimeout(() => borrarAlumno(idx + 1), 2200); // Espera de seguridad
                } else borrarAlumno(idx + 1);
            }, 1000);
        }
        borrarAlumno(0);
    }

    function capturarExcel(modo) {
        if (PROCESO_ACTIVO) return;
        let raw = prompt(`📊 MÓDULO ${modo}:`); 
        if (!raw) return;
        PROCESO_ACTIVO = true;
        if (modo === "CUANTI") { 
            BASE_NOTAS_CUANTI = raw.split(/\n/).map(x => x.trim().replace(",", ".")).filter(x => x !== ""); 
            PAGINA_CUANTI = 1; 
            motorCuantitativo(); 
        } else {
            BASE_DATOS = {}; 
            raw.split(/\n/).forEach(f => { 
                const c = f.split(/\t/); 
                if (c.length > 1) BASE_DATOS[c[0].trim().toUpperCase()] = c.slice(1).map(n => n.trim().toUpperCase()); 
            });
            if (modo === "ACOMPA") { indiceAcompa = 0; motorAcompanamiento(); } 
            else { filasProcesadasInicial = []; motorInicial(); }
        }
    }

    // --- MOTORES ACTUALIZADOS CON MÁS ESPERA PARA GUARDADO SEGURO ---
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
                    }, 2500); // Aumentado para asegurar guardado
                } else procesarFilaInicial(filas, idx + 1);
            }, 2000);
        } else procesarFilaInicial(filas, idx + 1);
    }

    function motorAcompanamiento() {
        const botones = Array.from(document.querySelectorAll('button')).filter(btn => btn.innerText.includes("Seleccionar"));
        if (indiceAcompa >= botones.length) { saltarPagina("ACOMPA"); return; }
        botones[indiceAcompa].click();
        setTimeout(() => {
            const selT = document.querySelector('select');
            if (selT) { 
                selT.selectedIndex = 1; 
                selT.dispatchEvent(new Event('change', { bubbles: true })); 
                setTimeout(llenarFichaAcompa, 2800); 
            }
        }, 2500);
    }

    function llenarFichaAcompa() {
        const inputN = document.querySelector('input[readonly], .form-control[disabled]'), 
              nombre = (inputN?.value || inputN?.innerText || "").trim().toUpperCase();
        const notas = BASE_DATOS[nombre];
        if (notas) {
            Array.from(document.querySelectorAll('select')).filter(s => s.innerText.includes("Seleccione")).forEach((sel, i) => {
                const tBuscado = MAPA_ACOMPA[notas[i]];
                if (tBuscado) { 
                    for (let opt of sel.options) { 
                        if (opt.text.trim().toUpperCase().includes(tBuscado)) { 
                            sel.value = opt.value; 
                            sel.dispatchEvent(new Event('change', { bubbles: true })); 
                            break; 
                        } 
                    } 
                }
            });
            setTimeout(() => { 
                document.querySelector('button.btn-success, button.btn-primary')?.click(); 
                setTimeout(() => {
                    const btnV = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes("Volver"));
                    if (btnV) { 
                        btnV.click(); 
                        indiceAcompa++; 
                        setTimeout(motorAcompanamiento, 4000); // Aumentado para estabilidad del servidor
                    }
                }, 3000); 
            }, 1500);
        }
    }

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
                    setTimeout(() => procesar(idx + 1), 2500); // Aumentado para asegurar día 11 y otros
                }, 1200);
            } else procesar(idx + 1);
        }
        procesar(0);
    }

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
            alert("🏁 PROCESO FINALIZADO"); 
        }
    }

    iniciar();
})();
