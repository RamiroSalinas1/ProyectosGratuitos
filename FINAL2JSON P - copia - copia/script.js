"use strict";

// ======================
// CONFIGURACIÓN INICIAL
// ======================

// Objeto para cachear recursos
const recursosCache = {};

// Lista de categorías permitidas
const CATEGORIAS_PERMITIDAS = [
    'programacion', 'diseno', 'idiomas', 'libros', 
    'ofimatica', 'negocios', 'fotografia', 'video', 
    'manualidades', 'videojuegos', 'otros', 'entretenimiento'
];

// ======================
// FUNCIONES PRINCIPALES
// ======================

/**
 * Sanitiza un enlace sin bloquear dominios
 * @param {string} url - Enlace a sanitizar
 * @returns {string} Enlace sanitizado o '#' si no es válido
 */
function sanitizarEnlace(url) {
    if (!url || typeof url !== 'string') return '#';
    
    try {
        const urlObj = new URL(url);
        
        // Forzar HTTPS si es posible
        if (urlObj.protocol === 'http:') {
            urlObj.protocol = 'https:';
            console.log(`Enlace actualizado a HTTPS: ${urlObj.href}`);
            return urlObj.href;
        }
        
        return url;
    } catch (e) {
        console.warn('Enlace no válido sanitizado:', url);
        return '#';
    }
}

/**
 * Carga recursos desde JSON con cache
 * @param {string} categoria - Categoría de recursos a cargar
 */
async function cargarRecursos(categoria) {
    // Validar categoría
    if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
        console.error('Categoría no permitida:', categoria);
        return;
    }

    // Usar caché si está disponible
    if (recursosCache[categoria]) {
        mostrarRecursos(categoria, recursosCache[categoria]);
        return;
    }

    try {
        const response = await fetch(`data/${categoria}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const recursos = await response.json();
        
        // Sanitizar todos los enlaces
        const recursosSanitizados = recursos.map(recurso => ({
            ...recurso,
            enlace: sanitizarEnlace(recurso.enlace)
        }));
        
        recursosCache[categoria] = recursosSanitizados;
        mostrarRecursos(categoria, recursosSanitizados);
    } catch (error) {
        console.error(`Error cargando ${categoria}:`, error);
        mostrarErrorCarga(categoria);
    }
}

/**
 * Muestra los recursos en el DOM
 * @param {string} categoria - Categoría actual
 * @param {Array} recursos - Lista de recursos
 */
function mostrarRecursos(categoria, recursos) {
    const contenedor = document.querySelector(`#${categoria} .contenedor-recursos`);
    if (!contenedor) return;
    
    contenedor.innerHTML = '';

    if (recursos.length === 0) {
        contenedor.innerHTML = `<p class="sin-recursos">Actualmente no hay recursos disponibles en esta categoría.</p>`;
        return;
    }

    recursos.forEach((recurso, index) => {
        const recursoHTML = document.createElement('div');
        recursoHTML.className = `recurso rot-${index % 4}`;
        
        recursoHTML.innerHTML = `
            <div class="recurso-titulo">${escapeHTML(recurso.titulo)}</div>
            <div class="recurso-desc">${escapeHTML(recurso.descripcion)}</div>
            <a href="${recurso.enlace}" class="recurso-enlace" target="_blank" rel="noopener noreferrer nofollow">
                ${esEnlaceDescarga(recurso.enlace) ? 'Descargar' : 'Acceder'}
            </a>
            <span class="recurso-plataforma">${escapeHTML(recurso.plataforma)}</span>
            ${recurso.tamano ? `<div class="recurso-tamano">${escapeHTML(recurso.tamano)}</div>` : ''}
        `;
        
        contenedor.appendChild(recursoHTML);
    });

    ajustarBotonesDescarga();
    contarRecursos();
}

// ======================
// FUNCIONES AUXILIARES
// ======================

/**
 * Escapa HTML para prevenir XSS
 * @param {string} str - Texto a escapar
 * @returns {string} Texto seguro
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Determina si un enlace es para descarga
 * @param {string} url - Enlace a verificar
 * @returns {boolean} True si es enlace de descarga
 */
function esEnlaceDescarga(url) {
    if (!url) return false;
    return ['drive.google.com', 'mega.nz', 'mediafire.com', 'teraboxapp.com']
        .some(dominio => url.includes(dominio));
}

/**
 * Muestra mensaje de error
 * @param {string} categoria - Categoría con error
 */
function mostrarErrorCarga(categoria) {
    const contenedor = document.querySelector(`#${categoria} .contenedor-recursos`);
    if (contenedor) {
        contenedor.innerHTML = `<p class="error-carga">⚠️ No se pudieron cargar los recursos. Intenta más tarde.</p>`;
    }
}

/**
 * Ajusta el ancho de los botones de descarga
 */
function ajustarBotonesDescarga() {
    document.querySelectorAll('.recurso-enlace').forEach(boton => {
        boton.style.maxWidth = 'fit-content';
    });
}

/**
 * Cuenta y muestra el total de recursos
 */
function contarRecursos() {
    const totalRecursos = document.querySelectorAll('.recurso').length;
    const contadorElemento = document.getElementById('total-recursos');
    
    if (contadorElemento) {
        contadorElemento.textContent = totalRecursos + '+';
        contadorElemento.style.transform = 'scale(1.2)';
        setTimeout(() => {
            contadorElemento.style.transform = 'scale(1)';
        }, 300);
    }
}

// ======================
// FUNCIONES DE INTERFAZ
// ======================

/**
 * Cambia entre pestañas/categorías
 * @param {string} tabName - Nombre de la pestaña a mostrar
 */
function openTab(tabName) {
    if (!CATEGORIAS_PERMITIDAS.includes(tabName)) return;
    
    // Remover clase 'active' de todos los contenidos y tags
    document.querySelectorAll('.tab-content, .tag').forEach(el => {
        el.classList.remove('active');
    });
    
    // Activar pestaña seleccionada
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    // Cargar recursos si no están cargados
    if (document.querySelector(`#${tabName} .contenedor-recursos`).children.length === 0) {
        cargarRecursos(tabName);
    }
}

/**
 * Precarga recursos en segundo plano
 */
function precargarRecursos() {
    CATEGORIAS_PERMITIDAS.forEach(categoria => {
        fetch(`data/${categoria}.json`)
            .then(response => response.json())
            .then(data => {
                // Sanitizar enlaces al precargar
                recursosCache[categoria] = data.map(recurso => ({
                    ...recurso,
                    enlace: sanitizarEnlace(recurso.enlace)
                }));
            })
            .catch(error => console.error(`Error precargando ${categoria}:`, error));
    });
}

// ======================
// INICIALIZACIÓN
// ======================

document.addEventListener('DOMContentLoaded', function() {
    // Cargar primera pestaña
    cargarRecursos('programacion');
    
    // Configurar primera pestaña como activa
    const primeraTag = document.querySelector('.tag');
    if (primeraTag) {
        primeraTag.classList.add('active');
    }
    
    // Precargar recursos
    precargarRecursos();
    
    // Protección básica contra hotkeys
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
        }
    });
});