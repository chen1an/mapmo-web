// ==========================================================================
// MapMo Web - Script Logic (Swiper 3D Coverflow, Mosaic Toggle, Native App Map)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // 0. 響應式導覽列狀態機與鍵盤/觸控無障礙支援
    initResponsiveNavbar();
    initAccessibleFlipCards();

    // 1. Initialize Swiper 3D Coverflow Carousel (依據 PDF Page 3 方案一 視覺效果)
    let quotesSwiper = null;
    if (typeof Swiper !== 'undefined' && document.querySelector('.quotes-swiper')) {
        quotesSwiper = new Swiper('.quotes-swiper', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            loop: true,
            speed: 600,
            autoplay: {
                delay: 3500,
                disableOnInteraction: false,
            },
            coverflowEffect: {
                rotate: 0,
                stretch: 0,
                depth: 180,
                modifier: 1.5,
                slideShadows: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
    }

    // 2. Coverflow vs Mosaic Mode Toggle Logic (依據 PDF Page 3 方案一 vs Page 5 方案二 切換)
    const btnCoverflow = document.getElementById('btnCoverflow');
    const btnMosaic = document.getElementById('btnMosaic');
    const coverflowContainer = document.getElementById('coverflowContainer');
    const mosaicContainer = document.getElementById('mosaicContainer');

    if (btnCoverflow && btnMosaic && coverflowContainer && mosaicContainer) {
        btnCoverflow.addEventListener('click', () => {
            btnCoverflow.classList.add('active');
            btnMosaic.classList.remove('active');
            coverflowContainer.style.display = 'block';
            mosaicContainer.style.display = 'none';
            if (quotesSwiper) quotesSwiper.update();
        });

        btnMosaic.addEventListener('click', () => {
            btnMosaic.classList.add('active');
            btnCoverflow.classList.remove('active');
            coverflowContainer.style.display = 'none';
            mosaicContainer.style.display = 'block';
        });
    }

    // 3. FAQ Accordion + Deep-Link Anchor Auto-Expand Logic
    const faqItems = Array.from(document.querySelectorAll('.faq-item'));
    if (faqItems.length > 0) {
        let hashHighlightTimer = null;
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const setFaqState = (targetItem, expand) => {
            faqItems.forEach(item => {
                const shouldOpen = Boolean(expand && item === targetItem);
                item.classList.toggle('active', shouldOpen);
                const btn = item.querySelector('.faq-question');
                if (btn) btn.setAttribute('aria-expanded', String(shouldOpen));
            });
        };

        faqItems.forEach(item => {
            const questionBtn = item.querySelector('.faq-question');
            if (!questionBtn) return;
            questionBtn.setAttribute('aria-expanded', String(item.classList.contains('active')));
            questionBtn.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                setFaqState(item, !wasActive);
            });
        });

        const openFaqByHash = (hashStr, shouldScroll = true) => {
            const cleanId = decodeURIComponent((hashStr || '').replace(/^#/, '')).trim();
            if (!cleanId) return;
            const target = document.getElementById(cleanId);
            if (!target || !target.classList.contains('faq-item')) return;

            setFaqState(target, true);
            faqItems.forEach(item => item.classList.remove('is-hash-target'));
            target.classList.add('is-hash-target');
            clearTimeout(hashHighlightTimer);
            hashHighlightTimer = setTimeout(() => {
                target.classList.remove('is-hash-target');
            }, 2200);

            if (shouldScroll) {
                requestAnimationFrame(() => {
                    target.scrollIntoView({
                        behavior: reducedMotionQuery.matches ? 'auto' : 'smooth',
                        block: 'start'
                    });
                });
            }
        };

        if (window.location.hash) {
            openFaqByHash(window.location.hash, true);
        }

        window.addEventListener('hashchange', () => {
            openFaqByHash(window.location.hash, true);
        });

        // 同頁點擊 Footer 錨點（包含重複點擊當前 hash）時立即定位並展開
        document.querySelectorAll('a[href^="faq.html#"], a[href^="#faq-"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href') || '';
                const hashPart = href.includes('#') ? '#' + href.split('#')[1] : '';
                if (!hashPart) return;
                const target = document.getElementById(hashPart.slice(1));
                if (target && target.classList.contains('faq-item')) {
                    e.preventDefault();
                    if (window.location.hash !== hashPart) {
                        history.replaceState(null, '', hashPart);
                    }
                    openFaqByHash(hashPart, true);
                }
            });
        });
    }

    // 4. Mobile Menu Toggle -> 統一交由 initResponsiveNavbar() 管理狀態機、外部點擊與 Esc 鍵關閉

    // 4.5 Features S-Curve Dashed Path & Single Walking Pin Follower (小人隨滾輪沿虛線向下移動，絕不壓字卡)
    function initFeaturesCurve() {
        const wrapper = document.querySelector('.features-path-wrapper');
        const path = document.getElementById('featuresPath');
        const anchors = document.querySelectorAll('.feat-curve-anchor');
        const rows = document.querySelectorAll('.feat-row');
        const walkingPin = document.getElementById('walkingPinFollower');
        if (!wrapper || !path || anchors.length < 4 || !walkingPin) return;

        let pathLength = 0;
        let milestoneProgresses = [0.12, 0.38, 0.62, 0.88];
        let targetProgress = 0;
        let currentProgress = 0;
        let isAnimating = false;

        function updateCurve() {
            const wrapRect = wrapper.getBoundingClientRect();
            if (wrapRect.width === 0) return;

            const pts = Array.from(anchors).map(anchor => {
                const r = anchor.getBoundingClientRect();
                return {
                    x: (r.left + r.width / 2) - wrapRect.left,
                    y: (r.top + r.height / 2) - wrapRect.top
                };
            });

            // Phone (< 640px) collapses into a clean single-column left vertical timeline;
            // Tablet/Desktop preserves the alternating S-curve between left/right anchors.
            const isCompact = window.innerWidth < 640;
            const xMid = isCompact ? pts[0].x : (pts[0].x + pts[1].x) / 2;
            const topH = isCompact ? 42 : 115;
            const botH = isCompact ? 42 : 115;

            // Start point (top center) and End point (bottom center)
            const startX = xMid;
            const startY = pts[0].y - topH;
            const endX = xMid;
            const endY = pts[3].y + botH;

            // Harmonic Sinusoidal Bezier S-Curve with zero kinks, zero bulges, zero overshoot
            const dyTop = topH * 0.4;
            const topCp1x = xMid + (pts[0].x - xMid) * 0.4;
            const topCp1y = startY + dyTop;
            const topCp2x = pts[0].x;
            const topCp2y = pts[0].y - dyTop;

            const dy01 = (pts[1].y - pts[0].y) * 0.4;
            const cp1x = pts[0].x;
            const cp1y = pts[0].y + dy01;
            const cp2x = pts[1].x;
            const cp2y = pts[1].y - dy01;

            const dy12 = (pts[2].y - pts[1].y) * 0.4;
            const cp3x = pts[1].x;
            const cp3y = pts[1].y + dy12;
            const cp4x = pts[2].x;
            const cp4y = pts[2].y - dy12;

            const dy23 = (pts[3].y - pts[2].y) * 0.4;
            const cp5x = pts[2].x;
            const cp5y = pts[2].y + dy23;
            const cp6x = pts[3].x;
            const cp6y = pts[3].y - dy23;

            const dyBot = botH * 0.4;
            const botCp1x = pts[3].x;
            const botCp1y = pts[3].y + dyBot;
            const botCp2x = xMid - (pts[3].x - xMid) * 0.4;
            const botCp2y = endY - dyBot;

            const d = `M ${startX} ${startY} ` +
                      `C ${topCp1x} ${topCp1y}, ${topCp2x} ${topCp2y}, ${pts[0].x} ${pts[0].y} ` +
                      `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[1].x} ${pts[1].y} ` +
                      `C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${pts[2].x} ${pts[2].y} ` +
                      `C ${cp5x} ${cp5y}, ${cp6x} ${cp6y}, ${pts[3].x} ${pts[3].y} ` +
                      `C ${botCp1x} ${botCp1y}, ${botCp2x} ${botCp2y}, ${endX} ${endY}`;

            path.setAttribute('d', d);
            pathLength = path.getTotalLength();

            if (pathLength > 0) {
                milestoneProgresses = pts.map(pt => {
                    let bestLen = 0;
                    let minDist = Infinity;
                    const steps = 150;
                    for (let s = 0; s <= steps; s++) {
                        const l = (s / steps) * pathLength;
                        const p = path.getPointAtLength(l);
                        const distSq = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2;
                        if (distSq < minDist) {
                            minDist = distSq;
                            bestLen = l;
                        }
                    }
                    return bestLen / pathLength;
                });
            }

            updatePinPosition();
        }

        function calcScrollProgress() {
            if (!rows || rows.length < 4 || pathLength === 0) return;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            const viewFocus = scrollY + window.innerHeight * 0.5;

            // Absolute document Y positions of each feature card row
            const y0 = rows[0].getBoundingClientRect().top + scrollY + rows[0].offsetHeight / 2;
            const y1 = rows[1].getBoundingClientRect().top + scrollY + rows[1].offsetHeight / 2;
            const y2 = rows[2].getBoundingClientRect().top + scrollY + rows[2].offsetHeight / 2;
            const y3 = rows[3].getBoundingClientRect().top + scrollY + rows[3].offsetHeight / 2;

            const m0 = milestoneProgresses[0] || 0.12;
            const m1 = milestoneProgresses[1] || 0.38;
            const m2 = milestoneProgresses[2] || 0.62;
            const m3 = milestoneProgresses[3] || 0.88;

            const entryY = y0 - 180;
            const exitY = y3 + 180;

            let target = 0;
            if (viewFocus <= entryY) {
                target = 0;
            } else if (viewFocus <= y0) {
                target = ((viewFocus - entryY) / (y0 - entryY)) * m0;
            } else if (viewFocus <= y1) {
                target = m0 + ((viewFocus - y0) / (y1 - y0)) * (m1 - m0);
            } else if (viewFocus <= y2) {
                target = m1 + ((viewFocus - y1) / (y2 - y1)) * (m2 - m1);
            } else if (viewFocus <= y3) {
                target = m2 + ((viewFocus - y2) / (y3 - y2)) * (m3 - m2);
            } else if (viewFocus <= exitY) {
                target = m3 + ((viewFocus - y3) / (exitY - y3)) * (1.0 - m3);
            } else {
                target = 1.0;
            }

            targetProgress = Math.max(0, Math.min(1, target));

            // 配合滾輪滑動與小人移動：字卡依序浮現 (Reveal)
            updateCardsReveal();

            if (!isAnimating) {
                isAnimating = true;
                requestAnimationFrame(smoothPinMovement);
            }
        }

        function updateCardsReveal() {
            rows.forEach((row, idx) => {
                const card = row.querySelector('.feat-float-card');
                if (!card) return;

                const currM = milestoneProgresses[idx] || (idx * 0.25 + 0.12);
                const prevM = idx === 0 ? 0 : (milestoneProgresses[idx - 1] || ((idx - 1) * 0.25 + 0.12));
                // 滾輪滑動抵達前約 20% 區間即開始優雅浮現
                const revealThreshold = prevM + (currM - prevM) * 0.20;
                const unrevealThreshold = Math.max(0, revealThreshold - 0.04);

                if (targetProgress >= revealThreshold) {
                    card.classList.add('feat-revealed');
                } else if (targetProgress <= unrevealThreshold) {
                    card.classList.remove('feat-revealed');
                }
            });
            updateCardsStep();
        }

        function updateCardsStep() {
            rows.forEach((row, idx) => {
                const card = row.querySelector('.feat-float-card');
                if (!card) return;
                const currM = milestoneProgresses[idx] || (idx * 0.25 + 0.12);
                // 小人移動抵達該卡片錨點時觸發聚焦高亮
                if (card.classList.contains('feat-revealed') && Math.abs(currentProgress - currM) < 0.11) {
                    card.classList.add('active-step');
                } else {
                    card.classList.remove('active-step');
                }
            });
        }

        function smoothPinMovement() {
            const diff = targetProgress - currentProgress;
            if (Math.abs(diff) > 0.0005) {
                currentProgress += diff * 0.16; // 自然滑順跟隨
                updatePinPosition();
                updateCardsStep();
                requestAnimationFrame(smoothPinMovement);
            } else {
                currentProgress = targetProgress;
                updatePinPosition();
                updateCardsStep();
                isAnimating = false;
            }
        }

        function updatePinPosition() {
            if (pathLength === 0) return;
            const clampedP = Math.max(0, Math.min(1, currentProgress));
            const pt = path.getPointAtLength(clampedP * pathLength);
            walkingPin.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
            walkingPin.style.opacity = '1';
        }

        let curveResizeFrame = null;
        const scheduleCurveRefresh = () => {
            if (curveResizeFrame) cancelAnimationFrame(curveResizeFrame);
            curveResizeFrame = requestAnimationFrame(() => {
                curveResizeFrame = null;
                updateCurve();
                calcScrollProgress();
            });
        };

        updateCurve();
        calcScrollProgress();
        if (typeof ResizeObserver !== 'undefined') {
            const curveObserver = new ResizeObserver(scheduleCurveRefresh);
            curveObserver.observe(wrapper);
        }
        window.addEventListener('resize', scheduleCurveRefresh, { passive: true });
        window.addEventListener('scroll', calcScrollProgress, { passive: true });
        setTimeout(() => { updateCurve(); calcScrollProgress(); }, 150);
        setTimeout(() => { updateCurve(); calcScrollProgress(); }, 600);
    }

    initFeaturesCurve();

    // 4.6 樹洞來信・晨霧手繪信箋浮層 (Option 3: Ambient Rice-Paper Letter Modal)
    function initLetterModal() {
        const overlay = document.getElementById('letterModalOverlay');
        const backdrop = document.getElementById('letterModalBackdrop');
        const card = document.getElementById('letterCard');
        const closeBtn = document.getElementById('letterCloseBtn');
        const dismissBtn = document.getElementById('letterDismissBtn');
        const quoteElem = document.getElementById('letterQuoteText');
        const tagElem = document.getElementById('letterTag');
        const responseElem = document.getElementById('letterResponseText');
        const marqueeContainer = document.querySelector('.marquee-rows-container');

        if (!overlay || !quoteElem) return;

        // 20 則心聲煩惱之情感共鳴資料庫 (MapMo 專屬溫暖回應)
        const quotesDatabase = {
            '「如果大家覺得不好笑，只有我覺得好笑，我還要 Po 嗎？」': {
                tag: '#社群眼光',
                color: '#B27B00',
                response: '在 MapMo，幽默不需要經過任何人的審查。只要能逗樂你自己，那就是最珍貴的瞬間。'
            },
            '「主管／同事／家人好像看得到，發摯友好了...算了，不發了。」': {
                tag: '#人際包袱',
                color: '#C0392B',
                response: '沒有通訊錄好友，沒有熟人眼光。在全匿名的地圖樹洞裡，卸下身分標籤做最真實的自己。'
            },
            '「他們是不是看到我的限時動態，在討論我啊？」': {
                tag: '#過度揣摩',
                color: '#1D4ED8',
                response: '告別被放大檢視的凝視。沒有追蹤者名單，沒有轉發議論，只有安靜安放回憶的土地。'
            },
            '「好麻煩喔...」': {
                tag: '#社交疲憊',
                color: '#4B5563',
                response: '發文不該是一場耗時的策展。拍張照、選個當下的心情，三秒鐘就能把真實情緒好好安置。'
            },
            '「這句話會不會太情緒勒索？我換個委婉一點的說法好了……算了，不發了。」': {
                tag: '#自我審查',
                color: '#BE185D',
                response: '情緒沒有對錯，脆弱同樣值得被溫柔以待。在 MapMo，你不必向任何人修飾你的真實感受。'
            },
            '「我這樣發是不是會被說跟風啊？」': {
                tag: '#群體焦慮',
                color: '#B27B00',
                response: '生活體驗是獨一無二的，感受沒有跟風之說。記錄下你當下的心跳，這就是專屬於你的地理足跡。'
            },
            '「都過十分鐘了，怎麼連一個愛心都沒有？」': {
                tag: '#按讚數焦慮',
                color: '#C0392B',
                response: '在 MapMo，我們徹底抹去了讚數與計數器。你的價值，從來不需要靠任何數字來認證。'
            },
            '「我其實沒有想給ＸＸＸ看耶...但是他身邊的朋友都會看到，這樣不就發現我隱藏他了...」': {
                tag: '#防禦社交',
                color: '#1D4ED8',
                response: '不必再費心設定分組與黑名單。全匿名零好友網絡，再也不必提心提膽擔心被識破。'
            },
            '「這篇貼文數據好差喔，我要刪掉。」': {
                tag: '#演算法奴隸',
                color: '#C0392B',
                response: '回憶不是流量競賽。在 MapMo，每一個地標都是恆久的個人足跡，沒有任何數據可以否定它的存在。'
            },
            '「如果沒人按讚怎麼辦？ 💬」': {
                tag: '#無聲焦慮',
                color: '#B27B00',
                response: '沒有按讚的世界，才有真正的自由。你留下的不是討好別人的表演，而是留給未來的時空膠囊。'
            },
            '「那個人看過了嗎？……看完了，但他沒按愛心，是不是覺得我很無聊？」': {
                tag: '#反饋內耗',
                color: '#BE185D',
                response: '切斷已讀標記與反饋猜測。把心意託付給座標，讓情緒回歸純粹的平靜。'
            },
            '「我這樣寫是不是容易被罵啊？」': {
                tag: '#言論防衛',
                color: '#C0392B',
                response: '零評論、零留言的安靜保護區。這裡沒有酸民與審判，只有安靜傾聽的地理樹洞。'
            },
            '「發這個會不會被覺得在炫耀啊？」': {
                tag: '#外界評價',
                color: '#B27B00',
                response: '生活裡的小確幸，值得好好被珍藏。在沒有熟人凝視的地方，分享快樂再也不是負擔。'
            },
            '「好煩喔，到底要選哪一首音樂...」': {
                tag: '#完美主義',
                color: '#059669',
                response: '沒有配樂焦慮，沒有排版競賽。回歸手繪溫暖質感的 MapMo，最動人的就是最自然的當下。'
            },
            '「為什麼大家限動都很精彩，只有我在這裡發無病呻吟的東西。」': {
                tag: '#社群櫥窗',
                color: '#1D4ED8',
                response: '社群的光鮮多半是剪裁過的櫥窗。在 MapMo，迷茫、低谷與無病呻吟，都是被允許且被守護的日常。'
            },
            '「這樣發會不會讓人覺得我在討拍啊？」': {
                tag: '#防衛心理',
                color: '#BE185D',
                response: '想被聽見不是討拍，而是人之常情。在匿名地圖上，你可以安心放下堅強，好好呼吸。'
            },
            '「我只是想抒發，到時候又一堆人來問，好煩喔，不想回。」': {
                tag: '#過量關心',
                color: '#4B5563',
                response: '有時我們只想說出來，不想應付過量的追問。零互動的 MapMo，只為你保留一個不被打擾的樹洞。'
            },
            '「我文案這樣寫會不會很裝啊？」': {
                tag: '#人設焦慮',
                color: '#B27B00',
                response: '沒有人設，就沒有包袱。卸下精心維持的面具，用最自在的字句對話自己。'
            },
            '「我為什麼每次半夜腦波弱都要發這種東西？明天早上一定後悔死。」': {
                tag: '#深夜後悔',
                color: '#1D4ED8',
                response: '夜晚的低語也是真實的你。專屬的情緒分類讓回憶沉澱，天亮後依然是平靜的足跡。'
            },
            '「喔！有人問我『還好嗎？』，但是我只是想抒發而已，早知道就不發了。」': {
                tag: '#被動應酬',
                color: '#C0392B',
                response: '不需要向任何人解釋『我怎麼了』。把情緒放進地標裡，無聲勝有聲。'
            }
        };

        let currentActiveChip = null;

        function openLetter(rawText, clickedChip) {
            const cleanText = rawText.trim();
            let matched = quotesDatabase[cleanText];
            if (!matched) {
                const foundKey = Object.keys(quotesDatabase).find(k => {
                    const normK = k.replace(/[「」\s💬]/g, '');
                    const normText = cleanText.replace(/[「」\s💬]/g, '');
                    return normK.includes(normText) || normText.includes(normK);
                });
                if (foundKey) matched = quotesDatabase[foundKey];
            }

            const data = matched || {
                tag: '#真實心聲',
                color: '#B27B00',
                response: '在 MapMo，我們徹底抹去讚數、追蹤與評論。讓情緒回歸純粹的安寧，靜靜安放在屬於你的地圖足跡中。'
            };

            // Highlight chip
            if (currentActiveChip) {
                currentActiveChip.classList.remove('is-selected');
            }
            if (clickedChip) {
                clickedChip.classList.add('is-selected');
                currentActiveChip = clickedChip;
            }

            // Pause marquee
            if (marqueeContainer) {
                marqueeContainer.classList.add('is-paused');
            }

            quoteElem.textContent = cleanText;
            tagElem.textContent = data.tag;
            tagElem.style.color = data.color;
            tagElem.style.borderColor = data.color + '55';
            tagElem.style.background = data.color + '18';
            responseElem.textContent = data.response;

            lockBodyScroll();
            overlay.classList.add('is-active');
            overlay.setAttribute('aria-hidden', 'false');
            if (closeBtn) {
                requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
            }
        }

        function closeLetter() {
            const chipToRestore = currentActiveChip;
            overlay.classList.remove('is-active');
            overlay.setAttribute('aria-hidden', 'true');
            unlockBodyScroll();
            if (marqueeContainer) {
                marqueeContainer.classList.remove('is-paused');
            }
            if (currentActiveChip) {
                currentActiveChip.classList.remove('is-selected');
                currentActiveChip = null;
            }
            if (chipToRestore && chipToRestore.getAttribute('tabindex') === '0') {
                chipToRestore.focus({ preventScroll: true });
            }
        }

        let isScrollLocked = false;
        let lockedScrollY = 0;

        function preventScrollEvent(e) {
            if (!isScrollLocked) return;
            const cardEl = e.target && e.target.closest ? e.target.closest('.letter-card') : null;
            if (cardEl && cardEl.scrollHeight > cardEl.clientHeight) {
                return;
            }
            e.preventDefault();
        }

        function enforceScrollPosition() {
            if (!isScrollLocked) return;
            if (window.scrollY !== lockedScrollY) {
                window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'instant' });
            }
        }

        function lockBodyScroll() {
            if (isScrollLocked) return;
            isScrollLocked = true;
            lockedScrollY = window.scrollY || window.pageYOffset || 0;
            window.addEventListener('wheel', preventScrollEvent, { passive: false });
            window.addEventListener('touchmove', preventScrollEvent, { passive: false });
            window.addEventListener('scroll', enforceScrollPosition, { passive: true });
        }

        function unlockBodyScroll() {
            if (!isScrollLocked) return;
            isScrollLocked = false;
            window.removeEventListener('wheel', preventScrollEvent);
            window.removeEventListener('touchmove', preventScrollEvent);
            window.removeEventListener('scroll', enforceScrollPosition);
        }

        // Attach click & keyboard activation to marquee quote chips
        document.querySelectorAll('.marquee-rows-container .marquee-track').forEach(track => {
            const trackChips = Array.from(track.querySelectorAll('.quote-chip'));
            const primaryCount = Math.ceil(trackChips.length / 2);

            trackChips.forEach((chip, index) => {
                const activateChip = (e) => {
                    e.stopPropagation();
                    const p = chip.querySelector('p');
                    openLetter(p ? p.textContent : chip.textContent, chip);
                };

                if (index < primaryCount) {
                    chip.setAttribute('role', 'button');
                    chip.setAttribute('tabindex', '0');
                    chip.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            activateChip(e);
                        }
                    });
                } else {
                    chip.setAttribute('aria-hidden', 'true');
                }

                chip.addEventListener('click', activateChip);
            });
        });

        // Close events
        if (backdrop) backdrop.addEventListener('click', closeLetter);
        if (closeBtn) closeBtn.addEventListener('click', closeLetter);
        if (dismissBtn) dismissBtn.addEventListener('click', closeLetter);

        const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
        document.addEventListener('keydown', (e) => {
            if (!overlay.classList.contains('is-active')) return;
            if (e.key === 'Escape') {
                closeLetter();
            } else if (scrollKeys.has(e.key)) {
                const letterCardEl = overlay.querySelector('.letter-card');
                const inScrollableCard = letterCardEl && letterCardEl.scrollHeight > letterCardEl.clientHeight && letterCardEl.contains(document.activeElement);
                if (!inScrollableCard) {
                    e.preventDefault();
                }
            }
        });
    }

    initLetterModal();

    // 5. Native App Style Leaflet Interactive Map
    const mapContainer = document.getElementById('interactiveMap');
    if (mapContainer && typeof L !== 'undefined') {
        // Center around Taipei 101 with attributionControl: false to REMOVE Leaflet copyright text completely
        const map = L.map('interactiveMap', {
            center: [25.0350, 121.5450],
            zoom: 13,
            zoomControl: false,
            scrollWheelZoom: false,
            attributionControl: false // Completely removes 'Leaflet | OpenStreetMap contributors' text!
        });
        let mapResizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(mapResizeTimer);
            mapResizeTimer = setTimeout(() => map.invalidateSize(), 150);
        }, { passive: true });

        // Use Standard OpenStreetMap Tiles (100% FREE, NO API KEY REQUIRED, ZERO WATERMARKS)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(map);

        // App Real Demo Posts Data with App Exact Colors
        const demoPosts = [
            {
                id: '1',
                title: '台北 101',
                emo: 'joy',
                emoLabel: '喜',
                icon: 'assets/joy.png',
                bgColor: '#fcf4d9',
                borderColor: '#fbbd04',
                color: '#fbbd04',
                lat: 25.033976,
                lng: 121.564537,
                content: '在 101 觀景台俯瞰夜晚的台北，萬家燈火讓人覺得溫暖而平靜。',
                date: '2026.08.28 20:15'
            },
            {
                id: '2',
                title: '西門町徒步區',
                emo: 'fun',
                emoLabel: '樂',
                icon: 'assets/fun.png',
                bgColor: '#fde4ef',
                borderColor: '#f48fb1',
                color: '#f48fb1',
                lat: 25.0421,
                lng: 121.5082,
                content: '週末的熱鬧街頭，聽著街頭藝人的吉他彈唱，默默在角落享受這份歡樂。',
                date: '2026.08.27 16:30'
            },
            {
                id: '3',
                title: '大安森林公園',
                emo: 'sad',
                emoLabel: '哀',
                icon: 'assets/sad.png',
                bgColor: '#dbe5fc',
                borderColor: '#4285f4',
                color: '#4285f4',
                lat: 25.0300,
                lng: 121.5358,
                content: '午後獨自坐在長椅上吹風，思考著未來的方向，這裡總是能包容我的情緒。',
                date: '2026.08.26 14:10'
            },
            {
                id: '4',
                title: '捷運忠孝復興站',
                emo: 'angry',
                emoLabel: '怒',
                icon: 'assets/angry.png',
                bgColor: '#fcdcd8',
                borderColor: '#ea4335',
                color: '#ea4335',
                lat: 25.0416,
                lng: 121.5438,
                content: '下班時間擠滿了人潮，雖然很煩躁，但看到大家都努力生活著，又覺得沒那麼氣了。',
                date: '2026.08.25 18:45'
            },
            {
                id: '5',
                title: '松山文創園區',
                emo: 'none',
                emoLabel: '無',
                icon: 'assets/none.png',
                bgColor: '#f0f0f0',
                borderColor: '#9e9e9e',
                color: '#9e9e9e',
                lat: 25.0438,
                lng: 121.5607,
                content: '古老木造建築與生態池，找個安靜的角落看看書，放空一整天。',
                date: '2026.08.24 11:20'
            }
        ];

        let markers = [];

        // Function to create MapMo App exact Pin Marker (pinBox + pinArrow pointing down)
        function createAppPinMarker(title, iconUrl, color) {
            return L.divIcon({
                className: 'custom-app-pin-marker',
                html: `
                    <div class="app-pin-wrapper">
                        <div class="app-pin-box" style="border-color: ${color};">
                            <div class="app-pin-icon-bg" style="background: ${color};">
                                <img src="${iconUrl}" class="app-pin-img" alt="emo">
                            </div>
                        </div>
                        <div class="app-pin-arrow" style="border-top-color: ${color};"></div>
                    </div>
                `,
                iconSize: [40, 48],
                iconAnchor: [20, 48]
            });
        }

        // Render Markers
        function renderMarkers(filterEmo = null) {
            // Clear existing
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            demoPosts.forEach(post => {
                if (filterEmo !== null && post.emo !== filterEmo) return;

                const marker = L.marker([post.lat, post.lng], {
                    icon: createAppPinMarker(post.title, post.icon, post.color)
                }).addTo(map);

                marker.bindPopup(`
                    <div class="app-popup-card">
                        <div class="popup-header" style="background: ${post.bgColor};">
                            <div style="width: 30px; height: 30px; border-radius: 15px; background: ${post.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <img src="${post.icon}" style="width: 18px; height: 18px; filter: brightness(0) invert(1);">
                            </div>
                            <div>
                                <h4 class="popup-title">${post.title}</h4>
                                <span class="popup-date">${post.date}</span>
                            </div>
                        </div>
                        <div class="popup-body">
                            <p class="popup-content">${post.content}</p>
                        </div>
                    </div>
                `, {
                    className: 'app-leaflet-popup',
                    maxWidth: 260
                });

                markers.push(marker);
            });
        }

        renderMarkers(null); // Default: show all posts

        // Emotion Filter Pills Toggle Logic (No 'All' button: click active -> toggle off to null / show all)
        let currentActiveEmo = null;
        const filterBtns = document.querySelectorAll('.app-emotion-bar .app-emo-pill');

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetEmo = btn.getAttribute('data-emo');

                if (currentActiveEmo === targetEmo) {
                    // Clicked ALREADY ACTIVE emotion -> Toggle OFF to null (show all)!
                    currentActiveEmo = null;
                    filterBtns.forEach(b => b.classList.remove('active'));
                } else {
                    // Clicked a new emotion -> Activate it!
                    currentActiveEmo = targetEmo;
                    filterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }

                renderMarkers(currentActiveEmo);
            });
        });
    }
});

// ════════════════════════════════════════════════════════════════════
// 響應式導覽列狀態機 (Single-Tree Navbar + Overflow Collapse Guard)
// ════════════════════════════════════════════════════════════════════
function initResponsiveNavbar() {
    const navbar = document.getElementById('navbar');
    const navContainer = navbar ? navbar.querySelector('.nav-container') : null;
    const navLinks = document.getElementById('navLinks');
    const menuToggle = document.getElementById('menuToggle');
    if (!navbar || !navContainer || !navLinks || !menuToggle) return;

    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');
    let collapsedAtWidth = 0;

    function syncMenuState(open) {
        navLinks.classList.toggle('open', open);
        menuToggle.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuToggle.setAttribute('aria-label', open ? '關閉選單' : '選單');
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = open ? 'fas fa-times' : 'fas fa-bars';
            icon.setAttribute('aria-hidden', 'true');
        }
    }

    function isCollapsedMode() {
        return mobileMediaQuery.matches || navbar.classList.contains('navbar--collapsed');
    }

    function measureNavbarOverflow() {
        if (mobileMediaQuery.matches) {
            navbar.classList.remove('navbar--collapsed');
            collapsedAtWidth = 0;
            return;
        }

        const currentWidth = navContainer.clientWidth;
        if (navbar.classList.contains('navbar--collapsed') && currentWidth <= collapsedAtWidth) {
            return;
        }

        navbar.classList.add('is-measuring');
        navbar.classList.remove('navbar--collapsed');

        const wrapsOrOverflows =
            navContainer.scrollWidth > currentWidth + 2 ||
            navLinks.scrollHeight > 54;

        if (wrapsOrOverflows) {
            navbar.classList.add('navbar--collapsed');
            collapsedAtWidth = currentWidth;
        } else {
            collapsedAtWidth = 0;
            syncMenuState(false);
        }

        requestAnimationFrame(() => navbar.classList.remove('is-measuring'));
    }

    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        syncMenuState(!navLinks.classList.contains('open'));
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (isCollapsedMode()) {
                syncMenuState(false);
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (navLinks.classList.contains('open') && !navbar.contains(e.target)) {
            syncMenuState(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            syncMenuState(false);
            menuToggle.focus();
        }
    });

    if (typeof ResizeObserver !== 'undefined') {
        const navObserver = new ResizeObserver(measureNavbarOverflow);
        navObserver.observe(navContainer);
    }

    const onMediaChange = () => {
        if (!isCollapsedMode()) syncMenuState(false);
        measureNavbarOverflow();
    };
    if (typeof mobileMediaQuery.addEventListener === 'function') {
        mobileMediaQuery.addEventListener('change', onMediaChange);
    } else if (typeof mobileMediaQuery.addListener === 'function') {
        mobileMediaQuery.addListener(onMediaChange);
    }

    window.addEventListener('resize', measureNavbarOverflow, { passive: true });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measureNavbarOverflow).catch(() => {});
    }
    measureNavbarOverflow();
}

// ════════════════════════════════════════════════════════════════════
// 故事翻轉卡無障礙與觸控體驗強化 (post.html)
// ════════════════════════════════════════════════════════════════════
function initAccessibleFlipCards() {
    const cards = document.querySelectorAll('.flip-card');
    if (!cards.length) return;

    cards.forEach(card => {
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
        if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', card.classList.contains('flipped') ? 'true' : 'false');

        card.addEventListener('click', () => {
            requestAnimationFrame(() => {
                card.setAttribute('aria-pressed', card.classList.contains('flipped') ? 'true' : 'false');
            });
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}
