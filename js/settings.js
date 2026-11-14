/* SPDX-FileCopyrightText: 2026 uttii-com <https://uttii.com>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
(function () {
    "use strict";

    const I18N = {
        ja: {
            pageTitle: "フォルダテンプレートの設定",
            pageDesc: "登録したフォルダテンプレートの一覧、名前の変更、削除が行えます。<br>※新しいテンプレートの登録は、ファイル一覧で任意のフォルダを右クリックし「⭐ このフォルダをテンプレートにする」から行えます。",
            langLabel: "表示言語 / Language:",
            langSaved: "言語設定を保存しました",
            langError: "保存に失敗しました",
            colTplName: "テンプレート名",
            colSrcFolder: "元フォルダ名",
            colActions: "操作",
            loading: "読み込み中...",
            empty: "登録されているテンプレートはありません。",
            btnEdit: "✏️ 編集",
            btnSave: "💾 保存",
            btnCancel: "取消",
            btnDelete: "🗑️ 削除",
            enterName: "テンプレート名を入力してください",
            updated: "テンプレート名を更新しました",
            updateFailed: "更新に失敗しました",
            commError: "通信エラーが発生しました",
            confirmDelete: (name) => `テンプレート「${name}」を削除しますか？\n（スナップショット実体も削除されます）`,
            deleted: "テンプレートを削除しました",
            deleteFailed: "削除に失敗しました",
            deleteCommError: "削除中に通信エラーが発生しました",
            creditTitle: "uttii-FolderTemplate — クレジット・ライセンス・免責事項",
            creditDevLabel: "開発・運営",
            creditLicenseLabel: "ライセンス",
            creditSupportLabel: "ソースコード・不具合報告・お問い合わせ",
            creditSupportDesc: "不具合のご報告やご要望は、以下のいずれかよりご連絡ください。",
            creditContactFormLabel: "お問い合わせフォーム",
            creditEmailLabel: "メール",
            warrantyTitle: "無保証・自己責任での利用について",
            warrantyBody: "本アプリケーションは無償・無保証で提供されます。ソースコードは確認可能な形式で公開されており、利用者自身による検証を前提としています。<br>正常動作、互換性、安全性および継続的なサポートは保証されません。導入前にバックアップを取得し、ご自身の判断と責任でご利用ください。<br>法令上免除できない場合を除き、運営者は利用に伴う損害について責任を負いません。"
        },
        en: {
            pageTitle: "Folder Template Settings",
            pageDesc: "View, rename, and delete your registered folder templates.<br>To register a new template, right-click any folder in Nextcloud Files and select \"⭐ Save as folder template\".",
            langLabel: "Display Language / 表示言語:",
            langSaved: "Language preference saved",
            langError: "Failed to save language preference",
            colTplName: "Template Name",
            colSrcFolder: "Source Folder",
            colActions: "Actions",
            loading: "Loading...",
            empty: "No folder templates registered yet.",
            btnEdit: "✏️ Edit",
            btnSave: "💾 Save",
            btnCancel: "Cancel",
            btnDelete: "🗑️ Delete",
            enterName: "Please enter a template name",
            updated: "Template name updated",
            updateFailed: "Failed to update template",
            commError: "A communication error occurred",
            confirmDelete: (name) => `Delete template "${name}"?`,
            deleted: "Template deleted",
            deleteFailed: "Failed to delete template",
            deleteCommError: "A communication error occurred while deleting",
            creditTitle: "uttii-FolderTemplate — Credits, License & Disclaimer",
            creditDevLabel: "Developer & Publisher",
            creditLicenseLabel: "License",
            creditSupportLabel: "Source Code, Bug Reports & Contact",
            creditSupportDesc: "For bug reports or inquiries, please contact us via any of the following:",
            creditContactFormLabel: "Contact Form",
            creditEmailLabel: "Email",
            warrantyTitle: "No Warranty and Use at Your Own Risk",
            warrantyBody: "This application is provided free of charge and without any warranty. The source code is published in an inspectable format and is intended to be verified by the user.<br>Normal operation, compatibility, security, and ongoing support are not guaranteed. Please take backups before installation and use the application at your own judgment and risk.<br>Except where liability cannot be excluded by applicable law, the operator shall not be liable for any damages arising from the use of this application."
        }
    };

    let currentLang = "ja";
    let cachedTemplates = [];

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function applyLanguage(lang) {
        currentLang = (lang === "en") ? "en" : "ja";
        const dict = I18N[currentLang];
        const root = document.getElementById("foldertemplate-settings");
        if (!root) return;

        root.setAttribute("data-lang", currentLang);
        root.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (dict[key] !== undefined && typeof dict[key] === "string") {
                if (key === "pageDesc" || key === "warrantyBody") {
                    el.innerHTML = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });
        renderTable(cachedTemplates);
    }

    async function fetchTemplates() {
        try {
            const res = await fetch(OC.generateUrl("/apps/foldertemplate/api/templates"), {
                headers: { "requesttoken": OC.requestToken }
            });
            const data = await res.json();
            return (res.ok && data.success) ? (data.templates || []) : [];
        } catch (e) {
            console.error("[FolderTemplate] Failed to load templates:", e);
            return [];
        }
    }

    function renderTable(templates) {
        const body = document.getElementById("foldertemplate-body");
        if (!body) return;
        const t = I18N[currentLang];

        if (templates.length === 0) {
            body.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #888; padding: 20px;">${escapeHtml(t.empty)}</td></tr>`;
            return;
        }

        let html = "";
        templates.forEach(tpl => {
            html += `
                <tr data-id="${escapeHtml(tpl.id)}">
                    <td>
                        <span class="ft-name-text" style="font-weight: bold;">${escapeHtml(tpl.name)}</span>
                        <input type="text" class="ft-name-input hidden" value="${escapeHtml(tpl.name)}" style="display: none; width: 80%; padding: 4px;" />
                    </td>
                    <td style="color: var(--color-text-maxcontrast); font-family: monospace;">📁 ${escapeHtml(tpl.originalFolderName || "-")}</td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button class="ft-btn ft-btn-edit">${escapeHtml(t.btnEdit)}</button>
                        <button class="ft-btn ft-btn-save hidden" style="display: none;">${escapeHtml(t.btnSave)}</button>
                        <button class="ft-btn ft-btn-cancel hidden" style="display: none;">${escapeHtml(t.btnCancel)}</button>
                        <button class="ft-btn ft-btn-delete" style="margin-left: 6px;">${escapeHtml(t.btnDelete)}</button>
                    </td>
                </tr>
            `;
        });

        body.innerHTML = html;

        body.querySelectorAll("tr").forEach(tr => {
            const id = tr.getAttribute("data-id");
            const textSpan = tr.querySelector(".ft-name-text");
            const inputEl = tr.querySelector(".ft-name-input");
            const editBtn = tr.querySelector(".ft-btn-edit");
            const saveBtn = tr.querySelector(".ft-btn-save");
            const cancelBtn = tr.querySelector(".ft-btn-cancel");
            const delBtn = tr.querySelector(".ft-btn-delete");

            editBtn.addEventListener("click", () => {
                textSpan.style.display = "none";
                inputEl.style.display = "inline-block";
                editBtn.style.display = "none";
                saveBtn.style.display = "inline-block";
                cancelBtn.style.display = "inline-block";
                inputEl.focus();
            });

            cancelBtn.addEventListener("click", () => {
                inputEl.value = textSpan.textContent;
                textSpan.style.display = "inline";
                inputEl.style.display = "none";
                editBtn.style.display = "inline-block";
                saveBtn.style.display = "none";
                cancelBtn.style.display = "none";
            });

            saveBtn.addEventListener("click", async () => {
                const newName = inputEl.value.trim();
                if (!newName) {
                    alert(t.enterName);
                    return;
                }
                try {
                    const res = await fetch(OC.generateUrl(`/apps/foldertemplate/api/templates/${encodeURIComponent(id)}`), {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "requesttoken": OC.requestToken
                        },
                        body: JSON.stringify({ name: newName })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        textSpan.textContent = newName;
                        const found = cachedTemplates.find(item => item.id === id);
                        if (found) found.name = newName;
                        cancelBtn.click();
                        if (OC.Notification?.showTemporary) {
                            OC.Notification.showTemporary(t.updated);
                        }
                    } else {
                        alert(data.error || t.updateFailed);
                    }
                } catch (e) {
                    alert(t.commError);
                }
            });

            delBtn.addEventListener("click", async () => {
                if (!confirm(t.confirmDelete(textSpan.textContent))) {
                    return;
                }
                try {
                    const res = await fetch(OC.generateUrl(`/apps/foldertemplate/api/templates/${encodeURIComponent(id)}`), {
                        method: "DELETE",
                        headers: { "requesttoken": OC.requestToken }
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        cachedTemplates = cachedTemplates.filter(item => item.id !== id);
                        tr.remove();
                        if (OC.Notification?.showTemporary) {
                            OC.Notification.showTemporary(t.deleted);
                        }
                        if (body.querySelectorAll("tr").length === 0) {
                            renderTable([]);
                        }
                    } else {
                        alert(data.error || t.deleteFailed);
                    }
                } catch (e) {
                    alert(t.deleteCommError);
                }
            });
        });
    }

    async function init() {
        const root = document.getElementById("foldertemplate-settings");
        if (!root) return;

        const initialLang = root.getAttribute("data-lang") || OC.InitialState?.loadState("foldertemplate", "lang") || "ja";
        currentLang = (initialLang === "en") ? "en" : "ja";

        const select = document.getElementById("uttii-lang-select");
        const statusEl = document.getElementById("uttii-lang-status");
        if (select) {
            select.value = currentLang;
            select.addEventListener("change", async () => {
                const newLang = select.value === "en" ? "en" : "ja";
                applyLanguage(newLang);
                if (statusEl) statusEl.textContent = "...";

                try {
                    const res = await fetch(OC.generateUrl("/apps/foldertemplate/api/settings/language"), {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "requesttoken": OC.requestToken
                        },
                        body: JSON.stringify({ lang: newLang })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        if (statusEl) {
                            statusEl.textContent = I18N[newLang].langSaved;
                            setTimeout(() => { statusEl.textContent = ""; }, 3000);
                        }
                    } else if (statusEl) {
                        statusEl.textContent = I18N[newLang].langError;
                    }
                } catch (e) {
                    if (statusEl) statusEl.textContent = I18N[newLang].langError;
                }
            });
        }

        cachedTemplates = await fetchTemplates();
        applyLanguage(currentLang);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
