'use strict';

const $ = (id) => document.getElementById(id);
const els = {
  keywords: $('keywords'), maxResults: $('maxResults'), dateFilter: $('dateFilter'),
  minShares: $('minShares'), maxShares: $('maxShares'), minViews: $('minViews'),
  minLikes: $('minLikes'), minComments: $('minComments'), sortOrder: $('sortOrder'),
  excludeSlideshows: $('excludeSlideshows'), strictKeyword: $('strictKeyword'),
  searchBtn: $('searchBtn'), cancelBtn: $('cancelBtn'), statusPanel: $('statusPanel'),
  statusText: $('statusText'), statusPercent: $('statusPercent'), progressBar: $('progressBar'),
  logBox: $('logBox'), resultSection: $('resultSection'), resultsList: $('resultsList'),
  resultCount: $('resultCount'), minShareSummary: $('minShareSummary'),
  maxShareSummary: $('maxShareSummary'), totalViewsSummary: $('totalViewsSummary'),
  settingsBtn: $('settingsBtn'), settingsModal: $('settingsModal'), closeSettingsBtn: $('closeSettingsBtn'),
  apiToken: $('apiToken'), rememberToken: $('rememberToken'), actorId: $('actorId'),
  sourceSort: $('sourceSort'), proxyCountry: $('proxyCountry'), saveSettingsBtn: $('saveSettingsBtn'),
  toggleTokenBtn: $('toggleTokenBtn'), loadDemoBtn: $('loadDemoBtn'),
  moreActionsBtn: $('moreActionsBtn'), actionMenu: $('actionMenu'), exportXlsxBtn: $('exportXlsxBtn'),
  exportCsvBtn: $('exportCsvBtn'), copyAllBtn: $('copyAllBtn'), clearBtn: $('clearBtn'), toast: $('toast')
};

let results = [];
let controller = null;
let currentRunId = '';
let toastTimer = null;

const demoData = [
  { id:'demo1', text:'Tai nghe bluetooth pin lâu, âm thanh rõ #tainghebluetooth', webVideoUrl:'https://www.tiktok.com/', authorMeta:{name:'demo_shop_1', nickName:'Demo Shop 1'}, videoMeta:{coverUrl:'icons/icon-512.png'}, shareCount:12, playCount:3200, diggCount:156, commentCount:14, createTimeISO:'2026-06-20T08:00:00Z' },
  { id:'demo2', text:'Review điện thoại giá rẻ cho học sinh #dienthoai', webVideoUrl:'https://www.tiktok.com/', authorMeta:{name:'demo_shop_2', nickName:'Demo Shop 2'}, videoMeta:{coverUrl:'icons/icon-512.png'}, shareCount:3, playCount:950, diggCount:47, commentCount:5, createTimeISO:'2026-06-24T11:30:00Z' },
  { id:'demo3', text:'Mẹo chọn sạc nhanh an toàn #sacnhanh', webVideoUrl:'https://www.tiktok.com/', authorMeta:{name:'demo_shop_3', nickName:'Demo Shop 3'}, videoMeta:{coverUrl:'icons/icon-512.png'}, shareCount:86, playCount:21000, diggCount:988, commentCount:62, createTimeISO:'2026-06-18T13:15:00Z' }
];

function init() {
  loadSettings();
  bindEvents();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function bindEvents() {
  els.settingsBtn.addEventListener('click', () => els.settingsModal.classList.remove('hidden'));
  els.closeSettingsBtn.addEventListener('click', closeSettings);
  els.settingsModal.addEventListener('click', (e) => { if (e.target === els.settingsModal) closeSettings(); });
  els.saveSettingsBtn.addEventListener('click', saveSettings);
  els.toggleTokenBtn.addEventListener('click', toggleToken);
  els.searchBtn.addEventListener('click', runSearch);
  els.cancelBtn.addEventListener('click', cancelSearch);
  els.loadDemoBtn.addEventListener('click', loadDemo);
  els.moreActionsBtn.addEventListener('click', () => els.actionMenu.classList.toggle('hidden'));
  els.exportCsvBtn.addEventListener('click', exportCsv);
  els.exportXlsxBtn.addEventListener('click', exportXlsx);
  els.copyAllBtn.addEventListener('click', copyAllLinks);
  els.clearBtn.addEventListener('click', clearResults);
  els.sortOrder.addEventListener('change', () => { if (results.length) { results = sortResults(results); renderResults(); } });
}

function loadSettings() {
  const saved = safeJson(localStorage.getItem('tikshare_settings')) || {};
  els.actorId.value = saved.actorId || 'clockworks~tiktok-scraper';
  els.sourceSort.value = saved.sourceSort || 'MOST_RELEVANT';
  els.proxyCountry.value = saved.proxyCountry || 'None';
  els.rememberToken.checked = Boolean(saved.rememberToken);
  els.apiToken.value = saved.rememberToken ? (localStorage.getItem('tikshare_token') || '') : (sessionStorage.getItem('tikshare_token') || '');

  const filters = safeJson(localStorage.getItem('tikshare_filters')) || {};
  Object.entries(filters).forEach(([key, value]) => {
    if (els[key] && value !== undefined && value !== null) {
      if (els[key].type === 'checkbox') els[key].checked = Boolean(value);
      else els[key].value = value;
    }
  });
}

function saveSettings() {
  const settings = {
    actorId: els.actorId.value.trim() || 'clockworks~tiktok-scraper',
    sourceSort: els.sourceSort.value,
    proxyCountry: els.proxyCountry.value,
    rememberToken: els.rememberToken.checked
  };
  localStorage.setItem('tikshare_settings', JSON.stringify(settings));
  if (els.rememberToken.checked) {
    localStorage.setItem('tikshare_token', els.apiToken.value.trim());
    sessionStorage.removeItem('tikshare_token');
  } else {
    localStorage.removeItem('tikshare_token');
    sessionStorage.setItem('tikshare_token', els.apiToken.value.trim());
  }
  closeSettings();
  showToast('Đã lưu cấu hình');
}

function saveFilters() {
  const keys = ['maxResults','dateFilter','minShares','maxShares','minViews','minLikes','minComments','sortOrder','excludeSlideshows','strictKeyword'];
  const data = {};
  keys.forEach((key) => data[key] = els[key].type === 'checkbox' ? els[key].checked : els[key].value);
  localStorage.setItem('tikshare_filters', JSON.stringify(data));
}

function closeSettings() { els.settingsModal.classList.add('hidden'); }
function toggleToken() {
  const showing = els.apiToken.type === 'text';
  els.apiToken.type = showing ? 'password' : 'text';
  els.toggleTokenBtn.textContent = showing ? 'Hiện' : 'Ẩn';
}

async function runSearch() {
  const keywords = parseKeywords(els.keywords.value);
  const token = els.apiToken.value.trim();
  if (!keywords.length) return showToast('Hãy nhập ít nhất một từ khóa');
  if (!token) {
    els.settingsModal.classList.remove('hidden');
    return showToast('Cần nhập Apify API Token trước');
  }

  saveFilters();
  saveSettingsSilently();
  setRunning(true);
  resetStatus();
  log(`Bắt đầu với ${keywords.length} từ khóa: ${keywords.join(', ')}`);

  controller = new AbortController();
  currentRunId = '';
  try {
    const actorId = (els.actorId.value.trim() || 'clockworks~tiktok-scraper').replace('/', '~');
    const input = buildActorInput(keywords);

    updateProgress(8, 'Đang khởi tạo TikTok Scraper…');
    log(`Actor: ${actorId}`);
    log(`Số lượng yêu cầu: ${input.resultsPerPage} video / từ khóa`);

    const started = await apiRequest({ action: 'start', token, actorId, input }, controller.signal);
    const run = started?.data || started;
    currentRunId = run?.id || '';
    if (!currentRunId) throw new Error(started?.error?.message || started?.error || 'Không nhận được Run ID từ Apify.');

    log(`Đã tạo tác vụ: ${currentRunId}`);
    updateProgress(18, 'TikTok Scraper đang thu thập video…');

    const startedAt = Date.now();
    let finishedRun = run;
    while (!['SUCCEEDED','FAILED','TIMED-OUT','ABORTED'].includes(String(finishedRun?.status || '').toUpperCase())) {
      await sleep(3500, controller.signal);
      const statusResponse = await apiRequest({ action: 'status', token, runId: currentRunId }, controller.signal);
      finishedRun = statusResponse?.data || statusResponse;
      const status = String(finishedRun?.status || 'RUNNING').toUpperCase();
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      const progress = Math.min(70, 20 + Math.floor(elapsed / 4));
      updateProgress(progress, `Đang lấy dữ liệu TikTok… ${elapsed}s`);
      log(`Trạng thái: ${status}`);
    }

    const finalStatus = String(finishedRun?.status || '').toUpperCase();
    if (finalStatus !== 'SUCCEEDED') {
      const detail = finishedRun?.statusMessage || finishedRun?.errorMessage || finalStatus;
      throw new Error(`Actor kết thúc với trạng thái ${detail}.`);
    }

    const datasetId = finishedRun?.defaultDatasetId;
    if (!datasetId) throw new Error('Actor hoàn tất nhưng không có Dataset ID.');

    updateProgress(78, 'Đang tải danh sách video…');
    const datasetResponse = await apiRequest({ action: 'dataset', token, datasetId, limit: 5000 }, controller.signal);
    const rawItems = Array.isArray(datasetResponse) ? datasetResponse : (datasetResponse?.items || datasetResponse?.data || []);
    log(`API trả về ${rawItems.length} bản ghi.`);

    updateProgress(88, 'Đang lọc và sắp xếp theo lượt share…');
    const normalized = rawItems.map((item, index) => normalizeItem(item, index)).filter(Boolean);
    const deduped = dedupe(normalized);
    results = applyFilters(deduped, keywords);
    results = sortResults(results);

    updateProgress(100, `Hoàn tất: ${results.length} video phù hợp`);
    log(`Sau chuẩn hóa: ${normalized.length}; sau loại trùng: ${deduped.length}; sau lọc: ${results.length}.`);
    renderResults();
    if (!results.length) showToast('Không có video phù hợp bộ lọc');
  } catch (error) {
    if (error.name === 'AbortError') {
      updateProgress(0, 'Đã dừng tác vụ');
      log('Người dùng đã dừng tác vụ.');
    } else {
      updateProgress(0, 'Có lỗi khi lấy dữ liệu');
      log(`LỖI: ${error.message}`);
      showToast(error.message || 'Không thể lấy dữ liệu');
    }
  } finally {
    setRunning(false);
    controller = null;
    currentRunId = '';
  }
}
function buildActorInput(keywords) {
  return {
    searchQueries: keywords,
    searchSection: '/video',
    resultsPerPage: clampNumber(els.maxResults.value, 1, 500, 50),
    videoSearchSorting: els.sourceSort.value || 'MOST_RELEVANT',
    videoSearchDateFilter: els.dateFilter.value || 'ALL_TIME',
    proxyCountryCode: els.proxyCountry.value || 'None',
    shouldDownloadVideos: false,
    shouldDownloadCovers: true,
    shouldDownloadSlideshowImages: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
    commentsPerPost: 0,
    topLevelCommentsPerPost: 0,
    maxRepliesPerComment: 0,
    maxFollowersPerProfile: 0,
    maxFollowingPerProfile: 0
  };
}

function normalizeItem(item, index) {
  if (!item || typeof item !== 'object') return null;
  const id = str(first(item, ['id','videoId','video_id','itemId','aweme_id'])) || `row-${index}`;
  const author = str(first(item, ['authorMeta.name','author.uniqueId','author.username','username','authorName','author']));
  const nickname = str(first(item, ['authorMeta.nickName','author.nickname','nickname','authorNickname']));
  const url = str(first(item, ['webVideoUrl','videoUrl','postUrl','url','shareUrl'])) || (author && id ? `https://www.tiktok.com/@${author}/video/${id}` : '');
  const caption = str(first(item, ['text','desc','description','video_description','caption','title']));
  const cover = str(first(item, ['videoMeta.coverUrl','videoMeta.originalCoverUrl','coverUrl','cover','thumbnail','thumbnailUrl','video.cover']));
  const shares = num(first(item, ['shareCount','stats.shareCount','stats.share_count','statistics.shareCount','statistics.share_count','shares','share_count']));
  const views = num(first(item, ['playCount','stats.playCount','stats.viewCount','statistics.playCount','statistics.viewCount','views','viewCount','view_count']));
  const likes = num(first(item, ['diggCount','stats.diggCount','stats.likeCount','statistics.diggCount','statistics.likeCount','likes','likeCount','like_count']));
  const comments = num(first(item, ['commentCount','stats.commentCount','statistics.commentCount','comments','comment_count']));
  const saves = num(first(item, ['collectCount','stats.collectCount','statistics.collectCount','favorites_count','saveCount']));
  const isSlideshow = Boolean(first(item, ['isSlideshow','is_slideshow','imagePost','isPhotoMode']));
  const hashtags = extractHashtags(item);
  const createdRaw = first(item, ['createTimeISO','create_time_iso','createTime','create_time','createdAt','date']);
  const createdAt = normalizeDate(createdRaw);
  return { id, author, nickname, url, caption, cover, shares, views, likes, comments, saves, isSlideshow, hashtags, createdAt, raw: item };
}

function extractHashtags(item) {
  const raw = first(item, ['hashtags','hashtag_names','challenges','video.hashtags']);
  if (!Array.isArray(raw)) return [];
  return raw.map((h) => typeof h === 'string' ? h : (h?.name || h?.title || h?.hashtag_name || '')).filter(Boolean);
}

function applyFilters(items, keywords) {
  const minShares = clampNumber(els.minShares.value, 0, Number.MAX_SAFE_INTEGER, 0);
  const maxShares = els.maxShares.value === '' ? Number.MAX_SAFE_INTEGER : clampNumber(els.maxShares.value, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const minViews = clampNumber(els.minViews.value, 0, Number.MAX_SAFE_INTEGER, 0);
  const minLikes = clampNumber(els.minLikes.value, 0, Number.MAX_SAFE_INTEGER, 0);
  const minComments = clampNumber(els.minComments.value, 0, Number.MAX_SAFE_INTEGER, 0);
  const keywordTokens = keywords.map(normalizeText);

  return items.filter((v) => {
    if (v.shares < minShares || v.shares > maxShares) return false;
    if (v.views < minViews || v.likes < minLikes || v.comments < minComments) return false;
    if (els.excludeSlideshows.checked && v.isSlideshow) return false;
    if (els.strictKeyword.checked) {
      const haystack = normalizeText(`${v.caption} ${v.hashtags.join(' ')}`);
      if (!keywordTokens.some((k) => haystack.includes(k))) return false;
    }
    return true;
  });
}

function sortResults(items) {
  const mode = els.sortOrder.value;
  const arr = [...items];
  const time = (v) => v.createdAt ? new Date(v.createdAt).getTime() : 0;
  arr.sort((a,b) => {
    if (mode === 'share_desc') return b.shares - a.shares || b.views - a.views;
    if (mode === 'view_asc') return a.views - b.views || a.shares - b.shares;
    if (mode === 'view_desc') return b.views - a.views || b.shares - a.shares;
    if (mode === 'newest') return time(b) - time(a);
    if (mode === 'oldest') return time(a) - time(b);
    return a.shares - b.shares || a.views - b.views;
  });
  return arr;
}

function renderResults() {
  els.resultSection.classList.remove('hidden');
  els.resultCount.textContent = formatNumber(results.length);
  els.resultsList.innerHTML = '';

  const minShare = results.length ? Math.min(...results.map(v => v.shares)) : 0;
  const maxShare = results.length ? Math.max(...results.map(v => v.shares)) : 0;
  const totalViews = results.reduce((sum, v) => sum + v.views, 0);
  els.minShareSummary.textContent = compactNumber(minShare);
  els.maxShareSummary.textContent = compactNumber(maxShare);
  els.totalViewsSummary.textContent = compactNumber(totalViews);

  const fragment = document.createDocumentFragment();
  results.forEach((v, index) => {
    const card = document.createElement('article');
    card.className = 'video-card';
    card.innerHTML = `
      <div class="thumb-wrap">
        <img loading="lazy" src="${escapeAttr(v.cover || 'icons/icon-512.png')}" alt="Ảnh video" onerror="this.src='icons/icon-512.png'">
        <span class="rank-badge">${index + 1}</span>
      </div>
      <div class="video-info">
        <div class="author">@${escapeHtml(v.author || 'không rõ')} ${v.nickname ? `· ${escapeHtml(v.nickname)}` : ''}</div>
        <div class="caption">${escapeHtml(v.caption || '(Không có mô tả)')}</div>
        <div class="stats">
          <div class="stat">Chia sẻ<strong>${formatNumber(v.shares)}</strong></div>
          <div class="stat">Lượt xem<strong>${formatNumber(v.views)}</strong></div>
          <div class="stat">Lượt thích<strong>${formatNumber(v.likes)}</strong></div>
          <div class="stat">Bình luận<strong>${formatNumber(v.comments)}</strong></div>
        </div>
        <div class="date-line">${v.createdAt ? formatDate(v.createdAt) : 'Không rõ ngày đăng'}</div>
        <div class="card-actions">
          <a href="${escapeAttr(v.url || '#')}" target="_blank" rel="noopener">Mở TikTok</a>
          <button type="button" data-copy="${escapeAttr(v.url)}">Sao chép link</button>
        </div>
      </div>`;
    card.querySelector('[data-copy]').addEventListener('click', () => copyText(v.url));
    fragment.appendChild(card);
  });
  els.resultsList.appendChild(fragment);
  els.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exportCsv() {
  if (!results.length) return showToast('Chưa có dữ liệu để xuất');
  const rows = exportRows();
  const headers = Object.keys(rows[0]);
  const csv = '\ufeff' + [headers, ...rows.map(r => headers.map(h => r[h]))]
    .map(row => row.map(csvCell).join(','))
    .join('\n');
  downloadBlob(new Blob([csv], {type:'text/csv;charset=utf-8'}), makeFilename('csv'));
  els.actionMenu.classList.add('hidden');
}

function exportXlsx() {
  if (!results.length) return showToast('Chưa có dữ liệu để xuất');
  if (!window.XLSX) {
    showToast('Thư viện Excel chưa tải xong. Hãy thử lại.');
    return;
  }
  const rows = exportRows();
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [
    {wch:5},{wch:24},{wch:55},{wch:18},{wch:18},{wch:18},{wch:16},{wch:20},{wch:55},{wch:24}
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'TikTok');
  XLSX.writeFile(book, makeFilename('xlsx'));
  els.actionMenu.classList.add('hidden');
}

function exportRows() {
  return results.map((v, i) => ({
    'STT': i + 1,
    'Tài khoản': v.author,
    'Mô tả video': v.caption,
    'Lượt share': v.shares,
    'Lượt xem': v.views,
    'Lượt thích': v.likes,
    'Bình luận': v.comments,
    'Ngày đăng': v.createdAt ? formatDate(v.createdAt) : '',
    'Link TikTok': v.url,
    'Hashtag': v.hashtags.join(', ')
  }));
}

async function copyAllLinks() {
  if (!results.length) return showToast('Chưa có link để sao chép');
  await copyText(results.map(v => v.url).filter(Boolean).join('\n'));
  els.actionMenu.classList.add('hidden');
}

function clearResults() {
  results = [];
  els.resultsList.innerHTML = '';
  els.resultSection.classList.add('hidden');
  els.actionMenu.classList.add('hidden');
  showToast('Đã xóa kết quả');
}

function loadDemo() {
  results = demoData.map(normalizeItem).filter(Boolean);
  results = sortResults(results);
  closeSettings();
  renderResults();
  showToast('Đã mở dữ liệu demo');
}

async function cancelSearch() {
  const token = els.apiToken.value.trim();
  const runId = currentRunId;
  if (controller) controller.abort();
  if (runId && token) {
    try {
      await apiRequest({ action: 'abort', token, runId }, null);
      log('Đã gửi lệnh dừng Actor trên Apify.');
    } catch { /* Không chặn thao tác dừng phía iPhone. */ }
  }
}
function setRunning(running) {
  els.searchBtn.disabled = running;
  els.cancelBtn.classList.toggle('hidden', !running);
}
function resetStatus() {
  els.statusPanel.classList.remove('hidden');
  els.logBox.textContent = '';
  updateProgress(3, 'Đang chuẩn bị…');
}
function updateProgress(percent, text) {
  const safe = Math.max(0, Math.min(100, percent));
  els.progressBar.style.width = `${safe}%`;
  els.statusPercent.textContent = `${safe}%`;
  els.statusText.textContent = text;
}
function log(message) {
  const stamp = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  els.logBox.textContent += `[${stamp}] ${message}\n`;
  els.logBox.scrollTop = els.logBox.scrollHeight;
}

async function apiRequest(payload, signal) {
  const response = await fetch('/.netlify/functions/run-tiktok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: signal || undefined
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`Máy chủ trả dữ liệu không hợp lệ (HTTP ${response.status}).`); }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return data;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Đã dừng', 'AbortError'));
      }, { once: true });
    }
  });
}

function saveSettingsSilently() {
  const remember = els.rememberToken.checked;
  localStorage.setItem('tikshare_settings', JSON.stringify({
    actorId: els.actorId.value.trim() || 'clockworks~tiktok-scraper',
    sourceSort: els.sourceSort.value,
    proxyCountry: els.proxyCountry.value,
    rememberToken: remember
  }));
  if (remember) localStorage.setItem('tikshare_token', els.apiToken.value.trim());
  else sessionStorage.setItem('tikshare_token', els.apiToken.value.trim());
}

function parseKeywords(value) {
  return [...new Set(value.split(/\n|,/).map(v => v.trim()).filter(Boolean))].slice(0, 20);
}
function dedupe(items) {
  const map = new Map();
  items.forEach((v) => {
    const key = v.id || v.url;
    if (!key) return;
    const old = map.get(key);
    if (!old || v.shares > old.shares) map.set(key, v);
  });
  return [...map.values()];
}
function first(obj, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc != null ? acc[key] : undefined, obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}
function num(value) {
  if (typeof value === 'string') value = value.replace(/[^0-9.-]/g, '');
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function str(value) { return value == null ? '' : String(value); }
function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    let n = Number(value);
    if (n < 1e12) n *= 1000;
    const d = new Date(n);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}
function normalizeText(value) {
  return str(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function formatNumber(n) { return Number(n || 0).toLocaleString('vi-VN'); }
function compactNumber(n) {
  try { return new Intl.NumberFormat('vi-VN', {notation:'compact', maximumFractionDigits:1}).format(n || 0); }
  catch { return formatNumber(n); }
}
function formatDate(iso) {
  return new Date(iso).toLocaleString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
}
function safeJson(text) { try { return JSON.parse(text); } catch { return null; } }
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function makeFilename(ext) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  return `tiktok_share_filter_${stamp}.${ext}`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyText(text) {
  if (!text) return showToast('Không có link');
  try { await navigator.clipboard.writeText(text); showToast('Đã sao chép'); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); showToast('Đã sao chép');
  }
}
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2600);
}
function escapeHtml(value) {
  return str(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function escapeAttr(value) { return escapeHtml(value); }

init();
