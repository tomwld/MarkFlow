use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem, IsMenuItem};
use tauri::{Emitter, AppHandle, Wry, Manager};
use std::sync::{Arc, Mutex};
use notify::{Watcher, RecursiveMode, RecommendedWatcher};
use std::path::Path;

struct WatcherState {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

struct StartupFile(Arc<Mutex<Option<String>>>);

#[tauri::command]
fn get_startup_file(state: tauri::State<StartupFile>) -> Option<String> {
    let mut file = state.0.lock().unwrap();
    file.take()
}

#[tauri::command]
fn watch_file(app: AppHandle, path: String, state: tauri::State<WatcherState>) -> Result<(), String> {
    let app_handle = app.clone();
    
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    
    if watcher_guard.is_none() {
        let watcher = notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            match res {
               Ok(event) => {
                   match event.kind {
                       notify::EventKind::Access(_) => {}, // Ignore access events
                       _ => {
                           for path in event.paths {
                               let _ = app_handle.emit("file-changed", path.to_string_lossy().to_string());
                           }
                       }
                   }
               },
               Err(e) => println!("watch error: {:?}", e),
            }
        }).map_err(|e| e.to_string())?;
        *watcher_guard = Some(watcher);
    }

    if let Some(watcher) = watcher_guard.as_mut() {
        let _ = watcher.watch(Path::new(&path), RecursiveMode::NonRecursive);
    }

    Ok(())
}

#[tauri::command]
fn unwatch_file(path: String, state: tauri::State<WatcherState>) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock().map_err(|e| e.to_string())?;
    
    if let Some(watcher) = watcher_guard.as_mut() {
        let _ = watcher.unwatch(Path::new(&path));
    }
    
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuLabels {
    file: String,
    new: String,
    open: String,
    open_folder: String,
    save: String,
    save_as: String,
    export_pdf: String,
    export_html: String,
    close: String,
    quit: String,
    edit: String,
    undo: String,
    redo: String,
    cut: String,
    copy: String,
    paste: String,
    select_all: String,
    view: String,
    toggle_sidebar: String,
    toggle_outline: String,
    toggle_preview: String,
    toggle_theme: String,
    toggle_focus: String,
    settings: String,
    help: String,
    about: String,
    markdown_syntax: String,
    insert: String,
    insert_table: String,
    insert_footnote: String,
    insert_task_list: String,
    insert_code_block: String,
    insert_link: String,
    insert_image: String,
    insert_emoji: String,
    insert_math: String,
}

impl Default for MenuLabels {
    fn default() -> Self {
        Self {
            file: "File".into(),
            new: "New".into(),
            open: "Open File".into(),
            open_folder: "Open Folder".into(),
            save: "Save".into(),
            save_as: "Save As".into(),
            export_pdf: "Export to PDF".into(),
            export_html: "Export to HTML".into(),
            close: "Close".into(),
            quit: "Quit".into(),
            edit: "Edit".into(),
            undo: "Undo".into(),
            redo: "Redo".into(),
            cut: "Cut".into(),
            copy: "Copy".into(),
            paste: "Paste".into(),
            select_all: "Select All".into(),
            view: "View".into(),
            toggle_sidebar: "Toggle Sidebar".into(),
            toggle_outline: "Toggle Outline".into(),
            toggle_preview: "Toggle Preview".into(),
            toggle_theme: "Toggle Theme".into(),
            toggle_focus: "Toggle Focus Mode".into(),
            settings: "Settings".into(),
            help: "Help".into(),
            about: "About".into(),
            markdown_syntax: "Markdown Syntax".into(),
            insert: "Insert".into(),
            insert_table: "Table".into(),
            insert_footnote: "Footnote".into(),
            insert_task_list: "Task List".into(),
            insert_code_block: "Code Block".into(),
            insert_link: "Link".into(),
            insert_image: "Image".into(),
            insert_emoji: "Emoji".into(),
            insert_math: "Math Formula".into(),
        }
    }
}

fn build_menu(handle: &AppHandle, labels: &MenuLabels) -> tauri::Result<Menu<Wry>> {
    // File Menu
    let new_i = MenuItem::with_id(handle, "file-new", &labels.new, true, Some("CmdOrCtrl+N"))?;
    let open_i = MenuItem::with_id(handle, "file-open", &labels.open, true, Some("CmdOrCtrl+O"))?;
    let open_folder_i = MenuItem::with_id(handle, "file-open-folder", &labels.open_folder, true, Some("CmdOrCtrl+Alt+O"))?;
    let save_i = MenuItem::with_id(handle, "file-save", &labels.save, true, Some("CmdOrCtrl+S"))?;
    let save_as_i = MenuItem::with_id(handle, "file-save-as", &labels.save_as, true, Some("CmdOrCtrl+Alt+S"))?;
    let export_pdf_i = MenuItem::with_id(handle, "file-export-pdf", &labels.export_pdf, true, Some("CmdOrCtrl+Alt+P"))?;
    let export_html_i = MenuItem::with_id(handle, "file-export-html", &labels.export_html, true, Some("CmdOrCtrl+Alt+H"))?;
    let close_i = MenuItem::with_id(handle, "file-close", &labels.close, true, Some("CmdOrCtrl+W"))?;
    // Use custom MenuItem for Quit to handle unsaved changes
    let quit_i = MenuItem::with_id(handle, "file-quit", &labels.quit, true, None::<&str>)?;
    
    let sep = PredefinedMenuItem::separator(handle)?;

    let file_items: Vec<&dyn IsMenuItem<Wry>> = vec![
        &new_i, &open_i, &open_folder_i, 
        &sep,
        &save_i, &save_as_i, 
        &sep,
        &export_pdf_i, &export_html_i,
        &sep,
        &close_i, 
        &sep,
        &quit_i
    ];

    let file_menu = Submenu::with_items(handle, &labels.file, true, &file_items)?;

    // Edit Menu
    let undo_i = PredefinedMenuItem::undo(handle, Some(&labels.undo))?;
    let redo_i = PredefinedMenuItem::redo(handle, Some(&labels.redo))?;
    let cut_i = PredefinedMenuItem::cut(handle, Some(&labels.cut))?;
    let copy_i = PredefinedMenuItem::copy(handle, Some(&labels.copy))?;
    let paste_i = PredefinedMenuItem::paste(handle, Some(&labels.paste))?;
    let select_all_i = PredefinedMenuItem::select_all(handle, Some(&labels.select_all))?;
    
    let edit_items: Vec<&dyn IsMenuItem<Wry>> = vec![
        &undo_i, &redo_i,
        &sep,
        &cut_i, &copy_i, &paste_i,
        &sep,
        &select_all_i
    ];

    let edit_menu = Submenu::with_items(handle, &labels.edit, true, &edit_items)?;

    // Insert Menu
    let insert_table_i = MenuItem::with_id(handle, "insert-table", &labels.insert_table, true, Some("CmdOrCtrl+T"))?;
    let insert_footnote_i = MenuItem::with_id(handle, "insert-footnote", &labels.insert_footnote, true, Some("CmdOrCtrl+Alt+F"))?;
    let insert_tasklist_i = MenuItem::with_id(handle, "insert-tasklist", &labels.insert_task_list, true, Some("CmdOrCtrl+L"))?;
    let insert_codeblock_i = MenuItem::with_id(handle, "insert-codeblock", &labels.insert_code_block, true, Some("CmdOrCtrl+Alt+C"))?;
    let insert_link_i = MenuItem::with_id(handle, "insert-link", &labels.insert_link, true, Some("CmdOrCtrl+K"))?;
    let insert_image_i = MenuItem::with_id(handle, "insert-image", &labels.insert_image, true, Some("CmdOrCtrl+I"))?;
    let insert_emoji_i = MenuItem::with_id(handle, "insert-emoji", &labels.insert_emoji, true, Some("CmdOrCtrl+E"))?;
    let insert_math_i = MenuItem::with_id(handle, "insert-math", &labels.insert_math, true, Some("CmdOrCtrl+Alt+M"))?;

    let insert_items: Vec<&dyn IsMenuItem<Wry>> = vec![
        &insert_table_i,
        &insert_footnote_i,
        &insert_tasklist_i,
        &insert_codeblock_i,
        &insert_math_i,
        &insert_link_i,
        &insert_image_i,
        &insert_emoji_i,
    ];

    let insert_menu = Submenu::with_items(handle, &labels.insert, true, &insert_items)?;
    
    // View Menu
    let toggle_sidebar_i = MenuItem::with_id(handle, "view-toggle-sidebar", &labels.toggle_sidebar, true, Some("CmdOrCtrl+B"))?;
    let toggle_outline_i = MenuItem::with_id(handle, "view-toggle-outline", &labels.toggle_outline, true, Some("CmdOrCtrl+Alt+B"))?;
    let preview_i = MenuItem::with_id(handle, "view-toggle-preview", &labels.toggle_preview, true, Some("CmdOrCtrl+P"))?;
    let theme_i = MenuItem::with_id(handle, "view-toggle-theme", &labels.toggle_theme, true, None::<&str>)?;
    let focus_i = MenuItem::with_id(handle, "view-toggle-focus", &labels.toggle_focus, true, Some("F11"))?;
    let settings_i = MenuItem::with_id(handle, "view-settings", &labels.settings, true, Some("CmdOrCtrl+,"))?;
    
    let view_items: Vec<&dyn IsMenuItem<Wry>> = vec![
        &toggle_sidebar_i, &toggle_outline_i, &preview_i,
        &sep,
        &theme_i, &focus_i,
        &sep,
        &settings_i
    ];

    let view_menu = Submenu::with_items(handle, &labels.view, true, &view_items)?;

    // Help Menu
    let markdown_syntax_i = MenuItem::with_id(handle, "help-markdown-syntax", &labels.markdown_syntax, true, None::<&str>)?;
    let about_i = MenuItem::with_id(handle, "help-about", &labels.about, true, None::<&str>)?;
    
    let help_menu = Submenu::with_items(handle, &labels.help, true, &[
        &markdown_syntax_i,
        &about_i
    ])?;

    let menu = Menu::with_items(handle, &[
        &file_menu, &edit_menu, &insert_menu, &view_menu, &help_menu
    ])?;
    
    Ok(menu)
}

#[tauri::command]
fn update_menu(app: AppHandle, labels: MenuLabels) -> Result<(), String> {
    let menu = build_menu(&app, &labels).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }

            if args.len() > 1 {
                let path = args[1].clone();
                if !path.starts_with("-") {
                    let _ = app.emit("open-file-request", path);
                }
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(WatcherState { watcher: Arc::new(Mutex::new(None)) })
        .manage(StartupFile(Arc::new(Mutex::new(None))))
        .setup(|app| {
            let handle = app.handle();
            let labels = MenuLabels::default();
            let menu = build_menu(handle, &labels)?;
            app.set_menu(menu)?;

            // Check command line arguments for file to open
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let path = args[1].clone();
                // Simple check to ensure it's a file path and not a flag
                if !path.starts_with("-") {
                    let state = app.state::<StartupFile>();
                    *state.0.lock().unwrap() = Some(path);
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id.as_ref();
            // Emit event to frontend
             let _ = app.emit("menu-event", event_id);
        })
        .invoke_handler(tauri::generate_handler![greet, update_menu, watch_file, unwatch_file, exit_app, get_startup_file]);


    if let Err(err) = builder.run(tauri::generate_context!()) {
        eprintln!("Error while running tauri application: {}", err);
    }
}
