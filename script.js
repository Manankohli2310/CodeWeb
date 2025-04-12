document.addEventListener('DOMContentLoaded', () => {

    const htmlEditorElement = document.getElementById('html-code');
    const cssEditorElement = document.getElementById('css-code');
    const jsEditorElement = document.getElementById('js-code');
    const previewFrame = document.getElementById('preview-frame');
    const saveButton = document.getElementById('save-button');
    const openButton = document.getElementById('open-button');
    const boilerplateButton = document.getElementById('boilerplate-button');
    const fileInput = document.getElementById('file-input');
    const tabButtonsContainer = document.querySelector('.editor-tabs'); 
    const editorWrappers = { 
        html: document.getElementById('html-editor-wrapper'),
        css: document.getElementById('css-editor-wrapper'),
        js: document.getElementById('js-editor-wrapper'),
    };
    const tabButtons = document.querySelectorAll('.tab-button'); 

    const commonConfig = {
        lineNumbers: true,
        theme: 'material-darker',
        tabSize: 2,
        lineWrapping: true,
        autoCloseTags: true,
        extraKeys: {"Ctrl-Space": "autocomplete"},
    };

    const editors = {
        html: CodeMirror.fromTextArea(htmlEditorElement, { ...commonConfig, mode: 'htmlmixed' }),
        css: CodeMirror.fromTextArea(cssEditorElement, { ...commonConfig, mode: 'css', autoCloseBrackets: true }),
        js: CodeMirror.fromTextArea(jsEditorElement, { ...commonConfig, mode: 'javascript', autoCloseBrackets: true }),
    };
    tabButtonsContainer.addEventListener('click', (event) => {
        if (event.target.matches('.tab-button')) {
            const targetEditor = event.target.dataset.editor;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            Object.values(editorWrappers).forEach(wrapper => wrapper.classList.remove('active'));
            event.target.classList.add('active');
            editorWrappers[targetEditor].classList.add('active');
            editors[targetEditor].refresh();
        }
    });
    function updatePreview() {
        if (!editors.html || !editors.css || !editors.js || !previewFrame) {
             console.warn("Editors or preview frame not ready for update.");
             return;
        }
        const htmlCode = editors.html.getValue();
        const cssCode = editors.css.getValue();
        const jsCode = editors.js.getValue();

        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;

        previewDoc.open();
        previewDoc.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview</title>
                <style>
                    body { margin: 0; padding: 8px; box-sizing: border-box; }
                    ${cssCode}
                </style>
            </head>
            <body>
                ${htmlCode}
                <script>
                    (function() { // IIFE to scope error handling
                        const _log = console.log;
                        const _error = console.error;
                        const _warn = console.warn;
                        // Simple console override to show in main console (optional)
                        // console.log = (...args) => { window.parent.console.log('PREVIEW:', ...args); _log.apply(console, args); };
                        // console.warn = (...args) => { window.parent.console.warn('PREVIEW:', ...args); _warn.apply(console, args); };
                        console.error = (...args) => { window.parent.console.error('PREVIEW ERROR:', ...args); _error.apply(console, args); };

                        try {
                            ${jsCode}
                        } catch (e) {
                            console.error("Uncaught Error:", e);
                        }
                    })();
                </script>
            </body>
            </html>
        `);
        previewDoc.close();
    }
    let debounceTimeout;
    function requestPreviewUpdate() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(updatePreview, 350); 
    }

    editors.html.on('change', requestPreviewUpdate);
    editors.css.on('change', requestPreviewUpdate);
    editors.js.on('change', requestPreviewUpdate);
    setTimeout(updatePreview, 150); 

    boilerplateButton.addEventListener('click', () => {
        const htmlBoilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <!-- Link CSS here -->
    <style>
        /* Or write CSS here */
    </style>
</head>
<body>
    <h1>Hello World!</h1>

    <!-- Link JavaScript here -->
    <script>
        // Or write JavaScript here
    </script>
</body>
</html>`;
        if (editors.html.getValue().trim() === '' || confirm('Replace current HTML content with boilerplate?')) {
            editors.html.setValue(htmlBoilerplate);
            if (!editorWrappers.html.classList.contains('active')) {
                tabButtonsContainer.querySelector('button[data-editor="html"]').click();
            }
             editors.html.focus(); 
             requestPreviewUpdate(); 
        }
    });

    saveButton.addEventListener('click', () => {
        const htmlCode = editors.html.getValue();
        const cssCode = editors.css.getValue();
        const jsCode = editors.js.getValue();

        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    <style>
${cssCode}
    </style>
</head>
<body>
${htmlCode}

    <script>
${jsCode}
    <\/script>
</body>
</html>
        `;

        const blob = new Blob([fullHtml.trim()], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    openButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        let htmlContent = editors.html.getValue();
        let cssContent = editors.css.getValue(); 
        let jsContent = editors.js.getValue(); 
        let htmlFileProcessed = false;

        const fileReadPromises = [];

        for (const file of files) {
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();

            if (!['html', 'css', 'js'].includes(fileExtension)) {
                console.warn(`Skipping unsupported file type: ${fileName}`);
                continue; 
            }

            const promise = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    content: e.target.result,
                    type: fileExtension,
                    name: fileName
                });
                reader.onerror = (e) => reject(`Error reading file ${fileName}: ${e}`);
                reader.readAsText(file);
            });
            fileReadPromises.push(promise);
        }

        Promise.all(fileReadPromises)
            .then(results => {
                results.forEach(result => {
                    try {
                        if (result.type === 'html' && !htmlFileProcessed) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(result.content, 'text/html');

                            const bodyElement = doc.body || doc.createElement('body');
                            const scriptTagsInBody = bodyElement.querySelectorAll('script:not([src])');
                            let jsFromBody = '';
                            scriptTagsInBody.forEach(script => {
                                jsFromBody += script.textContent + '\n\n'; 
                                script.remove();
                            });
                            htmlContent = bodyElement.innerHTML.trim();

                            const headElement = doc.head || doc.createElement('head');
                            const styleTags = headElement.querySelectorAll('style');
                            styleTags.forEach(style => {
                                cssContent += (cssContent ? '\n\n' : '') + style.textContent.trim(); 
                            });

                            const scriptTagsInHead = headElement.querySelectorAll('script:not([src])');
                             scriptTagsInHead.forEach(script => {
                                 jsContent += (jsContent ? '\n\n' : '') + script.textContent.trim(); 
                             });
                             if (jsFromBody.trim()){
                                 jsContent += (jsContent ? '\n\n' : '') + jsFromBody.trim();
                             }

                            htmlFileProcessed = true; 
                            console.log(`Processed HTML structure from: ${result.name}`);

                        } else if (result.type === 'html' && htmlFileProcessed) {
                             console.warn(`Ignoring structure of subsequent HTML file: ${result.name}. Only the first HTML file is parsed for structure.`);

                        } else if (result.type === 'css') {
                            cssContent += (cssContent ? '\n\n/* --- From ' + result.name + ' --- */\n' : '') + result.content.trim();
                            console.log(`Appended CSS from: ${result.name}`);

                        } else if (result.type === 'js') {
                            jsContent += (jsContent ? '\n\n// --- From ' + result.name + ' --- //\n' : '') + result.content.trim();
                             console.log(`Appended JS from: ${result.name}`);
                        }
                    } catch (error) {
                         console.error(`Error processing content from ${result.name}:`, error);
                    }
                });
                editors.html.setValue(htmlContent);
                editors.css.setValue(cssContent);
                editors.js.setValue(jsContent);

                console.log('All files processed and loaded.');
                updatePreview();

            })
            .catch(error => {
                console.error("Error reading one or more files:", error);
                alert(`Error reading files: ${error}`);
            })
            .finally(() => {
                event.target.value = null;
            });
    });

    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            const activeEditorKey = Object.keys(editorWrappers).find(key => editorWrappers[key].classList.contains('active'));
            if (activeEditorKey && editors[activeEditorKey]) {
                editors[activeEditorKey].refresh();
            }
        }, 150); 
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const editorContainer = document.querySelector('.editor-container');
    const codePane = document.querySelector('.code-pane');
    const previewPane = document.querySelector('.preview-pane');
    const dragHandle = document.getElementById('drag-handle');

    let isResizing = false;
    let startX, startCodeWidth, startPreviewWidth;
    const minPaneWidth = 250; 

    if (dragHandle) { 
        dragHandle.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 768) {
                isResizing = false;
                return;
            }
            isResizing = true;
            startX = e.clientX;
            startCodeWidth = codePane.offsetWidth;
            startPreviewWidth = previewPane.offsetWidth; 
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none'; 
            dragHandle.style.cursor = 'col-resize';
            editorContainer.style.cursor = 'col-resize'; 
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        function handleMouseMove(e) {
            if (!isResizing) return;

            const currentX = e.clientX;
            const deltaX = currentX - startX;

            let newCodeWidth = startCodeWidth + deltaX;
            let newPreviewWidth = startPreviewWidth - deltaX;
            if (newCodeWidth < minPaneWidth) {
                newCodeWidth = minPaneWidth;
                newPreviewWidth = startCodeWidth + startPreviewWidth - minPaneWidth;
            }
            if (newPreviewWidth < minPaneWidth) {
                newPreviewWidth = minPaneWidth;
                newCodeWidth = startCodeWidth + startPreviewWidth - minPaneWidth;
            }

            const containerWidth = editorContainer.offsetWidth - dragHandle.offsetWidth;

            const newCodePercent = (newCodeWidth / containerWidth) * 100;
            const newPreviewPercent = (newPreviewWidth / containerWidth) * 100;


            codePane.style.flexBasis = `${newCodePercent}%`;
            previewPane.style.flexBasis = `${newPreviewPercent}%`;

        }

        function handleMouseUp() {
            if (!isResizing) return; 

            isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
            dragHandle.style.cursor = 'col-resize'; 
            editorContainer.style.cursor = 'default';


            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            const activeEditorKey = Object.keys(editorWrappers).find(key => editorWrappers[key].classList.contains('active'));
            if (activeEditorKey && editors[activeEditorKey]) {

                 setTimeout(() => {
                    editors[activeEditorKey].refresh();
                    console.log("CodeMirror refreshed after resize");
                 }, 50);
            }
        }

        let resizeDebounceTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeDebounceTimer);
            resizeDebounceTimer = setTimeout(() => {
                if (window.innerWidth > 768) {
                     const activeEditorKey = Object.keys(editorWrappers).find(key => editorWrappers[key].classList.contains('active'));
                     if (activeEditorKey && editors[activeEditorKey]) {
                         editors[activeEditorKey].refresh();
                     }
                } else {

                    codePane.style.flexBasis = '';
                    previewPane.style.flexBasis = '';
                     const activeEditorKey = Object.keys(editorWrappers).find(key => editorWrappers[key].classList.contains('active'));
                     if (activeEditorKey && editors[activeEditorKey]) {
                         editors[activeEditorKey].refresh();
                     }
                }
                if(dragHandle){
                     dragHandle.style.display = window.innerWidth <= 768 ? 'none' : 'flex'; // Use 'flex' or 'block'
                }

            }, 250);
        });

    } 

}); 