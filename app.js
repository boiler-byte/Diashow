/* =========================================================
   Diashow
   Vanilla JS, keine Abhängigkeiten, nichts verlässt den Browser.
   ========================================================= */

(() => {
  'use strict';

  const TARGET_WIDTH = 1600;
  const SIZE_THRESHOLD = 200 * 1024;
  const WEBP_QUALITY = 0.9;
  const MAX_ZIP_DEPTH = 5;
  const MAX_IMAGES_PER_IMPORT = 4000;
  const MAX_ENTRY_BYTES = 200 * 1024 * 1024;
  const GALLERY_OVERSCAN = 900;
  const GALLERY_IMPORT_RENDER_INTERVAL = 1000;

  const MIME_BY_EXT = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif'
  };

  const SUPPORTED_EXTENSIONS = new Set(Object.keys(MIME_BY_EXT));
  const SUPPORTED_MIMES = new Set(Object.values(MIME_BY_EXT));

  const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'multipart/x-zip': 'zip'
  };

  const ZIP_MIMES = new Set(['application/zip', 'application/x-zip-compressed', 'multipart/x-zip']);

  const MAX_SLIDESHOW_IMAGES = 21;
  const SLIDESHOW_UI_IDLE_MS = 5000;
  const SLIDESHOW_CAROUSEL_SPEED = 200;
  const SLIDESHOW_STORAGE_KEY = 'fluechtige-galerie.slideshow-config.v1';
  const SLIDESHOW_CONFIG_DEFAULTS = Object.freeze({
    transition: 'fadeblack',
    zoom: 'in',
    move: 'off',
    images: '1',
    interval: '6',
    layout: 'grid'
  });
  const SLIDESHOW_ALLOWED_CONFIG = {
    transition: new Set(['off', 'fadeblack', 'crossfade', 'slide', 'zoom', 'flip', 'wipe', 'random']),
    zoom: new Set(['off', 'in', 'out', 'random']),
    move: new Set(['off', 'left', 'right', 'up', 'down', 'pan', 'random']),
    images: new Set([
      ...Array.from({ length: MAX_SLIDESHOW_IMAGES }, (_, index) => String(index + 1)),
      'random'
    ]),
    interval: new Set(['3', '4', '5', '6', '8', '10', '15', '20']),
    layout: new Set(['grid', 'masonry', 'carousel', 'stack', 'random'])
  };
  const SLIDESHOW_TRANSITION_LABELS = {
    off: 'Off',
    fadeblack: 'Fade Black',
    crossfade: 'Crossfade',
    slide: 'Slide',
    zoom: 'Zoom',
    flip: 'Flip',
    wipe: 'Wipe'
  };
  const SLIDESHOW_TRANSITION_DURATIONS = {
    off: 0,
    fadeblack: 1500,
    crossfade: 1200,
    slide: 1200,
    zoom: 1200,
    flip: 1100,
    wipe: 1200
  };
  const SLIDESHOW_RANDOM_TRANSITIONS = ['fadeblack', 'crossfade', 'slide', 'zoom', 'flip', 'wipe'];
  const SLIDESHOW_RANDOM_MOVES = ['left', 'right', 'up', 'down', 'pan'];

  const PAUSE_ICON =
    '<svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true"><rect x="5.5" y="4" width="3" height="12" rx="1"/><rect x="11.5" y="4" width="3" height="12" rx="1"/></svg>';
  const PLAY_ICON =
    '<svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M7 4.4c0-.8.9-1.3 1.6-.9l8.1 5.6c.6.4.6 1.3 0 1.7l-8.1 5.6c-.7.5-1.6 0-1.6-.9V4.4Z"/></svg>';

  const dom = {
    scrollTop: byId('scroll-top'),
    scrollBottom: byId('scroll-bottom'),
    hero: byId('hero'),
    heroDropzone: byId('hero-dropzone'),
    importerState: byId('importer-state'),
    importerStateText: byId('importer-state-text'),
    gallerySection: byId('gallery-section'),
    gallery: byId('gallery'),
    galleryMeta: byId('gallery-meta'),
    countBadge: byId('count-badge'),
    clearDialog: byId('clear-dialog'),
    clearDialogText: byId('clear-dialog-text'),
    dropOverlay: byId('drop-overlay'),
    progressPanel: byId('progress-panel'),
    progressTitle: byId('progress-title'),
    progressDetail: byId('progress-detail'),
    progressCount: byId('progress-count'),
    progressTrack: byId('progress-track'),
    progressBar: byId('progress-bar'),
    lightbox: byId('lightbox'),
    lightboxName: byId('lightbox-name'),
    lightboxMeta: byId('lightbox-meta'),
    lightboxImage: byId('lightbox-image'),
    lightboxCounter: byId('lightbox-counter'),
    lightboxClose: byId('lightbox-close'),
    lightboxPrev: byId('lightbox-prev'),
    lightboxNext: byId('lightbox-next'),
    lightboxSlideshow: byId('lightbox-slideshow'),
    slideshowLaunch: byId('slideshow-launch'),
    slideshowUi: byId('slideshow-ui'),
    slideshowSettings: byId('slideshow-settings'),
    slideshowSettingsPanel: byId('slideshow-settings-panel'),
    slideshowSettingsClose: byId('slideshow-settings-close'),
    slideshowConfigTransition: byId('slideshow-config-transition'),
    slideshowConfigZoom: byId('slideshow-config-zoom'),
    slideshowConfigMove: byId('slideshow-config-move'),
    slideshowConfigImages: byId('slideshow-config-images'),
    slideshowConfigInterval: byId('slideshow-config-interval'),
    slideshowConfigLayout: byId('slideshow-config-layout'),
    slideshow: byId('slideshow'),
    slideshowStage: byId('slideshow-stage'),
    slideshowPosition: byId('slideshow-position'),
    slideshowPause: byId('slideshow-pause'),
    slideshowShuffle: byId('slideshow-shuffle'),
    slideshowFit: byId('slideshow-fit'),
    slideshowClose: byId('slideshow-close'),
    slideshowPrev: byId('slideshow-prev'),
    slideshowNext: byId('slideshow-next'),
    slideshowCaption: byId('slideshow-caption'),
    slideshowSub: byId('slideshow-sub'),
    slideshowProgressBar: byId('slideshow-progress-bar'),
    fileInput: byId('file-input'),
    folderInput: byId('folder-input'),
    toastRegion: byId('toast-region')
  };

  const state = {
    images: [],
    nextId: 1,
    totalBytes: 0,
    optimizedCount: 0,
    queue: [],
    importing: false,
    dragDepth: 0,
    lightboxIndex: -1,
    lightboxReturnFocus: null,
    slideshow: {
      active: false,
      index: 0,
      paused: false,
      timer: null,
      remaining: 0,
      startedAt: 0,
      layerZ: 0,
      preloads: [],
      order: [],
      shuffle: false,
      fit: false,
      config: { ...SLIDESHOW_CONFIG_DEFAULTS },
      panelCount: 1,
      transitionDuration: 0,
      transitionToken: 0
    }
  };

  const renderedCards = new Map();
  let galleryRenderFrame = 0;
  let galleryRenderForce = false;
  let galleryImportTimer = 0;
  let lastGalleryRenderAt = 0;
  let galleryWidth = 0;
  let galleryLayout = null;
  let slideshowUiTimer = 0;

  const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  const byteIntegerFormat = new Intl.NumberFormat('de-DE');

  init();

  function init() {
    loadSlideshowConfig();
    syncSlideshowConfigInputs();
    bindTopbarScroll();
    bindPickerButtons();
    bindFileInputs();
    bindPaste();
    bindDragAndDrop();
    bindLightbox();
    bindSlideshow();
    bindVirtualGallery();
    bindClearDialog();
    bindWindowCleanup();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function bindTopbarScroll() {
    const getScrollBehavior = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    const updateScrollButtons = () => {
      if (!dom.scrollTop || !dom.scrollBottom) return;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      dom.scrollTop.disabled = window.scrollY <= 2;
      dom.scrollBottom.disabled = maxScroll <= 2 || window.scrollY >= maxScroll - 2;
    };

    dom.scrollTop?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    });
    dom.scrollBottom?.addEventListener('click', () => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: getScrollBehavior()
      });
    });

    window.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(updateScrollButtons).observe(document.body);
    }

    updateScrollButtons();
  }

  /* -------------------------------------------------------
     Input & queue
     ------------------------------------------------------- */

  function bindPickerButtons() {
    document.querySelectorAll('.js-pick-files').forEach((button) => {
      button.addEventListener('click', () => dom.fileInput.click());
    });

    document.querySelectorAll('.js-pick-folder').forEach((button) => {
      button.addEventListener('click', () => dom.folderInput.click());
    });

    document.querySelectorAll('.js-paste').forEach((button) => {
      button.addEventListener('click', () => {
        void pasteFromClipboard();
      });
    });

    document.querySelectorAll('.js-clear-all').forEach((button) => {
      button.addEventListener('click', openClearDialog);
    });
  }

  function bindFileInputs() {
    dom.fileInput.addEventListener('change', () => {
      const files = Array.from(dom.fileInput.files || []);
      dom.fileInput.value = '';
      if (files.length) enqueueFiles(files, 'Dateiauswahl');
    });

    dom.folderInput.addEventListener('change', () => {
      const files = Array.from(dom.folderInput.files || []);
      dom.folderInput.value = '';
      if (files.length) enqueueFiles(files, 'Ordnerauswahl');
    });
  }

  function enqueueFiles(files, label) {
    const sources = files.map((file) => ({
      file,
      path: file.webkitRelativePath || file.name || 'Bild'
    }));
    enqueueSources(sources, label);
  }

  function enqueueSources(sources, label = 'Import') {
    const valid = sources.filter((source) => source && source.file);
    if (!valid.length) return;

    state.queue.push({ sources: valid, label });
    if (!state.importing) {
      void drainQueue();
    }
  }

  async function drainQueue() {
    if (state.importing) return;

    state.importing = true;
    setImporterBusy(true);

    try {
      while (state.queue.length) {
        const job = state.queue.shift();
        try {
          await importJob(job);
        } catch (error) {
          console.error('Import fehlgeschlagen:', error);
          showToast(`„${job.label}“ konnte nicht gelesen werden.`, 'error');
        }
      }
    } finally {
      state.importing = false;
      setImporterBusy(false);
      dom.progressPanel.hidden = true;
      scheduleGalleryRender(true);
    }
  }

  async function importJob(job) {
    const stats = {
      images: [],
      skipped: 0,
      errors: 0,
      archives: 0,
      limitReached: false
    };

    for (let index = 0; index < job.sources.length; index += 1) {
      const source = job.sources[index];
      updateProgress({
        title: 'Dateien werden gelesen',
        detail: source.path,
        current: index,
        total: job.sources.length
      });

      try {
        if (isZipFile(source.file, source.path)) {
          stats.archives += 1;
          await collectZip(source.file, source.path, 0, stats);
        } else if (isSupportedImageFile(source.path, source.file.type)) {
          stats.images.push({ blob: source.file, path: source.path });
        } else {
          stats.skipped += 1;
        }
      } catch (error) {
        console.warn(`Quelle konnte nicht gelesen werden: ${source.path}`, error);
        stats.errors += 1;
      }

      await yieldToMain();
    }

    if (!stats.images.length) {
      reportEmptyImport(stats);
      return;
    }

    const total = Math.min(stats.images.length, MAX_IMAGES_PER_IMPORT);
    let added = 0;
    let optimized = 0;
    let failed = 0;

    for (let index = 0; index < total; index += 1) {
      const entry = stats.images[index];
      updateProgress({
        title: 'Bilder werden optimiert',
        detail: basenameOf(entry.path),
        current: index,
        total
      });

      try {
        const prepared = await prepareImage(entry.blob, entry.path);
        addImage(prepared);
        added += 1;
        if (prepared.converted) optimized += 1;
      } catch (error) {
        console.warn(`Bild konnte nicht verarbeitet werden: ${entry.path}`, error);
        failed += 1;
      }

      updateProgress({
        title: 'Bilder werden optimiert',
        detail: basenameOf(entry.path),
        current: index + 1,
        total
      });
      await yieldToMain();
    }

    if (stats.images.length > total) {
      stats.skipped += stats.images.length - total;
      stats.limitReached = true;
    }

    reportImportResult({
      added,
      optimized,
      failed,
      skipped: stats.skipped,
      errors: stats.errors,
      limitReached: stats.limitReached
    });
  }

  function reportEmptyImport(stats) {
    if (stats.errors > 0) {
      showToast('Keine Bilder lesbar. Prüfe, ob die Dateien gültig sind.', 'error');
      return;
    }

    if (stats.skipped > 0) {
      showToast('Keine unterstützten Bilder gefunden. Erlaubt sind JPG, PNG, WebP, GIF und ZIP.', 'error');
      return;
    }

    showToast('Keine Bilder in der Auswahl gefunden.', 'error');
  }

  function reportImportResult({ added, optimized, failed, skipped, errors, limitReached }) {
    if (!added) {
      showToast('Die Bilder konnten nicht verarbeitet werden.', 'error');
      return;
    }

    let message = `${added} ${added === 1 ? 'Bild' : 'Bilder'} hinzugefügt`;
    if (optimized > 0) message += ` · ${optimized} als WebP optimiert`;
    if (skipped > 0) message += ` · ${skipped} übersprungen`;
    if (failed + errors > 0) message += ` · ${failed + errors} nicht lesbar`;
    if (limitReached) message += ' · Import-Limit erreicht';

    showToast(message, failed + errors > 0 ? 'error' : 'info');
  }

  function setImporterBusy(isBusy) {
    dom.importerState.classList.toggle('is-active', isBusy);
    dom.importerStateText.textContent = isBusy ? 'Import läuft' : 'Bereit';
  }

  function updateProgress({ title, detail, current = 0, total = 0 }) {
    dom.progressPanel.hidden = false;
    dom.progressTitle.textContent = title;
    dom.progressDetail.textContent = detail || '';

    if (total > 0) {
      const safeCurrent = Math.max(0, Math.min(current, total));
      dom.progressTrack.classList.remove('is-indeterminate');
      dom.progressBar.style.width = `${(safeCurrent / total) * 100}%`;
      dom.progressCount.textContent = `${safeCurrent} / ${total}`;
    } else {
      dom.progressTrack.classList.add('is-indeterminate');
      dom.progressBar.style.width = '';
      dom.progressCount.textContent = '';
    }
  }

  function yieldToMain() {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 0);
    });
  }

  /* -------------------------------------------------------
     Clipboard
     ------------------------------------------------------- */

  function bindPaste() {
    document.addEventListener('paste', (event) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;

      const files = filesFromClipboardData(event.clipboardData);
      if (!files.length) return;

      event.preventDefault();
      enqueueFiles(files, 'Zwischenablage');
    });
  }

  function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
  }

  function filesFromClipboardData(dataTransfer) {
    if (!dataTransfer) return [];

    const directFiles = Array.from(dataTransfer.files || []);
    if (directFiles.length) return directFiles;

    const files = [];
    for (const item of Array.from(dataTransfer.items || [])) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    return files;
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
      showToast('Der Einfügen-Button wird hier nicht unterstützt. Drücke stattdessen Strg+V.', 'error');
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const files = [];
      let counter = 0;

      for (const item of clipboardItems) {
        const type = item.types.find((candidate) => candidate.startsWith('image/') || ZIP_MIMES.has(candidate));
        if (!type) continue;

        const blob = await item.getType(type);
        const extension = EXT_BY_MIME[type];
        if (!extension) continue;

        const stamp = String(Date.now()).slice(-7);
        const name = `Zwischenablage-${stamp}-${counter + 1}.${extension}`;
        files.push(new File([blob], name, { type }));
        counter += 1;
      }

      if (!files.length) {
        showToast('Keine Bilder oder ZIP-Archive in der Zwischenablage gefunden.', 'error');
        return;
      }

      enqueueFiles(files, 'Zwischenablage');
    } catch (error) {
      console.warn('Zwischenablage konnte nicht gelesen werden:', error);

      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        showToast('Zugriff auf die Zwischenablage verweigert. Erlaube den Zugriff oder nutze Strg+V.', 'error');
      } else {
        showToast('Einfügen nicht möglich. Nutze stattdessen Strg+V.', 'error');
      }
    }
  }

  /* -------------------------------------------------------
     Drag & drop (inklusive Ordnern)
     ------------------------------------------------------- */

  function bindDragAndDrop() {
    window.addEventListener('dragenter', (event) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      state.dragDepth += 1;
      showDropOverlay();
    });

    window.addEventListener('dragover', (event) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      showDropOverlay();
    });

    window.addEventListener('dragleave', (event) => {
      if (!hasDraggedFiles(event)) return;
      state.dragDepth = Math.max(0, state.dragDepth - 1);
      if (state.dragDepth === 0) hideDropOverlay();
    });

    window.addEventListener('drop', (event) => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      state.dragDepth = 0;
      hideDropOverlay();

      const transfer = event.dataTransfer;
      if (!transfer) return;

      // Vor dem ersten await auslesen: DataTransfer kann danach geleert sein.
      const items = Array.from(transfer.items || []);
      const entries = items
        .filter((item) => item.kind === 'file')
        .map((item) => {
          try {
            return item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      const directFiles = Array.from(transfer.files || []);

      void handleDrop(entries, directFiles);
    });

    window.addEventListener('blur', hideDropOverlay);
  }

  async function handleDrop(entries, directFiles) {
    if (!entries.length) {
      if (directFiles.length) enqueueFiles(directFiles, 'Drag & Drop');
      return;
    }

    try {
      const sources = [];
      for (const entry of entries) {
        await walkEntry(entry, '', sources);
      }

      if (sources.length) {
        enqueueSources(sources, 'Drag & Drop');
      } else if (directFiles.length) {
        enqueueFiles(directFiles, 'Drag & Drop');
      }
    } catch (error) {
      console.warn('Drag & Drop konnte nicht gelesen werden:', error);
      if (directFiles.length) {
        enqueueFiles(directFiles, 'Drag & Drop');
      } else {
        showToast('Die abgelegten Dateien konnten nicht gelesen werden.', 'error');
      }
    }
  }

  async function walkEntry(entry, prefix, output) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isFile) {
      try {
        const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
        output.push({ file, path });
      } catch (error) {
        console.warn(`Datei nicht lesbar: ${path}`, error);
      }
      return;
    }

    if (entry.isDirectory) {
      try {
        const reader = entry.createReader();
        const children = [];

        while (true) {
          const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
          if (!batch.length) break;
          children.push(...batch);
        }

        for (const child of children) {
          await walkEntry(child, path, output);
        }
      } catch (error) {
        console.warn(`Ordner nicht lesbar: ${path}`, error);
      }
    }
  }

  function hasDraggedFiles(event) {
    const types = event.dataTransfer && event.dataTransfer.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  }

  function showDropOverlay() {
    dom.dropOverlay.hidden = false;
    dom.heroDropzone.classList.add('is-dragging');
  }

  function hideDropOverlay() {
    state.dragDepth = 0;
    dom.dropOverlay.hidden = true;
    dom.heroDropzone.classList.remove('is-dragging');
  }

  /* -------------------------------------------------------
     ZIP (Zentralverzeichnis, Store + Deflate)
     ------------------------------------------------------- */

  async function collectZip(zipBlob, zipPath, depth, stats) {
    if (depth > MAX_ZIP_DEPTH) {
      stats.skipped += 1;
      return;
    }

    let entries;
    try {
      entries = await readZipDirectory(zipBlob);
    } catch (error) {
      console.warn(`ZIP konnte nicht gelesen werden: ${zipPath}`, error);
      stats.errors += 1;
      return;
    }

    for (const entry of entries) {
      if (stats.images.length >= MAX_IMAGES_PER_IMPORT) {
        stats.limitReached = true;
        return;
      }

      if (entry.directory || isIgnoredZipPath(entry.name)) continue;

      const entryPath = `${zipPath}/${entry.name}`;

      try {
        if (entry.encrypted) {
          stats.skipped += 1;
          continue;
        }

        if (entry.method !== 0 && entry.method !== 8) {
          stats.skipped += 1;
          continue;
        }

        if (isZipFileName(entry.name)) {
          if (depth >= MAX_ZIP_DEPTH) {
            stats.skipped += 1;
            continue;
          }

          const nestedBlob = await extractZipEntry(zipBlob, entry);
          await collectZip(nestedBlob, entryPath, depth + 1, stats);
          continue;
        }

        if (!isSupportedImagePath(entry.name)) {
          stats.skipped += 1;
          continue;
        }

        if (entry.uncompressedSize > MAX_ENTRY_BYTES) {
          stats.skipped += 1;
          continue;
        }

        const rawBlob = await extractZipEntry(zipBlob, entry);
        const mime = MIME_BY_EXT[extensionOf(entry.name)];
        const imageBlob = rawBlob.type ? rawBlob : rawBlob.slice(0, rawBlob.size, mime);
        stats.images.push({ blob: imageBlob, path: entryPath });
      } catch (error) {
        console.warn(`ZIP-Eintrag nicht lesbar: ${entryPath}`, error);
        stats.errors += 1;
      }
    }
  }

  async function readZipDirectory(blob) {
    if (blob.size < 22) {
      throw new Error('Zu klein für ein ZIP-Archiv.');
    }

    const tailLength = Math.min(blob.size, 22 + 0xffff);
    const tailBuffer = await blob.slice(blob.size - tailLength).arrayBuffer();
    const tail = new DataView(tailBuffer);
    const eocdOffset = findEndOfCentralDirectory(tail);

    if (eocdOffset < 0) {
      throw new Error('ZIP-Endverzeichnis nicht gefunden.');
    }

    const diskNumber = tail.getUint16(eocdOffset + 4, true);
    const centralDisk = tail.getUint16(eocdOffset + 6, true);
    const entryCount = tail.getUint16(eocdOffset + 10, true);
    const centralSize = tail.getUint32(eocdOffset + 12, true);
    const centralOffset = tail.getUint32(eocdOffset + 16, true);

    if (diskNumber !== 0 || centralDisk !== 0) {
      throw new Error('Mehrteilige ZIP-Archive werden nicht unterstützt.');
    }

    if (
      entryCount === 0xffff ||
      centralSize === 0xffffffff ||
      centralOffset === 0xffffffff
    ) {
      throw new Error('ZIP64-Archive werden nicht unterstützt.');
    }

    if (centralOffset + centralSize > blob.size) {
      throw new Error('ZIP-Verzeichnis liegt außerhalb des Archivs.');
    }

    if (entryCount === 0) return [];

    const centralBuffer = await blob.slice(centralOffset, centralOffset + centralSize).arrayBuffer();
    const view = new DataView(centralBuffer);
    const entries = [];
    let pointer = 0;

    for (let index = 0; index < entryCount; index += 1) {
      if (pointer + 46 > view.byteLength) break;
      if (view.getUint32(pointer, true) !== 0x02014b50) break;

      const flags = view.getUint16(pointer + 8, true);
      const method = view.getUint16(pointer + 10, true);
      const compressedSize = view.getUint32(pointer + 20, true);
      const uncompressedSize = view.getUint32(pointer + 24, true);
      const nameLength = view.getUint16(pointer + 28, true);
      const extraLength = view.getUint16(pointer + 30, true);
      const commentLength = view.getUint16(pointer + 32, true);
      const externalAttributes = view.getUint32(pointer + 38, true);
      const localHeaderOffset = view.getUint32(pointer + 42, true);

      const nextPointer = pointer + 46 + nameLength + extraLength + commentLength;
      if (nextPointer > view.byteLength) break;

      const nameBytes = new Uint8Array(centralBuffer, pointer + 46, nameLength);
      const name = decodeZipName(nameBytes, Boolean(flags & 0x800)).replace(/\\/g, '/');
      const directory = name.endsWith('/') || (externalAttributes & 0x10) !== 0;

      if (
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff ||
        localHeaderOffset === 0xffffffff
      ) {
        pointer = nextPointer;
        continue;
      }

      entries.push({
        name,
        directory,
        encrypted: Boolean(flags & 1),
        method,
        compressedSize,
        uncompressedSize,
        localHeaderOffset
      });

      pointer = nextPointer;
    }

    return entries;
  }

  function findEndOfCentralDirectory(view) {
    for (let index = view.byteLength - 22; index >= 0; index -= 1) {
      if (view.getUint32(index, true) !== 0x06054b50) continue;
      const commentLength = view.getUint16(index + 20, true);
      if (index + 22 + commentLength <= view.byteLength) {
        return index;
      }
    }
    return -1;
  }

  function decodeZipName(bytes, isUtf8) {
    if (isUtf8) {
      return new TextDecoder('utf-8').decode(bytes);
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      try {
        return new TextDecoder('windows-1252').decode(bytes);
      } catch {
        return new TextDecoder('utf-8').decode(bytes);
      }
    }
  }

  async function extractZipEntry(zipBlob, entry) {
    if (entry.localHeaderOffset + 30 > zipBlob.size) {
      throw new Error('Ungültiger lokaler ZIP-Header.');
    }

    const headerBuffer = await zipBlob.slice(entry.localHeaderOffset, entry.localHeaderOffset + 30).arrayBuffer();
    const header = new DataView(headerBuffer);

    if (header.getUint32(0, true) !== 0x04034b50) {
      throw new Error('Lokaler ZIP-Header ungültig.');
    }

    const nameLength = header.getUint16(26, true);
    const extraLength = header.getUint16(28, true);
    const dataStart = entry.localHeaderOffset + 30 + nameLength + extraLength;

    if (dataStart + entry.compressedSize > zipBlob.size) {
      throw new Error('ZIP-Daten liegen außerhalb des Archivs.');
    }

    const compressed = zipBlob.slice(dataStart, dataStart + entry.compressedSize);

    if (entry.method === 0) {
      return compressed;
    }

    if (entry.method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('Dieser Browser kann komprimierte ZIP-Dateien nicht entpacken.');
      }

      const stream = compressed.stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(stream).blob();
    }

    throw new Error(`Nicht unterstützte ZIP-Kompression: ${entry.method}`);
  }

  function isIgnoredZipPath(path) {
    const normalized = path.replace(/\\/g, '/');
    const base = normalized.split('/').pop() || '';

    return (
      normalized.startsWith('__MACOSX/') ||
      normalized.includes('/__MACOSX/') ||
      base === '.DS_Store' ||
      base === 'Thumbs.db' ||
      base.startsWith('._')
    );
  }

  /* -------------------------------------------------------
     Erkennung / Pfade
     ------------------------------------------------------- */

  function isZipFileName(path) {
    return extensionOf(path) === 'zip';
  }

  function isZipFile(file, path) {
    const extension = extensionOf(path);
    if (extension === 'zip') return true;
    return !extension && ZIP_MIMES.has(file.type);
  }

  function isSupportedImagePath(path) {
    return SUPPORTED_EXTENSIONS.has(extensionOf(path));
  }

  function isSupportedImageFile(path, mime) {
    if (isSupportedImagePath(path)) return true;
    return !extensionOf(path) && SUPPORTED_MIMES.has(mime);
  }

  function extensionOf(path) {
    const cleanPath = String(path || '').split(/[?#]/, 1)[0];
    const name = basenameOf(cleanPath);
    const dot = name.lastIndexOf('.');
    if (dot <= 0 || dot === name.length - 1) return '';
    return name.slice(dot + 1).toLowerCase();
  }

  function basenameOf(path) {
    const parts = String(path || '').split(/[\\/]/);
    return parts[parts.length - 1] || 'Bild';
  }

  /* -------------------------------------------------------
     Bilddekodierung, WebP & Größenanpassung
     ------------------------------------------------------- */

  async function prepareImage(blob, path) {
    const extension = extensionOf(path);
    const fallbackMime = MIME_BY_EXT[extension] || blob.type || 'application/octet-stream';
    const sourceBlob = blob.type ? blob : blob.slice(0, blob.size, fallbackMime);

    const decoded = await decodeImage(sourceBlob);

    try {
      if (!decoded.width || !decoded.height) {
        throw new Error('Bildabmessungen konnten nicht ermittelt werden.');
      }

      const needsOptimization =
        decoded.width > TARGET_WIDTH || sourceBlob.size > SIZE_THRESHOLD;

      let resultBlob = sourceBlob;
      let outputWidth = decoded.width;
      let outputHeight = decoded.height;
      let converted = false;
      let resized = false;

      if (needsOptimization) {
        if (decoded.width > TARGET_WIDTH) {
          outputWidth = TARGET_WIDTH;
          outputHeight = Math.max(1, Math.round((decoded.height / decoded.width) * TARGET_WIDTH));
          resized = true;
        }

        try {
          const canvas = createCanvas(outputWidth, outputHeight);
          const context = canvas.getContext('2d', { alpha: true });

          if (!context) throw new Error('Canvas-Kontext nicht verfügbar.');

          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(decoded.source, 0, 0, outputWidth, outputHeight);

          const webp = await canvasToWebp(canvas);
          if (!webp || webp.type !== 'image/webp' || webp.size === 0) {
            throw new Error('WebP-Ausgabe nicht verfügbar.');
          }

          resultBlob = webp;
          converted = true;
        } catch (error) {
          console.warn(`WebP-Optimierung fehlgeschlagen: ${path}`, error);
          outputWidth = decoded.width;
          outputHeight = decoded.height;
          converted = false;
          resized = false;
        }
      }

      return {
        blob: resultBlob,
        path,
        width: outputWidth,
        height: outputHeight,
        originalWidth: decoded.width,
        originalHeight: decoded.height,
        originalBytes: sourceBlob.size,
        bytes: resultBlob.size,
        converted,
        resized,
        originalFormat: extension || mimeExtension(sourceBlob.type) || 'img'
      };
    } finally {
      if (decoded.close) {
        try {
          decoded.close();
        } catch {
          /* noop */
        }
      }
    }
  }

  async function decodeImage(blob) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close()
        };
      } catch {
        try {
          const bitmap = await createImageBitmap(blob);
          return {
            source: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            close: () => bitmap.close()
          };
        } catch (error) {
          console.warn('createImageBitmap fehlgeschlagen, nutze <img>-Fallback.', error);
        }
      }
    }

    return decodeImageElement(blob);
  }

  function decodeImageElement(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          source: image,
          width: image.naturalWidth,
          height: image.naturalHeight,
          close: null
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Bild konnte nicht dekodiert werden.'));
      };

      image.src = url;
    });
  }

  function createCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function canvasToWebp(canvas) {
    if (typeof canvas.convertToBlob === 'function') {
      return canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY });
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas konnte nicht als WebP exportiert werden.'));
        },
        'image/webp',
        WEBP_QUALITY
      );
    });
  }

  function mimeExtension(mime) {
    for (const [extension, type] of Object.entries(MIME_BY_EXT)) {
      if (type === mime) return extension;
    }
    return '';
  }

  /* -------------------------------------------------------
     Galerie
     ------------------------------------------------------- */

  function addImage(prepared) {
    const image = {
      id: state.nextId,
      name: basenameOf(prepared.path),
      path: prepared.path,
      url: URL.createObjectURL(prepared.blob),
      blob: prepared.blob,
      width: prepared.width,
      height: prepared.height,
      bytes: prepared.bytes,
      originalBytes: prepared.originalBytes,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      converted: prepared.converted,
      resized: prepared.resized,
      originalFormat: prepared.originalFormat
    };

    state.nextId += 1;
    state.images.push(image);
    state.totalBytes += image.bytes;
    if (image.converted) state.optimizedCount += 1;

    if (dom.gallerySection.hidden) {
      dom.hero.hidden = true;
      dom.gallerySection.hidden = false;
    }

    scheduleGalleryRender();
  }

  function createCard(image) {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.dataset.imageId = String(image.id);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${image.name} in voller Größe ansehen`);
    card.title = image.path;

    const media = document.createElement('div');
    media.className = 'card-media is-loading';

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.name;
    img.width = image.width;
    img.height = image.height;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('load', () => {
      img.classList.add('is-loaded');
      media.classList.remove('is-loading');
    });
    img.addEventListener('error', () => {
      media.classList.remove('is-loading');
    });

    const shade = document.createElement('div');
    shade.className = 'card-shade';
    shade.setAttribute('aria-hidden', 'true');

    const chips = document.createElement('div');
    chips.className = 'card-chips';
    chips.appendChild(
      makeChip(image.converted ? 'WebP' : image.originalFormat.toUpperCase(), image.converted)
    );
    if (image.resized) {
      chips.appendChild(makeChip(`${TARGET_WIDTH} px`, false));
    }

    const removeButton = document.createElement('button');
    removeButton.className = 'card-remove';
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `${image.name} entfernen`);
    removeButton.innerHTML =
      '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m4 4 8 8M12 4l-8 8"/></svg>';

    const info = document.createElement('div');
    info.className = 'card-info';

    const name = document.createElement('p');
    name.className = 'card-name';
    name.textContent = image.name;

    const meta = document.createElement('p');
    meta.className = 'card-meta';
    const sizeText = document.createTextNode(
      `${image.width} × ${image.height} · ${formatBytes(image.bytes)}`
    );
    meta.appendChild(sizeText);
    if (image.converted) {
      const accent = document.createElement('span');
      accent.className = 'meta-accent';
      accent.textContent = ' · optimiert';
      meta.appendChild(accent);
    }

    info.append(name, meta);
    media.append(img, shade, chips, removeButton, info);
    card.append(media);

    card.addEventListener('click', (event) => {
      if (event.target.closest('.card-remove')) return;
      openLightbox(image.id);
    });

    card.addEventListener('keydown', (event) => {
      if (event.target !== card) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openLightbox(image.id);
    });

    removeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      removeImage(image.id);
    });

    return card;
  }

  function makeChip(label, isAccent) {
    const chip = document.createElement('span');
    chip.className = `chip${isAccent ? ' chip-accent' : ''}`;
    chip.textContent = label;
    return chip;
  }

  function bindVirtualGallery() {
    window.addEventListener('scroll', () => {
      if (!dom.gallerySection.hidden) scheduleGalleryFrame();
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!dom.gallerySection.hidden) scheduleGalleryFrame();
    });

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width || dom.gallery.clientWidth;
        if (!width || Math.abs(width - galleryWidth) < 0.5) return;
        galleryWidth = width;
        if (!dom.gallerySection.hidden) scheduleGalleryFrame();
      });
      observer.observe(dom.gallery);
    }
  }

  function scheduleGalleryRender(force = false) {
    if (dom.gallerySection.hidden) return;

    if (force) {
      galleryRenderForce = true;
      if (galleryImportTimer) {
        window.clearTimeout(galleryImportTimer);
        galleryImportTimer = 0;
      }
      scheduleGalleryFrame();
      return;
    }

    if (galleryImportTimer || galleryRenderFrame) return;

    if (state.importing) {
      const elapsed = performance.now() - lastGalleryRenderAt;
      if (elapsed < GALLERY_IMPORT_RENDER_INTERVAL) {
        galleryImportTimer = window.setTimeout(() => {
          galleryImportTimer = 0;
          scheduleGalleryRender();
        }, GALLERY_IMPORT_RENDER_INTERVAL - elapsed);
        return;
      }
    }

    scheduleGalleryFrame();
  }

  function scheduleGalleryFrame() {
    if (galleryRenderFrame) return;

    galleryRenderFrame = window.requestAnimationFrame(() => {
      galleryRenderFrame = 0;
      lastGalleryRenderAt = performance.now();

      const shouldForce = galleryRenderForce;
      galleryRenderForce = false;
      updateGalleryMeta();
      renderVirtualGallery(shouldForce);
    });
  }

  function cancelGalleryRender() {
    if (galleryImportTimer) {
      window.clearTimeout(galleryImportTimer);
      galleryImportTimer = 0;
    }
    if (galleryRenderFrame) {
      window.cancelAnimationFrame(galleryRenderFrame);
      galleryRenderFrame = 0;
    }
    galleryRenderForce = false;
    lastGalleryRenderAt = 0;
  }

  function getVirtualGalleryMetrics(width) {
    const isMobile = width <= 720;
    const gap = width <= 430 ? 8 : width <= 720 ? 9 : 14;
    let columns;

    if (isMobile) {
      columns = 2;
    } else {
      const minimumColumnWidth = width <= 900 ? 210 : 238;
      columns = Math.max(1, Math.floor((width + gap) / (minimumColumnWidth + gap)));
    }

    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = Math.round(cardWidth * (isMobile ? 1 : 0.75)) + 2;

    return {
      columns,
      gap,
      cardWidth,
      cardHeight,
      rowStride: cardHeight + gap
    };
  }

  function renderVirtualGallery(force = false) {
    if (dom.gallerySection.hidden) return;

    const width = dom.gallery.clientWidth;
    if (!width) return;

    const count = state.images.length;
    dom.gallery.classList.add('is-virtualized');
    galleryWidth = width;

    if (!count) {
      clearRenderedCards();
      dom.gallery.style.height = '0px';
      galleryLayout = null;
      return;
    }

    const metrics = getVirtualGalleryMetrics(width);
    const { columns, gap, cardWidth, cardHeight, rowStride } = metrics;
    const rows = Math.ceil(count / columns);
    const totalHeight = rows * cardHeight + (rows - 1) * gap;
    const heightValue = `${totalHeight}px`;

    if (dom.gallery.style.height !== heightValue) {
      dom.gallery.style.height = heightValue;
    }

    const previousLayout = galleryLayout;
    const layoutChanged =
      force ||
      !previousLayout ||
      Math.abs(previousLayout.width - width) > 0.5 ||
      previousLayout.columns !== columns ||
      Math.abs(previousLayout.cardWidth - cardWidth) > 0.1 ||
      previousLayout.cardHeight !== cardHeight;

    const galleryRect = dom.gallery.getBoundingClientRect();
    const visibleTop = Math.max(0, -galleryRect.top - GALLERY_OVERSCAN);
    const visibleBottom = -galleryRect.top + window.innerHeight + GALLERY_OVERSCAN;
    const firstRow = Math.max(0, Math.floor(visibleTop / rowStride));
    const lastRow = Math.min(
      rows - 1,
      Math.max(firstRow, Math.floor(visibleBottom / rowStride))
    );
    const startIndex = firstRow * columns;
    const endIndex = Math.min(count, (lastRow + 1) * columns);

    galleryLayout = {
      width,
      columns,
      cardWidth,
      cardHeight,
      startIndex,
      endIndex,
      count
    };

    const desiredIds = new Set();
    for (let index = startIndex; index < endIndex; index += 1) {
      const image = state.images[index];
      if (image) desiredIds.add(image.id);
    }

    const focusedCard =
      document.activeElement instanceof Element
        ? document.activeElement.closest('.card')
        : null;
    if (focusedCard && dom.gallery.contains(focusedCard)) {
      desiredIds.add(Number(focusedCard.dataset.imageId));
    }

    for (const [imageId, card] of renderedCards) {
      if (desiredIds.has(imageId)) continue;
      card.remove();
      renderedCards.delete(imageId);
    }

    for (let index = startIndex; index < endIndex; index += 1) {
      const image = state.images[index];
      if (!image) continue;

      let card = renderedCards.get(image.id);
      const isNewCard = !card;

      if (!card) {
        card = createCard(image);
        renderedCards.set(image.id, card);
        dom.gallery.appendChild(card);
      }

      // Beim reinen Anhängen neuer Bilder bleiben bestehende Karten an
      // ihrem Platz. Nur neue Karten oder echte Layoutänderungen werden
      // positioniert – das hält Massenimporte flüssig.
      if (!isNewCard && !layoutChanged) continue;

      const column = index % columns;
      const row = Math.floor(index / columns);
      card.style.left = `${column * (cardWidth + gap)}px`;
      card.style.top = `${row * rowStride}px`;
      card.style.width = `${cardWidth}px`;
      card.style.height = `${cardHeight}px`;
      card.setAttribute('aria-posinset', String(index + 1));
      card.setAttribute('aria-setsize', String(count));
    }
  }

  function clearRenderedCards() {
    for (const card of renderedCards.values()) {
      card.remove();
    }
    renderedCards.clear();
  }

  function removeImage(imageId) {
    const index = state.images.findIndex((image) => image.id === imageId);
    if (index < 0) return;

    const [image] = state.images.splice(index, 1);
    state.totalBytes = Math.max(0, state.totalBytes - image.bytes);
    if (image.converted) {
      state.optimizedCount = Math.max(0, state.optimizedCount - 1);
    }

    const card = renderedCards.get(image.id);
    const hadFocus = Boolean(card && card.contains(document.activeElement));
    if (card) {
      card.remove();
      renderedCards.delete(image.id);
    }
    URL.revokeObjectURL(image.url);

    updateGalleryMeta();

    if (!state.images.length) {
      showHero();
      if (hadFocus) {
        const picker = document.querySelector('.hero .js-pick-files');
        if (picker) picker.focus({ preventScroll: true });
      }
      return;
    }

    scheduleGalleryRender(true);

    if (hadFocus) {
      window.requestAnimationFrame(() => {
        const nextPosition = Math.min(index + 1, state.images.length);
        const nextCard =
          dom.gallery.querySelector(`.card[aria-posinset="${nextPosition}"]`) ||
          dom.gallery.querySelector('.card');
        const addButton = document.querySelector('.gallery-actions .js-pick-files');

        if (nextCard) nextCard.focus({ preventScroll: true });
        else if (addButton) addButton.focus({ preventScroll: true });
      });
    }
  }

  function updateGalleryMeta() {
    const count = state.images.length;

    dom.countBadge.textContent = String(count);

    if (count === 0) {
      dom.galleryMeta.textContent = 'Noch keine Bilder';
      return;
    }

    let meta =
      `${count} ${count === 1 ? 'Bild' : 'Bilder'} · ` +
      `${formatBytes(state.totalBytes)} im Speicher`;
    if (state.optimizedCount > 0) {
      meta += ` · ${state.optimizedCount} WebP-optimiert`;
    }
    dom.galleryMeta.textContent = meta;
  }

  function showHero() {
    if (state.images.length > 0) return;

    cancelGalleryRender();
    clearRenderedCards();
    galleryLayout = null;
    dom.gallery.replaceChildren();
    dom.gallery.style.height = '';
    dom.gallerySection.hidden = true;
    dom.hero.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* -------------------------------------------------------
     Leeren
     ------------------------------------------------------- */

  function bindClearDialog() {
    if (!dom.clearDialog) return;

    dom.clearDialog.addEventListener('close', () => {
      if (dom.clearDialog.returnValue === 'confirm') {
        clearGallery();
      }
    });
  }

  function openClearDialog() {
    if (!state.images.length) return;

    const count = state.images.length;
    dom.clearDialogText.textContent =
      `${count} ${count === 1 ? 'Bild wird' : 'Bilder werden'} aus dem Arbeitsspeicher entfernt. ` +
      'Das lässt sich nicht rückgängig machen.';

    if (typeof dom.clearDialog.showModal === 'function') {
      dom.clearDialog.showModal();
    } else if (window.confirm('Alle Bilder aus der Galerie entfernen?')) {
      clearGallery();
    }
  }

  function clearGallery() {
    if (state.slideshow.active) closeSlideshow();

    for (const image of state.images) {
      URL.revokeObjectURL(image.url);
    }

    state.images = [];
    state.totalBytes = 0;
    state.optimizedCount = 0;

    cancelGalleryRender();
    clearRenderedCards();
    galleryLayout = null;
    dom.gallery.replaceChildren();
    dom.gallery.style.height = '';
    updateGalleryMeta();

    if (!dom.lightbox.hidden) closeLightbox();
    showHero();
  }

  /* -------------------------------------------------------
     Lightbox
     ------------------------------------------------------- */

  function bindLightbox() {
    dom.lightboxClose.addEventListener('click', closeLightbox);
    dom.lightboxPrev.addEventListener('click', () => stepLightbox(-1));
    dom.lightboxNext.addEventListener('click', () => stepLightbox(1));
    dom.lightboxSlideshow.addEventListener('click', () => {
      const image = state.images[state.lightboxIndex];
      if (image) startSlideshow(image.id);
    });

    dom.lightbox.querySelectorAll('[data-lightbox-close]').forEach((element) => {
      element.addEventListener('click', closeLightbox);
    });

    document.addEventListener('keydown', (event) => {
      if (dom.lightbox.hidden) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepLightbox(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepLightbox(1);
        return;
      }

      if (event.key === 'Tab') {
        trapLightboxFocus(event);
      }
    });
  }

  function openLightbox(imageId) {
    const index = state.images.findIndex((image) => image.id === imageId);
    if (index < 0) return;

    state.lightboxIndex = index;
    state.lightboxReturnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    updateLightbox();
    dom.lightbox.hidden = false;
    document.body.classList.add('is-locked');
    dom.lightboxClose.focus({ preventScroll: true });
  }

  function updateLightbox() {
    const image = state.images[state.lightboxIndex];
    if (!image) {
      closeLightbox();
      return;
    }

    dom.lightboxImage.src = image.url;
    dom.lightboxImage.alt = image.name;
    dom.lightboxName.textContent = image.name;
    dom.lightboxName.title = image.path;

    const formatInfo = image.converted
      ? `WebP${image.resized ? ` · ${TARGET_WIDTH} px Breite` : ' · optimiert'}`
      : `${image.originalFormat.toUpperCase()} · Original`;

    dom.lightboxMeta.textContent =
      `${image.width} × ${image.height} · ${formatBytes(image.bytes)} · ${formatInfo}`;
    dom.lightboxCounter.textContent = `${state.lightboxIndex + 1} / ${state.images.length}`;
    dom.lightboxPrev.disabled = state.images.length < 2;
    dom.lightboxNext.disabled = state.images.length < 2;
  }

  function stepLightbox(direction) {
    if (dom.lightbox.hidden || state.images.length < 2) return;

    const count = state.images.length;
    state.lightboxIndex = (state.lightboxIndex + direction + count) % count;
    updateLightbox();
  }

  function closeLightbox() {
    if (dom.lightbox.hidden) return;

    dom.lightbox.hidden = true;
    document.body.classList.remove('is-locked');

    const returnFocus = state.lightboxReturnFocus;
    state.lightboxReturnFocus = null;
    state.lightboxIndex = -1;

    if (returnFocus && returnFocus.isConnected) {
      returnFocus.focus({ preventScroll: true });
    } else {
      const addButton = document.querySelector('.gallery-actions .js-pick-files');
      if (addButton) addButton.focus({ preventScroll: true });
    }
  }

  function trapLightboxFocus(event) {
    const focusable = [
      dom.lightboxClose,
      dom.lightboxSlideshow,
      dom.lightboxPrev,
      dom.lightboxNext
    ].filter((element) => !element.disabled && !element.hidden);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!dom.lightbox.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  /* -------------------------------------------------------
     Slideshow
     ------------------------------------------------------- */

  function bindSlideshow() {
    if (!dom.slideshowLaunch) return;

    dom.slideshowLaunch.addEventListener('click', () => startSlideshow());
    dom.slideshowSettings.addEventListener('click', toggleSlideshowSettings);
    dom.slideshowSettingsClose.addEventListener('click', () => {
      closeSlideshowSettings({ restoreFocus: true });
    });

    dom.slideshowConfigTransition.addEventListener('change', handleSlideshowConfigChange);
    dom.slideshowConfigZoom.addEventListener('change', handleSlideshowConfigChange);
    dom.slideshowConfigMove.addEventListener('change', handleSlideshowConfigChange);
    dom.slideshowConfigImages.addEventListener('change', handleSlideshowConfigChange);
    dom.slideshowConfigInterval.addEventListener('change', handleSlideshowConfigChange);
    dom.slideshowConfigLayout.addEventListener('change', handleSlideshowConfigChange);

    dom.slideshowPause.addEventListener('click', () => {
      setSlideshowPaused(!state.slideshow.paused);
    });
    dom.slideshowShuffle.addEventListener('click', toggleSlideshowShuffle);
    dom.slideshowFit.addEventListener('click', toggleSlideshowFit);
    dom.slideshowClose.addEventListener('click', closeSlideshow);
    dom.slideshowPrev.addEventListener('click', () => stepSlideshow(-1));
    dom.slideshowNext.addEventListener('click', () => stepSlideshow(1));

    for (const eventName of ['pointermove', 'pointerdown', 'wheel', 'touchstart']) {
      dom.slideshow.addEventListener(eventName, handleSlideshowActivity, { passive: true });
    }

    document.addEventListener('keydown', handleSlideshowKeydown);
  }

  function syncSlideshowConfigInputs() {
    const config = state.slideshow.config;
    dom.slideshowConfigTransition.value = config.transition;
    dom.slideshowConfigZoom.value = config.zoom;
    dom.slideshowConfigMove.value = config.move;
    dom.slideshowConfigImages.value = config.images;
    dom.slideshowConfigInterval.value = config.interval;
    dom.slideshowConfigLayout.value = config.layout;
  }

  function updateSlideshowConfigFromInputs() {
    const config = state.slideshow.config;
    config.transition = dom.slideshowConfigTransition.value;
    config.zoom = dom.slideshowConfigZoom.value;
    config.move = dom.slideshowConfigMove.value;
    config.images = dom.slideshowConfigImages.value;
    config.interval = dom.slideshowConfigInterval.value;
    config.layout = dom.slideshowConfigLayout.value;
    saveSlideshowConfig();
  }

  function loadSlideshowConfig() {
    let stored;
    try {
      stored = JSON.parse(window.localStorage.getItem(SLIDESHOW_STORAGE_KEY) || 'null');
    } catch {
      return;
    }

    if (!stored || typeof stored !== 'object') return;

    const config = state.slideshow.config;
    for (const [key, allowedValues] of Object.entries(SLIDESHOW_ALLOWED_CONFIG)) {
      if (allowedValues.has(stored[key])) {
        config[key] = stored[key];
      }
    }
  }

  function saveSlideshowConfig() {
    try {
      window.localStorage.setItem(
        SLIDESHOW_STORAGE_KEY,
        JSON.stringify(state.slideshow.config)
      );
    } catch {
      /* Storage kann z. B. im privaten Modus blockiert sein. */
    }
  }

  function getSlideshowIntervalMs() {
    const seconds = Number.parseFloat(state.slideshow.config.interval);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 6000;
  }

  function handleSlideshowConfigChange(event) {
    updateSlideshowConfigFromInputs();
    if (!state.slideshow.active) return;

    showSlideshowUi();

    if (event.target === dom.slideshowConfigInterval) {
      resetSlideshowTimer(getSlideshowIntervalMs());
      return;
    }

    // Alle anderen Einstellungen werden sofort auf die aktuelle Szene
    // angewendet, damit die Auswahl direkt sichtbar wird.
    renderSlideshowScene();
  }

  function openSlideshowSettings() {
    if (!state.slideshow.active) return;

    syncSlideshowConfigInputs();
    dom.slideshowSettingsPanel.hidden = false;
    dom.slideshowSettings.classList.add('is-active');
    dom.slideshowSettings.setAttribute('aria-expanded', 'true');
    dom.slideshowSettings.setAttribute('aria-label', 'Diashow-Setup schließen');
    showSlideshowUi();

    window.requestAnimationFrame(() => {
      if (dom.slideshowSettingsPanel.hidden) return;
      dom.slideshowConfigTransition.focus({ preventScroll: true });
    });
  }

  function closeSlideshowSettings({ restoreFocus = false } = {}) {
    if (dom.slideshowSettingsPanel.hidden) return;

    dom.slideshowSettingsPanel.hidden = true;
    dom.slideshowSettings.classList.remove('is-active');
    dom.slideshowSettings.setAttribute('aria-expanded', 'false');
    dom.slideshowSettings.setAttribute('aria-label', 'Diashow-Setup öffnen');

    if (restoreFocus) {
      dom.slideshowSettings.focus({ preventScroll: true });
    }
  }

  function toggleSlideshowSettings() {
    if (dom.slideshowSettingsPanel.hidden) {
      openSlideshowSettings();
    } else {
      closeSlideshowSettings({ restoreFocus: true });
    }
  }

  function showSlideshowUi() {
    if (!state.slideshow.active) return;

    dom.slideshow.classList.remove('is-ui-hidden');
    dom.slideshowUi.inert = false;
    dom.slideshowUi.setAttribute('aria-hidden', 'false');
    resetSlideshowUiTimer();
  }

  function hideSlideshowUi() {
    if (!state.slideshow.active) return;

    closeSlideshowSettings();
    dom.slideshow.classList.add('is-ui-hidden');
    dom.slideshowUi.inert = true;
    dom.slideshowUi.setAttribute('aria-hidden', 'true');
    clearSlideshowUiTimer();
  }

  function resetSlideshowUiTimer() {
    clearSlideshowUiTimer();
    slideshowUiTimer = window.setTimeout(hideSlideshowUi, SLIDESHOW_UI_IDLE_MS);
  }

  function clearSlideshowUiTimer() {
    if (!slideshowUiTimer) return;
    window.clearTimeout(slideshowUiTimer);
    slideshowUiTimer = 0;
  }

  function handleSlideshowActivity() {
    if (!state.slideshow.active) return;

    if (dom.slideshow.classList.contains('is-ui-hidden')) {
      showSlideshowUi();
    } else {
      resetSlideshowUiTimer();
    }
  }

  function shuffleArray(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  }

  function buildSlideshowOrder({ shuffle = false, startWith = null } = {}) {
    const allImages = state.images.slice();
    if (!allImages.length) return [];

    if (!startWith) {
      return shuffle ? shuffleArray(allImages) : allImages;
    }

    const remaining = allImages.filter((image) => image.id !== startWith.id);
    if (shuffle) shuffleArray(remaining);
    return [startWith, ...remaining];
  }

  function toggleSlideshowShuffle() {
    const slideshow = state.slideshow;
    if (!slideshow.active || !slideshow.order.length) return;

    const currentImage = slideshow.order[slideshow.index] || state.images[0];
    slideshow.shuffle = !slideshow.shuffle;
    slideshow.order = buildSlideshowOrder({
      shuffle: slideshow.shuffle,
      startWith: currentImage
    });
    slideshow.index = 0;

    updateSlideshowToggleStates();
    renderSlideshowScene();
  }

  function toggleSlideshowFit() {
    if (!state.slideshow.active) return;

    state.slideshow.fit = !state.slideshow.fit;
    updateSlideshowToggleStates();
  }

  function updateSlideshowToggleStates() {
    const slideshow = state.slideshow;

    dom.slideshowShuffle.classList.toggle('is-active', slideshow.shuffle);
    dom.slideshowShuffle.setAttribute('aria-pressed', String(slideshow.shuffle));
    dom.slideshowShuffle.setAttribute(
      'aria-label',
      slideshow.shuffle ? 'Zufällige Reihenfolge deaktivieren' : 'Zufällige Reihenfolge aktivieren'
    );

    dom.slideshowFit.classList.toggle('is-active', slideshow.fit);
    dom.slideshowFit.setAttribute('aria-pressed', String(slideshow.fit));
    dom.slideshowFit.setAttribute(
      'aria-label',
      slideshow.fit ? 'Fit Size deaktivieren' : 'Fit Size aktivieren – ganzes Bild einpassen'
    );

    dom.slideshow.classList.toggle('is-fit', slideshow.fit);
  }

  function getTransitionLabel(value) {
    if (value === 'random') return 'Random';
    return SLIDESHOW_TRANSITION_LABELS[value] || 'Diashow';
  }

  function resolveSlideshowTransition() {
    const configured = state.slideshow.config.transition;
    if (configured !== 'random') return configured;
    return SLIDESHOW_RANDOM_TRANSITIONS[
      Math.floor(Math.random() * SLIDESHOW_RANDOM_TRANSITIONS.length)
    ];
  }

  function resolveSlideshowImageCount(count) {
    const slideshow = state.slideshow;
    const maximum = Math.min(MAX_SLIDESHOW_IMAGES, count);
    const configured = slideshow.config.images;

    if (configured === 'random') {
      let value = 1 + Math.floor(Math.random() * maximum);
      if (maximum > 1 && slideshow.panelCount > 0 && value === slideshow.panelCount) {
        value = (value % maximum) + 1;
      }
      return value;
    }

    const numeric = Number.parseInt(configured, 10);
    return Math.min(maximum, Math.max(1, Number.isFinite(numeric) ? numeric : 1));
  }

  function resolveZoomSequence(setting, count) {
    if (setting !== 'random') return Array(count).fill(setting);

    const sequence = [];
    let zoom = Math.random() < 0.5 ? 'in' : 'out';
    for (let index = 0; index < count; index += 1) {
      sequence.push(zoom);
      zoom = zoom === 'in' ? 'out' : 'in';
    }
    return sequence;
  }

  function resolveMoveSequence(setting, count) {
    if (setting !== 'random') return Array(count).fill(setting);

    const pool = shuffleArray([...SLIDESHOW_RANDOM_MOVES]);
    return Array.from({ length: count }, (_, index) => pool[index % pool.length]);
  }

  function applySlideshowImageMotion(img, zoom, move, transitionDuration) {
    let fromScale = 1;
    let toScale = 1;

    if (zoom === 'in') {
      fromScale = 1.05;
      toScale = 1.16;
    } else if (zoom === 'out') {
      fromScale = 1.16;
      toScale = 1.05;
    } else if (move !== 'off') {
      fromScale = 1.05;
      toScale = 1.05;
    }

    const movements = {
      off: { fromX: '0%', fromY: '0%', toX: '0%', toY: '0%' },
      left: { fromX: '1.35%', fromY: '0%', toX: '-1.35%', toY: '0%' },
      right: { fromX: '-1.35%', fromY: '0%', toX: '1.35%', toY: '0%' },
      up: { fromX: '0%', fromY: '1.35%', toX: '0%', toY: '-1.35%' },
      down: { fromX: '0%', fromY: '-1.35%', toX: '0%', toY: '1.35%' },
      pan: { fromX: '-1.35%', fromY: '-0.75%', toX: '1.35%', toY: '0.75%' }
    };
    const movement = movements[move] || movements.off;

    img.style.setProperty('--from-scale', String(fromScale));
    img.style.setProperty('--to-scale', String(toScale));
    img.style.setProperty('--from-x', movement.fromX);
    img.style.setProperty('--from-y', movement.fromY);
    img.style.setProperty('--to-x', movement.toX);
    img.style.setProperty('--to-y', movement.toY);
    img.style.animationDuration =
      `${getSlideshowIntervalMs() + transitionDuration + 500}ms`;
  }

  function startSlideshow(startImageId = null) {
    if (!state.images.length) return;

    closeSlideshowSettings();
    if (!dom.lightbox.hidden) closeLightbox();

    const slideshow = state.slideshow;
    clearSlideshowTimer();
    clearSlideshowPreloads();
    clearSlideshowUiTimer();

    slideshow.active = true;
    slideshow.order = buildSlideshowOrder({ shuffle: slideshow.shuffle });
    slideshow.index = 0;

    if (startImageId != null) {
      const startIndex = slideshow.order.findIndex((image) => image.id === startImageId);
      if (startIndex >= 0) slideshow.index = startIndex;
    }

    slideshow.panelCount = 0;
    slideshow.transitionDuration = 0;
    slideshow.paused = false;
    slideshow.remaining = getSlideshowIntervalMs();
    slideshow.startedAt = performance.now();
    slideshow.layerZ = 0;
    slideshow.transitionToken += 1;

    syncSlideshowConfigInputs();
    dom.slideshow.hidden = false;
    dom.slideshow.classList.remove('is-paused', 'is-ui-hidden');
    dom.slideshowUi.inert = false;
    dom.slideshowUi.setAttribute('aria-hidden', 'false');
    dom.slideshow.setAttribute(
      'aria-label',
      `Diashow – ${getTransitionLabel(slideshow.config.transition)}`
    );
    dom.slideshowStage.replaceChildren();
    dom.slideshowProgressBar.style.animation = 'none';

    document.body.classList.add('is-locked');
    updateSlideshowPauseButton();
    updateSlideshowToggleStates();
    renderSlideshowScene(true);
    resetSlideshowUiTimer();
    dom.slideshow.focus({ preventScroll: true });
  }

  function closeSlideshow() {
    const slideshow = state.slideshow;
    if (!slideshow.active) return;

    clearSlideshowTimer();
    clearSlideshowPreloads();
    clearSlideshowUiTimer();
    closeSlideshowSettings();

    slideshow.active = false;
    slideshow.paused = false;
    slideshow.index = 0;
    slideshow.layerZ = 0;
    slideshow.panelCount = 0;
    slideshow.transitionDuration = 0;
    slideshow.transitionToken += 1;
    slideshow.order = [];

    dom.slideshow.hidden = true;
    dom.slideshow.classList.remove('is-paused', 'is-fit', 'is-ui-hidden');
    dom.slideshowUi.inert = false;
    dom.slideshowUi.setAttribute('aria-hidden', 'false');
    dom.slideshowStage.replaceChildren();
    dom.slideshowProgressBar.style.animation = 'none';
    dom.slideshowProgressBar.style.animationPlayState = '';
    dom.slideshowCaption.textContent = '';
    dom.slideshowSub.textContent = '';
    dom.slideshowPosition.textContent = '';
    document.body.classList.remove('is-locked');

    const launchVisible = dom.slideshowLaunch && dom.slideshowLaunch.offsetParent !== null;
    const focusTarget = launchVisible
      ? dom.slideshowLaunch
      : document.querySelector('.hero .js-pick-files');

    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function resolveSlideshowLayout(panelCount) {
    if (panelCount < 2) return 'grid';

    const configured = state.slideshow.config.layout;
    if (configured !== 'random') return configured;

    const layouts = ['grid', 'masonry', 'carousel', 'stack'];
    return layouts[Math.floor(Math.random() * layouts.length)];
  }

  function getSlideshowLayoutLabel(layout) {
    return {
      grid: 'Grid',
      masonry: 'Masonry',
      carousel: 'Carousel',
      stack: 'Stack'
    }[layout] || 'Grid';
  }

  function createSlideshowPanel(image, panelIndex, transitionDuration, zoomSequence, moveSequence) {
    const panel = document.createElement('div');
    panel.className = 'slideshow-panel';

    const img = document.createElement('img');
    img.src = image.url;
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';

    if (state.slideshow.config.zoom !== 'off' || state.slideshow.config.move !== 'off') {
      applySlideshowImageMotion(
        img,
        zoomSequence[panelIndex],
        moveSequence[panelIndex],
        transitionDuration
      );
      img.classList.add('image-motion');
    }

    panel.appendChild(img);
    return { panel, image };
  }

  function appendSlideshowLayout(scene, entries, layout) {
    if (layout === 'masonry') {
      appendMasonryLayout(scene, entries);
      return;
    }

    if (layout === 'carousel') {
      const track = document.createElement('div');
      track.className = 'slideshow-carousel-track';
      for (const entry of entries) track.appendChild(entry.panel);
      scene.appendChild(track);
      return;
    }

    if (layout === 'stack') {
      appendStackLayout(scene, entries);
      return;
    }

    appendGridLayout(scene, entries);
  }

  function appendGridLayout(scene, entries) {
    const count = entries.length;
    const viewportRatio = window.innerHeight / Math.max(1, window.innerWidth);
    const rowCount = count <= 1
      ? 1
      : Math.max(1, Math.min(count, Math.round(Math.sqrt(count * viewportRatio))));
    const base = Math.floor(count / rowCount);
    const extra = count % rowCount;

    let cursor = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'slideshow-row';
      const rowCountItems = base + (rowIndex < extra ? 1 : 0);

      for (let itemIndex = 0; itemIndex < rowCountItems; itemIndex += 1) {
        row.appendChild(entries[cursor].panel);
        cursor += 1;
      }
      scene.appendChild(row);
    }
  }

  function appendMasonryLayout(scene, entries) {
    const count = entries.length;
    const viewportRatio = window.innerWidth / Math.max(1, window.innerHeight);
    const columnCount = Math.max(
      2,
      Math.min(4, count, Math.round(Math.sqrt(count * viewportRatio)))
    );

    const columns = [];
    for (let index = 0; index < columnCount; index += 1) {
      const column = document.createElement('div');
      column.className = 'slideshow-masonry-column';
      columns.push(column);
    }

    const weightPattern = [1.2, 0.78, 1.35, 0.9, 1.1, 0.72];
    entries.forEach((entry, index) => {
      const aspect = entry.image.height / Math.max(1, entry.image.width);
      const weight = Math.max(
        0.55,
        Math.min(1.9, aspect * weightPattern[index % weightPattern.length])
      );
      entry.panel.style.flex = `${weight.toFixed(3)} 1 0px`;
      columns[index % columnCount].appendChild(entry.panel);
    });

    for (const column of columns) scene.appendChild(column);
  }

  function appendStackLayout(scene, entries) {
    const count = entries.length;
    entries.forEach((entry, index) => {
      const progress = count <= 1 ? 0 : index / (count - 1);
      const scale = 1 - progress * 0.3;
      const wobble = Math.sin(index * 1.7);

      entry.panel.style.zIndex = String(index + 1);
      entry.panel.style.setProperty('--stack-x', `${(wobble * 0.8).toFixed(2)}%`);
      entry.panel.style.setProperty('--stack-y', `${(Math.cos(index * 1.3) * 0.8).toFixed(2)}%`);
      entry.panel.style.setProperty('--stack-rotate', `${(wobble * 0.5).toFixed(2)}deg`);
      entry.panel.style.setProperty('--stack-scale', scale.toFixed(3));
      scene.appendChild(entry.panel);
    });
  }

  function configureCarouselScene(scene) {
    const track = scene.querySelector('.slideshow-carousel-track');
    if (!track) return;

    const distance = track.scrollWidth - scene.clientWidth;
    if (distance <= 8) return;

    scene.classList.add('is-carousel-wide');
    // Konstante Pixelgeschwindigkeit: mehr Bilder verlängern die Strecke,
    // nicht die Geschwindigkeit.
    track.style.animationDuration = `${(distance / SLIDESHOW_CAROUSEL_SPEED) * 1000}ms`;
    track.classList.add('is-scrolling');
  }

  function clearSceneTransitionClasses(scene) {
    for (const className of Array.from(scene.classList)) {
      if (className.startsWith('scene-in-') || className.startsWith('scene-out-')) {
        scene.classList.remove(className);
      }
    }
  }

  function renderSlideshowScene(isInitial = false) {
    const slideshow = state.slideshow;
    if (!slideshow.active) return;

    const count = slideshow.order.length;
    if (!count) {
      closeSlideshow();
      return;
    }

    slideshow.index = ((slideshow.index % count) + count) % count;

    const panelCount = resolveSlideshowImageCount(count);
    const layout = resolveSlideshowLayout(panelCount);
    const transition = isInitial ? 'off' : resolveSlideshowTransition();
    const transitionDuration = isInitial
      ? 0
      : SLIDESHOW_TRANSITION_DURATIONS[transition] || 0;

    slideshow.transitionToken += 1;
    const transitionToken = slideshow.transitionToken;
    slideshow.panelCount = panelCount;
    slideshow.transitionDuration = transitionDuration;

    const images = [];
    for (let offset = 0; offset < panelCount; offset += 1) {
      images.push(slideshow.order[(slideshow.index + offset) % count]);
    }

    const scene = document.createElement('div');
    scene.className = `slideshow-scene layout-${layout}`;
    scene.dataset.count = String(panelCount);
    scene.dataset.layout = layout;
    scene.style.zIndex = String(++slideshow.layerZ);

    const zoomSequence = resolveZoomSequence(slideshow.config.zoom, panelCount);
    const moveSequence = resolveMoveSequence(slideshow.config.move, panelCount);
    const entries = images.map((image, panelIndex) =>
      createSlideshowPanel(image, panelIndex, transitionDuration, zoomSequence, moveSequence)
    );

    appendSlideshowLayout(scene, entries, layout);

    const currentScene = dom.slideshowStage.querySelector('.slideshow-scene.is-current');
    for (const child of Array.from(dom.slideshowStage.children)) {
      if (child !== currentScene) child.remove();
    }

    dom.slideshowStage.appendChild(scene);
    scene.classList.add('is-current');
    if (layout === 'carousel') configureCarouselScene(scene);

    if (currentScene) {
      // Alte In-Animationen entfernen, Layout-Klassen aber behalten, damit
      // die ausgehende Szene während des Übergangs korrekt zusammengesetzt bleibt.
      clearSceneTransitionClasses(currentScene);
      currentScene.classList.remove('is-current');
      currentScene.classList.add('is-outgoing');

      if (transition === 'off' || transitionDuration === 0) {
        currentScene.remove();
      } else {
        currentScene.classList.add(`scene-out-${transition}`);
        scene.classList.add(`scene-in-${transition}`);
        currentScene.style.animationDuration = `${transitionDuration}ms`;
        scene.style.animationDuration = `${transitionDuration}ms`;

        window.setTimeout(() => {
          if (!slideshow.active || slideshow.transitionToken !== transitionToken) return;
          for (const child of Array.from(dom.slideshowStage.children)) {
            if (child !== scene) child.remove();
          }
        }, transitionDuration + 100);
      }
    }

    if (panelCount === 1) {
      const image = images[0];
      const format = image.converted ? 'WebP' : image.originalFormat.toUpperCase();
      dom.slideshowCaption.textContent = image.name;
      dom.slideshowSub.textContent =
        `${image.width} × ${image.height} · ${formatBytes(image.bytes)} · ${format}`;
      dom.slideshowPosition.textContent = `${slideshow.index + 1} / ${count}`;
    } else {
      dom.slideshowCaption.textContent =
        `${panelCount} Bilder · ${getSlideshowLayoutLabel(layout)}`;
      dom.slideshowSub.textContent = images.map((image) => image.name).join(' · ');
      dom.slideshowPosition.textContent = `${panelCount} von ${count}`;
    }

    const canAdvance = count > 1;
    dom.slideshowPrev.disabled = !canAdvance;
    dom.slideshowNext.disabled = !canAdvance;

    preloadUpcomingSlideshowImages();
    resetSlideshowTimer(getSlideshowIntervalMs());
  }

  function stepSlideshow(direction) {
    const slideshow = state.slideshow;
    if (!slideshow.active || slideshow.order.length < 2) return;

    const count = slideshow.order.length;
    const step = Math.max(1, slideshow.panelCount);
    slideshow.index = ((slideshow.index + direction * step) % count + count) % count;
    renderSlideshowScene();
  }

  function resetSlideshowTimer(duration) {
    const slideshow = state.slideshow;
    clearSlideshowTimer();

    slideshow.remaining = duration;
    slideshow.startedAt = performance.now();
    dom.slideshowProgressBar.style.animation = 'none';
    void dom.slideshowProgressBar.offsetWidth;
    dom.slideshowProgressBar.style.animation = `slideshowProgress ${duration}ms linear forwards`;
    dom.slideshowProgressBar.style.animationPlayState = slideshow.paused ? 'paused' : 'running';

    if (!slideshow.paused && slideshow.order.length > 1) {
      scheduleSlideshowAdvance(duration);
    }
  }

  function scheduleSlideshowAdvance(delay) {
    const slideshow = state.slideshow;
    clearTimeout(slideshow.timer);
    slideshow.timer = window.setTimeout(() => {
      slideshow.timer = null;
      if (!slideshow.active || slideshow.paused) return;
      stepSlideshow(1);
    }, Math.max(100, delay));
  }

  function clearSlideshowTimer() {
    if (state.slideshow.timer) {
      window.clearTimeout(state.slideshow.timer);
      state.slideshow.timer = null;
    }
  }

  function setSlideshowPaused(paused) {
    const slideshow = state.slideshow;
    if (!slideshow.active || slideshow.paused === paused) return;

    if (paused) {
      slideshow.remaining = Math.max(
        100,
        slideshow.remaining - (performance.now() - slideshow.startedAt)
      );
      clearSlideshowTimer();
      slideshow.paused = true;
      dom.slideshowProgressBar.style.animationPlayState = 'paused';
    } else {
      slideshow.paused = false;
      slideshow.startedAt = performance.now();
      dom.slideshowProgressBar.style.animationPlayState = 'running';
      if (slideshow.order.length > 1) {
        scheduleSlideshowAdvance(slideshow.remaining);
      }
    }

    dom.slideshow.classList.toggle('is-paused', paused);
    updateSlideshowPauseButton();
  }

  function updateSlideshowPauseButton() {
    const paused = state.slideshow.paused;
    dom.slideshowPause.innerHTML = paused ? PLAY_ICON : PAUSE_ICON;
    dom.slideshowPause.setAttribute(
      'aria-label',
      paused ? 'Diashow fortsetzen' : 'Diashow pausieren'
    );
    dom.slideshowPause.title = paused ? 'Fortsetzen (Leertaste)' : 'Pausieren (Leertaste)';
  }

  function preloadUpcomingSlideshowImages() {
    clearSlideshowPreloads();

    const slideshow = state.slideshow;
    const count = slideshow.order.length;
    if (count < 2) return;

    const step = Math.max(1, slideshow.panelCount);
    const configured = slideshow.config.images;
    const loadCount = configured === 'random'
      ? Math.min(MAX_SLIDESHOW_IMAGES, count)
      : Math.min(count, Math.max(1, Number.parseInt(configured, 10) || 1));

    for (let offset = 0; offset < loadCount; offset += 1) {
      const image = slideshow.order[(slideshow.index + step + offset) % count];
      if (!image) continue;
      const preload = new Image();
      preload.decoding = 'async';
      preload.src = image.url;
      slideshow.preloads.push(preload);
    }
  }

  function clearSlideshowPreloads() {
    state.slideshow.preloads = [];
  }

  function handleSlideshowKeydown(event) {
    if (dom.slideshow.hidden) return;

    showSlideshowUi();

    if (!dom.slideshowSettingsPanel.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlideshowSettings({ restoreFocus: true });
        return;
      }

      if (dom.slideshowSettingsPanel.contains(event.target)) {
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeSlideshow();
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar') {
      // Leertaste steuert die Diashow – unabhängig davon, welcher
      // Bedienknopf zuletzt den Fokus hat (Buttons reagieren auf Enter).
      event.preventDefault();
      setSlideshowPaused(!state.slideshow.paused);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepSlideshow(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepSlideshow(1);
      return;
    }

    if (event.key === 'Tab') {
      trapSlideshowFocus(event);
    }
  }

  function trapSlideshowFocus(event) {
    const focusable = Array.from(dom.slideshow.querySelectorAll('button:not(:disabled)')).filter(
      (element) => element.getClientRects().length > 0
    );

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (document.activeElement === dom.slideshow) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!dom.slideshow.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  /* -------------------------------------------------------
     Toasts, Formatierung, Cleanup
     ------------------------------------------------------- */

  function showToast(message, type = 'info') {
    while (dom.toastRegion.children.length >= 3) {
      dom.toastRegion.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast${type === 'error' ? ' is-error' : ''}`;
    toast.textContent = message;
    dom.toastRegion.appendChild(toast);

    let removed = false;
    const dismiss = () => {
      if (removed) return;
      removed = true;
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 230);
    };

    const timer = window.setTimeout(dismiss, 4600);
    toast.addEventListener('click', () => {
      window.clearTimeout(timer);
      dismiss();
    });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';

    const kilobytes = bytes / 1024;
    if (kilobytes < 1000) {
      return `${numberFormat.format(kilobytes)} KB`;
    }

    const megabytes = kilobytes / 1024;
    if (megabytes < 1000) {
      return `${numberFormat.format(megabytes)} MB`;
    }

    return `${byteIntegerFormat.format(megabytes / 1024)} GB`;
  }

  function bindWindowCleanup() {
    window.addEventListener('pagehide', (event) => {
      // Bei einer Wiederherstellung aus dem Back/Forward-Cache bleiben die URLs gültig.
      if (event.persisted) return;

      for (const image of state.images) {
        URL.revokeObjectURL(image.url);
      }
    });
  }
})();
