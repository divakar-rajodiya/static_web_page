/**
 * QCIM Label SDK (Single File)
 *
 * Works in both pages:
 * 1) test_label.html (API call + iframe print)
 * 2) print-label.html (renderer + print)
 *
 * Print Modes:
 *  - fetch_markups   : Fetch markups from API and show a preview popup
 *  - print_markups   : Fetch markups + render to canvas + open print dialog
 *  - printNodeZpl    : Send ZPL to printer via PrintNode
 *  - printNodeImage  : Send PDF/Image to printer via PrintNode
 */

(function (global) {

    // ============================================================
    // CONFIG
    // ============================================================
    const QCIMLabelSDK = {};

    QCIMLabelSDK.config = {
        apiBaseUrl: "",
        api_key: "",
        api_token: "",
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
    // MARKUP PREVIEW MODAL
    // ============================================================

    function injectModalStyles() {
        if (document.getElementById("qcim-modal-styles")) return;

        const style = document.createElement("style");
        style.id = "qcim-modal-styles";
        style.innerHTML = `
      #qcim-markup-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
        animation: qcimFadeIn 0.18s ease;
      }

      @keyframes qcimFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      #qcim-markup-modal {
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.28);
        width: 90%;
        max-width: 780px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: qcimSlideUp 0.2s ease;
      }

      @keyframes qcimSlideUp {
        from { transform: translateY(24px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      #qcim-markup-modal .qcim-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      #qcim-markup-modal .qcim-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #qcim-markup-modal .qcim-modal-header h3 .qcim-badge {
        font-size: 11px;
        font-weight: 600;
        background: #dbeafe;
        color: #1d4ed8;
        border-radius: 20px;
        padding: 2px 8px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      #qcim-markup-modal .qcim-modal-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 22px;
        color: #6b7280;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.15s;
      }

      #qcim-markup-modal .qcim-modal-close:hover {
        background: #f3f4f6;
        color: #111827;
      }

      #qcim-markup-modal .qcim-modal-tabs {
        display: flex;
        gap: 4px;
        padding: 10px 20px 0;
        border-bottom: 1px solid #e5e7eb;
        background: #fff;
        overflow-x: auto;
      }

      #qcim-markup-modal .qcim-tab-btn {
        padding: 7px 14px;
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        white-space: nowrap;
        transition: color 0.15s, border-color 0.15s;
        margin-bottom: -1px;
      }

      #qcim-markup-modal .qcim-tab-btn:hover {
        color: #1d4ed8;
      }

      #qcim-markup-modal .qcim-tab-btn.active {
        color: #1d4ed8;
        border-bottom-color: #1d4ed8;
        font-weight: 700;
      }

      #qcim-markup-modal .qcim-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px 20px;
        background: #fff;
      }

      /* ── Markup summary card ── */
      .qcim-markup-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .qcim-markup-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: #f3f4f6;
        cursor: pointer;
        user-select: none;
      }

      .qcim-markup-card-header:hover {
        background: #e5e7eb;
      }

      .qcim-markup-card-title {
        font-size: 13px;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .qcim-markup-card-title .qcim-el-count {
        font-size: 11px;
        font-weight: 500;
        background: #e0e7ff;
        color: #4338ca;
        border-radius: 20px;
        padding: 1px 7px;
      }

      .qcim-markup-card-toggle {
        font-size: 13px;
        color: #6b7280;
        transition: transform 0.2s;
      }

      .qcim-markup-card-toggle.open {
        transform: rotate(180deg);
      }

      .qcim-markup-card-body {
        display: none;
        padding: 12px 14px;
        border-top: 1px solid #e5e7eb;
        background: #fff;
      }

      .qcim-markup-card-body.open {
        display: block;
      }

      /* Stage info grid */
      .qcim-stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .qcim-stage-item {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 7px 10px;
      }

      .qcim-stage-item label {
        display: block;
        font-size: 10px;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }

      .qcim-stage-item span {
        font-size: 13px;
        font-weight: 600;
        color: #111827;
      }

      /* Elements table */
      .qcim-elements-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .qcim-elements-table th {
        background: #f3f4f6;
        color: #6b7280;
        font-weight: 600;
        text-align: left;
        padding: 6px 10px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .qcim-elements-table td {
        padding: 6px 10px;
        border-bottom: 1px solid #f3f4f6;
        color: #374151;
        vertical-align: middle;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .qcim-elements-table tr:last-child td {
        border-bottom: none;
      }

      .qcim-type-pill {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        border-radius: 4px;
        padding: 1px 6px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .qcim-type-text    { background: #dcfce7; color: #16a34a; }
      .qcim-type-barcode { background: #fef9c3; color: #a16207; }
      .qcim-type-image   { background: #dbeafe; color: #1d4ed8; }
      .qcim-type-rect    { background: #fce7f3; color: #be185d; }
      .qcim-type-line    { background: #f3f4f6; color: #374151; }
      .qcim-type-circle  { background: #ede9fe; color: #6d28d9; }
      .qcim-type-ellipse { background: #ede9fe; color: #6d28d9; }
      .qcim-type-default { background: #f3f4f6; color: #374151; }

      /* Raw JSON tab */
      .qcim-json-block {
        background: #1e1e2e;
        color: #cdd6f4;
        border-radius: 8px;
        padding: 14px 16px;
        font-family: "Courier New", monospace;
        font-size: 12px;
        line-height: 1.6;
        overflow-x: auto;
        white-space: pre;
        max-height: 420px;
        overflow-y: auto;
      }

      /* Modal footer */
      #qcim-markup-modal .qcim-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        padding: 12px 20px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .qcim-btn {
        padding: 8px 18px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background 0.15s, opacity 0.15s;
      }

      .qcim-btn-secondary {
        background: #e5e7eb;
        color: #374151;
      }

      .qcim-btn-secondary:hover { background: #d1d5db; }

      .qcim-btn-primary {
        background: #1d4ed8;
        color: #fff;
      }

      .qcim-btn-primary:hover { background: #1e40af; }

      /* Loading spinner inside modal */
      .qcim-spinner-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
        gap: 14px;
        color: #6b7280;
        font-size: 14px;
      }

      .qcim-spinner {
        width: 36px;
        height: 36px;
        border: 3px solid #e5e7eb;
        border-top-color: #1d4ed8;
        border-radius: 50%;
        animation: qcimSpin 0.7s linear infinite;
      }

      @keyframes qcimSpin {
        to { transform: rotate(360deg); }
      }

      /* Error state */
      .qcim-error-box {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 16px;
        color: #b91c1c;
        font-size: 13px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .qcim-error-box .qcim-error-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
    `;

        document.head.appendChild(style);
    }

    function buildMarkupSummaryHTML(markups) {
        if (!Array.isArray(markups) || markups.length === 0) {
            return `<div class="qcim-error-box">
        <span class="qcim-error-icon">⚠️</span>
        <span>No markup data was returned from the server.</span>
      </div>`;
        }

        return markups.map((markup, idx) => {
            const stage = markup.stage || {};
            const elements = markup.elements || [];

            const typeColors = {
                text: "qcim-type-text",
                barcode: "qcim-type-barcode",
                image: "qcim-type-image",
                rect: "qcim-type-rect",
                line: "qcim-type-line",
                circle: "qcim-type-circle",
                ellipse: "qcim-type-ellipse",
            };

            const elRows = elements.map(el => {
                const typeClass = typeColors[el.type] || "qcim-type-default";
                const content = el.text || el.url || el.format || "-";
                const position = (el.x != null && el.y != null) ? `${Math.round(el.x)}, ${Math.round(el.y)}` : "-";
                const size = (el.width != null && el.height != null) ? `${Math.round(el.width)} × ${Math.round(el.height)}` : "-";
                return `<tr>
          <td><span class="qcim-type-pill ${typeClass}">${el.type}</span></td>
          <td title="${content}">${content.length > 40 ? content.substring(0, 40) + "…" : content}</td>
          <td>${position}</td>
          <td>${size}</td>
        </tr>`;
            }).join("");

            return `
        <div class="qcim-markup-card" id="qcim-card-${idx}">
          <div class="qcim-markup-card-header" onclick="(function(){
            var body = document.getElementById('qcim-card-body-${idx}');
            var tog  = document.getElementById('qcim-card-tog-${idx}');
            body.classList.toggle('open');
            tog.classList.toggle('open');
          })()">
            <span class="qcim-markup-card-title">
              Markup ${idx + 1}
              <span class="qcim-el-count">${elements.length} element${elements.length !== 1 ? "s" : ""}</span>
            </span>
            <span class="qcim-markup-card-toggle open" id="qcim-card-tog-${idx}">▾</span>
          </div>
          <div class="qcim-markup-card-body open" id="qcim-card-body-${idx}">
            <div class="qcim-stage-grid">
              <div class="qcim-stage-item"><label>Width</label><span>${stage.width != null ? stage.width : "-"} ${stage.unit || ""}</span></div>
              <div class="qcim-stage-item"><label>Height</label><span>${stage.height != null ? stage.height : "-"} ${stage.unit || ""}</span></div>
              <div class="qcim-stage-item"><label>Unit</label><span>${stage.unit || "-"}</span></div>
              <div class="qcim-stage-item"><label>Background</label><span style="display:flex;align-items:center;gap:5px;">
                ${stage.background ? `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${stage.background};border:1px solid #d1d5db;flex-shrink:0;"></span>` : ""}
                ${stage.background || "-"}
              </span></div>
            </div>
            ${elements.length > 0 ? `
            <table class="qcim-elements-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content / URL</th>
                  <th>Position (x, y)</th>
                  <th>Size (w × h)</th>
                </tr>
              </thead>
              <tbody>${elRows}</tbody>
            </table>` : `<p style="color:#9ca3af;font-size:13px;margin:0;">No elements in this markup.</p>`}
          </div>
        </div>`;
        }).join("");
    }

    function showMarkupModal(markups, labelName) {
        injectModalStyles();

        // Remove any existing modal
        const existing = document.getElementById("qcim-markup-modal-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "qcim-markup-modal-overlay";

        const count = Array.isArray(markups) ? markups.length : 0;

        overlay.innerHTML = `
      <div id="qcim-markup-modal" role="dialog" aria-modal="true" aria-label="Markup Preview">
        <div class="qcim-modal-header">
          <h3>
            📋 Markup Preview
            <span class="qcim-badge">${count} markup${count !== 1 ? "s" : ""}</span>
            ${labelName ? `<span style="font-size:13px;font-weight:400;color:#6b7280;">— ${labelName}</span>` : ""}
          </h3>
          <button class="qcim-modal-close" id="qcim-modal-close-btn" title="Close">✕</button>
        </div>

        <div class="qcim-modal-tabs">
          <button class="qcim-tab-btn active" data-tab="summary">Summary</button>
          <button class="qcim-tab-btn" data-tab="raw">Raw JSON</button>
        </div>

        <div class="qcim-modal-body" id="qcim-modal-body">
          <div id="qcim-tab-summary">${buildMarkupSummaryHTML(markups)}</div>
          <div id="qcim-tab-raw" style="display:none;">
            <div class="qcim-json-block">${JSON.stringify(markups, null, 2)}</div>
          </div>
        </div>

        <div class="qcim-modal-footer">
          <button class="qcim-btn qcim-btn-secondary" id="qcim-modal-cancel-btn">Close</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        // Tab switching
        overlay.querySelectorAll(".qcim-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                overlay.querySelectorAll(".qcim-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const tab = btn.dataset.tab;
                document.getElementById("qcim-tab-summary").style.display = tab === "summary" ? "" : "none";
                document.getElementById("qcim-tab-raw").style.display = tab === "raw" ? "" : "none";
            });
        });

        // Close handlers
        function closeModal() { overlay.remove(); }
        document.getElementById("qcim-modal-close-btn").addEventListener("click", closeModal);
        document.getElementById("qcim-modal-cancel-btn").addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
        document.addEventListener("keydown", function escHandler(e) {
            if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", escHandler); }
        });
    }

    function showLoadingModal(labelName) {
        injectModalStyles();

        const existing = document.getElementById("qcim-markup-modal-overlay");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.id = "qcim-markup-modal-overlay";
        overlay.innerHTML = `
      <div id="qcim-markup-modal" role="dialog">
        <div class="qcim-modal-header">
          <h3>📋 Markup Preview ${labelName ? `<span style="font-size:13px;font-weight:400;color:#6b7280;">— ${labelName}</span>` : ""}</h3>
          <button class="qcim-modal-close" onclick="document.getElementById('qcim-markup-modal-overlay').remove()">✕</button>
        </div>
        <div class="qcim-modal-body">
          <div class="qcim-spinner-wrap">
            <div class="qcim-spinner"></div>
            <span>Fetching markups…</span>
          </div>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
    }

    function updateModalWithError(message) {
        const body = document.getElementById("qcim-modal-body");
        if (!body) return;
        body.innerHTML = `
      <div class="qcim-error-box" style="margin:8px 0;">
        <span class="qcim-error-icon">❌</span>
        <div>
          <strong>Failed to fetch markups</strong><br>
          <span>${message}</span>
        </div>
      </div>
    `;
        // Add close button to footer
        const footer = document.querySelector("#qcim-markup-modal .qcim-modal-footer");
        if (footer) {
            footer.innerHTML = `<button class="qcim-btn qcim-btn-secondary" onclick="document.getElementById('qcim-markup-modal-overlay').remove()">Close</button>`;
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

    async function fetchAndPrintMarkups({ label_name, amount, apiData }) {
        const { apiBaseUrl, api_key, api_token } = QCIMLabelSDK.config;

        if (!apiBaseUrl) throw new Error("apiBaseUrl is missing in config.");
        if (!api_key || !api_token) throw new Error("api key/api token missing in config.");
        if (!label_name) throw new Error("label_name is required.");
        if (!amount || amount < 1) throw new Error("amount must be at least 1.");

        const url = `${apiBaseUrl}/custom-labels/print`;

        log("Calling API:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
            body: JSON.stringify({ label_name, amount, apiData }),
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

    async function fetchMarkup({ label_name, amount, apiData }) {
        const { apiBaseUrl, api_key, api_token } = QCIMLabelSDK.config;

        if (!apiBaseUrl) throw new Error("apiBaseUrl is missing in config.");
        if (!api_key || !api_token) throw new Error("api key/api token missing in config.");
        if (!label_name) throw new Error("label_name is required.");
        if (!amount || amount < 1) throw new Error("amount must be at least 1.");

        const url = `${apiBaseUrl}/custom-labels/fetch-markups`;

        log("Calling fetch-markups API:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
            body: JSON.stringify({ label_name, amount, apiData }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.message || data?.error || "Failed to fetch markups");
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("No markup returned from server.");
        }

        return data;
    }

    async function printNodeZplPrint({ label_name, amount, apiData, printer_id }) {
        const { apiBaseUrl, api_key, api_token } = QCIMLabelSDK.config;

        if (!apiBaseUrl) throw new Error("apiBaseUrl is missing in config.");
        if (!api_key || !api_token) throw new Error("api key/api token missing in config.");
        if (!label_name) throw new Error("label_name is required.");
        if (!amount || amount < 1) throw new Error("amount must be at least 1.");

        const url = `${apiBaseUrl}/custom-labels/print-node`;

        log("Calling Print node ZPL API:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
            body: JSON.stringify({ label_name, amount, apiData, printer_id }),
        });

        const data = await res.json();
        log("PrintNode ZPL response:", data);

        if (!res.ok) {
            throw new Error(data?.message || data?.error || "Failed to print label");
        }

        return data;
    }

    async function printNodePdfPrint({ label_name, amount, apiData, printer_id }) {
        const { apiBaseUrl, api_key, api_token } = QCIMLabelSDK.config;

        if (!apiBaseUrl) throw new Error("apiBaseUrl is missing in config.");
        if (!api_key || !api_token) throw new Error("api key/api token missing in config.");
        if (!label_name) throw new Error("label_name is required.");
        if (!amount || amount < 1) throw new Error("amount must be at least 1.");

        const url = `${apiBaseUrl}/custom-labels/print-node-pdf`;

        log("Calling Print node Image API:", url);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
                "X-API-SECRET": api_token,
            },
            body: JSON.stringify({ label_name, amount, apiData, printer_id }),
        });

        const data = await res.json();
        log("PrintNode PDF response:", data);

        if (!res.ok) {
            throw new Error(data?.message || data?.error || "Failed to print label");
        }

        return data;
    }

    // ============================================================
    // MAIN ENTRY POINT
    // ============================================================
    QCIMLabelSDK.printLabel = async function ({
                                                  label_name,
                                                  amount = 1,
                                                  apiData = {},
                                                  mode = "fetch_markups",
                                                  printer_id = null,
                                                  onSVG = null,
                                              }) {
        try {
            // ── Mode 1: Fetch markups and show preview popup ──────────────
            if (mode === "fetch_markups") {
                showLoadingModal(label_name);
                const markups = await fetchMarkup({ label_name, amount, apiData });
                log("fetch_markups response:", markups);
                showMarkupModal(markups, label_name);
            }

            // ── Mode 2: Fetch markups and print via iframe ────────────────
            else if (mode === "print_markups") {
                const markups = await fetchAndPrintMarkups({ label_name, amount, apiData });
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
            }

            // ── Mode 3: PrintNode ZPL ─────────────────────────────────────
            else if (mode === "printNodeZpl") {
                log("Sending via PrintNode ZPL…");
                const response = await printNodeZplPrint({ label_name, amount, apiData, printer_id });
                log("PrintNode ZPL response:", response);
                alert("✅ Sent to printer successfully (ZPL)");
            }

            // ── Mode 4: PrintNode PDF/Image ───────────────────────────────
            else if (mode === "printNodeImage") {
                log("Sending via PrintNode PDF/Image…");
                const response = await printNodePdfPrint({ label_name, amount, apiData, printer_id });
                log("PrintNode Image response:", response);
                alert("✅ Sent to printer successfully (PDF/Image)");
            }

              // ── Mode 5: Export SVG ────────────────────────────────────────
              // Fetches markups from the API, converts each one to a
              // self-contained SVG file, and either:
              //   • triggers a browser download for every SVG, OR
              //   • calls onSVG(svgString, index, total) if provided
              //
              // Usage:
              //   QCIMLabelSDK.printLabel({
              //     label_name: "My Label",
              //     amount: 1,
              //     apiData: { ... },
              //     mode: "export_svg",
              //     // optional callback — if omitted, files are auto-downloaded
              //     onSVG: (svgString, index, total) => { /* handle the SVG */ },
            //   });
            else if (mode === "export_svg") {
                log("Mode: export_svg — fetching markups…");
                const markups = await fetchMarkup({ label_name, amount, apiData });
                log("export_svg: received", markups.length, "markup(s)");

                const total = markups.length;
                for (let i = 0; i < total; i++) {
                    const svgString = await renderMarkupToSVG(markups[i]);
                    log(`export_svg: rendered markup ${i + 1}/${total}`);

                    if (typeof onSVG === "function") {
                        // Developer-provided callback — hand off the SVG string
                        onSVG(svgString, i, total);
                    } else {
                        // Default: trigger a browser download
                        const filename = total === 1
                          ? `${label_name || "label"}.svg`
                          : `${label_name || "label"}_${i + 1}.svg`;
                        downloadTextFile(svgString, filename, "image/svg+xml");
                    }
                }

                log("export_svg: done");
            }

            else {
                throw new Error(`Unknown mode: "${mode}". Valid modes: fetch_markups, print_markups, printNodeZpl, printNodeImage, export_svg`);
            }
        } catch (err) {
            console.error("[QCIM LABEL SDK ERROR]", err);
            // If the loading modal is still open, replace it with the error
            const overlay = document.getElementById("qcim-markup-modal-overlay");
            if (overlay) {
                updateModalWithError(err.message);
            } else {
                alert("❌ " + err.message);
            }
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
          margin: 0; padding: 0;
          overflow: hidden; background: white;
        }
        #printRoot { width: 100%; height: 100%; }
        img { width: calc(100% - 1px); height: calc(100% - 1px); }
      }
    `;

        document.head.appendChild(style);
    }

    /**
     * Ensure bwip-js is available on the current page.
     * If it is already loaded (e.g. print-label.html includes it), resolves immediately.
     * Otherwise dynamically injects the CDN script and waits for it to load.
     */
    const BWIP_CDN = "https://unpkg.com/bwip-js/dist/bwip-js-min.js";
    let _bwipLoadPromise = null;

    function ensureBwipJs() {
        // Already available — nothing to do
        if (typeof bwipjs !== "undefined") return Promise.resolve();

        // Already injecting — return the same promise
        if (_bwipLoadPromise) return _bwipLoadPromise;

        _bwipLoadPromise = new Promise((resolve, reject) => {
            log("bwip-js not found on this page — loading from CDN…");
            const script = document.createElement("script");
            script.src = BWIP_CDN;
            script.onload  = () => { log("bwip-js loaded from CDN"); resolve(); };
            script.onerror = () => reject(new Error("Failed to load bwip-js from CDN: " + BWIP_CDN));
            document.head.appendChild(script);
        });

        return _bwipLoadPromise;
    }

    /**
     * Generate a barcode / QR code as a pure SVG string using bwip-js toSVG().
     * This is infinitely scalable — no raster PNG, no quality loss at any size.
     * Falls back to a high-res PNG data-URI if toSVG is unavailable.
     */
    async function generateBarcodeSVG(format, text, targetWidth, targetHeight) {
        try {
            await ensureBwipJs();

            const formatMap = {
                qrcode: "qrcode", "qr code": "qrcode",
                code128: "code128", code39: "code39",
                ean13: "ean13", ean8: "ean8",
                isbn: "isbn", ismn: "ismn", issn: "issn",
                pdf417: "pdf417", datamatrix: "datamatrix",
            };
            const bcid = formatMap[format?.toLowerCase()] || format?.toLowerCase();
            const bwipHeightMm = Math.max(5, Math.round(((targetHeight || 100) / 96) * 25.4));

            // ── Preferred path: native SVG output (vector, infinite quality) ──
            if (typeof bwipjs.toSVG === "function") {
                const rawSvg = bwipjs.toSVG({
                    bcid,
                    text,
                    scale: 3,
                    height: bwipHeightMm,
                    includetext: false,
                    paddingwidth: 0,
                    paddingheight: 0,
                });
                // rawSvg is a full <svg>…</svg> string.
                // Strip its own width/height so our wrapper controls sizing.
                return { type: "svg", data: rawSvg };
            }

            // ── Fallback: high-res PNG embedded as data-URI ────────────────
            const canvas = document.createElement("canvas");
            bwipjs.toCanvas(canvas, {
                bcid,
                text,
                scale: 12,          // very high scale for maximum raster clarity
                height: bwipHeightMm,
                includetext: false,
                paddingwidth: 0,
                paddingheight: 0,
            });
            return { type: "png", data: canvas.toDataURL("image/png") };

        } catch (e) {
            console.error("[QCIM LABEL SDK] SVG barcode generation failed:", format, text, e);
            return null;
        }
    }

    async function generateBarcodeImage(format, text, width = 200, height = 200) {
        try {
            await ensureBwipJs();
            const canvas = document.createElement("canvas");
            const formatMap = {
                qrcode: "qrcode", "qr code": "qrcode",
                code128: "code128", code39: "code39",
                ean13: "ean13", ean8: "ean8",
                isbn: "isbn", ismn: "ismn", issn: "issn",
                pdf417: "pdf417", datamatrix: "datamatrix",
            };
            const bcid = formatMap[format?.toLowerCase()] || format?.toLowerCase();
            // High-res render: scale:12 gives sharp output at 4× canvas SCALE
            const bwipH = Math.max(5, Math.round((height / 96) * 25.4));
            bwipjs.toCanvas(canvas, { bcid, text, scale: 12, height: bwipH, includetext: false, paddingwidth: 0, paddingheight: 0 });
            return await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.src = canvas.toDataURL("image/png");
            });
        } catch (e) {
            console.error("[QCIM LABEL SDK] Barcode generation failed:", format, e);
            return null;
        }
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

        for (const el of (markup.elements || [])) {
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
                const lineHeight = fontSize * 1.2;
                const labelLogicalWidth = inchWidth * DPI;
                const maxWidth = (el.width && el.width > 0) ? el.width : (labelLogicalWidth - (el.x || 0));
                function wrapText(str, maxW) {
                    if (!maxW || maxW <= 0) return [str.trim()];
                    const result = [], words = str.trim().split(" ");
                    let current = "";
                    for (const word of words) {
                        if (ctx.measureText(word).width > maxW) {
                            if (current) { result.push(current); current = ""; }
                            let charBuf = "";
                            for (const ch of word) {
                                const test = charBuf + ch;
                                if (ctx.measureText(test).width > maxW && charBuf !== "") { result.push(charBuf); charBuf = ch; }
                                else charBuf = test;
                            }
                            if (charBuf) current = charBuf;
                            continue;
                        }
                        const test = current ? current + " " + word : word;
                        if (ctx.measureText(test).width > maxW && current !== "") { result.push(current); current = word; }
                        else current = test;
                    }
                    if (current) result.push(current);
                    return result;
                }
                const rawLines = (el.text || "").split("\n");
                const wrappedLines = [];
                for (const raw of rawLines) wrapText(raw, maxWidth).forEach(l => wrappedLines.push(l));

                // ✅ FIX: ctx.textAlign anchor must match the alignment.
                // When textAlign="right", fillText x must be the RIGHT edge of the text box.
                // When textAlign="center", fillText x must be the CENTER of the text box.
                // When textAlign="left",  fillText x = 0 (start of box).
                const textX = align === "right"  ? maxWidth
                  : align === "center" ? maxWidth / 2
                    : 0;

                wrappedLines.forEach((line, i) => ctx.fillText(line, textX, i * lineHeight));
                ctx.restore();
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
            }

            if (el.type === "barcode") {
                const img = await generateBarcodeImage(el.format, el.text || "", el.width || 200, el.height || 200);
                if (!img) continue;
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                ctx.drawImage(img, 0, 0, el.width, el.height);
                ctx.restore();
            }

            if (el.type === "line") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                ctx.strokeStyle = el.stroke || "#000000";
                ctx.lineWidth = el.strokeWidth || 2;
                ctx.imageSmoothingEnabled = false;
                const points = el.points || [];
                if (points.length >= 4) {
                    ctx.beginPath();
                    ctx.moveTo(points[0], points[1]);
                    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
                    ctx.stroke();
                }
                ctx.restore();
            }

            if (el.type === "rect") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(0, 0, el.width || 0, el.height || 0); }
                if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1; ctx.strokeRect(0, 0, el.width || 0, el.height || 0); }
                ctx.restore();
            }

            if (el.type === "circle") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const r = el.radius || 10;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
                if (el.fill && el.fill !== "transparent") { ctx.fillStyle = el.fill; ctx.fill(); }
                if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1; ctx.stroke(); }
                ctx.restore();
            }

            if (el.type === "ellipse") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const rx = el.radiusX || 20, ry = el.radiusY || 10;
                ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                if (el.fill && el.fill !== "transparent") { ctx.fillStyle = el.fill; ctx.fill(); }
                if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1; ctx.stroke(); }
                ctx.restore();
            }

            if (el.type === "wedge") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const radius = el.radius || 50;
                const angleRad = ((el.angle || 60) * Math.PI) / 180;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, 0, angleRad); ctx.closePath();
                if (el.fill && el.fill !== "transparent") { ctx.fillStyle = el.fill; ctx.fill(); }
                if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1; ctx.stroke(); }
                ctx.restore();
            }

            if (el.type === "ring") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const outerR = el.outerRadius || 20, innerR = el.innerRadius || 10;
                if (el.fill && el.fill !== "transparent") {
                    ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2, false); ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
                    ctx.fillStyle = el.fill; ctx.fill("evenodd");
                }
                if (el.stroke) {
                    ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1;
                    ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.restore();
            }

            if (el.type === "arc") {
                ctx.save();
                ctx.globalAlpha = el.opacity ?? 1;
                ctx.translate(el.x || 0, el.y || 0);
                ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
                ctx.scale(el.scaleX || 1, el.scaleY || 1);
                const outerR = el.outerRadius || 40, innerR = el.innerRadius || 20;
                const sweepAngle = ((el.angle || 90) * Math.PI) / 180;
                const endAngle = sweepAngle;
                ctx.beginPath(); ctx.arc(0, 0, outerR, 0, endAngle, false); ctx.arc(0, 0, innerR, endAngle, 0, true); ctx.closePath();
                if (el.fill && el.fill !== "transparent") { ctx.fillStyle = el.fill; ctx.fill(); }
                if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth || 1; ctx.stroke(); }
                ctx.restore();
            }
        }

        return { canvas, inchWidth, inchHeight };
    }

    // ============================================================
    // SVG RENDERER
    // Converts a single markup object → SVG string.
    // All element types that renderMarkupToCanvas handles are
    // supported. Barcodes and external images are embedded as
    // base64 <image> elements so the file is fully self-contained.
    // ============================================================

    /**
     * Fetch an image URL and return a base64 data-URI string.
     * Returns null on failure (same contract as loadImage()).
     */
    function imageUrlToDataUri(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    const c = document.createElement("canvas");
                    c.width = img.naturalWidth;
                    c.height = img.naturalHeight;
                    c.getContext("2d").drawImage(img, 0, 0);
                    resolve(c.toDataURL("image/png"));
                } catch (e) {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }


    /**
     * Escape a string for safe inclusion in SVG text / attribute values.
     */
    function svgEscape(str) {
        return String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
    }

    /**
     * Build an SVG `transform` attribute value from element properties.
     * Matches the ctx.translate / rotate / scale calls in renderMarkupToCanvas.
     */
    function buildSvgTransform(el) {
        const x = el.x || 0;
        const y = el.y || 0;
        const rot = el.rotation || 0;
        const sx = el.scaleX || 1;
        const sy = el.scaleY || 1;

        // Order: translate → rotate → scale  (same as canvas save/translate/rotate/scale)
        let t = `translate(${x} ${y})`;
        if (rot) t += ` rotate(${rot})`;
        if (sx !== 1 || sy !== 1) t += ` scale(${sx} ${sy})`;
        return t;
    }

    /**
     * Wrap plain text into lines, honoring a max pixel width.
     * Mirrors the wrapText() logic inside renderMarkupToCanvas.
     * Uses an off-screen canvas for measurement.
     */
    function wrapTextForSvg(text, fontCss, maxWidth) {
        if (!maxWidth || maxWidth <= 0) return text.trim().split("\n");

        // Measure using a hidden canvas
        const mc = document.createElement("canvas");
        const mctx = mc.getContext("2d");
        mctx.font = fontCss;

        function measure(str) { return mctx.measureText(str).width; }

        const rawLines = (text || "").split("\n");
        const result = [];

        for (const raw of rawLines) {
            const words = raw.trim().split(" ");
            let current = "";

            for (const word of words) {
                if (measure(word) > maxWidth) {
                    if (current) { result.push(current); current = ""; }
                    let charBuf = "";
                    for (const ch of word) {
                        const test = charBuf + ch;
                        if (measure(test) > maxWidth && charBuf !== "") { result.push(charBuf); charBuf = ch; }
                        else charBuf = test;
                    }
                    if (charBuf) current = charBuf;
                    continue;
                }
                const test = current ? current + " " + word : word;
                if (measure(test) > maxWidth && current !== "") { result.push(current); current = word; }
                else current = test;
            }
            if (current) result.push(current);
        }

        return result.length ? result : [""];
    }

    /**
     * Convert one markup object to a complete SVG string.
     * This is async because barcodes and images need async loading.
     *
     * @param {object} markup  - Single markup (stage + elements)
     * @returns {Promise<string>} - Full SVG markup string
     */
    async function renderMarkupToSVG(markup) {
        const stage = markup.stage || {};
        const inchWidth  = unitToInch(stage.unit, stage.width  || 4);
        const inchHeight = unitToInch(stage.unit, stage.height || 2);
        const pxW = inchWidth  * DPI;
        const pxH = inchHeight * DPI;

        const bg = stage.background || "#ffffff";

        // We collect SVG element strings into this array
        const parts = [];

        for (const el of (markup.elements || [])) {
            const opacity  = el.opacity  != null ? el.opacity  : 1;
            const transform = buildSvgTransform(el);
            const gOpen  = `<g transform="${svgEscape(transform)}" opacity="${opacity}">`;
            const gClose = `</g>`;

            // ── text ──────────────────────────────────────────────────────
            if (el.type === "text") {
                const fontSize   = el.font?.size   || 14;
                const fontFamily = el.font?.family || "Arial";
                const fontStyle  = el.font?.style  || "normal";
                const color      = el.font?.color  || "#000000";
                const align      = el.align         || "left";
                const lineHeight = fontSize * 1.2;
                const maxWidth   = (el.width && el.width > 0) ? el.width : (pxW - (el.x || 0));

                const fontCss = `${fontStyle} ${fontSize}px ${fontFamily}`;
                const lines   = wrapTextForSvg(el.text || "", fontCss, maxWidth);

                // SVG text-anchor maps to canvas textAlign
                const anchor = align === "right" ? "end" : align === "center" ? "middle" : "start";
                // x offset for the text element itself (0-based inside the group)
                const textX  = align === "right" ? maxWidth : align === "center" ? maxWidth / 2 : 0;

                const tspans = lines.map((line, i) =>
                  `<tspan x="${textX}" dy="${i === 0 ? 0 : lineHeight}">${svgEscape(line)}</tspan>`
                ).join("");

                parts.push(`${gOpen}
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
${gClose}`);
            }

            // ── image ─────────────────────────────────────────────────────
            else if (el.type === "image") {
                const dataUri = await imageUrlToDataUri(el.url);
                if (dataUri) {
                    parts.push(`${gOpen}
  <image href="${dataUri}" x="0" y="0" width="${el.width || 0}" height="${el.height || 0}" preserveAspectRatio="none"/>
${gClose}`);
                }
            }

            // ── barcode ───────────────────────────────────────────────────
            else if (el.type === "barcode") {
                const bw = el.width  || 200;
                const bh = el.height || 200;
                const barcode = await generateBarcodeSVG(el.format, el.text || "", bw, bh);
                if (barcode) {
                    if (barcode.type === "svg") {
                        // bwip-js toSVG() returns a full <svg width="Npx" height="Mpx" ...> string.
                        // Strategy:
                        //   1. Extract the inner viewBox (or derive it from width/height attrs).
                        //   2. Rewrite the root <svg> tag so it has:
                        //        - our target width/height (el.width × el.height)
                        //        - the original viewBox  → browser scales vector content to fill
                        //        - preserveAspectRatio="none" → stretch to fit exactly
                        let svgStr = barcode.data;

                        // Extract existing viewBox attribute if present
                        const vbMatch = svgStr.match(/viewBox=["']([^"']+)["']/);
                        let viewBox = vbMatch ? vbMatch[1] : null;

                        if (!viewBox) {
                            // Derive viewBox from the width/height attrs on the root <svg>
                            const wMatch = svgStr.match(/<svg[^>]*\swidth=["']([0-9.]+)/);
                            const hMatch = svgStr.match(/<svg[^>]*\sheight=["']([0-9.]+)/);
                            const svgW = wMatch ? parseFloat(wMatch[1]) : bw;
                            const svgH = hMatch ? parseFloat(hMatch[1]) : bh;
                            viewBox = `0 0 ${svgW} ${svgH}`;
                        }

                        // Replace the opening <svg ...> tag entirely with our controlled version
                        svgStr = svgStr.replace(
                          /<svg[^>]*>/,
                          `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="${viewBox}" preserveAspectRatio="none">`
                        );

                        parts.push(gOpen + "\n  " + svgStr + "\n" + gClose);
                    } else {
                        // PNG fallback — embed as high-res raster
                        parts.push(`${gOpen}
  <image href="${barcode.data}" x="0" y="0" width="${bw}" height="${bh}" preserveAspectRatio="none"/>
${gClose}`);
                    }
                }
            }

            // ── line ──────────────────────────────────────────────────────
            else if (el.type === "line") {
                const points = el.points || [];
                if (points.length >= 4) {
                    let d = `M ${points[0]} ${points[1]}`;
                    for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
                    parts.push(`${gOpen}
  <path d="${d}" stroke="${svgEscape(el.stroke || "#000000")}" stroke-width="${el.strokeWidth || 2}" fill="none"/>
${gClose}`);
                }
            }

            // ── rect ──────────────────────────────────────────────────────
            else if (el.type === "rect") {
                const fillAttr   = el.fill   ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <rect x="0" y="0" width="${el.width || 0}" height="${el.height || 0}" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }

            // ── circle ────────────────────────────────────────────────────
            else if (el.type === "circle") {
                const r = el.radius || 10;
                const fillAttr   = (el.fill   && el.fill   !== "transparent") ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <circle cx="0" cy="0" r="${r}" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }

            // ── ellipse ───────────────────────────────────────────────────
            else if (el.type === "ellipse") {
                const rx = el.radiusX || 20, ry = el.radiusY || 10;
                const fillAttr   = (el.fill   && el.fill   !== "transparent") ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }

            // ── wedge ─────────────────────────────────────────────────────
            else if (el.type === "wedge") {
                const radius   = el.radius || 50;
                const angleRad = ((el.angle || 60) * Math.PI) / 180;
                const ex = radius * Math.cos(angleRad);
                const ey = radius * Math.sin(angleRad);
                const laf = angleRad > Math.PI ? 1 : 0;
                const d = `M 0 0 L ${radius} 0 A ${radius} ${radius} 0 ${laf} 1 ${ex} ${ey} Z`;
                const fillAttr   = (el.fill   && el.fill   !== "transparent") ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <path d="${d}" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }

            // ── ring ──────────────────────────────────────────────────────
            else if (el.type === "ring") {
                const outerR = el.outerRadius || 20, innerR = el.innerRadius || 10;
                // Use clip-path technique: draw outer circle, cut inner with evenodd
                const d = `M 0 ${outerR} A ${outerR} ${outerR} 0 1 0 0 ${-outerR} A ${outerR} ${outerR} 0 1 0 0 ${outerR} Z ` +
                  `M 0 ${innerR} A ${innerR} ${innerR} 0 1 0 0 ${-innerR} A ${innerR} ${innerR} 0 1 0 0 ${innerR} Z`;
                const fillAttr   = (el.fill && el.fill !== "transparent") ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <path d="${d}" fill-rule="evenodd" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }

            // ── arc ───────────────────────────────────────────────────────
            else if (el.type === "arc") {
                const outerR = el.outerRadius || 40, innerR = el.innerRadius || 20;
                const sweepRad = ((el.angle || 90) * Math.PI) / 180;
                const laf = sweepRad > Math.PI ? 1 : 0;
                const ox1 = outerR, oy1 = 0;
                const ox2 = outerR * Math.cos(sweepRad);
                const oy2 = outerR * Math.sin(sweepRad);
                const ix1 = innerR * Math.cos(sweepRad);
                const iy1 = innerR * Math.sin(sweepRad);
                const ix2 = innerR, iy2 = 0;
                const d = `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${laf} 1 ${ox2} ${oy2} ` +
                  `L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${laf} 0 ${ix2} ${iy2} Z`;
                const fillAttr   = (el.fill && el.fill !== "transparent") ? `fill="${svgEscape(el.fill)}"` : `fill="none"`;
                const strokeAttr = el.stroke ? `stroke="${svgEscape(el.stroke)}" stroke-width="${el.strokeWidth || 1}"` : `stroke="none"`;
                parts.push(`${gOpen}
  <path d="${d}" ${fillAttr} ${strokeAttr}/>
${gClose}`);
            }
        }

        // Assemble the final SVG
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${pxW}px"
     height="${pxH}px"
     viewBox="0 0 ${pxW} ${pxH}">
  <!-- Generated by QCIM Label SDK — mode: export_svg -->
  <rect width="${pxW}" height="${pxH}" fill="${svgEscape(bg)}"/>
${parts.join("\n")}
</svg>`;
    }

    /**
     * Trigger a browser download for a string blob.
     */
    function downloadTextFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    /**
     * Public utility: convert an array of markup objects to an array of SVG strings.
     * Useful when you want to handle the SVGs yourself (upload to server, display
     * in <img> tags, etc.) rather than triggering a download.
     *
     * @param {Array}   markups  - Array of markup objects from the API
     * @returns {Promise<string[]>}  - Array of SVG strings (one per markup)
     */
    QCIMLabelSDK.markupsToSVG = async function (markups) {
        if (!Array.isArray(markups)) throw new Error("markupsToSVG: markups must be an array");
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

    // ============================================================
    // EXPOSE SDK
    // ============================================================
    global.QCIMLabelSDK = QCIMLabelSDK;

})(window);