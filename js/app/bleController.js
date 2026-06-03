// bleController.js — connexion BLE au device Murmur
const MURMUR_SERVICE = "12345678-1234-1234-1234-123456789abc";
const MURMUR_CHAR = "abcd1234-ab12-ab12-ab12-abcdef123456";

window.MurmurBLE = {
  async connect() {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "Murmur" }],
        optionalServices: [MURMUR_SERVICE],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(MURMUR_SERVICE);
      const char = await service.getCharacteristic(MURMUR_CHAR);

      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", (e) => {
        const val = new TextDecoder().decode(e.target.value);
        if (val === "play") {
          // Déclenche play/pause sur ton audio
          window.MurmurBLE.onButtonPress?.();
        }
      });

      console.log("Murmur BLE connecté");
      return true;
    } catch (err) {
      console.error("BLE error:", err);
      return false;
    }
  },
};
