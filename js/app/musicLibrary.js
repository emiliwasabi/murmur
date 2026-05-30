const tracks = [];
let selectedIndex = -1;

function getTrackName(file) {
  return file.name.replace(/\.[^/.]+$/, "");
}

function loadBundledCatalog(catalog) {
  (catalog || []).forEach((item) => {
    if (!item?.url) return;
    tracks.push({
      url: item.url,
      name: item.name || item.url.split("/").pop(),
      artist: item.artist || "Collection Murmur",
      bundled: true,
    });
  });
}

function renderLibraryList(listEl) {
  listEl.innerHTML = "";
  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    item.textContent = track.name;
    if (index === selectedIndex) item.classList.add("active");
    item.addEventListener("click", () => selectTrack(index));
    listEl.appendChild(item);
  });
}

function addFiles(fileList) {
  Array.from(fileList || []).forEach((file) => {
    if (!file.type.startsWith("audio/")) return;
    tracks.push({
      file,
      name: getTrackName(file),
      artist: "Bibliotheque locale",
    });
  });
  return tracks.length;
}

function selectTrack(index) {
  if (index < 0 || index >= tracks.length) return null;
  selectedIndex = index;
  const track = tracks[index];
  window.dispatchEvent(
    new CustomEvent("player-track-selected", { detail: track }),
  );
  return track;
}

function pickRandomTrack() {
  if (!tracks.length) return null;
  const index = Math.floor(Math.random() * tracks.length);
  return selectTrack(index);
}

function getSelectedTrack() {
  if (selectedIndex < 0) return null;
  return tracks[selectedIndex];
}

function getTrackSource(track) {
  if (!track) return null;
  return track.url || track.file || null;
}

window.PlayerMusicLibrary = {
  loadBundledCatalog,
  addFiles,
  selectTrack,
  pickRandomTrack,
  getSelectedTrack,
  getTrackSource,
  renderLibraryList,
  getTrackCount: () => tracks.length,
};
