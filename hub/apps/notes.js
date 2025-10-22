window.initNotes = function() {
    const notesList = document.getElementById('notes-list');
    const newNoteInput = document.getElementById('new-note');
    const addNoteButton = document.getElementById('add-note');
    const textColorInput = document.getElementById('text-color');
    const bgColorInput = document.getElementById('bg-color');
    const fontFamilySelect = document.getElementById('font-family');
    
    // Elementos del modal
    const editModal = document.getElementById('edit-modal');
    const editNoteText = document.getElementById('edit-note-text');
    const editTextColor = document.getElementById('edit-text-color');
    const editBgColor = document.getElementById('edit-bg-color');
    const editFontFamily = document.getElementById('edit-font-family');
    const saveEditBtn = document.getElementById('save-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    let currentEditIndex = null;

    // Cargar notas guardadas
    function loadNotes() {
        if (!notesList) return; 
        
        // Usamos chrome.storage para guardar las notas
        chrome.storage.local.get('notes', (data) => {
            const notes = data.notes || [];
            notesList.innerHTML = '';
            
            if (notes.length === 0) {
                notesList.innerHTML = '<div class="empty-state"><p>No hay notas guardadas. ¡Crea tu primera nota!</p></div>';
                return;
            }
            
            notes.forEach((note, index) => {
                const li = document.createElement('li');
                
                li.style.backgroundColor = note.bgColor || '#fff9c4'; 
                
                const noteText = document.createElement('p');
                noteText.textContent = note.text;
                noteText.style.color = note.textColor || '#000000';
                noteText.style.fontFamily = note.fontFamily || 'Arial, sans-serif';
                li.appendChild(noteText);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'note-actions';

                // Botón Copiar
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-btn';
                copyBtn.textContent = '📋 Copiar';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(note.text).then(() => {
                        copyBtn.textContent = '✓ Copiado!';
                        setTimeout(() => { copyBtn.textContent = '📋 Copiar'; }, 2000);
                    });
                };
                actionsDiv.appendChild(copyBtn);

                // Botón Editar
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = '✏️ Editar';
                editBtn.onclick = () => { openEditModal(index, note); };
                actionsDiv.appendChild(editBtn);

                // Botón Borrar
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '🗑️ Borrar';
                deleteBtn.onclick = () => {
                    if (confirm('¿Seguro que quieres borrar esta nota?')) {
                        notes.splice(index, 1);
                        saveNotes(notes);
                        loadNotes();
                    }
                };
                actionsDiv.appendChild(deleteBtn);

                li.appendChild(actionsDiv);
                notesList.appendChild(li);
            });
        });
    }

    // Abrir modal de edición
    function openEditModal(index, note) {
        currentEditIndex = index;
        editNoteText.value = note.text;
        editTextColor.value = note.textColor || '#000000';
        editBgColor.value = note.bgColor || '#fff9c4';
        editFontFamily.value = note.fontFamily || 'Arial, sans-serif';
        editModal.classList.add('active');
    }

    // Cerrar modal
    function closeEditModal() {
        editModal.classList.remove('active');
        currentEditIndex = null;
    }

    // Guardar edición
    saveEditBtn.onclick = () => {
        if (currentEditIndex === null) return;
        
        const newText = editNoteText.value.trim();
        if (newText) {
            chrome.storage.local.get('notes', (data) => {
                const notes = data.notes || [];
                notes[currentEditIndex] = {
                    text: newText,
                    textColor: editTextColor.value,
                    bgColor: editBgColor.value,
                    fontFamily: editFontFamily.value
                };
                saveNotes(notes);
                loadNotes();
                closeEditModal();
            });
        }
    };

    // Cancelar edición
    cancelEditBtn.onclick = closeEditModal;

    // Cerrar modal al hacer clic fuera
    editModal.onclick = (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    };

    // Guardar notas
    function saveNotes(notes) {
        chrome.storage.local.set({ notes });
    }

    // Agregar nueva nota
    addNoteButton.onclick = () => {
        const text = newNoteInput.value.trim();
        if (text) {
            chrome.storage.local.get('notes', (data) => {
                const notes = data.notes || [];
                notes.push({
                    text: text,
                    textColor: textColorInput.value,
                    bgColor: bgColorInput.value,
                    fontFamily: fontFamilySelect.value
                });
                saveNotes(notes);
                newNoteInput.value = '';
                loadNotes();
            });
        }
    };

    // Permitir Enter para agregar nota (Ctrl+Enter o Cmd+Enter)
    newNoteInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            addNoteButton.click();
        }
    });

    // Cargar al inicializar la app (o cambiar a la pestaña de notas)
    loadNotes(); 
};