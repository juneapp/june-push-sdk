(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.JunePushSDKModule = {}));
})(this, (function (exports) { 'use strict';

    const getDefaultsFromPostinstall = () => (undefined);

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const stringToByteArray$1 = function (str) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let p = 0;
        for (let i = 0; i < str.length; i++) {
            let c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    const byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        const out = [];
        let pos = 0, c = 0;
        while (pos < bytes.length) {
            const c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                const c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                const c4 = bytes[pos++];
                const u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                const c2 = bytes[pos++];
                const c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    // TODO(dlarocque): Define this as a class, since we no longer target ES5.
    const base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray(input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            const byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            const output = [];
            for (let i = 0; i < input.length; i += 3) {
                const byte1 = input[i];
                const haveByte2 = i + 1 < input.length;
                const byte2 = haveByte2 ? input[i + 1] : 0;
                const haveByte3 = i + 2 < input.length;
                const byte3 = haveByte3 ? input[i + 2] : 0;
                const outByte1 = byte1 >> 2;
                const outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                let outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                let outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray$1(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString(input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray(input, webSafe) {
            this.init_();
            const charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            const output = [];
            for (let i = 0; i < input.length;) {
                const byte1 = charToByteMap[input.charAt(i++)];
                const haveByte2 = i < input.length;
                const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                const haveByte3 = i < input.length;
                const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                const haveByte4 = i < input.length;
                const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw new DecodeBase64StringError();
                }
                const outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    const outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        const outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_() {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (let i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * An error encountered while decoding base64 string.
     */
    class DecodeBase64StringError extends Error {
        constructor() {
            super(...arguments);
            this.name = 'DecodeBase64StringError';
        }
    }
    /**
     * URL-safe base64 encoding
     */
    const base64Encode = function (str) {
        const utf8Bytes = stringToByteArray$1(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 encoding (without "." padding in the end).
     * e.g. Used in JSON Web Token (JWT) parts.
     */
    const base64urlEncodeWithoutPadding = function (str) {
        // Use base64url encoding and remove padding in the end (dot characters).
        return base64Encode(str).replace(/\./g, '');
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    const base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Polyfill for `globalThis` object.
     * @returns the `globalThis` object for the given environment.
     * @public
     */
    function getGlobal() {
        if (typeof self !== 'undefined') {
            return self;
        }
        if (typeof window !== 'undefined') {
            return window;
        }
        if (typeof global !== 'undefined') {
            return global;
        }
        throw new Error('Unable to locate global object.');
    }

    /**
     * @license
     * Copyright 2022 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
    /**
     * Attempt to read defaults from a JSON string provided to
     * process(.)env(.)__FIREBASE_DEFAULTS__ or a JSON file whose path is in
     * process(.)env(.)__FIREBASE_DEFAULTS_PATH__
     * The dots are in parens because certain compilers (Vite?) cannot
     * handle seeing that variable in comments.
     * See https://github.com/firebase/firebase-js-sdk/issues/6838
     */
    const getDefaultsFromEnvVariable = () => {
        if (typeof process === 'undefined' || typeof process.env === 'undefined') {
            return;
        }
        const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
        if (defaultsJsonString) {
            return JSON.parse(defaultsJsonString);
        }
    };
    const getDefaultsFromCookie = () => {
        if (typeof document === 'undefined') {
            return;
        }
        let match;
        try {
            match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
        }
        catch (e) {
            // Some environments such as Angular Universal SSR have a
            // `document` object but error on accessing `document.cookie`.
            return;
        }
        const decoded = match && base64Decode(match[1]);
        return decoded && JSON.parse(decoded);
    };
    /**
     * Get the __FIREBASE_DEFAULTS__ object. It checks in order:
     * (1) if such an object exists as a property of `globalThis`
     * (2) if such an object was provided on a shell environment variable
     * (3) if such an object exists in a cookie
     * @public
     */
    const getDefaults = () => {
        try {
            return (getDefaultsFromPostinstall() ||
                getDefaultsFromGlobal() ||
                getDefaultsFromEnvVariable() ||
                getDefaultsFromCookie());
        }
        catch (e) {
            /**
             * Catch-all for being unable to get __FIREBASE_DEFAULTS__ due
             * to any environment case we have not accounted for. Log to
             * info instead of swallowing so we can find these unknown cases
             * and add paths for them if needed.
             */
            console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
            return;
        }
    };
    /**
     * Returns Firebase app config stored in the __FIREBASE_DEFAULTS__ object.
     * @public
     */
    const getDefaultAppConfig = () => getDefaults()?.config;

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class Deferred {
        constructor() {
            this.reject = () => { };
            this.resolve = () => { };
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
        /**
         * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        wrapCallback(callback) {
            return (error, value) => {
                if (error) {
                    this.reject(error);
                }
                else {
                    this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    this.promise.catch(() => { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        }
    }
    /**
     * This method checks if indexedDB is supported by current browser/service worker context
     * @return true if indexedDB is supported by current browser/service worker context
     */
    function isIndexedDBAvailable() {
        try {
            return typeof indexedDB === 'object';
        }
        catch (e) {
            return false;
        }
    }
    /**
     * This method validates browser/sw context for indexedDB by opening a dummy indexedDB database and reject
     * if errors occur during the database open operation.
     *
     * @throws exception if current browser/sw context can't run idb.open (ex: Safari iframe, Firefox
     * private browsing)
     */
    function validateIndexedDBOpenable() {
        return new Promise((resolve, reject) => {
            try {
                let preExist = true;
                const DB_CHECK_NAME = 'validate-browser-context-for-indexeddb-analytics-module';
                const request = self.indexedDB.open(DB_CHECK_NAME);
                request.onsuccess = () => {
                    request.result.close();
                    // delete database only when it doesn't pre-exist
                    if (!preExist) {
                        self.indexedDB.deleteDatabase(DB_CHECK_NAME);
                    }
                    resolve(true);
                };
                request.onupgradeneeded = () => {
                    preExist = false;
                };
                request.onerror = () => {
                    reject(request.error?.message || '');
                };
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     *
     * This method checks whether cookie is enabled within current browser
     * @return true if cookie is enabled within current browser
     */
    function areCookiesEnabled() {
        if (typeof navigator === 'undefined' || !navigator.cookieEnabled) {
            return false;
        }
        return true;
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Standardized Firebase Error.
     *
     * Usage:
     *
     *   // TypeScript string literals for type-safe codes
     *   type Err =
     *     'unknown' |
     *     'object-not-found'
     *     ;
     *
     *   // Closure enum for type-safe error codes
     *   // at-enum {string}
     *   var Err = {
     *     UNKNOWN: 'unknown',
     *     OBJECT_NOT_FOUND: 'object-not-found',
     *   }
     *
     *   let errors: Map<Err, string> = {
     *     'generic-error': "Unknown error",
     *     'file-not-found': "Could not find file: {$file}",
     *   };
     *
     *   // Type-safe function - must pass a valid error code as param.
     *   let error = new ErrorFactory<Err>('service', 'Service', errors);
     *
     *   ...
     *   throw error.create(Err.GENERIC);
     *   ...
     *   throw error.create(Err.FILE_NOT_FOUND, {'file': fileName});
     *   ...
     *   // Service: Could not file file: foo.txt (service/file-not-found).
     *
     *   catch (e) {
     *     assert(e.message === "Could not find file: foo.txt.");
     *     if ((e as FirebaseError)?.code === 'service/file-not-found') {
     *       console.log("Could not read file: " + e['file']);
     *     }
     *   }
     */
    const ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    class FirebaseError extends Error {
        constructor(
        /** The error code for this error. */
        code, message, 
        /** Custom data for this error. */
        customData) {
            super(message);
            this.code = code;
            this.customData = customData;
            /** The custom name for all FirebaseErrors. */
            this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            // TODO(dlarocque): Replace this with `new.target`: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
            //                   which we can now use since we no longer target ES5.
            Object.setPrototypeOf(this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, ErrorFactory.prototype.create);
            }
        }
    }
    class ErrorFactory {
        constructor(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        create(code, ...data) {
            const customData = data[0] || {};
            const fullCode = `${this.service}/${code}`;
            const template = this.errors[code];
            const message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
            const error = new FirebaseError(fullCode, fullMessage, customData);
            return error;
        }
    }
    function replaceTemplate(template, data) {
        try {
            let ptr = 0;
            let result = '';
            while (ptr < template.length) {
                const start = template.indexOf('{$', ptr);
                if (start === -1) {
                    result += template.substring(ptr);
                    break;
                }
                const end = template.indexOf('}', start + 2);
                if (end === -1) {
                    result += template.substring(ptr);
                    break;
                }
                const key = template.substring(start + 2, end);
                const value = data[key];
                result +=
                    template.substring(ptr, start) +
                        (value != null ? String(value) : `<${key}?>`);
                ptr = end + 1;
            }
            return result;
        }
        catch (e) {
            // Should never happen, but fallback just in case
            return template;
        }
    }
    /**
     * Deep equal two objects. Support Arrays and Objects.
     */
    function deepEqual(a, b) {
        if (a === b) {
            return true;
        }
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        for (const k of aKeys) {
            if (!bKeys.includes(k)) {
                return false;
            }
            const aProp = a[k];
            const bProp = b[k];
            if (isObject(aProp) && isObject(bProp)) {
                if (!deepEqual(aProp, bProp)) {
                    return false;
                }
            }
            else if (aProp !== bProp) {
                return false;
            }
        }
        for (const k of bKeys) {
            if (!aKeys.includes(k)) {
                return false;
            }
        }
        return true;
    }
    function isObject(thing) {
        return thing !== null && typeof thing === 'object';
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getModularInstance(service) {
        if (service && service._delegate) {
            return service._delegate;
        }
        else {
            return service;
        }
    }

    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    class Component {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whether the service provided by the component is public or private
         */
        constructor(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* InstantiationMode.LAZY */;
            this.onInstanceCreated = null;
        }
        setInstantiationMode(mode) {
            this.instantiationMode = mode;
            return this;
        }
        setMultipleInstances(multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        }
        setServiceProps(props) {
            this.serviceProps = props;
            return this;
        }
        setInstanceCreatedCallback(callback) {
            this.onInstanceCreated = callback;
            return this;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ENTRY_NAME$1 = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    class Provider {
        constructor(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
            this.instancesOptions = new Map();
            this.onInitCallbacks = new Map();
        }
        /**
         * @param identifier A provider can provide multiple instances of a service
         * if this.component.multipleInstances is true.
         */
        get(identifier) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                const deferred = new Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                if (this.isInitialized(normalizedIdentifier) ||
                    this.shouldAutoInitialize()) {
                    // initialize the service if it can be auto-initialized
                    try {
                        const instance = this.getOrInitializeService({
                            instanceIdentifier: normalizedIdentifier
                        });
                        if (instance) {
                            deferred.resolve(instance);
                        }
                    }
                    catch (e) {
                        // when the instance factory throws an exception during get(), it should not cause
                        // a fatal error. We just return the unresolved promise in this case.
                    }
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        }
        getImmediate(options) {
            // if multipleInstances is not supported, use the default name
            const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
            const optional = options?.optional ?? false;
            if (this.isInitialized(normalizedIdentifier) ||
                this.shouldAutoInitialize()) {
                try {
                    return this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                }
                catch (e) {
                    if (optional) {
                        return null;
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                // In case a component is not initialized and should/cannot be auto-initialized at the moment, return null if the optional flag is set, or throw
                if (optional) {
                    return null;
                }
                else {
                    throw Error(`Service ${this.name} is not available`);
                }
            }
        }
        getComponent() {
            return this.component;
        }
        setComponent(component) {
            if (component.name !== this.name) {
                throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
            }
            if (this.component) {
                throw Error(`Component for ${this.name} has already been provided`);
            }
            this.component = component;
            // return early without attempting to initialize the component if the component requires explicit initialization (calling `Provider.initialize()`)
            if (!this.shouldAutoInitialize()) {
                return;
            }
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            // Create service instances for the pending promises and resolve them
            // NOTE: if this.multipleInstances is false, only the default instance will be created
            // and all promises with resolve with it regardless of the identifier.
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                try {
                    // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                    const instance = this.getOrInitializeService({
                        instanceIdentifier: normalizedIdentifier
                    });
                    instanceDeferred.resolve(instance);
                }
                catch (e) {
                    // when the instance factory throws an exception, it should not cause
                    // a fatal error. We just leave the promise unresolved.
                }
            }
        }
        clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
            this.instancesDeferred.delete(identifier);
            this.instancesOptions.delete(identifier);
            this.instances.delete(identifier);
        }
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        async delete() {
            const services = Array.from(this.instances.values());
            await Promise.all([
                ...services
                    .filter(service => 'INTERNAL' in service) // legacy services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service.INTERNAL.delete()),
                ...services
                    .filter(service => '_delete' in service) // modularized services
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map(service => service._delete())
            ]);
        }
        isComponentSet() {
            return this.component != null;
        }
        isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instances.has(identifier);
        }
        getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
            return this.instancesOptions.get(identifier) || {};
        }
        initialize(opts = {}) {
            const { options = {} } = opts;
            const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
            if (this.isInitialized(normalizedIdentifier)) {
                throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
            }
            if (!this.isComponentSet()) {
                throw Error(`Component ${this.name} has not been registered yet`);
            }
            const instance = this.getOrInitializeService({
                instanceIdentifier: normalizedIdentifier,
                options
            });
            // resolve any pending promise waiting for the service instance
            for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
                const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                if (normalizedIdentifier === normalizedDeferredIdentifier) {
                    instanceDeferred.resolve(instance);
                }
            }
            return instance;
        }
        /**
         *
         * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
         * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
         *
         * @param identifier An optional instance identifier
         * @returns a function to unregister the callback
         */
        onInit(callback, identifier) {
            const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ??
                new Set();
            existingCallbacks.add(callback);
            this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
            const existingInstance = this.instances.get(normalizedIdentifier);
            if (existingInstance) {
                callback(existingInstance, normalizedIdentifier);
            }
            return () => {
                existingCallbacks.delete(callback);
            };
        }
        /**
         * Invoke onInit callbacks synchronously
         * @param instance the service instance`
         */
        invokeOnInitCallbacks(instance, identifier) {
            const callbacks = this.onInitCallbacks.get(identifier);
            if (!callbacks) {
                return;
            }
            for (const callback of callbacks) {
                try {
                    callback(instance, identifier);
                }
                catch {
                    // ignore errors in the onInit callback
                }
            }
        }
        getOrInitializeService({ instanceIdentifier, options = {} }) {
            let instance = this.instances.get(instanceIdentifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, {
                    instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
                    options
                });
                this.instances.set(instanceIdentifier, instance);
                this.instancesOptions.set(instanceIdentifier, options);
                /**
                 * Invoke onInit listeners.
                 * Note this.component.onInstanceCreated is different, which is used by the component creator,
                 * while onInit listeners are registered by consumers of the provider.
                 */
                this.invokeOnInitCallbacks(instance, instanceIdentifier);
                /**
                 * Order is important
                 * onInstanceCreated() should be called after this.instances.set(instanceIdentifier, instance); which
                 * makes `isInitialized()` return true.
                 */
                if (this.component.onInstanceCreated) {
                    try {
                        this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
                    }
                    catch {
                        // ignore errors in the onInstanceCreatedCallback
                    }
                }
            }
            return instance || null;
        }
        normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        }
        shouldAutoInitialize() {
            return (!!this.component &&
                this.component.instantiationMode !== "EXPLICIT" /* InstantiationMode.EXPLICIT */);
        }
    }
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME$1 ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* InstantiationMode.EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    class ComponentContainer {
        constructor(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        addComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
            }
            provider.setComponent(component);
        }
        addOrOverwriteComponent(component) {
            const provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        }
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        getProvider(name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            const provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        }
        getProviders() {
            return Array.from(this.providers.values());
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A container for all of the Logger instances
     */
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    const levelStringToEnum = {
        'debug': LogLevel.DEBUG,
        'verbose': LogLevel.VERBOSE,
        'info': LogLevel.INFO,
        'warn': LogLevel.WARN,
        'error': LogLevel.ERROR,
        'silent': LogLevel.SILENT
    };
    /**
     * The default log level
     */
    const defaultLogLevel = LogLevel.INFO;
    /**
     * By default, `console.debug` is not displayed in the developer console (in
     * chrome). To avoid forcing users to have to opt-in to these logs twice
     * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
     * logs to the `console.log` function.
     */
    const ConsoleMethod = {
        [LogLevel.DEBUG]: 'log',
        [LogLevel.VERBOSE]: 'log',
        [LogLevel.INFO]: 'info',
        [LogLevel.WARN]: 'warn',
        [LogLevel.ERROR]: 'error'
    };
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    const defaultLogHandler = (instance, logType, ...args) => {
        if (logType < instance.logLevel) {
            return;
        }
        const now = new Date().toISOString();
        const method = ConsoleMethod[logType];
        if (method) {
            console[method](`[${now}]  ${instance.name}:`, ...args);
        }
        else {
            throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
        }
    };
    class Logger {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        constructor(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The main (internal) log handler for the Logger instance.
             * Can be set to a new function in internal package code but not by user.
             */
            this._logHandler = defaultLogHandler;
            /**
             * The optional, additional, user-defined log handler for the Logger instance.
             */
            this._userLogHandler = null;
        }
        get logLevel() {
            return this._logLevel;
        }
        set logLevel(val) {
            if (!(val in LogLevel)) {
                throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
            }
            this._logLevel = val;
        }
        // Workaround for setter/getter having to be the same type.
        setLogLevel(val) {
            this._logLevel = typeof val === 'string' ? levelStringToEnum[val] : val;
        }
        get logHandler() {
            return this._logHandler;
        }
        set logHandler(val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        }
        get userLogHandler() {
            return this._userLogHandler;
        }
        set userLogHandler(val) {
            this._userLogHandler = val;
        }
        /**
         * The functions below are all based on the `console` interface
         */
        debug(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
            this._logHandler(this, LogLevel.DEBUG, ...args);
        }
        log(...args) {
            this._userLogHandler &&
                this._userLogHandler(this, LogLevel.VERBOSE, ...args);
            this._logHandler(this, LogLevel.VERBOSE, ...args);
        }
        info(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
            this._logHandler(this, LogLevel.INFO, ...args);
        }
        warn(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
            this._logHandler(this, LogLevel.WARN, ...args);
        }
        error(...args) {
            this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
            this._logHandler(this, LogLevel.ERROR, ...args);
        }
    }

    const instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);

    let idbProxyableTypes;
    let cursorAdvanceMethods;
    // This is a function to prevent it throwing up in node environments.
    function getIdbProxyableTypes() {
        return (idbProxyableTypes ||
            (idbProxyableTypes = [
                IDBDatabase,
                IDBObjectStore,
                IDBIndex,
                IDBCursor,
                IDBTransaction,
            ]));
    }
    // This is a function to prevent it throwing up in node environments.
    function getCursorAdvanceMethods() {
        return (cursorAdvanceMethods ||
            (cursorAdvanceMethods = [
                IDBCursor.prototype.advance,
                IDBCursor.prototype.continue,
                IDBCursor.prototype.continuePrimaryKey,
            ]));
    }
    const cursorRequestMap = new WeakMap();
    const transactionDoneMap = new WeakMap();
    const transactionStoreNamesMap = new WeakMap();
    const transformCache = new WeakMap();
    const reverseTransformCache = new WeakMap();
    function promisifyRequest(request) {
        const promise = new Promise((resolve, reject) => {
            const unlisten = () => {
                request.removeEventListener('success', success);
                request.removeEventListener('error', error);
            };
            const success = () => {
                resolve(wrap(request.result));
                unlisten();
            };
            const error = () => {
                reject(request.error);
                unlisten();
            };
            request.addEventListener('success', success);
            request.addEventListener('error', error);
        });
        promise
            .then((value) => {
            // Since cursoring reuses the IDBRequest (*sigh*), we cache it for later retrieval
            // (see wrapFunction).
            if (value instanceof IDBCursor) {
                cursorRequestMap.set(value, request);
            }
            // Catching to avoid "Uncaught Promise exceptions"
        })
            .catch(() => { });
        // This mapping exists in reverseTransformCache but doesn't doesn't exist in transformCache. This
        // is because we create many promises from a single IDBRequest.
        reverseTransformCache.set(promise, request);
        return promise;
    }
    function cacheDonePromiseForTransaction(tx) {
        // Early bail if we've already created a done promise for this transaction.
        if (transactionDoneMap.has(tx))
            return;
        const done = new Promise((resolve, reject) => {
            const unlisten = () => {
                tx.removeEventListener('complete', complete);
                tx.removeEventListener('error', error);
                tx.removeEventListener('abort', error);
            };
            const complete = () => {
                resolve();
                unlisten();
            };
            const error = () => {
                reject(tx.error || new DOMException('AbortError', 'AbortError'));
                unlisten();
            };
            tx.addEventListener('complete', complete);
            tx.addEventListener('error', error);
            tx.addEventListener('abort', error);
        });
        // Cache it for later retrieval.
        transactionDoneMap.set(tx, done);
    }
    let idbProxyTraps = {
        get(target, prop, receiver) {
            if (target instanceof IDBTransaction) {
                // Special handling for transaction.done.
                if (prop === 'done')
                    return transactionDoneMap.get(target);
                // Polyfill for objectStoreNames because of Edge.
                if (prop === 'objectStoreNames') {
                    return target.objectStoreNames || transactionStoreNamesMap.get(target);
                }
                // Make tx.store return the only store in the transaction, or undefined if there are many.
                if (prop === 'store') {
                    return receiver.objectStoreNames[1]
                        ? undefined
                        : receiver.objectStore(receiver.objectStoreNames[0]);
                }
            }
            // Else transform whatever we get back.
            return wrap(target[prop]);
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            if (target instanceof IDBTransaction &&
                (prop === 'done' || prop === 'store')) {
                return true;
            }
            return prop in target;
        },
    };
    function replaceTraps(callback) {
        idbProxyTraps = callback(idbProxyTraps);
    }
    function wrapFunction(func) {
        // Due to expected object equality (which is enforced by the caching in `wrap`), we
        // only create one new func per func.
        // Edge doesn't support objectStoreNames (booo), so we polyfill it here.
        if (func === IDBDatabase.prototype.transaction &&
            !('objectStoreNames' in IDBTransaction.prototype)) {
            return function (storeNames, ...args) {
                const tx = func.call(unwrap(this), storeNames, ...args);
                transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
                return wrap(tx);
            };
        }
        // Cursor methods are special, as the behaviour is a little more different to standard IDB. In
        // IDB, you advance the cursor and wait for a new 'success' on the IDBRequest that gave you the
        // cursor. It's kinda like a promise that can resolve with many values. That doesn't make sense
        // with real promises, so each advance methods returns a new promise for the cursor object, or
        // undefined if the end of the cursor has been reached.
        if (getCursorAdvanceMethods().includes(func)) {
            return function (...args) {
                // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
                // the original object.
                func.apply(unwrap(this), args);
                return wrap(cursorRequestMap.get(this));
            };
        }
        return function (...args) {
            // Calling the original function with the proxy as 'this' causes ILLEGAL INVOCATION, so we use
            // the original object.
            return wrap(func.apply(unwrap(this), args));
        };
    }
    function transformCachableValue(value) {
        if (typeof value === 'function')
            return wrapFunction(value);
        // This doesn't return, it just creates a 'done' promise for the transaction,
        // which is later returned for transaction.done (see idbObjectHandler).
        if (value instanceof IDBTransaction)
            cacheDonePromiseForTransaction(value);
        if (instanceOfAny(value, getIdbProxyableTypes()))
            return new Proxy(value, idbProxyTraps);
        // Return the same value back if we're not going to transform it.
        return value;
    }
    function wrap(value) {
        // We sometimes generate multiple promises from a single IDBRequest (eg when cursoring), because
        // IDB is weird and a single IDBRequest can yield many responses, so these can't be cached.
        if (value instanceof IDBRequest)
            return promisifyRequest(value);
        // If we've already transformed this value before, reuse the transformed value.
        // This is faster, but it also provides object equality.
        if (transformCache.has(value))
            return transformCache.get(value);
        const newValue = transformCachableValue(value);
        // Not all types are transformed.
        // These may be primitive types, so they can't be WeakMap keys.
        if (newValue !== value) {
            transformCache.set(value, newValue);
            reverseTransformCache.set(newValue, value);
        }
        return newValue;
    }
    const unwrap = (value) => reverseTransformCache.get(value);

    /**
     * Open a database.
     *
     * @param name Name of the database.
     * @param version Schema version.
     * @param callbacks Additional callbacks.
     */
    function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
        const request = indexedDB.open(name, version);
        const openPromise = wrap(request);
        if (upgrade) {
            request.addEventListener('upgradeneeded', (event) => {
                upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
            });
        }
        if (blocked) {
            request.addEventListener('blocked', (event) => blocked(
            // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
            event.oldVersion, event.newVersion, event));
        }
        openPromise
            .then((db) => {
            if (terminated)
                db.addEventListener('close', () => terminated());
            if (blocking) {
                db.addEventListener('versionchange', (event) => blocking(event.oldVersion, event.newVersion, event));
            }
        })
            .catch(() => { });
        return openPromise;
    }
    /**
     * Delete a database.
     *
     * @param name Name of the database.
     */
    function deleteDB(name, { blocked } = {}) {
        const request = indexedDB.deleteDatabase(name);
        if (blocked) {
            request.addEventListener('blocked', (event) => blocked(
            // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
            event.oldVersion, event));
        }
        return wrap(request).then(() => undefined);
    }

    const readMethods = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'];
    const writeMethods = ['put', 'add', 'delete', 'clear'];
    const cachedMethods = new Map();
    function getMethod(target, prop) {
        if (!(target instanceof IDBDatabase &&
            !(prop in target) &&
            typeof prop === 'string')) {
            return;
        }
        if (cachedMethods.get(prop))
            return cachedMethods.get(prop);
        const targetFuncName = prop.replace(/FromIndex$/, '');
        const useIndex = prop !== targetFuncName;
        const isWrite = writeMethods.includes(targetFuncName);
        if (
        // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
        !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) ||
            !(isWrite || readMethods.includes(targetFuncName))) {
            return;
        }
        const method = async function (storeName, ...args) {
            // isWrite ? 'readwrite' : undefined gzipps better, but fails in Edge :(
            const tx = this.transaction(storeName, isWrite ? 'readwrite' : 'readonly');
            let target = tx.store;
            if (useIndex)
                target = target.index(args.shift());
            // Must reject if op rejects.
            // If it's a write operation, must reject if tx.done rejects.
            // Must reject with op rejection first.
            // Must resolve with op value.
            // Must handle both promises (no unhandled rejections)
            return (await Promise.all([
                target[targetFuncName](...args),
                isWrite && tx.done,
            ]))[0];
        };
        cachedMethods.set(prop, method);
        return method;
    }
    replaceTraps((oldTraps) => ({
        ...oldTraps,
        get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
        has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop),
    }));

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class PlatformLoggerServiceImpl {
        constructor(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        getPlatformInfoString() {
            const providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(provider => {
                if (isVersionServiceProvider(provider)) {
                    const service = provider.getImmediate();
                    return `${service.library}/${service.version}`;
                }
                else {
                    return null;
                }
            })
                .filter(logString => logString)
                .join(' ');
        }
    }
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        const component = provider.getComponent();
        return component?.type === "VERSION" /* ComponentType.VERSION */;
    }

    const name$q = "@firebase/app";
    const version$1$1 = "0.16.1";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const logger = new Logger('@firebase/app');

    const name$p = "@firebase/app-compat";

    const name$o = "@firebase/analytics-compat";

    const name$n = "@firebase/analytics";

    const name$m = "@firebase/app-check-compat";

    const name$l = "@firebase/app-check";

    const name$k = "@firebase/auth";

    const name$j = "@firebase/auth-compat";

    const name$i = "@firebase/database";

    const name$h = "@firebase/data-connect";

    const name$g = "@firebase/database-compat";

    const name$f = "@firebase/functions";

    const name$e = "@firebase/functions-compat";

    const name$d = "@firebase/installations";

    const name$c = "@firebase/installations-compat";

    const name$b = "@firebase/messaging";

    const name$a = "@firebase/messaging-compat";

    const name$9 = "@firebase/performance";

    const name$8 = "@firebase/performance-compat";

    const name$7 = "@firebase/remote-config";

    const name$6 = "@firebase/remote-config-compat";

    const name$5 = "@firebase/storage";

    const name$4 = "@firebase/storage-compat";

    const name$3 = "@firebase/firestore";

    const name$2$1 = "@firebase/ai";

    const name$1$1 = "@firebase/firestore-compat";

    const name$r = "firebase";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * The default app name
     *
     * @internal
     */
    const DEFAULT_ENTRY_NAME = '[DEFAULT]';
    const PLATFORM_LOG_STRING = {
        [name$q]: 'fire-core',
        [name$p]: 'fire-core-compat',
        [name$n]: 'fire-analytics',
        [name$o]: 'fire-analytics-compat',
        [name$l]: 'fire-app-check',
        [name$m]: 'fire-app-check-compat',
        [name$k]: 'fire-auth',
        [name$j]: 'fire-auth-compat',
        [name$i]: 'fire-rtdb',
        [name$h]: 'fire-data-connect',
        [name$g]: 'fire-rtdb-compat',
        [name$f]: 'fire-fn',
        [name$e]: 'fire-fn-compat',
        [name$d]: 'fire-iid',
        [name$c]: 'fire-iid-compat',
        [name$b]: 'fire-fcm',
        [name$a]: 'fire-fcm-compat',
        [name$9]: 'fire-perf',
        [name$8]: 'fire-perf-compat',
        [name$7]: 'fire-rc',
        [name$6]: 'fire-rc-compat',
        [name$5]: 'fire-gcs',
        [name$4]: 'fire-gcs-compat',
        [name$3]: 'fire-fst',
        [name$1$1]: 'fire-fst-compat',
        [name$2$1]: 'fire-vertex',
        'fire-js': 'fire-js', // Platform identifier for JS SDK.
        [name$r]: 'fire-js-all'
    };

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @internal
     */
    const _apps = new Map();
    /**
     * @internal
     */
    const _serverApps = new Map();
    /**
     * Registered components.
     *
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _components = new Map();
    /**
     * @param component - the component being added to this app's container
     *
     * @internal
     */
    function _addComponent(app, component) {
        try {
            app.container.addComponent(component);
        }
        catch (e) {
            logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
        }
    }
    /**
     *
     * @param component - the component to register
     * @returns whether or not the component is registered successfully
     *
     * @internal
     */
    function _registerComponent(component) {
        const componentName = component.name;
        if (_components.has(componentName)) {
            logger.debug(`There were multiple attempts to register component ${componentName}.`);
            return false;
        }
        _components.set(componentName, component);
        // add the component to existing app instances
        for (const app of _apps.values()) {
            _addComponent(app, component);
        }
        for (const serverApp of _serverApps.values()) {
            _addComponent(serverApp, component);
        }
        return true;
    }
    /**
     *
     * @param app - FirebaseApp instance
     * @param name - service name
     *
     * @returns the provider for the service with the matching name
     *
     * @internal
     */
    function _getProvider(app, name) {
        const heartbeatController = app.container
            .getProvider('heartbeat')
            .getImmediate({ optional: true });
        if (heartbeatController) {
            void heartbeatController.triggerHeartbeat();
        }
        return app.container.getProvider(name);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERRORS = {
        ["no-app" /* AppError.NO_APP */]: "No Firebase App '{$appName}' has been created - " +
            'call initializeApp() first',
        ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Illegal App name: '{$appName}'",
        ["duplicate-app" /* AppError.DUPLICATE_APP */]: "Firebase App named '{$appName}' already exists with different {$mismatchedParam}." +
            " Existing: '{$oldValue}'. New: '{$newValue}'.",
        ["app-deleted" /* AppError.APP_DELETED */]: "Firebase App named '{$appName}' already deleted",
        ["server-app-deleted" /* AppError.SERVER_APP_DELETED */]: 'Firebase Server App has been deleted',
        ["no-options" /* AppError.NO_OPTIONS */]: 'Need to provide options, when not being deployed to hosting via source.',
        ["invalid-app-argument" /* AppError.INVALID_APP_ARGUMENT */]: 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        ["invalid-log-argument" /* AppError.INVALID_LOG_ARGUMENT */]: 'First argument to `onLog` must be null or a function.',
        ["idb-open" /* AppError.IDB_OPEN */]: 'Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-get" /* AppError.IDB_GET */]: 'Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-set" /* AppError.IDB_WRITE */]: 'Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.',
        ["idb-delete" /* AppError.IDB_DELETE */]: 'Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.',
        ["finalization-registry-not-supported" /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */]: 'FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.',
        ["invalid-server-app-environment" /* AppError.INVALID_SERVER_APP_ENVIRONMENT */]: 'FirebaseServerApp is not for use in browser environments.'
    };
    const ERROR_FACTORY$2 = new ErrorFactory('app', 'Firebase', ERRORS);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class FirebaseAppImpl {
        constructor(options, config, container) {
            this._isDeleted = false;
            this._options = { ...options };
            this._config = { ...config };
            this._name = config.name;
            this._automaticDataCollectionEnabled =
                config.automaticDataCollectionEnabled;
            this._container = container;
            this.container.addComponent(new Component('app', () => this, "PUBLIC" /* ComponentType.PUBLIC */));
        }
        get automaticDataCollectionEnabled() {
            this.checkDestroyed();
            return this._automaticDataCollectionEnabled;
        }
        set automaticDataCollectionEnabled(val) {
            this.checkDestroyed();
            this._automaticDataCollectionEnabled = val;
        }
        get name() {
            this.checkDestroyed();
            return this._name;
        }
        get options() {
            this.checkDestroyed();
            return this._options;
        }
        get config() {
            this.checkDestroyed();
            return this._config;
        }
        get container() {
            return this._container;
        }
        get isDeleted() {
            return this._isDeleted;
        }
        set isDeleted(val) {
            this._isDeleted = val;
        }
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        checkDestroyed() {
            if (this.isDeleted) {
                throw ERROR_FACTORY$2.create("app-deleted" /* AppError.APP_DELETED */, { appName: this._name });
            }
        }
    }
    function initializeApp(_options, rawConfig = {}) {
        let options = _options;
        if (typeof rawConfig !== 'object') {
            const name = rawConfig;
            rawConfig = { name };
        }
        const config = {
            name: DEFAULT_ENTRY_NAME,
            automaticDataCollectionEnabled: true,
            ...rawConfig
        };
        const name = config.name;
        if (typeof name !== 'string' || !name) {
            throw ERROR_FACTORY$2.create("bad-app-name" /* AppError.BAD_APP_NAME */, {
                appName: String(name)
            });
        }
        options || (options = getDefaultAppConfig());
        if (!options) {
            throw ERROR_FACTORY$2.create("no-options" /* AppError.NO_OPTIONS */);
        }
        const existingApp = _apps.get(name);
        if (existingApp) {
            // return the existing app if options and config deep equal the ones in the existing app.
            if (!deepEqual(options, existingApp.options)) {
                throw ERROR_FACTORY$2.create("duplicate-app" /* AppError.DUPLICATE_APP */, {
                    appName: name,
                    mismatchedParam: 'options',
                    oldValue: JSON.stringify(existingApp.options),
                    newValue: JSON.stringify(options)
                });
            }
            else if (!deepEqual(config, existingApp.config)) {
                throw ERROR_FACTORY$2.create("duplicate-app" /* AppError.DUPLICATE_APP */, {
                    appName: name,
                    mismatchedParam: 'config',
                    oldValue: JSON.stringify(existingApp.config),
                    newValue: JSON.stringify(config)
                });
            }
            else {
                return existingApp;
            }
        }
        const container = new ComponentContainer(name);
        for (const component of _components.values()) {
            container.addComponent(component);
        }
        const newApp = new FirebaseAppImpl(options, config, container);
        _apps.set(name, newApp);
        return newApp;
    }
    /**
     * Retrieves a {@link @firebase/app#FirebaseApp} instance.
     *
     * When called with no arguments, the default app is returned. When an app name
     * is provided, the app corresponding to that name is returned.
     *
     * An exception is thrown if the app being retrieved has not yet been
     * initialized.
     *
     * @example
     * ```javascript
     * // Return the default app
     * const app = getApp();
     * ```
     *
     * @example
     * ```javascript
     * // Return a named app
     * const otherApp = getApp("otherApp");
     * ```
     *
     * @param name - Optional name of the app to return. If no name is
     *   provided, the default is `"[DEFAULT]"`.
     *
     * @returns The app corresponding to the provided app name.
     *   If no app name is provided, the default app is returned.
     *
     * @public
     */
    function getApp(name = DEFAULT_ENTRY_NAME) {
        const app = _apps.get(name);
        if (!app && name === DEFAULT_ENTRY_NAME && getDefaultAppConfig()) {
            return initializeApp();
        }
        if (!app) {
            throw ERROR_FACTORY$2.create("no-app" /* AppError.NO_APP */, { appName: name });
        }
        return app;
    }
    /**
     * Registers a library's name and version for platform logging purposes.
     * @param library - Name of 1p or 3p library (e.g. firestore, angularfire)
     * @param version - Current version of that library.
     * @param variant - Bundle variant, e.g., node, rn, etc.
     *
     * @public
     */
    function registerVersion(libraryKeyOrName, version, variant) {
        // TODO: We can use this check to whitelist strings when/if we set up
        // a good whitelist system.
        let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
        if (variant) {
            library += `-${variant}`;
        }
        const libraryMismatch = library.match(/\s|\//);
        const versionMismatch = version.match(/\s|\//);
        if (libraryMismatch || versionMismatch) {
            const warning = [
                `Unable to register library "${library}" with version "${version}":`
            ];
            if (libraryMismatch) {
                warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
            }
            if (libraryMismatch && versionMismatch) {
                warning.push('and');
            }
            if (versionMismatch) {
                warning.push(`version name "${version}" contains illegal characters (whitespace or "/")`);
            }
            logger.warn(warning.join(' '));
            return;
        }
        _registerComponent(new Component(`${library}-version`, () => ({ library, version }), "VERSION" /* ComponentType.VERSION */));
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DB_NAME$2 = 'firebase-heartbeat-database';
    const DB_VERSION$2 = 1;
    const STORE_NAME$2 = 'firebase-heartbeat-store';
    let dbPromise$2 = null;
    function getDbPromise$2() {
        if (!dbPromise$2) {
            dbPromise$2 = openDB(DB_NAME$2, DB_VERSION$2, {
                upgrade: (db, oldVersion) => {
                    // We don't use 'break' in this switch statement, the fall-through
                    // behavior is what we want, because if there are multiple versions between
                    // the old version and the current version, we want ALL the migrations
                    // that correspond to those versions to run, not only the last one.
                    // eslint-disable-next-line default-case
                    switch (oldVersion) {
                        case 0:
                            try {
                                db.createObjectStore(STORE_NAME$2);
                            }
                            catch (e) {
                                // Safari/iOS browsers throw occasional exceptions on
                                // db.createObjectStore() that may be a bug. Avoid blocking
                                // the rest of the app functionality.
                                console.warn(e);
                            }
                    }
                }
            }).catch(e => {
                throw ERROR_FACTORY$2.create("idb-open" /* AppError.IDB_OPEN */, {
                    originalErrorMessage: e.message
                });
            });
        }
        return dbPromise$2;
    }
    async function readHeartbeatsFromIndexedDB(app) {
        try {
            const db = await getDbPromise$2();
            const tx = db.transaction(STORE_NAME$2);
            const result = await tx.objectStore(STORE_NAME$2).get(computeKey(app));
            // We already have the value but tx.done can throw,
            // so we need to await it here to catch errors
            await tx.done;
            return result;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY$2.create("idb-get" /* AppError.IDB_GET */, {
                    originalErrorMessage: e?.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
        try {
            const db = await getDbPromise$2();
            const tx = db.transaction(STORE_NAME$2, 'readwrite');
            const objectStore = tx.objectStore(STORE_NAME$2);
            await objectStore.put(heartbeatObject, computeKey(app));
            await tx.done;
        }
        catch (e) {
            if (e instanceof FirebaseError) {
                logger.warn(e.message);
            }
            else {
                const idbGetError = ERROR_FACTORY$2.create("idb-set" /* AppError.IDB_WRITE */, {
                    originalErrorMessage: e?.message
                });
                logger.warn(idbGetError.message);
            }
        }
    }
    function computeKey(app) {
        return `${app.name}!${app.options.appId}`;
    }

    /**
     * @license
     * Copyright 2021 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const MAX_HEADER_BYTES = 1024;
    const MAX_NUM_STORED_HEARTBEATS = 30;
    class HeartbeatServiceImpl {
        constructor(container) {
            this.container = container;
            /**
             * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
             * the header string.
             * Stores one record per date. This will be consolidated into the standard
             * format of one record per user agent string before being sent as a header.
             * Populated from indexedDB when the controller is instantiated and should
             * be kept in sync with indexedDB.
             * Leave public for easier testing.
             */
            this._heartbeatsCache = null;
            const app = this.container.getProvider('app').getImmediate();
            this._storage = new HeartbeatStorageImpl(app);
            this._heartbeatsCachePromise = this._storage.read().then(result => {
                this._heartbeatsCache = result;
                return result;
            });
        }
        /**
         * Called to report a heartbeat. The function will generate
         * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
         * to IndexedDB.
         * Note that we only store one heartbeat per day. So if a heartbeat for today is
         * already logged, subsequent calls to this function in the same day will be ignored.
         */
        async triggerHeartbeat() {
            try {
                const platformLogger = this.container
                    .getProvider('platform-logger')
                    .getImmediate();
                // This is the "Firebase user agent" string from the platform logger
                // service, not the browser user agent.
                const agent = platformLogger.getPlatformInfoString();
                const date = getUTCDateString();
                if (this._heartbeatsCache?.heartbeats == null) {
                    this._heartbeatsCache = await this._heartbeatsCachePromise;
                    // If we failed to construct a heartbeats cache, then return immediately.
                    if (this._heartbeatsCache?.heartbeats == null) {
                        return;
                    }
                }
                // Do not store a heartbeat if one is already stored for this day
                // or if a header has already been sent today.
                if (this._heartbeatsCache.lastSentHeartbeatDate === date ||
                    this._heartbeatsCache.heartbeats.some(singleDateHeartbeat => singleDateHeartbeat.date === date)) {
                    return;
                }
                else {
                    // There is no entry for this date. Create one.
                    this._heartbeatsCache.heartbeats.push({ date, agent });
                    // If the number of stored heartbeats exceeds the maximum number of stored heartbeats, remove the heartbeat with the earliest date.
                    // Since this is executed each time a heartbeat is pushed, the limit can only be exceeded by one, so only one needs to be removed.
                    if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
                        const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
                        this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
                    }
                }
                return this._storage.overwrite(this._heartbeatsCache);
            }
            catch (e) {
                logger.warn(e);
            }
        }
        /**
         * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
         * It also clears all heartbeats from memory as well as in IndexedDB.
         *
         * NOTE: Consuming product SDKs should not send the header if this method
         * returns an empty string.
         */
        async getHeartbeatsHeader() {
            try {
                if (this._heartbeatsCache === null) {
                    await this._heartbeatsCachePromise;
                }
                // If it's still null or the array is empty, there is no data to send.
                if (this._heartbeatsCache?.heartbeats == null ||
                    this._heartbeatsCache.heartbeats.length === 0) {
                    return '';
                }
                const date = getUTCDateString();
                // Extract as many heartbeats from the cache as will fit under the size limit.
                const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
                const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
                // Store last sent date to prevent another being logged/sent for the same day.
                this._heartbeatsCache.lastSentHeartbeatDate = date;
                if (unsentEntries.length > 0) {
                    // Store any unsent entries if they exist.
                    this._heartbeatsCache.heartbeats = unsentEntries;
                    // This seems more likely than emptying the array (below) to lead to some odd state
                    // since the cache isn't empty and this will be called again on the next request,
                    // and is probably safest if we await it.
                    await this._storage.overwrite(this._heartbeatsCache);
                }
                else {
                    this._heartbeatsCache.heartbeats = [];
                    // Do not wait for this, to reduce latency.
                    void this._storage.overwrite(this._heartbeatsCache);
                }
                return headerString;
            }
            catch (e) {
                logger.warn(e);
                return '';
            }
        }
    }
    function getUTCDateString() {
        const today = new Date();
        // Returns date format 'YYYY-MM-DD'
        return today.toISOString().substring(0, 10);
    }
    function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
        // Heartbeats grouped by user agent in the standard format to be sent in
        // the header.
        const heartbeatsToSend = [];
        // Single date format heartbeats that are not sent.
        let unsentEntries = heartbeatsCache.slice();
        for (const singleDateHeartbeat of heartbeatsCache) {
            // Look for an existing entry with the same user agent.
            const heartbeatEntry = heartbeatsToSend.find(hb => hb.agent === singleDateHeartbeat.agent);
            if (!heartbeatEntry) {
                // If no entry for this user agent exists, create one.
                heartbeatsToSend.push({
                    agent: singleDateHeartbeat.agent,
                    dates: [singleDateHeartbeat.date]
                });
                if (countBytes(heartbeatsToSend) > maxSize) {
                    // If the header would exceed max size, remove the added heartbeat
                    // entry and stop adding to the header.
                    heartbeatsToSend.pop();
                    break;
                }
            }
            else {
                heartbeatEntry.dates.push(singleDateHeartbeat.date);
                // If the header would exceed max size, remove the added date
                // and stop adding to the header.
                if (countBytes(heartbeatsToSend) > maxSize) {
                    heartbeatEntry.dates.pop();
                    break;
                }
            }
            // Pop unsent entry from queue. (Skipped if adding the entry exceeded
            // quota and the loop breaks early.)
            unsentEntries = unsentEntries.slice(1);
        }
        return {
            heartbeatsToSend,
            unsentEntries
        };
    }
    class HeartbeatStorageImpl {
        constructor(app) {
            this.app = app;
            this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
        }
        async runIndexedDBEnvironmentCheck() {
            if (!isIndexedDBAvailable()) {
                return false;
            }
            else {
                return validateIndexedDBOpenable()
                    .then(() => true)
                    .catch(() => false);
            }
        }
        /**
         * Read all heartbeats.
         */
        async read() {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return { heartbeats: [] };
            }
            else {
                const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
                if (idbHeartbeatObject?.heartbeats) {
                    return idbHeartbeatObject;
                }
                else {
                    return { heartbeats: [] };
                }
            }
        }
        // overwrite the storage with the provided heartbeats
        async overwrite(heartbeatsObject) {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ??
                        existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: heartbeatsObject.heartbeats
                });
            }
        }
        // add heartbeats
        async add(heartbeatsObject) {
            const canUseIndexedDB = await this._canUseIndexedDBPromise;
            if (!canUseIndexedDB) {
                return;
            }
            else {
                const existingHeartbeatsObject = await this.read();
                return writeHeartbeatsToIndexedDB(this.app, {
                    lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ??
                        existingHeartbeatsObject.lastSentHeartbeatDate,
                    heartbeats: [
                        ...existingHeartbeatsObject.heartbeats,
                        ...heartbeatsObject.heartbeats
                    ]
                });
            }
        }
    }
    /**
     * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
     * in a platform logging header JSON object, stringified, and converted
     * to base 64.
     */
    function countBytes(heartbeatsCache) {
        // base64 has a restricted set of characters, all of which should be 1 byte.
        return base64urlEncodeWithoutPadding(
        // heartbeatsCache wrapper properties
        JSON.stringify({ version: 2, heartbeats: heartbeatsCache })).length;
    }
    /**
     * Returns the index of the heartbeat with the earliest date.
     * If the heartbeats array is empty, -1 is returned.
     */
    function getEarliestHeartbeatIdx(heartbeats) {
        if (heartbeats.length === 0) {
            return -1;
        }
        let earliestHeartbeatIdx = 0;
        let earliestHeartbeatDate = heartbeats[0].date;
        for (let i = 1; i < heartbeats.length; i++) {
            if (heartbeats[i].date < earliestHeartbeatDate) {
                earliestHeartbeatDate = heartbeats[i].date;
                earliestHeartbeatIdx = i;
            }
        }
        return earliestHeartbeatIdx;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(variant) {
        _registerComponent(new Component('platform-logger', container => new PlatformLoggerServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        _registerComponent(new Component('heartbeat', container => new HeartbeatServiceImpl(container), "PRIVATE" /* ComponentType.PRIVATE */));
        // Register `app` package.
        registerVersion(name$q, version$1$1, variant);
        // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
        registerVersion(name$q, version$1$1, 'esm2020');
        // Register platform SDK identifier (no version).
        registerVersion('fire-js', '');
    }

    /**
     * Firebase App
     *
     * @remarks This package coordinates the communication between the different Firebase components
     * @packageDocumentation
     */
    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerCoreComponents('');

    var name$2 = "firebase";
    var version$2 = "12.18.0";

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerVersion(name$2, version$2, 'app');

    const name$1 = "@firebase/installations";
    const version$1 = "0.6.24";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const PENDING_TIMEOUT_MS = 10000;
    const PACKAGE_VERSION = `w:${version$1}`;
    const INTERNAL_AUTH_VERSION = 'FIS_v2';
    const INSTALLATIONS_API_URL = 'https://firebaseinstallations.googleapis.com/v1';
    const TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1000; // One hour
    const SERVICE = 'installations';
    const SERVICE_NAME = 'Installations';

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERROR_DESCRIPTION_MAP = {
        ["missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */]: 'Missing App configuration value: "{$valueName}"',
        ["not-registered" /* ErrorCode.NOT_REGISTERED */]: 'Firebase Installation is not registered.',
        ["installation-not-found" /* ErrorCode.INSTALLATION_NOT_FOUND */]: 'Firebase Installation not found.',
        ["request-failed" /* ErrorCode.REQUEST_FAILED */]: '{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',
        ["app-offline" /* ErrorCode.APP_OFFLINE */]: 'Could not process request. Application offline.',
        ["delete-pending-registration" /* ErrorCode.DELETE_PENDING_REGISTRATION */]: "Can't delete installation while there is a pending registration request."
    };
    const ERROR_FACTORY$1 = new ErrorFactory(SERVICE, SERVICE_NAME, ERROR_DESCRIPTION_MAP);
    /** Returns true if error is a FirebaseError that is based on an error from the server. */
    function isServerError(error) {
        return (error instanceof FirebaseError &&
            error.code.includes("request-failed" /* ErrorCode.REQUEST_FAILED */));
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function getInstallationsEndpoint({ projectId }) {
        return `${INSTALLATIONS_API_URL}/projects/${projectId}/installations`;
    }
    function extractAuthTokenInfoFromResponse(response) {
        return {
            token: response.token,
            requestStatus: 2 /* RequestStatus.COMPLETED */,
            expiresIn: getExpiresInFromResponseExpiresIn(response.expiresIn),
            creationTime: Date.now()
        };
    }
    async function getErrorFromResponse(requestName, response) {
        const responseJson = await response.json();
        const errorData = responseJson.error;
        return ERROR_FACTORY$1.create("request-failed" /* ErrorCode.REQUEST_FAILED */, {
            requestName,
            serverCode: errorData.code,
            serverMessage: errorData.message,
            serverStatus: errorData.status
        });
    }
    function getHeaders$1({ apiKey }) {
        return new Headers({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-goog-api-key': apiKey
        });
    }
    function getHeadersWithAuth(appConfig, { refreshToken }) {
        const headers = getHeaders$1(appConfig);
        headers.append('Authorization', getAuthorizationHeader(refreshToken));
        return headers;
    }
    /**
     * Calls the passed in fetch wrapper and returns the response.
     * If the returned response has a status of 5xx, re-runs the function once and
     * returns the response.
     */
    async function retryIfServerError(fn) {
        const result = await fn();
        if (result.status >= 500 && result.status < 600) {
            // Internal Server Error. Retry request.
            return fn();
        }
        return result;
    }
    function getExpiresInFromResponseExpiresIn(responseExpiresIn) {
        // This works because the server will never respond with fractions of a second.
        return Number(responseExpiresIn.replace('s', '000'));
    }
    function getAuthorizationHeader(refreshToken) {
        return `${INTERNAL_AUTH_VERSION} ${refreshToken}`;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function createInstallationRequest({ appConfig, heartbeatServiceProvider }, { fid }) {
        const endpoint = getInstallationsEndpoint(appConfig);
        const headers = getHeaders$1(appConfig);
        // If heartbeat service exists, add the heartbeat string to the header.
        const heartbeatService = heartbeatServiceProvider.getImmediate({
            optional: true
        });
        if (heartbeatService) {
            const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
            if (heartbeatsHeader) {
                headers.append('x-firebase-client', heartbeatsHeader);
            }
        }
        const body = {
            fid,
            authVersion: INTERNAL_AUTH_VERSION,
            appId: appConfig.appId,
            sdkVersion: PACKAGE_VERSION
        };
        const request = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        };
        const response = await retryIfServerError(() => fetch(endpoint, request));
        if (response.ok) {
            const responseValue = await response.json();
            const registeredInstallationEntry = {
                fid: responseValue.fid || fid,
                registrationStatus: 2 /* RequestStatus.COMPLETED */,
                refreshToken: responseValue.refreshToken,
                authToken: extractAuthTokenInfoFromResponse(responseValue.authToken)
            };
            return registeredInstallationEntry;
        }
        else {
            throw await getErrorFromResponse('Create Installation', response);
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Returns a promise that resolves after given time passes. */
    function sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function bufferToBase64UrlSafe(array) {
        const b64 = btoa(String.fromCharCode(...array));
        return b64.replace(/\+/g, '-').replace(/\//g, '_');
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const VALID_FID_PATTERN = /^[cdef][\w-]{21}$/;
    const INVALID_FID = '';
    /**
     * Generates a new FID using random values from Web Crypto API.
     * Returns an empty string if FID generation fails for any reason.
     */
    function generateFid() {
        try {
            // A valid FID has exactly 22 base64 characters, which is 132 bits, or 16.5
            // bytes. our implementation generates a 17 byte array instead.
            const fidByteArray = new Uint8Array(17);
            const crypto = self.crypto || self.msCrypto;
            crypto.getRandomValues(fidByteArray);
            // Replace the first 4 random bits with the constant FID header of 0b0111.
            fidByteArray[0] = 0b01110000 + (fidByteArray[0] % 0b00010000);
            const fid = encode(fidByteArray);
            return VALID_FID_PATTERN.test(fid) ? fid : INVALID_FID;
        }
        catch {
            // FID generation errored
            return INVALID_FID;
        }
    }
    /** Converts a FID Uint8Array to a base64 string representation. */
    function encode(fidByteArray) {
        const b64String = bufferToBase64UrlSafe(fidByteArray);
        // Remove the 23rd character that was added because of the extra 4 bits at the
        // end of our 17 byte array, and the '=' padding.
        return b64String.substr(0, 22);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Returns a string key that can be used to identify the app. */
    function getKey$1(appConfig) {
        return `${appConfig.appName}!${appConfig.appId}`;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const fidChangeCallbacks = new Map();
    /**
     * Calls the onIdChange callbacks with the new FID value, and broadcasts the
     * change to other tabs.
     */
    function fidChanged(appConfig, fid) {
        const key = getKey$1(appConfig);
        callFidChangeCallbacks(key, fid);
        broadcastFidChange(key, fid);
    }
    function addCallback(appConfig, callback) {
        // Open the broadcast channel if it's not already open,
        // to be able to listen to change events from other tabs.
        getBroadcastChannel();
        const key = getKey$1(appConfig);
        let callbackSet = fidChangeCallbacks.get(key);
        if (!callbackSet) {
            callbackSet = new Set();
            fidChangeCallbacks.set(key, callbackSet);
        }
        callbackSet.add(callback);
    }
    function removeCallback(appConfig, callback) {
        const key = getKey$1(appConfig);
        const callbackSet = fidChangeCallbacks.get(key);
        if (!callbackSet) {
            return;
        }
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
            fidChangeCallbacks.delete(key);
        }
        // Close broadcast channel if there are no more callbacks.
        closeBroadcastChannel();
    }
    function callFidChangeCallbacks(key, fid) {
        const callbacks = fidChangeCallbacks.get(key);
        if (!callbacks) {
            return;
        }
        for (const callback of callbacks) {
            callback(fid);
        }
    }
    function broadcastFidChange(key, fid) {
        const channel = getBroadcastChannel();
        if (channel) {
            channel.postMessage({ key, fid });
        }
        closeBroadcastChannel();
    }
    let broadcastChannel = null;
    /** Opens and returns a BroadcastChannel if it is supported by the browser. */
    function getBroadcastChannel() {
        if (!broadcastChannel && 'BroadcastChannel' in self) {
            broadcastChannel = new BroadcastChannel('[Firebase] FID Change');
            broadcastChannel.onmessage = e => {
                callFidChangeCallbacks(e.data.key, e.data.fid);
            };
        }
        return broadcastChannel;
    }
    function closeBroadcastChannel() {
        if (fidChangeCallbacks.size === 0 && broadcastChannel) {
            broadcastChannel.close();
            broadcastChannel = null;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DATABASE_NAME$1 = 'firebase-installations-database';
    const DATABASE_VERSION$1 = 1;
    const OBJECT_STORE_NAME = 'firebase-installations-store';
    let dbPromise$1 = null;
    function getDbPromise$1() {
        if (!dbPromise$1) {
            dbPromise$1 = openDB(DATABASE_NAME$1, DATABASE_VERSION$1, {
                upgrade: (db, oldVersion) => {
                    // We don't use 'break' in this switch statement, the fall-through
                    // behavior is what we want, because if there are multiple versions between
                    // the old version and the current version, we want ALL the migrations
                    // that correspond to those versions to run, not only the last one.
                    // eslint-disable-next-line default-case
                    switch (oldVersion) {
                        case 0:
                            db.createObjectStore(OBJECT_STORE_NAME);
                    }
                }
            });
        }
        return dbPromise$1;
    }
    /** Assigns or overwrites the record for the given key with the given value. */
    async function set(appConfig, value) {
        const key = getKey$1(appConfig);
        const db = await getDbPromise$1();
        const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
        const objectStore = tx.objectStore(OBJECT_STORE_NAME);
        const oldValue = (await objectStore.get(key));
        await objectStore.put(value, key);
        await tx.done;
        if (!oldValue || oldValue.fid !== value.fid) {
            fidChanged(appConfig, value.fid);
        }
        return value;
    }
    /** Removes record(s) from the objectStore that match the given key. */
    async function remove(appConfig) {
        const key = getKey$1(appConfig);
        const db = await getDbPromise$1();
        const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
        await tx.objectStore(OBJECT_STORE_NAME).delete(key);
        await tx.done;
    }
    /**
     * Atomically updates a record with the result of updateFn, which gets
     * called with the current value. If newValue is undefined, the record is
     * deleted instead.
     * @return Updated value
     */
    async function update(appConfig, updateFn) {
        const key = getKey$1(appConfig);
        const db = await getDbPromise$1();
        const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OBJECT_STORE_NAME);
        const oldValue = (await store.get(key));
        const newValue = updateFn(oldValue);
        if (newValue === undefined) {
            await store.delete(key);
        }
        else {
            await store.put(newValue, key);
        }
        await tx.done;
        if (newValue && (!oldValue || oldValue.fid !== newValue.fid)) {
            fidChanged(appConfig, newValue.fid);
        }
        return newValue;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Updates and returns the InstallationEntry from the database.
     * Also triggers a registration request if it is necessary and possible.
     */
    async function getInstallationEntry(installations) {
        let registrationPromise;
        const installationEntry = await update(installations.appConfig, oldEntry => {
            const installationEntry = updateOrCreateInstallationEntry(oldEntry);
            const entryWithPromise = triggerRegistrationIfNecessary(installations, installationEntry);
            registrationPromise = entryWithPromise.registrationPromise;
            return entryWithPromise.installationEntry;
        });
        if (installationEntry.fid === INVALID_FID) {
            // FID generation failed. Waiting for the FID from the server.
            return { installationEntry: await registrationPromise };
        }
        return {
            installationEntry,
            registrationPromise
        };
    }
    /**
     * Creates a new Installation Entry if one does not exist.
     * Also clears timed out pending requests.
     */
    function updateOrCreateInstallationEntry(oldEntry) {
        const entry = oldEntry || {
            fid: generateFid(),
            registrationStatus: 0 /* RequestStatus.NOT_STARTED */
        };
        return clearTimedOutRequest(entry);
    }
    /**
     * If the Firebase Installation is not registered yet, this will trigger the
     * registration and return an InProgressInstallationEntry.
     *
     * If registrationPromise does not exist, the installationEntry is guaranteed
     * to be registered.
     */
    function triggerRegistrationIfNecessary(installations, installationEntry) {
        if (installationEntry.registrationStatus === 0 /* RequestStatus.NOT_STARTED */) {
            if (!navigator.onLine) {
                // Registration required but app is offline.
                const registrationPromiseWithError = Promise.reject(ERROR_FACTORY$1.create("app-offline" /* ErrorCode.APP_OFFLINE */));
                return {
                    installationEntry,
                    registrationPromise: registrationPromiseWithError
                };
            }
            // Try registering. Change status to IN_PROGRESS.
            const inProgressEntry = {
                fid: installationEntry.fid,
                registrationStatus: 1 /* RequestStatus.IN_PROGRESS */,
                registrationTime: Date.now()
            };
            const registrationPromise = registerInstallation(installations, inProgressEntry);
            return { installationEntry: inProgressEntry, registrationPromise };
        }
        else if (installationEntry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */) {
            return {
                installationEntry,
                registrationPromise: waitUntilFidRegistration(installations)
            };
        }
        else {
            return { installationEntry };
        }
    }
    /** This will be executed only once for each new Firebase Installation. */
    async function registerInstallation(installations, installationEntry) {
        try {
            const registeredInstallationEntry = await createInstallationRequest(installations, installationEntry);
            return set(installations.appConfig, registeredInstallationEntry);
        }
        catch (e) {
            if (isServerError(e) && e.customData.serverCode === 409) {
                // Server returned a "FID cannot be used" error.
                // Generate a new ID next time.
                await remove(installations.appConfig);
            }
            else {
                // Registration failed. Set FID as not registered.
                await set(installations.appConfig, {
                    fid: installationEntry.fid,
                    registrationStatus: 0 /* RequestStatus.NOT_STARTED */
                });
            }
            throw e;
        }
    }
    /** Call if FID registration is pending in another request. */
    async function waitUntilFidRegistration(installations) {
        // Unfortunately, there is no way of reliably observing when a value in
        // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
        // so we need to poll.
        let entry = await updateInstallationRequest(installations.appConfig);
        while (entry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */) {
            // createInstallation request still in progress.
            await sleep(100);
            entry = await updateInstallationRequest(installations.appConfig);
        }
        if (entry.registrationStatus === 0 /* RequestStatus.NOT_STARTED */) {
            // The request timed out or failed in a different call. Try again.
            const { installationEntry, registrationPromise } = await getInstallationEntry(installations);
            if (registrationPromise) {
                return registrationPromise;
            }
            else {
                // if there is no registrationPromise, entry is registered.
                return installationEntry;
            }
        }
        return entry;
    }
    /**
     * Called only if there is a CreateInstallation request in progress.
     *
     * Updates the InstallationEntry in the DB based on the status of the
     * CreateInstallation request.
     *
     * Returns the updated InstallationEntry.
     */
    function updateInstallationRequest(appConfig) {
        return update(appConfig, oldEntry => {
            if (!oldEntry) {
                throw ERROR_FACTORY$1.create("installation-not-found" /* ErrorCode.INSTALLATION_NOT_FOUND */);
            }
            return clearTimedOutRequest(oldEntry);
        });
    }
    function clearTimedOutRequest(entry) {
        if (hasInstallationRequestTimedOut(entry)) {
            return {
                fid: entry.fid,
                registrationStatus: 0 /* RequestStatus.NOT_STARTED */
            };
        }
        return entry;
    }
    function hasInstallationRequestTimedOut(installationEntry) {
        return (installationEntry.registrationStatus === 1 /* RequestStatus.IN_PROGRESS */ &&
            installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now());
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function generateAuthTokenRequest({ appConfig, heartbeatServiceProvider }, installationEntry) {
        const endpoint = getGenerateAuthTokenEndpoint(appConfig, installationEntry);
        const headers = getHeadersWithAuth(appConfig, installationEntry);
        // If heartbeat service exists, add the heartbeat string to the header.
        const heartbeatService = heartbeatServiceProvider.getImmediate({
            optional: true
        });
        if (heartbeatService) {
            const heartbeatsHeader = await heartbeatService.getHeartbeatsHeader();
            if (heartbeatsHeader) {
                headers.append('x-firebase-client', heartbeatsHeader);
            }
        }
        const body = {
            installation: {
                sdkVersion: PACKAGE_VERSION,
                appId: appConfig.appId
            }
        };
        const request = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        };
        const response = await retryIfServerError(() => fetch(endpoint, request));
        if (response.ok) {
            const responseValue = await response.json();
            const completedAuthToken = extractAuthTokenInfoFromResponse(responseValue);
            return completedAuthToken;
        }
        else {
            throw await getErrorFromResponse('Generate Auth Token', response);
        }
    }
    function getGenerateAuthTokenEndpoint(appConfig, { fid }) {
        return `${getInstallationsEndpoint(appConfig)}/${fid}/authTokens:generate`;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a valid authentication token for the installation. Generates a new
     * token if one doesn't exist, is expired or about to expire.
     *
     * Should only be called if the Firebase Installation is registered.
     */
    async function refreshAuthToken(installations, forceRefresh = false) {
        let tokenPromise;
        const entry = await update(installations.appConfig, oldEntry => {
            if (!isEntryRegistered(oldEntry)) {
                throw ERROR_FACTORY$1.create("not-registered" /* ErrorCode.NOT_REGISTERED */);
            }
            const oldAuthToken = oldEntry.authToken;
            if (!forceRefresh && isAuthTokenValid(oldAuthToken)) {
                // There is a valid token in the DB.
                return oldEntry;
            }
            else if (oldAuthToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */) {
                // There already is a token request in progress.
                tokenPromise = waitUntilAuthTokenRequest(installations, forceRefresh);
                return oldEntry;
            }
            else {
                // No token or token expired.
                if (!navigator.onLine) {
                    throw ERROR_FACTORY$1.create("app-offline" /* ErrorCode.APP_OFFLINE */);
                }
                const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
                tokenPromise = fetchAuthTokenFromServer(installations, inProgressEntry);
                return inProgressEntry;
            }
        });
        const authToken = tokenPromise
            ? await tokenPromise
            : entry.authToken;
        return authToken;
    }
    /**
     * Call only if FID is registered and Auth Token request is in progress.
     *
     * Waits until the current pending request finishes. If the request times out,
     * tries once in this thread as well.
     */
    async function waitUntilAuthTokenRequest(installations, forceRefresh) {
        // Unfortunately, there is no way of reliably observing when a value in
        // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
        // so we need to poll.
        let entry = await updateAuthTokenRequest(installations.appConfig);
        while (entry.authToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */) {
            // generateAuthToken still in progress.
            await sleep(100);
            entry = await updateAuthTokenRequest(installations.appConfig);
        }
        const authToken = entry.authToken;
        if (authToken.requestStatus === 0 /* RequestStatus.NOT_STARTED */) {
            // The request timed out or failed in a different call. Try again.
            return refreshAuthToken(installations, forceRefresh);
        }
        else {
            return authToken;
        }
    }
    /**
     * Called only if there is a GenerateAuthToken request in progress.
     *
     * Updates the InstallationEntry in the DB based on the status of the
     * GenerateAuthToken request.
     *
     * Returns the updated InstallationEntry.
     */
    function updateAuthTokenRequest(appConfig) {
        return update(appConfig, oldEntry => {
            if (!isEntryRegistered(oldEntry)) {
                throw ERROR_FACTORY$1.create("not-registered" /* ErrorCode.NOT_REGISTERED */);
            }
            const oldAuthToken = oldEntry.authToken;
            if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
                return {
                    ...oldEntry,
                    authToken: { requestStatus: 0 /* RequestStatus.NOT_STARTED */ }
                };
            }
            return oldEntry;
        });
    }
    async function fetchAuthTokenFromServer(installations, installationEntry) {
        try {
            const authToken = await generateAuthTokenRequest(installations, installationEntry);
            const updatedInstallationEntry = {
                ...installationEntry,
                authToken
            };
            await set(installations.appConfig, updatedInstallationEntry);
            return authToken;
        }
        catch (e) {
            if (isServerError(e) &&
                (e.customData.serverCode === 401 || e.customData.serverCode === 404)) {
                // Server returned a "FID not found" or a "Invalid authentication" error.
                // Generate a new ID next time.
                await remove(installations.appConfig);
            }
            else {
                const updatedInstallationEntry = {
                    ...installationEntry,
                    authToken: { requestStatus: 0 /* RequestStatus.NOT_STARTED */ }
                };
                await set(installations.appConfig, updatedInstallationEntry);
            }
            throw e;
        }
    }
    function isEntryRegistered(installationEntry) {
        return (installationEntry !== undefined &&
            installationEntry.registrationStatus === 2 /* RequestStatus.COMPLETED */);
    }
    function isAuthTokenValid(authToken) {
        return (authToken.requestStatus === 2 /* RequestStatus.COMPLETED */ &&
            !isAuthTokenExpired(authToken));
    }
    function isAuthTokenExpired(authToken) {
        const now = Date.now();
        return (now < authToken.creationTime ||
            authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER);
    }
    /** Returns an updated InstallationEntry with an InProgressAuthToken. */
    function makeAuthTokenRequestInProgressEntry(oldEntry) {
        const inProgressAuthToken = {
            requestStatus: 1 /* RequestStatus.IN_PROGRESS */,
            requestTime: Date.now()
        };
        return {
            ...oldEntry,
            authToken: inProgressAuthToken
        };
    }
    function hasAuthTokenRequestTimedOut(authToken) {
        return (authToken.requestStatus === 1 /* RequestStatus.IN_PROGRESS */ &&
            authToken.requestTime + PENDING_TIMEOUT_MS < Date.now());
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Creates a Firebase Installation if there isn't one for the app and
     * returns the Installation ID.
     * @param installations - The `Installations` instance.
     *
     * @public
     */
    async function getId(installations) {
        const installationsImpl = installations;
        const { installationEntry, registrationPromise } = await getInstallationEntry(installationsImpl);
        if (registrationPromise) {
            registrationPromise.catch(console.error);
        }
        else {
            // If the installation is already registered, update the authentication
            // token if needed.
            refreshAuthToken(installationsImpl).catch(console.error);
        }
        return installationEntry.fid;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a Firebase Installations auth token, identifying the current
     * Firebase Installation.
     * @param installations - The `Installations` instance.
     * @param forceRefresh - Force refresh regardless of token expiration.
     *
     * @public
     */
    async function getToken$2(installations, forceRefresh = false) {
        const installationsImpl = installations;
        await completeInstallationRegistration(installationsImpl);
        // At this point we either have a Registered Installation in the DB, or we've
        // already thrown an error.
        const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
        return authToken.token;
    }
    async function completeInstallationRegistration(installations) {
        const { registrationPromise } = await getInstallationEntry(installations);
        if (registrationPromise) {
            // A createInstallation request is in progress. Wait until it finishes.
            await registrationPromise;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Sets a new callback that will get called when Installation ID changes.
     * Returns an unsubscribe function that will remove the callback when called.
     * @param installations - The `Installations` instance.
     * @param callback - The callback function that is invoked when FID changes.
     * @returns A function that can be called to unsubscribe.
     *
     * @public
     */
    function onIdChange(installations, callback) {
        const { appConfig } = installations;
        addCallback(appConfig, callback);
        return () => {
            removeCallback(appConfig, callback);
        };
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function extractAppConfig$1(app) {
        if (!app || !app.options) {
            throw getMissingValueError$1('App Configuration');
        }
        if (!app.name) {
            throw getMissingValueError$1('App Name');
        }
        // Required app config keys
        const configKeys = [
            'projectId',
            'apiKey',
            'appId'
        ];
        for (const keyName of configKeys) {
            if (!app.options[keyName]) {
                throw getMissingValueError$1(keyName);
            }
        }
        return {
            appName: app.name,
            projectId: app.options.projectId,
            apiKey: app.options.apiKey,
            appId: app.options.appId
        };
    }
    function getMissingValueError$1(valueName) {
        return ERROR_FACTORY$1.create("missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */, {
            valueName
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const INSTALLATIONS_NAME = 'installations';
    const INSTALLATIONS_NAME_INTERNAL = 'installations-internal';
    const publicFactory = (container) => {
        const app = container.getProvider('app').getImmediate();
        // Throws if app isn't configured properly.
        const appConfig = extractAppConfig$1(app);
        const heartbeatServiceProvider = _getProvider(app, 'heartbeat');
        const installationsImpl = {
            app,
            appConfig,
            heartbeatServiceProvider,
            _delete: () => Promise.resolve()
        };
        return installationsImpl;
    };
    const internalFactory = (container) => {
        const app = container.getProvider('app').getImmediate();
        // Internal FIS instance relies on public FIS instance.
        const installations = _getProvider(app, INSTALLATIONS_NAME).getImmediate();
        const installationsInternal = {
            getId: () => getId(installations),
            getToken: (forceRefresh) => getToken$2(installations, forceRefresh)
        };
        return installationsInternal;
    };
    function registerInstallations() {
        _registerComponent(new Component(INSTALLATIONS_NAME, publicFactory, "PUBLIC" /* ComponentType.PUBLIC */));
        _registerComponent(new Component(INSTALLATIONS_NAME_INTERNAL, internalFactory, "PRIVATE" /* ComponentType.PRIVATE */));
    }

    /**
     * The Firebase Installations Web SDK.
     * This SDK does not work in a Node.js environment.
     *
     * @packageDocumentation
     */
    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerInstallations();
    registerVersion(name$1, version$1);
    // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
    registerVersion(name$1, version$1, 'esm2020');

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_SW_PATH = '/firebase-messaging-sw.js';
    const DEFAULT_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
    const DEFAULT_VAPID_KEY = 'BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4';
    const ENDPOINT = 'https://fcmregistrations.googleapis.com/v1';
    const CONSOLE_CAMPAIGN_ID = 'google.c.a.c_id';
    const CONSOLE_CAMPAIGN_NAME = 'google.c.a.c_l';
    const CONSOLE_CAMPAIGN_TIME = 'google.c.a.ts';
    /** Set to '1' if Analytics is enabled for the campaign */
    const CONSOLE_CAMPAIGN_ANALYTICS_ENABLED = 'google.c.a.e';
    const DEFAULT_REGISTRATION_TIMEOUT = 10000;
    var MessageType$1;
    (function (MessageType) {
        MessageType[MessageType["DATA_MESSAGE"] = 1] = "DATA_MESSAGE";
        MessageType[MessageType["DISPLAY_NOTIFICATION"] = 3] = "DISPLAY_NOTIFICATION";
    })(MessageType$1 || (MessageType$1 = {}));

    /**
     * @license
     * Copyright 2018 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
     * in compliance with the License. You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software distributed under the License
     * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
     * or implied. See the License for the specific language governing permissions and limitations under
     * the License.
     */
    var MessageType;
    (function (MessageType) {
        MessageType["PUSH_RECEIVED"] = "push-received";
        MessageType["NOTIFICATION_CLICKED"] = "notification-clicked";
        MessageType["FID_REGISTERED"] = "fid-registered";
    })(MessageType || (MessageType = {}));

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function arrayToBase64(array) {
        const uint8Array = new Uint8Array(array);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        return base64String.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }
    function base64ToArray(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const OLD_DB_NAME = 'fcm_token_details_db';
    /**
     * The last DB version of 'fcm_token_details_db' was 4. This is one higher, so that the upgrade
     * callback is called for all versions of the old DB.
     */
    const OLD_DB_VERSION = 5;
    const OLD_OBJECT_STORE_NAME = 'fcm_token_object_Store';
    async function migrateOldDatabase(senderId) {
        if ('databases' in indexedDB) {
            // indexedDb.databases() is an IndexedDB v3 API and does not exist in all browsers. TODO: Remove
            // typecast when it lands in TS types.
            const databases = await indexedDB.databases();
            const dbNames = databases.map(db => db.name);
            if (!dbNames.includes(OLD_DB_NAME)) {
                // old DB didn't exist, no need to open.
                return null;
            }
        }
        let tokenDetails = null;
        const db = await openDB(OLD_DB_NAME, OLD_DB_VERSION, {
            upgrade: async (db, oldVersion, newVersion, upgradeTransaction) => {
                if (oldVersion < 2) {
                    // Database too old, skip migration.
                    return;
                }
                if (!db.objectStoreNames.contains(OLD_OBJECT_STORE_NAME)) {
                    // Database did not exist. Nothing to do.
                    return;
                }
                const objectStore = upgradeTransaction.objectStore(OLD_OBJECT_STORE_NAME);
                const value = await objectStore.index('fcmSenderId').get(senderId);
                await objectStore.clear();
                if (!value) {
                    // No entry in the database, nothing to migrate.
                    return;
                }
                if (oldVersion === 2) {
                    const oldDetails = value;
                    if (!oldDetails.auth || !oldDetails.p256dh || !oldDetails.endpoint) {
                        return;
                    }
                    tokenDetails = {
                        token: oldDetails.fcmToken,
                        createTime: oldDetails.createTime ?? Date.now(),
                        subscriptionOptions: {
                            auth: oldDetails.auth,
                            p256dh: oldDetails.p256dh,
                            endpoint: oldDetails.endpoint,
                            swScope: oldDetails.swScope,
                            vapidKey: typeof oldDetails.vapidKey === 'string'
                                ? oldDetails.vapidKey
                                : arrayToBase64(oldDetails.vapidKey)
                        }
                    };
                }
                else if (oldVersion === 3) {
                    const oldDetails = value;
                    tokenDetails = {
                        token: oldDetails.fcmToken,
                        createTime: oldDetails.createTime,
                        subscriptionOptions: {
                            auth: arrayToBase64(oldDetails.auth),
                            p256dh: arrayToBase64(oldDetails.p256dh),
                            endpoint: oldDetails.endpoint,
                            swScope: oldDetails.swScope,
                            vapidKey: arrayToBase64(oldDetails.vapidKey)
                        }
                    };
                }
                else if (oldVersion === 4) {
                    const oldDetails = value;
                    tokenDetails = {
                        token: oldDetails.fcmToken,
                        createTime: oldDetails.createTime,
                        subscriptionOptions: {
                            auth: arrayToBase64(oldDetails.auth),
                            p256dh: arrayToBase64(oldDetails.p256dh),
                            endpoint: oldDetails.endpoint,
                            swScope: oldDetails.swScope,
                            vapidKey: arrayToBase64(oldDetails.vapidKey)
                        }
                    };
                }
            }
        });
        db.close();
        // Delete all old databases.
        await deleteDB(OLD_DB_NAME);
        await deleteDB('fcm_vapid_details_db');
        await deleteDB('undefined');
        return checkTokenDetails(tokenDetails) ? tokenDetails : null;
    }
    function checkTokenDetails(tokenDetails) {
        if (!tokenDetails || !tokenDetails.subscriptionOptions) {
            return false;
        }
        const { subscriptionOptions } = tokenDetails;
        return (typeof tokenDetails.createTime === 'number' &&
            tokenDetails.createTime > 0 &&
            typeof tokenDetails.token === 'string' &&
            tokenDetails.token.length > 0 &&
            typeof subscriptionOptions.auth === 'string' &&
            subscriptionOptions.auth.length > 0 &&
            typeof subscriptionOptions.p256dh === 'string' &&
            subscriptionOptions.p256dh.length > 0 &&
            typeof subscriptionOptions.endpoint === 'string' &&
            subscriptionOptions.endpoint.length > 0 &&
            typeof subscriptionOptions.swScope === 'string' &&
            subscriptionOptions.swScope.length > 0 &&
            typeof subscriptionOptions.vapidKey === 'string' &&
            subscriptionOptions.vapidKey.length > 0);
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const ERROR_MAP = {
        ["missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */]: 'Missing App configuration value: "{$valueName}"',
        ["only-available-in-window" /* ErrorCode.AVAILABLE_IN_WINDOW */]: 'This method is available in a Window context.',
        ["only-available-in-sw" /* ErrorCode.AVAILABLE_IN_SW */]: 'This method is available in a service worker context.',
        ["permission-default" /* ErrorCode.PERMISSION_DEFAULT */]: 'The notification permission was not granted and dismissed instead.',
        ["permission-blocked" /* ErrorCode.PERMISSION_BLOCKED */]: 'The notification permission was not granted and blocked instead.',
        ["unsupported-browser" /* ErrorCode.UNSUPPORTED_BROWSER */]: "This browser doesn't support the API's required to use the Firebase SDK.",
        ["indexed-db-unsupported" /* ErrorCode.INDEXED_DB_UNSUPPORTED */]: "This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)",
        ["failed-service-worker-registration" /* ErrorCode.FAILED_DEFAULT_REGISTRATION */]: 'We are unable to register the default service worker. {$browserErrorMessage}',
        ["token-subscribe-failed" /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */]: 'A problem occurred while subscribing the user to FCM: {$errorInfo}',
        ["token-subscribe-no-token" /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */]: 'FCM returned no token when subscribing the user to push.',
        ["fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */]: 'A problem occurred while creating an FCM registration via FID: {$errorInfo}',
        ["fid-unregister-failed" /* ErrorCode.FID_UNREGISTER_FAILED */]: 'A problem occurred while unregistering the FCM registration via FID: {$errorInfo}',
        ["fid-registration-idb-schema-unavailable" /* ErrorCode.FID_REGISTRATION_IDB_SCHEMA_UNAVAILABLE */]: 'Unable to read or persist FID registration metadata because the messaging ' +
            'IndexedDB schema is unavailable (for example, the database could not be ' +
            'upgraded to the latest version).',
        ["token-unsubscribe-failed" /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */]: 'A problem occurred while unsubscribing the ' +
            'user from FCM: {$errorInfo}',
        ["token-update-failed" /* ErrorCode.TOKEN_UPDATE_FAILED */]: 'A problem occurred while updating the user from FCM: {$errorInfo}',
        ["token-update-no-token" /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */]: 'FCM returned no token when updating the user to push.',
        ["use-sw-after-get-token" /* ErrorCode.USE_SW_AFTER_GET_TOKEN */]: 'The useServiceWorker() method may only be called once and must be ' +
            'called before calling getToken() to ensure your service worker is used.',
        ["invalid-sw-registration" /* ErrorCode.INVALID_SW_REGISTRATION */]: 'The input to useServiceWorker() must be a ServiceWorkerRegistration.',
        ["invalid-bg-handler" /* ErrorCode.INVALID_BG_HANDLER */]: 'The input to setBackgroundMessageHandler() must be a function.',
        ["invalid-vapid-key" /* ErrorCode.INVALID_VAPID_KEY */]: 'The public VAPID key must be a string.',
        ["use-vapid-key-after-get-token" /* ErrorCode.USE_VAPID_KEY_AFTER_GET_TOKEN */]: 'The usePublicVapidKey() method may only be called once and must be ' +
            'called before calling getToken() to ensure your VAPID key is used.',
        ["invalid-on-registered-handler" /* ErrorCode.INVALID_ON_REGISTERED_HANDLER */]: 'No onRegistered callback handler was provided or registered. Implement onRegistered() before register().'
    };
    const ERROR_FACTORY = new ErrorFactory('messaging', 'Messaging', ERROR_MAP);

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DATABASE_NAME = 'firebase-messaging-database';
    const DATABASE_VERSION = 2;
    const TOKEN_OBJECT_STORE_NAME = 'firebase-messaging-store';
    const FID_REGISTRATION_OBJECT_STORE_NAME = 'firebase-messaging-fid-registration-store';
    const defaultIdb = { openDB, deleteDB };
    let idbImpl = defaultIdb;
    // Open v2, but fall back to v1 if upgrade/open fails. Cache as `unknown` and guard store access.
    let dbPromise = null;
    function migrateMessagingDb(upgradeDb, oldVersion, targetSchemaVersion) {
        // Intentional fall-through for v2: run all intermediate migrations.
        // eslint-disable-next-line default-case
        switch (oldVersion) {
            case 0:
                upgradeDb.createObjectStore(TOKEN_OBJECT_STORE_NAME);
                if (targetSchemaVersion === 1) {
                    break;
                }
            // fall through
            case 1:
                if (targetSchemaVersion === 2) {
                    upgradeDb.createObjectStore(FID_REGISTRATION_OBJECT_STORE_NAME);
                }
        }
    }
    function createOpenDbOptions(targetSchemaVersion) {
        return {
            upgrade: (upgradeDb, oldVersion) => {
                migrateMessagingDb(upgradeDb, oldVersion, targetSchemaVersion);
            },
            blocked: () => {
                /* no-op */
            },
            blocking: (_currentVersion, _blockedVersion, event) => {
                dbPromise = null;
                event.target?.close();
            },
            terminated: () => {
                dbPromise = null;
            }
        };
    }
    function getDbPromise() {
        if (!dbPromise) {
            const openLatest = idbImpl.openDB(DATABASE_NAME, DATABASE_VERSION, createOpenDbOptions(2));
            // Assign synchronously to avoid concurrent openDB() calls.
            dbPromise = openLatest.catch(() => idbImpl.openDB(DATABASE_NAME, DATABASE_VERSION - 1, createOpenDbOptions(1)));
        }
        return dbPromise;
    }
    function hasObjectStore(db, storeName) {
        return db.objectStoreNames.contains(storeName);
    }
    function assertFidRegistrationObjectStore(db) {
        if (!hasObjectStore(db, FID_REGISTRATION_OBJECT_STORE_NAME)) {
            throw ERROR_FACTORY.create("fid-registration-idb-schema-unavailable" /* ErrorCode.FID_REGISTRATION_IDB_SCHEMA_UNAVAILABLE */);
        }
    }
    async function dbGet(firebaseDependencies) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        const tokenDetails = (await db
            .transaction(TOKEN_OBJECT_STORE_NAME)
            .objectStore(TOKEN_OBJECT_STORE_NAME)
            .get(key));
        if (tokenDetails) {
            return tokenDetails;
        }
        else {
            const oldTokenDetails = await migrateOldDatabase(firebaseDependencies.appConfig.senderId);
            if (oldTokenDetails) {
                await dbSet(firebaseDependencies, oldTokenDetails);
                return oldTokenDetails;
            }
        }
    }
    async function dbSet(firebaseDependencies, tokenDetails) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        const stores = [TOKEN_OBJECT_STORE_NAME];
        const hasFidStore = hasObjectStore(db, FID_REGISTRATION_OBJECT_STORE_NAME);
        if (hasFidStore) {
            stores.push(FID_REGISTRATION_OBJECT_STORE_NAME);
        }
        const tx = db.transaction(stores, 'readwrite');
        await tx.objectStore(TOKEN_OBJECT_STORE_NAME).put(tokenDetails, key);
        if (hasFidStore) {
            await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).delete(key);
        }
        await tx.done;
        return tokenDetails;
    }
    async function dbRemove(firebaseDependencies) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        const tx = db.transaction(TOKEN_OBJECT_STORE_NAME, 'readwrite');
        await tx.objectStore(TOKEN_OBJECT_STORE_NAME).delete(key);
        await tx.done;
    }
    async function dbGetFidRegistration(firebaseDependencies) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        assertFidRegistrationObjectStore(db);
        return (await db
            .transaction(FID_REGISTRATION_OBJECT_STORE_NAME)
            .objectStore(FID_REGISTRATION_OBJECT_STORE_NAME)
            .get(key));
    }
    async function dbSetFidRegistration(firebaseDependencies, details) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        assertFidRegistrationObjectStore(db);
        const tx = db.transaction([TOKEN_OBJECT_STORE_NAME, FID_REGISTRATION_OBJECT_STORE_NAME], 'readwrite');
        await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).put(details, key);
        await tx.objectStore(TOKEN_OBJECT_STORE_NAME).delete(key);
        await tx.done;
        return details;
    }
    async function dbRemoveFidRegistration(firebaseDependencies) {
        const key = getKey(firebaseDependencies);
        const db = await getDbPromise();
        assertFidRegistrationObjectStore(db);
        const tx = db.transaction(FID_REGISTRATION_OBJECT_STORE_NAME, 'readwrite');
        await tx.objectStore(FID_REGISTRATION_OBJECT_STORE_NAME).delete(key);
        await tx.done;
    }
    function getKey({ appConfig }) {
        return appConfig.appId;
    }

    const name = "@firebase/messaging";
    const version = "0.13.2";

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Max attempts (initial fetch + retries) when CreateRegistration `fetch()` throws. */
    const FID_REGISTRATION_FETCH_MAX_ATTEMPTS = 3;
    /** Base delay in ms; backoff is `BASE * 2^attempt` after each failed attempt. */
    const FID_REGISTRATION_FETCH_BASE_BACKOFF_MS = 1000;
    async function requestGetToken(firebaseDependencies, subscriptionOptions) {
        const headers = await getHeaders(firebaseDependencies);
        const body = getBody(subscriptionOptions, firebaseDependencies.appConfig.appName, 
        /* includeSdkVersion= */ false);
        const subscribeOptions = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        };
        let responseData;
        try {
            const response = await fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions);
            responseData = await response.json();
        }
        catch (err) {
            throw ERROR_FACTORY.create("token-subscribe-failed" /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */, {
                errorInfo: err?.toString()
            });
        }
        if (responseData.error) {
            const message = responseData.error.message;
            throw ERROR_FACTORY.create("token-subscribe-failed" /* ErrorCode.TOKEN_SUBSCRIBE_FAILED */, {
                errorInfo: message
            });
        }
        if (!responseData.token) {
            throw ERROR_FACTORY.create("token-subscribe-no-token" /* ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN */);
        }
        return responseData.token;
    }
    async function requestCreateRegistration(firebaseDependencies, subscriptionOptions) {
        const headers = await getHeaders(firebaseDependencies);
        const body = getBody(subscriptionOptions, firebaseDependencies.appConfig.appName, 
        /* includeSdkVersion= */ true);
        const subscribeOptions = {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        };
        let response;
        try {
            response = await fetchWithExponentialRetry(() => fetch(getEndpoint(firebaseDependencies.appConfig), subscribeOptions), FID_REGISTRATION_FETCH_MAX_ATTEMPTS, FID_REGISTRATION_FETCH_BASE_BACKOFF_MS);
        }
        catch (err) {
            throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
                errorInfo: err?.toString()
            });
        }
        if (response.ok) {
            const responseFid = await parseCreateRegistrationSuccessFid(response);
            return { responseFid };
        }
        // `fetch()` succeeded, but the backend returned a non-2xx response.
        // Best-effort parse the body to extract `error.message`, but always fail with
        // `FID_REGISTRATION_FAILED` to keep the error surface uniform.
        // Best-effort extraction of error details; the main signal is response.ok / status.
        let responseData;
        try {
            responseData = (await response.json());
        }
        catch (err) {
            throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
                errorInfo: response.statusText
            });
        }
        const message = responseData.error?.message ?? response.statusText;
        throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
            errorInfo: message
        });
    }
    /**
     * Deletes an FCM Web registration via DeleteRegistration using the Firebase Installation ID (FID).
     */
    async function requestDeleteRegistration(firebaseDependencies, fid) {
        const headers = await getHeaders(firebaseDependencies);
        const options = {
            method: 'DELETE',
            headers
        };
        let response;
        try {
            response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${fid}`, options);
        }
        catch (err) {
            throw ERROR_FACTORY.create("fid-unregister-failed" /* ErrorCode.FID_UNREGISTER_FAILED */, {
                errorInfo: err?.toString()
            });
        }
        if (response.ok) {
            return;
        }
        // Best-effort parse error details; surface uniform error code.
        try {
            const responseData = (await response.json());
            const message = responseData.error?.message ?? response.statusText;
            throw message;
        }
        catch (err) {
            // If parsing failed, fall back to status text.
            throw ERROR_FACTORY.create("fid-unregister-failed" /* ErrorCode.FID_UNREGISTER_FAILED */, {
                errorInfo: (typeof err === 'string' && err) ||
                    response.statusText ||
                    err?.toString()
            });
        }
    }
    /**
     * Parses a successful CreateRegistration body. The backend must return JSON with a non-empty
     * string `name`: a resource name `projects/{projectId}/registrations/{fid}`
     */
    async function parseCreateRegistrationSuccessFid(response) {
        const text = await response.text();
        if (!text.trim()) {
            throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
                errorInfo: 'CreateRegistration succeeded but response body is empty'
            });
        }
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
                errorInfo: 'CreateRegistration succeeded but response body is not valid JSON'
            });
        }
        const name = data.name;
        if (typeof name !== 'string' || name.length === 0) {
            throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
                errorInfo: 'CreateRegistration succeeded but response did not include a non-empty name'
            });
        }
        return parseFidFromRegistrationResourceName(name);
    }
    const REGISTRATIONS_NAME_SEGMENT = '/registrations/';
    /** Extracts the Firebase Installation ID from CreateRegistration `name` (resource path). */
    function parseFidFromRegistrationResourceName(name) {
        const segmentIndex = name.indexOf(REGISTRATIONS_NAME_SEGMENT);
        if (segmentIndex !== -1) {
            const fid = name.slice(segmentIndex + REGISTRATIONS_NAME_SEGMENT.length);
            if (fid.length > 0) {
                return fid;
            }
        }
        throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
            errorInfo: 'CreateRegistration succeeded but response name is not a valid registration resource name'
        });
    }
    async function requestUpdateToken(firebaseDependencies, tokenDetails) {
        const headers = await getHeaders(firebaseDependencies);
        const body = getBody(tokenDetails.subscriptionOptions, firebaseDependencies.appConfig.appName, 
        /* includeSdkVersion= */ false);
        const updateOptions = {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body)
        };
        let responseData;
        try {
            const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${tokenDetails.token}`, updateOptions);
            responseData = await response.json();
        }
        catch (err) {
            throw ERROR_FACTORY.create("token-update-failed" /* ErrorCode.TOKEN_UPDATE_FAILED */, {
                errorInfo: err?.toString()
            });
        }
        if (responseData.error) {
            const message = responseData.error.message;
            throw ERROR_FACTORY.create("token-update-failed" /* ErrorCode.TOKEN_UPDATE_FAILED */, {
                errorInfo: message
            });
        }
        if (!responseData.token) {
            throw ERROR_FACTORY.create("token-update-no-token" /* ErrorCode.TOKEN_UPDATE_NO_TOKEN */);
        }
        return responseData.token;
    }
    async function requestDeleteToken(firebaseDependencies, token) {
        const headers = await getHeaders(firebaseDependencies);
        const unsubscribeOptions = {
            method: 'DELETE',
            headers
        };
        try {
            const response = await fetch(`${getEndpoint(firebaseDependencies.appConfig)}/${token}`, unsubscribeOptions);
            const responseData = await response.json();
            if (responseData.error) {
                const message = responseData.error.message;
                throw ERROR_FACTORY.create("token-unsubscribe-failed" /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */, {
                    errorInfo: message
                });
            }
        }
        catch (err) {
            throw ERROR_FACTORY.create("token-unsubscribe-failed" /* ErrorCode.TOKEN_UNSUBSCRIBE_FAILED */, {
                errorInfo: err?.toString()
            });
        }
    }
    /**
     * Re-runs `operation` when it throws, with exponential backoff between attempts.
     * Rethrows the last error if all attempts fail.
     */
    async function fetchWithExponentialRetry(operation, maxAttempts, baseBackoffMs) {
        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (err) {
                lastError = err;
                if (attempt < maxAttempts - 1) {
                    const delayMs = baseBackoffMs * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }
        throw lastError;
    }
    function getEndpoint({ projectId }) {
        return `${ENDPOINT}/projects/${projectId}/registrations`;
    }
    async function getHeaders({ appConfig, installations }) {
        const authToken = await installations.getToken();
        return new Headers({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-goog-api-key': appConfig.apiKey,
            'x-goog-firebase-installations-auth': `FIS ${authToken}`
        });
    }
    /**
     * Hostname for the registering web client (e.g. `www.example.com`), or the app name
     * (`appNameFallback`) when the scope cannot be resolved (e.g. some test environments).
     */
    function getRegistrationOrigin(swScope, appNameFallback) {
        try {
            if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(swScope)) {
                return new URL(swScope).host;
            }
        }
        catch {
            // Fall through to relative-scope handling.
        }
        try {
            if (typeof self !== 'undefined' && self.location?.href) {
                return new URL(swScope, self.location.origin).host;
            }
        }
        catch {
            // Fall through.
        }
        if (typeof self !== 'undefined' && self.location?.host) {
            return self.location.host;
        }
        return appNameFallback;
    }
    function getBody({ p256dh, auth, endpoint, vapidKey, swScope }, appNameFallback, includeSdkVersion) {
        const body = {
            web: {
                origin: getRegistrationOrigin(swScope, appNameFallback),
                endpoint,
                auth,
                p256dh
            }
        };
        if (includeSdkVersion) {
            // eslint-disable-next-line camelcase
            body.fcm_sdk_version = version;
        }
        if (vapidKey !== DEFAULT_VAPID_KEY) {
            body.web.applicationPubKey = vapidKey;
        }
        return body;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // UpdateRegistration will be called once every week.
    const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    async function getTokenInternal(messaging) {
        const pushSubscription = await getPushSubscription$1(messaging.swRegistration, messaging.vapidKey);
        const subscriptionOptions = {
            vapidKey: messaging.vapidKey,
            swScope: messaging.swRegistration.scope,
            endpoint: pushSubscription.endpoint,
            auth: arrayToBase64(pushSubscription.getKey('auth')),
            p256dh: arrayToBase64(pushSubscription.getKey('p256dh'))
        };
        const tokenDetails = await dbGet(messaging.firebaseDependencies);
        if (!tokenDetails) {
            // No token, get a new one.
            return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
        }
        else if (!isTokenValid(tokenDetails.subscriptionOptions, subscriptionOptions)) {
            // Invalid token, get a new one.
            try {
                await requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
            }
            catch (e) {
                // Suppress errors because of #2364
                console.warn(e);
            }
            return getNewToken(messaging.firebaseDependencies, subscriptionOptions);
        }
        else if (Date.now() >= tokenDetails.createTime + TOKEN_EXPIRATION_MS) {
            // Weekly token refresh
            return updateToken(messaging, {
                token: tokenDetails.token,
                createTime: Date.now(),
                subscriptionOptions
            });
        }
        else {
            // Valid token, nothing to do.
            return tokenDetails.token;
        }
    }
    /**
     * Legacy getToken() path: there is a token row in IndexedDB. Revoke it with FCM, drop the row, and
     * clear any leftover FID registration metadata (apps may mix APIs).
     */
    async function revokeLegacyFcmTokenAndClearCaches(messaging, tokenDetails) {
        await requestDeleteToken(messaging.firebaseDependencies, tokenDetails.token);
        await dbRemove(messaging.firebaseDependencies);
        await removeFidRegistrationBestEffort(messaging.firebaseDependencies);
    }
    /**
     * No legacy token row: the client may only have FID-based registration (register() flow). If so,
     * delete that registration on the server, always scrub local FID metadata, then surface
     * onUnregistered when we actually had an FID.
     */
    async function revokeFidRegistrationIfStored(messaging) {
        const stored = await dbGetFidRegistration(messaging.firebaseDependencies).catch(() => undefined);
        const fid = stored?.fid;
        if (fid) {
            await requestDeleteRegistration(messaging.firebaseDependencies, fid);
        }
        await removeFidRegistrationBestEffort(messaging.firebaseDependencies);
        if (fid) {
            notifyOnUnregistered(messaging, fid);
        }
    }
    /**
     * Revokes the app's FCM registration: legacy token (getToken/deleteToken) and/or FID-based
     * registration (register/unregister), clears local caches, notifies onUnregistered when a stored
     * FID existed, then unsubscribes the push subscription when present.
     */
    async function revokeRegistrationInternal(messaging) {
        const tokenDetails = await dbGet(messaging.firebaseDependencies);
        if (tokenDetails) {
            await revokeLegacyFcmTokenAndClearCaches(messaging, tokenDetails);
        }
        else {
            await revokeFidRegistrationIfStored(messaging);
        }
        // Unsubscribe from the push subscription.
        const pushSubscription = await messaging.swRegistration.pushManager.getSubscription();
        if (pushSubscription) {
            return pushSubscription.unsubscribe();
        }
        // If there's no SW, consider it a success.
        return true;
    }
    async function updateToken(messaging, tokenDetails) {
        try {
            const updatedToken = await requestUpdateToken(messaging.firebaseDependencies, tokenDetails);
            const updatedTokenDetails = {
                ...tokenDetails,
                token: updatedToken,
                createTime: Date.now()
            };
            await dbSet(messaging.firebaseDependencies, updatedTokenDetails);
            return updatedToken;
        }
        catch (e) {
            throw e;
        }
    }
    async function getNewToken(firebaseDependencies, subscriptionOptions) {
        const token = await requestGetToken(firebaseDependencies, subscriptionOptions);
        const tokenDetails = {
            token,
            createTime: Date.now(),
            subscriptionOptions
        };
        await dbSet(firebaseDependencies, tokenDetails);
        return tokenDetails.token;
    }
    /**
     * Gets a PushSubscription for the current user.
     */
    async function getPushSubscription$1(swRegistration, vapidKey) {
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            return subscription;
        }
        return swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            // Chrome <= 75 doesn't support base64-encoded VAPID key. For backward compatibility, VAPID key
            // submitted to pushManager#subscribe must be of type Uint8Array.
            applicationServerKey: base64ToArray(vapidKey)
        });
    }
    /**
     * Checks if the saved tokenDetails object matches the configuration provided.
     */
    function isTokenValid(dbOptions, currentOptions) {
        const isVapidKeyEqual = currentOptions.vapidKey === dbOptions.vapidKey;
        const isEndpointEqual = currentOptions.endpoint === dbOptions.endpoint;
        const isAuthEqual = currentOptions.auth === dbOptions.auth;
        const isP256dhEqual = currentOptions.p256dh === dbOptions.p256dh;
        return isVapidKeyEqual && isEndpointEqual && isAuthEqual && isP256dhEqual;
    }
    /** Clears FID registration metadata; apps may mix legacy getToken() with FID register/unregister. */
    async function removeFidRegistrationBestEffort(firebaseDependencies) {
        try {
            await dbRemoveFidRegistration(firebaseDependencies);
        }
        catch {
            // Ignore.
        }
    }
    function notifyOnRegistered(messaging, fid) {
        const handler = messaging.onRegisteredHandler;
        if (!handler) {
            return;
        }
        if (typeof handler === 'function') {
            handler(fid);
        }
        else {
            handler.next(fid);
        }
    }
    function notifyOnUnregistered(messaging, fid) {
        const handler = messaging.onUnregisteredHandler;
        if (!handler) {
            return;
        }
        if (typeof handler === 'function') {
            handler(fid);
        }
        else {
            handler.next(fid);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function registerDefaultSw(messaging) {
        try {
            messaging.swRegistration = await navigator.serviceWorker.register(DEFAULT_SW_PATH, {
                scope: DEFAULT_SW_SCOPE
            });
            // The timing when browser updates sw when sw has an update is unreliable from experiment. It
            // leads to version conflict when the SDK upgrades to a newer version in the main page, but sw
            // is stuck with the old version. For example,
            // https://github.com/firebase/firebase-js-sdk/issues/2590 The following line reliably updates
            // sw if there was an update.
            messaging.swRegistration.update().catch(() => {
                /* it is non blocking and we don't care if it failed */
            });
            await waitForRegistrationActive(messaging.swRegistration);
        }
        catch (e) {
            throw ERROR_FACTORY.create("failed-service-worker-registration" /* ErrorCode.FAILED_DEFAULT_REGISTRATION */, {
                browserErrorMessage: e?.message
            });
        }
    }
    /**
     * Waits for registration to become active. MDN documentation claims that
     * a service worker registration should be ready to use after awaiting
     * navigator.serviceWorker.register() but that doesn't seem to be the case in
     * practice, causing the SDK to throw errors when calling
     * swRegistration.pushManager.subscribe() too soon after register(). The only
     * solution seems to be waiting for the service worker registration `state`
     * to become "active".
     */
    async function waitForRegistrationActive(registration) {
        return new Promise((resolve, reject) => {
            const rejectTimeout = setTimeout(() => reject(new Error(`Service worker not registered after ${DEFAULT_REGISTRATION_TIMEOUT} ms`)), DEFAULT_REGISTRATION_TIMEOUT);
            const incomingSw = registration.installing || registration.waiting;
            if (registration.active) {
                clearTimeout(rejectTimeout);
                resolve();
            }
            else if (incomingSw) {
                incomingSw.onstatechange = ev => {
                    if (ev.target?.state === 'activated') {
                        incomingSw.onstatechange = null;
                        clearTimeout(rejectTimeout);
                        resolve();
                    }
                };
            }
            else {
                clearTimeout(rejectTimeout);
                reject(new Error('No incoming service worker found.'));
            }
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function updateSwReg(messaging, swRegistration) {
        if (!swRegistration && !messaging.swRegistration) {
            await registerDefaultSw(messaging);
        }
        if (!swRegistration && !!messaging.swRegistration) {
            return;
        }
        if (!(swRegistration instanceof ServiceWorkerRegistration)) {
            throw ERROR_FACTORY.create("invalid-sw-registration" /* ErrorCode.INVALID_SW_REGISTRATION */);
        }
        messaging.swRegistration = swRegistration;
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function updateVapidKey(messaging, vapidKey) {
        if (!!vapidKey) {
            messaging.vapidKey = vapidKey;
        }
        else if (!messaging.vapidKey) {
            messaging.vapidKey = DEFAULT_VAPID_KEY;
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /** Retries when CreateRegistration echoes an FID that does not match Installations.getId(). */
    const FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS = 3;
    /**
     * For the new FID-based register path:
     * - Create (or refresh) an FCM Web registration in the backend via CreateRegistration.
     * - Use the FIS auth token produced by the installations instance (implicitly associated with FID).
     * - CreateRegistration must echo the installation in `name` (e.g.
     *   `projects/{projectId}/registrations/{fid}`); it must match `expectedFid` from
     *   Installations.getId(). On mismatch we refresh the auth token and retry, then fail with
     *   `fid-registration-failed`.
     */
    async function registerFcmRegistrationWithFid(messaging, expectedFid) {
        const pushSubscription = await getPushSubscription(messaging.swRegistration, messaging.vapidKey);
        const subscriptionOptions = {
            vapidKey: messaging.vapidKey,
            swScope: messaging.swRegistration.scope,
            endpoint: pushSubscription.endpoint,
            auth: arrayToBase64(pushSubscription.getKey('auth')),
            p256dh: arrayToBase64(pushSubscription.getKey('p256dh'))
        };
        const installations = messaging.firebaseDependencies.installations;
        for (let attempt = 0; attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS; attempt++) {
            const { responseFid } = await requestCreateRegistration(messaging.firebaseDependencies, subscriptionOptions);
            if (responseFid === expectedFid) {
                return;
            }
            // If CreateRegistration echoes an unexpected FID, the FIS auth token used for the request may
            // be stale relative to the installation the backend associates with the call. Force-refresh
            // the token before retrying so the next attempt uses credentials aligned with Installations.
            if (attempt < FID_REGISTRATION_FID_MATCH_MAX_ATTEMPTS - 1) {
                await installations.getToken(true);
            }
        }
        throw ERROR_FACTORY.create("fid-registration-failed" /* ErrorCode.FID_REGISTRATION_FAILED */, {
            errorInfo: 'CreateRegistration response FID does not match Firebase Installation ID'
        });
    }
    async function getPushSubscription(swRegistration, vapidKey) {
        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            return subscription;
        }
        // Chrome/Firefox require applicationServerKey to be of type Uint8Array.
        return swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            // `PushManager.subscribe` expects a `BufferSource`; `base64ToArray` produces a typed array.
            // Cast to satisfy the lib typing differences across TS DOM versions.
            applicationServerKey: base64ToArray(vapidKey)
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const FID_REGISTRATION_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    /**
     * Registers the app instance with FCM using its Firebase Installation ID (FID). The FID is
     * delivered via the `onRegistered` callback. Call this to establish an FID-based identity.
     * Once `onRegistered` provides an FID, instruct your backend to remove any legacy token
     * previously associated with this instance. The backend send API supports FID as a target.
     *
     * When called multiple times, `onRegistered` is invoked on each call with the current FID.
     * Backend registration sync runs on first register, when the FID changes, or on weekly refresh.
     *
     * @param messaging - The MessagingService instance.
     * @param options - Optional. Same options as getToken (vapidKey, serviceWorkerRegistration).
     */
    async function register$1(messaging, options) {
        if (!navigator) {
            throw ERROR_FACTORY.create("only-available-in-window" /* ErrorCode.AVAILABLE_IN_WINDOW */);
        }
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') {
            throw ERROR_FACTORY.create("permission-blocked" /* ErrorCode.PERMISSION_BLOCKED */);
        }
        if (!messaging.onRegisteredHandler) {
            throw ERROR_FACTORY.create("invalid-on-registered-handler" /* ErrorCode.INVALID_ON_REGISTERED_HANDLER */);
        }
        await updateVapidKey(messaging, options?.vapidKey);
        await updateSwReg(messaging, options?.serviceWorkerRegistration);
        // Keep the queue alive after a failed register() so future calls can retry.
        const prev = messaging._registerNotifyChain.catch(() => { });
        messaging._registerNotifyChain = prev.then(async () => {
            const fid = await messaging.firebaseDependencies.installations.getId();
            const stored = await dbGetFidRegistration(messaging.firebaseDependencies);
            const now = Date.now();
            const shouldRefresh = !stored ||
                stored.fid !== fid ||
                now >= stored.lastRegisterTime + FID_REGISTRATION_REFRESH_MS;
            if (shouldRefresh) {
                await registerFcmRegistrationWithFid(messaging, fid);
                await dbSetFidRegistration(messaging.firebaseDependencies, {
                    fid,
                    lastRegisterTime: now,
                    vapidKey: messaging.vapidKey
                });
            }
            const handler = messaging.onRegisteredHandler;
            if (!handler) {
                throw ERROR_FACTORY.create("invalid-on-registered-handler" /* ErrorCode.INVALID_ON_REGISTERED_HANDLER */);
            }
            notifyOnRegistered(messaging, fid);
        });
        return messaging._registerNotifyChain;
    }

    /**
     * @license
     * Copyright 2026 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * When the Firebase Installation ID changes, re-run `register()` so FCM registration and
     * onRegistered run for the new FID. No-op if no onRegistered handler is set or the app
     * instance was never registered with FCM.
     */
    function subscribeFidChangeRegistration(messaging, installations) {
        return onIdChange(installations, () => {
            void (async () => {
                if (!messaging.onRegisteredHandler) {
                    return;
                }
                const stored = await dbGetFidRegistration(messaging.firebaseDependencies);
                if (!stored) {
                    return;
                }
                await register$1(messaging).catch(() => {
                    // Best-effort: permission may be revoked or SW unavailable after FID rotation.
                });
            })();
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function externalizePayload(internalPayload) {
        const payload = {
            from: internalPayload.from,
            // eslint-disable-next-line camelcase
            collapseKey: internalPayload.collapse_key,
            // eslint-disable-next-line camelcase
            messageId: internalPayload.fcmMessageId
        };
        propagateNotificationPayload(payload, internalPayload);
        propagateDataPayload(payload, internalPayload);
        propagateFcmOptions(payload, internalPayload);
        return payload;
    }
    function propagateNotificationPayload(payload, messagePayloadInternal) {
        if (!messagePayloadInternal.notification) {
            return;
        }
        payload.notification = {};
        const title = messagePayloadInternal.notification.title;
        if (!!title) {
            payload.notification.title = title;
        }
        const body = messagePayloadInternal.notification.body;
        if (!!body) {
            payload.notification.body = body;
        }
        const image = messagePayloadInternal.notification.image;
        if (!!image) {
            payload.notification.image = image;
        }
        const icon = messagePayloadInternal.notification.icon;
        if (!!icon) {
            payload.notification.icon = icon;
        }
    }
    function propagateDataPayload(payload, messagePayloadInternal) {
        if (!messagePayloadInternal.data) {
            return;
        }
        payload.data = messagePayloadInternal.data;
    }
    function propagateFcmOptions(payload, messagePayloadInternal) {
        // fcmOptions.link value is written into notification.click_action. see more in b/232072111
        if (!messagePayloadInternal.fcmOptions &&
            !messagePayloadInternal.notification?.click_action) {
            return;
        }
        payload.fcmOptions = {};
        const link = messagePayloadInternal.fcmOptions?.link ??
            messagePayloadInternal.notification?.click_action;
        if (!!link) {
            payload.fcmOptions.link = link;
        }
        // eslint-disable-next-line camelcase
        const analyticsLabel = messagePayloadInternal.fcmOptions?.analytics_label;
        if (!!analyticsLabel) {
            payload.fcmOptions.analyticsLabel = analyticsLabel;
        }
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function isConsoleMessage(data) {
        // This message has a campaign ID, meaning it was sent using the Firebase Console.
        return typeof data === 'object' && !!data && CONSOLE_CAMPAIGN_ID in data;
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function extractAppConfig(app) {
        if (!app || !app.options) {
            throw getMissingValueError('App Configuration Object');
        }
        if (!app.name) {
            throw getMissingValueError('App Name');
        }
        // Required app config keys
        const configKeys = [
            'projectId',
            'apiKey',
            'appId',
            'messagingSenderId'
        ];
        const { options } = app;
        for (const keyName of configKeys) {
            if (!options[keyName]) {
                throw getMissingValueError(keyName);
            }
        }
        return {
            appName: app.name,
            projectId: options.projectId,
            apiKey: options.apiKey,
            appId: options.appId,
            senderId: options.messagingSenderId
        };
    }
    function getMissingValueError(valueName) {
        return ERROR_FACTORY.create("missing-app-config-values" /* ErrorCode.MISSING_APP_CONFIG_VALUES */, {
            valueName
        });
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    class MessagingService {
        constructor(app, installations, analyticsProvider) {
            // logging is only done with end user consent. Default to false.
            this.deliveryMetricsExportedToBigQueryEnabled = false;
            this.onBackgroundMessageHandler = null;
            this.onMessageHandler = null;
            /** Observer for the event that the app instance is registered with FCM via Firebase Installation ID (FID). */
            this.onRegisteredHandler = null;
            /** Observer for the event that the app instance is unregistered from FCM (FID no longer active). */
            this.onUnregisteredHandler = null;
            /**
             * Serializes the FID get + compare + notify step so concurrent register() calls
             * do not race each other.
             */
            this._registerNotifyChain = Promise.resolve();
            /** Unsubscribe from Installations `onIdChange` when messaging is deleted. */
            this._fidChangeUnsubscribe = null;
            this.logEvents = [];
            /**
             * Single source of truth for the logging loop lifecycle.
             *
             * `scheduled` holds the active timer id; `flushing` indicates an async dispatch
             * is in progress (prevents duplicate starts); `stopped` means idle.
             */
            this.logQueue = { state: 'stopped' };
            const appConfig = extractAppConfig(app);
            this.firebaseDependencies = {
                app,
                appConfig,
                installations,
                analyticsProvider
            };
        }
        _delete() {
            if (this._fidChangeUnsubscribe) {
                this._fidChangeUnsubscribe();
                this._fidChangeUnsubscribe = null;
            }
            if (this.logQueue.state === 'scheduled') {
                clearTimeout(this.logQueue.timerId);
            }
            this.logQueue = { state: 'stopped' };
            return Promise.resolve();
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function getToken$1(messaging, options) {
        if (!navigator) {
            throw ERROR_FACTORY.create("only-available-in-window" /* ErrorCode.AVAILABLE_IN_WINDOW */);
        }
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') {
            throw ERROR_FACTORY.create("permission-blocked" /* ErrorCode.PERMISSION_BLOCKED */);
        }
        await updateVapidKey(messaging, options?.vapidKey);
        await updateSwReg(messaging, options?.serviceWorkerRegistration);
        return getTokenInternal(messaging);
    }

    /**
     * @license
     * Copyright 2019 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function logToScion(messaging, messageType, data) {
        const eventType = getEventType(messageType);
        const analytics = await messaging.firebaseDependencies.analyticsProvider.get();
        analytics.logEvent(eventType, {
            /* eslint-disable camelcase */
            message_id: data[CONSOLE_CAMPAIGN_ID],
            message_name: data[CONSOLE_CAMPAIGN_NAME],
            message_time: data[CONSOLE_CAMPAIGN_TIME],
            message_device_time: Math.floor(Date.now() / 1000)
            /* eslint-enable camelcase */
        });
    }
    function getEventType(messageType) {
        switch (messageType) {
            case MessageType.NOTIFICATION_CLICKED:
                return 'notification_open';
            case MessageType.PUSH_RECEIVED:
                return 'notification_foreground';
            default:
                throw new Error();
        }
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function messageEventListener(messaging, event) {
        const internalPayload = event.data;
        if (!internalPayload.isFirebaseMessaging) {
            return;
        }
        if (messaging.onMessageHandler &&
            internalPayload.messageType === MessageType.PUSH_RECEIVED) {
            if (typeof messaging.onMessageHandler === 'function') {
                messaging.onMessageHandler(externalizePayload(internalPayload));
            }
            else {
                messaging.onMessageHandler.next(externalizePayload(internalPayload));
            }
        }
        if (messaging.onRegisteredHandler &&
            internalPayload.messageType === MessageType.FID_REGISTERED) {
            const fid = internalPayload.fid;
            if (typeof messaging.onRegisteredHandler === 'function') {
                messaging.onRegisteredHandler(fid);
            }
            else {
                messaging.onRegisteredHandler.next(fid);
            }
        }
        // Log to Scion if applicable
        const dataPayload = internalPayload.data;
        if (isConsoleMessage(dataPayload) &&
            dataPayload[CONSOLE_CAMPAIGN_ANALYTICS_ENABLED] === '1') {
            await logToScion(messaging, internalPayload.messageType, dataPayload);
        }
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const WindowMessagingFactory = (container) => {
        const messaging = new MessagingService(container.getProvider('app').getImmediate(), container.getProvider('installations-internal').getImmediate(), container.getProvider('analytics-internal'));
        navigator.serviceWorker.addEventListener('message', e => messageEventListener(messaging, e));
        messaging._fidChangeUnsubscribe = subscribeFidChangeRegistration(messaging, container.getProvider('installations').getImmediate());
        return messaging;
    };
    const WindowMessagingInternalFactory = (container) => {
        const messaging = container
            .getProvider('messaging')
            .getImmediate();
        const messagingInternal = {
            getToken: (options) => getToken$1(messaging, options),
            register: (options) => register$1(messaging, options)
        };
        return messagingInternal;
    };
    function registerMessagingInWindow() {
        _registerComponent(new Component('messaging', WindowMessagingFactory, "PUBLIC" /* ComponentType.PUBLIC */));
        _registerComponent(new Component('messaging-internal', WindowMessagingInternalFactory, "PRIVATE" /* ComponentType.PRIVATE */));
        registerVersion(name, version);
        // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
        registerVersion(name, version, 'esm2020');
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Checks if all required APIs exist in the browser.
     * @returns a Promise that resolves to a boolean.
     *
     * @public
     */
    async function isWindowSupported() {
        try {
            // This throws if open() is unsupported, so adding it to the conditional
            // statement below can cause an uncaught error.
            await validateIndexedDBOpenable();
        }
        catch (e) {
            return false;
        }
        // firebase-js-sdk/issues/2393 reveals that idb#open in Safari iframe and Firefox private browsing
        // might be prohibited to run. In these contexts, an error would be thrown during the messaging
        // instantiating phase, informing the developers to import/call isSupported for special handling.
        return (typeof window !== 'undefined' &&
            isIndexedDBAvailable() &&
            areCookiesEnabled() &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window &&
            'fetch' in window &&
            ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
            PushSubscription.prototype.hasOwnProperty('getKey'));
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    async function deleteToken$1(messaging) {
        if (!navigator) {
            throw ERROR_FACTORY.create("only-available-in-window" /* ErrorCode.AVAILABLE_IN_WINDOW */);
        }
        if (!messaging.swRegistration) {
            await registerDefaultSw(messaging);
        }
        return revokeRegistrationInternal(messaging);
    }

    /**
     * @license
     * Copyright 2020 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function onMessage$1(messaging, nextOrObserver) {
        if (!navigator) {
            throw ERROR_FACTORY.create("only-available-in-window" /* ErrorCode.AVAILABLE_IN_WINDOW */);
        }
        messaging.onMessageHandler = nextOrObserver;
        return () => {
            messaging.onMessageHandler = null;
        };
    }

    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Retrieves a Firebase Cloud Messaging instance.
     *
     * @returns The Firebase Cloud Messaging instance associated with the provided firebase app.
     *
     * @public
     */
    function getMessagingInWindow(app = getApp()) {
        // Conscious decision to make this async check non-blocking during the messaging instance
        // initialization phase for performance consideration. An error would be thrown latter for
        // developer's information. Developers can then choose to import and call `isSupported` for
        // special handling.
        isWindowSupported().then(isSupported => {
            // If `isWindowSupported()` resolved, but returned false.
            if (!isSupported) {
                throw ERROR_FACTORY.create("unsupported-browser" /* ErrorCode.UNSUPPORTED_BROWSER */);
            }
        }, _ => {
            // If `isWindowSupported()` rejected.
            throw ERROR_FACTORY.create("indexed-db-unsupported" /* ErrorCode.INDEXED_DB_UNSUPPORTED */);
        });
        return _getProvider(getModularInstance(app), 'messaging').getImmediate();
    }
    /**
     * Subscribes the {@link Messaging} instance to push notifications. Returns a Firebase Cloud
     * Messaging registration token that can be used to send push messages to that {@link Messaging}
     * instance.
     *
     * If notification permission isn't already granted, this method asks the user for permission. The
     * returned promise rejects if the user does not allow the app to show notifications.
     *
     * @param messaging - The {@link Messaging} instance.
     * @param options - Provides an optional vapid key and an optional service worker registration.
     *
     * @returns The promise resolves with an FCM registration token.
     *
     * @deprecated Use {@link register} together with {@link onRegistered} for Firebase
     * Installation ID-based messaging instead of retrieving an FCM registration token with this API.
     *
     * @public
     */
    async function getToken(messaging, options) {
        messaging = getModularInstance(messaging);
        return getToken$1(messaging, options);
    }
    /**
     * Deletes the registration token associated with this {@link Messaging} instance and unsubscribes
     * the {@link Messaging} instance from the push subscription.
     *
     * If there is no legacy registration token but the client has FID-based registration metadata
     * (from {@link register}), this deletes that registration on the server, clears local metadata, and
     * invokes {@link onUnregistered} with the removed FID when successful.
     *
     * @param messaging - The {@link Messaging} instance.
     *
     * @returns The promise resolves when the token has been successfully deleted.
     *
     * @deprecated Use {@link onUnregistered} to observe when the client is no longer
     * registered and update your backend accordingly, instead of explicitly deleting the
     * registration token with this API.
     *
     * @public
     */
    function deleteToken(messaging) {
        messaging = getModularInstance(messaging);
        return deleteToken$1(messaging);
    }
    /**
     * When a push message is received and the user is currently on a page for your origin, the
     * message is passed to the page and an `onMessage()` event is dispatched with the payload of
     * the push message.
     *
     *
     * @param messaging - The {@link Messaging} instance.
     * @param nextOrObserver - This function, or observer object with `next` defined,
     *     is called when a message is received and the user is currently viewing your page.
     * @returns To stop listening for messages execute this returned function.
     *
     * @public
     */
    function onMessage(messaging, nextOrObserver) {
        messaging = getModularInstance(messaging);
        return onMessage$1(messaging, nextOrObserver);
    }

    /**
     * The Firebase Cloud Messaging Web SDK.
     * This SDK does not work in a Node.js environment.
     *
     * @packageDocumentation
     */
    /**
     * @license
     * Copyright 2017 Google LLC
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    registerMessagingInWindow();

    var dist = {};

    var hasRequiredDist;
    function requireDist() {
      if (hasRequiredDist) return dist;
      hasRequiredDist = 1;
      Object.defineProperty(dist, "__esModule", { value: true });
      dist.isTokenAlreadyRegisteredError = isTokenAlreadyRegisteredError;
      function isTokenAlreadyRegisteredError(data) {
        if (typeof data !== "object" || data === null) {
          return false;
        }
        const messages = data.errors?.push_device_token;
        if (!Array.isArray(messages)) {
          return false;
        }
        return messages.some((msg) => typeof msg === "string" && /already exists/i.test(msg));
      }
      return dist;
    }

    var distExports = requireDist();

    const DB_NAME$1 = "june-push-sdk";
    const DB_VERSION$1 = 1;
    const STORE_NAME$1 = "unsubscribe-links";
    function openDb$1() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME$1, DB_VERSION$1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME$1)) {
            db.createObjectStore(STORE_NAME$1);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    async function readUnsubscribeLink(collectToken) {
      try {
        const db = await openDb$1();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME$1, "readonly");
          const req = tx.objectStore(STORE_NAME$1).get(collectToken);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn("[JunePushSDK] IndexedDB-Lesezugriff fehlgeschlagen:", err);
        return null;
      }
    }
    async function writeUnsubscribeLink(collectToken, link) {
      try {
        const db = await openDb$1();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME$1, "readwrite");
          tx.objectStore(STORE_NAME$1).put(link, collectToken);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn("[JunePushSDK] IndexedDB-Schreibzugriff fehlgeschlagen:", err);
      }
    }
    async function deleteUnsubscribeLink(collectToken) {
      try {
        const db = await openDb$1();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME$1, "readwrite");
          tx.objectStore(STORE_NAME$1).delete(collectToken);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn("[JunePushSDK] IndexedDB-L\xF6schzugriff fehlgeschlagen:", err);
      }
    }

    const DB_NAME = "june-push-sdk-banner";
    const DB_VERSION = 1;
    const STORE_NAME = "pending-banners";
    function openDb() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    async function readPendingBanner(collectToken) {
      try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get(collectToken);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.warn("[JunePushSDK] IndexedDB-Lesezugriff fehlgeschlagen:", err);
        return null;
      }
    }
    async function clearPendingBanner(collectToken) {
      try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readwrite");
          tx.objectStore(STORE_NAME).delete(collectToken);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.warn("[JunePushSDK] IndexedDB-L\xF6schzugriff fehlgeschlagen:", err);
      }
    }

    class JunePushSDK {
      constructor(options = {}) {
        if (!window.__JUNE_PUSH_CONFIG__) {
          throw new Error("Firebase-Config wurde nicht geladen!");
        }
        const globalConfig = window.__JUNE_PUSH_CONFIG__;
        this.vapidKey = options.vapidKey ?? globalConfig.vapidKey;
        this.collectToken = options.collectToken ?? globalConfig.collectToken;
        this.apiBaseUrl = globalConfig.apiBaseUrl ?? options.apiBaseUrl;
        this.disablePushNotificationInForeground = options.disablePushNotificationInForeground ?? false;
        this.serviceWorkerPath = "/junePushSw.js";
        if (!this.vapidKey) {
          throw new Error(
            "Kein vapidKey gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__)."
          );
        }
        if (!this.collectToken) {
          throw new Error(
            "Kein collectToken gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__)."
          );
        }
        if (!this.apiBaseUrl) {
          throw new Error(
            "Kein apiBaseUrl gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__) - Pflichtfeld, kein Standardwert vorhanden."
          );
        }
        this.app = initializeApp(globalConfig);
        this.messaging = getMessagingInWindow(this.app);
      }
      async initWorker() {
        return this.register();
      }
      /**
       * Aktueller Subscription-Status, ohne Netzwerkaufruf - zum Rendern eines
       * "Anmelden"- oder "Abmelden"-Buttons in der eigenen UI. Sollte nach
       * register() bzw. unsubscribe() erneut abgefragt werden, um die UI zu
       * aktualisieren (kein automatisches Event dafür, bewusst simpel gehalten).
       */
      getSubscriptionStatus() {
        if (Notification.permission === "denied") {
          return "denied";
        }
        if (Notification.permission === "granted" && this.getCachedToken()) {
          return "subscribed";
        }
        return "unsubscribed";
      }
      /**
       * Fragt Permission an, holt den FCM-Token und speichert ihn im Backend -
       * vermeidet dabei unnötige Backend-Aufrufe, falls z. B. auf jedem
       * Seitenaufruf register() aufgerufen wird:
       *
       * - Berechtigung bereits abgelehnt ("denied"): bricht sofort ab, ohne
       *   Service Worker, Firebase oder Backend überhaupt anzufassen.
       * - Bereits erfolgreich registriert (Token im localStorage gecacht) UND
       *   Berechtigung weiterhin erteilt: gibt den gecachten Token zurück, ohne
       *   erneut getToken()/saveToken() aufzurufen. navigator.serviceWorker.
       *   register() wird trotzdem aufgerufen (siehe Kommentar dort) - sonst
       *   bemerkt der Browser ein aktualisiertes SW-Skript unter Umständen erst
       *   nach bis zu 24h statt beim nächsten Seitenaufruf.
       */
      async register() {
        if (Notification.permission === "denied") {
          console.warn(
            "[JunePushSDK] Push-Berechtigung wurde abgelehnt, register() abgebrochen."
          );
          return null;
        }
        const reg = await navigator.serviceWorker.register(
          `${this.serviceWorkerPath}?v=${Date.now()}`
        );
        const cachedToken = this.getCachedToken();
        if (cachedToken && Notification.permission === "granted") {
          const existingSubscription = await reg.pushManager.getSubscription();
          if (existingSubscription) {
            console.log(
              "[JunePushSDK] Bereits erfolgreich registriert, nutze gecachten Token."
            );
            return cachedToken;
          }
          console.log(
            "[JunePushSDK] Gecachter Token ohne aktive Push-Subscription (z. B. nach Widerruf+Neuerteilung der Berechtigung) - hole neuen Token."
          );
          this.clearCachedToken();
        }
        try {
          const token = await getToken(this.messaging, {
            vapidKey: this.vapidKey,
            serviceWorkerRegistration: reg
          });
          if (token) {
            const saved = await this.saveToken(token);
            if (saved) {
              this.setCachedToken(token);
            } else {
              console.warn(
                "[JunePushSDK] Token erhalten, aber im Backend nicht gespeichert."
              );
            }
          }
          return token;
        } catch (err) {
          console.error("[JunePushSDK] Registrierung fehlgeschlagen:", err);
          return null;
        }
      }
      get cacheKey() {
        return `june_push_token:${this.collectToken}`;
      }
      getCachedToken() {
        try {
          return localStorage.getItem(this.cacheKey);
        } catch {
          return null;
        }
      }
      setCachedToken(token) {
        try {
          localStorage.setItem(this.cacheKey, token);
        } catch {
        }
      }
      clearCachedToken() {
        try {
          localStorage.removeItem(this.cacheKey);
        } catch {
        }
      }
      /**
       * Zuletzt zwischengespeicherter Abmelde-Link (siehe unsubscribe_click_link),
       * unabhängig vom aktuellen Seitenaufruf - auch dann vorhanden, wenn der
       * Link nur über eine Hintergrund-Nachricht ankam (Tab war beim Empfang
       * geschlossen). Gecacht wird in IndexedDB statt localStorage, weil der
       * Service Worker (JunePushSw.ts, verarbeitet Hintergrund-Nachrichten)
       * localStorage nicht nutzen kann, IndexedDB aber schon - siehe
       * unsubscribeLinkCache.ts. Ohne diesen Aufruf kennt die eigene UI den Link
       * erst, sobald im laufenden Tab tatsächlich eine Nachricht ankommt.
       */
      async getUnsubscribeLink() {
        return readUnsubscribeLink(this.collectToken);
      }
      /**
       * Liest den zuletzt über eine Hintergrund-Nachricht empfangenen
       * banner_html-Wert (siehe JunePushSw.ts, cacht ihn in IndexedDB, weil der
       * Service Worker kein localStorage nutzen kann) und löscht ihn danach aus
       * dem Cache. Gedacht für einen einmaligen Aufruf beim Laden der Seite
       * (z. B. direkt nach dem SDK-Setup), um den Banner aus einer Nachricht
       * anzuzeigen, die eintraf, während kein Tab offen war - nicht für
       * wiederholte Aufrufe, sonst würde der Banner beim zweiten Aufruf einfach
       * als "nichts Neues" (null) zurückkommen, selbst wenn er noch nicht
       * angezeigt wurde.
       *
       * Im Vordergrund empfangene Nachrichten laufen weiterhin direkt über
       * listenToForegroundMessages() - die brauchen diesen Cache nicht, die
       * Seite ist ja schon offen und zeigt den Banner live an.
       */
      async consumePendingBanner() {
        const bannerHtml = await readPendingBanner(this.collectToken);
        if (bannerHtml) {
          await clearPendingBanner(this.collectToken);
        }
        return bannerHtml;
      }
      /**
       * Meldet den Kontakt über den in der Nachricht mitgeschickten Link ab
       * (data.unsubscribe_click_link - vollständige URL, Token ist darin schon
       * enthalten). Meldet den Push-Token danach auch lokal beim Browser ab
       * (deleteToken) und räumt den register()-Cache auf, damit ein späterer
       * register()-Aufruf nicht den jetzt ungültigen Token zurückgibt, sondern
       * neu registriert.
       */
      async unsubscribe(unsubscribeLink) {
        try {
          const response = await fetch(unsubscribeLink, { method: "GET" });
          if (response.ok) {
            this.clearCachedToken();
            await deleteUnsubscribeLink(this.collectToken);
            await deleteToken(this.messaging).catch((err) => {
              console.warn(
                "[JunePushSDK] Lokales Abmelden des Tokens fehlgeschlagen:",
                err
              );
            });
          } else {
            console.warn(
              "[JunePushSDK] Abmelden im Backend fehlgeschlagen, Status:",
              response.status
            );
          }
          return response.ok;
        } catch (err) {
          console.error("[JunePushSDK] Abmelden fehlgeschlagen:", err);
          return false;
        }
      }
      /**
       * Reagiert automatisch, wenn die Notification-Berechtigung widerrufen wird
       * (z. B. über die Browser-Einstellungen, nicht über unseren "Abmelden"-
       * Button) - meldet den Kontakt dann über den zuletzt zwischengespeicherten
       * unsubscribe_click_link ab (siehe listenToForegroundMessages(), das
       * cacht ihn bei jeder Nachricht mit diesem Feld).
       *
       * Prüft sowohl den aktuellen Stand direkt beim Aufruf (falls die
       * Berechtigung schon vor dem Öffnen der Seite widerrufen wurde) als auch
       * laufend während die Seite offen ist. Setzt die Permissions API voraus
       * (fehlt z. B. in älteren Safari-Versionen) - ohne die passiert nichts,
       * bricht aber nicht ab.
       *
       * Einschränkung: greift nur, solange die Seite offen ist bzw. beim
       * nächsten Aufruf - es gibt keinen Browser-Mechanismus, der uns über einen
       * Widerruf informiert, während die Seite geschlossen ist. Der zwischen-
       * gespeicherte Link selbst liegt aber in IndexedDB und wird auch vom
       * Service Worker bei Hintergrund-Nachrichten befüllt (siehe JunePushSw.ts)
       * - kam der letzte unsubscribe_click_link nur im Hintergrund an, ist er
       * hier trotzdem bekannt.
       */
      async watchPermissionRevocation() {
        if (!("permissions" in navigator)) {
          return;
        }
        const reactToState = async (state) => {
          if (state !== "denied") return;
          const link = await readUnsubscribeLink(this.collectToken);
          if (!link) return;
          console.log(
            "[JunePushSDK] Berechtigung widerrufen, melde \xFCber zwischengespeicherten Link ab."
          );
          await this.unsubscribe(link);
        };
        try {
          const status = await navigator.permissions.query({
            name: "notifications"
          });
          await reactToState(status.state);
          status.onchange = () => reactToState(status.state);
        } catch (err) {
          console.warn("[JunePushSDK] Permissions API nicht verf\xFCgbar:", err);
        }
      }
      listenToForegroundMessages(callback) {
        onMessage(this.messaging, async (payload) => {
          const data = payload.data ?? {};
          if (data.tracking_open_link) {
            fetch(data.tracking_open_link, { method: "GET" });
          }
          if (data.unsubscribe_click_link) {
            await writeUnsubscribeLink(this.collectToken, data.unsubscribe_click_link);
          }
          if (data.title && Notification.permission === "granted" && !this.disablePushNotificationInForeground) {
            const n = new Notification(data.title, {
              body: data.body,
              icon: data.icon,
              data
            });
            n.onclick = (event) => {
              event.preventDefault();
              if (data.tracking_click_link) {
                window.open(data.tracking_click_link, "_blank");
              }
            };
          }
          callback(data);
        });
      }
      /**
       * Speichert den Token im Backend. Gibt zurück, ob das Speichern
       * erfolgreich war (HTTP-Status ok) - so kann register() darauf reagieren,
       * statt blind anzunehmen, dass der Token gesetzt wurde.
       */
      async saveToken(token) {
        try {
          const response = await fetch(
            `${this.apiBaseUrl}/v2/public/collection/${this.collectToken}/collects`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ push_device_token: token })
            }
          );
          const data = await response.json();
          console.log("[JunePushSDK] Backend-Antwort:", data);
          if (response.ok) {
            return true;
          }
          if (distExports.isTokenAlreadyRegisteredError(data)) {
            console.log(
              "[JunePushSDK] Token war bereits im Backend hinterlegt, werte als Erfolg."
            );
            return true;
          }
          return false;
        } catch (err) {
          console.error("[JunePushSDK] saveToken fehlgeschlagen:", err);
          return false;
        }
      }
    }
    window.JunePushSDK = JunePushSDK;

    exports.JunePushSDK = JunePushSDK;

}));
//# sourceMappingURL=JunePushSDK.js.map
