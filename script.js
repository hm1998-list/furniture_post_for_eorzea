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
        // リストにないものはこの後ろに自動で並びます
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

// 1. ページ読み込み時に実行される部分
window.onload = function() {
    // ここでスプレッドシートなどからデータを取ってくる処理があるはずです
    // 例：fetchData(); 
};

// 2. データを「受け取った瞬間」に実行する関数（ここに追加！）
function initData(data) {
    allData = data;
    
    // 全データの中から最新パッチを特定
    // item['パッチ'] の部分は、スプレッドシートの列名に合わせて「item.patch」などに変えてね
    latestPatch = Math.max(...allData.map(item => parseFloat(item['パッチ'] || item.patch) || 0)).toString();
    
    render(); // データをセットし終わったら描画開始
}

// 検索用の正規化（ひらがな化、中点・スペース除去）
function normalizeText(str) {
    if (!str) return "";
    return str
        .replace(/[ァ-ヶ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60)) // カタカナをひらがなに
        .replace(/[・\s　]/g, "") // 中点とスペースを完全に消去
        .toLowerCase(); // 英字を小文字に
}

window.onload = async function() {
    const CACHE_KEY = 'eorzea_furniture_data_final_v2';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
        allData = JSON.parse(cachedData);
        buildMenu();
        buildHome();
    } else {
        try {
            const response = await fetch(GAS_URL);
            let data = await response.json();
            let rawData = data.slice(1).reverse();
            allData = rawData.filter(item => {
                const id = item.ItemID || item['アイテムID'];
                return id && id.toString().trim() !== "";
            });
            localStorage.setItem(CACHE_KEY, JSON.stringify(allData));
            buildMenu();
            buildHome();
        } catch (e) { console.error("データ取得エラー:", e); }
    }
    showHome();
};

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

    // 最新パッチの特定（バッジ用）
    const latestPatch = Math.max(...allData.map(item => parseFloat(item.patch || item['パッチ']) || 0)).toString();

    next.forEach(item => {
        const itemPatch = (item.patch || item['パッチ'] || "").toString().trim();

        // 【追加！】前のアイテムとパッチが違ったら、見出し（セパレーター）を差し込む
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
                <img src="images/${itemId}_front.webp" class="slide-img active" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">
            </div>
            <p class="item-name">${item['アイテム名（日）'] || item.name}</p>
            <div class="card-flags">
                ${(dyeVal && dyeVal !== '不可') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-dye"><img src="ui/dye.png" alt="染色"></div>
                <span class="fixed-tooltip-content" data-tooltip="染色可能"></span></div>` : ''}
                ${(marketVal && marketVal !== '不可') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-market"><img src="ui/marketbord.png" alt="マケボ"></div>
                <span class="fixed-tooltip-content" data-tooltip="マケボ入手可能"></span></div>` : ''}
                ${(craftVal && craftVal !== '-' && craftVal !== '不可' && craftVal !== '') ? `
                <div class="tooltip-container"><div class="flag-diamond flag-craft"><img src="ui/craft.png" alt="製作"></div>
                <span class="fixed-tooltip-content" data-tooltip="製作可能"></span></div>` : ''}
                ${(shopVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-shop"><img src="ui/shop.png" alt="ショップ"></div>   
                <span class="fixed-tooltip-content" data-tooltip="NPCショップで購入or交換"></span></div>` : ''}
                ${(pvpVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-pvp"><img src="ui/pvp.png" alt="PvP"></div>
                <span class="fixed-tooltip-content" data-tooltip="PvP交換品"></span></div>` : ''}
                
                ${(pveVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-drop"><img src="ui/drop.png" alt="PvE"></div>
                <span class="fixed-tooltip-content" data-tooltip="ID、討滅戦、宝の地図、特殊フィールド探索等から入手可能"></span></div>` : ''}
                ${(retainerVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-retainer"><img src="ui/rite.png" alt="リテイナー"></div>
                <span class="fixed-tooltip-content" data-tooltip="リテイナーベンチャーで入手可能"></span></div>` : ''}
                ${(voyageVal === 'あり') ? `<div class="tooltip-container"><div class="flag-diamond flag-voyage"><img src="ui/voyger.png" alt="潜水艦"></div>
                <span class="fixed-tooltip-content" data-tooltip="潜水艦で入手可能"></span></div>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    currentIndex += itemsPerPage;
    isLoading = false;
}

async function openModalByIdx(originalIdx) {
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

    const photoArea = document.getElementById('modalPhoto');
    photoArea.innerHTML = `<img src="images/${itemId}_front.webp" id="mainModalImg" onerror="this.src='https://placehold.jp/200x200?text=NoImage'">`;

    // --- 左右切り替えボタンの表示制御 ---
    const idxInList = displayList.indexOf(item);
    // 最初のアイテムならPrevを隠す、最後ならNextを隠す
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
    // ドット更新関数
    function updateDots(total, current) {
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

// --- 左右ボタンのイベント設定（215行目付近から差し替え） ---
    const prevBtn = document.querySelector('.nav-prev');
    const nextBtn = document.querySelector('.nav-next');

    if (prevBtn && nextBtn) {
    if (foundCount > 1 && isMobile) {
        // 【スマホかつ複数画像あり】
        // 1. 半円デザインを適用
        prevBtn.classList.add('semi-circle');
        nextBtn.classList.add('semi-circle');
        
        // 2. スマホ版は「同じ家具内の画像切り替え」を優先
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            changeInternalImage(itemId, suffixList, -1, foundCount);
        };
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            changeInternalImage(itemId, suffixList, 1, foundCount);
        };
    } else {
        // 【PC版】または【スマホで画像が1枚しかない時】
        // 1. 半円デザインを解除
        prevBtn.classList.remove('semi-circle');
        nextBtn.classList.remove('semi-circle');
        
        // 2. 「次の家具・前の家具」へ移動する（closeModalを挟まない！）
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            const idxInList = displayList.indexOf(item);
            if (idxInList > 0) {
                // 直接 openModalByIdx を呼ぶことで、Homeに戻らず切り替わる
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
        
// スマホ用：モーダル内の画像だけを切り替える関数
    async function changeInternalImage(itemId, list, direction, total) {
        const mainImg = document.getElementById('mainModalImg');
        const currentSrc = mainImg.src;
        
        // 現在のサフィックスを特定
        let currentIndex = -1;
        const activeSuffixes = []; // 実際に存在するサフィックスだけのリストを作る
        
        // 存在する画像だけを抽出（同期的に判定し直すのは重いので、表示中の要素から判断）
        const thumbs = document.querySelectorAll('.thumb-nav img');
        thumbs.forEach((img, idx) => {
            if (currentSrc.includes(img.src)) currentIndex = idx;
        });

        let nextIdx = (currentIndex + direction + thumbs.length) % thumbs.length;
        const targetImg = thumbs[nextIdx];
        
        // 画像とドットとサムネイルのactive状態を更新
        mainImg.src = targetImg.src;
        updateDots(total, nextIdx);
        thumbs.forEach(t => t.classList.remove('active'));
        targetImg.classList.add('active');
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
    
    // 画像エリアのすぐ下に挿入
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
    // 1. Nozomi選定：和モダン・アイコン対応表
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

    // 2. HTML生成：アイコンを「上」、文字を「下」に配置
    document.getElementById('home-cat-list').innerHTML = cats.map(c => {
        const iconName = categoryIcons[c] || "inventory_2";
        return `
            <div class="cat-card" onclick="filterBy('category', '${c}')">
                <span class="material-symbols-rounded">${iconName}</span>
                <span class="cat-name">${c}</span>
            </div>`;
    }).join('');
}


function showHome() { 
    document.getElementById('home-view').style.display='block'; 
    document.getElementById('catalog-view').style.display='none'; 
}

function buildMenu() {
    let cats = [...new Set(allData.map(i => i.category))].filter(Boolean);
    cats = cats.sort((a,b) => (CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)));
    document.getElementById('side-cat-list').innerHTML = cats.map(c => {
        
        let subs = [...new Set(allData.filter(i => i.category === c).map(i => i['FF14サブカテゴリー']))].filter(Boolean);
        
        subs.sort((a, b) => {
            let indexA = SUB_CATEGORY_ORDER.indexOf(a);
            let indexB = SUB_CATEGORY_ORDER.indexOf(b);
            
            // リストにないものは一番後ろ（大きな数値）にする
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

    // 1. 【修正】他の開いているメニューをすべて探して閉じる
    document.querySelectorAll('.sub-menu.open').forEach(el => {
        if (el !== sub) {
            el.classList.remove('open');
            // 他が閉じる時も「ぬるっ」とさせるためにmax-heightを0にする
            el.style.maxHeight = '0'; 
        }
    });

    // 2. 【メイン】クリックされたメニューの開閉
    const isOpen = sub.classList.contains('open');
    if (!isOpen) {
        sub.classList.add('open');
        // 自分のmax-heightを1000pxにして「ぬるっ」と開く
        sub.style.maxHeight = '1000px';
        
        // フィルター実行（既存のロジック）
        if (val && val.startsWith('patch-group:')) {
            filterBy('patch-group', val.split(':')[1]);
        } else if (val && val !== 'all') {
            filterBy('category', val);
        }
    } else {
        // すでに開いているものをもう一度押したら閉じる
        sub.classList.remove('open');
        sub.style.maxHeight = '0';
    }
}

function filterBy(type, val, sub = 'all') {
    currentFilter = { type, value: val, subValue: sub };
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    let title = val;
    if(type === 'patch-group') title = (PACKAGE_NAMES[val] || val) + ` (${val}.x)`;
    else if(type === 'patch') title = formatPatch(val);
    document.getElementById('view-title').innerText = title;
    updateTopTags();
    render();
    window.scrollTo(0,0);
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

    // コンテナの開閉（ぬるっと動く用）
    container.classList.toggle('open');
    
    // 矢印の回転用クラスを付け外し
    arrow.classList.toggle('is-rotated');
}

function render() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    currentIndex = 0;

    displayList = allData.filter(item => {
        // --- 検索モードなどはそのまま ---
        if (currentFilter.type === 'search') {
            const sKey = normalizeText(currentFilter.value);
            const itemName = normalizeText(item['アイテム名（日）'] || item.name || "");
            return itemName.includes(sKey);
        }
        // --- 【修正！】パッチごとのフィルタリング ---
        if (currentFilter.type === 'patch') {
            const itemPatch = (item.patch || "").toString().replace('Patch', '').trim();
            const filterValue = currentFilter.value.toString().replace('Patch', '').trim();            
            // 例: ボタンが「7.4」なら、「7.4」で始まるパッチ（7.4、7.45など）をすべて通す
            return itemPatch.startsWith(filterValue);
        }
        // --- カテゴリー判定などはそのまま ---
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
        if (!val) return; // 空欄なら何もしない

        // 1. フィルター状態を「検索モード」にする
        currentFilter = { type: 'search', value: val, subValue: 'all' };

        // 2. 画面の表示切り替え（ここが重要！）
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('catalog-view').style.display = 'block';
        
        // 3. タイトルを「検索結果: 〇〇」に変更
        document.getElementById('view-title').innerText = `検索結果: ${val}`;
        
        // 4. カテゴリ用タグエリアを一旦空にする（検索結果画面の見た目用）
        document.getElementById('tag-area').innerHTML = '';

        // 5. 描画を実行
        render();
        
        // 6. 画面の一番上へスクロール
        window.scrollTo(0, 0);
    }
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// スクロールイベントを一つに集約
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
        // 1. 画像UP済みが TRUE のものだけを抜き出す
        // data.slice(1) を入れることでスプシの見出し行を除外します
        let rawData = data.slice(1).reverse(); 
        allData = rawData.filter(item => {
            return item['画像UP済み'] === true || item['画像UP済み'] === "TRUE";
        });

        // 2. メニューとHome画面を構築する（ここが正解！）
        buildMenu();
        buildHome();
        showHome(); 
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

/* --- スワイプ切り替え機能 --- */
let touchStartX = 0;
let touchEndX = 0;

const modalContent = document.querySelector('.book-layout');

modalContent.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

modalContent.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    const threshold = 50; // 50px以上動かしたらスワイプとみなす

    if (swipeDistance > threshold) {
        // 右にスワイプ ＝ 前のアイテムへ
        changeModalItem(-1);
    } else if (swipeDistance < -threshold) {
        // 左にスワイプ ＝ 次のアイテムへ
        changeModalItem(1);
    }
}

// --- セクション切り替え用の関数 ---

function showAbout() {
    const homeSection = document.getElementById('home-section');
    const aboutSection = document.getElementById('about-section');

    if (homeSection) homeSection.style.display = 'none';
    if (aboutSection) {
        // CSSで !important をつけて隠している場合に対応
        aboutSection.setAttribute('style', 'display: block !important');
    }
    
    // スマホの場合はサイドバーを閉じる
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
    // ページトップへ戻す（任意）
    window.scrollTo(0, 0);
}

window.onload = () => {
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => {
            // ...既存のフィルタリング処理...
            let rawData = data.slice(1).reverse(); 
            allData = rawData.filter(item => {
                return item['画像UP済み'] === true || item['画像UP済み'] === "TRUE";
            });

            buildMenu();
            buildHome();
            showHome(); 

            // --- 【追加】読み込みが終わったらロード画面を消す ---
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.style.opacity = '0'; // ふわっと消す
                setTimeout(() => {
                    loader.style.display = 'none'; // 完全に除去
                }, 500); // transitionの時間と合わせる
            }
        })
        .catch(e => {
            console.error("データ取得エラー:", e);
            // エラー時も幕が残り続けると何もできなくなるので消す
            document.getElementById('loading-screen').style.display = 'none';
        });
};
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Furniture Post for Eorzea</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    
    <link rel="stylesheet" href="styles.css" />
</head>
<body>

<div id="loading-screen">
    <div class="spinner"></div>
    <p class="loading-text">Loading...</p>
</div>
    
<button id="menu-toggle" onclick="toggleSidebar()">
    <span class="material-symbols-rounded">menu</span>
</button>
    <div id="sidebar-overlay" onclick="toggleSidebar()"></div>

<nav id="sidebar">
    <div class="sidebar-mobile-header">
        <h1 style="font-family: 'Patrick Hand', cursive; font-size: 1.5rem; margin:0;">Main menu</h1>
            <button id="menu-close" onclick="toggleSidebar()">
                <span class="material-symbols-rounded">close</span>
            </button>
    </div>

     <div class="nav-group">
    <span class="nav-label">General</span>
    <button class="nav-item-parent active" id="btn-home" onclick="showHome()">
        <span><i class="fa-solid fa-house" style="margin-right:8px;"></i>Home</span>
    </button>
    <button class="nav-item-parent" id="btn-about" onclick="showAbout()">
        <span><i class="fa-solid fa-circle-info" style="margin-right:8px;"></i>About Me</span>
    </button>
</div>
        
    <div class="nav-group">
        <span class="nav-label">Categories</span>
        <div id="side-cat-list"></div>
    </div>

    <div class="nav-group">
        <span class="nav-label">Patch Version</span>
        <div id="side-patch-list"></div>
     </div>

</nav>
    
<main id="main-content">
    <div id="home-view">
        <h1>Furniture <span class="accent-p">P</span>ost for Eorzea</h1>
        <div class="search-box">
           <input type="text" id="homeSearch" placeholder="家具の名前で検索..." onkeydown="handleSearch(event)">
        </div>
        <div class="home-cat-grid" id="home-cat-list"></div>
    </div>

    <div id="catalog-view" style="display: none;">
        <div class="sticky-header">
            <div class="back-to-home" onclick="showHome()"><i class="fa-solid fa-chevron-left"></i> Homeへ戻る</div>
            <h2 id="view-title" style="margin:0 0 15px; color:var(--primary-color);"></h2>
            <div class="tag-container">
                <div class="tag-area" id="tag-area"></div>
            </div>
        </div>
        <div class="content-body">
            <div class="grid" id="grid"></div>
        </div>
    </div>
    
    <div id="about-view" style="display: none;">
    
    <div class="about-watermark">About Me</div>

    <div class="about-letter-scaler">
        <div class="about-letter-card">
            <h2 class="letter-title">About This Site</h2>
            <div class="letter-text">
        <p>
            このサイト『FF14ハウジング』は、FF14（FINAL FANTASY XIV）のハウジング家具をまとめた、非公式ファンサイトです。<br>
            エオルゼアの世界を彩る調度品や庭具のスクリーンショットをカタログ形式でまとめています。
        </p>
        <p>
            掲載している画像は管理人が一点ずつ撮影しているため、更新はゆっくりとなりますが、ハウジングを愛する方々、また初めてハウジングに触れる方にも、使いやすく見やすいサイトを目指しております。
        </p>
        <h3 style="margin-top: 40px; color: #8b795e; font-size: 1.1rem; border-left: 3px solid #e2d7c5; padding-left: 10px;">
            How to Use</h3>
        <div class="how-to-item" style="margin-bottom: 20px;">
            <p><strong>1. カテゴリーから探す</strong><br>
            <span style="font-size: 0.9rem;">サイドバーやHome画面のアイコンから、「卓上」「壁掛」などの種別ごとに一覧を表示できます。</span></p>
        </div>

        <div class="how-to-item" style="margin-bottom: 20px;">
            <p><strong>2. サブカテゴリーフィルター</strong><br>
            <span style="font-size: 0.9rem;">画面上部のサブカテゴリーボタンをクリックすることで、簡単に絞り込みができます。</span></p>
        </div>
                
        <div class="how-to-item" style="margin-bottom: 20px;">
            <p><strong>3. アイコンバッチ</strong><br>
            <span style="font-size: 0.9rem;">家具カードの右下についているアイコンバッチを見ることで、簡単な情報がわかります。<br>
                アイコンバッチにマウスカーソルを合わせると、アイコンバッチが何を示しているのかがわかります。<br>
                （スマホの場合はタッチしてください）</span></p>
        </div>

        <div class="how-to-item" style="margin-bottom: 20px;">
            <p><strong>4. 実装時期で絞り込む</strong><br>
            <span style="font-size: 0.9rem;">最新のパッチから過去のアップデートまで、実装された時期を指定して探すことが可能です。</span></p>
        </div>
                
        <h3 style="margin-top: 40px; color: #8b795e; font-size: 1.1rem;">ご利用にあたって</h3>
        <p style="font-size: 0.9rem; color: #666;">
            ・当サイトはJavaScriptを使用して動作しています。正常に表示されない場合は、ブラウザの設定でJavaScriptをONにしてご覧ください。<br>
            ・コンテンツの内容に関しては、その妥当性や正確性を保証するものではありません。当サイトの利用により発生したトラブル等について、管理人は一切の責任を負いかねますことを予めご了承ください。<br>
            ・情報の間違いや、ご意見ご要望等がある方は、下記のメッセージフォームをご利用ください。
        </p>
        <hr style="border: none; border-top: 1px dashed #e2d7c5; margin: 20px 0;">
        <div class="contact-section" style="margin-top: 30px;">
    <h3 style="color: #8b795e; font-size: 1.1rem; margin-bottom: 20px; text-align: center;">Message Form</h3>
    
    <form id="message-form" class="custom-form">
        <div class="form-group">
            <label>題名</label>
            <select name="subject" required>
                <option value="" disabled selected>選択してください</option>
                <option value="ご意見">ご意見</option>
                <option value="こんな機能が欲しい">こんな機能が欲しい</option>
                <option value="その他">その他</option>
            </select>
        </div>

        <div class="form-group">
            <label>メッセージ本文 (任意)</label>
            <textarea name="message" rows="5" placeholder="こちらに入力してください"></textarea>
        </div>

        <div style="text-align: center; margin-top: 20px;">
            <button type="submit" id="submit-btn" class="form-submit-btn">送信</button>
        </div>
    </form>
    
    <div id="form-response" style="display:none; text-align:center; color:#5a79a5; margin-top:20px;">
        メッセージを送信しました。ありがとうございます！
    </div>
</div>

        <hr style="border: none; border-top: 1px dashed #e2d7c5; margin: 40px 0;">

        <div class="copyright-section" style="font-size: 0.8rem; color: #888; line-height: 1.6;">
            <p>© SQUARE ENIX CO., LTD. All Rights Reserved.</p>
            <p>
                記載されている会社名・製品名・システム名などは、各社の商標、または登録商標です。
            </p>
        </div>
    </div>
    </div>
    </div>

    
</div>
</main>

<div id="itemModal" class="modal" onclick="closeModal()">

    <div class="modal-nav nav-prev" onclick="event.stopPropagation(); changeModalItem(-1)">
        <i class="fa-solid fa-chevron-left"></i>
    </div>
    <div class="modal-nav nav-next" onclick="event.stopPropagation(); changeModalItem(1)">
        <i class="fa-solid fa-chevron-right"></i>
    </div>
    
        <div class="book-layout" onclick="event.stopPropagation()">
            <span class="close-modal" onclick="closeModal()">&times;</span>
            <div class="book-right">
                <div id="modalPhoto"></div>
            </div>
            <div class="book-left">
        <h2 id="modalTitle" style="margin-top:0; color:var(--primary-color);"></h2>

        <div id="modalCategoryArea" style="margin-bottom: 20px; display: flex; gap: 5px;">
            <span id="modalMainCategory" class="tag-badge"></span>
            <span id="modalSubCategory" class="tag-badge"></span>
        </div>

        <hr class="modal-divider">

        <div class="status-grid">
            <div class="status-item"><span>染色</span><span id="modalDye"></span></div>
            <div class="status-item"><span>マケボ取引</span><span id="modalMarket"></span></div>
            <div class="status-item"><span>製作</span><span id="modalCraft"></span></div>
        </div>

        <div class="info-section">
            <h3 class="section-title">
            <span class="symbol">✦</span> 入手方法 <span class="symbol">✦</span>
        </h3>
            <div id="modalHowToGet" class="section-content"></div>
        </div>

        <hr class="modal-divider">

        <div class="info-section">
            <h3 class="section-title">
            <span class="symbol">✦</span> 備考 <span class="symbol">✦</span>
        </h3>
            <div id="modalComment" class="section-content"></div>
        </div>
    </div> </div> </div>

<script src="script.js"></script>
    
    <div id="backToTop" onclick="scrollToTop()"><i class="fa-solid fa-chevron-up"></i></div>
</body>
</html>
