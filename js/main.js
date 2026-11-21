/* SPDX-FileCopyrightText: 2026 uttii-com <https://uttii.com>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function () {
    "use strict";
    console.log("[FolderTemplate] Initializing FolderTemplate extension (dynamic reference mode)...");

    let lang = "ja";
    try {
        const loaded = window.OC?.InitialState?.loadState("foldertemplate", "lang");
        if (loaded === "en" || loaded === "ja") {
            lang = loaded;
        }
    } catch (e) {}

    const I18N = {
        ja: {
            defaultFolder: "フォルダ",
            modalCreateTitle: "フォルダをテンプレートにする",
            modalCreateDesc: (name) => `「<strong>${name}</strong>」をテンプレートとして登録します。<br>今後この元フォルダの内容を編集した場合、<strong>作成されるフォルダにも自動的に最新の内容が反映されます。</strong>`,
            tplNameLabel: "テンプレート名:",
            btnCancel: "キャンセル",
            btnSave: "テンプレートを保存",
            btnSaving: "登録中...",
            enterName: "テンプレート名を入力してください。",
            savedToast: (name) => "テンプレート「" + name + "」を登録しました（元フォルダの編集も自動反映されます）",
            saveFailed: "テンプレートの保存に失敗しました",
            commError: "通信エラーが発生しました。",
            creatingToast: (name) => "テンプレート「" + name + "」から最新フォルダを生成中...",
            createdToast: (name) => "最新の内容でフォルダ「" + name + "」を生成しました",
            createFailed: "フォルダの生成に失敗しました",
            createError: "フォルダ生成中にエラーが発生しました。",
            noTemplates: "登録されているテンプレートがありません。\n任意のフォルダを右クリックし、「⭐ このフォルダをテンプレートにする」から登録してください。",
            genFolderLabel: "生成フォルダ名:",
            btnGenerate: "生成する",
            modalInstTitle: "テンプレートからフォルダを作成",
            modalInstDesc: "生成するテンプレートを選択してください。元フォルダの<strong>最新の内容</strong>で新規フォルダが展開されます。",
            btnManage: "⚙️ テンプレートの管理...",
            btnClose: "閉じる",
            newMenuLabel: "テンプレートから作成",
            actionMakeTemplate: "⭐ このフォルダをテンプレートにする"
        },
        en: {
            defaultFolder: "Folder",
            modalCreateTitle: "Save as Folder Template",
            modalCreateDesc: (name) => `Register "<strong>${name}</strong>" as a folder template.<br>Future edits to this source folder will <strong>automatically reflect in newly created folders.</strong>`,
            tplNameLabel: "Template Name:",
            btnCancel: "Cancel",
            btnSave: "Save Template",
            btnSaving: "Saving...",
            enterName: "Please enter a template name.",
            savedToast: (name) => `Template "${name}" registered`,
            saveFailed: "Failed to save template",
            commError: "A communication error occurred.",
            creatingToast: (name) => `Creating folder from template "${name}"...`,
            createdToast: (name) => `Created folder "${name}" with latest contents`,
            createFailed: "Failed to create folder",
            createError: "An error occurred while creating the folder.",
            noTemplates: "No folder templates registered yet.\nRight-click any folder and select \"⭐ Save as folder template\" first.",
            genFolderLabel: "Source folder:",
            btnGenerate: "Create",
            modalInstTitle: "Create Folder from Template",
            modalInstDesc: "Select a template to deploy. A new folder will be created with the <strong>latest contents</strong> of the source folder.",
            btnManage: "⚙️ Manage Templates...",
            btnClose: "Close",
            newMenuLabel: "Create from template",
            actionMakeTemplate: "⭐ Save as folder template"
        }
    };

    const t = I18N[lang] || I18N.ja;

    function destroyOldToolbarButton() {
        document.querySelectorAll("#ft-toolbar-create-btn, .ft-toolbar-btn").forEach(el => {
            el.remove();
        });
    }
    destroyOldToolbarButton();
    setInterval(destroyOldToolbarButton, 1000);

    let cachedTemplates = [];

    const icons = {
        star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
        template: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm4 7l1.45 3.14L19 14.65l-2.5 2.24.71 3.41-3.21-1.84-3.21 1.84.71-3.41L9 14.65l3.55-.51L14 11z"/></svg>',
        create: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
    };

    async function loadRegisterFileAction() {
        const findInModule = (mod) => {
            if (!mod || typeof mod !== "object") return null;
            for (const val of Object.values(mod)) {
                if (typeof val === "function") {
                    const src = Function.prototype.toString.call(val);
                    if (
                        (src.includes("register:action") && src.includes("fileActions")) ||
                        src.includes("_nc_fileactions") ||
                        src.includes("Invalid file action")
                    ) {
                        return { registerFileAction: val };
                    }
                }
            }
            return null;
        };

        const scanLoadedChunks = async () => {
            const resources = performance.getEntriesByType("resource");
            const candidates = [...new Set(
                resources
                    .map((r) => r.name)
                    .filter((name) => name.includes("/dist/") && name.endsWith(".chunk.mjs"))
            )];
            for (const url of candidates) {
                try {
                    const mod = await import(url);
                    const found = findInModule(mod);
                    if (found) return found;
                } catch (ignored) {}
            }
            return null;
        };

        const registerViaScope = () => {
            const root = window._nc_files_scope;
            if (!root || typeof root !== "object") return null;
            const scope =
                root.v4_0 ||
                Object.values(root).find(
                    (s) => s && typeof s === "object" && (s.registry || s.fileActions)
                );
            if (!scope) return null;
            return {
                registerFileAction: (action) => {
                    if (!action || typeof action.id !== "string" || !action.id) {
                        throw new Error("Invalid id");
                    }
                    if (!(scope.fileActions instanceof Map)) {
                        scope.fileActions = new Map();
                    }
                    if (scope.fileActions.has(action.id)) return;
                    scope.fileActions.set(action.id, action);
                    if (scope.registry && typeof scope.registry.dispatchEvent === "function") {
                        scope.registry.dispatchEvent(
                            new CustomEvent("register:action", { detail: action })
                        );
                    }
                }
            };
        };

        for (let attempt = 0; attempt < 20; attempt++) {
            const found = await scanLoadedChunks();
            if (found) return found;
            const fallback = registerViaScope();
            if (fallback) return fallback;
            await new Promise((r) => setTimeout(r, 100));
        }
        return null;
    }

    async function fetchTemplates() {
        try {
            const res = await fetch(OC.generateUrl("/apps/foldertemplate/api/templates"), {
                headers: { "requesttoken": OC.requestToken }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                cachedTemplates = data.templates || [];
            }
        } catch (e) {
            console.error("[FolderTemplate] Failed to fetch templates:", e);
        }
        return cachedTemplates;
    }

    function getCurrentDirectory() {
        if (window.OCA?.Files?.App?.fileList?.getCurrentDirectory) {
            return window.OCA.Files.App.fileList.getCurrentDirectory();
        }
        const params = new URLSearchParams(window.location.search);
        if (params.get("dir")) {
            return params.get("dir");
        }
        if (window.location.hash) {
            const match = window.location.hash.match(/dir=([^&]+)/);
            if (match) return decodeURIComponent(match[1]);
        }
        return "/";
    }

    function showCreateTemplateModal(node) {
        const folderName = node.basename || node.name || t.defaultFolder;
        const folderPath = node.path || (node.dirname ? node.dirname + "/" + folderName : "/" + folderName);
        const fileId = node.fileid || node.id;

        let modal = document.getElementById("ft-create-modal");
        if (modal) modal.remove();

        modal = document.createElement("div");
        modal.id = "ft-create-modal";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
        modal.style.zIndex = "100000";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.backdropFilter = "blur(2px)";

        modal.innerHTML = `
            <div style="background: var(--color-main-background, #fff); color: var(--color-main-text, #222); width: 90%; max-width: 480px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 16px 20px; border-bottom: 1px solid var(--color-border, #ddd); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <span>⭐</span> ${escapeHtml(t.modalCreateTitle)}
                    </h3>
                    <button id="ft-create-close" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--color-text-maxcontrast, #666); padding: 4px;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <p style="margin: 0 0 14px 0; font-size: 0.9rem; color: var(--color-text-maxcontrast, #555);">
                        ${t.modalCreateDesc(escapeHtml(folderName))}
                    </p>
                    <div style="margin-bottom: 16px;">
                        <label for="ft-input-tpl-name" style="display: block; font-weight: bold; font-size: 0.9rem; margin-bottom: 6px;">${escapeHtml(t.tplNameLabel)}</label>
                        <input type="text" id="ft-input-tpl-name" value="${escapeHtml(folderName)}" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--color-border, #ccc); border-radius: 6px; font-size: 0.95rem;" />
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="ft-create-cancel" class="button" style="padding: 8px 16px; cursor: pointer;">${escapeHtml(t.btnCancel)}</button>
                        <button id="ft-create-submit" class="button primary" style="padding: 8px 20px; cursor: pointer; font-weight: bold;">${escapeHtml(t.btnSave)}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        document.getElementById("ft-create-close").addEventListener("click", close);
        document.getElementById("ft-create-cancel").addEventListener("click", close);
        modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

        const input = document.getElementById("ft-input-tpl-name");
        input.focus();
        input.select();

        document.getElementById("ft-create-submit").addEventListener("click", async () => {
            const name = input.value.trim();
            if (!name) {
                alert(t.enterName);
                return;
            }
            const submitBtn = document.getElementById("ft-create-submit");
            submitBtn.disabled = true;
            submitBtn.textContent = t.btnSaving;
            try {
                const res = await fetch(OC.generateUrl("/apps/foldertemplate/api/templates"), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "requesttoken": OC.requestToken
                    },
                    body: JSON.stringify({
                        folderPath: folderPath,
                        fileId: fileId,
                        name: name
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    cachedTemplates = data.templates || [];
                    close();
                    if (OC.Notification?.showTemporary) {
                        OC.Notification.showTemporary(t.savedToast(name));
                    }
                } else {
                    alert(data.error || t.saveFailed);
                    submitBtn.disabled = false;
                    submitBtn.textContent = t.btnSave;
                }
            } catch (e) {
                console.error("[FolderTemplate] Save failed:", e);
                alert(t.commError);
                submitBtn.disabled = false;
                submitBtn.textContent = t.btnSave;
            }
        });
    }

    async function instantiateTemplate(templateId, templateName) {
        const currentDir = getCurrentDirectory();
        if (OC.Notification?.showTemporary) {
            OC.Notification.showTemporary(t.creatingToast(templateName));
        }
        try {
            const res = await fetch(OC.generateUrl("/apps/foldertemplate/api/create-from-template"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "requesttoken": OC.requestToken
                },
                body: JSON.stringify({
                    templateId: templateId,
                    targetDir: currentDir
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const createdName = data.createdFolderName;
                if (OC.Notification?.showTemporary) {
                    OC.Notification.showTemporary(t.createdToast(createdName));
                }
                if (window.OCA?.Files?.App?.fileList?.reload) {
                    window.OCA.Files.App.fileList.reload();
                } else if (window.location.reload) {
                    setTimeout(() => {
                        if (window.OCA?.Files?.App?.fileList?.reload) {
                            window.OCA.Files.App.fileList.reload();
                        } else {
                            window.location.reload();
                        }
                    }, 500);
                }
            } else {
                alert(data.error || t.createFailed);
            }
        } catch (e) {
            console.error("[FolderTemplate] Instantiate failed:", e);
            alert(t.createError);
        }
    }

    async function showInstantiateModal() {
        await fetchTemplates();
        if (cachedTemplates.length === 0) {
            alert(t.noTemplates);
            return;
        }

        let modal = document.getElementById("ft-instantiate-modal");
        if (modal) modal.remove();

        modal = document.createElement("div");
        modal.id = "ft-instantiate-modal";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100vw";
        modal.style.height = "100vh";
        modal.style.backgroundColor = "rgba(0, 0, 0, 0.55)";
        modal.style.zIndex = "100000";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.backdropFilter = "blur(2px)";

        let itemsHtml = "";
        cachedTemplates.forEach(tpl => {
            itemsHtml += `
                <div class="ft-tpl-card" data-id="${escapeHtml(tpl.id)}" data-name="${escapeHtml(tpl.name)}" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid var(--color-border, #ddd); border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s ease; background: var(--color-main-background, #fff);">
                    <div>
                        <div style="font-weight: bold; font-size: 1rem; color: var(--color-main-text, #222); display: flex; align-items: center; gap: 8px;">
                            <span>📁</span> ${escapeHtml(tpl.name)}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--color-text-maxcontrast, #777); margin-top: 3px;">
                            ${escapeHtml(t.genFolderLabel)} <strong>${escapeHtml(tpl.originalFolderName || tpl.name)}</strong>
                        </div>
                    </div>
                    <button class="button primary" style="padding: 6px 14px; pointer-events: none;">${escapeHtml(t.btnGenerate)}</button>
                </div>
            `;
        });

        modal.innerHTML = `
            <div style="background: var(--color-main-background, #fff); color: var(--color-main-text, #222); width: 90%; max-width: 520px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden; display: flex; flex-direction: column; max-height: 85vh;">
                <div style="padding: 16px 20px; border-bottom: 1px solid var(--color-border, #ddd); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <span>📁</span> ${escapeHtml(t.modalInstTitle)}
                    </h3>
                    <button id="ft-inst-close" style="background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--color-text-maxcontrast, #666); padding: 4px;">&times;</button>
                </div>
                <div style="padding: 20px; overflow-y: auto; flex: 1;">
                    <p style="margin: 0 0 14px 0; font-size: 0.9rem; color: var(--color-text-maxcontrast, #666);">
                        ${t.modalInstDesc}
                    </p>
                    <div id="ft-tpl-list-container">
                        ${itemsHtml}
                    </div>
                </div>
                <div style="padding: 12px 20px; border-top: 1px solid var(--color-border, #ddd); display: flex; justify-content: space-between; align-items: center; background: var(--color-background-hover, #fafafa);">
                    <button id="ft-manage-btn" class="button" style="padding: 6px 12px; font-size: 0.85rem; cursor: pointer;">${escapeHtml(t.btnManage)}</button>
                    <button id="ft-inst-cancel" class="button" style="padding: 6px 16px; cursor: pointer;">${escapeHtml(t.btnClose)}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => modal.remove();
        document.getElementById("ft-inst-close").addEventListener("click", close);
        document.getElementById("ft-inst-cancel").addEventListener("click", close);
        modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

        modal.querySelectorAll(".ft-tpl-card").forEach(card => {
            card.addEventListener("mouseenter", () => { card.style.borderColor = "var(--color-primary, #0082c9)"; card.style.background = "var(--color-background-hover, #f8f8f8)"; });
            card.addEventListener("mouseleave", () => { card.style.borderColor = "var(--color-border, #ddd)"; card.style.background = "var(--color-main-background, #fff)"; });
            card.addEventListener("click", () => {
                const id = card.getAttribute("data-id");
                const name = card.getAttribute("data-name");
                close();
                instantiateTemplate(id, name);
            });
        });

        document.getElementById("ft-manage-btn").addEventListener("click", () => {
            close();
            window.location.href = OC.generateUrl("/settings/user/foldertemplate");
        });
    }

    function attachToNewFileMenu() {
        function injectTemplateMenuItem() {
            destroyOldToolbarButton();
            if (document.getElementById("ft-new-menu-entry")) return;
            const candidates = document.querySelectorAll("li, .action-item, [role='menuitem'], button");
            let folderItem = null;
            for (const el of candidates) {
                if (el.offsetParent === null && el.style.display === "none") continue;
                const text = (el.textContent || "").trim();
                if (
                    text === "新しいフォルダー" ||
                    text === "New folder" ||
                    text.startsWith("新しいフォルダー") ||
                    text.startsWith("New folder")
                ) {
                    folderItem = el.closest("li") || el;
                    break;
                }
            }

            let targetList = null;
            if (folderItem && folderItem.parentNode) {
                targetList = folderItem.parentNode;
            } else {
                const popovers = document.querySelectorAll(".popovermenu, .popover__wrapper, .popover__inner, .bubble, [role='menu'], .new-file-menu");
                for (const pop of popovers) {
                    if (pop.offsetParent === null && pop.style.display === "none") continue;
                    const text = pop.textContent || "";
                    if (
                        text.includes("新しいフォルダー") ||
                        text.includes("New folder") ||
                        text.includes("ファイルをアップロード") ||
                        text.includes("新規作成")
                    ) {
                        targetList = pop.querySelector("ul, [role='menu'], .popovermenu__list");
                        if (targetList) break;
                    }
                }
            }

            if (!targetList) return;
            if (targetList.querySelector("#ft-new-menu-entry")) return;

            let li;
            if (folderItem && folderItem.tagName === "LI") {
                li = folderItem.cloneNode(true);
                li.id = "ft-new-menu-entry";
                li.style.display = "";
                let textReplaced = false;
                const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null, false);
                let textNode;
                while ((textNode = walker.nextNode())) {
                    if (textNode.nodeValue && (textNode.nodeValue.includes("新しいフォルダー") || textNode.nodeValue.includes("New folder"))) {
                        textNode.nodeValue = t.newMenuLabel;
                        textReplaced = true;
                        break;
                    }
                }
                if (!textReplaced) {
                    const spans = li.querySelectorAll("span, div");
                    for (const sp of spans) {
                        if (sp.textContent && (sp.textContent.includes("新しいフォルダー") || sp.textContent.includes("New folder"))) {
                            sp.textContent = t.newMenuLabel;
                            break;
                        }
                    }
                }
                const svg = li.querySelector("svg");
                if (svg) {
                    svg.outerHTML = `<span style="display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; color:var(--color-primary, #0082c9);">${icons.template}</span>`;
                } else {
                    const iconWrap = li.querySelector(".action-button__icon, [class*='icon']");
                    if (iconWrap) {
                        iconWrap.innerHTML = icons.template;
                    }
                }
                const btn = li.querySelector("button") || li;
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.click();
                    showInstantiateModal();
                };
                folderItem.insertAdjacentElement("afterend", li);
            } else {
                li = document.createElement("li");
                li.id = "ft-new-menu-entry";
                li.className = "action-item";
                li.innerHTML = `
                    <button type="button" class="action-button action-link menuitem" style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; text-align: left; background: none; border: none; cursor: pointer; color: var(--color-main-text);">
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <span style="display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; color: var(--color-primary, #0082c9);">${icons.template}</span>
                            <span class="action-button__text">${escapeHtml(t.newMenuLabel)}</span>
                        </span>
                        <span style="font-size: 0.8rem; color: var(--color-text-maxcontrast, #888);">▶</span>
                    </button>
                `;
                li.querySelector("button").onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    document.body.click();
                    showInstantiateModal();
                };
                targetList.appendChild(li);
            }
        }

        const observer = new MutationObserver(() => {
            injectTemplateMenuItem();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("click", () => {
            setTimeout(injectTemplateMenuItem, 20);
            setTimeout(injectTemplateMenuItem, 100);
            setTimeout(injectTemplateMenuItem, 300);
        });
        document.addEventListener("touchstart", () => {
            setTimeout(injectTemplateMenuItem, 20);
            setTimeout(injectTemplateMenuItem, 100);
            setTimeout(injectTemplateMenuItem, 300);
        }, { passive: true });
        setInterval(injectTemplateMenuItem, 300);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function init() {
        destroyOldToolbarButton();
        await fetchTemplates();
        const api = await loadRegisterFileAction();
        if (api && typeof api.registerFileAction === "function") {
            api.registerFileAction({
                id: "foldertemplate-make-template",
                displayName: () => t.actionMakeTemplate,
                iconSvgInline: () => icons.star,
                order: 80,
                enabled({ nodes, view }) {
                    if (view?.id === "trashbin") return false;
                    if (!nodes || nodes.length !== 1) return false;
                    const node = nodes[0];
                    return node.type === "folder" || node.type === "dir" || node.mime === "httpd/unix-directory";
                },
                async exec({ nodes }) {
                    if (!nodes || nodes.length !== 1) return false;
                    showCreateTemplateModal(nodes[0]);
                    return true;
                }
            });
            console.log("[FolderTemplate] File action 'make-template' registered (lang=" + lang + ").");
        }
        attachToNewFileMenu();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
