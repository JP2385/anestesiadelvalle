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

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var jwt_decode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jwt-decode */ \"./node_modules/jwt-decode/build/esm/index.js\");\n\ndocument.addEventListener('DOMContentLoaded', function () {\n  var maxIdleTimePC = 10 * 1000;\n  var idleTime = 0;\n  function isMobileDevice() {\n    return /Mobi|Android/i.test(navigator.userAgent);\n  }\n  var maxIdleTime = isMobileDevice() ? Infinity : maxIdleTimePC;\n  console.log(\"Max idle time set to: \".concat(maxIdleTime));\n  function resetIdleTimer() {\n    if (maxIdleTime !== Infinity) {\n      // Solo reiniciar el temporizador en PC\n      idleTime = 0;\n      sessionStorage.setItem('sessionExpiry', Date.now() + maxIdleTime);\n      console.log(\"Idle timer reset. Session expiry set to: \".concat(Date.now() + maxIdleTime));\n    }\n  }\n  function checkIdleTime() {\n    if (maxIdleTime !== Infinity) {\n      // Solo verificar el tiempo de inactividad en PC\n      idleTime += 1000;\n      console.log(\"Idle time incremented: \".concat(idleTime));\n      if (idleTime >= maxIdleTime) {\n        alert('Sesión expirada por inactividad.');\n        console.log('Session expired due to inactivity.');\n        localStorage.removeItem('token');\n        sessionStorage.removeItem('token');\n        sessionStorage.removeItem('sessionExpiry');\n        window.location.href = 'login.html';\n        return;\n      }\n    }\n  }\n  function isTokenExpired(token) {\n    try {\n      var decodedToken = (0,jwt_decode__WEBPACK_IMPORTED_MODULE_0__.jwtDecode)(token); // Usar jwtDecode del paquete\n      var currentTime = Date.now() / 1000;\n      console.log(\"Token expiry time: \".concat(decodedToken.exp, \", Current time: \").concat(currentTime));\n      return decodedToken.exp < currentTime;\n    } catch (error) {\n      console.error('Failed to decode token:', error.message);\n      console.error('Token:', token); // Agregar detalles del token para depuración\n      return true; // Consider the token expired if it cannot be decoded\n    }\n  }\n  var token = localStorage.getItem('token') || sessionStorage.getItem('token');\n  console.log('Token found:', token);\n  if (!token) {\n    alert('No has iniciado sesión.');\n    console.log('No token found. Redirecting to login.');\n    localStorage.removeItem('token');\n    sessionStorage.removeItem('token');\n    sessionStorage.removeItem('sessionExpiry');\n    window.location.href = 'login.html';\n  } else if (isTokenExpired(token)) {\n    alert('Tu sesión ha expirado.');\n    console.log('Token expired. Redirecting to login.');\n    localStorage.removeItem('token');\n    sessionStorage.removeItem('token');\n    sessionStorage.removeItem('sessionExpiry');\n    window.location.href = 'login.html';\n  } else {\n    var sessionExpiry = sessionStorage.getItem('sessionExpiry');\n    console.log(\"Session expiry from storage: \".concat(sessionExpiry));\n    if (sessionExpiry && Date.now() > sessionExpiry) {\n      alert('Sesión expirada por inactividad.');\n      console.log('Session expired due to inactivity from storage.');\n      localStorage.removeItem('token');\n      sessionStorage.removeItem('token');\n      sessionStorage.removeItem('sessionExpiry');\n      window.location.href = 'login.html';\n    } else {\n      resetIdleTimer();\n    }\n  }\n  if (maxIdleTime !== Infinity) {\n    window.onload = resetIdleTimer;\n    document.onmousemove = resetIdleTimer;\n    document.onkeypress = resetIdleTimer;\n    document.onclick = resetIdleTimer;\n    document.onscroll = resetIdleTimer;\n    document.onkeydown = resetIdleTimer;\n    setInterval(checkIdleTime, 1000);\n  }\n});\n\n//# sourceURL=webpack://adv/./frontend/js/sessionManager.js?");

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