/**
 * QCIM Label SDK (Single File)
 *
 * Works in both pages:
 * 1) test_label.html (API call + iframe print)
 * 2) print-label.html (renderer + print)
 */

(function (global) {

    // ============================================================
    // CONFIG
    // ============================================================
    const QCIMLabelSDK = {};

    QCIMLabelSDK.config = {
        apiBaseUrl: "",
        username: "",
        password: "",
        printPageUrl: "./print-label.html",
        debug: false,
    };

    QCIMLabelSDK.setConfig = function (options = {}) {
        QCIMLabelSDK.config = {
            ...QCIMLabelSDK.config,
            ...options,
        };
    };

    function log(...args) {
        if (QCIMLabelSDK.config.debug) {
            console.log("[QCIM LABEL SDK]", ...args);
        }
    }

    // ============================================================
    // PART 1: API CALL + PRINT TRIGGER (runs on main customer page)
    // ============================================================
    function getPrintIframe() {
        let iframe = document.getElementById("qcim_print_iframe");

        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.id = "qcim_print_iframe";
            iframe.style.position = "fixed";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
        }

        return iframe;
    }

    async function fetchMarkup({ label_name, amount, apiData }) {
        const { apiBaseUrl, username, password } = QCIMLabelSDK.config;

        if (!apiBaseUrl) throw new Error("apiBaseUrl is missing in config.");
        if (!username || !password) throw new Error("username/password missing in config.");
        if (!label_name) throw new Error("label_name is required.");
        if (!amount || amount < 1) throw new Error("amount must be at least 1.");

        const url = `${apiBaseUrl}/custom-labels/print`;

        log("Calling API:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                password,
                label_name,
                amount,
                apiData,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || data?.error || "Failed to print label");
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No markup returned from server.");
        }

        return data;
    }

    QCIMLabelSDK.printLabel = async function ({
                                                  label_name,
                                                  amount = 1,
                                                  apiData = {},
                                              }) {
        try {
            const markups = await fetchMarkup({ label_name, amount, apiData });
            const markup = markups[0];

            const iframe = getPrintIframe();

            iframe.onload = function () {
                if (!iframe.contentWindow || !iframe.contentWindow.renderAndPrint) {
                    alert("renderAndPrint() is not found inside print-label.html");
                    return;
                }

                iframe.contentWindow.renderAndPrint(markup);
            };

            iframe.src = QCIMLabelSDK.config.printPageUrl + "?" + Date.now();
        } catch (err) {
            console.error("[QCIM LABEL SDK ERROR]", err);
            alert(err.message);
        }
    };

    // ============================================================
    // PART 2: LABEL RENDERER (runs inside print-label.html)
    // ============================================================
    const DPI = 96;

    function unitToInch(unit, value) {
        if (!unit) return value;
        unit = unit.toLowerCase();

        if (unit === "in") return value;
        if (unit === "cm") return value / 2.54;
        if (unit === "mm") return value / 25.4;
        if (unit === "px") return value / DPI;

        return value;
    }

    function loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    function injectPrintStyle(inchWidth, inchHeight) {
        const old = document.getElementById("printStyle");
        if (old) old.remove();

        const style = document.createElement("style");
        style.id = "printStyle";

        style.innerHTML = `
      @media print {
        @page {
          size: ${inchWidth}in ${inchHeight}in;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: white;
        }

        #printRoot {
          width: 100%;
          height: 100%;
        }

        img {
          width: calc(100% - 1px);
          height: calc(100% - 1px);
        }
      }
    `;

        document.head.appendChild(style);
    }

    async function renderMarkupToCanvas(markup) {
        const stage = markup.stage;

        const inchWidth = unitToInch(stage.unit, stage.width);
        const inchHeight = unitToInch(stage.unit, stage.height);

        const SCALE = 4;

        const canvasWidth = Math.floor(inchWidth * DPI * SCALE);
        const canvasHeight = Math.floor(inchHeight * DPI * SCALE);

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");
        ctx.scale(SCALE, SCALE);

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, inchWidth * DPI, inchHeight * DPI);

        const elements = markup.elements || [];

        for (const el of elements) {

            // TEXT
            if (el.type === "text") {
                const fontSize = el.font?.size || 14;
                const fontFamily = el.font?.family || "Arial";
                const fontStyle = el.font?.style || "normal";
                const color = el.font?.color || "#000000";

                ctx.save();

                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);

                const rotation = (el.rotation || 0) * Math.PI / 180;
                ctx.rotate(rotation);

                ctx.scale(el.scaleX || 1, el.scaleY || 1);

                ctx.fillStyle = color;
                ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
                ctx.textBaseline = "top";

                ctx.fillText(el.text || "", 0, 0);

                ctx.restore();
            }

            // IMAGE / BARCODE
            if (el.type === "image" || el.type === "barcode") {
                const img = await loadImage(el.url);
                if (!img) continue;

                ctx.save();

                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);

                const rotation = (el.rotation || 0) * Math.PI / 180;
                ctx.rotate(rotation);

                ctx.scale(el.scaleX || 1, el.scaleY || 1);

                const w = el.width || img.width;
                const h = el.height || img.height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                ctx.drawImage(img, 0, 0, w, h);

                ctx.restore();
            }

            // LINE
            if (el.type === "line") {
                ctx.save();

                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);

                const rotation = (el.rotation || 0) * Math.PI / 180;
                ctx.rotate(rotation);

                ctx.scale(el.scaleX || 1, el.scaleY || 1);

                ctx.strokeStyle = el.stroke || "#000000";
                ctx.lineWidth = el.strokeWidth || 2;

                ctx.imageSmoothingEnabled = false;

                const points = el.points || [];

                if (points.length >= 4) {
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);

                    for (let i = 2; i < points.length; i += 2) {
                        ctx.lineTo(points[i], points[i + 1]);
                    }

                    ctx.stroke();
                }

                ctx.restore();
            }

            // RECT
            if (el.type === "rect") {
                ctx.save();

                ctx.globalAlpha = el.opacity ?? 1;

                ctx.translate(el.x || 0, el.y || 0);

                const rotation = (el.rotation || 0) * Math.PI / 180;
                ctx.rotate(rotation);

                ctx.scale(el.scaleX || 1, el.scaleY || 1);

                if (el.fill) {
                    ctx.fillStyle = el.fill;
                    ctx.fillRect(0, 0, el.width || 0, el.height || 0);
                }

                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.strokeRect(0, 0, el.width || 0, el.height || 0);
                }

                ctx.restore();
            }
        }

        return { canvas, inchWidth, inchHeight };
    }

    async function printMarkup(markup) {
        const root = document.getElementById("printRoot");
        if (!root) {
            console.error("printRoot div not found in print-label.html");
            return;
        }

        root.innerHTML = "";

        const { canvas, inchWidth, inchHeight } = await renderMarkupToCanvas(markup);

        const img = new Image();
        img.src = canvas.toDataURL("image/png");

        img.style.width = "calc(100% - 1px)";
        img.style.height = "calc(100% - 1px)";

        root.appendChild(img);

        injectPrintStyle(inchWidth, inchHeight);

        setTimeout(() => {
            window.print();
        }, 200);
    }

    // EXPOSE FOR IFRAME PARENT
    global.renderAndPrint = async function (markup) {
        log("Received markup in print iframe:", markup);
        await printMarkup(markup);
    };

    // ============================================================
    // EXPOSE SDK
    // ============================================================
    global.QCIMLabelSDK = QCIMLabelSDK;

})(window);
