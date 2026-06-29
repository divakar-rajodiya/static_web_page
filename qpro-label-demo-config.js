(function (global) {
    const environments = {
        local: {
            apiBaseUrl: "http://qcim-backend.test/api",
            api_key: "oOt0TuQpZIZgVPFEgeYFFZxCANgOtpAt",
            api_token: "ZNuTUFLS7d7DwZwPzqfQeicIBwGnLwx6u5alOn9NB5j7uZoWVZb3WXDanKCH7Nb7",
            printPageUrl: "./print-label.html",
            debug: true,
            // printNodePrinterId: 75236019,
            printNodePrinterId: 75589825,
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
            apiBaseUrl: "https://api.quandosol.com/api",
            api_key: "qPcdpaHTqPDovbLXFv47QlOJYCYq2Mdt",
            api_token: "DjbXzjSjRhqc0gJFiSY2bO9B7hZWACc2JMkixW7a92ahdBe5mO7q1DwRo9nacoWs",
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
