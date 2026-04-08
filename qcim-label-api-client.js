/**
 * QCIM Label API Client
 *
 * Use this file for direct API flows that do not need the renderer SDK:
 *  - fetch_markups
 *  - print-node (ZPL)
 *  - print-node-pdf
 */

(function (global) {
    const QCIMLabelAPI = {};

    QCIMLabelAPI.config = {
        apiBaseUrl: "",
        api_key: "",
        api_token: "",
        debug: false,
    };

    QCIMLabelAPI.setConfig = function (options = {}) {
        QCIMLabelAPI.config = {
            ...QCIMLabelAPI.config,
            ...options,
        };
    };

    function log(...args) {
        if (QCIMLabelAPI.config.debug) {
            console.log("[QCIM LABEL API]", ...args);
        }
    }

    function validateCommonPayload({ label_name, amount, apiData }) {
        if (!QCIMLabelAPI.config.apiBaseUrl) {
            throw new Error("apiBaseUrl is missing in config.");
        }
        if (!QCIMLabelAPI.config.api_key || !QCIMLabelAPI.config.api_token) {
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
        const { apiBaseUrl, api_key, api_token } = QCIMLabelAPI.config;
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

    QCIMLabelAPI.fetchMarkups = async function ({
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

    QCIMLabelAPI.printNodeZpl = async function ({
        label_name,
        amount = 1,
        apiData = {},
        printer_id,
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        if (!printer_id) {
            throw new Error("printer_id is required.");
        }

        return requestJson("/custom-labels/print-node", {
            label_name,
            amount,
            apiData,
            printer_id,
        });
    };

    QCIMLabelAPI.printNodePdf = async function ({
        label_name,
        amount = 1,
        apiData = {},
        printer_id,
    }) {
        validateCommonPayload({ label_name, amount, apiData });

        if (!printer_id) {
            throw new Error("printer_id is required.");
        }

        return requestJson("/custom-labels/print-node-pdf", {
            label_name,
            amount,
            apiData,
            printer_id,
        });
    };

    global.QCIMLabelAPI = QCIMLabelAPI;
})(window);
