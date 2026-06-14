const MURMUR_SERVICE = "12345678-1234-1234-1234-123456789abc";
const MURMUR_CHAR = "abcd1234-ab12-ab12-ab12-abcdef123456";

let connectedDevice = null;
let monitorTimer = null;

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function dispatchBleState(connected) {
  window.dispatchEvent(
    new CustomEvent("murmur-ble-state", { detail: { connected } }),
  );
}

function startConnectionMonitor() {
  if (monitorTimer) clearInterval(monitorTimer);
  monitorTimer = setInterval(() => {
    const connected = Boolean(connectedDevice?.gatt?.connected);
    if (!connected && connectedDevice) {
      connectedDevice = null;
      dispatchBleState(false);
    }
  }, 1500);
}

window.MurmurBLE = {
  onButtonPress: null,
  isConnected: () => Boolean(connectedDevice?.gatt?.connected),

  isSupported: () => Boolean(navigator.bluetooth),

  getUnsupportedHint() {
    if (navigator.bluetooth) return null;
    if (isIosDevice()) {
      return "Sur iPhone : installer Bluefy, puis ouvrir cette page en HTTPS.";
    }
    return "Utilisez Chrome ou Edge sur ordinateur (HTTPS).";
  },

  disconnect() {
    if (connectedDevice?.gatt?.connected) {
      connectedDevice.gatt.disconnect();
    }
    connectedDevice = null;
    dispatchBleState(false);
  },

  async connect() {
    if (!navigator.bluetooth) {
      console.error(window.MurmurBLE.getUnsupportedHint());
      dispatchBleState(false);
      return false;
    }

    try {
      if (connectedDevice?.gatt?.connected) {
        dispatchBleState(true);
        return true;
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [MURMUR_SERVICE] }],
        optionalServices: [MURMUR_SERVICE],
        acceptAllDevices: false,
      });

      device.addEventListener("gattserverdisconnected", () => {
        connectedDevice = null;
        dispatchBleState(false);
        console.log("Murmur BLE deconnecte");
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(MURMUR_SERVICE);
      const characteristic = await service.getCharacteristic(MURMUR_CHAR);

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const message = new TextDecoder().decode(event.target.value).trim();
        if (message !== "play") return;
        console.log("[Murmur BLE] play");
        window.MurmurBLE.onButtonPress?.();
      });

      connectedDevice = device;
      startConnectionMonitor();
      dispatchBleState(true);
      console.log("Murmur BLE connecte");
      return true;
    } catch (error) {
      dispatchBleState(false);
      if (error.name !== "NotFoundError") {
        console.error("BLE error:", error);
      }
      return false;
    }
  },
};
