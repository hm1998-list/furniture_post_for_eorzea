const GAS_URL = "https://script.google.com/macros/s/AKfycbwQxlFPFKuE2zYda8BBdt0hPyfrqlUzI2xUrc1Ui_lbyHlrQtyWlL7oUfTtW8OPpcr61Q/exec";
const CATEGORY_ORDER = ["調度品(一般)", "調度品(台座)", "調度品(卓上)", "調度品(壁掛)", "調度品(敷物)", "内装建材", "庭具", "絵画", "花"];
const SUB_CATEGORY_ORDER = [
        "机", "椅子/ソファ", "棚/チェスト", "壁/柱/仕切り", "ベッド",
        "照明", "料理", "時計", "植物",
        "ぬいぐるみ/マスコット", "置物",
        "風呂",
        "旗/額縁/ポスター", "窓",
        "足場", "水場", "店舗",
        "天井照明", "内壁", "床材",
        "機能家具",
        "ラノシア", "黒衣森", "ザナラーン", 
        "クルザス/モードゥナ", "ドラヴァニア", "アバラシア", 
        "ギラバニア", "オサード",
        "第一世界", "北洋地域", "イルサバード",
        "古代世界", "星外宙域",
        "ヨカ・トラル", "サカ・トラル", "アンロスト・ワールド",
        "その他"
    ];    
const PACKAGE_NAMES = { "7": "黄金のレガシー", "6": "暁月のフィナーレ", "5": "漆黒のヴィランズ", "4": "紅蓮のリベレーター", "3": "蒼天のイシュガルド", "2": "新生エオルゼア" };

let allData = [];
let currentFilter = { type: 'all', value: 'all', subValue: 'all' };
let displayList = [];
let currentIndex = 0;
const itemsPerPage = 24;
let isLoading = false;
let currentModalIdx = -1;
let latestPatch = "0";

// 2. データを「受け取った瞬間」に実行する関数（ここに追加！）
function initData(data) {
    allData = data;
    latestPatch = Math.max(...allData.map(item => parseFloat(item['パッチ'] || item.patch) || 0)).toString();

    render();
}

// 検索用の正規化（ひらがな化、中点・スペース除去）
function normalizeText(str) {
    if (!str) return "";
    return str
        .replace(/[ァ-ヶ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)) // カタカナをひらがなに
        .replace(/[・\s　]/g, "") 
        .toLowerCase();
}

function formatPatch(p) {
    const s = p.toString().replace('Patch', '').trim();
    return `Patch ${s}`;
}

let lastRenderedPatch = null; 

function loadMoreItems() {
    if (isLoading || currentIndex >= displayList.length) return;
    isLoading = true;
    const grid = document.getElementById('grid');
    const next = displayList.slice(currentIndex, currentIndex + itemsPerPage);

    const latestPatch = Math.max(...allData.map(item => parseFloat(item.patch || item['パッチ']) || 0)).toString();

    next.forEach(item => {
        const itemPatch = (item.patch || item['パッチ'] || "").toString().trim();
        const isPatchFilter = (currentFilter.type === 'patch' || currentFilter.type === 'patch-group');

        if (isPatchFilter && itemPatch !== lastRenderedPatch) {
        const separator = document.createElement('div');
        separator.className = 'patch-separator';
        separator.innerHTML = `<span>|| Patch ${itemPatch}</span>`;
        grid.appendChild(separator);

        lastRenderedPatch = itemPatch;
    }

        // --- ここからカード作成（既存のロジック） ---
        const dyeVal = item['染色'] || item.dyeable || item['染色可否'];
        const marketVal = item['マケボ'] || item.market || item['マケボ取引'];
        const craftVal = item['製作'] || item.recipe || item['製作可否'];
        const shopVal = (item['ショップ'] || "").toString().trim();
        const pvpVal = (item['PvP'] || "").toString().trim();
        const pveVal = (item['PvE'] || "").toString().trim();
        const retainerVal = (item['リテイナー'] || "").toString().trim();
        const voyageVal = (item['潜水艦'] || "").toString().trim();    
        const itemId = item.ItemID || item['アイテムID'];
        const currentItemPatch = (item.patch || "").toString();

        const card = document.createElement('div');
        card.className = 'cheki-card';

        const newBadge = (currentItemPatch === latestPatch) ? '<span class="badge-new">New</span>' : '';

        card.innerHTML = `
            ${newBadge}
            <div class="photo-area" onclick="openModalByIdx(${allData.indexOf(item)})">
                <img src="images/${itemId}_front.webp" class="slide-img active" loading="lazy" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">
            </div>
            <p class="item-name">${item['アイテム名（日）'] || item.name}</p>
            <div class="card-flags">
                ${(dyeVal && dyeVal !== '不可') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-dye"><img src="ui/dye.png" alt="染色" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="染色可能"></span></div>` : ''}
                ${(marketVal && marketVal !== '不可') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-market"><img src="ui/marketbord.png" alt="マケボ" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="マケボ入手可能"></span></div>` : ''}
                ${(craftVal && craftVal !== '-' && craftVal !== '不可' && craftVal !== '') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-craft"><img src="ui/craft.png" alt="製作" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="製作可能"></span></div>` : ''}
                ${(shopVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-shop"><img src="ui/shop.png" alt="ショップ" loading="lazy"></div>   
                <span class="fixed-tooltip-content" data-tooltip="NPCショップで購入or交換"></span></div>` : ''}
                ${(pvpVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-pvp"><img src="ui/pvp.png" alt="PvP" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="PvP交換品"></span></div>` : ''}
                ${(pveVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-drop"><img src="ui/drop.png" alt="PvE" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="ID、討滅戦、宝の地図、特殊フィールド探索等から入手可能"></span></div>` : ''}
                ${(retainerVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-retainer"><img src="ui/rite.png" alt="リテイナー" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="リテイナーベンチャーで入手可能"></span></div>` : ''}
                ${(voyageVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-voyage"><img src="ui/voyger.png" alt="潜水艦" loading="lazy"></div>
                <span class="fixed-tooltip-content" data-tooltip="潜水艦で入手可能"></span></div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    currentIndex += itemsPerPage;
    isLoading = false;
}

async function openModalByIdx(originalIdx, retryCount = 0) {
    // データが空、または指定のインデックスが存在しない場合
    if (!allData || allData.length === 0 || !allData[originalIdx]) {
        if (retryCount > 20) { // 10秒待ってもダメなら
            console.error("データの読み込みがタイムアウトしました。");
            return;
        }
        console.log(`データ受信待ち... (${retryCount + 1}回目)`);
        setTimeout(() => openModalByIdx(originalIdx, retryCount + 1), 500); 
        return;
    }

    // お掃除処理
    const thumbNavContainer = document.querySelector('.thumb-nav');
    if (thumbNavContainer) thumbNavContainer.innerHTML = '';
    
    const dotsContainer = document.getElementById('modalDots');
    if (dotsContainer) dotsContainer.innerHTML = '';

    const mainImg = document.getElementById('mainModalImg');
    if (mainImg) mainImg.src = '';
        
　　if (document.querySelector('.thumb-nav')) {
        document.querySelector('.thumb-nav').innerHTML = '';
    }
    if (document.getElementById('modalDots')) {
        document.getElementById('modalDots').innerHTML = '';
    }
    if (document.getElementById('mainModalImg')) {
        document.getElementById('mainModalImg').src = '';
    }

    currentModalIdx = originalIdx;
    const item = allData[originalIdx];
    const itemId = item.ItemID || item['アイテムID'];

    document.getElementById('modalTitle').innerText = item['アイテム名（日）'] || item.name;
    document.getElementById('modalMainCategory').innerText = item.category || "";
    document.getElementById('modalSubCategory').innerText = item['FF14サブカテゴリー'] || "";
    document.getElementById('modalDye').innerText = item['dyeable'] || item['染色'] || "不可";
    document.getElementById('modalMarket').innerText = item['market'] || item['マケボ'] || "不可";
    document.getElementById('modalCraft').innerText = item['recipe'] || item['製作'] || "-";
    document.getElementById('modalHowToGet').innerText = item['入手方法'] || "確認中";
    document.getElementById('modalComment').innerText = item['note'] || "備考はありません";

// 【修正】onerror で外部サイトに繋がず、シンプルにする
    const photoArea = document.getElementById('modalPhoto');
    photoArea.innerHTML = `<img src="images/${itemId}_front.webp" id="mainModalImg" loading="lazy" onerror="this.style.display='none';">`;
        
    // --- 左右切り替えボタンの表示制御 ---
    const idxInList = displayList.indexOf(item);
    document.querySelector('.nav-prev').style.display = (idxInList > 0) ? 'flex' : 'none';
    document.querySelector('.nav-next').style.display = (idxInList < displayList.length - 1) ? 'flex' : 'none';

    const bookRight = document.querySelector('.book-right');
    bookRight.classList.remove('has-multiple-thumbs');
    let thumbNav = document.querySelector('.thumb-nav') || document.createElement('div');
    thumbNav.className = 'thumb-nav';
    if (!thumbNav.parentElement) bookRight.appendChild(thumbNav);
    thumbNav.innerHTML = '';
    thumbNav.style.display = 'none';

    // 1. 既存のドットやナビを掃除（二重表示防止）
    const oldDots = document.getElementById('modalDots');
    if (oldDots) oldDots.remove();

    // 2. ドット用コンテナ作成
    const dotContainer = document.createElement('div');
    dotContainer.id = 'modalDots';

    const suffixList = ['front', 'side', 'back', 'bottom', 'top', 'dye', 'night'];
    let foundCount = 0;
    const isMobile = window.innerWidth <= 768;

    for (const suffix of suffixList) {
        const imgUrl = `images/${itemId}_${suffix}.webp`;
        const exists = await new Promise(res => {
            const img = new Image();
            img.onload = () => res(true);
            img.onerror = () => res(false);
            img.src = imgUrl;
        });

        if (exists) {
            const currentIdx = foundCount;
            foundCount++;

            const tImg = document.createElement('img');
            tImg.src = imgUrl;
        　　tImg.loading = "lazy"
            if (suffix === 'front') tImg.className = 'active';

            tImg.onclick = () => {
                document.getElementById('mainModalImg').src = imgUrl;
                document.querySelectorAll('.thumb-nav img').forEach(el => el.classList.remove('active'));
                tImg.classList.add('active');
                updateDots(foundCount, currentIdx);
            };
            thumbNav.appendChild(tImg);
        }
    }
    
// --- 左右ボタンのイベント設定（修正版：常に家具を切り替える） ---
const prevBtn = document.querySelector('.nav-prev');
const nextBtn = document.querySelector('.nav-next');

if (prevBtn && nextBtn) {
    // 1. スマホ版の「半円デザイン」などの特殊設定をリセット
    prevBtn.classList.remove('semi-circle');
    nextBtn.classList.remove('semi-circle');

    // 2. 常に「次の家具・前の家具」へ移動するロジックに統一
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        const idxInList = displayList.indexOf(item);
        if (idxInList > 0) {
            openModalByIdx(allData.indexOf(displayList[idxInList - 1]));
        }
    };
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        const idxInList = displayList.indexOf(item);
        if (idxInList < displayList.length - 1) {
            openModalByIdx(allData.indexOf(displayList[idxInList + 1]));
        }
    };
}   

// サムネイルとドットの表示制御
if (foundCount > 1) {
    if (isMobile) {
        thumbNav.style.display = 'none';
        if (!document.getElementById('modalDots')) document.getElementById('modalPhoto').after(dotContainer);
        updateDots(foundCount, 0);
    } else {
        thumbNav.style.display = 'flex';
        if (document.getElementById('modalDots')) document.getElementById('modalDots').style.display = 'none';
    }
}
    document.getElementById('itemModal').classList.add('visible');

// モーダルを開く処理の中に追記イメージ
    function updateModalDots(total, current) {
    const dotContainer = document.getElementById('modalDots') || document.createElement('div');
        dotContainer.id = 'modalDots';
        dotContainer.style.textAlign = 'center';
        dotContainer.style.marginTop = '10px';

    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
        const icon = (i === current) ? 'fiber_manual_record' : 'circle';
        dotsHtml += `<span class="material-symbols-rounded" style="font-size:12px; margin:0 3px; color:${i === current ? 'var(--primary-color)' : '#ccc'}">${icon}</span>`;
    }
        dotContainer.innerHTML = dotsHtml;

    const photoArea = document.querySelector('.book-right');
    if (!document.getElementById('modalDots')) photoArea.appendChild(dotContainer);
    }
}

function changeModalItem(dir) {
    const currentItem = allData[currentModalIdx];
    const idx = displayList.indexOf(currentItem);
    const nextIdx = idx + dir;
    if(nextIdx >= 0 && nextIdx < displayList.length) {
        openModalByIdx(allData.indexOf(displayList[nextIdx]));
    }
}

function closeModal() { document.getElementById('itemModal').classList.remove('visible'); }

function buildHome() {
    const categoryIcons = {
        "内装建材": "meeting_room",
        "調度品(一般)": "chair",
        "調度品(台座)": "table_bar",
        "調度品(卓上)": "interests",
        "調度品(壁掛)": "wall_lamp",
        "調度品(敷物)": "width_full",
        "絵画": "manga",
        "庭具": "forest",
        "花": "local_florist"
    };

    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));

    document.getElementById('home-cat-list').innerHTML = cats.map(c => {
        const iconName = categoryIcons[c] || "inventory_2";
        return `
            <div class="cat-card" onclick="filterBy('category', '${c}')">
                <span class="material-symbols-rounded">${iconName}</span>
                <span class="cat-name">${c}</span>
            </div>`;
    }).join('');
}


function showHome(addHistory = true) {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('catalog-view').style.display = 'none';
    document.getElementById('about-view').style.display = 'none';

    document.getElementById('btn-home').classList.add('active');
    document.getElementById('btn-about').classList.remove('active');
    
    if (addHistory) {
        history.pushState({ page: 'home' }, '', './');
    }
}

function buildMenu() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('side-cat-list').innerHTML = cats.map(c => {

        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);

        subs.sort((a, b) => {
            let indexA = SUB_CATEGORY_ORDER.indexOf(a);
            let indexB = SUB_CATEGORY_ORDER.indexOf(b);

            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;

            return indexA - indexB;
        });

        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, '${c}')"><span><i class="fa-solid fa-angle-right"></i> ${c}</span></button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('category', '${c}', 'all')">すべて表示</button>${subs.map(s => `<button class="nav-item-sub" onclick="filterBy('category', '${c}', '${s}')">${s}</button>`).join('')}</div></div>`;
    }).join('');

    const patches = [...new Set(allData.map(i => i.patch))].sort((a,b) => parseFloat(b.toString().replace('Patch','')) - parseFloat(a.toString().replace('Patch','')));
    const groups = {};
    patches.forEach(p => {
        const major = p.toString().replace('Patch','').trim().split('.')[0];
        const gName = PACKAGE_NAMES[major] ? `${PACKAGE_NAMES[major]} (${major}.x)` : `${major}.x`;
        if(!groups[gName]) groups[gName] = [];
        groups[gName].push(p);
    });

    document.getElementById('side-patch-list').innerHTML = Object.keys(groups).map(g => {
        const major = Object.keys(PACKAGE_NAMES).find(k => g.includes(PACKAGE_NAMES[k]));
        return `<div class="nav-item-container"><button class="nav-item-parent" onclick="toggleSubMenu(this, 'patch-group:${major}')"><span><i class="fa-solid fa-tag"></i> ${g}</span></button><div class="sub-menu"><button class="nav-item-sub" onclick="filterBy('patch-group', '${major}', 'all')">すべて表示</button>${groups[g].map(p => `<button class="nav-item-sub" onclick="filterBy('patch', '${p}')">${formatPatch(p)}</button>`).join('')}</div></div>`;
    }).join('');
}

function toggleSubMenu(btn, val) {
    const sub = btn.nextElementSibling;
    if (!sub) return;

    document.querySelectorAll('.sub-menu.open').forEach(el => {
        if (el !== sub) {
            el.classList.remove('open');
            el.style.maxHeight = '0'; 
        }
    });

    // 2. 【メイン】クリックされたメニューの開閉
    const isOpen = sub.classList.contains('open');
    if (!isOpen) {
        sub.classList.add('open');
        sub.style.maxHeight = '1000px';

        // フィルター実行（既存のロジック）
        if (val && val.startsWith('patch-group:')) {
            filterBy('patch-group', val.split(':')[1]);
        } else if (val && val !== 'all') {
            filterBy('category', val);
        }
    } else {
        sub.classList.remove('open');
        sub.style.maxHeight = '0';
    }
}

function filterBy(type, val, sub = 'all', addHistory = true) {
    currentFilter = { type, value: val, subValue: sub };
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    document.getElementById('about-view').style.display = 'none'; // Aboutが開いてるかもしれないので念のため
    
    let title = val;
    if(type === 'patch-group') title = (PACKAGE_NAMES[val] || val) + ` (${val}.x)`;
    else if(type === 'patch') title = formatPatch(val);
    document.getElementById('view-title').innerText = title;

    updateTopTags();
    render();
    window.scrollTo(0,0);

    if (addHistory) {
        history.pushState({ 
            page: 'catalog', 
            type: type, 
            value: val, 
            subValue: sub 
        }, '', `#${type}=${val}`);
    }
}

function updateTopTags() {
    const area = document.getElementById('tag-area');
    let html = '';
    if(currentFilter.type === 'category') {

        const subs = [...new Set(allData.filter(i => i.category === currentFilter.value).map(i => i['FF14サブカテゴリー']))].filter(Boolean);

        subs.sort((a, b) => {
            let indexA = SUB_CATEGORY_ORDER.indexOf(a);
            let indexB = SUB_CATEGORY_ORDER.indexOf(b);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });

        html += `<div class="tag-chip ${currentFilter.subValue === 'all' ? 'active' : ''}" onclick="filterBy('category', '${currentFilter.value}', 'all')">すべて</div>`;
        subs.forEach(s => { html += `<div class="tag-chip ${currentFilter.subValue === s ? 'active' : ''}" onclick="filterBy('category', '${currentFilter.value}', '${s}')">${s}</div>`; });
    } else if(currentFilter.type === 'patch-group' || currentFilter.type === 'patch') {
        const major = currentFilter.type === 'patch-group' ? currentFilter.value : currentFilter.value.toString().replace('Patch','').split('.')[0].trim();
        const chips = [...new Set(allData.map(i => i.patch.toString().replace('Patch','').trim()))]
            .filter(p => p.startsWith(major + '.') && p.split('.')[1].length === 1)
            .sort((a,b) => parseFloat(a) - parseFloat(b));
        html += `<div class="tag-chip ${currentFilter.type === 'patch-group' ? 'active' : ''}" onclick="filterBy('patch-group', '${major}')">すべて</div>`;
        chips.forEach(p => {
            const active = currentFilter.type === 'patch' && currentFilter.value.toString().replace('Patch','').trim().startsWith(p);
            html += `<div class="tag-chip ${active ? 'active' : ''}" onclick="filterBy('patch', '${p}')">Patch ${p}</div>`;
        });
    }
    if (!html) {
        area.innerHTML = '';
        return;
    }
    // ★ チップたちを包むコンテナと、その下に開閉バーを置く構造
    area.innerHTML = `
        <div id="sub-cat-container" class="sub-cat-content open">
            ${html}
        </div>
        <div class="sub-cat-toggle-bar" onclick="toggleSubCategory()">
            <i class="fa-solid fa-chevron-up" id="sub-cat-arrow"></i>
        </div>
    `;
}

// ★ 開閉用の関数
function toggleSubCategory() {
    const container = document.getElementById('sub-cat-container');
    const arrow = document.getElementById('sub-cat-arrow');
    container.classList.toggle('open');
    arrow.classList.toggle('is-rotated');
}

function render() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    currentIndex = 0;

    displayList = allData.filter(item => {
        if (currentFilter.type === 'search') {
            const sKey = normalizeText(currentFilter.value);
            const itemName = normalizeText(item['アイテム名（日）'] || item.name || "");
            return itemName.includes(sKey);
        }
        if (currentFilter.type === 'patch') {
            const itemPatch = (item.patch || "").toString().replace('Patch', '').trim();
            const filterValue = currentFilter.value.toString().replace('Patch', '').trim();            
            return itemPatch.startsWith(filterValue);
        }
        const matchMain = (currentFilter.type === 'category' ? item.category === currentFilter.value : 
                          currentFilter.type === 'patch-group' ? item.patch.toString().startsWith(currentFilter.value + '.') : true);
        const matchSub = (currentFilter.subValue === 'all' || item['FF14サブカテゴリー'] === currentFilter.subValue);        
        return matchMain && matchSub;
    });
    loadMoreItems();
}

function setSubFilter(val, el) {
        currentFilter.subValue = val;
        document.querySelectorAll('.tag-chip').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        render();
    }

function handleSearch(e) {
    // Enterキーが押された時だけ実行
    if (e.key === 'Enter') {
        const val = e.target.value.trim();
        if (!val) return;
        currentFilter = { type: 'search', value: val, subValue: 'all' };
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('catalog-view').style.display = 'block';
        document.getElementById('view-title').innerText = `検索結果: ${val}`;
        document.getElementById('tag-area').innerHTML = '';

        render();

        window.scrollTo(0, 0);
    }
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
        loadMoreItems();
    }
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (scrollTop > 300) { backToTop.classList.add('visible'); } 
        else { backToTop.classList.remove('visible'); }
    }
});

window.addEventListener('keydown', (e) => {
    if (!document.getElementById('itemModal').classList.contains('visible')) return;
    if (e.key === 'ArrowLeft') changeModalItem(-1);
    else if (e.key === 'ArrowRight') changeModalItem(1);
    else if (e.key === 'Escape') closeModal();
});

fetch('https://script.google.com/macros/s/AKfycbwQxlFPFKuE2zYda8BBdt0hPyfrqlUzI2xUrc1Ui_lbyHlrQtyWlL7oUfTtW8OPpcr61Q/exec')
    .then(res => res.json())
    .then(data => {
        const filteredData = rawData.filter(item => {
        const id = item.ItemID || item['アイテムID'];
        const isUploaded = item['画像UP済み'] === true || item['画像UP済み'] === "TRUE";
        return id && id.toString().trim() !== "" && isUploaded;
        });
    
    window.allData = filteredData;
    console.log("データ受信完了！件数:", window.allData.length);
    
    if (window.allData.length === 0) {
        console.warn("注意：条件に合うデータが0件です。スプレッドシートの『画像UP済み』列を確認してください。");
        }

        buildMenu();
        buildHome();
        if (!window.location.hash || window.location.hash === '#home') {
        showHome();
    }
    })
    .catch(e => {
        console.error("データ取得エラー:", e);
    });

// サイドバーの開閉を切り替える
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// カテゴリーなどを選んだら自動で閉じる（スマホ時のみ）
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    // 「スマホ画面」かつ「サイドバーが開いている」かつ「クリックされたのがサイドバー内のボタン」なら閉じる
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('active') && 
        e.target.closest('.nav-item, .nav-item-parent, .sub-item')) {
        toggleSidebar();
    }
});

/* --- スワイプ切り替え機能（修正版） --- */
let touchStartX = 0;
let touchEndX = 0;

// 特定の要素ではなく、document全体で指の動きを監視する
document.addEventListener('touchstart', (e) => {
    // モーダルが開いている時だけ反応させる
    const modal = document.getElementById('itemModal');
    if (!modal || !modal.classList.contains('visible')) return;
    
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

document.addEventListener('touchend', (e) => {
    const modal = document.getElementById('itemModal');
    if (!modal || !modal.classList.contains('visible')) return;

    touchEndX = e.changedTouches[0].screenX;
    
    // 座標が記録されたら、判定関数を呼ぶ
    handleSwipe();
}, {passive: true});
// ドット更新関数
    function updateDots(total, current) {
        const dotContainer = document.getElementById('modalDots'); // ここで要素を取得
            if (!dotContainer) return; // コンテナがなければ何もしない
            if (total <= 1) {
                dotContainer.style.display = 'none';
                return;
            }
    dotContainer.style.display = 'flex';
            let dotsHtml = '';
            for (let i = 0; i < total; i++) {
                const isCurrent = (i === current);

        // 現在地だけ「FILL: 1」で塗りつぶし、他は「FILL: 0」で白抜きにする
        const fillValue = isCurrent ? 1 : 0;
        const color = isCurrent ? 'var(--primary-color)' : '#999';
        const opacity = isCurrent ? '1' : '0.5';

        dotsHtml += `<span class="material-symbols-rounded" 
            style="font-size:10px; margin:0 4px; color:${color}; opacity:${opacity};
            font-variation-settings: 'FILL' ${fillValue}, 'wght' 400, 'GRAD' 0, 'opsz' 24; 
            transition: all 0.2s ease;">
            circle
        </span>`;
    }
    dotContainer.innerHTML = dotsHtml;
}

// スマホ用：モーダル内の画像だけを切り替える関数
    async function changeInternalImage(itemId, list, direction, total) {
    const mainImg = document.getElementById('mainModalImg');
    if (!mainImg) return;

    const thumbs = document.querySelectorAll('.thumb-nav img');
    if (thumbs.length === 0) return;

    // 現在アクティブなサムネイルのインデックスを探す
    let currentIndex = -1;
    thumbs.forEach((img, idx) => {
        if (img.classList.contains('active')) currentIndex = idx;
    });

    // 次のインデックスを計算（ループ対応）
    let nextIdx = (currentIndex + direction + thumbs.length) % thumbs.length;
    const targetImg = thumbs[nextIdx];

    // メイン画像の差し替えとアクティブクラスの更新
    mainImg.src = targetImg.src;
    thumbs.forEach(t => t.classList.remove('active'));
    targetImg.classList.add('active');

    // ドットのインジケーターも連動させる
    updateDots(total, nextIdx);
}

function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    const threshold = 50;
    // モーダルが開いていない、またはスワイプ距離が足りない場合は無視
    if (!document.getElementById('itemModal').classList.contains('visible')) return;
    if (Math.abs(swipeDistance) < threshold) return;
    // 現在開いているアイテムのデータを特定
    const item = allData[currentModalIdx];
    const itemId = item.ItemID || item['アイテムID'];
    const suffixList = ['front', 'side', 'back', 'bottom', 'top', 'dye', 'night'];    
    // サムネイル（画像）が1枚しかなければスワイプ不要なので終了
    const thumbs = document.querySelectorAll('.thumb-nav img');
    if (thumbs.length <= 1) return;

    if (swipeDistance > threshold) {
        // 右スワイプ → 前の画像へ
        changeInternalImage(itemId, suffixList, -1, thumbs.length);
    } else {
        // 左スワイプ → 次の画像へ
        changeInternalImage(itemId, suffixList, 1, thumbs.length);
    }
}
// --- セクション切り替え用の関数 ---
function showAbout() {
    const homeView = document.getElementById('home-view');
    const catalogView = document.getElementById('catalog-view');
    const aboutView = document.getElementById('about-view');

    if (homeView) homeView.style.display = 'none';
    if (catalogView) catalogView.style.display = 'none';
    if (aboutView) {
        aboutView.style.setProperty('display', 'block', 'important');
    }
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
    // ページトップへ戻す（任意）
    window.scrollTo(0, 0);
    history.pushState({ page: 'about' }, '', '#about');
    if (addHistory) {
        history.pushState({ page: 'about' }, '', '#about');
    }
}

window.onload = async function() {
    const CACHE_KEY = 'eorzea_furniture_data_final_v2';
    const loader = document.getElementById('loading-screen');
    const cachedData = localStorage.getItem(CACHE_KEY);

    // ロード画面を消す関数
    const hideLoader = () => {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    };

    // --- 【修正ポイント】キャッシュがあれば即座に変数に入れる ---
    if (cachedData) {
        console.log("キャッシュから即座に復元します");
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
        // キャッシュがあれば先に幕を引いてOK（爆速体験）
        hideLoader();
    }

    // 裏で最新データを取得しにいく（キャッシュがあっても、最新に更新するため）
    try {
        console.log("最新データをGASからチェックします...");
        const response = await fetch(GAS_URL);
        const data = await response.json();
        
        let rawData = data.slice(1).reverse();
        const freshData = rawData.filter(item => {
            const id = item.ItemID || item['アイテムID'];
            const isUploaded = item['画像UP済み'] === true || item['画像UP済み'] === "TRUE";
            return id && id.toString().trim() !== "" && isUploaded;
        });

        // 取得したデータで上書きし、キャッシュを更新
        allData = freshData;
        localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
        
        // メニューなどを最新状態で再構築（裏でこっそり更新）
        buildMenu();
        buildHome();
        
    } catch (e) {
        console.error("最新データの取得に失敗しましたが、キャッシュがあれば続行可能です:", e);
    } finally {
        // キャッシュがなかった場合のみ、ここで幕を引く
        if (!cachedData) hideLoader();
    }
};

document.getElementById('message-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const responseMsg = document.getElementById('form-response');
    const gasUrl = "https://script.google.com/macros/s/AKfycbyFl7P8CYPDNBsvWWx34NSTAxocAp6m6N0r4jrrnBLb8NnxfW7PqxQJDwRXAC0CqsvMRw/exec";

    submitBtn.innerText = "送信中...";
    submitBtn.disabled = true;

    const data = {
        subject: this.subject.value,
        message: this.message.value
    };

    fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(res => {
        submitBtn.style.display = 'none';
        this.style.display = 'none';
        responseMsg.style.display = 'block';
    })
    .catch(err => {
        alert("送信に失敗しました。時間をおいて再度お試しください。");
        submitBtn.innerText = "送信";
        submitBtn.disabled = false;
    });
});
// ブラウザの戻る・進むボタンが押された時の処理
window.addEventListener('popstate', function(e) {
    if (e.state) {
        if (e.state.page === 'home') {
            showHome(false);
        } else if (e.state.page === 'about') {
            showAbout(false);
        } else if (e.state.page === 'catalog') {
            filterBy(e.state.type, e.state.value, e.state.subValue, false);
        }
    } else {
        showHome(false);
    }
});
