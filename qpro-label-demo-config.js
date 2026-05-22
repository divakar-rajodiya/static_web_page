(function (global) {
    const environments = {
        local: {
            apiBaseUrl: "http://qcim-backend.test/api",
            api_key: "splsTpbkLDzYREpXxpTLGA20V7szpyda",
            api_token: "t06utpbYol5mVgnbYp89Ym5qId4IuFKFrK6KDfkCZm9Mn0N0v5zqvdcPDJOs2yY8",
            printPageUrl: "./print-label.html",
            debug: true,
            printNodePrinterId: 75236019,
        },
        beta: {
            apiBaseUrl: "https://api.beta.quandosol.com/api",
            api_key: "splsTpbkLDzYREpXxpTLGA20V7szpyda",
            api_token: "t06utpbYol5mVgnbYp89Ym5qId4IuFKFrK6KDfkCZm9Mn0N0v5zqvdcPDJOs2yY8",
            printPageUrl: "./print-label.html",
            debug: true,
            printNodePrinterId: 75208784,
        },
        prod: {
            apiBaseUrl: "https://quandosol.com/api",
            api_key: "splsTpbkLDzYREpXxpTLGA20V7szpyda",
            api_token: "t06utpbYol5mVgnbYp89Ym5qId4IuFKFrK6KDfkCZm9Mn0N0v5zqvdcPDJOs2yY8",
            printPageUrl: "./print-label.html",
            debug: false,
            printNodePrinterId: 75208784,
        },
    };

    const requestedEnvironment = new URLSearchParams(global.location.search).get("env");
    const activeEnvironment = environments[requestedEnvironment]
        ? requestedEnvironment
        : detectEnvironment(global.location.hostname, global.location.pathname);
    const activeConfig = environments[activeEnvironment];

    global.QPRO_DEMO_ENV = activeEnvironment;
    global.QPRO_CONFIG = {
        ...activeConfig,
    };

    function detectEnvironment(hostname, pathname) {
        const host = String(hostname || "").toLowerCase();
        const path = String(pathname || "").toLowerCase();

        if (host === "app.quandosol.com" && path.startsWith("/production/")) {
            return "prod";
        }

        if (host === "app.quandosol.com" || host === "beta.quandosol.com") {
            return "beta";
        }

        return "local";
    }
})(window);
