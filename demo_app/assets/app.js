function configureQproSdk() {
  if (typeof QPROLabelSDK === "undefined" || !window.QPRO_APP_CONFIG) {
    return;
  }

  QPROLabelSDK.setConfig({
    apiBaseUrl: window.QPRO_APP_CONFIG.apiBaseUrl,
    api_key: window.QPRO_APP_CONFIG.apiKey,
    api_token: window.QPRO_APP_CONFIG.apiSecret,
    printPageUrl: window.QPRO_APP_CONFIG.printPageUrl,
    debug: false,
  });
}

function resolveLabelName(button) {
  const explicitLabel = button.dataset.labelName;
  if (explicitLabel) {
    return explicitLabel;
  }

  const labels = window.QPRO_APP_CONFIG?.labels || {};
  return labels[button.dataset.case] || button.dataset.case || "";
}

async function printRecord(button) {
  const amount = 1;

  configureQproSdk();

  const labelName = resolveLabelName(button);
  if (!labelName) {
    throw new Error("Label name is missing for this use case.");
  }

  await QPROLabelSDK.printLabel({
    label_name: labelName,
    amount,
    apiData: {
      label_name: labelName,
      record_id: button.dataset.id,
      reference_code: button.dataset.referenceCode,
      title: button.dataset.title,
      location: button.dataset.location,
      status: button.dataset.status,
      owner_name: button.dataset.ownerName,
      category: button.dataset.category,
      quantity: button.dataset.quantity,
      scheduled_at: button.dataset.scheduledAt,
    },
    mode: "print_markups",
  });
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-print-button]");
  if (!button) {
    return;
  }

  try {
    await printRecord(button);
  } catch (error) {
    window.alert(error.message || "Unable to print label.");
  }
});
