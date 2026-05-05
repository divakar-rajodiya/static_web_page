/**
 * QPRO Label API Client
 *
 * Use this file for direct API flows that do not need the renderer SDK:
 *  - fetch_markups
 *  - export-svg (server-rendered SVG)
 *  - print-node (ZPL)
 *  - print-node-pdf
 */

(function (global) {
    const QPROLabelAPI = {};

    QPROLabelAPI.config = {
        apiBaseUrl: "",
        api_key: "",
        api_token: "",
        debug: false,
    };

    QPROLabelAPI.setConfig = function (options = {}) {
        QPROLabelAPI.config = {
            ...QPROLabelAPI.config,
            ...options,
        };
    };

    function log(...args) {
        if (QPROLabelAPI.config.debug) {
            console.log("[QPRO LABEL API]", ...args);
        }
    }

    function validateCommonPayload({ label_name, amount, apiData }) {
        if (!QPROLabelAPI.config.apiBaseUrl) {
            throw new Error("apiBaseUrl is missing in config.");
        }
        if (!QPROLabelAPI.config.api_key || !QPROLabelAPI.config.api_token) {
            throw new Error("api key/api token missing in config.");
        }
        if (!label_name) {
            throw new Error("label_name is required.");
        }
        if (!amount || amount < 1) {
            throw new Error("amount must be at least 1.");
        }
        if (apiData == null || typeof apiData !== "object" || Array.isArray(apiData)) {
            throw new Error("apiData must be an object.");
        }
    }

    async function requestJson(endpoint, payload) {
        const { apiBaseUrl, api_key, api_token } = QPROLabelAPI.config;
        const url = `${apiBaseUrl}${endpoint}`;

        log("Calling API:", url, payload);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || data?.error || `Request failed for ${endpoint}`);
        }

        return data;
    }

    QPROLabelAPI.fetchMarkups = async function ({
        label_name,
        amount = 1,
        apiData = {},
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        const data = await requestJson("/custom-labels/fetch-markups", {
            label_name,
            amount,
            apiData,
        });

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No markup returned from server.");
        }

        return data;
    };

    QPROLabelAPI.exportBackendSVG = async function ({
        label_name,
        amount = 1,
        apiData = {},
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        return requestJson("/custom-labels/export-svg", {
            label_name,
            amount,
            apiData,
        });
    };

    QPROLabelAPI.downloadBackendSVG = async function ({ path }) {
        const { apiBaseUrl, api_key, api_token } = QPROLabelAPI.config;

        if (!apiBaseUrl) {
            throw new Error("apiBaseUrl is missing in config.");
        }
        if (!api_key || !api_token) {
            throw new Error("api key/api token missing in config.");
        }
        if (!path) {
            throw new Error("SVG path is required.");
        }

        const url = `${apiBaseUrl}/custom-labels/download-svg?path=${encodeURIComponent(path)}`;
        log("Downloading backend SVG:", url);

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
        });

        if (!res.ok) {
            let message = "Unable to download SVG file.";
            try {
                const data = await res.json();
                message = data?.message || data?.error || message;
            } catch (error) {
                // Keep the generic download error.
            }
            throw new Error(message);
        }

        return res.blob();
    };

    QPROLabelAPI.printNodeZpl = async function ({
        label_name,
        amount = 1,
        apiData = {},
        printer_id,
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        const payload = {
            label_name,
            amount,
            apiData,
        };

        if (printer_id) {
            payload.printer_id = printer_id;
        }

        return requestJson("/custom-labels/print-node", payload);
    };

    QPROLabelAPI.printNodePdf = async function ({
        label_name,
        amount = 1,
        apiData = {},
        printer_id,
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        const payload = {
            label_name,
            amount,
            apiData,
        };

        if (printer_id) {
            payload.printer_id = printer_id;
        }

        return requestJson("/custom-labels/print-node-pdf", payload);
    };

    global.QPROLabelAPI = QPROLabelAPI;
})(window);
