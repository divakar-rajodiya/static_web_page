/**
 * QPRO Label SDK
 *
 * Purpose:
 *  - print_markups : fetch markup + render in hidden iframe + open browser print dialog
 *  - export_svg    : fetch markup + convert to self-contained SVG output
 *
 * This SDK is intentionally focused on the renderer-dependent flows only.
 * Direct API-only flows such as fetch_markups / PrintNode ZPL / PrintNode PDF
 * should use qpro-label-api-client.js or plain fetch() calls instead.
 */

(function (global) {
    const QPROLabelSDK = {};
    const DPI = 96;
    const BWIP_CDN = "https://unpkg.com/bwip-js/dist/bwip-js-min.js";

    let bwipLoadPromise = null;

    QPROLabelSDK.config = {
        apiBaseUrl: "",
        api_key: "",
        api_token: "",
        printPageUrl: "./print-label.html",
        debug: false,
    };

    QPROLabelSDK.setConfig = function (options = {}) {
        QPROLabelSDK.config = {
            ...QPROLabelSDK.config,
            ...options,
        };
    };

    function log(...args) {
        if (QPROLabelSDK.config.debug) {
            console.log("[QPRO LABEL SDK]", ...args);
        }
    }

    function validateCommonPayload({ label_name, amount, apiData }) {
        if (!QPROLabelSDK.config.apiBaseUrl) {
            throw new Error("apiBaseUrl is missing in config.");
        }
        if (!QPROLabelSDK.config.api_key || !QPROLabelSDK.config.api_token) {
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
        const { apiBaseUrl, api_key, api_token } = QPROLabelSDK.config;
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

    async function fetchMarkupsForMode({ label_name, amount, apiData, mode }) {
        validateCommonPayload({ label_name, amount, apiData });

        const endpoint = mode === "print_markups"
            ? "/custom-labels/print"
            : "/custom-labels/fetch-markups";

        const data = await requestJson(endpoint, { label_name, amount, apiData });

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No markup returned from server.");
        }

        return data;
    }

    function getPrintIframe() {
        let iframe = document.getElementById("qpro_print_iframe");

        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.id = "qpro_print_iframe";
            iframe.style.position = "fixed";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
        }

        return iframe;
    }

    QPROLabelSDK.printLabel = async function ({
        label_name,
        amount = 1,
        apiData = {},
        mode = "print_markups",
        onSVG = null,
    }) {
        try {
            if (mode === "print_markups") {
                const markups = await fetchMarkupsForMode({ label_name, amount, apiData, mode });
                const markup = markups[0];
                const iframe = getPrintIframe();

                iframe.onload = function () {
                    if (!iframe.contentWindow || !iframe.contentWindow.renderAndPrint) {
                        alert("renderAndPrint() is not available inside print-label.html");
                        return;
                    }
                    iframe.contentWindow.renderAndPrint(markup);
                };

                iframe.src = `${QPROLabelSDK.config.printPageUrl}?${Date.now()}`;
                return markups;
            }

            if (mode === "export_svg") {
                const markups = await fetchMarkupsForMode({ label_name, amount, apiData, mode });
                const total = markups.length;

                for (let i = 0; i < total; i += 1) {
                    const svgString = await renderMarkupToSVG(markups[i]);

                    if (typeof onSVG === "function") {
                        onSVG(svgString, i, total);
                    } else {
                        const filename = total === 1
                            ? `${label_name || "label"}.svg`
                            : `${label_name || "label"}_${i + 1}.svg`;
                        downloadTextFile(svgString, filename, "image/svg+xml");
                    }
                }

                return markups;
            }

            throw new Error('Unknown mode. Valid modes: "print_markups", "export_svg"');
        } catch (err) {
            console.error("[QPRO LABEL SDK ERROR]", err);
            alert(`❌ ${err.message}`);
            throw err;
        }
    };

    function unitToInch(unit, value) {
        if (!unit) return value;
        const normalizedUnit = unit.toLowerCase();
        if (normalizedUnit === "in") return value;
        if (normalizedUnit === "cm") return value / 2.54;
        if (normalizedUnit === "mm") return value / 25.4;
        if (normalizedUnit === "px") return value / DPI;
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

    function ensureBwipJs() {
        if (typeof bwipjs !== "undefined") {
            return Promise.resolve();
        }

        if (bwipLoadPromise) {
            return bwipLoadPromise;
        }

        bwipLoadPromise = new Promise((resolve, reject) => {
            log("bwip-js not found on this page, loading from CDN");
            const script = document.createElement("script");
            script.src = BWIP_CDN;
            script.onload = () => {
                log("bwip-js loaded from CDN");
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load bwip-js from CDN: ${BWIP_CDN}`));
            document.head.appendChild(script);
        });

        return bwipLoadPromise;
    }

    async function generateBarcodeSVG(format, text, targetWidth, targetHeight, color = "#000000") {
        try {
            await ensureBwipJs();

            const formatMap = {
                qrcode: "qrcode",
                "qr code": "qrcode",
                code128: "code128",
                code39: "code39",
                ean13: "ean13",
                ean8: "ean8",
                isbn: "isbn",
                ismn: "ismn",
                issn: "issn",
                pdf417: "pdf417",
                datamatrix: "datamatrix",
            };

            const bcid = formatMap[format?.toLowerCase()] || format?.toLowerCase();
            const bwipHeightMm = Math.max(5, Math.round(((targetHeight || 100) / 96) * 25.4));
            const sanitizedColor = sanitizeBarcodeColor(color);

            if (typeof bwipjs.toSVG === "function") {
                return {
                    type: "svg",
                    data: bwipjs.toSVG({
                        bcid,
                        text,
                        scale: 3,
                        height: bwipHeightMm,
                        includetext: false,
                        barcolor: sanitizedColor,
                        textcolor: sanitizedColor,
                        paddingwidth: 0,
                        paddingheight: 0,
                    }),
                };
            }

            const canvas = document.createElement("canvas");
            bwipjs.toCanvas(canvas, {
                bcid,
                text,
                scale: 12,
                height: bwipHeightMm,
                includetext: false,
                barcolor: sanitizedColor,
                textcolor: sanitizedColor,
                paddingwidth: 0,
                paddingheight: 0,
            });

            return { type: "png", data: canvas.toDataURL("image/png") };
        } catch (error) {
            console.error("[QPRO LABEL SDK] SVG barcode generation failed:", format, text, error);
            return null;
        }
    }

    function sanitizeBarcodeColor(color) {
        return String(color || "#000000").replace("#", "");
    }

    async function generateBarcodeImage(format, text, width = 200, height = 200, color = "#000000") {
        try {
            await ensureBwipJs();

            const canvas = document.createElement("canvas");
            const formatMap = {
                qrcode: "qrcode",
                "qr code": "qrcode",
                code128: "code128",
                code39: "code39",
                ean13: "ean13",
                ean8: "ean8",
                isbn: "isbn",
                ismn: "ismn",
                issn: "issn",
                pdf417: "pdf417",
                datamatrix: "datamatrix",
            };

            const bcid = formatMap[format?.toLowerCase()] || format?.toLowerCase();
            const bwipHeightMm = Math.max(5, Math.round((height / 96) * 25.4));

            bwipjs.toCanvas(canvas, {
                bcid,
                text,
                scale: 12,
                height: bwipHeightMm,
                includetext: false,
                barcolor: sanitizeBarcodeColor(color),
                textcolor: sanitizeBarcodeColor(color),
                paddingwidth: 0,
                paddingheight: 0,
            });

            return await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = canvas.toDataURL("image/png");
            });
        } catch (error) {
            console.error("[QPRO LABEL SDK] Barcode generation failed:", format, error);
            return null;
        }
    }

    function ellipsizeTextLine(line, maxWidth, measureWidth) {
        const normalizedLine = String(line || "");
        const normalizedMaxWidth = Number(maxWidth);

        if (!normalizedMaxWidth || normalizedMaxWidth <= 0) return normalizedLine;
        if (measureWidth(normalizedLine) <= normalizedMaxWidth) return normalizedLine;

        const ellipsis = "...";
        if (measureWidth(ellipsis) > normalizedMaxWidth) return "";

        let truncated = normalizedLine;
        while (truncated.length > 0 && measureWidth(`${truncated}${ellipsis}`) > normalizedMaxWidth) {
            truncated = truncated.slice(0, -1);
        }

        return `${truncated}${ellipsis}`;
    }

    function getTextLayout(el, measureWidth) {
        const text = String(el?.text || "");
        const fontSize = Number(el?.font?.size || 14);
        const lineHeight = fontSize * 1.2;
        const maxWidth = Number(el?.width || 0);
        const maxHeight = Number(el?.height || 0);
        const rawLines = text.split(/\r\n|\n|\r/);
        const visibleLineCount = maxHeight > 0
            ? Math.max(0, Math.floor(maxHeight / lineHeight))
            : rawLines.length;
        const visibleLines = rawLines.slice(0, visibleLineCount);
        const lines = visibleLines.map((line) => ellipsizeTextLine(line, maxWidth, measureWidth));

        return {
            lines,
            displayText: lines.join("\n"),
            lineHeight,
            width: maxWidth > 0 ? maxWidth : null,
            height: maxHeight > 0 ? maxHeight : (lines.length * lineHeight),
        };
    }

    async function renderMarkupToCanvas(markup) {
        const stage = markup.stage || {};
        const inchWidth = unitToInch(stage.unit, stage.width);
        const inchHeight = unitToInch(stage.unit, stage.height);
        const scale = 4;
        const canvasWidth = Math.floor(inchWidth * DPI * scale);
        const canvasHeight = Math.floor(inchHeight * DPI * scale);

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.fillStyle = stage.background || "#ffffff";
        ctx.fillRect(0, 0, inchWidth * DPI, inchHeight * DPI);

        for (const el of markup.elements || []) {
            if (el.type === "text") {
                const fontSize = el.font?.size || 14;
                const fontFamily = el.font?.family || "Arial";
                const fontStyle = el.font?.style || "normal";
                const color = el.font?.color || "#000000";
                const align = el.align || "left";
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                ctx.fillStyle = color;
                ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;
                ctx.textBaseline = "top";
                ctx.textAlign = align;

                const labelLogicalWidth = inchWidth * DPI;
                const textBoxWidth = (el.width && el.width > 0) ? el.width : (labelLogicalWidth - (el.x || 0));
                const layout = getTextLayout(
                    { ...el, width: textBoxWidth, height: el.height },
                    (value) => ctx.measureText(value).width
                );

                const textX = align === "right"
                    ? textBoxWidth
                    : align === "center"
                        ? textBoxWidth / 2
                        : 0;

                layout.lines.forEach((line, index) => {
                    ctx.fillText(line, textX, index * layout.lineHeight);
                });

                ctx.restore();
                continue;
            }

            if (el.type === "image") {
                const img = await loadImage(el.url);
                if (!img) continue;

                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                ctx.drawImage(img, 0, 0, el.width, el.height);
                ctx.restore();
                continue;
            }

            if (el.type === "barcode") {
                const img = el.url
                    ? await loadImage(el.url)
                    : await generateBarcodeImage(el.format, el.text || "", el.width || 200, el.height || 200, el.color || "#000000");
                if (!img) continue;

                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                ctx.drawImage(img, 0, 0, el.width, el.height);
                ctx.restore();
                continue;
            }

            if (el.type === "line") {
                const points = el.points || [];
                if (points.length >= 4) {
                    ctx.save();
                    ctx.globalAlpha = el.opacity ?? 1;
                    ctx.translate(el.x || 0, el.y || 0);
                    ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                    ctx.scale(el.scaleX || 1, el.scaleY || 1);
                    ctx.strokeStyle = el.stroke || "#000000";
                    ctx.lineWidth = el.strokeWidth || 2;
                    ctx.imageSmoothingEnabled = false;
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);
                    for (let i = 2; i < points.length; i += 2) {
                        ctx.lineTo(points[i], points[i + 1]);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
                continue;
            }

            if (el.type === "rect") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
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
                continue;
            }

            if (el.type === "circle") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const radius = el.radius || 10;
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                if (el.fill && el.fill !== "transparent") {
                    ctx.fillStyle = el.fill;
                    ctx.fill();
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.stroke();
                }
                ctx.restore();
                continue;
            }

            if (el.type === "ellipse") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const radiusX = el.radiusX || 20;
                const radiusY = el.radiusY || 10;
                ctx.beginPath();
                ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
                if (el.fill && el.fill !== "transparent") {
                    ctx.fillStyle = el.fill;
                    ctx.fill();
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.stroke();
                }
                ctx.restore();
                continue;
            }

            if (el.type === "wedge") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const radius = el.radius || 50;
                const angleRad = ((el.angle || 60) * Math.PI) / 180;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, radius, 0, angleRad);
                ctx.closePath();
                if (el.fill && el.fill !== "transparent") {
                    ctx.fillStyle = el.fill;
                    ctx.fill();
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.stroke();
                }
                ctx.restore();
                continue;
            }

            if (el.type === "ring") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const outerRadius = el.outerRadius || 20;
                const innerRadius = el.innerRadius || 10;
                if (el.fill && el.fill !== "transparent") {
                    ctx.beginPath();
                    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2, false);
                    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2, true);
                    ctx.fillStyle = el.fill;
                    ctx.fill("evenodd");
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.beginPath();
                    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
                continue;
            }

            if (el.type === "arc") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const outerRadius = el.outerRadius || 40;
                const innerRadius = el.innerRadius || 20;
                const sweepAngle = ((el.angle || 90) * Math.PI) / 180;
                ctx.beginPath();
                ctx.arc(0, 0, outerRadius, 0, sweepAngle, false);
                ctx.arc(0, 0, innerRadius, sweepAngle, 0, true);
                ctx.closePath();
                if (el.fill && el.fill !== "transparent") {
                    ctx.fillStyle = el.fill;
                    ctx.fill();
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke;
                    ctx.lineWidth = el.strokeWidth || 1;
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        return { canvas, inchWidth, inchHeight };
    }

    function imageUrlToDataUri(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext("2d").drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                } catch (error) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    function svgEscape(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function buildSvgTransform(el) {
        const x = el.x || 0;
        const y = el.y || 0;
        const rotation = el.rotation || 0;
        const scaleX = el.scaleX || 1;
        const scaleY = el.scaleY || 1;

        let transform = `translate(${x} ${y})`;
        if (rotation) transform += ` rotate(${rotation})`;
        if (scaleX !== 1 || scaleY !== 1) transform += ` scale(${scaleX} ${scaleY})`;
        return transform;
    }

    function createSvgTextMeasurer(fontCss) {
        const measureCanvas = document.createElement("canvas");
        const measureContext = measureCanvas.getContext("2d");
        measureContext.font = fontCss;
        return (value) => measureContext.measureText(value).width;
    }

    async function renderMarkupToSVG(markup) {
        const stage = markup.stage || {};
        const inchWidth = unitToInch(stage.unit, stage.width || 4);
        const inchHeight = unitToInch(stage.unit, stage.height || 2);
        const widthPx = inchWidth * DPI;
        const heightPx = inchHeight * DPI;
        const background = stage.background || "#ffffff";
        const parts = [];

        for (const el of markup.elements || []) {
            const opacity = el.opacity != null ? el.opacity : 1;
            const transform = buildSvgTransform(el);
            const openGroup = `<g transform="${svgEscape(transform)}" opacity="${opacity}">`;
            const closeGroup = "</g>";

            if (el.type === "text") {
                const fontSize = el.font?.size || 14;
                const fontFamily = el.font?.family || "Arial";
                const fontStyle = el.font?.style || "normal";
                const color = el.font?.color || "#000000";
                const align = el.align || "left";
                const fontCss = `${fontStyle} ${fontSize}px ${fontFamily}`;
                const textBoxWidth = (el.width && el.width > 0) ? el.width : (widthPx - (el.x || 0));
                const layout = getTextLayout(
                    { ...el, width: textBoxWidth, height: el.height },
                    createSvgTextMeasurer(fontCss)
                );
                const anchor = align === "right" ? "end" : align === "center" ? "middle" : "start";
                const textX = align === "right" ? textBoxWidth : align === "center" ? textBoxWidth / 2 : 0;
                const tspans = layout.lines.map((line, index) => (
                    `<tspan x="${textX}" dy="${index === 0 ? 0 : layout.lineHeight}">${svgEscape(line)}</tspan>`
                )).join("");

                parts.push(`${openGroup}
  <text
    x="${textX}"
    y="0"
    font-size="${fontSize}"
    font-family="${svgEscape(fontFamily)}"
    font-style="${svgEscape(fontStyle)}"
    fill="${svgEscape(color)}"
    text-anchor="${anchor}"
    dominant-baseline="text-before-edge"
  >${tspans}</text>
${closeGroup}`);
                continue;
            }

            if (el.type === "image") {
                const dataUri = await imageUrlToDataUri(el.url);
                if (dataUri) {
                    parts.push(`${openGroup}
  <image href="${dataUri}" x="0" y="0" width="${el.width || 0}" height="${el.height || 0}" preserveAspectRatio="none"/>
${closeGroup}`);
                }
                continue;
            }

            if (el.type === "barcode") {
                const barcodeWidth = el.width || 200;
                const barcodeHeight = el.height || 200;
                const barcode = el.url
                    ? { type: "png", data: await imageUrlToDataUri(el.url) }
                    : await generateBarcodeSVG(el.format, el.text || "", barcodeWidth, barcodeHeight, el.color || "#000000");

                if (barcode) {
                    if (barcode.type === "svg") {
                        let svgStr = barcode.data;
                        const viewBoxMatch = svgStr.match(/viewBox=["']([^"']+)["']/);
                        let viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

                        if (!viewBox) {
                            const widthMatch = svgStr.match(/<svg[^>]*\swidth=["']([0-9.]+)/);
                            const heightMatch = svgStr.match(/<svg[^>]*\sheight=["']([0-9.]+)/);
                            const svgWidth = widthMatch ? parseFloat(widthMatch[1]) : barcodeWidth;
                            const svgHeight = heightMatch ? parseFloat(heightMatch[1]) : barcodeHeight;
                            viewBox = `0 0 ${svgWidth} ${svgHeight}`;
                        }

                        svgStr = svgStr.replace(
                            /<svg[^>]*>/,
                            `<svg xmlns="http://www.w3.org/2000/svg" width="${barcodeWidth}" height="${barcodeHeight}" viewBox="${viewBox}" preserveAspectRatio="none">`
                        );

                        parts.push(`${openGroup}
  ${svgStr}
${closeGroup}`);
                    } else {
                        parts.push(`${openGroup}
  <image href="${barcode.data}" x="0" y="0" width="${barcodeWidth}" height="${barcodeHeight}" preserveAspectRatio="none"/>
${closeGroup}`);
                    }
                }
                continue;
            }

            if (el.type === "line") {
                const points = el.points || [];
                if (points.length >= 4) {
                    let d = `M ${points[0]} ${points[1]}`;
                    for (let i = 2; i < points.length; i += 2) {
                        d += ` L ${points[i]} ${points[i + 1]}`;
                    }

                    parts.push(`${openGroup}
  <path d="${d}" stroke="${svgEscape(el.stroke || "#000000")}" stroke-width="${el.strokeWidth || 2}" fill="none"/>
${closeGroup}`);
                }
                continue;
            }

            if (el.type === "rect") {
                const fillAttr = el.fill ? `fill="${svgEscape(el.fill)}"` : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';

                parts.push(`${openGroup}
  <rect x="0" y="0" width="${el.width || 0}" height="${el.height || 0}" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
                continue;
            }

            if (el.type === "circle") {
                const fillAttr = (el.fill && el.fill !== "transparent")
                    ? `fill="${svgEscape(el.fill)}"`
                    : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';

                parts.push(`${openGroup}
  <circle cx="0" cy="0" r="${el.radius || 10}" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
                continue;
            }

            if (el.type === "ellipse") {
                const fillAttr = (el.fill && el.fill !== "transparent")
                    ? `fill="${svgEscape(el.fill)}"`
                    : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';

                parts.push(`${openGroup}
  <ellipse cx="0" cy="0" rx="${el.radiusX || 20}" ry="${el.radiusY || 10}" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
                continue;
            }

            if (el.type === "wedge") {
                const radius = el.radius || 50;
                const angleRad = ((el.angle || 60) * Math.PI) / 180;
                const endX = radius * Math.cos(angleRad);
                const endY = radius * Math.sin(angleRad);
                const largeArcFlag = angleRad > Math.PI ? 1 : 0;
                const fillAttr = (el.fill && el.fill !== "transparent")
                    ? `fill="${svgEscape(el.fill)}"`
                    : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';

                parts.push(`${openGroup}
  <path d="M 0 0 L ${radius} 0 A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
                continue;
            }

            if (el.type === "ring") {
                const outerRadius = el.outerRadius || 20;
                const innerRadius = el.innerRadius || 10;
                const fillAttr = (el.fill && el.fill !== "transparent")
                    ? `fill="${svgEscape(el.fill)}"`
                    : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';
                const d = `M 0 ${outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 0 ${-outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 0 ${outerRadius} Z ` +
                    `M 0 ${innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 0 ${-innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 0 ${innerRadius} Z`;

                parts.push(`${openGroup}
  <path d="${d}" fill-rule="evenodd" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
                continue;
            }

            if (el.type === "arc") {
                const outerRadius = el.outerRadius || 40;
                const innerRadius = el.innerRadius || 20;
                const sweepRad = ((el.angle || 90) * Math.PI) / 180;
                const largeArcFlag = sweepRad > Math.PI ? 1 : 0;
                const outerStartX = outerRadius;
                const outerStartY = 0;
                const outerEndX = outerRadius * Math.cos(sweepRad);
                const outerEndY = outerRadius * Math.sin(sweepRad);
                const innerStartX = innerRadius * Math.cos(sweepRad);
                const innerStartY = innerRadius * Math.sin(sweepRad);
                const innerEndX = innerRadius;
                const innerEndY = 0;
                const fillAttr = (el.fill && el.fill !== "transparent")
                    ? `fill="${svgEscape(el.fill)}"`
                    : 'fill="none"';
                const strokeAttr = el.stroke
                    ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"`
                    : 'stroke="none"';

                parts.push(`${openGroup}
  <path d="M ${outerStartX} ${outerStartY} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY} L ${innerStartX} ${innerStartY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEndX} ${innerEndY} Z" ${fillAttr} ${strokeAttr}/>
${closeGroup}`);
            }
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${widthPx}px"
     height="${heightPx}px"
     viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="${svgEscape(background)}"/>
${parts.join("\n")}
</svg>`;
    }

    function downloadTextFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    QPROLabelSDK.markupsToSVG = async function (markups) {
        if (!Array.isArray(markups)) {
            throw new Error("markupsToSVG: markups must be an array");
        }

        const results = [];
        for (const markup of markups) {
            results.push(await renderMarkupToSVG(markup));
        }
        return results;
    };

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
        setTimeout(() => window.print(), 200);
    }

    global.renderAndPrint = async function (markup) {
        log("Received markup in print iframe:", markup);
        await printMarkup(markup);
    };

    global.QPROLabelSDK = QPROLabelSDK;
})(window);
