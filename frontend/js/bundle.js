/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./frontend/js/sessionManager.js":
/*!***************************************!*\
  !*** ./frontend/js/sessionManager.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var jwt_decode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jwt-decode */ \"./node_modules/jwt-decode/build/esm/index.js\");\n/* harmony import */ var _toast_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./toast.js */ \"./frontend/js/toast.js\");\n\n\ndocument.addEventListener('DOMContentLoaded', function () {\n  var maxIdleTimePC = 3 * 60 * 60 * 1000; // 3 horas para PC\n  var idleTime = 0;\n  function isMobileDevice() {\n    return /Mobi|Android/i.test(navigator.userAgent);\n  }\n  var maxIdleTime = isMobileDevice() ? Infinity : maxIdleTimePC;\n  function resetIdleTimer() {\n    if (maxIdleTime !== Infinity) {\n      idleTime = 0; // Reinicia el temporizador de inactividad\n      var sessionExpiry = Date.now() + maxIdleTime; // Define el tiempo de expiración\n      sessionStorage.setItem('sessionExpiry', sessionExpiry);\n      // console.log(`Idle timer reset. Session expiry set to: ${new Date(sessionExpiry).toUTCString()}`);\n    }\n  }\n  function checkIdleTime() {\n    if (maxIdleTime !== Infinity) {\n      idleTime += 1000; // Incrementar cada segundo\n      var sessionExpiry = sessionStorage.getItem('sessionExpiry');\n      // console.log('Idle time:', idleTime, 'Session expiry:', new Date(parseInt(sessionExpiry)).toUTCString());\n      if (idleTime >= maxIdleTime || sessionExpiry && Date.now() > sessionExpiry) {\n        _toast_js__WEBPACK_IMPORTED_MODULE_1__[\"default\"].warning('Sesión expirada por inactividad.');\n        sessionStorage.removeItem('sessionExpiry');\n        setTimeout(function () {\n          return window.location.href = 'login.html';\n        }, 1500);\n        return;\n      }\n    }\n  }\n  function isTokenExpired(token) {\n    try {\n      var decodedToken = (0,jwt_decode__WEBPACK_IMPORTED_MODULE_0__.jwtDecode)(token);\n      var currentTime = Date.now() / 1000;\n      // console.log(`Token expiry time: ${decodedToken.exp}, Current time: ${currentTime}`);\n      return decodedToken.exp < currentTime;\n    } catch (error) {\n      console.error('Failed to decode token:', error.message);\n      return true; // Si no se puede decodificar, se considera expirado\n    }\n  }\n\n  // Verificar si el token está presente (el script inline del index ya verificó, esto es redundancia)\n  var token = localStorage.getItem('token') || sessionStorage.getItem('token');\n  if (!token) {\n    // Si no hay token, redirigir sin toast (ya debería haber sido redirigido)\n    window.location.href = 'login.html';\n    return;\n  } else if (isTokenExpired(token)) {\n    // Si el token expiró, limpiar y redirigir sin toast\n    localStorage.removeItem('token');\n    sessionStorage.removeItem('token');\n    sessionStorage.removeItem('sessionExpiry');\n    window.location.href = 'login.html';\n    return;\n  } else {\n    var sessionExpiry = sessionStorage.getItem('sessionExpiry');\n    var currentTime = Date.now();\n    if (sessionExpiry && currentTime > sessionExpiry) {\n      _toast_js__WEBPACK_IMPORTED_MODULE_1__[\"default\"].warning('Sesión expirada por inactividad.');\n      sessionStorage.removeItem('sessionExpiry');\n      setTimeout(function () {\n        return window.location.href = 'login.html';\n      }, 1500);\n    } else {\n      resetIdleTimer(); // Reiniciar el temporizador si todo está bien\n    }\n  }\n\n  // Eventos que reinician el temporizador de inactividad\n  if (maxIdleTime !== Infinity) {\n    window.onload = resetIdleTimer;\n    document.onmousemove = resetIdleTimer;\n    document.onkeypress = resetIdleTimer;\n    document.onclick = resetIdleTimer;\n    document.onscroll = resetIdleTimer;\n    document.onkeydown = resetIdleTimer;\n    setInterval(checkIdleTime, 1000); // Comprobación cada segundo\n  }\n});\n\n//# sourceURL=webpack://adv/./frontend/js/sessionManager.js?");

/***/ }),

/***/ "./frontend/js/toast.js":
/*!******************************!*\
  !*** ./frontend/js/toast.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\nfunction _typeof(o) { \"@babel/helpers - typeof\"; return _typeof = \"function\" == typeof Symbol && \"symbol\" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && \"function\" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? \"symbol\" : typeof o; }, _typeof(o); }\nfunction _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError(\"Cannot call a class as a function\"); }\nfunction _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, \"value\" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }\nfunction _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, \"prototype\", { writable: !1 }), e; }\nfunction _toPropertyKey(t) { var i = _toPrimitive(t, \"string\"); return \"symbol\" == _typeof(i) ? i : i + \"\"; }\nfunction _toPrimitive(t, r) { if (\"object\" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || \"default\"); if (\"object\" != _typeof(i)) return i; throw new TypeError(\"@@toPrimitive must return a primitive value.\"); } return (\"string\" === r ? String : Number)(t); }\n// Sistema de notificaciones Toast\nvar ToastManager = /*#__PURE__*/function () {\n  function ToastManager() {\n    _classCallCheck(this, ToastManager);\n    this.container = null;\n    this.init();\n  }\n  return _createClass(ToastManager, [{\n    key: \"init\",\n    value: function init() {\n      var _this = this;\n      // Crear el contenedor si no existe\n      if (!document.querySelector('.toast-container')) {\n        this.container = document.createElement('div');\n        this.container.className = 'toast-container';\n        // Asegurar que el body existe antes de append\n        if (document.body) {\n          document.body.appendChild(this.container);\n        } else {\n          // Si el body no existe aún, esperar a que el DOM esté listo\n          document.addEventListener('DOMContentLoaded', function () {\n            if (!document.querySelector('.toast-container')) {\n              document.body.appendChild(_this.container);\n            }\n          });\n        }\n      } else {\n        this.container = document.querySelector('.toast-container');\n      }\n    }\n  }, {\n    key: \"ensureContainer\",\n    value: function ensureContainer() {\n      // Asegurar que el contenedor existe cada vez que se usa\n      if (!this.container || !document.body.contains(this.container)) {\n        this.init();\n      }\n    }\n  }, {\n    key: \"show\",\n    value: function show(message) {\n      var _this2 = this;\n      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';\n      var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;\n      this.ensureContainer(); // Verificar contenedor antes de usar\n\n      var toast = document.createElement('div');\n      toast.className = \"toast \".concat(type);\n      var icons = {\n        success: '✓',\n        error: '✕',\n        warning: '⚠',\n        info: 'ℹ'\n      };\n      toast.innerHTML = \"\\n            <div class=\\\"toast-icon\\\">\".concat(icons[type] || icons.info, \"</div>\\n            <div class=\\\"toast-content\\\">\").concat(message, \"</div>\\n            <button class=\\\"toast-close\\\" aria-label=\\\"Cerrar\\\">\\xD7</button>\\n        \");\n      this.container.appendChild(toast);\n\n      // Cerrar al hacer clic en la X\n      var closeBtn = toast.querySelector('.toast-close');\n      closeBtn.addEventListener('click', function () {\n        return _this2.hide(toast);\n      });\n\n      // Auto-cerrar después de la duración especificada\n      if (duration > 0) {\n        setTimeout(function () {\n          return _this2.hide(toast);\n        }, duration);\n      }\n      return toast;\n    }\n  }, {\n    key: \"hide\",\n    value: function hide(toast) {\n      toast.classList.add('hiding');\n      setTimeout(function () {\n        if (toast.parentNode) {\n          toast.parentNode.removeChild(toast);\n        }\n      }, 300);\n    }\n  }, {\n    key: \"success\",\n    value: function success(message) {\n      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 4000;\n      return this.show(message, 'success', duration);\n    }\n  }, {\n    key: \"error\",\n    value: function error(message) {\n      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5000;\n      return this.show(message, 'error', duration);\n    }\n  }, {\n    key: \"warning\",\n    value: function warning(message) {\n      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 4500;\n      return this.show(message, 'warning', duration);\n    }\n  }, {\n    key: \"info\",\n    value: function info(message) {\n      var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 4000;\n      return this.show(message, 'info', duration);\n    }\n\n    // Función para reemplazar confirm()\n  }, {\n    key: \"confirm\",\n    value: function confirm(message, onConfirm, onCancel) {\n      var _this3 = this;\n      this.ensureContainer(); // Verificar contenedor antes de usar\n\n      var toast = document.createElement('div');\n      toast.className = 'toast toast-confirm';\n      toast.innerHTML = \"\\n            <div class=\\\"toast-message\\\">\".concat(message, \"</div>\\n            <div class=\\\"toast-buttons\\\">\\n                <button class=\\\"toast-btn toast-btn-cancel\\\">Cancelar</button>\\n                <button class=\\\"toast-btn toast-btn-confirm\\\">Confirmar</button>\\n            </div>\\n        \");\n      this.container.appendChild(toast);\n      var cancelBtn = toast.querySelector('.toast-btn-cancel');\n      var confirmBtn = toast.querySelector('.toast-btn-confirm');\n      cancelBtn.addEventListener('click', function () {\n        _this3.hide(toast);\n        if (onCancel) onCancel();\n      });\n      confirmBtn.addEventListener('click', function () {\n        _this3.hide(toast);\n        if (onConfirm) onConfirm();\n      });\n      return toast;\n    }\n  }]);\n}(); // Crear instancia global\nvar toast = new ToastManager();\n\n// Exportar para uso en módulos\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (toast);\n\n//# sourceURL=webpack://adv/./frontend/js/toast.js?");

/***/ }),

/***/ "./node_modules/jwt-decode/build/esm/index.js":
/*!****************************************************!*\
  !*** ./node_modules/jwt-decode/build/esm/index.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   InvalidTokenError: () => (/* binding */ InvalidTokenError),\n/* harmony export */   jwtDecode: () => (/* binding */ jwtDecode)\n/* harmony export */ });\nclass InvalidTokenError extends Error {\n}\nInvalidTokenError.prototype.name = \"InvalidTokenError\";\nfunction b64DecodeUnicode(str) {\n    return decodeURIComponent(atob(str).replace(/(.)/g, (m, p) => {\n        let code = p.charCodeAt(0).toString(16).toUpperCase();\n        if (code.length < 2) {\n            code = \"0\" + code;\n        }\n        return \"%\" + code;\n    }));\n}\nfunction base64UrlDecode(str) {\n    let output = str.replace(/-/g, \"+\").replace(/_/g, \"/\");\n    switch (output.length % 4) {\n        case 0:\n            break;\n        case 2:\n            output += \"==\";\n            break;\n        case 3:\n            output += \"=\";\n            break;\n        default:\n            throw new Error(\"base64 string is not of the correct length\");\n    }\n    try {\n        return b64DecodeUnicode(output);\n    }\n    catch (err) {\n        return atob(output);\n    }\n}\nfunction jwtDecode(token, options) {\n    if (typeof token !== \"string\") {\n        throw new InvalidTokenError(\"Invalid token specified: must be a string\");\n    }\n    options || (options = {});\n    const pos = options.header === true ? 0 : 1;\n    const part = token.split(\".\")[pos];\n    if (typeof part !== \"string\") {\n        throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);\n    }\n    let decoded;\n    try {\n        decoded = base64UrlDecode(part);\n    }\n    catch (e) {\n        throw new InvalidTokenError(`Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`);\n    }\n    try {\n        return JSON.parse(decoded);\n    }\n    catch (e) {\n        throw new InvalidTokenError(`Invalid token specified: invalid json for part #${pos + 1} (${e.message})`);\n    }\n}\n\n\n//# sourceURL=webpack://adv/./node_modules/jwt-decode/build/esm/index.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./frontend/js/sessionManager.js");
/******/ 	
/******/ })()
;