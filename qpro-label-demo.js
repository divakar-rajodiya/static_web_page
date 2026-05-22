(function (global) {
    const labels = [
        ["Label A", "356938035643809", "iPhone 13", "SN-A12345", "92%", "Yes", "Unlocked", "No", "Pass", "A2633"],
        ["Label B", "356938035643801", "iPhone 12", "SN-1001", "90%", "Yes", "Unlocked", "No", "Pass", "A2403"],
        ["Label C", "356938035643802", "iPhone 13", "SN-1002", "92%", "Yes", "Verizon", "No", "Pass", "A2633"],
        ["Label D", "490154203237504", "Samsung S21", "SN-2001", "85%", "Yes", "T-Mobile", "No", "Pass", "SM-G991B"],
        ["Label E", "490154203237505", "Samsung S22", "SN-2002", "87%", "Yes", "Unlocked", "No", "Pass", "SM-S901B"],
        ["Label F", "490154203237506", "Samsung S23", "SN-2003", "91%", "Yes", "Verizon", "No", "Pass", "SM-S911B"],
        ["Label G", "867530912345601", "Google Pixel 6", "SN-3001", "84%", "Yes", "Unlocked", "No", "Pass", "GB7N6"],
        ["Label H", "867530912345602", "Google Pixel 7", "SN-3002", "89%", "Yes", "T-Mobile", "No", "Pass", "GVU6C"],
        ["Label I", "353918052107345", "OnePlus 10 Pro", "SN-4001", "86%", "Yes", "Unlocked", "No", "Pass", "NE2215"],
        ["Label J", "353918052107346", "Xiaomi Mi 11", "SN-5001", "83%", "Yes", "Global", "No", "Pass", "M2011K2C"],
    ];

    const fields = [
        "label_name",
        "IMEI",
        "Model_No",
        "Serial_No",
        "GT_Battery_Ratio",
        "Data_Wipe",
        "Carriers",
        "GT_Black_List",
        "Functional_Results",
        "Reg_Model_Number",
    ];

    const dataHeadings = [
        "Label Name",
        "IMEI",
        "Model No",
        "Serial No",
        "GT Battery Ratio",
        "Data Wipe",
        "Carriers",
        "GT Black List",
        "Functional Results",
        "Reg Model Number",
    ];

    const actions = {
        fetch_markups: {
            heading: "Fetch Markups",
            title: "Fetch markups from API and preview them in a popup",
            className: "btn-fetch-markups",
            label: "Preview",
            handler: fetchMarkups,
        },
        print_markups: {
            heading: "Print Markups",
            title: "Fetch markups from API and send to browser print dialog",
            className: "btn-print-markups",
            label: "Print",
            handler: printLabel,
        },
        printnode_zpl: {
            heading: "PrintNode ZPL",
            title: "Send label to printer via PrintNode using ZPL format",
            className: "btn-printnode-zpl",
            label: "ZPL Print",
            handler: printNodeLabel,
        },
        printnode_pdf: {
            heading: "PrintNode PDF",
            title: "Send label to printer via PrintNode using PDF/Image format",
            className: "btn-printnode-pdf",
            label: "PDF Print",
            handler: printNodePdf,
        },
        export_svg: {
            heading: "Export SVG",
            title: "Ask backend to convert markups to SVG and download the returned file",
            className: "btn-export-svg",
            label: "Export SVG",
            handler: exportSVG,
        },
    };

    function boot() {
        configureClients();
        highlightActiveNavLink();
        renderTable();
        renderEnvironment();
    }

    function configureClients() {
        if (!global.QPRO_CONFIG) {
            throw new Error("QPRO_CONFIG is missing. Include qpro-label-demo-config.js before qpro-label-demo.js.");
        }

        if (global.QPROLabelSDK) {
            global.QPROLabelSDK.setConfig(global.QPRO_CONFIG);
        }

        if (global.QPROLabelAPI) {
            global.QPROLabelAPI.setConfig(global.QPRO_CONFIG);
        }
    }

    function getEnabledActions() {
        const pageActions = document.body.dataset.actions || "export_svg";
        return pageActions
            .split(",")
            .map((action) => action.trim())
            .filter((action) => actions[action]);
    }

    function renderTable() {
        const table = document.getElementById("label-table");
        if (!table) return;

        const enabledActions = getEnabledActions();
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const headerRow = document.createElement("tr");

        dataHeadings.forEach((heading) => {
            const th = document.createElement("th");
            th.textContent = heading;
            headerRow.appendChild(th);
        });

        enabledActions.forEach((actionKey) => {
            const action = actions[actionKey];
            const th = document.createElement("th");
            th.textContent = action.heading;
            th.title = action.title;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        labels.forEach((labelValues, rowIndex) => {
            const row = document.createElement("tr");
            const rowData = getRowData(rowIndex);

            labelValues.forEach((value) => {
                const td = document.createElement("td");
                td.textContent = value;
                row.appendChild(td);
            });

            enabledActions.forEach((actionKey) => {
                const action = actions[actionKey];
                const td = document.createElement("td");
                const button = document.createElement("button");
                button.type = "button";
                button.className = action.className;
                button.textContent = action.label;
                button.addEventListener("click", () => action.handler(rowData));
                td.appendChild(button);
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.replaceChildren(thead, tbody);
    }

    function renderEnvironment() {
        const environment = global.QPRO_DEMO_ENV || "custom";
        const badge = document.getElementById("active-environment");
        const url = document.getElementById("active-environment-url");

        if (badge) {
            badge.textContent = environment;
            badge.className = `environment-badge ${environment}`;
        }

        if (url) {
            url.textContent = global.QPRO_CONFIG.apiBaseUrl;
        }
    }

    function highlightActiveNavLink() {
        const currentPage = getPageName(global.location.pathname);

        document.querySelectorAll(".page-links a").forEach((link) => {
            const linkPage = getPageName(link.getAttribute("href"));
            const isActive = linkPage === currentPage;
            link.classList.toggle("active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function getPageName(path) {
        return String(path || "")
            .split("?")[0]
            .split("/")
            .filter(Boolean)
            .pop();
    }

    function getRowData(index) {
        return fields.reduce((record, field, fieldIndex) => {
            record[field] = labels[index][fieldIndex];
            return record;
        }, {});
    }

    function showMarkupPreview(title, data) {
        const existing = document.querySelector(".json-modal");
        if (existing) existing.remove();

        const overlay = document.createElement("div");
        overlay.className = "json-modal";
        overlay.innerHTML = `
      <div class="json-modal-card">
        <div class="json-modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button class="json-modal-close" type="button">Close</button>
        </div>
        <div class="json-modal-body">
          <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
        </div>
      </div>
    `;

        function closeModal() {
            overlay.remove();
        }

        overlay.querySelector(".json-modal-close").addEventListener("click", closeModal);
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) closeModal();
        });

        document.body.appendChild(overlay);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    async function fetchMarkups(data) {
        try {
            const markups = await global.QPROLabelAPI.fetchMarkups({
                label_name: data.label_name,
                amount: 1,
                apiData: data,
            });
            console.log("Fetch markups response:", markups);
            showMarkupPreview(`Fetch Markups: ${data.label_name}`, markups);
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    }

    function printLabel(data) {
        global.QPROLabelSDK.printLabel({
            label_name: data.label_name,
            amount: 1,
            apiData: data,
            mode: "print_markups",
        });
    }

    async function printNodeLabel(data) {
        try {
            const response = await global.QPROLabelAPI.printNodeZpl({
                label_name: data.label_name,
                amount: 1,
                apiData: data,
                printer_id: global.QPRO_CONFIG.printNodePrinterId,
            });
            console.log("PrintNode ZPL response:", response);
            alert("Sent to printer successfully (ZPL)");
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    }

    async function printNodePdf(data) {
        try {
            const response = await global.QPROLabelAPI.printNodePdf({
                label_name: data.label_name,
                amount: 1,
                apiData: data,
                printer_id: global.QPRO_CONFIG.printNodePrinterId,
            });
            console.log("PrintNode PDF response:", response);
            alert("Sent to printer successfully (PDF)");
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    }

    async function exportSVG(data) {
        try {
            const response = await global.QPROLabelAPI.exportBackendSVG({
                label_name: data.label_name,
                amount: 1,
                apiData: data,
            });
            console.log("SVG export response:", response);

            const files = Array.isArray(response?.files) ? response.files : [];
            for (const file of files) {
                if (file?.path) {
                    await downloadBackendSvgFile(file, data.label_name);
                }
            }
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    }

    async function downloadBackendSvgFile(file, labelName) {
        const blob = await global.QPROLabelAPI.downloadBackendSVG({ path: file.path });
        const objectUrl = URL.createObjectURL(blob);
        triggerDownload(objectUrl, getSvgFilename(file, labelName));
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }

    function triggerDownload(url, filename) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    }

    function getSvgFilename(file, labelName) {
        if (file?.path) {
            const pathName = file.path.split("/").pop();
            if (pathName) return pathName;
        }

        return `${String(labelName || "label").replace(/[^a-z0-9_-]+/gi, "-")}.svg`;
    }

    document.addEventListener("DOMContentLoaded", boot);
})(window);
