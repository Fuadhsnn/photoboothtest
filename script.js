const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const frameImg = document.getElementById('frame');
const frameSelect = document.getElementById('frameSelect');
const filterSelect = document.getElementById('filterSelect');
const customText = document.getElementById('customText');
const captureBtn = document.getElementById('capture');
const downloadBtn = document.getElementById('download');
const retakeBtn = document.getElementById('retake');
const shareBtn = document.getElementById('share');
const previewResult = document.getElementById('previewResult');
const stripPhotoBtn = document.getElementById('stripPhoto');
const stripResult = document.getElementById('stripResult');
const countdown = document.getElementById('countdown');
const stickerBar = document.getElementById('stickerBar');
const stickerLayer = document.getElementById('stickerLayer');
let stickers = [];
let stickerHistory = [];
const welcomePage = document.getElementById('welcomePage');
const photoboothContainer = document.querySelector('.container');
const startPhotoboothBtn = document.getElementById('startPhotobooth');
const backToWelcomeBtn = document.getElementById('backToWelcome');

// Akses kamera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert('Tidak dapat mengakses kamera: ' + err);
  });

// Ganti bingkai
frameSelect.addEventListener('change', () => {
  if (frameSelect.value) {
    frameImg.src = frameSelect.value;
    frameImg.style.display = 'block';
  } else {
    frameImg.style.display = 'none';
  }
});

// Terapkan filter ke video preview
filterSelect.addEventListener('change', () => {
  video.style.filter = filterSelect.value;
});

function applyExtraFilters(ctx, filter, width, height) {
  if (filter === 'grainy') {
    // Tambahkan noise
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 60;
      imageData.data[i] += noise;     // R
      imageData.data[i+1] += noise;   // G
      imageData.data[i+2] += noise;   // B
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (filter === 'vintage') {
    // Efek vintage: warna kekuningan + kontras rendah
    const imageData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      let r = imageData.data[i];
      let g = imageData.data[i+1];
      let b = imageData.data[i+2];
      // Vintage: tambahkan kuning, kurangi biru
      imageData.data[i] = Math.min(255, r * 1.1 + 20);
      imageData.data[i+1] = Math.min(255, g * 1.05 + 15);
      imageData.data[i+2] = b * 0.9;
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

function drawFrame(ctx, frameValue, width, height) {
  if (frameValue && frameValue.startsWith('color:')) {
    // Frame warna solid
    const color = frameValue.split(':')[1];
    ctx.save();
    ctx.lineWidth = 24;
    ctx.strokeStyle = color;
    ctx.strokeRect(12, 12, width-24, height-24);
    ctx.restore();
  }
}

// Tambah stiker ke stickerLayer
stickerBar.addEventListener('click', e => {
  if (e.target.classList.contains('sticker-option')) {
    const emoji = e.target.dataset.sticker;
    const stickerDiv = document.createElement('div');
    stickerDiv.className = 'sticker-draggable';
    stickerDiv.textContent = emoji;
    stickerDiv.style.left = '120px';
    stickerDiv.style.top = '80px';
    stickerDiv.draggable = false;
    stickerLayer.appendChild(stickerDiv);
    stickers.push(stickerDiv);
    enableDrag(stickerDiv);
    stickerHistory = []; // reset redo history saat ada stiker baru
  }
});

// Undo/Redo/Hapus Semua
const undoStickerBtn = document.getElementById('undoSticker');
const redoStickerBtn = document.getElementById('redoSticker');
const clearStickerBtn = document.getElementById('clearSticker');

undoStickerBtn.addEventListener('click', () => {
  if (stickers.length > 0) {
    const last = stickers.pop();
    stickerHistory.push(last);
    last.remove();
  }
});

redoStickerBtn.addEventListener('click', () => {
  if (stickerHistory.length > 0) {
    const last = stickerHistory.pop();
    stickerLayer.appendChild(last);
    stickers.push(last);
    enableDrag(last);
  }
});

clearStickerBtn.addEventListener('click', () => {
  stickers.forEach(st => st.remove());
  stickers = [];
  stickerHistory = [];
});

function enableDrag(el) {
  let offsetX, offsetY, dragging = false;
  el.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.offsetX;
    offsetY = e.offsetY;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
  function moveHandler(e) {
    if (dragging) {
      const rect = stickerLayer.getBoundingClientRect();
      el.style.left = (e.clientX - rect.left - offsetX) + 'px';
      el.style.top = (e.clientY - rect.top - offsetY) + 'px';
    }
  }
  function upHandler() {
    dragging = false;
    document.body.style.userSelect = '';
  }
}

function renderStickersToCanvas(ctx, width, height) {
  const layerRect = stickerLayer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  // Hitung skala antara stickerLayer dan canvas
  const scaleX = width / layerRect.width;
  const scaleY = height / layerRect.height;
  stickers.forEach(stickerDiv => {
    const fontSize = parseFloat(window.getComputedStyle(stickerDiv).fontSize);
    // Ambil posisi relatif terhadap stickerLayer
    const left = parseFloat(stickerDiv.style.left);
    const top = parseFloat(stickerDiv.style.top);
    // Konversi ke posisi di canvas
    const x = (left + fontSize/2) * scaleX;
    const y = (top + fontSize) * scaleY;
    ctx.save();
    ctx.font = (fontSize * scaleX) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(stickerDiv.textContent, x, y);
    ctx.restore();
  });
}

function resetStickers() {
  stickers.forEach(st => st.remove());
  stickers = [];
}

// Ambil foto
captureBtn.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  let filterVal = filterSelect.value;
  if (filterVal !== 'grainy' && filterVal !== 'vintage') {
    ctx.filter = filterVal;
  } else {
    ctx.filter = 'none';
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  applyExtraFilters(ctx, filterVal, canvas.width, canvas.height);
  // Tambahkan bingkai jika ada
  if (frameSelect.value) {
    if (frameSelect.value.startsWith('color:')) {
      drawFrame(ctx, frameSelect.value, canvas.width, canvas.height);
      drawTextAndShow();
    } else {
      const img = new window.Image();
      img.src = frameSelect.value;
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawTextAndShow();
      };
    }
  } else {
    drawTextAndShow();
  }
  // Tambahkan stiker
  renderStickersToCanvas(ctx, canvas.width, canvas.height);
  resetStickers();
});

function drawTextAndShow() {
  const ctx = canvas.getContext('2d');
  // Tambahkan stiker ke canvas sebelum teks
  renderStickersToCanvas(ctx, canvas.width, canvas.height);
  const text = customText.value;
  if (text) {
    ctx.save();
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeText(text, canvas.width/2, canvas.height - 16);
    ctx.fillText(text, canvas.width/2, canvas.height - 16);
    ctx.restore();
  }
  showResult();
  resetStickers();
}

function showResult() {
  video.style.display = 'none';
  canvas.style.display = 'block';
  captureBtn.style.display = 'none';
  downloadBtn.style.display = 'inline-block';
  retakeBtn.style.display = 'inline-block';
  shareBtn.style.display = 'inline-block';
  // Tampilkan preview hasil
  const dataUrl = canvas.toDataURL('image/png');
  previewResult.innerHTML = `<img src="${dataUrl}" alt="Hasil Foto">`;
  previewResult.style.display = 'block';
  addSaveToGalleryButton(dataUrl, false);
}

// Unduh foto
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'photobooth.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Retake foto
retakeBtn.addEventListener('click', () => {
  video.style.display = 'block';
  canvas.style.display = 'none';
  captureBtn.style.display = 'inline-block';
  downloadBtn.style.display = 'none';
  retakeBtn.style.display = 'none';
  shareBtn.style.display = 'none';
  previewResult.style.display = 'none';
});

// Share ke media sosial
shareBtn.addEventListener('click', () => {
  const dataUrl = canvas.toDataURL('image/png');
  if (navigator.canShare && navigator.canShare({ files: [] })) {
    // Web Share API v2 (jika didukung)
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'photobooth.png', { type: 'image/png' });
        navigator.share({
          files: [file],
          title: 'Photobooth Online',
          text: 'Cek hasil fotoku dari photobooth online!'
        });
      });
  } else {
    // Fallback: WhatsApp
    const waUrl = `https://wa.me/?text=Hasil%20fotoku%20dari%20photobooth%20online!%20`;
    window.open(waUrl, '_blank');
    alert('Untuk share gambar, silakan unduh dulu lalu upload manual ke media sosial.');
  }
});

// Animasi flash
function flashEffect() {
  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.top = 0;
  flash.style.left = 0;
  flash.style.width = '100vw';
  flash.style.height = '100vh';
  flash.style.background = 'white';
  flash.style.opacity = '0.7';
  flash.style.zIndex = 9999;
  document.body.appendChild(flash);
  setTimeout(() => document.body.removeChild(flash), 200);
}

// Strip Photo (Life4Cuts)
stripPhotoBtn.addEventListener('click', async () => {
  stripResult.style.display = 'none';
  previewResult.style.display = 'none';
  let photos = [];
  // Simpan snapshot stiker yang ada saat tombol ditekan
  const stickerSnapshot = stickers.map(stickerDiv => {
    return {
      emoji: stickerDiv.textContent,
      left: stickerDiv.style.left,
      top: stickerDiv.style.top,
      fontSize: window.getComputedStyle(stickerDiv).fontSize
    };
  });
  for (let i = 1; i <= 4; i++) {
    await showCountdown(3);
    flashEffect();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    let filterVal = filterSelect.value;
    if (filterVal !== 'grainy' && filterVal !== 'vintage') {
      ctx.filter = filterVal;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    applyExtraFilters(ctx, filterVal, canvas.width, canvas.height);
    if (frameSelect.value) {
      if (frameSelect.value.startsWith('color:')) {
        drawFrame(ctx, frameSelect.value, canvas.width, canvas.height);
      } else {
        await new Promise(resolve => {
          const img = new window.Image();
          img.src = frameSelect.value;
          img.onload = function() {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve();
          };
        });
      }
    }
    // Render snapshot stiker ke canvas
    stickerSnapshot.forEach(sticker => {
      const fontSize = parseFloat(sticker.fontSize);
      const layerRect = stickerLayer.getBoundingClientRect();
      const scaleX = canvas.width / layerRect.width;
      const scaleY = canvas.height / layerRect.height;
      const left = parseFloat(sticker.left);
      const top = parseFloat(sticker.top);
      const x = (left + fontSize/2) * scaleX;
      const y = (top + fontSize) * scaleY;
      ctx.save();
      ctx.font = (fontSize * scaleX) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(sticker.emoji, x, y);
      ctx.restore();
    });
    const text = customText.value;
    if (text) {
      ctx.save();
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeText(text, canvas.width/2, canvas.height - 16);
      ctx.fillText(text, canvas.width/2, canvas.height - 16);
      ctx.restore();
    }
    photos.push(canvas.toDataURL('image/png'));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  // Gabungkan ke strip (vertikal)
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = canvas.width;
  stripCanvas.height = canvas.height * 4;
  const stripCtx = stripCanvas.getContext('2d');
  for (let i = 0; i < 4; i++) {
    const img = new window.Image();
    img.src = photos[i];
    await new Promise(resolve => {
      img.onload = function() {
        stripCtx.drawImage(img, 0, i * canvas.height, canvas.width, canvas.height);
        resolve();
      };
    });
  }
  const stripDataUrl = stripCanvas.toDataURL('image/png');
  stripResult.innerHTML = `<img src="${stripDataUrl}" alt="Strip Photo"><br>
    <a href="${stripDataUrl}" download="strip-photo.png" class="button">Unduh Strip Photo</a>
    <button id="shareStrip">Bagikan Strip Photo</button>`;
  stripResult.style.display = 'block';
  addSaveToGalleryButton(stripDataUrl, true);
  // Share strip photo
  setTimeout(() => {
    const shareStripBtn = document.getElementById('shareStrip');
    if (shareStripBtn) {
      shareStripBtn.onclick = () => {
        if (navigator.canShare && navigator.canShare({ files: [] })) {
          fetch(stripDataUrl)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], 'strip-photo.png', { type: 'image/png' });
              navigator.share({
                files: [file],
                title: 'Strip Photo',
                text: 'Cek strip photo-ku dari photobooth online!'
              });
            });
        } else {
          const waUrl = `https://wa.me/?text=Hasil%20strip%20photo%20dari%20photobooth%20online!`;
          window.open(waUrl, '_blank');
          alert('Untuk share gambar, silakan unduh dulu lalu upload manual ke media sosial.');
        }
      };
    }
  }, 100);
  resetStickers();
});

async function showCountdown(sec) {
  countdown.style.display = 'block';
  for (let i = sec; i > 0; i--) {
    countdown.textContent = i;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  countdown.textContent = '📸';
  await new Promise(resolve => setTimeout(resolve, 500));
  countdown.style.display = 'none';
}

function addSaveToGalleryButton(dataUrl, isStrip) {
  const target = isStrip ? stripResult : previewResult;
  const btnId = isStrip ? 'saveStripGallery' : 'savePhotoGallery';
  if (!document.getElementById(btnId)) {
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.textContent = 'Simpan ke Galeri';
    btn.onclick = () => {
      saveToGallery(dataUrl, isStrip);
      btn.disabled = true;
      btn.textContent = 'Tersimpan!';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Simpan ke Galeri'; }, 2000);
    };
    target.appendChild(btn);
  }
}

function saveToGallery(dataUrl, isStrip) {
  const key = isStrip ? 'stripGallery' : 'photoGallery';
  let arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.unshift(dataUrl);
  arr = arr.slice(0, 20); // max 20 item
  localStorage.setItem(key, JSON.stringify(arr));
  renderGallery();
}

function renderGallery() {
  const gallery = document.getElementById('gallery');
  let photoArr = JSON.parse(localStorage.getItem('photoGallery') || '[]');
  let stripArr = JSON.parse(localStorage.getItem('stripGallery') || '[]');
  let html = '<h2>Galeri Mini</h2>';
  if (photoArr.length === 0 && stripArr.length === 0) {
    html += '<div style="color:#888;">Belum ada foto tersimpan.</div>';
  }
  photoArr.forEach((url, i) => {
    html += `<div class="gallery-item"><img src="${url}" alt="Foto"><button onclick="downloadGalleryItem('${url}')">Unduh</button><button onclick="removeGalleryItem('photoGallery',${i})">Hapus</button></div>`;
  });
  stripArr.forEach((url, i) => {
    html += `<div class="gallery-item"><img src="${url}" alt="Strip"><button onclick="downloadGalleryItem('${url}')">Unduh</button><button onclick="removeGalleryItem('stripGallery',${i})">Hapus</button></div>`;
  });
  gallery.innerHTML = html;
}

window.downloadGalleryItem = function(url) {
  const link = document.createElement('a');
  link.href = url;
  link.download = 'galeri-photobooth.png';
  link.click();
};
window.removeGalleryItem = function(key, idx) {
  let arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.splice(idx, 1);
  localStorage.setItem(key, JSON.stringify(arr));
  renderGallery();
};

function showWelcomeIfNeeded() {
  const hash = window.location.hash;
  if (hash === '#/welcome' || hash === '') {
    welcomePage.style.display = 'block';
    photoboothContainer.style.display = 'none';
  } else {
    welcomePage.style.display = 'none';
    photoboothContainer.style.display = 'block';
  }
}

startPhotoboothBtn.addEventListener('click', () => {
  window.location.hash = '#/photobooth';
});
backToWelcomeBtn.addEventListener('click', () => {
  window.location.hash = '#/welcome';
});
window.addEventListener('hashchange', showWelcomeIfNeeded);

// Inisialisasi route saat load
showWelcomeIfNeeded();

// Render galeri saat load
renderGallery(); 